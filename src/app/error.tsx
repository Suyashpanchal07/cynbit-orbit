"use client";
import { useEffect } from "react";
export default function Error({error,reset}:{error:Error & {digest?:string};reset:()=>void}){useEffect(()=>{console.error("ORBIT page error",error);},[error]);return <main className="page-wrap"><div className="card panel"><h1>Something went wrong</h1><p className="empty-state">The page could not load. Your synthetic environment state was not changed.</p><button className="button primary" onClick={reset}>Try again</button></div></main>;}
