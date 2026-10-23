/* =====================================================================
   STEM Day Cafam · Aplicación principal
   Roles: admin · master (coordinadores y Rectora) · docente (director de curso / codirector)
   ===================================================================== */
const CFG = window.STEAM_CONFIG;
const $ = id => document.getElementById(id);
const S = {
  sb:null, user:null, perfil:null, config:null, prog:[], avisos:[],
  modo:'docente',            // docente | master
  cursos:[], curso:null,     // docente
  area:'tec', nivel:'Primaria', masterIdx:0,   // master
  stops:[], mapa:null, vista:'mapa', panel:'ruta',
  avTmp:null, timer:null, hSel:null
};

/* ---------------- utilidades ---------------- */
function toast(msg, tipo, ms){ const t=$('toast'); t.textContent=msg; t.className='toast on '+(tipo||''); clearTimeout(t._h); t._h=setTimeout(()=>t.className='toast',ms||2800); }
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==id); $('loading').hidden=true; }
const toMin = h => { const [a,b]=String(h).split(':').map(Number); return a*60+b; };
const hhmm = h => String(h).slice(0,5);
const cap = t => t ? t.charAt(0)+t.slice(1).toLowerCase() : t;
const titA = t => window.tituloA ? window.tituloA(t) : cap(t);
const firstName = n => { const p=String(n||'').trim().split(/\s+/); return p.length>=3 ? p[2] : p[p.length-1]||''; };
const LS = { get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
             set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} } };
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

/* Hora de Bogotá (UTC-5, sin horario de verano). ?simular=2026-10-23T09:15 permite probar. */
let _simSS=null; try{ _simSS=sessionStorage.getItem('steam_sim'); }catch(e){}
const _sim = new URLSearchParams(location.search).get('simular') || _simSS;   // también el «Modo ensayo» (Alertas → Más)
const _simBase = _sim ? { t0: Date.now(), d: new Date(_sim+':00Z') } : null;
function ahora(){
  let d;
  if(_simBase && !isNaN(_simBase.d)) d=new Date(_simBase.d.getTime()+(Date.now()-_simBase.t0));
  else d=new Date(Date.now()-5*3600e3);
  return { fecha: d.toISOString().slice(0,10), min: d.getUTCHours()*60+d.getUTCMinutes() };
}
function fechaLarga(f){ if(!f) return ''; const d=new Date(f+'T12:00:00Z'); return d.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).replace(/^./,c=>c.toUpperCase()); }

/* ---------------- arranque ---------------- */
async function boot(){
  if(!CFG || /TU_/.test(CFG.SUPABASE_URL+CFG.SUPABASE_ANON_KEY)){
    $('loading').innerHTML='<div style="padding:30px;text-align:center"><b>Falta configurar la app.</b><br><br>Edita el archivo js/config.js con la URL y la llave anon de Supabase.</div>'; return;
  }
  S.sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true } });
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  protegerVista();
  const { data:{ session } } = await S.sb.auth.getSession();
  if(!session) return pantallaLogin();
  S.user=session.user; await continuar();
}

function cuentaRegresiva(){
  const f=(S.config&&S.config.fecha_evento)||'2026-10-23', obj=new Date(f+'T07:00:00-05:00').getTime();
  const pinta=()=>{ if($('s-login').hidden) return clearInterval(S._cd); let d=Math.max(0,obj-Date.now()); if(_simBase) d=Math.max(0,obj-(new Date(ahora().fecha+'T00:00:00-05:00').getTime()+ahora().min*60000));
    $('cdD').textContent=Math.floor(d/864e5); $('cdH').textContent=Math.floor(d%864e5/36e5); $('cdM').textContent=Math.floor(d%36e5/6e4);
    if(d===0){ $('cdown').querySelectorAll('div:not(.lbl)').forEach(x=>x.hidden=true); $('loginFecha').textContent='¡Hoy es el STEM Day!'; } };
  pinta(); clearInterval(S._cd); S._cd=setInterval(pinta,30000);
}
function pantallaLogin(){
  show('s-login'); cuentaRegresiva();
  $('fLogin').onsubmit = async e => {
    e.preventDefault(); $('lErr').textContent=''; $('lBtn').disabled=true; $('lBtn').textContent='Ingresando…';
    const { data, error } = await S.sb.auth.signInWithPassword({ email:$('lCorreo').value.trim().toLowerCase(), password:$('lClave').value });
    $('lBtn').disabled=false; $('lBtn').textContent='Ingresar';
    if(error){ $('lErr').textContent = /invalid/i.test(error.message) ? 'Correo o contraseña incorrectos.' : 'No fue posible ingresar: '+error.message; return; }
    S.user=data.user; $('loading').hidden=false; await continuar();
  };
}

async function cargarPerfil(){
  const { data, error } = await S.sb.from('sd_perfiles').select('*').eq('id',S.user.id).maybeSingle();
  if(error) throw error; S.perfil=data;
}
async function cargarDatos(){
  const [c,p,a] = await Promise.all([
    S.sb.from('sd_config').select('*').eq('id',1).maybeSingle(),
    S.sb.from('sd_programacion').select('*').order('hora_inicio').limit(5000),
    S.sb.from('sd_avisos').select('*').order('creado_en',{ascending:false}).limit(30)
  ]);
  if(p.error) throw p.error;
  S.config=c.data||{fecha_evento:'2026-10-23',anticipacion_min:10};
  S.prog=(p.data||[]).map(r=>({...r, hora_inicio:hhmm(r.hora_inicio), hora_fin:hhmm(r.hora_fin)}));
  if(window.completarProgramacion) window.completarProgramacion(S.prog);   // título/frase/área del Excel (columnas F y G)
  S.avisos=a.data||[];
  await cargarLideres();
}
/* ---------------- v28 · líderes de estación ---------------- */
async function cargarLideres(){
  try{ const r=await S.sb.rpc('sd_lideres_publico'); S.lid={}; (r.data||[]).forEach(l=>S.lid[l.id]=l); }catch(e){ S.lid={}; }
}
/* líderes de una fila de la programación (o de una parada de la ruta) */
function lideresDe(r){ if(!r||r.tipo==='pausa'||!Array.isArray(r.lideres)||!S.lid) return [];
  const area=['tec','mat','cie'].includes(r.categoria||r.cat)?(r.categoria||r.cat):'cie';
  return r.lideres.map(id=>S.lid[id]).filter(Boolean).map(l=>({...l,area})); }
const lidSalKey=i=>{ const f=S.stops[i]; return 'steam_lidsal_'+(S.curso||'')+'_'+(f?f.h:i); };

async function continuar(){
  if(!S.vistaComo){
    try{ await cargarPerfil(); }catch(e){ return errorFatal('No fue posible leer tu perfil. '+e.message); }
    if(!S.perfil){ return errorFatal('Tu cuenta aún no está habilitada para el STEM Day. Escribe al coordinador de Tecnología.', true); }
    if(S.perfil.rol==='admin' && S.perfil.confirmado){ const vc=vistaGuardada(); if(vc) await entrarVista(vc); }
  }
  if(!S.perfil.confirmado) return pantallaClave();
  try{ await cargarDatos(); }catch(e){ return errorFatal('No fue posible cargar la programación. '+e.message); }
  definirModo();
  if(!S.perfil.video_visto) return pantallaVideo();
  if(S.modo==='docente' && !S.perfil.aviso_cursos_visto) return pantallaRol();
  if(!S.perfil.tutorial_visto && tutorialURL()) return pantallaTutorial();
  if(!S.perfil.avatar) return pantallaAvatar();
  if(!S.vistaComo && !LS.get('steam_permiso_'+S.perfil.id,false)) return pantallaPermiso();
  principal();
}
function errorFatal(msg, salir){
  $('loading').hidden=false;
  $('loading').innerHTML=`<div style="padding:30px;text-align:center;max-width:420px"><b>${escHTML(msg)}</b><br><br><button class="b2" id="fx">${salir?'Cerrar sesión':'Reintentar'}</button></div>`;
  $('fx').onclick = async()=>{ if(salir){ await S.sb.auth.signOut(); } location.reload(); };
}
async function guardarPerfil(campos){
  if(S.vistaComo){ Object.assign(S.perfil,campos); avisoVista(); return true; }
  const { error } = await S.sb.from('sd_perfiles').update(campos).eq('id',S.perfil.id);
  if(error){ toast('No se pudo guardar: '+error.message,'bad',4000); return false; }
  Object.assign(S.perfil,campos); return true;
}

/* ---------------- primer ingreso ---------------- */
function pantallaClave(){
  show('s-clave');
  $('fClave').onsubmit = async e => {
    e.preventDefault(); const a=$('c1').value, b=$('c2').value;
    if(a.length<8) return $('cErr').textContent='Usa al menos 8 caracteres.';
    if(a!==b) return $('cErr').textContent='Las contraseñas no coinciden.';
    const { error } = await S.sb.auth.updateUser({ password:a });
    if(error) return $('cErr').textContent='No se pudo cambiar: '+error.message;
    await guardarPerfil({ confirmado:true }); toast('Contraseña actualizada','ok'); continuar();
  };
}
function videoHTML(url){
  if(!url) return '<div class="vempty">El video de bienvenida estará disponible muy pronto.</div>';
  let m=url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);
  if(m) return `<iframe src="https://www.youtube.com/embed/${m[1]}?rel=0&playsinline=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  m=url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if(m) return `<iframe src="https://drive.google.com/file/d/${m[1]}/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  // si existen las dos versiones (…-vertical.mp4 / …-horizontal.mp4), en pantallas anchas se usa la horizontal
  const ancho=window.matchMedia('(orientation: landscape) and (min-width: 900px)').matches;
  if(ancho&&/-vertical\.mp4(\?|$)/i.test(url)){ url=url.replace(/-vertical\.mp4/i,'-horizontal.mp4'); setTimeout(()=>{ const b=$('vBox'); if(b) b.style.aspectRatio='16/9'; },0); }
  else setTimeout(()=>{ const b=$('vBox'); if(b) b.style.aspectRatio=''; },0);
  const alt=/-horizontal\.mp4/i.test(url)?url.replace(/-horizontal\.mp4/i,'-vertical.mp4'):'';
  return `<video src="${escHTML(url)}" data-alt="${escHTML(alt)}" controls playsinline preload="metadata" onerror="videoFallo(this)"></video>`;
}
// Si la versión horizontal no carga, se intenta la vertical; si tampoco, se avisa.
function videoFallo(v){
  if(!v||v.dataset.fallo) return;
  const alt=v.dataset.alt;
  if(alt){ v.dataset.alt=''; v.removeAttribute('src'); v.innerHTML=''; v.src=alt; const b=$('vBox'); if(b) b.style.aspectRatio=''; v.load(); return; }
  v.dataset.fallo='1';
  const b=v.parentNode; if(b) b.innerHTML='<div class="vempty">No se pudo cargar el video. Revisa tu conexión e inténtalo de nuevo más tarde.</div>';
}
function textosVideo(k,t,p){ $('vKick').textContent=k; $('vTit').textContent=t; $('vTxt').textContent=p; }
function pantallaVideo(desdeMenu){
  show('s-video'); textosVideo('Bienvenida','Así se vive el STEM Day 2026','Este video aparece solo la primera vez. Puedes verlo de nuevo desde Alertas → Más.'); $('vBox').innerHTML=videoHTML(S.config.video_url);
  const v=$('vBox').querySelector('video'); if(v) v.onended=()=>$('vSeguir').click();
  const fin=async()=>{ $('vBox').innerHTML=''; if(desdeMenu){ show('s-main'); return; } await guardarPerfil({video_visto:true}); continuar(); };
  $('vSeguir').onclick=fin; $('vSaltar').onclick=fin;
  $('vSaltar').hidden=!!desdeMenu; $('vSeguir').textContent=desdeMenu?'Volver':'Continuar';
}

/* video tutorial (perfil Master): reemplaza la antigua pregunta de experiencia */
/* un tutorial por perfil: docente, organizador y master/administrador */
function tutorialURL(){ const c=S.config||{}; if(S.modo==='docente') return c.video_tutorial_docente||null; if(S.modo==='lider') return c.video_tutorial_lider||null; if(S.modo==='org') return c.video_tutorial_org||null; return c.video_tutorial_url||null; }
function pantallaTutorial(desdeMenu){
  show('s-video'); textosVideo('Tutorial','Así se usa la app STEM Day','Aprende a recorrer el Colegio vivo, entrar a los edificios y ver qué pasa en cada lugar. Puedes verlo de nuevo desde Alertas → Más.');
  $('vBox').innerHTML=tutorialURL()?videoHTML(tutorialURL()):'<div class="vempty">El video tutorial estará disponible muy pronto.</div>';
  const v=$('vBox').querySelector('video'); if(v) v.onended=()=>$('vSeguir').click();
  const fin=async()=>{ $('vBox').innerHTML=''; if(desdeMenu){ show('s-main'); return; } await guardarPerfil({tutorial_visto:true}); continuar(); };
  $('vSeguir').onclick=fin; $('vSaltar').onclick=fin;
  $('vSaltar').hidden=!!desdeMenu; $('vSeguir').textContent=desdeMenu?'Volver':'Continuar';
}

/* ---------------- roles y datos de ruta ---------------- */
function cursosDelExcel(){
  const n=S.perfil.nombre_n, ac=new Set(), ap=new Set();
  S.prog.forEach(r=>{ if(r.tipo!=='actividad') return; if(r.acompanante_n===n) ac.add(r.curso); if(r.apoyo_n===n) ap.add(r.curso); });
  return { acompana:[...ac].sort(), apoya:[...ap].sort() };
}
function definirModo(){
  const rol=S.perfil.rol;
  if(rol==='organizador'){ S.modo='org'; return; }
  if(rol==='secretario'){ S.modo='sec'; S.cursos=[]; return; }   // v30
  if(rol==='lider'){ S.modo='lider'; S.cursos=[]; return; }
  if(rol==='master'||rol==='admin'){ S.modo='master'; S.area=S.perfil.experiencia||'tec'; S.nivel=LS.get('steam_nivel','Primaria'); S.masterIdx=LS.get('steam_midx_'+S.area+S.nivel,0); return; }
  S.modo='docente';
  const ex=cursosDelExcel();
  S.rolDoc=ex; S.cursos = (S.perfil.cursos_manual&&S.perfil.cursos_manual.length) ? [...S.perfil.cursos_manual] : [...ex.acompana,...ex.apoya].slice(0,2);
  if(!S.cursos.includes(S.curso)) S.curso=S.cursos[0]||null;
}
function filaDe(c){ return S.prog.find(r=>r.curso===c&&r.tipo==='actividad'); }
/* v30 · Director de curso / Codirector: aviso si el rol de ese día no es el habitual del docente */
function esOriginal(lista){ const me=nrmN(S.perfil&&S.perfil.nombre); return (lista||[]).some(n=>{ const k=nrmN(n); return k===me||k.startsWith(me)||me.startsWith(k); }); }
function nrmN(t){ return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim(); }
function avisoRolDia(){
  const ex=S.rolDoc, O=(S.config&&S.config.originales)||null; if(!ex||!O) return '';
  const p=[];
  ex.acompana.forEach(c=>{ if(!esOriginal((O[c]||{}).dir)) p.push(`<b>Director de curso de ${escHTML(c)}</b>`); });
  ex.apoya.forEach(c=>{ if(!esOriginal((O[c]||{}).codir)) p.push(`<b>Codirector de ${escHTML(c)}</b>`); });
  if(!p.length) return '';
  return `📌 <b>Tu rol es solo por este día.</b> En el STEM Day estarás como ${p.join(' y ')}. Aunque no sea tu curso habitual (o no tengas este rol en el colegio), ese día cumplirás esta función: acompañar al curso en todas sus actividades, llamar asistencia y estar pendiente del grupo.`;
}
function rutaCurso(c){
  const filas=S.prog.filter(r=>r.curso===c&&r.tipo==='actividad'); if(!filas.length) return [];
  const nv=filas[0].nivel;
  return [...filas,...S.prog.filter(r=>r.tipo==='pausa'&&r.nivel===nv)]
    .sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio))
    .map(r=>({ ...r, h:r.hora_inicio, f:r.hora_fin, cat:r.categoria, nombre: r.tipo==='pausa'?(r.titulo||r.area):(r.titulo?titA(r.titulo):r.area), lugar: r.tipo==='pausa'?r.area:(r.salon||'') }));
}
/* v58 · estudiantes con permiso de salida que apoyan una actividad del STEM Day:
   el director elige el área y el docente líder; al líder y a los Master les aparecen para confirmar */
const AREA_AP={tec:'Tecnología',mat:'Matemáticas',cie:'Ciencias Naturales'};
function opcionesApoyo(){
  const A={}; (S.prog||[]).forEach(r=>{ if(r.tipo!=='actividad'||!Array.isArray(r.lideres)||!r.lideres.length) return;
    const t=AREA_AP[r.categoria]||(/hacer|cambio clim/i.test((r.area||'')+' '+(r.titulo||''))?'Actividad del hacer':null); if(!t) return;
    r.lideres.forEach(id=>{ const l=(S.lid||{})[id]; if(l) (A[t]=A[t]||new Map()).set(id,l.nombre); }); });
  return Object.keys(A).sort((a,b)=>a.localeCompare(b,'es')).map(k=>({area:k,lideres:[...A[k].entries()].map(([id,n])=>({id,n})).sort((a,b)=>a.n.localeCompare(b.n,'es'))}));
}
const AP={lista:[],t:0,ok:true,cargando:null};
async function apoyosCargar(forzar){
  if(!forzar&&Date.now()-AP.t<25000) return AP.lista; if(AP.cargando) return AP.cargando;
  AP.cargando=(async()=>{ try{ const r=await S.sb.rpc('sd_apoyos_lista'); if(r.error){ AP.ok=false; AP.err=r.error.message; } else { AP.ok=true; AP.lista=r.data||[]; } }catch(e){ AP.ok=false; } AP.t=Date.now(); AP.cargando=null; return AP.lista; })();
  return AP.cargando;
}
function apoyosHTML(L,todos){
  if(!L.length) return `<p class="sm">${todos?'Aún no hay estudiantes con permiso de salida para apoyar actividades.':'Por ahora nadie te ha enviado estudiantes de apoyo.'}</p>`;
  const g={}; L.forEach(x=>{ const k=todos?(x.lider_nombre||'Sin líder'):x.area||''; (g[k]=g[k]||[]).push(x); });
  return Object.keys(g).sort((a,b)=>a.localeCompare(b,'es')).map(k=>`${todos||Object.keys(g).length>1?`<h4 class="mygr">${todos?'👤 '+escHTML(k)+' · '+escHTML(g[k][0].area||''):escHTML(k)}</h4>`:''}${g[k].map(x=>`<div class="est"><div class="nm">${escHTML(x.nombre)}<small><b>${escHTML(x.curso)}</b> · lo envió ${escHTML(nomCorto(x.por_nombre||''))}${x.hora_salida?' · '+hDe(minDe(x.hora_salida)):''}</small>
    ${x.ok?`<small style="color:${x.ok==='A'?'#1f9d6b':'#e5484d'}">${x.ok==='A'?'✓ Ya está con su líder':'✗ No llegó'}${x.ok_por?' · '+escHTML(nomCorto(x.ok_por)):''}</small>`:'<small>⚪ Por confirmar</small>'}</div>
    <div class="st s2"><span data-ap="${x.estudiante_id}" data-v="A" class="${x.ok==='A'?'on':''}">✓</span><span data-ap="${x.estudiante_id}" data-v="N" class="${x.ok==='N'?'on':''}">✗</span></div></div>`).join('')}`).join('');
}
function apoyosBind(el,repinta){ el.querySelectorAll('[data-ap]').forEach(b=>b.onclick=async()=>{ if(S.vistaComo) return toast('Vista previa: no se guarda','bad');
  const r=await S.sb.rpc('sd_apoyo_confirmar',{p_est:+b.dataset.ap,p_estado:b.classList.contains('on')?null:b.dataset.v}); if(r.error) return toast(r.error.message,'bad',4000);
  await apoyosCargar(true); toast('Confirmado ✓','ok',1800); repinta(); }); }
