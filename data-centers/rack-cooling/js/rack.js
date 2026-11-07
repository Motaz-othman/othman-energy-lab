// ---------- Liquid Rack Cooling: model (one rack) ----------
// Flow rule (as in the Lenovo GB300 table): required flow holds the coolant return at the platform maximum,
//   flow = liquid heat ÷ (ρ·cp·(TrMax − supply)).
// Transients treat the coolant held in the rack (and, for a plant reset, in the whole loop) as one well-mixed mass.

const lpm=(kgs,f)=>kgs/f.rho*1000*60;          // kg/s → L/min
const kgs=(Lpm,f)=>Lpm/60/1000*f.rho;          // L/min → kg/s

// load jump: the rack runs at idle on flow fmin (share of the operating flow), then jumps to full heat;
// the CDU brings the flow back to the operating flow, linearly over tR seconds. Returns the return temperature trace.
function loadJump(r,fmin,tR,tEnd){
  const {Ql,cp,mOp,Mr,Ts,idle}=r, m0=fmin*mOp, dt=0.05; let T=Ts+Ql*idle/(m0*cp), peak=T; const tr=[];
  for(let t=0;t<=tEnd+1e-9;t+=dt){
    const m=tR>0&&t<tR?m0+(mOp-m0)*t/tR:mOp;
    if(Math.abs(t/0.5-Math.round(t/0.5))<1e-6) tr.push({t,T,f:m/mOp});
    T+=(Ql-m*cp*(T-Ts))/(Mr*cp)*dt; peak=Math.max(peak,T);
  }
  return {peak,tr};
}

function rackStudy(p,i){
  const f=FLUIDS[i.fluid], Q=p.P, Ql=Q*p.liq, Qa=Q-Ql, Ts=Math.min(i.Ts,p.TsMax), Tr=p.TrMax, cp=f.cp;
  const mReq=Ql/(cp*(Tr-Ts)), Freq=lpm(mReq,f);                   // flow that holds the return at the limit
  const mOp=mReq*(1+i.margin), Fop=lpm(mOp,f), TrOp=Ts+Ql/(mOp*cp);  // operating flow with the margin
  const Mr=i.Vrack*f.rho/1000, idle=i.idle, r={Ql,cp,mOp,Mr,Ts,idle};
  const air=Qa/(1.2*1.006*i.dTair)*3600;                            // m³/h of air for the air share

  // 1. load jump: lowest idle flow that keeps the return at or below the limit while the CDU responds
  const tEnd=Math.max(60,3*i.tCDU), ok=fm=>loadJump(r,fm,i.tCDU,tEnd).peak<=Tr+1e-3;
  const lo=Math.max(idle*mReq/mOp*(1+1e-6), p.minLpm?p.minLpm/Fop:0, 0.05);   // idle heat (and the vendor minimum) need this
  let fSafe; if(ok(lo)) fSafe=lo; else { let a=lo,b=1; for(let n=0;n<30;n++){ const c=(a+b)/2; if(ok(c)) b=c; else a=c; } fSafe=b; }
  const fFollow=Math.max(lo,idle);                                   // flow that simply follows the idle heat
  const jumpFollow=loadJump(r,fFollow,i.tCDU,tEnd), jumpSafe=loadJump(r,fSafe,i.tCDU,tEnd);
  // time the chips run safely after the jump if the flow stayed at the idle-following value
  const m0=fFollow*mOp, Tss=Ts+Ql/(m0*cp), T0=Ts+Ql*idle/(m0*cp), tau=Mr/m0;
  const tNoResp=Tss<=Tr?Infinity:-tau*Math.log((Tss-Tr)/(Tss-T0));

  // 2. plant reset: no cooling for the reset time; the loop water (pipes plant ⇄ CDU, CDU, rack) absorbs the heat
  const tRT=2*i.pipeL/i.vel;                                         // round trip in the facility pipes, s
  const Mloop=(mOp*tRT)+i.Vcdu*f.rho/1000+Mr;                        // kg of water per rack in the loop
  const rise=Ql/(Mloop*cp);                                          // K per second with no cooling
  const head=Tr-TrOp;                                                // return headroom at the operating flow
  const tReset=i.resetMin*60, tSafeReset=head/rise;
  const bufL=tSafeReset>=tReset?0:Math.max(0,Ql*tReset/(cp*head)-Mloop)/f.rho*1000;   // extra water per rack
  const TsRide=Tr-(Ql/(mOp*cp))-Ql*tReset/(Mloop*cp);               // supply that rides through without a buffer
  const resetTrace=[]; for(let k=0;k<=40;k++){ const t=k*Math.max(tReset,tSafeReset)*1.2/40; resetTrace.push({t:t/60,T:TrOp+rise*Math.min(t,tReset)}); }

  // 3. CDU pump trip: no flow; the rack coolant absorbs the heat
  const tPump=head*Mr*cp/Ql;
  const pumpTrace=[]; for(let k=0;k<=40;k++){ const t=k*Math.max(4*tPump,10)/40; pumpTrace.push({t,T:TrOp+Ql*t/(Mr*cp)}); }

  // response chain
  const chain=[{k:'Rack',d:'coolant in the cold plates and manifolds',t:Mr/mOp},{k:'CDU',d:'sensing, control and pump ramp',t:i.tCDU},
    {k:'Pipes',d:'round trip plant ⇄ CDU',t:tRT},{k:'Plant',d:'chiller reset',t:tReset}];
  return {p,f,Q,Ql,Qa,Ts,Tr,Freq,Fop,TrOp,air,fSafe,FSafe:fSafe*Fop,fFollow,jumpFollow,jumpSafe,tNoResp,
    tRT,Mloop,rise,head,tReset,tSafeReset,bufL,TsRide,resetTrace,tPump,pumpTrace,chain};
}
