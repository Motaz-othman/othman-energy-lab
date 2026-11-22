// Build each tool into one standalone HTML file: dist/<tool>.html
// Tools live at <focus-area>/<tool>/index.html, e.g. data-centers/cooling-plant/.
// Usage: node tools/build.js                 (all tools)
//        node tools/build.js cooling-plant
// Local stylesheets and scripts are inlined; Chart.js loads from the CDN.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), DIST=path.join(ROOT,'dist'), NOT_AREAS=['shared','dist','tools','node_modules'];
const CHART_CDN='<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>';

function build(rel){
  const name=path.basename(rel), dir=path.join(ROOT,rel), read=f=>fs.readFileSync(path.join(dir,f),'utf8').trimEnd();
  let h=read('index.html');
  h=h.replace(/<!-- Chart\.js[^\n]*-->\n/,'').replace(/<script>window\.Chart\|\|document\.write[^\n]*<\/script>\n/,'');
  // a standalone file has no project site around it: drop the site bar, breadcrumb, footer and site script
  h=h.replace(/^\s*<header class="sitebar"[^\n]*\n/m,'').replace(/^\s*<nav class="crumbs"[^\n]*\n/m,'')
     .replace(/^\s*<footer class="sitefoot"[^\n]*\n/m,'').replace(/<script src="[^"]*site\.js"><\/script>\n/,'')
     .replace(/<body class="([^"]*)">/,'<body class="$1" style="--navh:0px">')
     .replace(/^<link rel="(icon|apple-touch-icon)"[^\n]*\n/gm,'').replace(/^<meta property="og:image"[^\n]*\n/m,'');
  h=h.replace(/<link rel="stylesheet" href="([^"]+)">/g,(m,f)=>`<style>\n${read(f)}\n</style>`);
  h=h.replace(/<script src="[^"]*chart\.umd\.min\.js"><\/script>/,CHART_CDN);
  const tags=[...h.matchAll(/<script src="(?!https?:)([^"]+)"><\/script>\n?/g)];
  h=h.replace(tags.map(m=>m[0]).join(''),()=>`<script>\n${tags.map(m=>read(m[1])).join('\n')}\n</script>\n`);
  if(/<script src="(?!https?:)|<link rel="stylesheet" href=/.test(h)) throw new Error(`${name}: unresolved local file reference`);
  fs.mkdirSync(DIST,{recursive:true});
  fs.writeFileSync(path.join(DIST,name+'.html'),h);
  console.log(`dist/${name}.html  ${(h.length/1024).toFixed(1)} KB`);
}

// every <focus-area>/<tool>/ folder that has an index.html
const isDir=p=>fs.statSync(p).isDirectory();
const all=fs.readdirSync(ROOT).filter(a=>!a.startsWith('.')&&!NOT_AREAS.includes(a)&&isDir(path.join(ROOT,a)))
  .flatMap(a=>fs.readdirSync(path.join(ROOT,a)).filter(t=>isDir(path.join(ROOT,a,t))&&fs.existsSync(path.join(ROOT,a,t,'index.html'))).map(t=>a+'/'+t));
const dup=all.map(r=>path.basename(r)).find((n,i,a)=>a.indexOf(n)!==i);
if(dup) throw new Error(`two tools are named "${dup}"; tool folder names must be unique across focus areas`);
const want=process.argv[2], list=want?all.filter(r=>r===want||path.basename(r)===want):all;
if(!list.length) throw new Error(want?`no tool named "${want}"`:'no tools found');
list.forEach(build);

// sitemap.xml: every public page, last-modified = the latest commit touching the page (tools: their whole folder)
(function sitemap(){
  const {execSync}=require('child_process'), B='https://www.oenergylab.com/';
  const pages=[['',['index.html']],['about/',['about']],['contact/',['contact']],['data-centers/',['data-centers/index.html']],...all.map(r=>[r+'/',[r]])];
  const day=paths=>{ try{ return execSync(`git log -1 --format=%cs -- ${paths.join(' ')}`,{cwd:ROOT}).toString().trim(); }catch(e){ return ''; } };
  const today=new Date().toISOString().slice(0,10);
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
    pages.map(([u,p])=>`  <url><loc>${B}${u}</loc><lastmod>${day(p)||today}</lastmod></url>`).join('\n')+`\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT,'sitemap.xml'),xml);
  console.log(`sitemap.xml  ${pages.length} pages`);
})();
