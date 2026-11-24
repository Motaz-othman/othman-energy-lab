// ---------- shared cooling plant model (Cooling Plant Selector, Peak Shaving Tank) ----------
// Basis: "Cooling Plant Calculation Basis", Part A. ASHRAE 90.1-2025 Path B chillers, AHRI 551/591 rating points,
// ASHRAE 90.1-2025 heat-rejection approaches, pump and fan power from head equations, two coincident design cases.
const OPTIONS=[
 {id:'acc',  name:'Air-cooled chillers',                     short:'Air-cooled chillers',  water:false, comp:['acch']},
 {id:'accfc',name:'Air-cooled chillers + free-cooling dry coolers', short:'Chillers + dry coolers', water:false, comp:['acch','dc']},
 {id:'adia', name:'Water-cooled chillers + adiabatic coolers + free cooling', short:'Chillers + adiabatic + free cooling', water:true, comp:['wcch','adc','hx']},
 {id:'wcc',  name:'Water-cooled chillers + cooling towers + free cooling', short:'Chillers + towers + free cooling',     water:true, comp:['wcch','ct','hx']},
 {id:'hyb',  name:'Water-cooled chillers + hybrid dry coolers and cooling towers + free cooling', short:'Chillers + hybrid (dry coolers + towers) + free cooling', water:true, comp:['wcch','dc','ct','hx']},
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
const WEIGHTS=[{id:'w_energy',l:'Energy',v:4},{id:'w_water',l:'Water',v:3},{id:'w_peak',l:'Peak power (grid)',v:3},{id:'w_capex',l:'Initial cost',v:2},{id:'w_carbon',l:'Carbon',v:3}];

// ---------- environmental impact ----------
// grid emission factor, t CO2 per MWh (= kg/kWh). Countries: Our World in Data / Ember, carbon intensity of electricity, latest year (2024–2025).
// US cities: EPA eGRID2023 (rev 2) subregion total output CO2e rates, lb/MWh × 0.4536/1000: SRVC 596.3 (N. Virginia), ERCT 736.6 (Dallas),
// AZNM 706.2 (Phoenix), RFCW 916.1 (Chicago, Columbus), SRSO 846.0 (Atlanta), CAMX 430.0 (San Jose), NWPP 635.3 (Hillsboro, Reno,
// Salt Lake City), ERCT 736.6 (Abilene, San Antonio), MROW 926.6 (Des Moines), RFCE 599.2 (Newark), SRVC 596.3 (Charlotte), SRMV 741.7 (Monroe). Sydney: Australian NGA / Clean Energy Regulator scope 2 location-based factor, NSW 2025–26.
const GRID_EF={dubai:.468,abudhabi:.468,riyadh:.692,jeddah:.692,dammam:.692,manama:.902,cairo:.563,nova:.2705,dallas:.3341,phoenix:.3203,chicago:.4155,
  atlanta:0.3837,columbus:0.4155,sanjose:0.1950,hillsboro:0.2882,reno:0.2882,saltlake:0.2882,abilene:0.3341,sanantonio:0.3341,desmoines:0.4203,newark:0.2718,charlotte:0.2705,monroela:0.3364,
  saopaulo:.110,frankfurt:.330,london:.217,dublin:.257,madrid:.154,stockholm:.035,singapore:.497,mumbai:.670,tokyo:.477,sydney:.64};
// energy to supply 1 m³ of water, kWh: seawater desalination (Gulf) about 3.5, conventional treated supply about 0.5 (IEA World Energy Outlook 2016, Water-Energy Nexus)
const WATER_KWH={dubai:3.5,abudhabi:3.5,riyadh:3.5,jeddah:3.5,dammam:3.5,manama:3.5};
const waterKwh=id=>WATER_KWH[id]??0.5;
// water-supply carbon given directly, kg CO2e per m³ [low, central, high], where the utility publishes it.
// Phoenix: low = City of Phoenix 2022 GHG inventory, Table 1: Water Services electricity 92,848 t CO2e for 98.71 billion gallons treated
// (0.25 kg/m³, treatment + distribution); high = + Central Arizona Project conveyance 1.4 kWh/m³ (2.8 million MWh for 1.6 million
// acre-feet) × AZNM 0.3203 = 0.70 kg/m³; central = midpoint
const WATER_CO2={phoenix:[0.25,0.48,0.70]};
const waterCo2=id=>WATER_CO2[id]||null;
// U.S. cities: county climate zone (IECC 2021 / ASHRAE 169 county assignment, PNNL county data files) for the ASHRAE 90.4 MLC check;
// other cities use the station zone. Columbus: Franklin County (station); New Albany's Licking County is 5A.
const COUNTY_ZONE={nova:['4A','Loudoun County, VA'],dallas:['2A','Dallas County, TX'],phoenix:['2B','Maricopa County, AZ'],chicago:['5A','Cook County, IL'],
  atlanta:['3A','Fulton County, GA'],columbus:['4A','Franklin County, OH'],sanjose:['3C','Santa Clara County, CA'],hillsboro:['4C','Washington County, OR'],
  reno:['5B','Washoe County, NV'],saltlake:['5B','Salt Lake County, UT'],abilene:['3B','Taylor County, TX'],sanantonio:['2A','Bexar County, TX'],
  desmoines:['5A','Polk County, IA'],newark:['4A','Essex County, NJ'],charlotte:['3A','Mecklenburg County, NC'],monroela:['3A','Ouachita Parish, LA']};
const countyZone=id=>COUNTY_ZONE[id]||null;
// refrigerants, 100-year GWP: R-134a and R-513A IPCC AR4 (as used by the U.S. EPA under the AIM Act); R-1234ze(E) EU F-gas Regulation 2024/573
const REFRIGERANTS={r513a:{name:'R-513A',gwp:631},r134a:{name:'R-134a',gwp:1430},r1234ze:{name:'R-1234ze(E)',gwp:1.37}};

// default basis values (inputs override them in the Cooling Plant Selector)
const BASIS={
  copA:2.866, copW:6.018, copMax:14,          // ASHRAE 90.1-2025 Table 6.8.1-3, Path B full load; COPmax = assumption (low-lift limit; public manufacturer data are scarce; tested by sensitivity 10 / 14 / 20 / none)
  unitWL:7000, unitWA:5500, unitA:1500, derA:0.0135,   // chiller unit sizes (kW): water-cooled liquid / air loop, air-cooled; air-cooled capacity loss per K above 35 °C (Trane RTAC public data)
  stage:0.90, acMax:52, wcMax:43,             // next chiller above 90% PLR; air-cooled max ambient; condenser-water warning limit
  acApp:15, wcApp:7,                          // condensing: ambient + 15 K; condenser water + 5 K range (AHRI) + 2 K
  aCT:5.56, aDC:5.56, aAD:9.4, aHX:1.5, rangeCW:5.56,   // ASHRAE 90.1-2025 Table 6.8.1-7 rating approaches; adiabatic: coil approach above the air after the pads
                                              // (rating 95 °F leaving water, 95 / 75 °F air: pad air 78 °F, so 17 °F = 9.4 K); plate HX
  swAD:24, cwSet:30, eAD:0.85, coc:4,         // adiabatic pads allowed above (°C); hybrid condenser-water setpoint (AHRI 30 °C); pad effectiveness; cycles of concentration
  evapK:0.0020, evapLo:0.0015, evapHi:0.0027, // tower evaporation per kg circulated per K of range: EnergyPlus default 0.2 %/K, band 0.15–0.27 %/K
  kCT:0.012, kDC:0.030, kAD:0.030,            // fan kW per kW rejected at full speed: towers ASHRAE 2025 minimum; dry / adiabatic public data sheets
  dpCDU:320, dtCDU:10, dpPri:200, dpSec:400, dpCW:211, etaP:0.70,   // pump heads (kPa), CDU coolant ΔT, pump × motor × VFD efficiency
  dpFWU:0.30, dtAir:12, etaF:0.65,            // fan wall units: static pressure (kPa), air rise across IT (K), fan efficiency
  minPump:0.5, minFan:0.3,                    // VFD minimum speed
  ef:0.45, wkwh:0.5, refr:'r513a', chW:0.3, chA:0.4, leak:0.02,   // grid t CO2/MWh; water kWh/m³; refrigerant; charge kg per kW (water-cooled / air-cooled); leak per year
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
  else if(o.id==='adia'){ // above the switch the pads run only when they give the colder water: min(db + 5.56, pad air + 9.4)
    const dry=db+p.aDC, padAir=db-p.eAD*(db-wb), wetOut=padAir+p.aAD;
    wet=db>p.swAD&&wetOut<dry?1:0; ecw=wet?wetOut:dry; Tout=ecw+p.aHX; kind='wc'; }
  else if(o.id==='wcc'){ wet=1; ecw=wb+p.aCT; Tout=ecw+p.aHX; kind='wc'; }
  else { // hybrid, capability rule: dry coolers in series ahead of the towers; the dry section runs when the water entering is above
         // db + 5.56, the towers only when the dry section alone cannot reach the target (free cooling: supply − 1.5; chillers only:
         // condenser-water setpoint, 30 °C AHRI)
    const dryOut=db+p.aDC, twr=wb+p.aCT, fc=twr+p.aHX<L.Tr;
    const target=fc?L.Ts-p.aHX:p.cwSet;
    if(dryOut<=target){ ecw=dryOut; dShare=1; wet=0; }                     // dry section alone reaches the target: towers off
    else { ecw=fc?twr:Math.max(twr,p.cwSet);                                // towers on: as cold as they can in free cooling; with chillers only they hold the setpoint
      const Tin=fc?L.Tr-p.aHX:ecw+p.rangeCW, Treq=fc?Math.max(L.Ts-p.aHX,twr):ecw;   // chillers only: dry share = (max(30, wb + 5.56) − db) / 5.56
      dShare=Tin>dryOut&&Tin>Treq?Math.max(0,Math.min(1,(Tin-Math.max(dryOut,Treq))/(Tin-Treq))):0;
      wet=1-dShare; }
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
    const Qr=qL+Pc, QrRef=des?des.Qr:Qr, f=(share,k)=>share>0?k*QrRef*affinity(Math.min(1,Qr*share/QrRef),p.minFan):0;   // fans: full speed at most
    let Pf=0;
    if(o.id==='accfc') Pf=ff>0?p.kDC*qLdes*affinity(Math.min(1,qL*ff/qLdes),p.minFan):0;
    else if(o.id==='adia') Pf=f(1,p.kAD);
    else if(o.id==='wcc') Pf=f(1,p.kCT);
    else if(o.id==='hyb') Pf=f(wet,p.kCT)+f(dShare,p.kDC);
    const Pcw=kind==='wc'?pumpK(p.dpCW,p.rangeCW,p.etaP)*QrRef*affinity(Math.min(1,Qr/QrRef),p.minPump):0;
    return {Pc,Pf,Pp:Pl+Pcw,Pt,Qr,qL,Qch,nOn,plr,cop:Qch>0?Qch/Pc:null,P:Pc+Pf+Pl+Pcw+Pt};
  };
  // limits: air-cooled max ambient fails the design; condenser water above the standard range only warns
  const limit=kind==='ac'&&db>p.acMax?`ambient ${db.toFixed(1)} °C > air-cooled chiller limit ${p.acMax} °C`:null;
  const warn=kind==='wc'&&ecw>p.wcMax?`entering condenser water ${ecw.toFixed(1)} °C is above the standard chiller range (${p.wcMax} °C): a chiller rated for more than ${p.wcMax} °C entering condenser water is needed`:null;
  return {Tout,Tc,ecw,kind,ff,wet,dShare,N,unit,cop,calc,limit,warn};
}

// make-up water, kg/h: tower evaporation = evapK × flow × range (EnergyPlus default 0.2 %/K) + blowdown at CoC; hybrid on the towers' share;
// adiabatic pads (air-side balance), only in wet-mode hours
function waterKgH(o,Qr,db,wb,p,wet){
  if(o.id==='wcc'||o.id==='hyb') return wet*Qr*p.evapK/4.18*3600*(p.coc/(p.coc-1));
  if(o.id==='adia'&&wet){ const Tpad=db-p.eAD*(db-wb); return Qr*(db-Tpad)/(12*2430)*1.15*3600; }
  return 0;
}

// low / high water for the evaporation-factor band (towers and hybrid scale with it; adiabatic pad water does not)
const evapScale=(o,p,k)=>o.id==='wcc'||o.id==='hyb'?k/p.evapK:1;

// two coincident design cases: A = extreme dry-bulb + the wet-bulb of the hottest hour; B = extreme wet-bulb + the dry-bulb of the most humid hour
// Case B takes its dry-bulb from the most humid hour that was not capped (station files cap hourly wet-bulb at the ASHRAE extreme + 1 K)
function designCases(wx,A,dbIn,wbIn){
  const capped=new Set((wx.station&&wx.station.capH)||[]), ok=h=>!capped.has(h);
  let hA=0,hB=-1; wx.T.forEach((t,h)=>{ if(t>wx.T[hA]) hA=h; if(ok(h)&&(hB<0||wx.Twb[h]>wx.Twb[hB])) hB=h; });
  if(hB<0) hB=wx.Twb.indexOf(Math.max(...wx.Twb));
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
    const worst=cs.A.P>=cs.B.P?'A':'B', Wd=Math.max(cs.A.W,cs.B.W);
    out[o.id]={cases:cs,worst,P:cs[worst].P,Qr:Math.max(cs.A.Qr,cs.B.Qr),W:Wd,Wlo:Wd*evapScale(o,p,p.evapLo),Whi:Wd*evapScale(o,p,p.evapHi),units,
      ok:issues.length===0,issues:[...new Set(issues)],warns:[...new Set(warns)],ratio:cs[worst].P/p.Qd};
  }
  p.des=des;
  return out;
}

