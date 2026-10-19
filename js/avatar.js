/* =====================================================================
   STEM Day Cafam · Avatar v3 (v38): rostro expresivo, ropa, inclusión y editor
   Compatible con los avatares guardados (gender/hair/style/face antiguos se
   traducen solos en avatarNormal) y con avatarPose(cfg,pose) de mapa/colegio/copa.
   ===================================================================== */
/* Los 10 primeros colores son los de siempre (no cambian los avatares guardados) */
const PAL=['#2f6fde','#1f9d6b','#7b4bd6','#f2a900','#e5484d','#1b2333','#ffffff','#8a5a3b','#ec7fb0','#4fb3d9',
           '#0f766e','#f97316','#84cc16','#9ca3af','#7f1d1d','#fde68a'];
const OPT = {
  gender:['Hombre','Mujer'],
  skin:['#f6d3b3','#e8b48a','#c98b5e','#8d5a3b','#5c3a24','#fbe3cf','#a86f48','#3d2618','#d8a77c'],
  hairH:['Corto','Rapado','Rizado','Peinado de lado','Calvo','Afro','Mohicano'],
  hairM:['Largo','Cola de caballo','Rizado','Melena corta','Calva','Moño alto','Trenzas'],
  hairC:['#2b1d14','#6b3e1f','#b5651d','#e3c16f','#7a7f8a','#c0392b','#e9e9ee','#2f6fde','#7b4bd6','#ec7fb0','#14b8a6'],
  styleH:['Casual','Formal','Deportivo','Bata de laboratorio'],
  styleM:['Casual','Formal','Deportivo','Bata de laboratorio'],
  shoe:['#1b2333','#ffffff','#8a5a3b','#e5484d','#2f6fde','#f2a900','#1f9d6b','#7b4bd6','#ec7fb0'],
  head:['Ninguno','Gorra','Casco de ingeniería','Audífonos','Sombrero','Gorro de lana','Diadema','Hiyab','Turbante','Pañoleta','Kipá'],
  face:['Ninguno','Gafas','Gafas de laboratorio','Bigote','Barba','Gafas de sol','Gafas de colores'],
  extra:['Reloj','Escarapela STEM','Chaleco de organizador','Mochila','Bufanda'],
  /* nuevas (v38) */
  pelo:['Corto','Rapado','Rizado','De lado','Calvo','Afro','Mohicano','Largo','Cola de caballo','Rizos largos','Melena corta','Moño alto','Trenzas','Ondulado','Dos colitas','Pixie','Rastas','Copete'],
  ojos:['Clásicos','Brillantes','Felices','Con pestañas','Guiño','Decididos'],
  ojosC:['#3b2a20','#7a4a24','#b07a2a','#2f6fde','#1f9d6b','#6b7280'],
  cejas:['Normales','Gruesas','Arqueadas','Decididas','Sorprendidas'],
  boca:['Sonrisa','Sonrisa amplia','Carcajada','¡Oh!','Lengua afuera','De lado','Tranquila'],
  nariz:['Sin nariz','Pequeña','Botón'],
  marcas:['Pecas','Lunar','Rubor','Líneas de expresión','Vitiligo'],
  barba:['Ninguna','Sombra de barba','Barba completa','Bigote','Candado'],
  cuerpo:['Delgada','Media','Robusta'],
  ropa:['Camiseta','Camisa y corbata','Buzo deportivo','Bata de laboratorio','Overol','Chaqueta','Buzo con capucha','Camiseta Copa STEM','Chaleco','Blusa','Vestido'],
  abajo:['Jean','Pantalón','Sudadera','Falda','Pantaloneta'],
  prot:['Ninguna','Pierna','Brazo'],
  fondo:['Ninguno','Cielo','Atardecer','Laboratorio','Espacio','Naturaleza','Dorado STEM','Circuitos','Ciudad digital','Pizarra de fórmulas','Bosque científico']
};
const AVATAR_DEF={gender:0,skin:1,hair:0,hairC:0,style:0,top:2,bot:5,shoe:1,head:0,face:2,extra:[1]};
/* Avatar con el que arranca alguien que nunca ha creado el suyo */
const AVATAR_NUEVO={gender:0,skin:1,hair:0,hairC:0,style:0,top:0,bot:5,shoe:1,head:0,face:0,extra:[],
  pelo:0,ropa:7,abajo:0,ojos:1,ojosC:0,cejas:0,boca:1,nariz:1,marcas:[],barba:0,cuerpo:1,fondo:1};
const TOPN={Casual:'Camiseta',Formal:'Camisa',Deportivo:'Buzo','Bata de laboratorio':'Ropa bajo la bata'};
const BOTN={H:{Casual:'Jean',Formal:'Pantalón',Deportivo:'Sudadera','Bata de laboratorio':'Pantalón'},M:{Casual:'Jean',Formal:'Falda',Deportivo:'Sudadera','Bata de laboratorio':'Pantalón'}};
const AV_LEG={H:[0,1,2,3,4,5,6],M:[7,8,9,10,4,11,12]};   // peinado antiguo → nuevo
const AV_LARGO=[5,7,8,9,10,11,12,13,14,16];              // peinados con parte trasera

function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;r=Math.round(r*f);g=Math.round(g*f);b=Math.round(b*f);return `rgb(${Math.min(255,r)},${Math.min(255,g)},${Math.min(255,b)})`;}
const _sh=(hex,f)=>shade(hex,f);
const OUT='#2b2b3a';

/* Traduce cualquier avatar guardado (antiguo o nuevo) al formato completo */
function avatarNormal(c){
  const a=Object.assign({},AVATAR_DEF,c||{});
  if(!Array.isArray(a.extra)) a.extra=[];
  const M=a.gender===1;
  if(a.pelo==null) a.pelo=(M?AV_LEG.M:AV_LEG.H)[a.hair]??0;
  if(a.ropa==null||a.abajo==null){ const R=[[0,0],[M?9:1,M?3:1],[2,2],[3,1]][a.style|0]||[0,0]; if(a.ropa==null) a.ropa=R[0]; if(a.abajo==null) a.abajo=R[1]; }
  if(a.face===3||a.face===4){ if(a.barba==null) a.barba=a.face===3?3:2; a.face=0; }
  const D={ojos:0,ojosC:0,cejas:0,boca:0,nariz:0,barba:0,cuerpo:1,prot:0,fondo:0};
  for(const k in D) if(a[k]==null) a[k]=D[k];
  if(!Array.isArray(a.marcas)) a.marcas=[];
  a.silla=!!a.silla; a.audif=!!a.audif;
  return a;
}

