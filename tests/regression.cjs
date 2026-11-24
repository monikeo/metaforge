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
 for(const view of ['dashboard','ai-labels','compare','presets','jobs']) assert.equal(workspaceHref(workspaceView(view)),`/?view=${view}`);
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
const jpegWithExif=async(edit)=>{const url=await writer.blobToDataUrl(fixture('jpg','image/jpeg'));const exif=writer.ensureExifDicts(piexif.load(url));edit(exif);return new File([writer.dataUrlToBlob(piexif.insert(piexif.dump(exif),url))],'exif.jpg',{type:'image/jpeg'});};
const nativeExif=async blob=>exifr.parse(Buffer.from(await blob.arrayBuffer()),{xmp:false,iptc:false,mergeOutput:true,reviveValues:false});
const jpegSegments=bytes=>{const out=[];let o=2;while(o<bytes.length&&bytes[o]===255&&bytes[o+1]!==218){const len=(bytes[o+2]<<8)|bytes[o+3];out.push({marker:bytes[o+1],head:Buffer.from(bytes.subarray(o+4,o+10)).toString('latin1')});o+=2+len;}return out;};
const snapshotOf=async blob=>{const match=Buffer.from(await blob.arrayBuffer()).toString('utf8').match(/<mf:Metadata>([\s\S]*?)<\/mf:Metadata>/);return match?JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&apos;/g,"'").replace(/&amp;/g,'&')):null;};
const withStubbedImage=async(onSrc,run)=>{const Previous=global.Image;global.Image=class{set src(_v){this.naturalWidth=16;this.naturalHeight=12;onSrc();queueMicrotask(()=>this.onload?.());}};try{return await run();}finally{global.Image=Previous;}};

