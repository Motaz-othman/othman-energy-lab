// ---------- shared cooling plant model (Cooling Plant Selector, Peak Shaving Tank) ----------
// Basis: "Cooling Plant Calculation Basis", Part A. ASHRAE 90.1-2025 Path B chillers, AHRI 551/591 rating points,
// ASHRAE 90.1-2025 heat-rejection approaches, pump and fan power from head equations, two coincident design cases.
const OPTIONS=[
 {id:'acc',  name:'Air-cooled chillers',                     short:'Air-cooled chillers',  water:false, comp:['acch']},
 {id:'accfc',name:'Air-cooled chillers + free-cooling dry coolers', short:'Chillers + dry coolers', water:false, comp:['acch','dc']},
 {id:'adia', name:'Water-cooled chillers + adiabatic coolers', short:'Chillers + adiabatic', water:true, comp:['wcch','adc','hx']},
 {id:'wcc',  name:'Water-cooled chillers + cooling towers',   short:'Chillers + towers',     water:true, comp:['wcch','ct','hx']},
 {id:'hyb',  name:'Water-cooled chillers + dry coolers + cooling towers (hybrid)', short:'Chillers + hybrid', water:true, comp:['wcch','dc','ct','hx']},
];
const RATES=[
 {id:'acch',l:'Air-cooled chillers',lo:180,hi:280},
 {id:'wcch',l:'Water-cooled chillers',lo:120,hi:200},
 {id:'dc',  l:'Dry coolers',lo:60,hi:110},
 {id:'adc', l:'Adiabatic coolers',lo:90,hi:150},
 {id:'ct',  l:'Cooling towers + CW pumps + treatment',lo:50,hi:90},
 {id:'hx',  l:'Economiser plate HX',lo:15,hi:30},
];
// fixed weights for the recommendation score
const WEIGHTS=[{id:'w_energy',l:'Energy',v:4},{id:'w_water',l:'Water',v:3},{id:'w_peak',l:'Peak power (grid)',v:3},{id:'w_capex',l:'Initial cost',v:2}];

// default basis values (inputs override them in the Cooling Plant Selector)
const BASIS={
  copA:2.866, copW:6.018, copMax:14,          // ASHRAE 90.1-2025 Table 6.8.1-3, Path B full load; COPmax = assumption
  unitWL:7000, unitWA:5500, unitA:1500, derA:0.0135,   // chiller unit sizes (kW): water-cooled liquid / air loop, air-cooled; air-cooled capacity loss per K above 35 °C (Trane RTAC public data)
  stage:0.90, acMax:52, wcMax:43,             // next chiller above 90% PLR; air-cooled max ambient; condenser-water warning limit
  acApp:15, wcApp:7,                          // condensing: ambient + 15 K; condenser water + 5 K range (AHRI) + 2 K
  aCT:5.56, aDC:5.56, aAD:11.1, aHX:1.5, rangeCW:5.56,   // ASHRAE 90.1-2025 Table 6.8.1-7 rating approaches; plate HX
  swAD:24, swHY:24, eAD:0.85, coc:4,          // adiabatic / hybrid switch; pad effectiveness (water use only); cycles of concentration
  kCT:0.012, kDC:0.030, kAD:0.030,            // fan kW per kW rejected at full speed: towers ASHRAE 2025 minimum; dry / adiabatic public data sheets
  dpCDU:320, dtCDU:10, dpPri:200, dpSec:400, dpCW:211, etaP:0.70,   // pump heads (kPa), CDU coolant ΔT, pump × motor × VFD efficiency
  dpFWU:0.30, dtAir:12, etaF:0.65,            // fan wall units: static pressure (kPa), air rise across IT (K), fan efficiency
  minPump:0.5, minFan:0.3,                    // VFD minimum speed
};

// ---------- ASHRAE 90.4-2025 Table 6.5: maximum annualized MLC by climate zone, [ITE > 300 kW, ITE ≤ 300 kW] ----------
const MLC_MAX={'0A':[.29,.37],'0B':[.32,.41],'1A':[.30,.37],'1B':[.31,.39],'2A':[.27,.35],'2B':[.20,.33],'3A':[.24,.33],'3B':[.20,.33],'3C':[.17,.27],
  '4A':[.21,.33],'4B':[.17,.29],'4C':[.17,.27],'5A':[.19,.34],'5B':[.17,.30],'5C':[.17,.29],'6A':[.19,.31],'6B':[.17,.31],'7':[.17,.31],'8':[.15,.32]};
const mlcMax=(zone,itKW)=>{ const v=MLC_MAX[String(zone||'').toUpperCase()]; return v?v[itKW>300?0:1]:null; };

