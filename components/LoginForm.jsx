"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const C = {
  paper: "#F6F4EE",
  paperRaised: "#FFFFFF",
  ink: "#1E2321",
  inkSoft: "#5B6360",
  navy: "#1F3864",
  line: "#DEDACD",
  brick: "#A23E32",
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Type your email above first, then click this again.");
      return;
    }
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) setError(error.message);
    else setResetSent(true);
  }

  const field = {
    width: "100%",
    border: `1px solid ${C.line}`,
    borderRadius: 7,
    padding: "10px 12px",
    fontSize: 14,
    marginTop: 4,
  };
  const label = {
    fontSize: 11.5,
    color: C.inkSoft,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: C.paperRaised,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: 32,
          width: 360,
          maxWidth: "90vw",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily:
                '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
              fontSize: 22,
              color: C.navy,
              margin: 0,
            }}
          >
            The Oracle
          </h1>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>
            Producer Company compliance, live
          </div>
        </div>

        <label style={label}>
          Email
          <input
            style={field}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label style={label}>
          Password
          <input
            style={field}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && (
          <div style={{ fontSize: 12.5, color: C.brick }}>{error}</div>
        )}
        {resetSent && (
          <div style={{ fontSize: 12.5, color: C.inkSoft }}>
            Check your email for a link to set a new password.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: C.navy,
            color: "#fff",
            border: "none",
            borderRadius: 7,
            padding: "10px 14px",
            fontSize: 14,
            fontWeight: 600,
            marginTop: 4,
          }}
        >
          {loading ? "Signing in\u2026" : "Sign in"}
        </button>

        <button
          type="button"
          onClick={handleForgotPassword}
          style={{
            background: "none",
            border: "none",
            color: C.inkSoft,
            fontSize: 12.5,
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Forgot password?
        </button>
      </form>
    </div>
  );
}
