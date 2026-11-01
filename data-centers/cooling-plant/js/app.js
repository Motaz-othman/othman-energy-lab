// ---------- Cooling Plant Selector: page logic ----------
let WX=null,RES=null,DES=null,RANK=null,P=null,LOOP=0,PICK=null;

const groups=[...new Set(CITIES.map(c=>c.g))];
groups.forEach(g=>{ const og=document.createElement('optgroup'); og.label=g; CITIES.filter(c=>c.g===g).forEach(c=>{const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; og.appendChild(o);}); $('city').appendChild(og); });
RATES.forEach(r=>{ const d=document.createElement('div'); d.innerHTML=`<label>${r.l}</label><div class="row"><input type="number" id="rl_${r.id}" value="${r.lo}" step="5" min="0" aria-label="${r.l} low"><input type="number" id="rh_${r.id}" value="${r.hi}" step="5" min="0" aria-label="${r.l} high"></div>`; $('rates').appendChild(d); });

function params(){
  // blank field falls back to its default; design dry-bulb / wet-bulb default is blank = auto
  const g=id=>{ const v=parseFloat($(id).value); return isNaN(v)?parseFloat($(id).defaultValue):v; };
  const Qd=g('it')*1000, lf=Math.min(1,Math.max(0.1,g('lf')/100)), lcp=Math.min(100,Math.max(0,g('lcp')))/100;
  $('airShare').textContent=`(${fmt((1-lcp)*100)}% of load)`;
  const loops=[
    {name:'LC',Ts:g('lcs'),Tr:Math.max(g('lcr'),g('lcs')+1),Qd:Qd*lcp,Q:Qd*lcp*lf},
    {name:'Air',Ts:g('acs'),Tr:Math.max(g('acr'),g('acs')+1),Qd:Qd*(1-lcp),Q:Qd*(1-lcp)*lf}];
  const rates={}; RATES.forEach(r=>rates[r.id]={lo:g('rl_'+r.id),hi:g('rh_'+r.id)});
  return {Qd,lf,loops,water:$('water').value,copA:g('copA'),copW:g('copW'),nCh:Math.max(1,Math.round(g('nCh'))),copMax:g('copMax'),acMax:g('acMax'),wcMax:g('wcMax'),dbIn:g('dbD'),wbIn:g('wbD'),
    aDC:g('aDC'),aCT:g('aCT'),aHX:g('aHX'),eAD:g('eAD'),swAD:g('swAD'),coc:Math.max(1.5,g('coc')),pump:g('pump')/100,cwp:g('cwp')/100,fanT:g('fanT')/100,cduP:g('cduP')/100,
    tE:g('tE'),tW:g('tW'),tD:g('tD'),
    red:g('red')/100,ups:Math.min(1,Math.max(0.5,g('ups')/100)),dloss:Math.min(0.3,Math.max(0,g('dloss')/100)),rates,...Object.fromEntries(WEIGHTS.map(w=>[w.id,w.v]))};
}
function loadCity(){ WX=synthYear(CITIES.find(c=>c.id===$('city').value)); run(); }