// ---------- equations ----------
// pump or fan power as a share of the heat carried: P / Q = ΔP / (ρ · cp · ΔT · η)
const pumpK=(dpKPa,dT,eta)=>dpKPa/(1000*4.18*Math.max(dT,0.5)*eta);
const airFanK=(dpKPa,dT,eta)=>dpKPa/(1.2*1.006*Math.max(dT,0.5)*eta);
// VFD affinity law: power ∝ speed³, speed ∝ flow, held at the minimum speed
const affinity=(x,minSpeed)=>Math.pow(Math.max(minSpeed,Math.min(x,1.2)),3);
// chiller COP at the hour's lift (constant Carnot fraction) from the rated point; AHRI 551/591: 7 °C chilled water,
// 35 °C air + 15 K = 50 °C condensing, 30 °C condenser water + 7 K = 37 °C condensing; evaporating = supply − 2 K
const CH_REF={ac:{Te:5,Tc:50}, wc:{Te:5,Tc:37}};
function copAt(kind,Ts,Tc,p){
  const Te=Ts-2, lift=Math.max(Tc-Te,3), r=CH_REF[kind];
  return Math.min(p.copMax,(kind==='ac'?p.copA:p.copW)*((Te+273.15)/lift)/((r.Te+273.15)/(r.Tc-r.Te)));
}
// VSD part-load factor, calibrated to ASHRAE 90.1-2025 Path B full-load COP and IPLV (EnergyPlus VSD shape, scaled)
const PL_CURVE={wc:[0.1969,0.1318,0.6713], ac:[0.1752,0.1354,0.6895]};
const partLoad=(kind,x)=>{ const c=PL_CURVE[kind]; return Math.max(0.05,c[0]+c[1]*x+c[2]*x*x); };
// air-cooled unit capacity at a dry-bulb (rated at 35 °C)
const acCap=(p,db)=>p.unitA*Math.max(0.3,1-p.derA*Math.max(0,db-35));

// terminal units (heat added to their loop): CDU pumps on the liquid loop, fan wall units on the air loop
const termShare=(L,p)=>L.name==='LC'?pumpK(p.dpCDU,p.dtCDU,p.etaP):L.name==='Air'?airFanK(p.dpFWU,p.dtAir,p.etaF):0;
const loopPumpShare=(L,p)=>pumpK(p.dpPri+p.dpSec,L.Tr-L.Ts,p.etaP);   // primary + secondary pumps on the loop ΔT

// one hour of one option on one loop at dry-bulb db / wet-bulb wb
function hourModel(o,L,db,wb,p){
  let Tout,ecw=null,kind,wet=0,dShare=0;
  if(o.id==='acc'){ Tout=Infinity; kind='ac'; }
  else if(o.id==='accfc'){ Tout=db+p.aDC; kind='ac'; }                     // dry coolers directly on the loop
  else if(o.id==='adia'){ wet=db>p.swAD?1:0; ecw=wet?wb+p.aAD:db+p.aDC; Tout=ecw+p.aHX; kind='wc'; }
  else if(o.id==='wcc'){ wet=1; ecw=wb+p.aCT; Tout=ecw+p.aHX; kind='wc'; }
  else { // hybrid: dry coolers in series ahead of the towers on the condenser water
    if(db<=p.swHY){ ecw=db+p.aDC; dShare=1; wet=0; }
    else { ecw=wb+p.aCT; dShare=Math.max(0,Math.min(1,(ecw+p.rangeCW-(db+p.aDC))/p.rangeCW)); wet=1-dShare; }
    Tout=ecw+p.aHX; kind='wc';
  }
  const Tc=kind==='ac'?db+p.acApp:ecw+p.wcApp;
  const ff=Tout<=L.Ts?1:Math.max(0,Math.min(1,(L.Tr-Tout)/(L.Tr-L.Ts)));
  const term=termShare(L,p), pk=loopPumpShare(L,p), qLdes=L.Qd*(1+term+pk);
  // installed duty units: water-cooled at rated capacity; air-cooled sized at the Case A dry-bulb (derated)
  let unit,N;
  const unitW=L.name==='Air'?p.unitWA:p.unitWL;
  if(kind==='wc'&&unitW){ unit=unitW; N=Math.max(1,Math.ceil(qLdes/unit-1e-9)); }
  else if(kind==='ac'&&p.unitA){ unit=p.unitA; N=Math.max(1,Math.ceil(qLdes/acCap(p,p.dbA??35)-1e-9)); }
  else { N=p.nCh||4; unit=qLdes/N; }
  const capH=kind==='ac'&&p.unitA?acCap(p,db):unit;                       // capacity of one unit this hour
  const cop=copAt(kind,L.Ts,Tc,p);
  const des=p.des&&p.des[o.id]&&p.des[o.id][L.name];                       // design heat rejected (fan and condenser-pump speed)
  const minT=L.name==='Air'?p.minFan:p.minPump;
  const calc=q=>{
    const x=L.Qd>0?q/L.Qd:0;
    const Pt=term*L.Qd*affinity(x,minT), Pl=pk*L.Qd*affinity(x,p.minPump);
    const qL=q+Pt+Pl, Qch=qL*(1-ff);
    let Pc=0,nOn=0,plr=0;
    if(Qch>0){ nOn=Math.min(N,Math.max(1,Math.ceil(Qch/(p.stage*capH)-1e-9))); plr=Qch/(nOn*capH); Pc=nOn*capH/cop*partLoad(kind,Math.min(plr,1.2)); }
    const Qr=qL+Pc, QrRef=des?des.Qr:Qr, f=(share,k)=>share>0?k*QrRef*affinity(Qr*share/QrRef,p.minFan):0;
    let Pf=0;
    if(o.id==='accfc') Pf=ff>0?p.kDC*qLdes*affinity(qL*ff/qLdes,p.minFan):0;
    else if(o.id==='adia') Pf=f(1,p.kAD);
    else if(o.id==='wcc') Pf=f(1,p.kCT);
    else if(o.id==='hyb') Pf=f(wet,p.kCT)+f(dShare,p.kDC);
    const Pcw=kind==='wc'?pumpK(p.dpCW,p.rangeCW,p.etaP)*QrRef*affinity(Qr/QrRef,p.minPump):0;
    return {Pc,Pf,Pp:Pl+Pcw,Pt,Qr,qL,Qch,nOn,plr,cop:Qch>0?Qch/Pc:null,P:Pc+Pf+Pl+Pcw+Pt};
  };
  // limits: air-cooled max ambient fails the design; condenser water above the standard range only warns
  const limit=kind==='ac'&&db>p.acMax?`ambient ${db.toFixed(1)} °C > air-cooled chiller limit ${p.acMax} °C`:null;
  const warn=kind==='wc'&&ecw>p.wcMax?`entering condenser water ${ecw.toFixed(1)} °C is above the standard chiller range (${p.wcMax} °C): a chiller rated for more than ${p.wcMax} °C entering condenser water is needed`:null;
  return {Tout,Tc,ecw,kind,ff,wet,dShare,N,unit,cop,calc,limit,warn};
}

