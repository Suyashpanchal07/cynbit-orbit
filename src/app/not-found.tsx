import Link from "next/link";
import { Shell } from "@/components/shell";
export default function NotFound(){return <Shell><div className="page-wrap"><div className="card panel"><h1>Page not found</h1><p className="empty-state">The requested ORBIT page does not exist.</p><Link className="text-link" href="/">Return to operations →</Link></div></div></Shell>;}
