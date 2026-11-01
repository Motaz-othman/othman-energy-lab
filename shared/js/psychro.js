// ---------- psychrometrics (ASHRAE Fundamentals Ch.1, Hyland–Wexler) ----------
function pws(t){ // Pa
  const T=t+273.15;
  if(t>=0) return Math.exp(-5.8002206e3/T+1.3914993-4.8640239e-2*T+4.1764768e-5*T*T-1.4452093e-8*T*T*T+6.5459673*Math.log(T));
  return Math.exp(-5.6745359e3/T+6.3925247-9.677843e-3*T+6.2215701e-7*T*T+2.0747825e-9*T*T*T-9.484024e-13*T*T*T*T+4.1635019*Math.log(T));
}
const Wfrom=(pw,P)=>0.621945*pw/(P-pw);
const pAtm=z=>101325*Math.pow(1-2.25577e-5*z,5.2559);
function dewFromRH(T,rh){ const pw=Math.max(rh,1)/100*pws(T); let lo=-60,hi=T; for(let i=0;i<40;i++){const m=(lo+hi)/2; if(pws(m)>pw) hi=m; else lo=m;} return (lo+hi)/2; }
function wetBulb(t,td,P){
  if(td>=t) return t;
  const W=Wfrom(pws(td),P); let lo=td-1, hi=t;
  for(let i=0;i<32;i++){ const m=(lo+hi)/2, Ws=Wfrom(pws(m),P);
    const Wm=((2501-2.326*m)*Ws-1.006*(t-m))/(2501+1.86*t-4.186*m);
    if(Wm>W) hi=m; else lo=m; }
  return (lo+hi)/2;
}
