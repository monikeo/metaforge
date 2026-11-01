/* Starts the production artifact for CI, then reliably stops only its own server. */
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const base=process.env.BASE_URL||'http://127.0.0.1:3100';
const address=new URL(base);
if(!['127.0.0.1','localhost'].includes(address.hostname))throw new Error('The CI server must bind to localhost.');
const logfile=fs.openSync('tests/server.log','a');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',address.port||'3100'],{stdio:['ignore',logfile,logfile],windowsHide:true});
const delay=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
let active;
async function run(script){
 await new Promise((resolve,reject)=>{
  active=spawn(process.execPath,[script],{stdio:'inherit',windowsHide:true,env:{...process.env,BASE_URL:base}});
  active.on('error',reject);
  active.on('exit',(code,signal)=>code===0?resolve():reject(new Error(`${script} failed (${code??signal})`)));
 });
}
(async()=>{
 try{
  let ready=false;
  for(let attempt=0;attempt<120;attempt++){
   if(server.exitCode!==null)throw new Error('The production server exited before it was ready.');
   try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{/* Wait for startup. */}
   await delay(500);
  }
  if(!ready)throw new Error('The production server did not become ready.');
  for(const script of process.argv.slice(2))await run(script);
 }finally{
  active?.kill();server.kill();fs.closeSync(logfile);
 }
})().catch(error=>{console.error(error);process.exitCode=1});
