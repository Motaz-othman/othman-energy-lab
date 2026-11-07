// ---------- Peak Shaving Tank: sizing model ----------
// Uses the shared hourly plant model (shared/js/cooling-model.js: OPTIONS, hourModel), shared/js/tank.js and the station weather.
const TES_P={nCh:4,copA:2.985,copW:6.286,copMax:14,acMax:60,wcMax:50,aDC:6,aCT:4,aHX:1.5,eAD:.85,swAD:24,coc:4,pump:.015,cwp:.012,fanT:0,cduP:0};
const DAY0=7, NIGHT0=19;   // full IT load 07:00–19:00; the 12-hour night 19:00–07:00 runs at the night IT load

// chiller capacity factor vs its rating point: air-cooled falls with ambient dry-bulb (rated at 35 °C),
// water-cooled with entering condenser water (rated at 29.4 °C); k = fraction lost per K
function capFactor(hm,db,k){ return Math.max(0.3, hm.kind==='wc' ? 1-k.w*((hm.Tc-7.6)-29.4) : 1-k.a*(db-35)); }

// one hour of the plant: chiller capacity available, and the electrical power for a cooling load
function plantAt(o,L,db,wb,capRated,k){
  const hm0=hourModel(o,{...L,Qd:1},db,wb,TES_P), cap=capRated*capFactor(hm0,db,k);
  const hm=hourModel(o,{...L,Qd:cap},db,wb,TES_P);
  return {hm,cap,ff:hm.ff,power:q=>hm.calc(Math.max(0,q)).P};
}
// rated chiller capacity needed to carry the full load q at design condition (db, wb)
function capRatedFor(o,L,q,db,wb,k){ const hm=hourModel(o,{...L,Qd:1},db,wb,TES_P); return q*(1-hm.ff)/capFactor(hm,db,k); }

// hottest-day profile from the ASHRAE extremes and the site's typical hot-day range; 15:00 peak, 05:00 low
function hotDay(A,DR){
  return Array.from({length:24},(_,h)=>{
    let s; if(h>=5&&h<=15) s=-Math.cos(Math.PI*(h-5)/10); else { const x=(h<5?h+24:h)-15; s=Math.cos(Math.PI*x/14); }
    const f=(1-s)/2; return {db:A.extDB-DR*f, wb:A.extWB-DR*0.35*f};
  });
}
// typical daily range on hot days: mean max-min of the 10 hottest days in the weather year
function hotDayRange(wx){
  const days=[]; for(let d=0;d<wx.T.length/24;d++){ const t=wx.T.slice(d*24,d*24+24); days.push({mx:Math.max(...t),mn:Math.min(...t)}); }
  days.sort((a,b)=>b.mx-a.mx); const top=days.slice(0,10); return top.reduce((s,d)=>s+d.mx-d.mn,0)/top.length;
}
// ASHRAE values for the station, or equivalents from the weather file
function designBasis(wx){
  const A=wx.station&&wx.station.ashrae;
  if(A) return {...A,src:'ASHRAE'};
  const pct=(a,q)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(q*s.length))];};
  return {extDB:Math.max(...wx.T),extWB:Math.max(...wx.Twb),db04:pct(wx.T,.996),wb04:pct(wx.Twb,.996),src:'weather file'};
}

// run hours through a plant with an optional tank of Etank kWh. loadAt(h) = cooling load kW
// pCap (kW, optional): the plant never draws more electrical power than this; the tank covers the rest
function runPlant(o,L,hours,capRated,k,Etank,loadAt,pCap){
  let soc=Etank, drawMax=0; const prof=[];
  hours.forEach((w,h)=>{
    const q=loadAt(h), pl=plantAt(o,L,w.db,w.wb,capRated,k), need=q*(1-pl.ff);
    let qPlant=q, dis=0, chg=0;
    if(need>pl.cap+1e-6){ dis=need-pl.cap; qPlant=q-dis; }
    if(pCap){ for(let n=0;n<4&&pl.power(qPlant)>pCap*1.0005;n++) qPlant*=pCap/pl.power(qPlant); dis=q-qPlant; }   // hold the power cap
    if(dis>1e-6) soc-=dis;
    else if(Etank>0&&soc<Etank){ const room=pl.ff>=1?pl.cap:pl.cap/(1-pl.ff)-q; chg=Math.max(0,Math.min(Etank-soc,room));
      if(pCap){ for(let n=0;n<4&&chg>0&&pl.power(q+chg)>pCap*1.0005;n++) chg=Math.max(0,(q+chg)*pCap/pl.power(q+chg)-q); }
      qPlant=q+chg; soc+=chg; }
    drawMax=Math.max(drawMax,Etank-soc);
    prof.push({P:pl.power(qPlant),dis,chg,soc});
  });
  return {prof,drawMax,peak:Math.max(...prof.map(x=>x.P))};
}

