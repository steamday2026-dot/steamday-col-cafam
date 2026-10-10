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
/* ================= ENTORNO TEXTURIZADO ================= */
function _rnd(seed){ let x=Math.sin(seed*999.7)*43758.5453; return x-Math.floor(x); }
const ENV_DEFS=`
  <pattern id="pGrass" width="48" height="24" patternUnits="userSpaceOnUse">
    <rect width="48" height="24" fill="#93c97d"/><path d="M0,12 L24,0 L48,12 L24,24Z" fill="#9dd087"/>
    <g stroke="#7fb86a" stroke-width="1" stroke-linecap="round" fill="none"><path d="M6,6 l1,-3 M8,6 l-1,-3"/><path d="M30,17 l1,-3 M32,17 l-1,-3"/><path d="M40,5 l1,-2.5"/><path d="M16,19 l1,-2.5"/></g>
    <g fill="#b4dc9c"><circle cx="20" cy="9" r=".9"/><circle cx="44" cy="20" r=".8"/></g></pattern>
  <pattern id="pCobble" width="12" height="8" patternUnits="userSpaceOnUse">
    <rect width="12" height="8" fill="#e3d2ad"/><rect x=".6" y=".6" width="5" height="3" rx="1.2" fill="#efe2c4"/><rect x="6.6" y=".6" width="4.8" height="3" rx="1.2" fill="#ead9b6"/>
    <rect x="3.6" y="4.4" width="5" height="3" rx="1.2" fill="#efe2c4"/><rect x="-1.4" y="4.4" width="4.4" height="3" rx="1.2" fill="#e8d6b0"/><rect x="9.2" y="4.4" width="4.4" height="3" rx="1.2" fill="#e8d6b0"/></pattern>
  <pattern id="pPlaza" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#d8c3a1"/><path d="M0,0 H16 M0,8 H16 M0,0 V16 M8,0 V16" stroke="#c7b08b" stroke-width="1"/></pattern>
  <radialGradient id="gVig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1b3a1b" stop-opacity=".18"/></radialGradient>
  <radialGradient id="gWater" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#b9e6fb"/><stop offset="1" stop-color="#4fa3d1"/></radialGradient>
  <pattern id="pBrick" width="10" height="6" patternUnits="userSpaceOnUse"><rect width="10" height="6" fill="#bd6a43"/><path d="M0,3 H10 M5,0 V3 M0,3 V6 M10,3 V6" stroke="#a65a37" stroke-width=".7"/></pattern>
  <pattern id="pBrickD" width="10" height="6" patternUnits="userSpaceOnUse"><rect width="10" height="6" fill="#9c5233"/><path d="M0,3 H10 M5,0 V3 M0,3 V6 M10,3 V6" stroke="#874629" stroke-width=".7"/></pattern>
  <linearGradient id="gRoof" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e3e8ef"/></linearGradient>`;
function envTreeRound(x,y,s=1,seed=1){ const g=['#3f9b52','#4aa85c','#368a49'][Math.floor(_rnd(seed)*3)];
  return `<ellipse cx="${x+4*s}" cy="${y+2}" rx="${11*s}" ry="${4.5*s}" fill="#000" opacity=".16"/><rect x="${x-1.6*s}" y="${y-10*s}" width="${3.2*s}" height="${10*s}" rx="1" fill="#7a5233"/>
    <circle cx="${x}" cy="${y-17*s}" r="${11*s}" fill="${g}"/><circle cx="${x+4*s}" cy="${y-14*s}" r="${7.5*s}" fill="${shade(g,.85)}"/><circle cx="${x-3.5*s}" cy="${y-20*s}" r="${5*s}" fill="${shade(g,1.18)}"/>`; }
function envPine(x,y,s=1){ return `<ellipse cx="${x+4*s}" cy="${y+2}" rx="${9*s}" ry="${4*s}" fill="#000" opacity=".15"/><rect x="${x-1.4*s}" y="${y-7*s}" width="${2.8*s}" height="${7*s}" fill="#6d4a2e"/>
    <polygon points="${x},${y-34*s} ${x+10*s},${y-7*s} ${x-10*s},${y-7*s}" fill="#2f8a45"/><polygon points="${x},${y-34*s} ${x+10*s},${y-7*s} ${x},${y-7*s}" fill="#267538"/>
    <polygon points="${x},${y-40*s} ${x+7*s},${y-20*s} ${x-7*s},${y-20*s}" fill="#36a052"/>`; }