test('EXIF date edits keep the EXIF format and the original local time',async()=>{
 store.getState().clearFiles();
 await store.getState().addFiles([await jpegWithExif(exif=>{exif.Exif[piexif.ExifIFD.DateTimeOriginal]='2026:08:14 19:42:10';})]);
 let file=store.getState().files[0];assert.ok(file.rawMetadata.exif.DateTimeOriginal instanceof Date);
 // The tag editor serializes Date objects as quoted ISO strings in UTC.
 assert.equal(await store.getState().updateTag(file.id,'exif','DateTimeOriginal',JSON.stringify(file.rawMetadata.exif.DateTimeOriginal)),true);
 file=store.getState().files[0];assert.equal((await nativeExif(file.modifiedBlob)).DateTimeOriginal,'2026:08:14 19:42:10');
 assert.equal(await store.getState().updateTag(file.id,'exif','DateTimeOriginal','2024-05-06 07:08'),true);
 assert.equal((await nativeExif(store.getState().files[0].modifiedBlob)).DateTimeOriginal,'2024:05:06 07:08:00');
 assert.equal(await store.getState().updateTag(file.id,'exif','DateTimeOriginal','yesterday'),false);
});
test('exifr tag names write to the matching native EXIF tags',async()=>{
 const id=store.getState().files[0].id;
 assert.equal(await store.getState().updateTag(id,'exif','ModifyDate','2020:01:02 03:04:05'),true);
 assert.equal(await store.getState().updateTag(id,'exif','ISO',640),true);
 const native=piexif.load(await writer.blobToDataUrl(store.getState().files[0].modifiedBlob));
 assert.equal(native['0th'][piexif.ImageIFD.DateTime],'2020:01:02 03:04:05');assert.equal(native.Exif[piexif.ExifIFD.ISOSpeedRatings],640);
});
test('Native EXIF text is UTF-8, so © and non-Latin text survive in other tools',async()=>{
 const id=store.getState().files[0].id;
 assert.equal(await store.getState().updateTag(id,'exif','Artist','山田 太郎 © Studio'),true);
 assert.equal((await nativeExif(store.getState().files[0].modifiedBlob)).Artist,'山田 太郎 © Studio');
 const sample=await withStubbedImage(()=>{},async()=>{const previousDocument=global.document;const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>t[k]||(()=>{})});
  global.document={createElement:()=>({getContext:()=>context,toBlob:callback=>callback(fixture('jpg','image/jpeg'))})};
  try{return await createSampleExifImage({title:'t',cameraMake:'Sony',cameraModel:'A7',lensModel:'L',serialNumber:'S',artist:'A',copyright:'© 2026 Sample',latitude:1,longitude:2,color:'#000'});}finally{if(previousDocument===undefined)delete global.document;else global.document=previousDocument;}});
 assert.equal((await nativeExif(sample)).Copyright,'© 2026 Sample');
});
test('XMP packets follow the leading JFIF and EXIF segments',async()=>{
 const blob=await writer.writeMetadataToBlob(gpsFile,{iptc:{Headline:'Order'}});
 const segments=jpegSegments(new Uint8Array(await blob.arrayBuffer()));
 const xmp=segments.findIndex(s=>s.marker===225&&s.head.startsWith('http')),exif=segments.findIndex(s=>s.marker===225&&s.head.startsWith('Exif'));
 assert.ok(exif>=0&&xmp>exif,'XMP must come after EXIF');assert.ok(segments.slice(0,xmp).every(s=>s.marker===224||s.marker===225));
});
test('Snapshots never copy GPS and yield to native EXIF changed by other tools',async()=>{
 const written=await writer.writeMetadataToBlob(gpsFile,{exif:{Artist:'MetaForge Artist'},gps:{latitude:0,longitude:139.7}},{section:'exif',key:'Artist',value:'MetaForge Artist'});
 const snap=await snapshotOf(written);assert.equal(snap.gps,undefined);assert.equal(typeof snap.integrity.exif,'number');
 assert.equal((await reader.parseDeepMetadata(new File([written],'a.jpg',{type:'image/jpeg'}))).rawMetadata.exif.Artist,'MetaForge Artist');
 const url=await writer.blobToDataUrl(written),exif=piexif.load(url);exif['0th'][piexif.ImageIFD.Artist]='Changed Elsewhere';
 const external=new File([writer.dataUrlToBlob(piexif.insert(piexif.dump(exif),url))],'b.jpg',{type:'image/jpeg'});
 assert.equal((await reader.parseDeepMetadata(external)).rawMetadata.exif.Artist,'Changed Elsewhere');
});
test('XMP fields changed by other tools replace stale snapshot copies',async()=>{
 const written=Buffer.from(await (await writer.writeMetadataToBlob(fixture('jpg','image/jpeg'),{iptc:{Headline:'Old Title'}})).arrayBuffer());
 const marker=Buffer.from('x-default">Old Title<');const at=written.indexOf(marker);assert.ok(at>0);
 Buffer.from('x-default">New Title<').copy(written,at);
 const parsed=await reader.parseDeepMetadata(new File([written],'edited.jpg',{type:'image/jpeg'}));
 assert.equal(parsed.seoData.title,'New Title');
});
test('XMP written by other tools fills SEO fields, and blank language entries stay blank',async()=>{
 const xml='<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">Lightroom Title</rdf:li></rdf:Alt></dc:title><dc:description><rdf:Alt><rdf:li xml:lang="x-default">Harbour at dawn</rdf:li></rdf:Alt></dc:description><dc:rights><rdf:Alt><rdf:li xml:lang="x-default"></rdf:li></rdf:Alt></dc:rights><dc:subject><rdf:Bag><rdf:li>harbour</rdf:li><rdf:li>dawn</rdf:li></rdf:Bag></dc:subject><Iptc4xmpCore:AltTextAccessibility>Boats moored in calm water</Iptc4xmpCore:AltTextAccessibility><photoshop:City>Hobart</photoshop:City></rdf:Description></rdf:RDF></x:xmpmeta>';
 const payload=Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0'),Buffer.from(xml)]);
 const source=Buffer.from(await fixture('jpg','image/jpeg').arrayBuffer());
 const app1=Buffer.concat([Buffer.from([255,225,(payload.length+2)>>8,(payload.length+2)&255]),payload]);
 const parsed=await reader.parseDeepMetadata(new File([Buffer.concat([source.subarray(0,2),app1,source.subarray(2)])],'lr.jpg',{type:'image/jpeg'}));
 assert.deepEqual(parsed.seoData,{title:'Lightroom Title',caption:'Harbour at dawn',altText:'Boats moored in calm water',keywords:['harbour','dawn']});
 assert.equal(parsed.rawMetadata.xmp.City,'Hobart');assert.equal(parsed.rawMetadata.dc,undefined);
 const resaved=await writer.writeMetadataToBlob(new File([source],'x.jpg',{type:'image/jpeg'}),{iptc:{Headline:'Only a title'}});
 const reparsed=await reader.parseDeepMetadata(new File([resaved],'re.jpg',{type:'image/jpeg'}));
 assert.equal(reparsed.seoData.caption,'');assert.equal(reparsed.rawMetadata.mf,undefined);assert.equal(Buffer.from(await resaved.arrayBuffer()).includes(Buffer.from('<dc:description>')),false);
});
test('Bulk edits update native EXIF in PNG and WebP files',async()=>{
 const payload=Buffer.from(piexif.dump(piexif.load(await writer.blobToDataUrl(gpsFile))),'binary');
 for(const ext of ['png','webp']){
  let bytes=Buffer.from(await fixture(ext,`image/${ext}`).arrayBuffer());const packets=writer.containerPackets(bytes);
  if(ext==='png')bytes=Buffer.concat([bytes.subarray(0,8),Buffer.from(writer.pngChunk('eXIf',payload.subarray(6))),...packets.map(p=>Buffer.from(p.packet))]);
  else{const vp8x=packets.find(p=>p.type==='VP8X');vp8x.packet[8]|=8;const data=payload.subarray(6);const chunk=Buffer.alloc(8+data.length+(data.length%2));chunk.write('EXIF');chunk.writeUInt32LE(data.length,4);data.copy(chunk,8);bytes=Buffer.concat([bytes.subarray(0,12),...packets.map(p=>Buffer.from(p.packet)),chunk]);bytes.writeUInt32LE(bytes.length-8,4);}
  store.getState().clearFiles();await store.getState().addFiles([new File([bytes],`native.${ext}`,{type:`image/${ext}`})]);
  const id=store.getState().files[0].id;
  assert.equal(await store.getState().batchBulkEdit([id],{artist:'Bulk Artist',copyright:'© Bulk'}),true);
  const file=store.getState().files[0];
  const exifChunk=writer.containerPackets(new Uint8Array(await file.modifiedBlob.arrayBuffer())).find(p=>p.type===(ext==='png'?'eXIf':'EXIF'));
  assert.notEqual(Buffer.from(exifChunk.data.subarray(0,4)).toString('latin1'),'Exif',`${ext} EXIF chunks must hold bare TIFF data`);
  const native=piexif.load('Exif\0\0'+Buffer.from(exifChunk.data).toString('latin1'))['0th'],utf8=value=>Buffer.from(value,'latin1').toString('utf8');
  assert.equal(utf8(native[piexif.ImageIFD.Artist]),'Bulk Artist');assert.equal(utf8(native[piexif.ImageIFD.Copyright]),'© Bulk');assert.equal(file.rawMetadata.iptc.Byline,'Bulk Artist');
 }
});
test('Bulk edits with no values are rejected instead of rewriting every image',async()=>{
 const before=store.getState().batchJobs.length;
 assert.equal(await store.getState().batchBulkEdit(store.getState().files.map(f=>f.id),{keywordMode:'append'}),false);
 assert.equal(store.getState().batchJobs.length,before);
});
test('Keyword strings become keyword lists in every synced field',async()=>{
 const id=store.getState().files[0].id;
 assert.equal(await store.getState().updateTag(id,'iptc','Keywords','alpine, lake; summer'),true);
 const file=store.getState().files[0];
 assert.deepEqual(file.rawMetadata.iptc.Keywords,['alpine','lake','summer']);assert.deepEqual(file.rawMetadata.xmp.subject,['alpine','lake','summer']);assert.deepEqual(file.seoData.keywords,['alpine','lake','summer']);
});
test('Stable Diffusion parameters in a UNICODE UserComment are detected in JPEG',async()=>{
 const params='a red cat\nNegative prompt: blurry\nSteps: 20, Sampler: Euler a, CFG scale: 7, Seed: 123, Model: sdxl';
 const file=await jpegWithExif(exif=>{exif.Exif[piexif.ExifIFD.UserComment]=writer.encodeUserComment(params+' é');});
 const parsed=await reader.parseDeepMetadata(file);
 assert.equal(parsed.aiWorkflow.type,'Stable Diffusion');assert.equal(parsed.aiWorkflow.seed,'123');assert.equal(parsed.aiWorkflow.prompt,'a red cat');assert.equal(parsed.aiWorkflow.model,'sdxl é');
 assert.equal(parsed.rawMetadata.exif.UserComment,params+' é');assert.equal(reader.decodeUserComment('ASCII\0\0\0plain'),'plain');
});
test('Running batch jobs can be cancelled between images',async()=>{
 store.getState().clearFiles();await store.getState().addFiles([fixture('jpg','image/jpeg'),fixture('png','image/png'),fixture('webp','image/webp')]);
 let cancelled=false;
 const ok=await withStubbedImage(()=>{if(!cancelled){cancelled=true;store.getState().cancelBatch();}},()=>store.getState().stripAllMetadataBatch());
 assert.equal(ok,false);const job=store.getState().batchJobs[0];
 assert.equal(job.status,'CANCELLED');assert.equal(job.completed,1);assert.match(job.errors.at(-1),/2 image\(s\) were not processed because the job was cancelled/);
 assert.equal(store.getState().isProcessing,false);
});
test('AI batch SEO writes results into images and stops on quota errors',async()=>{
 const ai=require('../src/lib/ai-service.ts');const original=ai.generateImageSeoMetadata;let calls=0,quotaFailures=1;
 ai.generateImageSeoMetadata=async(_key,_blob,_model,signal)=>{assert.ok(signal instanceof AbortSignal);calls++;if(calls===2&&quotaFailures-->0)throw ai.classifyGeminiError({status:429});return {title:'AI Title',caption:'AI caption',altText:'AI alt',keywords:['ai'],privacyFlags:{containsFaces:false,containsIdentifiableText:true}};};
 try{
  store.setState({aiEnabled:true,geminiApiKey:'test-key'});
  const ids=store.getState().files.map(f=>f.id);
  assert.equal(await store.getState().batchGenerateSeo(ids,{save:true}),false);
  const job=store.getState().batchJobs[0];assert.equal(job.type,'AI_SEO');assert.equal(job.status,'FAILED');assert.equal(job.completed,1);assert.equal(job.failed,1);assert.equal(calls,2);
  const file=store.getState().files.find(f=>f.id===ids[0]);assert.equal(file.seoData.title,'AI Title');assert.equal(file.seoData.privacyFlags.containsIdentifiableText,true);
  const written=await reader.parseDeepMetadata(new File([file.modifiedBlob],file.name,{type:file.type}));assert.equal(written.seoData.altText,'AI alt');
  calls=0;assert.equal(await store.getState().batchGenerateSeo(ids,{skipComplete:true,save:false}),true);assert.equal(calls,2);
 }finally{ai.generateImageSeoMetadata=original;store.setState({aiEnabled:false,geminiApiKey:''});}
});
test('CSV export escapes cells and neutralizes spreadsheet formulas',()=>{
 const {buildMetadataCsv,metadataJson}=require('../src/lib/catalog-export.ts');
 const file={name:'=cmd|calc.jpg',type:'image/jpeg',width:10,height:5,size:99,isDirty:true,seoData:{title:'Say "hi", world',caption:'line1\nline2',altText:'',keywords:['a','b']},rawMetadata:{exif:{Artist:'+Artist',DateTimeOriginal:new Date(2026,0,2,3,4,5)},gps:{latitude:-33.5,longitude:151.2}},privacyReport:{hasGps:true,riskLevel:'HIGH',score:55,issues:[{title:'Geographic Location Exposed'}]},aiWorkflow:{detected:false}};
 const lines=buildMetadataCsv([file]).replace(/^﻿/,'').split('\r\n');
 assert.match(lines[0],/^Filename,Format,/);
 assert.ok(lines[1].startsWith(`'=cmd|calc.jpg,image/jpeg,10,5,99,"Say ""hi"", world","line1`));
 assert.ok(lines.join('\n').includes(`'+Artist`));assert.ok(lines.join('\n').includes('2026:01:02 03:04:05'));assert.ok(lines.join('\n').includes(',-33.5,151.2,HIGH,55,'));
 const json=metadataJson({bytes:new Uint8Array(5),big:10n});assert.equal(JSON.parse(json).bytes,'[binary 5 bytes]');assert.equal(JSON.parse(json).big,'10');
});
// ---------------------------------------------------------------- AI labels and provenance
const {removeAiMetadataFromBlob}=require('../src/lib/metadata-cleaner.ts');
const u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;};
const appSegment=(marker,data)=>Buffer.concat([Buffer.from([255,marker,(data.length+2)>>8,(data.length+2)&255]),data]);
const cborText=s=>{const b=Buffer.from(s);return Buffer.concat([Buffer.from(b.length<24?[0x60+b.length]:[0x78,b.length]),b]);};
// A C2PA manifest store: a JUMBF superbox whose description box carries the c2pa UUID and label, then a CBOR claim.
const c2paStore=(generator,sourceType)=>{
 const jumd=Buffer.concat([Buffer.from('jumd'),Buffer.from('c2pa'),Buffer.from([0,0x11,0,0x10,0x80,0,0,0xaa,0,0x38,0x9b,0x71,3]),Buffer.from('c2pa\0')]);
 const claim=Buffer.concat([Buffer.from([0xa2]),cborText('claim_generator'),cborText(generator),cborText('digitalSourceType'),cborText(`http://cv.iptc.org/newscodes/digitalsourcetype/${sourceType}`)]);
 const body=Buffer.concat([u32(jumd.length+4),jumd,u32(claim.length+8),Buffer.from('cbor'),claim]);
 return Buffer.concat([u32(body.length+8),Buffer.from('jumb'),body]);
};
const xmpXml=props=>`<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">${props}</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
const AI_XMP='<Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType><Iptc4xmpExt:AISystemUsed>Firefly Image 3</Iptc4xmpExt:AISystemUsed><xmp:CreatorTool>Adobe Firefly</xmp:CreatorTool><photoshop:City>Hobart</photoshop:City><dc:title><rdf:Alt><rdf:li xml:lang="x-default">Lake</rdf:li></rdf:Alt></dc:title><dc:subject><rdf:Bag><rdf:li>lake</rdf:li><rdf:li>ai generated</rdf:li><rdf:li>dawn</rdf:li></rdf:Bag></dc:subject>';
const scanData=bytes=>bytes.subarray(bytes.indexOf(Buffer.from([255,218])));
const iccSegment=appSegment(226,Buffer.concat([Buffer.from('ICC_PROFILE\0'),Buffer.from([1,1]),Buffer.alloc(64,7)]));
const aiLabeledJpeg=async({orientation}={})=>{
 const exifFile=await jpegWithExif(exif=>{
  Object.assign(exif['0th'],{[piexif.ImageIFD.Make]:'Sony',[piexif.ImageIFD.Model]:'A7',[piexif.ImageIFD.Software]:'Midjourney 6.1',[piexif.ImageIFD.Artist]:'Jane Doe',[piexif.ImageIFD.Copyright]:'(c) Jane Doe'});
  if(orientation)exif['0th'][piexif.ImageIFD.Orientation]=orientation;
  exif.Exif[piexif.ExifIFD.UserComment]=writer.encodeUserComment('a castle at dusk\nSteps: 30, Sampler: Euler a, Seed: 9');
  exif.Exif[piexif.ExifIFD.BodySerialNumber]='SN-4411';
  exif.GPS[piexif.GPSIFD.GPSLatitudeRef]='S';exif.GPS[piexif.GPSIFD.GPSLatitude]=piexif.GPSHelper.degToDmsRational(42.88);
  exif.GPS[piexif.GPSIFD.GPSLongitudeRef]='E';exif.GPS[piexif.GPSIFD.GPSLongitude]=piexif.GPSHelper.degToDmsRational(147.32);
 });
 const bytes=Buffer.from(await exifFile.arrayBuffer());
 // The manifest is split across two APP11 packets; the second repeats the superbox header, as JPEG JUMBF requires.
 const store=c2paStore('Adobe_Firefly/1.0 c2pa-rs/0.30','trainedAlgorithmicMedia'),cut=40,head=n=>Buffer.concat([Buffer.from('JP'),Buffer.from([0,7]),u32(n)]);
 const app11=[appSegment(235,Buffer.concat([head(1),store.subarray(0,cut)])),appSegment(235,Buffer.concat([head(2),store.subarray(0,8),store.subarray(cut)]))];
 const xmp=appSegment(225,Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0'),Buffer.from(xmpXml(AI_XMP))]));
 const comment=appSegment(254,Buffer.from('Generated with DALL-E 3'));
 const exifEnd=4+((bytes[4]<<8)|bytes[5]);
 return new File([Buffer.concat([bytes.subarray(0,exifEnd),xmp,iccSegment,...app11,comment,bytes.subarray(exifEnd)])],'labeled.jpg',{type:'image/jpeg'});
};
const parse=async(blob,name='x')=>reader.parseDeepMetadata(new File([blob],name,{type:blob.type}));

test('AI labels: C2PA, IPTC source type, AI fields, prompts and generators are detected in JPEG',async()=>{
 const parsed=await parse(await aiLabeledJpeg());const {aiProvenance:report}=parsed;
 assert.equal(report.status,'LABELED');assert.equal(report.generator,'Adobe Firefly');
 const byId=Object.fromEntries(report.signals.map(s=>[s.id,s]));
 assert.match(byId.c2pa.detail,/Made with Adobe Firefly · Created with generative AI/);assert.equal(byId.c2pa.triggersLabel,true);
 assert.match(byId['source-type'].detail,/trainedAlgorithmicMedia/);assert.equal(byId['source-type'].triggersLabel,true);
 assert.ok(byId['iptc-ai-fields']);
 const kinds=new Set(report.signals.map(s=>s.kind));for(const kind of ['C2PA','SOURCE_TYPE','AI_FIELD','GENERATOR','PROMPT','DISCLOSURE'])assert.ok(kinds.has(kind),`missing ${kind}`);
 assert.ok(report.signals.some(s=>s.locations.includes('JPEG comment')));
 assert.ok(report.signals.some(s=>s.kind==='DISCLOSURE'&&/ai generated/.test(s.detail)),'AI keyword');
});
test('AI labels: ordinary photos and look-alike words are not flagged',async()=>{
 for(const [ext,type] of [['jpg','image/jpeg'],['png','image/png'],['webp','image/webp']])assert.equal((await reader.parseDeepMetadata(fixture(ext,type))).aiProvenance.status,'CLEAN');
 const camera=await jpegWithExif(exif=>Object.assign(exif['0th'],{[piexif.ImageIFD.Make]:'Google',[piexif.ImageIFD.Model]:'Pixel 8',[piexif.ImageIFD.Software]:'Adobe Photoshop 25.0 (Windows)',[piexif.ImageIFD.Artist]:'Firefly Photography',[piexif.ImageIFD.ImageDescription]:'Runway show in Milan, a Gemini birthday'}));
 const written=await writer.writeMetadataToBlob(camera,{iptc:{Keywords:['gemini','fashion','flux']},xmp:{DigitalSourceType:'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture'}});
 const report=(await parse(written)).aiProvenance;assert.equal(report.status,'CLEAN',JSON.stringify(report.signals));
});
test('AI labels: "AI only" removes every AI marker and keeps pixels, camera data, location, attribution and SEO',async()=>{
 const source=await aiLabeledJpeg();const parsed=await reader.parseDeepMetadata(source);
 const clean=await removeAiMetadataFromBlob(source,parsed.rawMetadata,{level:'ai',keepAttribution:true});
 const bytes=Buffer.from(await clean.arrayBuffer()),result=await parse(clean);
 assert.equal(result.aiProvenance.status,'CLEAN',JSON.stringify(result.aiProvenance.signals));assert.equal(result.aiWorkflow.detected,false);
 for(const marker of ['c2pa','jumb','trainedAlgorithmicMedia','AISystemUsed','Firefly','Midjourney','DALL-E','Sampler:'])assert.equal(bytes.includes(Buffer.from(marker)),false,`${marker} survived`);
 assert.deepEqual(scanData(bytes),scanData(Buffer.from(await source.arrayBuffer())));assert.ok(bytes.includes(Buffer.from('ICC_PROFILE')));
 assert.equal(result.rawMetadata.exif.Make,'Sony');assert.equal(result.rawMetadata.exif.Artist,'Jane Doe');assert.equal(result.rawMetadata.exif.Software,undefined);
 assert.equal(result.privacyReport.hasGps,true);assert.equal(result.privacyReport.hasDeviceSerial,true);
 assert.equal(result.seoData.title,'Lake');assert.deepEqual(result.seoData.keywords,['lake','dawn']);
});
test('AI labels: the location level also removes GPS, place names and device identifiers',async()=>{
 const source=await aiLabeledJpeg();const parsed=await reader.parseDeepMetadata(source);
 const result=await parse(await removeAiMetadataFromBlob(source,parsed.rawMetadata,{level:'private',keepAttribution:true}));
 assert.equal(result.aiProvenance.status,'CLEAN');assert.equal(result.privacyReport.hasGps,false);assert.equal(result.privacyReport.hasDeviceSerial,false);
 assert.equal(result.rawMetadata.xmp?.City,undefined);assert.equal(result.rawMetadata.exif.Make,'Sony');assert.equal(result.seoData.title,'Lake');assert.equal(result.rawMetadata.exif.Artist,'Jane Doe');
});
test('AI labels: "Everything" is lossless, keeps colour and orientation, and keeps attribution only when asked',async()=>{
 const source=await aiLabeledJpeg({orientation:6});const parsed=await reader.parseDeepMetadata(source),sourceBytes=Buffer.from(await source.arrayBuffer());
 for(const keepAttribution of [true,false]){
  const clean=await removeAiMetadataFromBlob(source,parsed.rawMetadata,{level:'all',keepAttribution});
  const bytes=Buffer.from(await clean.arrayBuffer()),native=piexif.load(bytes.toString('binary'));
  assert.deepEqual(scanData(bytes),scanData(sourceBytes),'no re-encoding');assert.ok(bytes.includes(Buffer.from('ICC_PROFILE')));
  assert.equal(native['0th'][piexif.ImageIFD.Orientation],6);assert.equal(native['0th'][piexif.ImageIFD.Make],undefined);assert.deepEqual(native.GPS,{});
  assert.equal(native['0th'][piexif.ImageIFD.Artist],keepAttribution?'Jane Doe':undefined);
  const result=await parse(clean);assert.equal(result.aiProvenance.status,'CLEAN');assert.equal(result.seoData.title,'');
 }
});
test('AI labels: PNG caBX, XMP and generator text chunks are removed without touching image data',async()=>{
 const zlib=require('node:zlib'),base=new Uint8Array(await fixture('png','image/png').arrayBuffer()),packets=writer.containerPackets(base);
 const text=(key,value)=>writer.pngChunk('tEXt',Buffer.concat([Buffer.from(key+'\0'),Buffer.from(value,'latin1')]));
 const xmp=writer.pngChunk('iTXt',Buffer.concat([Buffer.from('XML:com.adobe.xmp\0\0\0\0\0'),Buffer.from(xmpXml(AI_XMP))]));
 const extra=[writer.pngChunk('caBX',c2paStore('ChatGPT','trainedAlgorithmicMedia')),xmp,text('parameters','koi pond\nSteps: 20, Sampler: DPM++ 2M, Seed: 5'),text('Software','NovelAI'),text('Title','Garden'),writer.pngChunk('zTXt',Buffer.concat([Buffer.from('Comment\0\0'),zlib.deflateSync(Buffer.from('{"prompt":"koi","uc":"blurry","steps":28}'))]))];
 const source=new Blob([base.subarray(0,8),...packets.filter(p=>p.type!=='IEND').map(p=>p.packet),...extra,packets.at(-1).packet],{type:'image/png'});
 const parsed=await parse(source);assert.equal(parsed.aiProvenance.status,'LABELED');assert.equal(parsed.aiProvenance.generator,'ChatGPT');
 const clean=await removeAiMetadataFromBlob(source,parsed.rawMetadata,{level:'ai',keepAttribution:true});const result=await parse(clean);
 assert.equal(result.aiProvenance.status,'CLEAN',JSON.stringify(result.aiProvenance.signals));
 const chunks=writer.containerPackets(new Uint8Array(await clean.arrayBuffer()));
 assert.equal(chunks.some(p=>p.type==='caBX'),false);assert.equal(result.rawMetadata.pngChunks?.Title,'Garden');
 assert.deepEqual(Buffer.concat(chunks.filter(p=>p.type==='IDAT').map(p=>Buffer.from(p.data))),Buffer.concat(packets.filter(p=>p.type==='IDAT').map(p=>Buffer.from(p.data))));
});
test('AI labels: WebP C2PA and XMP chunks are removed and the container stays valid',async()=>{
 const base=Buffer.from(await fixture('webp','image/webp').arrayBuffer()),packets=writer.containerPackets(base);
 const chunk=(type,data)=>{const out=Buffer.alloc(8+data.length+(data.length%2));out.write(type);out.writeUInt32LE(data.length,4);data.copy(out,8);return out;};
 const vp8x=packets.find(p=>p.type==='VP8X');if(vp8x)vp8x.packet[8]|=4;
 let bytes=Buffer.concat([base.subarray(0,12),...packets.map(p=>Buffer.from(p.packet)),chunk('XMP ',Buffer.from(xmpXml(AI_XMP))),chunk('C2PA',c2paStore('Google Imagen','trainedAlgorithmicMedia'))]);bytes.writeUInt32LE(bytes.length-8,4);
 const source=new Blob([bytes],{type:'image/webp'}),parsed=await parse(source);assert.equal(parsed.aiProvenance.status,'LABELED');
 const clean=Buffer.from(await (await removeAiMetadataFromBlob(source,parsed.rawMetadata,{level:'ai',keepAttribution:true})).arrayBuffer());
 assert.equal(clean.readUInt32LE(4),clean.length-8);const chunks=writer.containerPackets(new Uint8Array(clean));
 assert.equal(chunks.some(p=>p.type==='C2PA'||p.type==='XMP '),false);
 const flags=chunks.find(p=>p.type==='VP8X');if(flags)assert.equal(flags.data[0]&4,0,'XMP flag cleared');
 assert.equal((await parse(new Blob([clean],{type:'image/webp'}))).aiProvenance.status,'CLEAN');
});
test('AI labels: camera-signed Content Credentials are not AI labels and only the stricter levels remove them',async()=>{
 const base=Buffer.from(await fixture('jpg','image/jpeg').arrayBuffer());
 const manifest=c2paStore('Pixel_Camera/1.0 c2pa-rs/0.40','computationalCapture');
 const app11=appSegment(235,Buffer.concat([Buffer.from('JP'),Buffer.from([0,1]),u32(1),manifest]));
 const signed=new File([Buffer.concat([base.subarray(0,2),app11,base.subarray(2)])],'pixel.jpg',{type:'image/jpeg'});
 const parsed=await reader.parseDeepMetadata(signed);assert.equal(parsed.aiProvenance.status,'CLEAN');
 const keep=Buffer.from(await (await removeAiMetadataFromBlob(signed,parsed.rawMetadata,{level:'ai',keepAttribution:true})).arrayBuffer());
 assert.ok(keep.includes(Buffer.from('jumdc2pa')),'"AI labels only" keeps camera provenance');
 const strict=Buffer.from(await (await removeAiMetadataFromBlob(signed,parsed.rawMetadata,{level:'private',keepAttribution:true})).arrayBuffer());
 assert.equal(strict.includes(Buffer.from('jumdc2pa')),false,'the location & device level removes every manifest');
});
// An Ultra HDR JPEG: the gain map is a second JPEG after the primary image, found through the MPF index and the GContainer XMP directory.
const mpfSegment=(primarySize,offset,size)=>{
 const t=Buffer.alloc(82);t.write('MM');t.writeUInt16BE(42,2);t.writeUInt32BE(8,4);t.writeUInt16BE(3,8);
 const tag=(i,id,type,count,value)=>{const p=10+i*12;t.writeUInt16BE(id,p);t.writeUInt16BE(type,p+2);t.writeUInt32BE(count,p+4);if(typeof value==='string')t.write(value,p+8,'latin1');else t.writeUInt32BE(value,p+8);};
 tag(0,0xb000,7,4,'0100');tag(1,0xb001,4,1,2);tag(2,0xb002,7,32,50);
 t.writeUInt32BE(0x20030000,50);t.writeUInt32BE(primarySize,54);t.writeUInt32BE(0,58);t.writeUInt32BE(size,70);t.writeUInt32BE(offset,74);
 return appSegment(226,Buffer.concat([Buffer.from('MPF\0'),t]));
};
const mpfImages=bytes=>{
 const at=bytes.indexOf(Buffer.from('MPF\0'));if(at<0)return null;const tiff=at+4,ifd=tiff+bytes.readUInt32BE(tiff+4);
 for(let i=0;i<bytes.readUInt16BE(ifd);i++){const e=ifd+2+i*12;if(bytes.readUInt16BE(e)!==0xb002)continue;const table=tiff+bytes.readUInt32BE(e+8);
  return Array.from({length:bytes.readUInt32BE(e+4)/16},(_,k)=>{const offset=bytes.readUInt32BE(table+k*16+8);return {size:bytes.readUInt32BE(table+k*16+4),start:offset?tiff+offset:0};});}
 return null;
};
const ultraHdrJpeg=async(extraXmp='',gainMapSegments=Buffer.alloc(0))=>{
 const primarySource=Buffer.from(await (await jpegWithExif(exif=>{exif['0th'][piexif.ImageIFD.Make]='Google';exif.GPS[piexif.GPSIFD.GPSLatitudeRef]='N';exif.GPS[piexif.GPSIFD.GPSLatitude]=piexif.GPSHelper.degToDmsRational(51.5);})).arrayBuffer());
 const base=Buffer.from(await fixture('jpg','image/jpeg').arrayBuffer());
 const gainMap=Buffer.concat([base.subarray(0,2),appSegment(254,Buffer.from('GAINMAP-UNIQUE-MARKER')),gainMapSegments,base.subarray(2)]);
 const xml=`<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:Container="http://ns.google.com/photos/1.0/container/" xmlns:Item="http://ns.google.com/photos/1.0/container/item/" xmlns:hdrgm="http://ns.adobe.com/hdr-gain-map/1.0/" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" hdrgm:Version="1.0">${extraXmp}<Container:Directory><rdf:Seq><rdf:li rdf:parseType="Resource"><Container:Item Item:Semantic="Primary" Item:Mime="image/jpeg"/></rdf:li><rdf:li rdf:parseType="Resource"><Container:Item Item:Semantic="GainMap" Item:Mime="image/jpeg" Item:Length="${gainMap.length}"/></rdf:li></rdf:Seq></Container:Directory></rdf:Description></rdf:RDF></x:xmpmeta>`;
 const exifEnd=4+((primarySource[4]<<8)|primarySource[5]),xmp=appSegment(225,Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0'),Buffer.from(xml)]));
 const build=(size,offset)=>Buffer.concat([primarySource.subarray(0,exifEnd),xmp,mpfSegment(size,offset,gainMap.length),primarySource.subarray(exifEnd)]);
 const primarySize=build(0,0).length,tiff=exifEnd+xmp.length+8;
 return {gainMap,file:new File([build(primarySize,primarySize-tiff),gainMap],'ultrahdr.jpg',{type:'image/jpeg'})};
};
const assertGainMapKept=(bytes,gainMap,label)=>{
 const images=mpfImages(bytes);assert.ok(images,`${label}: MPF index kept`);
 assert.equal(images[0].size,bytes.length-gainMap.length,`${label}: primary size updated`);
 assert.deepEqual(bytes.subarray(images[1].start,images[1].start+gainMap.length),gainMap,`${label}: index points at the gain map`);
 const xmp=bytes.toString('latin1');assert.ok(xmp.includes('hdrgm:Version="1.0"')&&xmp.includes('Item:Semantic="GainMap"'),`${label}: Ultra HDR XMP kept`);
};
test('Ultra HDR gain maps survive tag edits and AI label removal, with the MPF index updated',async()=>{
 const {gainMap,file}=await ultraHdrJpeg('<Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>');
 assertGainMapKept(Buffer.from(await file.arrayBuffer()),gainMap,'fixture');
 const titled=await writer.writeMetadataToBlob(file,{iptc:{Headline:'HDR title'},exif:{Artist:'Ana'}},{section:'exif',key:'Artist',value:'Ana'});
 assertGainMapKept(Buffer.from(await titled.arrayBuffer()),gainMap,'tag edit');
 const parsedTitled=await parse(titled);assert.equal(parsedTitled.seoData.title,'HDR title');assert.equal(parsedTitled.rawMetadata.exif.Artist,'Ana');assert.equal(parsedTitled.privacyReport.inspectionWarning,undefined);
 const parsed=await reader.parseDeepMetadata(file);assert.equal(parsed.aiProvenance.status,'LABELED');
 const clean=await removeAiMetadataFromBlob(file,parsed.rawMetadata,{level:'ai',keepAttribution:true});
 assertGainMapKept(Buffer.from(await clean.arrayBuffer()),gainMap,'AI labels only');assert.equal((await parse(clean)).aiProvenance.status,'CLEAN');
});
test('Privacy cleaning drops secondary images and their index, which can carry their own metadata',async()=>{
 const {gainMap,file}=await ultraHdrJpeg();const parsed=await reader.parseDeepMetadata(file);
 const results={private:await removeAiMetadataFromBlob(file,parsed.rawMetadata,{level:'private',keepAttribution:true}),all:await writer.stripAllMetadataFromBlob(file),gps:await writer.stripGpsFromBlob(file)};
 store.getState().clearFiles();await store.getState().addFiles([file]);assert.equal(await store.getState().stripGps(store.getState().files[0].id),true);results.store=store.getState().files[0].modifiedBlob;
 for(const [label,blob] of Object.entries(results)){
  const bytes=Buffer.from(await blob.arrayBuffer());
  assert.equal(mpfImages(bytes),null,`${label}: index removed`);assert.equal(bytes.includes(Buffer.from('GAINMAP-UNIQUE-MARKER')),false,`${label}: gain map removed`);
  assert.ok(gainMap.includes(Buffer.from('GAINMAP-UNIQUE-MARKER')));
 }
 assert.equal(store.getState().files[0].privacyReport.hasGps,false);
});
test('Strip GPS keeps titles, keywords and camera data in JPEG',async()=>{
 store.getState().clearFiles();
 const titled=await writer.writeMetadataToBlob(gpsFile,{iptc:{Headline:'Harbour',Keywords:['boats']},xmp:{City:'Hobart',GPSLatitude:0}});
 await store.getState().addFiles([new File([titled],'titled.jpg',{type:'image/jpeg'})]);const id=store.getState().files[0].id;
 assert.equal(store.getState().files[0].privacyReport.hasGps,true);
 assert.equal(await store.getState().stripGps(id),true);const file=store.getState().files[0];
 assert.equal(file.privacyReport.hasGps,false);assert.equal(file.seoData.title,'Harbour');assert.deepEqual(file.seoData.keywords,['boats']);assert.equal(file.rawMetadata.exif.Make,'Sony');assert.equal(file.rawMetadata.xmp?.City,undefined);
 const native=piexif.load(Buffer.from(await file.modifiedBlob.arrayBuffer()).toString('binary'));assert.deepEqual(native.GPS,{});
});
test('Batch AI label removal cleans only labelled images, verifies them and records history',async()=>{
 store.getState().clearFiles();await store.getState().addFiles([await aiLabeledJpeg(),fixture('png','image/png')]);
 store.getState().setAiCleanOptions({level:'ai'});
 assert.equal(await store.getState().batchRemoveAiLabels(),true);
 const job=store.getState().batchJobs[0];assert.equal(job.type,'REMOVE_AI');assert.equal(job.total,1);assert.equal(job.status,'COMPLETED');
 const [labeled]=store.getState().files;assert.equal(labeled.aiProvenance.status,'CLEAN');assert.equal(labeled.history[0].action,'AI Label Removal');assert.ok(labeled.history[0].previousBlob);
 assert.equal(await store.getState().batchRemoveAiLabels(),true,'nothing left to clean is not an error');
 await store.getState().restoreHistory(labeled.id,labeled.history[0].id);assert.equal(store.getState().files[0].aiProvenance.status,'LABELED');
 store.getState().setAiCleanOptions({level:'nonsense'});assert.equal(store.getState().aiCleanLevel,'ai');
});
// ---------------------------------------------------------------- GIF
const gifWith=blocks=>Buffer.concat([Buffer.from('GIF89a'),Buffer.from([1,0,1,0,0x80,0,0,0,0,0,255,255,255]),...blocks,Buffer.from([0x21,0xf9,4,1,0,0,0,0]),Buffer.from([0x2c,0,0,0,0,1,0,1,0,0,2,2,0x44,1,0]),Buffer.from([0x3b])]);
const gifApp=(id,data)=>Buffer.concat([Buffer.from([0x21,0xff,11]),Buffer.from(id),data]);
const gifSubBlocks=data=>{const parts=[];for(let i=0;i<data.length;i+=255){const part=data.subarray(i,i+255);parts.push(Buffer.from([part.length]),part);}parts.push(Buffer.from([0]));return Buffer.concat(parts);};
const gifLoop=gifApp('NETSCAPE2.0',Buffer.from([3,1,0,0,0]));
// GIF XMP is stored raw and followed by the 258-byte "magic trailer" that lets readers skip it as sub-blocks.
const gifXmp=props=>gifApp('XMP DataXMP',Buffer.concat([Buffer.from(xmpXml(props)),Buffer.from([1,...Array.from({length:256},(_,i)=>255-i),0])]));
test('GIF: AI comments and XMP are detected and removed without touching frames or looping',async()=>{
 const comment=Buffer.concat([Buffer.from([0x21,0xfe]),gifSubBlocks(Buffer.from('Generated with DALL-E 3'))]);
 const gif=new Blob([gifWith([gifLoop,comment,gifXmp(AI_XMP)]),'APPENDED-SECRET'],{type:'image/gif'});
 const parsed=await parse(gif,'ai.gif');assert.equal(parsed.aiProvenance.status,'LABELED');
 assert.ok(parsed.aiProvenance.signals.some(s=>s.locations.includes('GIF comment')));assert.ok(parsed.aiProvenance.signals.some(s=>s.locations.includes('GIF XMP packet')));
 for(const level of ['ai','private','all']){
  const clean=Buffer.from(await (await removeAiMetadataFromBlob(gif,parsed.rawMetadata,{level,keepAttribution:true})).arrayBuffer());
  for(const marker of ['DALL-E','trainedAlgorithmicMedia','APPENDED-SECRET'])assert.equal(clean.includes(Buffer.from(marker)),false,`${level}: ${marker} survived`);
  assert.ok(clean.includes(Buffer.from('NETSCAPE2.0')),`${level}: looping kept`);assert.ok(clean.includes(Buffer.from([0x2c,0,0,0,0,1,0,1,0,0,2,2,0x44,1,0])),`${level}: frame kept`);
  assert.equal((await parse(new Blob([clean],{type:'image/gif'}))).aiProvenance.status,'CLEAN');
 }
 assert.deepEqual(Buffer.from(await (await writer.stripAllMetadataFromBlob(gif)).arrayBuffer()),gifWith([gifLoop]),'full cleaning keeps only rendering blocks');
 const plain=new Blob([gifWith([gifLoop,Buffer.concat([Buffer.from([0x21,0xfe]),gifSubBlocks(Buffer.from('Holiday 2024'))])])],{type:'image/gif'});
 assert.equal((await parse(plain)).aiProvenance.status,'CLEAN','ordinary comments are not AI labels');
});
// ---------------------------------------------------------------- ZIP archives
const JSZip=require('jszip');
const {cleanZipArchive,zipReportCsv,safeEntryPath,summarizeZipReport}=require('../src/lib/zip-cleaner.ts');
const ZIP_OPTIONS={level:'ai',keepAttribution:true,escalate:true,dropSystemFiles:true,dropAiSidecars:true};
const bytesOf=async blob=>new Uint8Array(await blob.arrayBuffer());
const zipOf=async(entries,comment)=>{const zip=new JSZip();for(const [name,data,options] of entries){if(data===null)zip.folder(name);else zip.file(name,data,{binary:true,...options});}return new Blob([await zip.generateAsync({type:'uint8array',compression:'DEFLATE',comment})],{type:'application/zip'});};
const readZip=async blob=>JSZip.loadAsync(await bytesOf(blob));
const fileNames=zip=>Object.keys(zip.files).filter(name=>!zip.files[name].dir).sort();
const aiPng=async()=>{const base=await bytesOf(fixture('png','image/png')),packets=writer.containerPackets(base);
 return new Blob([base.subarray(0,8),...packets.filter(p=>p.type!=='IEND').map(p=>p.packet),writer.pngChunk('tEXt',Buffer.from('parameters\0koi pond\nSteps: 20, Sampler: Euler, Seed: 5')),packets.at(-1).packet],{type:'image/png'});};