/* ---------------- peinados ---------------- */
function _peloAtras(p,h,hy,st){
  switch(p){
    case 5: return `<g fill="${h}" ${st}><circle cx="-14" cy="${hy-8}" r="10"/><circle cx="14" cy="${hy-8}" r="10"/><circle cx="0" cy="${hy-16}" r="12"/><circle cx="-17" cy="${hy+3}" r="7"/><circle cx="17" cy="${hy+3}" r="7"/></g>`;
    case 7: case 10: { const L=p===7?20:12; return `<path d="M-18,${hy-2} C-20,${hy-24} 20,${hy-24} 18,${hy-2} L19,${hy+L} C10,${hy+24} -10,${hy+24} -19,${hy+L}Z" fill="${h}" ${st}/>`; }
    case 8: return `<path d="M14,${hy-8} C28,${hy-6} 27,${hy+14} 19,${hy+22} C17,${hy+12} 18,${hy+2} 12,${hy-4}Z" fill="${h}" ${st}/>`;
    case 9: return `<g fill="${h}" ${st}><circle cx="-17" cy="${hy+6}" r="8"/><circle cx="17" cy="${hy+6}" r="8"/><circle cx="-18" cy="${hy+16}" r="6.5"/><circle cx="18" cy="${hy+16}" r="6.5"/></g>`;
    case 11: return `<circle cx="0" cy="${hy-21}" r="7.5" fill="${h}" ${st}/>`;
    case 12: return `<g fill="${h}" ${st}><rect x="-22" y="${hy}" width="7" height="26" rx="3.5"/><rect x="15" y="${hy}" width="7" height="26" rx="3.5"/></g><g stroke="${_sh(h,.7)}" stroke-width="1"><path d="M-22,${hy+7} l7,3 M-22,${hy+14} l7,3 M15,${hy+7} l7,3 M15,${hy+14} l7,3"/></g><circle cx="-18.5" cy="${hy+27}" r="2.4" fill="#e5484d"/><circle cx="18.5" cy="${hy+27}" r="2.4" fill="#e5484d"/>`;
    case 13: return `<path d="M-18.5,${hy-2} C-21,${hy-24} 21,${hy-24} 18.5,${hy-2} C21,${hy+6} 17,${hy+10} 20,${hy+15} Q15,${hy+20} 11,${hy+15} L-11,${hy+15} Q-15,${hy+20} -20,${hy+15} C-17,${hy+10} -21,${hy+6} -18.5,${hy-2}Z" fill="${h}" ${st}/>`;
    case 14: return `<g fill="${h}" ${st}><circle cx="-21" cy="${hy-9}" r="7.5"/><circle cx="21" cy="${hy-9}" r="7.5"/></g><circle cx="-15.5" cy="${hy-8}" r="2.3" fill="#ec7fb0" ${st}/><circle cx="15.5" cy="${hy-8}" r="2.3" fill="#ec7fb0" ${st}/>`;
    case 16: { let o=''; [[-21,20],[-17.5,24],[-14,18],[14,18],[17.5,24],[21,20]].forEach(([x,l])=>o+=`<rect x="${x-1.9}" y="${hy-8}" width="3.8" height="${l}" rx="1.9"/>`); return `<g fill="${h}" ${st}>${o}</g>`; }
  }
  return '';
}
function _peloFrente(p,h,hy,st){
  const capA=`<path d="M-17.5,${hy-2} C-19,${hy-25} 19,${hy-25} 17.5,${hy-2} C12,${hy-12} -10,${hy-13} -17.5,${hy-2}Z" fill="${h}" ${st}/>`;
  const capB=`<path d="M-18,${hy+1} C-20,${hy-25} 20,${hy-25} 18,${hy+1} C15,${hy-9} 5,${hy-14} -4,${hy-13} C-11,${hy-12} -16,${hy-7} -18,${hy+1}Z" fill="${h}" ${st}/>`;
  switch(p){
    case 0: return `<path d="M-17,${hy-2} C-19,${hy-24} 19,${hy-24} 17,${hy-2} C13,${hy-12} 0,${hy-14} -7,${hy-12} C-12,${hy-10} -15,${hy-7} -17,${hy-2}Z" fill="${h}" ${st}/>`;
    case 1: return `<path d="M-16.5,${hy-5} C-16,${hy-20} 16,${hy-20} 16.5,${hy-5} C11,${hy-11} -11,${hy-11} -16.5,${hy-5}Z" fill="${h}" opacity=".85" ${st}/>`;
    case 2: return `<g fill="${h}" ${st}><circle cx="-12" cy="${hy-12}" r="7"/><circle cx="-3" cy="${hy-18}" r="7.5"/><circle cx="6" cy="${hy-18}" r="7.5"/><circle cx="13" cy="${hy-11}" r="7"/></g>`;
    case 3: return `<path d="M-17,${hy-1} C-20,${hy-26} 20,${hy-26} 17,${hy-1} C15,${hy-9} 8,${hy-13} -3,${hy-14} C-10,${hy-12} -15,${hy-8} -17,${hy-1}Z" fill="${h}" ${st}/>`;
    case 6: return `<path d="M-5,${hy-16} C-6,${hy-26} 6,${hy-26} 5,${hy-16} L4,${hy-6} L-4,${hy-6}Z" fill="${h}" ${st}/>`;
    case 7: case 10: case 13: return capB;
    case 8: return capA+`<circle cx="14" cy="${hy-10}" r="3" fill="#e5484d"/>`;
    case 9: return `<g fill="${h}" ${st}><circle cx="-12" cy="${hy-13}" r="7.5"/><circle cx="-3" cy="${hy-19}" r="8"/><circle cx="7" cy="${hy-19}" r="8"/><circle cx="14" cy="${hy-12}" r="7.5"/></g>`;
    case 11: case 12: case 14: return capA;
    case 15: return `<path d="M-17.5,${hy-1} C-19,${hy-25} 19,${hy-25} 17.5,${hy-3} L14,${hy-7} L11,${hy-4} L8,${hy-9} L4,${hy-6} L0,${hy-11} L-5,${hy-7} L-9,${hy-10} L-13,${hy-5}Z" fill="${h}" ${st}/>`;
    case 16: return capA+`<g fill="${h}" ${st}><rect x="-17" y="${hy-12}" width="3.8" height="16" rx="1.9"/><rect x="13.2" y="${hy-12}" width="3.8" height="16" rx="1.9"/></g>`;
    case 17: return `<path d="M-17,${hy-1} C-18,${hy-14} -10,${hy-17} 0,${hy-16} C10,${hy-17} 18,${hy-14} 17,${hy-1} C14,${hy-9} -14,${hy-9} -17,${hy-1}Z" fill="${h}" ${st}/><path d="M-13,${hy-13} C-15,${hy-26} 9,${hy-29} 14,${hy-19} C11,${hy-14} 3,${hy-12} -13,${hy-13}Z" fill="${h}" ${st}/>`;
  }
  return '';
}
const _capNuca=(h,hy,st)=>`<path d="M-17.5,${hy+2} C-19,${hy-22} 19,${hy-22} 17.5,${hy+2} C12,${hy+12} -12,${hy+12} -17.5,${hy+2}Z" fill="${h}" ${st}/>`;