function envBush(x,y,s=1){ return `<ellipse cx="${x+2}" cy="${y+2}" rx="${9*s}" ry="${3.5*s}" fill="#000" opacity=".14"/><circle cx="${x-4*s}" cy="${y-3*s}" r="${5*s}" fill="#4caf50"/><circle cx="${x+3*s}" cy="${y-4*s}" r="${6*s}" fill="#43a047"/><circle cx="${x}" cy="${y-7*s}" r="${4.5*s}" fill="#5cbf60"/>`; }
function envFlowers(x,y,seed){ const cols=['#ffd166','#ef476f','#ffffff','#c77dff'];
  let s=`<ellipse cx="${x}" cy="${y}" rx="16" ry="7" fill="#7a5a3c"/><ellipse cx="${x}" cy="${y-1}" rx="14" ry="5.6" fill="#5b8f46"/>`;
  for(let k=0;k<9;k++){ const a=_rnd(seed+k)*6.28, r=_rnd(seed+k*3)*10; s+=`<circle cx="${(x+Math.cos(a)*r).toFixed(1)}" cy="${(y-1+Math.sin(a)*r*.38).toFixed(1)}" r="1.7" fill="${cols[k%4]}"/>`; }
  return s; }
function envBench(x,y){ return `<g><ellipse cx="${x+2}" cy="${y+3}" rx="11" ry="3" fill="#000" opacity=".14"/><polygon points="${x-10},${y-4} ${x+6},${y-12} ${x+10},${y-10} ${x-6},${y-2}" fill="#a0703f"/>
  <polygon points="${x-10},${y-4} ${x-6},${y-2} ${x-6},${y+1} ${x-10},${y-1}" fill="#6d4a2e"/><polygon points="${x-10},${y-10} ${x+6},${y-18} ${x+6},${y-14} ${x-10},${y-6}" fill="#b5834e"/></g>`; }
function envLamp(x,y){ return `<ellipse cx="${x+1}" cy="${y+1}" rx="4" ry="1.6" fill="#000" opacity=".15"/><rect x="${x-1}" y="${y-30}" width="2" height="30" fill="#3a4253"/><circle cx="${x}" cy="${y-32}" r="3.6" fill="#fff4c2" stroke="#3a4253" stroke-width="1.2"/>`; }
function envFountain(x,y){ return `<ellipse cx="${x}" cy="${y+3}" rx="30" ry="14" fill="#000" opacity=".12"/><ellipse cx="${x}" cy="${y}" rx="28" ry="13" fill="#c9ced8"/><ellipse cx="${x}" cy="${y-2}" rx="24" ry="10.5" fill="url(#gWater)"/>
  <rect x="${x-3}" y="${y-16}" width="6" height="14" rx="2" fill="#b3bac7"/><ellipse cx="${x}" cy="${y-16}" rx="8" ry="3.4" fill="#c9ced8"/><ellipse cx="${x}" cy="${y-17}" rx="6" ry="2.4" fill="#8fd0f0"/>
  <path d="M${x},${y-18} q-6,-8 -11,2 M${x},${y-18} q6,-8 11,2" stroke="#d4effc" stroke-width="1.6" fill="none" opacity=".9"/></g>`.replace('</g>',''); }
function envPicnic(x,y){ return `<ellipse cx="${x+2}" cy="${y+4}" rx="18" ry="6" fill="#000" opacity=".13"/><polygon points="${x-14},${y} ${x},${y-7} ${x+14},${y} ${x},${y+7}" fill="#b5834e"/>
  <rect x="${x-.8}" y="${y-26}" width="1.6" height="24" fill="#555"/><path d="M${x-16},${y-20} Q${x},${y-36} ${x+16},${y-20} Z" fill="#f2a900"/><path d="M${x},${y-28} Q${x+8},${y-27} ${x+16},${y-20} L${x},${y-20}Z" fill="#e5484d"/></g>`.replace('</g>',''); }
