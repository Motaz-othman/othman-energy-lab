// ---------- Liquid Rack Cooling: model (one rack, secondary / TCS side) ----------
// Flow rule (as in the Lenovo GB300 table): the flow holds the coolant return at the platform maximum at the
// platform's maximum supply, flow = liquid heat ÷ (ρ·cp·(TrMax − TsMax)); the CDU, pumps and pipes run at that flow + margin.
// Load jump (idle → rated heat): two water masses per rack.
//   Chips: the cold-plate coolant and metal (water-equivalent Vrack); the manifolds are upstream or downstream and do not count.
//   TCS loop: the CDU, the TCS pipes and an optional buffer tank, at the TCS supply temperature.
// The CDU senses the rise, then the VFD pump ramps the rack flow and the MCV opens the facility water to the CDU heat
// exchanger. Until the MCV is open the heat exchanger removes only the idle heat, so the TCS supply warms.
// Chiller plant resets are handled on the facility water side and are not part of this check.

const lpm=(kgs,f)=>kgs/f.rho*1000*60;          // kg/s → L/min
const ramp=(t,t0,dur)=>t<=t0?0:dur>0&&t<t0+dur?(t-t0)/dur:1;

// r: rack constants; fmin: idle flow as a share of the operating flow; Mt: TCS loop water per rack (kg)
function loadJump(r,fmin,Mt,tEnd){
  const {Ql,QlIdle,cp,mOp,Mr,Ts0,tSense,tRamp,tMCV,hxMax}=r, m0=fmin*mOp, dt=0.02;
  let Ts=Ts0, T=Ts0+QlIdle/(m0*cp), peak=T, tsPeak=Ts, k=0; const tr=[];
  for(let t=0;t<=tEnd+1e-9;t=(++k)*dt){
    const m=m0+(mOp-m0)*ramp(t,tSense,tRamp);                       // VFD pump
    const heatIn=m*cp*(T-Ts);                                        // heat carried from the rack to the loop
    const avail=QlIdle+(hxMax-QlIdle)*ramp(t,tSense,tMCV);           // heat exchanger duty the MCV allows
    const Qhx=Ts>Ts0+1e-9?avail:Math.min(avail,heatIn);              // the CDU never cools below its set point
    if(k%25===0) tr.push({t,T,Ts,f:m/mOp});
    T+=(Ql-heatIn)/(Mr*cp)*dt; Ts+=(heatIn-Qhx)/(Mt*cp)*dt;
    peak=Math.max(peak,T); tsPeak=Math.max(tsPeak,Ts);
  }
  return {peak,tsPeak,tr};
}

function rackStudy(p,i){
  const f=FLUIDS[i.fluid], Ql=p.P*p.liq, Qa=p.P-Ql, QlIdle=Ql*i.idle, Ts=p.TsMax, Tr=p.TrMax, cp=f.cp;
  const mReq=Ql/(cp*(Tr-Ts)), Freq=lpm(mReq,f);                   // minimum flow at rated power
  const mOp=mReq*(1+i.margin), Fop=lpm(mOp,f), TrOp=Ts+Ql/(mOp*cp);  // operating flow with the margin
  const Mr=i.Vrack*f.rho/1000, air=Qa/(1.2*1.006*i.dTair)*3600;
  const tTCS=2*i.tcsL/i.tcsV;                                        // round trip in the TCS pipes CDU ⇄ rack, s
  const tSense=i.tDet+(i.sensAt==='cdu'?tTCS/2:0);                   // a sensor at the CDU sees the rack return only after the pipe transit
  const Mpipe=mOp*tTCS, Mcdu=i.Vcdu*f.rho/1000;                      // water in the TCS pipes and the CDU, per rack
  const r={Ql,QlIdle,cp,mOp,Mr,Ts0:Ts,tSense,tRamp:i.tRamp,tMCV:i.tMCV,hxMax:Ql*(1+i.margin)};
  const tEnd=Math.max(90,3*(tSense+Math.max(i.tRamp,i.tMCV)));
  const lo=Math.max(QlIdle/(cp*(Tr-Ts))/mOp*(1+1e-6), p.minLpm?p.minLpm/Fop:0, 0.05);   // idle heat (and the vendor minimum) need this

  // safe minimum flow for a TCS loop of Mt kg per rack: lowest idle flow whose return stays at or below the limit
  const study=Mt=>{
    const ok=fm=>loadJump(r,fm,Mt,tEnd).peak<=Tr+1e-3, fullOK=ok(1);
    let fSafe=null; if(fullOK){ if(ok(lo)) fSafe=lo; else { let a=lo,b=1; for(let n=0;n<30;n++){ const c=(a+b)/2; if(ok(c)) b=c; else a=c; } fSafe=b; } }
    const run=loadJump(r,fSafe??1,Mt,tEnd);
    return {Mt,ok:fullOK,fSafe,F:fSafe==null?null:fSafe*Fop,rise:run.tsPeak-Ts,peak:run.peak,tr:run.tr};
  };
  const noTank=study(Mpipe+Mcdu), tank=study(Mpipe+Mcdu+i.Vbuf*f.rho/1000);

  // CDU pump trip at rated power: no flow; the chip buffer absorbs the heat
  const head=Tr-TrOp, tPump=head*Mr*cp/Ql;
  const pumpTrace=[]; for(let k=0;k<=40;k++){ const t=k*Math.max(4*tPump,5)/40; pumpTrace.push({t,T:TrOp+Ql*t/(Mr*cp)}); }

  const chain=[{k:'Chips',d:'cold-plate coolant and metal, at the operating flow',t:Mr/mOp},
    {k:'TCS pipes',d:`round trip CDU ⇄ rack, ${fmt(i.tcsL)} m at ${fmt(i.tcsV,1)} m/s`,t:tTCS},
    {k:'CDU sensing',d:`control reaction${i.sensAt==='cdu'?' + return transit to the CDU':''}`,t:tSense},
    {k:'VFD pump',d:'ramp to the operating flow',t:i.tRamp},
    {k:'MCV',d:'stroke to full facility water on the CDU heat exchanger',t:i.tMCV}];
  return {p,f,Ql,Qa,QlIdle,Ts,Tr,Freq,Fop,TrOp,air,tSense,tTCS,Mpipe,Mcdu,noTank,tank,head,tPump,pumpTrace,chain};
}