// make-up water, kg/h: towers 0.00153 × flow × range (ASHRAE) + blowdown at CoC; hybrid on the towers' share; adiabatic pads (air-side balance)
function waterKgH(o,Qr,db,wb,p,wet){
  if(o.id==='wcc'||o.id==='hyb') return wet*Qr*0.00153/4.18*3600*(p.coc/(p.coc-1));
  if(o.id==='adia'&&wet){ const Tpad=db-p.eAD*(db-wb); return Qr*(db-Tpad)/(12*2430)*1.15*3600; }
  return 0;
}

// two coincident design cases: A = extreme dry-bulb + the wet-bulb of the hottest hour; B = extreme wet-bulb + the dry-bulb of the most humid hour
function designCases(wx,A,dbIn,wbIn){
  let hA=0,hB=0; wx.T.forEach((t,h)=>{ if(t>wx.T[hA]) hA=h; if(wx.Twb[h]>wx.Twb[hB]) hB=h; });
  const dbA=isNaN(dbIn)?(A?A.extDB:wx.T[hA]):dbIn, wbB=isNaN(wbIn)?(A?A.extWB:wx.Twb[hB]):wbIn;
  return {A:{db:dbA,wb:Math.min(wx.Twb[hA],dbA)}, B:{db:Math.max(wx.T[hB],wbB),wb:wbB}};
}

// design check at both cases, 100% load; also records each option's design heat rejected (sets fan / pump speeds hourly)
function designCheck(p){
  const out={}, des={}; p.des=null;   // design cases at full fan / pump speed
  for(const o of OPTIONS){
    const cs={}, issues=[], warns=[], units=[]; des[o.id]={};
    for(const k of ['A','B']){ const {db,wb}=p.cases[k]; let P=0,Qr=0,W=0;
      p.loops.forEach(L=>{ if(L.Qd<=0) return; const hm=hourModel(o,L,db,wb,p), d=hm.calc(L.Qd);
        P+=d.P; Qr+=d.Qr; W+=waterKgH(o,d.Qr,db,wb,p,hm.wet)/1000;
        des[o.id][L.name]={Qr:Math.max(d.Qr,(des[o.id][L.name]||{}).Qr||0)};
        if(hm.limit&&hm.ff<1) issues.push(hm.limit); if(hm.warn&&hm.ff<1) warns.push(hm.warn);
        if(k==='A') units.push({loop:L.name,N:hm.N,unit:hm.unit,kind:hm.kind});
      });
      cs[k]={P,Qr,W};
    }
    const worst=cs.A.P>=cs.B.P?'A':'B';
    out[o.id]={cases:cs,worst,P:cs[worst].P,Qr:Math.max(cs.A.Qr,cs.B.Qr),W:Math.max(cs.A.W,cs.B.W),units,
      ok:issues.length===0,issues:[...new Set(issues)],warns:[...new Set(warns)],ratio:cs[worst].P/p.Qd};
  }
  p.des=des;
  return out;
}

