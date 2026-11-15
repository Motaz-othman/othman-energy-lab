// ---------- shared cooling plant model (Cooling Plant Selector, Thermal Storage Tank): options, cost rates ----------
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

// ---------- ASHRAE 90.1 / 90.4 references ----------
// water flow per kW at a ΔT of 1 K, in gpm: 1 kW / (4.18 kJ/kg·K × 1 K) = 0.2392 L/s = 3.792 gpm
const GPM_PER_KW_K=3.792;
// pump power as a share of the heat carried: W/gpm × gpm per kW ÷ 1000 (ASHRAE 90.1 Appendix G: CHW 22 W/gpm, CW 19 W/gpm)
const pumpShare=(wPerGpm,dT)=>wPerGpm*GPM_PER_KW_K/Math.max(dT,0.5)/1000;
// open cooling tower fan power per kW rejected, from its efficiency in gpm/hp at the 90.1 rating point
// (35 °C entering, 29.4 °C leaving water = 5.56 K range): hp per kW = gpm per kW ÷ (gpm/hp); 0.7457 kW per hp
const towerFanShare=gpmPerHp=>GPM_PER_KW_K/5.556/gpmPerHp*0.7457;
// ASHRAE 90.4-2022 (Addendum g, 2024) Table 6.5: maximum annualized MLC by climate zone, [ITE > 300 kW, ITE ≤ 300 kW]
const MLC_MAX={'0A':[.29,.37],'0B':[.32,.41],'1A':[.30,.37],'1B':[.31,.39],'2A':[.27,.35],'2B':[.20,.33],'3A':[.24,.33],'3B':[.20,.33],'3C':[.17,.27],
  '4A':[.21,.33],'4B':[.17,.29],'4C':[.17,.27],'5A':[.19,.34],'5B':[.17,.30],'5C':[.17,.29],'6A':[.19,.31],'6B':[.17,.31],'7':[.17,.31],'8':[.15,.32]};
const mlcMax=(zone,itKW)=>{ const v=MLC_MAX[String(zone||'').toUpperCase()]; return v?v[itKW>300?0:1]:null; };

// ---------- chiller model ----------
const AHRI={ac:{Te:6.7-2, Tc:35+15}, wc:{Te:6.7-2, Tc:29.4+7.6}};
const eirPLR={ac:x=>x, wc:x=>0.07308728+0.1513521*x+0.7709311*x*x};
function chillerPower(Qch, capEach, n, kind, Ts, Tc, p){
  if(Qch<=0) return {P:0,cop:null};
  const Te=Ts-2, lift=Math.max(Tc-Te,3), ref=AHRI[kind], refLift=ref.Tc-ref.Te;
  const copRated = kind==='ac'?p.copA:p.copW;
  let copT = copRated * ((Te+273.15)/lift) / ((ref.Te+273.15)/refLift);
  copT=Math.min(copT,p.copMax);
  // stage the number of duty chillers that gives the lowest power (VSD chillers are more efficient at part load)
  const nMin=Math.min(n,Math.max(1,Math.ceil(Qch/capEach-1e-9)));
  let P=Infinity;
  for(let k=nMin;k<=n;k++){ const plr=Math.min(1,Qch/(k*capEach)); P=Math.min(P,k*(capEach/copT)*Math.max(eirPLR[kind](plr),0.05)); }
  return {P, cop:Qch/P};
}