test('ZIP cleaning: AI images are cleaned and verified; clean images, folders, names, dates and other files are kept; system files and AI sidecars go',async()=>{
 const labeled=await bytesOf(await aiLabeledJpeg()),plain=await bytesOf(fixture('png','image/png')),date=new Date(2024,4,6,7,8,10);
 const inner=await bytesOf(await zipOf([['ai.png',await bytesOf(await aiPng())]]));
 const source=await zipOf([
  ['photos/labeled.jpg',labeled],['photos/plain.png',plain,{date}],['photos/labeled.txt','castle at dusk\nSteps: 30, Sampler: Euler a, Seed: 9'],['photos/plain.txt','A harbour at dawn'],
  ['notes/readme.txt','Made with Midjourney for the client'],['__MACOSX/photos/._labeled.jpg','AppleDouble'],['photos/.DS_Store','x'],['empty/',null],['nested/inner.zip',inner]
 ],'Generated by Midjourney');
 const progress=[];
 const {blob,name,report}=await cleanZipArchive(source,'batch.zip',ZIP_OPTIONS,{onProgress:p=>progress.push(p)});
 assert.equal(name,'batch-clean.zip');assert.ok(progress.some(p=>p.phase==='cleaning'&&p.current==='photos/labeled.jpg'));assert.ok(progress.some(p=>p.phase==='packaging'));
 const out=await readZip(blob);
 assert.deepEqual(fileNames(out),['nested/inner.zip','notes/readme.txt','photos/labeled.jpg','photos/plain.png','photos/plain.txt']);
 assert.ok(out.files['empty/']?.dir,'empty folders are kept');assert.ok(!out.comment,'the archive comment is not copied');
 const cleaned=await out.file('photos/labeled.jpg').async('uint8array');
 assert.equal((await parse(new Blob([cleaned],{type:'image/jpeg'}))).aiProvenance.status,'CLEAN');
 assert.deepEqual(scanData(Buffer.from(cleaned)),scanData(Buffer.from(labeled)),'JPEG image data unchanged');
 assert.deepEqual(await out.file('photos/plain.png').async('uint8array'),plain,'clean images are copied byte for byte');
 assert.equal(out.file('photos/plain.png').date.getTime(),date.getTime(),'file dates are kept');
 assert.equal(await out.file('notes/readme.txt').async('string'),'Made with Midjourney for the client');
 const nested=await JSZip.loadAsync(await out.file('nested/inner.zip').async('uint8array'));
 assert.equal((await parse(new Blob([await nested.file('ai.png').async('uint8array')],{type:'image/png'}))).aiProvenance.status,'CLEAN');
 const byPath=Object.fromEntries(report.entries.map(e=>[e.path,e]));
 assert.equal(byPath['photos/labeled.jpg'].outcome,'cleaned');assert.ok(byPath['photos/labeled.jpg'].markers.length>3);assert.equal(byPath['photos/labeled.jpg'].generator,'Adobe Firefly');
 assert.equal(byPath['photos/plain.png'].outcome,'clean');assert.equal(byPath['photos/labeled.txt'].outcome,'removed');assert.equal(byPath['photos/plain.txt'].outcome,'kept');
 assert.equal(byPath['nested/inner.zip/ai.png'].outcome,'cleaned');assert.equal(byPath['nested/inner.zip'].outcome,'archive');assert.match(byPath['notes/readme.txt'].note,/Mentions AI/);
 assert.equal(report.counts.removed,3);assert.equal(report.images,3);assert.equal(report.aiImages,2);assert.equal(report.archiveComment,'Generated by Midjourney');
 assert.equal(summarizeZipReport(report),'2 cleaned · 1 already clean · 2 other files kept · 1 nested ZIP · 3 removed.');
 const csv=zipReportCsv(report).replace(/^\uFEFF/,'').split('\r\n');assert.match(csv[0],/^File,Result,In cleaned ZIP as,/);assert.ok(csv.some(line=>line.startsWith('photos/labeled.jpg,Cleaned,photos/labeled.jpg,')));
 const keepAll=await cleanZipArchive(source,'batch.zip',{...ZIP_OPTIONS,dropSystemFiles:false,dropAiSidecars:false});
 assert.ok(fileNames(await readZip(keepAll.blob)).includes('photos/labeled.txt'));assert.ok(fileNames(await readZip(keepAll.blob)).includes('__MACOSX/photos/._labeled.jpg'));
 assert.equal(safeEntryPath('C:\\..\\..\\Users/./x/../photo.jpg'),'Users/x/photo.jpg');
});
test('ZIP cleaning: markers a level cannot remove fall back to a full strip, or the file is left out',async()=>{
 // An Ultra HDR gain map with its own AI source type: "AI labels only" keeps gain maps, so the marker survives that level.
 const {file}=await ultraHdrJpeg('',appSegment(225,Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0'),Buffer.from(xmpXml('<Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>'))])));
 const labeled=Buffer.from(await (await aiLabeledJpeg()).arrayBuffer()),truncated=labeled.subarray(0,labeled.indexOf(Buffer.from([255,218]))+20);
 const source=await zipOf([['hdr.jpg',await bytesOf(file)],['broken.jpg',truncated]]);
 const first=await cleanZipArchive(source,'hdr.zip',ZIP_OPTIONS),byPath=Object.fromEntries(first.report.entries.map(e=>[e.path,e]));
 assert.equal(byPath['hdr.jpg'].outcome,'stripped');assert.match(byPath['hdr.jpg'].note,/could not be removed safely.*all metadata was removed/);
 assert.equal(byPath['broken.jpg'].outcome,'failed');assert.equal(byPath['broken.jpg'].output,undefined);
 const out=await readZip(first.blob);assert.deepEqual(fileNames(out),['hdr.jpg']);
 const stripped=await out.file('hdr.jpg').async('uint8array');const result=await parse(new Blob([stripped],{type:'image/jpeg'}));
 assert.equal(result.aiProvenance.status,'CLEAN');assert.equal(result.privacyReport.hasGps,false);
 const strict=await cleanZipArchive(source,'hdr.zip',{...ZIP_OPTIONS,escalate:false});
 assert.equal(strict.report.counts.failed,2);assert.deepEqual(fileNames(await readZip(strict.blob)),[]);
});
test('ZIP cleaning: decompression bombs, forged sizes, oversized, encrypted and invalid archives are refused',async()=>{
 const source=await zipOf([['big.bin',new Uint8Array(3*1024*1024)],['photo.png',await bytesOf(fixture('png','image/png'))]]);
 const limited=await cleanZipArchive(source,'b.zip',ZIP_OPTIONS,{limits:{otherBytes:1024*1024}});
 assert.equal(limited.report.entries.find(e=>e.path==='big.bin').outcome,'failed');assert.equal(limited.report.entries.find(e=>e.path==='photo.png').outcome,'clean');
 // The directory claims 10 bytes; the stream still stops at the limit.
 const forged=Buffer.from(await source.arrayBuffer()),at=forged.lastIndexOf(Buffer.from('big.bin'))-46;
 assert.equal(forged.readUInt32LE(at),0x02014b50);forged.writeUInt32LE(10,at+24);
 const forgedResult=await cleanZipArchive(new Blob([forged]),'forged.zip',ZIP_OPTIONS,{limits:{otherBytes:1024*1024}});
 assert.match(forgedResult.report.entries.find(e=>e.path==='big.bin').note,/Larger than 1 MB/);
 await assert.rejects(()=>cleanZipArchive(new Blob([forged]),'forged.zip',ZIP_OPTIONS,{limits:{totalBytes:1024*1024}}),/expands to more than 1 MB/);
 await assert.rejects(()=>cleanZipArchive(source,'b.zip',ZIP_OPTIONS,{limits:{entries:1}}),/more than 1 files/);
 await assert.rejects(()=>cleanZipArchive(source,'b.zip',ZIP_OPTIONS,{limits:{archiveBytes:1000}}),/larger than 0 MB/);
 await assert.rejects(()=>cleanZipArchive(new Blob(['not a zip']),'x.zip',ZIP_OPTIONS),/not a ZIP archive/);
 const locked=Buffer.from(await source.arrayBuffer()),entry=locked.lastIndexOf(Buffer.from('photo.png'))-46;locked.writeUInt16LE(locked.readUInt16LE(entry+8)|1,entry+8);
 await assert.rejects(()=>cleanZipArchive(new Blob([locked]),'locked.zip',ZIP_OPTIONS),/password-protected/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>cleanZipArchive(source,'b.zip',ZIP_OPTIONS,{signal:controller.signal}),/cancelled/);
});
test('ZIP archives: the store cleans them outside the queue, records the job, and imports their images on request',async()=>{
 const {importImageFiles}=require('../src/lib/import-files.ts');
 store.getState().clearFiles();store.getState().setAiCleanOptions({level:'ai'});
 const archive=new File([await zipOf([['a/labeled.jpg',await bytesOf(await aiLabeledJpeg())],['b/plain.png',await bytesOf(fixture('png','image/png'))],['notes.txt','hello']])],'set.zip',{type:'application/zip'});
 assert.equal(await store.getState().cleanZipArchives([archive]),true);
 const job=store.getState().batchJobs[0];assert.equal(job.type,'CLEAN_ZIP');assert.equal(job.status,'COMPLETED');assert.equal(job.completed,3);assert.equal(job.progress,100);
 const [result]=store.getState().zipResults;assert.equal(result.name,'set-clean.zip');assert.equal(result.report.counts.cleaned,1);assert.equal(store.getState().files.length,0,'the queue is not used');
 assert.equal(store.getState().isProcessing,false);
 store.getState().setZipBehaviour({escalate:false,bogus:true});assert.equal(store.getState().zipBehaviour.escalate,false);assert.equal('bogus' in store.getState().zipBehaviour,false);
 store.getState().setZipBehaviour({escalate:true});
 // On the AI Label Remover page a dropped archive is cleaned; elsewhere its images join the queue.
 store.getState().setCurrentView('ai-labels');assert.equal(await importImageFiles([archive]),true);assert.equal(store.getState().zipResults.length,2);assert.equal(store.getState().files.length,0);
 store.getState().setCurrentView('studio');assert.equal(await importImageFiles([archive]),true);
 assert.deepEqual(store.getState().files.map(f=>f.name).sort(),['labeled.jpg','plain.png']);
 assert.equal(store.getState().files.find(f=>f.name==='labeled.jpg').aiProvenance.status,'LABELED');
 const unsupported=new File(['<svg/>'],'logo.svg',{type:'image/svg+xml'});assert.equal(await importImageFiles([unsupported]),false);
});

(async()=>{let failures=0;for(const {name,run} of tests){try{await run();console.log(`PASS ${name}`);}catch(e){failures++;console.error(`FAIL ${name}\n${e.stack}`);}}console.log(`${tests.length-failures}/${tests.length} passed`);process.exit(failures?1:0);})();
