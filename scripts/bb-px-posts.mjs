#!/usr/bin/env node
/** bb-px-posts.mjs — capture the REAL collector/device-verification POST
 *  bodies (read-only observation, no tampering). */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ headless:true });
const ctx = await b.newContext({ viewport:{width:1280,height:900} });
const page = await ctx.newPage();
const posts = [];
page.on('request', req => {
  const u = req.url();
  if (/collector|dvp\.px|fst-ec|ift\.px|\.px-cloud\.net/.test(u) && /POST|PUT/.test(req.method())) {
    const pd = req.postData();
    posts.push({ url: u.slice(0,150), method: req.method(), postData: pd ? pd.slice(0,3000) : '(no body)' });
  }
});
page.on('response', async r => {
  const u = r.url();
  if (/\.px-cloud\.net/.test(u) && /POST/.test(r.request().method())) {
    try { const t = await r.text(); posts.push({ url: u.slice(0,150)+' [RESP]', body: t.slice(0,1000) }); } catch(_){}
  }
});
await page.goto('https://www.bootbarn.com/', { waitUntil:'load', timeout:60000 }).catch(()=>{});
await page.waitForTimeout(12000);
console.log('posts:', posts.length);
for (const p of posts.slice(0,8)) {
  console.log('\n===', p.method||'RESP', p.url);
  if (p.postData) console.log('  POST:', p.postData.slice(0,600));
  if (p.body) console.log('  RESP:', p.body.slice(0,400));
}
writeFileSync('/tmp/opencode/bb/px-posts.json', JSON.stringify(posts,null,2));
await b.close();
