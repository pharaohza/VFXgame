import {chromium} from 'playwright-core';
import fs from 'node:fs';
const browser=await chromium.launch({channel:process.platform==='win32'?'msedge':'chromium',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
fs.mkdirSync('artifacts',{recursive:true});
await page.goto(`http://127.0.0.1:${process.env.PORT || 5190}`);await page.waitForFunction(()=>window.gallery);
const unity=await page.evaluate(()=>gallery.entries.filter(e=>e.preview==='unity-adapted').map(e=>({id:e.id,name:e.name})));
let count=0;
for(const e of unity){await page.evaluate(async id=>{await gallery.open(id);gallery.viewer.seek(.4);},e.id);if(await page.locator('#detail-name').textContent()!==e.name)errors.push('Mismatched '+e.id);if(await page.locator('#preview-error').isVisible())errors.push('Preview failed '+e.id);count++;if(count%50===0)console.log('Unity preview',count,'/',unity.length);}
await page.locator('#sources [data-source="PetTown Unity"]').click();const countCheck=await page.evaluate(()=>({expected:gallery.summary.sources['PetTown Unity'],actual:document.querySelector('#collection-title span').textContent}));if(String(countCheck.expected)!==countCheck.actual)errors.push('Source filter count mismatch');
const result={unityPreviews:count,errors,passed:errors.length===0,sourceFilter:countCheck};fs.writeFileSync('artifacts/qa-unity.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();if(errors.length)process.exitCode=1;
