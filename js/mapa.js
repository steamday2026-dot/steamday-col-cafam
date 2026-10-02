/* =====================================================================
   STEAM Day Cafam · Mapa isométrico, cámara con zoom y animaciones de llegada
   Requiere avatar.js (avatarSVG, shade).
   Una "parada" (stop) tiene: {h, f, nombre, lugar, cat, tipo, salon, area, frase}
   ===================================================================== */
const AREA_C = {mat:'#2f6fde',cie:'#1f9d6b',tec:'#7b4bd6',gen:'#5b6577'};
const AREA_N = {mat:'Matemáticas',cie:'Ciencias Naturales',tec:'Tecnología',gen:'General'};
function fmtHora(h){ if(!h) return ''; let [a,b]=String(h).split(':').map(Number); const s=a>=12?'pm':'am'; if(a>12)a-=12; return `${a}:${String(b).padStart(2,'0')} ${s}`; }
function escHTML(t){ return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const colorDe = r => r.tipo==='pausa' ? '#e9a23b' : AREA_C[r.cat] || AREA_C.gen;
function isoBlock(cx,cy,w,d,h,col){
  const N_=[cx,cy-d/2],E=[cx+w/2,cy],S=[cx,cy+d/2],Wp=[cx-w/2,cy], up=p=>[p[0],p[1]-h], P=a=>a.map(p=>p.join(',')).join(' ');
  let s=`<ellipse cx="${cx+6}" cy="${cy+4}" rx="${w/2+4}" ry="${d/2+3}" fill="#000" opacity=".16"/>`;
  s+=`<polygon points="${P([Wp,S,up(S),up(Wp)])}" fill="${shade(col,.85)}"/>`;
  s+=`<polygon points="${P([S,E,up(E),up(S)])}" fill="${shade(col,.65)}"/>`;
  s+=`<polygon points="${P([up(N_),up(E),up(S),up(Wp)])}" fill="${shade(col,1.15)}"/>`;
  for(let k=1;k<=3;k++){ const t=k/4; // ventanas
    const x1=Wp[0]+(S[0]-Wp[0])*t, y1=Wp[1]+(S[1]-Wp[1])*t;
    s+=`<polygon points="${x1-2},${y1-h*0.7} ${x1+2},${y1-h*0.7+1} ${x1+2},${y1-h*0.35+1} ${x1-2},${y1-h*0.35}" fill="#e9f3ff" opacity=".85"/>`;
    const x2=S[0]+(E[0]-S[0])*t, y2=S[1]+(E[1]-S[1])*t;
    s+=`<polygon points="${x2-2},${y2-h*0.7+1} ${x2+2},${y2-h*0.7} ${x2+2},${y2-h*0.35} ${x2-2},${y2-h*0.35+1}" fill="#cfe2ff" opacity=".7"/>`; }
  return s;
}
function isoTree(x,y,s=1){ return `<ellipse cx="${x+4*s}" cy="${y+2}" rx="${9*s}" ry="${4*s}" fill="#000" opacity=".15"/><rect x="${x-1.5*s}" y="${y-8*s}" width="${3*s}" height="${8*s}" fill="#7a5233"/>
  <polygon points="${x},${y-30*s} ${x+10*s},${y-8*s} ${x-10*s},${y-8*s}" fill="#3f9b52"/><polygon points="${x},${y-30*s} ${x+10*s},${y-8*s} ${x},${y-8*s}" fill="#2f7d40"/>`; }
/* ================= ANIMACIONES DE LLEGADA ================= */
const TEMAS = {
  tec:{titulo:'Desastres naturales', sub:'¡Colombia en alerta, la tecnología en acción!', col:'#7b4bd6', dur:4800},
  mat:{titulo:'Biodiversidad', sub:'La naturaleza también cuenta: espirales, simetrías y patrones.', col:'#2f6fde', dur:4800},
  cie:{titulo:'Consecuencias', sub:'Lo que cambia en el planeta cuando cambia el clima.', col:'#1f9d6b', dur:4800}
};
const GOLD = 137.508*Math.PI/180;
function animSVG(t, r){
  if(t==='tec') return `
    <polygon points="120,150 210,105 120,60 30,105" fill="#a9d794"/><polygon points="120,150 210,105 210,112 120,157 30,112 30,105" fill="#86b872"/>
    <g class="a-shake">
      <polygon points="85,108 120,126 120,86 85,68" fill="#8e6be0"/><polygon points="120,126 155,108 155,68 120,86" fill="#6a45c4"/>
      <polygon points="85,68 120,86 155,68 120,50" fill="#b79cf2"/>
      <rect x="94" y="84" width="7" height="9" fill="#e9f3ff" transform="skewY(27)" transform-origin="94 84"/>
      <rect x="133" y="84" width="7" height="9" fill="#cfe2ff" transform="skewY(-27)" transform-origin="133 84"/>
      <path class="a-crack" d="M106,74 l4,8 l-5,6 l6,9 l-3,8" fill="none" stroke="#2b1d5c" stroke-width="2"/>
    </g>
    <path class="a-flood" d="M30,118 Q55,110 80,118 T130,118 T180,118 T210,118 L210,160 L30,160Z" fill="#4fa3d1" opacity=".75"/>
    <g class="a-pop" style="animation-delay:1.7s"><rect x="117" y="34" width="6" height="18" fill="#3a4253"/><circle cx="120" cy="32" r="5" fill="#f2a900"/></g>
    <circle class="a-ring" cx="120" cy="32" r="10" fill="none" stroke="#f2a900" stroke-width="2.5" style="animation-delay:2s"/>
    <circle class="a-ring" cx="120" cy="32" r="10" fill="none" stroke="#f2a900" stroke-width="2.5" style="animation-delay:2.5s"/>
    <circle class="a-ring" cx="120" cy="32" r="10" fill="none" stroke="#f2a900" stroke-width="2.5" style="animation-delay:3s"/>
    <g class="a-pop" style="animation-delay:2.8s"><path d="M185,40 l18,6 v12 c0,11 -8,18 -18,22 c-10,-4 -18,-11 -18,-22 v-12z" fill="#1f9d6b" stroke="#fff" stroke-width="2"/>
      <path d="M177,58 l6,6 l11,-12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>
    <g class="a-pop" style="animation-delay:.5s"><rect x="18" y="30" width="62" height="20" rx="10" fill="#e5484d"/><text x="49" y="44" text-anchor="middle" style="font-size:10px;fill:#fff;font-weight:800">¡ALERTA!</text></g>`;
  if(t==='mat'){
    let petals='', seeds='';
    for(let i=0;i<14;i++) petals+=`<g transform="rotate(${i*360/14} 95 88)"><ellipse class="a-petal" cx="95" cy="60" rx="7" ry="16" fill="${i%2?'#f2b705':'#ffcf3a'}" style="animation-delay:${.2+i*.06}s"/></g>`;
    for(let i=1;i<=90;i++){ const a=i*GOLD, rr=1.9*Math.sqrt(i); seeds+=`<circle class="a-seed" cx="${(95+rr*Math.cos(a)).toFixed(1)}" cy="${(88+rr*Math.sin(a)).toFixed(1)}" r="1.5" fill="${i%3?'#6b3e1f':'#8a5a2b'}" style="animation-delay:${1.1+i*.018}s"/>`; }
    return `<rect x="92" y="108" width="6" height="52" fill="#3f9b52"/><ellipse cx="80" cy="135" rx="14" ry="6" fill="#4caf50" transform="rotate(-30 80 135)"/>
      ${petals}<circle cx="95" cy="88" r="20" fill="#5a3314"/>${seeds}
      <line class="a-axis" x1="185" y1="30" x2="185" y2="120" stroke="#2f6fde" stroke-width="1.5" stroke-dasharray="4 4"/>
      <g class="a-fly">
        <path class="a-wl" d="M185,70 C165,40 145,50 152,72 C145,90 168,98 185,78Z" fill="#2f6fde"/><path class="a-wr" d="M185,70 C205,40 225,50 218,72 C225,90 202,98 185,78Z" fill="#2f6fde"/>
        <circle cx="166" cy="66" r="4" fill="#ffcf3a" class="a-wl"/><circle cx="204" cy="66" r="4" fill="#ffcf3a" class="a-wr"/>
        <rect x="183" y="58" width="4" height="26" rx="2" fill="#1b2333"/></g>
      <text class="a-num" x="150" y="150" style="animation-delay:2.4s">1</text><text class="a-num" x="162" y="150" style="animation-delay:2.6s">1</text>
      <text class="a-num" x="174" y="150" style="animation-delay:2.8s">2</text><text class="a-num" x="186" y="150" style="animation-delay:3s">3</text>
      <text class="a-num" x="198" y="150" style="animation-delay:3.2s">5</text><text class="a-num" x="210" y="150" style="animation-delay:3.4s">8</text>`;
  }
  if(t==='cie') return `
    <circle cx="95" cy="92" r="46" fill="#4fa3d1"/><path d="M62,70 q12,-10 22,2 q8,10 -4,18 q-10,6 -6,18 q-14,-6 -16,-20 q-2,-10 4,-18z M108,95 q14,-6 22,6 q4,14 -8,22 q-12,4 -16,-8 q-4,-12 2,-20z" fill="#5cb85c" class="a-land"/>
    <path class="a-ice" d="M62,66 Q70,44 95,44 Q120,44 128,66 Q112,58 95,62 Q78,58 62,66Z" fill="#fff" stroke="#cfe6f5" stroke-width="1.5"/>
    <path class="a-drop" d="M80,64 q3,5 0,8 q-3,-3 0,-8z" fill="#bde3ff" style="animation-delay:1s"/>
    <path class="a-drop" d="M96,60 q3,5 0,8 q-3,-3 0,-8z" fill="#bde3ff" style="animation-delay:1.6s"/>
    <path class="a-drop" d="M112,64 q3,5 0,8 q-3,-3 0,-8z" fill="#bde3ff" style="animation-delay:2.2s"/>
    <circle class="a-sun" cx="40" cy="30" r="16" fill="#ffd166"/>
    <rect x="168" y="28" width="16" height="104" rx="8" fill="#fff" stroke="#9aa3b5" stroke-width="2"/><circle cx="176" cy="138" r="13" fill="#e5484d"/>
    <rect class="a-merc" x="172" y="40" width="8" height="98" rx="4" fill="#e5484d"/>
    <g fill="#6b7487" style="font-size:8px;font-weight:700"><text x="190" y="44">40°</text><text x="190" y="84">25°</text><text x="190" y="124">10°</text></g>
    <g class="a-pop" style="animation-delay:2.6s"><rect x="196" y="56" width="38" height="18" rx="9" fill="#e5484d"/><text x="215" y="69" text-anchor="middle" style="font-size:10px;fill:#fff;font-weight:800">+2 °C</text></g>
    <rect x="20" y="132" width="5" height="22" fill="#7a5233"/><circle class="a-tree" cx="22.5" cy="124" r="14" fill="#3f9b52"/>`;
  // llegadas sin tema: dirección de curso, rompecabezas, descanso, almuerzo
  const n=(r.nombre||'').toLowerCase();
  if(n.includes('rompecabezas')) return `<rect x="70" y="40" width="100" height="100" rx="8" fill="#e6ebf5"/>
      <path d="M70,40 h50 v18 a10,10 0 1 1 0,20 v22 h-50z" fill="#2f6fde"/><path d="M170,40 v60 h-22 a10,10 0 1 0 -20,0 h-8 v-60z" fill="#1f9d6b"/>
      <path d="M70,100 h50 v40 h-50z" fill="#7b4bd6"/>
      <g class="a-snap"><path d="M120,100 h8 a10,10 0 1 1 20,0 h22 v40 h-50z" fill="#f2a900"/></g>`;
  if(r.tipo==='pausa') return `<g class="a-pop" style="animation-delay:.2s"><path d="M85,80 h60 v30 a22,22 0 0 1 -22,22 h-16 a22,22 0 0 1 -22,-22z" fill="#fff" stroke="#f2a900" stroke-width="4"/>
      <path d="M145,88 a12,12 0 0 1 0,24" fill="none" stroke="#f2a900" stroke-width="4"/></g>
      <path class="a-steam" d="M103,70 q-6,-8 0,-16 q6,-8 0,-16" fill="none" stroke="#9aa3b5" stroke-width="3" stroke-linecap="round"/>
      <path class="a-steam" d="M123,70 q-6,-8 0,-16 q6,-8 0,-16" fill="none" stroke="#9aa3b5" stroke-width="3" stroke-linecap="round" style="animation-delay:.4s"/>`;
  return `<rect x="96" y="30" width="4" height="110" fill="#3a4253"/><path class="a-flag" d="M100,32 h70 l-12,18 l12,18 h-70z" fill="#173d7a"/>
      <text x="126" y="55" text-anchor="middle" class="a-flag" style="font-size:11px;fill:#fff;font-weight:800">${escHTML(r.salon||'')}</text>`;
}
const ARRIVE_CSS = `
  .arrive{position:absolute;inset:0;background:rgba(15,27,51,.45);display:flex;align-items:center;justify-content:center;padding:14px;opacity:0;pointer-events:none;transition:opacity .35s;z-index:4}
  .arrive.on{opacity:1;pointer-events:auto}
  .abox{background:#fff;border-radius:18px;width:100%;max-width:300px;padding:14px 14px 12px;box-shadow:0 12px 30px rgba(0,0,0,.3);transform:scale(.9);transition:transform .35s;border-top:6px solid var(--c)}
  .arrive.on .abox{transform:scale(1)}
  .abox .atag{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--c)}
  .abox svg{width:100%;height:auto;display:block;margin:4px 0}
  .abox h3{font-size:18px;margin:0}
  .abox p{font-size:12.5px;color:var(--muted);margin:3px 0 8px;line-height:1.4}
  .abox .row2{display:flex;justify-content:space-between;align-items:center}
  .abox .bar{height:4px;background:#e2e6ee;border-radius:4px;flex:1;margin-right:10px;overflow:hidden}
  .abox .bar i{display:block;height:100%;background:var(--c);width:0}
  .abox button{border:0;background:var(--c);color:#fff;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer}
  .a-shake{animation:shake .14s linear 8}
  @keyframes shake{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,1px)}75%{transform:translate(3px,-1px)}}
  .a-crack{stroke-dasharray:40;stroke-dashoffset:40;animation:draw .6s .5s forwards}
  @keyframes draw{to{stroke-dashoffset:0}}
  .a-flood{transform:translateY(45px);animation:flood 3.6s .6s ease-in-out forwards}
  @keyframes flood{0%{transform:translateY(45px)}35%,60%{transform:translateY(0)}100%{transform:translateY(38px)}}
  .a-pop{transform:scale(0);transform-box:fill-box;transform-origin:center;animation:pop .45s cubic-bezier(.3,1.6,.5,1) forwards}
  @keyframes pop{to{transform:scale(1)}}
  .a-ring{opacity:0;transform-box:fill-box;transform-origin:center;animation:ring 1.2s ease-out 2}
  @keyframes ring{0%{opacity:1;transform:scale(.4)}100%{opacity:0;transform:scale(2.6)}}
  .a-petal{transform:scale(0);transform-box:view-box;transform-origin:95px 88px;animation:pop .5s ease-out forwards}
  .a-seed{opacity:0;animation:fade .3s forwards}
  @keyframes fade{to{opacity:1}}
  .a-axis{opacity:0;animation:fade .6s .3s forwards}
  .a-wl,.a-wr{transform-box:view-box;transform-origin:185px 70px;animation:flap .5s ease-in-out infinite alternate}
  @keyframes flap{to{transform:scaleX(.25)}}
  .a-fly{animation:hover 1.6s ease-in-out infinite alternate}
  @keyframes hover{to{transform:translateY(-6px)}}
  .a-num{opacity:0;font-size:12px;font-weight:800;fill:#2f6fde;animation:fade .3s forwards}
  .a-ice{transform-box:fill-box;transform-origin:center top;animation:melt 3s 1s ease-in forwards}
  @keyframes melt{to{transform:scale(.25,.4);opacity:.6}}
  .a-drop{opacity:0;animation:drop 1s ease-in 2}
  @keyframes drop{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(26px)}}
  .a-sun{transform-box:fill-box;transform-origin:center;animation:sun 3.6s .3s forwards}
  @keyframes sun{to{transform:scale(1.5);fill:#ff7b39}}
  .a-merc{transform-box:fill-box;transform-origin:center bottom;transform:scaleY(.35);animation:merc 3s .4s ease-in-out forwards}
  @keyframes merc{to{transform:scaleY(1)}}
  .a-tree{animation:dry 3.4s .8s forwards}
  @keyframes dry{to{fill:#b08a3a}}
  .a-land{animation:land 3.4s .8s forwards}
  @keyframes land{to{fill:#c2b25a}}
  .a-snap{transform:translate(40px,40px) rotate(20deg);transform-box:fill-box;transform-origin:center;animation:snap .8s .3s cubic-bezier(.3,1.4,.5,1) forwards}
  @keyframes snap{to{transform:translate(0,0) rotate(0)}}
  .a-steam{animation:steam 1.4s ease-in-out infinite;opacity:.8}
  @keyframes steam{0%,100%{transform:translateY(0);opacity:.2}50%{transform:translateY(-6px);opacity:.9}}
  .a-flag{transform-box:view-box;transform-origin:100px 50px;animation:wave 1s ease-in-out infinite alternate}
  @keyframes wave{to{transform:skewY(-6deg) scaleX(.94)}}
`;
function mostrarLlegada(container, r){
  const t = r.tipo==='actividad' && TEMAS[r.cat] ? r.cat : null;
  const frase1 = r.frase ? (r.frase.match(/^[^.!?]*[.!?]/)||[r.frase])[0] : '';
  const T = t ? {...TEMAS[t], sub: (t==='tec'&&frase1)?frase1:TEMAS[t].sub}
              : {titulo: r.nombre, sub: r.tipo==='pausa' ? '¡Momento de recargar energías!' : 'Llegaste a la siguiente estación.', col: r.tipo==='pausa'?'#e9a23b':'#173d7a', dur:2400};
  let el=container.querySelector('.arrive');
  if(!el){ el=document.createElement('div'); el.className='arrive'; container.appendChild(el); }
  el.style.setProperty('--c',T.col);
  el.innerHTML=`<div class="abox"><div class="atag">Llegaste a · ${escHTML(r.tipo==='pausa'?r.area:(r.lugar||r.salon||''))}</div>
    <svg viewBox="0 0 240 165">${animSVG(t,r)}</svg><h3>${escHTML(T.titulo)}</h3><p>${escHTML(T.sub)}</p>
    <div class="row2"><div class="bar"><i></i></div><button type="button">Continuar</button></div></div>`;
  requestAnimationFrame(()=>el.classList.add('on'));
  const bar=el.querySelector('.bar i'); bar.style.transition=`width ${T.dur}ms linear`; requestAnimationFrame(()=>requestAnimationFrame(()=>bar.style.width='100%'));
  return new Promise(res=>{ let done=false; const close=()=>{ if(done) return; done=true; el.classList.remove('on'); setTimeout(res,350); };
    el.querySelector('button').onclick=close; setTimeout(close,T.dur); });
}
(()=>{const st=document.createElement('style'); st.textContent=ARRIVE_CSS; document.head.appendChild(st);})();

/* ================= MAPA ================= */
class MapaSteam {
  constructor(container, opts){
    this.box=container; this.opts=opts||{}; this.stops=[]; this.cur=-1; this.busy=false; this.av=null;
    this.svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    this.svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    this.box.innerHTML=''; this.box.appendChild(this.svg);
    this.tag=document.createElement('span'); this.tag.className='zoomtag'; this.tag.textContent='Avanzando…'; this.box.appendChild(this.tag);
  }
  setAvatar(av){ this.av=av; if(this.road) this.place(this.L||0); }
  /* dibuja la ruta; cur = índice de la parada actual (-1 = antes de empezar) */
  setRoute(stops, cur){
    this.stops=stops; const N=Math.max(stops.length,1);
    this.W=320; this.H=Math.max(470, 95+(N-1)*52);
    this.FULL=[-55,0,430,this.H];
    const H=this.H; this.PTS=[];
    for(let i=0;i<N;i++) this.PTS.push({x:i%2?212:108, y:(H-40)-(H-85)*(N===1?0:i/(N-1))});
    this.svg.innerHTML=this.scene()+'<g class="nodes"></g><g class="av"></g>';
    this.road=this.svg.querySelector('[data-r="road"]'); this.trail=this.svg.querySelector('[data-r="trail"]');
    this.total=this.road.getTotalLength();
    this.lens=this.PTS.map(pt=>{let best=0,bd=1e9; for(let L=0;L<=this.total;L+=2){const p=this.road.getPointAtLength(L),dd=(p.x-pt.x)**2+(p.y-pt.y)**2; if(dd<bd){bd=dd;best=L;}} return best;});
    this.cur=cur; this.setVB(this.FULL); this.nodes(); this.place(cur<0?0:this.lens[cur]);
  }
  side(i){ return this.PTS[i].x<160?-1:1; }
  path(){ const P=this.PTS, H=this.H; let d=`M160,${H-8} C120,${H-12} ${P[0].x},${P[0].y+30} ${P[0].x},${P[0].y}`;
    for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],m=(a.y+b.y)/2; d+=` C${a.x},${m} ${b.x},${m} ${b.x},${b.y}`;} return d; }
  scene(){
    const W=this.W,H=this.H;
    let s=`<defs><pattern id="isoG" width="40" height="20" patternUnits="userSpaceOnUse"><rect width="40" height="20" fill="#9fd08a"/><path d="M0,10 L20,0 L40,10 L20,20Z" fill="#a9d794"/></pattern>
      <linearGradient id="isoF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>
      <rect x="-400" y="-200" width="${W+800}" height="${H+400}" fill="url(#isoG)"/><rect x="-400" y="-200" width="${W+800}" height="${H+400}" fill="url(#isoF)"/>`;
    const cy=H/2;
    s+=`<polygon points="160,${cy-22} 205,${cy} 160,${cy+22} 115,${cy}" fill="#e9b872" opacity=".9"/><polygon points="160,${cy-15} 191,${cy} 160,${cy+15} 129,${cy}" fill="none" stroke="#fff" stroke-width="1.2"/>`;
    for(let y=30;y<H;y+=95){ [[18,0],[302,40],[-32,20],[350,60]].forEach(([x,o])=>{ if(y+o<H) s+=isoTree(x,y+o,.9); }); }
    s+=isoTree(160,cy-90,.8)+isoTree(160,cy+110,.8);
    const d=this.path();
    s+=`<path d="${d}" fill="none" stroke="#b49c6c" stroke-width="24" stroke-linecap="round" transform="translate(0,3)"/>
        <path data-r="road" d="${d}" fill="none" stroke="#efe0bb" stroke-width="20" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="5 7" opacity=".9"/>
        <path data-r="trail" d="${d}" fill="none" stroke="#f2a900" stroke-width="5" stroke-linecap="round" opacity=".9"/>`;
    this.stops.forEach((r,i)=>{ const p=this.PTS[i], sd=this.side(i), bx=p.x+sd*62, by=p.y+6, col=r.tipo==='pausa'?'#f0c36b':AREA_C[r.cat]||AREA_C.gen;
      s+= r.tipo==='pausa' ? `<ellipse cx="${bx}" cy="${by}" rx="26" ry="12" fill="#cfe9f7" stroke="#9cc9e2"/>${isoTree(bx-14,by-2,.6)}${isoTree(bx+14,by,.6)}`
                            : isoBlock(bx,by,46,24,22+(i%3)*6,col);
      const ty=by-(r.tipo==='pausa'?26:44+(i%3)*6);
      s+=`<g class="node" data-i="${i}"><rect x="${bx-36}" y="${ty-13}" width="72" height="22" rx="6" fill="#fff" stroke="${shade(col,.8)}" stroke-width="1"/>
          <text x="${bx}" y="${ty-4}" text-anchor="middle" style="font-size:7.5px;fill:#6b7487;font-weight:700;dominant-baseline:auto">${fmtHora(r.h)}${r.etq?' · '+escHTML(r.etq):''}</text>
          <text x="${bx}" y="${ty+5}" text-anchor="middle" style="font-size:8.5px;fill:#1b2333;font-weight:800;dominant-baseline:auto">${escHTML((r.lugar||'Por definir').slice(0,15))}</text></g>`; });
    const last=this.PTS[this.PTS.length-1];
    s+=`<g transform="translate(${last.x},${last.y-14})"><rect x="-1" y="-24" width="2" height="24" fill="#3a4253"/><path d="M1,-24 L18,-19 L1,-14Z" fill="#e5484d"/></g>`;
    return s;
  }
  nodes(){
    const g=this.svg.querySelector('.nodes'), free=this.opts.libre;
    g.innerHTML=this.stops.map((r,i)=>{ const q=this.road.getPointAtLength(this.lens[i]), done=!free&&i<this.cur, now=i===this.cur, col=colorDe(r);
      return `<g class="node" data-i="${i}" transform="translate(${q.x},${q.y})">${now?`<circle r="16" fill="${col}" opacity=".3"><animate attributeName="r" values="12;19;12" dur="1.6s" repeatCount="indefinite"/></circle>`:''}
        <circle r="11" fill="${done?'#f2a900':col}" stroke="#fff" stroke-width="3"/><text>${done?'★':(r.tipo==='pausa'?'•':i+1)}</text></g>`; }).join('');
    this.svg.querySelectorAll('.node').forEach(n=>n.onclick=()=>this.opts.onTap&&this.opts.onTap(+n.dataset.i));
  }
  setVB(v){ this.vb=v; this.svg.setAttribute('viewBox',v.map(n=>n.toFixed(1)).join(' ')); }
  zoomAt(x,y){ const ZW=150, ZH=ZW*this.H/430; return [Math.max(-55,Math.min(375-ZW,x-ZW/2)), Math.max(0,Math.min(this.H-ZH,y-ZH/2)), ZW, ZH]; }
  place(L,hop){ this.L=L; const p=this.road.getPointAtLength(L); this.trail.style.strokeDasharray=this.total; this.trail.style.strokeDashoffset=this.opts.libre?this.total:this.total-L;
    this.svg.querySelector('.av').innerHTML=`<g transform="translate(${p.x+13},${p.y-4-(hop||0)}) scale(.5)">${avatarSVG(avatarNormal(this.av))}</g>`; return p; }
  anim(dur,fn){ return new Promise(res=>{const t0=performance.now(); const f=t=>{const k=Math.min(1,(t-t0)/dur); fn(k); if(k<1) requestAnimationFrame(f); else res();}; requestAnimationFrame(f);}); }
  /* mueve el avatar a la parada idx: acercar → seguir → animación de llegada → alejar */
  async goTo(idx, conLlegada=true){
    if(this.busy||idx===this.cur||idx<0||idx>=this.stops.length) { if(!this.busy&&idx===this.cur){} return; }
    this.busy=true; this.tag.classList.add('on');
    const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2, lerp=(a,b,k)=>a+(b-a)*k;
    const from=this.L||0, to=this.lens[idx], p0=this.road.getPointAtLength(from), z0=this.zoomAt(p0.x,p0.y), full=this.FULL;
    await this.anim(800,k=>{const e=ease(k); this.setVB(full.map((v,i)=>lerp(v,z0[i],e)));});
    const dur=Math.min(3200,Math.max(1400,Math.abs(to-from)*9));
    await this.anim(dur,k=>{const e=ease(k), p=this.place(lerp(from,to,e),Math.abs(Math.sin(k*Math.PI*dur/250))*3); this.setVB(this.zoomAt(p.x,p.y));});
    this.cur=idx; this.nodes(); this.place(to);
    if(this.opts.onArrive) this.opts.onArrive(idx);
    if(conLlegada){ await this.anim(250,()=>{}); await mostrarLlegada(this.box,this.stops[idx]); }
    const z1=[...this.vb]; await this.anim(900,k=>{const e=ease(k); this.setVB(z1.map((v,i)=>lerp(v,full[i],e)));});
    this.tag.classList.remove('on'); this.busy=false;
  }
}