function hourModel(o,L,db,wb,p){
  let Tout,Tc,kind,fanK,cwK=0,teff=db,wet=1,dShare=0;
  // pumps and tower fans: ASHRAE 90.1 values when given (W/gpm, gpm/hp), else the older % inputs (Peak Shaving Tank)
  const cwShare=p.cwW!=null?pumpShare(p.cwW,5.556):p.cwp, ctFan=p.ctEff?towerFanShare(p.ctEff):0.008;
  const pumpK=p.pumpW!=null?pumpShare(p.pumpW,L.Tr-L.Ts):p.pump;
  if(o.id==='acc'){Tout=Infinity;Tc=db+15;kind='ac';fanK=0;}
  else if(o.id==='accfc'){Tout=db+p.aDC;Tc=db+15;kind='ac';fanK=0.015;}
  else if(o.id==='adia'){teff=db>p.swAD?db-p.eAD*(db-wb):db; Tout=teff+p.aDC+p.aHX; Tc=teff+p.aDC+7.6; kind='wc'; fanK=0.018; cwK=cwShare;}
  else if(o.id==='wcc'){Tout=wb+p.aCT+p.aHX; Tc=wb+p.aCT+7.6; kind='wc'; fanK=ctFan; cwK=cwShare;}
  else if(o.id==='hyb'){
    // hybrid: dry coolers and cooling towers in series on the condenser water. At or below the switch temperature
    // the dry coolers alone cool the water (no water used). Above it the towers run, and the dry coolers
    // pre-cool the water ahead of them while the air is cooler than the water (range 6 K), cutting tower water.
    let Tcw; if(db<=p.swHY){ Tcw=db+p.aDC; wet=0; dShare=1; }
    else { Tcw=wb+p.aCT; dShare=Math.max(0,Math.min(1,(Tcw+6-(db+p.aDC))/6)); wet=1-dShare; }
    Tout=Tcw+p.aHX; Tc=Tcw+7.6; kind='wc'; fanK=0.018; cwK=cwShare;}
  const ff=Tout<=L.Ts?1:Math.max(0,Math.min(1,(L.Tr-Tout)/(L.Tr-L.Ts)));
  // terminal units in the hall: CRAH / FWU fans on the air loop, CDU pumps on the liquid loop;
  // their power is cooling energy and also ends up as heat in the loop
  const term=L.name==='Air'?p.fanT:p.cduP;
  const capEach=L.Qd*(1+term)/p.nCh;
  const calc=(q)=>{
    const Pt=term*q, qL=q+Pt;
    const ch=chillerPower(qL*(1-ff),capEach,p.nCh,kind,L.Ts,Tc,p);
    const Qr=qL+ch.P; let Pf=0;
    const airFrac = ff>=1 ? Math.max(0.25,Math.min(1,(L.Tr-L.Ts)/Math.max(L.Tr-Tout,0.1))) : 1;
    if(o.id==='accfc') Pf = ff>0 ? fanK*qL*airFrac : 0;
    else if(o.id==='adia') Pf=fanK*Qr*airFrac;
    else if(o.id==='wcc') Pf=fanK*Qr;
    else if(o.id==='hyb') Pf=wet>0 ? ctFan*Qr+fanK*Qr*dShare : fanK*Qr*airFrac;   // towers + dry coolers, or dry coolers alone
    const Pp=pumpK*qL + cwK*Qr;
    return {Pc:ch.P,Pf,Pp,Pt,Qr,cop:ch.cop,P:ch.P+Pf+Pp+Pt};
  };
  // condenser operating limit
  let limit=null;
  if(kind==='ac' && db>p.acMax) limit=`ambient ${db.toFixed(1)} °C > air-cooled chiller limit ${p.acMax} °C`;
  if(kind==='wc'){ const ecw=Tc-7.6; if(ecw>p.wcMax) limit=`entering condenser water ${ecw.toFixed(1)} °C > limit ${p.wcMax} °C`; }
  return {Tout,Tc,kind,ff,teff,wet,calc,limit};
}

function designCheck(p,dbD,wbD){
  const out={};
  for(const o of OPTIONS){
    let P=0,Qr=0,Pc=0,W=0; const issues=[];
    p.loops.forEach(L=>{ if(L.Qd<=0) return; const hm=hourModel(o,L,dbD,wbD,p), d=hm.calc(L.Qd);
      P+=d.P; Qr+=d.Qr; Pc+=d.Pc; W+=waterKgH(o,d.Qr,dbD,hm.teff,p,hm.wet)/1000;
      if(hm.limit && hm.ff<1) issues.push(hm.limit);
    });
    out[o.id]={P,Qr,Pc,W,ok:issues.length===0,issues:[...new Set(issues)],ratio:P/p.Qd};
  }
  return out;
}