/* explicación para los directores que llaman a lista (una vez, y desde «¿Cómo funciona?») */
function ayudaApoyo(forzar){
  const k='steam_apayuda_'+(S.perfil&&S.perfil.id); if(!forzar&&(LS.get(k,false)||S.vistaComo)) return; LS.set(k,true); if(!window.ventana) return;
  ventana({icono:'🚪',kicker:'Llamado a lista de las 7:00 · nuevo',titulo:'Permiso de salida para apoyar el STEM Day',color:'#7b4bd6',tag:'apay',
    html:`<div class="apsteps"><div><b>1</b><span>Si un estudiante sale a apoyar una actividad, márcalo con <b>🚪 Permiso de salida</b>.</span></div>
      <div><b>2</b><span>Elige <b>a qué área apoyará</b> (Ciencias, Matemáticas, Tecnología o Actividad del hacer).</span></div>
      <div><b>3</b><span>Elige <b>con quién estará</b>: el docente líder de esa actividad.</span></div>
      <div><b>4</b><span>Guarda el llamado. Al líder y a los Master les aparece el estudiante para <b>confirmar que llegó</b>.</span></div></div>
      <p class="sm">Si el permiso es por otra razón (cita médica, etc.), elige «Otro motivo» y escríbelo.</p>`,botones:[{t:'Entendido'}]});
}
window.ayudaApoyo=ayudaApoyo;
/* líder de estación: tarjeta debajo de su estación */
async function apoyosLider(el){
  if(!el||!S.perfil) return; let box=el.querySelector('#apLid'); if(!box){ box=document.createElement('div'); box.id='apLid'; box.className='apcard'; el.appendChild(box); }
  const L=(await apoyosCargar()).filter(x=>x.apoyo_lider===S.perfil.id); if(!AP.ok) { box.remove(); return; }
  // aviso cuando le llegan estudiantes nuevos
  try{ const kv='steam_apvistos_'+S.perfil.id, vis=LS.get(kv,[]), nuevos=L.filter(x=>!vis.includes(x.estudiante_id));
    if(nuevos.length&&!S.vistaComo&&window.ventana){ LS.set(kv,[...vis,...nuevos.map(x=>x.estudiante_id)]);
      ventana({icono:'🙋',kicker:'Estudiantes de apoyo',titulo:`Te ${nuevos.length>1?'envían':'envía'} ${nuevos.length} estudiante${nuevos.length>1?'s':''}`,color:'#7b4bd6',tag:'apl',
        html:`<p>${nuevos.slice(0,6).map(x=>`<b>${escHTML(x.nombre)}</b> (${escHTML(x.curso)})`).join(', ')}${nuevos.length>6?'…':''} salieron del llamado de las 7:00 con permiso para estar contigo. Confírmalos cuando lleguen, en <b>Mi estación</b>.</p>`,botones:[{t:'Entendido'}]}); } }catch(_){}
  if(!L.length){ box.innerHTML=`<b>🙋 Estudiantes que te apoyan</b><p class="sm">Si un director de curso le da permiso de salida a un estudiante para apoyarte, aparecerá aquí para que confirmes que llegó.</p>`; return; }
  box.innerHTML=`<b>🙋 Estudiantes que te apoyan (${L.length})</b><p class="sm">Salieron del llamado de las 7:00 con permiso para estar contigo. Confirma cuando lleguen.</p>${apoyosHTML(L,false)}`;
  apoyosBind(box,()=>apoyosLider(el));
}
window.apoyosLider=apoyosLider;
/* Master, Secretaría y coordinación: todos los estudiantes de apoyo */
async function pintarApoyos(){
  const el=$('asisPz'); el.innerHTML='<p class="sm">Cargando…</p>'; const L=await apoyosCargar(true);
  el.innerHTML=`<div class="sub"><a href="#" id="apVol">← Volver a la asistencia</a></div><h3>🙋 Estudiantes de apoyo</h3>
    <div class="sub">Estudiantes de 3.° a 9.° con permiso de salida en el llamado de las 7:00 para apoyar una actividad. Confirma con quién están.</div>
    ${AP.ok?apoyosHTML(L,true):`<div class="warnbox">Falta ejecutar el archivo 32 en Supabase.</div>`}`;
  $('apVol').onclick=e=>{ e.preventDefault(); S.asisVista=null; pintarAsis(); }; apoyosBind(el,pintarApoyos);
}
/* v58 · autocompletar nombres: al escribir aparecen los nombres completos (estudiantes o docentes) */
const nrmA=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function autoLista(inp,items,onPick){
  if(!inp) return; const box=document.createElement('div'); box.className='aclist'; box.hidden=true; inp.insertAdjacentElement('afterend',box); inp.setAttribute('autocomplete','off');
  const idx=items.map(x=>({...x,k:nrmA(x.t+' '+(x.s||''))}));
  const pinta=()=>{ const q=nrmA(inp.value), tk=q.split(' ').filter(Boolean); if(tk.length===0||q.length<2){ box.hidden=true; return; }
    const r=idx.filter(x=>tk.every(t=>x.k.includes(t))).slice(0,8);
    box.innerHTML=r.length?r.map((x,i)=>`<div data-i="${idx.indexOf(x)}"><b>${escHTML(x.t)}</b>${x.s?`<small>${escHTML(x.s)}</small>`:''}</div>`).join(''):'<p>Sin coincidencias. Revisa el nombre o escríbelo completo.</p>';
    box.hidden=false;
    box.querySelectorAll('[data-i]').forEach(d=>d.onmousedown=d.ontouchstart=e=>{ e.preventDefault(); const x=idx[+d.dataset.i]; inp.value=x.t; box.hidden=true; if(onPick) onPick(x); }); };
  inp.addEventListener('input',pinta); inp.addEventListener('focus',pinta); inp.addEventListener('blur',()=>setTimeout(()=>box.hidden=true,150));
}
window.autoLista=autoLista;
/* v57 · desplazamientos entre sedes y descansos */
const pausaTipo=r=>{ const a=String((r&&r.area)||'').toLowerCase(); return a.startsWith('desplaz')?'desp':a.startsWith('descanso')?'desc':a.startsWith('almuerzo')?'alm':'otra'; };
const pausaIco=r=>({desp:'🚶',desc:'☕',alm:'🍽️'}[pausaTipo(r)]||'⏸');
/* ¿hay un desplazamiento, descanso o almuerzo ahora? (niveles: los de la persona; todos=true exige que sea para todos los niveles) */
function pausaAhora(niveles,todos){
  const a=ahora(); if(!S.config||a.fecha!==S.config.fecha_evento) return null;
  const P=S.prog.filter(p=>p.tipo==='pausa'&&toMin(p.hora_inicio)<=a.min&&a.min<toMin(p.hora_fin));
  if(todos){ const nv=[...new Set(S.prog.filter(r=>r.tipo==='actividad').map(r=>r.nivel))]; return nv.length&&nv.every(n=>P.some(p=>p.nivel===n))?P[0]:null; }
  return P.find(p=>!niveles||!niveles.length||niveles.includes(p.nivel))||null;
}
function misNiveles(){ return [...new Set((S.cursos||[]).map(c=>(filaDe(c)||{}).nivel).filter(Boolean))]; }
window.pausaAhora=pausaAhora; window.misNiveles=misNiveles;
/* mensaje para el docente cuando su avatar llega a un desplazamiento o a un descanso */
function mensajePausa(st,i){
  const r=st[i], t=pausaTipo(r), nx=st[i+1], dest=/primaria/i.test(r.area)?'Primaria':/bachillerato/i.test(r.area)?'Bachillerato':'';
  if(t==='desp'){ const aDesc=nx&&pausaTipo(nx)==='desc';
    const texto=aDesc?`Es hora de movilizarnos para que puedan tomar el descanso en las instalaciones respectivas. ${dest==='Primaria'?'Diríjanse con el curso a <b>Primaria</b>; allí tomarán su descanso.':'Suban con el curso a <b>Bachillerato</b>; allí tomarán su descanso.'}`
      :`Es hora de movilizarnos. ${dest==='Primaria'?'Bajen con el curso a <b>Primaria</b>':'Suban con el curso a <b>Bachillerato</b>'}${nx&&nx.tipo==='actividad'?' para '+escHTML(nx.nombre)+(nx.salon?' (salón '+escHTML(nx.salon)+')':''):''}.`;
    const ruta=dest==='Bachillerato'?'rojo':(r.nivel==='Primaria'?'azul':'rojo_inv');
    return {t, titulo:'Es hora de movilizarnos', texto, plano:texto.replace(/<[^>]+>/g,''), ruta, dest}; }
  if(t==='desc'){ const sede=/primaria/i.test(r.titulo||'')?'Primaria':/bachillerato/i.test(r.titulo||'')?'Bachillerato':'';
    const texto=`Disfruten su tiempo de descanso, recuerden estar en las instalaciones del colegio respectivas${sede?' (<b>'+sede+'</b>)':''}.`;
    return {t, titulo:'¡Tiempo de descanso!', texto, plano:texto.replace(/<[^>]+>/g,'')}; }
  return null;
}
window.mensajePausa=mensajePausa;
async function verDesplazamiento(ruta){
  if(ColegioVivo.ocupado()) return; cerrarSheet(); const cv=$('cv'); cv.hidden=false; cv.classList.add('camino'); $('cvVolver').hidden=false;
  ColegioVivo.setDatos(S.prog); ColegioVivo.setAvatar(S.perfil.avatar); await ColegioVivo.desplazamiento(ruta);
}
window.verDesplazamiento=verDesplazamiento;
function avisoPausa(st,i){
  const m=mensajePausa(st,i); if(!m||!window.ventana) return;
  const a=ahora(), k='steam_pz_'+S.perfil.id+'_'+a.fecha+'_'+st[i].nivel+'_'+st[i].h+(typeof _sim!=='undefined'&&_sim?'_ens'+_sim:''); if(LS.get(k,false)) return; LS.set(k,true);
  const p=prefs(); if(p.sonido&&window.sonarTono) sonarTono(p.tono); if(p.vibracion&&navigator.vibrate) navigator.vibrate([250,120,250]);
  ventana({icono:m.t==='desp'?'🚶':'☕',kicker:`${fmtHora(st[i].h)} – ${fmtHora(st[i].f)} · ${escHTML(st[i].nombre)}`,titulo:m.titulo,color:m.t==='desp'?(m.ruta==='azul'?'#2f6fde':'#c2410c'):'#b07a00',tag:'pz',prioridad:true,
    html:`<p>${m.texto}</p>`,botones:m.t==='desp'?[{t:'🗺️ Ver mapa',fn:()=>{ setTimeout(()=>verDesplazamiento(m.ruta),60); }},{t:'Entendido',ghost:true}]:[{t:'Entendido'}]});
}
function lugarDe(salones){
  const s=[...new Set(salones.filter(Boolean))];
  if(!s.length) return 'Por definir';
  if(s.length===1) return s[0];
  if(s.every(x=>/^\d+$/.test(x))){ const n=s.map(Number).sort((a,b)=>a-b); return `Salones ${n[0]}–${n[n.length-1]}`; }
  return 'Aula de cada curso';
}
function rutaMaster(cat,nv){
  const g={};
  S.prog.filter(r=>r.tipo==='actividad'&&r.categoria===cat&&r.nivel===nv).forEach(r=>{ const k=r.hora_inicio+'|'+r.area; (g[k]=g[k]||{...r,filas:[]}).filas.push(r); });
  return Object.values(g).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio)).map(s=>{
    const grados=[...new Set(s.filas.map(f=>f.grado))], cs=s.filas.map(f=>f.curso).sort();
    const cargo=[...new Set(s.filas.map(f=>f.docente_cargo).filter(Boolean))].join(' · ');
    const frase=s.filas.map(f=>f.frase).find(Boolean)||'', titulo=s.filas.map(f=>f.titulo).find(Boolean)||'';
    return { ...s, h:s.hora_inicio, f:s.hora_fin, cat:s.categoria, titulo, frase, docente_cargo:cargo,
      nombre: titulo?titA(titulo):s.area, lugar: lugarDe(s.filas.map(f=>f.salon)), etq: grados.join(', '),
      grupo: `${grados.join(', ')} (${cs.length>1?cs[0]+'–'+cs[cs.length-1]:cs[0]})` };
  });
}

function pantallaRol(){
  show('s-rol'); const b=$('rolBody'); const nom=escHTML(firstName(S.perfil.nombre));
  let h=`<div class="logo"><div class="mark"><i></i><i></i><i></i><i></i></div><div><b>STEM Day</b><small>Colegio Cafam</small></div></div>`;
  if(S.modo==='master'){
    let sel=S.perfil.experiencia||null;
    const pintar=()=>{
      let x=h+`<h2>Hola, ${nom}. ¿Qué experiencia te gustaría presenciar?</h2><p>Verás los lugares y el cronograma de rotaciones del área que elijas. Puedes cambiar de área cuando quieras.</p>`;
      ['mat','cie','tec'].forEach(c=>{ const n=S.prog.filter(r=>r.tipo==='actividad'&&r.categoria===c); const rot=new Set(n.map(r=>r.nivel+r.hora_inicio+r.area)).size;
        x+=`<div class="exp ${sel===c?'on':''}" style="--c:${AREA_C[c]}" data-c="${c}"><div class="ico">${c==='mat'?'∑':c==='cie'?'⚗':'⚙'}</div><div><b>${AREA_N[c]}</b><small>${rot} rotaciones · ${new Set(n.map(r=>r.curso)).size} cursos participan</small></div></div>`; });
      x+=`<div class="bottom"><button class="btn" id="rolOk" ${sel?'':'disabled'}>Continuar: crear mi avatar</button></div>`;
      b.innerHTML=x;
      b.querySelectorAll('.exp').forEach(e=>e.onclick=()=>{ sel=e.dataset.c; pintar(); });
      $('rolOk').onclick=async()=>{ if(await guardarPerfil({experiencia:sel})){ S.area=sel; continuar(); } };
    };
    pintar(); return;
  }
  const ex=S.rolDoc;
  if(ex.acompana.length){ const f=filaDe(ex.acompana[0]);
    h+=`<h2>Hola, ${nom}. Este es tu rol en el STEM Day</h2><div class="cc"><span class="sm">Director de curso</span><div class="big">${escHTML(ex.acompana.join(', '))}</div><div class="r"><span>Codirector:</span> ${escHTML(f&&f.apoyo||'—')}</div></div><p>Estarás con tu curso durante toda la jornada. La app te avisará antes de cada actividad.</p>`; }
  if(ex.apoya.length){
    if(!ex.acompana.length) h+=`<h2>Hola, ${nom}. Este es tu rol en el STEM Day</h2>`;
    h+=`<p>Estarás como <b>codirector</b> en ${ex.apoya.length===1?'este curso':'estos dos cursos'}:</p>`;
    ex.apoya.forEach(c=>{ const f=filaDe(c); h+=`<div class="cc"><div class="big">${escHTML(c)}</div><div class="r"><span>Director de curso:</span> ${escHTML(f&&f.acompanante||'—')}</div></div>`; });
    if(ex.apoya.length>1) h+=`<p>En el mapa podrás cambiar entre los dos cursos y recibirás los avisos de ambos.</p>`;
  }
  { const av=avisoRolDia(); if(av) h+=`<div class="rolnote">${av}</div>`; }
  if(!ex.acompana.length && !ex.apoya.length)
    h+=`<h2>Hola, ${nom}</h2><div class="alertbox" style="margin:0">No encontramos tu nombre en la programación del STEM Day.</div><p>Después de crear tu avatar podrás elegir tu grado y curso con el botón <b>?</b> que está arriba a la derecha del mapa.</p>`;
  else h+=`<p class="sm">¿Algo no está bien? Usa el botón <b>?</b> arriba a la derecha del mapa para elegir tu grado y curso.</p>`;
  h+=`<div class="bottom"><button class="btn" id="rolOk">Entendido: crear mi avatar</button></div>`;
  b.innerHTML=h; $('rolOk').onclick=async()=>{ if(await guardarPerfil({aviso_cursos_visto:true})) continuar(); };
}

function montarEditor(contId){
  ['avFirst','avMain'].forEach(id=>{ if(id!==contId) $(id).innerHTML=''; });
  const c=$(contId); c.innerHTML=''; c.appendChild($('tplAvatar').content.cloneNode(true));
  const prev=c.querySelector('.avPrev');
  const esLid=S.perfil.rol==='lider';
  if(esLid){ prev.setAttribute('viewBox','-54 -128 108 142'); }
  const dib=av=>esLid&&av.lid?liderSVG(av,av.lid,{},performance.now()/1000):avatarSVG(av);
  c._rol=S.perfil.rol; c._dib=(av,pose,t)=>esLid&&av.lid?liderSVG(av,av.lid,pose,t):avatarPose(av,pose);   // v38: vista previa animada
  S.avTmp=avatarEditor(c, S.perfil.avatar, av=>{ S.avTmp=av; prev.innerHTML=dib(av); });
  if(esLid){ editorLider(c,S.avTmp,()=>prev.innerHTML=dib(S.avTmp)); prev.innerHTML=dib(S.avTmp); }
  if((S.perfil.rol==='master'||S.perfil.rol==='admin')&&window.editorMaster){ prev.setAttribute('viewBox','-54 -128 108 142'); editorMaster(c,S.avTmp,()=>prev.innerHTML=dib(S.avTmp)); prev.innerHTML=dib(S.avTmp); }   // v30
}
function pantallaAvatar(){
  if(S.modo==='org'&&!S.perfil.avatar) S.perfil.avatar={gender:0,skin:1,hair:0,hairC:0,style:2,top:0,bot:5,shoe:1,head:1,face:0,extra:[1,2]};
  show('s-avatar'); montarEditor('avFirst');
  $('avGuardar1').onclick=async()=>{ if(await guardarPerfil({avatar:S.avTmp})){ $('avFirst').innerHTML=''; continuar(); } };
}
function pantallaPermiso(){
  show('s-permiso'); $('permIOS').hidden=!(esIOS&&!instalada);
  const fin=()=>{ LS.set('steam_permiso_'+S.perfil.id,true); continuar(); };
  $('permSi').onclick=async()=>{ await activarAvisos(); fin(); };
  $('permNo').onclick=fin;
}

/* ---------------- avisos con la app cerrada (Web Push) ---------------- */
function b64ToU8(s){ const p='='.repeat((4-s.length%4)%4), b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...b].map(c=>c.charCodeAt(0))); }
/* v55 · avisar al instante: la app le pide al servidor que envíe ya las notificaciones pendientes (mensajes, chat, avisos, turnos) */
let _pushT=null;
function avisarYa(){ clearTimeout(_pushT); _pushT=setTimeout(()=>{ try{ S.sb.functions.invoke((CFG&&CFG.FUNCION_PUSH)||'rapid-worker',{body:{}}).catch(()=>{}); }catch(_){} },1200); }
window.avisarYa=avisarYa;
async function probarNotificacion(){
  if(S.vistaComo) return avisoVista();
  let sub=null; try{ const reg=await navigator.serviceWorker.getRegistration(); sub=reg&&await reg.pushManager.getSubscription(); }catch(e){}
  if(!('Notification' in window)||Notification.permission!=='granted'||!sub){ toast('Primero toca «Activar avisos».','bad',4000); return; }
  ventana({icono:'🔔',titulo:'Prueba de notificación',html:'<p>Cierra o minimiza la app ahora. En <b>8 segundos</b> te llegará una notificación con sonido, como un mensaje de WhatsApp.</p><p class="sm">Si no suena, revisa que el celular no esté en silencio o en «No molestar», y que las notificaciones de la app (o del navegador) tengan el sonido activado en los ajustes del celular.</p>',botones:[{t:'Entendido'}]});
  try{ const r=await S.sb.functions.invoke((CFG&&CFG.FUNCION_PUSH)||'rapid-worker',{body:{prueba:true,espera:8}});
    if(r.error) toast('No se pudo enviar la prueba: '+(r.error.message||r.error)+'. ¿Ya actualizaste rapid-worker?','bad',6000);
    else if(r.data&&r.data.motivo==='sin_suscripcion') toast('Este celular no está registrado para avisos. Toca «Activar avisos».','bad',5000);
    else if(r.data&&!r.data.ok) toast('El servidor no pudo entregar la notificación a este celular. Vuelve a activar los avisos.','bad',6000);
  }catch(e){ toast('No se pudo enviar la prueba: '+e.message,'bad',5000); }
}
// v55 · al tocar una notificación: abrir el chat (y la conversación) o la app
if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message',ev=>{ const m=ev.data||{};
  if(m.tipo==='abrir'&&/p=chat/.test(m.url||'')&&S.perfil&&window.puedeChat&&puedeChat()){ if(m.sala) S.chatSala=m.sala; irPanel('chat'); } });
async function activarAvisos(){
  if(S.vistaComo){ avisoVista(); return false; }
  desbloquearAudio();
  if(!('Notification' in window)){ toast(esIOS?'En iPhone, agrega la app a la pantalla de inicio para recibir avisos.':'Este navegador no permite avisos.','bad',5000); return false; }
  const p=await Notification.requestPermission();
  if(p!=='granted'){ toast('No se concedió el permiso de avisos.','bad'); return false; }
  try{
    if(!/TU_/.test(CFG.VAPID_PUBLIC_KEY) && 'serviceWorker' in navigator && 'PushManager' in window){
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub) sub=await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64ToU8(CFG.VAPID_PUBLIC_KEY) });
      const j=sub.toJSON();
      await S.sb.from('sd_push').upsert({ perfil_id:S.perfil.id, endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth, dispositivo:navigator.userAgent.slice(0,180) },{ onConflict:'endpoint' });
    }
    await guardarPerfil({ alertas:{...S.perfil.alertas, app_cerrada:true} });
    toast('Avisos activados','ok'); return true;
  }catch(e){ toast('Avisos dentro de la app activos. Los avisos con la app cerrada no se pudieron activar: '+e.message,'bad',6000); return false; }
}
async function desactivarPush(){
  if(S.vistaComo) return;
  try{ const reg=await navigator.serviceWorker.ready, sub=await reg.pushManager.getSubscription();
    if(sub){ await S.sb.from('sd_push').delete().eq('endpoint',sub.endpoint); await sub.unsubscribe(); } }catch(e){}
}

/* íconos del menú inferior (Lucide, licencia ISC) */
const NAV_IC={"route": "<circle cx=\"6\" cy=\"19\" r=\"3\" /> <path d=\"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15\" /> <circle cx=\"18\" cy=\"5\" r=\"3\" />", "school": "<path d=\"M14 22v-4a2 2 0 1 0-4 0v4\" /> <path d=\"m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10\" /> <path d=\"M18 5v17\" /> <path d=\"m4 6 7.106-3.553a2 2 0 0 1 1.788 0L20 6\" /> <path d=\"M6 5v17\" /> <circle cx=\"12\" cy=\"9\" r=\"2\" />", "calendar-days": "<path d=\"M8 2v4\" /> <path d=\"M16 2v4\" /> <rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" /> <path d=\"M3 10h18\" /> <path d=\"M8 14h.01\" /> <path d=\"M12 14h.01\" /> <path d=\"M16 14h.01\" /> <path d=\"M8 18h.01\" /> <path d=\"M12 18h.01\" /> <path d=\"M16 18h.01\" />", "notebook-pen": "<path d=\"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4\" /> <path d=\"M2 6h4\" /> <path d=\"M2 10h4\" /> <path d=\"M2 14h4\" /> <path d=\"M2 18h4\" /> <path d=\"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\" />", "list-checks": "<path d=\"m3 17 2 2 4-4\" /> <path d=\"m3 7 2 2 4-4\" /> <path d=\"M13 6h8\" /> <path d=\"M13 12h8\" /> <path d=\"M13 18h8\" />", "smile": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M8 14s1.5 2 4 2 4-2 4-2\" /> <line x1=\"9\" x2=\"9.01\" y1=\"9\" y2=\"9\" /> <line x1=\"15\" x2=\"15.01\" y1=\"9\" y2=\"9\" />", "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\" /> <path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\" />", "clipboard-list": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" /> <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" /> <path d=\"M12 11h4\" /> <path d=\"M12 16h4\" /> <path d=\"M8 11h.01\" /> <path d=\"M8 16h.01\" />", "chart-column": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\" /> <path d=\"M18 17V9\" /> <path d=\"M13 17V5\" /> <path d=\"M8 17v-3\" />", "message-circle": "<path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\" />", "ellipsis": "<circle cx=\"12\" cy=\"12\" r=\"1\" /> <circle cx=\"19\" cy=\"12\" r=\"1\" /> <circle cx=\"5\" cy=\"12\" r=\"1\" />", "radio": "<path d=\"M4.9 19.1C1 15.2 1 8.8 4.9 4.9\" /> <path d=\"M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" /> <path d=\"M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5\" /> <path d=\"M19.1 4.9C23 8.8 23 15.1 19.1 19\" />", "map": "<path d=\"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z\" /> <path d=\"M15 5.764v15\" /> <path d=\"M9 3.236v15\" />", "flag": "<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\" /> <line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\" />", "rotate-cw": "<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\" /> <path d=\"M21 3v5h-5\" />"};
/* ---------------- pantalla principal ---------------- */
function principal(){
  show('s-main');
  $('btnAdmin').hidden = S.perfil.rol!=='admin';
  $('btnVer').hidden = !(S.perfil.rol==='admin' || S.vistaComo); $('btnVer').onclick=abrirVerComo;
  pintarFranjaVista();
  $('btnHelp').hidden = S.modo!=='docente';
  $('btnAdmin').onclick=()=>{ if(typeof window.abrirAdmin==='function') window.abrirAdmin(); else toast('No se cargó el panel de administración (js/admin.js). Recarga la página con Ctrl + F5.','bad',6000); };
  $('btnHelp').onclick=abrirAyuda;
  $('btnVista').onclick=()=>{ S.vista=S.vista==='mapa'?'lista':'mapa'; $('btnVista').textContent=S.vista==='mapa'?'☰':'🗺'; pintarRuta(false); };
  const NAVS={ docente:[['ruta','route','Mi ruta'],['programa','calendar-days','Programa'],['lista','list-checks','Lista'],['avatar','smile','Avatar'],['alertas','bell','Alertas']],
    master:[['ruta','school','Colegio'],['agenda','notebook-pen','Mi agenda'],['programa','calendar-days','Programa'],['asis','clipboard-list','Asistencia'],['alertas','ellipsis','Más']],
    lider:[['estacion','flag','Mi estación'],['rot','rotate-cw','Rotaciones'],['programa','calendar-days','Programa'],['avatar','smile','Avatar'],['alertas','ellipsis','Más']],
    org:[['vivo','radio','En vivo'],['ruta','map','Mapa'],['programa','calendar-days','Programa'],['chat','message-circle','Chat'],['asis','clipboard-list','Asistencia'],['alertas','ellipsis','Más']] };
  NAVS.admin=[['ruta','school','Colegio'],['vivo','radio','En vivo'],['programa','calendar-days','Programa'],['asis','clipboard-list','Asistencia'],['enc','chart-column','Encuestas'],['chat','message-circle','Chat'],['alertas','ellipsis','Más']];   // v38: + Programa
  // v30: Máster Coordinador (Master con marca) y Secretaría
  NAVS.orgm=[['ruta','school','Colegio'],['vivo','radio','En vivo'],['agenda','notebook-pen','Mi agenda'],['programa','calendar-days','Programa'],['chat','message-circle','Chat'],['asis','clipboard-list','Asistencia'],['alertas','ellipsis','Más']];   // v38: + Programa
  NAVS.sec=[['asis','clipboard-list','Asistencia'],['vivo','radio','En vivo'],['programa','calendar-days','Programa'],['avatar','smile','Avatar'],['alertas','ellipsis','Más']];
  const nv=S.perfil.rol==='admin'?NAVS.admin:(S.modo==='master'&&S.perfil.org_master)?NAVS.orgm:NAVS[S.modo];
  $('nav').innerHTML=nv.map(([k,i,t])=>`<span data-p="${k}"><i class="ic"><svg viewBox="0 0 24 24">${NAV_IC[i]}</svg></i>${t}</span>`).join('');
  $('nav').classList.toggle('n6',nv.length>5); $('nav').classList.toggle('n7',nv.length>6); $('nav').classList.toggle('lid',S.modo==='lider');
  document.querySelectorAll('#nav span').forEach(n=>n.onclick=()=>irPanel(n.dataset.p));
  $('btnUbic').onclick=marcarUbicacion; $('btnQuitar').onclick=()=>{ ColegioVivo.quitar(); actualizarBotonesCV(); cerrarSheet(); };
  document.querySelectorAll('#gtabs span').forEach(t=>t.onclick=()=>{ document.querySelectorAll('#gtabs span').forEach(x=>x.classList.toggle('on',x===t)); pintarPrograma(t.dataset.n); });
  if(!S.mapa) S.mapa=new MapaSteam($('mapa'),{ onTap:abrirParada, onArrive:i=>{ if(S.modo==='docente') LS.set('steam_last_'+S.curso,i); else { S.masterIdx=i; pintarLista(i); pintarTarjeta(i); } },
    // v28: el líder de la estación sale a saludar al docente (solo en la ruta del docente)
    lideres:i=>{ if(S.modo!=='docente') return null; const L=lideresDe(S.stops[i]); return L.length?{list:L,quien:'profe '+firstName(S.perfil.nombre),curso:S.curso}:null; },
    saludado:i=>LS.get(lidSalKey(i),false), guardarSaludo:i=>LS.set(lidSalKey(i),true) });
  S.mapa.setAvatar(S.perfil.avatar);
  if(S.modo==='docente' && !S.cursos.length) setTimeout(()=>{ toast('Elige tu grado y curso para ver tu ruta.','',4000); abrirAyuda(); },600);
  $('btnColegio').onclick=abrirCamino; $('cvVolver').onclick=cerrarCamino; $('btnEnc').onclick=()=>listaPendientes(); $('btnEnc').hidden=true;
  $('cvAhora').onclick=()=>{ ColegioVivo.manual=0; ColegioVivo.setHora(horaMaster()); };
  $('s-main').classList.toggle('lid',S.modo==='lider');
  ColegioVivo.setLideres(f=>lideresDe(f));
  if(S.modo==='lider'||S.perfil.rol==='admin'||S.modo==='master'||S.modo==='org') cargarLlegadas();
  if(S.modo==='master'||S.perfil.rol==='admin') cargarAgenda();
  pintarRuta(true); pintarBanner(); irPanel(S.modo==='org'?'vivo':S.modo==='lider'?'estacion':S.modo==='sec'?'asis':'ruta');
  clearInterval(S.timer); S.timer=setInterval(tick,15000); tick();
  suscribirTiempoReal();
  if(window.copaIniciar) copaIniciar();
  if(window.cmIniciar) cmIniciar();
  if(window.v30Iniciar) v30Iniciar();
  if(window.mayIniciar) mayIniciar();
  try{ const q=new URLSearchParams(location.search); if(q.get('p')==='chat'&&puedeChat()){ if(q.get('sala')) S.chatSala=q.get('sala'); setTimeout(()=>irPanel('chat'),600); } }catch(_){}
}
function irPanel(p){
  S.panel=p;
  ['ruta','programa','avatar','alertas','lista','asis','vivo','chat','enc','estacion','rot','agenda','may'].forEach(x=>{ const e=$('p-'+x); if(e) e.hidden=x!==p; });
  document.querySelectorAll('#nav span').forEach(n=>n.classList.toggle('on',n.dataset.p===p));
  $('btnVista').hidden=p!=='ruta'||S.modo!=='docente';
  cerrarSheet();
  if(p==='programa') pintarPrograma(document.querySelector('#gtabs span.on').dataset.n);
  if(p==='avatar'){ montarEditor('avMain'); $('avGuardar2').onclick=async()=>{ if(await guardarPerfil({avatar:S.avTmp})){ S.mapa.setAvatar(S.avTmp); ColegioVivo.setAvatar(S.avTmp); if(S.lid&&S.lid[S.perfil.id]) S.lid[S.perfil.id].avatar=S.avTmp; toast('Avatar guardado','ok'); } }; }
  else $('avMain').innerHTML='';
  if(p==='alertas') pintarAlertas();
  if(p==='lista') pintarLista2();
  if(p==='asis') pintarAsis();
  if(p==='may'&&window.pintarMayores) pintarMayores();
  if(p==='vivo') pintarVivo();
  if(p==='chat') abrirChat();
  if(p==='enc') pintarEncuestas();
  if(p==='ruta'){ pintarRuta(false); if(window.turBoton) turBoton(); }
  if(p==='estacion') pintarEstacion();
  if(p==='rot') pintarRotaciones();
  if(p==='agenda') pintarAgenda();
}