/* ---------------- rostro ---------------- */
function _ojos(c,hy,lk,pose){
  const ic=OPT.ojosC[c.ojosC]||OPT.ojosC[0], y=hy+1;
  const cerrado=x=>`<path d="M${x-2.6},${y} q2.6,1.8 5.2,0" stroke="${OUT}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;
  const feliz=x=>`<path d="M${x-2.8},${y+1.2} q2.8,-4 5.6,0" stroke="${OUT}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const vivo=(x,lid,lash)=>{ let o=`<ellipse cx="${x}" cy="${y}" rx="3.1" ry="3.7" fill="#fff" stroke="${OUT}" stroke-width=".9"/>`
      +`<circle cx="${x+lk*.25}" cy="${y+.4}" r="2.35" fill="${ic}"/><circle cx="${x+lk*.25}" cy="${y+.5}" r="1.15" fill="#14141c"/>`
      +`<circle cx="${x-.8+lk*.25}" cy="${y-.6}" r=".85" fill="#fff"/><circle cx="${x+.9+lk*.25}" cy="${y+1.4}" r=".4" fill="#fff"/>`;
    if(lid) o+=`<path d="M${x-3.3},${y-.6} Q${x},${y-4.6} ${x+3.3},${y-.6} Q${x},${y-2} ${x-3.3},${y-.6}Z" fill="${OPT.skin[c.skin]}" stroke="${OUT}" stroke-width="1.1"/>`;
    if(lash){ const s=x<0?-1:1; o+=`<path d="M${x-3.2},${y-1.4} Q${x},${y-5} ${x+3.2},${y-1.4}" stroke="${OUT}" stroke-width="1.5" fill="none"/><path d="M${x+s*2.6},${y-3} l${s*1.8},-1.4 M${x+s*3.3},${y-1.6} l${s*1.9},-.6" stroke="${OUT}" stroke-width="1" stroke-linecap="round"/>`; }
    return o; };
  const L=-5+lk, R=5+lk;
  if(pose.blink) return cerrado(L)+cerrado(R);
  if(pose.cele) return feliz(L)+feliz(R);
  switch(c.ojos){
    case 1: return vivo(L)+vivo(R);
    case 2: return feliz(L)+feliz(R);
    case 3: return vivo(L,0,1)+vivo(R,0,1);
    case 4: return vivo(L)+feliz(R);
    case 5: return vivo(L,1)+vivo(R,1);
  }
  return `<ellipse cx="${L}" cy="${y}" rx="2.6" ry="3.2" fill="${OUT}"/><ellipse cx="${R}" cy="${y}" rx="2.6" ry="3.2" fill="${OUT}"/><circle cx="${L+1}" cy="${y-1.3}" r="1" fill="#fff"/><circle cx="${R+1}" cy="${y-1.3}" r="1" fill="#fff"/>`;
}
function _cejas(c,h,hy,lk){
  const s=`stroke="${h}" fill="none" stroke-linecap="round"`;
  switch(c.cejas){
    case 1: return `<path d="M${-8+lk},${hy-6.5} q3,-2.2 5.4,-.5 M${2.6+lk},${hy-7} q3,-1.7 5.4,.5" ${s} stroke-width="2.8"/>`;
    case 2: return `<path d="M${-8.2+lk},${hy-6} Q${-5+lk},${hy-10} ${-2+lk},${hy-7} M${2+lk},${hy-7} Q${5+lk},${hy-10} ${8.2+lk},${hy-6}" ${s} stroke-width="1.7"/>`;
    case 3: return `<path d="M${-8+lk},${hy-8} L${-2.5+lk},${hy-5.6} M${2.5+lk},${hy-5.6} L${8+lk},${hy-8}" ${s} stroke-width="2.1"/>`;
    case 4: return `<path d="M${-8+lk},${hy-8} Q${-5+lk},${hy-11} ${-2.5+lk},${hy-9} M${2.5+lk},${hy-9} Q${5+lk},${hy-11} ${8+lk},${hy-8}" ${s} stroke-width="1.6"/>`;
  }
  return `<path d="M${-8+lk},${hy-6} q3,-2 5,-.5 M${3+lk},${hy-6.5} q3,-1.5 5,.5" ${s} stroke-width="1.6"/>`;
}
function _boca(c,hy,lk,pose){
  const x=lk, y=hy+7, sk=`stroke="${OUT}" stroke-linecap="round" stroke-linejoin="round"`;
  let m=c.boca; if((pose.wave||pose.cele)&&m!==3) m=pose.cele?2:(m===0?-1:m);
  switch(m){
    case -1: return `<path d="M${-4+x},${y} Q${x},${hy+12} ${4+x},${y}" ${sk} stroke-width="1.6" fill="#c0392b"/>`;
    case 1: return `<path d="M${-4.6+x},${y-.6} Q${x},${y+5.6} ${4.6+x},${y-.6}Z" fill="#fff" ${sk} stroke-width="1.4"/><path d="M${-4+x},${y+.4} L${4+x},${y+.4}" stroke="#d6d9e0" stroke-width=".6"/>`;
    case 2: return `<path d="M${-5+x},${y-1} Q${x},${y+8} ${5+x},${y-1}Z" fill="#8b1e2d" ${sk} stroke-width="1.4"/><path d="M${-2.6+x},${y+3.6} Q${x},${y+1.6} ${2.6+x},${y+3.6} Q${x},${y+6} ${-2.6+x},${y+3.6}Z" fill="#f28b9b"/><path d="M${-4.2+x},${y-.6} L${4.2+x},${y-.6}" stroke="#fff" stroke-width="1.3"/>`;
    case 3: return `<ellipse cx="${x}" cy="${y+1.6}" rx="2" ry="2.6" fill="#8b1e2d" ${sk} stroke-width="1.2"/>`;
    case 4: return `<path d="M${-4+x},${y} Q${x},${y+3.4} ${4+x},${y}" ${sk} stroke-width="1.6" fill="none"/><path d="M${.4+x},${y+1.6} q1.8,3.8 3.4,0" fill="#f28b9b" ${sk} stroke-width="1"/>`;
    case 5: return `<path d="M${-3+x},${y+1.2} Q${1.5+x},${y+2.8} ${5+x},${y-.8}" ${sk} stroke-width="1.6" fill="none"/>`;
    case 6: return `<path d="M${-2.8+x},${y+1.2} Q${x},${y+2} ${2.8+x},${y+1.2}" ${sk} stroke-width="1.5" fill="none"/>`;
  }
  return `<path d="M${-4+x},${y} Q${x},${hy+10} ${4+x},${y}" ${sk} stroke-width="1.6" fill="none"/>`;
}
function _barba(b,h,hy,lk,st){
  switch(b){
    case 1: return `<path d="M-15,${hy+3} C-14,${hy+17} 14,${hy+17} 15,${hy+3} C11,${hy+9} 6,${hy+8} ${4+lk},${hy+7.5} Q${lk},${hy+10.5} ${-4+lk},${hy+7.5} C-6,${hy+8} -11,${hy+9} -15,${hy+3}Z" fill="${h}" opacity=".35"/>`;
    case 2: return `<path d="M-15,${hy+2} C-14,${hy+18} 14,${hy+18} 15,${hy+2} C11,${hy+10} 6,${hy+9} ${4+lk},${hy+8} Q${lk},${hy+11} ${-4+lk},${hy+8} C-6,${hy+9} -11,${hy+10} -15,${hy+2}Z" fill="${h}" ${st}/>`;
    case 3: return `<path d="M${-5+lk},${hy+5.5} q2.5,-2 5,0 q2.5,-2 5,0 q-2.5,2.2 -5,.6 q-2.5,1.6 -5,-.6z" fill="${h}" stroke="${OUT}" stroke-width=".8"/>`;
    case 4: return `<path d="M${-5+lk},${hy+5.5} q2.5,-2 5,0 q2.5,-2 5,0 q-2.5,2.2 -5,.6 q-2.5,1.6 -5,-.6z" fill="${h}" stroke="${OUT}" stroke-width=".8"/><path d="M${-2.6+lk},${hy+11.2} Q${lk},${hy+16.5} ${2.6+lk},${hy+11.2} Q${lk},${hy+12.6} ${-2.6+lk},${hy+11.2}Z" fill="${h}" stroke="${OUT}" stroke-width=".8"/>`;
  }
  return '';
}
function _marcas(c,s,hy,lk){
  let o=''; const m=c.marcas;
  o+= m.includes(2) ? `<circle cx="${-10+lk}" cy="${hy+5}" r="3.3" fill="#f26b6b" opacity=".55"/><circle cx="${10+lk}" cy="${hy+5}" r="3.3" fill="#f26b6b" opacity=".55"/>`
                    : `<circle cx="${-10+lk}" cy="${hy+5}" r="2.6" fill="#f28b82" opacity=".45"/><circle cx="${10+lk}" cy="${hy+5}" r="2.6" fill="#f28b82" opacity=".45"/>`;
  if(m.includes(4)) o+=`<path d="M${-12+lk},${hy-3} c3,-3 7,-1 6,3 c-1,3 -5,4 -7,1 c-1,-1.5 -.5,-3 1,-4z" fill="#fbeee6" opacity=".9"/><path d="M${3+lk},${hy+11} c3,-1 6,1 5,3.5 c-2,1.5 -5,1 -6,-1z" fill="#fbeee6" opacity=".9"/>`;
  if(m.includes(0)){ const d=_sh(s,.62); [[-11,3],[-9,4.6],[-12.2,5.6],[-9.6,6.6],[11,3],[9,4.6],[12.2,5.6],[9.6,6.6]].forEach(([x,y])=>o+=`<circle cx="${x+lk}" cy="${hy+y}" r=".55" fill="${d}"/>`); }
  if(m.includes(1)) o+=`<circle cx="${7.5+lk}" cy="${hy+9.5}" r=".85" fill="#3b2418"/>`;
  if(m.includes(3)){ const d=_sh(s,.7); o+=`<path d="M${-11.5+lk},${hy-.5} l-2,-1.2 M${-11.6+lk},${hy+1.5} l-2.1,.3 M${11.5+lk},${hy-.5} l2,-1.2 M${11.6+lk},${hy+1.5} l2.1,.3 M-5,${hy-11.5} q5,-1.6 10,0 M${-6+lk},${hy+5} q-1.2,2.4 .2,4 M${6+lk},${hy+5} q1.2,2.4 -.2,4" stroke="${d}" stroke-width=".8" fill="none" stroke-linecap="round"/>`; }
  return o;
}
function _nariz(c,s,hy,lk){
  if(c.nariz===1) return `<path d="M${-1.2+lk},${hy+4.2} Q${lk},${hy+5.4} ${1.2+lk},${hy+4.2}" stroke="${_sh(s,.62)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  if(c.nariz===2) return `<ellipse cx="${lk}" cy="${hy+4}" rx="1.7" ry="1.25" fill="${_sh(s,.82)}"/><circle cx="${-.5+lk}" cy="${hy+3.5}" r=".45" fill="#fff" opacity=".6"/>`;
  return '';
}
function _cabColor(c,def){ return c.cabC!=null?PAL[c.cabC]:def; }

/* ================= AVATAR =================
   pose: { ph: fase de caminata (rad), walk:0..1, dir:'f'|'b', flip:bool, wave:0..1, blink:bool, look:0..1, cele:0..1 } */
function avatarPose(cfg,pose){
  pose=pose||{};
  const c=avatarNormal(cfg), s=OPT.skin[c.skin]||OPT.skin[1], h=OPT.hairC[c.hairC]||OPT.hairC[0];
  const top=PAL[c.top]||PAL[2], bot=PAL[c.bot]||PAL[5], shoe=OPT.shoe[c.shoe]||OPT.shoe[1];
  const R=c.ropa, A=c.abajo, sit=c.silla, back=pose.dir==='b';
  const k=[.86,1,1.2][c.cuerpo]||1, W=14*k, legX=5.5*k, legW=c.cuerpo===2?10:c.cuerpo===0?8:9;
  const w=sit?0:(pose.walk||0), sw=Math.sin(pose.ph||0)*w;
  const cl=pose.cele?Math.abs(Math.sin(pose.cele*Math.PI*3)):0;
  const bob=Math.abs(Math.cos(pose.ph||0))*2.2*w + (sit?cl*2:cl*7);
  const legA=sw*14, armA=-sw*22+(sit?Math.sin(pose.ph||0)*(pose.walk||0)*10:0);
  const vestido=R===10, falda=!vestido&&A===3, desnuda=vestido||falda, corto=A===4&&!vestido;
  const coat=R===3, sleeve=coat?'#f4f6fa':R===8?'#f4f6fa':top, longS=[1,2,3,5,6,8].includes(R);
  const st=`stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"`;
  const metal='#cbd5e1', socket='#475569';
  const P10=n=>PAL[(n)%10];
  let o=`<ellipse cx="0" cy="1" rx="${(sit?20:15)-bob*.6}" ry="4.5" fill="#000" opacity=".2"/>`;
  const MS=c.mst||null;
  if(MS&&MS.aura) o+=`<circle cx="0" cy="-48" r="48" fill="#f2b705" opacity=".18"/><circle cx="0" cy="-48" r="36" fill="#ffe066" opacity=".16"/>`;
  o+=`<g transform="translate(0,${-bob}) ${pose.flip?'scale(-1,1)':''}">`;
  if(MS&&MS.capa&&!back) o+=`<path d="M-13,-57 Q0,-61 13,-57 L22,-8 Q0,0 -22,-8Z" fill="${MS.capa===1?'#d4a017':'#173d7a'}" stroke="${OUT}" stroke-width="1.4"/>`;
  /* silla de ruedas: partes de atrás */
  const fr=PAL[c.sillaC!=null?c.sillaC:0];
  if(sit){
    o+=`<g ${st}><path d="M${-W+1},-47 L${-W-1},-62 M${W-1},-47 L${W+1},-62" stroke="${socket}" stroke-width="2.4" fill="none"/><rect x="${-W-3}" y="-64" width="4" height="4" rx="1.5" fill="#1b2333"/><rect x="${W-1}" y="-64" width="4" height="4" rx="1.5" fill="#1b2333"/></g>`;
    o+=`<path d="M${-W+2},-28 L-9,-4 M${W-2},-28 L9,-4" stroke="${fr}" stroke-width="2.2" stroke-linecap="round"/>`;
    o+=`<circle cx="-9" cy="-1.6" r="2.4" fill="#1b2333"/><circle cx="9" cy="-1.6" r="2.4" fill="#1b2333"/><rect x="-12" y="-5.5" width="24" height="3.2" rx="1.4" fill="${fr}" ${st}/>`;
    o+=`<rect x="${-W-1}" y="-34" width="${2*W+2}" height="6" rx="2.5" fill="#334155" ${st}/>`;
  }
  if(c.extra.includes(3)&&back) o+=`<rect x="-12" y="-58" width="24" height="26" rx="6" fill="${P10(c.top+5)}" stroke="${OUT}" stroke-width="1.6"/><rect x="-8" y="-46" width="16" height="9" rx="3" fill="${_sh(P10(c.top+5),.8)}"/>`;
  /* piernas */
  const pierna=(x,a)=>{
    const izq=x<0, pp=izq&&c.prot===1, fill=desnuda?s:bot;
    let g='';
    if(sit){
      g+=`<rect x="${x-legW/2}" y="-32" width="${legW}" height="10" rx="4" fill="${fill}" ${st}/>`;
      if(pp) g+=`<rect x="${x-legW/2+.5}" y="-25" width="${legW-1}" height="6" rx="2" fill="${socket}" ${st}/><rect x="${x-1.4}" y="-20" width="2.8" height="11" fill="${metal}" ${st}/>`;
      else g+=`<rect x="${x-legW/2+.5}" y="-25" width="${legW-1}" height="17" rx="4" fill="${corto?s:fill}" ${st}/>`;
      return `<g transform="translate(0,-4)">${g}${_zapato(x,shoe,st)}</g>`;
    }
    if(pp){ g+=`<rect x="${x-legW/2}" y="-31" width="${legW}" height="15" rx="4" fill="${corto?s:fill}" ${st}/>`;
      if(corto) g+=`<rect x="${x-legW/2}" y="-31" width="${legW}" height="11" rx="4" fill="${bot}" ${st}/>`;
      g+=`<rect x="${x-legW/2+.5}" y="-18.5" width="${legW-1}" height="5" rx="2" fill="${socket}" ${st}/><rect x="${x-1.4}" y="-14" width="2.8" height="9" fill="${metal}" ${st}/>`; }
    else { g+=`<rect x="${x-legW/2}" y="-31" width="${legW}" height="26" rx="4" fill="${corto?s:fill}" ${st}/>`;
      if(corto) g+=`<rect x="${x-legW/2}" y="-31" width="${legW}" height="12" rx="4" fill="${bot}" ${st}/>`;
      if(A===2&&!desnuda) g+=`<rect x="${x+legW/2-2.5}" y="-29" width="1.6" height="22" fill="#fff" opacity=".8"/>`;
      if(A===0&&!desnuda) g+=`<path d="M${x+legW/2-2.6},-29 v21" stroke="${_sh(bot,1.5)}" stroke-width=".8" stroke-dasharray="1.6 1.4" opacity=".75"/>`; }
    return `<g transform="translate(0,${-Math.max(0,(x<0?1:-1)*sw)*3.5}) rotate(${a} ${x} -30)">${g}${_zapato(x,shoe,st)}</g>`;
  };
  /* brazo */
  const brazo=(x,a,lado)=>{
    const pb=lado<0&&c.prot===2, sl=longS?18:9;
    let g=`<g transform="rotate(${a} ${x} -50)">`;
    if(pb){ g+=`<rect x="${x-4}" y="-51" width="8" height="${longS?16:12}" rx="4" fill="${s}" ${st}/><rect x="${x-1.5}" y="-38" width="3" height="8" fill="${metal}" ${st}/><rect x="${x-3.6}" y="-${longS?37:40}" width="7.2" height="4" rx="1.5" fill="${socket}" ${st}/><circle cx="${x}" cy="-29" r="3.8" fill="#64748b" ${st}/><path d="M${x-2},-27 v2 M${x},-26.6 v2.2 M${x+2},-27 v2" stroke="${OUT}" stroke-width=".9"/>`;
      g+=`<rect x="${x-4}" y="-51" width="8" height="${sl}" rx="4" fill="${sleeve}" ${st}/>`; }
    else { g+=`<rect x="${x-4}" y="-51" width="8" height="21" rx="4" fill="${s}" ${st}/><rect x="${x-4}" y="-51" width="8" height="${sl}" rx="4" fill="${sleeve}" ${st}/>`;
      if(R===7) g+=`<rect x="${x-4}" y="${-51+sl-2.4}" width="8" height="2.4" fill="#f2b705"/>`;
      g+=`<circle cx="${x}" cy="-29" r="4" fill="${s}" ${st}/>`;
      if(c.extra.includes(0)&&lado<0) g+=`<rect x="${x-4.5}" y="-35" width="9" height="3.5" rx="1" fill="#1b2333"/>`; }
    return g+'</g>';
  };
  const waveA=pose.wave?-150+Math.sin(pose.wave*Math.PI*6)*22:null;
  const celeA=pose.cele?155+Math.sin(pose.cele*Math.PI*6)*12:null;
  const aL=celeA!=null?celeA:(waveA!=null&&!back?waveA:armA), aR=celeA!=null?-celeA:-armA;
  const armL=brazo(-W,aL,-1), armR=brazo(W,aR,1);
  if(back) o+=armL+armR;
  o+=pierna(-legX,legA)+pierna(legX,-legA);
  /* tronco y ropa (se ensancha con la contextura) */
  let t=`<g transform="scale(${k},1)">`;
  const ss=`stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;
  if(vestido) t+=`<path d="M-13,-36 L13,-36 L${sit?16:18},${sit?-21:-17} L${sit?-16:-18},${sit?-21:-17}Z" fill="${top}" ${ss}/>`;
  else if(falda) t+= sit?`<path d="M-13,-35 L13,-35 L15,-24 L-15,-24Z" fill="${bot}" ${ss}/>`:`<path d="M-13,-36 L13,-36 L16,-20 L-16,-20Z" fill="${bot}" ${ss}/>`;
  const base=R===8?'#f4f6fa':top;
  t+=`<path d="M-14,-56 Q-15,-40 -13,-30 L13,-30 Q15,-40 14,-56 Q0,-61 -14,-56Z" fill="${base}" ${ss}/>`;
  t+=`<path d="M4,-58 Q14,-56 14,-56 Q15,-40 13,-30 L6,-30 Q8,-44 4,-58Z" fill="${_sh(base==='#f4f6fa'?'#dfe5ee':top,.82)}"/>`;
  if(R===4){ t+= back?`<path d="M-9,-57 L9,-38 M9,-57 L-9,-38" stroke="${bot}" stroke-width="2.8" vector-effect="non-scaling-stroke"/><rect x="-13" y="-38" width="26" height="8" fill="${bot}" ${ss}/>`
      :`<path d="M-9,-49 h18 v19 h-18z" fill="${bot}" ${ss}/><path d="M-8,-49 L-10.5,-57.5 M8,-49 L10.5,-57.5" stroke="${bot}" stroke-width="2.8" vector-effect="non-scaling-stroke" stroke-linecap="round"/><circle cx="-6" cy="-47" r="1.1" fill="#f2c200"/><circle cx="6" cy="-47" r="1.1" fill="#f2c200"/><rect x="-4" y="-44" width="8" height="5" rx="1" fill="${_sh(bot,.85)}"/>`; }
  if(R===8){ t+= back?`<path d="M-14,-56 Q-15,-40 -13,-30 L13,-30 Q15,-40 14,-56 Q0,-61 -14,-56Z" fill="${top}" ${ss}/>`
      :`<path d="M-14,-56 Q-15,-40 -13,-30 L13,-30 Q15,-40 14,-56 L6,-58 L0,-45 L-6,-58Z" fill="${top}" ${ss}/><path d="M-13,-33 L13,-33" stroke="${_sh(top,.75)}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`; }
  if(coat) t+=`<path d="M-15,-56 Q-16,-38 -15,-24 L-2,-24 L-2,-58 Q-9,-59 -15,-56Z M15,-56 Q16,-38 15,-24 L2,-24 L2,-58 Q9,-59 15,-56Z" fill="#f4f6fa" ${ss}/>`;
  if(c.extra.includes(2)){
    if(back) t+=`<path d="M-15,-57 Q-16,-40 -14,-30 L14,-30 Q16,-40 15,-57 Q0,-61 -15,-57Z" fill="#ff7a1a" ${ss}/><text x="0" y="-46" text-anchor="middle" style="font-size:6.2px;font-weight:900;fill:#fff">STAFF</text><path d="M-14.6,-37 L14.6,-37" stroke="#e8f04a" stroke-width="2.6"/>`;
    else t+=`<path d="M-15,-57 Q-16,-40 -14,-30 L-3,-30 L-3,-50 L-8,-58Z M15,-57 Q16,-40 14,-30 L3,-30 L3,-50 L8,-58Z" fill="#ff7a1a" ${ss}/><path d="M-14.6,-37 L-3.6,-37 M3.6,-37 L14.6,-37" stroke="#e8f04a" stroke-width="2.6"/>`;
  }
  if(back){
    if(R===7&&!c.extra.includes(2)) t+=`<text x="0" y="-38" text-anchor="middle" style="font-size:11px;font-weight:900;fill:#f2b705;stroke:${OUT};stroke-width:.5px">23</text><text x="0" y="-50" text-anchor="middle" style="font-size:4.2px;font-weight:900;fill:#fff">STEM</text>`;
    if(R===6) t+=`<path d="M-10,-58 Q0,-47 10,-58 Q8,-63 0,-63 Q-8,-63 -10,-58Z" fill="${_sh(top,.85)}" ${ss}/>`;
  } else {
    if(R===1) t+=`<path d="M-5,-58 L0,-51 L5,-58" fill="#fff" ${ss}/><path d="M0,-51 L-2,-47 L0,-38 L2,-47Z" fill="${bot}" stroke="${OUT}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    if(R===9) t+=`<path d="M-7,-58.5 Q-7,-52 0,-54.5 Q7,-52 7,-58.5 Q0,-56 -7,-58.5Z" fill="#fff" ${ss}/>`;
    if(R===8) t+=`<path d="M-5,-58 L-1.5,-53 L0,-55 L1.5,-53 L5,-58" fill="#fff" ${ss}/>`;
    if(R===2) t+=`<line x1="0" y1="-56" x2="0" y2="-31" stroke="${_sh(top,.6)}" stroke-width="1.4"/>`;
    if(R===5) t+=`<path d="M-4,-58 L-4,-30 L4,-30 L4,-58 Q0,-55 -4,-58Z" fill="#f4f6fa" ${ss}/><path d="M-4,-58 L-7,-49 L-4,-45 M4,-58 L7,-49 L4,-45" fill="none" stroke="${_sh(top,.55)}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;
    if(R===6) t+=`<path d="M-7,-40 h14 l2,8 h-18z" fill="${_sh(top,.88)}" ${ss}/><path d="M-11,-57 Q0,-52 11,-57 Q11,-62 0,-62 Q-11,-62 -11,-57Z" fill="${_sh(top,.8)}" ${ss}/><path d="M-3,-56 v8 M3,-56 v8" stroke="#fff" stroke-width="1"/>`;
    if(R===7) t+=`<path d="M-5,-58 L0,-52 L5,-58" fill="none" stroke="#f2b705" stroke-width="2"/><path d="M-13.6,-52 L-12.6,-31 M13.6,-52 L12.6,-31" stroke="#f2b705" stroke-width="1.6"/><text x="0" y="-41" text-anchor="middle" style="font-size:5.4px;font-weight:900;fill:#fff;letter-spacing:.2px">STEM</text><path d="M-2.6,-38.5 h5.2 l-1,2.4 h-3.2z" fill="#f2b705"/>`;
    if(vestido) t+=`<path d="M-12,-36 L12,-36" stroke="${_sh(top,.6)}" stroke-width="1.6"/><circle cx="0" cy="-36" r="1.6" fill="#fff" ${ss}/>`;
    if(c.extra.includes(1)) t+=`<path d="M-5,-58 L0,-44 L5,-58" fill="none" stroke="#e5484d" stroke-width="1.4"/><rect x="-5" y="-45" width="10" height="11" rx="1.5" fill="#fff" ${ss}/><rect x="-3.4" y="-43.5" width="6.8" height="3" fill="#2f6fde"/>`;
    if(c.extra.includes(3)) t+=`<path d="M-9,-57 L-10,-34 M9,-57 L10,-34" stroke="${P10(c.top+5)}" stroke-width="3.2" stroke-linecap="round"/>`;
    if(c.extra.includes(4)) t+=`<path d="M-11,-58 Q0,-53 11,-58 L11,-54 Q0,-49 -11,-54Z" fill="#e5484d" ${ss}/><rect x="4" y="-55" width="5" height="14" rx="2" fill="#e5484d" ${ss}/>`;
    if(MS&&MS.ins) t+=`<g transform="translate(-8,-47)"><circle r="5.6" fill="#173d7a" stroke="#f2b705" stroke-width="1.4"/><path d="M0,-3.4 L1,-1 L3.4,-1 L1.5,.6 L2.2,3 L0,1.6 L-2.2,3 L-1.5,.6 L-3.4,-1 L-1,-1Z" fill="#f2b705"/></g>`;
  }
  if(sit&&back) t+=`<rect x="-15" y="-52" width="30" height="22" rx="3" fill="#334155" ${ss}/>`;
  o+=t+'</g>';
  /* ruedas de la silla */
  if(sit){ [-1,1].forEach(d=>{ const x=d*(W+6.5); o+=`<ellipse cx="${x}" cy="-15" rx="5" ry="15" fill="#1b2333" ${st}/><ellipse cx="${x}" cy="-15" rx="2.6" ry="11.5" fill="#94a3b8"/><ellipse cx="${x-d*2.6}" cy="-15" rx="1.3" ry="13" fill="none" stroke="${fr}" stroke-width="1.6"/><circle cx="${x}" cy="-15" r="1.6" fill="${fr}"/>`; }); }
  if(!back) o+=armR+armL;
  if(MS&&MS.mano===1&&!back) o+=`<g transform="translate(19,-32) rotate(8)"><rect x="-7" y="-10" width="14" height="19" rx="2.5" fill="#173d7a" stroke="${OUT}" stroke-width="1.2"/><rect x="-5" y="-8" width="10" height="13" rx="1" fill="#bfe1ff"/><path d="M-3,-4 h6 M-3,-1 h6 M-3,2 h4" stroke="#173d7a" stroke-width="1"/></g>`;
  if(MS&&MS.mano===2&&!back) o+=`<g transform="translate(20,-34) rotate(-15)"><path d="M-4,-4 L8,-10 L8,10 L-4,4Z" fill="#f2b705" stroke="${OUT}" stroke-width="1.2"/><rect x="-8" y="-4" width="5" height="8" rx="1" fill="#e5484d" stroke="${OUT}" stroke-width="1.2"/></g>`;
  /* cabeza */
  const hy=-74, hiyab=c.head===7, turb=c.head===8, tapa=hiyab||turb, calvo=c.pelo===4;
  const cc=_cabColor(c,null);
  const gHiy=cc||P10(c.top+4), gTur=cc||P10(c.top+3);
  if(hiyab) o+=`<path d="M-21,${hy-6} C-23,${hy-30} 23,${hy-30} 21,${hy-6} C22,${hy+10} 24,${hy+18} 20,${hy+24} Q0,${hy+31} -20,${hy+24} C-24,${hy+18} -22,${hy+10} -21,${hy-6}Z" fill="${gHiy}" ${st}/>`;
  if(!tapa&&!back) o+=_peloAtras(c.pelo,h,hy,st);
  if(!hiyab){ o+=`<rect x="-4" y="${hy+14}" width="8" height="6" fill="${s}"/>`;
    o+=`<g ${st} fill="${s}"><circle cx="-16.6" cy="${hy+2}" r="3.8"/><circle cx="16.6" cy="${hy+2}" r="3.8"/></g><path d="M-17.4,${hy+.6} q1.6,1.4 0,3 M17.4,${hy+.6} q-1.6,1.4 0,3" stroke="${_sh(s,.72)}" stroke-width="1" fill="none"/>`;
    if(c.audif) o+=`<path d="M18,${hy-4.4} q5.4,1 3.4,9 q-1.4,2 -3.2,.8 q2.2,-5 -.2,-9.8z" fill="#14b8a6" stroke="${OUT}" stroke-width="1"/><circle cx="20.4" cy="${hy+4.2}" r="1" fill="#fff"/>`; }
  o+=`<circle cx="0" cy="${hy}" r="17" fill="${s}" ${st}/>`;
  o+=`<path d="M8,${hy-12} A17,17 0 0 1 8,${hy+12} A20,20 0 0 0 8,${hy-12}Z" fill="${_sh(s,.88)}"/>`;
  if(back){
    if(!tapa&&!calvo){ o+=_capNuca(h,hy,st); if(AV_LARGO.includes(c.pelo)) o+=_peloAtras(c.pelo,h,hy,st); }
    if(hiyab) o+=`<path d="M-21,${hy-6} C-23,${hy-30} 23,${hy-30} 21,${hy-6} C22,${hy+10} 24,${hy+18} 20,${hy+24} Q0,${hy+31} -20,${hy+24} C-24,${hy+18} -22,${hy+10} -21,${hy-6}Z" fill="${gHiy}" ${st}/>`;
  } else {
    const lk=(pose.look||0)*3;
    o+=_marcas(c,s,hy,lk)+_ojos(c,hy,lk,pose)+_nariz(c,s,hy,lk);
    o+=_barba(c.barba,h,hy,lk,st)+_boca(c,hy,lk,pose);
    o+=_cejas(c,c.pelo===4&&c.hairC===0?_sh(h,1.4):h,hy,lk);
    if(!tapa) o+=_peloFrente(c.pelo,h,hy,st);
    if(hiyab) o+=`<path fill-rule="evenodd" d="M0,${hy-24} C13,${hy-24} 21,${hy-13} 21,${hy} C21,${hy+12} 14,${hy+21} 0,${hy+22} C-14,${hy+21} -21,${hy+12} -21,${hy} C-21,${hy-13} -13,${hy-24} 0,${hy-24}Z M0,${hy-12.5} C9,${hy-12.5} 13.8,${hy-6} 13.8,${hy+3} C13.8,${hy+11} 8,${hy+16.5} 0,${hy+16.5} C-8,${hy+16.5} -13.8,${hy+11} -13.8,${hy+3} C-13.8,${hy-6} -9,${hy-12.5} 0,${hy-12.5}Z" fill="${gHiy}" ${st}/><path d="M-16,${hy-12} Q0,${hy-21} 16,${hy-12}" stroke="${_sh(gHiy,.78)}" stroke-width="1.1" fill="none"/>`;
    if(c.face===1) o+=`<g fill="none" stroke="${OUT}" stroke-width="1.5"><circle cx="${-5+lk}" cy="${hy+1}" r="4.6"/><circle cx="${5+lk}" cy="${hy+1}" r="4.6"/><line x1="${-.4+lk}" y1="${hy+1}" x2="${.4+lk}" y2="${hy+1}"/></g>`;
    if(c.face===6) o+=`<g fill="#fff" fill-opacity=".18" stroke="${P10(c.top+4)}" stroke-width="1.9"><rect x="${-10+lk}" y="${hy-3.4}" width="9" height="8.4" rx="3"/><rect x="${1+lk}" y="${hy-3.4}" width="9" height="8.4" rx="3"/></g><path d="M${-1+lk},${hy} h2" stroke="${P10(c.top+4)}" stroke-width="1.6"/>`;
    if(c.face===2) o+=`<rect x="${-12.5+lk}" y="${hy-4}" width="25" height="10" rx="5" fill="#bde3ff" fill-opacity=".55" stroke="${OUT}" stroke-width="1.6"/>`;
    if(calvo&&!tapa) o+=`<path d="M-8,${hy-13} q5,-3 10,-2" stroke="#fff" stroke-width="2" opacity=".55" fill="none" stroke-linecap="round"/>`;
    if(c.face===5) o+=`<g><rect x="${-11+lk}" y="${hy-3}" width="9" height="7" rx="3" fill="#1b2333"/><rect x="${2+lk}" y="${hy-3}" width="9" height="7" rx="3" fill="#1b2333"/><line x1="${-2+lk}" y1="${hy}" x2="${2+lk}" y2="${hy}" stroke="#1b2333" stroke-width="1.5"/><path d="M${-9+lk},${hy-1.6} l2,-.8" stroke="#fff" stroke-width=".8" opacity=".7"/></g>`;
  }
  if(turb) o+=`<path d="M-18.5,${hy-2} C-22,${hy-20} -10,${hy-32} 0,${hy-31} C10,${hy-32} 22,${hy-20} 18.5,${hy-2} C12,${hy-9} -12,${hy-9} -18.5,${hy-2}Z" fill="${gTur}" ${st}/><path d="M-16,${hy-8} C-8,${hy-21} 8,${hy-25} 15,${hy-14} M-11,${hy-25} C0,${hy-18} 10,${hy-14} 17,${hy-7}" stroke="${_sh(gTur,.7)}" stroke-width="1.2" fill="none"/>${back?'':`<path d="M-4,${hy-8.5} L0,${hy-14} L4,${hy-8.5}" stroke="${_sh(gTur,.6)}" stroke-width="1.2" fill="none"/>`}`;
  if(c.head===1){ const g=cc||P10(c.top+3); o+=`<path d="M-18,${hy-5} C-18,${hy-26} 18,${hy-26} 18,${hy-5}Z" fill="${g}" ${st}/>${back?'':`<path d="M10,${hy-7} L28,${hy-6} C28,${hy-2} 14,${hy-3} 10,${hy-4}Z" fill="${_sh(g,.8)}" ${st}/>`}`; }
  if(c.head===2) o+=`<path d="M-19,${hy-5} C-19,${hy-30} 19,${hy-30} 19,${hy-5}Z" fill="${cc||'#f2c200'}" ${st}/><rect x="-21" y="${hy-7}" width="42" height="5" rx="2.5" fill="${cc||'#f2c200'}" ${st}/>`;
  if(c.head===4) o+=`<ellipse cx="0" cy="${hy-10}" rx="27" ry="5.5" fill="${cc||'#c8a165'}" ${st}/><path d="M-15,${hy-11} C-15,${hy-30} 15,${hy-30} 15,${hy-11}Z" fill="${cc||'#c8a165'}" ${st}/><rect x="-15" y="${hy-16}" width="30" height="4" fill="${PAL[c.top]}"/>`;
  if(c.head===5){ const g=cc||P10(c.top+2); o+=`<path d="M-18,${hy-6} C-18,${hy-28} 18,${hy-28} 18,${hy-6}Z" fill="${g}" ${st}/><rect x="-19" y="${hy-9}" width="38" height="6" rx="3" fill="${_sh(g,.8)}" ${st}/><circle cx="0" cy="${hy-27}" r="4.5" fill="#fff" ${st}/>`; }
  if(c.head===6) o+=`<path d="M-17,${hy-6} C-15,${hy-20} 15,${hy-20} 17,${hy-6}" fill="none" stroke="${cc||P10(c.top+4)}" stroke-width="3.4" stroke-linecap="round"/>`;
  if(c.head===9){ const g=cc||P10(c.top+4); o+=`<path d="M-17.8,${hy-4} C-19,${hy-26} 19,${hy-26} 17.8,${hy-4} C10,${hy-10} -10,${hy-10} -17.8,${hy-4}Z" fill="${g}" ${st}/><g fill="#fff" opacity=".8"><circle cx="-8" cy="${hy-15}" r="1"/><circle cx="0" cy="${hy-18}" r="1"/><circle cx="8" cy="${hy-15}" r="1"/><circle cx="-3" cy="${hy-11}" r="1"/><circle cx="5" cy="${hy-11}" r="1"/></g><path d="M16,${hy-7} l7,-4 l-1,6z M16,${hy-6} l6,4 l-7,1z" fill="${g}" ${st}/>`; }
  if(c.head===10){ const g=cc||'#173d7a', y=calvo?hy-15:hy-19; o+=`<path d="M-8,${y+1} C-7,${y-6} 7,${y-6} 8,${y+1} Q0,${y-1} -8,${y+1}Z" fill="${g}" ${st}/>`; }
  if(MS&&MS.cab===1) o+=`<path d="M-13,${hy-15} L-13,${hy-25} L-6,${hy-19} L0,${hy-28} L6,${hy-19} L13,${hy-25} L13,${hy-15}Z" fill="#f2b705" ${st}/><circle cx="0" cy="${hy-20}" r="2" fill="#e5484d"/>`;
  if(MS&&MS.cab===2) o+=`<path d="M-17,${hy-3} C-17,${hy-26} 17,${hy-26} 17,${hy-3}" fill="none" stroke="#173d7a" stroke-width="3.2"/><rect x="-22" y="${hy-8}" width="8" height="14" rx="4" fill="#f2b705" ${st}/><path d="M-18,${hy+6} Q-14,${hy+14} -4,${hy+12}" stroke="#173d7a" stroke-width="1.8" fill="none"/><circle cx="-4" cy="${hy+12}" r="2.2" fill="#173d7a"/>`;
  if(c.head===3) o+=`<path d="M-17,${hy-3} C-17,${hy-26} 17,${hy-26} 17,${hy-3}" fill="none" stroke="#1b2333" stroke-width="3.2"/><rect x="-22" y="${hy-8}" width="8" height="14" rx="4" fill="${cc||PAL[c.top]}" ${st}/><rect x="14" y="${hy-8}" width="8" height="14" rx="4" fill="${cc||PAL[c.top]}" ${st}/>`;
  o+='</g>';
  return o;
}
function _zapato(x,shoe,st){ return `<path d="M${x-5.5},-6 h11 a3.5,3.5 0 0 1 3.5,3.5 v1 a2,2 0 0 1 -2,2 h-13 a2,2 0 0 1 -2,-2 v-1 a3.5,3.5 0 0 1 3.5,-3.5z" fill="${shoe}" ${st}/><path d="M${x-6.5},-1.4 h13" stroke="#fff" stroke-width="1" opacity=".55"/>`; }