// size the tank for one design temperature Td: a heatwave of N hottest days, full IT load by day,
// the night IT load for the 12-hour night; the tank must be full again before the next morning
function studyCase(o,L,i,base,DR,Td,k,yr){
  const TdWb=base.extDB>base.db04 ? base.extWB-(base.extDB-Td)*(base.extWB-base.wb04)/(base.extDB-base.db04) : base.extWB;
  const cap0=capRatedFor(o,L,i.Q,base.extDB,base.extWB,k);           // plant sized for the extreme (no tank)
  const capT=capRatedFor(o,L,i.Q,Td,Math.min(TdWb,Td),k);              // plant sized for the design temperature
  const pCap=plantAt(o,L,Td,Math.min(TdWb,Td),capT,k).power(i.Q);       // electrical limit = full load at the design temperature
  const day=hotDay(base,DR), hw=[]; for(let d=0;d<i.days;d++) hw.push(...day); hw.push(...day.slice(0,DAY0));   // + the last night
  const load=h=>{ const t=h%24; return t>=DAY0&&t<NIGHT0?i.Q:i.Q*i.night; };
  const E=runPlant(o,L,hw,capT,k,1e12,load,pCap).drawMax;              // energy the tank must hold
  const r=runPlant(o,L,hw,capT,k,E,load,pCap);
  // recharge: hours from the end of each afternoon's discharge until the tank is full again (must be before 07:00)
  let rechH=0, ok=true;
  for(let d=0;d<i.days;d++){
    const lastDis=r.prof.slice(d*24,(d+1)*24).reduce((m,x,j)=>x.dis>1e-6?d*24+j:m,-1); if(lastDis<0) continue;
    let full=-1; for(let h=lastDis+1;h<r.prof.length;h++){ if(r.prof[h].soc>=E-1e-3){full=h;break;} }
    if(full<0||full>d*24+24+DAY0){ ok=false; rechH=Infinity; } else rechH=Math.max(rechH,full-lastDis);
  }
  const safe=ok&&rechH<=i.rechMax;                                     // recharges within the safe time
  const V=E>0?tankVolume(E,i.Tr-i.Ts,i.eff)*(1+i.margin)/(1-i.reserve):0;
  const orig=runPlant(o,L,hw,cap0,k,0,load);                           // original plant on the same days, for the graph
  // hours a year the plant would exceed its new limit at full IT load (when the tank would work)
  let above=0; for(let h=0;h<yr.length;h++){ const pl=plantAt(o,L,yr[h].db,yr[h].wb,capT,k); if(i.Q*(1-pl.ff)>pl.cap||pl.power(i.Q)>pCap*1.0005) above++; }
  const Prated0=orig.peak, Prated=Math.max(r.peak,pCap);
  return {Td,TdWb,E,V,...tankShape(Math.max(V,1),i.Hmax),cap0,capT,Prated0,Prated,cut:Math.max(0,Prated0-Prated),above,rechH,ok,safe,
    graph:{orig:orig.prof.slice(6,30),tank:r.prof.slice(6,30),E}};
}

// study every design temperature from the extreme down to 3 K below the ASHRAE 0.4% level, then recommend:
// the lowest design temperature that still recharges within the safe time, raised by the safety margin,
// and never below the ASHRAE 0.4% design dry-bulb
function peakStudy(i,wx,k){
  const o=OPTIONS.find(x=>x.id===i.sys), L={name:'CHW',Ts:i.Ts,Tr:i.Tr}, base=designBasis(wx), DR=hotDayRange(wx);
  const lo=Math.max(base.db04-3,base.extDB-8), cases=[], yr=wx.T.map((t,h)=>({db:t,wb:wx.Twb[h]}));
  for(let Td=Math.round((base.extDB-0.5)*2)/2; Td>=lo-1e-9; Td-=0.5) cases.push(studyCase(o,L,i,base,DR,Td,k,yr));
  let low=null; for(const c of cases){ if(c.safe&&c.E>0) low=c; else if(low) break; }   // cases run from hot to cool
  const recTd=low?Math.min(cases[0].Td,Math.ceil(Math.max(low.Td+i.safety,base.db04)*2)/2):cases[0].Td;
  const st={base,DR,cases,sys:o,low,recTd};
  st.at=Td=>cases.find(c=>Math.abs(c.Td-Td)<1e-9)||studyCase(o,L,i,base,DR,Td,k,yr);   // any design temperature the user enters
  return st;
}
