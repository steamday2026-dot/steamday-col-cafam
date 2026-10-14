/* =====================================================================
   STEM Day Cafam · Colegio vivo (mapa isométrico del colegio)
   - Perfil Master: exploración del colegio con escenas interiores.
   - Perfil docente: camino animado desde donde estaba hasta su estación.
   Requiere avatar.js y mapa.js (AREA_C, ENV_DEFS, entorno, mostrarLlegada).
   ===================================================================== */
(function(){
const $c=id=>document.getElementById(id);
const esc=t=>t==null?'':String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let DATA=[], ACT=[], NOW=480, AV=avatarNormal({}), CAM=null;
let LIDFN=null, PINS=[];   // v28: líderes de estación por fila y pines de la Agenda Master (administrador)
const toMin=h=>{const[a,b]=h.split(':').map(Number);return a*60+b;};
const cap=t=>t?t.charAt(0)+t.slice(1).toLowerCase():t;
/* escala de los interiores (avatar, detalle de los salones y cámara) */
/* Propuesta D (aprobada): mismo diseño, salones unas 2 veces más amplios frente al avatar */
const CI=()=>Object.assign({av:.22,det:false,vw:136,walk:100,lbl:.44,follow:false},window.__CFGI||{});
const KI=()=>CI().av/.5;   // factor de escala de los interiores frente al diseño original
const titA=f=>f?((f.titulo&&window.tituloA)?window.tituloA(f.titulo):nombreA(f.area||'')):'';
const fmtM=m=>fmtHora(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'));
const rango=cs=>{const s=[...cs].sort();return s.length>1?s[0]+'–'+s[s.length-1]:s[0];};
const nombreA=a=>a.replace('Ciencias Naturales. Actividades del Cambio Climático','Cambio climático').replace('Espacio de dirección de curso','Dirección de curso').replace('Construcción de Rompecabezas','Rompecabezas');

/* ---------- datos por lugar ---------- */
const activos=m=>ACT.filter(f=>toMin(f.hora_inicio)<=m&&m<toMin(f.hora_fin));
/* nombres de lugar del Excel → forma única ("115 A"→"115A", "CANCHA DE FUTBOL"→"Cancha de fútbol"…) */
const CAN_P=[20,102];
function ns(v){ let t=String(v||'').trim().replace(/^[-–\s]+/,'').replace(/\s+/g,' '); const u=t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  if(!t) return ''; if(/CRISTAL/.test(u)) return 'Aula de Cristal'; if(/CANCHA/.test(u)&&/FUTBOL/.test(u)) return 'Cancha de fútbol';
  if(/^COLISEO/.test(u)) return 'Coliseo'; if(u==='HALL PRINCIPAL') return 'Hall Principal';
  if(/^HALL/.test(u)){ if(/(^|\D)3(\D|$)/.test(u)) return 'Hall piso 3'; if(/(^|\D)2(\D|$)/.test(u)) return 'Hall piso 2'; }
  if(/^\d+\s+[AB]$/i.test(t)) return t.replace(/\s+/g,'').toUpperCase();
  return t; }
const nrow=r=>r?Object.assign({},r,{salon:ns(r.salon)}):r;
function enSalon(code,m){ return activos(m).filter(f=>f.salon===code); }
function escDe(f){ const s=ns(f.salon); if(s==='Aula de Cristal') return 'b130'; if(s==='Cancha de fútbol') return 'cancha'; if(/^Hall piso [23]$/.test(s)) return 'bS'; if(s==='Coliseo') return 'coliseo'; if(s==='Hall Principal') return 'hall'; if(/verde/i.test(s)&&!/primaria/i.test(s)) return 'verde';
  if(/verde/i.test(s)&&/primaria/i.test(s)) return /2/.test(s)?'pV2':'pV1';
  if(/^AA/.test(s)){ const n=parseInt(s.slice(2)); return n<=103?'pAA1':(n<=112?'pAA2':'pAA3'); }
  if(/^AB/.test(s)) return 'pAB'; if(/^AC/.test(s)) return 'pAC'; const n=parseInt(s); if(n>=130&&n<200) return 'b130'; if(n>=110&&n<130) return 'hall'; return 'bS'; }
const EXT={ coliseo:'Coliseo', hall:'Hall Principal', bS:'Bloque de salones (pisos 2 y 3)', b130:'Bloque 130', T:'Ala de Tecnología', verde:'Zona verde', cancha:'Cancha de fútbol',
  pAA1:'Primaria · AA 101–103', pAA2:'Primaria · AA 104–112', pAA3:'Primaria · AA 113–115', pAB:'Primaria · Bloque AB', pAC:'Primaria · Bloque AC',
  pV1:'Zona verde Primaria', pV2:'Zona verde Primaria 2', gym:'Gimnasio', pool:'Piscina' };
const colorF=fs=>{ const st=fs.find(f=>f.categoria!=='gen'); return st?AREA_C[st.categoria]:(fs.length?'#8a94a8':null); };

/* ---------- proyección isométrica ---------- */
let CX=200, CY=40;
const P=(i,j,z=0)=>[CX+.62*(i-j), CY+.36*(i+j)-z];
const pts=a=>a.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ');
function box(i0,i1,j0,j1,h,col,roof,opt={}){
  const A=P(i0,j0),B=P(i1,j0),C=P(i1,j1),D=P(i0,j1), up=p=>[p[0],p[1]-h];
  let s=opt.noShadow?'':`<polygon points="${pts([A,B,C,D].map(p=>[p[0]+6,p[1]+4]))}" fill="#000" opacity=".13"/>`;
  s+=`<polygon points="${pts([D,C,up(C),up(D)])}" fill="${opt.brick?'url(#pBrick)':shade(col,.84)}"/>`;
  s+=`<polygon points="${pts([C,B,up(B),up(C)])}" fill="${opt.brick?'url(#pBrickD)':shade(col,.68)}"/>`;
  if(opt.win&&opt.brick){ const pisos=Math.max(1,Math.round(h/13));
    for(let f=0;f<pisos;f++){ const yy=h*(f+.45)/pisos;
      s+=`<line x1="${D[0]+3}" y1="${D[1]-h+yy+1}" x2="${C[0]-3}" y2="${C[1]-h+yy}" stroke="#3d4f66" stroke-width="4.2" stroke-dasharray="7 1.3"/>`;
      s+=`<line x1="${C[0]+3}" y1="${C[1]-h+yy}" x2="${B[0]-3}" y2="${B[1]-h+yy+1}" stroke="#33435a" stroke-width="4.2" stroke-dasharray="7 1.3"/>`; } }
  else if(opt.win){ const pisos=Math.max(1,Math.round(h/12));
    for(let f=0;f<pisos;f++){ const yy=h*(f+.4)/pisos;
      s+=`<line x1="${D[0]+4}" y1="${D[1]-h+yy+1}" x2="${C[0]-4}" y2="${C[1]-h+yy}" stroke="#dbe9ff" stroke-width="3" stroke-dasharray="5 3" opacity=".85"/>`;
      s+=`<line x1="${C[0]+4}" y1="${C[1]-h+yy}" x2="${B[0]-4}" y2="${B[1]-h+yy+1}" stroke="#c4d8f5" stroke-width="3" stroke-dasharray="5 3" opacity=".75"/>`; } }
  if(opt.band){ s+=`<polygon points="${pts([D,C,C,D].map((p,k)=>[p[0],p[1]-h+(k<2?1:4.5)]))}" fill="${opt.band}"/><polygon points="${pts([C,B,B,C].map((p,k)=>[p[0],p[1]-h+(k<2?1:4.5)]))}" fill="${shade(opt.band,.75)}"/>`; }
  s+=`<polygon points="${pts([up(A),up(B),up(C),up(D)])}" fill="${roof||'#eef1f5'}" stroke="${opt.brick?'#c7ccd6':shade(col,.9)}" stroke-width="1"/>`;
  if(opt.brick){ const L=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]; const n=Math.max(3,Math.round(Math.hypot(B[0]-A[0],B[1]-A[1])/9));
    for(let k=1;k<n;k++){ const a=up(L(A,B,k/n)), b=up(L(D,C,k/n)); s+=`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#dde2ea" stroke-width=".7"/>`; } }
  return s;
}
const R1=k=>{ const x=Math.sin(k*12.9898)*43758.5453; return x-Math.floor(x); };
const flat=(i0,i1,j0,j1,col,st)=>`<polygon points="${pts([P(i0,j0),P(i1,j0),P(i1,j1),P(i0,j1)])}" fill="${col}" ${st?`stroke="${st}" stroke-width="1.3"`:''}/>`;
const tree=(i,j,r=9)=>{ const [x,y]=P(i,j); return `<ellipse cx="${x+3}" cy="${y+r*.6}" rx="${r}" ry="${r*.42}" fill="#000" opacity=".13"/><circle cx="${x}" cy="${y-r*.4}" r="${r}" fill="#3f9b52"/><circle cx="${x-r*.3}" cy="${y-r*.7}" r="${r*.45}" fill="#5cb85c"/>`; };
function tag(x,y,t1,t2,col,key){ const w=Math.max(70,Math.min(118,Math.max(t1.length,(t2||'').length)*5.2+16));
  return `<g class="tap" data-k="${key||''}"><rect x="${x-w/2}" y="${y-(t2?30:20)}" width="${w}" height="${t2?30:20}" rx="7" fill="#fff" stroke="${col||'#9aa3b5'}" stroke-width="${t2?2:1}"/>
  <text x="${x}" y="${y-(t2?18:7)}" text-anchor="middle" style="font-size:8.3px;font-weight:800;fill:#1b2333">${t1}</text>${t2?`<text x="${x}" y="${y-6}" text-anchor="middle" style="font-size:7.4px;font-weight:700;fill:${col}">${t2}</text>`:''}</g>`; }

/* ================= ESCENA EXTERIOR ================= */
// coordenadas (i hacia la derecha-abajo, j hacia la izquierda-abajo)
const X={ hall:[150,215,20,340], bS:[-10,330,150,195], b130:[110,320,-40,20], T:[-5,110,90,135], canchas:[0,120,10,80], coliseo:[30,140,266,406], plaza:[20,240,345,445], verde:[226,412,30,142] };
// Sede Primaria: se ubica en pantalla (x,y) y se convierte a coordenadas isométricas
const IJ=(x,y)=>{ const a=(x-215)/.62, b=(y-60)/.36; return [(a+b)/2,(b-a)/2]; };
// complejo AA/AB: AA 104–112 al centro (horizontal); AA 113–115 y AB pegados al frente; AA 101–103 pegado arriba
const CO=IJ(200,-310), scr=(i,j)=>[215+.62*(i-j),60+.36*(i+j)];
const rel=(i0,i1,j0,j1,o)=>{ const r=[CO[0]-85+i0,CO[0]-85+i1,CO[1]-22+j0,CO[1]-22+j1]; return Object.assign({r,c:scr((r[0]+r[1])/2,(r[2]+r[3])/2)},o); };
const PB={
  pAA1:{c:[45,-320],wi:40,wj:60,h:22,t:'AA 101–103',d:[55,-304.5],lab:[-10,0]},
  pAA2:{r:[-650,-510,-470,-430],h:22,t:'AA 104–112',d:[106,-306],lab:[30,-4]},
  pAA3:{c:[150,-260],wi:40,wj:60,h:22,t:'AA 113–115',d:[176,-256.7],lab:[40,50]},
  pAB:{r:[-502,-422,-478,-428],h:28,t:'Bloque AB',d:[190,-252],lab:[40,10]},
  pAC:{c:[85,-195],wi:45,wj:80,h:28,t:'Bloque AC',d:[97.5,-178.7],lab:[-15,4]} };
Object.values(PB).forEach(o=>{ if(o.r) o.c=scr((o.r[0]+o.r[1])/2,(o.r[2]+o.r[3])/2); });
const PV={ pV1:{c:[30,-115],wi:70,wj:110,t:'Zona verde'}, pV2:{c:[-5,-235],wi:60,wj:90,t:'Zona verde 2',lab:[-30,0]} };
const rect=o=>{ if(o.r) return o.r; const [ic,jc]=IJ(...o.c); return [ic-o.wi/2,ic+o.wi/2,jc-o.wj/2,jc+o.wj/2]; };
const puerta=o=>{ if(o.d) return IJ(...o.d); const [i0,i1,j0,j1]=rect(o); const [x,y]=P(i1,j1); return IJ(x,y+7); };
// caminos en pantalla
// senderos rectos alrededor de la cancha (bachillerato → primaria)
const CAN_T=[84,-27.3], CAN_L=[-94,76], CAN_B=[-2.2,129.3], CAN_R=[175.8,26];
const SENDERO=[[77,248],[40,262],[-34,221],[-34,178],[-60,163],CAN_B,CAN_R,CAN_T];
const SENDEROS_B=[[[-34,222],[-34,178],[-60,163],CAN_B,CAN_R,CAN_T],[CAN_B,CAN_L,CAN_T],[[122.6,56.8],[264.6,139.2]]];  // el 3.º: sendero a la Entrada 2
const CARRETERA=[[84,-27.3],[100,-95],[106,-150],[150,-163],[195,-165]];
const RAMAL=[[102,-95],[250,-100]], VERT=[[190,-165],[192,-97]];
const PT0=[106,-150];
// un solo sendero peatonal conecta todos los salones de primaria
// sendero de primaria: sale del ramal, ramal al Bloque AC, sube por la izquierda de AA 113–115 hasta AA 104–112 y AA 101–103
// tramos rectos alineados con la cuadrícula del mapa (sin tocar edificios)
const TRONCO=[[137,-87.5],[137,-233.5]], T_AC=[[97.5,-178.7],[137,-201.6]],
  T_MAIN=[[137,-87.5],[137,-233.5],[84.4,-264],[130.2,-291.6],[81.4,-320.6],[55,-304.5]], T_AA3=[[137,-233.5],[176,-256.7]];
const ESPINA=TRONCO, SENDEROS_P=[T_MAIN,T_AC,T_AA3];
// recorrido del avatar: por el sendero hasta el punto más cercano y luego a la puerta
const R0=[[100,-95],[137,-96],[137,-201.6]], R3=[[100,-95],[137,-96],[137,-233.5]], R2=[...R3,[84.4,-264],[130.2,-291.6]];
const RUTAS_P={ pV1:[[100,-60],[100,-100]], pV2:[[100,-95],PT0], pAC:R0, pAA3:R3, pAB:[...R3,[176,-256.7]], sala:R0, pAA2:R2, pAA1:[...R2,[81.4,-320.6]] };
const WX={ inicio:[182,352], plaza:[150,372], coliseo:[85,416], hall:[182,342] };
const linea=(pp,w,col,extra='')=>`<path d="M${pp.map(p=>p.join(',')).join(' L')}" fill="none" stroke="${col}" stroke-width="${w}" ${/linecap/.test(extra)?'':'stroke-linecap="round" stroke-linejoin="round"'} ${extra}/>`;
/* sala de profesores y restaurante */
const SALA={c:[195,-209],wi:40,wj:40,h:22,d:[195,-188]}, REST={c:[285,-240],wi:52,wj:52,h:18};
/* piscina: deck de baldosas, carriles, escalera, oleaje, asoleadoras y sombrilla */
function piscina(o){ const [a,b,c,d]=rect(o); let s=flat(a-12,b+12,c-12,d+12,'url(#pDeck)','#b9ad97')+flat(a-2,b+2,c-2,d+2,'#e9eef4','#9fb3c8');
  s+=flat(a,b,c,d,'url(#gPool)');
  for(let k=1;k<5;k++){ const j=c+(d-c)*k/5; const p=P(a+3,j), q=P(b-3,j); s+=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#fff" stroke-width="1" stroke-dasharray="3 2" opacity=".85"/>`; }
  for(let k=0;k<3;k++){ const p=P(a+10+k*18,c+12+k*20); s+=`<path d="M${p[0]-7},${p[1]} q3.5,-2.5 7,0 t7,0" stroke="#e6f6ff" stroke-width="1.2" fill="none"><animateTransform attributeName="transform" type="translate" values="0,0;4,2.3;0,0" dur="${3+k}s" repeatCount="indefinite"/></path>`; }
  { const p=P(b,c+8), q=P(b,c+8,8); s+=`<path d="M${p[0]-2},${p[1]-1} L${q[0]-2},${q[1]-1} M${p[0]+2},${p[1]+1} L${q[0]+2},${q[1]+1}" stroke="#c4ccd6" stroke-width="1.4" fill="none"/>`; }
  [[b+7,c+16],[b+7,c+32],[b+7,c+48]].forEach(([i,j])=>{ s+=box(i-3,i+3,j-6,j+6,2,'#ffffff','#f2a900',{noShadow:1}); });
  { const [x,y]=P(b+4,d+2); s+=envPicnic(x,y); }
  return s; }
/* gimnasio: muros claros, ventanal, puerta con marquesina, letrero y techo curvo */
function gimnasio(o,h){ const [a,b,c,d]=rect(o); let s=box(a,b,c,d,h,'#cfd6df','#cfd6df',{l:1});
  const D=P(a,d),C=P(b,d),B=P(b,c), L=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
  // ventanal y puerta en la fachada
  { const p1=L(D,C,.08),p2=L(D,C,.92); s+=`<polygon points="${pts([[p1[0],p1[1]-h*.35],[p2[0],p2[1]-h*.35],[p2[0],p2[1]-h*.85],[p1[0],p1[1]-h*.85]])}" fill="#4d6a8a"/>`;
    for(let k=1;k<9;k++){ const m=L(p1,p2,k/9); s+=`<line x1="${m[0]}" y1="${m[1]-h*.35}" x2="${m[0]}" y2="${m[1]-h*.85}" stroke="#e8edf3" stroke-width=".8"/>`; }
    const dm=L(D,C,.5); s+=`<polygon points="${pts([[dm[0]-5,dm[1]-3],[dm[0]+5,dm[1]+3],[dm[0]+5,dm[1]+3-h*.3],[dm[0]-5,dm[1]-3-h*.3]])}" fill="#2b3a4d"/>`;
    s+=`<polygon points="${pts([[dm[0]-9,dm[1]-5-h*.33],[dm[0]+9,dm[1]+5-h*.33],[dm[0]+12,dm[1]+8-h*.36],[dm[0]-6,dm[1]-2-h*.36]])}" fill="#e5484d"/>`; }
  { const p1=L(C,B,.15),p2=L(C,B,.85); s+=`<polygon points="${pts([[p1[0],p1[1]-h*.4],[p2[0],p2[1]-h*.4],[p2[0],p2[1]-h*.8],[p1[0],p1[1]-h*.8]])}" fill="#3e5674"/>`; }
  // techo curvo (bóveda a lo largo de i)
  const rise=12, arc=(i,t)=>{ const j=c+(d-c)*t; const [x,y]=P(i,j,h+Math.sin(t*Math.PI)*rise); return [x,y]; }, N=12;
  const back=[...Array(N+1)].map((_,k)=>arc(a,k/N)), front=[...Array(N+1)].map((_,k)=>arc(b,k/N));
  s+=`<polygon points="${pts([...back,...front.slice().reverse()])}" fill="url(#gGymRoof)" stroke="#9aa6b5" stroke-width=".8"/>`;
  for(let k=1;k<N;k++) s+=`<line x1="${back[k][0]}" y1="${back[k][1]}" x2="${front[k][0]}" y2="${front[k][1]}" stroke="#aeb9c7" stroke-width=".6"/>`;
  s+=`<polygon points="${pts([P(b,c,h),...front,P(b,d,h)])}" fill="#bcc5d1" stroke="#9aa6b5" stroke-width=".8"/>`;
  { const m=arc(b,.5); s+=`<circle cx="${m[0]}" cy="${m[1]+5}" r="3.2" fill="#e5484d"/><path d="M${m[0]-1.8},${m[1]+5} h3.6 M${m[0]},${m[1]+3.2} v3.6" stroke="#fff" stroke-width="1"/>`; }
  { const p=L(D,C,.5); s+=`<rect x="${p[0]-17}" y="${p[1]-h-9}" width="34" height="8" rx="2" fill="#173d7a"/><text x="${p[0]}" y="${p[1]-h-3.2}" text-anchor="middle" style="font-size:5.2px;font-weight:800;fill:#fff">GIMNASIO</text>`; }
  return s; }
function restaurante(o){ const [a,b,c,d]=rect(o); let s=box(a,b,c,d,o.h,'#f1e4cf','#f4f5f7',{brick:0,band:'#e5484d'});
  const D=P(a,d),C=P(b,d),B=P(b,c), L=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
  { const p1=L(D,C,.08),p2=L(D,C,.92); s+=`<polygon points="${pts([[p1[0],p1[1]-o.h*.25],[p2[0],p2[1]-o.h*.25],[p2[0],p2[1]-o.h*.7],[p1[0],p1[1]-o.h*.7]])}" fill="#6a86a6"/>`;
    for(let k=0;k<8;k++){ const q1=L(p1,p2,k/8), q2=L(p1,p2,(k+1)/8); s+=`<polygon points="${pts([[q1[0],q1[1]-o.h*.72],[q2[0],q2[1]-o.h*.72],[q2[0]+3,q2[1]-o.h*.55+4],[q1[0]+3,q1[1]-o.h*.55+4]])}" fill="${k%2?'#fff':'#e5484d'}"/>`; } }
  { const p1=L(C,B,.12),p2=L(C,B,.88); s+=`<polygon points="${pts([[p1[0],p1[1]-o.h*.25],[p2[0],p2[1]-o.h*.25],[p2[0],p2[1]-o.h*.7],[p1[0],p1[1]-o.h*.7]])}" fill="#56718f"/>`; }
  [[a+8,d+16],[a+30,d+18]].forEach(([i,j])=>{ const [x,y]=P(i,j); s+=envPicnic(x,y); });
  return s; }
/* coliseo: muros de concreto con zócalo de ladrillo, franja de ventanas altas, entrada con marquesina, letrero y cubierta curva */
function coliseoExt(r,h,band){ const [a,b,c,d]=r; let s=box(a,b,c,d,h,'#c9ced6','#c9ced6',{});
  const D=P(a,d),C=P(b,d),B=P(b,c), L=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t], quad=(p1,p2,z1,z2,f)=>`<polygon points="${pts([[p1[0],p1[1]-z1],[p2[0],p2[1]-z1],[p2[0],p2[1]-z2],[p1[0],p1[1]-z2]])}" fill="${f}"/>`;
  s+=quad(D,C,0,9,'url(#pBrick)')+quad(C,B,0,9,'url(#pBrickD)');
  // ventanas altas continuas
  s+=quad(L(D,C,.04),L(D,C,.96),h*.6,h*.82,'#4d6a8a')+quad(L(C,B,.04),L(C,B,.96),h*.6,h*.82,'#3e5674');
  for(let k=1;k<16;k++){ const m=L(D,C,k/16); s+=`<line x1="${m[0]}" y1="${m[1]-h*.6}" x2="${m[0]}" y2="${m[1]-h*.82}" stroke="#e8edf3" stroke-width=".7"/>`; }
  for(let k=1;k<12;k++){ const m=L(C,B,k/12); s+=`<line x1="${m[0]}" y1="${m[1]-h*.6}" x2="${m[0]}" y2="${m[1]-h*.82}" stroke="#d6dde6" stroke-width=".7"/>`; }
  // franja del área cuando hay actividad
  if(band) s+=quad(D,C,h*.86,h*.93,band)+quad(C,B,h*.86,h*.93,shade(band,.75));
  // entrada principal hacia la plaza
  { const p1=L(D,C,.38),p2=L(D,C,.62); s+=quad(p1,p2,0,h*.38,'#2b3a4d');
    for(let k=1;k<4;k++){ const m=L(p1,p2,k/4); s+=`<line x1="${m[0]}" y1="${m[1]}" x2="${m[0]}" y2="${m[1]-h*.38}" stroke="#7d8ea3" stroke-width=".8"/>`; }
    const q1=L(D,C,.33),q2=L(D,C,.67); s+=`<polygon points="${pts([[q1[0],q1[1]-h*.42],[q2[0],q2[1]-h*.42],[q2[0]+4,q2[1]-h*.42+6],[q1[0]+4,q1[1]-h*.42+6]])}" fill="#e9edf2" stroke="#9aa6b5" stroke-width=".7"/>`;
    const sm=L(D,C,.5); s+=`<rect x="${sm[0]-20}" y="${sm[1]-h*.55-4}" width="40" height="8" rx="2" fill="#173d7a"/><text x="${sm[0]}" y="${sm[1]-h*.55+1.8}" text-anchor="middle" style="font-size:5.4px;font-weight:800;fill:#fff">COLISEO</text>`; }
  // cubierta curva a lo largo de j, con claraboyas
  const rise=15, N=14, arc=(j,t)=>P(a+(b-a)*t,j,h+Math.sin(t*Math.PI)*rise);
  const back=[...Array(N+1)].map((_,k)=>arc(c,k/N)), front=[...Array(N+1)].map((_,k)=>arc(d,k/N));
  s+=`<polygon points="${pts([...back,...front.slice().reverse()])}" fill="url(#gGymRoof)" stroke="#9aa6b5" stroke-width=".8"/>`;
  for(let k=1;k<N;k++) s+=`<line x1="${back[k][0]}" y1="${back[k][1]}" x2="${front[k][0]}" y2="${front[k][1]}" stroke="#b4bfcc" stroke-width=".6"/>`;
  { const t1=.42,t2=.58; for(let q=0;q<4;q++){ const j1=c+(d-c)*(.12+q*.21), j2=j1+(d-c)*.12; s+=`<polygon points="${pts([arc(j1,t1),arc(j1,t2),arc(j2,t2),arc(j2,t1)])}" fill="#a9d4f0" stroke="#7fa9c8" stroke-width=".6"/>`; } }
  s+=`<polygon points="${pts([P(a,d,h),...front,P(b,d,h)])}" fill="#bcc5d1" stroke="#9aa6b5" stroke-width=".8"/>`;
  return s; }
/* cancha deportiva en el piso: fútbol sala (fs) o voleibol (vb) */
function cancha(a,b,c,d,tipo){ const fs=tipo==='fs'; let s=flat(a-4,b+4,c-4,d+4,'#c9b28a')+flat(a,b,c,d,fs?'#3f8fd6':'#e08a4f','#fff');
  if(fs) s+=flat(a+3,b-3,c+3,d-3,'#4a9be0');
  const ln=(i1,j1,i2,j2,w=1)=>{ const p=P(i1,j1),q=P(i2,j2); return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#fff" stroke-width="${w}"/>`; };
  const jm=(c+d)/2, im=(a+b)/2;
  s+=flat(a+2,b-2,c+2,d-2,'none','#fff')+ln(a+2,jm,b-2,jm);
  if(fs){ const [x,y]=P(im,jm); s+=`<ellipse cx="${x}" cy="${y}" rx="7" ry="4" fill="none" stroke="#fff" stroke-width="1"/>`;
    s+=flat(im-9,im+9,c+2,c+12,'none','#fff')+flat(im-9,im+9,d-12,d-2,'none','#fff');
    [[c+1,-1],[d-1,1]].forEach(([j,sg])=>{ const p=P(im-6,j),q=P(im+6,j); s+=`<polygon points="${p[0]},${p[1]} ${q[0]},${q[1]} ${q[0]},${q[1]-6} ${p[0]},${p[1]-6}" fill="none" stroke="#fff" stroke-width="1.2"/>`; }); }
  else { s+=ln(a+2,jm-12,b-2,jm-12,.8)+ln(a+2,jm+12,b-2,jm+12,.8);
    const p=P(a-3,jm),q=P(b+3,jm); s+=`<line x1="${p[0]}" y1="${p[1]}" x2="${p[0]}" y2="${p[1]-11}" stroke="#555" stroke-width="1.4"/><line x1="${q[0]}" y1="${q[1]}" x2="${q[0]}" y2="${q[1]-11}" stroke="#555" stroke-width="1.4"/>`;
    s+=`<polygon points="${p[0]},${p[1]-11} ${q[0]},${q[1]-11} ${q[0]},${q[1]-6} ${p[0]},${p[1]-6}" fill="rgba(255,255,255,.55)" stroke="#fff" stroke-width=".6"/>`; }
  return s; }
function sceneExt(m){
  CX=215; CY=60; let s='';
  s+=`<defs>${ENV_DEFS}<pattern id="pDeck" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#e8dcc6"/><path d="M0,0 H8 M0,0 V8" stroke="#d3c4a8" stroke-width=".8"/></pattern>
    <linearGradient id="gPool" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd3f5"/><stop offset="1" stop-color="#2f8fd0"/></linearGradient>
    <linearGradient id="gGymRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2f6"/><stop offset="1" stop-color="#c6cfda"/></linearGradient></defs><rect class="bgr" x="-600" y="-700" width="1600" height="1700" fill="url(#pGrass)"/>`;
  [[60,300],[300,330],[330,-60],[-300,-100],[-500,-300]].forEach(([i,j],k)=>{ const [x,y]=P(i,j); s+=`<ellipse class="bgr" cx="${x}" cy="${y}" rx="${60+k*10}" ry="${24+k*4}" fill="#a6d48e" opacity=".55"/>`; });
  s+='<g class="bgr">'+envGrass(-160,-420,700,820,520,9)+'</g>';
  const A=activos(m), por=k=>A.filter(f=>escDe(f)===k);
  /* --- SEDE PRIMARIA (arriba) --- */
  SENDEROS_B.forEach(c=>s+=linea(c,11,'#c9b28a','stroke-linecap="butt" stroke-linejoin="miter"')); SENDEROS_B.forEach(c=>s+=linea(c,9,'url(#pCobble)','stroke-linecap="butt" stroke-linejoin="miter"'));
  // parqueadero, carretera y ramales
  s+=`<polygon points="235,-165 305,-160 305,-104 235,-108" fill="#a3a9b2" stroke="#7d848e" stroke-width="1.5"/>`;
  for(let k=1;k<6;k++) s+=`<line x1="${235+k*11.7}" y1="${-165+k*.8}" x2="${235+k*11.7}" y2="${-140+k*.8}" stroke="#fff" stroke-width="1"/><line x1="${235+k*11.7}" y1="${-131+k*.6}" x2="${235+k*11.7}" y2="${-107+k*.6}" stroke="#fff" stroke-width="1"/>`;
  { const vias=[CARRETERA,RAMAL,VERT];   // bordes, luego superficie, luego líneas centrales recortadas en los cruces
    const corta=(c,a,b)=>{ const d=(p,q,t)=>{ const L=Math.hypot(q[0]-p[0],q[1]-p[1])||1; return [p[0]+(q[0]-p[0])*t/L,p[1]+(q[1]-p[1])*t/L]; };
      const r=c.map(p=>[...p]); if(a) r[0]=d(c[0],c[1],a); if(b) r[r.length-1]=d(c[c.length-1],c[c.length-2],b); return r; };
    vias.forEach(c=>s+=linea(c,17,'#6d737c')); vias.forEach(c=>s+=linea(c,14,'#8d939c'));
    s+=linea(corta(CARRETERA,0,10),1.2,'#fff','stroke-dasharray="6 6"')+linea(corta(RAMAL,10,0),1.2,'#fff','stroke-dasharray="6 6"')+linea(corta(VERT,10,10),1.2,'#fff','stroke-dasharray="6 6"'); }
  s+=`<text x="268" y="-130" text-anchor="middle" style="font-size:7px;font-weight:800;fill:#fff">P</text>`;
  // senderos peatonales de primaria
  // el sendero cruza la vía: la vía se interrumpe y retoma después del sendero
  SENDEROS_P.forEach(c=>s+=linea(c,10,'#c9b28a','stroke-linecap="butt" stroke-linejoin="miter"')); SENDEROS_P.forEach(c=>s+=linea(c,8,'url(#pCobble)','stroke-linecap="butt" stroke-linejoin="miter"'));
  // piscina y gimnasio (no se usan)
  s+=piscina({c:[207,-54],wi:60,wj:70});
  // zonas verdes de primaria
  const pv={}; Object.entries(PV).forEach(([k,o])=>{ const [a,b,c,d]=rect(o); pv[k]=por(k); s+=flat(a,b,c,d,'#a9dc8f','#6fae5a')+flat(a+6,b-6,c+6,d-6,'#b5e39b');
    if(pv[k].length) pv[k].slice(0,4).forEach((f,n)=>s+=carpa(a+12+(n%2)*26,c+14+Math.floor(n/2)*34,AREA_C[f.categoria]||'#8a94a8','',.5));
    else { const [x,y]=P((a+b)/2,(c+d)/2); s+=envFlowers(x,y,k.length*5)+envBench(x+22,y+6); }
    [[a,c],[b,c],[a,d]].forEach(([i,j],n)=>{ const [x,y]=P(i,j); s+=envTreeRound(x,y,.65,n+k.length); }); });
  // bloques AA, AB, AC (de atrás hacia adelante)
  const pb={}; Object.entries(PB).sort((a,b)=>{ const ra=rect(a[1]), rb=rect(b[1]); return (ra[0]+ra[1]+ra[2]+ra[3])-(rb[0]+rb[1]+rb[2]+rb[3]); }).forEach(([k,o])=>{ pb[k]=por(k); const [a,b,c,d]=rect(o); s+=box(a,b,c,d,o.h,'#bd6a43','#f4f5f7',{win:1,brick:1,band:colorF(pb[k])}); });
  { const [a,b,c,d]=rect(SALA); s+=box(a,b,c,d,SALA.h,'#bd6a43','#f4f5f7',{win:1,brick:1,band:'#173d7a'}); }
  s+=restaurante(REST);
  s+=gimnasio({c:[160,-8],wi:44,wj:44},24);
  // árboles de primaria
  [[-60,-150],[-70,-290],[0,-360],[120,-380],[250,-370],[320,-290],[330,-190],[-50,-60]].forEach(([x,y],k)=>s+=k%3===1?envPine(x,y,.8):envTreeRound(x,y,.8,k+20));
  { const [x,y]=[45,-40]; s+=`<rect x="${x-1}" y="${y-26}" width="2" height="26" fill="#3a4253"/><rect x="${x-34}" y="${y-38}" width="68" height="13" rx="3" fill="#173d7a"/><text x="${x}" y="${y-29}" text-anchor="middle" style="font-size:7px;font-weight:800;fill:#fff">SEDE PRIMARIA ↑</text>`; }
  /* --- CANCHA DE FÚTBOL Y SENDERO --- */
  { const [ic,jc]=IJ(61.7,52.6), a=ic-40,b=ic+40,c=jc-110,d=jc+110; s+=flat(a-4,b+4,c-4,d+4,'#3f8f47')+flat(a,b,c,d,'#6fbf5e','#fff');
    for(let k=0;k<8;k++) s+=flat(a,b,c+k*27.5,c+k*27.5+13.75,'#79c868');
    s+=flat(a,b,c,d,'none','#fff')+flat(a,b,jc-.6,jc+.6,'#fff')+flat(a+18,b-18,c,c+26,'none','#fff')+flat(a+18,b-18,d-26,d,'none','#fff');
    const [x,y]=P(ic,jc); s+=`<ellipse cx="${x}" cy="${y}" rx="18" ry="10" fill="none" stroke="#fff" stroke-width="1.2"/>`;
  }
  // tribuna junto a la cancha grande (mira hacia la cancha)
  { const [ic,jc]=IJ(61.7,52.6), A=ic-40, j0=jc-40, j1=jc+40, cols=['#e5484d','#2f6fde','#f2a900','#1f9d6b','#173d7a','#ec7fb0'];
    s+=flat(A-27,A-2,j0-3,j1+3,'#cfc6b4','#b3a993');
    [[A-25,A-18,13],[A-18,A-11,9],[A-11,A-4,5]].forEach(([i0,i1,h],t)=>{ s+=box(i0,i1,j0,j1,h,'#9aa3b5','#c3cad6',{noShadow:t>0});
      s+=box(i0+1,i1-1,j0+1,j1-1,1.6,'#2f6fde','#4a86e8',{noShadow:1});
      for(let k=0;k<14;k++){ if(R1(k*7+t*31)<.35) continue; const j=j0+4+k*(j1-j0-8)/13; const [x,y]=P((i0+i1)/2,j,h+1.6); s+=persona(x,y,cols[(k+t*2)%6]); } });
    // cubierta sobre postes
    const H=26; [[A-26,j0],[A-26,j1],[A-6,j0],[A-6,j1]].forEach(([i,j])=>{ const p=P(i,j),q=P(i,j,H); s+=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#6b7280" stroke-width="1.2"/>`; });
    s+=`<polygon points="${pts([P(A-28,j0-2,H+4),P(A-4,j0-2,H),P(A-4,j1+2,H),P(A-28,j1+2,H+4)])}" fill="#e9edf2" stroke="#9aa6b5" stroke-width=".8" opacity=".92"/>`;
    s+=`<polygon points="${pts([P(A-4,j0-2,H),P(A-4,j1+2,H),P(A-4,j1+2,H-3),P(A-4,j0-2,H-3)])}" fill="#173d7a"/>`; }
  /* --- BACHILLERATO (sin cambios) --- */
  s+=flat(...X.plaza,'url(#pPlaza)','#b9a27e');
  // espacio abierto con vegetación entre el Coliseo y el bloque de salones
  s+=flat(-10,140,199,262,'#a9dc8f','#6fae5a')+flat(-2,132,206,255,'#b5e39b');
  [[0,212],[25,240],[55,214],[85,244],[110,214],[132,236]].forEach(([i,j],k)=>{ const [x,y]=P(i,j); s+=k%2?envBush(x,y,.85):envTreeRound(x,y,.7,k+40); });
  { const [x,y]=P(70,230); s+=envFlowers(x,y,61); }
  s+=flat(...X.verde,'#a9dc8f','#6fae5a')+flat(X.verde[0]+8,X.verde[1]-8,X.verde[2]+8,X.verde[3]-8,'#b5e39b');
  { const a=P(214,100), b=P(250,100); s+=linea([a,b],10,'#c9b28a','stroke-linecap="butt"')+linea([a,b],8,'url(#pCobble)','stroke-linecap="butt"'); }  // salida 3 a la Zona verde
  // canchas junto al Ala de Tecnología: 2 de fútbol sala y 1 de voleibol
  s+=cancha(-78,-38,-105,-25,'fs')+cancha(-32,8,-105,-25,'fs')+cancha(-30,8,-12,50,'vb');
  // dos canchas de voleibol al costado izquierdo, junto al sendero
  s+=cancha(-215,-173,285,370,'vb')+cancha(-152,-110,302,387,'vb');
  [[250,-70],[440,40],[445,125],[-240,430],[-150,470]].forEach(([i,j],k)=>{ const [x,y]=P(i,j); s+=k%3===1?envPine(x,y,.8):envTreeRound(x,y,.8,k+3); });
  [[215,420],[200,440],[260,355]].forEach(([i,j],k)=>{ const [x,y]=P(i,j); s+=k%2?envBush(x,y,.9):envFlowers(x,y,k*7+2); });
  const ve=por('verde');
  s+=box(...X.T,26,'#d6c4dd','#f3eef6',{win:1});
  const b1=por('b130'); s+=box(...X.b130,30,'#bd6a43','#f4f5f7',{win:1,brick:1,band:colorF(b1)});
  const hl=por('hall');
  s+=box(X.hall[0],X.hall[1],X.hall[2],150,16,'#bd6a43','#f4f5f7',{brick:1,win:1,band:colorF(hl)});
  [[236,40],[400,40],[402,134]].forEach(([i,j],k)=>{ const [x,y]=P(i,j); s+=envTreeRound(x,y,.75,k+11); });
  [[240,128],[340,40]].forEach(([i,j])=>{ const [x,y]=P(i,j); s+=envBush(x,y,.8); });
  if(ve.length){ ve.slice(0,6).forEach((f,k)=>{ const i=342+(k%3)*22, j=58+Math.floor(k/3)*38; s+=carpa(i,j,AREA_C[f.categoria]||'#8a94a8','',.55); }); }
  else { const [x,y]=P(370,86); s+=envFlowers(x,y,21)+envBench(x+26,y+6); }
  const bs=por('bS'); s+=box(...X.bS,36,'#bd6a43','#f4f5f7',{win:1,brick:1,band:colorF(bs)});
  const co=por('coliseo'); s+=coliseoExt(X.coliseo,30,colorF(co));
  s+=box(X.hall[0],X.hall[1],195,X.hall[3],16,'#bd6a43','#f4f5f7',{brick:1,win:1,band:colorF(hl)});
  const [dx,dy]=P(182,340); s+=`<rect x="${dx-26}" y="${dy-14}" width="52" height="9" rx="2" fill="#173d7a"/><text x="${dx}" y="${dy-7.5}" text-anchor="middle" style="font-size:5.6px;font-weight:800;fill:#fff">COLEGIO CAFAM</text>`;
  const [ix,iy]=P(...WX.inicio); s+=`<g transform="translate(${ix},${iy+16})"><rect x="-22" y="-8" width="44" height="15" rx="7" fill="#7ed957"/><text y="3" text-anchor="middle" style="font-size:8px;font-weight:800;fill:#1b2333">INICIO</text></g>`;
  /* --- etiquetas --- */
  const Lxy=(k,x,y,fs,extra)=>{ const c=colorF(fs), gr=[...new Set(fs.map(f=>f.grado))];
    if(fs.length) s+=`<circle cx="${x}" cy="${y+10}" r="14" fill="${c}" opacity=".25"><animate attributeName="r" values="9;20;9" dur="1.6s" repeatCount="indefinite"/></circle>`;
    s+=tag(x,y,extra||EXT[k],fs.length?`● ${fs.length} cursos · ${gr.join(', ').slice(0,22)}`:'',c,k); };
  const L=(k,i,j,z,fs,extra)=>{ const [x,y]=P(i,j,z); Lxy(k,x,y,fs,extra); };
  Object.entries(PB).forEach(([k,o])=>{ const l=o.lab||[0,0]; Lxy(k,o.c[0]+l[0],o.c[1]-o.h-16+l[1],pb[k],o.t); });
  Object.entries(PV).forEach(([k,o])=>{ const l=o.lab||[0,0]; Lxy(k,o.c[0]+l[0],o.c[1]-6+l[1],pv[k],o.t); });
  const nouse=(k,x,y,t)=>{ s+=tag(x,y,t,'',null,k)+`<text x="${x}" y="${y+8}" text-anchor="middle" style="font-size:7px;font-weight:700;fill:#8a5aa0">No se usa este día</text>`; };
  { const cf=por('cancha'); Lxy('cancha',61.7,40,cf,'Cancha de fútbol'); }
  nouse('pool',270,-36,'Piscina'); nouse('gym',122,-50,'Gimnasio');
  s+=tag(SALA.c[0]+48,SALA.c[1]+8,'Sala de profesores','',null,'sala')+tag(REST.c[0]+20,REST.c[1]-24,'Restaurante','',null,'rest');
  { const [x,y]=[61.7,74.6]; s+=`<text x="${x}" y="${y+3}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff;opacity:.9">CANCHA DE FÚTBOL</text>`; }
  L('T',75,128,26,[], 'Ala de Tecnología'); L('b130',220,-10,38,b1); L('bS',245,172,44,bs,'Bloque de salones (2.º y 3.º piso)'); L('hall',182,260,24,hl); L('coliseo',80,404,58,co); L('verde',372,96,22,ve);
  const cartel=(i,j,t)=>{ const [x,y]=P(i,j); return `<g><line x1="${x}" y1="${y}" x2="${x}" y2="${y-12}" stroke="#173d7a" stroke-width="1.4"/><rect x="${x-24}" y="${y-25}" width="48" height="13" rx="6" fill="#173d7a"/><text x="${x}" y="${y-15.5}" text-anchor="middle" style="font-size:7px;font-weight:800;fill:#fff">${t}</text></g>`; };
  s+=cartel(128,64,'ENTRADA 2')+cartel(244,104,'ENTRADA 3');
  const [tx,ty]=P(75,128,26); s+=`<text x="${tx}" y="${ty+8}" text-anchor="middle" style="font-size:7px;font-weight:700;fill:#8a5aa0">No se usa este día</text>`;
  s+=`<g class="av"></g>`; return s;
}

/* ================= ESCENAS INTERIORES ================= */
const claro=(hex,t)=>{ const n=parseInt(hex.slice(1),16), c=v=>Math.round(v+(255-v)*t); return `rgb(${c(n>>16)},${c(n>>8&255)},${c(n&255)})`; };
const DEFS_INT=`<defs>${ENV_DEFS}<pattern id="pTile" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#e6dccb"/><rect width="4" height="4" fill="#ded2bd"/><rect x="4" y="4" width="4" height="4" fill="#ded2bd"/></pattern>
  <pattern id="pWood" width="12" height="40" patternUnits="userSpaceOnUse"><rect width="12" height="40" fill="#d79a68"/><rect width="6" height="40" fill="#cf9160"/><line x1="0" y1="18" x2="6" y2="18" stroke="#b97d4f" stroke-width=".6"/><line x1="6" y1="32" x2="12" y2="32" stroke="#b97d4f" stroke-width=".6"/></pattern></defs>`;
/* carpa: base, 4 parales y techo a cuatro aguas del color del área */
function carpa(i,j,col,txt,k=1,act){ const w=34*k, d=24*k, hp=22*k, hr=30*k; let s=box(i,i+w,j,j+d,3*k,'#e8e1d2','#f3eee4',{});
  const A=P(i,j,hp),B=P(i+w,j,hp),C=P(i+w,j+d,hp),D=P(i,j+d,hp),M=P(i+w/2,j+d/2,hr);
  [[i,j],[i+w,j],[i+w,j+d],[i,j+d]].forEach(([a,b])=>{ const p=P(a,b),q=P(a,b,hp); s+=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#6b7280" stroke-width="1"/>`; });
  s+=`<polygon points="${pts([D,C,M])}" fill="${col}"/><polygon points="${pts([C,B,M])}" fill="${shade(col,.75)}"/><polygon points="${pts([A,D,M])}" fill="${claro(col,.25)}"/>`;
  s+=`<path d="M${D[0]},${D[1]} L${C[0]},${C[1]}" stroke="#fff" stroke-width="${1.8*k}" stroke-dasharray="3 3"/>`;
  if(txt){ const [x,y]=P(i+w/2,j+d,3); s+=`<text x="${x}" y="${y+9}" text-anchor="middle" style="font-size:8px;font-weight:800;fill:${shade(col,.6)}">${txt}</text>`; }
  if(act) s+=lidEnCarpa(act,i,j,w,d,k);
  if(act&&act.id!=null) s=`<g class="tapc" style="cursor:pointer" data-act="${act.id}" data-pi="${(i+w/2).toFixed(1)}" data-pj="${(j+d+7*k).toFixed(1)}">${s}</g>`;
  return s; }
/* objeto temático según el área que predomina en el lugar */
function decorEn(i,j,fs,k=1){ const st=fs.find(f=>f.categoria!=='gen'); if(!st) return ''; const [x,y]=P(i,j); return envDecor(st.categoria,x,y,k); }
function persona(x,y,c){ return `<rect x="${x-1.4}" y="${y-5}" width="2.8" height="4.5" rx="1" fill="${c}"/><circle cx="${x}" cy="${y-6.6}" r="1.6" fill="#e8b48a"/>`; }
/* ---------- v28 · líderes de estación dentro de los salones y carpas ---------- */
const lidPill=(x,y,txt,k)=>{ const w=txt.length*3.1*k+10*k; return `<g pointer-events="none"><rect x="${(x-w/2).toFixed(1)}" y="${(y-7*k).toFixed(1)}" width="${w.toFixed(1)}" height="${(9*k).toFixed(1)}" rx="${(4.5*k).toFixed(1)}" fill="#c2410c" stroke="#fff" stroke-width="${(.6*k).toFixed(2)}"/><text x="${x.toFixed(1)}" y="${(y-.6*k).toFixed(1)}" text-anchor="middle" style="font-size:${(5.6*k).toFixed(1)}px;font-weight:900;fill:#fff">${esc(txt)}</text></g>`; };
const lidCort=n=>{ const p=String(n||'').trim().split(/\s+/); return p.length>=3?p[2]:(p[0]||''); };
function lidsFila(f){ try{ return (LIDFN&&f)?(LIDFN(f)||[]):[]; }catch(e){ return []; } }
function lidsUnicos(fs){ const out=[], ids=new Set(); fs.forEach(f=>lidsFila(f).forEach(l=>{ if(!ids.has(l.id)){ ids.add(l.id); out.push(l); } })); return out; }
function lidEnSalon(code,m,i0,i1,j0,j1){ if(!LIDFN||typeof lidDibujo!=='function') return ''; const L=lidsUnicos(enSalon(code,m)); if(!L.length) return '';
  const w=i1-i0, d=j1-j0, n=Math.min(L.length,4); let s='';
  L.slice(0,4).forEach((l,k)=>{ const [x,y]=P(i0+w*(.5+(k-(n-1)/2)*.26), j0+d*.2); s+=`<g pointer-events="none" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(.22)">${lidDibujo(l,{},0)}</g>`+lidPill(x,y+5,'⭐ '+lidCort(l.nombre),1); });
  return s; }
function lidEnCarpa(act,i,j,w,d,k){ if(!LIDFN||typeof lidDibujo!=='function') return ''; const f=DATA.find(x=>String(x.id)===String(act.id))||act; const all=lidsFila(f); if(!all.length) return '';
  let L=all; if(all.length>2){ const mates=enSalon(ns(f.salon),NOW).filter(x=>x.hora_inicio===f.hora_inicio).map(x=>String(x.id)); const pos=Math.max(0,mates.indexOf(String(f.id))); L=[all[pos%all.length]]; }
  let s=''; L.forEach((l,q)=>{ const [x,y]=P(i+w+5*k, j+d*(.35+q*.4)); s+=`<g pointer-events="none" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${(.24*k).toFixed(2)})">${lidDibujo(l,{},0)}</g>`+lidPill(x,y+4*k,'⭐ '+lidCort(l.nombre),k*.75); });
  return s; }
function lidSheet(fs){ const L=lidsUnicos(fs); return L.length?`<h4>⭐ Líder${L.length>1?'es':''} de estación</h4><p>${L.map(l=>esc(typeof lidNombre==='function'?lidNombre(l.nombre):l.nombre)).join('<br>')}</p>`:''; }
/* pines de la Agenda Master (solo administrador): dónde debería estar cada Master ahora */
function pinsSVG(){ if(!PINS.length) return ''; const g={}; PINS.forEach(p=>{ let k; try{ k=escDe({salon:ns(p.lugar)}); }catch(e){ k=null; } if(!k) return; (g[k]=g[k]||[]).push(p); });
  let s=''; Object.entries(g).forEach(([k,ps])=>{ let xy; try{ xy=flagPos(k); }catch(e){ return; } const [x,y]=xy;
    ps.slice(0,4).forEach((p,n)=>{ const t='📍 '+p.nombre, w=t.length*4.4+12, yy=y-26-n*14; s+=`<g pointer-events="none"><rect x="${(x-w/2).toFixed(1)}" y="${(yy-10).toFixed(1)}" width="${w.toFixed(1)}" height="13" rx="6.5" fill="#173d7a" stroke="#fff" stroke-width="1.2"/><text x="${x.toFixed(1)}" y="${(yy-1).toFixed(1)}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">${esc(t)}</text></g>`; });
    if(ps.length>4) s+=`<text x="${x}" y="${y-26-4*14}" text-anchor="middle" style="font-size:7px;font-weight:800;fill:#173d7a">+${ps.length-4}</text>`; });
  return s; }
function roomBox(i0,i1,j0,j1,code,m,h=20){
  if(CI().det) return roomDet(i0,i1,j0,j1,code,m,h); h=h*(CI().hk||1);
  const fs=enSalon(code,m), c=colorF(fs), w=i1-i0, d=j1-j0;
  let s=flat(i0,i1,j0,j1,c?claro(c,.82):'url(#pTile)','#c9bfae');                          // piso
  s+=box(i0,i1,j0-3,j0,h,'#ece6da','#ddd5c6',{noShadow:1})+box(i0-3,i0,j0-3,j1,h,'#ece6da','#ddd5c6',{noShadow:1});   // muros del fondo
  if(c) s+=`<polygon points="${pts([P(i0,j0,h-1),P(i1,j0,h-1),P(i1,j0,h-4),P(i0,j0,h-4)])}" fill="${c}"/>`;
  { const a=P(i0+w*.2,j0,h*.35),b=P(i0+w*.8,j0,h*.35); s+=`<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1]-h*.4} ${a[0]},${a[1]-h*.4}" fill="#2f5d4a" stroke="#8a6a44" stroke-width="1"/>`; }   // tablero
  { const a=P(i0,j0+d*.5,h*.35),b=P(i0,j0+d*.85,h*.35); s+=`<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1]-h*.4} ${a[0]},${a[1]-h*.4}" fill="#9fc8ef" stroke="#7d8696" stroke-width=".7"/>`; }  // ventana
  for(let r=0;r<2;r++) for(let q=0;q<2;q++){ const i=i0+w*.18+q*w*.38, j=j0+d*.3+r*d*.3; s+=box(i,i+w*.22,j,j+d*.12,3,'#c99a62','#dcb27c',{noShadow:1}); if(c) s+=box(i+w*.04,i+w*.14,j+d*.14,j+d*.22,2.5,c,claro(c,.35),{noShadow:1}); }
  { const [x,y]=P(i0+w*.82,j0+d*.12); s+=`<rect x="${x-3}" y="${y-5}" width="6" height="4" fill="#8a6a44"/>`; }
  s+=lidEnSalon(code,m,i0,i1,j0,j1);
  const [x,y]=P((i0+i1)/2,j1,-6);
  s+=`<g class="tap room" data-room="${code}"><rect x="${x-17}" y="${y-9}" width="34" height="${fs.length?20:12}" rx="4" fill="#fff" stroke="${c||'#b9c1cf'}"/><text x="${x}" y="${y}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#1b2333">${code}</text>${fs.length?`<text x="${x}" y="${y+8}" text-anchor="middle" style="font-size:7px;font-weight:800;fill:${c}">${fs.map(f=>f.curso).join(',')}</text>`:''}</g>`;
  return s; }
/* salón detallado: muros recortados, tablero, ventanas, puerta, pupitres con sillas y estudiantes */
const PIEL=['#f1c9a5','#d9a477','#b07a4f','#8a5a3b','#f3d2b8'];
function estudiante(i,j,c,n){ const [x,y]=P(i,j,3.2); return `<g><rect x="${(x-1.5).toFixed(1)}" y="${(y-4.2).toFixed(1)}" width="3" height="4.2" rx="1.2" fill="${c}"/><circle cx="${x.toFixed(1)}" cy="${(y-5.6).toFixed(1)}" r="1.55" fill="${PIEL[n%5]}"/><path d="M${(x-1.6).toFixed(1)},${(y-5.9).toFixed(1)} a1.6,1.5 0 0 1 3.2,0z" fill="${['#2b1d14','#5a3a22','#1b1b1b','#8a5a2b'][n%4]}"/></g>`; }
function roomDet(i0,i1,j0,j1,code,m,h){
  const fs=enSalon(code,m), c=colorF(fs), w=i1-i0, d=j1-j0; h=Math.max(h,20);
  let s=flat(i0,i1,j0,j1,c?claro(c,.86):'url(#pTile)','#c9bfae');
  s+=box(i0,i1,j0-2,j0,h,'#f1ece2','#ddd5c6',{noShadow:1})+box(i0-2,i0,j0-2,j1,h,'#e8e1d4','#ddd5c6',{noShadow:1});
  if(c) s+=`<polygon points="${pts([P(i0,j0,h-1),P(i1,j0,h-1),P(i1,j0,h-3),P(i0,j0,h-3)])}" fill="${c}"/>`;
  { const a=P(i0+w*.22,j0,h*.38),b=P(i0+w*.78,j0,h*.38); s+=`<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${(b[1]-h*.36).toFixed(1)} ${a[0]},${(a[1]-h*.36).toFixed(1)}" fill="#2f5d4a" stroke="#8a6a44" stroke-width=".8"/>`; }
  [[.12,.38],[.52,.78]].forEach(([u,v])=>{ const a=P(i0,j0+d*u,h*.42),b=P(i0,j0+d*v,h*.42); s+=`<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${(b[1]-h*.34).toFixed(1)} ${a[0]},${(a[1]-h*.34).toFixed(1)}" fill="#bfe0f7" stroke="#7d8696" stroke-width=".6"/>`; });
  s+=box(i0+w*.58,i0+w*.88,j0+3,j0+8,4.5,'#9a6b3f','#b98552',{noShadow:1});
  let n=0; const cols=3, rows=3;
  for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){ const i=i0+w*.12+q*w*.29, j=j0+d*.34+r*d*.2;
    s+=box(i,i+w*.18,j,j+d*.07,3.4,'#c99a62','#e0b984',{noShadow:1});
    s+=box(i+w*.04,i+w*.14,j+d*.09,j+d*.13,2,'#5b6577','#7d8696',{noShadow:1});
    if(c) s+=estudiante(i+w*.09,j+d*.11,c,n++); }
  s+=box(i1-1.5,i1,j0,j1,h*.32,'#e8e1d4','#f3eee4',{noShadow:1});
  s+=box(i0,i0+w*.55,j1-1.5,j1,h*.32,'#efe9dd','#f3eee4',{noShadow:1});
  { const a=P(i0+w*.62,j1,0),b=P(i0+w*.9,j1,0); s+=`<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1]-1.5} ${a[0]},${a[1]-1.5}" fill="#8a5a3b"/>`; }
  s+=lidEnSalon(code,m,i0,i1,j0,j1);
  const [x,y]=P((i0+i1)/2,j1,-6);
  s+=`<g class="tap room" data-room="${code}"><rect x="${x-15}" y="${y-8}" width="30" height="${fs.length?17:11}" rx="4" fill="#fff" stroke="${c||'#b9c1cf'}"/><text x="${x}" y="${y}" text-anchor="middle" style="font-size:6.8px;font-weight:800;fill:#1b2333">${code}</text>${fs.length?`<text x="${x}" y="${y+7}" text-anchor="middle" style="font-size:6.2px;font-weight:800;fill:${c}">${fs.map(f=>f.curso).join(',')}</text>`:''}</g>`;
  return s; }
/* Aula de Cristal: salón grande con muros de vidrio */
function aulaCristal(i0,i1,j0,j1,m){ const code='Aula de Cristal', fs=enSalon(code,m), c=colorF(fs), h=18, w=i1-i0, d=j1-j0;
  let s=flat(i0,i1,j0,j1,c?claro(c,.85):'#e8f6ff','#9fd0ee');
  for(let r=0;r<3;r++) for(let q=0;q<3;q++){ const i=i0+w*.12+q*w*.29, j=j0+d*.22+r*d*.24; s+=box(i,i+w*.16,j,j+d*.1,3,'#c99a62','#dcb27c',{noShadow:1}); if(c) s+=box(i+w*.03,i+w*.1,j+d*.12,j+d*.2,2.5,c,claro(c,.35),{noShadow:1}); }
  const A=P(i0,j0),B=P(i1,j0),C=P(i1,j1),D=P(i0,j1),u=p=>[p[0],p[1]-h];
  const vidrio=(a,b,op)=>{ let g=`<polygon points="${pts([a,b,u(b),u(a)])}" fill="#bfe6fb" opacity="${op}" stroke="#7fbfe4" stroke-width="1"/>`;
    for(let k=1;k<6;k++){ const x=a[0]+(b[0]-a[0])*k/6, y=a[1]+(b[1]-a[1])*k/6; g+=`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y-h).toFixed(1)}" stroke="#ffffff" stroke-width=".9" opacity=".9"/>`; }
    return g+`<line x1="${a[0]}" y1="${a[1]-h*.55}" x2="${b[0]}" y2="${b[1]-h*.55}" stroke="#ffffff" stroke-width=".7" opacity=".8"/>`; };
  s=vidrio(A,B,.35)+vidrio(A,D,.35)+s+vidrio(D,C,.28)+vidrio(B,C,.28);
  s+=`<polygon points="${pts([u(A),u(B),u(C),u(D)])}" fill="none" stroke="#7fbfe4" stroke-width="1.4"/>`;
  { const g=[P(i0+w*.15,j0,h-2),P(i0+w*.45,j0,h-2)]; s+=`<line x1="${g[0][0]}" y1="${g[0][1]}" x2="${g[1][0]}" y2="${g[1][1]}" stroke="#fff" stroke-width="2" opacity=".9"/>`; }
  s+=lidEnSalon(code,m,i0,i1,j0,j1);
  const [x,y]=P((i0+i1)/2,j1,-6);
  s+=`<g class="tap room" data-room="${code}"><rect x="${x-34}" y="${y-9}" width="68" height="${fs.length?20:12}" rx="4" fill="#fff" stroke="${c||'#7fbfe4'}"/><text x="${x}" y="${y}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#1b5e85">Aula de Cristal</text>${fs.length?`<text x="${x}" y="${y+8}" text-anchor="middle" style="font-size:7px;font-weight:800;fill:${c}">${fs.map(f=>f.curso).join(',')}</text>`:''}</g>`;
  return s; }
/* Hall central de los pisos 2 y 3 */
function hallPiso(n,m){ const code='Hall piso '+n, fs=enSalon(code,m), c=colorF(fs); let s=flat(66,166,190,250,c?claro(c,.82):'#f6f0e2','#d6ccb8');
  if(fs.length){ fs.slice(0,4).forEach((f,k)=>{ s+=carpa(74+(k%2)*46,198+Math.floor(k/2)*26,AREA_C[f.categoria]||'#8a94a8',f.curso,.6,f); }); }
  const [x,y]=P(116,250,-6); s+=`<g class="tap room" data-room="${code}"><rect x="${x-32}" y="${y-9}" width="64" height="${fs.length?20:12}" rx="4" fill="#fff" stroke="${c||'#b9c1cf'}"/><text x="${x}" y="${y}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#1b2333">Hall piso ${n}</text>${fs.length?`<text x="${x}" y="${y+8}" text-anchor="middle" style="font-size:7px;font-weight:800;fill:${c}">${fs.map(f=>f.curso).join(',')}</text>`:''}</g>`;
  return s; }
function floorBase(){ return DEFS_INT+`<rect class="bgr" x="-600" y="-400" width="1600" height="1400" fill="#e9e4da"/>`; }
/* bloque de primaria: salones abiertos en fila junto a un pasillo */
function bloqueP(esc,titulo,salones,pisos){ return { titulo, salones, pisos:pisos||[], esc, entry:[0,105], target:[120,105], door:puerta(PB[esc]),
  draw(m){ CX=170;CY=40; let s=floorBase(); const n=salones.length;
    s+=flat(-30,30+n*42,90,120,'#efe8db','#d6ccb8');
    salones.forEach((c,k)=>s+=roomBox(10+k*42,46+k*42,45,90,c,m,20));
    s+=decorEn(n*42+40,108,activos(m).filter(f=>salones.includes(f.salon)));
    const [ex,ey]=P(-20,105); s+=`<g class="tap" data-go="ext"><rect x="${ex-30}" y="${ey-8}" width="60" height="15" rx="7" fill="#173d7a"/><text x="${ex}" y="${ey+3}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">← Salida</text></g>`;
    return s; } }; }
/* zona verde de primaria: prado con carpas por curso */
function verdeP(esc,titulo){ return { titulo, pisos:[], esc, entry:[-10,170], target:[110,170], door:puerta(PV[esc]),
  draw(m){ CX=210;CY=30; let s=`<defs>${ENV_DEFS}</defs><rect class="bgr" x="-600" y="-400" width="1600" height="1400" fill="url(#pGrass)"/>`;
    s+=flat(0,300,0,230,'#a9dc8f','#6fae5a')+flat(10,290,10,220,'#b5e39b')+'<g class="bgr">'+envGrass(-60,-40,520,360,160,41)+'</g>';
    [[285,20],[290,215],[20,15],[150,-10]].forEach(([i,j],k)=>{ const [x,y]=P(i,j); s+=envTreeRound(x,y,.9,k+50); });
    { const a=P(20,15,26), b=P(285,20,26); s+=`<path d="M${a[0]},${a[1]} Q${(a[0]+b[0])/2},${(a[1]+b[1])/2+22} ${b[0]},${b[1]}" stroke="#555" stroke-width=".7" fill="none"/>`;
      for(let k=1;k<16;k++){ const t=k/16, x=a[0]+(b[0]-a[0])*t, y=a[1]+(b[1]-a[1])*t+Math.sin(t*Math.PI)*11; s+=`<polygon points="${x-3},${y} ${x+3},${y} ${x},${y+6}" fill="${['#e5484d','#f2a900','#2f6fde','#1f9d6b'][k%4]}"/>`; } }
    const fs=activos(m).filter(f=>escDe(f)===esc);
    fs.slice(0,8).forEach((f,k)=>{ const i=40+(k%4)*60, j=50+Math.floor(k/4)*80; s+=carpa(i,j,AREA_C[f.categoria]||'#8a94a8',f.curso,1,f); });
    { const [x,y]=P(250,150); s+=envPicnic(x,y); }
    if(fs.length){ s+=decorEn(200,200,fs,1.2); const [x,y]=P(300,230); s+=tag(x,y+30,nombreA(fs[0].area),`● ${fs[0].grado} (${rango(fs.map(f=>f.curso))})`,colorF(fs),''); }
    else { const [x,y]=P(150,110); s+=`<text x="${x}" y="${y}" text-anchor="middle" style="font-size:9px;fill:#2f6b2f;font-weight:800">Sin cursos en este momento</text>`; }
    const [ex,ey]=P(-5,195); s+=`<g class="tap" data-go="ext"><rect x="${ex-30}" y="${ey-8}" width="60" height="15" rx="7" fill="#173d7a"/><text x="${ex}" y="${ey+3}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">← Salida</text></g>`;
    return s; } }; }
const INT={
  hall:{ titulo:'Hall Principal · Piso 1', pisos:['hall','bS2','bS3'], entry:[130,340], target:[130,215],
    draw(m){ CX=215;CY=10; let s=floorBase();
      s+=flat(100,160,-20,350,'#f4efe4','#d6ccb8');                           // pasillo del hall
      s+=flat(-230,100,150,185,'#efe8db','#d6ccb8')+flat(160,420,150,185,'#efe8db','#d6ccb8'); // alas
      // izquierda 116–121 (desde el hall hacia afuera), derecha 115A,115B,114,113,112,111
      ['116','117','118','119','120','121'].forEach((c,k)=>s+=roomBox(60-k*48-40,60-k*48+4,105,150,c,m));
      ['115B','115A','114','113','112','111'].forEach((c,k)=>s+=roomBox(165+k*42,203+k*42,105,150,c,m));
      // escalera en el cruce
      s+=box(100,128,120,150,10,'#b9a98d','#d8ccb6',{noShadow:1}); const [ex,ey]=P(114,135,12); s+=`<g class="tap" data-go="bS2"><rect x="${ex-30}" y="${ey-22}" width="60" height="15" rx="7" fill="#173d7a"/><text x="${ex}" y="${ey-12}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">↑ Pisos 2 y 3</text></g>`;
      // fondo → bloque 130
      const [bx,by]=P(130,-15); s+=`<g class="tap" data-go="b130"><rect x="${bx-38}" y="${by-16}" width="76" height="15" rx="7" fill="#1f9d6b"/><text x="${bx}" y="${by-6}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">Bloque 130 →</text></g>`;
      // acceso a la Zona verde (lado derecho, hacia el fondo)
      s+=flat(165,330,-10,98,'#a9dc8f','#6fae5a'); { const [x,y]=P(250,45); s+=envTreeRound(x,y,.7,5)+envBush(x+30,y+14,.7); }
      { const [zx,zy]=P(200,55); s+=`<g class="tap" data-go="verde"><rect x="${zx-36}" y="${zy-8}" width="72" height="15" rx="7" fill="#2e8b3d"/><text x="${zx}" y="${zy+3}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">Zona verde →</text></g>`; }
      // actividad en el hall (Ciencias 2)
      const hc=enSalon('Hall Principal',m);
      if(hc.length){ s+=decorEn(150,215,hc,1.1); hc.slice(0,8).forEach((f,k)=>{ const i=104+(k%2)*28, j=225+Math.floor(k/2)*30; s+=carpa(i,j,AREA_C.cie,f.curso,.6,f); });
        const [x,y]=P(220,300); s+=tag(x+20,y,'Ciencias Naturales 2',`● ${hc[0].grado} (${rango(hc.map(f=>f.curso))})`,AREA_C.cie,''); }
      else { const [x,y]=P(130,280); s+=`<text x="${x}" y="${y}" text-anchor="middle" style="font-size:8px;fill:#9a8f7a;font-weight:700">Espacio de Ciencias Naturales 2</text>`; }
      const [px,py]=P(130,350); s+=`<g transform="translate(${px},${py+8})"><rect x="-28" y="-8" width="56" height="15" rx="7" fill="#7ed957"/><text y="3" text-anchor="middle" style="font-size:7.5px;font-weight:800">ENTRADA 1</text></g>`; s+=puertaInt(98,70,'ENTRADA 2',-1)+puertaInt(162,95,'SALIDA 3',1);
      return s; } },
  bS2:{ titulo:'Bloque de salones · Piso 2', pisos:['hall','bS2','bS3'], entry:[114,175], target:[230,175],
    draw(m){ CX=215;CY=40; let s=floorBase();
      s+=flat(-250,390,160,190,'#efe8db','#d6ccb8');
      ['205','204','203','202','201','200'].forEach((c,k)=>s+=roomBox(140+k*40,176+k*40,115,160,c,m,18));   // derecha, desde el Hall
      ['206','207','208','209','210','211','212','213'].forEach((c,k)=>s+=roomBox(88-k*40-32,88-k*40+4,115,160,c,m,18)); // izquierda, desde el Hall
      s+=box(100,128,165,190,8,'#b9a98d','#d8ccb6',{noShadow:1}); const [ux,uy]=P(114,180,10); s+=`<g class="tap" data-go="bS3"><rect x="${ux-26}" y="${uy-38}" width="52" height="14" rx="7" fill="#1f9d6b"/><text x="${ux}" y="${uy-28}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">↑ Piso 3</text></g>`; const [ex,ey]=P(114,180,10); s+=`<g class="tap" data-go="hall"><rect x="${ex-26}" y="${ey-20}" width="52" height="14" rx="7" fill="#173d7a"/><text x="${ex}" y="${ey-10}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">↓ Piso 1</text></g>`;
      s+=decorEn(405,195,activos(m).filter(f=>/^2\d\d/.test(f.salon||'')))+hallPiso(2,m);
      return s; } },
  bS3:{ titulo:'Bloque de salones · Piso 3', pisos:['hall','bS2','bS3'], entry:[114,175], target:[200,175],
    draw(m){ CX=215;CY=40; let s=floorBase();
      s+=flat(-250,390,160,190,'#efe8db','#d6ccb8');
      ['305','304','303','302','301','300'].forEach((c,k)=>s+=roomBox(140+k*40,176+k*40,115,160,c,m,18));   // derecha, desde el Hall
      ['306','307','308','309','310','311','312','313'].forEach((c,k)=>s+=roomBox(88-k*40-32,88-k*40+4,115,160,c,m,18)); // izquierda, desde el Hall
      s+=box(100,128,165,190,8,'#b9a98d','#d8ccb6',{noShadow:1}); const [ux,uy]=P(114,180,10); s+=`<g class="tap" data-go="bS2"><rect x="${ux-26}" y="${uy-38}" width="52" height="14" rx="7" fill="#1f9d6b"/><text x="${ux}" y="${uy-28}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">↓ Piso 2</text></g>`; const [ex,ey]=P(114,180,10); s+=`<g class="tap" data-go="hall"><rect x="${ex-26}" y="${ey-20}" width="52" height="14" rx="7" fill="#173d7a"/><text x="${ex}" y="${ey-10}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">↓ Piso 1</text></g>`;
      s+=decorEn(405,195,activos(m).filter(f=>/^3\d\d/.test(f.salon||'')))+hallPiso(3,m);
      return s; } },
  b130:{ titulo:'Bloque 130 · Salones 131–144', pisos:[], entry:[0,105], target:[170,105], salir:'hall',
    draw(m){ CX=170;CY=40; let s=floorBase();
      s+=flat(-30,360,90,120,'#efe8db','#d6ccb8');
      ['131','133','137','138','139','140','143','144'].forEach((c,k)=>s+=roomBox(10+k*42,46+k*42,45,90,c,m,20));
      s+=flat(-30,360,120,142,'#efe8db','#d6ccb8')+aulaCristal(136,214,142,192,m);   // al frente de los salones 138 y 139
      s+=decorEn(372,108,activos(m).filter(f=>escDe(f)==='b130'));
      const [ex,ey]=P(-20,105); s+=`<g class="tap" data-go="hall"><rect x="${ex-30}" y="${ey-8}" width="60" height="15" rx="7" fill="#173d7a"/><text x="${ex}" y="${ey+3}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">← Al Hall</text></g>`;
      return s; } },
  verde:{ titulo:'Zona verde', pisos:[], entry:[-10,170], target:[110,170], salir:'hall',
    draw(m){ CX=210;CY=30; let s=`<defs>${ENV_DEFS}</defs><rect class="bgr" x="-600" y="-400" width="1600" height="1400" fill="url(#pGrass)"/>`;
      s+=flat(0,300,0,230,'#a9dc8f','#6fae5a')+flat(10,290,10,220,'#b5e39b');
      s+=box(-10,310,-50,-12,26,'#cfd5e0','#eef1f5',{noShadow:1,win:1});     // Bloque 130 al frente
      { const [x,y]=P(150,-31,30); s+=`<text x="${x}" y="${y}" text-anchor="middle" style="font-size:8px;font-weight:800;fill:#5b6577">Bloque 130 (al frente)</text>`; }
      s+=box(-50,-12,-10,240,18,'#d9d2c3','#f4efe4',{noShadow:1});           // muro del Hall
      { const [x,y]=P(-31,110,22); s+=`<text x="${x}" y="${y}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#7a6f5a">Hall</text>`; }
      [[285,20],[290,215],[20,15]].forEach(([i,j],k)=>{ const [x,y]=P(i,j); s+=envTreeRound(x,y,.9,k+30); });
      [[250,225],[40,220]].forEach(([i,j],k)=>{ const [x,y]=P(i,j); s+=k?envFlowers(x,y,40):envBush(x,y); });
      const fs=activos(m).filter(f=>escDe(f)==='verde');
      s+='<g class=\"bgr\">'+envGrass(-60,-40,520,360,160,31)+'</g>';
      // banderines entre árboles
      { const a=P(20,15,26), b=P(285,20,26); s+=`<path d="M${a[0]},${a[1]} Q${(a[0]+b[0])/2},${(a[1]+b[1])/2+22} ${b[0]},${b[1]}" stroke="#555" stroke-width=".7" fill="none"/>`;
        for(let k=1;k<16;k++){ const t=k/16, x=a[0]+(b[0]-a[0])*t, y=a[1]+(b[1]-a[1])*t+Math.sin(t*Math.PI)*11; s+=`<polygon points="${x-3},${y} ${x+3},${y} ${x},${y+6}" fill="${['#e5484d','#f2a900','#2f6fde','#1f9d6b'][k%4]}"/>`; } }
      fs.slice(0,8).forEach((f,k)=>{ const i=40+(k%4)*60, j=50+Math.floor(k/4)*80; s+=carpa(i,j,AREA_C[f.categoria]||'#8a94a8',f.curso,1,f); });
      { const [x,y]=P(250,150); s+=envPicnic(x,y); } { const [x,y]=P(40,200); s+=envPicnic(x,y); }
      if(fs.length){ s+=decorEn(200,200,fs,1.2); const st=fs.find(f=>f.categoria!=='gen'), tema=st?{tec:'DESASTRES NATURALES',mat:'BIODIVERSIDAD',cie:'CONSECUENCIAS'}[st.categoria]:''; if(tema){ const [x,y]=P(280,140); s+=`<rect x="${x-1}" y="${y-22}" width="2" height="22" fill="#6d4a2e"/><rect x="${x-34}" y="${y-34}" width="68" height="13" rx="2" fill="#b5834e" stroke="#6d4a2e"/><text x="${x}" y="${y-25}" text-anchor="middle" style="font-size:6.5px;font-weight:800;fill:#fff">${tema}</text>`; } }
      if(fs.length){ const [x,y]=P(300,230); s+=tag(x,y+30,nombreA(fs[0].area),`● ${fs[0].grado} (${rango(fs.map(f=>f.curso))})`,AREA_C[fs[0].categoria],''); }
      else { const [x,y]=P(150,110); s+=`<text x="${x}" y="${y}" text-anchor="middle" style="font-size:9px;fill:#2f6b2f;font-weight:800">Sin cursos en este momento</text>`; }
      const [ex,ey]=P(-5,195); s+=`<g class="tap" data-go="hall"><rect x="${ex-30}" y="${ey-8}" width="60" height="15" rx="7" fill="#173d7a"/><text x="${ex}" y="${ey+3}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">← Al Hall</text></g>`;
      return s; } },
  cancha:{ titulo:'Cancha de fútbol', pisos:[], entry:[-14,130], target:[60,130], door:IJ(...CAN_P),
    draw(m){ CX=190;CY=40; const W=220,H=150,MW=W/2,MH=H/2; let s=`<defs>${ENV_DEFS}</defs><rect class="bgr" x="-600" y="-400" width="1600" height="1400" fill="url(#pGrass)"/>`;
      s+=flat(-6,W+6,-6,H+6,'#3f8f47')+flat(0,W,0,H,'#6fbf5e','#fff');
      for(let k=0;k<10;k++) s+=flat(k*22,k*22+11,0,H,'#79c868');
      s+=flat(0,W,0,H,'none','#fff')+flat(MW-.6,MW+.6,0,H,'#fff')+flat(0,40,MH-38,MH+38,'none','#fff')+flat(W-40,W,MH-38,MH+38,'none','#fff');
      { const [x,y]=P(MW,MH); s+=`<ellipse cx="${x}" cy="${y}" rx="26" ry="15" fill="none" stroke="#fff" stroke-width="1.5"/>`; }
      [[0,MH],[W,MH]].forEach(([i,j])=>{ const a=P(i,j-14),b=P(i,j+14); s+=`<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1]-12} ${a[0]},${a[1]-12}" fill="rgba(255,255,255,.35)" stroke="#fff" stroke-width="1.6"/>`; });
      const fs=activos(m).filter(f=>escDe(f)==='cancha');
      fs.slice(0,8).forEach((f,k)=>{ const i=24+(k%4)*52, j=22+Math.floor(k/4)*82; s+=carpa(i,j,AREA_C[f.categoria]||'#8a94a8',f.curso,1,f); });
      if(fs.length){ s+=decorEn(MW,H-14,fs,1); const [x,y]=P(W,H); s+=tag(x,y+26,nombreA(fs[0].area),`● ${fs[0].grado} (${rango(fs.map(f=>f.curso))})`,colorF(fs),''); }
      else { const [x,y]=P(MW,MH); s+=`<text x="${x}" y="${y+34}" text-anchor="middle" style="font-size:8.5px;fill:#fff;font-weight:800">Sin cursos en este momento</text>`; }
      const [ex,ey]=P(-12,150); s+=`<g class="tap" data-go="ext"><rect x="${ex-30}" y="${ey-8}" width="60" height="15" rx="7" fill="#173d7a"/><text x="${ex}" y="${ey+3}" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">← Salida</text></g>`;
      return s; } },
  coliseo:{ titulo:'Coliseo', pisos:[], entry:[150,250], target:[150,170],
    draw(m){ CX=200;CY=20; let s=floorBase();
      s+=flat(0,300,0,240,'url(#pWood)','#fff')+flat(20,280,20,220,'none','#fff');
      const [cx,cy]=P(150,120); s+=`<ellipse cx="${cx}" cy="${cy}" rx="42" ry="24" fill="none" stroke="#fff" stroke-width="2"/>`;
      s+=box(-10,310,-40,-5,22,'#9aa3b5','#c5ccd8',{noShadow:1});               // graderías
      for(let k=0;k<70;k++){ const [x,y]=P(-5+R1(k)*310,-36+R1(k+50)*26,22); s+=persona(x,y,['#e5484d','#2f6fde','#f2a900','#1f9d6b','#173d7a'][k%5]); }
      const fs=activos(m).filter(f=>f.salon==='Coliseo');
      if(fs.length){ const [bx,by]=P(150,-22,40); s+=`<rect x="${bx-58}" y="${by-9}" width="116" height="15" rx="2" fill="${AREA_C.tec}"/><text x="${bx}" y="${by+1.5}" text-anchor="middle" style="font-size:8px;font-weight:800;fill:#fff">DESASTRES NATURALES</text>`; s+=decorEn(270,215,fs,1.2); }
      fs.forEach((f,k)=>{ const i=30+(k%4)*64, j=40+Math.floor(k/4)*90; s+=carpa(i,j,AREA_C.tec,f.curso,1,f); });
      if(fs.length){ const [x,y]=P(300,200); s+=tag(x,y+30,'Desastres naturales',`● ${fs[0].grado} (${rango(fs.map(f=>f.curso))})`,AREA_C.tec,''); }
      else { const [x,y]=P(150,120); s+=`<text x="${x}" y="${y+4}" text-anchor="middle" style="font-size:9px;fill:#fff;font-weight:800">Sin cursos en este momento</text>`; }
      return s; } },
  pAA1:bloqueP('pAA1','Primaria · AA 101–103',['AA101','AA102','AA103']),
  pAA2:bloqueP('pAA2','Primaria · AA 104–112',['AA104','AA105','AA106','AA107','AA108','AA109','AA110','AA111','AA112']),
  pAA3:bloqueP('pAA3','Primaria · AA 113–115',['AA113','AA114','AA115']),
  pAB1:bloqueP('pAB','Bloque AB · Piso 1',['AB101','AB102','AB103','AB104','AB105','AB106','AB107'],['pAB1','pAB2']),
  pAB2:bloqueP('pAB','Bloque AB · Piso 2',['AB201','AB202','AB203','AB204','AB205','AB206'],['pAB1','pAB2']),
  pAC1:bloqueP('pAC','Bloque AC · Piso 1',['AC101','AC102','AC103','AC104','AC105'],['pAC1','pAC2']),
  pAC2:bloqueP('pAC','Bloque AC · Piso 2',['AC201','AC202','AC203','AC204','AC205','AC206','AC207','AC208','AC209','AC210','AC211'],['pAC1','pAC2']),
  pV1:verdeP('pV1','Zona verde de Primaria'), pV2:verdeP('pV2','Zona verde de Primaria 2')
};
/* ================= MOTOR ================= */
let box_=null, svg=null;
let scene='ext', avPos=WX.inicio, busy=false; let FULL=[-30,-10,460,520], BB=null;
function fit(){ // ajusta la vista al alto del contenido; el ancho se recorre deslizando
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  [...svg.children].forEach(n=>{ if(n.tagName==='defs'||n.classList.contains('bgr')||n.classList.contains('av')) return; try{ const b=n.getBBox(); if(!b.width&&!b.height) return; x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.width);y1=Math.max(y1,b.y+b.height);}catch(e){} });
  const m=14; x0-=m;y0-=m;x1+=m;y1+=m; BB=[x0,y0,x1,y1];
  const asp=box_.clientWidth/box_.clientHeight; let h=y1-y0, w=Math.max(h*asp,(x1-x0)*0.66);
  if(w>x1-x0){ w=x1-x0; } h=Math.max(h,w/asp*0.72);
  const [fx,fy]=P(...avPos); let x=Math.max(x0,Math.min(x1-w,fx-w/2)); let y=y0+((y1-y0)-h)/2;
  if(scene!=='ext'&&w<190){ const k=190/w; w*=k; h*=k; x=(x0+x1)/2-w/2; y=(y0+y1)/2-h/2; BB=[Math.min(x0,x),Math.min(y0,y),Math.max(x1,x+w),Math.max(y1,y+h)]; }
  if(scene!=='ext'&&CI().vw){ w=CI().vw; h=w/asp; x=Math.max(x0,Math.min(x1-w,fx-w/2)); y=Math.max(y0,Math.min(y1-h,fy-h*.5)); if(y1-y0<h) y=(y0+y1)/2-h/2; if(x1-x0<w) x=(x0+x1)/2-w/2; BB=[Math.min(x0,x),Math.min(y0,y),Math.max(x1,x+w),Math.max(y1,y+h)]; }
  if(scene==='ext'&&h>360){ h=360; w=Math.min(x1-x0,Math.max(h*asp,w*0.62)); x=Math.max(x0,Math.min(x1-w,fx-w/2)); y=Math.max(y0,Math.min(y1-h,fy-h*.62)); }
  FULL=[x,y,w,h]; setVB(FULL); }
let drag=null;
function eventos(){
svg.addEventListener('pointerdown',e=>{ if(busy) return; drag={x:e.clientX,y:e.clientY,vb:[...svg._vb],moved:false}; });
window.addEventListener('pointermove',e=>{ if(!drag||!BB) return; const k=svg._vb[2]/box_.clientWidth, dx=(e.clientX-drag.x)*k, dy=(e.clientY-drag.y)*k; if(Math.abs(dx)+Math.abs(dy)>3) drag.moved=true;
  const v=drag.vb; const nx=Math.max(BB[0],Math.min(BB[2]-v[2],v[0]-dx)), ny=Math.max(Math.min(BB[1],v[1]),Math.min(Math.max(BB[3]-v[3],v[1]),v[1]-dy)); setVB([nx,ny,v[2],v[3]]); FULL=[nx,ny,v[2],v[3]]; });
window.addEventListener('pointerup',()=>{ setTimeout(()=>drag=null,0); });
svg.addEventListener('click',e=>{ if(drag&&drag.moved){ e.stopPropagation(); e.preventDefault(); } },true);
}
const setVB=v=>{ svg.setAttribute('viewBox',v.map(n=>n.toFixed(1)).join(' ')); svg._vb=v; };
const anim=(d,fn)=>new Promise(r=>{const t0=performance.now();const f=t=>{const k=Math.min(1,(t-t0)/d);fn(k);k<1?requestAnimationFrame(f):r();};requestAnimationFrame(f);});
const ease=q=>q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2, lerp=(a,b,q)=>a+(b-a)*q;
let POSE={dir:'f',flip:false};
function placeAv(ij,pose){ POSE=Object.assign({},POSE,pose||{}); const [x,y]=P(ij[0],ij[1]); const g=svg.querySelector('.av'); if(!g) return;
  const k=scene==='ext'?.5:CI().av; g.innerHTML=`<g transform="translate(${(x+2*k/.5).toFixed(1)},${(y-(POSE.lift||0)*k/.5).toFixed(1)}) scale(${k})">${(window.avatarAny||avatarPose)(AV,POSE)}</g>`; }
/* en reposo: parpadea, mira a los lados y respira */
const T0=performance.now();
setInterval(()=>{ if(!svg||busy||document.hidden||!box_.offsetParent) return; const t=(performance.now()-T0)/1000;
  placeAv(avPos,{walk:0,wave:0,blink:(t*1000%3600)<150,look:Math.sin(t*.7)>.9?1:(Math.sin(t*.7)<-.92?-1:0),lift:Math.abs(Math.sin(t*1.6))*.6}); },140);
/* llegada: salta y saluda mirando a la cámara */
async function saludo(){ await anim(1100,k=>placeAv(avPos,{walk:0,dir:'f',flip:false,lift:k<.3?Math.sin(k/.3*Math.PI)*10:0,wave:k>.25?(k-.25)/.75:0})); placeAv(avPos,{wave:0,lift:0}); }
function render(){
  if(!svg) return;
  if(scene==='ext'){ CX=215;CY=60; svg.innerHTML=sceneExt(NOW); }
  else { svg.innerHTML=INT[scene].draw(NOW)+'<g class="av"></g>'; }
  { const extra=(CAM?camSVG():'')+(scene==='ext'?lugarSVG()+orgSVG()+pinsSVG():''); if(extra){ const gg=document.createElementNS('http://www.w3.org/2000/svg','g'); gg.setAttribute('class','ruta'); gg.innerHTML=extra; svg.querySelector('.av').before(gg); } }
  if(scene!=='ext'&&CI().lbl&&CI().lbl!==1){ const L=CI().lbl; svg.querySelectorAll('.tap').forEach(n=>{ try{ const b=n.getBBox(), cx=b.x+b.width/2, cy=b.y+b.height/2; n.setAttribute('transform',`translate(${cx} ${cy}) scale(${L}) translate(${-cx} ${-cy})`); }catch(e){} }); }
  placeAv(avPos); bindTaps(); header(); strip();
}
function header(){
  const tb=$c('cvTb'), tit=$c('cvTit');
  if(scene==='ext'){ tit.textContent=CAM?'Camino a tu estación':'Colegio vivo'; tb.innerHTML=''; return; }
  const sc=INT[scene]; tit.textContent=sc.titulo; if(CAM){ tb.innerHTML=''; return; }
  tb.innerHTML=(sc.pisos.length?sc.pisos.map((p,k)=>`<span class="${p===scene?'on':''}" data-p="${p}">P${k+1}</span>`).join(''):'')+`<span class="out" id="cvSalir">Salir al mapa</span>`;
  tb.querySelectorAll('[data-p]').forEach(e=>e.onclick=()=>irInterior(e.dataset.p,true));
  $c('cvSalir').onclick=salir;
}
function strip(){ const A=activos(NOW); const g={}; A.forEach(f=>{ const k=escDe(f); (g[k]=g[k]||[]).push(f); });
  const pausa=DATA.filter(f=>f.tipo==='pausa'&&toMin(f.hora_inicio)<=NOW&&NOW<toMin(f.hora_fin)).map(f=>f.area+' '+f.nivel);
  $c('cvStrip').innerHTML=(pausa.length?`<span style="--c:#b07a00"><b>☕ ${pausa.join(' · ')}</b></span>`:'')+Object.entries(g).map(([k,fs])=>`<span style="--c:${colorF(fs)}"><b>${EXT[k]}</b> ${[...new Set(fs.map(f=>f.grado))].join(', ')}</span>`).join('')+`<span style="--c:#173d7a"><b>📍</b> ${scene==='ext'?'Afuera':INT[scene].titulo}</span>`; }
function bindTaps(){
  svg.querySelectorAll('[data-k]').forEach(n=>{ if(!n.dataset.k) return; n.onclick=()=>fichaExt(n.dataset.k); });
  svg.querySelectorAll('[data-go]').forEach(n=>n.onclick=()=>n.dataset.go==='ext'?salir():irInterior(n.dataset.go,true));
  svg.querySelectorAll('[data-room]').forEach(n=>n.onclick=()=>fichaSalon(n.dataset.room));
  svg.querySelectorAll('.tapc').forEach(n=>n.onclick=e=>{ e.stopPropagation(); fichaCarpa(n.dataset.act,[+n.dataset.pi,+n.dataset.pj]); });
}
function sheet(col,sub,title,body){ const sh=document.getElementById('sheet');
  sh.innerHTML=`<div class="sh" style="background:${col}"><span class="x" id="cvX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">${sub}</div><h3>${title}</h3></div><div class="sb cvsb">${body}</div>`;
  sh.classList.add('open'); $c('cvX').onclick=()=>sh.classList.remove('open'); return sh; }
function fichaExt(k){
  if(k==='sala'){ sheet('#173d7a','Sede Primaria','Sala de profesores','<p>Punto de encuentro de los docentes en la Sede Primaria.</p><button class="btn alt2" id="ir">🧭 Ir con mi avatar</button>'); document.getElementById('ir').onclick=()=>{ document.getElementById('sheet').classList.remove('open'); caminarA('sala'); }; return; }
  if(k==='rest'){ sheet('#e5484d','Sede Primaria','Restaurante','<p>Restaurante del colegio, al lado de la Sala de profesores.</p>'); return; }
  if(k==='gym'||k==='pool'){ sheet('#8a5aa0','Este día no se usa',EXT[k],'<p>Se muestra para ubicarse en la Sede Primaria.</p>'); return; }
  if(k==='T'){ sheet('#8a5aa0','Este día no se usa','Ala de Tecnología','<p>Se muestra para ubicarse en el colegio. Las actividades de Tecnología del STEM Day son en el Coliseo.</p>'); return; }
  const fs=activos(NOW).filter(f=>escDe(f)===k), c=colorF(fs)||'#5b6577';
  const grupos={}; fs.forEach(f=>{ const g=nombreA(f.area)+' · '+f.grado; (grupos[g]=grupos[g]||[]).push(f.curso); });
  const sh=sheet(c,'Ahora',EXT[k],`<h4>En este momento</h4>${Object.keys(grupos).length?Object.entries(grupos).map(([g,cs])=>`<p><b>${g}</b> · ${rango(cs)}</p>`).join(''):'<p class="pend">Sin cursos en este momento</p>'}<button class="btn alt2" id="ir">🧭 Ir con mi avatar</button>`);
  document.getElementById('ir').onclick=()=>{ sh.classList.remove('open'); irA(k); };
}
let GEN=0;   // cambia al salir o quitar: cancela una ficha pendiente
async function fichaSalon(code){
  if(busy) return; const g=GEN, sc0=scene; document.getElementById('sheet').classList.remove('open'); await irSalon(code); if(g!==GEN||scene!==sc0) return;
  const fs=enSalon(code,NOW), f=fs[0], c=colorF(fs)||'#5b6577';
  if(f&&!busy){ busy=true; try{ if(g!==GEN) return; await mostrarLlegada(box_,{tipo:'actividad',cat:f.categoria,titulo:f.titulo,nombre:titA(f),lugar:(/^\d|^[A-Z]{2}\d/.test(code)?'Salón ':'')+code,salon:code,frase:f.frase},lidsUnicos(fs)); } finally{ busy=false; } }
  const dia=ACT.filter(x=>x.salon===code).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
  sheet(c,f?nombreA(f.area):'Salón',`${/^\d|^[A-Z]{2}\d/.test(code)?'Salón ':''}${code}${f?' · '+f.curso:''}`,
    `${f?`<p><b>${fmtHora(f.hora_inicio)}–${fmtHora(f.hora_fin)}</b> · ${f.grado}</p>${f.titulo?`<h4>Actividad</h4><p><b>${esc(titA(f))}</b></p>`:''}${f.frase?`<p class="frase">${esc(f.frase)}</p>`:''}${lidSheet(fs)||`<h4>Docente a cargo</h4><p>${esc(f.docente_cargo)||'<span class="pend">Información pendiente</span>'}</p>`}<h4>Acompañante</h4><p>${f.acompanante||'—'}</p>`:'<p class="pend">Sin curso en este momento</p>'}
     <h4>Durante el día</h4>${dia.map(x=>`<p>${fmtHora(x.hora_inicio)} · <b>${x.curso}</b> · ${esc(titA(x))}</p>`).join('')||'<p class="pend">Sin actividades</p>'}`);
}
/* actividades en carpas (Hall, pisos, Zona verde, Coliseo, cancha): el avatar camina hasta la carpa, animación e información */
async function fichaCarpa(id,pt){
  if(busy) return; const f=DATA.find(x=>String(x.id)===String(id)); if(!f) return; const g=GEN, sc0=scene;
  document.getElementById('sheet').classList.remove('open'); ROOMP=null;
  if(!same(avPos,pt)){ busy=true; const v=[...svg._vb]; try{ await caminar([avPos,pt],CI().walk); placeAv(avPos,{dir:'b',flip:false});
    const z=svg._vb; await anim(600,q=>{const e=ease(q); setVB(z.map((x,i)=>lerp(x,v[i],e)));}); FULL=v; } finally{ busy=false; } }
  if(g!==GEN||scene!==sc0) return;
  busy=true; try{ await mostrarLlegada(box_,{tipo:'actividad',cat:f.categoria,titulo:f.titulo,nombre:titA(f),lugar:f.salon,salon:f.salon,frase:f.frase},lidsFila(f)); } finally{ busy=false; }
  if(g!==GEN||scene!==sc0) return;
  const c=AREA_C[f.categoria]||'#5b6577', otros=enSalon(f.salon,NOW).filter(x=>x!==f);
  sheet(c,nombreA(f.area),`${esc(f.salon)} · ${esc(f.curso)}`,
    `<p><b>${fmtHora(f.hora_inicio)}–${fmtHora(f.hora_fin)}</b> · ${f.grado}</p>${f.titulo?`<h4>Actividad</h4><p><b>${esc(titA(f))}</b></p>`:''}${f.frase?`<p class="frase">${esc(f.frase)}</p>`:''}
     ${lidSheet([f])||`<h4>Docente a cargo</h4><p>${esc(f.docente_cargo)||'<span class="pend">Información pendiente</span>'}</p>`}<h4>Acompañante</h4><p>${esc(f.acompanante)||'—'}</p><h4>Apoyo</h4><p>${esc(f.apoyo)||'—'}</p>
     ${otros.length?`<h4>También aquí ahora</h4>${otros.map(x=>`<p><b>${x.curso}</b> · ${esc(titA(x))}</p>`).join('')}`:''}`);
}
/* el avatar camina hasta el salón que se toca dentro de un edificio */
let ROOMP=null;
async function irSalon(code){
  if(busy||scene==='ext'||CAM||!svg) return;
  let legs; try{ legs=legsDestino({salon:code},'D1'); }catch(e){ return; }
  const L=legs&&legs[legs.length-1]; if(!L) return;
  const pts=L.pts||hallPts(L.a,L.b); if(L.scene!==scene||!pts||pts.length<2) return;
  const room=pts[pts.length-1], attach=pts[pts.length-2];
  if(same(avPos,room)) return;
  const r=[avPos]; if(ROOMP&&ROOMP.scene===scene&&same(avPos,ROOMP.room)) r.push(ROOMP.attach);
  const cur=r[r.length-1];
  if(pts.length>=3){ const a=pts[pts.length-3]; if(Math.abs(a[1]-attach[1])<.5) r.push([cur[0],attach[1]]); else if(Math.abs(a[0]-attach[0])<.5) r.push([attach[0],cur[1]]); }
  r.push(attach,room); const ruta=r.filter((p,i)=>!i||!same(p,r[i-1])); if(ruta.length<2) return;
  busy=true; const v=[...svg._vb];
  try{ await caminar(ruta,CI().walk); ROOMP={scene,attach,room}; placeAv(avPos,{dir:'b',flip:false}); if(CI().follow){ fit(); return; }
    const t=[...v]; const z=svg._vb; await anim(650,q=>{const e=ease(q); setVB(z.map((x,i)=>lerp(x,t[i],e)));}); FULL=t; }
  finally{ busy=false; } }

/* recorridos exteriores hasta la puerta de cada edificio */
let EXTK=null;   // lugar del exterior donde está el avatar (puerta del último edificio)
const extDe=sc=>{ const I=INT[sc]; if(!I) return null; if(I.esc) return I.esc; if(sc==='coliseo'||sc==='cancha') return sc; return 'D1'; };
function rutaExt(k){ const a=avPos;
  { const desde=EXTK||(same(avPos,WX.inicio)?'D1':null);
    if(desde && k!=='primaria'){ const vieneP=PB[desde]||PV[desde]||desde==='cancha'||desde==='sala';
      const t=(PB[k]||PV[k]||k==='coliseo'||k==='cancha')?k:(vieneP?'D2':'D1');
      const r=[a,...caminoExt(desde,t)]; return r.filter((p,i)=>!i||!same(p,r[i-1])); } }
  if(RUTAS_P[k]){ const base=[a,WX.plaza,...SENDERO.slice(1).map(p=>IJ(...p))]; let r=RUTAS_P[k].map(p=>IJ(...p));

    return [...base,...r,puerta(PB[k]||PV[k])]; }
  if(k==='coliseo') return [a,WX.plaza,WX.coliseo];
  if(k==='cancha') return [a,...chainExt('cancha')];
  if(k==='primaria') return [a,WX.plaza,WX.primariaD,WX.primaria];
  return [a,WX.inicio];   // hall, bS y b130 se entra por el Hall
}
async function caminar(lista,zoomW=170){
  const segs=[]; let L=0; for(let k=1;k<lista.length;k++){ const a=P(...lista[k-1]),b=P(...lista[k]); const d=Math.hypot(b[0]-a[0],b[1]-a[1]); segs.push([lista[k-1],lista[k],d]); L+=d; }
  if(L<1) return;
  const zoom=(x,y)=>[x-zoomW/2,y-zoomW*.6,zoomW,zoomW*1.15];
  const at=q=>{ let r=q*L; for(const [a,b,d] of segs){ if(r<=d){ const t=d?r/d:1; return [lerp(a[0],b[0],t),lerp(a[1],b[1],t)]; } r-=d; } return lista[lista.length-1]; };
  const p0=P(...lista[0]), z0=zoom(p0[0],p0[1]), v0=svg._vb||FULL;
  await anim(600,q=>{const e=ease(q); setVB(v0.map((v,i)=>lerp(v,z0[i],e)));});
  let prev=P(...lista[0]), dist=0;
  await anim(Math.max(1400,Math.min(7000,L*6)),q=>{ const e=ease(q), ij=at(e), xy=P(...ij); const dx=xy[0]-prev[0], dy=xy[1]-prev[1]; dist+=Math.hypot(dx,dy);
    const mov=Math.hypot(dx,dy)>.05, vel=Math.min(1,Math.abs(Math.sin(q*Math.PI))*2.2);
    avPos=ij; placeAv(ij,{walk:vel,ph:dist/7,blink:false,look:0,wave:0,lift:0,...(mov?{dir:dy<-.05?'b':'f',flip:dx<0}:{})}); prev=xy; setVB(zoom(xy[0],xy[1])); });
  placeAv(avPos,{walk:0});
}
async function fadeTo(txt,fn){ const fd=$c('cvFade'); fd.textContent=txt||''; fd.classList.add('on'); await anim(460,()=>{}); fn(); await anim(150,()=>{}); fd.classList.remove('on'); await anim(400,()=>{}); }
async function irInterior(k,directo,row){
  if(busy) return; busy=true; document.getElementById('sheet').classList.remove('open');
  const sc=INT[k];
  await fadeTo(k==='bS2'||k==='bS3'?'Subiendo por la escalera…':(k==='b130'?'Cruzando el Hall…':(k==='verde'?'Saliendo a la Zona verde…':'Entrando…')),()=>{ scene=k; avPos=sc.entry; render(); fit(); });
  await caminar([sc.entry,sc.target],CI().walk); await saludo();
  render(); const v=svg._vb; const F0=[...FULL]; fit(); const F1=[...FULL]; setVB(v); await anim(700,q=>{const e=ease(q); setVB(v.map((x,i)=>lerp(x,F1[i],e)));});
  busy=false;
}
async function irA(k){
  if(busy) return;
  if(k==='T'||k==='gym'||k==='pool') return;
  busy=true; if(scene!=='ext'){ EXTK=extDe(scene); scene='ext'; avPos=EXTK?door(EXTK==='D1'?'hall':EXTK):WX.inicio; render(); fit(); }
  await caminar(rutaExt(k)); EXTK=(PB[k]||PV[k]||k==='coliseo'||k==='cancha')?k:'D1';
  busy=false;
  if(k==='bS') return irInterior('bS2');
  if(k==='b130') return irInterior('b130');
  if(k==='verde') return irInterior('verde');
  if(k==='pAB') return irInterior('pAB1');
  if(k==='pAC') return irInterior('pAC1');
  irInterior(k);
}
async function caminarA(k){ if(busy) return; busy=true; if(scene!=='ext'){ EXTK=extDe(scene); scene='ext'; avPos=EXTK?door(EXTK==='D1'?'hall':EXTK):WX.inicio; render(); fit(); }
  const desde=EXTK||'D1', base=[avPos,...caminoExt(desde,'sala')]; await caminar(base.filter((p,i)=>!i||!same(p,base[i-1]))); EXTK='sala'; await saludo(); const v=svg._vb; fit(); const F1=[...FULL]; setVB(v); await anim(700,q=>{const e=ease(q); setVB(v.map((x,i)=>lerp(x,F1[i],e)));}); busy=false; }
async function salir(){ GEN++; if(busy) return; busy=true; const d=scene!=='ext'&&INT[scene].door; if(scene!=='ext') EXTK=extDe(scene); await fadeTo('Saliendo…',()=>{ scene='ext'; avPos=(d||WX.inicio); render(); fit(); }); busy=false; }
function flagPos(k){ let i,j,z;
  if(PB[k]){ const r=rect(PB[k]); i=(r[0]+r[1])/2; j=(r[2]+r[3])/2; z=PB[k].h; }
  else if(PV[k]){ const r=rect(PV[k]); i=(r[0]+r[1])/2; j=(r[2]+r[3])/2; z=0; }
  else [i,j,z]=({hall:[182,300,16],bS:[160,172,36],b130:[215,-10,30],coliseo:[85,336,46],verde:[319,86,0],cancha:[...IJ(61.7,40),0]})[k]||[182,300,16];
  return P(i,j,z+4); }
function door(k){ if(k==='coliseo') return WX.coliseo; if(k==='cancha') return IJ(...CAN_P); if(PB[k]||PV[k]) return puerta(PB[k]||PV[k]); return WX.inicio; }
const same=(a,b)=>Math.abs(a[0]-b[0])<.5&&Math.abs(a[1]-b[1])<.5;
const pisoDe=s=>(/^3|piso 3/.test(ns(s))?'3':'2');
const intKey=f=>{ const k=escDe(f), s=ns(f.salon); if(k==='bS') return pisoDe(s)==='3'?'bS3':'bS2'; if(k==='pAB'||k==='pAC') return k+(s[2]==='2'?'2':'1'); return k; };
function camSVG(){ if(!CAM) return ''; const L=CAM.legs[CAM.li]; if(!L) return ''; const pts=L.pts.map(p=>P(...p)); let s='';
  if(pts.length>1){ const d='M'+pts.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' L');
    s+=`<path d="${d}" fill="none" stroke="#fff" stroke-width="${scene==='ext'?9:9*KI()}" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/><path class="cam-path" pathLength="1" d="${d}" fill="none" stroke="#f2a900" stroke-width="${scene==='ext'?5:5*KI()}" stroke-linecap="round" stroke-linejoin="round"/>`; }
  const pin=(p,col,txt,anim)=>`<g transform="translate(${p[0].toFixed(1)},${p[1].toFixed(1)}) scale(${scene==='ext'?1.6:1.05*KI()})"><ellipse rx="9" ry="4" fill="${col}" opacity=".3">${anim?'<animate attributeName="rx" values="6;13;6" dur="1.4s" repeatCount="indefinite"/>':''}</ellipse><path d="M0 0 c-5-6-7-9-7-12.5a7 7 0 0 1 14 0c0 3.5-2 6.5-7 12.5z" transform="translate(0,-2)" fill="${col}" stroke="#fff" stroke-width="1.5"/><circle cy="-14.5" r="2.6" fill="#fff"/><g transform="translate(0,-26)"><rect x="${-txt.length*2.6-6}" y="-8" width="${txt.length*5.2+12}" height="14" rx="7" fill="${col}"/><text y="2.5" text-anchor="middle" style="font-size:8px;font-weight:800;fill:#fff">${txt}</text></g></g>`;
  if(CAM.li===0) s+=pin(pts[0],'#5b6577',CAM.oTxt,false);
  if(CAM.li===CAM.legs.length-1) s+=pin(pts[pts.length-1],'#e5484d','Debes estar aquí',true);
  return s; }
/* puerta dibujada dentro del Hall */
function puertaInt(i,j,t,lado){ const [x,y]=P(i,j); return `<g><rect x="${x-5}" y="${y-14}" width="10" height="14" rx="1.5" fill="#8a5a3b" stroke="#5b3a24"/><rect x="${x+(lado<0?-52:8)}" y="${y-22}" width="44" height="13" rx="6" fill="#173d7a"/><text x="${x+(lado<0?-30:30)}" y="${y-12.6}" text-anchor="middle" style="font-size:6.8px;font-weight:800;fill:#fff">${t}</text></g>`; }
/* ===== planificador del recorrido: exterior + interiores ===== */
const J2=[-78.9,70], D2E=[146,70];
function chainExt(k){ const S=SENDERO.map(p=>IJ(...p)); if(k==='D1') return [WX.plaza,WX.inicio]; if(k==='sala') return [WX.plaza,...S.slice(1,6),J2,S[6],S[7],...RUTAS_P.sala.map(p=>IJ(...p)),IJ(...SALA.d)]; if(k==='cancha') return [WX.plaza,...S.slice(1,6),IJ(...CAN_P)]; if(k==='coliseo') return [WX.plaza,WX.coliseo];
  const base=[WX.plaza,...S.slice(1,6),J2]; if(k==='D2') return [...base,D2E];
  return [...base,S[6],S[7],...(RUTAS_P[k]||[]).map(p=>IJ(...p)),puerta(PB[k]||PV[k])]; }
function caminoExt(k1,k2){ if(k1===k2) return []; const a=chainExt(k1),b=chainExt(k2); let n=0; while(n<a.length&&n<b.length&&same(a[n],b[n])) n++; n=Math.max(n,1); return [...a.slice(n-1).reverse(),...b.slice(n)]; }
const HN={D1:[[130,340],[130,352]],D2:[[130,70],[96,70]],D3:[[130,95],[164,95]],back:[[130,-15]],stairs:[[130,160],[114,160]],HP:[[130,250]]};
function hallNode(n){ if(n.startsWith('R:')){ const c=ns(n.slice(2)), L=['116','117','118','119','120','121'], Rr=['115B','115A','114','113','112','111'];
  const ci=L.includes(c)?42-48*L.indexOf(c):184+42*Math.max(0,Rr.indexOf(c)); return [[130,167],[ci,167],[ci,142]]; } return HN[n]; }
function hallPts(a,b){ const r=[...hallNode(a).slice().reverse(),...hallNode(b)]; return r.filter((p,i)=>!i||!same(p,r[i-1])); }
const grupo=f=>{ const k=escDe(f); if(k==='verde') return 'V'; if(k==='coliseo') return 'C'; if(k==='cancha') return 'K'; if(['hall','bS','b130'].includes(k)) return 'H'; return 'P'; };
const pisoPts=(code,derecha,izquierda)=>{ const r=derecha.indexOf(code); const ci=r>=0?158+40*r:74-40*Math.max(0,izquierda.indexOf(code)); return [[114,175],[ci,175],[ci,150]]; };
function legsDestino(f,entrada){ const k=escDe(f), s=ns(f.salon);
  if(k==='cancha') return [{scene:'cancha',pts:[[-14,130],[60,130]]}];
  if(k==='coliseo') return [{scene:'coliseo',pts:[[150,250],[150,170]]}];
  if(PB[k]){ const key=intKey(f), ix=Math.max(0,(INT[key].salones||[]).indexOf(s)), ci=28+42*ix; return [{scene:key,pts:[[0,105],[ci,105],[ci,80]]}]; }
  if(PV[k]) return [{scene:k,pts:[[-10,170],[110,170]]}];
  const H=n=>({scene:'hall',a:entrada,b:n});
  if(k==='verde') return [H('D3'),{scene:'verde',pts:[[-10,170],[110,170]]}];
  if(k==='b130'){ if(s==='Aula de Cristal') return [H('back'),{scene:'b130',pts:[[0,105],[175,105],[175,148]]}]; const ci=28+42*Math.max(0,['131','133','137','138','139','140','143','144'].indexOf(s)); return [H('back'),{scene:'b130',pts:[[0,105],[ci,105],[ci,80]]}]; }
  if(k==='bS'&&/^Hall piso/.test(s)){ const p3=pisoDe(s)==='3'; return [H('stairs'),{scene:p3?'bS3':'bS2',pts:[[114,175],[114,212]]}]; }
  if(k==='bS'){ const p3=s[0]==='3'; return [H('stairs'),{scene:p3?'bS3':'bS2',pts:p3?pisoPts(s,['305','304','303','302','301','300'],['306','307','308','309','310','311','312','313']):pisoPts(s,['205','204','203','202','201','200'],['206','207','208','209','210','211','212','213'])}]; }
  return [H(s==='Hall Principal'?'HP':'R:'+s)]; }
const invertir=L=>L.scene==='hall'&&L.a?{scene:'hall',a:L.b,b:L.a}:{scene:L.scene,pts:L.pts.slice().reverse()};
function planRuta(org,dst){ const fb=dst.f, gb=grupo(fb);
  if(org&&ns(org.f.salon)===ns(fb.salon)){ const l=legsDestino(fb,'D1'), u=l[l.length-1]; const pts=u.pts||hallPts(u.a,u.b); return [{scene:u.scene,pts:[pts[pts.length-1]]}]; }
  let legs;
  const ga=org?grupo(org.f):'X';
  if(['H','V'].includes(ga)&&['H','V'].includes(gb)){ const o=legsDestino(org.f,'D1'), d=legsDestino(fb,'D1'), X=o[0].b, Y=d[0].b;
    legs=[...o.slice(1).reverse().map(invertir), ...(X!==Y?[{scene:'hall',a:X,b:Y}]:[]), ...d.slice(1)]; }
  else { const salidaH=f=>ns(f.salon)==='Hall Principal'?'D1':((gb==='P'||gb==='K')?'D2':'D1'), entradaH=f=>ns(f.salon)==='Hall Principal'?'D1':((ga==='P'||ga==='K')?'D2':'D1');
    const exitK=ga==='X'?'D1':['H','V'].includes(ga)?salidaH(org.f):ga==='C'?'coliseo':escDe(org.f);
    const entK=['H','V'].includes(gb)?entradaH(fb):gb==='C'?'coliseo':escDe(fb);
    const o=org?legsDestino(org.f,exitK).reverse().map(invertir):[];
    legs=[...o,{scene:'ext',pts:caminoExt(exitK,entK)},...legsDestino(fb,entK)]; }
  legs=legs.map(L=>L.a?{scene:'hall',pts:hallPts(L.a,L.b)}:L).filter(L=>L.pts.length>1);
  const m=[]; legs.forEach(L=>{ const u=m[m.length-1]; if(u&&u.scene===L.scene) u.pts=[...u.pts,...L.pts.slice(same(u.pts[u.pts.length-1],L.pts[0])?1:0)]; else m.push({...L}); });
  return m.length?m:[{scene:'ext',pts:[door(dst.k)]}]; }
const MSG={ext:'Saliendo…',hall:'Por el Hall Principal…',bS2:'Subiendo al piso 2…',bS3:'Subiendo al piso 3…',b130:'Hacia el Bloque 130…',verde:'Saliendo a la Zona verde…',coliseo:'Entrando al Coliseo…',cancha:'Hacia la cancha de fútbol…'};
function encuadrar(l,f){ const ps=l.map(p=>P(...p)); const asp=box_.clientWidth/box_.clientHeight;
  let x0=Math.min(...ps.map(p=>p[0]))-40,x1=Math.max(...ps.map(p=>p[0]))+40,y0=Math.min(...ps.map(p=>p[1]))-55,y1=Math.max(...ps.map(p=>p[1]))+25;
  let w=scene==='ext'?Math.max(170,x1-x0):Math.min(Math.max(300*KI(),x1-x0),Math.max(300*KI(),230)),h=y1-y0; if(w/h<asp) w=h*asp; else h=w/asp; h/=(f||0.85); w=h*asp; const cx=(x0+x1)/2; return [cx-w/2,scene==='ext'?y0-h*.04:(y0+y1)/2-h*.45,w,h]; }
/* ---- lugar señalado (Programa → mapa) y organizador ---- */
let LUGAR=null, ORGU=null, MARCANDO=null;
const pinSVG=(x,y,col,t,anima)=>`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(1.6)"><ellipse rx="9" ry="4" fill="${col}" opacity=".3">${anima?'<animate attributeName="rx" values="6;14;6" dur="1.4s" repeatCount="indefinite"/>':''}</ellipse><path d="M0 0 c-5-6-7-9-7-12.5a7 7 0 0 1 14 0c0 3.5-2 6.5-7 12.5z" transform="translate(0,-2)" fill="${col}" stroke="#fff" stroke-width="1.5"/><circle cy="-14.5" r="2.6" fill="#fff"/><g transform="translate(0,-26)"><rect x="${-t.length*2.6-6}" y="-8" width="${t.length*5.2+12}" height="14" rx="7" fill="${col}"/><text y="2.5" text-anchor="middle" style="font-size:8px;font-weight:800;fill:#fff">${esc(t)}</text></g></g>`;
function lugarSVG(){ if(!LUGAR) return ''; const [x,y]=flagPos(LUGAR.k); return pinSVG(x,y,'#e5484d',LUGAR.txt,true); }
function orgSVG(){ if(!ORGU||CAM) return ''; const [x,y]=flagPos(ORGU.k); return `<g transform="translate(${x.toFixed(1)},${(y-4).toFixed(1)})"><rect x="-38" y="-14" width="76" height="13" rx="6.5" fill="#ff7a1a"/><text y="-4.5" text-anchor="middle" style="font-size:7.5px;font-weight:800;fill:#fff">📍 Estás aquí</text></g>`; }
const LUGS=[['coliseo','Coliseo'],['hall','Hall Principal'],['b130','137'],['bS','203'],['verde','Zona verde'],['pAA1','AA101'],['pAA2','AA105'],['pAA3','AA113'],['pAB','AB103'],['pAC','AC102'],['pV1','Zona verde Primaria'],['pV2','Zona verde Primaria 2'],['cancha','Cancha de fútbol']];
async function volarA(k){ const [x,y]=flagPos(k), v=svg._vb, w=230, h=w*box_.clientHeight/box_.clientWidth, t=[x-w/2,y-h*.5,w,h];
  await anim(750,q=>{const e=ease(q); setVB(v.map((a,i)=>lerp(a,t[i],e)));}); FULL=t; }
function clicMarcar(e){ if(!MARCANDO||scene!=='ext') return; e.stopPropagation(); e.preventDefault();
  const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; const q=pt.matrixTransform(svg.getScreenCTM().inverse());
  let best=null,bd=1e9; LUGS.forEach(([k,sal])=>{ const [x,y]=flagPos(k), d=(x-q.x)**2+(y-q.y)**2; if(d<bd){ bd=d; best=[k,sal]; } });
  ORGU={k:best[0],salon:best[1],nombre:EXT[best[0]]}; const cb=MARCANDO; MARCANDO=null; avPos=door(ORGU.k); render(); cb(ORGU); }

const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function mostrarCamino(orgRow,dstRow,oTxt){ if(busy||!dstRow) return; busy=true; orgRow=nrow(orgRow); dstRow=nrow(dstRow);
  const mk=f=>f?{f,k:escDe(f)}:null, org=mk(orgRow), dst=mk(dstRow);
  const legs=planRuta(org,dst); NOW=toMin(dstRow.hora_inicio)+1;
  CAM={legs,li:0,oTxt:oTxt||(org?`Estabas aquí · ${org.f.salon}`:'Estás aquí · Entrada')};
  try{
    for(let i=0;i<legs.length;i++){ const L=legs[i]; CAM.li=i;
      const entra=()=>{ scene=L.scene; avPos=L.pts[0]; render(); setVB(encuadrar(L.pts)); };
      if(i===0) entra(); else if(legs[i-1].scene!==L.scene) await fadeTo(MSG[L.scene]||'Entrando…',entra); else render();
      await wait(i===0?1300:800);
      if(L.pts.length>1) await caminar(L.pts,L.scene==='ext'?200:Math.round(260*KI()));
      avPos=L.pts[L.pts.length-1]; }
    await saludo(); const last=legs[legs.length-1], v=svg._vb, t=encuadrar(last.pts,0.85);
    await anim(700,q=>{const e=ease(q); setVB(v.map((a,i)=>lerp(a,t[i],e)));}); FULL=t;
  } finally { busy=false; } }


/* ===================== API ===================== */
function montar(){
  if(svg) return; box_=$c('cvMap');
  svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  box_.insertBefore(svg,box_.firstChild); eventos(); box_.addEventListener('click',clicMarcar,true);
  $c('cvHora').oninput=e=>{ API.manual=Date.now(); setNow(+e.target.value); };
}
function setNow(m){ NOW=m; const h=$c('cvHora'); if(h) h.value=m; const t=$c('cvHTxt'); if(t) t.textContent=fmtM(m); if(!busy&&svg) render(); }
const API={
  manual:0,
  setDatos(rows){ DATA=(rows||[]).map(r=>({...r,salon:ns(r.salon),area:r.area||'',titulo:r.titulo||'',frase:r.frase||''})); ACT=DATA.filter(f=>f.tipo==='actividad'); },
  setAvatar(av){ AV=avatarNormal(av||{}); if(svg) placeAv(avPos); },
  setLideres(fn){ LIDFN=fn||null; },
  setPins(p){ PINS=p||[]; if(svg&&!busy&&scene==='ext') render(); },
  setHora(m){ setNow(Math.max(420,Math.min(900,m))); },
  ocupado(){ return busy; },
  /* vista Master: el colegio completo */
  abrirMaster(){ montar(); CAM=null; EXTK=null; scene='ext'; avPos=WX.inicio; render(); fit(); },
  refrescar(){ if(svg&&!busy) render(); },
  /* vista docente: camino desde la estación anterior hasta la actual */
  async camino(org,dst){ montar(); CAM=null; scene='ext'; avPos=org?door(escDe(org)):WX.inicio; org=nrow(org); dst=nrow(dst); render(); fit(); await mostrarCamino(org,dst); },
  zona(f){ return escDe(f); }, nombreZona(k){ return EXT[k]||k; },
  cerrar(){ CAM=null; LUGAR=null; scene='ext'; $c('sheet').classList.remove('open'); },
  /* Programa → mapa: señala el lugar de una actividad */
  async lugar(row){ montar(); if(busy) return; row=nrow(row); CAM=null; const k=escDe(row); LUGAR={k,txt:'Aquí es · '+(row.salon||'')}; NOW=toMin(row.hora_inicio)+1; scene='ext';
    if(ORGU) avPos=door(ORGU.k); render(); if(!svg._vb) fit(); await volarA(k); },
  /* entra al edificio de la actividad */
  async entrar(row){ montar(); if(scene!=='ext'&&!svg.firstChild) scene='ext'; row=nrow(row); LUGAR=null; NOW=toMin(row.hora_inicio)+1; const g=++GEN; await irInterior(intKey(row),true,row); if(g===GEN) await fichaSalon(row.salon); },
  async quitar(){ GEN++; if(busy) return; const dentro=scene!=='ext'; CAM=null; LUGAR=null; ROOMP=null;
    if(dentro){ const d=INT[scene]&&INT[scene].door; EXTK=ORGU?null:extDe(scene); busy=true; try{ await fadeTo('Saliendo…',()=>{ scene='ext'; avPos=ORGU?door(ORGU.k):(d||WX.inicio); render(); fit(); }); } finally{ busy=false; } }
    else { scene='ext'; if(ORGU) avPos=door(ORGU.k); render(); fit(); } },
  /* organizador: ubicación tocando el mapa */
  marcar(cb){ montar(); if(scene!=='ext'){ scene='ext'; render(); fit(); } MARCANDO=cb||(()=>{}); },
  cancelarMarcar(){ MARCANDO=null; },
  marcando(){ return !!MARCANDO; },
  setUbicacion(u){ ORGU=u||null; if(svg&&!busy){ if(ORGU) avPos=door(ORGU.k); render(); } },
  ubicacion(){ return ORGU; },
  async recorrido(row){ montar(); if(!ORGU||busy) return; LUGAR=null; const o={f:{salon:ORGU.salon,hora_inicio:'00:00'},k:ORGU.k,txt:'Estás aquí'}; await mostrarCamino(o.f,row,o.txt); }
};
window.ColegioVivo=API;
})();
