import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is required to seed the simulator."); process.exit(1); }
const sql = postgres(url, { max: 1, connect_timeout: 10, ssl: "require" });
const state = { services: [
  {id:"web",name:"Web Gateway",kind:"edge",status:"healthy",latency:48,baseline:48,error:0.2,baselineError:0.2,cpu:31,memory:54},
  {id:"checkout",name:"Checkout API",kind:"service",status:"healthy",latency:82,baseline:82,error:0.4,baselineError:0.4,cpu:42,memory:61},
  {id:"catalog",name:"Catalog API",kind:"service",status:"healthy",latency:67,baseline:67,error:0.1,baselineError:0.1,cpu:28,memory:48},
  {id:"orders",name:"Order Worker",kind:"worker",status:"healthy",latency:105,baseline:105,error:0.3,baselineError:0.3,cpu:37,memory:58},
  {id:"cache",name:"Redis Cache",kind:"cache",status:"healthy",latency:4,baseline:4,error:0,baselineError:0,cpu:22,memory:46},
  {id:"postgres",name:"Orders DB",kind:"database",status:"healthy",latency:12,baseline:12,error:0.1,baselineError:0.1,cpu:35,memory:66}
],incidents:[],events:[{at:new Date().toISOString(),text:"Synthetic environment initialized"}],step:0,scenario:"Baseline"};
try { await sql`INSERT INTO orbit_simulator_state (singleton,state) VALUES (true,${JSON.stringify(state)}::jsonb) ON CONFLICT (singleton) DO NOTHING`; console.log("Seeded baseline if database was empty."); }
catch(error) { console.error("Seed failed. Run db:migrate first:",error instanceof Error?error.message:"unknown error"); process.exitCode=1; }
finally { await sql.end(); }