function avatarSVG(c){ return avatarPose(c,{}); }

/* ---------------- fondos ---------------- */
let _avFid=0;
function avatarFondo(cfg,x,y,w,h){
  const c=avatarNormal(cfg), f=c.fondo|0; if(!f) return '';
  const id='avf'+(++_avFid), R=`x="${x}" y="${y}" width="${w}" height="${h}"`, gr=(a,b)=>`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect ${R} fill="url(#${id})"/>`;
  const X=t=>x+w*t, Y=t=>y+h*t; let o='';
  switch(f){
    case 1: o=gr('#7cc4ff','#dff1ff')+`<g fill="#fff" opacity=".9"><ellipse cx="${X(.22)}" cy="${Y(.2)}" rx="${w*.12}" ry="${h*.035}"/><ellipse cx="${X(.3)}" cy="${Y(.17)}" rx="${w*.08}" ry="${h*.04}"/><ellipse cx="${X(.78)}" cy="${Y(.32)}" rx="${w*.1}" ry="${h*.03}"/></g><rect x="${x}" y="${Y(.9)}" width="${w}" height="${h*.1}" fill="#8fd38a"/>`; break;
    case 2: o=gr('#ff9a5a','#ffd38a')+`<circle cx="${X(.75)}" cy="${Y(.42)}" r="${w*.16}" fill="#fff3c4" opacity=".85"/><path d="M${x},${Y(.9)} Q${X(.3)},${Y(.8)} ${X(.6)},${Y(.88)} T${x+w},${Y(.84)} V${y+h} H${x}Z" fill="#b5563a" opacity=".55"/>`; break;
    case 3: { o=gr('#e9f2ff','#cfe0f7'); let g=''; for(let i=1;i<8;i++) g+=`<path d="M${X(i/8)},${y} V${y+h} M${x},${Y(i/8)} H${x+w}" />`; o+=`<g stroke="#a9c3e8" stroke-width=".5" opacity=".8">${g}</g><g transform="translate(${X(.8)},${Y(.22)})"><path d="M-3,-6 h6 M-2,-6 v5 l-4,8 h12 l-4,-8 v-5" fill="#bdf0d6" stroke="#5b7aa8" stroke-width=".9"/></g><g transform="translate(${X(.18)},${Y(.3)})" fill="none" stroke="#5b7aa8" stroke-width=".8"><ellipse rx="7" ry="2.6"/><ellipse rx="7" ry="2.6" transform="rotate(60)"/><ellipse rx="7" ry="2.6" transform="rotate(-60)"/><circle r="1.4" fill="#2f6fde"/></g>`; break; }
    case 4: { o=gr('#0b1238','#2a1b5c'); let g=''; for(let i=0;i<22;i++){ const a=(i*97.3)%1, b=(i*61.7%100)/100; g+=`<circle cx="${X((i*0.137+a*.3)%1)}" cy="${Y(b)}" r="${(i%3?.45:.8)}"/>`; } o+=`<g fill="#fff">${g}</g><circle cx="${X(.8)}" cy="${Y(.2)}" r="${w*.07}" fill="#f2a900"/><ellipse cx="${X(.8)}" cy="${Y(.2)}" rx="${w*.12}" ry="${w*.025}" fill="none" stroke="#ffd166" stroke-width=".9"/>`; break; }
    case 5: o=gr('#bfe8c3','#e9f7e3')+`<path d="M${x},${Y(.86)} Q${X(.25)},${Y(.74)} ${X(.5)},${Y(.84)} T${x+w},${Y(.8)} V${y+h} H${x}Z" fill="#4caf6a"/><g fill="#2e8b57"><circle cx="${X(.14)}" cy="${Y(.62)}" r="${w*.1}"/><circle cx="${X(.88)}" cy="${Y(.58)}" r="${w*.12}"/></g><rect x="${X(.13)}" y="${Y(.66)}" width="2" height="${h*.2}" fill="#7a4a24"/><rect x="${X(.87)}" y="${Y(.64)}" width="2.4" height="${h*.2}" fill="#7a4a24"/>`; break;
    case 6: { o=gr('#ffe58a','#f2a900'); let g=''; for(let i=0;i<12;i++){ const a=i*30*Math.PI/180; g+=`<path d="M${X(.5)},${Y(.45)} L${X(.5)+Math.cos(a)*w}, ${Y(.45)+Math.sin(a)*w} L${X(.5)+Math.cos(a+.22)*w},${Y(.45)+Math.sin(a+.22)*w}Z"/>`; } o+=`<g fill="#fff" opacity=".22">${g}</g>`; break; }
    case 7: { o=gr('#0e3b2e','#145a45'); o+=`<g fill="none" stroke="#3ddc97" stroke-width=".8" opacity=".75"><path d="M${x},${Y(.2)} H${X(.25)} L${X(.32)},${Y(.3)} H${X(.5)}"/><path d="M${x+w},${Y(.35)} H${X(.75)} L${X(.68)},${Y(.45)} V${Y(.6)}"/><path d="M${x},${Y(.7)} H${X(.2)} L${X(.28)},${Y(.6)}"/><path d="M${x+w},${Y(.82)} H${X(.8)}"/></g><g fill="#3ddc97"><circle cx="${X(.5)}" cy="${Y(.3)}" r="1.3"/><circle cx="${X(.68)}" cy="${Y(.6)}" r="1.3"/><circle cx="${X(.28)}" cy="${Y(.6)}" r="1.3"/><circle cx="${X(.8)}" cy="${Y(.82)}" r="1.3"/></g>`; break; }
    case 8: { o=gr('#1a1240','#3b1f7a'); let g=''; for(let i=1;i<6;i++) g+=`<path d="M${x},${Y(.62+i*.08)} H${x+w}"/>`; for(let i=-4;i<=4;i++) g+=`<path d="M${X(.5)},${Y(.62)} L${X(.5+i*.3)},${y+h}"/>`;
      o+=`<g stroke="#a78bfa" stroke-width=".5" opacity=".7">${g}</g>`+[[.08,.32,.1,.3],[.2,.4,.08,.22],[.74,.3,.1,.32],[.86,.42,.09,.2]].map(([a,b,c2,d])=>`<rect x="${X(a)}" y="${Y(b)}" width="${w*c2}" height="${h*d}" fill="#2a1c63" stroke="#5ef0ff" stroke-width=".4"/>`).join('')
        +`<g fill="#5ef0ff" opacity=".8" style="font:700 4px monospace"><text x="${X(.06)}" y="${Y(.12)}">&lt;/&gt;</text><text x="${X(.76)}" y="${Y(.16)}">01</text><text x="${X(.4)}" y="${Y(.08)}">{ }</text></g>`; break; }
    case 9: { o=gr('#183d36','#1f4e44'); o+=`<rect x="${x}" y="${Y(.9)}" width="${w}" height="${h*.1}" fill="#8a5a3b"/><g fill="#e8f5ee" opacity=".7" style="font:italic 700 5px Georgia,serif"><text x="${X(.05)}" y="${Y(.12)}">a²+b²=c²</text><text x="${X(.62)}" y="${Y(.22)}">π≈3,14</text><text x="${X(.06)}" y="${Y(.5)}">∑</text><text x="${X(.8)}" y="${Y(.55)}">√2</text><text x="${X(.66)}" y="${Y(.8)}">∞</text></g><circle cx="${X(.2)}" cy="${Y(.3)}" r="${w*.08}" fill="none" stroke="#e8f5ee" stroke-width=".5" opacity=".6"/>`; break; }
    case 10: { o=gr('#d9f99d','#86efac'); o+=`<path d="M${x},${Y(.85)} Q${X(.3)},${Y(.75)} ${X(.6)},${Y(.86)} T${x+w},${Y(.8)} V${y+h} H${x}Z" fill="#15803d"/>`+[[.12,.2],[.85,.28],[.1,.6],[.9,.65]].map(([a,b],i)=>`<ellipse cx="${X(a)}" cy="${Y(b)}" rx="${w*.07}" ry="${w*.035}" fill="#16a34a" transform="rotate(${i*40} ${X(a)} ${Y(b)})"/>`).join('')+`<g transform="translate(${X(.82)},${Y(.12)})" fill="none" stroke="#166534" stroke-width=".7"><ellipse rx="6" ry="2.2"/><ellipse rx="6" ry="2.2" transform="rotate(60)"/><ellipse rx="6" ry="2.2" transform="rotate(-60)"/></g>`; break; }
  }
  return o;
}

