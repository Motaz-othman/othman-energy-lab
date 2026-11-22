// Notify Bing (and other IndexNow engines) that the site's pages changed. Run after a deploy is live:
//   node tools/indexnow.js
// The key file /fcad3e016de44354a69e880addb84ef2.txt at the site root proves ownership.
const https=require('https'), fs=require('fs'), path=require('path');
const KEY='fcad3e016de44354a69e880addb84ef2', HOST='www.oenergylab.com';
const urls=[...fs.readFileSync(path.join(__dirname,'..','sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const body=JSON.stringify({host:HOST,key:KEY,keyLocation:`https://${HOST}/${KEY}.txt`,urlList:urls});
const req=https.request({hostname:'api.indexnow.org',path:'/indexnow',method:'POST',headers:{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body)}},
  res=>{ console.log('IndexNow:',res.statusCode,urls.length,'URLs'); res.resume(); });
req.on('error',e=>console.error('IndexNow failed:',e.message)); req.end(body);