/* matas de pasto y florecitas sueltas (pasto con matices) */
function envGrass(x0,y0,w,h,n,seed){ let s=''; const fl=['#ffffff','#ffd166','#f7a1c4'];
  for(let k=0;k<n;k++){ const x=(x0+_rnd(seed+k*3.1)*w).toFixed(1), y=(y0+_rnd(seed+k*7.7)*h).toFixed(1);
    s+= k%3===2 ? `<circle cx="${x}" cy="${y}" r="1.3" fill="${fl[k%3]}"/>` : `<path d="M${x},${y} l-1.4,-3.6 M${+x+1.4},${y} l0,-4.4 M${+x+2.8},${y} l1.4,-3.6" stroke="#6aa957" stroke-width="1" stroke-linecap="round"/>`; }
  return s; }
/* un objeto temático por área: Tecnología = volcán, Matemáticas = huerta con mariposa, Ciencias = reciclaje y planeta */
function envDecor(cat,x,y,s=1){ const S=v=>(v*s).toFixed(1);
  if(cat==='tec') return `<ellipse cx="${x}" cy="${y+1}" rx="${S(15)}" ry="${S(5)}" fill="#000" opacity=".14"/><polygon points="${x-14*s},${y} ${x-3*s},${y-17*s} ${x+3*s},${y-17*s} ${x+14*s},${y}" fill="#7a5a44"/><polygon points="${x},${y} ${x+3*s},${y-17*s} ${x+14*s},${y}" fill="#5f4535"/><path d="M${x-2.4*s},${y-17*s} q2.4,4 .8,9 q3,-2.4 2.4,-9z" fill="#ff7b2e"/>
    <circle cx="${x}" cy="${y-20*s}" r="${S(3)}" fill="#bfc3ca"><animate attributeName="cy" values="${y-19*s};${y-32*s}" dur="2.4s" repeatCount="indefinite"/><animate attributeName="r" values="${S(2)};${S(5)}" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".85;0" dur="2.4s" repeatCount="indefinite"/></circle>`;
  if(cat==='mat'){ let r=`<ellipse cx="${x}" cy="${y+1}" rx="${S(16)}" ry="${S(5)}" fill="#000" opacity=".12"/>`;
    [[-9,0],[0,-3],[9,0]].forEach(([dx,dy])=>{ const X=x+dx*s, Y=y+dy*s; r+=`<polygon points="${X-3.5*s},${Y-5*s} ${X+3.5*s},${Y-5*s} ${X+2.5*s},${Y} ${X-2.5*s},${Y}" fill="#c4643a"/><circle cx="${X}" cy="${Y-8*s}" r="${S(4)}" fill="#43a047"/><circle cx="${X-1.5*s}" cy="${Y-9.5*s}" r="${S(2.2)}" fill="#5cbf60"/>`; });
    r+=`<g><animateTransform attributeName="transform" type="translate" values="${x-6},${y-20*s};${x+8},${y-26*s};${x-2},${y-18*s};${x-6},${y-20*s}" dur="4s" repeatCount="indefinite"/><path d="M0,0 c-3,-4 -5,0 0,1.4 c5,-1.4 3,-5.4 0,-1.4z" fill="#f2a900"><animateTransform attributeName="transform" type="scale" values="1,1;.3,1;1,1" dur=".25s" repeatCount="indefinite"/></path></g>`; return r; }
  if(cat==='cie'){ let r=`<ellipse cx="${x}" cy="${y+1}" rx="${S(16)}" ry="${S(5)}" fill="#000" opacity=".12"/>`;
    ['#2f6fde','#f2a900','#1f9d6b'].forEach((c,k)=>{ const X=x-12*s+k*6*s; r+=`<rect x="${X}" y="${y-8*s+k*1.2*s}" width="${S(5)}" height="${S(8)}" rx="1" fill="${c}"/><rect x="${X-.4*s}" y="${y-9*s+k*1.2*s}" width="${S(5.8)}" height="${S(1.6)}" fill="${shade(c,.75)}"/>`; });
    r+=`<circle cx="${x+9*s}" cy="${y-9*s}" r="${S(6.5)}" fill="#4fa3d1"/><path d="M${x+5*s},${y-12*s} q3,-3 6,0 q1,4 -3,5z" fill="#5cb85c"/><rect x="${x+16.5*s}" y="${y-19*s}" width="${S(2.6)}" height="${S(14)}" rx="1.3" fill="#fff" stroke="#999" stroke-width=".5"/><rect x="${x+17.1*s}" y="${y-11*s}" width="${S(1.4)}" height="${S(6)}" fill="#e5484d"><animate attributeName="height" values="${S(3)};${S(11)};${S(3)}" dur="4s" repeatCount="indefinite"/><animate attributeName="y" values="${y-8*s};${y-16*s};${y-8*s}" dur="4s" repeatCount="indefinite"/></rect>`; return r; }
  return ''; }