function run(){
  if(!WX) return;
  P=params(); P.dbD=isNaN(P.dbIn)?Math.max(...WX.T):P.dbIn; P.wbD=isNaN(P.wbIn)?Math.max(...WX.Twb):P.wbIn; P.wbD=Math.min(P.wbD,P.dbD);
  RES=simulate(WX,P); DES=designCheck(P,P.dbD,P.wbD); RANK=score(RES,P);
  renderReco(); renderOverview(); renderDes(); renderSystem(); renderEff(); renderCons(); renderRun(); renderCap(); renderClimate();
}
const order=()=>[...RANK,...OPTIONS.map(o=>o.id).filter(id=>!RANK.includes(id))];
const sel=()=>PICK||RANK[0]||OPTIONS[0].id;   // system shown in the Systems tab: user's pick, else the recommendation
const tag=(id,i)=>RES[id].excluded?`<span class="tag x">${RES[id].excluded}</span>`:(i===0?'<span class="tag ok">Recommended</span>':'');
const loopTxt=(arr)=>P.loops.map((L,i)=>L.Q>0?fmt(arr[i]):'–').join(' / ');
// basis label for peaks (annual figures are at the frequent load, stated in the notes)
const atPk='100% load';
const costTxt=r=>`${fmt(r.capLo/1e6,1)}–${fmt(r.capHi/1e6,1)} M$`;
const runTxt=r=>`${fmt(r.run/1e6,2)} M$/yr`;
// simple payback of extra initial cost against air-cooled chillers, from the running cost saved
function payback(r){
  const b=RES.acc, save=b.run-r.run, extra=r.capMid-b.capMid;
  if(r.o.id==='acc') return {txt:'baseline',save:0};
  if(save<=0) return {txt:'no saving',save};
  if(extra<=0) return {txt:'immediate',save};
  return {txt:`${fmt(extra/save,1)} years`,save};
}

function renderReco(){
  const banners=(WX.synthetic?'<div class="banner">Approximate weather generated from monthly normals. Upload an EPW file for design-grade results.</div>':'')
    +(window.Chart?'':'<div class="banner">Charts could not load (no internet connection). Tables and results below are complete.</div>');
  const head=`<div class="sub">For <b>${esc(WX.name)}</b>: ${fmt(P.Qd/1000,1)} MW hall, liquid loop ${P.loops[0].Ts}/${P.loops[0].Tr} °C, air loop ${P.loops[1].Ts}/${P.loops[1].Tr} °C</div>`;
  // extreme ambient: the design condition every system is checked against
  const src=isNaN(P.dbIn)||isNaN(P.wbIn)?'hottest hours in the weather data':'entered design values';
  const amb=`<div class="amb"><span class="al">Extreme ambient</span>
    <span class="av"><i style="background:var(--s1)"></i>Dry-bulb <b>${fmt(P.dbD,1)} °C</b></span>
    <span class="av"><i style="background:var(--s2)"></i>Wet-bulb <b>${fmt(P.wbD,1)} °C</b></span>
    <span class="an">Design condition, from ${src}</span></div>`;
  const top=RANK.length?'':'<div class="sub" style="margin-top:4px"><b>No system meets every constraint.</b> Try allowing water, raising the loop supply temperatures, or checking the design conditions and chiller limits.</div>';
  // one summary card per system, recommended first
  const lines=[['Electricity',r=>r.E,r=>`${fmt(r.E/1000,1)} GWh/yr`],['Annual PUE',r=>r.pue,r=>r.pue.toFixed(3)],[`Electrical peak <small>cooling, ${atPk}</small>`,r=>r.peak,r=>`${fmt(r.peak/1000,2)} MW`],['Water',r=>r.W,r=>`${fmt(r.W)} m³/yr`],[`Water peak <small>${atPk}</small>`,r=>r.Wpeak,r=>`${fmt(r.Wpeak,1)} m³/h`],['Running cost',r=>r.run,runTxt],['Initial cost',r=>r.capMid,costTxt]];
  const bestV=lines.map(([,v])=>RANK.length?Math.min(...RANK.map(i=>v(RES[i]))):null);
  const cards=order().map(id=>{ const r=RES[id], k=RANK.indexOf(id);
    const status=r.excluded?`<span class="tag x">${r.excluded}</span>`:k===0?'<span class="tag ok">Recommended</span>':`<span class="tag">#${k+1}</span>`;
    const notes=[id==='acc'?'No free cooling':`Free cooling ${loopTxt(r.free)} h/yr (liquid / air)`];
    if(id!=='acc') notes.push(`Saves ${fmt(Math.max(0,RES.acc.E-r.E)/1000,1)} GWh/yr vs air-cooled chillers`);
    return `<div class="scard${k===0?' rec':''}${r.excluded?' off':''}">
      <div class="stop">${status}${r.excluded?'':`<span class="note">score ${fmt(r.score)}</span>`}</div>
      <div class="sname">${r.o.name}</div>
      <dl>${lines.map(([l,v,t],j)=>`<div class="${!r.excluded&&v(r)<=bestV[j]*(1+1e-6)+1e-9?'hi':''}"><dt>${l}</dt><dd>${t(r)}</dd></div>`).join('')}</dl>
      <ul>${notes.map(n=>`<li>${n}</li>`).join('')}</ul>
      <button class="link" data-sys="${id}">See system →</button></div>`; });
  $('reco').innerHTML=`${banners}${head}${amb}${top}<div class="scards">${cards.join('')}</div>`;
}