function mapaVisible(){ return !$('s-main').hidden && S.panel==='ruta' && S.vista==='mapa' && !$('mapa').hidden; }
/* índice de la parada actual según la hora (docentes) */
function indiceActual(stops){
  const a=ahora(), fe=S.config.fecha_evento;
  if(a.fecha<fe) return -1;
  if(a.fecha>fe) return stops.length-1;
  let idx=-1; stops.forEach((s,i)=>{ if(toMin(s.h)<=a.min) idx=i; }); return idx;
}
function pintarChips(){
  const ch=$('chips');
  if(S.modo==='master'){
    ch.hidden=false;
    ch.innerHTML=['mat','cie','tec'].map(c=>`<span class="${S.area===c?'on':''}" data-a="${c}">${c==='cie'?'Ciencias':AREA_N[c]}</span>`).join('')+'<span class="sep"></span>'+
      ['Primaria','Bachillerato'].map(n=>`<span class="${S.nivel===n?'on':''}" data-n="${n}">${n}</span>`).join('');
    ch.querySelectorAll('[data-a]').forEach(e=>e.onclick=()=>{ S.area=e.dataset.a; guardarPerfil({experiencia:S.area}); S.masterIdx=LS.get('steam_midx_'+S.area+S.nivel,0); pintarRuta(true); });
    ch.querySelectorAll('[data-n]').forEach(e=>e.onclick=()=>{ S.nivel=e.dataset.n; LS.set('steam_nivel',S.nivel); S.masterIdx=LS.get('steam_midx_'+S.area+S.nivel,0); pintarRuta(true); });
  } else {
    ch.hidden=S.cursos.length<2;
    ch.innerHTML=S.cursos.map(c=>`<span class="${c===S.curso?'on':''}" data-c="${escHTML(c)}">${escHTML(c)}</span>`).join('')+'<small>Cambia de curso</small>';
    ch.querySelectorAll('[data-c]').forEach(e=>e.onclick=()=>{ S.curso=e.dataset.c; pintarRuta(true); });
  }
}
/* rehacer=true: vuelve a dibujar el mapa; si no, solo actualiza textos */
function pintarRuta(rehacer){
  const nom=escHTML(firstName(S.perfil.nombre));
  if(S.modo==='lider'){ $('mHola').innerHTML=`Hola, ${nom} · Líder de estación`; $('mTit').textContent='Mi estación'; $('chips').hidden=true; $('btnColegio').hidden=true; return; }
  const esM=S.modo==='master'||S.modo==='org'||S.modo==='sec';
  $('p-ruta').classList.toggle('esMaster',esM);
  if(esM){   // Master: Colegio vivo
    $('chips').hidden=true; $('btnColegio').hidden=true;
    $('mHola').innerHTML=`Hola, ${nom} · ${S.perfil.rol==='admin'?'Administrador':S.modo==='org'?(S.perfil.org_lista?'Organizador Master':'Organizador'):S.modo==='sec'?'Secretaría':'Master'}${S.perfil.org_master&&S.perfil.rol!=='admin'?' · Máster Coord.':''}`; $('mTit').textContent=S.modo==='org'?'STEM Day · Organización':S.modo==='sec'?'STEM Day · Secretaría':'Colegio vivo';
    if(S.mapa&&S.mapa.svg.firstChild){ S.mapa.svg.innerHTML=''; S.mapa.road=null; }
    const cv=$('cv'); cv.hidden=false; cv.classList.remove('camino'); $('cvVolver').hidden=true;
    ColegioVivo.setDatos(S.prog); ColegioVivo.setAvatar(S.perfil.avatar);
    if(rehacer||!S.cvListo){ if(!ColegioVivo.manual) ColegioVivo.setHora(horaMaster()); if(!S.cvListo||!ColegioVivo.ocupado()) ColegioVivo.abrirMaster(); S.cvListo=true; }
    else ColegioVivo.refrescar();
    if(S.modo==='org'&&!S.ubicCargada){ S.ubicCargada=true; ColegioVivo.setUbicacion(LS.get('steam_ubic_'+S.perfil.id,null)); }
    actualizarBotonesCV(); return;
  }
  pintarChips();
  if(S.modo==='master'){
    S.stops=rutaMaster(S.area,S.nivel);
    $('mHola').innerHTML=`Hola, ${nom} · ${S.perfil.rol==='admin'?'Administrador':'Master'}`; $('mTit').textContent='Experiencia '+AREA_N[S.area];
    if(S.masterIdx>=S.stops.length) S.masterIdx=0;
  } else {
    S.stops=S.curso?rutaCurso(S.curso):[];
    $('mHola').innerHTML=`Hola, ${nom}${S.curso?' · Curso '+escHTML(S.curso):''}`; $('mTit').textContent='Ruta STEM Day';
  }
  const lista=S.vista==='lista';
  $('mapa').hidden=lista; $('lista').hidden=!lista; $('btnColegio').hidden=lista||!S.stops.length; $('btnColegio').style.top=($('mapa').offsetTop+10)+'px'; if(window.turBoton) setTimeout(turBoton,0);
  if(!S.stops.length){
    $('mapa').hidden=true; $('lista').hidden=false; $('card').hidden=true;
    $('listaBody').innerHTML=`<div class="alertbox" style="margin:0">${S.modo==='master'?'Esta área no tiene actividades en '+S.nivel+'.':'Aún no tienes un curso asignado. Toca el botón <b>?</b> de arriba para elegir tu grado y curso.'}</div>`;
    $('pTxt').textContent=''; $('pStars').textContent='0'; $('pBar').style.width='0'; return;
  }
  $('card').hidden=false;
  S.mapa.opts.libre = S.modo==='master';
  const idx = S.modo==='master' ? S.masterIdx : indiceActual(S.stops);
  if(rehacer) S.mapaSucio=true;
  if(S.mapaSucio && mapaVisible()){
    S.mapaSucio=false;
    if(S.modo==='docente'){
      const last=LS.get('steam_last_'+S.curso,null);
      if(last!=null && last<idx && last>=0){ S.mapa.setRoute(S.stops,last); setTimeout(()=>S.mapa.goTo(idx),700); }
      else S.mapa.setRoute(S.stops,idx);
      LS.set('steam_last_'+S.curso,idx);
    } else S.mapa.setRoute(S.stops,idx);
  }
  pintarLista(idx); pintarTarjeta(idx);
}
function pintarTarjeta(idx){
  const st=S.stops, i0=Math.max(idx,0), f=st[i0], nx=st[idx+1], card=$('card');
  card.style.setProperty('--c',colorDe(f));
  if(S.modo==='master'){
    $('cK').textContent='Estás en · '+f.lugar; $('cT').textContent=f.nombre;
    $('cM').textContent=`${fmtHora(f.h)} – ${fmtHora(f.f)} · ${f.grupo}`;
    $('pTxt').textContent=`Actividad ${i0+1} de ${st.length}`; $('pStars').textContent=i0;
  } else {
    const a=ahora(), antes=idx<0;
    // terminó la actividad actual y la siguiente aún no empieza: se anuncia la siguiente
    if(!antes && nx && a.fecha===S.config.fecha_evento && toMin(f.f)<=a.min){
      card.style.setProperty('--c',colorDe(nx));
      $('cK').textContent='A continuación · '+(nx.tipo==='pausa'?nx.area:AREA_N[nx.cat]);
      $('cT').textContent=nx.nombre;
      $('cM').textContent=`${fmtHora(nx.h)} – ${fmtHora(nx.f)}${nx.tipo!=='pausa'&&nx.salon?' · Salón '+nx.salon:''}`;
      $('pTxt').textContent=`Estación ${idx+1} de ${st.length}`; $('pStars').textContent=idx;
      $('pBar').style.width=(st.length>1?i0/(st.length-1)*100:100)+'%';
      card.onclick=()=>abrirParada(idx+1); return;
    }
    $('cK').textContent = antes ? (a.fecha<S.config.fecha_evento?'El evento es el '+fechaLarga(S.config.fecha_evento):'Antes de empezar') : 'Ahora · '+(f.tipo==='pausa'?f.area:AREA_N[f.cat]);
    $('cT').textContent = antes ? 'Primera actividad: '+st[0].nombre : f.nombre;
    const g=antes?st[0]:f;
    $('cM').textContent = `${fmtHora(g.h)} – ${fmtHora(g.f)}${g.tipo!=='pausa'&&g.salon?' · Salón '+g.salon:''}${!antes&&nx?' · Sigue: '+nx.nombre+' ('+fmtHora(nx.h)+')':''}`;
    $('pTxt').textContent=`Estación ${Math.max(idx+1,0)} de ${st.length}`; $('pStars').textContent=Math.max(idx,0);
  }
  $('pBar').style.width=(st.length>1?i0/(st.length-1)*100:100)+'%';
  card.onclick=()=>abrirParada(i0);
}
function pintarLista(idx){
  $('listaBody').innerHTML=S.stops.map((s,i)=>{ const libre=S.modo==='master';
    return `<div class="li ${!libre&&i<idx?'done':''} ${i===idx?'cur':''}" style="--c:${colorDe(s)}" data-i="${i}"><div class="h">${fmtHora(s.h)}</div>
      <div><b>${escHTML(s.nombre)}</b><small>${escHTML(s.tipo==='pausa'?'':(S.modo==='master'?s.lugar+' · '+s.grupo:'Salón '+(s.salon||'por definir')))}</small></div></div>`; }).join('');
  $('listaBody').querySelectorAll('.li').forEach(e=>e.onclick=()=>abrirParada(+e.dataset.i));
}
/* Master: la hora del mapa sigue el reloj el día del evento */
function horaMaster(){ const a=ahora(); return a.fecha===S.config.fecha_evento&&a.min>=420&&a.min<=900 ? a.min : 515; }
function tick(){
  if(S.modo==='lider'){ if(!document.hidden){ if(S.panel==='estacion') pintarEstacion(); if(S.panel==='rot') pintarRotaciones(); } revisarAlertasLider(); return; }
  if(S.modo==='master'||S.perfil.rol==='admin') tickAgenda();
  if(S.panel==='vivo'&&!document.hidden&&document.activeElement.id!=='vBus') pintarVivo();
  if(S.modo==='master'||S.modo==='org'||S.modo==='sec'){ if(S.panel==='ruta'&&!ColegioVivo.ocupado()&&(!ColegioVivo.manual||Date.now()-ColegioVivo.manual>180000)){ ColegioVivo.manual=0; ColegioVivo.setHora(horaMaster()); } revisarAlertas(); return; }
  if(!S.stops.length||S.modo!=='docente') { revisarAlertas(); return; }
  const idx=indiceActual(S.stops);
  if(idx!==S.mapa.cur && !S.mapa.busy){
    if(mapaVisible() && !document.hidden && idx>S.mapa.cur && !S.mapaSucio){ S.mapa.goTo(idx); LS.set('steam_last_'+S.curso,idx); }
    else S.mapaSucio=true;   // se anima cuando el docente vuelva al mapa
  }
  // v57: desplazamiento o descanso: cuando el avatar ya avanzó, aparece el aviso
  { const st=S.stops[idx]; if(st&&st.tipo==='pausa'&&ahora().fecha===S.config.fecha_evento){ const espera=()=>{ if(S.mapa.busy&&mapaVisible()) return setTimeout(espera,800); avisoPausa(S.stops,idx); }; setTimeout(espera,mapaVisible()?1200:0); } }
  if(S.mapaSucio && mapaVisible() && !S.mapa.busy && !document.hidden){ pintarRuta(false); revisarAlertas(); revisarEncuestas(); return; }
  pintarLista(idx); pintarTarjeta(idx); revisarAlertas(); revisarEncuestas();
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden && S.perfil && !$('s-main').hidden) tick(); });

/* ---------------- docente: botón "Mapa del colegio" ---------------- */
/* estación donde debe estar ahora (la actual o la siguiente) y la anterior (donde estaba) */
function destinoDocente(){
  const acts=S.stops.filter(s=>s.tipo==='actividad'); if(!acts.length) return null;
  const a=ahora(); let i;
  if(a.fecha<S.config.fecha_evento) i=0; else if(a.fecha>S.config.fecha_evento) i=acts.length-1;
  else { i=acts.findIndex(s=>toMin(s.f)>a.min); if(i<0) i=acts.length-1; }
  return { org:i>0?acts[i-1]:null, dst:acts[i] };
}
async function abrirCamino(){
  if(ColegioVivo.ocupado()) return; const d=destinoDocente(); if(!d) return toast('Aún no tienes estaciones asignadas.','bad');
  cerrarSheet(); const cv=$('cv'); cv.hidden=false; cv.classList.add('camino'); $('cvVolver').hidden=false;
  ColegioVivo.setDatos(S.prog); ColegioVivo.setAvatar(S.perfil.avatar);
  await ColegioVivo.camino(d.org,d.dst);
}
function cerrarCamino(){ if(ColegioVivo.ocupado()) return toast('Espera a que el avatar termine el recorrido.','',2200); ColegioVivo.cerrar(); $('cv').hidden=true; }

/* ---------------- detalle de parada ---------------- */
const P = t => t ? escHTML(t) : '<span class="pend">Información pendiente</span>';
function abrirParada(i){
  const f=S.stops[i]; if(!f) return; const col=colorDe(f); let body=''; const lidL=S.modo==='docente'?lideresDe(f):[];
  if(S.modo==='master'){
    body=`<div class="facts"><div class="fact"><small>Hora</small><div>${fmtHora(f.h)} – ${fmtHora(f.f)}</div></div><div class="fact"><small>Lugar</small><div>${escHTML(f.lugar)}</div></div>
      <div class="fact" style="grid-column:1/-1"><small>Docente a cargo</small><div>${P(f.docente_cargo)}</div></div></div>
      <div class="sec"><h3>Propósito</h3><p>${P(f.frase)}</p></div>
      <div class="sec"><h3>Cursos que rotan aquí · ${escHTML(f.etq)}</h3></div>
      ${f.filas.map(r=>`<div class="rot"><b>${escHTML(r.curso)}</b><span>Salón ${escHTML(r.salon||'—')}<br>${escHTML(r.acompanante||'')}</span></div>`).join('')}
      <div style="padding:8px 16px"><button class="btn" id="irAqui" ${i===S.mapa.cur?'disabled':''}>${i===S.mapa.cur?'Ya estás aquí':'Ir aquí con mi avatar'}</button></div>`;
  } else {
    const a=ahora(), futura = a.fecha<S.config.fecha_evento || (a.fecha===S.config.fecha_evento && toMin(f.h)>a.min);
    body=`${futura?`<div class="lockmsg">🔒 Aún no es hora. Tu avatar llegará aquí a las ${fmtHora(f.h)}.</div>`:''}
      ${f.nota_cambio?`<div class="alertbox">Cambio reciente: ${escHTML(f.nota_cambio)}</div>`:''}
      <div class="facts"><div class="fact"><small>Hora</small><div>${fmtHora(f.h)} – ${fmtHora(f.f)}</div></div><div class="fact"><small>Salón</small><div>${f.tipo==='pausa'?'—':P(f.salon)}</div></div>
      ${f.tipo==='pausa'?'':`<div class="fact"><small>Docente a cargo</small><div>${P(f.docente_cargo)}</div></div><div class="fact"><small>Curso</small><div>${escHTML(S.curso)}</div></div>`}</div>
      ${f.tipo==='pausa'?'':`<div class="sec"><h3>Actividad</h3><p>${P(f.titulo&&titA(f.titulo))}</p></div><div class="sec"><h3>Propósito</h3><p>${P(f.frase)}</p></div>
      <div class="sec"><h3>Docentes del curso</h3><p>Director de curso: ${escHTML(f.acompanante||'—')}<br>Codirector: ${escHTML(f.apoyo||'—')}</p></div>`}
      ${lidL.length?`<div class="lidsec"><h3>⭐ ${LS.get(lidSalKey(i),false)?'Te recibió':'Te recibirá'}${lidL.length>1?'n':''}</h3><div class="ls">${lidL.map(l=>`<div class="li">${lidMini(l,24)}${escHTML(lidNombre(l.nombre))}</div>`).join('')}</div></div>`:''}
      ${!futura&&f.tipo!=='pausa'?`<div style="padding:0 16px"><button class="btn ghost" id="verAnim">Ver la animación de llegada</button></div>`:''}
      ${f.tipo==='pausa'&&S.modo==='docente'&&mensajePausa(S.stops,i)?(()=>{ const m=mensajePausa(S.stops,i); return `<div style="padding:4px 16px 0"><div class="dsbox ${m.t==='desp'?(m.ruta==='azul'?'azul':'rojo'):''}">${m.texto}</div>${m.t==='desp'?`<button class="btn" id="verDesp" data-r="${m.ruta}" style="background:${m.ruta==='azul'?'#2f6fde':'#c2410c'}">🗺️ Ver mapa del recorrido</button>`:''}</div>`; })():''}
      ${f.tipo!=='pausa'&&f.salon?`<div style="padding:8px 16px 0"><button class="btn" id="verSalon" style="background:#c2410c">🏫 Entrar y ver el salón</button></div>`:''}
      ${f.tipo!=='pausa'&&window.fichaExtraV30?fichaExtraV30(f):''}
      ${f.tipo!=='pausa'&&window.ultimoEspacio&&S.cursos.some(c=>{ const u=ultimoEspacio(c); return u&&u.h===f.h; })&&encuestaFinalDisponible()?`<div style="padding:8px 16px 0"><button class="btn" id="encFin" style="background:#c2410c">📝 Encuesta final de la jornada</button></div>`:''}
      ${evaluable(f)&&terminada(f)?`<div style="padding:8px 16px 0"><button class="btn" id="evalAct">📝 ${S.encMias&&S.encMias[encClave(S.curso,f.hora_inicio)]?'Ver o corregir mi encuesta':'Evaluar esta actividad'}</button></div>`:''}`;
  }
  const sh=$('sheet');
  sh.innerHTML=`<div class="sh" style="background:${col}"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">${S.modo==='master'?'Actividad':'Estación'} ${i+1} de ${S.stops.length}</div>
    <h3>${escHTML(f.nombre)}</h3><span class="tag2">${escHTML(f.area||'')}</span></div><div class="sb">${body}</div>`;
  sh.classList.add('open'); $('shX').onclick=cerrarSheet;
  if($('irAqui')) $('irAqui').onclick=async()=>{ cerrarSheet(); if(S.vista!=='mapa'){ S.vista='mapa'; $('btnVista').textContent='☰'; pintarRuta(false);} S.masterIdx=i; LS.set('steam_midx_'+S.area+S.nivel,i); await S.mapa.goTo(i); pintarLista(i); pintarTarjeta(i); };
  if($('verAnim')) $('verAnim').onclick=()=>{ cerrarSheet(); mostrarLlegada($('p-ruta'),f,lidL); };
  if($('verDesp')) $('verDesp').onclick=()=>verDesplazamiento($('verDesp').dataset.r);
  if($('verSalon')) $('verSalon').onclick=()=>{ cerrarSheet(); entrarSalonDocente(f); };
  if($('evalAct')) $('evalAct').onclick=()=>{ cerrarSheet(); abrirEncuesta({...f,curso:S.curso}); };
  if($('encFin')) $('encFin').onclick=()=>{ cerrarSheet(); abrirEncuestaFinal(S.curso); };
  if(window.bindFichaV30) bindFichaV30();
}
function cerrarSheet(){ $('sheet').classList.remove('open'); }

/* docente: abre el Colegio vivo dentro del edificio de su estación (ahí está el líder) */
async function entrarSalonDocente(f){
  if(ColegioVivo.ocupado()) return; const cv=$('cv'); cv.hidden=false; cv.classList.add('camino'); $('cvVolver').hidden=false;
  ColegioVivo.setDatos(S.prog); ColegioVivo.setAvatar(S.perfil.avatar); ColegioVivo.cerrar();
  await ColegioVivo.entrar({...f,hora_inicio:f.h||f.hora_inicio,hora_fin:f.f||f.hora_fin});
}
/* ---------------- ayuda: elegir grado y curso ---------------- */
function abrirAyuda(){
  const G={}; S.prog.filter(r=>r.tipo==='actividad').forEach(r=>{ (G[r.grado]=G[r.grado]||new Set()).add(r.curso); });
  const grados=Object.keys(G); if(!grados.length) return toast('Aún no hay programación cargada.','bad');
  S.hSel={ grado:(filaDe(S.curso)||{}).grado||grados[0], cursos:[...S.cursos] };
  const pintar=()=>{
    const sh=$('sheet'), h=S.hSel;
    sh.innerHTML=`<div class="sh" style="background:var(--brand)"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">Ayuda</div><h3>¿Tu curso no aparece bien?</h3></div>
      <div class="sb hsel"><p class="sm">Elige el grado y el curso que vas a acompañar. Si eres codirector de dos cursos, marca ambos (pueden ser de grados distintos).</p>
      <h4>Grado</h4><div class="row">${grados.map(g=>`<span class="chip ${h.grado===g?'on':''}" data-g="${escHTML(g)}">${escHTML(g)}</span>`).join('')}</div>
      <h4>Curso (máximo 2)</h4><div class="row">${[...G[h.grado]].sort().map(c=>`<span class="chip ${h.cursos.includes(c)?'on':''}" data-c="${escHTML(c)}">${escHTML(c)}</span>`).join('')}</div>
      ${S.perfil.cursos_solicitud?`<div class="warnbox" style="margin:8px 0">⏳ Tu solicitud ${S.perfil.cursos_solicitud.length?'de cambiar a <b>'+escHTML(S.perfil.cursos_solicitud.join(' y '))+'</b>':'de volver a lo que dice la programación'} está <b>pendiente</b> de aprobación del administrador.</div>`:S.perfil.cursos_respuesta==='rechazada'?'<div class="warnbox" style="margin:8px 0">Tu última solicitud no se aprobó.</div>':''}
      <h4>Seleccionados</h4><p>${h.cursos.length?escHTML(h.cursos.join(' y ')):'<span class="pend">Ninguno</span>'}</p>
      <button class="btn" style="margin-top:14px" id="hOk" ${h.cursos.length?'':'disabled'}>Enviar la solicitud al administrador</button>
      ${S.perfil.cursos_manual?'<button class="btn ghost" style="margin-top:8px" id="hReset">Pedir volver a lo que dice la programación</button>':''}
      <p class="sm" style="margin-top:10px">Tu ruta no cambia hasta que el administrador apruebe la solicitud. Te llegará un aviso con la respuesta.</p></div>`;
    $('shX').onclick=cerrarSheet;
    sh.querySelectorAll('[data-g]').forEach(e=>e.onclick=()=>{ h.grado=e.dataset.g; pintar(); });
    sh.querySelectorAll('[data-c]').forEach(e=>e.onclick=()=>{ const c=e.dataset.c, k=h.cursos.indexOf(c); if(k>=0) h.cursos.splice(k,1); else { if(h.cursos.length>=2) h.cursos.shift(); h.cursos.push(c); } pintar(); });
    // v51: queda como solicitud; el administrador la aprueba o la rechaza
    const pedir=async cur=>{ if(S.vistaComo){ avisoVista(); return; }
      const {error}=await S.sb.from('sd_perfiles').update({cursos_solicitud:cur}).eq('id',S.perfil.id);
      if(error) return toast('No se pudo enviar: '+(/cursos_solicitud/.test(error.message)?'falta ejecutar el archivo 28 en Supabase.':error.message),'bad',5000);
      Object.assign(S.perfil,{cursos_solicitud:cur,cursos_respuesta:null}); cerrarSheet();
      ventana({icono:'⏳',titulo:'Solicitud enviada',html:`<p>${cur.length?`Pediste acompañar a <b>${escHTML(cur.join(' y '))}</b>.`:'Pediste volver a lo que dice la programación.'} Tu ruta no cambia hasta que el administrador la apruebe. Te llegará un aviso con la respuesta.</p>`,botones:[{t:'Entendido'}]}); };
    $('hOk').onclick=()=>pedir(h.cursos);
    if($('hReset')) $('hReset').onclick=()=>pedir([]);
  };
  pintar(); $('sheet').classList.add('open');
}

