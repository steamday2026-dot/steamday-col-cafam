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

function avatarSVG(c){
  const M=c.gender===1, s=OPT.skin[c.skin], h=OPT.hairC[c.hairC];
  const style=(M?OPT.styleM:OPT.styleH)[c.style];
  const top=PAL[c.top], bot=PAL[c.bot], shoe=OPT.shoe[c.shoe];
  const ln='#2b3a55';
  const tw=M?12:13;
  let o='<ellipse cx="0" cy="0" rx="17" ry="4" fill="#000" opacity=".18"/>';
  /* cabello trasero */
  let hb='';
  if(M&&c.hair===0) hb=`<path d="M-15,-78 C-17,-96 17,-96 15,-78 L16,-52 C10,-48 -10,-48 -16,-52Z" fill="${h}"/>`;
  if(M&&c.hair===1) hb=`<path d="M12,-84 C24,-82 24,-62 17,-54 C15,-62 16,-72 10,-78Z" fill="${h}"/>`;
  if(M&&c.hair===2) hb=`<g fill="${h}"><circle cx="-14" cy="-70" r="7"/><circle cx="14" cy="-70" r="7"/><circle cx="-13" cy="-60" r="6"/><circle cx="13" cy="-60" r="6"/></g>`;
  if(M&&c.hair===3) hb=`<path d="M-15,-78 C-17,-96 17,-96 15,-78 L15,-63 C10,-61 -10,-61 -15,-63Z" fill="${h}"/>`;
  o+=hb;
  /* zapatos */
  o+=`<ellipse cx="-6" cy="-2.5" rx="6.5" ry="3.2" fill="${shoe}" stroke="${ln}" stroke-width=".8"/><ellipse cx="6" cy="-2.5" rx="6.5" ry="3.2" fill="${shoe}" stroke="${ln}" stroke-width=".8"/>`;
  /* parte inferior */
  const skirt=M&&style==='Formal';
  if(skirt){
    o+=`<rect x="-8" y="-28" width="5" height="25" rx="2.5" fill="${s}"/><rect x="3" y="-28" width="5" height="25" rx="2.5" fill="${s}"/>`;
    o+=`<path d="M-${tw},-38 L${tw},-38 L${tw+4},-20 L-${tw+4},-20Z" fill="${bot}"/>`;
  }else{
    o+=`<rect x="-${tw-2}" y="-38" width="${tw-2.5}" height="35" rx="3" fill="${bot}"/><rect x="0.5" y="-38" width="${tw-2.5}" height="35" rx="3" fill="${bot}"/>`;
    if(style==='Deportivo') o+=`<rect x="-${tw-2}" y="-36" width="1.6" height="32" fill="#fff" opacity=".85"/><rect x="${tw-3.6}" y="-36" width="1.6" height="32" fill="#fff" opacity=".85"/>`;
    if(style==='Casual') o+=`<line x1="-5" y1="-36" x2="-5" y2="-30" stroke="${shade(bot,.7)}" stroke-width="1"/><line x1="5" y1="-36" x2="5" y2="-30" stroke="${shade(bot,.7)}" stroke-width="1"/>`;
  }
  /* brazos */
  const longSleeve=style!=='Casual';
  const armC=style==='Bata de laboratorio'?'#f4f6fa':top;
  o+=`<rect x="-${tw+6}" y="-64" width="6.5" height="26" rx="3.2" fill="${s}"/><rect x="${tw-0.5}" y="-64" width="6.5" height="26" rx="3.2" fill="${s}"/>`;
  o+=`<rect x="-${tw+6}" y="-64" width="6.5" height="${longSleeve?23:10}" rx="3.2" fill="${armC}"/><rect x="${tw-0.5}" y="-64" width="6.5" height="${longSleeve?23:10}" rx="3.2" fill="${armC}"/>`;
  if(style==='Deportivo') o+=`<rect x="-${tw+4}" y="-62" width="1.5" height="20" fill="#fff" opacity=".85"/><rect x="${tw+3}" y="-62" width="1.5" height="20" fill="#fff" opacity=".85"/>`;
  o+=`<circle cx="-${tw+2.8}" cy="-38" r="3.3" fill="${s}"/><circle cx="${tw+2.8}" cy="-38" r="3.3" fill="${s}"/>`;
  if(c.extra.includes(0)) o+=`<rect x="-${tw+6.5}" y="-44" width="7.5" height="3.4" rx="1" fill="#1b2333"/><circle cx="-${tw+2.8}" cy="-42.3" r="1.2" fill="#f2a900"/>`;
  /* torso */
  o+=`<rect x="-${tw}" y="-66" width="${tw*2}" height="${skirt?30:30}" rx="8" fill="${top}"/>`;
  if(style==='Formal'){
    o+=`<path d="M-5,-66 L0,-60 L5,-66Z" fill="#fff"/><path d="M-5,-66 L-1,-59 L-6,-61Z M5,-66 L1,-59 L6,-61Z" fill="#fff" stroke="${shade(top,.8)}" stroke-width=".6"/>`;
    if(!M) o+=`<path d="M0,-60 L-2,-57 L0,-46 L2,-57Z" fill="${shade(bot,1)}" stroke="${ln}" stroke-width=".4"/>`;
    else o+=`<circle cx="0" cy="-55" r=".9" fill="#fff"/><circle cx="0" cy="-50" r=".9" fill="#fff"/><circle cx="0" cy="-45" r=".9" fill="#fff"/>`;
  }
  if(style==='Deportivo') o+=`<path d="M-8,-66 C-8,-72 8,-72 8,-66" fill="none" stroke="${shade(top,.75)}" stroke-width="3"/><line x1="0" y1="-64" x2="0" y2="-38" stroke="${shade(top,.7)}" stroke-width="1.2"/><rect x="-6" y="-48" width="12" height="6" rx="2" fill="${shade(top,.85)}"/>`;
  if(style==='Casual') o+=`<path d="M-4,-66 Q0,-62 4,-66" fill="none" stroke="${shade(top,.7)}" stroke-width="1.2"/>`;
  if(style==='Bata de laboratorio'){
    o+=`<path d="M-${tw+1},-64 Q-${tw+1},-67 -${tw-5},-67 L-3,-67 L-1,-30 L-${tw+2},-26Z" fill="#f4f6fa" stroke="#c9d1df" stroke-width=".8"/>`;
    o+=`<path d="M${tw+1},-64 Q${tw+1},-67 ${tw-5},-67 L3,-67 L1,-30 L${tw+2},-26Z" fill="#f4f6fa" stroke="#c9d1df" stroke-width=".8"/>`;
    o+=`<rect x="${tw-8}" y="-46" width="6" height="5" rx="1" fill="none" stroke="#c9d1df"/><line x1="${tw-6}" y1="-48" x2="${tw-6}" y2="-44" stroke="#2f6fde" stroke-width="1.2"/>`;
  }
  if(c.extra.includes(1)) o+=`<path d="M-5,-66 L0,-50 L5,-66" fill="none" stroke="#e5484d" stroke-width="1.3"/><rect x="-4.5" y="-51" width="9" height="11" rx="1.5" fill="#fff" stroke="${ln}" stroke-width=".6"/><rect x="-3" y="-49.5" width="6" height="3" rx=".5" fill="#2f6fde"/><rect x="-3" y="-45" width="6" height="1" fill="#9aa3b5"/><rect x="-3" y="-43" width="4" height="1" fill="#9aa3b5"/>`;
  /* cuello y cabeza */
  o+=`<rect x="-3.5" y="-71" width="7" height="6" fill="${s}"/>`;
  o+=`<circle cx="0" cy="-80" r="14" fill="${s}"/>`;
  o+=`<circle cx="-14" cy="-79" r="2.6" fill="${s}"/><circle cx="14" cy="-79" r="2.6" fill="${s}"/>`;
  o+=`<circle cx="-5" cy="-80" r="1.9" fill="#1b2333"/><circle cx="5" cy="-80" r="1.9" fill="#1b2333"/>`;
  if(M) o+=`<path d="M-7.5,-82 L-6,-81.3 M7.5,-82 L6,-81.3" stroke="#1b2333" stroke-width="1"/>`;
  o+=`<path d="M-6.5,-85 Q-5,-86.3 -3,-85.5 M6.5,-85 Q5,-86.3 3,-85.5" stroke="${shade(h,1)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  o+=`<path d="M-4,-74 Q0,-71 4,-74" stroke="#1b2333" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  o+=`<circle cx="-9" cy="-75" r="2.3" fill="#f28b82" opacity=".45"/><circle cx="9" cy="-75" r="2.3" fill="#f28b82" opacity=".45"/>`;
  /* cabello frontal */
  let hf='';
  if(!M){
    if(c.hair===0) hf=`<path d="M-14,-81 C-15,-98 15,-98 14,-81 C10,-89 -6,-91 -14,-81Z" fill="${h}"/>`;
    if(c.hair===1) hf=`<path d="M-13.5,-83 C-13,-96 13,-96 13.5,-83 C9,-88 -9,-88 -13.5,-83Z" fill="${h}" opacity=".75"/>`;
    if(c.hair===2) hf=`<g fill="${h}"><circle cx="-11" cy="-87" r="5.5"/><circle cx="-4" cy="-93" r="6"/><circle cx="4" cy="-93" r="6"/><circle cx="11" cy="-87" r="5.5"/><circle cx="-13.5" cy="-81" r="3.5"/><circle cx="13.5" cy="-81" r="3.5"/></g>`;
    if(c.hair===3) hf=`<path d="M-14,-80 C-16,-99 16,-99 14,-80 C12,-86 6,-88 -2,-90 C-8,-88 -12,-86 -14,-80Z" fill="${h}"/><path d="M-2,-90 C4,-96 12,-92 14,-84" fill="none" stroke="${shade(h,1.5)}" stroke-width="1"/>`;
  }else{
    if(c.hair===0||c.hair===3) hf=`<path d="M-15,-78 C-17,-99 17,-99 15,-78 C13,-86 4,-90 -3,-89 C-9,-88 -13,-84 -15,-78Z" fill="${h}"/>`;
    if(c.hair===1) hf=`<path d="M-14.5,-80 C-16,-99 16,-99 14.5,-80 C10,-89 -8,-90 -14.5,-80Z" fill="${h}"/><circle cx="12" cy="-86" r="2.6" fill="#e5484d"/>`;
    if(c.hair===2) hf=`<g fill="${h}"><circle cx="-11" cy="-88" r="6"/><circle cx="-3" cy="-94" r="6.5"/><circle cx="5" cy="-94" r="6.5"/><circle cx="12" cy="-88" r="6"/><circle cx="-14.5" cy="-80" r="4.5"/><circle cx="14.5" cy="-80" r="4.5"/></g>`;
  }
  o+=hf;
  /* cara */
  if(c.face===1) o+=`<g fill="none" stroke="#1b2333" stroke-width="1.4"><circle cx="-5" cy="-80" r="4"/><circle cx="5" cy="-80" r="4"/><line x1="-1" y1="-80" x2="1" y2="-80"/></g>`;
  if(c.face===2) o+=`<rect x="-11.5" y="-84" width="23" height="8.5" rx="4" fill="#bde3ff" fill-opacity=".55" stroke="#2b3a55" stroke-width="1.6"/><line x1="-14" y1="-80" x2="-11.5" y2="-80" stroke="#2b3a55" stroke-width="1.6"/><line x1="11.5" y1="-80" x2="14" y2="-80" stroke="#2b3a55" stroke-width="1.6"/>`;
  /* cabeza */
  if(c.head===1){const g=PAL[(c.top+3)%PAL.length];o+=`<path d="M-15,-84 C-15,-101 15,-101 15,-84Z" fill="${g}"/><path d="M11,-85 L27,-84 C27,-80 14,-81 11,-82Z" fill="${shade(g,.8)}"/><circle cx="0" cy="-99" r="1.6" fill="${shade(g,.8)}"/>`;}
  if(c.head===2) o+=`<path d="M-16,-84 C-16,-104 16,-104 16,-84Z" fill="#f2c200" stroke="#c99a00" stroke-width="1.2"/><rect x="-18.5" y="-86" width="37" height="4.5" rx="2" fill="#f2c200" stroke="#c99a00"/><rect x="-2" y="-101" width="4" height="15" fill="#c99a00"/>`;
  if(c.head===3) o+=`<path d="M-15,-82 C-15,-102 15,-102 15,-82" fill="none" stroke="#1b2333" stroke-width="3"/><rect x="-19" y="-86" width="7" height="12" rx="3.5" fill="${PAL[c.top]}" stroke="#1b2333" stroke-width="1"/><rect x="12" y="-86" width="7" height="12" rx="3.5" fill="${PAL[c.top]}" stroke="#1b2333" stroke-width="1"/>`;
  return o;
}

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
