/* Explicit live calls use only the small, non-private test fixture. Keys are never logged. */
const assert=require('node:assert/strict');
const path=require('node:path');
const {firefox}=require('playwright');
const invalid=process.argv.includes('--invalid-key');
const key=invalid?'invalid-api-key-for-metaforge-qa':process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY;
if(!key)throw new Error('Save a Gemini key in AI Settings for an interactive check, or provide GEMINI_API_KEY to this test process.');
(async()=>{
 const browser=await firefox.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:3100');
  await page.locator('input[aria-label="Choose image files"]').first().setInputFiles(path.join(__dirname,'fixtures','image.jpg'));
  await page.getByRole('button',{name:'Download image',exact:true}).waitFor();
  await page.getByRole('button',{name:'AI BYOK Settings',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'AI settings'});
  await dialog.getByRole('textbox',{name:'Gemini API key',exact:true}).fill(key);
  await dialog.getByRole('button',{name:'Save Configuration',exact:true}).click();
  await page.getByRole('textbox',{name:'SEO title',exact:true}).fill('Preserve live-check draft');
  const response=page.waitForResponse(url=>url.url().includes('generativelanguage.googleapis.com'),{timeout:60000});
  await page.getByRole('button',{name:'Analyze with Gemini',exact:true}).click();
  const status=(await response).status();
  if(invalid){
   await page.getByText(/Invalid Gemini API Key/).waitFor({timeout:60000});
   assert.ok(status===400||status===401||status===403);assert.equal(await page.getByRole('textbox',{name:'SEO title',exact:true}).inputValue(),'Preserve live-check draft');
   console.log('PASS live Gemini: invalid key rejected by Google and the draft is preserved');
  }else{
   assert.equal(status,200,'Gemini rejected the request; no successful live check can be claimed.');
   await page.waitForFunction(()=>{const value=document.querySelector('input[aria-label="SEO title"]')?.value;return value&&value!=='Preserve live-check draft'},{},{timeout:60000});
   assert.ok((await page.getByRole('textbox',{name:'Alt text',exact:true}).inputValue()).trim());
   assert.ok((await page.getByRole('textbox',{name:'Caption',exact:true}).inputValue()).trim());
   console.log('PASS live Gemini: Google returned image SEO successfully');
  }
 }finally{await browser.close()}
})().catch(()=>{console.error('Live Gemini check did not pass. Check the key, model access, quota, and network in AI Settings.');process.exitCode=1});
