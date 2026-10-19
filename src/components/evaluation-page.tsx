"use client";
import { useEffect, useState } from "react";
import { Banner, Shell } from "@/components/shell";

type Run = { id: string; createdAt: string; results: { name: string; passed: boolean; expected: string; actual: string }[] };
export function EvaluationPage() {
  const [run, setRun] = useState<Run | null>(null);
  const [history, setHistory] = useState<Run[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const response=await fetch("/api/evaluations",{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.error);setHistory(body.runs);setError(""); } catch(e) { setError(e instanceof Error?e.message:"Evaluation history unavailable."); } };
  useEffect(()=>{let cancelled=false;fetch("/api/evaluations",{cache:"no-store"}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error);if(!cancelled)setHistory(body.runs);}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"Evaluation history unavailable.");});return()=>{cancelled=true;};},[]);
  const execute = async () => { setBusy(true);setError("");try{const response=await fetch("/api/evaluations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({run:true})});const body=await response.json();if(!response.ok)throw new Error(body.error);setRun(body.run);await load();}catch(e){setError(e instanceof Error?e.message:"Evaluation suite failed.");}finally{setBusy(false);} };
  const shown=run??history[0]??null;
  return <Shell active="/evaluations"><div className="page-wrap secondary-page"><Banner/><div className="page-heading"><div><div className="eyebrow">ORBIT / SYNTHETIC ENVIRONMENT</div><h1>Evaluations</h1><p>Deterministic fixture suite for simulator analysis behavior.</p></div></div>
    {error&&<div className="notice error" role="alert">{error}<button onClick={()=>void load()}>Retry</button></div>}
    <section className="card panel wide-panel"><div className="panel-head"><div><h2>Core behavior suite</h2><p>Server-calculated fixtures · no paid model provider is called</p></div><button className="button primary" disabled={busy} onClick={()=>void execute()}>{busy?"Running…":"▶ Run evaluation suite"}</button></div>
      {shown?<><div className="notice success" role="status">Run {shown.id} · {shown.results.filter(r=>r.passed).length} passed · {shown.results.filter(r=>!r.passed).length} failed · {new Date(shown.createdAt).toLocaleString()}</div><div className="table-wrap"><table className="data-table"><thead><tr><th>TEST CASE</th><th>RESULT</th><th>EXPECTED</th><th>ACTUAL</th><th>DETAIL</th></tr></thead><tbody>{shown.results.map(r=><tr key={r.name}><td>{r.name}</td><td className={r.passed?"good":"bad"}>{r.passed?"PASS":"FAIL"}</td><td>{r.expected}</td><td>{r.actual}</td><td>{r.passed?"Fixture behavior matched":"Fixture result mismatch"}</td></tr>)}</tbody></table></div><p className="kpi-note">Evaluation records are stored in the configured database or the local development session.</p></>:<p className="empty-state">Run the suite to calculate results from synthetic telemetry fixtures.</p>}
    </section><section className="card panel wide-panel"><h2>Evaluation history</h2>{history.length?history.map(item=><button className="event-row" key={item.id} onClick={()=>setRun(item)}><i/><span>{item.id} · {item.results.filter(r=>r.passed).length}/{item.results.length} passed</span><small>{new Date(item.createdAt).toLocaleString()}</small></button>):<p className="empty-state">No evaluation runs stored yet.</p>}</section>
    <section className="card panel wide-panel"><h2>Method and limitations</h2><p className="panel-head"><span>These are deterministic fixtures, not validated production model performance.</span></p><p className="footer-note">The suite compares the observed top signal and health state with each fixture’s expected outcome. It does not estimate model precision or recall against real incidents.</p></section></div></Shell>;
}
