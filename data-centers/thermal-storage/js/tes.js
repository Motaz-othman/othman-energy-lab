// ---------- Thermal Storage Tank: sizing models ----------
// Uses the shared hourly plant model (shared/js/cooling-model.js: OPTIONS, hourModel) and the station weather.
const RHO_CP=4180;   // water, kJ per m³ per K

// m³ of chilled water to store E kWh of cooling at a supply/return difference dT, with stratification efficiency eff
const tankVolume=(E,dT,eff)=>E*3600/(RHO_CP*dT*eff);
// vertical stratified tank: height up to Hmax, keeping height / diameter between 1 and 4
function tankShape(V,Hmax){
  let D=Math.pow(V/Math.PI,1/3), H=4*D;                 // tallest useful shape (H = 4 D)
  if(H>Hmax){ H=Hmax; D=Math.sqrt(4*V/(Math.PI*H)); }    // limited by the allowed height
  return {D,H,area:Math.PI*D*D/4};
}

// ---------- card 1: emergency ride-through ----------
function emergencyTank(i){
  const dT=Math.max(1,i.Tr-i.Ts), E=i.Q*i.min/60, Vnet=tankVolume(E,dT,i.eff), V=Vnet*(1+i.margin);
  return {dT,E,Vnet,V,...tankShape(V,i.Hmax),cost:V*i.costV};
}

// ---------- card 2: grid power saving (peak shaving) ----------
const TES_P={nCh:4,copA:2.985,copW:6.286,copMax:14,acMax:60,wcMax:50,aDC:6,aCT:4,aHX:1.5,eAD:.85,swAD:24,coc:4,pump:.015,cwp:.012,fanT:0,cduP:0};

// chiller capacity factor vs its rating point: air-cooled falls with ambient dry-bulb (rated at 35 °C),
// water-cooled with entering condenser water (rated at 29.4 °C); k = fraction lost per K
function capFactor(hm,db,k){ return Math.max(0.3, hm.kind==='wc' ? 1-k.w*((hm.Tc-7.6)-29.4) : 1-k.a*(db-35)); }

// one hour of the plant: chiller capacity available, chiller cooling needed, and the electrical power
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

// is the hour inside the electricity peak period?
const inPeak=(h,i)=>{ const t=h%24; return i.pk0<=i.pk1 ? t>=i.pk0&&t<i.pk1 : t>=i.pk0||t<i.pk1; };

// run hours through a plant with an optional tank. loadAt(h) = cooling load kW; returns profile and totals
// pCap (kW, optional): the plant never draws more electrical power than this; the tank covers the rest
function runPlant(o,L,hours,capRated,k,Etank,i,loadAt,chargeOK,pCap){
  let soc=Etank, minSoc=Etank, drawMax=0, dischargeH=0, cost=0, energy=0; const prof=[];
  hours.forEach((w,h)=>{
    const q=loadAt(h), pl=plantAt(o,L,w.db,w.wb,capRated,k), need=q*(1-pl.ff);
    let qPlant=q, dis=0, chg=0;
    if(need>pl.cap+1e-6){ dis=need-pl.cap; qPlant=q-dis; }
    if(pCap){ for(let n=0;n<4&&pl.power(qPlant)>pCap*1.0005;n++) qPlant*=pCap/pl.power(qPlant); dis=q-qPlant; }   // hold the power cap
    if(dis>1e-6){ soc-=dis; dischargeH++; }
    else if(Etank>0&&soc<Etank&&chargeOK){ const room=pl.ff>=1?pl.cap:pl.cap/(1-pl.ff)-q; chg=Math.max(0,Math.min(Etank-soc,room));
      if(pCap){ for(let n=0;n<4&&chg>0&&pl.power(q+chg)>pCap*1.0005;n++) chg=Math.max(0,(q+chg)*pCap/pl.power(q+chg)-q); }
      qPlant=q+chg; soc+=chg; }
    const P=pl.power(qPlant), price=i.pPeak!=null&&inPeak(h,i)?i.pPeak:i.pBase;
    cost+=P*price; energy+=P; minSoc=Math.min(minSoc,soc); drawMax=Math.max(drawMax,Etank-soc);
    prof.push({P,dis,chg,soc,need,cap:pl.cap,db:w.db});
  });
  return {prof,minSoc,drawMax,dischargeH,cost,energy,peak:Math.max(...prof.map(x=>x.P))};
}