function renderOverview(){
  const sumF=r=>r.free.reduce((a,b)=>a+b,0);
  const cols=[
    {h:'Electricity GWh/yr',v:r=>r.E/1000,d:1,lo:true},
    {h:'Annual MLC',v:r=>r.mlc,d:3,lo:true},
    {h:'Annual PUE',v:r=>r.pue,d:3,lo:true},
    {h:`Electrical peak MW (cooling, ${atPk})`,v:r=>r.peak/1000,d:2,lo:true},
    {h:'Water m³/yr',v:r=>r.W,d:0,lo:true},
    {h:`Water peak m³/h (${atPk})`,v:r=>r.Wpeak,d:1,lo:true},
    {h:'Running cost M$/yr',v:r=>r.run/1e6,d:2,lo:true},
    {h:'Initial cost M$',v:r=>r.capMid,lo:true,txt:r=>`${fmt(r.capLo/1e6,1)}–${fmt(r.capHi/1e6,1)}`},
    {h:'Free-cooling h (LC / air)',v:sumF,lo:false,txt:r=>loopTxt(r.free)}];
  const bestV=cols.map(c=>RANK.length?(c.lo?Math.min:Math.max)(...RANK.map(i=>c.v(RES[i]))):null);
  const rows=order().map(id=>{ const r=RES[id], k=RANK.indexOf(id);
    return `<tr class="click${k===0?' best':''}" data-sys="${id}"><td>${k>=0?k+1:'–'}</td><td>${r.o.name}${tag(id,k)}</td>
      <td>${r.excluded?'–':`<span class="sbar" style="width:${Math.max(2,r.score*0.5)}px"></span>${fmt(r.score)}`}</td>
      ${cols.map((c,j)=>{ const v=c.v(r), hi=!r.excluded&&Math.abs(v-bestV[j])<=Math.abs(bestV[j])*1e-6+1e-9;
        return `<td class="${hi?'hi':''}">${c.txt?c.txt(r):fmt(v,c.d)}</td>`; }).join('')}</tr>`; });
  $('tOv').innerHTML=table(['#','Option','Score (0–100)',...cols.map(c=>c.h)],rows);
}

function renderDes(){
  const rows=order().map(id=>{ const r=RES[id], d=DES[id];
    return `<tr><td>${r.o.name}</td><td>${d.ok?'<span class="tag ok">Holds supply</span>':'<span class="tag x">Fails</span>'}</td><td>${fmt(d.P/1000,2)}</td><td>${d.ratio.toFixed(3)}</td><td>${fmt(d.W,1)}</td><td>${fmt(d.Qr/1000,1)}</td><td class="l">${d.issues.join('; ')||'–'}</td></tr>`; });
  $('tDes').innerHTML=table(['Option','Result','Electrical MW','kW/kW','Water m³/h','Heat rejection MW','Notes'],rows);
  const auto=isNaN(P.dbIn)||isNaN(P.wbIn);
  $('desNote').textContent=`Checked at 100% load, ${fmt(P.dbD,1)} °C dry-bulb and ${fmt(P.wbD,1)} °C wet-bulb${auto?' (from the weather data; enter ASHRAE extreme values for design)':''}. Heat rejection capacity = cooling load + compressor power. Options that fail are excluded from the recommendation.`;
}

