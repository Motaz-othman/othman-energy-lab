const SYS={acc:{},accfc:{},adia:{},hyb:{},wcc:{}};

// ---------- schematic: one panel per loop (liquid / air cooling), piping as in the energy model ----------
// water-cooled: outdoor heat rejection -> condenser water, in parallel to the plate HX and the chiller condensers, common return;
//   loop: IT return -> plate HX (free cooling) -> chiller evaporators -> buffer tank -> pumps -> supply to IT
// air-cooled: loop return -> (dry coolers, direct) -> chiller evaporators -> tank -> pumps -> supply; condenser fans reject to outdoor air
function schematic(id){
  const s=SYS[id], r=RES[id], d=DES[id], ac=id==='acc'||id==='accfc', W=430, G=24, H=446;
  const loops=P.loops.map((L,i)=>({L,i})).filter(x=>x.L.Q>0);
  const t=(x,y,txt,c='',a='middle')=>`<text class="${c}" x="${x}" y="${y}" text-anchor="${a}">${txt}</text>`;
  const box=(x,y,w,h,lines,c='bx')=>`<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`
    +lines.map((l,k)=>t(x+w/2,y+(h-(lines.length-1)*15)/2+4+k*15,l,k?'t2':'')).join('');
  const pipe=(d,c)=>`<path class="pipe ${c}" d="${d}" marker-end="url(#ar-${c})"/>`;
  const line=(d,c)=>`<path class="pipe ${c}" d="${d}"/>`;
  const hx=P.aHX;
  const pmp=(x,y)=>`<circle class="pump" cx="${x}" cy="${y}" r="8"/><path class="pumpv" d="M${x-4} ${y-5}L${x+6} ${y}L${x-4} ${y+5}z"/>`;
  const heatRej={
    wcc:['Cooling towers (shared by both loops)'],
    adia:['Adiabatic coolers (shared by both loops)'],
  };
  const panel=({L,i},k)=>{
    const liquid=L.name==='LC', u=d.units.find(x=>x.loop===L.name)||{N:0,unit:0};
    // design pump power, kW (same equations as the energy model)
    const kPri=pumpK(P.dpPri,L.Tr-L.Ts,P.etaP)*L.Qd, kSec=pumpK(P.dpSec,L.Tr-L.Ts,P.etaP)*L.Qd, kTerm=termShare(L,P)*L.Qd;
    const kCW=pumpK(P.dpCW,P.rangeCW,P.etaP)*((P.des&&P.des[id]&&P.des[id][L.name])?P.des[id][L.name].Qr:0);
    let g=t(0,16,liquid?'Liquid cooling loop':'Air cooling loop','h','start')
      ;
    g+=`<rect class="zone" x="0" y="40" width="${W}" height="80" rx="8"/>`+t(10,115,'Outdoors','t2','start');
    // loop end: chiller evaporators -> tank -> pumps -> supply to IT; IT return
    const chil=ac?box(240,150,170,82,['Air-cooled chillers'])
      :box(240,140,170,36,['Chiller condensers'])+box(240,192,170,50,['Chiller evaporators']);
    g+=chil;
    if(!ac) g+=`<path class="refr" d="M325 176V192"/>`+t(332,188,'compressors','t2','start');
    const evapY=ac?191:217, evapB=ac?232:242;
    g+=box(260,264,130,34,['Buffer tank'],'bx tes');
    g+=pipe(`M325 ${evapB}V262`,'sup')+line('M325 298V318','sup');
    g+=pmp(325,326)+t(338,324,'secondary pumps','t2','start');
    g+=pipe('M325 334V376H312','sup')+t(333,360,'Supply','t2','start');
    g+=box(120,352,190,50,[liquid?'Liquid-cooled IT (CDUs)':'Air-cooled IT (fan wall units)'],'bx it');
    g+=liquid?pmp(130,424)+t(144,428,'CDU pumps','t2','start'):t(120,428,'FWU fans','t2','start');
    if(ac){
      g+=box(240,58,170,48,['Air-cooled condensers'])+`<path class="heat" d="M325 150V108" marker-end="url(#ar-heat)"/>`+t(332,132,'heat to air','t2','start');
      if(id==='accfc'){
        g+=box(20,58,170,48,['Dry coolers (on the loop)']);
        g+=pipe('M120 377H105V108','ret')+t(112,262,'Return','t2','start')+pmp(105,318)+t(117,322,'primary pumps','t2','start');
        g+=pipe(`M190 92H215V${evapY}H238`,'ret')+t(222,140,'free cooling','t2','start');
      } else {
        g+=pipe(`M120 377H105V${evapY}H238`,'ret')+t(112,262,'Return','t2','start')+pmp(105,318)+t(117,322,'primary pumps','t2','start');
      }
    } else {
      // outdoor heat rejection (hybrid: dry coolers then towers, in series)
      if(id==='hyb'){
        g+=box(20,58,180,48,['Dry coolers'])+box(230,58,180,48,['Cooling towers']);
        g+=pipe('M200 82H228','cw')+line('M8 50H422','cwr')+pipe('M110 50V56','cwr')+line('M320 106V128','cw')+pmp(320,117)+t(332,121,'CW pumps','t2','start');
      } else {
        const hr=heatRej[id]; g+=box(20,58,390,48,hr);
        g+=line('M8 50H422','cwr')+pipe('M215 50V56','cwr')+line('M215 106V128','cw')+pmp(215,117)+t(227,121,'condenser pumps','t2','start');
      }
      // condenser water supply in parallel to the plate HX and the condensers; returns to the common header
      g+=line('M105 128H325','cw')+pipe('M105 128V148','cw')+pipe('M325 128V138','cw');
      g+=line('M20 180H8V50','cwr')+line('M410 158H422V50','cwr');
      g+=box(20,150,170,62,['Plate heat exchanger','free cooling']);
      // loop: return -> plate HX -> evaporators
      g+=pipe('M120 377H105V214','ret')+t(112,262,'Return','t2','start')+pmp(105,318)+t(117,322,'primary pumps','t2','start');
      g+=pipe(`M190 196H215V${evapY}H238`,'ret')+t(196,246,'pre-cooled','t2','start');
    }
    return `<g transform="translate(${k*(W+G)},0)">${g}</g>`;
  };
  const vw=loops.length*W+(loops.length-1)*G;
  const mk=(n,c)=>`<marker id="ar-${n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(${c})"/></marker>`;
  return `<div class="legend"><span><i style="background:var(--s2)"></i>Loop return (warm)</span><span><i style="background:var(--s1)"></i>Loop supply (cooled)</span>${ac?'':'<span><i style="background:var(--s3)"></i>Condenser water (dashed: return to outdoors)</span>'}<span><i style="background:var(--grey2)"></i>Heat to outdoor air</span></div>
<svg class="schem" viewBox="-2 0 ${vw+4} ${H}" style="--vw:${vw}" role="img" aria-label="Schematic of ${r.o.name}, one panel per cooling loop">
<defs>${mk('sup','--s1')}${mk('ret','--s2')}${mk('cw','--s3')}${mk('cwr','--s3')}${mk('heat','--grey2')}</defs>${loops.map(panel).join('')}</svg>`;
}
