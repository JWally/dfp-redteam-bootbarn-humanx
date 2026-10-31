#!/usr/bin/env node
/** bb-px-boundary.mjs — hook JSON.stringify + fetch/XHR in the real page to
 *  capture the PX collector payload BEFORE encoding (the plaintext JSON). */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ headless:true });
const ctx = await b.newContext({ viewport:{width:1280,height:900} });
const page = await ctx.newPage();
const caps = [];
await page.addInitScript(() => {
  self.__caps=[];
  const oj=JSON.stringify;
  window.JSON.stringify=function(v,...a){ let s; try{s=oj.call(this,v,...a);}catch(e){return oj.apply(this,arguments);} if(typeof s==='string'&&s.length>50&&self.__caps.length<200) self.__caps.push(['json',s.length,s.slice(0,2000)]); return s; };
  const ob=window.btoa; window.btoa=function(s){ const r=ob.call(window,s); if(self.__caps.length<200 && /[^A-Za-z0-9+/=]/.test(String(s))) self.__caps.push(['btoa',String(s).slice(0,400)]); return r; };
  // XHR send capture for px
  const os=XHR.prototype.send; XHR.prototype.send=function(b){ const u=this.__pxurl; if(u&&/px-cloud/.test(u)){ self.__caps.push(['xhr-send', u.slice(0,120), String(b).slice(0,500)]); } return os.apply(this,arguments); };
});
// capture px requests with their data
page.on('request', req=>{
  const u=req.url();
  if(/px-cloud|px-cdn/.test(u) && /POST/.test(req.method())){
    const pd=req.postData();
    if(pd) caps.push(['req', u.slice(0,130), pd.slice(0,600)]);
  }
});
await page.goto('https://www.bootbarn.com/', { waitUntil:'load', timeout:60000 }).catch(()=>{});
await page.waitForTimeout(12000);
const r = await page.evaluate(() => self.__caps || []).catch(()=>[]);
console.log('captures:', r.length);
// find big JSON.stringify near px
for (const c of r.slice(0,30)) {
  if (c[0]==='json' && /px|vid|uuid|risk|signals|behavior|fingerprint|collector/i.test(c[2])) {
    console.log('\n=== JSON (len', c[1]+') ===');
    console.log(c[2].slice(0,1200));
  }
}
console.log('\n=== xhr/req captures ===');
for (const c of caps.slice(0,5)) console.log(' ', JSON.stringify(c).slice(0,400));
writeFileSync('/tmp/opencode/bb/boundary.json', JSON.stringify({r,caps},null,2));
await b.close();
