/* =====================================================================
   STEAM Day Cafam · Aplicación principal
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
  const { data:{ session } } = await S.sb.auth.getSession();
  if(!session) return pantallaLogin();
  S.user=session.user; await continuar();
}

function pantallaLogin(){
  show('s-login');
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
  S.avisos=a.data||[];
}

async function continuar(){
  try{ await cargarPerfil(); }catch(e){ return errorFatal('No fue posible leer tu perfil. '+e.message); }
  if(!S.perfil){ return errorFatal('Tu cuenta aún no está habilitada para el STEAM Day. Escribe al coordinador de Tecnología.', true); }
  if(!S.perfil.confirmado) return pantallaClave();
  try{ await cargarDatos(); }catch(e){ return errorFatal('No fue posible cargar la programación. '+e.message); }
  definirModo();
  if(!S.perfil.video_visto) return pantallaVideo();
  if(S.modo==='docente' && !S.perfil.aviso_cursos_visto) return pantallaRol();
  if(S.modo==='master' && !S.perfil.experiencia) return pantallaRol();
  if(!S.perfil.avatar) return pantallaAvatar();
  if(!LS.get('steam_permiso_'+S.perfil.id,false)) return pantallaPermiso();
  principal();
}
function errorFatal(msg, salir){
  $('loading').hidden=false;
  $('loading').innerHTML=`<div style="padding:30px;text-align:center;max-width:420px"><b>${escHTML(msg)}</b><br><br><button class="b2" id="fx">${salir?'Cerrar sesión':'Reintentar'}</button></div>`;
  $('fx').onclick = async()=>{ if(salir){ await S.sb.auth.signOut(); } location.reload(); };
}
async function guardarPerfil(campos){
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
  return `<video src="${escHTML(url)}" controls playsinline preload="metadata"></video>`;
}
function pantallaVideo(desdeMenu){
  show('s-video'); $('vBox').innerHTML=videoHTML(S.config.video_url);
  const v=$('vBox').querySelector('video'); if(v) v.onended=()=>$('vSeguir').click();
  const fin=async()=>{ $('vBox').innerHTML=''; if(desdeMenu){ show('s-main'); return; } await guardarPerfil({video_visto:true}); continuar(); };
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
    .map(r=>({ ...r, h:r.hora_inicio, f:r.hora_fin, cat:r.categoria, nombre: r.tipo==='pausa'?r.area:(r.titulo?cap(r.titulo):r.area), lugar: r.tipo==='pausa'?r.area:(r.salon||'') }));
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
      nombre: titulo?cap(titulo):s.area, lugar: lugarDe(s.filas.map(f=>f.salon)), etq: grados.join(', '),
      grupo: `${grados.join(', ')} (${cs.length>1?cs[0]+'–'+cs[cs.length-1]:cs[0]})` };
  });
}

function pantallaRol(){
  show('s-rol'); const b=$('rolBody'); const nom=escHTML(firstName(S.perfil.nombre));
  let h=`<div class="logo"><div class="mark"><i></i><i></i><i></i><i></i></div><div><b>STEAM Day</b><small>Colegio Cafam</small></div></div>`;
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
    h+=`<h2>Hola, ${nom}. Este es tu rol en el STEAM Day</h2><div class="cc"><span class="sm">Docente acompañante del curso</span><div class="big">${escHTML(ex.acompana.join(', '))}</div><div class="r"><span>Docente de apoyo:</span> ${escHTML(f&&f.apoyo||'—')}</div></div><p>Estarás con tu curso durante toda la jornada. La app te avisará antes de cada actividad.</p>`; }
  if(ex.apoya.length){
    if(!ex.acompana.length) h+=`<h2>Hola, ${nom}. Este es tu rol en el STEAM Day</h2>`;
    h+=`<p>Acompañarás como <b>docente de apoyo</b> a ${ex.apoya.length===1?'este curso':'estos dos cursos'}:</p>`;
    ex.apoya.forEach(c=>{ const f=filaDe(c); h+=`<div class="cc"><div class="big">${escHTML(c)}</div><div class="r"><span>Acompañante:</span> ${escHTML(f&&f.acompanante||'—')}</div></div>`; });
    if(ex.apoya.length>1) h+=`<p>En el mapa podrás cambiar entre los dos cursos y recibirás los avisos de ambos.</p>`;
  }
  if(!ex.acompana.length && !ex.apoya.length)
    h+=`<h2>Hola, ${nom}</h2><div class="alertbox" style="margin:0">No encontramos tu nombre en la programación del STEAM Day.</div><p>Después de crear tu avatar podrás elegir tu grado y curso con el botón <b>?</b> que está arriba a la derecha del mapa.</p>`;
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
  try{ const reg=await navigator.serviceWorker.ready, sub=await reg.pushManager.getSubscription();
    if(sub){ await S.sb.from('sd_push').delete().eq('endpoint',sub.endpoint); await sub.unsubscribe(); } }catch(e){}
}

/* ---------------- pantalla principal ---------------- */
function principal(){
  show('s-main');
  $('btnAdmin').hidden = S.perfil.rol!=='admin';
  $('btnHelp').hidden = S.modo!=='docente';
  $('btnAdmin').onclick=()=>window.abrirAdmin&&window.abrirAdmin();
  $('btnHelp').onclick=abrirAyuda;
  $('btnVista').onclick=()=>{ S.vista=S.vista==='mapa'?'lista':'mapa'; $('btnVista').textContent=S.vista==='mapa'?'☰':'🗺'; pintarRuta(false); };
  document.querySelectorAll('#nav span').forEach(n=>n.onclick=()=>irPanel(n.dataset.p));
  document.querySelectorAll('#gtabs span').forEach(t=>t.onclick=()=>{ document.querySelectorAll('#gtabs span').forEach(x=>x.classList.toggle('on',x===t)); pintarPrograma(t.dataset.n); });
  if(!S.mapa) S.mapa=new MapaSteam($('mapa'),{ onTap:abrirParada, onArrive:i=>{ if(S.modo==='docente') LS.set('steam_last_'+S.curso,i); else { S.masterIdx=i; pintarLista(i); pintarTarjeta(i); } } });
  S.mapa.setAvatar(S.perfil.avatar);
  if(S.modo==='docente' && !S.cursos.length) setTimeout(()=>{ toast('Elige tu grado y curso para ver tu ruta.','',4000); abrirAyuda(); },600);
  pintarRuta(true); pintarBanner(); irPanel('ruta');
  clearInterval(S.timer); S.timer=setInterval(tick,15000); tick();
  suscribirTiempoReal();
}
function irPanel(p){
  S.panel=p;
  ['ruta','programa','avatar','alertas'].forEach(x=>$('p-'+x).hidden=x!==p);
  document.querySelectorAll('#nav span').forEach(n=>n.classList.toggle('on',n.dataset.p===p));
  $('btnVista').hidden=p!=='ruta';
  cerrarSheet();
  if(p==='programa') pintarPrograma(document.querySelector('#gtabs span.on').dataset.n);
  if(p==='avatar'){ montarEditor('avMain'); $('avGuardar2').onclick=async()=>{ if(await guardarPerfil({avatar:S.avTmp})){ S.mapa.setAvatar(S.avTmp); toast('Avatar guardado','ok'); } }; }
  else $('avMain').innerHTML='';
  if(p==='alertas') pintarAlertas();
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
  pintarChips();
  if(S.modo==='master'){
    S.stops=rutaMaster(S.area,S.nivel);
    $('mHola').innerHTML=`Hola, ${nom} · ${S.perfil.rol==='admin'?'Administrador':'Master'}`; $('mTit').textContent='Experiencia '+AREA_N[S.area];
    if(S.masterIdx>=S.stops.length) S.masterIdx=0;
  } else {
    S.stops=S.curso?rutaCurso(S.curso):[];
    $('mHola').innerHTML=`Hola, ${nom}${S.curso?' · Curso '+escHTML(S.curso):''}`; $('mTit').textContent='Ruta STEAM Day';
  }
  const lista=S.vista==='lista';
  $('mapa').hidden=lista; $('lista').hidden=!lista;
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
function tick(){
  if(!S.stops.length||S.modo!=='docente') { revisarAlertas(); return; }
  const idx=indiceActual(S.stops);
  if(idx!==S.mapa.cur && !S.mapa.busy){
    if(mapaVisible() && !document.hidden && idx>S.mapa.cur && !S.mapaSucio){ S.mapa.goTo(idx); LS.set('steam_last_'+S.curso,idx); }
    else S.mapaSucio=true;   // se anima cuando el docente vuelva al mapa
  }
  if(S.mapaSucio && mapaVisible() && !S.mapa.busy && !document.hidden){ pintarRuta(false); revisarAlertas(); return; }
  pintarLista(idx); pintarTarjeta(idx); revisarAlertas();
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden && S.perfil && !$('s-main').hidden) tick(); });

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
      ${f.tipo==='pausa'?'':`<div class="sec"><h3>Actividad</h3><p>${P(f.titulo)}</p></div><div class="sec"><h3>Propósito</h3><p>${P(f.frase)}</p></div>
      <div class="sec"><h3>Docentes del curso</h3><p>Acompañante: ${escHTML(f.acompanante||'—')}<br>Apoyo: ${escHTML(f.apoyo||'—')}</p></div>`}
      ${!futura&&f.tipo!=='pausa'?`<div style="padding:0 16px"><button class="btn ghost" id="verAnim">Ver la animación de llegada</button></div>`:''}`;
  }
  const sh=$('sheet');
  sh.innerHTML=`<div class="sh" style="background:${col}"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">${S.modo==='master'?'Actividad':'Estación'} ${i+1} de ${S.stops.length}</div>
    <h3>${escHTML(f.nombre)}</h3><span class="tag2">${escHTML(f.area||'')}</span></div><div class="sb">${body}</div>`;
  sh.classList.add('open'); $('shX').onclick=cerrarSheet;
  if($('irAqui')) $('irAqui').onclick=async()=>{ cerrarSheet(); if(S.vista!=='mapa'){ S.vista='mapa'; $('btnVista').textContent='☰'; pintarRuta(false);} S.masterIdx=i; LS.set('steam_midx_'+S.area+S.nivel,i); await S.mapa.goTo(i); pintarLista(i); pintarTarjeta(i); };
  if($('verAnim')) $('verAnim').onclick=()=>{ cerrarSheet(); mostrarLlegada($('p-ruta'),f); };
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
      h+= rs.length ? `<td class="c" style="background:${AREA_C[rs[0].categoria]}">${escHTML(short(rs[0].area))}<small>${escHTML(lugarDe(rs.map(r=>r.salon)))}</small></td>` : '<td></td>'; });
    h+='</tr>';
  });
  $('gwrap').innerHTML=h+'</table>';
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
    <div class="opt" style="margin-top:6px"><h4>Más</h4><div class="row"><span class="chip" id="aVideo">▶ Ver video de bienvenida</span><span class="chip" id="aSalir">Cerrar sesión</span></div></div>`;
  const save=async c=>{ await guardarPerfil({alertas:{...prefs(),...c}}); pintarAlertas(); };
  if($('aAct')) $('aAct').onclick=async()=>{ await activarAvisos(); pintarAlertas(); };
  $('aCerr').onchange=async e=>{ if(e.target.checked) await activarAvisos(); else await desactivarPush(); save({app_cerrada:e.target.checked}); };
  $('aSon').onchange=e=>save({sonido:e.target.checked});
  $('aVib').onchange=e=>save({vibracion:e.target.checked});
  document.querySelectorAll('#aTonos [data-t]').forEach(e=>e.onclick=()=>{ sonarTono(e.dataset.t); save({tono:e.dataset.t}); });
  document.querySelectorAll('#aAnt [data-m]').forEach(e=>e.onclick=()=>save({anticipacion_min:+e.dataset.m}));
  $('aProbar').onclick=()=>sonarTono(prefs().tono);
  $('aVideo').onclick=()=>pantallaVideo(true);
  $('aSalir').onclick=async()=>{ await S.sb.auth.signOut(); location.reload(); };
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
    navigator.serviceWorker.ready.then(r=>r.showNotification(`En ${faltan} min: ${s.nombre}`,{ body:`📍 ${s.tipo==='pausa'?s.area:'Salón '+(s.salon||'por definir')} · ${fmtHora(s.h)}`, tag:'steam-'+(s.tipo==='pausa'?'pausa-'+s.nivel:s.cursoA)+'-'+s.h, icon:'img/icon-192.png', badge:'img/icon-192.png' })).catch(()=>{});
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
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'sd_avisos'},async payload=>{
      S.avisos.unshift(payload.new); pintarBanner();
      if(avisosMios().some(a=>a.id===payload.new.id)){ const p=prefs(); if(p.sonido) sonarTono(p.tono); toast('📣 '+payload.new.titulo,'',5000); } })
    .subscribe();
}

window.STEAM = S; window.continuarApp = continuar; window.recargarApp = async()=>{ await cargarDatos(); definirModo(); pintarRuta(true); };
boot();
