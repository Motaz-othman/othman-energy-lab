// ---------- shared UI helpers for all calculators (load after Chart.js, before the calculator scripts) ----------
const $=id=>document.getElementById(id);
const fmt=(v,d=0)=>(+v).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pct(arr,q){ const s=[...arr].sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor(q*s.length))]; }
const kpis=k=>k.map(([v,l])=>`<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
function table(head,rows){ return `<div style="overflow-x:auto"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`; }

// ---------- charts (Chart.js); every chart is skipped when Chart.js is unavailable ----------
const charts={};
function baseOpts(){
  const tx=css('--text2'), gr=css('--border');
  return {responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false},tooltip:{intersect:false}},
    scales:{x:{grid:{display:false},ticks:{color:tx}},y:{grid:{color:gr},border:{display:false},ticks:{color:tx}}}};
}
function mk(id,cfg){ if(!window.Chart) return; if(charts[id]) charts[id].destroy(); charts[id]=new Chart($(id),cfg); }
function hbar(id,labels,data,unit,d){
  const o=baseOpts(); o.indexAxis='y';
  o.scales.x={grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:unit,color:css('--text2')},beginAtZero:true};
  o.scales.y={grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={callbacks:{label:c=>`${fmt(c.raw,d)} ${unit}`}};
  mk(id,{type:'bar',data:{labels,datasets:[{data,backgroundColor:labels.map((l,i)=>i===0?css('--s1'):css('--grey')),borderRadius:4,barThickness:16}]},options:o});
}
