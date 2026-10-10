/* =====================================================================
   STEAM Day Cafam · Avatar (dibujo SVG y editor)
   ===================================================================== */
const PAL=['#2f6fde','#1f9d6b','#7b4bd6','#f2a900','#e5484d','#1b2333','#ffffff','#8a5a3b','#ec7fb0','#4fb3d9'];
const OPT = {
  gender:['Hombre','Mujer'],
  skin:['#f6d3b3','#e8b48a','#c98b5e','#8d5a3b','#5c3a24'],
  hairH:['Corto','Rapado','Rizado','Peinado de lado'],
  hairM:['Largo','Cola de caballo','Rizado','Melena corta'],
  hairC:['#2b1d14','#6b3e1f','#b5651d','#e3c16f','#7a7f8a','#c0392b'],
  styleH:['Casual','Formal','Deportivo','Bata de laboratorio'],
  styleM:['Casual','Formal','Deportivo','Bata de laboratorio'],
  shoe:['#1b2333','#ffffff','#8a5a3b','#e5484d','#2f6fde'],
  head:['Ninguno','Gorra','Casco de ingeniería','Audífonos'],
  face:['Ninguno','Gafas','Gafas de laboratorio'],
  extra:['Reloj','Escarapela STEAM']
};
const AVATAR_DEF={gender:0,skin:1,hair:0,hairC:0,style:0,top:2,bot:5,shoe:1,head:0,face:2,extra:[1]};
const TOPN={Casual:'Camiseta',Formal:'Camisa',Deportivo:'Buzo','Bata de laboratorio':'Ropa bajo la bata'};
const BOTN={H:{Casual:'Jean',Formal:'Pantalón',Deportivo:'Sudadera','Bata de laboratorio':'Pantalón'},M:{Casual:'Jean',Formal:'Falda',Deportivo:'Sudadera','Bata de laboratorio':'Pantalón'}};

function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;r=Math.round(r*f);g=Math.round(g*f);b=Math.round(b*f);return `rgb(${Math.min(255,r)},${Math.min(255,g)},${Math.min(255,b)})`;}

/* Avatar v2 (estilo chibi con contorno). avatarSVG = postura quieta de frente.
   avatarPose(c, {ph, walk, dir:'f'|'b', flip, wave, blink, look}) para animarlo. */
const _sh=(hex,f)=>shade(hex,f);
const OUT='#2b2b3a';

/* ================= AVATAR MEJORADO =================
   pose: { ph: fase de caminata (rad), walk:0..1, dir:'f'|'b', flip:bool, wave:0..1, blink:bool, look:0..1 } */
