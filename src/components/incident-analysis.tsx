import type { Incident, Service } from "@/lib/orbit";

export function IncidentAnalysis({ incident, services }: { incident: Incident; services: Service[] }) {
  const trigger = services.find((service) => service.id === incident.trigger);
  const measures = trigger ? [
    { signal: "Latency", baseline: `${trigger.baseline} ms`, current: `${trigger.latency} ms`, threshold: `${Math.round(trigger.baseline * 1.35)} ms`, score: incident.analysis?.find((a) => a.signal === "latency")?.score },
    { signal: "Error rate", baseline: `${trigger.baselineError}%`, current: `${trigger.error}%`, threshold: "2%", score: incident.analysis?.find((a) => a.signal === "error")?.score },
    { signal: "CPU", baseline: "50% reference", current: `${trigger.cpu}%`, threshold: "80%", score: incident.analysis?.find((a) => a.signal === "cpu")?.score },
    { signal: "Memory", baseline: "70% reference", current: `${trigger.memory}%`, threshold: "85%", score: incident.analysis?.find((a) => a.signal === "memory")?.score },
  ] : [];
  return <section className="card panel wide-panel"><h2>Signal assessment</h2><p className="panel-head"><span>Observed values and calculated anomaly ranking for the trigger service.</span></p><div className="table-wrap"><table className="data-table"><thead><tr><th>SIGNAL</th><th>BASELINE</th><th>CURRENT</th><th>THRESHOLD</th><th>SCORE</th><th>SEVERITY</th></tr></thead><tbody>{measures.map((m) => { const current=Number.parseFloat(m.current);const limit=Number.parseFloat(m.threshold);const severity=current>limit?"warning":"normal";return <tr key={m.signal}><td>{m.signal}</td><td>{m.baseline}</td><td>{m.current}</td><td>{m.threshold}</td><td>{m.score===undefined?"Run analysis":`${Math.round(m.score*100)}%`}</td><td>{severity}</td></tr>; })}</tbody></table></div>
    <h2 style={{marginTop:22}}>Ranked root-cause candidates</h2><p className="panel-head"><span>Model inference from current synthetic service signals; not a causal finding.</span></p>{incident.rootCauseCandidates?.slice(0,3).map((cause,index)=>{const service=services.find((item)=>item.id===cause.serviceId);return <div className="candidate" key={cause.serviceId}><b>{index===0?"Leading candidate · ":""}{service?.name??cause.serviceId}</b><span>{Math.round(cause.score*100)}% · {cause.confidence} confidence</span><p><b>Evidence for:</b> {cause.evidenceFor.join("; ")}</p><p><b>Evidence against:</b> {cause.evidenceAgainst.join("; ")}</p></div>;})??<p className="empty-state">Run analysis to rank plausible service candidates.</p>}</section>;
}