function renderSystem(){
  const id=sel(), r=RES[id], d=DES[id], s=SYS[id], k=RANK.indexOf(id);
  $('sysSeg').innerHTML=OPTIONS.map(o=>{ const j=RANK.indexOf(o.id);
    return `<button data-sys="${o.id}" class="${o.id===id?'on':''}"><span class="rk">${j>=0?j+1:'✕'}</span>${o.short}</button>`; }).join('');
  const status=r.excluded?`<span class="tag x">${r.excluded}</span>`:k===0?'<span class="tag ok">Recommended</span>':`<span class="tag">Rank ${k+1} of ${RANK.length}</span>`;
  $('sysHead').innerHTML=`<h2>${r.o.name}</h2>${status}${r.excluded?'':`<span class="note">score ${fmt(r.score)}</span>`}`;
  $('sysHow').textContent=s.how;
  $('sysSvg').innerHTML=schematic(id);
  $('sysKpi').innerHTML=kpis([[`${fmt(r.E/1000,1)} GWh`,'Cooling electricity per year'],[r.mlc.toFixed(3),'Annual MLC (kW/kW)'],[r.pue.toFixed(3),'Annual PUE (incl. losses)'],
    [`${fmt(r.peak/1000,2)} MW`,`Electrical peak, cooling plant (${atPk})`],[`${fmt(r.Wpeak,1)} m³/h`,`Water peak, make-up (${atPk})`],
    [`${fmt(r.W)} m³`,'Water per year'],[runTxt(r),'Running cost, cooling'],[costTxt(r),'Initial cost (estimate)'],[payback(r).txt,'Payback vs air-cooled chillers'],[`${fmt(d.Qr/1000,1)} MW`,'Heat rejection at design']]);
  $('sysDes').innerHTML=d.ok?`Design day (${fmt(P.dbD,1)} °C db / ${fmt(P.wbD,1)} °C wb): holds supply temperature, ${fmt(d.P/1000,2)} MW mechanical power.`
    :`<span class="tag x">Fails design day</span> ${d.issues.join('; ')}`;
  // annual operating mode per loop
  $('sysModes').innerHTML=P.loops.map((L,i)=>{ if(L.Q<=0) return '';
    const seg=[['Free cooling',r.free[i],'--s3'],['Partial',r.part[i],'--s1'],['Chiller only',r.mech[i],'--s2']].filter(x=>x[1]>0);
    return `<div class="mode"><div class="ml"><b>${i?'Air':'Liquid'} loop</b> ${L.Ts}/${L.Tr} °C</div>
      <div class="mbar">${seg.map(([l,v,c])=>`<span style="flex:${v};background:var(${c})" title="${l}: ${fmt(v)} h/yr"></span>`).join('')}</div>
      <div class="mv">${seg.map(([l,v])=>`${l} <b>${fmt(v)} h</b> (${fmt(v/87.6)}%)`).join(' · ')}</div></div>`; }).join('');
  // equipment and cost
  const cap=P.Qd*(1+P.red);
  $('sysComp').innerHTML=table(['Component','Role','Sized MW','Cost M$'],r.o.comp.map(c=>{ const rt=P.rates[c];
    return `<tr><td>${RATES.find(x=>x.id===c).l}</td><td class="l">${ROLE[c](r.o)}</td><td>${fmt(cap/1000,1)}</td><td>${fmt(cap*rt.lo/1e6,1)}–${fmt(cap*rt.hi/1e6,1)}</td></tr>`; }));
  $('compNote').textContent=`Each component sized for ${fmt(P.Qd/1000,1)} MW load + ${fmt(P.red*100)}% redundancy. Pumps, CDUs, piping and controls are not included.`;
  $('sysPros').innerHTML=`<h3>Strengths</h3><ul>${s.pros.map(x=>`<li>${x}</li>`).join('')}</ul><h3>Watch-outs</h3><ul>${s.cons.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  renderMonthly();
}

function renderEff(){
  const rows=order().map((id,i)=>{ const r=RES[id]; return `<tr class="${i===0&&!r.excluded?'best':''}"><td>${r.o.name}${tag(id,i)}</td><td>${r.mlc.toFixed(3)}</td><td>${r.peakRatio.toFixed(3)}</td><td>${r.cop?r.cop.toFixed(1):'–'}</td><td>${loopTxt(r.free)}</td><td>${loopTxt(r.mech)}</td></tr>`; });
  $('tEff').innerHTML=table(['Option','Annual MLC','Peak kW/kW','Avg chiller COP','Free-cooling h (LC / air)','Chiller-only h (LC / air)'],rows);
  const ids=RANK;
  $('effTitle').textContent=ids.length?`Annual MLC: ${RES[ids[0]].o.short} ${RES[ids[0]].mlc.toFixed(3)} kW/kW`:'Annual MLC';
  hbar('cEff',ids.map(id=>RES[id].o.short),ids.map(id=>RES[id].mlc),'kW per kW of cooling',3);
}

function renderCons(){
  const rows=order().map((id,i)=>{ const r=RES[id]; return `<tr class="${i===0&&!r.excluded?'best':''}"><td>${r.o.name}${tag(id,i)}</td><td>${fmt(r.E)}</td><td>${fmt(r.Ec)}</td><td>${fmt(r.Ef)}</td><td>${fmt(r.Ep)}</td><td>${fmt(r.Et)}</td><td>${fmt(r.Eloss)}</td><td>${r.pue.toFixed(3)}</td><td>${fmt(r.peak/1000,2)}</td><td>${fmt(r.W)}</td><td>${fmt(r.Wpeak,1)}</td></tr>`; });
  $('tCons').innerHTML=table(['Option','Cooling MWh/yr','Chillers','Heat-rejection fans','Pumps','CRAH / FWU / CDU','Electrical losses MWh/yr','Annual PUE',`Electrical peak MW (cooling, ${atPk})`,'Water m³/yr',`Water peak m³/h (${atPk})`],rows);
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y'; o.scales.x={stacked:true,grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'MWh/yr',color:css('--text2')}};
  o.scales.y={stacked:true,grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} MWh`}};
  const ds=(lab,k,col,last)=>({label:lab,data:ids.map(id=>RES[id][k]),backgroundColor:col,borderColor:css('--surface'),borderWidth:{right:2},barThickness:18,borderRadius:last?{topRight:4,bottomRight:4}:0});
  mk('cEl',{type:'bar',data:{labels,datasets:[ds('Chiller compressors','Ec',css('--s1')),ds('Heat-rejection fans','Ef',css('--s4')),ds('Pumps','Ep',css('--grey2')),ds('CRAH / FWU fans + CDU pumps','Et',css('--s2'),true)]},options:o});
  $('elTitle').textContent=ids.length?`Annual electricity: lowest ${fmt(Math.min(...ids.map(i=>RES[i].E))/1000,1)} GWh/yr`:'Annual electricity';
  const zeroW=ids.filter(i=>RES[i].W<1).length;
  $('wTitle').textContent=zeroW?`Annual water: ${zeroW} option${zeroW>1?'s':''} use none`:'Annual water';
  hbar('cW',labels,ids.map(id=>RES[id].W),'m³/yr',0);
}

