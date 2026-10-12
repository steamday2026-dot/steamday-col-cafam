/* =====================================================================
   STEM Day Cafam · Aplicación principal
   Roles: admin · master (coordinadores y Rectora) · docente (acompañante / apoyo)
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
const _sim = new URLSearchParams(location.search).get('simular');
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
}

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
function tutorialURL(){ const c=S.config||{}; if(S.modo==='docente') return c.video_tutorial_docente||null; if(S.modo==='org') return c.video_tutorial_org||null; return c.video_tutorial_url||null; }
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
  if(rol==='master'||rol==='admin'){ S.modo='master'; S.area=S.perfil.experiencia||'tec'; S.nivel=LS.get('steam_nivel','Primaria'); S.masterIdx=LS.get('steam_midx_'+S.area+S.nivel,0); return; }
  S.modo='docente';
  const ex=cursosDelExcel();
  S.rolDoc=ex; S.cursos = (S.perfil.cursos_manual&&S.perfil.cursos_manual.length) ? [...S.perfil.cursos_manual] : [...ex.acompana,...ex.apoya].slice(0,2);
  if(!S.cursos.includes(S.curso)) S.curso=S.cursos[0]||null;
}
function filaDe(c){ return S.prog.find(r=>r.curso===c&&r.tipo==='actividad'); }
function rutaCurso(c){
  const filas=S.prog.filter(r=>r.curso===c&&r.tipo==='actividad'); if(!filas.length) return [];
  const nv=filas[0].nivel;
  return [...filas,...S.prog.filter(r=>r.tipo==='pausa'&&r.nivel===nv)]
    .sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio))
    .map(r=>({ ...r, h:r.hora_inicio, f:r.hora_fin, cat:r.categoria, nombre: r.tipo==='pausa'?r.area:(r.titulo?titA(r.titulo):r.area), lugar: r.tipo==='pausa'?r.area:(r.salon||'') }));
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
    h+=`<h2>Hola, ${nom}. Este es tu rol en el STEM Day</h2><div class="cc"><span class="sm">Docente acompañante del curso</span><div class="big">${escHTML(ex.acompana.join(', '))}</div><div class="r"><span>Docente de apoyo:</span> ${escHTML(f&&f.apoyo||'—')}</div></div><p>Estarás con tu curso durante toda la jornada. La app te avisará antes de cada actividad.</p>`; }
  if(ex.apoya.length){
    if(!ex.acompana.length) h+=`<h2>Hola, ${nom}. Este es tu rol en el STEM Day</h2>`;
    h+=`<p>Acompañarás como <b>docente de apoyo</b> a ${ex.apoya.length===1?'este curso':'estos dos cursos'}:</p>`;
    ex.apoya.forEach(c=>{ const f=filaDe(c); h+=`<div class="cc"><div class="big">${escHTML(c)}</div><div class="r"><span>Acompañante:</span> ${escHTML(f&&f.acompanante||'—')}</div></div>`; });
    if(ex.apoya.length>1) h+=`<p>En el mapa podrás cambiar entre los dos cursos y recibirás los avisos de ambos.</p>`;
  }
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
  S.avTmp=avatarEditor(c, S.perfil.avatar, av=>{ S.avTmp=av; prev.innerHTML=avatarSVG(av); });
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
  const NAVS={ docente:[['ruta','◉','Mi ruta'],['programa','☰','Programa'],['lista','✓','Lista'],['avatar','☺','Avatar'],['alertas','🔔','Alertas']],
    master:[['ruta','◉','Colegio'],['programa','☰','Programa'],['asis','📋','Asistencia'],['avatar','☺','Avatar'],['alertas','🔔','Alertas']],
    org:[['vivo','⏱','En vivo'],['ruta','⌖','Mapa'],['programa','☰','Programa'],['chat','💬','Chat'],['asis','📋','Asistencia'],['alertas','⋯','Más']] };
  NAVS.admin=[['ruta','◉','Colegio'],['programa','☰','Programa'],['asis','📋','Asistencia'],['enc','📊','Encuestas'],['chat','💬','Chat'],['alertas','⋯','Más']];
  const nv=S.perfil.rol==='admin'?NAVS.admin:NAVS[S.modo];
  $('nav').innerHTML=nv.map(([k,i,t])=>`<span data-p="${k}"><i>${i}</i>${t}</span>`).join('');
  $('nav').classList.toggle('n6',nv.length>5);
  document.querySelectorAll('#nav span').forEach(n=>n.onclick=()=>irPanel(n.dataset.p));
  $('btnUbic').onclick=marcarUbicacion; $('btnQuitar').onclick=()=>{ ColegioVivo.quitar(); actualizarBotonesCV(); cerrarSheet(); };
  document.querySelectorAll('#gtabs span').forEach(t=>t.onclick=()=>{ document.querySelectorAll('#gtabs span').forEach(x=>x.classList.toggle('on',x===t)); pintarPrograma(t.dataset.n); });
  if(!S.mapa) S.mapa=new MapaSteam($('mapa'),{ onTap:abrirParada, onArrive:i=>{ if(S.modo==='docente') LS.set('steam_last_'+S.curso,i); else { S.masterIdx=i; pintarLista(i); pintarTarjeta(i); } } });
  S.mapa.setAvatar(S.perfil.avatar);
  if(S.modo==='docente' && !S.cursos.length) setTimeout(()=>{ toast('Elige tu grado y curso para ver tu ruta.','',4000); abrirAyuda(); },600);
  $('btnColegio').onclick=abrirCamino; $('cvVolver').onclick=cerrarCamino; $('btnEnc').onclick=()=>listaPendientes(); $('btnEnc').hidden=true;
  $('cvAhora').onclick=()=>{ ColegioVivo.manual=0; ColegioVivo.setHora(horaMaster()); };
  pintarRuta(true); pintarBanner(); irPanel(S.modo==='org'?'vivo':'ruta');
  clearInterval(S.timer); S.timer=setInterval(tick,15000); tick();
  suscribirTiempoReal();
  if(window.copaIniciar) copaIniciar();
}
function irPanel(p){
  S.panel=p;
  ['ruta','programa','avatar','alertas','lista','asis','vivo','chat','enc'].forEach(x=>$('p-'+x).hidden=x!==p);
  document.querySelectorAll('#nav span').forEach(n=>n.classList.toggle('on',n.dataset.p===p));
  $('btnVista').hidden=p!=='ruta'||S.modo!=='docente';
  cerrarSheet();
  if(p==='programa') pintarPrograma(document.querySelector('#gtabs span.on').dataset.n);
  if(p==='avatar'){ montarEditor('avMain'); $('avGuardar2').onclick=async()=>{ if(await guardarPerfil({avatar:S.avTmp})){ S.mapa.setAvatar(S.avTmp); ColegioVivo.setAvatar(S.avTmp); toast('Avatar guardado','ok'); } }; }
  else $('avMain').innerHTML='';
  if(p==='alertas') pintarAlertas();
  if(p==='lista') pintarLista2();
  if(p==='asis') pintarAsis();
  if(p==='vivo') pintarVivo();
  if(p==='chat') abrirChat();
  if(p==='enc') pintarEncuestas();
  if(p==='ruta') pintarRuta(false);
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
  const esM=S.modo==='master'||S.modo==='org';
  $('p-ruta').classList.toggle('esMaster',esM);
  if(esM){   // Master: Colegio vivo
    $('chips').hidden=true; $('btnColegio').hidden=true;
    $('mHola').innerHTML=`Hola, ${nom} · ${S.perfil.rol==='admin'?'Administrador':S.modo==='org'?'Organizador':'Master'}`; $('mTit').textContent=S.modo==='org'?'STEM Day · Organización':'Colegio vivo';
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
  $('mapa').hidden=lista; $('lista').hidden=!lista; $('btnColegio').hidden=lista||!S.stops.length; $('btnColegio').style.top=($('mapa').offsetTop+10)+'px';
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
  if(S.modo==='org'&&S.panel==='vivo'&&!document.hidden&&document.activeElement.id!=='vBus') pintarVivo();
  if(S.modo==='master'||S.modo==='org'){ if(S.panel==='ruta'&&!ColegioVivo.ocupado()&&(!ColegioVivo.manual||Date.now()-ColegioVivo.manual>180000)){ ColegioVivo.manual=0; ColegioVivo.setHora(horaMaster()); } revisarAlertas(); return; }
  if(!S.stops.length||S.modo!=='docente') { revisarAlertas(); return; }
  const idx=indiceActual(S.stops);
  if(idx!==S.mapa.cur && !S.mapa.busy){
    if(mapaVisible() && !document.hidden && idx>S.mapa.cur && !S.mapaSucio){ S.mapa.goTo(idx); LS.set('steam_last_'+S.curso,idx); }
    else S.mapaSucio=true;   // se anima cuando el docente vuelva al mapa
  }
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
  const f=S.stops[i]; if(!f) return; const col=colorDe(f); let body='';
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
      <div class="sec"><h3>Docentes del curso</h3><p>Acompañante: ${escHTML(f.acompanante||'—')}<br>Apoyo: ${escHTML(f.apoyo||'—')}</p></div>`}
      ${!futura&&f.tipo!=='pausa'?`<div style="padding:0 16px"><button class="btn ghost" id="verAnim">Ver la animación de llegada</button></div>`:''}
      ${evaluable(f)&&terminada(f)?`<div style="padding:8px 16px 0"><button class="btn" id="evalAct">📝 ${S.encMias&&S.encMias[encClave(S.curso,f.hora_inicio)]?'Ver o corregir mi encuesta':'Evaluar esta actividad'}</button></div>`:''}`;
  }
  const sh=$('sheet');
  sh.innerHTML=`<div class="sh" style="background:${col}"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">${S.modo==='master'?'Actividad':'Estación'} ${i+1} de ${S.stops.length}</div>
    <h3>${escHTML(f.nombre)}</h3><span class="tag2">${escHTML(f.area||'')}</span></div><div class="sb">${body}</div>`;
  sh.classList.add('open'); $('shX').onclick=cerrarSheet;
  if($('irAqui')) $('irAqui').onclick=async()=>{ cerrarSheet(); if(S.vista!=='mapa'){ S.vista='mapa'; $('btnVista').textContent='☰'; pintarRuta(false);} S.masterIdx=i; LS.set('steam_midx_'+S.area+S.nivel,i); await S.mapa.goTo(i); pintarLista(i); pintarTarjeta(i); };
  if($('verAnim')) $('verAnim').onclick=()=>{ cerrarSheet(); mostrarLlegada($('p-ruta'),f); };
  if($('evalAct')) $('evalAct').onclick=()=>{ cerrarSheet(); abrirEncuesta({...f,curso:S.curso}); };
}
function cerrarSheet(){ $('sheet').classList.remove('open'); }

/* ---------------- ayuda: elegir grado y curso ---------------- */
function abrirAyuda(){
  const G={}; S.prog.filter(r=>r.tipo==='actividad').forEach(r=>{ (G[r.grado]=G[r.grado]||new Set()).add(r.curso); });
  const grados=Object.keys(G); if(!grados.length) return toast('Aún no hay programación cargada.','bad');
  S.hSel={ grado:(filaDe(S.curso)||{}).grado||grados[0], cursos:[...S.cursos] };
  const pintar=()=>{
    const sh=$('sheet'), h=S.hSel;
    sh.innerHTML=`<div class="sh" style="background:var(--brand)"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">Ayuda</div><h3>¿Tu curso no aparece bien?</h3></div>
      <div class="sb hsel"><p class="sm">Elige el grado y el curso que vas a acompañar. Si eres docente de apoyo de dos cursos, marca ambos (pueden ser de grados distintos).</p>
      <h4>Grado</h4><div class="row">${grados.map(g=>`<span class="chip ${h.grado===g?'on':''}" data-g="${escHTML(g)}">${escHTML(g)}</span>`).join('')}</div>
      <h4>Curso (máximo 2)</h4><div class="row">${[...G[h.grado]].sort().map(c=>`<span class="chip ${h.cursos.includes(c)?'on':''}" data-c="${escHTML(c)}">${escHTML(c)}</span>`).join('')}</div>
      <h4>Seleccionados</h4><p>${h.cursos.length?escHTML(h.cursos.join(' y ')):'<span class="pend">Ninguno</span>'}</p>
      <button class="btn" style="margin-top:14px" id="hOk" ${h.cursos.length?'':'disabled'}>Actualizar mi ruta</button>
      ${S.perfil.cursos_manual?'<button class="btn ghost" style="margin-top:8px" id="hReset">Volver a lo que dice la programación</button>':''}
      <p class="sm" style="margin-top:10px">El administrador verá esta corrección para ajustar el Excel.</p></div>`;
    $('shX').onclick=cerrarSheet;
    sh.querySelectorAll('[data-g]').forEach(e=>e.onclick=()=>{ h.grado=e.dataset.g; pintar(); });
    sh.querySelectorAll('[data-c]').forEach(e=>e.onclick=()=>{ const c=e.dataset.c, k=h.cursos.indexOf(c); if(k>=0) h.cursos.splice(k,1); else { if(h.cursos.length>=2) h.cursos.shift(); h.cursos.push(c); } pintar(); });
    $('hOk').onclick=async()=>{ if(await guardarPerfil({cursos_manual:h.cursos})){ definirModo(); S.curso=h.cursos[0]; cerrarSheet(); pintarRuta(true); toast('Tu ruta se actualizó: '+h.cursos.join(' y '),'ok'); } };
    if($('hReset')) $('hReset').onclick=async()=>{ if(await guardarPerfil({cursos_manual:null})){ definirModo(); cerrarSheet(); pintarRuta(true); toast('Se restauró tu asignación original','ok'); } };
  };
  pintar(); $('sheet').classList.add('open');
}

