/* Verify that the dependency migration retains real React, Next and accessibility checks. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'metaforge-lint-'));
try {
 const fixtures=[
  ['hooks.tsx',"import {useState} from 'react'; export default function Example({ok}:{ok:boolean}){if(ok){useState(0)}return null}",'rules-of-hooks'],
  ['script.tsx','export default function Example(){return <script src="/blocking.js"/>}','no-sync-scripts'],
  ['aria.tsx','export default function Example(){return <button aria-unknown="true">Action</button>}','aria-props'],
 ];
 for(const [name,source,rule] of fixtures){
  const file=path.join(directory,name);fs.writeFileSync(file,source);
  const result=spawnSync(process.execPath,[path.resolve('node_modules/oxlint/bin/oxlint'),'--config',path.resolve('.oxlintrc.json'),'--deny-warnings',file],{encoding:'utf8',windowsHide:true});
  assert.notEqual(result.status,0,`${rule} must reject invalid code`);
  assert.match(result.stdout+result.stderr,new RegExp(rule));
  console.log(`PASS lint guard: ${rule}`);
 }
} finally {
 if(path.dirname(path.resolve(directory))!==path.resolve(os.tmpdir())||!path.basename(directory).startsWith('metaforge-lint-'))throw new Error('Invalid temporary directory');
 fs.rmSync(directory,{recursive:true,force:true});
}