function renderRun(){
  const rows=order().map((id,i)=>{ const r=RES[id], pb=payback(r);
    return `<tr class="${i===0&&!r.excluded?'best':''}"><td>${r.o.name}${tag(id,i)}</td><td>${fmt(r.costE/1e3)}</td><td>${fmt(r.costW/1e3)}</td><td>${fmt(r.costD/1e3)}</td><td>${fmt(r.run/1e3)}</td><td>${id==='acc'?'–':fmt(pb.save/1e3)}</td><td>${pb.txt}</td></tr>`; });
  $('tRun').innerHTML=table(['Option','Electricity k$/yr','Water k$/yr','Demand k$/yr','Total k$/yr','Saving vs air-cooled k$/yr','Simple payback'],rows);
  $('runNote').textContent=`Cooling only (not IT electricity), at the frequent load. Tariffs: electricity ${P.tE} $/kWh, water ${P.tW} $/m³, demand ${P.tD} $/kW per month on the cooling peak. Simple payback = extra initial cost (mid estimate) over air-cooled chillers ÷ running cost saved; no discounting, maintenance or tariff escalation.`;
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y'; o.scales.x={stacked:true,grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'k$/yr',color:css('--text2')},beginAtZero:true};
  o.scales.y={stacked:true,grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} k$/yr`}};
  const ds=(lab,k,col,last)=>({label:lab,data:ids.map(id=>RES[id][k]/1e3),backgroundColor:col,borderColor:css('--surface'),borderWidth:{right:2},barThickness:18,borderRadius:last?{topRight:4,bottomRight:4}:0});
  mk('cRun',{type:'bar',data:{labels,datasets:[ds('Electricity','costE',css('--s1')),ds('Water','costW',css('--s3')),ds('Demand charge','costD',css('--s4'),true)]},options:o});
  $('runTitle').textContent=ids.length?`Annual running cost: lowest ${fmt(Math.min(...ids.map(i=>RES[i].run))/1e6,2)} M$/yr`:'Annual running cost';
}

function renderCap(){
  const rows=order().map((id,i)=>{ const r=RES[id]; return `<tr class="${i===0&&!r.excluded?'best':''}"><td>${r.o.name}${tag(id,i)}</td><td class="l">${r.capParts.map(c=>RATES.find(x=>x.id===c).l).join(' + ')}</td><td>${fmt(r.capLo/1e6,1)}–${fmt(r.capHi/1e6,1)}</td><td>${fmt(r.capLo/P.Qd)}–${fmt(r.capHi/P.Qd)}</td></tr>`; });
  $('tCap').innerHTML=table(['Option','Components','Estimate M$','$ per kW of load'],rows);
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y';
  o.scales.x={grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'M$ (low – high)',color:css('--text2')},beginAtZero:true};
  o.scales.y={grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={callbacks:{label:c=>`${fmt(c.raw[0],1)} – ${fmt(c.raw[1],1)} M$`}};
  mk('cCap',{type:'bar',data:{labels,datasets:[{data:ids.map(id=>[RES[id].capLo/1e6,RES[id].capHi/1e6]),backgroundColor:ids.map((id,i)=>i===0?css('--s1'):css('--grey')),borderRadius:4,borderSkipped:false,barThickness:16}]},options:o});
  $('capTitle').textContent=ids.length?`Estimated initial cost: ${costTxt(RES[ids[0]])} for the recommended option`:'Estimated initial cost range';
}

function renderMonthly(){
  const id=sel(), r=RES[id], M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], sc=8760/WX.T.length, L=P.loops[LOOP];
  $('mTitle').textContent=`Monthly operating hours, ${LOOP===0?'liquid':'air'} loop (${L.Ts}/${L.Tr} °C)`;
  const o=baseOpts(); o.scales.x.stacked=true; o.scales.y.stacked=true; o.scales.y.title={display:true,text:'hours',color:css('--text2')};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} h`}};
  mk('cM',{type:'bar',data:{labels:M,datasets:[
    {label:'Free cooling',data:r.mFree[LOOP].map(v=>v*sc),backgroundColor:css('--s3'),borderColor:css('--surface'),borderWidth:{top:2}},
    {label:'Partial',data:r.mPart[LOOP].map(v=>v*sc),backgroundColor:css('--s1'),borderColor:css('--surface'),borderWidth:{top:2}},
    {label:'Chiller only',data:r.mMech[LOOP].map(v=>v*sc),backgroundColor:css('--s2'),borderColor:css('--surface'),borderWidth:{top:2},borderRadius:{topLeft:4,topRight:4}}]},options:o});
}

