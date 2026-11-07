// ---------- Liquid Rack Cooling: model (one rack) ----------
// Flow rule (as in the Lenovo GB300 table): required flow holds the coolant return at the platform maximum,
//   flow = liquid heat ÷ (ρ·cp·(TrMax − supply)).
// Load jump and pump trip: only the coolant in the cold plates and the cold-plate metal (water-equivalent volume Vrack)
// buffer the chips; the manifolds are upstream or downstream and do not. Plant reset: the water in the whole loop
// (facility pipes, CDU, rack) is taken as one well-mixed mass, which is on the safe side of plug flow.

const lpm=(kgs,f)=>kgs/f.rho*1000*60;          // kg/s → L/min

// load jump: idle heat on flow fmin (share of the operating flow), then the heat jumps to the peak at t = 0;
// the CDU holds the flow for tD seconds (sensing and control), then ramps it linearly to the operating flow over tR seconds
function loadJump(r,fmin,tD,tR,tEnd){
  const {QlIdle,QlJ,cp,mOp,Mr,Ts}=r, m0=fmin*mOp, dt=0.02; let T=Ts+QlIdle/(m0*cp), peak=T, k=0; const tr=[];
  for(let t=0;t<=tEnd+1e-9;t=(++k)*dt){
    const m=t<=tD?m0:tR>0&&t<tD+tR?m0+(mOp-m0)*(t-tD)/tR:mOp;
    if(k%25===0) tr.push({t,T,f:m/mOp});
    T+=(QlJ-m*cp*(T-Ts))/(Mr*cp)*dt; peak=Math.max(peak,T);
  }
  return {peak,tr};
}

function rackStudy(p,i){
  const f=FLUIDS[i.fluid], Ql=p.P*p.liq, Qa=p.P-Ql, QlJ=p.Ppeak*p.liq, QlIdle=Ql*i.idle, Ts=Math.min(i.Ts,p.TsMax), Tr=p.TrMax, cp=f.cp;
  const mReq=Ql/(cp*(Tr-Ts)), Freq=lpm(mReq,f);                   // flow that holds the return at the limit (rated power)
  const mOp=mReq*(1+i.margin), Fop=lpm(mOp,f), TrOp=Ts+Ql/(mOp*cp);  // operating flow with the margin
  const Mr=i.Vrack*f.rho/1000, r={QlIdle,QlJ,cp,mOp,Mr,Ts};
  const air=Qa/(1.2*1.006*i.dTair)*3600;                            // m³/h of air for the air share
  const tResp=i.tDet+i.tRamp;

  // 1. load jump: lowest idle flow that keeps the return at or below the limit while the CDU responds
  const tEnd=Math.max(60,3*tResp), ok=fm=>loadJump(r,fm,i.tDet,i.tRamp,tEnd).peak<=Tr+1e-3;
  const lo=Math.max(QlIdle/(cp*(Tr-Ts))/mOp*(1+1e-6), p.minLpm?p.minLpm/Fop:0, 0.05);   // idle heat (and the vendor minimum) need this
  const peakOK=ok(1);                                                // even full flow may not hold a jump to the peak
  let fSafe=1; if(peakOK){ if(ok(lo)) fSafe=lo; else { let a=lo,b=1; for(let n=0;n<30;n++){ const c=(a+b)/2; if(ok(c)) b=c; else a=c; } fSafe=b; } }
  const fFollow=Math.max(lo,i.idle);                                 // flow that simply follows the idle heat
  const jumpFollow=loadJump(r,fFollow,i.tDet,i.tRamp,tEnd), jumpSafe=loadJump(r,fSafe,i.tDet,i.tRamp,tEnd);
  // time the chips run safely after the jump if the flow stayed at the idle-following value
  const m0=fFollow*mOp, Tss=Ts+QlJ/(m0*cp), T0=Ts+QlIdle/(m0*cp), tau=Mr/m0;
  const tNoResp=Tss<=Tr?Infinity:T0>=Tr?0:-tau*Math.log((Tss-Tr)/(Tss-T0));

  // 2. plant reset: no cooling for the reset time; the loop water (pipes plant ⇄ CDU, CDU, rack) absorbs the heat
  const tRT=2*i.pipeL/i.vel;                                         // round trip in the facility pipes, s
  const Mloop=(mOp*tRT)+i.Vcdu*f.rho/1000+Mr;                        // kg of water per rack in the loop
  const rise=Ql/(Mloop*cp);                                          // K per second with no cooling
  const head=Tr-TrOp;                                                // return headroom at the operating flow
  const tReset=i.resetMin*60, tSafeReset=head/rise;
  const bufL=tSafeReset>=tReset?0:Math.max(0,Ql*tReset/(cp*head)-Mloop)/f.rho*1000;   // extra water per rack
  const TsRide=Tr-(Ql/(mOp*cp))-Ql*tReset/(Mloop*cp);               // supply that rides through without a buffer (same flow)
  const resetTrace=[]; for(let k=0;k<=40;k++){ const t=k*Math.max(tReset,tSafeReset)*1.2/40; resetTrace.push({t:t/60,T:TrOp+rise*Math.min(t,tReset)}); }

  // 3. CDU pump trip at rated power: no flow; the cold-plate coolant and metal absorb the heat
  const tPump=head*Mr*cp/Ql;
  const pumpTrace=[]; for(let k=0;k<=40;k++){ const t=k*Math.max(4*tPump,5)/40; pumpTrace.push({t,T:TrOp+Ql*t/(Mr*cp)}); }

  // response chain
  const chain=[{k:'Rack',d:'cold-plate coolant and metal, at the operating flow',t:Mr/mOp},{k:'CDU',d:`sensing and control ${fmt(i.tDet)} s + pump ramp ${fmt(i.tRamp)} s`,t:tResp},
    {k:'Pipes',d:'round trip plant ⇄ CDU',t:tRT},{k:'Plant',d:'chiller reset',t:tReset}];
  return {p,f,Ql,Qa,QlJ,Ts,Tr,Freq,Fop,TrOp,air,tResp,fSafe,FSafe:fSafe*Fop,peakOK,fFollow,jumpFollow,jumpSafe,tNoResp,
    tRT,Mloop,rise,head,tReset,tSafeReset,bufL,TsRide,resetTrace,tPump,pumpTrace,chain};
}
