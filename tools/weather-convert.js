// Convert TMYx weather packages (EPW + STAT from climate.onebuilding.org) into the site's per-city data files.
// 1. Download each city's *_TMYx.2011-2025.zip and unzip it into <download folder>/<city id>/ (the id used in shared/js/cities.js).
// 2. Run: node tools/weather-convert.js <download folder> .
// Writes shared/data/weather/<city id>.js with hourly dry-bulb / wet-bulb and the ASHRAE design conditions.
const fs=require('fs'), path=require('path'), vm=require('vm');
const [SRC,ROOT]=process.argv.slice(2);
const OUT=path.join(ROOT,'shared','data','weather'); fs.mkdirSync(OUT,{recursive:true});
// reuse the site's own EPW parser and psychrometrics, so wet-bulb is computed exactly as on upload
const ctx={Math,console}; vm.createContext(ctx);
vm.runInContext(['shared/js/psychro.js','shared/js/weather.js'].map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n')+'\nthis.parseEPW=parseEPW;',ctx);
const b64=a=>Buffer.from(Int16Array.from(a,v=>Math.round(v*10)).buffer).toString('base64');
const num=s=>{const v=parseFloat(s);return isNaN(v)?null:v;};
const summary=[];
for(const id of fs.readdirSync(SRC).filter(d=>fs.statSync(path.join(SRC,d)).isDirectory()).sort()){
  const dir=path.join(SRC,id), epwF=fs.readdirSync(dir).find(f=>f.endsWith('.epw')), statF=fs.readdirSync(dir).find(f=>f.endsWith('.stat'));
  const epw=fs.readFileSync(path.join(dir,epwF),'latin1'), stat=fs.readFileSync(path.join(dir,statF),'latin1');
  const loc=epw.split(/\r?\n/)[0].split(',');
  const w=ctx.parseEPW(epw);
  if(w.T.length!==8760) throw new Error(id+': '+w.T.length+' hours');
  // ASHRAE rows from the stat file (2025 Handbook of Fundamentals, Ch. 14)
  const row=name=>{const l=stat.split(/\r?\n/).find(x=>x.trim().split(/\t/)[0]===name); if(!l) throw new Error(id+': no '+name+' row'); return l.trim().split(/\t+/).slice(1).map(num);};
  const cool=row('Cooling'), ext=row('Extremes');
  // Cooling: hottest month, daily range, 0.4% DB, MCWB, 1% DB, MCWB, 2% DB, MCWB, 0.4% evap WB, MCDB, ...
  // Extremes: WS 1%, 2.5%, 5%, extreme annual DB min, max, extreme annual WB min, max
  const ashrae={db04:cool[2],mcwb04:cool[3],wb04:cool[8],mcdb04:cool[9],extDB:ext[4],extWB:ext[6]};
  if(Object.values(ashrae).some(v=>v==null)) throw new Error(id+': missing ASHRAE value '+JSON.stringify(ashrae));
  const zone=(stat.match(/Climate Zone "([^"]+)"/)||[])[1]||'';
  const period=(epwF.match(/TMYx\.(\d{4})-(\d{4})/)||[]).slice(1).join('–');
  const station=loc[1].replace(/\./g,' ').replace(/-/g,' – ').replace(/\s+/g,' ').trim();
  // faulty humidity readings: limit hourly wet-bulb to the ASHRAE extreme annual wet-bulb + 1 K
  const wbMax=ashrae.extWB+1; let capped=0; const wb=w.Twb.map(v=>{ if(v>wbMax){capped++; return wbMax;} return v; });
  const rec={station, wmo:loc[5], period, elev:num(loc[9]), zone, ashrae, wbCap:wbMax, wbCapped:capped, file:epwF, db:b64(w.T), wb:b64(wb)};
  fs.writeFileSync(path.join(OUT,id+'.js'),
    `// ${station} (WMO ${loc[5]}) · TMYx ${period} hourly weather · ASHRAE 2025 Fundamentals design conditions\n`+
    `// Source: climate.onebuilding.org, ${epwF}. Hourly dry-bulb and wet-bulb in 0.1 °C steps (Int16, base64).\n`+
    `(window.WX_DATA=window.WX_DATA||{})[${JSON.stringify(id)}]=${JSON.stringify(rec)};\n`);
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  summary.push(`${String(capped).padStart(3)} capped  ${id.padEnd(10)} ${station.slice(0,34).padEnd(34)} zone ${zone.padEnd(3)} meanDB ${mean(w.T).toFixed(1).padStart(5)} maxDB ${Math.max(...w.T).toFixed(1).padStart(5)} maxWB ${Math.max(...w.Twb).toFixed(1).padStart(5)} | ASHRAE 0.4% ${ashrae.db04}/${ashrae.mcwb04} evap ${ashrae.wb04} ext ${ashrae.extDB}/${ashrae.extWB}`);
}
console.log(summary.join('\n'));
console.log('files:',fs.readdirSync(OUT).length,'total KB:',Math.round(fs.readdirSync(OUT).reduce((s,f)=>s+fs.statSync(path.join(OUT,f)).size,0)/1024));