/* ================= Programa → mapa ================= */
async function verEnMapa(rs){
  if(!rs||!rs.length) return; const f=(S.modo==='docente'&&rs.find(r=>S.cursos.includes(r.curso)))||rs[0];
  if(S.modo==='lider') return fichaActividad(rs,f);   // el líder no usa el mapa del colegio
  ColegioVivo.setDatos(S.prog); ColegioVivo.setAvatar(S.perfil.avatar);
  if(S.modo==='docente'){ irPanel('ruta'); const cv=$('cv'); cv.hidden=false; cv.classList.add('camino'); $('cvVolver').hidden=false; }
  else irPanel('ruta');
  if(S.modo==='org'&&ColegioVivo.ubicacion()){ fichaActividad(rs,f,false); cerrarSheet(); await ColegioVivo.recorrido(f); actualizarBotonesCV(); fichaActividad(rs,f); return; }
  await ColegioVivo.lugar(f); actualizarBotonesCV(); fichaActividad(rs,f);
  if(S.modo==='org') avisoCV('📍 Toca "Marcar dónde estoy" para ver el recorrido desde tu ubicación',4500);
}
function fichaActividad(rs,f,abrir=true){
  const col=AREA_C[f.categoria]||AREA_C.gen, nombre=f.titulo?titA(f.titulo):f.area;
  const sh=$('sheet');
  sh.innerHTML=`<div class="sh" style="background:${col}"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">${fmtHora(f.hora_inicio)} – ${fmtHora(f.hora_fin)} · ${escHTML(f.grado||'')}</div><h3>${escHTML(nombre)}</h3><span class="tag2">${escHTML(f.area||'')}</span></div>
    <div class="sb"><div class="facts"><div class="fact"><small>Salón</small><div>${P(f.salon)}</div></div><div class="fact"><small>Docente a cargo</small><div>${P(f.docente_cargo)}</div></div></div>
    <div class="sec"><h3>Cursos</h3></div>${rs.map(r=>`<div class="rot"><b>${escHTML(r.curso)}</b><span>Salón ${escHTML(r.salon||'—')}<br>${escHTML(r.acompanante||'')}</span></div>`).join('')}
    ${f.frase?`<div class="sec"><h3>Propósito</h3><p>${escHTML(f.frase)}</p></div>`:''}
    ${lideresDe(f).length?`<div class="lidsec"><h3>⭐ Líder${lideresDe(f).length>1?'es':''} de estación</h3><div class="ls">${lideresDe(f).map(l=>`<div class="li">${lidMini(l,24)}${escHTML(lidNombre(l.nombre))}</div>`).join('')}</div></div>`:''}
    <div style="padding:8px 16px" ${S.modo==='lider'?'hidden':''}>${S.modo==='org'?'<button class="btn alt" id="fCam">🧭 Ver recorrido desde donde estoy</button><div style="height:8px"></div>':''}<button class="btn" id="fEnt">🚪 Entrar y ver el salón</button></div></div>`;
  if(abrir) sh.classList.add('open'); $('shX').onclick=cerrarSheet;
  $('fEnt').onclick=()=>{ cerrarSheet(); if(S.modo==='docente') return entrarSalonDocente(f); ColegioVivo.entrar(f); actualizarBotonesCV(); };
  if($('fCam')) $('fCam').onclick=async()=>{ cerrarSheet();
    if(!ColegioVivo.ubicacion()){ S.pend={rs,f}; marcarUbicacion(); return; }
    await ColegioVivo.recorrido(f); actualizarBotonesCV(); };
}
/* ================= Organizador: ubicación ================= */
function avisoCV(t,ms){ const a=$('cvAviso'); if(!a) return; a.textContent=t; a.hidden=!t; clearTimeout(a._h); if(ms) a._h=setTimeout(()=>a.hidden=true,ms); }
function actualizarBotonesCV(){ const org=S.modo==='org'; $('btnUbic').hidden=!org; $('btnQuitar').hidden=S.modo==='docente';
  $('btnUbic').classList.toggle('on',ColegioVivo.marcando()); $('btnUbic').textContent=ColegioVivo.marcando()?'Toca en el mapa dónde estás…':'📍 Marcar dónde estoy'; }
function marcarUbicacion(){
  if(ColegioVivo.marcando()){ ColegioVivo.cancelarMarcar(); actualizarBotonesCV(); avisoCV(''); return; }
  if(S.panel!=='ruta') irPanel('ruta');
  ColegioVivo.marcar(async u=>{ LS.set('steam_ubic_'+S.perfil.id,u); actualizarBotonesCV(); avisoCV('📍 Ubicación: '+u.nombre,2500);
    if(S.pend){ const {rs,f}=S.pend; S.pend=null; await ColegioVivo.recorrido(f); fichaActividad(rs,f); } });
  actualizarBotonesCV(); avisoCV('📍 Toca en el mapa el lugar donde estás');
}

