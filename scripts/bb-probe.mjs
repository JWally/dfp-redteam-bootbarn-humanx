#!/usr/bin/env node
/** bb-probe.mjs — load real bootbarn.com, capture every request + bundle +
 *  the HUMAN/PX global API. All 3rd-party telemetry fulfilled locally. */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const b = await chromium.launch({ headless:true });
const ctx = await b.newContext({ viewport:{width:1280,height:900}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
const log = { requests:[], bundles:{}, errors:[] };

page.on('request', req => {
  const u = req.url();
  if (/bootbarn|signifyd|px-|perimeter|humansecurity|human\.secur|\.px\b|cdn-scripts|demandware/.test(u)) {
    log.requests.push({ method: req.method(), url: u.slice(0,220), type: req.resourceType() });
  }
});
page.on('response', async r => {
  const u = r.url();
  if (/\.js($|\?)/.test(u) && /bootbarn|signifyd|px-|perimeter|human|demandware/.test(u)) {
    try { const body = await r.text(); if (body.length > 10000) log.bundles[u.slice(0,220)] = body; } catch(_){}
  }
});
page.on('pageerror', e => log.errors.push(String(e).slice(0,200)));

// fulfill 3rd-party telemetry/API locally, let page assets through
await page.route('**/*', async route => {
  const u = route.request().url();
  // signifyd/px/human/api endpoints -> local
  if (/signifyd|px-captcha|px-api|collector|_px|human\.secur|api\.human|botmanager|\.px\b|telemetry|metrics/.test(u)) {
    await route.fulfill({ status:200, contentType:'application/json', body:'{}' });
  } else await route.continue();
});

await page.goto('https://www.bootbarn.com/', { waitUntil:'load', timeout:60000 }).catch(()=>{});
await page.waitForTimeout(15000);

// inspect HUMAN/PX globals + cookies
const state = await page.evaluate(() => {
  const out = { pxGlobals: [], hcGlobals: [], signifyd: !!window.signifyd, cookies: document.cookie.slice(0,300) };
  for (const k of Object.keys(window)) {
    if (/px|perimeter|human|HCaptcha|_px/i.test(k)) out.pxGlobals.push(k);
  }
  return out;
}).catch(e=>({err:String(e).slice(0,200)}));

console.log('requests:', log.requests.length, '| bundles:', Object.keys(log.bundles).length);
console.log('\n=== interesting requests ===');
const hosts = {};
for (const r of log.requests) {
  try { const h = new URL(r.url).host; hosts[h] = (hosts[h]||0)+1; } catch(_){}
}
for (const [h,n] of Object.entries(hosts).sort((a,b)=>b[1]-a[1])) console.log(`  ${h}: ${n}`);
console.log('\n=== HUMAN/PX globals ===');
console.log(state.pxGlobals);
console.log('cookies:', state.cookies);
console.log('\nerrors:', log.errors.slice(0,3));
writeFileSync('/tmp/opencode/bb/probe1.json', JSON.stringify({state, requests:log.requests.slice(0,80)},null,2));
await b.close();