/* ---------------- celebración (al ganar puntos) ---------------- */
function avatarCelebrar(cfg,txt,ms){
  ms=ms||2600; const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.75),rgba(255,255,255,0) 70%)';
  d.innerHTML=`<svg viewBox="-60 -125 120 132" style="width:min(62vw,260px);height:auto;overflow:visible"></svg>${txt?`<b style="margin-top:6px;font:900 22px system-ui;color:#173d7a;background:#ffe066;padding:6px 16px;border-radius:20px;box-shadow:0 4px 0 #d4a017">${String(txt).replace(/[<>&]/g,'')}</b>`:''}`;
  document.body.appendChild(d); const sv=d.firstChild, t0=performance.now();
  const conf=[...Array(26)].map((_,i)=>({x:(Math.random()-.5)*20,y:-70,vx:(Math.random()-.5)*2.6,vy:-2-Math.random()*2.4,c:PAL[i%10],r:Math.random()*360}));
  const fr=now=>{ const e=now-t0; if(e>ms){ d.remove(); return; } const p=e/ms;
    let s=(cfg&&cfg.lid&&window.liderSVG)?liderSVG(cfg,cfg.lid,{cele:p},e/1000):avatarPose(cfg,{cele:p});
    conf.forEach(q=>{ q.x+=q.vx; q.y+=q.vy; q.vy+=.09; q.r+=8; s+=`<rect x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}" width="3" height="5" fill="${q.c}" transform="rotate(${q.r} ${q.x.toFixed(1)} ${q.y.toFixed(1)})"/>`; });
    sv.innerHTML=s; d.style.opacity=p>.85?(1-p)/.15:1; requestAnimationFrame(fr); };
  requestAnimationFrame(fr);
}