/* ================= Estudiantes y asistencia ================= */
const EST_V={A:['✓','Asistió','#1f9d6b'],N:['✗','No asistió','#e5484d'],T:['⏱','Retardo','#f2a900'],P:['🚪','Permiso de salida','#7b4bd6']};
async function cargarEstudiantes(forzar){
  if(S.est&&!forzar&&!S.asisSucia) return;
  // Supabase entrega máximo 1000 filas por consulta: se piden por páginas
  const todo=async(t,cols,ord)=>{ let out=[]; for(let i=0;;i+=1000){ let q=S.sb.from(t).select(cols); ord.forEach(o=>q=q.order(o)); const r=await q.range(i,i+999); if(r.error) return r; out=out.concat(r.data||[]); if(!r.data||r.data.length<1000) return {data:out}; } };
  const [e,a]=await Promise.all([ todo('sd_estudiantes','id,grado,curso,nombre,orden',['curso','orden','id']), todo('sd_asistencia','*',['estudiante_id']) ]);
  if(e.error) throw e.error; if(a.error) throw a.error;
  S.est=e.data||[]; S.asis={}; (a.data||[]).forEach(x=>S.asis[x.estudiante_id]=x); S.asisSucia=false;
  // v45: estudiantes en actividades del STEM Day (si aún no se ejecutó el SQL 23, la app sigue igual)
  S.enStem={}; S.enStemOk=false; try{ const r=await todo('sd_en_stem','*',['estudiante_id']); if(!r.error){ S.enStemOk=true; (r.data||[]).forEach(x=>S.enStem[x.estudiante_id]=x); } }catch(_){}
}
/* v45 · ¿el estudiante está en una actividad del STEM Day entre h0 y h1? */
function enStem(id,h0,h1){ const r=(S.enStem||{})[id]; if(!r) return null; if(!r.desde||!h0) return r; return (r.desde<(h1||h0)&&h0<(r.hasta||'23:59'))?r:null; }
function stemTxt(r){ return `🔬 En actividad STEM Day: ${r.lugar}${r.desde?` · ${fmtHora(r.desde)} a ${fmtHora(r.hasta||'15:00')}`:' · todo el día'}`; }
/* ---- docente: llamado a lista (v30: inicial con retardos + llamado en cada actividad) ---- */
const MOT_RET=()=>(S.config&&S.config.motivos_retardo)||['Trancón','Cita médica','Calamidad doméstica','Otros'];
const MOT_AUS=()=>(S.config&&S.config.motivos_ausencia)||['Se retira por cita médica','Participará en una actividad del STEM Day','Otros'];
const HORA0=420;   // la jornada inicia a las 7:00
function ahoraISO(){ return _simBase&&!isNaN(_simBase.d) ? new Date(_simBase.d.getTime()+(Date.now()-_simBase.t0)+5*3600e3).toISOString() : new Date().toISOString(); }
function minDe(iso){ if(!iso) return null; const d=new Date(new Date(iso).getTime()-5*3600e3); return d.getUTCHours()*60+d.getUTCMinutes(); }
function hDe(min){ return min==null?'':fmtHora(String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0')); }
const esDirGrupo=s=>/direcci[oó]n de (grupo|curso)/i.test((s.area||'')+' '+(s.titulo||'')+' '+(s.nombre||''))||String(s.h||s.hora_inicio)<'07:30';
function momentosLista(c){ return rutaCurso(c).filter(s=>s.tipo==='actividad'&&!esDirGrupo(s)); }
async function pintarLista2(){
  const el=$('listaPz'); if(!S.cursos.length){ el.innerHTML='<div class="alertbox">Aún no tienes un curso asignado. Usa el botón <b>?</b> de Mi ruta.</div>'; return; }
  if(!S.listaCurso||!S.cursos.includes(S.listaCurso)) S.listaCurso=S.curso||S.cursos[0];
  if(!S.listaMom){ const a=ahora(); const ms=momentosLista(S.listaCurso).filter(s=>a.fecha===S.config.fecha_evento&&toMin(s.h)<=a.min); S.listaMom=ms.length?ms[ms.length-1].h:'inicial'; }
  el.innerHTML='<p class="sm">Cargando estudiantes…</p>';
  { const a=ahora(); if(S.config&&a.fecha<=S.config.fecha_evento) setTimeout(()=>ayudaApoyo(false),900); }   // v58
  try{ await cargarEstudiantes(!S.listaLocal); }catch(e){ el.innerHTML=`<div class="alertbox">No se pudo cargar la lista: ${escHTML(e.message)}</div>`; return; }
  if(!S.listaLocal||S.listaLocal.curso!==S.listaCurso||S.listaLocal.mom!==S.listaMom){
    const L=S.est.filter(x=>x.curso===S.listaCurso);
    if(S.listaMom==='inicial'){
      S.listaLocal={curso:S.listaCurso, mom:'inicial', filas:L.map(x=>{ const a=S.asis[x.id]||{}, st=enStem(x.id,'07:00','07:30'); return {id:x.id,nombre:x.nombre,v:a.estado||(st?'A':null),m:a.motivo||'',d:a.detalle||'',ar:a.apoyo_area||(a.estado==='P'&&a.motivo?'otro':''),li:a.apoyo_lider||'',hl:a.hora_llegada||null,pv:a.previa||null,pp:a.previa_por||null,cpv:'previa' in a,st}; }), cambios:false};
      S.listaLocal.cambios=S.listaLocal.filas.some(f=>f.st&&!S.asis[f.id]);   // v45: los que están en actividad STEM ya vienen como presentes
    } else {
      let act={}; try{ const r=await S.sb.from('sd_asistencia_act').select('*').eq('curso',S.listaCurso); (r.data||[]).forEach(x=>(act[x.hora_inicio]=act[x.hora_inicio]||{})[x.estudiante_id]=x); }catch(e){}
      const prevs=momentosLista(S.listaCurso).map(s=>s.h).filter(h=>h<S.listaMom).reverse(), momF=(momentosLista(S.listaCurso).find(s=>s.h===S.listaMom)||{}).f;
      S.listaLocal={curso:S.listaCurso, mom:S.listaMom, filas:L.map(x=>{ const ini=S.asis[x.id]||{};
        if(ini.estado==='N') return {id:x.id,nombre:x.nombre,fuera:true,v:'N',m:'No asistió a la jornada'};
        const cur=(act[S.listaMom]||{})[x.id]; const ant=prevs.map(h=>(act[h]||{})[x.id]).find(Boolean);
        const base=cur||(ant&&ant.estado==='N'?ant:null);
        return {id:x.id,nombre:x.nombre,v:base?base.estado:'A',m:base?base.motivo||'':'',det:base?base.detalle||{}:{},guardado:!!cur,st:enStem(x.id,S.listaMom,momF)}; }), cambios:!Object.keys(act[S.listaMom]||{}).length};
    }
  }
  dibujarLista('');
}
// v51: los directores y codirectores llaman a lista solo el día del evento
function listaBloqueada(){ const a=ahora(); return !!(S.config&&a.fecha!==S.config.fecha_evento); }
function dibujarLista(filtro){
  const el=$('listaPz'), L=S.listaLocal, ini=L.mom==='inicial';
  const ms=momentosLista(L.curso), a=ahora(), hoy=a.fecha===S.config.fecha_evento, antes=a.fecha<S.config.fecha_evento;
  let h=`${S.cursos.length>1?`<div class="segs">${S.cursos.map(c=>`<span data-c="${escHTML(c)}" class="${c===L.curso?'on':''}">${escHTML(c)}</span>`).join('')}</div>`:''}
    <div class="moms"><span data-m="inicial" class="${ini?'on':''}"><b>7:00</b>Inicio</span>${ms.map(s=>{ const fut=antes||(hoy&&toMin(s.h)>a.min); return `<span data-m="${s.h}" class="${L.mom===s.h?'on':''} ${fut?'fut':''}"><b>${fmtHora(s.h).replace(' ','')}</b>${escHTML(String(s.salon||s.nombre).slice(0,14))}</span>`; }).join('')}</div>`;
  if(ini){
    const c={A:0,N:0,T:0,P:0}; L.filas.forEach(x=>x.v&&c[x.v]++); const pend=L.filas.filter(x=>!x.v).length;
    const dg=rutaCurso(L.curso).find(s=>s.tipo==='actividad');
    h+=`<h3>Llamado a lista · ${escHTML(L.curso)}</h3><div class="sub">${dg?`${escHTML(dg.nombre)} · ${fmtHora(dg.h)} · Salón ${escHTML(dg.salon||'')} · `:''}${L.filas.length} estudiantes · la jornada inicia a las 7:00 a.m.</div>`;
    if(!L.filas.length){ el.innerHTML=h+'<div class="alertbox">Aún no se ha cargado la lista de estudiantes de este curso. El administrador la carga desde Administración → Estudiantes.</div>'; bindSegs(); return; }
    h+=`<div class="cnt">${Object.entries(EST_V).map(([k,[i,t,col]])=>`<div><b style="color:${col}">${c[k]}</b><small>${i} ${t}</small></div>`).join('')}</div>
      <div class="leg">${pend?`⚪ Sin marcar: <b>${pend}</b>`:'✔ Todos marcados'}${L.cambios?' · <b style="color:#b07a00">Cambios sin guardar</b>':''}</div>
      <div class="aphint">🚪 <b>Permiso de salida:</b> si el estudiante sale a apoyar una actividad del STEM Day, elige el <b>área</b> y el <b>docente líder</b> con quien estará. Al guardar, al líder y a los Master les aparece para confirmar que llegó. <a href="#" id="apAyuda">¿Cómo funciona?</a></div>
      ${L.filas.some(x=>x.st)?`<div class="stbox">🔬 <b>${L.filas.filter(x=>x.st).length}</b> estudiante${L.filas.filter(x=>x.st).length>1?'s están':' está'} en actividades del STEM Day: por eso no están en el salón. Ya aparecen como presentes.</div>`:''}
      <input class="srch" id="lBus" placeholder="Buscar estudiante…" value="${escHTML(filtro)}">
      <button class="pbtn alt" id="lTodos">✓ Marcar a los que faltan como "Asistió"</button><div style="height:8px"></div>`;
    L.filas.forEach((x,i)=>{ if(filtro&&!x.nombre.toLowerCase().includes(filtro.toLowerCase())) return;
      const hl=minDe(x.hl), tarde=x.v==='T'&&hl!=null?Math.max(0,hl-HORA0):null;
      h+=`<div class="est"><span class="num">${i+1}</span><div class="nm">${escHTML(x.nombre)}${x.pv?`<small class="pvtag">📌 Reportado por secretaría: ${escHTML(x.pv)}</small>`:''}${x.st?`<small class="sttag">${escHTML(stemTxt(x.st))}</small>`:''}${x.v?`<small style="color:${EST_V[x.v][2]}">${x.v==='T'?'Retardo':EST_V[x.v][1]}${hl!=null&&(x.v==='A'||x.v==='T')?' · llegó '+hDe(hl):''}${tarde!=null?' · '+tarde+' min':''}</small>`:'<small>Sin marcar</small>'}
        ${x.v==='T'?`<select data-mr="${i}"><option value="">Motivo del retardo…</option>${MOT_RET().map(o=>`<option ${x.m===o?'selected':''}>${escHTML(o)}</option>`).join('')}</select>${x.m==='Otros'?`<input data-d="${i}" maxlength="200" placeholder="¿Por qué llegó tarde?" value="${escHTML(x.d)}">`:''}`:''}
        ${x.v==='P'?(()=>{ const O=opcionesApoyo(), ar=O.find(o=>o.area===x.ar);
          return `<select data-ar="${i}" class="apsel"><option value="">¿A qué área apoyará?…</option>${O.map(o=>`<option ${x.ar===o.area?'selected':''}>${escHTML(o.area)}</option>`).join('')}<option value="otro" ${x.ar==='otro'?'selected':''}>Otro motivo (no apoya el STEM Day)</option></select>
          ${ar?`<select data-li="${i}" class="apsel"><option value="">¿Con quién estará?…</option>${ar.lideres.map(l=>`<option value="${l.id}" ${x.li===l.id?'selected':''}>${escHTML(l.n)}</option>`).join('')}</select>`:''}
          ${x.ar==='otro'?`<input data-m="${i}" maxlength="200" placeholder="Motivo del permiso" value="${escHTML(x.m)}">`:''}`; })():''}</div>
        <div class="st">${Object.keys(EST_V).map(k=>`<span data-i="${i}" data-v="${k}" class="${x.v===k?'on':''}" title="${k==='T'?'Retardo':EST_V[k][1]}">${EST_V[k][0]}</span>`).join('')}</div></div>`; });
    h+=`<button class="pbtn" id="lGuardar">Guardar llamado a lista</button>`;
  } else {
    const s=ms.find(x=>x.h===L.mom)||{}; const fut=antes||(hoy&&toMin(L.mom)>a.min);
    const dentro=L.filas.filter(x=>!x.fuera), aus=dentro.filter(x=>x.v==='N').length;
    h+=`<h3>${escHTML(s.nombre||'Actividad')} · ${escHTML(L.curso)}</h3><div class="sub">${fmtHora(s.h)} – ${fmtHora(s.f)} · ${escHTML(s.salon||'')} · llama a lista 5 minutos después de llegar</div>`;
    if(fut&&!antes) h+=`<div class="alertbox">Esta actividad aún no empieza. Podrás llamar a lista cuando lleguen a ${escHTML(s.salon||'la estación')}.</div>`;
    if(!L.filas.length){ el.innerHTML=h+'<div class="alertbox">Aún no se ha cargado la lista de estudiantes de este curso.</div>'; bindSegs(); bindMoms(); return; }
    h+=`<div class="cnt c2"><div><b style="color:#1f9d6b">${dentro.length-aus}</b><small>✓ Presentes</small></div><div><b style="color:#e5484d">${aus}</b><small>✗ No están</small></div></div>
      ${L.filas.some(x=>x.st&&!x.fuera)?`<div class="stbox">🔬 <b>${L.filas.filter(x=>x.st&&!x.fuera).length}</b> en actividades del STEM Day a esta hora: no estarán en el salón y cuentan como presentes.</div>`:''}
      <div class="leg">Todos aparecen como presentes. Toca ✗ solo en quien no esté y elige el motivo.${L.cambios?' · <b style="color:#b07a00">Sin guardar</b>':''}</div>
      <input class="srch" id="lBus" placeholder="Buscar estudiante…" value="${escHTML(filtro)}">`;
    L.filas.forEach((x,i)=>{ if(x.fuera||(filtro&&!x.nombre.toLowerCase().includes(filtro.toLowerCase()))) return;
      const d=x.det||{};
      h+=`<div class="est"><span class="num">${i+1}</span><div class="nm">${escHTML(x.nombre)}${x.st?`<small class="sttag">${escHTML(stemTxt(x.st))}</small>`:''}<small style="color:${x.v==='N'?'#e5484d':'#1f9d6b'}">${x.v==='N'?'No está':'Presente'}</small>
        ${x.v==='N'?`<select data-ma="${i}"><option value="">¿Por qué no está?…</option>${MOT_AUS().map(o=>`<option ${x.m===o?'selected':''}>${escHTML(o)}</option>`).join('')}</select>
          ${/STEM/.test(x.m)?`<input data-dd="${i}" data-f="docente" maxlength="120" placeholder="Docente del STEM Day al que apoya" value="${escHTML(d.docente||'')}"><input data-dd="${i}" data-f="lugar" maxlength="120" placeholder="Lugar a donde se dirige" value="${escHTML(d.lugar||'')}">`:''}
          ${x.m==='Otros'?`<input data-dd="${i}" data-f="texto" maxlength="200" placeholder="Escribe el motivo" value="${escHTML(d.texto||'')}">`:''}`:''}</div>
        <div class="st s2"><span data-i="${i}" data-v="A" class="${x.v==='A'?'on':''}">✓</span><span data-i="${i}" data-v="N" class="${x.v==='N'?'on':''}">✗</span></div></div>`; });
    const fuera=L.filas.filter(x=>x.fuera); if(fuera.length) h+=`<details class="fuera"><summary>No asistieron a la jornada (${fuera.length})</summary>${fuera.map(x=>`<div class="est"><div class="nm">${escHTML(x.nombre)}<small>Marcado en el llamado de las 7:00</small></div></div>`).join('')}</details>`;
    h+=`<button class="pbtn" id="lGuardar" ${fut&&!antes?'disabled':''}>Guardar llamado de esta actividad</button>`;
  }
  if(listaBloqueada()) h=`<div class="alertbox" style="margin-bottom:10px">🔒 El llamado a lista se habilita el <b>${escHTML(fechaLarga(S.config.fecha_evento))}</b>, día del STEM Day. Mientras tanto puedes revisar la lista de tu curso.</div>`+h;
  const st=$('p-lista').scrollTop; el.innerHTML=h; $('p-lista').scrollTop=st; bindSegs(); bindMoms();
  if(listaBloqueada()){ el.classList.add('lbloq'); el.querySelectorAll('#lGuardar,#lTodos').forEach(b=>{ b.disabled=true; }); return; } else el.classList.remove('lbloq');
  el.querySelectorAll('.st span').forEach(e=>e.onclick=()=>{ const x=L.filas[+e.dataset.i];
    if(ini){ const nv=x.v===e.dataset.v?null:e.dataset.v; if((nv==='A'||nv==='T')&&!x.hl) x.hl=ahoraISO(); if(!nv||nv==='N') x.hl=null; if(nv!=='T'&&nv!=='P'){ x.m=''; x.d=''; } if(nv!=='P'){ x.ar=''; x.li=''; } x.v=nv; }
    else { x.v=e.dataset.v; if(x.v==='A'){ x.m=''; x.det={}; } }
    L.cambios=true; dibujarLista($('lBus').value); });
  el.querySelectorAll('[data-m]').forEach(e=>e.oninput=()=>{ L.filas[+e.dataset.m].m=e.value; L.cambios=true; });
  el.querySelectorAll('[data-mr]').forEach(e=>e.onchange=()=>{ L.filas[+e.dataset.mr].m=e.value; L.cambios=true; dibujarLista($('lBus').value); });
  el.querySelectorAll('[data-d]').forEach(e=>e.oninput=()=>{ L.filas[+e.dataset.d].d=e.value; L.cambios=true; });
  el.querySelectorAll('[data-ma]').forEach(e=>e.onchange=()=>{ L.filas[+e.dataset.ma].m=e.value; L.cambios=true; dibujarLista($('lBus').value); });
  el.querySelectorAll('[data-ar]').forEach(e=>e.onchange=()=>{ const x=L.filas[+e.dataset.ar]; x.ar=e.value; x.li=''; if(x.ar!=='otro') x.m=''; L.cambios=true; dibujarLista($('lBus').value); });
  el.querySelectorAll('[data-li]').forEach(e=>e.onchange=()=>{ L.filas[+e.dataset.li].li=e.value; L.cambios=true; });
  if($('apAyuda')) $('apAyuda').onclick=e=>{ e.preventDefault(); ayudaApoyo(true); };
  el.querySelectorAll('[data-dd]').forEach(e=>e.oninput=()=>{ const x=L.filas[+e.dataset.dd]; x.det={...(x.det||{}),[e.dataset.f]:e.value}; L.cambios=true; });
  $('lBus').oninput=e=>{ const v=e.target.value; dibujarLista(v); const b=$('lBus'); b.focus(); b.setSelectionRange(v.length,v.length); };
  if($('lTodos')) $('lTodos').onclick=()=>{ L.filas.forEach(x=>{ if(!x.v){ x.v='A'; x.hl=x.hl||ahoraISO(); } }); L.cambios=true; dibujarLista(''); };
  $('lGuardar').onclick=ini?guardarLista:guardarListaAct;
}
function bindSegs(){ $('listaPz').querySelectorAll('.segs [data-c]').forEach(e=>e.onclick=()=>{ if(S.listaLocal&&S.listaLocal.cambios&&S.listaLocal.mom==='inicial'&&!confirm('Hay cambios sin guardar. ¿Cambiar de curso de todas formas?')) return; S.listaCurso=e.dataset.c; S.listaLocal=null; S.listaMom=null; pintarLista2(); }); }
function bindMoms(){ $('listaPz').querySelectorAll('.moms [data-m]').forEach(e=>e.onclick=()=>{ S.listaMom=e.dataset.m; S.listaLocal=null; pintarLista2(); }); }
async function guardarLista(){
  if(listaBloqueada()) return toast('El llamado a lista se habilita el día del evento.','bad');
  const L=S.listaLocal, falta=L.filas.filter(x=>x.v==='T'&&!x.m);
  if(falta.length) return toast(`Elige el motivo del retardo de ${falta.length===1?falta[0].nombre:falta.length+' estudiantes'}.`,'bad',3800);
  const fp=L.filas.filter(x=>x.v==='P'&&(!x.ar||(x.ar!=='otro'&&!x.li)));   // v58
  if(fp.length) return toast(`${fp.length===1?fp[0].nombre:fp.length+' estudiantes'}: elige el área y el docente líder con quien estará${fp.length===1?'':'n'}.`,'bad',4200);
  const lidN=id=>((S.lid||{})[id]||{}).nombre||'';
  const filas=L.filas.filter(x=>x.v).map(x=>{ const hl=(x.v==='A'||x.v==='T')?(x.hl||ahoraISO()):null, ap=x.v==='P'&&x.ar&&x.ar!=='otro';
    return {estudiante_id:x.id,curso:L.curso,estado:x.v,motivo:ap?`Apoya ${x.ar} con ${lidN(x.li)}`.slice(0,200):(x.v==='P'||x.v==='T')&&x.m?x.m.slice(0,200):null,detalle:x.v==='T'&&x.m==='Otros'&&x.d?x.d.slice(0,200):null,
      ...(S.apoyoCols!==false?{apoyo_area:ap?x.ar:null,apoyo_lider:ap?x.li:null,apoyo_lider_nombre:ap?lidN(x.li):null,hora_salida:x.v==='P'?(S.asis[x.id]&&S.asis[x.id].hora_salida)||ahoraISO():null}:{}),
      hora_llegada:hl,retardo_min:x.v==='T'&&hl?Math.max(0,minDe(hl)-HORA0):null,registrado_por:S.perfil.id,actualizado_en:new Date().toISOString(),
      ...(x.cpv?{previa:x.v==='N'?x.pv:null,previa_por:x.v==='N'?x.pp:null}:{}),...(x.v==='N'&&x.pv?{motivo:x.pv}:{})}; });
  const quitar=L.filas.filter(x=>!x.v&&S.asis[x.id]).map(x=>x.id);
  $('lGuardar').disabled=true; $('lGuardar').textContent='Guardando…';
  let err=null;
  if(filas.length){ const r=await S.sb.from('sd_asistencia').upsert(filas,{onConflict:'estudiante_id'}); err=r.error;
    if(err&&/apoyo_|hora_salida/.test(err.message)){ err={message:'falta ejecutar el archivo 32 en Supabase (permiso de salida con área y líder)'}; } }
  if(!err&&quitar.length){ const r=await S.sb.from('sd_asistencia').delete().in('estudiante_id',quitar); err=r.error; }
  if(err){ toast('No se pudo guardar: '+err.message,'bad',5000); dibujarLista(''); return; }
  filas.forEach(f=>S.asis[f.estudiante_id]=f); quitar.forEach(id=>delete S.asis[id]); L.cambios=false; AP.t=0;
  if(filas.some(f=>f.apoyo_lider)&&window.avisarYa) avisarYa();
  const pend=L.filas.filter(x=>!x.v).length;
  toast(pend?`Guardado. Faltan ${pend} por marcar.`:'Llamado a lista guardado ✓','ok',3500); dibujarLista('');
}
async function guardarListaAct(){
  if(listaBloqueada()) return toast('El llamado a lista se habilita el día del evento.','bad');
  const L=S.listaLocal, dentro=L.filas.filter(x=>!x.fuera), falta=dentro.filter(x=>x.v==='N'&&!x.m);
  if(falta.length) return toast(`Elige por qué no está ${falta.length===1?falta[0].nombre:'cada estudiante marcado con ✗'}.`,'bad',3800);
  const inc=dentro.filter(x=>x.v==='N'&&/STEM/.test(x.m)&&(!(x.det||{}).docente||!(x.det||{}).lugar));
  if(inc.length) return toast('Escribe el docente y el lugar de la actividad del STEM Day.','bad',3800);
  const filas=dentro.map(x=>({estudiante_id:x.id,curso:L.curso,hora_inicio:L.mom,estado:x.v,motivo:x.v==='N'?x.m:null,detalle:x.v==='N'?(x.det||{}):null,registrado_por:S.perfil.id,actualizado_en:new Date().toISOString()}));
  $('lGuardar').disabled=true; $('lGuardar').textContent='Guardando…';
  const r=await S.sb.from('sd_asistencia_act').upsert(filas,{onConflict:'estudiante_id,hora_inicio'});
  if(r.error){ toast('No se pudo guardar: '+r.error.message,'bad',5000); dibujarLista(''); return; }
  L.cambios=false; toast(`Llamado guardado ✓ · ${filas.filter(f=>f.estado==='N').length} no están`,'ok',3500); dibujarLista('');
}
/* ---- v28: llegadas confirmadas por los líderes en la rotación actual ---- */
function llegadasHTML(){
  const m=minAhora(); if(m<0||m>=9999) return '';
  const act=S.prog.filter(r=>r.tipo==='actividad'&&(r.lideres||[]).length&&toMin(r.hora_inicio)<=m&&m<toMin(r.hora_fin)); if(!act.length) return '';
  const ok=act.filter(r=>S.llegadas&&S.llegadas[r.curso+'|'+r.hora_inicio]), pend=act.filter(r=>!ok.includes(r)).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
  return `<div class="llcard"><div class="k">🚩 Llegadas a las estaciones · ahora</div><b>${ok.length} de ${act.length}</b> grupos confirmados por los líderes
    ${pend.length?`<div class="llp">${pend.slice(0,30).map(r=>`<span title="${escHTML(r.salon||'')}">${escHTML(r.curso)} → ${escHTML(r.salon||'')}${m-toMin(r.hora_inicio)>=5?' ⚠':''}</span>`).join('')}</div><small>⚠ = lleva 5 minutos o más sin confirmar</small>`:'<div class="sm">✓ Todos los grupos llegaron.</div>'}</div>`;
}
/* ---- resumen: administración, Master y organizadores ---- */
async function pintarAsis(grado){
  const el=$('asisPz'); if(grado!==undefined) S.asisGrado=grado; grado=S.asisGrado||'Todos';
  if(!S.est) el.innerHTML='<p class="sm">Cargando asistencia…</p>';
  try{ await cargarEstudiantes(); }catch(e){ el.innerHTML=`<div class="alertbox">No se pudo cargar: ${escHTML(e.message)}</div>`; return; }
  if(S.asisVista==='act'&&esOrgM()) return pintarAsisAct();
  if(S.asisVista==='previas'&&(S.perfil.rol==='admin'||S.modo==='sec')) return pintarPrevias();
  if(S.asisVista==='stem'&&esOrgM()) return pintarEnStem();
  if(S.asisVista==='may'&&window.mayPuedeTodos&&mayPuedeTodos()) return pintarMayores();
  if(S.asisVista==='apo') return pintarApoyos();
  if(S.asisCurso) return detalleAsis(S.asisCurso);
  const cursos=[...new Set(S.est.map(x=>x.curso))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true})), GR={}; S.est.forEach(x=>GR[x.curso]=x.grado);
  const ORDG=['transicion','primero','segundo','tercero','cuarto','quinto','sexto','septimo','octavo','noveno','decimo','undecimo'], og=g=>{ const i=ORDG.indexOf(String(g).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()); return i<0?99:i; };
  const grados=[...new Set(S.est.map(x=>x.grado))].sort((a,b)=>og(a)-og(b)||String(a).localeCompare(b)), cs=cursos.filter(c=>grado==='Todos'||GR[c]===grado);
  const cuenta=c=>{ const r={A:0,N:0,T:0,P:0,S:0,n:0}; S.est.forEach(x=>{ if(x.curso!==c) return; r.n++; const a=S.asis[x.id]; a?r[a.estado]++:r.S++; }); return r; };
  const tot={A:0,N:0,T:0,P:0,S:0}; const rs=cs.map(c=>{ const r=cuenta(c); for(const k in tot) tot[k]+=r[k]; return [c,r]; });
  let h=(S.modo==='sec'?'':llegadasHTML())+(esOrgM()?`<div class="segs"><span class="on">🕖 Llamado de las 7:00</span><span id="aVAct">📋 Por actividad</span></div>`:'')+`<h3>Asistencia · inicio de la jornada</h3><div class="sub">Se actualiza en tiempo real a medida que los directores de curso guardan su lista.</div>`;
  if(!S.est.length){ el.innerHTML=h+'<div class="alertbox">Aún no se ha cargado la lista de estudiantes (Administración → Estudiantes).</div>'; return; }
  if(S.perfil.rol==='admin'||S.modo==='sec'){ const np=S.est.filter(x=>(S.asis[x.id]||{}).previa).length; h+=`<div class="pvcard" id="aPrev"><b>📌 Ausencias anunciadas para el 23</b><span>${np?`${np} estudiante${np>1?'s':''} marcado${np>1?'s':''} · `:''}Marca a quienes ya se sabe que no vendrán. Le aparecen marcados al director de curso.</span><i>›</i></div>`; }
  { const n=(AP.lista||[]).length; h+=`<div class="pvcard apcard2" id="aApo"><b>🙋 Estudiantes de apoyo · permiso de salida</b><span>${n?`${n} estudiante${n>1?'s':''} · `:''}Con qué líder está cada uno. Confirma que llegaron.</span></div>`; }
  if(window.mayPuedeTodos&&mayPuedeTodos()){ const M=window.MAY||{}, n=(M.est||[]).length; h+=`<div class="pvcard maycard" id="aMay"><b>🎓 Décimo y undécimo · llamado a lista</b><span>${n?`${n} estudiantes · `:''}Dónde está cada estudiante (con su líder o en Logística) y su asistencia en cada momento.</span><i>›</i></div>`; }
  if(esOrgM()&&!S.vistaComo){ const ns=Object.keys(S.enStem||{}).length; h+=`<div class="pvcard stcard" id="aStem"><b>🔬 Estudiantes en actividades del STEM Day</b><span>${ns?`${ns} estudiante${ns>1?'s':''} marcado${ns>1?'s':''} · `:''}Marca a quienes estarán apoyando actividades. Su docente los ve en la lista con el aviso y como presentes.</span><i>›</i></div>`; }
  h+=`<div class="cnt">${Object.entries(EST_V).map(([k,[i,t,col]])=>`<div><b style="color:${col}">${tot[k]}</b><small>${i} ${t}</small></div>`).join('')}</div>
    <div class="leg">⚪ Sin marcar: <b>${tot.S}</b> · Cursos: <b>${cs.length}</b></div>
    <div class="segs wrap">${['Todos',...grados].map(g=>`<span data-g="${escHTML(g)}" class="${g===grado?'on':''}">${escHTML(g)}</span>`).join('')}</div>`;
  rs.forEach(([c,r])=>{ h+=`<div class="crs" data-c="${escHTML(c)}"><div class="t"><b>${escHTML(c)}</b><span>${r.S===r.n?'<span class="pend">Sin llamado aún</span>':`✓${r.A} · ⏱${r.T} · 🚪${r.P} · ✗${r.N}${r.S?` · ⚪${r.S}`:''}`}</span></div>
    <div class="bar">${['A','T','P','N'].map(k=>`<i style="width:${r[k]/r.n*100}%;background:${EST_V[k][2]}"></i>`).join('')}</div></div>`; });
  if(S.perfil.rol==='admin'||S.modo==='sec'||esOrgM()) h+=`<div class="dlbox ofi"><b>📗 Llenar el archivo oficial de asistencia</b>
    <p class="sm" style="margin:4px 0 8px">Elige el Excel de asistencia del año (el mismo de siempre). La app llena la hoja de <b>octubre</b>, columna del <b>23 de octubre</b>: <b>X</b> = no asistió · <b>hora</b> = asistió (hora del llamado) · <b>hora en amarillo</b> = retardo, con el motivo en OBSERVACIÓN. El archivo no sale de este equipo.</p>
    <button class="b1" id="ofiBtn">📂 Elegir el archivo y descargarlo lleno</button><input type="file" id="ofiFx" accept=".xlsx" hidden><div id="ofiRes"></div>
    <details style="margin-top:10px"><summary class="sm">Otras descargas (resumen de la app)</summary><div class="row" style="margin-top:6px"><button class="b2" data-dl="todo">Completa</button>${grado!=='Todos'?`<button class="b2" data-dl="grado">${escHTML(grado)}</button>`:''}<button class="b2" data-dl="cursos">Una hoja por curso</button></div></details></div>`;
  if(S.perfil.rol==='admin'&&!S.vistaComo) h+=`<div class="dlbox" style="margin-top:12px;border-color:#f3c0c0;background:#fff6f6"><b>🗑 Borrar llamados a lista</b>
    <p class="sm" style="margin:4px 0 8px">Para limpiar pruebas o repetir un llamado. Las ausencias anunciadas por la secretaría se conservan. No se puede deshacer.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><select id="blC"><option value="">Todos los cursos</option>${cursos.map(c=>`<option>${escHTML(c)}</option>`).join('')}</select>
    <select id="blQ"><option value="todo">Llamado de las 7:00 y de cada actividad</option><option value="inicio">Solo el llamado de las 7:00</option><option value="actividades">Solo los llamados por actividad</option></select>
    <button class="b2" id="blOk" style="border-color:#e5484d;color:#e5484d">Borrar</button></div></div>`;
  el.innerHTML=h;
  if($('blOk')) $('blOk').onclick=async()=>{ const c=$('blC').value, q=$('blQ').value, txt={todo:'todos los llamados',inicio:'el llamado de las 7:00',actividades:'los llamados por actividad'}[q];
    if(!confirm(`¿Borrar ${txt} de ${c?'el curso '+c:'TODOS los cursos'}? No se puede deshacer.`)) return;
    const r=await S.sb.rpc('sd_borrar_llamados',{p_cursos:c?[c]:null,p_que:q});
    if(r.error) return toast('No se pudo borrar: '+(/sd_borrar_llamados/.test(r.error.message)?'falta ejecutar el archivo 28 en Supabase.':r.error.message),'bad',5000);
    toast(`Borrado: ${r.data.inicio} del llamado de las 7:00 · ${r.data.actividades} de actividades`,'ok',4500); S.asisSucia=true; S.listaLocal=null; pintarAsis(); };
  el.querySelectorAll('[data-g]').forEach(e=>e.onclick=()=>pintarAsis(e.dataset.g));
  el.querySelectorAll('[data-c]').forEach(e=>e.onclick=()=>{ S.asisCurso=e.dataset.c; detalleAsis(e.dataset.c); });
  if($('ofiBtn')){ $('ofiBtn').onclick=()=>$('ofiFx').click(); $('ofiFx').onchange=()=>{ const f=$('ofiFx').files[0]; $('ofiFx').value=''; if(f) llenarOficial(f); }; }
  el.querySelectorAll('[data-dl]').forEach(b=>b.onclick=()=>descargarAsistencia(b.dataset.dl==='grado'?{grado}:b.dataset.dl==='cursos'?{porCurso:true}:{}));
  if($('aVAct')) $('aVAct').onclick=()=>{ S.asisVista='act'; pintarAsis(); };
  if($('aPrev')) $('aPrev').onclick=()=>{ S.asisVista='previas'; pintarAsis(); };
  if($('aStem')) $('aStem').onclick=()=>{ S.asisVista='stem'; pintarAsis(); };
  if($('aMay')) $('aMay').onclick=()=>{ S.asisVista='may'; pintarAsis(); };
  if($('aApo')) $('aApo').onclick=()=>{ S.asisVista='apo'; pintarAsis(); };
}
/* v45 · Administración y Máster Coordinadores: estudiantes que estarán en actividades del STEM Day */
function pintarEnStem(){
  const el=$('asisPz'), E=S.enStem||{}; S.stSel=S.stSel||new Set();
  const F=S.stF=S.stF||{lugar:'',modo:'dia',desde:'08:00',hasta:'10:00'};
  const nq=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const cursos=[...new Set(S.est.map(x=>x.curso))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
  const q=S.stQ||'', qn=nq(q).trim(), cur=S.stCurso||'';
  const lista=qn.length>=3?S.est.filter(x=>nq(x.curso+' '+x.nombre).includes(qn)).slice(0,40):cur?S.est.filter(x=>x.curso===cur):[];
  const n=S.stSel.size;
  let h=`<div class="sub"><a href="#" id="stVol">← Volver a la asistencia</a></div><h3>🔬 Estudiantes en actividades del STEM Day</h3>
    <div class="sub">Elige a los estudiantes que el día del evento estarán apoyando una actividad. Su director de curso y su codirector los ven en la lista con el aviso <b>«En actividad STEM Day»</b> y ya marcados como presentes, solo en el horario que indiques.</div>
    ${S.enStemOk?'':'<div class="warnbox">Falta ejecutar el archivo <b>23-estudiantes-stem-y-chat.sql</b> en Supabase. Sin él no se pueden guardar.</div>'}
    <div class="stform"><b>1. Elige los estudiantes</b>
      <select id="stCur"><option value="">Elige un curso…</option>${cursos.map(c=>`<option ${c===cur?'selected':''}>${escHTML(c)}</option>`).join('')}</select>
      <input class="srch" id="stBus" placeholder="…o busca por nombre (mín. 3 letras)" value="${escHTML(q)}">
      ${cur&&!qn?`<button class="b2 sm" id="stTodo">Seleccionar todo ${escHTML(cur)}</button>`:''}
      <div class="stl">${lista.map(x=>`<label class="pvchk"><input type="checkbox" data-s="${x.id}" ${S.stSel.has(x.id)?'checked':''}> <b>${escHTML(x.curso)}</b> · ${escHTML(x.nombre)}${E[x.id]?`<small class="sttag">${escHTML(stemTxt(E[x.id]))}</small>`:''}</label>`).join('')}
        ${qn.length>=3&&!lista.length?'<p class="sm">No encontré estudiantes con ese nombre.</p>':''}${!qn&&!cur?'<p class="sm">Elige un curso o escribe un nombre.</p>':''}</div>
      <b>2. ¿En qué actividad y a qué hora?</b>
      <input id="stLug" maxlength="160" placeholder="Actividad o lugar (ej. Apoyo en Robótica · Coliseo)" value="${escHTML(F.lugar)}">
      <div class="stmodo"><label><input type="radio" name="stM" value="dia" ${F.modo==='dia'?'checked':''}> Todo el día</label><label><input type="radio" name="stM" value="horas" ${F.modo==='horas'?'checked':''}> Solo unas horas</label></div>
      ${F.modo==='horas'?`<div class="sthoras">Desde <input type="time" id="stDe" min="07:00" max="15:30" step="300" value="${F.desde}"> hasta <input type="time" id="stHa" min="07:00" max="15:30" step="300" value="${F.hasta}"></div>`:''}
      <div class="stsel">${n?`<b>${n}</b> seleccionado${n>1?'s':''} · <a href="#" id="stLimp">quitar selección</a>`:'Nadie seleccionado'}</div>
      <button class="b1" id="stOk" ${n&&S.enStemOk?'':'disabled'}>Marcar ${n||''} estudiante${n===1?'':'s'}</button></div>`;
  const M=S.est.filter(x=>E[x.id]), porC={}; M.forEach(x=>(porC[x.curso]=porC[x.curso]||[]).push(x));
  h+=`<h4 style="margin:16px 0 6px">Marcados (${M.length})</h4>${M.length?'':'<p class="sm">Aún no hay estudiantes marcados.</p>'}`;
  Object.keys(porC).sort((a,b)=>a.localeCompare(b,'es',{numeric:true})).forEach(c=>{ h+=`<div class="pvgr"><b>${escHTML(c)}</b>${porC[c].map(x=>`<div class="est"><div class="nm">${escHTML(x.nombre)}<small class="sttag">${escHTML(stemTxt(E[x.id]))}</small>${E[x.id].por_nombre?`<small>Marcado por ${escHTML(E[x.id].por_nombre)}</small>`:''}</div><button class="b2 sm" data-sq="${x.id}">Quitar</button></div>`).join('')}</div>`; });
  el.innerHTML=h;
  $('stVol').onclick=e=>{ e.preventDefault(); S.asisVista=null; pintarAsis(); };
  $('stCur').onchange=e=>{ S.stCurso=e.target.value; S.stQ=''; pintarEnStem(); };
  $('stBus').oninput=e=>{ S.stQ=e.target.value; pintarEnStem(); const b=$('stBus'); b.focus(); b.setSelectionRange(b.value.length,b.value.length); };
  if($('stTodo')) $('stTodo').onclick=()=>{ lista.forEach(x=>S.stSel.add(x.id)); pintarEnStem(); };
  el.querySelectorAll('[data-s]').forEach(c=>c.onchange=()=>{ const id=+c.dataset.s; c.checked?S.stSel.add(id):S.stSel.delete(id); pintarEnStem(); });
  $('stLug').oninput=e=>{ F.lugar=e.target.value; };
  el.querySelectorAll('[name=stM]').forEach(r=>r.onchange=()=>{ F.modo=r.value; pintarEnStem(); });
  if($('stDe')){ $('stDe').onchange=e=>{ F.desde=e.target.value; }; $('stHa').onchange=e=>{ F.hasta=e.target.value; }; }
  if($('stLimp')) $('stLimp').onclick=e=>{ e.preventDefault(); S.stSel.clear(); pintarEnStem(); };
  $('stOk').onclick=async()=>{
    const lugar=F.lugar.trim(); if(!lugar) return toast('Escribe la actividad o el lugar','bad');
    if(F.modo==='horas'&&!(F.desde&&F.hasta&&F.desde<F.hasta)) return toast('Revisa las horas: «hasta» debe ser después de «desde»','bad');
    const filas=[...S.stSel].map(id=>S.est.find(x=>x.id===id)).filter(Boolean).map(x=>({estudiante_id:x.id,curso:x.curso,lugar:lugar.slice(0,160),desde:F.modo==='horas'?F.desde:null,hasta:F.modo==='horas'?F.hasta:null,registrado_por:S.perfil.id,por_nombre:S.perfil.nombre||null,creado_en:new Date().toISOString()}));
    $('stOk').disabled=true; $('stOk').textContent='Guardando…';
    const r=await S.sb.from('sd_en_stem').upsert(filas,{onConflict:'estudiante_id'});
    if(r.error){ toast('No se pudo guardar: '+r.error.message,'bad',5000); pintarEnStem(); return; }
    filas.forEach(f=>S.enStem[f.estudiante_id]=f); S.stSel.clear(); toast(`${filas.length} estudiante${filas.length>1?'s':''} marcado${filas.length>1?'s':''} ✓`,'ok'); pintarEnStem(); };
  el.querySelectorAll('[data-sq]').forEach(b=>b.onclick=async()=>{ const id=+b.dataset.sq, x=S.est.find(e=>e.id===id); if(!confirm(`¿Quitar a ${x.nombre} de las actividades del STEM Day?`)) return;
    const r=await S.sb.from('sd_en_stem').delete().eq('estudiante_id',id); if(r.error) return toast(r.error.message,'bad'); delete S.enStem[id]; pintarEnStem(); });
}
/* v32 · Secretaría: ausencias anunciadas antes del 23 (aparecen marcadas en la lista del director de curso) */
const MOT_PREV=['Viaje familiar','Permiso deportivo','Incapacidad médica','Calamidad doméstica','Otros'];
async function guardarPrevia(x,texto){
  const fila={estudiante_id:x.id,curso:x.curso,estado:'N',motivo:texto,detalle:null,hora_llegada:null,retardo_min:null,previa:texto,previa_por:S.perfil.nombre||'Secretaría',registrado_por:S.perfil.id,actualizado_en:new Date().toISOString()};
  const r=await S.sb.from('sd_asistencia').upsert(fila,{onConflict:'estudiante_id'});
  if(r.error) throw new Error(/previa/.test(r.error.message)?'Falta ejecutar el archivo 17-ausencias-anunciadas.sql en Supabase.':r.error.message);
  S.asis[x.id]=fila;
}
function pintarPrevias(){
  const el=$('asisPz'), q=S.prevQ||'', P=S.est.filter(x=>(S.asis[x.id]||{}).previa);
  const qn=q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''), hits=qn.length<3?[]:S.est.filter(x=>`${x.curso} ${x.nombre}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').includes(qn)).slice(0,25);
  let h=`<div class="sub"><a href="#" id="pvVol">← Volver a la asistencia</a></div><h3>📌 Ausencias anunciadas · 23 de octubre</h3>
    <div class="sub">Estudiantes que ya se sabe que no vendrán (viaje, permiso, incapacidad…). Quedan marcados como <b>No asistió</b> en la lista del director de curso, con el motivo. Si el estudiante llega, el docente puede cambiarlo.</div>
    <div class="dlbox"><b>📂 Traer las X que ya están en el archivo de asistencia</b><p class="sm" style="margin:0 0 8px">Elige el Excel de asistencia del año: la app busca las X ya puestas en la columna del 23/10 y te las muestra para confirmarlas.</p>
      <button class="b2" id="pvArch">Elegir el archivo</button><input type="file" id="pvFx" accept=".xlsx" hidden><div id="pvRes"></div></div>
    <input class="srch" id="pvBus" placeholder="Buscar estudiante por nombre o curso (mín. 3 letras)…" value="${escHTML(q)}">`;
  hits.forEach(x=>{ const a=S.asis[x.id]||{}, ab=S.prevAbierto===x.id;
    h+=`<div class="est pvh"><div class="nm"><b>${escHTML(x.curso)}</b> · ${escHTML(x.nombre)}${a.previa?`<small class="pvtag">📌 ${escHTML(a.previa)}</small>`:''}
      ${ab?`<select id="pvMot"><option value="">Motivo…</option>${MOT_PREV.map(o=>`<option>${escHTML(o)}</option>`).join('')}</select><input id="pvTx" maxlength="160" placeholder="Detalle (ej. viaje del 14 al 23)"><button class="b1 sm" id="pvOk">Marcar ausente el 23</button>`:''}</div>
      ${a.previa?'':`<button class="b2 sm" data-pa="${x.id}">${ab?'Cancelar':'＋ Marcar'}</button>`}</div>`; });
  if(qn.length>=3&&!hits.length) h+='<p class="sm">No encontré estudiantes con ese nombre.</p>';
  h+=`<h4 style="margin:16px 0 6px">Marcados (${P.length})</h4>`;
  if(!P.length) h+='<p class="sm">Aún no hay ausencias anunciadas.</p>';
  const porC={}; P.forEach(x=>(porC[x.curso]=porC[x.curso]||[]).push(x));
  Object.keys(porC).sort((a,b)=>a.localeCompare(b,'es',{numeric:true})).forEach(c=>{ h+=`<div class="pvgr"><b>${escHTML(c)}</b>${porC[c].map(x=>{ const a=S.asis[x.id]; return `<div class="est"><div class="nm">${escHTML(x.nombre)}<small class="pvtag">📌 ${escHTML(a.previa)}${a.previa_por?' · '+escHTML(a.previa_por):''}</small></div><button class="b2 sm" data-pq="${x.id}">Quitar</button></div>`; }).join('')}</div>`; });
  el.innerHTML=h;
  $('pvVol').onclick=e=>{ e.preventDefault(); S.asisVista=null; pintarAsis(); };
  $('pvBus').oninput=e=>{ S.prevQ=e.target.value; S.prevAbierto=null; pintarPrevias(); const b=$('pvBus'); b.focus(); b.setSelectionRange(b.value.length,b.value.length); };
  el.querySelectorAll('[data-pa]').forEach(b=>b.onclick=()=>{ const id=+b.dataset.pa; S.prevAbierto=S.prevAbierto===id?null:id; pintarPrevias(); });
  if($('pvOk')) $('pvOk').onclick=async()=>{ const m=$('pvMot').value, t=$('pvTx').value.trim(); if(!m) return toast('Elige el motivo','bad');
    const x=S.est.find(e=>e.id===S.prevAbierto); $('pvOk').disabled=true;
    try{ await guardarPrevia(x,[m,t].filter(Boolean).join(': ')); toast(`${x.nombre} quedó marcado`,'ok'); S.prevAbierto=null; pintarPrevias(); }catch(e){ toast(e.message,'bad',5000); $('pvOk').disabled=false; } };
  el.querySelectorAll('[data-pq]').forEach(b=>b.onclick=async()=>{ const id=+b.dataset.pq, x=S.est.find(e=>e.id===id); if(!confirm(`¿Quitar la ausencia anunciada de ${x.nombre}?`)) return;
    const r=await S.sb.from('sd_asistencia').delete().eq('estudiante_id',id); if(r.error) return toast(r.error.message,'bad'); delete S.asis[id]; pintarPrevias(); });
  $('pvArch').onclick=()=>$('pvFx').click();
  $('pvFx').onchange=async()=>{ const f=$('pvFx').files[0]; $('pvFx').value=''; if(!f) return; const res=$('pvRes'); res.innerHTML='<p class="sm">Leyendo el archivo…</p>';
    try{ await cargarJSZip(); const fecha=(S.config&&S.config.fecha_evento)||'2026-10-23';
      const N=await AsisOficial.leerNovedades(await f.arrayBuffer(),{fecha});
      const recs=S.est.map(x=>({id:x.id,curso:x.curso,nombre:x.nombre})), bus=AsisOficial.emparejador(recs);
      const ok=[], no=[]; N.forEach(n=>{ const r=bus(n.curso,n.nombre,''); if(!r) return no.push(n); const a=S.asis[r.id]||{}; ok.push({n,r,ya:!!a.previa}); });
      const nuevos=ok.filter(z=>!z.ya);
      res.innerHTML=!N.length?'<div class="okbox">El archivo no tiene X en la columna del 23/10.</div>':`<div class="okbox">Encontré <b>${N.length}</b> X en la columna del 23/10.</div>
        ${nuevos.map((z,i)=>`<label class="pvchk"><input type="checkbox" data-k="${i}" checked> <b>${escHTML(z.r.curso)}</b> · ${escHTML(z.r.nombre)}<small>${escHTML(z.n.obs||'Sin observación')}</small></label>`).join('')}
        ${ok.filter(z=>z.ya).length?`<p class="sm">Ya marcados: ${ok.filter(z=>z.ya).length}</p>`:''}
        ${no.length?`<div class="warnbox">No están en la lista de la app (no son de los cursos del STEM Day o el nombre es distinto): ${no.map(n=>escHTML(n.grupo+' · '+n.nombre)).join(' · ')}</div>`:''}
        ${nuevos.length?`<button class="b1" id="pvImp">Marcar los seleccionados</button>`:''}`;
      if($('pvImp')) $('pvImp').onclick=async()=>{ $('pvImp').disabled=true; let n=0;
        try{ for(const [i,z] of nuevos.entries()){ if(!res.querySelector(`[data-k="${i}"]`).checked) continue; await guardarPrevia(S.est.find(e=>e.id===z.r.id),z.n.obs||'Ausencia registrada en el archivo de asistencia'); n++; }
          toast(`${n} estudiante${n===1?'':'s'} marcado${n===1?'':'s'}`,'ok'); pintarPrevias(); }catch(e){ toast(e.message,'bad',5000); $('pvImp').disabled=false; } };
    }catch(e){ res.innerHTML=`<div class="warnbox">${escHTML(e.message)}</div>`; } };
}
function detalleAsis(c){
  const el=$('asisPz'), L=S.est.filter(x=>x.curso===c);
  let h=`<h3>${escHTML(c)} · ${escHTML((L[0]||{}).grado||'')}</h3><div class="sub"><a href="#" id="aVol">← Volver al resumen</a></div>`;
  ['N','P','T','A'].forEach(k=>{ const ls=L.filter(x=>(S.asis[x.id]||{}).estado===k); if(!ls.length) return;
    h+=`<h4 style="color:${EST_V[k][2]};margin:12px 0 4px">${EST_V[k][0]} ${EST_V[k][1]} (${ls.length})</h4>`+ls.map(x=>{ const a=S.asis[x.id], hl=minDe(a.hora_llegada); return `<div class="est" data-sn="${escHTML(x.nombre)}"><div class="nm">${escHTML(x.nombre)}${(S.enStem||{})[x.id]?`<small class="sttag">${escHTML(stemTxt(S.enStem[x.id]))}</small>`:''}<small>${[hl!=null?'Llegó '+hDe(hl):'',k==='T'&&a.retardo_min!=null?a.retardo_min+' min tarde':'',a.motivo||'',a.detalle||''].filter(Boolean).map(escHTML).join(' · ')}</small></div></div>`; }).join(''); });
  const sin=L.filter(x=>!S.asis[x.id]); if(sin.length) h+=`<h4 style="color:var(--muted);margin:12px 0 4px">⚪ Sin marcar (${sin.length})</h4>`+sin.map(x=>`<div class="est" data-sn="${escHTML(x.nombre)}"><div class="nm">${escHTML(x.nombre)}</div></div>`).join('');
  el.innerHTML=h; $('aVol').onclick=e=>{ e.preventDefault(); S.asisCurso=null; pintarAsis(); }; if(window.cmAsisHook) cmAsisHook(el,c);
}
/* v30 · Excel de asistencia: ausencia con X, hora de llegada y retardo en minutos (la jornada inicia a las 7:00) */
/* v31 · archivo oficial de asistencia del colegio (hoja del mes, columna del día del evento) */
function cargarJSZip(){ if(window.JSZip) return Promise.resolve(); return new Promise((ok,fail)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; s.onload=ok; s.onerror=()=>fail(new Error('No se pudo cargar el lector de Excel. Revisa la conexión.')); document.head.appendChild(s); }); }
async function llenarOficial(file){
  const res=$('ofiRes'), btn=$('ofiBtn'); res.innerHTML='<p class="sm">Llenando el archivo… (puede tardar unos segundos)</p>'; btn.disabled=true;
  try{
    if(!window.AsisOficial) throw new Error('Recarga la app para actualizarla.');
    await cargarJSZip(); await cargarEstudiantes(true);
    const docs={}; try{ for(let i=0;;i+=1000){ const r=await S.sb.from('sd_estudiantes').select('id,documento').range(i,i+999); if(r.error) break; (r.data||[]).forEach(x=>{ if(x.documento) docs[x.id]=x.documento; }); if(!r.data||r.data.length<1000) break; } }catch(_){}
    const recs=S.est.map(x=>{ const a=S.asis[x.id]||{}; let m=minDe(a.hora_llegada); if(m==null&&a.estado&&a.estado!=='N') m=minDe(a.actualizado_en);
      return {curso:x.curso,nombre:x.nombre,documento:docs[x.id]||null,estado:a.estado||null,min:m,retardo:a.estado==='T'?(a.retardo_min!=null?a.retardo_min:(m!=null?Math.max(0,m-HORA0):0)):null,motivo:a.motivo||null,detalle:a.detalle||null,previa:a.previa||null}; });
    const fecha=(S.config&&S.config.fecha_evento)||'2026-10-23';
    const {archivo,resumen:R}=await AsisOficial.llenar(await file.arrayBuffer(),recs,{fecha});
    const nom=file.name.replace(/\.xlsx$/i,'')+'_STEM-Day-'+fecha.slice(8,10)+'-oct.xlsx', u=URL.createObjectURL(archivo), a=document.createElement('a');
    a.href=u; a.download=nom; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(u); a.remove(); },1500);
    const sm=Object.entries(R.sinMarca).sort((x,y)=>x[0].localeCompare(y[0],'es',{numeric:true}));
    res.innerHTML=`<div class="okbox" style="margin-top:8px">✓ Descargado <b>${escHTML(nom)}</b> · hoja ${escHTML(R.hoja)}, columna ${R.columna}<br>
      <b>${R.asis}</b> asistieron · <b style="color:#b7791f">${R.ret}</b> retardos · <b style="color:#e5484d">${R.aus}</b> ausencias${R.per?` · <b>${R.per}</b> permisos de salida`:''}</div>
      ${sm.length?`<div class="leg">⏳ Sin marcar en la app (quedan en blanco): ${sm.map(([c,n])=>`<b>${escHTML(c)}</b> (${n})`).join(' · ')}</div>`:''}
      ${R.cambiadas.length?`<div class="warnbox">Tenían una X puesta antes en el archivo, pero en la app aparecen presentes (se dejó la hora): ${R.cambiadas.map(escHTML).join(' · ')}</div>`:''}
      ${R.sinFila.length?`<div class="warnbox">No los encontré en el archivo (revisa el nombre o el curso y márcalos a mano): ${R.sinFila.map(escHTML).join(' · ')}</div>`:''}`;
  }catch(e){ res.innerHTML=`<div class="warnbox" style="margin-top:8px">${escHTML(e.message)}</div>`; }
  btn.disabled=false;
}
async function descargarAsistencia(o){
  o=o||{};
  try{ if(typeof window.cargarXLSX==='function') await window.cargarXLSX(); else throw new Error('Recarga la página.');
    await cargarEstudiantes(true);
    const fecha=(S.config&&S.config.fecha_evento)||'2026-10-23', fl=fechaLarga(fecha)+' de 2026';
    let E=S.est.slice(); if(o.grado) E=E.filter(x=>x.grado===o.grado);
    const cursos=[...new Set(E.map(x=>x.curso))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
    const hoja=lista=>{ const aoa=[['COLEGIO CAFAM · STEM DAY 2026 · ASISTENCIA'],[`Fecha: ${fl}`,'','','','La jornada inicia a las 7:00 a.m.'],[],
        ['Grado','Curso','N.º','Estudiante',`Ausencia ${fecha.slice(8,10)}/${fecha.slice(5,7)} (X)`,'Hora de llegada','Retardo (min)','Motivo del retardo / permiso','Estado']];
      lista.forEach((x,i)=>{ const a=S.asis[x.id]||{}, hl=minDe(a.hora_llegada);
        aoa.push([x.grado,x.curso,i+1,x.nombre,a.estado==='N'?'X':'',hl!=null&&(a.estado==='A'||a.estado==='T')?hDe(hl):'',a.estado==='T'?(a.retardo_min!=null?a.retardo_min:(hl!=null?Math.max(0,hl-420):'')):'',
          [a.motivo,a.detalle].filter(Boolean).join(' · '),a.estado?EST_V[a.estado][1]:'Sin marcar']); });
      const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[{wch:12},{wch:7},{wch:5},{wch:38},{wch:14},{wch:15},{wch:13},{wch:32},{wch:14}]; ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:8}}]; return ws; };
    const wb=XLSX.utils.book_new();
    if(o.porCurso) cursos.forEach(c=>XLSX.utils.book_append_sheet(wb,hoja(E.filter(x=>x.curso===c)),c.slice(0,31)));
    else XLSX.utils.book_append_sheet(wb,hoja(cursos.flatMap(c=>E.filter(x=>x.curso===c))),'Asistencia');
    XLSX.writeFile(wb,`asistencia-stem-day-${o.grado?nrmN(o.grado).replace(/ /g,'-'):o.porCurso?'por-curso':'completa'}.xlsx`);
  }catch(e){ toast('No se pudo generar el Excel: '+e.message,'bad',5000); }
}
/* v30 · Máster Coordinador: llamado a lista en cada actividad */
async function pintarAsisAct(){
  const el=$('asisPz');
  let R=[]; try{ for(let i=0;;i+=1000){ const r=await S.sb.from('sd_asistencia_act').select('*').range(i,i+999); if(r.error) throw r.error; R=R.concat(r.data||[]); if(!r.data||r.data.length<1000) break; } }
  catch(e){ el.innerHTML=`<div class="alertbox">No se pudo leer: ${escHTML(e.message)} (¿ejecutaste el SQL 16?)</div>`; return; }
  const horas=[...new Set(S.prog.filter(r=>r.tipo==='actividad'&&!esDirGrupo(r)).map(r=>r.hora_inicio))].sort();
  const a=ahora(); if(!S.asisHora){ const h0=horas.filter(h=>a.fecha===S.config.fecha_evento&&toMin(h)<=a.min); S.asisHora=h0.length?h0[h0.length-1]:horas[0]; }
  const H=S.asisHora, filas=S.prog.filter(r=>r.tipo==='actividad'&&r.hora_inicio===H&&!esDirGrupo(r)).sort((x,y)=>String(x.curso).localeCompare(y.curso,'es',{numeric:true}));
  const de=R.filter(x=>x.hora_inicio===H), porC={}; de.forEach(x=>(porC[x.curso]=porC[x.curso]||[]).push(x));
  const nom=id=>((S.est||[]).find(e=>e.id===id)||{}).nombre||'Estudiante';
  const hechos=filas.filter(f=>porC[f.curso]), aus=de.filter(x=>x.estado==='N');
  let h=`<div class="segs"><span id="aVIni">🕖 Llamado de las 7:00</span><span class="on">📋 Por actividad</span></div>
    <h3>Llamado a lista en cada actividad</h3><div class="sub">Solo lo ve el Máster Coordinador. Los directores de curso lo hacen 5 minutos después de llegar a cada lugar.</div>
    <div class="moms">${horas.map(x=>`<span data-h="${x}" class="${x===H?'on':''}"><b>${fmtHora(x).replace(' ','')}</b>${R.filter(y=>y.hora_inicio===x).length?'✓':''}</span>`).join('')}</div>
    <div class="cnt c2"><div><b style="color:#1f9d6b">${hechos.length} / ${filas.length}</b><small>cursos ya llamaron a lista</small></div><div><b style="color:#e5484d">${aus.length}</b><small>estudiantes no están</small></div></div>`;
  if(aus.length) h+=`<div class="dcard"><h4>Estudiantes que no están</h4>${aus.map(x=>{ const d=x.detalle||{}; return `<div class="est"><div class="nm"><b>${escHTML(x.curso)}</b> · ${escHTML(nom(x.estudiante_id))}<small>${escHTML(x.motivo||'')}${d.docente?' · apoya a '+escHTML(d.docente):''}${d.lugar?' · en '+escHTML(d.lugar):''}${d.texto?' · '+escHTML(d.texto):''}</small></div></div>`; }).join('')}</div>`;
  const pend=filas.filter(f=>!porC[f.curso]); if(pend.length) h+=`<div class="leg">⏳ Aún sin llamado: ${pend.map(f=>`<b>${escHTML(f.curso)}</b> (${escHTML(f.salon||'')})`).join(' · ')}</div>`;
  el.innerHTML=h;
  $('aVIni').onclick=()=>{ S.asisVista=null; pintarAsis(); };
  el.querySelectorAll('[data-h]').forEach(e=>e.onclick=()=>{ S.asisHora=e.dataset.h; pintarAsisAct(); });
}

/* ================= Organizador: en vivo ================= */
function pintarVivo(){
  const el=$('vivoPz'), a=ahora(); if(S.vivoMin==null) S.vivoMin=null;
  const m=S.vivoMin!=null?S.vivoMin:(a.fecha===S.config.fecha_evento?a.min:515), q=(S.vivoQ||'').toLowerCase();
  const act=S.prog.filter(f=>f.tipo==='actividad'&&toMin(f.hora_inicio)<=m&&m<toMin(f.hora_fin));
  const pz=S.prog.filter(f=>f.tipo==='pausa'&&toMin(f.hora_inicio)<=m&&m<toMin(f.hora_fin));
  const hm=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  const G={}; act.forEach(f=>{ const k=ColegioVivo.zona(f); (G[k]=G[k]||[]).push(f); });
  let h=`<h3>En vivo · ${fmtHora(hm)}</h3><div class="sub">Qué curso está en qué salón y haciendo qué. Toca un curso para ver el recorrido.</div>
    <div class="hora"><span id="vMenos">− 15 min</span><b id="vAhora">${S.vivoMin==null?'Ahora':'Volver a ahora'}</b><span id="vMas">+ 15 min</span></div>
    ${window.turAbrirResumen?'<button class="b2" id="vTur" style="width:100%;margin:6px 0">👥 Turnos de director y codirector</button>':''}
    <input class="srch" id="vBus" placeholder="Buscar curso, salón o actividad…" value="${escHTML(S.vivoQ||'')}">
    ${pz.map(p=>`<div class="leg">☕ ${escHTML(p.area)} ${escHTML(p.nivel)}: ${fmtHora(p.hora_inicio)} – ${fmtHora(p.hora_fin)}</div>`).join('')}`;
  let n=0;
  Object.entries(G).forEach(([k,fs])=>{ fs=fs.filter(f=>!q||`${f.curso} ${f.salon} ${f.area}`.toLowerCase().includes(q)).sort((x,y)=>String(x.curso).localeCompare(y.curso,'es',{numeric:true})); if(!fs.length) return; n+=fs.length;
    const col=(fs.find(f=>f.categoria!=='gen')||{}).categoria; 
    h+=`<div class="lugar" style="--c:${col?AREA_C[col]:'#5b6577'}"><h4><span>${escHTML(ColegioVivo.nombreZona(k))}</span><span>${fs.length} curso${fs.length>1?'s':''}</span></h4>${fs.map(f=>`<div class="fila" data-id="${f.id}"><b>${escHTML(f.curso)}</b><span>${escHTML(f.titulo?titA(f.titulo):f.area)} · Salón ${escHTML(f.salon||'—')}${window.conQuienHTML?conQuienHTML(f.curso,f.hora_inicio):''}</span><i>🧭</i></div>`).join('')}</div>`; });
  if(!n) h+='<p class="pend" style="margin-top:10px">No hay cursos en actividad a esta hora.</p>';
  el.innerHTML=h;
  if($('vTur')) $('vTur').onclick=()=>turAbrirResumen();
  $('vMenos').onclick=()=>{ S.vivoMin=Math.max(420,m-15); pintarVivo(); }; $('vMas').onclick=()=>{ S.vivoMin=Math.min(900,m+15); pintarVivo(); }; $('vAhora').onclick=()=>{ S.vivoMin=null; pintarVivo(); };
  $('vBus').oninput=e=>{ S.vivoQ=e.target.value; pintarVivo(); const b=$('vBus'); b.focus(); b.setSelectionRange(b.value.length,b.value.length); };
  el.querySelectorAll('.fila').forEach(e=>e.onclick=()=>{ const f=S.prog.find(x=>String(x.id)===e.dataset.id); if(f) verEnMapa([f]); });
}

/* ================= Chat interno · v45: todos, grupos y mensajes a una persona ================= */
const salaDe=m=>m.sala||'todos';
const puedeChat=()=>S.modo==='org'||S.perfil.rol==='admin'||esOrgM();
const salaPar=id=>'p:'+[S.perfil.id,id].sort().join('|');
const otroDe=k=>k.slice(2).split('|').find(x=>x!==S.perfil.id)||'';
function nomCorto(n){ const w=String(n||'').replace(/^⭐\s*/,'').trim().split(/\s+/); return w.length>=3?w[2]+' '+w[0]:w.join(' '); }
function nomPersona(id){ const p=(S.chatGente||[]).find(x=>x.id===id); if(p) return nomCorto(p.nombre); const m=(S.chat||[]).find(x=>x.perfil_id===id); return m?nomCorto(m.nombre):'Persona'; }
async function chatCargarGente(){ if(S.chatGente) return; const r=await S.sb.from('sd_perfiles').select('id,nombre,rol,org_master').or('rol.in.(organizador,admin),org_master.eq.true');
  S.chatGente=(r.data||[]).filter(p=>p.id!==S.perfil.id).sort((x,y)=>String(x.nombre).localeCompare(y.nombre,'es')); }
async function chatRecargarGrupos(){ const r=await S.sb.from('sd_chat_grupos').select('*').order('id'); S.chatGrOk=!r.error;
  S.chatGrTodos=r.error?[]:(r.data||[]); S.chatGr=S.chatGrTodos.filter(g=>(g.miembros||[]).includes(S.perfil.id));
  if(S.chatSala&&S.chatSala.startsWith('g:')&&!S.chatGr.some(g=>'g:'+g.id===S.chatSala)) S.chatSala='todos';
  if(S.panel==='chat') pintarChat(); }
window.chatRecargarGrupos=chatRecargarGrupos;
function chatSalas(){ const L=[{k:'todos',t:'👥 Todos'}]; (S.chatGr||[]).forEach(g=>L.push({k:'g:'+g.id,t:'👪 '+g.nombre}));
  const dm=new Set((S.chat||[]).map(salaDe).filter(k=>k.startsWith('p:'))); if(S.chatSala&&S.chatSala.startsWith('p:')) dm.add(S.chatSala);
  dm.forEach(k=>L.push({k,t:'👤 '+nomPersona(otroDe(k))})); return L; }
function chatNombreSala(k){ if(k==='todos') return 'todos'; if(k.startsWith('g:')){ const g=(S.chatGr||[]).find(x=>'g:'+x.id===k); return g?'el grupo '+g.nombre:'el grupo'; } return nomPersona(otroDe(k)); }
async function abrirChat(){
  S.chatSala=S.chatSala||'todos'; S.chatNoS=S.chatNoS||{};
  if(!S.chat){ const {data,error}=await S.sb.from('sd_chat').select('*').order('creado_en',{ascending:false}).limit(400);
    if(error){ $('msgs').innerHTML=`<div class="alertbox">No se pudo abrir el chat: ${escHTML(error.message)}</div>`; return; } S.chat=(data||[]).reverse(); }
  await Promise.all([chatCargarGente().catch(()=>{}), S.chatGr?null:chatRecargarGrupos().catch(()=>{})]);
  S.chatNoS[S.chatSala]=0; chatTotal(); pintarChat();
  $('quick').innerHTML=['Todo en orden ✅','Necesito apoyo en ','Curso retrasado: ','¿Dónde queda '].map(q=>`<span>${escHTML(q)}</span>`).join('');
  $('quick').querySelectorAll('span').forEach(q=>q.onclick=()=>{ $('chTxt').value=q.textContent; $('chTxt').focus(); });
  const enviar=async()=>{ const v=$('chTxt').value.trim(); if(!v) return; $('chTxt').value='';
    const fila={perfil_id:S.perfil.id,nombre:S.perfil.nombre,mensaje:v.slice(0,1000)}; if(S.chatSala!=='todos') fila.sala=S.chatSala;
    const {data,error}=await S.sb.from('sd_chat').insert(fila).select().single();
    if(error){ toast('No se envió: '+(/sala/.test(error.message)?'falta ejecutar el archivo 23-estudiantes-stem-y-chat.sql en Supabase.':error.message),'bad',5000); $('chTxt').value=v; return; } if(data) nuevoMensaje(data); avisarYa(); };
  $('chEnv').onclick=enviar; $('chTxt').onkeydown=e=>{ if(e.key==='Enter') enviar(); };
}
const COLS=['#1f9d6b','#7b4bd6','#e5484d','#2f6fde','#b07a00','#0f8a8a'];
function pintarChat(){
  const box=$('msgs'), sala=S.chatSala||'todos', M=(S.chat||[]).filter(m=>salaDe(m)===sala), fij=M.filter(m=>m.fijado), resto=M.filter(m=>!m.fijado);
  const bar=$('chSalas'); if(bar){ bar.innerHTML=`<span class="nv" id="chNueva">＋ Nueva</span>`+chatSalas().map(x=>`<span data-k="${escHTML(x.k)}" class="${x.k===sala?'on':''}">${escHTML(x.t)}${(S.chatNoS||{})[x.k]?`<b>${S.chatNoS[x.k]}</b>`:''}</span>`).join('');
    bar.querySelectorAll('[data-k]').forEach(e=>e.onclick=()=>{ S.chatSala=e.dataset.k; S.chatNoS[S.chatSala]=0; chatTotal(); pintarChat(); });
    $('chNueva').onclick=chatNueva; const on=bar.querySelector('.on'); if(on) on.scrollIntoView({inline:'nearest',block:'nearest'}); }
  const inp=$('chTxt'); if(inp) inp.placeholder=sala==='todos'?'Escribe a todo el equipo…':'Escribe a '+chatNombreSala(sala)+'…';
  box.innerHTML=[...fij,...resto].map(m=>{ const yo=m.perfil_id===S.perfil.id, c=COLS[(String(m.nombre).length)%COLS.length];
    return `<div class="m ${yo?'yo':''} ${m.fijado?'fij':''}" style="--c:${c}">${yo?'':`<small>${m.fijado?'📌 ':''}${escHTML(m.nombre)}</small>`}${escHTML(m.mensaje)}<em>${new Date(m.creado_en).toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit'})}</em></div>`; }).join('')
    ||`<p class="sm" style="padding:10px">${sala==='todos'?'Aún no hay mensajes. Escribe el primero.':'Aún no hay mensajes en esta conversación. Solo '+(sala.startsWith('g:')?'los miembros del grupo':'ustedes dos')+' la pueden ver.'}</p>`;
  box.scrollTop=box.scrollHeight;
}
function chatTotal(){ S.chatNo=Object.values(S.chatNoS||{}).reduce((a,b)=>a+(b||0),0); marcarNav(); }
function nuevoMensaje(m){
  if(!puedeChat()) return;
  const sala=salaDe(m); S.chatNoS=S.chatNoS||{};
  if(S.chat){ if(S.chat.some(x=>x.id===m.id)) return; S.chat.push(m); }
  if(S.chat&&S.panel==='chat'&&!document.hidden&&(S.chatSala||'todos')===sala) pintarChat();
  else if(m.perfil_id!==S.perfil.id){ S.chatNoS[sala]=(S.chatNoS[sala]||0)+1; chatTotal(); if(S.panel==='chat') pintarChat();
    const p=prefs(); if(p.sonido) sonarTono(p.tono); toast('💬 '+(sala==='todos'?'':sala.startsWith('p:')?'(privado) ':'('+chatNombreSala(sala).replace('el grupo ','')+') ')+m.nombre+': '+m.mensaje.slice(0,60),'',4000); }
}
async function chatNueva(){
  await chatCargarGente().catch(()=>{}); const G=S.chatGente||[], adm=esOrgM()&&!S.vistaComo;
  const html=`<input class="srch" id="cnBus" placeholder="Buscar persona…"><div class="cnl" id="cnL">${G.map(p=>`<button class="cnp" data-p="${p.id}" data-n="${escHTML(nrm30(p.nombre))}">👤 ${escHTML(p.nombre)}<small>${p.rol==='admin'?'Administración':p.org_master?'Máster Coordinador':'Organizador'}</small></button>`).join('')||'<p class="sm">No hay otras personas con chat.</p>'}</div>
    ${adm?`<details class="cng"><summary><b>👪 Crear un grupo</b></summary><input id="cnNom" maxlength="60" placeholder="Nombre del grupo (ej. Logística Primaria)">
      <div class="cnl">${G.map(p=>`<label class="pvchk"><input type="checkbox" data-m="${p.id}"> ${escHTML(p.nombre)}</label>`).join('')}</div><button class="b1" id="cnCrear">Crear el grupo</button>
      ${(S.chatGrTodos||[]).length?`<h4 style="margin:12px 0 4px">Grupos creados</h4>${S.chatGrTodos.map(g=>`<div class="est"><div class="nm">${escHTML(g.nombre)}<small>${(g.miembros||[]).length} personas</small></div><button class="b2 sm" data-gx="${g.id}">Eliminar</button></div>`).join('')}`:''}</details>`:''}`;
  ventana({icono:'💬',titulo:'Nueva conversación',html,botones:[{t:'Cerrar',ghost:true}],alAbrir:b=>{
    const cerrar=()=>{ V30.cola.shift(); pintarVentana(); };
    $('cnBus').oninput=e=>{ const q=nrm30(e.target.value); b.querySelectorAll('[data-n]').forEach(x=>x.hidden=q&&!x.dataset.n.includes(q)); };
    b.querySelectorAll('[data-p]').forEach(x=>x.onclick=()=>{ S.chatSala=salaPar(x.dataset.p); cerrar(); pintarChat(); });
    if($('cnCrear')) $('cnCrear').onclick=async()=>{ const nom=$('cnNom').value.trim(), mi=[...b.querySelectorAll('[data-m]:checked')].map(x=>x.dataset.m);
      if(!nom) return toast('Escribe el nombre del grupo','bad'); if(!mi.length) return toast('Elige al menos una persona','bad');
      $('cnCrear').disabled=true; const r=await S.sb.from('sd_chat_grupos').insert({nombre:nom,miembros:[S.perfil.id,...mi],creado_por:S.perfil.id}).select().single();
      if(r.error){ $('cnCrear').disabled=false; return toast('No se creó: '+(/sd_chat_grupos/.test(r.error.message)?'falta ejecutar el archivo 23-estudiantes-stem-y-chat.sql en Supabase.':r.error.message),'bad',5000); }
      await chatRecargarGrupos(); S.chatSala='g:'+r.data.id; toast('Grupo «'+nom+'» creado ✓','ok'); cerrar(); pintarChat(); };
    b.querySelectorAll('[data-gx]').forEach(x=>x.onclick=async()=>{ const g=S.chatGrTodos.find(z=>z.id===+x.dataset.gx); if(!confirm(`¿Eliminar el grupo «${g.nombre}»? Sus mensajes dejarán de verse.`)) return;
      const r=await S.sb.from('sd_chat_grupos').delete().eq('id',g.id); if(r.error) return toast(r.error.message,'bad'); await chatRecargarGrupos(); cerrar(); pintarChat(); });
  }});
}
function marcarNav(){ const n=document.querySelector('#nav span[data-p=chat]'); if(!n) return; let b=n.querySelector('b.bd'); if(!S.chatNo){ if(b) b.remove(); return; } if(!b){ b=document.createElement('b'); b.className='bd'; n.appendChild(b); } b.textContent=S.chatNo; }

/* ---------------- programa general ---------------- */
function pintarPrograma(nv){
  const filas=S.prog.filter(f=>f.nivel===nv);
  const grados=[...new Set(filas.filter(f=>f.grado).map(f=>f.grado))];
  const franjas=[...new Map(filas.map(f=>[f.hora_inicio,f])).values()].sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
  const short=a=>String(a||'').replace('Espacio de dirección de curso','Dirección de curso').replace(/Ciencias Naturales\. Actividades del Cambio Climático/i,'Cambio climático').replace(/Construcción de Rompecabezas/i,'Rompecabezas').replace('Ciencias Naturales','Ciencias');
  if(!filas.length){ $('gwrap').innerHTML='<p class="sm" style="padding:16px">Aún no hay programación cargada.</p>'; return; }
  let h=`<table class="gt"><tr><th>Hora</th>${grados.map(g=>`<th>${escHTML(g)}</th>`).join('')}</tr>`;
  franjas.forEach(fr=>{
    const pausa=filas.find(f=>f.tipo==='pausa'&&f.hora_inicio===fr.hora_inicio);
    h+=`<tr><td class="h">${fmtHora(fr.hora_inicio)}<small>a ${fmtHora(fr.hora_fin)}</small></td>`;
    if(pausa) h+=`<td class="p ${pausaTipo(pausa)}" colspan="${grados.length}">${pausaIco(pausa)} ${escHTML(pausa.titulo||pausa.area)}</td>`;
    else grados.forEach(g=>{ const rs=filas.filter(f=>f.grado===g&&f.hora_inicio===fr.hora_inicio);
      const mine=(S.modo==='docente'&&rs.some(r=>S.cursos.includes(r.curso)))||(S.modo==='lider'&&rs.some(r=>(r.lideres||[]).includes(S.perfil.id)));
      h+= rs.length ? `<td class="c ${mine?'mine':''}" style="background:${AREA_C[rs[0].categoria]}" data-g="${escHTML(g)}" data-h="${fr.hora_inicio}" data-n="${escHTML(nv)}">${escHTML((()=>{ const tt=[...new Set(rs.map(r=>r.titulo).filter(Boolean))]; return tt.length===1?titA(tt[0]):short(rs[0].area); })())}<small>${escHTML(lugarDe(rs.map(r=>r.salon)))}</small></td>` : '<td></td>'; });
    h+='</tr>';
  });
  $('gwrap').innerHTML=h+'</table><p class="sm" style="padding:8px 4px">Toca una actividad para verla en el mapa del colegio.</p>';
  $('gwrap').querySelectorAll('td.c').forEach(td=>td.onclick=()=>verEnMapa(S.prog.filter(f=>f.tipo==='actividad'&&f.nivel===td.dataset.n&&f.grado===td.dataset.g&&f.hora_inicio===td.dataset.h)));
}

/* ---------------- alertas ---------------- */
function prefs(){ return Object.assign({app_cerrada:true,sonido:true,tono:'campana',vibracion:true,anticipacion_min:S.config.anticipacion_min||10}, S.perfil.alertas||{}); }
function proximas(){
  if(S.modo!=='docente') return [];
  const a=ahora(), out=[];
  S.cursos.forEach(c=>rutaCurso(c).forEach(s=>out.push({...s, cursoA:c})));
  const vistos=new Set(); // las pausas se comparten entre cursos
  return out.filter(s=>{ const k=s.tipo==='pausa'?'p'+s.h:s.cursoA+s.h; if(vistos.has(k)) return false; vistos.add(k); return true; })
            .filter(s=>a.fecha<S.config.fecha_evento || (a.fecha===S.config.fecha_evento && toMin(s.h)>a.min))
            .sort((x,y)=>x.h.localeCompare(y.h));
}
async function pintarAlertas(){
  const p=prefs(), perm=('Notification' in window)?Notification.permission:'no';
  let sub=null; try{ const reg=await navigator.serviceWorker.getRegistration(); sub=reg&&await reg.pushManager.getSubscription(); }catch(e){}
  const okPush=perm==='granted'&&sub;
  const prox=proximas();
  $('alertasBody').innerHTML=`
    <div class="perm ${okPush?'ok':'no'}"><b>${okPush?'✓ Avisos activados en este celular':'Los avisos con la app cerrada no están activos'}</b>
      <span>${okPush?'Recibirás avisos aunque la app esté cerrada.':(esIOS&&!instalada?'En iPhone, primero agrega la app a la pantalla de inicio y ábrela desde ese ícono.':'Toca "Activar avisos" y acepta el permiso.')}</span>
      ${okPush?'':'<button class="b1" id="aAct" style="margin-top:8px">Activar avisos</button>'}</div>
    <div class="set"><div><b>Avisar aunque la app esté cerrada</b><small>Llega como notificación del celular, con el tono del sistema.</small></div><label class="tg"><input type="checkbox" id="aCerr" ${p.app_cerrada?'checked':''}><i></i></label></div>
    <div class="set"><div><b>Sonido de alerta</b><small>Suena con la app abierta.</small></div><label class="tg"><input type="checkbox" id="aSon" ${p.sonido?'checked':''}><i></i></label></div>
    <div class="opt" style="margin-top:12px"><h4>Tono</h4><div class="row" id="aTonos">${Object.entries(TONOS).map(([k,v])=>`<span class="chip ${p.tono===k?'on':''}" data-t="${k}">${v}</span>`).join('')}</div></div>
    <button class="b2" style="width:100%;margin-bottom:6px" id="aProbar">▶ Probar sonido</button>
    ${okPush?'<button class="b1" style="width:100%;margin-bottom:6px" id="aPush">🔔 Probar notificación con la app cerrada</button>':''}
    <div class="set"><div><b>Vibración</b></div><label class="tg"><input type="checkbox" id="aVib" ${p.vibracion?'checked':''}><i></i></label></div>
    <div class="opt" style="margin-top:12px"><h4>Avisarme antes de cada actividad</h4><div class="row" id="aAnt">${[5,10,15].map(m=>`<span class="chip ${p.anticipacion_min===m?'on':''}" data-m="${m}">${m} min</span>`).join('')}</div></div>
    ${S.modo==='lider'?`<div class="opt"><h4>Próximas llegadas a tu estación</h4>${(()=>{ const pl=proximasLider(); return pl.length?pl.slice(0,6).map(x=>{ const m=toMin(x.h)-p.anticipacion_min; return `<div class="nx"><span>${fmtHora(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'))}</span><div><b>Llega${x.rs.length>1?'n':''} ${escHTML(x.rs.map(r=>r.curso).join(', '))}</b><small>${fmtHora(x.h)} · ${escHTML(x.rs.map(r=>r.salon).filter((v,i,a)=>a.indexOf(v)===i).join(', '))}</small></div></div>`; }).join(''):'<p class="sm">No hay más rotaciones por hoy.</p>'; })()}</div>`:''}
    ${S.modo==='master'&&S.agenda&&S.agenda.length?`<div class="opt"><h4>Avisos de tu agenda</h4><p class="sm">Te avisaremos ${p.anticipacion_min} minutos antes de cada bloque de tu agenda.</p></div>`:''}
    ${S.modo==='docente'?`<div class="opt"><h4>Próximos avisos</h4>${prox.length?prox.slice(0,6).map(s=>{ const m=toMin(s.h)-p.anticipacion_min; return `<div class="nx"><span>${fmtHora(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'))}</span><div><b>${escHTML(s.nombre)}${S.cursos.length>1&&s.tipo!=='pausa'?' · '+escHTML(s.cursoA):''}</b><small>${escHTML(s.tipo==='pausa'?s.area:'Salón '+(s.salon||'por definir'))}</small></div></div>`; }).join(''):'<p class="sm">No hay más actividades por hoy.</p>'}</div>`:S.modo==='lider'?'':'<p class="sm" style="margin:10px 0">Como usuario Master recibirás los avisos generales del evento.</p>'}
    <div class="opt" style="margin-top:6px"><h4>Más</h4><div class="row"><span class="chip" id="aVideo">▶ Ver video de bienvenida</span>${tutorialURL()?'<span class="chip" id="aTuto">▶ Ver tutorial</span>':''}${S.modo==='org'||S.modo==='master'||S.perfil.rol==='admin'?'<span class="chip" id="aAvat">☺ Editar mi avatar</span>':''}${S.modo==='lider'?'<span class="chip" id="aApoyo">💬 Pedir apoyo</span>':''}${S.modo==='master'&&S.perfil.rol!=='admin'&&window.cmSello?'<span class="chip" id="aSello">🏅 Otorgar Sello STEM</span>':''}${(S.perfil.rol==='admin'||S.perfil.org_master)&&window.cmAbrirPanel?'<span class="chip" id="aLigaM">🏅 Liga Master</span>':''}${(S.perfil.rol==='admin'||['org','master','lider'].includes(S.modo))&&window.turAbrirResumen?'<span class="chip" id="aTurnos">👥 Turnos de los cursos</span>':''}${S.modo==='docente'&&window.cmMisSellos?'<span class="chip" id="aMisS">🏅 Sellos de mi curso</span>':''}${S.modo==='docente'&&window.turAbrirDocente?'<span class="chip" id="aTurD">👥 Turnos con mi codirector</span>':''}${S.modo==='docente'&&window.encuestaFinalDisponible&&encuestaFinalDisponible()?'<span class="chip" id="aEncF">📝 Encuesta final</span>':''}${S.modo==='docente'&&S.config.video_asistencia?'<span class="chip" id="aVAs">▶ Cómo llamar asistencia</span>':''}${S.modo==='docente'&&S.config.video_hacer?'<span class="chip" id="aVHa">▶ Actividades del hacer</span>':''}${S.vistaComo?'<span class="chip on" id="aSalir">👁 Volver a mi perfil</span>':'<span class="chip" id="aSalir">Cerrar sesión</span>'}<span class="chip" id="aDiag">📏 Diagnóstico de pantalla</span>${puedeEnsayo()?`<span class="chip ${_sim?'on':''}" id="aEns">🧪 ${_sim?'Ensayo activo · '+_sim.slice(11)+' (cambiar)':'Modo ensayo'}</span>`:''}</div><p class="sm" style="margin-top:8px">Versión de la app: ${VERSION_APP}</p></div>`;
  const save=async c=>{ await guardarPerfil({alertas:{...prefs(),...c}}); pintarAlertas(); };
  if($('aAct')) $('aAct').onclick=async()=>{ await activarAvisos(); pintarAlertas(); };
  if($('aPush')) $('aPush').onclick=probarNotificacion;
  $('aCerr').onchange=async e=>{ if(e.target.checked) await activarAvisos(); else await desactivarPush(); save({app_cerrada:e.target.checked}); };
  $('aSon').onchange=e=>save({sonido:e.target.checked});
  $('aVib').onchange=e=>save({vibracion:e.target.checked});
  document.querySelectorAll('#aTonos [data-t]').forEach(e=>e.onclick=()=>{ sonarTono(e.dataset.t); save({tono:e.dataset.t}); });
  document.querySelectorAll('#aAnt [data-m]').forEach(e=>e.onclick=()=>save({anticipacion_min:+e.dataset.m}));
  $('aProbar').onclick=()=>sonarTono(prefs().tono);
  $('aVideo').onclick=()=>pantallaVideo(true);
  $('aDiag').onclick=()=>{ window._diag=true; pintarDiag(); };
  if($('aEns')) $('aEns').onclick=abrirEnsayo;
  if($('aTuto')) $('aTuto').onclick=()=>pantallaTutorial(true);
  if($('aAvat')) $('aAvat').onclick=()=>irPanel('avatar');
  if($('aApoyo')) $('aApoyo').onclick=pedirApoyo;
  if($('aProg')) $('aProg').onclick=()=>irPanel('programa');
  if($('aTurnos')) $('aTurnos').onclick=()=>turAbrirResumen(); if($('aSello')) $('aSello').onclick=()=>cmSello(); if($('aMisS')) $('aMisS').onclick=()=>cmMisSellos(); if($('aLigaM')) $('aLigaM').onclick=()=>cmAbrirPanel(); if($('aTurD')) $('aTurD').onclick=()=>turAbrirDocente();
  if($('aEncF')) $('aEncF').onclick=()=>abrirEncuestaFinal(S.curso);
  if($('aVAs')) $('aVAs').onclick=()=>verVideo('Cómo llamar asistencia',S.config.video_asistencia);
  if($('aVHa')) $('aVHa').onclick=()=>verVideo('Actividades del hacer · Cambio climático',window.videoHacer?videoHacer(nivelDocente()):S.config.video_hacer);   // v42: el de su nivel
  $('aSalir').onclick=async()=>{ if(S.vistaComo) return salirVista(); await S.sb.auth.signOut(); location.reload(); };
}
function revisarAlertas(){
  if(S.modo==='master') return revisarAlertasAgenda();
  if(S.modo!=='docente'||!S.cursos.length) return;
  const a=ahora(); if(a.fecha!==S.config.fecha_evento) return;
  const p=prefs(), hechas=LS.get('steam_alertadas_'+a.fecha,[]);
  const due=proximas().filter(s=>{ const m=toMin(s.h); return a.min>=m-p.anticipacion_min && a.min<m; });
  due.forEach(s=>{ const k=(s.tipo==='pausa'?'p':s.cursoA)+s.h; if(hechas.includes(k)) return; hechas.push(k); LS.set('steam_alertadas_'+a.fecha,hechas); lanzarAlerta(s, toMin(s.h)-a.min); });
}
const _cola=[];
function lanzarAlerta(s, faltan){
  const p=prefs();
  if(document.hidden && 'Notification' in window && Notification.permission==='granted')
    navigator.serviceWorker.ready.then(r=>r.showNotification(`En ${faltan} min: ${s.nombre}`,{ body:`📍 ${s.tipo==='pausa'?s.area:s.tipo==='agenda'?(s.salon||''):'Salón '+(s.salon||'por definir')} · ${fmtHora(s.h)}`, tag:'steam-'+(s.tipo==='pausa'?'pausa-'+s.nivel:s.cursoA)+'-'+s.h, icon:'icon-192.png', badge:'icon-192.png' })).catch(()=>{});
  const vacia=!_cola.length;
  _cola.push({s, hasta:toMin(s.h)});
  if(vacia){ if(p.sonido) sonarTono(p.tono); if(p.vibracion && navigator.vibrate) navigator.vibrate([300,150,300,150,600]); mostrarSiguienteAlerta(); }
}
function mostrarSiguienteAlerta(){
  if(!_cola.length){ $('modalBox').innerHTML=''; return; }
  const {s, hasta}=_cola[0], faltan=Math.max(1, hasta-ahora().min), col=colorDe(s);
  $('modalBox').innerHTML=`<div class="modal"><div class="mbox"><div class="bell">🔔</div>
    <div class="k" style="color:${col}">En ${faltan} minutos${s.tipo==='pausa'?'':s.tipo==='agenda'?' · Tu agenda':' · '+escHTML(AREA_N[s.cat]||'')}${S.cursos.length>1&&s.tipo!=='pausa'?' · Curso '+escHTML(s.cursoA):''}</div>
    <h3>${escHTML(s.nombre)}</h3><div class="mi"><span>🕘</span>${fmtHora(s.h)} – ${fmtHora(s.f)}</div>
    ${s.tipo==='pausa'?'':s.tipo==='agenda'?`<div class="mi"><span>📍</span>${escHTML(s.salon||'')}</div>`:`<div class="mi"><span>📍</span>Salón ${P(s.salon)}</div><div class="mi"><span>👤</span>${P(s.docente_cargo)}</div>`}
    ${s.frase?`<p>${escHTML(s.frase)}</p>`:'<p></p>'}
    <button class="btn" id="mOk">${_cola.length>1?'Siguiente aviso ('+(_cola.length-1)+')':'Entendido'}</button></div></div>`;
  $('mOk').onclick=()=>{ _cola.shift(); mostrarSiguienteAlerta(); };
}

/* ================= v28 · Agenda Master ================= */
const lugarTxt=x=>/^\d/.test(String(x||''))?'Salón '+x:String(x||'');
const AG_TIPOS={sup:['Supervisar','#173d7a'],acom:['Acompañar actividad','#1f9d6b'],fijo:['Punto fijo','#c2410c'],reu:['Reunión','#7b4bd6'],lib:['Libre','#8a94a8']};
async function cargarAgenda(aviso){
  try{
    const r=await S.sb.from('sd_agenda').select('*').order('hora_inicio');
    if(r.error) return;
    const antes=JSON.stringify((S.agenda||[]).map(b=>[b.id,b.hora_inicio,b.hora_fin,b.lugar,b.tarea,b.tipo]));
    S.agendaTodo=(r.data||[]).map(b=>({...b,hora_inicio:hhmm(b.hora_inicio),hora_fin:hhmm(b.hora_fin)}));
    S.agenda=S.agendaTodo.filter(b=>b.perfil_id===S.perfil.id);
    if(aviso&&S.modo==='master'&&!S.vistaComo&&antes!==JSON.stringify(S.agenda.map(b=>[b.id,b.hora_inicio,b.hora_fin,b.lugar,b.tarea,b.tipo]))){
      const p=prefs(); if(p.sonido) sonarTono(p.tono); toast('🔄 Tu agenda cambió. Revísala en «Mi agenda».','',6000); }
    if(S.perfil.rol==='admin'&&!S.agNombres){ const q=await S.sb.from('sd_perfiles').select('id,nombre').in('rol',['master','admin']); S.agNombres={}; (q.data||[]).forEach(x=>S.agNombres[x.id]=lidNom(x.nombre)); }
    if(S.panel==='agenda') pintarAgenda(); tickAgenda();
  }catch(e){}
}
function bloqueAhora(){ const m=minAhora(), L=S.agenda||[]; return { cur:L.find(b=>toMin(b.hora_inicio)<=m&&m<toMin(b.hora_fin)), nxt:L.find(b=>toMin(b.hora_inicio)>m) }; }
function pintarAgenda(){
  const el=$('agPz'), L=S.agenda||[], m=minAhora();
  let h=`<h3>Mi agenda del STEM Day</h3><div class="sub">Lo que te asignó el administrador: dónde debes estar y qué debes hacer. Si algo cambia, te llegará un aviso.</div>`;
  if(!L.length){ el.innerHTML=h+'<div class="alertbox" style="margin-top:8px">Aún no tienes bloques en tu agenda. El administrador los asignará desde Administración → Agenda Master.<br><br>Mientras tanto, la programación general está en «Programa».</div>'; return; }
  L.forEach(b=>{ const t=AG_TIPOS[b.tipo]||AG_TIPOS.sup, est=toMin(b.hora_fin)<=m?'ok':toMin(b.hora_inicio)<=m?'now':'nx';
    h+=`<div class="agb ${est}" style="--c:${t[1]}" data-id="${b.id}"><div class="h">${fmtHora(b.hora_inicio)}<small>a ${fmtHora(b.hora_fin)}</small></div><i></i><div class="c"><b>${escHTML(lugarTxt(b.lugar))}</b><small>${escHTML(t[0])}</small>${b.tarea?`<span class="agt">📝 ${escHTML(b.tarea)}</span>`:''}</div><span class="st">${est==='ok'?'✓':est==='now'?'● Ahora':'Próximo'}</span></div>`; });
  h+=`<p class="sm" style="margin-top:10px">Toca un bloque para ver el lugar en el mapa del colegio.</p>`;
  el.innerHTML=h;
  el.querySelectorAll('.agb').forEach(x=>x.onclick=()=>{ const b=L.find(z=>String(z.id)===x.dataset.id); if(b) irLugarAgenda(b); });
}
async function irLugarAgenda(b){ irPanel('ruta'); try{ await ColegioVivo.lugar({salon:String(b.lugar||'').split(/\s*,\s*/)[0],hora_inicio:b.hora_inicio,tipo:'actividad'}); }catch(e){} actualizarBotonesCV(); }
/* tarjeta «Ahora debes estar en» sobre el Colegio vivo (Master) y pines para el administrador */
function tickAgenda(){
  const card=$('agCard');
  if(card&&S.modo==='master'&&S.perfil.rol!=='admin'){
    const {cur,nxt}=bloqueAhora(), b=cur||nxt;
    if(!b||S.agMin){ card.hidden=!b; card.className='agcard'+(b?' min':''); card.innerHTML=b?`📍 ${cur?'Ahora':fmtHora(b.hora_inicio)}: ${escHTML(lugarTxt(b.lugar))}`:''; card.onclick=()=>{ S.agMin=false; tickAgenda(); }; }
    else { const t=AG_TIPOS[b.tipo]||AG_TIPOS.sup; card.hidden=false; card.className='agcard'; card.style.setProperty('--c',t[1]); card.onclick=null;
      card.innerHTML=`<span class="x" id="agX">✕</span><div class="k">📍 ${cur?'Ahora debes estar en':'Tu siguiente bloque'} · ${fmtHora(b.hora_inicio)} a ${fmtHora(b.hora_fin)}</div><b>${escHTML(lugarTxt(b.lugar))}</b><small>${escHTML(t[0])}</small>${b.tarea?`<span class="agt">📝 ${escHTML(b.tarea)}</span>`:''}<button id="agIr">🧭 Ver en el mapa</button>`;
      $('agX').onclick=e=>{ e.stopPropagation(); S.agMin=true; tickAgenda(); }; $('agIr').onclick=e=>{ e.stopPropagation(); irLugarAgenda(b); }; }
  } else if(card) card.hidden=true;
  if(S.perfil.rol==='admin'&&S.agendaTodo&&typeof ColegioVivo!=='undefined'){
    const m=horaMaster(), nom=S.agNombres||{};
    ColegioVivo.setPins(S.agendaTodo.filter(b=>toMin(b.hora_inicio)<=m&&m<toMin(b.hora_fin)).map(b=>({lugar:b.lugar,nombre:nom[b.perfil_id]||'Master'})));
  }
}
function revisarAlertasAgenda(){
  const a=ahora(); if(a.fecha!==S.config.fecha_evento||!S.agenda) return;
  const p=prefs(), hechas=LS.get('steam_agalert_'+a.fecha,[]);
  S.agenda.forEach(b=>{ if(b.avisar===false) return; const ini=toMin(b.hora_inicio), k=b.id+'|'+b.hora_inicio+'|'+b.lugar;
    if(a.min>=ini-p.anticipacion_min&&a.min<ini&&!hechas.includes(k)){ hechas.push(k); LS.set('steam_agalert_'+a.fecha,hechas);
      lanzarAlerta({tipo:'agenda',nombre:b.tarea||lugarTxt(b.lugar),h:b.hora_inicio,f:b.hora_fin,salon:lugarTxt(b.lugar),cat:'gen',frase:(AG_TIPOS[b.tipo]||AG_TIPOS.sup)[0]+(b.tarea?' · '+b.tarea:'')}, ini-a.min); } });
}

/* ---------------- avisos generales ---------------- */
function avisosMios(){ return S.avisos.filter(a=>!a.curso || S.cursos.includes(a.curso)); }
function pintarBanner(){
  const vistos=LS.get('steam_avisos_vistos',[]), a=avisosMios().find(x=>!vistos.includes(x.id));
  const b=$('banner'); if(!a){ b.hidden=true; return; }
  b.hidden=false; b.innerHTML=`<b>📣 ${escHTML(a.titulo)}</b>${escHTML(a.mensaje)} <a href="#" id="bOk" style="color:var(--brand);font-weight:700;margin-left:6px">Entendido</a>`;
  $('bOk').onclick=e=>{ e.preventDefault(); vistos.push(a.id); LS.set('steam_avisos_vistos',vistos); pintarBanner(); };
}

/* ---------------- tiempo real ---------------- */
let _rt=null, _rtH=null;
function suscribirTiempoReal(){
  if(_rt) return;
  const recargar=()=>{ clearTimeout(_rtH); _rtH=setTimeout(async()=>{ try{ await cargarDatos(); definirModo(); pintarRuta(true); pintarBanner(); if(S.panel==='programa') pintarPrograma(document.querySelector('#gtabs span.on').dataset.n); toast('La programación se actualizó','ok'); }catch(e){} },1500); };
  _rt=S.sb.channel('steam')
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_programacion'},recargar)
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_config'},recargar)
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_encuestas'},()=>{ S.encSucia=true; if(S.panel==='enc'){ clearTimeout(S._enT); S._enT=setTimeout(pintarEncuestas,1000); } })
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_asistencia'},()=>{ S.asisSucia=true; if(S.panel==='asis') { clearTimeout(S._asT); S._asT=setTimeout(pintarAsis,800); } })
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_estudiantes'},()=>{ S.est=null; S.asisSucia=true; })
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_en_stem'},()=>{ S.asisSucia=true; if(S.panel==='lista'&&S.listaLocal&&!S.listaLocal.cambios){ clearTimeout(S._stT); S._stT=setTimeout(()=>{ S.listaLocal=null; pintarLista2(); },900); } })
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_chat_grupos'},()=>{ if(window.chatRecargarGrupos) chatRecargarGrupos(); })
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_asistencia_act'},()=>{ if(S.panel==='asis'&&S.asisVista==='act'){ clearTimeout(S._aaT); S._aaT=setTimeout(pintarAsisAct,900); } })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'sd_chat'},payload=>nuevoMensaje(payload.new))
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_llegadas'},()=>{ clearTimeout(S._llT); S._llT=setTimeout(async()=>{ await cargarLlegadas(); if(S.panel==='estacion') pintarEstacion(); if(S.panel==='asis') pintarAsis(); },700); })
    .on('postgres_changes',{event:'*',schema:'public',table:'sd_agenda'},()=>{ clearTimeout(S._agT); S._agT=setTimeout(()=>cargarAgenda(true),900); })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'sd_avisos'},async payload=>{
      S.avisos.unshift(payload.new); pintarBanner();
      if(avisosMios().some(a=>a.id===payload.new.id)){ const p=prefs(); if(p.sonido) sonarTono(p.tono); toast('📣 '+payload.new.titulo,'',5000); } })
    .subscribe();
}


