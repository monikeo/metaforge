/* Apple's real Safari via SafariDriver, on macOS or an iPadOS Simulator. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Builder,By,Key}=require('selenium-webdriver');
const {Pointer}=require('selenium-webdriver/lib/input');
const safari=require('selenium-webdriver/safari');
const base=process.env.BASE_URL||'http://127.0.0.1:3100';
const isIPad=process.env.SAFARI_TARGET==='ipad';
(async()=>{
 if(process.platform!=='darwin'&&!process.env.SAFARI_REMOTE_URL)throw new Error('Native Safari requires macOS or SAFARI_REMOTE_URL. Use test:apple for local WebKit emulation.');
 const options=new safari.Options();
 if(isIPad){
  options.set('platformName','iOS');options.set('safari:useSimulator',true);options.set('safari:deviceType','iPad');
  if(process.env.SAFARI_SIMULATOR_UDID)options.set('safari:deviceUDID',process.env.SAFARI_SIMULATOR_UDID);
 }
 let builder=new Builder().forBrowser('safari').setSafariOptions(options);
 let service;
 if(process.platform==='darwin'&&!process.env.SAFARI_REMOTE_URL){
  service=new safari.ServiceBuilder('/usr/bin/safaridriver').build();
  builder=builder.usingServer(await service.start());
 }
 if(process.env.SAFARI_REMOTE_URL)builder=builder.usingServer(process.env.SAFARI_REMOTE_URL);
 const startDriver=async()=>{
  for(let attempt=0;attempt<2;attempt++){
   try{return await builder.build()}catch(error){
    if(!isIPad||attempt||error.name!=='SessionNotCreatedError')throw error;
    console.warn('Native iPadOS Safari was not ready; retrying session creation once.');
   }
  }
 };
 const driver=await startDriver().catch(async error=>{await service?.kill();throw error});
 const visible=async locator=>driver.wait(async()=>{
  try{
   for(const element of await driver.findElements(locator))if(await element.isDisplayed())return element;
  }catch(error){if(error.name!=='StaleElementReferenceError')throw error}
  return false;
 },20000,`Visible element: ${locator}`);
 const css=selector=>visible(By.css(selector));
 const button=text=>visible(By.xpath(`//button[normalize-space(.)=${JSON.stringify(text)}]`));
 const heading=text=>visible(By.xpath(`//*[self::h1 or self::h2 or self::h3][normalize-space(.)=${JSON.stringify(text)}]`));
 const fill=async(selector,value)=>{
  const element=await css(selector);await element.clear();
  for(const character of value)await element.sendKeys(character);
  assert.equal(await(await css(selector)).getAttribute('value'),value,'Native Safari did not enter the complete test input.');
 };
 const tap=async element=>{
  if(isIPad){
   await driver.executeAsyncScript(function(element,done){element.scrollIntoView({block:'center',inline:'center',behavior:'instant'});requestAnimationFrame(()=>requestAnimationFrame(done))},element);
   const finger=new Pointer('ipad-finger',Pointer.Type.TOUCH);
   await driver.actions({async:true}).insert(finger,finger.move({origin:element,duration:100}),finger.press(0,1,1,0.5)).pause(100,finger).insert(finger,finger.release()).perform();
  }else await element.click();
 };
 const click=async selector=>tap(await css(selector));
 const nav=async(view,desktop,_mobile)=>{
  const width=await driver.executeScript('return innerWidth');
  if(width<768&&view==='jobs'){
   await tap(await button('More'));await click('[role="dialog"] a[href="/?view=jobs"]');
  }else await click(width<768?`nav[aria-label="Mobile Navigation"] a[href="${view==='studio'?'/':'/?view='+view}"]`:`aside a[title="${desktop}"]`);
  await heading({dashboard:'MetaForge SaaS Operations Console',compare:'Compare Requires 2+ Images',presets:'Metadata & SEO Presets Manager',jobs:'Background Batch Processing Queue',studio:'METAFORGE'}[view]);
 };
 const canvasFormats=()=>driver.executeAsyncScript(function(done){
   Promise.all([false,true].map(willReadFrequently=>new Promise(resolve=>{
    try{
     const canvas=document.createElement('canvas');canvas.width=16;canvas.height=12;
     const context=canvas.getContext('2d',{willReadFrequently});context.fillRect(0,0,16,12);
     const pixel=Array.from(context.getImageData(0,0,1,1).data);
     const dataUrl=canvas.toDataURL('image/jpeg',0.95);
     canvas.toBlob(blob=>resolve({willReadFrequently,pixel,dataUrlHeader:dataUrl.slice(0,64),blobType:blob?.type,blobSize:blob?.size}),'image/jpeg',0.95);
    }catch(error){resolve({willReadFrequently,error:error.message})}
   }))).then(done);
  });
 const observePage=()=>driver.executeScript(function(){
  window.__qaErrors=[];window.__qaToasts=[];window.__qaClicks=[];window.__qaInput=[];
  addEventListener('error',event=>window.__qaErrors.push(event.message));
  addEventListener('unhandledrejection',event=>window.__qaErrors.push(String(event.reason?.message||event.reason)));
  addEventListener('click',event=>window.__qaClicks.push(event.target.closest('button,a')?.textContent),true);
  for(const type of ['pointerdown','pointerup','touchstart','touchend','click'])addEventListener(type,event=>{
   if(window.__qaInput.length<100)window.__qaInput.push({type,target:event.target.tagName,label:event.target.closest('button,a')?.getAttribute('aria-label')});
  },true);
  new MutationObserver(()=>{for(const node of document.querySelectorAll('[role=status],[role=alert]')){
   if(!window.__qaToasts.includes(node.textContent))window.__qaToasts.push(node.textContent);
  }}).observe(document.body,{childList:true,subtree:true});
 });
 try{
  await driver.manage().setTimeouts({script:30000,pageLoad:45000});
  if(!isIPad)await driver.manage().window().setRect({width:1440,height:1000});
  const capabilities=await driver.getCapabilities();
  console.log(`Native ${isIPad?'iPadOS':'macOS'} Safari ${capabilities.get('browserVersion')}`);
  await driver.get(isIPad?'data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Independent native touch check</title><body></body>'):base);
  await observePage();
  if(isIPad){
   await driver.executeScript('window.__qaProbe=0;const probe=document.createElement("button");probe.id="native-input-probe";probe.textContent="Native touch input check";probe.style.cssText="position:fixed;left:40%;top:40%;width:160px;height:60px;z-index:9999;background:white;color:black";probe.onclick=()=>window.__qaProbe++;document.body.append(probe)');
   await tap(await css('#native-input-probe'));
   await driver.wait(async()=>await driver.executeScript('return window.__qaProbe>0'),5000,'Native iPadOS input blocked: SafariDriver delivered no click on a blank page independent of the app.');
   console.log('PASS native iPadOS: independent touch input preflight');
   await driver.get(base);await observePage();
  }
  for(const view of [['dashboard','Dashboard','Home'],['compare','Metadata Compare','Compare'],['presets','Presets Manager','Presets'],['jobs','Batch Processing','More'],['studio','Studio Workstation','Studio']])await nav(...view);
  await nav('dashboard','Dashboard','Home');await nav('presets','Presets Manager','Presets');
  await driver.navigate().back();await heading('MetaForge SaaS Operations Console');
  await driver.navigate().forward();await heading('Metadata & SEO Presets Manager');
  await nav('studio','Studio Workstation','Studio');
  console.log('PASS Safari: all workspaces and browser history');

  await tap(await button('Load Sample (GPS + Sony EXIF)'));
  await css('button[aria-label="Download image"]');
  const width=await driver.executeScript('return innerWidth');
  if(width<768)await tap(await button('SEO'));
  else if(width<1200)await tap(await button('AI / SEO'));
  await fill('input[aria-label="SEO title"]','Safari metadata title');
  await fill('[aria-label="Alt text"]','Safari accessible alt text');
  await fill('[aria-label="Caption"]','Safari independent caption');
  await tap(await button('Save SEO to Image'));
  await visible(By.xpath('//*[normalize-space(.)="SEO Saved to Image"]'));
  if(width<768)await tap(await button('Canvas'));
  await driver.wait(()=>driver.executeScript('return Array.from(document.images).some(img=>img.src.startsWith("blob:")&&img.complete&&img.naturalWidth>0&&img.getBoundingClientRect().width>100)'),15000,'The saved image preview did not finish decoding.');
  const bytes=await driver.executeAsyncScript(function(done){
   const image=Array.from(document.images).find(img=>img.src.startsWith('blob:')&&img.getBoundingClientRect().width>100);
   if(!image)return done({error:'No visible preview'});
   fetch(image.src).then(response=>response.arrayBuffer()).then(buffer=>done({bytes:Array.from(new Uint8Array(buffer))})).catch(error=>done({error:error.message}));
  });
  assert.ok(bytes.bytes,bytes.error);assert.ok(Buffer.from(bytes.bytes).includes(Buffer.from('Safari metadata title')));
  console.log('PASS Safari: touch/keyboard editing writes actual image bytes');
  if(width<768)await tap(await button('SEO'));
  await click('button[title="AI BYOK Settings"]');
  await fill('[aria-label="Gemini API key"]','safari-contract-test-key');
  await tap(await button('Save Configuration'));
  await driver.executeScript(function(){
   const original=window.fetch.bind(window);window.__qaGeminiMode='quota';
   window.fetch=async(input,init)=>{
    if(!String(typeof input==='string'?input:input.url||input).includes('generativelanguage.googleapis.com'))return original(input,init);
    const request=input instanceof Request&&!init?input.clone():new Request(input,init);
    window.__qaGeminiRequest=await request.json();
    if(window.__qaGeminiMode==='quota')return new Response(JSON.stringify({error:{code:429,message:'RESOURCE_EXHAUSTED',status:'RESOURCE_EXHAUSTED'}}),{status:429,headers:{'Content-Type':'application/json'}});
    return new Response(JSON.stringify({candidates:[{content:{role:'model',parts:[{text:JSON.stringify({title:'Safari generated title',caption:'Generated caption',altText:'Generated accessible alt',keywords:['safari'],privacyFlags:{}})}]},finishReason:'STOP'}]}),{headers:{'Content-Type':'application/json'}});
   };
  });
  await fill('[aria-label="SEO title"]','Preserve Safari draft');
  await tap(await button('Analyze with Gemini'));
  await visible(By.xpath('//*[contains(text(),"Gemini API rate limit exceeded")]'));
  assert.equal(await(await css('[aria-label="SEO title"]')).getAttribute('value'),'Preserve Safari draft');
  await driver.executeScript('window.__qaGeminiMode="valid"');
  await tap(await button('Analyze with Gemini'));
  await driver.wait(async()=>await(await css('[aria-label="SEO title"]')).getAttribute('value')==='Safari generated title',30000);
  assert.equal(await driver.executeScript('const part=window.__qaGeminiRequest.contents.flatMap(c=>c.parts).find(p=>p.inlineData||p.inline_data);return atob((part.inlineData||part.inline_data).data).includes("Exif"+String.fromCharCode(0,0))'),false);
  console.log('PASS Safari: Gemini quota recovery, preserved draft, valid contract response and metadata-free preview');

  await click('header a[href="/"]');
  // Native Safari tests actual platform-sized panes; the WebKit suite covers 320px and rotations.
  for(const size of isIPad?[null]:[{width:1024,height:768},{width:1440,height:1000}]){
   if(size)await driver.manage().window().setRect(size);
   assert.equal(await driver.executeScript('return document.documentElement.scrollWidth>innerWidth'),false);
   await click('button[title="AI BYOK Settings"]');
   if(isIPad)await click('button[aria-label="Close AI settings"]');
   else {const key=await css('[aria-label="Gemini API key"]');await key.sendKeys(Key.ESCAPE)}
   await driver.wait(async()=>await driver.executeScript('return !document.querySelector("[aria-modal=true]")&&document.body.style.overflow===""'),15000);
  }
  assert.deepEqual(await driver.executeScript('return window.__qaErrors'),[]);
  fs.writeFileSync(`tests/safari-${isIPad?'ipad':'macos'}.png`,Buffer.from(await driver.takeScreenshot(),'base64'));
  console.log(`PASS native ${isIPad?'iPadOS Simulator':'macOS'} Safari: responsive controls, dialogs and no runtime errors`);
 }catch(error){
  try{console.error('Safari failure state',await driver.executeScript('return {url:location.href,headings:Array.from(document.querySelectorAll("h1,h2,h3")).map(el=>el.textContent),errors:window.__qaErrors,toasts:window.__qaToasts,clicks:window.__qaClicks,input:window.__qaInput,secure:isSecureContext,uuid:typeof crypto.randomUUID}'));console.error('Native canvas formats',await canvasFormats())}catch{/* Driver may already be closed. */}
  try{fs.writeFileSync(`tests/safari-${isIPad?'ipad':'macos'}-failure.png`,Buffer.from(await driver.takeScreenshot(),'base64'))}catch{/* Driver may already be closed. */}
  throw error;
 }finally{try{await driver.quit()}finally{await service?.kill()}}
})().catch(error=>{console.error(error);process.exitCode=1});
