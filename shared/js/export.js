// ---------- Excel export: a minimal .xlsx writer (no library), one worksheet per table ----------
// sheets: [{name, rows:[[cell,...],...], head:[row indexes in bold], widths:[chars per column]}]
// A cell is a number, a string, or {v, b:true} for bold. Strings that read as plain numbers ("1,234.5") are stored as numbers.
const XL_NUM=/^-?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/;
const xlEsc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
function xlCol(i){ let s=''; i++; while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; }
function xlSheet(sh){
  const bold=new Set(sh.head||[]);
  const rows=sh.rows.map((row,r)=>`<row r="${r+1}">${row.map((c,k)=>{
    if(c==null||c==='') return '';
    const o=typeof c==='object'?c:{v:c}, ref=xlCol(k)+(r+1), st=(o.b||bold.has(r))?' s="1"':'';
    let v=o.v; if(typeof v==='string'&&XL_NUM.test(v.trim())) v=parseFloat(v.replace(/,/g,''));
    return typeof v==='number'&&isFinite(v) ? `<c r="${ref}"${st}><v>${v}</v></c>`
      : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xlEsc(v)}</t></is></c>`; }).join('')}</row>`).join('');
  const n=Math.max(1,...sh.rows.map(r=>r.length));
  const w=Array.from({length:n},(_,k)=>(sh.widths&&sh.widths[k])||Math.min(60,Math.max(8,...sh.rows.map(r=>r[k]==null?0:String(typeof r[k]==='object'?r[k].v:r[k]).length+2))));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${w.map((x,k)=>`<col min="${k+1}" max="${k+1}" width="${x}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData></worksheet>`;
}
// stored (uncompressed) zip
const XL_CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function xlCrc(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=XL_CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function xlZip(files){
  const enc=new TextEncoder(), parts=[], cen=[]; let off=0;
  const u16=v=>[v&255,(v>>>8)&255], u32=v=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
  for(const [name,text] of files){
    const nm=enc.encode(name), d=enc.encode(text), crc=xlCrc(d);
    const common=[...u16(20),...u16(0),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nm.length)];
    const loc=new Uint8Array([...u32(0x04034b50),...common,...u16(0)]);
    parts.push(loc,nm,d);
    cen.push(new Uint8Array([...u32(0x02014b50),...u16(20),...common,...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
    off+=loc.length+nm.length+d.length;
  }
  const cs=cen.reduce((s,a)=>s+a.length,0);
  return new Blob([...parts,...cen,new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cs),...u32(off),...u16(0)])],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function xlsxBlob(sheets){
  const names=[]; sheets.forEach((s,i)=>{ let n=String(s.name).replace(/[\[\]:*?\/\\]/g,' ').slice(0,31)||'Sheet'+(i+1); while(names.includes(n)) n=n.slice(0,28)+' '+(i+1); names.push(n); });
  const NS='http://schemas.openxmlformats.org', X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files=[
    ['[Content_Types].xml',`${X}<Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels',`${X}<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml',`${X}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets>${names.map((n,i)=>`<sheet name="${xlEsc(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',`${X}<Relationships xmlns="${NS}/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',`${X}<styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`],
    ...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,xlSheet(s)])];
  return xlZip(files);
}
// rows of a rendered HTML table: header + body, cell text without tags/badges (they go in their own column if asked)
function tableRows(el){
  const t=el&&(el.tagName==='TABLE'?el:el.querySelector('table')); if(!t) return [];
  return [...t.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>{ const c=td.cloneNode(true); c.querySelectorAll('.sbar').forEach(x=>x.remove()); c.querySelectorAll('.tag').forEach(x=>{ const own=c.textContent.replace(x.textContent,'').trim(); x.textContent=own?` (${x.textContent})`:x.textContent; }); return c.textContent.replace(/\s+/g,' ').trim(); }));
}
// label / value of every input in a form panel (blank = "auto"), for the report's inputs list
function inputRows(root,names={}){
  return [...root.querySelectorAll('input,select')].filter(e=>e.type!=='file'&&e.type!=='button'&&!e.closest('[hidden]')).map(e=>{
    const lab=(root.querySelector(`label[for="${e.id}"]`)||{}).textContent||e.getAttribute('aria-label')||e.id;
    const v=e.tagName==='SELECT'?(e.selectedOptions[0]||{}).textContent:(e.value===''?'auto':e.value);
    return [names[e.id]||lab.replace(/\s+/g,' ').trim(),v]; });
}
function downloadBlob(blob,name){ const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