/* ---------------- Modo ensayo: vivir el día del evento a cualquier hora (admin y cuentas de prueba) ---------------- */
function puedeEnsayo(){ const p=S.real||S.perfil; return p&&(p.rol==='admin'||/^prueba\./i.test(p.correo||'')); }
function abrirEnsayo(){
  const fe=(S.config&&S.config.fecha_evento)||'2026-10-23', h=_sim?_sim.slice(11,16):'07:50';
  $('modalBox').innerHTML=`<div class="modal"><div class="mbox"><div class="k" style="color:#7b4bd6">🧪 MODO ENSAYO</div><h3>Vive el STEM Day antes del 23</h3>
    <p>La app se comporta como si fuera el día del evento, desde la hora que elijas, y el reloj avanza normalmente. Solo cambia en este celular y hasta que cierres la app.</p>
    <div class="field" style="margin:12px 0"><label>Hora de inicio del ensayo</label><input type="time" id="ensH" value="${h}" min="06:30" max="15:30"></div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:12px">${['06:55','07:50','08:55','09:03','10:25','12:40'].map(x=>`<span class="chip" data-h="${x}">${fmtHora(x)}</span>`).join('')}</div>
    <button class="btn" id="ensOk">Iniciar ensayo</button>${_sim?'<button class="btn ghost" id="ensFin" style="margin-top:8px">Salir del ensayo</button>':''}<button class="btn ghost" id="ensX" style="margin-top:8px">Cancelar</button></div></div>`;
  $('modalBox').querySelectorAll('[data-h]').forEach(c=>c.onclick=()=>$('ensH').value=c.dataset.h);
  $('ensOk').onclick=()=>{ try{ sessionStorage.setItem('steam_sim',fe+'T'+($('ensH').value||'07:50')); }catch(e){} location.reload(); };
  if($('ensFin')) $('ensFin').onclick=()=>{ try{ sessionStorage.removeItem('steam_sim'); }catch(e){} location.reload(); };
  $('ensX').onclick=()=>$('modalBox').innerHTML='';
}