/* edificio con puerta, marcos de ventana, cornisa y franja del color del área */
function isoBuilding(cx,cy,w,d,h,col){
  const N_=[cx,cy-d/2],E=[cx+w/2,cy],S=[cx,cy+d/2],Wp=[cx-w/2,cy], up=(p,z=h)=>[p[0],p[1]-z], P=a=>a.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ');
  const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  let s=`<ellipse cx="${cx+7}" cy="${cy+5}" rx="${w/2+6}" ry="${d/2+4}" fill="#000" opacity=".17"/>`;
  s+=`<polygon points="${P([Wp,S,up(S),up(Wp)])}" fill="url(#pBrick)"/>`;
  s+=`<polygon points="${P([S,E,up(E),up(S)])}" fill="url(#pBrickD)"/>`;
  // franja de ventanas continua en cada piso, con parteluces
  const pisos=h>=26?2:1;
  for(let f=0;f<pisos;f++){ const z1=h*(.2+f*.42)+2, z2=z1+h*.22;
    const a=lerp(Wp,S,.06), b=lerp(Wp,S,.94); s+=`<polygon points="${P([up(a,z1),up(b,z1),up(b,z2),up(a,z2)])}" fill="#3d4f66"/>`;
    for(let k=1;k<8;k++){ const m=lerp(a,b,k/8); s+=`<line x1="${m[0].toFixed(1)}" y1="${(m[1]-z1).toFixed(1)}" x2="${m[0].toFixed(1)}" y2="${(m[1]-z2).toFixed(1)}" stroke="#e8edf3" stroke-width=".8"/>`; }
    const c=lerp(S,E,.1), e=lerp(S,E,.9); s+=`<polygon points="${P([up(c,z1),up(e,z1),up(e,z2),up(c,z2)])}" fill="#33435a"/>`; }
  // puerta con marquesina
  const dp=lerp(Wp,S,.5); s+=`<polygon points="${P([[dp[0]-3.5,dp[1]-1.6],[dp[0]+3.5,dp[1]+1.6],up([dp[0]+3.5,dp[1]+1.6],h*.3),up([dp[0]-3.5,dp[1]-1.6],h*.3)])}" fill="#e9edf2" stroke="#8a94a8" stroke-width=".6"/>`;
  // franja del color del área bajo el techo
  s+=`<polygon points="${P([up(Wp,h-1),up(S,h-1),up(S,h-4),up(Wp,h-4)])}" fill="${col}"/><polygon points="${P([up(S,h-1),up(E,h-1),up(E,h-4),up(S,h-4)])}" fill="${shade(col,.75)}"/>`;
  // techo blanco con láminas y cumbrera
  s+=`<polygon points="${P([up(N_),up(E),up(S),up(Wp)])}" fill="url(#gRoof)" stroke="#c7ccd6" stroke-width="1.2"/>`;
  for(let k=1;k<7;k++){ const a=up(lerp(Wp,N_,k/7)), b=up(lerp(S,E,k/7)); s+=`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#d9dee6" stroke-width=".7"/>`; }
  const r1=up(lerp(Wp,N_,.5),h+2), r2=up(lerp(S,E,.5),h+2); s+=`<line x1="${r1[0].toFixed(1)}" y1="${r1[1].toFixed(1)}" x2="${r2[0].toFixed(1)}" y2="${r2[1].toFixed(1)}" stroke="#c7ced8" stroke-width="1.6"/>`;
  return s;
}
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
  setAvatar(av){ this.av=av; if(this.road) this.place(this.L||0,{}); }
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
    this.cur=cur; this.setVB(this.FULL); this.nodes(); this.place(cur<0?0:this.lens[cur],{dir:'f',walk:0}); this.idle();
  }
  side(i){ return this.PTS[i].x<160?-1:1; }
  path(){ const P=this.PTS, H=this.H; let d=`M160,${H-8} C120,${H-12} ${P[0].x},${P[0].y+30} ${P[0].x},${P[0].y}`;
    for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],m=(a.y+b.y)/2; d+=` C${a.x},${m} ${b.x},${m} ${b.x},${b.y}`;} return d; }
  scene(){
    const W=this.W,H=this.H, cy=H/2;
    let s=`<defs>${ENV_DEFS}</defs><rect x="-400" y="-200" width="${W+800}" height="${H+400}" fill="url(#pGrass)"/>`;
    // manchas de pasto para dar variación
    for(let k=0;k<26;k++){ const x=-60+_rnd(k+1)*440, y=_rnd(k+40)*H, r=14+_rnd(k+80)*26; s+=`<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r*.5).toFixed(0)}" fill="${k%2?'#a6d690':'#86bf70'}" opacity=".55"/>`; }
    s+=envGrass(-60,0,440,H,Math.round(H*.55),5);
    // plaza central con fuente
    s+=`<polygon points="160,${cy-30} 222,${cy} 160,${cy+30} 98,${cy}" fill="url(#pPlaza)" stroke="#bda788" stroke-width="1.5"/>`;
    const d=this.path();
    // camino empedrado: borde, piedras, brillo
    s+=`<path d="${d}" fill="none" stroke="#a88d63" stroke-width="25" stroke-linecap="round" transform="translate(0,3)"/>
        <path d="${d}" fill="none" stroke="#c9b28a" stroke-width="23" stroke-linecap="round"/>
        <path data-r="road" d="${d}" fill="none" stroke="url(#pCobble)" stroke-width="19" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="#fff" stroke-width="1.3" stroke-dasharray="4 8" opacity=".55"/>
        <path data-r="trail" d="${d}" fill="none" stroke="#f2a900" stroke-width="5" stroke-linecap="round" opacity=".9"/>`;
    s+=envFountain(160,cy+4);
    // vegetación y mobiliario en los bordes (determinístico)
    for(let y=20,k=0;y<H;y+=58,k++){
      s+= k%2 ? envPine(10+_rnd(k)*14,y,.8)+envTreeRound(318-_rnd(k+5)*12,y+26,.85,k) : envTreeRound(14+_rnd(k)*10,y+10,.85,k)+envPine(318-_rnd(k+5)*10,y+32,.8);
      if(k%3===1) s+=envBush(-28,y+40)+envBush(350,y+6);
      if(k%4===2) s+=envFlowers(-30,y+18,k*7)+envFlowers(352,y+44,k*11);
    }
    s+=envTreeRound(160,cy-62,.75,3)+envTreeRound(160,cy+78,.75,8)+envBush(132,cy-36)+envBush(190,cy+40);
    this.stops.forEach((r,i)=>{ const p=this.PTS[i], sd=this.side(i), bx=p.x+sd*62, by=p.y+6, col=r.tipo==='pausa'?'#f0c36b':AREA_C[r.cat]||AREA_C.gen;
      if(r.tipo==='pausa') s+=envPicnic(bx-8,by+2)+envPicnic(bx+16,by-6)+envBench(bx-24,by+12);
      else { s+=isoBuilding(bx,by,46,24,24+(i%3)*6,col); s+=envLamp(p.x+sd*22,p.y+4)+envBench(bx+sd*30,by+16)+envDecor(r.cat,bx+sd*6,by+30,.9); }
      const ty=by-(r.tipo==='pausa'?34:48+(i%3)*6);
      s+=`<g class="node" data-i="${i}"><rect x="${bx-36}" y="${ty-13}" width="72" height="22" rx="6" fill="#fff" stroke="${shade(col,.8)}" stroke-width="1.2"/>
          <text x="${bx}" y="${ty-4}" text-anchor="middle" style="font-size:7.5px;fill:#6b7487;font-weight:700;dominant-baseline:auto">${fmtHora(r.h)}${r.etq?' · '+escHTML(r.etq):''}</text>
          <text x="${bx}" y="${ty+5}" text-anchor="middle" style="font-size:8.5px;fill:#1b2333;font-weight:800;dominant-baseline:auto">${escHTML((r.lugar||'Por definir').slice(0,15))}</text></g>`; });
    const last=this.PTS[this.PTS.length-1];
    s+=`<g transform="translate(${last.x},${last.y-14})"><rect x="-1" y="-24" width="2" height="24" fill="#3a4253"/><path d="M1,-24 L18,-19 L1,-14Z" fill="#e5484d"/></g>`;
    s+=`<rect x="-400" y="-200" width="${W+800}" height="${H+400}" fill="url(#gVig)" pointer-events="none"/>`;
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
  place(L,pose){ this.L=L; const p=this.road.getPointAtLength(L); this.trail.style.strokeDasharray=this.total; this.trail.style.strokeDashoffset=this.opts.libre?this.total:this.total-L;
    this.pose=Object.assign({dir:'f',flip:false},this.pose||{},pose||{});
    const lift=this.pose.lift||0;
    this.svg.querySelector('.av').innerHTML=`<g transform="translate(${(p.x+13).toFixed(1)},${(p.y-4-lift).toFixed(1)}) scale(.52)">${avatarPose(this.av,this.pose)}</g>`; return p; }
  /* parpadeo y mirada cuando está quieto */
  idle(){ if(this._idle) return; let t0=performance.now();
    this._idle=setInterval(()=>{ if(this.busy||!this.road||document.hidden) return; const t=(performance.now()-t0)/1000;
      const blink=(t*1000%3600)<150, look=Math.sin(t*.7)>.9?1:(Math.sin(t*.7)<-.92?-1:0);
      this.place(this.L||0,{walk:0,blink,look,wave:0,lift:Math.abs(Math.sin(t*1.6))*.6}); },140); }
  anim(dur,fn){ return new Promise(res=>{const t0=performance.now(); const f=t=>{const k=Math.min(1,(t-t0)/dur); fn(k); if(k<1) requestAnimationFrame(f); else res();}; requestAnimationFrame(f);}); }
  /* mueve el avatar a la parada idx: acercar → seguir → animación de llegada → alejar */
  async goTo(idx, conLlegada=true){
    if(this.busy||idx===this.cur||idx<0||idx>=this.stops.length) { if(!this.busy&&idx===this.cur){} return; }
    this.busy=true; this.tag.classList.add('on');
    const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2, lerp=(a,b,k)=>a+(b-a)*k;
    const from=this.L||0, to=this.lens[idx], p0=this.road.getPointAtLength(from), z0=this.zoomAt(p0.x,p0.y), full=this.FULL;
    await this.anim(800,k=>{const e=ease(k); this.setVB(full.map((v,i)=>lerp(v,z0[i],e)));});
    const dur=Math.min(3200,Math.max(1400,Math.abs(to-from)*9));
    await this.anim(dur,k=>{ const e=ease(k), L=lerp(from,to,e), dL=to>from?2:-2;
      const a=this.road.getPointAtLength(L), b=this.road.getPointAtLength(Math.max(0,Math.min(this.total,L+dL)));
      const dx=b.x-a.x, dy=b.y-a.y, vel=Math.min(1,Math.abs(Math.sin(k*Math.PI))*2.2);
      const p=this.place(L,{walk:vel,ph:Math.abs(L-from)/7,dir:dy<-.05?'b':'f',flip:dx<0,wave:0,blink:false,look:0,lift:0}); this.setVB(this.zoomAt(p.x,p.y));});
    this.cur=idx; this.nodes();
    // llegada: salta, mira a la cámara y saluda
    await this.anim(1100,k=>{ this.place(to,{walk:0,dir:'f',flip:false,lift:k<.3?Math.sin(k/.3*Math.PI)*10:0,wave:k>.25?(k-.25)/.75:0}); });
    this.place(to,{walk:0,dir:'f',wave:0,lift:0});
    if(this.opts.onArrive) this.opts.onArrive(idx);
    if(conLlegada){ await this.anim(250,()=>{}); await mostrarLlegada(this.box,this.stops[idx]); }
    const z1=[...this.vb]; await this.anim(900,k=>{const e=ease(k); this.setVB(z1.map((v,i)=>lerp(v,full[i],e)));});
    this.tag.classList.remove('on'); this.busy=false;
  }
}