// 8,760-hour simulation; call designCheck first (design heat rejected, design peak)
function simulate(wx,p,des){
  const n=wx.T.length, hs=8760/n, loops=p.loops, out={};
  for(const o of OPTIONS){
    const r={o,E:0,Ec:0,Ef:0,Ep:0,Et:0,W:0,yMax:0,yAbove:0,free:[0,0],part:[0,0],mech:[0,0],hotCW:0,
      mFree:[new Array(12).fill(0),new Array(12).fill(0)],mPart:[new Array(12).fill(0),new Array(12).fill(0)],mMech:[new Array(12).fill(0),new Array(12).fill(0)],copSum:0,copN:0};
    const dP=des[o.id].P, capped=new Set((wx.station&&wx.station.capH)||[]);
    for(let h=0;h<n;h++){
      const db=wx.T[h], wb=wx.Twb[h], m=wx.mon[h]; let P100=0;
      loops.forEach((L,li)=>{
        if(L.Q<=0) return;
        const hm=hourModel(o,L,db,wb,p), a=hm.calc(L.Q), ff=hm.ff;
        P100+=hm.calc(L.Qd).P;                        // the same hour at 100% IT load (bounding check of the design cases)
        r.E+=a.P; r.Ec+=a.Pc; r.Ef+=a.Pf; r.Ep+=a.Pp; r.Et+=a.Pt;
        if(a.cop){r.copSum+=a.cop; r.copN++;}
        r.W+=waterKgH(o,a.Qr,db,wb,p,hm.wet);
        if(hm.warn&&ff<1&&li===0) r.hotCW++;
        if(ff>=1){r.free[li]++; r.mFree[li][m]++;} else if(ff>0){r.part[li]++; r.mPart[li][m]++;} else {r.mech[li]++; r.mMech[li][m]++;}
      });
      if(!capped.has(h)){ if(P100>r.yMax) r.yMax=P100; if(P100>dP+1e-6) r.yAbove+=hs; }   // flagged (capped) hours are not design hours
    }
    const Qyr=loops.reduce((s,L)=>s+L.Q,0)*n, d=des[o.id];
    ['E','Ec','Ef','Ep','Et'].forEach(k=>r[k]*=hs/1000);   // MWh
    r.W*=hs/1000;                                     // m3
    r.Wlo=r.W*evapScale(o,p,p.evapLo); r.Whi=r.W*evapScale(o,p,p.evapHi);   // evaporation-factor band
    r.hotCW*=hs;                                      // h/yr above the condenser-water limit
    // design peak: the highest of Case A, Case B and the typical-year maximum, all at 100% IT load
    r.peak=Math.max(d.P,r.yMax); r.peakCase=r.yMax>d.P+1e-6?'year':d.worst; r.yExcess=Math.max(0,r.yMax-d.P);
    r.Wpeak=d.W; r.WpeakLo=d.Wlo; r.WpeakHi=d.Whi;
    ['free','part','mech'].forEach(k=>r[k]=r[k].map(v=>v*hs));
    r.mlc=r.E*1000/(Qyr*hs);
    r.cop=r.copN?r.copSum/r.copN:null;
    r.peakRatio=r.peak/loops.reduce((s,L)=>s+L.Qd,0);
    // electrical losses for the annual PUE only (peaks are cooling plant only): UPS on the IT load; transformers + distribution on IT + cooling
    const fac=(it,cool)=>(it/p.ups+cool)/(1-p.dloss);
    r.Eit=Qyr*hs/1000;                                // MWh, IT energy = cooling load
    r.Efac=fac(r.Eit,r.E); r.Eloss=r.Efac-r.Eit-r.E;  // MWh
    r.pue=r.Efac/r.Eit;
    // facility electrical peak (grid connection): IT at 100% through the UPS + cooling peak, plus distribution losses; same factors as the PUE
    r.facPeak=fac(loops.reduce((s,L)=>s+L.Qd,0),r.peak); r.coolShare=r.peak/r.facPeak;
    // annual running cost of cooling, $: electricity + water + demand charge (cooling peak, every month)
    r.costE=r.E*1000*p.tE; r.costW=r.W*p.tW; r.costD=r.peak*12*p.tD;
    r.run=r.costE+r.costW+r.costD;
    // initial cost
    const cap=p.Qd*(1+p.red);
    r.capLo=0; r.capHi=0; r.capParts=[];
    for(const c of o.comp){ const rt=p.rates[c]; r.capLo+=cap*rt.lo; r.capHi+=cap*rt.hi; r.capParts.push(c); }
    // carbon, t CO2e per year: electricity × grid factor; water × supply energy × grid factor; refrigerant charge (duty + 1 standby per loop) × leak × GWP
    r.chCap=d.units.reduce((s,u)=>s+(u.N+1)*u.unit,0);
    r.charge=r.chCap*(d.units.some(u=>u.kind==='ac')?p.chA:p.chW);
    // water carbon, kg/m³: the utility's own figure where given (band low–high), else supply energy × grid factor
    const wc=p.wco2||[p.wkwh*p.ef,p.wkwh*p.ef,p.wkwh*p.ef];
    r.co2E=r.E*p.ef; r.co2W=r.W*wc[1]/1000; r.co2Wlo=r.Wlo*wc[0]/1000; r.co2Whi=r.Whi*wc[2]/1000; r.co2R=r.charge*p.leak*(REFRIGERANTS[p.refr]||REFRIGERANTS.r513a).gwp/1000;
    r.co2=r.co2E+r.co2W+r.co2R; r.co2Lo=r.co2E+r.co2Wlo+r.co2R; r.co2Hi=r.co2E+r.co2Whi+r.co2R; r.co2IT=r.co2*1000/r.Eit;   // kg CO2e per MWh of IT
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
  const wW=p.water==='limited'?p.w_water*2:p.w_water, wC=p.w_carbon||0, tot=(p.w_energy+wW+p.w_peak+p.w_capex+wC)||1;
  ok.forEach(id=>{ res[id].score=100*(1-(p.w_energy*norm('E',id)+wW*norm('W',id)+p.w_peak*norm('peak',id)+p.w_capex*norm('capMid',id)+wC*norm('co2',id))/tot); });
  ok.sort((a,b)=>res[b].score-res[a].score);
  return ok;
}