/* ---------------- administrador · "Ver como" otro perfil ----------------
   El administrador entra a la interfaz de un docente, organizador o master sin cerrar su sesión.
   Es solo para mirar: mientras dure la vista no se guarda ningún cambio en la base de datos. */
const VC_KEY='steam_vercomo';
function vistaGuardada(){ try{ return sessionStorage.getItem(VC_KEY); }catch(e){ return null; } }
function protegerVista(){
  const from=S.sb.from.bind(S.sb), MSG='Estás en modo vista: los cambios no se guardan.';
  const bloqueo=()=>{ const r={data:null,error:{message:MSG}}; const p=new Proxy(function(){},{ get(_,k){ if(k==='then') return (a,b)=>Promise.resolve(r).then(a,b); return ()=>p; } }); return p; };
  S.sb.from=t=>{ const q=from(t); if(!S.vistaComo) return q;
    return new Proxy(q,{ get(o,k){ if(['insert','update','upsert','delete'].includes(k)) return bloqueo; const v=o[k]; return typeof v==='function'?v.bind(o):v; } }); };
}
function avisoVista(){ setTimeout(()=>toast('👁 Modo vista: este cambio no se guarda.','',3000),60); }
async function entrarVista(id){
  const { data, error } = await S.sb.from('sd_perfiles').select('*').eq('id',id).maybeSingle();
  if(error||!data){ try{ sessionStorage.removeItem(VC_KEY); }catch(e){} return; }
  S.real=S.perfil; S.vistaComo=true;
  S.perfil={ ...data, confirmado:true, video_visto:true, tutorial_visto:true, aviso_cursos_visto:true,
    avatar: data.avatar||S.real.avatar, experiencia: data.experiencia||(data.rol==='master'?'tec':null) };
}
function salirVista(){ try{ sessionStorage.removeItem(VC_KEY); }catch(e){} location.reload(); }
function irVista(id){ try{ sessionStorage.setItem(VC_KEY,id); }catch(e){ return toast('Este navegador no permite cambiar de vista.','bad'); } location.reload(); }
const VC_ROL={ docente:'Docente', organizador:'Organizador', organizador_m:'Organizador Master', master:'Master', admin:'Administrador', lider:'Líder de estación', secretario:'Secretario' };
function pintarFranjaVista(){
  const f=$('vcomo'); if(!f) return;
  if(!S.vistaComo){ f.hidden=true; return; }
  f.hidden=false;
  f.innerHTML=`<span class="ojo">👁</span><div><small>Estás viendo la app como</small><b>${escHTML(S.perfil.rol==='organizador'&&S.perfil.org_lista?'Organizador Master':S.perfil.rol==='master'&&S.perfil.org_master?'Máster Coordinador':VC_ROL[S.perfil.rol]||S.perfil.rol)} · ${escHTML(S.perfil.nombre||'')}</b></div><button id="vcCambiar">Cambiar</button><button id="vcSalir" class="fin">Salir</button>`;
  $('vcCambiar').onclick=abrirVerComo; $('vcSalir').onclick=salirVista;
}
async function abrirVerComo(){
  const m=$('vcModal'); m.hidden=false;
  m.innerHTML=`<div class="vcbox"><div class="vchead"><div><b>Ver la app como…</b><small>Elige un perfil para ver su interfaz. Solo para revisar: no se guarda ningún cambio.</small></div><button class="vcx" id="vcX">✕</button></div>
    <label class="vclab" for="vcRol">Perfil</label><select class="vcsel" id="vcRol">${[['docente','Docentes'],['lider','Líderes de estación'],['organizador','Organizadores'],['orgm','Organizadores Master'],['master','Master'],['mcoord','Máster Coordinadores'],['secretario','Secretaría']].map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select>
    <input id="vcBus" class="vcbus" placeholder="Buscar por nombre o curso…" autocomplete="off">
    <div class="vclist" id="vcList"><p class="sm" style="padding:14px">Cargando perfiles…</p></div>
    ${S.vistaComo?'<button class="btn" id="vcMio">Volver a mi perfil de administrador</button>':''}</div>`;
  m.onclick=e=>{ if(e.target===m) m.hidden=true; }; $('vcX').onclick=()=>m.hidden=true;
  if($('vcMio')) $('vcMio').onclick=salirVista;
  if(!S._vcLista){
    let { data, error } = await S.sb.from('sd_perfiles').select('id,nombre,nombre_n,rol,experiencia,cursos_manual,org_master,org_lista').neq('rol','admin').order('nombre');
    if(error&&/org_lista/.test(error.message)) ({ data, error } = await S.sb.from('sd_perfiles').select('id,nombre,nombre_n,rol,experiencia,cursos_manual,org_master').neq('rol','admin').order('nombre'));
    if(error){ $('vcList').innerHTML=`<p class="sm" style="padding:14px">No se pudieron leer los perfiles: ${escHTML(error.message)}</p>`; return; }
    const ac={}, ap={};
    S.prog.forEach(r=>{ if(r.tipo!=='actividad') return; if(r.acompanante_n) (ac[r.acompanante_n]=ac[r.acompanante_n]||new Set()).add(r.curso); if(r.apoyo_n) (ap[r.apoyo_n]=ap[r.apoyo_n]||new Set()).add(r.curso); });
    S._vcLista=(data||[]).map(p=>{ let det='';
      if(p.rol==='docente'){ const a=[...(ac[p.nombre_n]||[])].sort(), b=[...(ap[p.nombre_n]||[])].sort();
        det = p.cursos_manual&&p.cursos_manual.length ? 'Cursos: '+p.cursos_manual.join(', ') : a.length ? 'Director de '+a.join(', ')+(b.length?' · codirector de '+b.join(', '):'') : b.length ? 'Codirector de '+b.join(', ') : 'Sin curso en la programación'; }
      else if(p.rol==='master') det='Experiencia: '+(AREA_N[p.experiencia]||'sin elegir');
      else if(p.rol==='lider'){ const fs=S.prog.filter(r=>(r.lideres||[]).includes(p.id)); det=fs.length?'Lidera '+[...new Set(fs.map(r=>r.titulo?titA(r.titulo):r.area))].join(', ')+' · '+[...new Set(fs.map(r=>r.salon))].join(', '):'Sin estación asignada'; }
      else if(p.rol==='organizador'&&p.org_lista) det='Organizador Master · también llama a lista a 10° y 11°';
      else det='Organización del evento';
      return { ...p, det }; });
  }
  let rol='docente';
  const pintar=()=>{ const q=($('vcBus').value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const en=p=>rol==='orgm'?(p.rol==='organizador'&&p.org_lista):rol==='mcoord'?(p.rol==='master'&&p.org_master):rol==='organizador'?(p.rol==='organizador'&&!p.org_lista):p.rol===rol;
    const l=S._vcLista.filter(p=>en(p) && (!q || ((p.nombre||'')+' '+p.det).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q)));
    $('vcList').innerHTML = l.length ? l.slice(0,200).map(p=>`<div class="vcit ${S.vistaComo&&S.perfil.id===p.id?'on':''}" data-id="${p.id}"><i>${escHTML((p.nombre||'?').trim()[0]||'?')}</i><div><b>${escHTML(p.nombre||'Sin nombre')}</b><small>${escHTML(p.det)}</small></div><span>Ver ›</span></div>`).join('')
      : `<p class="sm" style="padding:14px">No hay ${rol==='docente'?'docentes':rol==='master'?'usuarios master':rol==='lider'?'líderes de estación':rol==='orgm'?'Organizadores Master':rol==='mcoord'?'Máster Coordinadores':'organizadores'} ${q?'con esa búsqueda':'registrados'}.${rol==='orgm'&&!q?' Asígnalo en Administración → Usuarios, eligiendo el perfil «Organizador Master».':''}</p>`;
    $('vcList').querySelectorAll('.vcit').forEach(e=>e.onclick=()=>irVista(e.dataset.id)); };
  $('vcRol').onchange=e=>{ rol=e.target.value; pintar(); };   // v52: lista desplegable (en el celular las pestañas no cabían)
  $('vcBus').oninput=pintar; pintar();
}