/* ================= Programa → mapa ================= */
async function verEnMapa(rs){
  if(!rs||!rs.length) return; const f=(S.modo==='docente'&&rs.find(r=>S.cursos.includes(r.curso)))||rs[0];
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
    <div style="padding:8px 16px">${S.modo==='org'?'<button class="btn alt" id="fCam">🧭 Ver recorrido desde donde estoy</button><div style="height:8px"></div>':''}<button class="btn" id="fEnt">🚪 Entrar y ver el salón</button></div></div>`;
  if(abrir) sh.classList.add('open'); $('shX').onclick=cerrarSheet;
  $('fEnt').onclick=()=>{ cerrarSheet(); ColegioVivo.entrar(f); actualizarBotonesCV(); };
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
const EST_V={A:['✓','Asistió','#1f9d6b'],N:['✗','No asistió','#e5484d'],T:['⏱','Llegó tarde','#f2a900'],P:['🚪','Permiso de salida','#7b4bd6']};
async function cargarEstudiantes(forzar){
  if(S.est&&!forzar&&!S.asisSucia) return;
  // Supabase entrega máximo 1000 filas por consulta: se piden por páginas
  const todo=async(t,cols,ord)=>{ let out=[]; for(let i=0;;i+=1000){ let q=S.sb.from(t).select(cols); ord.forEach(o=>q=q.order(o)); const r=await q.range(i,i+999); if(r.error) return r; out=out.concat(r.data||[]); if(!r.data||r.data.length<1000) return {data:out}; } };
  const [e,a]=await Promise.all([ todo('sd_estudiantes','id,grado,curso,nombre,orden',['curso','orden','id']), todo('sd_asistencia','*',['estudiante_id']) ]);
  if(e.error) throw e.error; if(a.error) throw a.error;
  S.est=e.data||[]; S.asis={}; (a.data||[]).forEach(x=>S.asis[x.estudiante_id]=x); S.asisSucia=false;
}
/* ---- docente: llamado a lista ---- */
async function pintarLista2(){
  const el=$('listaPz'); if(!S.cursos.length){ el.innerHTML='<div class="alertbox">Aún no tienes un curso asignado. Usa el botón <b>?</b> de Mi ruta.</div>'; return; }
  if(!S.listaCurso||!S.cursos.includes(S.listaCurso)) S.listaCurso=S.curso||S.cursos[0];
  el.innerHTML='<p class="sm">Cargando estudiantes…</p>';
  try{ await cargarEstudiantes(!S.listaLocal); }catch(e){ el.innerHTML=`<div class="alertbox">No se pudo cargar la lista: ${escHTML(e.message)}</div>`; return; }
  if(!S.listaLocal||S.listaLocal.curso!==S.listaCurso){
    const L=S.est.filter(x=>x.curso===S.listaCurso);
    S.listaLocal={curso:S.listaCurso, filas:L.map(x=>({id:x.id,nombre:x.nombre,v:(S.asis[x.id]||{}).estado||null,m:(S.asis[x.id]||{}).motivo||''})), cambios:false};
  }
  dibujarLista('');
}
function dibujarLista(filtro){
  const el=$('listaPz'), L=S.listaLocal, c={A:0,N:0,T:0,P:0}; L.filas.forEach(x=>x.v&&c[x.v]++); const pend=L.filas.filter(x=>!x.v).length;
  const dg=rutaCurso(L.curso).find(s=>s.tipo==='actividad');
  let h=`${S.cursos.length>1?`<div class="segs">${S.cursos.map(c=>`<span data-c="${escHTML(c)}" class="${c===L.curso?'on':''}">${escHTML(c)}</span>`).join('')}</div>`:''}
    <h3>Llamado a lista · ${escHTML(L.curso)}</h3><div class="sub">${dg?`${escHTML(dg.nombre)} · ${fmtHora(dg.h)} – ${fmtHora(dg.f)} · Salón ${escHTML(dg.salon||'')} · `:''}${L.filas.length} estudiantes</div>`;
  if(!L.filas.length){ el.innerHTML=h+'<div class="alertbox">Aún no se ha cargado la lista de estudiantes de este curso. El administrador la carga desde Administración → Estudiantes.</div>'; bindSegs(); return; }
  h+=`<div class="cnt">${Object.entries(EST_V).map(([k,[i,t,col]])=>`<div><b style="color:${col}">${c[k]}</b><small>${i} ${t}</small></div>`).join('')}</div>
    <div class="leg">${pend?`⚪ Sin marcar: <b>${pend}</b>`:'✔ Todos marcados'}${L.cambios?' · <b style="color:#b07a00">Cambios sin guardar</b>':''}</div>
    <input class="srch" id="lBus" placeholder="Buscar estudiante…" value="${escHTML(filtro)}">
    <button class="pbtn alt" id="lTodos">✓ Marcar a los que faltan como "Asistió"</button><div style="height:8px"></div>`;
  L.filas.forEach((x,i)=>{ if(filtro&&!x.nombre.toLowerCase().includes(filtro.toLowerCase())) return;
    h+=`<div class="est"><span class="num">${i+1}</span><div class="nm">${escHTML(x.nombre)}${x.v?`<small style="color:${EST_V[x.v][2]}">${EST_V[x.v][1]}</small>`:'<small>Sin marcar</small>'}${x.v==='P'?`<input data-m="${i}" maxlength="200" placeholder="Motivo del permiso (opcional)" value="${escHTML(x.m)}">`:''}</div>
      <div class="st">${Object.keys(EST_V).map(k=>`<span data-i="${i}" data-v="${k}" class="${x.v===k?'on':''}" title="${EST_V[k][1]}">${EST_V[k][0]}</span>`).join('')}</div></div>`; });
  h+=`<button class="pbtn" id="lGuardar">Guardar llamado a lista</button>`;
  const st=$('p-lista').scrollTop; el.innerHTML=h; $('p-lista').scrollTop=st; bindSegs();
  el.querySelectorAll('.st span').forEach(e=>e.onclick=()=>{ const x=L.filas[+e.dataset.i]; x.v=x.v===e.dataset.v?null:e.dataset.v; L.cambios=true; dibujarLista($('lBus').value); });
  el.querySelectorAll('[data-m]').forEach(e=>e.oninput=()=>{ L.filas[+e.dataset.m].m=e.value; L.cambios=true; });
  $('lBus').oninput=e=>{ const v=e.target.value; dibujarLista(v); const b=$('lBus'); b.focus(); b.setSelectionRange(v.length,v.length); };
  $('lTodos').onclick=()=>{ L.filas.forEach(x=>{ if(!x.v) x.v='A'; }); L.cambios=true; dibujarLista(''); };
  $('lGuardar').onclick=guardarLista;
}
function bindSegs(){ $('listaPz').querySelectorAll('.segs [data-c]').forEach(e=>e.onclick=()=>{ if(S.listaLocal&&S.listaLocal.cambios&&!confirm('Hay cambios sin guardar. ¿Cambiar de curso de todas formas?')) return; S.listaCurso=e.dataset.c; S.listaLocal=null; pintarLista2(); }); }
async function guardarLista(){
  const L=S.listaLocal, filas=L.filas.filter(x=>x.v).map(x=>({estudiante_id:x.id,curso:L.curso,estado:x.v,motivo:x.v==='P'&&x.m?x.m.slice(0,200):null,registrado_por:S.perfil.id,actualizado_en:new Date().toISOString()}));
  const quitar=L.filas.filter(x=>!x.v&&S.asis[x.id]).map(x=>x.id);
  $('lGuardar').disabled=true; $('lGuardar').textContent='Guardando…';
  let err=null;
  if(filas.length){ const r=await S.sb.from('sd_asistencia').upsert(filas,{onConflict:'estudiante_id'}); err=r.error; }
  if(!err&&quitar.length){ const r=await S.sb.from('sd_asistencia').delete().in('estudiante_id',quitar); err=r.error; }
  if(err){ toast('No se pudo guardar: '+err.message,'bad',5000); dibujarLista(''); return; }
  filas.forEach(f=>S.asis[f.estudiante_id]=f); quitar.forEach(id=>delete S.asis[id]); L.cambios=false;
  const pend=L.filas.filter(x=>!x.v).length;
  toast(pend?`Guardado. Faltan ${pend} por marcar.`:'Llamado a lista guardado ✓','ok',3500); dibujarLista('');
}
/* ---- resumen: administración, Master y organizadores ---- */
async function pintarAsis(grado){
  const el=$('asisPz'); if(grado!==undefined) S.asisGrado=grado; grado=S.asisGrado||'Todos';
  if(!S.est) el.innerHTML='<p class="sm">Cargando asistencia…</p>';
  try{ await cargarEstudiantes(); }catch(e){ el.innerHTML=`<div class="alertbox">No se pudo cargar: ${escHTML(e.message)}</div>`; return; }
  if(S.asisCurso) return detalleAsis(S.asisCurso);
  const cursos=[...new Set(S.est.map(x=>x.curso))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true})), GR={}; S.est.forEach(x=>GR[x.curso]=x.grado);
  const ORDG=['transicion','primero','segundo','tercero','cuarto','quinto','sexto','septimo','octavo','noveno','decimo','undecimo'], og=g=>{ const i=ORDG.indexOf(String(g).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()); return i<0?99:i; };
  const grados=[...new Set(S.est.map(x=>x.grado))].sort((a,b)=>og(a)-og(b)||String(a).localeCompare(b)), cs=cursos.filter(c=>grado==='Todos'||GR[c]===grado);
  const cuenta=c=>{ const r={A:0,N:0,T:0,P:0,S:0,n:0}; S.est.forEach(x=>{ if(x.curso!==c) return; r.n++; const a=S.asis[x.id]; a?r[a.estado]++:r.S++; }); return r; };
  const tot={A:0,N:0,T:0,P:0,S:0}; const rs=cs.map(c=>{ const r=cuenta(c); for(const k in tot) tot[k]+=r[k]; return [c,r]; });
  let h=`<h3>Asistencia · dirección de grupo</h3><div class="sub">Se actualiza en tiempo real a medida que los docentes guardan su lista.</div>`;
  if(!S.est.length){ el.innerHTML=h+'<div class="alertbox">Aún no se ha cargado la lista de estudiantes (Administración → Estudiantes).</div>'; return; }
  h+=`<div class="cnt">${Object.entries(EST_V).map(([k,[i,t,col]])=>`<div><b style="color:${col}">${tot[k]}</b><small>${i} ${t}</small></div>`).join('')}</div>
    <div class="leg">⚪ Sin marcar: <b>${tot.S}</b> · Cursos: <b>${cs.length}</b></div>
    <div class="segs wrap">${['Todos',...grados].map(g=>`<span data-g="${escHTML(g)}" class="${g===grado?'on':''}">${escHTML(g)}</span>`).join('')}</div>`;
  rs.forEach(([c,r])=>{ h+=`<div class="crs" data-c="${escHTML(c)}"><div class="t"><b>${escHTML(c)}</b><span>${r.S===r.n?'<span class="pend">Sin llamado aún</span>':`✓${r.A} · ⏱${r.T} · 🚪${r.P} · ✗${r.N}${r.S?` · ⚪${r.S}`:''}`}</span></div>
    <div class="bar">${['A','T','P','N'].map(k=>`<i style="width:${r[k]/r.n*100}%;background:${EST_V[k][2]}"></i>`).join('')}</div></div>`; });
  if(S.perfil.rol==='admin') h+=`<button class="pbtn alt" id="aXls">⬇ Descargar Excel de asistencia</button>`;
  el.innerHTML=h;
  el.querySelectorAll('[data-g]').forEach(e=>e.onclick=()=>pintarAsis(e.dataset.g));
  el.querySelectorAll('[data-c]').forEach(e=>e.onclick=()=>{ S.asisCurso=e.dataset.c; detalleAsis(e.dataset.c); });
  if($('aXls')) $('aXls').onclick=descargarAsistencia;
}
function detalleAsis(c){
  const el=$('asisPz'), L=S.est.filter(x=>x.curso===c);
  let h=`<h3>${escHTML(c)} · ${escHTML((L[0]||{}).grado||'')}</h3><div class="sub"><a href="#" id="aVol">← Volver al resumen</a></div>`;
  ['N','P','T','A'].forEach(k=>{ const ls=L.filter(x=>(S.asis[x.id]||{}).estado===k); if(!ls.length) return;
    h+=`<h4 style="color:${EST_V[k][2]};margin:12px 0 4px">${EST_V[k][0]} ${EST_V[k][1]} (${ls.length})</h4>`+ls.map(x=>`<div class="est"><div class="nm">${escHTML(x.nombre)}${S.asis[x.id].motivo?`<small>${escHTML(S.asis[x.id].motivo)}</small>`:''}</div></div>`).join(''); });
  const sin=L.filter(x=>!S.asis[x.id]); if(sin.length) h+=`<h4 style="color:var(--muted);margin:12px 0 4px">⚪ Sin marcar (${sin.length})</h4>`+sin.map(x=>`<div class="est"><div class="nm">${escHTML(x.nombre)}</div></div>`).join('');
  el.innerHTML=h; $('aVol').onclick=e=>{ e.preventDefault(); S.asisCurso=null; pintarAsis(); };
}
async function descargarAsistencia(){
  try{ if(typeof window.cargarXLSX==='function') await window.cargarXLSX(); else throw new Error('Recarga la página.');
    const filas=S.est.map(x=>{ const a=S.asis[x.id]||{}; return {Grado:x.grado,Curso:x.curso,Estudiante:x.nombre,Estado:a.estado?EST_V[a.estado][1]:'Sin marcar',Motivo:a.motivo||'',Hora:a.actualizado_en?new Date(a.actualizado_en).toLocaleTimeString('es-CO'):''}; });
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(filas),'Asistencia');
    XLSX.writeFile(wb,'asistencia-steam-day.xlsx');
  }catch(e){ toast('No se pudo generar el Excel: '+e.message,'bad',5000); }
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
    <input class="srch" id="vBus" placeholder="Buscar curso, salón o actividad…" value="${escHTML(S.vivoQ||'')}">
    ${pz.map(p=>`<div class="leg">☕ ${escHTML(p.area)} ${escHTML(p.nivel)}: ${fmtHora(p.hora_inicio)} – ${fmtHora(p.hora_fin)}</div>`).join('')}`;
  let n=0;
  Object.entries(G).forEach(([k,fs])=>{ fs=fs.filter(f=>!q||`${f.curso} ${f.salon} ${f.area}`.toLowerCase().includes(q)).sort((x,y)=>String(x.curso).localeCompare(y.curso,'es',{numeric:true})); if(!fs.length) return; n+=fs.length;
    const col=(fs.find(f=>f.categoria!=='gen')||{}).categoria; 
    h+=`<div class="lugar" style="--c:${col?AREA_C[col]:'#5b6577'}"><h4><span>${escHTML(ColegioVivo.nombreZona(k))}</span><span>${fs.length} curso${fs.length>1?'s':''}</span></h4>${fs.map(f=>`<div class="fila" data-id="${f.id}"><b>${escHTML(f.curso)}</b><span>${escHTML(f.titulo?titA(f.titulo):f.area)} · Salón ${escHTML(f.salon||'—')}</span><i>🧭</i></div>`).join('')}</div>`; });
  if(!n) h+='<p class="pend" style="margin-top:10px">No hay cursos en actividad a esta hora.</p>';
  el.innerHTML=h;
  $('vMenos').onclick=()=>{ S.vivoMin=Math.max(420,m-15); pintarVivo(); }; $('vMas').onclick=()=>{ S.vivoMin=Math.min(900,m+15); pintarVivo(); }; $('vAhora').onclick=()=>{ S.vivoMin=null; pintarVivo(); };
  $('vBus').oninput=e=>{ S.vivoQ=e.target.value; pintarVivo(); const b=$('vBus'); b.focus(); b.setSelectionRange(b.value.length,b.value.length); };
  el.querySelectorAll('.fila').forEach(e=>e.onclick=()=>{ const f=S.prog.find(x=>String(x.id)===e.dataset.id); if(f) verEnMapa([f]); });
}