let CLDEV='dc';   // basis for the climate charts: dry coolers (dry-bulb) or cooling towers (wet-bulb)
function renderClimate(){
  $('clKpi').innerHTML=kpis([[`${fmt(pct(WX.T,0.996),1)} °C`,'Dry-bulb, 0.4% exceeded'],[`${fmt(P.dbD,1)} °C`,'Design dry-bulb'],[`${fmt(pct(WX.Twb,0.996),1)} °C`,'Wet-bulb, 0.4% exceeded'],[`${fmt(P.wbD,1)} °C`,'Design wet-bulb']]);
  const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], sc=8760/WX.T.length, dc=CLDEV==='dc';
  const appr=dc?P.aDC:P.aCT+P.aHX;                         // water leaves the outdoor device at outdoor temp + approach
  const outT=h=>(dc?WX.T[h]:WX.Twb[h])+appr;
  // monthly temperature summary for the tooltips
  const ms=M.map(()=>({n:0,db:0,wb:0,dbx:-99,wbx:-99}));
  WX.T.forEach((t,h)=>{ const m=ms[WX.mon[h]]; m.n++; m.db+=t; m.wb+=WX.Twb[h]; m.dbx=Math.max(m.dbx,t); m.wbx=Math.max(m.wbx,WX.Twb[h]); });
  const tip=i=>{ const m=ms[i]; return m.n?[`Dry-bulb mean ${fmt(m.db/m.n,1)} °C, max ${fmt(m.dbx,1)} °C`,`Wet-bulb mean ${fmt(m.wb/m.n,1)} °C, max ${fmt(m.wbx,1)} °C`]:[]; };
  P.loops.forEach((L,i)=>{
    const free=Array(12).fill(0), part=Array(12).fill(0), none=Array(12).fill(0);
    WX.T.forEach((t,h)=>{ const o=outT(h), m=WX.mon[h]; if(o<=L.Ts) free[m]+=sc; else if(o<L.Tr) part[m]+=sc; else none[m]+=sc; });
    const tot=a=>a.reduce((x,y)=>x+y,0);
    $('clTitle'+i).textContent=`${i?'Air cooling loop (AC)':'Liquid cooling loop (LC)'}, ${L.Ts}/${L.Tr} °C`;
    $('clSub'+i).textContent=`Free cooling ${fmt(tot(free))} h/yr · partial ${fmt(tot(part))} h · chiller only ${fmt(tot(none))} h. Free below ${fmt(L.Ts-appr,1)} °C ${dc?'dry-bulb':'wet-bulb'}, partial below ${fmt(L.Tr-appr,1)} °C.`;
    const o=baseOpts(); o.scales.x.stacked=true; o.scales.y.stacked=true; o.scales.y.max=750; o.scales.y.title={display:true,text:'hours',color:css('--text2')};
    o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} h`,footer:c=>tip(c[0].dataIndex)}};
    mk('cCl'+i,{type:'bar',data:{labels:M,datasets:[
      {label:'Free cooling',data:free,backgroundColor:css('--s3'),borderColor:css('--surface'),borderWidth:{top:2}},
      {label:'Partial',data:part,backgroundColor:css('--s1'),borderColor:css('--surface'),borderWidth:{top:2}},
      {label:'Chiller only',data:none,backgroundColor:css('--s2'),borderColor:css('--surface'),borderWidth:{top:2},borderRadius:{topLeft:4,topRight:4}}]},options:o});
  });
  $('clNote').textContent=`Climate only, before choosing a system: hours each month when the outdoor ${dc?'dry-bulb':'wet-bulb'} + ${fmt(appr,1)} K approach (${dc?'dry cooler':'tower + plate HX'}) is below the loop supply temperature (free cooling) or below its return temperature (partial). Hover over a month for its temperatures. The Systems tab shows how each complete system actually runs.`;
}
document.querySelectorAll('#climSeg button').forEach(b=>b.onclick=()=>{ document.querySelectorAll('#climSeg button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); CLDEV=b.dataset.dev; renderClimate(); });

// result tabs
function showPane(p){
  document.querySelectorAll('#rtabs button').forEach(b=>{ const on=b.dataset.p===p; b.classList.toggle('on',on); b.setAttribute('aria-selected',on); b.tabIndex=on?0:-1; });
  document.querySelectorAll('.pane').forEach(el=>el.hidden=el.id!=='p-'+p);
  Object.values(charts).forEach(c=>c.resize());
}
function openSystem(id){ PICK=id; renderSystem(); showPane('sys'); }
$('rtabs').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) showPane(b.dataset.p); });
$('rtabs').addEventListener('keydown',e=>{ if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return;
  const bs=[...document.querySelectorAll('#rtabs button')], i=bs.indexOf(document.activeElement); if(i<0) return;
  const b=bs[(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length]; b.focus(); showPane(b.dataset.p); });
$('results').addEventListener('click',e=>{ const el=e.target.closest('[data-sys]'); if(el) openSystem(el.dataset.sys); });

// events
$('tabCity').onclick=()=>{ $('tabCity').classList.add('on'); $('tabFile').classList.remove('on'); $('cityPane').hidden=false; $('filePane').hidden=true; loadCity(); };
$('tabFile').onclick=()=>{ $('tabFile').classList.add('on'); $('tabCity').classList.remove('on'); $('cityPane').hidden=true; $('filePane').hidden=false; };
$('city').onchange=loadCity;
$('drop').onclick=()=>$('file').click();
['dragover','dragenter'].forEach(e=>$('drop').addEventListener(e,ev=>{ev.preventDefault();$('drop').style.borderColor=css('--brand');}));
$('drop').addEventListener('dragleave',()=>$('drop').style.borderColor='');
$('drop').addEventListener('drop',ev=>{ev.preventDefault();$('drop').style.borderColor=''; if(ev.dataTransfer.files[0]) readFile(ev.dataTransfer.files[0]);});
$('file').onchange=e=>{ if(e.target.files[0]) readFile(e.target.files[0]); };
function readFile(f){ const rd=new FileReader();
  rd.onload=()=>{ try{ const t=rd.result, epw=/\.epw$/i.test(f.name)||/^LOCATION,/.test(t);
    WX=epw?parseEPW(t):parseCSV(t); if(!epw) WX.name=f.name.replace(/\.[^.]+$/,'');
    $('fileInfo').innerHTML=`Loaded <b>${esc(WX.name)}</b>: ${fmt(WX.T.length)} hours.`; run(); } catch(err){ $('fileInfo').innerHTML=`<div class="err">${esc(err.message)}</div>`; } };
  rd.readAsText(f); }
// sample weather CSV in the upload format, generated from the city selected in the City tab
const sampleCity=()=>CITIES.find(c=>c.id===$('city').value);
const showSampleNote=()=>{ $('csvSampleNote').textContent=`8,760 hours for ${sampleCity().name} (the city selected in the City tab).`; };
$('csvSample').onclick=()=>{ const c=sampleCity(), url=URL.createObjectURL(new Blob([sampleCSV(c)],{type:'text/csv'}));
  const a=document.createElement('a'); a.href=url; a.download=`weather-sample-${c.id}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000); };
$('city').addEventListener('change',showSampleNote); showSampleNote();
document.querySelectorAll('#inputs input:not([type=file]), #inputs select:not(#city)').forEach(el=>el.addEventListener('input',run));
document.querySelectorAll('#loopSeg button').forEach(b=>b.onclick=()=>{ document.querySelectorAll('#loopSeg button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); LOOP=+b.dataset.l; renderMonthly(); });
if(window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',run);
showPane('ov');
loadCity();
