"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import LoginForm from "@/components/LoginForm";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [session, setSession] = useState(undefined); // undefined = still checking, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#5B6360" }}>
        Loading&hellip;
      </div>
    );
  }

  return session ? <Dashboard /> : <LoginForm />;
}
