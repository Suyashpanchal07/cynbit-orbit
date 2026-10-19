"use client";
import { useState } from "react";
export function ExplanationWidget({ incidentId }: { incidentId: string }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const explain = async () => {
    setBusy(true);setError("");
    try { const response=await fetch("/api/explain",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({incidentId})});const result=await response.json();if(!response.ok)throw new Error(result.error);setMode(result.mode);setText(result.text); }
    catch(e){setError(e instanceof Error?e.message:"Explanation unavailable.");}
    finally{setBusy(false);}
  };
  return <section className="card panel wide-panel"><div className="panel-head"><div><h2>Evidence explanation</h2><p>Optional model explanation of synthetic observations; never authorizes actions.</p></div><button className="button" disabled={busy} onClick={()=>void explain()}>{busy?"Explaining…":"Explain evidence"}</button></div>{error&&<div className="notice error" role="alert">{error}</div>}{text&&<><span className="subtle-tag">{mode.toUpperCase()}</span><p className="explanation-text">{text}</p></>}</section>;
}
