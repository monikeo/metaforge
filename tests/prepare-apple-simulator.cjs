const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
if(process.platform!=='darwin')throw new Error('Apple Simulator setup requires macOS.');
console.log(execFileSync('xcodebuild',['-version'],{encoding:'utf8'}).trim());
const runtimes=JSON.parse(execFileSync('xcrun',['simctl','list','devices','available','--json'],{encoding:'utf8'})).devices;
const version=runtime=>(runtime.match(/iOS-(\d+)-(\d+)(?:-(\d+))?/)||[]).slice(1).map(value=>Number(value||0));
const available=Object.entries(runtimes).filter(([runtime])=>runtime.includes('iOS')).sort(([a],[b])=>{
 const av=version(a),bv=version(b);return (bv[0]-av[0])||(bv[1]-av[1])||(bv[2]-av[2]);
});
const devices=available.flatMap(([runtime,devices])=>devices.map(device=>({...device,runtime}))).filter(device=>device.isAvailable!==false&&device.name.startsWith('iPad'));
const device=devices.find(device=>device.name.includes('A16'))||devices[0];
if(!device)throw new Error('No available iPadOS Simulator runtime is installed.');
if(device.state!=='Booted')execFileSync('xcrun',['simctl','boot',device.udid],{stdio:'inherit',timeout:120000});
execFileSync('xcrun',['simctl','bootstatus',device.udid,'-b'],{stdio:'inherit',timeout:180000});
execFileSync('open',['-a','Simulator','--args','-CurrentDeviceUDID',device.udid],{stdio:'inherit',timeout:30000});
console.log(`Using iPadOS Simulator: ${device.name} (${device.runtime})`);
if(!process.env.GITHUB_ENV)throw new Error('Set SAFARI_SIMULATOR_UDID manually outside CI.');
fs.appendFileSync(process.env.GITHUB_ENV,`SAFARI_SIMULATOR_UDID=${device.udid}\n`);
