/* Set PLAYWRIGHT_MODULE when using a bundled Playwright runtime. */
const { chromium, firefox, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const JSZip=require('jszip'),exifr=require('exifr');
const base=process.env.BASE_URL || 'http://127.0.0.1:3100';
(async()=>{
 const engine=process.env.BROWSER_ENGINE || 'firefox';
 const browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true,...(engine === 'chromium' && process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await context.addInitScript(() => window.addEventListener('error', event => console.error('SCRIPT ERROR LOCATION', event.filename, event.lineno, event.colno)));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>{console.error('BROWSER ERROR',page.url(),e.stack);errors.push(e.message)});
 page.on('console',message=>{if(message.text().startsWith('SCRIPT ERROR LOCATION'))console.error(message.text())});
 const log=(message)=>console.log(`PASS ${message}`);
 try{
 await page.goto(base,{timeout:60000});
 await page.getByRole('button',{name:'Load Sample (GPS + Sony EXIF)',exact:true}).click();
 await page.getByRole('button',{name:'Strip GPS (1)',exact:true}).waitFor();log('Sample import and GPS detection');
 await page.getByRole('textbox',{name:'SEO title',exact:true}).fill('Forest 日本語 & light');
 await page.getByRole('textbox',{name:'Alt text',exact:true}).fill('A forest with green trees');
 await page.getByRole('textbox',{name:'Caption',exact:true}).fill('Editorial forest caption');
 await page.getByRole('button',{name:'Save SEO to Image',exact:true}).click();
 await page.getByText('SEO Saved to Image',{exact:true}).filter({visible:true}).first().waitFor();log('Manual SEO saving with AI disabled');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download image',exact:true}).click();
 const download=await downloadPromise;const saved=fs.readFileSync(await download.path());const meta=await exifr.parse(saved,{xmp:true,iptc:true});
 assert.ok(saved.includes(Buffer.from('Forest 日本語 &amp; light')));assert.ok(JSON.stringify(meta).includes('Forest 日本語'),JSON.stringify(meta));assert.ok(JSON.stringify(meta).includes('A forest with green trees'));log('Downloaded bytes include SEO');
 await page.getByRole('button',{name:'Add Tag',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'Edit metadata tag',exact:true});
 await dialog.getByRole('textbox',{name:'Tag name',exact:true}).fill('CustomTest');
 await dialog.getByRole('textbox',{name:'Tag value',exact:true}).fill('000123');
 await dialog.getByRole('button',{name:'Create Tag',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await page.locator('input[placeholder="Filter EXIF, IPTC, XMP tags..."]:visible').fill('CustomTest');
 await page.getByText('CustomTest:',{exact:true}).filter({visible:true}).first().waitFor();assert.ok(await page.getByText('000123',{exact:true}).filter({visible:true}).first().count());log('Custom metadata retains numeric-looking strings');
 const row=page.getByText('CustomTest:',{exact:true}).filter({visible:true}).first().locator('..').locator('..');await row.getByRole('button',{name:'Edit tag',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Edit metadata tag',exact:true});
 await page.keyboard.press('Shift+Tab');assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});log('Dialog focus stays inside and Escape closes');
 await page.locator('input[placeholder="Filter EXIF, IPTC, XMP tags..."]:visible').fill('');
 await page.getByRole('button',{name:'Strip GPS (1)',exact:true}).click();
 await page.getByText('Batch GPS Removal',{exact:true}).filter({visible:true}).first().waitFor();assert.equal(await page.getByRole('button',{name:'Strip GPS (1)',exact:true}).count(),0);log('GPS removal updates the actual UI state');
 await page.getByRole('button',{name:'Load Sample (AI / ComfyUI)',exact:true}).click();
 await page.getByText('Files Imported',{exact:true}).filter({visible:true}).first().waitFor();
 await page.getByRole('link',{name:'Batch Processing',exact:true}).click();await page.getByText('Batch GPS Removal',{exact:true}).filter({visible:true}).first().waitFor();
 assert.equal(await page.getByText('1284',{exact:false}).count(),0);log('Batch history shows actual job results');
 await page.getByRole('link',{name:'Metadata Compare',exact:true}).click();await page.getByText('Side-by-Side Metadata Difference & Live Editor',{exact:true}).filter({visible:true}).first().waitFor();log('Comparison view renders imported files');
 // Alt text and caption have independent edit/copy paths, including the compact tablet table.
 await page.setViewportSize({width:768,height:1024});
 await page.getByTitle('Edit Alt Text on Asset A',{exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Edit metadata tag',exact:true});
 await dialog.getByRole('textbox',{name:'Tag value',exact:true}).fill('Independent alt text');
 await dialog.getByRole('button',{name:'Save Tag',exact:true}).click();await dialog.waitFor({state:'hidden'});
 let compareRow=page.getByText('Alt Text',{exact:true}).filter({visible:true}).locator('..');
 await compareRow.getByTitle('Copy A → B',{exact:true}).click();
 await compareRow.getByTitle('Copy A → B',{exact:true}).waitFor({state:'hidden'});
 assert.equal(await compareRow.getByText('Independent alt text',{exact:true}).count(),2);
 await page.getByTitle('Edit Caption on Asset B',{exact:true}).click();
 dialog=page.getByRole('dialog',{name:'Edit metadata tag',exact:true});
 await dialog.getByRole('textbox',{name:'Tag value',exact:true}).fill('Independent caption');
 await dialog.getByRole('button',{name:'Save Tag',exact:true}).click();await dialog.waitFor({state:'hidden'});
 compareRow=page.getByText('Caption',{exact:true}).filter({visible:true}).locator('..');
 await compareRow.getByTitle('Copy B → A',{exact:true}).click();
 await compareRow.getByTitle('Copy B → A',{exact:true}).waitFor({state:'hidden'});
 assert.equal(await compareRow.getByText('Independent caption',{exact:true}).count(),2);
 assert.equal(await page.getByText('Independent alt text',{exact:true}).filter({visible:true}).count(),2);
 await page.setViewportSize({width:1440,height:1000});log('Tablet comparison edits and bidirectional sync keep alt text and caption separate');
 await page.getByRole('link',{name:'Presets Manager',exact:true}).click();await page.getByText('Metadata & SEO Presets Manager',{exact:true}).filter({visible:true}).first().waitFor();
 await page.getByRole('button',{name:'Apply Preset to All (2)',exact:true}).first().click();await page.getByText('Preset Applied',{exact:true}).filter({visible:true}).first().waitFor();log('Preset applies across JPEG and PNG');
 await page.getByRole('link',{name:/Studio Workstation/}).click();
 await page.getByRole('button',{name:'Sitemaps',exact:true}).click();await page.getByRole('button',{name:/Generate Google Image Sitemap/}).click();
 dialog=page.getByRole('dialog',{name:'Image sitemap',exact:true});await dialog.getByRole('textbox',{name:'Website base URL',exact:true}).fill('bad-url');
 assert.equal(await dialog.getByRole('button',{name:'Download sitemap.xml',exact:true}).isDisabled(),true);
 await dialog.getByRole('textbox',{name:'Website base URL',exact:true}).fill('https://example.com/');
 assert.equal(await dialog.getByRole('button',{name:'Download sitemap.xml',exact:true}).isEnabled(),true);
 await page.keyboard.press('Escape');log('Sitemap domain validation');
 await page.getByRole('button',{name:'AI BYOK Settings',exact:true}).click();
 dialog=page.getByRole('dialog',{name:'AI settings',exact:true});await dialog.getByRole('textbox',{name:'Gemini API key',exact:true}).fill('test-key');
 await dialog.getByRole('button',{name:'Save Configuration',exact:true}).click();
 await page.getByRole('button',{name:'AI BYOK Settings',exact:true}).click();assert.equal(await dialog.getByRole('textbox',{name:'Gemini API key',exact:true}).inputValue(),'test-key');await page.keyboard.press('Escape');log('AI settings reopening retains saved state');
 await page.getByRole('button',{name:'Toggle AI assistant',exact:true}).click();
 while(await page.getByRole('button',{name:'Dismiss notification',exact:true}).count())await page.getByRole('button',{name:'Dismiss notification',exact:true}).last().click();
 const widths=[320,375,390,640,768,820,1024,1194,1280,1440,1920];
 for(const width of widths){
  await page.setViewportSize({width,height:width<768?844:1000});
  await page.waitForTimeout(120);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,height:innerHeight,docHeight:document.documentElement.scrollHeight}));
  if(dimensions.scroll>dimensions.width){console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).slice(0,18).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,70),rect:e.getBoundingClientRect().toJSON()}))));await page.screenshot({path:'tests/overflow.png',fullPage:true});}
  assert.ok(dimensions.scroll<=dimensions.width,JSON.stringify(dimensions));
  if(width>=768)assert.ok(dimensions.docHeight<=dimensions.height+1,`Workstation should use independent panes: ${JSON.stringify(dimensions)}`);
  const settings=await page.getByRole('button',{name:'AI BYOK Settings',exact:true}).boundingBox();assert.ok(settings.x+settings.width<=width);
  if([390,820,1440].includes(width))await page.screenshot({path:`tests/${engine}-responsive-${width}.png`,fullPage:true});
 }
 log('11 responsive widths (320–1920px), bounded tablet/desktop panes, accessible header');
 // Mobile native navigation and bottom sheets.
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'More',exact:true}).click();
 await page.getByRole('dialog',{name:'More tools',exact:true}).getByRole('link',{name:/Batch Queue/}).click();await page.getByText('Background Batch Processing Queue',{exact:true}).filter({visible:true}).first().waitFor();
 await page.getByRole('link',{name:/^Studio/}).click();await page.getByRole('button',{name:'Queue',exact:false}).filter({hasText:'Queue'}).first().click();
 await page.getByRole('button',{name:'Load Sample (AI / ComfyUI)',exact:true}).click();log('Mobile navigation, More sheet and queue import');
 await page.setViewportSize({width:820,height:1180});await page.getByRole('button',{name:'AI / SEO',exact:true}).click();await page.getByRole('textbox',{name:'SEO title',exact:true}).waitFor();log('Tablet unified inspector');
 // Mock Google responses so no image or key leaves the local test browser.
 let mode='quota', imagePayload, responseGate;
 await page.route(/generativelanguage\.googleapis\.com/,async route=>{
  const body=route.request().postDataJSON();
  imagePayload=body.contents.flatMap(item=>item.parts).find(part=>part.inlineData||part.inline_data);
  if(mode==='quota')return route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:{code:429,message:'RESOURCE_EXHAUSTED',status:'RESOURCE_EXHAUSTED'}})});
  if(mode==='permissions')return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{code:403,message:'PERMISSION_DENIED',status:'PERMISSION_DENIED'}})});
  if(mode==='server')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:503,message:'UNAVAILABLE',status:'UNAVAILABLE'}})});
  if(mode==='timeout')return route.fulfill({status:408,contentType:'application/json',body:JSON.stringify({error:{code:408,message:'Request timed out',status:'DEADLINE_EXCEEDED'}})});
  if(mode==='safety')return route.fulfill({contentType:'application/json',body:JSON.stringify({promptFeedback:{blockReason:'SAFETY'},candidates:[]})});
  if(mode==='malformed')return route.fulfill({contentType:'application/json',body:JSON.stringify({candidates:[{content:{role:'model',parts:[{text:'{"title":""}'}]},finishReason:'STOP'}]})});
  if(mode==='delayed')await responseGate.promise;
  return route.fulfill({contentType:'application/json',body:JSON.stringify({promptFeedback:{blockReason:'BLOCKED_REASON_UNSPECIFIED'},candidates:[{content:{role:'model',parts:[{text:JSON.stringify({title:'Mock AI title',caption:'Mock caption',altText:'Mock accessible alt',keywords:['mock'],privacyFlags:{containsFaces:false,containsIdentifiableText:false}})}]},finishReason:'STOP'}]})});
 });
 await page.getByRole('textbox',{name:'SEO title',exact:true}).fill('Keep this draft');
 await page.getByRole('button',{name:'Toggle AI assistant',exact:true}).click();
 await page.getByRole('button',{name:'Analyze with Gemini',exact:true}).click();
 await page.getByText(/Gemini API rate limit exceeded/).filter({visible:true}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'SEO title',exact:true}).inputValue(),'Keep this draft');
 for(const [failure,expected] of [['permissions',/Gemini API access denied/],['server',/temporarily unavailable/],['timeout',/Gemini analysis timed out/],['safety',/blocked by Gemini safety filters/],['malformed',/Could not parse Gemini JSON response/]]){
  mode=failure;await page.getByRole('button',{name:'Analyze with Gemini',exact:true}).click();
  await page.getByText(expected).filter({visible:true}).waitFor();
  assert.equal(await page.getByRole('textbox',{name:'SEO title',exact:true}).inputValue(),'Keep this draft');
 }
 mode='delayed';responseGate=Promise.withResolvers();
 const started=page.waitForRequest(/generativelanguage\.googleapis\.com/);
 await page.getByRole('button',{name:'Analyze with Gemini',exact:true}).click();await started;
 await page.getByRole('textbox',{name:'SEO title',exact:true}).fill('Newer manual draft');responseGate.resolve();
 await page.getByText(/SEO changed while analysis was running/).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'SEO title',exact:true}).inputValue(),'Newer manual draft');
 log('Gemini permission/server/timeout/safety/schema failures and in-flight draft edits preserve user work');
 mode='valid';await page.getByRole('button',{name:'Analyze with Gemini',exact:true}).click();
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('input[aria-label="SEO title"]')).some(el=>el.value==='Mock AI title'));
 const payload=imagePayload.inlineData||imagePayload.inline_data;assert.ok(!Buffer.from(payload.data,'base64').includes(Buffer.from('Exif\0\0')));log('Mocked Gemini quota handling, valid response and metadata-free preview');
 // Duplicate source names must survive archive export.
 const upload=page.locator('input[aria-label="Choose image files"]').first();
 await upload.setInputFiles([{name:'duplicate.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync(`${__dirname}/fixtures/image.jpg`)},{name:'duplicate.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync(`${__dirname}/fixtures/image.jpg`)}]);
 await page.waitForTimeout(500);
 await page.keyboard.press('Control+k');
 const command=page.getByRole('dialog',{name:'Command menu',exact:true});
 await command.getByPlaceholder('Type a command, tool, or search files...').fill('Download All Processed as ZIP');
 const zipDownload=page.waitForEvent('download');await command.getByPlaceholder('Type a command, tool, or search files...').press('Enter');
 const archive=await zipDownload,zip=await JSZip.loadAsync(fs.readFileSync(await archive.path()));
 assert.equal(Object.keys(zip.files).filter(name=>/duplicate(?:-\d+)?\.jpg$/.test(name)).length,2);log('ZIP preserves duplicate filenames and command palette runs export');
 // Exercise the WebP writer with the real browser decoder, including transparency.
 await upload.setInputFiles({name:'image.webp',mimeType:'image/webp',buffer:fs.readFileSync(`${__dirname}/fixtures/image.webp`)});
 const webp=page.getByRole('group',{name:'image.webp',exact:true});await webp.click();
 await page.getByRole('textbox',{name:'SEO title',exact:true}).fill('WebP round trip');
 await page.getByRole('button',{name:'Save SEO to Image',exact:true}).click();await page.getByText('SEO Saved to Image',{exact:true}).filter({visible:true}).first().waitFor();
 const webpDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download image',exact:true}).click();
 const webpFile=await webpDownload,webpBytes=fs.readFileSync(await webpFile.path());assert.equal(webpBytes.toString('ascii',8,12),'WEBP');
 const dimensions=await page.evaluate(async bytes=>{const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/webp'}));const result=[bitmap.width,bitmap.height];bitmap.close();return result;},Array.from(webpBytes));
 assert.deepEqual(dimensions,[16,12]);log('Real browser decodes an edited WebP with matching format and dimensions');
 for(const route of ['/about','/tutorial','/does-not-exist']){
  await page.waitForLoadState('networkidle');
  await page.goto(base+route);assert.ok(await page.locator('body').innerText());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 assert.deepEqual(errors,[]);log('Docs, guide, 404 and no browser runtime errors');
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:engine !== 'firefox',deviceScaleFactor:2,reducedMotion:'reduce'});
 const phone=await touch.newPage();phone.on('pageerror',error=>errors.push(error.message));await phone.goto(base);
 await phone.getByRole('button',{name:'Load Sample (GPS + Sony EXIF)',exact:true}).tap();
 await phone.getByRole('button',{name:'Download image',exact:true}).waitFor();
 const size=await phone.getByRole('button',{name:'AI BYOK Settings',exact:true}).boundingBox();assert.ok(size.width>=44&&size.height>=44);
 await phone.getByRole('button',{name:'SEO',exact:true}).tap();await phone.getByRole('textbox',{name:'SEO title',exact:true}).fill('Touch test');
 assert.equal(await phone.getByRole('textbox',{name:'SEO title',exact:true}).evaluate(el=>getComputedStyle(el).fontSize),'16px');
 assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await touch.close();assert.deepEqual(errors,[]);log('Coarse touch targets, mobile viewport, reduced motion and 16px inputs');
 console.log('Browser audit passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
