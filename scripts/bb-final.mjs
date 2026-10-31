#!/usr/bin/env node
/** bb-final.mjs — final capture: page state (blocked?), all px hosts seen,
 *  cookies, screenshot. */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ headless:true });
const ctx = await b.newContext({ viewport:{width:1280,height:900} });
const page = await ctx.newPage();
const hosts = new Set();
const pxreqs = [];
page.on('request', req => {
  const u = req.url();
  try { const h = new URL(u).host; if (/px-/.test(h)) { hosts.add(h); pxreqs.push([req.method(), h, u.split('?')[0].slice(-60)]); } } catch(_){}
});
await page.goto('https://www.bootbarn.com/', { waitUntil:'load', timeout:60000 }).catch(()=>{});
await page.waitForTimeout(12000);
const state = await page.evaluate(() => ({
  title: document.title,
  h1: document.querySelector('h1, .title, [class*="denied"]')?.innerText?.slice(0,80) || null,
  bodyStart: document.body?.innerText?.slice(0,200) || '',
  pxVid: window._pxVid, pxUuid: window._pxUuid, pxApp: window._pxAppId,
  cookies: document.cookie.split(';').map(c=>c.trim().split('=')[0]).filter(c=>/px|_px/i.test(c)),
})).catch(e=>({err:String(e).slice(0,150)}));
console.log('px hosts:', [...hosts]);
console.log('\npage:', JSON.stringify(state).slice(0,600));
console.log('\npx requests:');
for (const r of pxreqs.slice(0,20)) console.log(' ', r[0], r[1], r[2]);
await page.screenshot({ path:'/tmp/opencode/bb/bb-blocked.png' });
console.log('\nscreenshot saved');
writeFileSync('/tmp/opencode/bb/final.json', JSON.stringify({state, hosts:[...hosts], pxreqs},null,2));
await b.close();
