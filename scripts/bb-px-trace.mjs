#!/usr/bin/env node
/** bb-px-trace.mjs — patch PX main.min.js iw() decoder in-flight, capture all
 *  decoded strings + the collector POST. Serve patched bundle on real page. */
import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'node:fs';
let px = readFileSync('/tmp/opencode/bb/px-main.js', 'utf-8');

// patch iw to log: function iw(i){return void 0===ix[i]?ix[i]=iv(iy[i]):ix[i]}
const from = 'function iw(i){return void 0===ix[i]?ix[i]=iv(iy[i]):ix[i]}';
const to   = 'function iw(i){var __r=void 0===ix[i]?ix[i]=iv(iy[i]):ix[i];if((self.__pxstrs=self.__pxstrs||[]).length<3000)self.__pxstrs.push([i,__r]);return __r}';
if (px.includes(from)) { px = px.replace(from,to); console.log('iw patched'); }
else console.log('IW PATCH MISS');

const b = await chromium.launch({ headless:true });
const ctx = await b.newContext({ viewport:{width:1280,height:900} });
const page = await ctx.newPage();
// serve patched px-main.js at the real URL
await page.route('**/PXJeSgWPZK/main.min.js', async route => {
  await route.fulfill({ status:200, contentType:'application/javascript', body: px });
});
// capture collector posts
const posts=[];
page.on('request', req => {
  const u=req.url();
  if (/collector|px-cloud|px-cdn/.test(u) && req.method()==='POST') {
    posts.push({ url:u.slice(0,150), postData: (req.postData()||'').slice(0,500) });
  }
});
await page.route('**/*', async route => {
  const u = route.request().url();
  if (/collector|px-cloud|px-cdn|signifyd/.test(u)) {
    await route.fulfill({ status:200, contentType:'application/json', body:'{}' });
  } else await route.continue();
});
await page.goto('https://www.bootbarn.com/', { waitUntil:'load', timeout:60000 }).catch(()=>{});
await page.waitForTimeout(12000);
const r = await page.evaluate(() => self.__pxstrs || []).catch(()=>[]);
writeFileSync('/tmp/opencode/bb/px-strings-runtime.json', JSON.stringify(r,null,0));
console.log('decoded strings:', r.length);
const seen=new Set();
for (const [i,o] of r){ if(o&&/[\x20-\x7e]{2,}/.test(o)&&!seen.has(o)){ seen.add(o); console.log(`  [${i}] ${o.slice(0,110)}`); } }
console.log('\ncollector posts:', posts.length);
for (const p of posts.slice(0,3)) { console.log(' ', p.url); console.log('   ', p.postData.slice(0,300)); }
await b.close();
