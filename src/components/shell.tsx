import Link from "next/link";

const items = [["/", "⌂", "Overview"], ["/incidents", "◷", "Incidents"], ["/simulation", "⌁", "Simulation lab"], ["/evaluations", "▦", "Evaluations"], ["/settings", "⚙", "Settings"]];
export function Shell({ children, active = "/", scenario }: { children: React.ReactNode; active?: string; scenario?: string }) {
  return <div className="app-shell">
    <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">O</span><span><b>CYNBIT</b><small>ORBIT</small></span></Link>
      <div className="workspace-label">WORKSPACE</div><nav aria-label="Main navigation">{items.map(([href, icon, label]) => <Link key={href} href={href} className={`nav-item ${active === href ? "selected" : ""}`}><span className="nav-icon">{icon}</span>{label}{label === "Incidents" && <span className="nav-count">LIVE</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="environment-dot"><i/>SIMULATOR · SYNTHETIC</div><p>Proof of concept<br/>v0.1.0 · Synthetic only</p></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="crumb">OPERATIONS <span>/</span> <b>{items.find((item) => item[0] === active)?.[2] ?? "Incident detail"}</b></div><div className="top-status"><span className="env-chip"><i/>SIMULATED ENVIRONMENT</span><span className="top-scenario">● &nbsp;{scenario ?? "Synthetic telemetry"}</span></div></header><div className="mobile-nav">{items.map(([href, icon, label]) => <Link key={href} href={href} aria-label={label} className={active === href ? "selected" : ""}>{icon}</Link>)}</div>{children}</main>
  </div>;
}
export function Banner() { return <div className="synthetic-banner"><span>◆</span><b>SYNTHETIC DEMO DATA</b><span>— no real infrastructure is connected</span><span className="banner-right">ISOLATED ENVIRONMENT</span></div>; }