function avatarPose(cfg,pose){
  pose=pose||{};
  const c=avatarNormal(cfg), M=c.gender===1, s=OPT.skin[c.skin], h=OPT.hairC[c.hairC];
  const style=(M?OPT.styleM:OPT.styleH)[c.style], top=PAL[c.top], bot=PAL[c.bot], shoe=OPT.shoe[c.shoe];
  const w=pose.walk||0, sw=Math.sin(pose.ph||0)*w, bob=Math.abs(Math.cos(pose.ph||0))*2.2*w;
  const back=pose.dir==='b', legA=sw*14, armA=-sw*22, skirt=M&&style==='Formal';
  const coat=style==='Bata de laboratorio', sleeve=coat?'#f4f6fa':top, longS=style!=='Casual';
  const st=`stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"`;
  let o=`<ellipse cx="0" cy="1" rx="${15-bob}" ry="4.5" fill="#000" opacity=".2"/>`;
  o+=`<g transform="translate(0,${-bob}) ${pose.flip?'scale(-1,1)':''}">`;
  // piernas (giran desde la cadera)
  const leg=(x,a,front)=>`<g transform="translate(0,${-Math.max(0,(x<0?1:-1)*sw)*3.5}) rotate(${a} ${x} -30)">
      <rect x="${x-4.5}" y="-31" width="9" height="${skirt?24:26}" rx="4" fill="${skirt?s:bot}" ${st}/>
      ${style==='Deportivo'&&!skirt?`<rect x="${x+2}" y="-29" width="1.6" height="22" fill="#fff" opacity=".8"/>`:''}
      <path d="M${x-5.5},-6 h11 a3.5,3.5 0 0 1 3.5,3.5 v1 a2,2 0 0 1 -2,2 h-13 a2,2 0 0 1 -2,-2 v-1 a3.5,3.5 0 0 1 3.5,-3.5z" fill="${shoe}" ${st}/></g>`;
  // brazo (gira desde el hombro)
  const arm=(x,a,lado)=>`<g transform="rotate(${a} ${x} -50)">
      <rect x="${x-4}" y="-51" width="8" height="21" rx="4" fill="${s}" ${st}/>
      <rect x="${x-4}" y="-51" width="8" height="${longS?18:9}" rx="4" fill="${sleeve}" ${st}/>
      <circle cx="${x}" cy="-29" r="4" fill="${s}" ${st}/>
      ${c.extra.includes(0)&&lado<0?`<rect x="${x-4.5}" y="-35" width="9" height="3.5" rx="1" fill="#1b2333"/>`:''}</g>`;
  const waveA=pose.wave?-150+Math.sin(pose.wave*Math.PI*6)*22:null;
  const armL=arm(-14, waveA!=null&&!back?waveA:armA,-1), armR=arm(14,-armA,1);
  if(back){ o+=armL+armR; }
  o+=leg(-5.5,legA,1)+leg(5.5,-legA,1);
  if(skirt) o+=`<path d="M-13,-36 L13,-36 L16,-20 L-16,-20Z" fill="${bot}" ${st}/>`;
  // torso con volumen (dos tonos)
  o+=`<path d="M-14,-56 Q-15,-40 -13,-30 L13,-30 Q15,-40 14,-56 Q0,-61 -14,-56Z" fill="${top}" ${st}/>`;
  o+=`<path d="M4,-58 Q14,-56 14,-56 Q15,-40 13,-30 L6,-30 Q8,-44 4,-58Z" fill="${_sh(top,.82)}"/>`;
  if(coat) o+=`<path d="M-15,-56 Q-16,-38 -15,-24 L-2,-24 L-2,-58 Q-9,-59 -15,-56Z M15,-56 Q16,-38 15,-24 L2,-24 L2,-58 Q9,-59 15,-56Z" fill="#f4f6fa" ${st}/>`;
  if(!back){
    if(style==='Formal') o+=`<path d="M-5,-58 L0,-51 L5,-58" fill="#fff" ${st}/>${!M?`<path d="M0,-51 L-2,-47 L0,-38 L2,-47Z" fill="${bot}" stroke="${OUT}" stroke-width="1"/>`:''}`;
    if(style==='Deportivo') o+=`<line x1="0" y1="-56" x2="0" y2="-31" stroke="${_sh(top,.6)}" stroke-width="1.4"/>`;
    if(c.extra.includes(1)) o+=`<path d="M-5,-58 L0,-44 L5,-58" fill="none" stroke="#e5484d" stroke-width="1.4"/><rect x="-5" y="-45" width="10" height="11" rx="1.5" fill="#fff" ${st}/><rect x="-3.4" y="-43.5" width="6.8" height="3" fill="#2f6fde"/>`;
  }
  if(!back) o+=armR+armL;
  // cabeza grande (chibi)
  const hy=-74;
  if(M&&(c.hair===0||c.hair===3)) o+=`<path d="M-18,${hy-2} C-20,${hy-24} 20,${hy-24} 18,${hy-2} L19,${hy+(c.hair===0?20:12)} C10,${hy+24} -10,${hy+24} -19,${hy+(c.hair===0?20:12)}Z" fill="${h}" ${st}/>`;
  if(M&&c.hair===1) o+=`<path d="M14,${hy-8} C28,${hy-6} 27,${hy+14} 19,${hy+22} C17,${hy+12} 18,${hy+2} 12,${hy-4}Z" fill="${h}" ${st}/>`;
  if(M&&c.hair===2) o+=`<g fill="${h}" ${st}><circle cx="-17" cy="${hy+6}" r="8"/><circle cx="17" cy="${hy+6}" r="8"/></g>`;
  o+=`<rect x="-4" y="${hy+14}" width="8" height="6" fill="${s}"/>`;
  o+=`<circle cx="0" cy="${hy}" r="17" fill="${s}" ${st}/>`;
  o+=`<path d="M8,${hy-12} A17,17 0 0 1 8,${hy+12} A20,20 0 0 0 8,${hy-12}Z" fill="${_sh(s,.88)}"/>`;
  if(back){ // nuca: el cabello cubre la cabeza
    o+=`<path d="M-17.5,${hy+2} C-19,${hy-22} 19,${hy-22} 17.5,${hy+2} C12,${hy+12} -12,${hy+12} -17.5,${hy+2}Z" fill="${h}" ${st}/>`;
  } else {
    // cara
    const bl=pose.blink, lk=(pose.look||0)*3;
    o+= bl? `<path d="M${-7+lk},${hy+1} h5 M${2+lk},${hy+1} h5" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>`
          : `<g><ellipse cx="${-5+lk}" cy="${hy+1}" rx="2.6" ry="3.2" fill="${OUT}"/><ellipse cx="${5+lk}" cy="${hy+1}" rx="2.6" ry="3.2" fill="${OUT}"/><circle cx="${-4+lk}" cy="${hy-.3}" r="1" fill="#fff"/><circle cx="${6+lk}" cy="${hy-.3}" r="1" fill="#fff"/></g>`;
    o+=`<path d="M${-8+lk},${hy-6} q3,-2 5,-.5 M${3+lk},${hy-6.5} q3,-1.5 5,.5" stroke="${_sh(h,1)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    o+=`<path d="M${-4+lk},${hy+7} Q${lk},${hy+(pose.wave?12:10)} ${4+lk},${hy+7}" stroke="${OUT}" stroke-width="1.6" fill="${pose.wave?'#c0392b':'none'}" stroke-linecap="round"/>`;
    o+=`<circle cx="${-10+lk}" cy="${hy+5}" r="2.6" fill="#f28b82" opacity=".5"/><circle cx="${10+lk}" cy="${hy+5}" r="2.6" fill="#f28b82" opacity=".5"/>`;
    // cabello frontal
    if(!M){
      if(c.hair===0) o+=`<path d="M-17,${hy-2} C-19,${hy-24} 19,${hy-24} 17,${hy-2} C13,${hy-12} 0,${hy-14} -7,${hy-12} C-12,${hy-10} -15,${hy-7} -17,${hy-2}Z" fill="${h}" ${st}/>`;
      if(c.hair===1) o+=`<path d="M-16.5,${hy-5} C-16,${hy-20} 16,${hy-20} 16.5,${hy-5} C11,${hy-11} -11,${hy-11} -16.5,${hy-5}Z" fill="${h}" opacity=".85" ${st}/>`;
      if(c.hair===2) o+=`<g fill="${h}" ${st}><circle cx="-12" cy="${hy-12}" r="7"/><circle cx="-3" cy="${hy-18}" r="7.5"/><circle cx="6" cy="${hy-18}" r="7.5"/><circle cx="13" cy="${hy-11}" r="7"/></g>`;
      if(c.hair===3) o+=`<path d="M-17,${hy-1} C-20,${hy-26} 20,${hy-26} 17,${hy-1} C15,${hy-9} 8,${hy-13} -3,${hy-14} C-10,${hy-12} -15,${hy-8} -17,${hy-1}Z" fill="${h}" ${st}/>`;
    } else {
      if(c.hair===0||c.hair===3) o+=`<path d="M-18,${hy+1} C-20,${hy-25} 20,${hy-25} 18,${hy+1} C15,${hy-9} 5,${hy-14} -4,${hy-13} C-11,${hy-12} -16,${hy-7} -18,${hy+1}Z" fill="${h}" ${st}/>`;
      if(c.hair===1) o+=`<path d="M-17.5,${hy-2} C-19,${hy-25} 19,${hy-25} 17.5,${hy-2} C12,${hy-13} -10,${hy-14} -17.5,${hy-2}Z" fill="${h}" ${st}/><circle cx="14" cy="${hy-10}" r="3" fill="#e5484d"/>`;
      if(c.hair===2) o+=`<g fill="${h}" ${st}><circle cx="-12" cy="${hy-13}" r="7.5"/><circle cx="-3" cy="${hy-19}" r="8"/><circle cx="7" cy="${hy-19}" r="8"/><circle cx="14" cy="${hy-12}" r="7.5"/></g>`;
    }
    if(c.face===1) o+=`<g fill="none" stroke="${OUT}" stroke-width="1.5"><circle cx="${-5+lk}" cy="${hy+1}" r="4.6"/><circle cx="${5+lk}" cy="${hy+1}" r="4.6"/><line x1="${-.4+lk}" y1="${hy+1}" x2="${.4+lk}" y2="${hy+1}"/></g>`;
    if(c.face===2) o+=`<rect x="${-12.5+lk}" y="${hy-4}" width="25" height="10" rx="5" fill="#bde3ff" fill-opacity=".55" stroke="${OUT}" stroke-width="1.6"/>`;
  }
  if(c.head===1){ const g=PAL[(c.top+3)%PAL.length]; o+=`<path d="M-18,${hy-5} C-18,${hy-26} 18,${hy-26} 18,${hy-5}Z" fill="${g}" ${st}/>${back?'':`<path d="M10,${hy-7} L28,${hy-6} C28,${hy-2} 14,${hy-3} 10,${hy-4}Z" fill="${_sh(g,.8)}" ${st}/>`}`; }
  if(c.head===2) o+=`<path d="M-19,${hy-5} C-19,${hy-30} 19,${hy-30} 19,${hy-5}Z" fill="#f2c200" ${st}/><rect x="-21" y="${hy-7}" width="42" height="5" rx="2.5" fill="#f2c200" ${st}/>`;
  if(c.head===3) o+=`<path d="M-17,${hy-3} C-17,${hy-26} 17,${hy-26} 17,${hy-3}" fill="none" stroke="#1b2333" stroke-width="3.2"/><rect x="-22" y="${hy-8}" width="8" height="14" rx="4" fill="${PAL[c.top]}" ${st}/><rect x="14" y="${hy-8}" width="8" height="14" rx="4" fill="${PAL[c.top]}" ${st}/>`;
  o+='</g>';
  return o;
}


function avatarSVG(c){ return avatarPose(c,{}); }

function avatarNormal(c){ const a=Object.assign({},AVATAR_DEF,c||{}); if(!Array.isArray(a.extra)) a.extra=[]; return a; }

/* Editor: monta las opciones dentro de un contenedor.
   ids esperados: optGender, optSkin, optHair, optHairC, optStyle, optTop, optBot, optShoe, optHead, optFace, optExtra, lblTop, lblBot */
function avatarEditor(root, cfg, onChange){
  const av=avatarNormal(cfg);
  const $=id=>root.querySelector('#'+id);
  function build(){
    const M=av.gender===1, styles=M?OPT.styleM:OPT.styleH, st=styles[av.style];
    $('lblTop').textContent=TOPN[st]+' · color';
    $('lblBot').textContent=BOTN[M?'M':'H'][st]+' · color';
    const mk=(id,list,key,type,multi)=>{
      const el=$(id); el.innerHTML='';
      list.forEach((v,i)=>{
        const b=document.createElement('span'); const on=multi?av[key].includes(i):av[key]===i;
        if(type==='sw'){b.className='sw'+(on?' on':'');b.style.background=v;b.setAttribute('aria-label','color '+(i+1));}
        else{b.className='chip'+(on?' on':'');b.textContent=v;}
        b.onclick=()=>{
          if(multi){av[key]=on?av[key].filter(x=>x!==i):[...av[key],i];}
          else{ if(key==='gender'&&av.gender!==i){av.hair=0;} av[key]=i;}
          build(); onChange(av);};
        el.appendChild(b);
      });
    };
    mk('optGender',OPT.gender,'gender','chip'); mk('optSkin',OPT.skin,'skin','sw');
    mk('optHair',M?OPT.hairM:OPT.hairH,'hair','chip'); mk('optHairC',OPT.hairC,'hairC','sw');
    mk('optStyle',styles,'style','chip'); mk('optTop',PAL,'top','sw'); mk('optBot',PAL,'bot','sw'); mk('optShoe',OPT.shoe,'shoe','sw');
    mk('optHead',OPT.head,'head','chip'); mk('optFace',OPT.face,'face','chip'); mk('optExtra',OPT.extra,'extra','chip',true);
  }
  root.querySelectorAll('.atabs span').forEach(t=>t.onclick=()=>{
    root.querySelectorAll('.atabs span').forEach(x=>x.classList.toggle('on',x===t));
    root.querySelectorAll('.pane').forEach(p=>p.hidden=p.dataset.p!==t.dataset.t);
  });
  build(); onChange(av);
  return av;
}
