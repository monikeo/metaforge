/* WebKit touch/viewport emulation, distinct from the native macOS Safari CI test. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const exifr=require('exifr');
const {webkit,devices}=require('playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:3100';
(async()=>{
 const browser=await webkit.launch();
 try{
  for(const name of ['iPad (gen 11)','iPad Pro 11','iPhone 13']){
   const context=await browser.newContext({...devices[name],reducedMotion:'reduce',acceptDownloads:true});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   page.setDefaultTimeout(15000);
   try{
    await page.goto(base);
    await page.getByRole('button',{name:'Load Sample (GPS + Sony EXIF)',exact:true}).tap();
    await page.getByRole('button',{name:'Download image',exact:true}).waitFor();
    const seo=async()=>{
     if((await page.viewportSize()).width<768)await page.getByRole('button',{name:'SEO',exact:true}).tap();
     else if((await page.viewportSize()).width<1200)await page.getByRole('button',{name:'AI / SEO',exact:true}).tap();
    };
    await seo();
    await page.getByRole('textbox',{name:'SEO title',exact:true}).fill(`${name} 日本語 title`);
    await page.getByRole('textbox',{name:'Caption',exact:true}).fill('Apple touch caption');
    await page.getByRole('textbox',{name:'Alt text',exact:true}).fill('Accessible Apple touch preview');
    await page.getByRole('button',{name:'Save SEO to Image',exact:true}).tap();
    await page.getByText('SEO Saved to Image',{exact:true}).filter({visible:true}).waitFor();
    if((await page.viewportSize()).width<768)await page.getByRole('button',{name:'Canvas',exact:true}).tap();
    const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download image',exact:true}).tap();
    const download=await downloading,bytes=fs.readFileSync(await download.path());
    const metadata=await exifr.parse(bytes,{xmp:true,iptc:true});assert.ok(JSON.stringify(metadata).includes(`${name} 日本語 title`));
    await page.locator('input[aria-label="Choose image files"]').first().setInputFiles({name:'second.png',mimeType:'image/png',buffer:fs.readFileSync(`${__dirname}/fixtures/image.png`)});
    for(const viewport of [devices[name].viewport,devices[`${name} landscape`].viewport,devices[name].viewport]){
     await page.setViewportSize(viewport);
     for(const [view,desktop,mobile,heading] of [
      ['dashboard','Dashboard','Home','MetaForge SaaS Operations Console'],
      ['compare','Metadata Compare','Compare','Side-by-Side Metadata Difference & Live Editor'],
      ['presets','Presets Manager','Presets','Metadata & SEO Presets Manager'],
      ['jobs','Batch Processing',null,'Background Batch Processing Queue'],
     ]){
      if(viewport.width<768&&view==='jobs'){
       await page.getByRole('button',{name:'More',exact:true}).tap();
       await page.getByRole('dialog',{name:'More tools'}).getByRole('link',{name:/Batch Queue/}).tap();
      }else await (viewport.width<768?page.getByRole('navigation',{name:'Mobile Navigation'}).getByRole('link',{name:mobile,exact:true}):page.getByTitle(desktop,{exact:true})).tap();
      await page.getByRole('heading',{name:heading,exact:true}).waitFor();
      assert.equal(new URL(page.url()).searchParams.get('view'),view);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${view} overflows`);
     }
     await (viewport.width<768?page.getByRole('navigation',{name:'Mobile Navigation'}).getByRole('link',{name:'Studio',exact:true}):page.getByTitle('Studio Workstation',{exact:true})).tap();
     await page.getByRole('button',{name:'Download image',exact:true}).waitFor();
     await page.getByRole('button',{name:'AI BYOK Settings',exact:true}).tap();
     const dialog=page.getByRole('dialog',{name:'AI settings'});await dialog.waitFor();
     await dialog.getByRole('combobox',{name:'Gemini model'}).selectOption('gemini-3.8-flash');
     await dialog.getByRole('button',{name:'Close AI settings'}).tap();
     await page.waitForFunction(()=>!document.querySelector('[aria-modal="true"]')&&document.body.style.overflow==='');
    }
    await page.screenshot({path:`tests/apple-${name.replaceAll(/[^\w-]/g,'-')}.png`,fullPage:true});
    assert.deepEqual(errors,[]);console.log(`PASS Apple WebKit emulation: ${name}, touch editing/download, all workspaces, portrait/landscape, settings`);
   }catch(error){
    console.error('Apple emulation failure',name,page.url());
    await page.screenshot({path:'tests/apple-failure.png',fullPage:true}).catch(()=>{});
    throw error;
   }finally{await context.close()}
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