window.STEAM = S; window.continuarApp = continuar; window.recargarApp = async()=>{ await cargarDatos(); definirModo(); pintarRuta(true); };
window.recargarDatos = async()=>{ await cargarDatos(); definirModo(); S.mapaSucio=true; };
/* iPhone: al cerrar el teclado o girar la pantalla, la vista puede quedar corrida hacia arriba. Se devuelve a su sitio. */
/* iPhone instalada (v23):
   - La app mide el alto real de la pantalla y lo usa para cada pantalla (evita el espacio en blanco abajo).
   - Con el teclado abierto, la pantalla se reduce al espacio visible y el campo activo se desplaza a la vista.
   - Al cerrar el teclado, todo vuelve a su sitio. */
const VERSION_APP='61';
const VV=window.visualViewport;
function enCampo(){ const a=document.activeElement; return a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&!/^(checkbox|radio|range|button|submit)$/.test(a.type||''); }
function reubicarVista(){
  if(window.scrollY||document.documentElement.scrollTop||document.body.scrollTop){ window.scrollTo(0,0); document.documentElement.scrollTop=0; document.body.scrollTop=0; }
}
function ajustarAlto(){
  const kb = VV && enCampo() && (window.innerHeight-VV.height)>120;
  document.body.classList.toggle('kb',!!kb);
  if(kb){ document.documentElement.style.setProperty('--app-h',Math.round(VV.height)+'px');
    const s=document.querySelector('.screen:not([hidden])'); if(s) s.style.transform=`translateY(${Math.round(VV.offsetTop)}px)`;
    const a=document.activeElement; setTimeout(()=>{ try{ a.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){} },60);
  } else {
    // iPhone instalado (iOS reciente): la ventana mide la pantalla menos la barra de estado, pero se dibuja desde arriba,
    // y queda un espacio vacío abajo. Se usa el alto real de la pantalla.
    const vert=window.innerHeight>=window.innerWidth, alto=vert?Math.max(screen.height,screen.width):Math.min(screen.height,screen.width);
    const inst=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone;
    const falta=alto-window.innerHeight, iosPwa=inst&&/iP(hone|od|ad)/.test(navigator.userAgent)&&falta>=15&&falta<80;
    document.documentElement.classList.toggle('ios-pwa',!!iosPwa);
    document.documentElement.style.setProperty('--app-h',window.innerHeight+'px');   // v30: nunca más alto que la ventana visible (si no, el menú de abajo se corta)
    document.querySelectorAll('.screen').forEach(s=>s.style.transform='');
    reubicarVista();
  }
  if(window._diag) pintarDiag();
}
['resize','orientationchange','pageshow','focusin','focusout'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(ajustarAlto,ev==='focusout'?250:90)));
if(VV){ VV.addEventListener('resize',()=>setTimeout(ajustarAlto,60)); VV.addEventListener('scroll',()=>{ if(!enCampo()) reubicarVista(); }); }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) setTimeout(ajustarAlto,150); });
ajustarAlto();
/* Diagnóstico de pantalla: tocar 5 veces seguidas el título de arriba */
function pintarDiag(){ let d=document.getElementById('diag'); if(!d){ d=document.createElement('div'); d.id='diag'; d.onclick=()=>{ window._diag=false; d.remove(); }; document.body.appendChild(d); }
  const t=document.createElement('div'); t.style.cssText='position:fixed;top:0;height:env(safe-area-inset-top);bottom:auto'; document.body.appendChild(t); const sa=t.offsetHeight; t.remove();
  const s=document.querySelector('.screen:not([hidden])'), r=s?s.getBoundingClientRect():{top:0,height:0};
  d.textContent=`STEM Day · diagnóstico (toca para cerrar)\nversión: ${(document.querySelector('script[src*="app.js"]')||{}).src||''}\nmodo: ${matchMedia('(display-mode: standalone)').matches||navigator.standalone?'instalada':'navegador'}\npantalla: ${screen.width}x${screen.height}  ventana: ${innerWidth}x${innerHeight}\nvisual: ${VV?Math.round(VV.width)+'x'+Math.round(VV.height)+' desde '+Math.round(VV.offsetTop):'-'}\nscrollY: ${scrollY}  zona segura arriba: ${sa}px\npantalla actual: top ${Math.round(r.top)} alto ${Math.round(r.height)}\nalto app: ${getComputedStyle(document.documentElement).getPropertyValue('--app-h')}\najuste iPhone: ${document.documentElement.classList.contains('ios-pwa')?'activo':'no'}`; }
(function(){ let n=0,t0=0; document.addEventListener('pointerup',e=>{ if(!e.target.closest('#mTit,.mtop h2,#s-login .emblem')) return; const now=Date.now(); n=now-t0<600?n+1:1; t0=now; if(n>=5){ n=0; window._diag=true; pintarDiag(); } }); })();
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();   // espera a que carguen todos los scripts (encuestas.js, admin.js)