/* ================= EDITOR =================
   avatarEditor(root, cfg, onChange): arma pestañas y opciones dentro de root
   (necesita .stage con .avPrev, .atabs y .opts). Devuelve el objeto que se va editando.
   root._dib(av,pose,t) opcional: cómo dibujar la vista previa (líder, etc.). */
const AV_TABS=[['cuerpo','🧍 Cuerpo'],['cara','😊 Cara'],['pelo','💇 Pelo'],['ropa','👕 Ropa'],['acc','🎒 Extras'],['fondo','🖼 Fondo']];
const AV_VB={cara:'-23 -98 46 44',cabeza:'-27 -108 54 54',cuerpo:'-29 -66 58 70',todo:'-32 -110 64 116'};
function avatarEditor(root, cfg, onChange){
  const vacio=!cfg||!Object.keys(cfg).length;
  const av=avatarNormal(vacio?AVATAR_NUEVO:cfg);
  const prev=root.querySelector('.avPrev'), tabs=root.querySelector('.atabs'), opts=root.querySelector('.opts');
  const hist=[]; const snap=()=>{ const o={}; for(const k in av) if(k!=='lid'&&k!=='mst') o[k]=Array.isArray(av[k])?[...av[k]]:av[k]; return o; };
  const anim={wave:0,cele:0};
  // barra de acciones
  let bar=root.querySelector('.avbar');
  if(!bar){ bar=document.createElement('div'); bar.className='avbar'; root.querySelector('.stage').after(bar); }
  bar.innerHTML=`<button type="button" data-a="rnd">🎲 Sorpréndeme</button><button type="button" data-a="undo" disabled>↩ Deshacer</button><button type="button" data-a="cele">🎉</button>`;
  const btnUndo=bar.querySelector('[data-a=undo]');
  const cambio=()=>{ btnUndo.disabled=!hist.length; pintar(); onChange(av); };
  const guardaHist=()=>{ hist.push(snap()); if(hist.length>30) hist.shift(); };
  bar.onclick=e=>{ const b=e.target.closest('button'); if(!b) return; const a=b.dataset.a, now=performance.now();
    if(a==='rnd'){ guardaHist(); sorprendeme(); anim.wave=now; cambio(); }
    if(a==='undo'&&hist.length){ const s=hist.pop(); for(const k in s) av[k]=s[k]; cambio(); }
    if(a==='cele'){ anim.cele=now; }
  };
  /* 🎲: cambia peinado, ropa, colores, gestos, accesorios y fondo; nunca el tono de piel, la contextura ni lo de inclusión */
  function sorprendeme(){ const r=n=>Math.floor(Math.random()*n);
    if(av.head!==7&&av.head!==8) av.pelo=r(OPT.pelo.length);
    av.hairC=Math.random()<.8?r(7):r(OPT.hairC.length); av.ropa=r(OPT.ropa.length); av.abajo=r(OPT.abajo.length);
    av.top=r(PAL.length>16?16:PAL.length); do{ av.bot=r(16); }while(av.bot===av.top); av.shoe=r(OPT.shoe.length);
    av.ojos=1+r(5); av.ojosC=r(OPT.ojosC.length); av.cejas=r(5); av.boca=r(OPT.boca.length); av.nariz=r(3);
    { const F=[1,2,3,4,5,7,...fondosExtra()]; av.fondo=F[r(F.length)]; } av.face=[0,0,1,2,5,6][r(6)];
    if(av.head!==7&&av.head!==8&&av.head!==10) av.head=[0,0,1,2,3,4,5,6,9][r(9)];
    av.extra=[0,1,3,4].filter(()=>Math.random()<.35); av.cabC=null; }
  // pestañas y paneles
  tabs.innerHTML=AV_TABS.map((t,i)=>`<span data-t="${t[0]}" class="${i?'':'on'}">${t[1]}</span>`).join('');
  opts.innerHTML=AV_TABS.map((t,i)=>`<div class="pane" data-p="${t[0]}" ${i?'hidden':''}></div>`).join('');
  tabs.querySelectorAll('span').forEach(t=>t.onclick=()=>{
    tabs.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===t));
    opts.querySelectorAll('.pane').forEach(p=>p.hidden=p.dataset.p!==t.dataset.t);
  });
  const thumbs=(key,list,vb,mod,skip)=>`<div class="avthumbs">${list.map((lbl,i)=>skip&&skip.includes(i)?'':`<span class="avt ${av[key]===i?'on':''}" data-k="${key}" data-v="${i}" title="${lbl}"><svg viewBox="${vb}">${vb===AV_VB.todo&&key==='fondo'?avatarFondo({fondo:i},-32,-110,64,116):''}${avatarPose(Object.assign({},av,{[key]:i},mod?mod(i):{}),{})}</svg><i>${lbl}</i></span>`).join('')}</div>`;
  const chips=(key,list,multi,skip)=>`<div class="row">${list.map((l,i)=>skip&&skip.includes(i)?'':`<span class="chip ${multi?(av[key].includes(i)?'on':''):(av[key]===i?'on':'')}" data-k="${key}" data-v="${i}" ${multi?'data-m="1"':''}>${l}</span>`).join('')}</div>`;
  const sws=(key,cols,nulo)=>`<div class="row">${nulo?`<span class="sw auto ${av[key]==null?'on':''}" data-k="${key}" data-v="" title="Automático">A</span>`:''}${cols.map((c,i)=>`<span class="sw ${av[key]===i?'on':''}" style="background:${c}" data-k="${key}" data-v="${i}" aria-label="color ${i+1}"></span>`).join('')}</div>`;
  const op=(t,h)=>`<div class="opt"><h4>${t}</h4>${h}</div>`;
  const P16=PAL.slice(0,16);
  const PANES={
    cuerpo:()=>op('Tono de piel',sws('skin',OPT.skin))+op('Contextura',thumbs('cuerpo',OPT.cuerpo,AV_VB.cuerpo))
      +op('¿Cómo te mueves?',`<div class="row"><span class="chip ${!av.silla?'on':''}" data-k="silla" data-v="0">🚶 Caminando</span><span class="chip ${av.silla?'on':''}" data-k="silla" data-v="1">♿ Silla de ruedas</span></div>`)
      +(av.silla?op('Color de la silla',sws('sillaC',PAL.slice(0,10))):'')
      +op('Prótesis',chips('prot',OPT.prot))+op('Audífono',`<div class="row"><span class="chip ${av.audif?'on':''}" data-k="audif" data-v="${av.audif?0:1}">🦻 Uso audífono</span></div>`),
    cara:()=>op('Ojos',thumbs('ojos',OPT.ojos,AV_VB.cara))+op('Color de ojos <small>(ojos brillantes, con pestañas y decididos)</small>',sws('ojosC',OPT.ojosC))
      +op('Cejas',thumbs('cejas',OPT.cejas,AV_VB.cara))+op('Boca',thumbs('boca',OPT.boca,AV_VB.cara))
      +op('Nariz',chips('nariz',OPT.nariz))+op('Detalles <small>(puedes elegir varios)</small>',chips('marcas',OPT.marcas,true)),
    pelo:()=>(av.head===7||av.head===8?`<p class="sm avnota">Llevas ${av.head===7?'hiyab':'turbante'}: el peinado no se ve. Puedes cambiarlo en 🎒 Extras.</p>`:'')
      +op('Peinado',thumbs('pelo',OPT.pelo,AV_VB.cabeza,()=>({head:0,face:0})))+op('Color del cabello',sws('hairC',OPT.hairC))
      +op('Barba y bigote',thumbs('barba',OPT.barba,AV_VB.cara)),
    ropa:()=>op('Prenda de arriba',thumbs('ropa',OPT.ropa,AV_VB.cuerpo,()=>({extra:[]})))+op('Color',sws('top',P16))
      +(av.ropa===10?'':op('Prenda de abajo',thumbs('abajo',OPT.abajo,AV_VB.cuerpo,()=>({extra:[]})))+op('Color',sws('bot',P16)))
      +op('Zapatos',sws('shoe',OPT.shoe)),
    acc:()=>op('En la cabeza',thumbs('head',OPT.head,AV_VB.cabeza))+(av.head&&av.head!==3?op('Color de lo que llevas en la cabeza',sws('cabC',PAL.slice(0,16),true)):'')
      +op('En la cara',chips('face',OPT.face,false,[3,4]))+op('Otros <small>(puedes elegir varios)</small>',chips('extra',OPT.extra,true,equipo()||av.extra.includes(2)?null:[2])),
    fondo:()=>`<p class="sm avnota">El fondo se ve en tu perfil y en el podio de la Copa STEM.${fondosExtra().length?' Los marcados con ⭐ o 👑 son exclusivos de tu perfil.':''}</p>`+thumbs('fondo',OPT.fondo.map((n,i)=>i===6?'👑 '+n:i>=8?'⭐ '+n:n),AV_VB.todo,null,OPT.fondo.map((_,i)=>i).filter(i=>(i===6||i>=8)&&!fondosExtra().includes(i)))
  };
  const rol=()=>root._rol||'';
  const equipo=()=>['org','master','admin'].includes(rol());
  const fondosExtra=()=>{ const r=[]; if(rol()==='master'||rol()==='admin') r.push(6); if(av.lid) r.push({tec:8,mat:9,cie:10}[av.lid.area]); return r; };
  root._repinta=()=>pintar();
  function pintar(){ opts.querySelectorAll('.pane').forEach(p=>{ const f=PANES[p.dataset.p]; if(f) p.innerHTML=f(); }); }
  opts.addEventListener('click',e=>{
    const el=e.target.closest('[data-k]'); if(!el||!opts.contains(el)||el.closest('#optLid,#optMst')) return;
    const k=el.dataset.k, v=el.dataset.v===''?null:+el.dataset.v; guardaHist();
    if(el.dataset.m){ av[k]=av[k].includes(v)?av[k].filter(x=>x!==v):[...av[k],v]; }
    else if(k==='silla'||k==='audif') av[k]=!!v;
    else { av[k]=v; if(k==='pelo'){ av.gender=[7,8,9,10,11,12,13,14].includes(v)?1:0; } if(k==='ropa'&&v===10) av.abajo=3; }
    cambio();
  });
  // vista previa animada
  const loop=()=>{ if(!root.isConnected) return; const now=performance.now(), t=now/1000;
    const pose={blink:(t%3.4)<.13, look:Math.sin(t*.6)*.2, dir:'f'};
    if(anim.wave&&now-anim.wave<1400) pose.wave=(now-anim.wave)/1400;
    if(anim.cele&&now-anim.cele<1800) pose.cele=(now-anim.cele)/1800;
    if(prev){ const vb=prev.viewBox.baseVal; let fondo='';
      if(vb&&vb.width){ let x=vb.x,y=vb.y,w=vb.width,h=vb.height; const cw=prev.clientWidth,ch=prev.clientHeight;
        if(cw&&ch){ const a=cw/ch; if(a>w/h){ const nw=h*a; x-=(nw-w)/2; w=nw; } else { const nh=w/a; y-=(nh-h)/2; h=nh; } }
        fondo=avatarFondo(av,x,y,w,h); }
      prev.innerHTML=fondo+(root._dib?root._dib(av,pose,t):avatarPose(av,pose)); }
    setTimeout(()=>requestAnimationFrame(loop),33); };
  pintar(); onChange(av); anim.wave=performance.now(); loop();
  return av;
}