// size the tank for one design temperature: heatwave of N hot days at full load by day, night load for recharge
function studyCase(o,L,i,wx,base,DR,Td,k,yr,yrOrig){
  const TdWb=base.extDB>base.db04 ? base.extWB-(base.extDB-Td)*(base.extWB-base.wb04)/(base.extDB-base.db04) : base.extWB;
  const cap0=capRatedFor(o,L,i.Q,base.extDB,base.extWB,k);           // plant sized for the extreme (no tank)
  const capT=capRatedFor(o,L,i.Q,Td,Math.min(TdWb,Td),k);              // plant sized for the design temperature
  const pCap=plantAt(o,L,Td,Math.min(TdWb,Td),capT,k).power(i.Q);       // electrical limit = full load at the design temperature
  const day=hotDay(base,DR), hw=[]; for(let d=0;d<i.days;d++) hw.push(...day);
  const dayLoad=(f)=>h=>{ const t=h%24; return t>=7&&t<19?i.Q:i.Q*f; };
  // drawdown with an unlimited tank tells the energy the tank must hold
  const probe=runPlant(o,L,hw,capT,k,1e12,i,dayLoad(i.night),true,pCap);
  const E=probe.drawMax;
  // recharge: back to full before each next hot afternoon, within the allowed share of the night
  const rech=f=>{ const r=runPlant(o,L,hw,capT,k,E,i,dayLoad(f),true,pCap); let ok=true;
    for(let d=0;d<i.days;d++){ const startNext=d*24+7+24, lastDis=r.prof.slice(d*24,(d+1)*24).reduce((m,x,j)=>x.dis>0?d*24+j:m,-1);
      if(lastDis<0) continue; let full=-1; for(let h=lastDis+1;h<Math.min(r.prof.length,startNext);h++){ if(r.prof[h].soc>=E-1e-3){full=h;break;} }
      if(full<0 || (d<i.days-1&&(full-lastDis)>(startNext-lastDis)*i.window)) ok=false; }
    return {ok,r}; };
  const normal=rech(i.night), worst=rech(1);
  const V=E>0?tankVolume(E,i.Tr-i.Ts,i.eff)*(1+i.margin)/(1-i.reserve):0;
  // original plant on the same hot days (no tank), for the cutting graph and the rated power
  const orig=runPlant(o,L,hw,cap0,k,0,i,dayLoad(i.night),false);
  // a typical year at the average load: energy cost with and without the tank, and how often the tank works
  const yrTank=runPlant(o,L,yr,capT,k,E,i,()=>i.Q*i.lf,true,pCap);
  // hours a year the plant would exceed its new limit at full IT load (when the tank would work)
  let above=0; for(let h=0;h<yr.length;h++){ const pl=plantAt(o,L,yr[h].db,yr[h].wb,capT,k); if(i.Q*(1-pl.ff)>pl.cap||pl.power(i.Q)>pCap*1.0005) above++; }
  const Prated0=Math.max(orig.peak,yrOrig.peak), Prated=Math.max(normal.r.peak,yrTank.peak,pCap);
  const cut=Math.max(0,Prated0-Prated), tankCost=V*i.costV;
  const annual=cut*i.tD*12+(yrOrig.cost-yrTank.cost);
  const infra=cut*i.infraKW+Math.max(0,cap0-capT)*i.chKW;
  const pay=(net)=>net<=0?0:(annual>0?net/annual:Infinity);
  return {Td,TdWb,E,V,...tankShape(Math.max(V,1),i.Hmax),cap0,capT,Prated0,Prated,cut,above,
    normalOK:normal.ok,worstOK:worst.ok,tankCost,annual,infra,demand:cut*i.tD*12,energySave:yrOrig.cost-yrTank.cost,
    payU:pay(tankCost),payI:pay(tankCost-infra),upfront:infra-tankCost,
    netU:annual*i.life-tankCost, netI:annual*i.life+infra-tankCost,   // net saving over the plant life (no discounting)
    graph:{orig:orig.prof.slice(6,30),tank:normal.r.prof.slice(6,30),E}};
}

// study every design temperature from the extreme down; recommend the best case that passes the checks
function peakStudy(i,wx,k){
  const o=OPTIONS.find(x=>x.id===i.sys), L={name:'CHW',Ts:i.Ts,Tr:i.Tr}, base=designBasis(wx), DR=hotDayRange(wx);
  const lo=Math.max(base.db04-3,base.extDB-8), cases=[];
  // a typical year at the average load without a tank: the baseline for energy cost (same for every case)
  const cap0=capRatedFor(o,L,i.Q,base.extDB,base.extWB,k), yr=wx.T.map((t,h)=>({db:t,wb:wx.Twb[h]}));
  const yrOrig=runPlant(o,L,yr,cap0,k,0,i,()=>i.Q*i.lf,false);
  for(let Td=Math.round((base.extDB-0.5)*2)/2; Td>=lo-1e-9; Td-=0.5) cases.push(studyCase(o,L,i,wx,base,DR,Td,k,yr,yrOrig));
  return {base,DR,cases,sys:o};
}

// pick the case to show: a chosen design temperature, else the balanced size = the case that passes the
// recharge check with the best net saving over the plant life (mode "utility" or "infra")
function pickCase(st,mode,Td){
  const {cases,base}=st, pass=cases.filter(c=>c.normalOK&&c.E>0), net=c=>mode==='infra'?c.netI:c.netU;
  if(Td!=null) return {rec:cases.reduce((a,c)=>Math.abs(c.Td-Td)<Math.abs(a.Td-Td)?c:a,cases[0]),why:'chosen'};
  if(pass.some(c=>net(c)>0)) return {rec:pass.filter(c=>net(c)>0).reduce((a,c)=>net(c)>net(a)?c:a),why:'best'};
  if(pass.length) return {rec:pass.reduce((a,c)=>Math.abs(c.Td-base.db04)<Math.abs(a.Td-base.db04)?c:a),why:'nopay'};
  return {rec:cases[0],why:'norecharge'};
}
