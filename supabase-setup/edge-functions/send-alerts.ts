// supabase/functions/send-alerts/index.ts
//
// Runs daily (see BUILD_BRIEF.md for the pg_cron wiring). For every
// incomplete compliance instance, checks whether today matches one of
// the reminder offsets below, measured from internal_target_date (the
// buffered date the team actually works to, not the bare statutory
// deadline), and if so sends a WhatsApp template message to every
// contact on the company: the President/Director, the CA, and the ISB
// lead together, matching the "no single point of failure on who was
// told" design in the concept note.
//
// Idempotency: notification_log is checked before sending, so if this
// function is triggered twice in a day (a retried cron run, a manual
// re-trigger while testing) nobody gets double-messaged.
//
// Deploy: supabase functions deploy send-alerts
// Required secrets (supabase secrets set ...):
//   WHATSAPP_API_URL        e.g. https://graph.facebook.com/v20.0/<phone-number-id>/messages
//   WHATSAPP_API_TOKEN      the BSP or Meta Cloud API access token
//   WHATSAPP_TEMPLATE_NAME  the pre-approved template name to send

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const waApiUrl = Deno.env.get("WHATSAPP_API_URL")!;
const waApiToken = Deno.env.get("WHATSAPP_API_TOKEN")!;
const waTemplateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME") ?? "compliance_reminder";

// How many days before internal_target_date to remind, and again on the day itself.
// Matches the concept note's "advance alerts, e.g. one week before due date", with a
// closer-in and a same-day nudge added since a single reminder a week out is easy to
// miss during field travel.
const REMINDER_OFFSETS = [14, 7, 1, 0];

Deno.serve(async (_req) => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date().toISOString().slice(0, 10);

  const { data: instances, error } = await supabase
    .from("compliance_instances")
    .select(`
      id, internal_target_date, statutory_due_date, rule_code,
      company:companies ( id, name, state, district ),
      rule:compliance_rules ( label, section_ref )
    `)
    .is("completed_date", null)
    .gte("internal_target_date", today)
    .lte("internal_target_date", addDays(today, 14));

  if (error) return jsonError(error.message);

  let sent = 0, skipped = 0, failed = 0;
  const details: string[] = [];

  for (const inst of instances ?? []) {
    const daysOut = daysBetween(today, inst.internal_target_date as string);
    if (!REMINDER_OFFSETS.includes(daysOut)) continue;

    const templateCode = `reminder_${daysOut}d`;

    // Idempotency check: has this exact reminder already gone out for this instance?
    const { data: already } = await supabase
      .from("notification_log")
      .select("id")
      .eq("compliance_instance_id", inst.id)
      .eq("template_code", templateCode)
      .eq("status", "sent")
      .limit(1);
    if (already && already.length > 0) { skipped++; continue; }

    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, name, phone, role, whatsapp_opt_in")
      .eq("company_id", (inst.company as any).id);

    for (const contact of contacts ?? []) {
      if (!contact.whatsapp_opt_in || !contact.phone) {
        await logResult(supabase, inst.id, contact.id, templateCode, "skipped_no_optin");
        continue;
      }

      const result = await sendWhatsAppTemplate({
        to: contact.phone,
        recipientName: contact.name,
        companyName: (inst.company as any).name,
        complianceLabel: (inst.rule as any).label,
        sectionRef: (inst.rule as any).section_ref,
        dueDate: inst.statutory_due_date as string,
        daysOut,
      });

      await logResult(supabase, inst.id, contact.id, templateCode, result.ok ? "sent" : "failed", result.messageId, result.error);
      if (result.ok) { sent++; } else { failed++; details.push(`${contact.name} (${contact.phone}): ${result.error}`); }
    }
  }

  return new Response(
    JSON.stringify({ ok: failed === 0, sent, skipped, failed, details }),
    { headers: { "Content-Type": "application/json" }, status: failed ? 207 : 200 }
  );
});

/* ---------------------------------------------------------------
   WhatsApp send. Written against Meta's own Cloud API request shape,
   which is what most BSPs (AiSensy, Wati, Interakt, Gupshup) either
   proxy directly or mirror closely. If your BSP wants its own wrapper
   format instead of the raw Cloud API, this is the one function to
   change, everything above it stays the same.

   The template itself (compliance_reminder) needs to be created and
   approved once in the WhatsApp Business Manager / your BSP's console
   before this will send anything. See BUILD_BRIEF.md, Week 2, for the
   suggested template text and variable order.
------------------------------------------------------------------*/
async function sendWhatsAppTemplate(args: {
  to: string; recipientName: string; companyName: string; complianceLabel: string;
  sectionRef: string; dueDate: string; daysOut: number;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const body = {
    messaging_product: "whatsapp",
    to: normalizePhone(args.to),
    type: "template",
    template: {
      name: waTemplateName,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: args.recipientName },
            { type: "text", text: args.companyName },
            { type: "text", text: args.complianceLabel },
            { type: "text", text: args.dueDate },
            { type: "text", text: args.daysOut === 0 ? "today" : `${args.daysOut} day${args.daysOut > 1 ? "s" : ""}` },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(waApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${waApiToken}` },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: JSON.stringify(json).slice(0, 500) };
    return { ok: true, messageId: json.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 500) };
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return digits.startsWith("91") ? digits : `91${digits.slice(-10)}`; // assumes Indian numbers; adjust if the portfolio ever spans countries
}

async function logResult(
  supabase: ReturnType<typeof createClient>, instanceId: string, contactId: string,
  templateCode: string, status: "sent" | "failed" | "skipped_no_optin",
  providerMessageId?: string, errorDetail?: string
) {
  await supabase.from("notification_log").insert({
    compliance_instance_id: instanceId, recipient_contact_id: contactId, channel: "whatsapp",
    template_code: templateCode, status, provider_message_id: providerMessageId ?? null, error_detail: errorDetail ?? null,
  });
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso + "T00:00:00Z").getTime() - new Date(fromIso + "T00:00:00Z").getTime()) / 86400000);
}

function jsonError(message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), { status: 500, headers: { "Content-Type": "application/json" } });
}