// 8,760-hour simulation; call designCheck first (design heat rejected, design peak)
function simulate(wx,p,des){
  const n=wx.T.length, hs=8760/n, loops=p.loops, out={};
  for(const o of OPTIONS){
    const r={o,E:0,Ec:0,Ef:0,Ep:0,Et:0,W:0,free:[0,0],part:[0,0],mech:[0,0],hotCW:0,
      mFree:[new Array(12).fill(0),new Array(12).fill(0)],mPart:[new Array(12).fill(0),new Array(12).fill(0)],mMech:[new Array(12).fill(0),new Array(12).fill(0)],copSum:0,copN:0};
    for(let h=0;h<n;h++){
      const db=wx.T[h], wb=wx.Twb[h], m=wx.mon[h];
      loops.forEach((L,li)=>{
        if(L.Q<=0) return;
        const hm=hourModel(o,L,db,wb,p), a=hm.calc(L.Q), ff=hm.ff;
        r.E+=a.P; r.Ec+=a.Pc; r.Ef+=a.Pf; r.Ep+=a.Pp; r.Et+=a.Pt;
        if(a.cop){r.copSum+=a.cop; r.copN++;}
        r.W+=waterKgH(o,a.Qr,db,wb,p,hm.wet);
        if(hm.warn&&ff<1&&li===0) r.hotCW++;
        if(ff>=1){r.free[li]++; r.mFree[li][m]++;} else if(ff>0){r.part[li]++; r.mPart[li][m]++;} else {r.mech[li]++; r.mMech[li][m]++;}
      });
    }
    const Qyr=loops.reduce((s,L)=>s+L.Q,0)*n, d=des[o.id];
    ['E','Ec','Ef','Ep','Et'].forEach(k=>r[k]*=hs/1000);   // MWh
    r.W*=hs/1000;                                     // m3
    r.hotCW*=hs;                                      // h/yr above the condenser-water limit
    r.peak=d.P; r.Wpeak=d.W;                          // design peak: the higher of Case A and Case B, 100% load
    ['free','part','mech'].forEach(k=>r[k]=r[k].map(v=>v*hs));
    r.mlc=r.E*1000/(Qyr*hs);
    r.cop=r.copN?r.copSum/r.copN:null;
    r.peakRatio=r.peak/loops.reduce((s,L)=>s+L.Qd,0);
    // electrical losses for the annual PUE only (peaks are cooling plant only): UPS on the IT load; transformers + distribution on IT + cooling
    const fac=(it,cool)=>(it/p.ups+cool)/(1-p.dloss);
    r.Eit=Qyr*hs/1000;                                // MWh, IT energy = cooling load
    r.Efac=fac(r.Eit,r.E); r.Eloss=r.Efac-r.Eit-r.E;  // MWh
    r.pue=r.Efac/r.Eit;
    // annual running cost of cooling, $: electricity + water + demand charge (cooling peak, every month)
    r.costE=r.E*1000*p.tE; r.costW=r.W*p.tW; r.costD=r.peak*12*p.tD;
    r.run=r.costE+r.costW+r.costD;
    // initial cost
    const cap=p.Qd*(1+p.red);
    r.capLo=0; r.capHi=0; r.capParts=[];
    for(const c of o.comp){ const rt=p.rates[c]; r.capLo+=cap*rt.lo; r.capHi+=cap*rt.hi; r.capParts.push(c); }
    out[o.id]=r;
  }
  return out;
}

function score(res,p,des){
  const ids=OPTIONS.map(o=>o.id);
  ids.forEach(id=>{ const r=res[id]; r.excluded=null;
    if(r.o.water&&p.water==='none') r.excluded='Needs water';
    if(!r.excluded && des && !des[id].ok) r.excluded='Fails design day';
    r.capMid=(r.capLo+r.capHi)/2;
  });
  const ok=ids.filter(id=>!res[id].excluded);
  const norm=(k,id)=>{ const v=ok.map(i=>res[i][k]); const mn=Math.min(...v), mx=Math.max(...v); return mx-mn<1e-9?0:(res[id][k]-mn)/(mx-mn); };
  const wW=p.water==='limited'?p.w_water*2:p.w_water, tot=(p.w_energy+wW+p.w_peak+p.w_capex)||1;
  ok.forEach(id=>{ res[id].score=100*(1-(p.w_energy*norm('E',id)+wW*norm('W',id)+p.w_peak*norm('peak',id)+p.w_capex*norm('capMid',id))/tot); });
  ok.sort((a,b)=>res[b].score-res[a].score);
  return ok;
}