/* ================= Organizador: chat interno ================= */
async function abrirChat(){
  S.chatNo=0; marcarNav();
  if(!S.chat){ const {data,error}=await S.sb.from('sd_chat').select('*').order('creado_en',{ascending:false}).limit(150);
    if(error){ $('msgs').innerHTML=`<div class="alertbox">No se pudo abrir el chat: ${escHTML(error.message)}</div>`; return; } S.chat=(data||[]).reverse(); }
  pintarChat();
  $('quick').innerHTML=['Todo en orden ✅','Necesito apoyo en ','Curso retrasado: ','¿Dónde queda '].map(q=>`<span>${escHTML(q)}</span>`).join('');
  $('quick').querySelectorAll('span').forEach(q=>q.onclick=()=>{ $('chTxt').value=q.textContent; $('chTxt').focus(); });
  const enviar=async()=>{ const v=$('chTxt').value.trim(); if(!v) return; $('chTxt').value='';
    const {data,error}=await S.sb.from('sd_chat').insert({perfil_id:S.perfil.id,nombre:S.perfil.nombre,mensaje:v.slice(0,1000)}).select().single();
    if(error){ toast('No se envió: '+error.message,'bad',4000); $('chTxt').value=v; return; } if(data) nuevoMensaje(data); };
  $('chEnv').onclick=enviar; $('chTxt').onkeydown=e=>{ if(e.key==='Enter') enviar(); };
}
const COLS=['#1f9d6b','#7b4bd6','#e5484d','#2f6fde','#b07a00','#0f8a8a'];
function pintarChat(){
  const box=$('msgs'), fij=S.chat.filter(m=>m.fijado), resto=S.chat.filter(m=>!m.fijado);
  box.innerHTML=[...fij,...resto].map(m=>{ const yo=m.perfil_id===S.perfil.id, c=COLS[(String(m.nombre).length)%COLS.length];
    return `<div class="m ${yo?'yo':''} ${m.fijado?'fij':''}" style="--c:${c}">${yo?'':`<small>${m.fijado?'📌 ':''}${escHTML(m.nombre)}</small>`}${escHTML(m.mensaje)}<em>${new Date(m.creado_en).toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit'})}</em></div>`; }).join('')||'<p class="sm" style="padding:10px">Aún no hay mensajes. Escribe el primero.</p>';
  box.scrollTop=box.scrollHeight;
}
function nuevoMensaje(m){
  if(S.modo!=='org'&&S.perfil.rol!=='admin') return;
  if(S.chat){ if(S.chat.some(x=>x.id===m.id)) return; S.chat.push(m); }
  if(S.chat&&S.panel==='chat'&&!document.hidden) pintarChat();
  else if(m.perfil_id!==S.perfil.id){ S.chatNo=(S.chatNo||0)+1; marcarNav(); const p=prefs(); if(p.sonido) sonarTono(p.tono); toast('💬 '+m.nombre+': '+m.mensaje.slice(0,60),'',4000); }
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
    h+=`<tr><td class="h">${fmtHora(fr.hora_inicio)}</td>`;
    if(pausa) h+=`<td class="p" colspan="${grados.length}">${escHTML(pausa.area)}</td>`;
    else grados.forEach(g=>{ const rs=filas.filter(f=>f.grado===g&&f.hora_inicio===fr.hora_inicio);
      const mine=S.modo==='docente'&&rs.some(r=>S.cursos.includes(r.curso));
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
    <div class="set"><div><b>Vibración</b></div><label class="tg"><input type="checkbox" id="aVib" ${p.vibracion?'checked':''}><i></i></label></div>
    <div class="opt" style="margin-top:12px"><h4>Avisarme antes de cada actividad</h4><div class="row" id="aAnt">${[5,10,15].map(m=>`<span class="chip ${p.anticipacion_min===m?'on':''}" data-m="${m}">${m} min</span>`).join('')}</div></div>
    ${S.modo==='docente'?`<div class="opt"><h4>Próximos avisos</h4>${prox.length?prox.slice(0,6).map(s=>{ const m=toMin(s.h)-p.anticipacion_min; return `<div class="nx"><span>${fmtHora(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'))}</span><div><b>${escHTML(s.nombre)}${S.cursos.length>1&&s.tipo!=='pausa'?' · '+escHTML(s.cursoA):''}</b><small>${escHTML(s.tipo==='pausa'?s.area:'Salón '+(s.salon||'por definir'))}</small></div></div>`; }).join(''):'<p class="sm">No hay más actividades por hoy.</p>'}</div>`:'<p class="sm" style="margin:10px 0">Como usuario Master recibirás los avisos generales del evento.</p>'}
    <div class="opt" style="margin-top:6px"><h4>Más</h4><div class="row"><span class="chip" id="aVideo">▶ Ver video de bienvenida</span>${tutorialURL()?'<span class="chip" id="aTuto">▶ Ver tutorial</span>':''}${S.modo==='org'||S.perfil.rol==='admin'?'<span class="chip" id="aAvat">☺ Editar mi avatar</span>':''}${S.vistaComo?'<span class="chip on" id="aSalir">👁 Volver a mi perfil</span>':'<span class="chip" id="aSalir">Cerrar sesión</span>'}<span class="chip" id="aDiag">📏 Diagnóstico de pantalla</span></div><p class="sm" style="margin-top:8px">Versión de la app: ${VERSION_APP}</p></div>`;
  const save=async c=>{ await guardarPerfil({alertas:{...prefs(),...c}}); pintarAlertas(); };
  if($('aAct')) $('aAct').onclick=async()=>{ await activarAvisos(); pintarAlertas(); };
  $('aCerr').onchange=async e=>{ if(e.target.checked) await activarAvisos(); else await desactivarPush(); save({app_cerrada:e.target.checked}); };
  $('aSon').onchange=e=>save({sonido:e.target.checked});
  $('aVib').onchange=e=>save({vibracion:e.target.checked});
  document.querySelectorAll('#aTonos [data-t]').forEach(e=>e.onclick=()=>{ sonarTono(e.dataset.t); save({tono:e.dataset.t}); });
  document.querySelectorAll('#aAnt [data-m]').forEach(e=>e.onclick=()=>save({anticipacion_min:+e.dataset.m}));
  $('aProbar').onclick=()=>sonarTono(prefs().tono);
  $('aVideo').onclick=()=>pantallaVideo(true);
  $('aDiag').onclick=()=>{ window._diag=true; pintarDiag(); };
  if($('aTuto')) $('aTuto').onclick=()=>pantallaTutorial(true);
  if($('aAvat')) $('aAvat').onclick=()=>irPanel('avatar');
  $('aSalir').onclick=async()=>{ if(S.vistaComo) return salirVista(); await S.sb.auth.signOut(); location.reload(); };
}
function revisarAlertas(){
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
    navigator.serviceWorker.ready.then(r=>r.showNotification(`En ${faltan} min: ${s.nombre}`,{ body:`📍 ${s.tipo==='pausa'?s.area:'Salón '+(s.salon||'por definir')} · ${fmtHora(s.h)}`, tag:'steam-'+(s.tipo==='pausa'?'pausa-'+s.nivel:s.cursoA)+'-'+s.h, icon:'icon-192.png', badge:'icon-192.png' })).catch(()=>{});
  const vacia=!_cola.length;
  _cola.push({s, hasta:toMin(s.h)});
  if(vacia){ if(p.sonido) sonarTono(p.tono); if(p.vibracion && navigator.vibrate) navigator.vibrate([300,150,300,150,600]); mostrarSiguienteAlerta(); }
}
function mostrarSiguienteAlerta(){
  if(!_cola.length){ $('modalBox').innerHTML=''; return; }
  const {s, hasta}=_cola[0], faltan=Math.max(1, hasta-ahora().min), col=colorDe(s);
  $('modalBox').innerHTML=`<div class="modal"><div class="mbox"><div class="bell">🔔</div>
    <div class="k" style="color:${col}">En ${faltan} minutos${s.tipo==='pausa'?'':' · '+escHTML(AREA_N[s.cat])}${S.cursos.length>1&&s.tipo!=='pausa'?' · Curso '+escHTML(s.cursoA):''}</div>
    <h3>${escHTML(s.nombre)}</h3><div class="mi"><span>🕘</span>${fmtHora(s.h)} – ${fmtHora(s.f)}</div>
    ${s.tipo==='pausa'?'':`<div class="mi"><span>📍</span>Salón ${P(s.salon)}</div><div class="mi"><span>👤</span>${P(s.docente_cargo)}</div>`}
    ${s.frase?`<p>${escHTML(s.frase)}</p>`:'<p></p>'}
    <button class="btn" id="mOk">${_cola.length>1?'Siguiente aviso ('+(_cola.length-1)+')':'Entendido'}</button></div></div>`;
  $('mOk').onclick=()=>{ _cola.shift(); mostrarSiguienteAlerta(); };
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
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'sd_chat'},payload=>nuevoMensaje(payload.new))
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'sd_avisos'},async payload=>{
      S.avisos.unshift(payload.new); pintarBanner();
      if(avisosMios().some(a=>a.id===payload.new.id)){ const p=prefs(); if(p.sonido) sonarTono(p.tono); toast('📣 '+payload.new.titulo,'',5000); } })
    .subscribe();
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
const VC_ROL={ docente:'Docente', organizador:'Organizador', master:'Master', admin:'Administrador' };
function pintarFranjaVista(){
  const f=$('vcomo'); if(!f) return;
  if(!S.vistaComo){ f.hidden=true; return; }
  f.hidden=false;
  f.innerHTML=`<span class="ojo">👁</span><div><small>Estás viendo la app como</small><b>${escHTML(VC_ROL[S.perfil.rol]||S.perfil.rol)} · ${escHTML(S.perfil.nombre||'')}</b></div><button id="vcCambiar">Cambiar</button><button id="vcSalir" class="fin">Salir</button>`;
  $('vcCambiar').onclick=abrirVerComo; $('vcSalir').onclick=salirVista;
}
async function abrirVerComo(){
  const m=$('vcModal'); m.hidden=false;
  m.innerHTML=`<div class="vcbox"><div class="vchead"><div><b>Ver la app como…</b><small>Elige un perfil para ver su interfaz. Solo para revisar: no se guarda ningún cambio.</small></div><button class="vcx" id="vcX">✕</button></div>
    <div class="vctabs" id="vcTabs">${[['docente','Docentes'],['organizador','Organizadores'],['master','Master']].map(([k,t],i)=>`<span data-r="${k}" class="${i?'':'on'}">${t}</span>`).join('')}</div>
    <input id="vcBus" class="vcbus" placeholder="Buscar por nombre o curso…" autocomplete="off">
    <div class="vclist" id="vcList"><p class="sm" style="padding:14px">Cargando perfiles…</p></div>
    ${S.vistaComo?'<button class="btn" id="vcMio">Volver a mi perfil de administrador</button>':''}</div>`;
  m.onclick=e=>{ if(e.target===m) m.hidden=true; }; $('vcX').onclick=()=>m.hidden=true;
  if($('vcMio')) $('vcMio').onclick=salirVista;
  if(!S._vcLista){
    const { data, error } = await S.sb.from('sd_perfiles').select('id,nombre,nombre_n,rol,experiencia,cursos_manual').neq('rol','admin').order('nombre');
    if(error){ $('vcList').innerHTML=`<p class="sm" style="padding:14px">No se pudieron leer los perfiles: ${escHTML(error.message)}</p>`; return; }
    const ac={}, ap={};
    S.prog.forEach(r=>{ if(r.tipo!=='actividad') return; if(r.acompanante_n) (ac[r.acompanante_n]=ac[r.acompanante_n]||new Set()).add(r.curso); if(r.apoyo_n) (ap[r.apoyo_n]=ap[r.apoyo_n]||new Set()).add(r.curso); });
    S._vcLista=(data||[]).map(p=>{ let det='';
      if(p.rol==='docente'){ const a=[...(ac[p.nombre_n]||[])].sort(), b=[...(ap[p.nombre_n]||[])].sort();
        det = p.cursos_manual&&p.cursos_manual.length ? 'Cursos: '+p.cursos_manual.join(', ') : a.length ? 'Acompaña '+a.join(', ')+(b.length?' · apoya '+b.join(', '):'') : b.length ? 'Apoya '+b.join(', ') : 'Sin curso en la programación'; }
      else if(p.rol==='master') det='Experiencia: '+(AREA_N[p.experiencia]||'sin elegir');
      else det='Organización del evento';
      return { ...p, det }; });
  }
  let rol='docente';
  const pintar=()=>{ const q=($('vcBus').value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const l=S._vcLista.filter(p=>p.rol===rol && (!q || ((p.nombre||'')+' '+p.det).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q)));
    $('vcList').innerHTML = l.length ? l.slice(0,200).map(p=>`<div class="vcit ${S.vistaComo&&S.perfil.id===p.id?'on':''}" data-id="${p.id}"><i>${escHTML((p.nombre||'?').trim()[0]||'?')}</i><div><b>${escHTML(p.nombre||'Sin nombre')}</b><small>${escHTML(p.det)}</small></div><span>Ver ›</span></div>`).join('')
      : `<p class="sm" style="padding:14px">No hay ${rol==='docente'?'docentes':rol==='master'?'usuarios master':'organizadores'} ${q?'con esa búsqueda':'registrados'}.</p>`;
    $('vcList').querySelectorAll('.vcit').forEach(e=>e.onclick=()=>irVista(e.dataset.id)); };
  $('vcTabs').querySelectorAll('span').forEach(t=>t.onclick=()=>{ rol=t.dataset.r; $('vcTabs').querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===t)); pintar(); });
  $('vcBus').oninput=pintar; pintar();
}

window.STEAM = S; window.continuarApp = continuar; window.recargarApp = async()=>{ await cargarDatos(); definirModo(); pintarRuta(true); };
/* iPhone: al cerrar el teclado o girar la pantalla, la vista puede quedar corrida hacia arriba. Se devuelve a su sitio. */
/* iPhone instalada (v23):
   - La app mide el alto real de la pantalla y lo usa para cada pantalla (evita el espacio en blanco abajo).
   - Con el teclado abierto, la pantalla se reduce al espacio visible y el campo activo se desplaza a la vista.
   - Al cerrar el teclado, todo vuelve a su sitio. */
const VERSION_APP='25';
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
    document.documentElement.style.setProperty('--app-h',window.innerHeight+'px');
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
  d.textContent=`STEM Day · diagnóstico (toca para cerrar)\nversión: ${(document.querySelector('script[src*="app.js"]')||{}).src||''}\nmodo: ${matchMedia('(display-mode: standalone)').matches||navigator.standalone?'instalada':'navegador'}\npantalla: ${screen.width}x${screen.height}  ventana: ${innerWidth}x${innerHeight}\nvisual: ${VV?Math.round(VV.width)+'x'+Math.round(VV.height)+' desde '+Math.round(VV.offsetTop):'-'}\nscrollY: ${scrollY}  zona segura arriba: ${sa}px\npantalla actual: top ${Math.round(r.top)} alto ${Math.round(r.height)}\nalto app: ${getComputedStyle(document.documentElement).getPropertyValue('--app-h')}`; }
(function(){ let n=0,t0=0; document.addEventListener('pointerup',e=>{ if(!e.target.closest('#mTit,.mtop h2,#s-login .emblem')) return; const now=Date.now(); n=now-t0<600?n+1:1; t0=now; if(n>=5){ n=0; window._diag=true; pintarDiag(); } }); })();
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();   // espera a que carguen todos los scripts (encuestas.js, admin.js)
