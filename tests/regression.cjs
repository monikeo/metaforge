/* Regression tests for binary exports and state transitions. No network calls. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText, filename);
global.FileReader = class {
 readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onload?.(); }).catch(error=>this.onerror?.(error)); }
};
// Browser image decoding and real dimensions are covered separately in browser QA.
global.Image = class { set src(_value) { this.naturalWidth=16;this.naturalHeight=12;queueMicrotask(()=>this.onload?.()); } };
const writer = require('../src/lib/metadata-writer.ts');
const reader = require('../src/lib/metadata-reader.ts');
const {analyzePrivacyRisks} = require('../src/lib/privacy-rules.ts');
const {buildImageSitemap} = require('../src/lib/sitemap.ts');
const {workspaceHref,workspaceView} = require('../src/lib/navigation.ts');
const {classifyGeminiError,parseGeminiSeoResponse,prepareImageForAi} = require('../src/lib/ai-service.ts');
const {encodeCanvas} = require('../src/lib/canvas-encoder.ts');
const {createSampleExifImage,createSampleAiPng} = require('../src/lib/sample-data.ts');
const {DEFAULT_GEMINI_MODEL,normalizeGeminiModel} = require('../src/lib/ai-models.ts');
const {useMetaForgeStore:store,safeFilename,validatePreset} = require('../src/lib/store.ts');
const piexif = require('piexifjs');
const exifr = require('exifr');
const fixture = (ext,type) => new File([fs.readFileSync(`${__dirname}/fixtures/image.${ext}`)],`image.${ext}`,{type});
const tests=[]; const test=(name,run)=>tests.push({name,run});
let gpsFile;

test('Canvas encoding validates actual bytes and rejects empty or unsupported output',async()=>{
 const jpeg=fixture('jpg','image/jpeg');
 const wrongMime=new Blob([jpeg],{type:'image/png'});
 const normalized=await encodeCanvas({toBlob:callback=>callback(wrongMime)},'image/jpeg');
 assert.equal(normalized.type,'image/jpeg');
 const requested=[];
 const fallback=await encodeCanvas({toBlob:(callback,type)=>{requested.push(type);callback(type==='image/jpeg'?null:fixture('png','image/png'))}},'image/jpeg');
 assert.deepEqual(requested,['image/jpeg','image/png']);assert.equal(fallback.type,'image/png');
 await assert.rejects(()=>encodeCanvas({toBlob:callback=>callback(null)}),/could not encode/);
 await assert.rejects(()=>encodeCanvas({toBlob:(callback,type)=>type==='image/jpeg'?queueMicrotask(()=>callback(null)):(()=>{throw new Error('PNG encoder failed')})()},'image/jpeg'),/PNG encoder failed/);
 await assert.rejects(()=>encodeCanvas({toBlob:callback=>callback(new Blob(['broken']))}),/unsupported image encoding/);
});

test('PNG codec fallback keeps native sample GPS and sends Gemini the actual preview MIME type',async()=>{
 const previousDocument=global.document;
 const png=fixture('png','image/png');
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]||(()=>{})});
 global.document={createElement:()=>({getContext:()=>context,toBlob:callback=>callback(png)})};
 try{
  const sample=await createSampleExifImage({title:'Safari PNG fallback',cameraMake:'Sony',cameraModel:'Camera',lensModel:'Lens',serialNumber:'SAMPLE-SERIAL',artist:'Sample artist',copyright:'Sample copyright',latitude:35.6595,longitude:139.7005,color:'#0369a1'});
  assert.equal(sample.type,'image/png');assert.match(sample.name,/\.png$/);
  const native=await exifr.parse(Buffer.from(await sample.arrayBuffer()));
  assert.equal(native.Make,'Sony');assert.ok(Math.abs(native.latitude-35.6595)<0.000001);
  const parsed=await reader.parseDeepMetadata(sample);assert.equal(parsed.privacyReport.hasGps,true);
  const preview=await prepareImageForAi(sample);
  assert.equal(preview.mimeType,'image/png');assert.deepEqual(Buffer.from(preview.base64Data,'base64'),Buffer.from(await png.arrayBuffer()));
  const aiSample=await createSampleAiPng();assert.equal(aiSample.type,'image/png');
  const workflow=(await reader.parseDeepMetadata(aiSample)).aiWorkflow;
  assert.equal(workflow.type,'ComfyUI');assert.equal(workflow.seed,'7849102');assert.equal(workflow.steps,8);assert.match(workflow.prompt,/Tokyo neon streets/);
 }finally{if(previousDocument===undefined)delete global.document;else global.document=previousDocument}
});

test('Gemini model defaults support new projects and reject unknown saved models',()=>{
 assert.equal(normalizeGeminiModel(undefined),DEFAULT_GEMINI_MODEL);
 assert.equal(normalizeGeminiModel('not-a-model'),DEFAULT_GEMINI_MODEL);
 assert.equal(normalizeGeminiModel('gemini-2.5-flash'),'gemini-2.5-flash');
 store.getState().setSelectedModel('invalid');assert.equal(store.getState().selectedModel,DEFAULT_GEMINI_MODEL);
});
test('Gemini errors distinguish credentials, permissions, quota, servers and timeouts',()=>{
 for(const [input,expected] of [[{status:400,message:'API_KEY_INVALID'},/Invalid Gemini API Key/],[{status:403},/access denied/],[{status:429},/quota and billing/],[{status:402},/billing credits/],[{status:503},/temporarily unavailable/],[{message:'The operation timed out'},/timed out/],[{message:'Load failed'},/Network connection/],[{status:404},/model is unavailable/]]) assert.match(classifyGeminiError(input).message,expected);
 assert.equal(classifyGeminiError(new Error('request failed ?key=PRIVATE_TEST_SENTINEL')).message.includes('PRIVATE_TEST_SENTINEL'),false);
});
test('Gemini JSON validation rejects incomplete drafts and normalizes valid output',()=>{
 for(const value of ['', '{}','[]','null',JSON.stringify({title:'',caption:'caption',altText:'alt',keywords:[]}),JSON.stringify({title:'title',caption:'caption',altText:'alt',keywords:[42]})]) assert.throws(()=>parseGeminiSeoResponse(value),/Could not parse/);
 const result=parseGeminiSeoResponse('```json\n'+JSON.stringify({title:'  Forest  ',caption:' Caption ',altText:' Alt ',keywords:['tree','tree','  '],privacyFlags:{containsFaces:'true'}})+'\n```');
 assert.equal(result.title,'Forest');assert.equal(result.caption,'Caption');assert.equal(result.altText,'Alt');assert.deepEqual(result.keywords,['tree']);assert.equal(result.privacyFlags.containsFaces,false);
});

test('Workspace URLs validate views and retain legacy batch links',()=>{
 for(const view of ['dashboard','compare','presets','jobs']) assert.equal(workspaceHref(workspaceView(view)),`/?view=${view}`);
 for(const view of [null,undefined,'not-a-view','studio']) assert.equal(workspaceHref(workspaceView(view)),'/');
 assert.equal(workspaceView('batch'),'jobs');
 store.getState().setCurrentView('batch');assert.equal(store.getState().currentView,'jobs');
 store.getState().setCurrentView('studio');
});
test('JPEG fixture exposes native GPS, serial, and artist',async()=>{
 const source=fixture('jpg','image/jpeg'); const url=await writer.blobToDataUrl(source);
 const exif=writer.ensureExifDicts(piexif.load(url));
 exif['0th'][piexif.ImageIFD.Artist]='Original Artist'; exif['0th'][piexif.ImageIFD.Make]='Sony';
 exif.Exif[piexif.ExifIFD.BodySerialNumber]='SERIAL-123';
 exif.GPS[piexif.GPSIFD.GPSLatitudeRef]='N';exif.GPS[piexif.GPSIFD.GPSLatitude]=piexif.GPSHelper.degToDmsRational(0);
 exif.GPS[piexif.GPSIFD.GPSLongitudeRef]='E';exif.GPS[piexif.GPSIFD.GPSLongitude]=piexif.GPSHelper.degToDmsRational(139.7);
 gpsFile=new File([writer.dataUrlToBlob(piexif.insert(piexif.dump(exif),url))],'gps.jpg',{type:'image/jpeg'});
 const parsed=await reader.parseDeepMetadata(gpsFile);assert.equal(parsed.rawMetadata.exif.Make,'Sony');assert.equal(parsed.privacyReport.hasGps,true);assert.equal(parsed.privacyReport.riskLevel,'HIGH');assert.equal(parsed.privacyReport.hasDeviceSerial,true);
});
test('GPS removal strips native and secondary location without changing JPEG pixels',async()=>{
 const withXmp=await writer.writeMetadataToBlob(gpsFile,{gps:{latitude:0,longitude:139.7},xmp:{GPSLatitude:0,secret:'gps secondary'}});
 const clean=await writer.stripGpsFromBlob(withXmp);const parsed=await reader.parseDeepMetadata(new File([clean],'clean.jpg',{type:clean.type}));
 assert.equal(parsed.privacyReport.hasGps,false);assert.equal((await exifr.parse(Buffer.from(await clean.arrayBuffer())))?.GPSLatitude,undefined);
 const sourceBytes=Buffer.from(await gpsFile.arrayBuffer()),cleanBytes=Buffer.from(await clean.arrayBuffer());
 assert.deepEqual(sourceBytes.subarray(sourceBytes.indexOf(Buffer.from([255,218]))),cleanBytes.subarray(cleanBytes.indexOf(Buffer.from([255,218]))));
});
for(const [ext,type] of [['jpg','image/jpeg'],['png','image/png'],['webp','image/webp']]){
 test(`${ext}: Unicode SEO and arbitrary tags survive export/re-import`,async()=>{
  const blob=await writer.writeMetadataToBlob(fixture(ext,type),{iptc:{Headline:'日本語 & <forest>',Caption:'Caption',Keywords:['green','tree']},xmp:{altText:'Accessible 🌳',custom:'secret'}});
  const parsed=await reader.parseDeepMetadata(new File([blob],`roundtrip.${ext}`,{type}));
  assert.equal(parsed.seoData.title,'日本語 & <forest>');assert.equal(parsed.seoData.altText,'Accessible 🌳');assert.equal(parsed.rawMetadata.xmp.custom,'secret');
 });
 test(`${ext}: full metadata removal removes SEO and custom metadata`,async()=>{
  const blob=await writer.writeMetadataToBlob(fixture(ext,type),{iptc:{Headline:'REMOVE_ME'},xmp:{private:'REMOVE_ME'}});
  const clean=await writer.stripAllMetadataFromBlob(blob);assert.equal(Buffer.from(await clean.arrayBuffer()).includes(Buffer.from('REMOVE_ME')),false);
  assert.equal(writer.imageFormat(new Uint8Array(await clean.arrayBuffer())),type);
 });
}
for(const ext of ['png','webp']) test(`${ext}: native EXIF survives edits and serial deletion updates the packet`,async()=>{
 const exif=piexif.load(await writer.blobToDataUrl(gpsFile));
 const payload=Buffer.from(piexif.dump(exif),'binary');
 let bytes=Buffer.from(await fixture(ext,`image/${ext}`).arrayBuffer());
 if(ext==='png'){
  const packets=writer.containerPackets(bytes);
  bytes=Buffer.concat([bytes.subarray(0,8),Buffer.from(writer.pngChunk('eXIf',payload.subarray(6))),...packets.map(p=>Buffer.from(p.packet))]);
 }else{
  const packets=writer.containerPackets(bytes);
  const vp8x=packets.find(p=>p.type==='VP8X');assert.ok(vp8x);vp8x.packet[8]|=8;
  const chunk=Buffer.alloc(8+payload.length+(payload.length%2));chunk.write('EXIF');chunk.writeUInt32LE(payload.length,4);payload.copy(chunk,8);
  bytes=Buffer.concat([bytes.subarray(0,12),...packets.map(p=>Buffer.from(p.packet)),chunk]);bytes.writeUInt32LE(bytes.length-8,4);
 }
 const file=new File([bytes],`native.${ext}`,{type:`image/${ext}`});
 const parsed=await reader.parseDeepMetadata(file);assert.equal(parsed.privacyReport.hasGps,true);assert.equal(parsed.rawMetadata.exif.Make,'Sony');
 const raw=structuredClone(parsed.rawMetadata);delete raw.exif.SerialNumber;delete raw.exif.BodySerialNumber;
 const changed=await writer.writeMetadataToBlob(file,raw,{section:'exif',key:'SerialNumber',remove:true});
 const packet=writer.containerPackets(new Uint8Array(await changed.arrayBuffer())).find(p=>p.type===(ext==='png'?'eXIf':'EXIF'));
 const native=piexif.load('Exif\0\0'+Buffer.from(packet.data).toString('binary').replace(/^Exif\0\0/,''));
 assert.equal(native.Exif[piexif.ExifIFD.BodySerialNumber],undefined);assert.equal(native['0th'][piexif.ImageIFD.Make],'Sony');
});
test('Compressed PNG workflow chunks after large IDAT are read',async()=>{
 const zlib=require('node:zlib'),bytes=new Uint8Array(await fixture('png','image/png').arrayBuffer());
 const packets=writer.containerPackets(bytes); const params='a red cat\nSteps: 20, Sampler: Euler, Seed: 123';
 const compressed=writer.pngChunk('zTXt',Buffer.concat([Buffer.from('parameters\0\0'),zlib.deflateSync(Buffer.from(params))]));
 const blob=new Blob([bytes.subarray(0,8),...packets.filter(p=>p.type!=='IEND').map(p=>p.packet),compressed,packets.at(-1).packet],{type:'image/png'});
 const chunks=await reader.parsePngTextChunks(blob);assert.equal(chunks.parameters,params);assert.equal(reader.detectAiWorkflow({},chunks).seed,'123');
});
test('ComfyUI prompt-only graph exposes copyable workflow',()=>{
 const prompt=JSON.stringify({'1':{class_type:'CLIPTextEncode',inputs:{text:'forest'}}});
 const info=reader.detectAiWorkflow({},{prompt});assert.equal(info.type,'ComfyUI');assert.equal(info.prompt,'forest');assert.equal(info.rawWorkflow,prompt);
});
test('Privacy detection handles zero, namespaced GPS, JSON, and cycles',()=>{
 const raw={xmp:{'exif:GPSLatitude':0},pngChunks:{parameters:'{"longitude":0}'}};raw.cycle=raw;
 assert.equal(analyzePrivacyRisks(raw).hasGps,true);assert.equal(analyzePrivacyRisks({iptc:{'By-line':'Name'}}).hasPersonalInfo,true);
});
test('Sitemap validates domains, normalizes paths, escapes XML and uses current tags',()=>{
 const xml=buildImageSitemap('https://example.com/path/?a=1&b=2',[{name:'a&b.jpg'}]);
 assert.ok(xml.includes('/path/images/a%26b.jpg'));assert.ok(!xml.includes('image:caption'));assert.throws(()=>buildImageSitemap('javascript:alert(1)',[]));assert.throws(()=>buildImageSitemap('not a domain',[]));
});
test('Filename and preset validation reject malformed input',()=>{
 assert.ok(!/[\\/]/.test(safeFilename('../../image.png','image/jpeg')));
 assert.throws(()=>validatePreset({name:'bad',category:'Custom',stripGps:'false',stripSerials:false}));
 assert.throws(()=>validatePreset({name:'bad',category:'Custom',stripGps:false,stripSerials:false,tags:{keywords:[7]}}));
});
test('Store serializes concurrent edits and restores exact metadata snapshots',async()=>{
 store.getState().clearFiles();assert.equal(await store.getState().addFiles([gpsFile]),true);
 const id=store.getState().files[0].id;
 await Promise.all([store.getState().updateTag(id,'exif','Artist','New Artist'),store.getState().updateTag(id,'exif','Copyright','Copyright 2026')]);
 let file=store.getState().files[0];assert.equal(file.rawMetadata.exif.Artist,'New Artist');assert.equal(file.rawMetadata.exif.Copyright,'Copyright 2026');
 const edit=file.history.find(h=>h.previousRaw?.exif?.Artist==='Original Artist');assert.ok(edit);
 await store.getState().restoreHistory(id,edit.id);file=store.getState().files[0];assert.equal(file.rawMetadata.exif.Artist,'Original Artist');assert.equal(file.privacyReport.hasGps,true);
});
test('Deleting an EXIF tag changes actual exported bytes and can be undone',async()=>{
 let file=store.getState().files[0];await store.getState().deleteTag(file.id,'exif','Artist');file=store.getState().files[0];
 assert.equal(file.rawMetadata.exif.Artist,undefined);const native=await exifr.parse(Buffer.from(await file.modifiedBlob.arrayBuffer()));assert.equal(native?.Artist,undefined);
 await store.getState().restoreHistory(file.id,file.history[0].id);assert.equal(store.getState().files[0].rawMetadata.exif.Artist,'Original Artist');
});
test('SEO save keeps title, caption, alt text and keywords separate',async()=>{
 let file=store.getState().files[0];store.getState().applyAiSeo(file.id,{title:'Title',caption:'Caption',altText:'Alt',keywords:['tag']});
 assert.equal(await store.getState().writeSeoToMetadata(file.id),true);file=store.getState().files[0];
 assert.deepEqual(file.seoData,{title:'Title',caption:'Caption',altText:'Alt',keywords:['tag']});
});
test('Batch errors are real and do not discard successful files',async()=>{
 await store.getState().addFiles([fixture('png','image/png')]);const ids=store.getState().files.map(f=>f.id);
 const preset={name:'Privacy',category:'Privacy',description:'',tags:{},stripGps:true,stripSerials:true};store.getState().createPreset(preset);
 assert.equal(await store.getState().applyPreset(store.getState().presets.at(-1).id,ids),true);
 assert.equal(store.getState().batchJobs[0].completed,2);assert.equal(store.getState().batchJobs[0].status,'COMPLETED');
 assert.equal(store.getState().files.every(f=>!f.privacyReport.hasGps&&!f.privacyReport.hasDeviceSerial),true);
 assert.equal(await store.getState().batchRename(ids,'{unknown}'),false);assert.equal(store.getState().batchJobs[0].failed,2);
});
test('Serial-only presets preserve GPS and camera telemetry',async()=>{
 store.getState().clearFiles();await store.getState().addFiles([gpsFile]);
 store.getState().createPreset({name:'Serials only',category:'Custom',description:'',tags:{},stripGps:false,stripSerials:true});
 const file=store.getState().files[0];assert.equal(await store.getState().applyPreset(store.getState().presets.at(-1).id,[file.id]),true);
 const result=store.getState().files[0];assert.equal(result.privacyReport.hasGps,true);assert.equal(result.privacyReport.hasDeviceSerial,false);assert.equal(result.rawMetadata.exif.Make,'Sony');
 await store.getState().addFiles([fixture('png','image/png')]);
});
test('Malformed image input is rejected without losing the queue',async()=>{
 const before=store.getState().files.length;
 assert.equal(await store.getState().addFiles([new File(['not a picture'],'fake.jpg',{type:'image/jpeg'})]),false);
 assert.equal(store.getState().files.length,before);assert.equal(store.getState().isProcessing,false);
});
test('JPEG cleaning removes metadata appended after the end marker',async()=>{
 const source=new Blob([gpsFile,'PRIVATE_TRAILING_DATA'],{type:'image/jpeg'});
 const result=await writer.stripAllMetadataFromBlob(source);
 assert.equal(Buffer.from(await result.arrayBuffer()).includes(Buffer.from('PRIVATE_TRAILING_DATA')),false);
});
test('Missing or incorrect browser MIME types are normalized before editing',async()=>{
 store.getState().clearFiles();
 const file=new File([gpsFile],'camera.bin',{type:'application/octet-stream'});
 assert.equal(await store.getState().addFiles([file]),true);
 const imported=store.getState().files[0];assert.equal(imported.type,'image/jpeg');assert.equal(imported.originalBlob.type,'image/jpeg');
 assert.equal(await store.getState().updateTag(imported.id,'exif','Artist','MIME test'),true);
 await store.getState().addFiles([fixture('png','image/png')]);
});
test('Removing and clearing files repairs selection and compare references',()=>{
 const state=store.getState();state.selectAllFiles();state.removeFile(state.files[0].id);
 assert.equal(store.getState().selectedFileIds.length,1);assert.ok(store.getState().compareFileIds.every(id=>!id||store.getState().files.some(f=>f.id===id)));
 store.getState().clearFiles();assert.deepEqual(store.getState().compareFileIds,[null,null]);
});

for(const operation of ['save','clean'])test(`Edits and renames made during metadata ${operation} remain as unsaved drafts`,async()=>{
 store.getState().clearFiles();
 await store.getState().addFiles([fixture('jpg','image/jpeg')]);
 const id=store.getState().files[0].id;
 store.getState().applyAiSeo(id,{title:'Saved title',caption:'Saved caption',altText:'Saved alt',keywords:['saved']});
 if(operation==='clean')assert.equal(await store.getState().writeSeoToMetadata(id),true);
 const PreviousImage=global.Image;
 let resume,started;
 const decoding=new Promise(resolve=>{started=resolve});
 global.Image=class{set src(_value){this.naturalWidth=16;this.naturalHeight=12;resume=()=>this.onload?.();started()}};
 try{
  const saving=operation==='save'?store.getState().writeSeoToMetadata(id):store.getState().stripAllMetadata(id);
  await Promise.race([decoding,saving.then(()=>{throw new Error('The save did not reach the decoding checkpoint.')})]);
  store.getState().applyAiSeo(id,{title:'Newer draft',altText:'Newer alt'});
  store.getState().renameFile(id,'renamed-during-save.jpg');
  const release=resume;resume=undefined;release();global.Image=PreviousImage;
  assert.equal(await saving,true);
  const current=store.getState().files[0];
  assert.equal(current.seoData.title,'Newer draft');assert.equal(current.seoData.altText,'Newer alt');
  assert.equal(current.seoData.caption,operation==='save'?'Saved caption':'');assert.equal(current.name,'renamed-during-save.jpg');
  assert.deepEqual(current.seoData.keywords,operation==='save'?['saved']:[]);
  assert.equal(current.history[0].previousSeo.title,'Newer draft');
  const written=await reader.parseDeepMetadata(new File([current.modifiedBlob],current.name,{type:current.type}));
  assert.equal(written.seoData.title,operation==='save'?'Saved title':'');assert.equal(written.seoData.altText,operation==='save'?'Saved alt':'');
 }finally{resume?.();global.Image=PreviousImage}
});
(async()=>{let failures=0;for(const {name,run} of tests){try{await run();console.log(`PASS ${name}`);}catch(e){failures++;console.error(`FAIL ${name}\n${e.stack}`);}}console.log(`${tests.length-failures}/${tests.length} passed`);process.exit(failures?1:0);})();
