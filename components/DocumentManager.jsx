"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/**
 * DocumentManager
 *
 * Upload and browse documents for one company, stored in the
 * `compliance-documents` Supabase Storage bucket (created in
 * schema.sql) and tracked in the `documents` table, categorised per
 * migration 002.
 *
 * Usage:
 *   <DocumentManager companyId={co.id} />
 */

const C = { navy: "#1F3864", ink: "#1E2321", inkSoft: "#5B6360", line: "#DEDACD", paper: "#F6F4EE" };

const CATEGORIES = [
  { value: "gst_certificate", label: "GST certificate" },
  { value: "incorporation_certificate", label: "Certificate of incorporation" },
  { value: "audit_report", label: "Audit report" },
  { value: "filing_proof", label: "Filing proof" },
  { value: "other", label: "Other" },
];

export default function DocumentManager({ companyId }) {
  const [documents, setDocuments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [category, setCategory] = useState("filing_proof");
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadDocuments = useCallback(async () => {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("company_id", companyId)
      .order("uploaded_at", { ascending: false });
    setDocuments(data || []);
    setLoadingList(false);
  }, [companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const path = `${companyId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("compliance-documents").upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        company_id: companyId, file_path: path, category, description: file.name,
      });
      if (insertError) throw insertError;

      await loadDocuments();
    } catch (err) {
      setErrorMsg(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function openDocument(filePath) {
    const { data, error } = await supabase.storage.from("compliance-documents").createSignedUrl(filePath, 60);
    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 9px", fontSize: 12.5 }}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <label style={{
          display: "flex", alignItems: "center", gap: 6, background: C.navy, color: "#fff",
          borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
        }}>
          {uploading ? <Loader2 size={13} className="dm-spin" /> : <Upload size={13} />}
          {uploading ? "Uploading" : "Upload"}
          <input type="file" onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
        </label>
      </div>

      {errorMsg && <div style={{ fontSize: 12.5, color: "#A23E32", marginBottom: 10 }}>{errorMsg}</div>}

      {loadingList ? (
        <div style={{ fontSize: 12.5, color: C.inkSoft, fontStyle: "italic" }}>Loading documents&hellip;</div>
      ) : documents.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.inkSoft, fontStyle: "italic" }}>No documents uploaded for this company yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {documents.map((doc) => (
            <button key={doc.id} onClick={() => openDocument(doc.file_path)}
              style={{
                display: "flex", alignItems: "center", gap: 8, background: C.paper, border: `1px solid ${C.line}`,
                borderRadius: 7, padding: "8px 10px", fontSize: 12.5, textAlign: "left", color: C.ink,
              }}>
              <FileText size={14} color={C.navy} />
              <span style={{ flex: 1 }}>{doc.description || doc.file_path.split("/").pop()}</span>
              <span style={{ fontSize: 11, color: C.inkSoft, textTransform: "capitalize" }}>{doc.category.replace(/_/g, " ")}</span>
              <ExternalLink size={12} color={C.inkSoft} />
            </button>
          ))}
        </div>
      )}

      <style>{`.dm-spin { animation: dmspin 0.8s linear infinite; } @keyframes dmspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
