const { io } = require("socket.io-client");
const base = "http://localhost:5000";
async function j(m,p,b,t){const r=await fetch(base+p,{method:m,headers:{"Content-Type":"application/json",...(t?{Authorization:"Bearer "+t}:{})},body:b?JSON.stringify(b):undefined});return{status:r.status,data:await r.json().catch(()=>null)};}
(async()=>{
  const socket=io(base,{transports:["websocket"]});
  const seen={trust:0,scan:0,decoy:0,risk:0};
  socket.on("trust-score-update",()=>seen.trust++);
  socket.on("message-scanned",()=>seen.scan++);
  socket.on("decoy-touched",p=>{if(p.state==="tripped")seen.decoy++;});
  socket.on("risk-level-change",()=>seen.risk++);
  await new Promise(r=>socket.on("connect",r));

  // 1. login → dashboard data
  const login=await j("POST","/api/auth/login",{email:"adaeze@unionbank.ng",password:"demo1234"});
  const token=login.data.token;
  const bal=await j("GET","/api/account/balance",null,token);
  const txns=await j("GET","/api/transactions/recent",null,token);
  console.log("[1] login+dashboard :", login.status===200 && bal.status===200 ? `OK (user=${login.data.user.name}, balance=${bal.data.balance}, ${txns.data.length} txns)` : "FAIL");

  // 2. three overlay states from live trust + NLP
  const soft=(await j("POST","/api/trust-score",{scenario:"unusual"},token)).data;
  const hard=(await j("POST","/api/trust-score",{scenario:"fraud"},token)).data;
  const nlp=(await j("POST","/api/scan-message",{message:"Your BVN is suspended, re-validate at http://union-bank-secure.link now"})).data;
  console.log("[2] overlay states  :", soft.action==="soft-step-up" && hard.action==="hard-step-up" && nlp.intent==="suspicious" ? `OK (soft=${soft.score}, hard=${hard.score}+signals[${hard.signals.length}], nlp=${nlp.intent})` : "FAIL");

  // 3. breach via real decoy-touched — trip it with the real decoy card
  const { Client } = require("pg"); require("dotenv").config();
  const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); await c.connect();
  const card=(await c.query("SELECT decoy_value FROM decoy_fields WHERE field_type='card_number' LIMIT 1")).rows[0].decoy_value; await c.end();
  const transfer=await j("POST","/api/transfer",{recipient:card,card_number:card,amount:999999});
  await new Promise(r=>setTimeout(r,600));
  console.log("[3] breach/decoy    :", seen.decoy>0 && transfer.data.overlay==="breach" ? `OK (decoy-touched fired, transfer ${transfer.status} blocked)` : "FAIL");

  // 4. admin dashboard: 3 panels streaming
  console.log("[4] admin streaming :", seen.trust>0 && seen.scan>0 && (seen.decoy>0||seen.risk>0) ? `OK (trust=${seen.trust}, scan=${seen.scan}, decoy=${seen.decoy}, risk=${seen.risk} events)` : "FAIL");

  socket.close();
})();