// make-up water, kg/h: tower evaporation + blowdown (hybrid: only the towers' share of the heat), or adiabatic pad water when wet
function waterKgH(o,Qr,db,teff,p,wet=1){
  if(o.id==='wcc'||o.id==='hyb') return (o.id==='hyb'?wet:1)*0.8*Qr*3600/2430*(p.coc/(p.coc-1));
  if(o.id==='adia'&&db>p.swAD) return Qr*3600*(db-teff)/(12*2430)*1.15;
  return 0;
}

function simulate(wx,p){
  const n=wx.T.length, hs=8760/n, loops=p.loops, out={};
  for(const o of OPTIONS){
    const r={o,E:0,Ec:0,Ef:0,Ep:0,Et:0,W:0,peak:0,Wpeak:0,free:[0,0],part:[0,0],mech:[0,0],
      mFree:[new Array(12).fill(0),new Array(12).fill(0)],mPart:[new Array(12).fill(0),new Array(12).fill(0)],mMech:[new Array(12).fill(0),new Array(12).fill(0)],copSum:0,copN:0};
    for(let h=0;h<n;h++){
      const db=wx.T[h], wb=wx.Twb[h], m=wx.mon[h]; let Pd=0, Wd=0;
      loops.forEach((L,li)=>{
        if(L.Q<=0) return;
        const hm=hourModel(o,L,db,wb,p), calc=hm.calc, ff=hm.ff, teff=hm.teff;
        const a=calc(L.Q), d=calc(L.Qd);
        r.E+=a.P; r.Ec+=a.Pc; r.Ef+=a.Pf; r.Ep+=a.Pp; r.Et+=a.Pt; Pd+=d.P;
        if(a.cop){r.copSum+=a.cop; r.copN++;}
        r.W+=waterKgH(o,a.Qr,db,teff,p,hm.wet); Wd+=waterKgH(o,d.Qr,db,teff,p,hm.wet);
        if(ff>=1){r.free[li]++; r.mFree[li][m]++;} else if(ff>0){r.part[li]++; r.mPart[li][m]++;} else {r.mech[li]++; r.mMech[li][m]++;}
      });
      r.peak=Math.max(r.peak,Pd); r.Wpeak=Math.max(r.Wpeak,Wd);   // peaks at 100% load on the worst hour
    }
    const Qyr=loops.reduce((s,L)=>s+L.Q,0)*n;
    ['E','Ec','Ef','Ep','Et'].forEach(k=>r[k]*=hs/1000);   // MWh
    r.W*=hs/1000;                                     // m3
    r.Wpeak/=1000;                                    // m3/h
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

function score(res,p){
  const ids=OPTIONS.map(o=>o.id);
  ids.forEach(id=>{ const r=res[id]; r.excluded=null;
    if(r.o.water&&p.water==='none') r.excluded='Needs water';
    if(!r.excluded && DES && !DES[id].ok) r.excluded='Fails design day';
    r.capMid=(r.capLo+r.capHi)/2;
  });
  const ok=ids.filter(id=>!res[id].excluded);
  const norm=(k,id)=>{ const v=ok.map(i=>res[i][k]); const mn=Math.min(...v), mx=Math.max(...v); return mx-mn<1e-9?0:(res[id][k]-mn)/(mx-mn); };
  const wW=p.water==='limited'?p.w_water*2:p.w_water, tot=(p.w_energy+wW+p.w_peak+p.w_capex)||1;
  ok.forEach(id=>{ res[id].score=100*(1-(p.w_energy*norm('E',id)+wW*norm('W',id)+p.w_peak*norm('peak',id)+p.w_capex*norm('capMid',id))/tot); });
  ok.sort((a,b)=>res[b].score-res[a].score);
  return ok;
}
