// ---------- synthetic hourly year from monthly normals ----------
function rng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function gauss(r){ let u=0,v=0; while(u===0)u=r(); while(v===0)v=r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
const MDAYS=[31,28,31,30,31,30,31,31,30,31,30,31];
function interpMonthly(arr,doy){
  let c=0; const cent=MDAYS.map(d=>{const x=c+d/2; c+=d; return x;});
  let i=0; while(i<12 && doy>=cent[i]) i++;
  const i1=(i-1+12)%12, i2=i%12; let x1=cent[i1], x2=cent[i2];
  if(i===0) x1-=365; if(i===12) x2+=365;
  return arr[i1]+(arr[i2]-arr[i1])*(doy-x1)/(x2-x1);
}
function synthYear(c){
  const r=rng(12345+c.id.length*977), T=[], Td=[], mon=[];
  const tdM=c.hi.map((h,i)=>dewFromRH((h+c.lo[i])/2,c.rh[i]));
  let a=0,b=0;
  for(let d=0;d<365;d++){
    a=0.7*a+c.sig*0.714*gauss(r); b=0.6*b+0.96*gauss(r);
    const hi=interpMonthly(c.hi,d)+a, lo=interpMonthly(c.lo,d)+a*0.8, td=interpMonthly(tdM,d)+b;
    let m=0,acc=0; while(d>=acc+MDAYS[m]){acc+=MDAYS[m];m++;}
    for(let h=0;h<24;h++){
      let s; if(h>=5&&h<=15) s=-Math.cos(Math.PI*(h-5)/10); else { const x=(h<5?h+24:h)-15; s=Math.cos(Math.PI*x/14); }
      const t=(hi+lo)/2+(hi-lo)/2*s; T.push(t); Td.push(Math.min(td,t-0.3)); mon.push(m);
    }
  }
  const P=pAtm(c.elev);
  return {name:c.name, T, Twb:T.map((t,i)=>wetBulb(t,Td[i],P)), mon, synthetic:true};
}

// ---------- weather files ----------
function parseEPW(text){
  const lines=text.split(/\r?\n/), loc=lines[0].split(',');
  const name=[loc[1],loc[3]].filter(Boolean).join(', ')+(loc[5]?` (WMO ${loc[5]})`:'');
  const elev=parseFloat(loc[9]); const T=[],Twb=[],mon=[];
  for(let i=8;i<lines.length;i++){
    const f=lines[i].split(','); if(f.length<10) continue;
    const m=+f[1]-1, db=+f[6], dp=+f[7]; let P=+f[9]; if(!(P>50000&&P<120000)) P=pAtm(isNaN(elev)?0:elev);
    if(isNaN(db)||db>70||db<-70) continue;
    T.push(db); Twb.push(wetBulb(db,(isNaN(dp)||dp>70)?db-10:dp,P)); mon.push(m);
  }
  if(T.length<8000) throw new Error(`Only ${T.length} hourly rows found; expected 8,760.`);
  return {name,T,Twb,mon,synthetic:false};
}
function parseCSV(text){
  const rows=text.trim().split(/\r?\n/).map(l=>l.split(/[,;\t]/)), head=rows[0].map(h=>h.toLowerCase());
  const find=re=>head.findIndex(h=>re.test(h));
  let iT=find(/dry|db/); if(iT<0) iT=head.findIndex(h=>/temp/.test(h)&&!/dew|wet|wb/.test(h));
  const iRH=find(/rh|humid/), iDP=find(/dew/), iWB=find(/wet|wb/), iM=find(/^month|^mon/), iP=find(/press/);
  if(iT<0) throw new Error('No dry-bulb column found (header containing "dry", "db" or "temp").');
  if(iRH<0&&iDP<0&&iWB<0) throw new Error('Need a relative humidity, dew point or wet-bulb column.');
  // optional station pressure, in Pa, hPa/mbar or kPa; sea level when absent
  const pres=r=>{ const v=iP>=0?+r[iP]:NaN; return !(v>0)?101325:v>20000?v:v>200?v*100:v*1000; };
  const T=[],Twb=[],mon=[];
  rows.slice(1).forEach((r,k)=>{ const t=+r[iT]; if(isNaN(t)) return; const P=pres(r);
    let wb; if(iWB>=0&&!isNaN(+r[iWB])) wb=+r[iWB]; else if(iDP>=0) wb=wetBulb(t,+r[iDP],P); else wb=wetBulb(t,dewFromRH(t,+r[iRH]),P);
    T.push(t); Twb.push(wb); mon.push(iM>=0?(+r[iM]-1):Math.min(11,Math.floor(k/730))); });
  if(T.length<8000) throw new Error(`Only ${T.length} rows found; expected 8,760.`);
  return {name:'Uploaded CSV',T,Twb,mon,synthetic:false};
}

// ---------- sample CSV in the upload format: one row per hour, Jan 1 00:00 to Dec 31 23:00 ----------
function rhFromWB(t,wb,P){   // % RH from dry-bulb, wet-bulb and pressure (inverse of wetBulb)
  const Ws=Wfrom(pws(wb),P), W=((2501-2.326*wb)*Ws-1.006*(t-wb))/(2501+1.86*t-4.186*wb), pw=W*P/(0.621945+W);
  return Math.max(1,Math.min(100,100*pw/pws(t)));
}
// y: a loaded weather year for city c (station data when available); defaults to the generated year
function sampleCSV(c,y){
  y=y||synthYear(c);
  const P=Math.round(pAtm(y.station&&y.station.elev!=null?y.station.elev:c.elev)), out=['Month,Day,Hour,DryBulb_C,RH_pct,Pressure_Pa'];
  let d=0,m=0,acc=0;
  y.T.forEach((t,h)=>{ const day=Math.floor(h/24); while(day>=acc+MDAYS[m]){acc+=MDAYS[m];m++;} d=day-acc+1;
    out.push(`${m+1},${d},${h%24},${t.toFixed(1)},${rhFromWB(t,y.Twb[h],P).toFixed(1)},${P}`); });
  return out.join('\r\n')+'\r\n';
}

// ---------- station weather for built-in cities: measured hourly year + ASHRAE design conditions ----------
// Each city has shared/data/weather/<id>.js (TMYx hourly dry-bulb / wet-bulb and ASHRAE 2025 Fundamentals values,
// from climate.onebuilding.org). It is loaded only when the city is picked; if it cannot load (e.g. in a
// standalone file), the caller falls back to synthYear().
const WX_BASE=(typeof document!=='undefined'&&document.currentScript&&/shared\/js\/weather\.js/.test(document.currentScript.src))
  ? document.currentScript.src.replace(/js\/weather\.js.*$/,'data/weather/') : null;
function decodeWx(s){ const b=atob(s), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return Array.from(new Int16Array(u.buffer),v=>v/10); }
function stationYear(c){
  return new Promise((ok,fail)=>{
    const take=()=>{ const r=(window.WX_DATA||{})[c.id]; if(!r) return false;
      const T=decodeWx(r.db), Twb=decodeWx(r.wb), mon=[]; let m=0,acc=0;
      for(let h=0;h<T.length;h++){ const d=Math.floor(h/24); while(d>=acc+MDAYS[m]){acc+=MDAYS[m];m++;} mon.push(m); }
      ok({name:c.name,T,Twb,mon,synthetic:false,station:r}); return true; };
    if(take()) return;
    if(!WX_BASE) return fail(new Error('station data not available'));
    const s=document.createElement('script'); s.src=WX_BASE+c.id+'.js';
    s.onload=()=>{ if(!take()) fail(new Error('no station data for '+c.id)); };
    s.onerror=()=>fail(new Error('station data failed to load'));
    document.head.appendChild(s);
  });
}
