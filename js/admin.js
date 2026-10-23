/* =====================================================================
   STEM Day Cafam · v40 · Lector del Excel de agenda de coordinadores y Bienestar
   Formato: una hoja con una fila de horas («7:00 a 7:30 am», «8:00 a 9:00 am»…),
   debajo (opcional) una fila de títulos (ASISTENCIA, ROTACIÓN…), y una fila por persona:
   CARGO · NOMBRE · lugar de cada franja. Otra hoja con columna de correos sirve de directorio.
   Devuelve { personas:[{cargo,nombre,correo,bloques:[{hora_inicio,hora_fin,lugar,tarea,tipo}]}], avisos:[] }
   ===================================================================== */
(function (root) {
  'use strict';
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const limpio = s => String(s == null ? '' : s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const pad = n => String(n).padStart(2, '0');
  const h24 = (h, m) => { h = +h; m = +m; if (h >= 1 && h <= 5) h += 12; return pad(h) + ':' + pad(m); };
  const RX_FRANJA = /(\d{1,2})[:.](\d{2})\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)?\s*(?:a|-|–|hasta)\s*(\d{1,2})[:.](\d{2})/i;
  function franja(txt) { const m = String(txt || '').match(RX_FRANJA); return m ? [h24(m[1], m[2]), h24(m[3], m[4])] : null; }
  // «Zamora Deisy Julieth 4° y 5°» → «Zamora Deisy Julieth»
  const nombreLimpio = n => limpio(n).replace(/\s+(TR\s*°|\d+\s*°).*$/i, '').replace(/\s+\d.*$/, '').trim();
  const palabras = n => norm(n).replace(/[^a-z ]/g, ' ').split(' ').filter(w => w.length > 1);
  // «AB203, 106, 107,AC102, 103» → «AB203, AB106, AB107, AC102, AC103»
  function expandir(txt) {
    const t = limpio(txt); if (!/,/.test(t)) return t;
    let pref = ''; return t.split(/\s*,\s*/).filter(Boolean).map(x => { const m = x.match(/^([A-Za-z]{1,3})?\s*(\d{2,3}[A-Za-z]?)$/);
      if (!m) { pref = ''; return x; } if (m[1]) pref = m[1].toUpperCase(); return (pref || '') + m[2]; }).join(', ');
  }
  const bonito = s => { const t = limpio(s); return t === t.toUpperCase() && /[A-ZÁÉÍÓÚ]{4}/.test(t) ? t.charAt(0) + t.slice(1).toLowerCase().replace(/\bpiso\b/g, 'piso').replace(/\bbachillerato\b/g, 'Bachillerato').replace(/\bprimaria\b/g, 'Primaria').replace(/\bcoliseo\b/g, 'Coliseo').replace(/\bmaloka\b/g, 'Maloka').replace(/\btr\b/g, 'TR') : t; };

  // v59: el color de cada celda dice qué debe hacer la persona (leyenda de colores debajo de la tabla)
  const rgbDe = st => { const f = st && st.fgColor; if (!st || st.patternType !== 'solid' || !f || !f.rgb) return null; const h = String(f.rgb).slice(-6); return /^[0-9a-f]{6}$/i.test(h) ? h.toUpperCase() : null; };
  const dist = (a, b) => { const p = h => [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); const x = p(a), y = p(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  function leyenda(ws, XLSX, desde) {
    const out = []; if (!ws || !ws['!ref']) return out; const R = XLSX.utils.decode_range(ws['!ref']);
    for (let r = desde; r <= R.e.r; r++) { let col = null, txt = '', llenas = 0;
      for (let c = R.s.c; c <= R.e.c; c++) { const cell = ws[XLSX.utils.encode_cell({ r, c })]; if (!cell) continue; if (limpio(cell.v)) llenas++;
        const rgb = rgbDe(cell.s), v = limpio(cell.v); if (rgb && !col) col = { rgb, theme: cell.s.fgColor.theme, tint: cell.s.fgColor.tint }; if (v.length >= 25 && !txt) txt = v; }
      if (col && txt && llenas <= 2) out.push({ ...col, texto: txt.replace(/estudianes/gi, 'estudiantes').replace(/\s+\./g, '.') }); }
    return out;
  }
  function descripcion(st, L) {
    const rgb = rgbDe(st); if (!rgb || !L.length || /^(FFFFFF|FF0000)$/.test(rgb)) return '';
    const f = st.fgColor, exacta = L.find(x => x.rgb === rgb || (f.theme != null && x.theme === f.theme && Math.abs((x.tint || 0) - (f.tint || 0)) < .01)); if (exacta) return exacta.texto;
    const mismo = L.find(x => f.theme != null && x.theme === f.theme); if (mismo) return mismo.texto;
    const cerca = L.map(x => ({ x, d: dist(x.rgb, rgb) })).sort((a, b) => a.d - b.d)[0]; return cerca && cerca.d < 120 ? cerca.x.texto : '';
  }
  const DESC = h => ({ hora_inicio: h[0], hora_fin: h[1], lugar: 'Descanso', tarea: 'Espacio de descanso', tipo: 'lib', vacio: true });   // v60: franja vacía = descanso
  function bloque(celda, titulo, h, desc) {
    const c = limpio(celda), k = norm(c), tk = norm(titulo);
    if (!c) return DESC(h);
    if (desc && !/almuerzo|ruta asignada/.test(k)) { const b0 = bloque(celda, titulo, h); if (b0) { b0.tarea = desc; if (/salida|embarque/.test(k)) b0.lugar = bonito(c); } return b0; }
    const b = { hora_inicio: h[0], hora_fin: h[1], lugar: '', tarea: '', tipo: 'sup' };
    if (/almuerzo/.test(k)) { b.tipo = 'lib'; b.lugar = /restaurante/.test(k) ? 'Restaurante' : /salon/.test(k) ? 'Salones de los cursos' : bonito(c); b.tarea = 'Almuerzo y descanso: tómate este tiempo para descansar y almorzar'; return b; }
    if (/ruta asignada/.test(k)) { b.tipo = 'lib'; const sube = /subir/.test(k); b.lugar = sube ? 'Ruta para subir a Bachillerato' : 'Ruta para bajar a Primaria'; b.tarea = /descanso/.test(tk) ? 'Desplazamiento y descanso: acompañar a los cursos por la ruta asignada' : 'Desplazamiento: acompañar a los cursos por la ruta asignada'; return b; }
    if (/^descanso\b/.test(k)) return DESC(h);   // v60: «DESCANSO» escrito en la celda
    if (/stem day/.test(k)) { b.tipo = 'acom'; b.lugar = /primaria/.test(k) ? 'STEM Day · Primaria' : 'STEM Day · Bachillerato'; b.tarea = 'Acompañar las actividades del STEM Day'; return b; }
    if (/asistencia/.test(tk)) { b.lugar = bonito(c); b.tarea = 'Acompañar el llamado a lista (asistencia) en ' + bonito(c); return b; }
    b.lugar = expandir(bonito(c));
    if (/cierre/.test(tk)) b.tarea = 'Cierre de la jornada: acompañar a los cursos en estos espacios';
    else if (/desplazamiento|descanso/.test(tk)) b.tarea = 'Acompañar el descanso en ' + b.lugar;
    else b.tarea = 'Supervisar la rotación: que los cursos lleguen a tiempo y que la convivencia esté bien';
    return b;
  }

  function leerDirectorio(ws, XLSX) {
    const out = []; const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    rows.forEach(r => { const i = r.findIndex(c => /@[a-z0-9.-]+\.[a-z]{2,}/i.test(String(c))); if (i < 1) return;
      const correo = (String(r[i]).match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i) || [''])[0].toLowerCase();
      const nombre = nombreLimpio(r[i - 1]); if (nombre && correo) out.push({ nombre, correo }); });
    return out;
  }
  function buscarCorreo(nombre, dir) {
    const k = norm(nombre), tk = palabras(nombre);
    let d = dir.find(x => norm(x.nombre) === k); if (d) return d.correo;
    const c = dir.filter(x => { const w = palabras(x.nombre); return tk.length >= 2 && tk.every(t => w.includes(t)); });
    return c.length === 1 ? c[0].correo : '';
  }

  function leerLibro(wb, XLSX) {
    XLSX = XLSX || root.XLSX; const avisos = []; let hoja = null, hr = -1;
    for (const n of wb.SheetNames) { const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' });
      const i = rows.findIndex(r => r.filter(c => franja(c)).length >= 3); if (i >= 0) { hoja = { n, rows }; hr = i; break; } }
    if (!hoja) return { personas: [], avisos: ['No encontré una hoja con las franjas de horas (por ejemplo «8:00 a 9:00 am»).'] };
    const R = hoja.rows, H = R[hr], cols = H.map((c, i) => ({ i, h: franja(c) })).filter(x => x.h);
    const t0 = cols[0].i, cNom = t0 - 1, cCar = t0 - 2;
    let lab = R[hr + 1] || [], ini = hr + 1;
    const esTit = lab.some(c => /asistencia|rotaci|cierre|almuerzo|desplazamiento/i.test(String(c))) && !lab.some(c => /@/.test(String(c)));
    if (esTit) ini = hr + 2; else lab = [];
    let dir = []; wb.SheetNames.filter(n => n !== hoja.n).forEach(n => { dir = dir.concat(leerDirectorio(wb.Sheets[n], XLSX)); });
    hoja.ws = wb.Sheets[hoja.n]; const LEY = leyenda(hoja.ws, XLSX, ini);
    const personas = [];
    for (let r = ini; r < R.length; r++) {
      const fila = R[r], nombre = nombreLimpio(fila[cNom]); if (!nombre || nombre.length < 5) continue;
      const bloques = cols.map(x => bloque(fila[x.i], lab[x.i] || '', x.h, descripcion((hoja.ws[XLSX.utils.encode_cell({ r, c: x.i })] || {}).s, LEY))).filter(Boolean);
      if (!bloques.some(x => !x.vacio)) continue;
      personas.push({ fila: r + 1, cargo: cCar >= 0 ? limpio(fila[cCar]) : '', nombre, correo: buscarCorreo(nombre, dir), bloques });
    }
    personas.filter(p => !p.correo).forEach(p => avisos.push(`Sin correo en el archivo: ${p.nombre}.`));
    return { hoja: hoja.n, franjas: cols.map(x => x.h), personas, avisos, leyenda: LEY };
  }
  async function leerArchivo(archivo) { const buf = archivo.arrayBuffer ? await archivo.arrayBuffer() : archivo; return leerLibro(root.XLSX.read(buf, { type: 'array', cellStyles: true }), root.XLSX); }
  /* v60 · propuesta: alinear la agenda con el horario de los estudiantes
     (rotación 9:00–9:45 · desplazamiento 9:45–10:00 · descanso 10:00–10:30) */
  function alinear(bloques) {
    const out = [];
    bloques.forEach(b0 => { const b = { ...b0 };
      if (b.hora_inicio === '09:00' && b.hora_fin === '10:00') { b.hora_fin = '09:45'; out.push(b); return; }
      if (b.hora_inicio === '10:00' && b.hora_fin === '10:30') {
        if (/^ruta/i.test(b.lugar)) { out.push({ ...b, hora_inicio: '09:45', hora_fin: '10:00', tarea: 'Desplazamiento: acompañar a los cursos por la ruta asignada' }); out.push(DESC(['10:00', '10:30'])); return; }
        b.hora_inicio = '09:45'; out.push(b); return; }
      out.push(b); });
    return out;
  }
  const api = { leerArchivo, leerLibro, franja, expandir, nombreLimpio, palabras, alinear };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AgendaExcel = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* =====================================================================
   STEM Day Cafam · Panel del administrador
   Pestañas: Importar Excel · Programación · Usuarios · Correcciones · Avisos · Configuración
   ===================================================================== */
(function(){
  'use strict';
  const S = () => window.STEAM;
  const $ = id => document.getElementById(id);
  const sb = () => S().sb;
  let tab = 'buscar', lectura = null, filtro = { nivel:'Primaria', curso:'' };

  // Usuarios Master (coordinadores de ciclo y de área, y Rectora). Carlos es administrador.
  const MASTERS = [
    ['Molina Mantilla Adriana','amolina@cafam.edu.co','Rectora'],
    ['Mejía Tolosa Yaqueline','ymejia@colegio.cafam.edu.co','Coordinación Ciclo TR°, 1° y 2°'],
    ['López Ramírez Andrea','anlopez@colegio.cafam.edu.co','Coordinación Ciclo 3°, 4° y 5°'],
    ['Hoyos Hoyos William','whoyos@colegio.cafam.edu.co','Coordinación Ciclo 6°, 7° y 8°'],
    ['Estupiñan Zabala Myriam Rosalba','mestupinan@colegio.cafam.edu.co','Coordinación Ciclo 9°, 10° y 11°'],
    ['Acero Molina Liz Pieranllely','lpacero@colegio.cafam.edu.co','Coordinación Matemáticas'],
    ['Celis Calderón Michael Andrés','mcelis@colegio.cafam.edu.co','Coordinación Ciencias Naturales'],
    ['Acevedo Betancourt Andres Elias','aeacevedo@colegio.cafam.edu.co','Coordinación Sociales'],
    ['Villamil Lopez Nubia Maria','nmvillamil@colegio.cafam.edu.co','Coordinación Humanidades'],
    ['Ibañez Castillo Karen Liliana','klibanez@colegio.cafam.edu.co','Coordinación Ed. Física'],
    ['Sandoval González Heidi Tatiana','tsandoval@colegio.cafam.edu.co','Coordinación Bilingüismo Bachillerato'],
    ['Rincon Peña Jasleidy','jrincon@colegio.cafam.edu.co','Coordinación Bilingüismo Primaria']
  ];
  const ADMIN = ['Castro Rojas Carlos Arturo','carcastro@colegio.cafam.edu.co','Coordinación Tecnología · Administrador'];

  function aviso(msg, tipo){ if(typeof toast==='function') toast(msg, tipo, 4000); }
  function cargarXLSX(){
    if(window.XLSX) return Promise.resolve();
    return new Promise((ok, fail) => { const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload=ok; s.onerror=()=>fail(new Error('No se pudo cargar el lector de Excel. Revisa la conexión.'));
      document.head.appendChild(s); });
  }
  function descargar(nombre, texto){
    const b=new Blob(['﻿'+texto],{type:'text/csv;charset=utf-8'}), a=document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=nombre; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
  }
  window.cargarXLSX = cargarXLSX;
  const csvCell = v => { const t=String(v==null?'':v); return /[",;\n]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t; };

  /* ---------------- estructura ---------------- */
  function abrir(){
    if(!S() || !S().perfil || S().perfil.rol!=='admin') return;
    show('s-admin');
    $('admBody').innerHTML = `
      <div class="top"><div class="logo"><div class="mark"><i></i><i></i><i></i><i></i></div><div><b>STEM Day · Administración</b><small>${escHTML(S().perfil.nombre)}</small></div></div>
        <button class="b2" id="admVolver">← Volver a la app</button></div>
      <div class="desk"><div class="tabs" id="admTabs" hidden>${SECS.map(x=>`<span data-t="${x[0]}">${x[1]} ${x[2]}</span>`).join('')}</div>
        <button class="admsel" id="admSel"><i id="admSelI"></i><span><small id="admSelG"></small><b id="admSelT"></b></span><em>▾</em></button>
        <div class="tbody" id="admTab"></div></div>`;
    $('admVolver').onclick = async () => { show('s-main'); if(window.recargarApp) await window.recargarApp(); };
    $('admTabs').querySelectorAll('span').forEach(s => s.onclick = () => irTab(s.dataset.t));
    $('admSel').onclick = menuSecciones;
    irTab(tab);
  }
  /* v64 · menú de secciones (lista desplegable en forma de hoja, cómoda en el celular) */
  const SECS=[['buscar','🔎','Buscar persona','Hoy en el evento'],['turnos','👥','Turnos de los cursos','Hoy en el evento'],['conexiones','🟢','Conexiones','Hoy en el evento'],['mensajes','💬','Mensajes','Hoy en el evento'],['avisos','📢','Avisos generales','Hoy en el evento'],['correcciones','🔁','Correcciones de curso','Hoy en el evento'],
    ['usuarios','👤','Usuarios y cuentas','Personas'],['lideres','⭐','Líderes de estación','Personas'],['agenda','📅','Agenda Master','Personas'],['estudiantes','🎓','Estudiantes','Personas'],
    ['importar','📥','Importar horario (Excel)','Programación'],['programacion','🗓️','Programación','Programación'],
    ['copa','🏆','Copa STEM','Copa y encuestas'],['ligam','🏅','Liga Master','Copa y encuestas'],['final','📝','Encuesta final','Copa y encuestas'],['config','⚙️','Configuración','Ajustes']];
  function menuSecciones(){
    const m=document.createElement('div'); m.className='admmenu'; const G=[...new Set(SECS.map(x=>x[3]))];
    m.innerHTML=`<div class="amm"><div class="ammh"><b>Ir a…</b><span id="ammX">✕</span></div>${G.map(g=>`<h5>${g}</h5><div class="ammg">${SECS.filter(x=>x[3]===g).map(x=>`<button data-t="${x[0]}" class="${x[0]===tab?'on':''}"><i>${x[1]}</i>${x[2]}</button>`).join('')}</div>`).join('')}</div>`;
    document.body.appendChild(m); requestAnimationFrame(()=>m.classList.add('on'));
    const cerrar=()=>{ m.classList.remove('on'); setTimeout(()=>m.remove(),220); };
    m.onclick=e=>{ if(e.target===m) cerrar(); }; m.querySelector('#ammX').onclick=cerrar;
    m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ cerrar(); irTab(b.dataset.t); window.scrollTo(0,0); });
  }
  function irTab(t){
    if(!SECS.some(x=>x[0]===t)) t='buscar';
    tab=t; $('admTabs').querySelectorAll('span').forEach(s=>s.classList.toggle('on', s.dataset.t===t));
    const sx=SECS.find(x=>x[0]===t); if($('admSelT')){ $('admSelI').textContent=sx[1]; $('admSelT').textContent=sx[2]; $('admSelG').textContent=sx[3]; }
    const f={buscar:tBuscar, turnos:tTurnos, importar:tImportar, programacion:tProgramacion, usuarios:tUsuarios, lideres:tLideres, agenda:tAgenda, correcciones:tCorrecciones, avisos:tAvisos, estudiantes:tEstudiantes, copa:tCopa, ligam:async()=>{ $('admTab').innerHTML=window.cmPanelHTML?await cmPanelHTML():'Recarga la app.'; if(window.cmBindPanel) cmBindPanel($('admTab')); }, conexiones:tConexiones, mensajes:tMensajes, final:tFinal, config:tConfig}[t];
    $('admTab').innerHTML='<p class="sm">Cargando…</p>'; f().catch(e=>{ $('admTab').innerHTML=`<div class="warnbox">Error: ${escHTML(e.message)}</div>`; });
  }

  /* ---------------- Estudiantes (llamado a lista) ---------------- */
  async function tEstudiantes(){
    const { count } = await sb().from('sd_estudiantes').select('id',{count:'exact',head:true});
    $('admTab').innerHTML = `
      <p>Puedes cargar <b>el archivo oficial de asistencia del año</b> (se toma la hoja de octubre y así los nombres coinciden exactamente al descargar), o un Excel con una fila por estudiante y estas columnas: <b>Grado</b>, <b>Curso</b>, <b>Estudiante</b> y, si quieres, <b>Documento</b>.
      Puede tener una o varias hojas; se leen todas. Al cargarlo se <b>reemplaza</b> la lista completa (y la asistencia ya registrada se borra).</p>
      <table class="t" style="max-width:520px"><tr><th>Grado</th><th>Curso</th><th>Estudiante</th><th>Documento</th></tr><tr><td>Cuarto</td><td>4D</td><td>Acosta Rincón Valentina</td><td>1023456789</td></tr></table>
      <p class="sm">Estudiantes cargados actualmente: <b>${count||0}</b></p>
      <div class="drop" id="dropE">Arrastra aquí el Excel de estudiantes o <b>toca para elegir el archivo</b></div><input type="file" id="fxE" accept=".xlsx,.xls,.csv" hidden><div id="estRes"></div>
      <div class="dlbox" style="margin-top:22px"><b>🔍 Contrastar la lista de la app con el archivo de asistencia</b>
        <p class="sm" style="margin:0 0 8px">Compara curso por curso la lista que ven los directores de curso con el archivo de asistencia (el más actualizado). Muestra quién ya no está en el colegio, quién es nuevo y quién cambió de curso, y te deja corregirlo <b>sin borrar</b> lo que ya se marcó.</p>
        <button class="b1" id="ctBtn">📂 Elegir el archivo de asistencia</button><input type="file" id="ctFx" accept=".xlsx" hidden><div id="ctRes"></div></div>
      <div class="dlbox may" style="margin-top:22px"><b>🎓 Décimo y undécimo · lista y ubicación de cada estudiante</b>
        <p class="sm" style="margin:4px 0 8px">Excel con: <b>A</b> estudiante · <b>B</b> curso · <b>C</b> área que solicita · <b>D</b> docente líder con el que estará (si el área es <b>LOGÍSTICA</b>, en D va su función y su ubicación).
        Si hay varios momentos en la jornada, usa una hoja por momento (el nombre de la hoja es el momento, ej. «8:00 a 10:00») o una columna «Hora». Al cargarlo se <b>reemplaza solo la lista de 10° y 11°</b>; la de 3° a 9° no cambia.</p>
        <p class="sm" id="mayCnt">Estudiantes de 10° y 11° cargados: …</p>
        <button class="b1" id="mayBtn">📂 Elegir el Excel de 10° y 11°</button><input type="file" id="mayFx" accept=".xlsx,.xls" hidden><div id="mayRes"></div></div>`;
    const drop=$('dropE'), fx=$('fxE'); drop.onclick=()=>fx.click(); fx.onchange=()=>{ if(fx.files[0]) leerEst(fx.files[0]); };
    drop.ondragover=e=>{ e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave=()=>drop.classList.remove('over');
    drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove('over'); if(e.dataTransfer.files[0]) leerEst(e.dataTransfer.files[0]); };
    $('ctBtn').onclick=()=>$('ctFx').click(); $('ctFx').onchange=()=>{ const f=$('ctFx').files[0]; $('ctFx').value=''; if(f) contrastar(f); };
    $('mayBtn').onclick=()=>$('mayFx').click(); $('mayFx').onchange=()=>{ const f=$('mayFx').files[0]; $('mayFx').value=''; if(f) leerMayores(f); };
    sb().from('sd_may_est').select('id',{count:'exact',head:true}).then(r=>{ const e=$('mayCnt'); if(e) e.innerHTML=r.error?'<span style="color:#b45309">Falta ejecutar el archivo <b>24-decimo-undecimo.sql</b> en Supabase.</span>':`Estudiantes de 10° y 11° cargados: <b>${r.count||0}</b>`; });
  }
  /* v57 · llamado a lista de 10° y 11° (7:00): docente y lugar de cada curso, desde la hoja «Docentes Ciencias-Mat 10-11» */
  async function guardarLlamado(L){
    const D=await datosLideres(true), no=[];
    const ALIAS={'bernal esteban':'Bernal Gaitán Edwar'};   // v58: así aparece en el directorio
    const filas=L.map(x=>{ const d=buscarPersona(ALIAS[nrm(x.docente)]||x.docente,D.dir); if(!d) no.push(x.docente+' ('+x.curso+')'); return {curso:x.curso,docente:d?d.nombre:x.docente,correo:d?String(d.correo).toLowerCase():null,lugar:x.lugar,actualizado_en:new Date().toISOString()}; });
    const r=await sb().from('sd_may_llamado').upsert(filas,{onConflict:'curso'}); if(r.error) throw r.error;
    const ap=await sb().rpc('sd_may_aplicar_llamado'); if(ap.error) throw ap.error;
    if(window.MAY) window.MAY.sucio=true;
    return `Llamado de 10° y 11° (7:00): ${filas.length} cursos${no.length?' · sin reconocer: '+no.join(', '):''}.`;
  }
  /* v46 · Décimo y undécimo: leer el Excel, reconocer a los líderes y cargar */
  async function leerMayores(file){
    const res=$('mayRes'); res.innerHTML='<p class="sm">Leyendo…</p>';
    try{
      await cargarXLSX(); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const R=MayoresExcel.leerLibro(wb,XLSX); if(!R.estudiantes.length) throw new Error(R.avisos[0]||'No encontré estudiantes.');
      const D=await datosLideres(true), porCorreo=new Map(D.perf.map(p=>[String(p.correo).toLowerCase(),p]));
      const buscar=n=>{ if(!n) return null; const d=buscarPersona(n,D.dir); if(d) return d; const ps=separarPersonas(n,D.dir).filter(x=>x.d); return ps.length?ps[0].d:null; };
      const lid=new Map();
      R.estudiantes.forEach(e=>e.planes.forEach(p=>{ if(p.logistica||!p.lider_nombre) return; const k=nrm(p.lider_nombre);
        if(!lid.has(k)){ const d=buscar(p.lider_nombre); lid.set(k,{texto:p.lider_nombre,d,perfil:d?porCorreo.get(String(d.correo).toLowerCase()):null,n:0}); }
        const L=lid.get(k); L.n++; p.lider_correo=L.d?String(L.d.correo).toLowerCase():''; }));
      const L=[...lid.values()].sort((a,b)=>(!!a.d-!!b.d)||a.texto.localeCompare(b.texto,'es')), no=L.filter(x=>!x.d), sinCuenta=L.filter(x=>x.d&&!x.perfil);
      const porCurso={}, porArea={}; R.estudiantes.forEach(e=>{ porCurso[e.curso]=(porCurso[e.curso]||0)+1; e.planes.forEach(p=>porArea[p.area||'(sin área)']=(porArea[p.area||'(sin área)']||0)+1); });
      const logs=R.estudiantes.flatMap(e=>e.planes.filter(p=>p.logistica).map(p=>({e,p})));
      res.innerHTML=`<div class="okbox"><b>${R.estudiantes.length}</b> estudiantes · ${Object.entries(porCurso).sort((a,b)=>a[0].localeCompare(b[0],'es',{numeric:true})).map(([c,n])=>`${escHTML(c)} (${n})`).join(', ')}<br>
          Momentos: <b>${R.momentos.map(escHTML).join(' · ')}</b>${R.porCurso?' (7:00 – 7:30; el docente y el lugar de cada curso salen de la hoja «Docentes Ciencias-Mat 10-11» del horario)':''}<br>Áreas: ${Object.entries(porArea).map(([a,n])=>`${escHTML(a)} (${n})`).join(', ')}</div>
        ${no.length?`<div class="warnbox"><b>Líderes que la app no reconoce (${no.length}):</b> sus estudiantes no le aparecerán a nadie como líder (sí al administrador, Máster Coordinador y Organizador Master). Corrige el nombre en el Excel o crea la cuenta en Usuarios.<ul class="ulc">${no.map(x=>`<li>${escHTML(x.texto)} · ${x.n} estudiante${x.n>1?'s':''}</li>`).join('')}</ul></div>`:''}
        ${sinCuenta.length?`<div class="warnbox"><b>Líderes reconocidos pero sin cuenta en la app (${sinCuenta.length}):</b> ${sinCuenta.map(x=>escHTML(x.d.nombre)).join(' · ')}. Créales la cuenta para que puedan llamar a lista.</div>`:''}
        <details><summary class="sm">Líderes reconocidos (${L.length-no.length})</summary><table class="t"><tr><th>En el Excel</th><th>En la app</th><th>Estudiantes</th></tr>${L.filter(x=>x.d).map(x=>`<tr><td>${escHTML(x.texto)}</td><td>${escHTML(x.d.nombre)}${x.perfil?'':' <span style="color:#b45309">(sin cuenta)</span>'}</td><td>${x.n}</td></tr>`).join('')}</table></details>
        ${logs.length?`<details><summary class="sm">Logística (${logs.length})</summary><table class="t"><tr><th>Estudiante</th><th>Curso</th><th>Función</th><th>Ubicación</th></tr>${logs.map(({e,p})=>`<tr><td>${escHTML(e.nombre)}</td><td>${escHTML(e.curso)}</td><td>${escHTML(p.funcion||'')}</td><td>${escHTML(p.lugar||'')}</td></tr>`).join('')}</table></details>`:''}
        ${R.avisos.length?`<details><summary class="sm">Avisos del archivo (${R.avisos.length})</summary><ul class="ulc">${R.avisos.map(a=>`<li>${escHTML(a)}</li>`).join('')}</ul></details>`:''}
        <button class="b1" id="mayOk" style="margin-top:10px">Cargar la lista de 10° y 11°</button>`;
      $('mayOk').onclick=async()=>{ $('mayOk').disabled=true; $('mayOk').textContent='Guardando…';
        const p=R.estudiantes.map(e=>({nombre:e.nombre,curso:e.curso,grado:e.grado,orden:e.orden,planes:e.planes.map(({hoja,fila,...x})=>x)}));
        const {data,error}=await sb().rpc('sd_importar_mayores',{p});
        if(error){ $('mayOk').disabled=false; $('mayOk').textContent='Cargar la lista de 10° y 11°'; return res.insertAdjacentHTML('beforeend',`<div class="warnbox">No se pudo cargar: ${escHTML(/sd_importar_mayores/.test(error.message)?'falta ejecutar el archivo 24-decimo-undecimo.sql en Supabase.':error.message)}</div>`); }
        let extra=''; try{ const ap=await sb().rpc('sd_may_aplicar_llamado'); if(!ap.error) extra=` · llamado de las 7:00 asignado a ${ap.data.asignados} estudiantes`; else if(/sd_may_aplicar/.test(ap.error.message)) extra=' · falta ejecutar el archivo 32-llamado-decimo-undecimo.sql'; }catch(_){}
        if(window.MAY) window.MAY.sucio=true; aviso(`Lista de 10° y 11° cargada: ${data.estudiantes} estudiantes${extra}`,'ok'); tEstudiantes(); };
    }catch(e){ res.innerHTML=`<div class="warnbox">${escHTML(e.message||e)}</div>`; }
  }
  /* v32 · contraste: lista de la app (sd_estudiantes) vs. archivo oficial de asistencia */
  async function contrastar(file){
    const res=$('ctRes'); res.innerHTML='<p class="sm">Comparando…</p>';
    try{
      if(!window.AsisOficial) throw new Error('Recarga la app para actualizarla.');
      await cargarXLSX(); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
      const st=S(), fe=(st&&st.config&&st.config.fecha_evento)||'2026-10-23', mes=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][+fe.slice(5,7)-1];
      const hojas=wb.SheetNames.filter(n=>{ const r=(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1})[0]||[]).map(norm); return r.includes('grupo')&&r.includes('nombre'); });
      if(!hojas.length) throw new Error('Este no parece el archivo de asistencia (no encontré las columnas Grupo y NOMBRE).');
      const hoja=hojas.find(n=>norm(n)===mes)||hojas[hojas.length-1];
      let app=[]; for(let i=0;;i+=1000){ const r=await sb().from('sd_estudiantes').select('id,grado,curso,nombre,documento,orden').order('id').range(i,i+999); if(r.error) throw r.error; app=app.concat(r.data||[]); if(!r.data||r.data.length<1000) break; }
      if(!app.length) throw new Error('La app todavía no tiene estudiantes cargados. Usa el recuadro de arriba para cargarlos desde este mismo archivo.');
      const cursosApp=new Set(app.map(x=>AsisOficial.grupoACurso(x.curso)));
      const arch=[]; XLSX.utils.sheet_to_json(wb.Sheets[hoja],{defval:''}).forEach(r=>{ const k={}; Object.keys(r).forEach(c=>k[norm(c)]=r[c]);
        const nombre=String(k.nombre||'').trim(), curso=AsisOficial.grupoACurso(k.grupo); if(!nombre||!cursosApp.has(curso)) return;
        arch.push({grupo:String(k.grupo).trim(),curso,grado:AsisOficial.gradoDe(k.grupo),nombre,doc:String(k['c. matricula']||'').replace(/\D/g,'')}); });
      const recs=app.map(x=>({...x})), bus=AsisOficial.emparejador(recs), usados=new Set(), nuevos=[], mov=[];
      arch.forEach(a=>{ const r=bus(a.curso,a.nombre,''); if(r&&!usados.has(r.id)){ usados.add(r.id); return; }
        const o=bus.otroCurso(a.nombre); if(o&&!usados.has(o.id)&&o.cur!==a.curso){ usados.add(o.id); mov.push({a,r:o}); return; } nuevos.push(a); });
      const fuera=recs.filter(r=>!usados.has(r.id));
      const fila=(t,i,txt,sub)=>`<label class="pvchk"><input type="checkbox" data-t="${t}" data-i="${i}" checked> ${txt}${sub?`<small>${sub}</small>`:''}</label>`;
      const porC=L=>L.slice().sort((x,y)=>String(x.cur||x.curso||x.a.curso).localeCompare(String(y.cur||y.curso||y.a.curso),'es',{numeric:true}));
      let h=`<div class="okbox">Hoja <b>${escHTML(hoja)}</b> · ${arch.length} estudiantes en el archivo y ${app.length} en la app (${cursosApp.size} cursos).<br>
        Coinciden <b>${usados.size-mov.length}</b> · ya no están en el archivo <b style="color:#e5484d">${fuera.length}</b> · nuevos <b style="color:#1f9d6b">${nuevos.length}</b> · cambiaron de curso <b style="color:#2f6fde">${mov.length}</b></div>`;
      if(!fuera.length&&!nuevos.length&&!mov.length) h+='<p class="sm">✔ Las listas coinciden.</p>';
      if(fuera.length) h+=`<h4 style="margin:12px 0 4px;color:#e5484d">✗ En la lista de la app pero NO en el archivo · seguramente ya no están en el colegio (${fuera.length})</h4><p class="sm">Se quitarán de la app.</p>${porC(fuera).map((r,i)=>fila('f',recs.indexOf(r),`<b>${escHTML(r.curso)}</b> · ${escHTML(r.nombre)}`)).join('')}`;
      if(nuevos.length) h+=`<h4 style="margin:12px 0 4px;color:#1f9d6b">＋ En el archivo pero NO en la app · nuevos (${nuevos.length})</h4><p class="sm">Se agregarán al final de la lista de su curso.</p>${nuevos.map((a,i)=>fila('n',i,`<b>${escHTML(a.curso)}</b> · ${escHTML(a.nombre)}`)).join('')}`;
      if(mov.length) h+=`<h4 style="margin:12px 0 4px;color:#2f6fde">⇄ Cambiaron de curso (${mov.length})</h4>${mov.map((m,i)=>fila('m',i,`${escHTML(m.r.nombre)}`,`${escHTML(m.r.curso)} → <b>${escHTML(m.a.curso)}</b>`)).join('')}`;
      h+=`<div class="row" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${fuera.length||nuevos.length||mov.length?'<button class="b1" id="ctOk">Aplicar los cambios seleccionados</button>':''}<button class="b2" id="ctXls">⬇ Descargar el contraste (Excel)</button></div>`;
      res.innerHTML=h;
      $('ctXls').onclick=()=>{ const ws=XLSX.utils.aoa_to_sheet([['Resultado','Curso en la app','Curso en el archivo','Estudiante']]
          .concat(porC(fuera).map(r=>['No está en el archivo (retirado)',r.curso,'',r.nombre])).concat(nuevos.map(a=>['Nuevo (no está en la app)','',a.curso,a.nombre])).concat(mov.map(m=>['Cambió de curso',m.r.curso,m.a.curso,m.r.nombre])));
        ws['!cols']=[{wch:32},{wch:16},{wch:18},{wch:44}]; const w=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w,ws,'Contraste'); XLSX.writeFile(w,'contraste-estudiantes-stem-day.xlsx'); };
      if($('ctOk')) $('ctOk').onclick=async()=>{
        const sel=t=>[...res.querySelectorAll(`input[data-t="${t}"]:checked`)].map(e=>+e.dataset.i);
        const F=sel('f').map(i=>recs[i]), N=sel('n').map(i=>nuevos[i]), M=sel('m').map(i=>mov[i]);
        if(!confirm(`Se quitarán ${F.length}, se agregarán ${N.length} y se cambiarán de curso ${M.length} estudiantes. ¿Continuar?`)) return;
        $('ctOk').disabled=true; $('ctOk').textContent='Aplicando…';
        try{
          for(let i=0;i<F.length;i+=200){ const r=await sb().from('sd_estudiantes').delete().in('id',F.slice(i,i+200).map(x=>x.id)); if(r.error) throw r.error; }
          for(const m of M){ const r=await sb().from('sd_estudiantes').update({curso:m.a.curso,grado:m.a.grado}).eq('id',m.r.id); if(r.error) throw r.error; }
          const maxO={}; app.forEach(x=>{ const c=AsisOficial.grupoACurso(x.curso); maxO[c]=Math.max(maxO[c]||0,x.orden||0); });
          const ins=N.map(a=>({grado:a.grado,curso:a.curso,nombre:a.nombre,documento:a.doc||null,orden:(maxO[a.curso]=(maxO[a.curso]||0)+1)}));
          for(let i=0;i<ins.length;i+=200){ const r=await sb().from('sd_estudiantes').insert(ins.slice(i,i+200)); if(r.error) throw r.error; }
          const s2=S(); if(s2){ s2.est=null; s2.listaLocal=null; }
          aviso(`Listo: ${F.length} quitados, ${N.length} agregados, ${M.length} cambiados de curso`,'ok'); tEstudiantes();
        }catch(e){ res.insertAdjacentHTML('beforeend',`<div class="warnbox">No se pudo terminar: ${escHTML(e.message)}</div>`); $('ctOk').disabled=false; $('ctOk').textContent='Aplicar los cambios seleccionados'; }
      };
    }catch(e){ res.innerHTML=`<div class="warnbox">${escHTML(e.message)}</div>`; }
  }
  async function leerEst(file){
    const res=$('estRes'); res.innerHTML='<p class="sm">Leyendo…</p>';
    try{
      await cargarXLSX(); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const norm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
      const filas=[]; const orden={}; let nota='';
      // v31 · también acepta el archivo oficial de asistencia del año (columnas Grupo y NOMBRE, una hoja por mes)
      const hojasAsis=wb.SheetNames.filter(n=>{ const r=(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1})[0]||[]).map(norm); return r.includes('grupo')&&r.includes('nombre'); });
      if(hojasAsis.length&&window.AsisOficial){
        const st=S(), fe=(st&&st.config&&st.config.fecha_evento)||'2026-10-23', mes=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][+fe.slice(5,7)-1];
        const hoja=hojasAsis.find(n=>norm(n)===mes)||hojasAsis[hojasAsis.length-1];
        let prog=null; try{ const r=await sb().from('sd_programacion').select('curso').limit(5000); if(!r.error&&r.data&&r.data.length) prog=new Set(r.data.map(x=>AsisOficial.grupoACurso(x.curso))); }catch(_){}
        let fuera=0;
        XLSX.utils.sheet_to_json(wb.Sheets[hoja],{defval:''}).forEach(r=>{ const k={}; Object.keys(r).forEach(c=>k[norm(c)]=r[c]);
          const nombre=String(k.nombre||'').trim(), curso=AsisOficial.grupoACurso(k.grupo); if(!nombre||!curso) return;
          if(prog&&!prog.has(curso)){ fuera++; return; }
          orden[curso]=(orden[curso]||0)+1; filas.push({grado:AsisOficial.gradoDe(k.grupo),curso,nombre,documento:String(k['c. matricula']||k.matricula||'').replace(/\D/g,''),orden:orden[curso]}); });
        nota=`Se leyó la hoja <b>${escHTML(hoja)}</b> del archivo de asistencia.${fuera?` Se omitieron ${fuera} estudiantes de cursos que no están en la programación del STEM Day.`:''}<br>`;
      } else
      wb.SheetNames.forEach(n=>{ XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:''}).forEach(r=>{ const k={}; Object.keys(r).forEach(c=>k[norm(c)]=r[c]);
        const nombre=String(k.estudiante||k.nombre||k['nombre del estudiante']||'').trim(), curso=String(k.curso||'').trim().toUpperCase(), grado=String(k.grado||'').trim();
        if(!nombre||!curso) return; orden[curso]=(orden[curso]||0)+1; filas.push({grado,curso,nombre,documento:String(k.documento||'').trim(),orden:orden[curso]}); }); });
      if(!filas.length) throw new Error('No se encontraron filas con las columnas Grado, Curso y Estudiante.');
      const cursos=Object.keys(orden).sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
      res.innerHTML=`<div class="okbox">${nota}Se leyeron <b>${filas.length}</b> estudiantes de <b>${cursos.length}</b> cursos: ${cursos.map(c=>`${escHTML(c)} (${orden[c]})`).join(', ')}.</div><button class="b1" id="estOk">Reemplazar la lista de estudiantes</button>`;
      $('estOk').onclick=async()=>{ $('estOk').disabled=true; $('estOk').textContent='Guardando…';
        const {data,error}=await sb().rpc('sd_importar_estudiantes',{p_filas:filas});
        if(error){ res.innerHTML=`<div class="warnbox">No se pudo guardar: ${escHTML(error.message)}</div>`; return; }
        aviso(`Lista cargada: ${data} estudiantes`,'ok'); const st=S(); if(st){ st.est=null; st.listaLocal=null; } tEstudiantes(); };
    }catch(e){ res.innerHTML=`<div class="warnbox">${escHTML(e.message)}</div>`; }
  }


  /* ---------------- Copa STEM: banco de preguntas y ranking ---------------- */
  async function tCopa(){
    $('admTab').innerHTML='<p class="sm">Cargando…</p>';
    const q=await sb().from('sd_preguntas').select('*').order('id').limit(5000);
    if(q.error){ $('admTab').innerHTML=`<div class="warnbox">La Copa STEM aún no está activa: ${escHTML(q.error.message)}.<br>Ejecuta el archivo <b>11-copa-stem.sql</b> en Supabase.</div>`; return; }
    const cnt={}; (q.data||[]).forEach(r=>{ const k=(r.actividad||r.clave); cnt[k]=(cnt[k]||0)+1; });
    const rk=await sb().rpc('sd_copa_admin'); const R=rk.data||[];
    // v48: respuestas de los docentes, nombres y lanzamientos
    let RS=[]; for(let i=0;;i+=1000){ const r=await sb().from('sd_copa_respuestas').select('*').range(i,i+999); if(r.error) break; RS=RS.concat(r.data||[]); if(!r.data||r.data.length<1000) break; }
    const perf=await todosPerfiles().catch(()=>[]), NOM=Object.fromEntries(perf.map(p=>[p.id,p.nombre]));
    const lz=await sb().from('sd_copa_lanzar').select('*').order('id',{ascending:false}).limit(8);
    CP={Q:q.data||[],RS,NOM,lz:lz.error?null:(lz.data||[]),f:CP?CP.f:'',bus:CP?CP.bus:''};
    const cfg=(S()&&S().config)||{}, ACT=actividadesCopa();
    $('admTab').innerHTML=`
      <div class="dlbox"><b>⏱ ¿Cuándo sale la trivia?</b>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px"><span>Sale</span><input id="cpAntes" type="number" min="1" max="60" value="${+cfg.copa_antes||10}" style="width:70px"><span>minutos antes de que termine cada actividad.</span><button class="b1 sm" id="cpAntesG">Guardar</button></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px"><span><b>Liga Master:</b> sale</span><input id="cpAntesM" type="number" min="1" max="60" value="${+cfg.copa_antes_master||10}" style="width:70px"><span>minutos antes de que termine cada bloque de su agenda.</span><button class="b1 sm" id="cpAntesMG">Guardar</button></div>
        <p class="sm" style="margin:6px 0 0">La encuesta de los docentes sale 5 minutos antes del final. Los cambios les llegan en vivo a docentes y Master.</p></div>
      <div class="dlbox" style="margin-top:12px"><b>⚡ Lanzar la trivia ahora</b>
        <p class="sm" style="margin:4px 0 8px">Les aparece de inmediato a los directores y codirectores cuyo curso esté en ese momento en la actividad (solo el día del evento). Quien ya la respondió no la vuelve a ver.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><select id="cpLzA"><option value="*">Docentes · todas las actividades que están en curso</option><option value="M*">🏆 Liga Master · todos los Master en su bloque actual</option>${ACT.map(a=>`<option value="${escHTML(a.k)}">${escHTML(a.area)} · ${escHTML(a.nombre)}</option>`).join('')}</select><button class="b1" id="cpLz">⚡ Lanzar ahora</button></div>
        ${CP.lz===null?'<p class="sm" style="color:#b45309">Falta ejecutar el archivo 26-copa-admin-preguntas.sql en Supabase.</p>':CP.lz.length?`<p class="sm" style="margin:8px 0 0">Últimos lanzamientos: ${CP.lz.map(l=>`${new Date(l.creado_en).toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit'})} · ${escHTML(l.nombre||'Todas')}`).join(' — ')}</p>`:''}</div>
      <h3 style="margin:22px 0 8px">Preguntas cargadas</h3><div id="cpQ"></div>
      <h3 style="margin:22px 0 8px">Cargar el banco desde Excel</h3>
      <p>Carga el Excel <b>banco-preguntas-copa-stem.xlsx</b> diligenciado (hoja «Preguntas»). Puedes cargar un archivo por área: solo se reemplazan las preguntas de las áreas que trae el archivo (las ya respondidas se conservan).</p>
      ${coberturaHTML(q.data||[])}
      <p class="sm">Preguntas cargadas: <b>${(q.data||[]).length}</b>${Object.keys(cnt).length?' · '+Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${escHTML(k)} (${v})`).join(', '):''}</p>
      <div class="drop" id="dropQ">Arrastra aquí el Excel de preguntas o <b>toca para elegir el archivo</b></div><input type="file" id="fxQ" accept=".xlsx,.xls" hidden><div id="qRes"></div>
      <h3 style="margin:26px 0 8px">Ranking completo</h3>
      ${R.length?`<button class="b1" id="cpXls" style="margin-bottom:10px">⬇ Descargar ranking (Excel/CSV)</button>
      <table class="t"><tr><th>#</th><th>Docente</th><th>Puntos</th><th>Encuestas</th><th>Aciertos</th><th>Preguntas respondidas</th><th>Puntos por rapidez</th></tr>
      ${R.map((r,i)=>`<tr${i<3?' style="background:#fff7dc;font-weight:700"':''}><td>${i<3?['🥇','🥈','🥉'][i]:i+1}</td><td>${escHTML(r.nombre||'')}</td><td><b>${r.puntos}</b></td><td>${r.encuestas}</td><td>${r.aciertos}</td><td>${r.respondidas}</td><td>${r.rapidez}</td></tr>`).join('')}</table>`:'<p class="sm">Aún nadie suma puntos.</p>'}`;
    pintarPregs();
    $('cpAntesG').onclick=async()=>{ const n=Math.round(+$('cpAntes').value); if(!(n>=1&&n<=60)) return aviso('Escribe un número de minutos entre 1 y 60','bad');
      const {error}=await sb().from('sd_config').update({copa_antes:n}).eq('id',1); if(error) return aviso('No se pudo guardar: '+(/copa_antes/.test(error.message)?'falta ejecutar el archivo 26-copa-admin-preguntas.sql en Supabase':error.message),'bad');
      if(S()&&S().config) S().config.copa_antes=n; aviso(`La trivia saldrá ${n} minutos antes del final`,'ok'); };
    $('cpAntesMG').onclick=async()=>{ const n=Math.round(+$('cpAntesM').value); if(!(n>=1&&n<=60)) return aviso('Escribe un número de minutos entre 1 y 60','bad');
      const {error}=await sb().from('sd_config').update({copa_antes_master:n}).eq('id',1); if(error) return aviso('No se pudo guardar: '+(/copa_antes_master/.test(error.message)?'falta ejecutar el archivo 27-liga-master-trivia.sql en Supabase':error.message),'bad');
      if(S()&&S().config) S().config.copa_antes_master=n; aviso(`Liga Master: la trivia saldrá ${n} minutos antes del final de cada bloque`,'ok'); };
    $('cpLz').onclick=async()=>{ const k=$('cpLzA').value, a=ACT.find(x=>x.k===k), nom=k==='*'?'Docentes · todas las actividades en curso':k==='M*'?'Liga Master · todos los Master':a.area+' · '+a.nombre;
      if(!confirm(`¿Lanzar la trivia ahora a: ${nom}?`)) return;
      const {error}=await sb().from('sd_copa_lanzar').insert({clave:k,nombre:nom,creado_por:S().perfil.id}); if(error) return aviso('No se pudo lanzar: '+(/sd_copa_lanzar/.test(error.message)?'falta ejecutar el archivo 26-copa-admin-preguntas.sql en Supabase':error.message),'bad');
      aviso('Trivia lanzada: '+nom,'ok'); tCopa(); };
    const drop=$('dropQ'), fx=$('fxQ'); drop.onclick=()=>fx.click(); fx.onchange=()=>{ if(fx.files[0]) leerPreg(fx.files[0]); };
    drop.ondragover=e=>{ e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave=()=>drop.classList.remove('over');
    drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove('over'); if(e.dataTransfer.files[0]) leerPreg(e.dataTransfer.files[0]); };
    if($('cpXls')) $('cpXls').onclick=()=>{ const L=[['Puesto','Docente','Correo','Puntos','Encuestas','Aciertos','Preguntas respondidas','Puntos por rapidez']].concat(R.map((r,i)=>[i+1,r.nombre,r.correo,r.puntos,r.encuestas,r.aciertos,r.respondidas,r.rapidez]));
      descargar('copa-stem-ranking.csv', L.map(f=>f.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(';')).join('\n')); };
  }
  /* v48 · actividades de la programación (con su clave de preguntas) */
  let CP=null;
  function actividadesCopa(){
    const st=S(); if(!st||!st.prog||!window.copaClave) return [];
    const act={}; st.prog.filter(r=>r.tipo==='actividad'&&!/direcci[oó]n de (grupo|curso)/i.test((r.area||'')+' '+(r.titulo||''))).forEach(r=>{ const k=copaClave(r);
      const a=act[k]=act[k]||{k,area:String(r.area||'').replace(/\.$/,''),nombre:k==='tec'?'Desastres naturales':(r.titulo?(window.tituloA?tituloA(r.titulo):r.titulo):r.area)}; });
    act.hacer_pri={k:'hacer_pri',area:'Actividad del hacer',nombre:'Cambio climático · Primaria (solo Liga Master)'};
    act.hacer_bach={k:'hacer_bach',area:'Actividad del hacer',nombre:'Cambio climático · Bachillerato (solo Liga Master)'};
    return Object.values(act).sort((a,b)=>a.area.localeCompare(b.area,'es')||a.nombre.localeCompare(b.nombre,'es'));
  }
  function pintarPregs(){
    const box=$('cpQ'); if(!box||!CP) return; const ACT=actividadesCopa(), nomAct=k=>k==='general'?'General (cualquier actividad)':((ACT.find(a=>a.k===k)||{}).nombre||k);
    const resp={}; CP.RS.forEach(r=>(resp[r.pregunta_id]=resp[r.pregunta_id]||[]).push(r));
    const claves=[...new Set(CP.Q.map(q=>q.clave))].sort((a,b)=>nomAct(a).localeCompare(nomAct(b),'es'));
    const qn=nrm(CP.bus||''), L=CP.Q.filter(q=>(!CP.f||q.clave===CP.f)&&(!qn||nrm(q.pregunta+' '+(q.actividad||'')).includes(qn)));
    const docs=new Set(CP.RS.map(r=>r.perfil_id));
    box.innerHTML=`<div class="tools"><select id="cpF"><option value="">Todas las actividades (${CP.Q.length})</option>${claves.map(k=>`<option value="${escHTML(k)}" ${CP.f===k?'selected':''}>${escHTML(nomAct(k))} (${CP.Q.filter(q=>q.clave===k).length})</option>`).join('')}</select>
        <input id="cpBus" placeholder="Buscar en las preguntas…" value="${escHTML(CP.bus||'')}" style="flex:1;min-width:180px"><button class="b1" id="cpNueva">＋ Nueva pregunta</button><button class="b2" id="cpRx">⬇ Respuestas (Excel)</button></div>
      <p class="sm">${CP.RS.length} respuestas de ${docs.size} docentes · ${CP.RS.filter(r=>r.correcta).length} aciertos</p>
      <div class="twrap"><table class="t"><tr><th>Actividad</th><th>Pregunta</th><th>Correcta</th><th>Respondida</th><th></th></tr>
      ${L.map(q=>{ const r=resp[q.id]||[]; return `<tr><td class="sm">${escHTML(q.area||'')}<br><b>${escHTML(nomAct(q.clave))}</b></td><td>${q.solo_master?'<span class="sm" style="color:#b45309;font-weight:700">🏆 Solo Liga Master · </span>':''}${escHTML(q.pregunta)}<div class="sm">${['a','b','c','d'].filter(x=>q['op_'+x]).map(x=>`<span style="${q.correcta===x.toUpperCase()?'color:#1f9d6b;font-weight:700':''}">${x.toUpperCase()}) ${escHTML(q['op_'+x])}</span>`).join(' · ')}</div></td>
        <td style="text-align:center;font-weight:700">${q.correcta}</td><td style="text-align:center">${r.length?`<a href="#" data-qr="${q.id}">${r.length} · ✓${r.filter(x=>x.correcta).length}</a>`:'—'}</td>
        <td style="white-space:nowrap"><button class="b2 sm" data-qe="${q.id}">✏️ Editar</button> <button class="b2 sm" data-qd="${q.id}" title="Borrar">🗑</button></td></tr>`; }).join('')||'<tr><td colspan="5" class="sm">No hay preguntas con ese filtro.</td></tr>'}</table></div>`;
    $('cpF').onchange=e=>{ CP.f=e.target.value; pintarPregs(); };
    $('cpBus').oninput=e=>{ CP.bus=e.target.value; const v=e.target.value; pintarPregs(); const b=$('cpBus'); b.focus(); b.setSelectionRange(v.length,v.length); };
    $('cpNueva').onclick=()=>editarPreg(null);
    box.querySelectorAll('[data-qe]').forEach(b=>b.onclick=()=>editarPreg(CP.Q.find(q=>q.id===+b.dataset.qe)));
    box.querySelectorAll('[data-qr]').forEach(b=>b.onclick=e=>{ e.preventDefault(); verRespuestas(CP.Q.find(q=>q.id===+b.dataset.qr), resp[+b.dataset.qr]||[]); });
    box.querySelectorAll('[data-qd]').forEach(b=>b.onclick=async()=>{ const q=CP.Q.find(x=>x.id===+b.dataset.qd), n=(resp[q.id]||[]).length;
      if(!confirm(`¿Borrar esta pregunta?\n\n${q.pregunta}${n?`\n\nYa la respondieron ${n} docentes: sus puntos se conservan.`:''}`)) return;
      const {error}=await sb().from('sd_preguntas').delete().eq('id',q.id); if(error) return aviso('No se pudo borrar: '+(/policy|permission/i.test(error.message)?'falta ejecutar el archivo 26-copa-admin-preguntas.sql en Supabase':error.message),'bad');
      CP.Q=CP.Q.filter(x=>x.id!==q.id); aviso('Pregunta borrada','ok'); pintarPregs(); });
    $('cpRx').onclick=async()=>{ await cargarXLSX(); const QQ=Object.fromEntries(CP.Q.map(q=>[q.id,q]));
      const ws=XLSX.utils.json_to_sheet(CP.RS.slice().sort((a,b)=>String(a.creado_en).localeCompare(String(b.creado_en))).map(r=>{ const q=QQ[r.pregunta_id]||{}; return {Docente:CP.NOM[r.perfil_id]||'',Curso:r.curso,Actividad:nomAct(q.clave||''),Pregunta:q.pregunta||'(borrada)',Respondió:r.opcion||'(sin respuesta)',Correcta:q.correcta||'',Acertó:r.correcta?'Sí':'No',Segundos:r.ms!=null?Math.round(r.ms/100)/10:'',Fecha:new Date(r.creado_en).toLocaleString('es-CO')}; }));
      ws['!cols']=[{wch:36},{wch:8},{wch:30},{wch:60},{wch:12},{wch:10},{wch:8},{wch:10},{wch:22}]; const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Respuestas'); XLSX.writeFile(wb,'copa-stem-respuestas.xlsx'); };
  }
  function verRespuestas(q,L){
    const m=document.createElement('div'); m.className='admmodal'; document.body.appendChild(m);
    m.innerHTML=`<div class="amb" style="max-width:640px"><h3>👥 Quién respondió</h3><p class="sm">${escHTML(q.pregunta)} · correcta: <b>${q.correcta}</b></p>
      <div class="twrap" style="max-height:60vh;overflow:auto"><table class="t"><tr><th>Docente</th><th>Curso</th><th>Respondió</th><th>Segundos</th><th>Hora</th></tr>
      ${L.slice().sort((a,b)=>String(a.creado_en).localeCompare(String(b.creado_en))).map(r=>`<tr><td>${escHTML(CP.NOM[r.perfil_id]||'—')}</td><td>${escHTML(r.curso)}</td><td style="color:${r.correcta?'#1f9d6b':'#e5484d'};font-weight:700">${escHTML(r.opcion||'⏱ sin respuesta')} ${r.correcta?'✓':'✗'}</td><td>${r.ms!=null?Math.round(r.ms/100)/10:''}</td><td class="sm">${new Date(r.creado_en).toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit'})}</td></tr>`).join('')}</table></div>
      <div class="abtn"><button class="b1" id="vrX">Cerrar</button></div></div>`;
    m.querySelector('#vrX').onclick=()=>m.remove(); m.onclick=e=>{ if(e.target===m) m.remove(); };
  }
  function editarPreg(q){
    const ACT=actividadesCopa(), nueva=!q; q=q||{clave:CP.f||'',area:'',pregunta:'',op_a:'',op_b:'',op_c:'',op_d:'',correcta:'A'};
    const n=(CP.RS.filter(r=>r.pregunta_id===q.id)).length;
    const m=document.createElement('div'); m.className='admmodal'; document.body.appendChild(m);
    m.innerHTML=`<div class="amb" style="max-width:560px"><h3>${nueva?'＋ Nueva pregunta':'✏️ Editar pregunta'}</h3>
      ${n?`<div class="warnbox">Ya la respondieron ${n} docentes. Si cambias la respuesta correcta, los puntos que ya ganaron no cambian.</div>`:''}
      <div class="field"><label>Actividad</label><select id="peK"><option value="general" ${q.clave==='general'?'selected':''}>General (sirve para cualquier actividad)</option>${ACT.map(a=>`<option value="${escHTML(a.k)}" ${q.clave===a.k?'selected':''}>${escHTML(a.area)} · ${escHTML(a.nombre)}</option>`).join('')}${q.clave&&q.clave!=='general'&&!ACT.some(a=>a.k===q.clave)?`<option value="${escHTML(q.clave)}" selected>${escHTML(q.actividad||q.clave)} (no está en la programación)</option>`:''}</select></div>
      <div class="field"><label>Pregunta</label><textarea id="peP" rows="3">${escHTML(q.pregunta)}</textarea></div>
      ${['a','b','c','d'].map(x=>`<div class="field"><label>Opción ${x.toUpperCase()}${x>'b'?' (opcional)':''}</label><input id="pe${x}" value="${escHTML(q['op_'+x]||'')}"></div>`).join('')}
      <label class="sm" style="display:block;margin:0 0 10px"><input type="checkbox" id="peM" ${q.solo_master?'checked':''}> 🏆 Solo para la Liga Master (los docentes no la ven)</label>
      <div class="field"><label>Respuesta correcta</label><select id="peC">${['A','B','C','D'].map(x=>`<option ${q.correcta===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="err" id="peE"></div><div class="abtn"><button class="b2" id="peX">Cancelar</button><button class="b1" id="peOk">Guardar</button></div></div>`;
    const g=id=>m.querySelector('#'+id);
    g('peX').onclick=()=>m.remove();
    g('peOk').onclick=async()=>{
      const k=g('peK').value, a=ACT.find(x=>x.k===k), f={clave:k,area:k==='general'?'General':(a?a.area:q.area),actividad:k==='general'?'General':(a?a.nombre:q.actividad),
        pregunta:g('peP').value.trim(),op_a:g('pea').value.trim(),op_b:g('peb').value.trim(),op_c:g('pec').value.trim()||null,op_d:g('ped').value.trim()||null,correcta:g('peC').value};
      if(g('peM').checked||/^hacer_/.test(k)) f.solo_master=true; else if(q.solo_master) f.solo_master=false;
      if(!f.pregunta||!f.op_a||!f.op_b) return g('peE').textContent='Escribe la pregunta y al menos las opciones A y B.';
      if(!f['op_'+f.correcta.toLowerCase()]) return g('peE').textContent=`La respuesta correcta es la ${f.correcta}, pero esa opción está vacía.`;
      g('peOk').disabled=true;
      const r=nueva?await sb().from('sd_preguntas').insert({...f,autor:'Administración'}).select().single():await sb().from('sd_preguntas').update(f).eq('id',q.id).select().single();
      if(r.error){ g('peOk').disabled=false; return g('peE').textContent='No se pudo guardar: '+(/policy|permission/i.test(r.error.message)?'falta ejecutar el archivo 26-copa-admin-preguntas.sql en Supabase':r.error.message); }
      if(nueva) CP.Q.push(r.data); else Object.assign(CP.Q.find(x=>x.id===q.id),r.data||f);
      m.remove(); aviso(nueva?'Pregunta agregada':'Pregunta guardada','ok'); pintarPregs(); };
  }
  /* v47 · qué actividades de la programación tienen preguntas */
  function coberturaHTML(Q){
    const st=S(); if(!st||!st.prog||!window.copaClave) return '';
    const porClave={}; Q.forEach(r=>porClave[r.clave]=(porClave[r.clave]||0)+1); const gen=porClave.general||0;
    const act={}; st.prog.filter(r=>r.tipo==='actividad'&&!/direcci[oó]n de (grupo|curso)/i.test((r.area||'')+' '+(r.titulo||''))).forEach(r=>{ const k=copaClave(r);
      const a=act[k]=act[k]||{k,area:String(r.area||'').replace(/\.$/,''),nombres:new Set(),niv:new Set()}; a.nombres.add(r.titulo||r.area); a.niv.add(r.nivel); });
    const L=Object.values(act).sort((a,b)=>a.area.localeCompare(b.area,'es')||[...a.nombres][0].localeCompare([...b.nombres][0],'es')), sin=L.filter(a=>!porClave[a.k]);
    return `<details class="dlbox" ${sin.length?'open':''}><summary><b>¿Qué actividades ya tienen preguntas?</b> ${sin.length?`<span style="color:#b45309">${sin.length} de ${L.length} sin preguntas</span>`:'<span style="color:#1f9d6b">todas tienen</span>'} · preguntas generales: ${gen}</summary>
      <p class="sm">Si una actividad no tiene preguntas propias, la trivia usa las <b>generales</b>${gen?'':' (aún no hay ninguna)'}.</p>
      <table class="t"><tr><th>Área</th><th>Actividad</th><th>Nivel</th><th>Preguntas</th></tr>${L.map(a=>`<tr><td>${escHTML(a.area)}</td><td>${escHTML([...a.nombres][0])}</td><td>${[...a.niv].join(' y ')}</td><td style="font-weight:700;color:${porClave[a.k]?'#1f9d6b':'#e5484d'}">${porClave[a.k]||0}</td></tr>`).join('')}</table></details>`;
  }
  async function leerPreg(file){
    const res=$('qRes'); res.innerHTML='<p class="sm">Leyendo…</p>';
    try{
      await cargarXLSX(); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const ws=wb.Sheets['Preguntas']||wb.Sheets[wb.SheetNames.find(n=>/pregunt/i.test(n))||wb.SheetNames[0]];
      const M=XLSX.utils.sheet_to_json(ws,{header:1,defval:''}); const norm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
      const hi=M.findIndex(r=>r.some(c=>norm(c)==='pregunta')); if(hi<0) throw new Error('No se encontró la fila de encabezados (columna «Pregunta»).');
      const H=M[hi].map(norm), col=k=>H.findIndex(h=>h.startsWith(k));
      const ci={area:col('area'),act:col('actividad'),p:col('pregunta'),a:col('opcion a'),b:col('opcion b'),c:col('opcion c'),d:col('opcion d'),ok:col('respuesta'),au:col('registrada')};
      const filas=[], malas=[];
      M.slice(hi+1).forEach((r,i)=>{ const g=k=>ci[k]>=0?String(r[ci[k]]||'').trim():''; if(!g('p')&&!g('act')) return;
        const f={area:g('area'),actividad:g('act'),pregunta:g('p'),a:g('a'),b:g('b'),c:g('c'),d:g('d'),correcta:g('ok').toUpperCase().slice(0,1),autor:g('au')};
        const ok=f.pregunta&&f.a&&f.b&&'ABCD'.includes(f.correcta)&&f.correcta&&(f.correcta!=='C'||f.c)&&(f.correcta!=='D'||f.d)&&f.actividad;
        if(!ok){ malas.push(hi+2+i); return; }
        f.clave=/^general/i.test(f.area)||/^general/i.test(f.actividad)?'general':(window.copaClave?copaClave({titulo:f.actividad,categoria:/tecno/i.test(f.area)?'tec':''}):norm(f.actividad));
        filas.push(f); });
      if(!filas.length) throw new Error('No se encontraron preguntas completas.');
      const por={}; filas.forEach(f=>por[f.actividad]=(por[f.actividad]||0)+1);
      res.innerHTML=`<div class="okbox">Se leyeron <b>${filas.length}</b> preguntas: ${Object.entries(por).map(([k,v])=>`${escHTML(k)} (${v})`).join(', ')}.${malas.length?`<br>Se omitieron ${malas.length} filas incompletas (filas ${malas.slice(0,12).join(', ')}${malas.length>12?'…':''}).`:''}</div><p class="sm">Se reemplazarán solo las preguntas de: <b>${[...new Set(filas.map(f=>f.area||'(sin área)'))].map(escHTML).join(', ')}</b>. Las demás áreas no cambian.</p>
        <label class="sm" style="display:block;margin:4px 0 10px"><input type="checkbox" id="qTodo"> Reemplazar todo el banco (borra las preguntas de todas las áreas que no se hayan respondido)</label>
        <button class="b1" id="qOk">Cargar estas preguntas</button>`;
      $('qOk').onclick=async()=>{ $('qOk').disabled=true; $('qOk').textContent='Guardando…';
        const todo=!!(res.querySelector('#qTodo')&&res.querySelector('#qTodo').checked);
        let {data,error}=await sb().rpc('sd_copa_importar_areas',{p_filas:filas,p_todo:todo});
        if(error&&/sd_copa_importar_areas/.test(error.message)){ if(!todo&&!confirm('Falta ejecutar el archivo 25-copa-preguntas-por-area.sql en Supabase. Sin él, cargar este archivo BORRA las preguntas de las demás áreas. ¿Cargar de todas formas?')){ $('qOk').disabled=false; $('qOk').textContent='Cargar estas preguntas'; return; } ({data,error}=await sb().rpc('sd_copa_importar',{p_filas:filas})); }
        if(error){ res.innerHTML=`<div class="warnbox">No se pudo guardar: ${escHTML(error.message)}</div>`; return; }
        aviso(`Banco cargado: ${data} preguntas`,'ok'); tCopa(); };
    }catch(e){ res.innerHTML=`<div class="warnbox">${escHTML(e.message)}</div>`; }
  }

  /* ---------------- 1. Importar Excel ---------------- */
  async function tImportar(){
    const { data:hist } = await sb().from('sd_importaciones').select('*').order('hecho_en',{ascending:false}).limit(5);
    $('admTab').innerHTML = `
      <div class="drop" id="drop">Arrastra aquí el Excel con el mismo formato o <b>toca para elegir el archivo</b><br>
        <span class="sm">Se leen las hojas PRIMARIA y BACHILLERATO; la columna OBSERVACIONES se ignora. La hoja del directorio se usa solo para los correos.</span></div>
      <input type="file" id="fx" accept=".xlsx,.xls" hidden>
      <div id="impRes"></div>
      <h4 style="margin:18px 0 6px">Últimas cargas</h4>
      ${(hist&&hist.length)?`<table class="t"><tr><th>Fecha</th><th>Archivo</th><th>Filas</th><th>Docentes</th></tr>${hist.map(h=>`<tr><td>${new Date(h.hecho_en).toLocaleString('es-CO')}</td><td>${escHTML(h.archivo||'')}</td><td>${h.filas}</td><td>${h.docentes}</td></tr>`).join('')}</table>`:'<p class="sm">Aún no se ha cargado ningún archivo.</p>'}`;
    const drop=$('drop'), fx=$('fx');
    drop.onclick=()=>fx.click();
    drop.ondragover=e=>{ e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave=()=>drop.classList.remove('over');
    drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove('over'); if(e.dataTransfer.files[0]) leer(e.dataTransfer.files[0]); };
    fx.onchange=()=>{ if(fx.files[0]) leer(fx.files[0]); };
  }
  async function leer(file){
    const res=$('impRes'); res.innerHTML='<p class="sm" style="margin-top:12px">Leyendo el archivo…</p>';
    try{ await cargarXLSX(); lectura = await SteamExcel.leerArchivo(file); lectura.archivo=file.name; }
    catch(e){ res.innerHTML=`<div class="warnbox">No se pudo leer el archivo: ${escHTML(e.message)}</div>`; return; }
    const r=lectura.resumen, p=lectura.pendientes, sinCorreo=lectura.docentes.filter(d=>!d.correo);
    const bloqueante = !lectura.filas.length;
    res.innerHTML = `
      <div class="stat"><div><b>${r.filas}</b><span>filas de actividades</span></div><div><b>${r.cursos}</b><span>cursos</span></div>
        <div><b>${r.acompanantes}</b><span>directores de curso</span></div><div><b>${r.apoyos}</b><span>codirectores</span></div>
        <div><b>${r.apoyos_dos_cursos}</b><span>apoyos con 2 cursos</span></div><div><b>${lectura.docentes.length-sinCorreo.length} / ${lectura.docentes.length}</b><span>docentes con correo</span></div></div>
      ${bloqueante?'<div class="warnbox"><b>El archivo no trae filas de programación. Revisa que tenga las hojas PRIMARIA y BACHILLERATO.</b></div>':
        `<div class="${p.sin_titulo+p.sin_frase+p.sin_docente_cargo?'warnbox':'okbox'}"><b>El archivo se puede cargar.</b>${p.sin_titulo+p.sin_frase+p.sin_docente_cargo?` Quedan casillas por completar (la app mostrará "Información pendiente"):
          <ul><li>${p.sin_titulo} filas sin título de actividad</li><li>${p.sin_frase} filas sin frase</li><li>${p.sin_docente_cargo} filas sin docente a cargo</li></ul>`:''}</div>`}
      ${lectura.avisos.length?`<div class="warnbox"><b>Revisa:</b><ul>${lectura.avisos.slice(0,15).map(a=>`<li>${escHTML(a)}</li>`).join('')}${lectura.avisos.length>15?`<li>… y ${lectura.avisos.length-15} más</li>`:''}</ul></div>`:''}
      <p class="sm">Al actualizar se reemplaza toda la programación actual. Las ediciones hechas a mano en la pestaña Programación se pierden; los avatares, alertas y correcciones de curso de los docentes se conservan.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px"><button class="b2" id="impNo">Cancelar</button><button class="b1" id="impSi" ${bloqueante?'disabled':''}>Actualizar toda la app</button></div>`;
    $('impNo').onclick=()=>{ lectura=null; res.innerHTML=''; };
    $('impSi').onclick=async()=>{
      $('impSi').disabled=true; $('impSi').textContent='Actualizando…';
      const filas=lectura.filas.map(f=>({ tipo:f.tipo, nivel:f.nivel, grado:f.grado||'', curso:f.curso||'', hora_inicio:f.hora_inicio, hora_fin:f.hora_fin,
        franja:f.franja, salon:f.salon, area:f.area, categoria:f.categoria, titulo:f.titulo, frase:f.frase, docente_cargo:f.docente_cargo,
        acompanante:f.acompanante, apoyo:f.apoyo, estudiantes:f.estudiantes||'', fila:f.fila }));
      const { data, error } = await sb().rpc('sd_importar', { p_filas:filas, p_directorio:lectura.directorio, p_archivo:lectura.archivo, p_originales:lectura.originales||null });
      if(error){ res.insertAdjacentHTML('beforeend',`<div class="warnbox">No se pudo actualizar: ${escHTML(error.message)}</div>`); $('impSi').disabled=false; $('impSi').textContent='Actualizar toda la app'; return; }
      aviso(`Programación actualizada: ${data.filas} filas, ${data.docentes} docentes.`,'ok'); const llam=lectura.llamado||[]; lectura=null;
      if(llam.length){ try{ const msg=await guardarLlamado(llam); aviso(msg,'ok'); }catch(e){ aviso('El horario se cargó, pero no el llamado de 10° y 11°: '+(/sd_may_llamado|sd_may_aplicar/.test(e.message)?'falta ejecutar el archivo 32-llamado-decimo-undecimo.sql en Supabase.':e.message),'bad'); } }
      try{ if(window.recargarDatos) await window.recargarDatos(); const n=await aplicarLideres(); if(n!=null) aviso(`Programación actualizada y líderes asignados (${n} filas con cambios).`,'ok'); }catch(e){ aviso('La programación se cargó, pero no se pudieron asignar los líderes: '+e.message,'bad'); }
      tImportar();
    };
  }

  /* ---------------- 2. Programación (edición puntual) ---------------- */
  async function tProgramacion(){
    const prog=S().prog;
    if(!prog.length){ $('admTab').innerHTML='<p class="sm">Aún no hay programación. Carga el Excel primero.</p>'; return; }
    const cursos=[...new Set(prog.filter(r=>r.nivel===filtro.nivel&&r.curso).map(r=>r.curso))].sort();
    if(!cursos.includes(filtro.curso)) filtro.curso=cursos[0]||'';
    const filas=prog.filter(r=>r.curso===filtro.curso).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
    $('admTab').innerHTML=`
      <div class="tools"><select id="pfN"><option ${filtro.nivel==='Primaria'?'selected':''}>Primaria</option><option ${filtro.nivel==='Bachillerato'?'selected':''}>Bachillerato</option></select>
        <select id="pfC">${cursos.map(c=>`<option ${c===filtro.curso?'selected':''}>${escHTML(c)}</option>`).join('')}</select>
        <span class="sm">Los cambios llegan de inmediato a los celulares. Si cambias el salón, el docente verá un aviso de cambio.</span></div>
      <div class="twrap"><table class="t"><tr><th>Hora</th><th>Área</th><th>Salón</th><th>Título</th><th>Frase</th><th>Docente a cargo</th><th>Director de curso</th><th>Codirector</th><th></th></tr>
      ${filas.map(r=>`<tr data-id="${r.id}"><td>${fmtHora(r.hora_inicio)}<br><span class="sm">${fmtHora(r.hora_fin)}</span></td><td>${escHTML(r.area||'')}</td>
        <td><input data-k="salon" value="${escHTML(r.salon||'')}"></td><td><input data-k="titulo" value="${escHTML(r.titulo||'')}"></td>
        <td><input data-k="frase" value="${escHTML(r.frase||'')}"></td><td><input data-k="docente_cargo" value="${escHTML(r.docente_cargo||'')}"></td>
        <td><input data-k="acompanante" value="${escHTML(r.acompanante||'')}"></td><td><input data-k="apoyo" value="${escHTML(r.apoyo||'')}"></td>
        <td><button class="b1" data-save>Guardar</button></td></tr>`).join('')}</table></div>`;
    $('pfN').onchange=e=>{ filtro.nivel=e.target.value; filtro.curso=''; tProgramacion(); };
    $('pfC').onchange=e=>{ filtro.curso=e.target.value; tProgramacion(); };
    $('admTab').querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
      const tr=b.closest('tr'), id=+tr.dataset.id, r=prog.find(x=>x.id===id), cambios={};
      tr.querySelectorAll('input').forEach(i=>{ const v=i.value.trim(); if(v!==(r[i.dataset.k]||'')) cambios[i.dataset.k]=v||null; });
      if(!Object.keys(cambios).length) return aviso('No hay cambios en esta fila.');
      if('salon' in cambios) cambios.nota_cambio=`Cambió de salón: ${r.salon||'—'} → ${cambios.salon||'—'}`;
      b.disabled=true;
      const { error } = await sb().from('sd_programacion').update(cambios).eq('id',id);
      b.disabled=false;
      if(error) return aviso('No se pudo guardar: '+error.message,'bad');
      Object.assign(r,cambios); aviso('Cambio guardado','ok');
      if('docente_cargo' in cambios||'salon' in cambios) aplicarLideres().catch(()=>{});
    });
  }

  /* ---------------- 3. Usuarios ---------------- */
  async function tUsuarios(){
    const [{ data:perf, error:e1 }, { data:dir, error:e2 }] = await Promise.all([
      sb().from('sd_perfiles').select('id,correo,nombre,rol,experiencia,video_visto,avatar,confirmado').order('nombre'),
      sb().from('sd_directorio').select('correo,nombre,nombre_n')
    ]);
    if(e1) throw e1; if(e2) throw e2;
    const porCorreo=new Map((perf||[]).map(p=>[p.correo.toLowerCase(),p]));
    // docentes de la programación con su correo del directorio
    const prog=S().prog, nombres=new Map();
    prog.filter(r=>r.tipo==='actividad').forEach(r=>{ [r.acompanante,r.apoyo].forEach(n=>{ if(n) nombres.set(SteamExcel.norm(n), n); }); });
    const cargos=new Map(); prog.filter(r=>r.tipo==='actividad'&&r.docente_cargo&&!/director de curso|docentes del/i.test(r.docente_cargo)).forEach(r=>String(r.docente_cargo).split(/\s*-\s*/).map(x=>x.trim()).filter(Boolean).forEach(n=>cargos.set(SteamExcel.norm(n),n)));
    const dn=x=>x.nombre_n||SteamExcel.norm(x.nombre||''); const buscar = n => { const k=SteamExcel.norm(n); const d=(dir||[]).find(x=>dn(x)===k) || (dir||[]).find(x=>dn(x).startsWith(k)); return d?d.correo:''; };
    const docentes=[...nombres.values()].sort((a,b)=>a.localeCompare(b,'es')).map(n=>({ nombre:n, correo:buscar(n), rol:'docente' }));
    const todos=[{nombre:ADMIN[0],correo:ADMIN[1],rol:'admin',cargo:ADMIN[2]}, ...MASTERS.map(m=>({nombre:m[0],correo:m[1],rol:'master',cargo:m[2]})), ...docentes];
    const sinCuenta=todos.filter(u=>u.correo && !porCorreo.has(u.correo.toLowerCase()));
    const enDir=n=>{ if(buscar(n)) return true; const D=(dir||[]).map(d=>({...d,correo:String(d.correo).toLowerCase()})); return !!buscarPersona(n,D); };
    const sinCorreo=[...docentes.filter(d=>!d.correo), ...[...cargos.values()].filter(n=>!nombres.has(SteamExcel.norm(n))&&!enDir(n)).map(n=>({nombre:n,correo:'',rol:'lider'}))]
      .filter(d=>!(perf||[]).some(p=>SteamExcel.norm(p.nombre)===SteamExcel.norm(d.nombre)));
    const expN={mat:'Matemáticas',cie:'Ciencias Naturales',tec:'Tecnología'};
    $('admTab').innerHTML=`
      <div class="stat"><div><b>${(perf||[]).length}</b><span>cuentas creadas</span></div><div><b>${sinCuenta.length}</b><span>personas sin cuenta</span></div>
        <div><b>${(perf||[]).filter(p=>p.confirmado).length}</b><span>ya ingresaron</span></div><div><b>${(perf||[]).filter(p=>p.avatar).length}</b><span>crearon su avatar</span></div></div>
      ${sinCorreo.length?`<div class="warnbox"><b>Docentes del horario que no están en el directorio:</b> el botón «Crear cuentas faltantes» no los puede crear porque no tiene su correo. Toca <b>Crear cuenta</b> y escribe su correo institucional.<ul class="ulc">${sinCorreo.map(d=>`<li><span>${escHTML(d.nombre)}</span><button class="b2 sm" data-cu="${escHTML(d.nombre)}">➕ Crear cuenta</button></li>`).join('')}</ul></div>`:''}
      <div class="tools"><button class="b1" id="uCrear">⭐ Crear cuentas faltantes</button><button class="b1" id="uUno" style="background:#1f9d6b">➕ Crear un usuario</button><button class="b2" id="uCsv">Descargar lista (${sinCuenta.length})</button>
        <span class="sm">Crea las cuentas de docentes y líderes que aún no tienen, con la contraseña temporal <b>0000</b> (al entrar, la app les pide crear la suya).</span></div>
      <h4 style="margin:14px 0 6px">Usuarios Master</h4>
      <div class="twrap"><table class="t"><tr><th>Nombre</th><th>Cargo</th><th>Correo</th><th>Cuenta</th><th>Experiencia elegida</th></tr>
        ${[ {nombre:ADMIN[0],correo:ADMIN[1],cargo:ADMIN[2]}, ...MASTERS.map(m=>({nombre:m[0],correo:m[1],cargo:m[2]}))].map(m=>{ const p=porCorreo.get(m.correo.toLowerCase());
          return `<tr><td><b>${escHTML(m.nombre)}</b></td><td>${escHTML(m.cargo)}</td><td class="sm">${escHTML(m.correo)}</td><td>${p?(p.confirmado?'✓ Activa':'Creada, sin ingresar'):'<span class="pend">Sin cuenta</span>'}</td><td>${p&&p.experiencia?expN[p.experiencia]:'—'}</td></tr>`; }).join('')}</table></div>
      ${(perf||[]).filter(p=>p.rol==='lider').length?`<h4 style="margin:18px 0 6px">Líderes de estación</h4><div class="twrap"><table class="t"><tr><th>Nombre</th><th>Correo</th><th>Cuenta</th><th>Avatar</th></tr>${(perf||[]).filter(p=>p.rol==='lider').map(p=>`<tr><td>${escHTML(p.nombre)}</td><td class="sm">${escHTML(p.correo)}</td><td>${p.confirmado?'✓ Activa':'Creada, sin ingresar'}</td><td>${p.avatar?'✓':'—'}</td></tr>`).join('')}</table></div>`:''}
      <h4 style="margin:18px 0 6px">Docentes</h4>
      <div class="twrap"><table class="t"><tr><th>Nombre</th><th>Correo</th><th>Cuenta</th><th>Avatar</th></tr>
        ${docentes.map(d=>{ const p=d.correo&&porCorreo.get(d.correo.toLowerCase());
          return `<tr><td>${escHTML(d.nombre)}</td><td class="sm">${escHTML(d.correo||'—')}</td><td>${p?(p.confirmado?'✓ Activa':'Creada, sin ingresar'):'<span class="pend">Sin cuenta</span>'}</td><td>${p&&p.avatar?'✓':'—'}</td></tr>`; }).join('')}</table></div>`;
    $('uCrear').onclick=async()=>{ $('uCrear').disabled=true; $('uCrear').textContent='Creando…'; try{ await crearCuentasFaltantes(); }catch(e){ aviso('No se pudieron crear: '+e.message,'bad'); } tUsuarios(); };
    $('admTab').insertAdjacentHTML('beforeend','<div id="cuBox"></div>');
    todosPerfiles().then(P=>{ $('cuBox').innerHTML=cuentasHTML(P); bindCuentas(P); }).catch(e=>{ $('cuBox').innerHTML='<div class="warnbox">'+escHTML(e.message)+'</div>'; });
    $('uUno').onclick=()=>crearUsuarioModal('',perf,[...nombres.values()]);
    document.querySelectorAll('#admTab [data-cu]').forEach(b=>b.onclick=()=>crearUsuarioModal(b.dataset.cu,perf,[...nombres.values()]));
    $('uCsv').onclick=()=>{
      if(!sinCuenta.length) return aviso('Todas las personas ya tienen cuenta.','ok');
      descargar('cuentas.csv', 'nombre,correo,rol\n'+sinCuenta.map(u=>[u.nombre,u.correo,u.rol].map(csvCell).join(',')).join('\n'));
    };
  }

  /* Crear una cuenta a mano (docente o líder que no está en el directorio) */
  function crearUsuarioModal(nombre0, perf, nombresHorario){
    const m=document.createElement('div'); m.className='admmodal'; document.body.appendChild(m);
    m.innerHTML=`<div class="amb"><h3>➕ Crear un usuario</h3>
      <p class="sm">Queda con la contraseña temporal <b>0000</b>; al entrar, la app le pide crear la suya.</p>
      <div class="field"><label>Nombre (escríbelo igual que en el horario del Excel)</label><input id="cuN" list="cuL" value="${escHTML(nombre0||'')}" placeholder="Ej.: Pérez Gómez Ana María"><datalist id="cuL">${(nombresHorario||[]).map(n=>`<option value="${escHTML(n)}">`).join('')}</datalist></div>
      <p class="sm" id="cuH" style="margin:-4px 0 10px"></p>
      <div class="field"><label>Correo institucional</label><input id="cuC" type="email" placeholder="nombre@colegio.cafam.edu.co" autocomplete="off"></div>
      <div class="field"><label>Perfil</label><select id="cuR"><option value="docente">Docente</option><option value="lider">Líder de estación</option><option value="master">Master</option><option value="organizador">Organizador</option><option value="organizador_m">Organizador Master</option><option value="secretario">Secretario</option></select></div><div class="field"><label><input type="checkbox" id="cuO"> También Máster Coordinador</label></div>
      <div class="err" id="cuE"></div>
      <div class="abtn"><button class="b2" id="cuX">Cancelar</button><button class="b1" id="cuOk">Crear cuenta</button></div></div>`;
    const N=m.querySelector('#cuN'), C=m.querySelector('#cuC'), R=m.querySelector('#cuR'), Hh=m.querySelector('#cuH'), Er=m.querySelector('#cuE');
    // v39: el Excel escribe «ESTEBAN BERNAL» (nombre y apellido) y el directorio «Bernal … Esteban»: se compara por palabras, no por el texto exacto
    const pal=x=>SteamExcel.norm(x).replace(/[^a-z ]/g,' ').split(' ').filter(w=>w.length>1);
    const esCargo=n=>{ const tn=pal(n); return tn.length>=2&&S().prog.some(r=>r.tipo==='actividad'&&r.docente_cargo&&String(r.docente_cargo).split(/\s*(?:[-,;\/]|\sy\s)\s*/i).some(x=>{ const tx=pal(x); return tx.length>=2&&tx.every(w=>tn.includes(w)); })); };
    const revisa=()=>{ const n=N.value.trim(), k=SteamExcel.norm(n); if(!n){ Hh.textContent=''; return; }
      const fs=S().prog.filter(r=>r.tipo==='actividad'&&[r.acompanante,r.apoyo].some(x=>x&&SteamExcel.norm(x)===k));
      const lid=esCargo(n); if(lid) R.value='lider';
      Hh.innerHTML=fs.length?`✓ Aparece en el horario: es director o codirector de ${[...new Set(fs.map(r=>r.curso))].join(', ')}`:lid?'✓ Aparece en el horario como docente a cargo (líder de estación)':'<span style="color:#b45309">⚠ Ese nombre no aparece en el horario. Puede ingresar, pero no verá cursos hasta que el nombre coincida con el Excel.</span>'; };
    N.oninput=revisa; revisa(); (nombre0?C:N).focus();
    m.querySelector('#cuX').onclick=()=>m.remove();
    m.querySelector('#cuOk').onclick=async()=>{
      const nombre=N.value.trim().replace(/\s+/g,' '), correo=C.value.trim().toLowerCase(), rolU=R.value, rol=rolU==='organizador_m'?'organizador':rolU; Er.textContent='';
      if(nombre.length<5) return Er.textContent='Escribe el nombre completo.';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return Er.textContent='Revisa el correo.';
      const ya=(perf||[]).find(p=>String(p.correo).toLowerCase()===correo);
      if(ya&&!(ya.rol==='docente'&&rol==='lider')){ Er.innerHTML=`Ese correo ya tiene cuenta (${escHTML(ya.nombre)}). Si no puede entrar, restablece su contraseña a 0000. <button class="b2 sm" id="cuRes" style="margin-top:8px">🔑 Restablecer contraseña a 0000</button>`;
        m.querySelector('#cuRes').onclick=async()=>{ const { error }=await sb().rpc('sd_restablecer_clave',{p_correo:correo}); if(error) return Er.textContent='No se pudo restablecer: '+error.message+' (¿ejecutaste el SQL 15?)'; m.remove(); aviso(`Contraseña de ${correo} restablecida a 0000`,'ok'); tUsuarios(); }; return; }
      const b=m.querySelector('#cuOk'); b.disabled=true; b.textContent='Creando…';
      try{
        const { error:e1 }=await sb().from('sd_directorio').upsert({correo,nombre},{onConflict:'correo'}); if(e1) throw e1;
        const { data, error }=await sb().rpc('sd_crear_cuentas',{p_lista:[{nombre,correo,rol,org_master:m.querySelector('#cuO').checked}]}); if(error) throw error;
        if(rolU==='organizador_m'){ const q=await sb().from('sd_perfiles').select('id').eq('correo',correo).maybeSingle(); if(q.data){ const r2=await sb().rpc('sd_org_lista',{p_id:q.data.id,p_valor:true}); if(r2.error) throw new Error('La cuenta se creó, pero no se pudo marcar como Organizador Master: '+r2.error.message+' (¿ejecutaste el SQL 24?)'); } }
        if(rol==='lider'&&window.aplicarLideres){ try{ await window.aplicarLideres(); }catch(e){} }
        m.remove();
        aviso(data&&data.creadas?`Cuenta creada: ${correo} · contraseña temporal 0000`:data&&data.roles?`${nombre} ahora es líder de estación`:'La cuenta ya existía; quedó actualizada en el directorio.','ok');
        tUsuarios();
      }catch(e){ b.disabled=false; b.textContent='Crear cuenta'; Er.textContent='No se pudo crear: '+(e.message||e); }
    };
  }

  /* ---------------- 4. Correcciones de curso ---------------- */
  async function tCorrecciones(){
    // v51: las solicitudes quedan pendientes hasta que el administrador las apruebe
    let r=await sb().from('sd_perfiles').select('id,nombre,nombre_n,correo,cursos_manual,cursos_manual_en,cursos_solicitud,cursos_solicitud_en,cursos_respuesta').or('cursos_manual.not.is.null,cursos_solicitud.not.is.null').order('nombre');
    const sin28=!!(r.error&&/cursos_solicitud/.test(r.error.message));
    if(sin28) r=await sb().from('sd_perfiles').select('id,nombre,nombre_n,correo,cursos_manual,cursos_manual_en').not('cursos_manual','is',null).order('nombre');
    if(r.error) throw r.error;
    const data=r.data||[], prog=S().prog;
    const segunExcel = n => { const s=new Set(); prog.forEach(x=>{ if(x.tipo==='actividad' && (x.acompanante_n===n||x.apoyo_n===n)) s.add(x.curso); }); return [...s].sort().join(', ')||'No aparece'; };
    const P=data.filter(p=>p.cursos_solicitud), A=data.filter(p=>p.cursos_manual&&p.cursos_manual.length);
    const pide=p=>p.cursos_solicitud.length?p.cursos_solicitud.join(', '):'Volver a la programación';
    $('admTab').innerHTML=`${sin28?'<div class="warnbox">Falta ejecutar el archivo <b>28-lista-dia-evento-y-correcciones.sql</b> en Supabase: hasta entonces, el cambio de curso de los docentes se aplica sin aprobación.</div>':''}
      <h3 style="margin-bottom:6px">⏳ Solicitudes pendientes (${P.length})</h3>
      <p class="sm" style="margin-bottom:8px">El docente pidió cambiar su curso con «¿Tu curso no aparece bien?». Su ruta no cambia hasta que apruebes. Al responder, le llega un aviso.</p>
      ${P.length?`<div class="twrap"><table class="t"><tr><th>Docente</th><th>Según el Excel</th><th>Ahora</th><th>Pide</th><th>Fecha</th><th></th></tr>
      ${P.map(p=>`<tr><td><b>${escHTML(p.nombre)}</b><br><span class="sm">${escHTML(p.correo)}</span></td><td>${escHTML(segunExcel(p.nombre_n))}</td><td>${escHTML((p.cursos_manual||[]).join(', ')||'Lo del Excel')}</td><td><b>${escHTML(pide(p))}</b></td><td class="sm">${p.cursos_solicitud_en?new Date(p.cursos_solicitud_en).toLocaleString('es-CO'):''}</td>
        <td style="white-space:nowrap"><button class="b1 sm" data-ok="${p.id}">✓ Aprobar</button> <button class="b2 sm" data-no="${p.id}">✗ Rechazar</button></td></tr>`).join('')}</table></div>`:'<div class="okbox">No hay solicitudes pendientes.</div>'}
      <h3 style="margin:22px 0 6px">Cursos corregidos (aprobados)</h3>
      ${A.length?`<div class="twrap"><table class="t"><tr><th>Docente</th><th>Según el Excel</th><th>Acompaña</th><th></th></tr>
      ${A.map(p=>`<tr><td><b>${escHTML(p.nombre)}</b><br><span class="sm">${escHTML(p.correo)}</span></td><td>${escHTML(segunExcel(p.nombre_n))}</td><td><b>${escHTML(p.cursos_manual.join(', '))}</b></td><td><button class="b2 sm" data-qx="${p.id}">Volver a lo del Excel</button></td></tr>`).join('')}</table></div>`:'<p class="sm">Ningún docente tiene un curso corregido.</p>'}`;
    const resolver=async(id,ok)=>{ const p=data.find(x=>x.id===id);
      if(!confirm(`${ok?'¿Aprobar':'¿Rechazar'} la solicitud de ${p.nombre}: ${pide(p)}?`)) return;
      const {error}=await sb().rpc('sd_resolver_curso',{p_id:id,p_ok:ok}); if(error) return aviso('No se pudo: '+error.message,'bad');
      aviso(ok?`Aprobado: ${p.nombre} · ${pide(p)}`:`Rechazada la solicitud de ${p.nombre}`,'ok'); tCorrecciones(); };
    $('admTab').querySelectorAll('[data-ok]').forEach(b=>b.onclick=()=>resolver(b.dataset.ok,true));
    $('admTab').querySelectorAll('[data-no]').forEach(b=>b.onclick=()=>resolver(b.dataset.no,false));
    $('admTab').querySelectorAll('[data-qx]').forEach(b=>b.onclick=async()=>{ const p=data.find(x=>x.id===b.dataset.qx); if(!confirm(`¿Quitar la corrección de ${p.nombre}? Volverá a lo que dice el Excel.`)) return;
      const {error}=await sb().from('sd_perfiles').update({cursos_manual:null}).eq('id',p.id); if(error) return aviso('No se pudo: '+error.message,'bad'); aviso('Listo','ok'); tCorrecciones(); });
  }

  /* ---------------- 5. Avisos generales ---------------- */
  async function tAvisos(){
    const { data, error } = await sb().from('sd_avisos').select('*').order('creado_en',{ascending:false}).limit(50);
    if(error) throw error;
    const cursos=[...new Set(S().prog.filter(r=>r.curso).map(r=>r.curso))].sort();
    $('admTab').innerHTML=`
      <div class="field" style="margin-bottom:10px"><label>Título</label><input id="avT" maxlength="80" placeholder="Ej. Cambio de salón"></div>
      <div class="field" style="margin-bottom:10px"><label>Mensaje</label><textarea id="avM" rows="3" maxlength="400" placeholder="Ej. La actividad de Matemáticas de 7A pasa al salón 210."></textarea></div>
      <div class="field" style="margin-bottom:12px"><label>Para</label><select id="avC"><option value="">Todos</option>${cursos.map(c=>`<option>${escHTML(c)}</option>`).join('')}</select></div>
      <button class="b1" id="avEnviar">Enviar aviso</button> <span class="sm">Aparece en la app de inmediato y como notificación en los celulares con avisos activados.</span>
      <h4 style="margin:18px 0 6px">Avisos enviados</h4>
      ${(data&&data.length)?`<table class="t"><tr><th>Fecha</th><th>Para</th><th>Aviso</th><th></th></tr>${data.map(a=>`<tr><td class="sm">${new Date(a.creado_en).toLocaleString('es-CO')}</td><td>${escHTML(a.curso||'Todos')}</td><td><b>${escHTML(a.titulo)}</b><br>${escHTML(a.mensaje)}</td><td><button class="b2" data-del="${a.id}">Borrar</button></td></tr>`).join('')}</table>`:'<p class="sm">No hay avisos.</p>'}`;
    $('avEnviar').onclick=async()=>{
      const titulo=$('avT').value.trim(), mensaje=$('avM').value.trim(), curso=$('avC').value||null;
      if(!titulo||!mensaje) return aviso('Escribe el título y el mensaje.','bad');
      const { error } = await sb().from('sd_avisos').insert({ titulo, mensaje, curso, creado_por:S().perfil.id }); if(!error&&window.avisarYa) avisarYa();
      if(error) return aviso('No se pudo enviar: '+error.message,'bad');
      aviso('Aviso enviado','ok'); tAvisos();
    };
    $('admTab').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
      const { error } = await sb().from('sd_avisos').delete().eq('id',+b.dataset.del);
      if(error) return aviso('No se pudo borrar: '+error.message,'bad'); tAvisos();
    });
  }

  /* ---------------- 6. Configuración ---------------- */
  async function tConfig(){
    const c=S().config||{};
    $('admTab').innerHTML=`
      <div class="field" style="margin-bottom:12px"><label>Fecha del evento</label><input id="cfF" type="date" value="${escHTML(c.fecha_evento||'2026-10-23')}"></div>
      <div class="field" style="margin-bottom:12px"><label>Video de bienvenida (enlace de YouTube, Google Drive o archivo .mp4)</label><input id="cfV" value="${escHTML(c.video_url||'')}" placeholder="https://youtu.be/..."></div>
      <div class="field" style="margin-bottom:12px"><label>Video tutorial para usuarios Master (enlace de YouTube, Google Drive o archivo .mp4)</label><input id="cfT" value="${escHTML(c.video_tutorial_url||'')}" placeholder="https://youtu.be/..."></div>
      <div class="field" style="margin-bottom:12px"><label>Video tutorial para docentes (archivo .mp4 o enlace)</label><input id="cfTD" value="${escHTML(c.video_tutorial_docente||'')}" placeholder="https://…/Videos/tutorial-docentes-vertical.mp4"></div>
      <div class="field" style="margin-bottom:12px"><label>Video tutorial para organizadores (archivo .mp4 o enlace)</label><input id="cfTO" value="${escHTML(c.video_tutorial_org||'')}" placeholder="https://…/Videos/tutorial-organizadores-vertical.mp4"></div>
      <div class="field" style="margin-bottom:12px"><label>Video tutorial para líderes de estación</label><input id="cfTL" value="${escHTML(c.video_tutorial_lider||'')}" placeholder="https://…/Videos/tutorial-lideres-de-estacion.mp4"></div>
      ${(()=>{ const U=String(c.video_hacer||'').split(/\s*\|\s*|\s+/).filter(x=>/^https?:/i.test(x)); return `<div class="field" style="margin-bottom:12px"><label>Video del hacer (Cambio Climático) · <b>Primaria</b> · lo ven los docentes de Primaria</label><input id="cfVH" value="${escHTML(U[0]||'')}" placeholder="https://…/videos/hacer-primaria.mp4"></div><div class="field" style="margin-bottom:12px"><label>Video del hacer (Cambio Climático) · <b>Bachillerato</b> · lo ven los docentes de Bachillerato</label><input id="cfVHB" value="${escHTML(U[1]||'')}" placeholder="https://…/videos/hacer-bachillerato.mp4"></div>`; })()}
      <div class="field" style="margin-bottom:12px"><label>Video «Cómo llamar asistencia» (directores y codirectores)</label><input id="cfVA" value="${escHTML(c.video_asistencia||'')}" placeholder="https://…"></div>
      <div class="field" style="margin-bottom:12px"><label>Imagen del rompecabezas (opcional: la app ya trae la imagen oficial; pega un enlace solo si quieres cambiarla)</label><input id="cfRI" value="${escHTML(c.rompecabezas_img||'')}" placeholder="https://…/rompecabezas.png"></div>
      <div class="field" style="margin-bottom:12px"><label>Motivos de retardo (uno por línea; deja «Otros» al final para que puedan escribir)</label><textarea id="cfMR" rows="4">${escHTML((c.motivos_retardo||['Trancón','Cita médica','Calamidad doméstica','Otros']).join('\n'))}</textarea></div>
      <div class="field" style="margin-bottom:12px"><label>Motivos de ausencia en las actividades (uno por línea)</label><textarea id="cfMA" rows="3">${escHTML((c.motivos_ausencia||['Se retira por cita médica','Participará en una actividad del STEM Day','Otros']).join('\n'))}</textarea></div>
      <div class="field" style="margin-bottom:12px"><label>Minutos de anticipación por defecto para los avisos</label><select id="cfA">${[5,10,15].map(m=>`<option ${c.anticipacion_min===m?'selected':''}>${m}</option>`).join('')}</select></div>
      <button class="b1" id="cfG">Guardar configuración</button>
      <div class="okbox" style="margin-top:16px"><b>Probar la app como si fuera el día del evento:</b> abre la app con <code>?simular=2026-10-23T08:55</code> al final de la dirección (cambia la hora a tu gusto). Así ves avanzar el avatar y saltar las alertas sin esperar al 23 de octubre.</div>`;
    $('cfG').onclick=async()=>{
      const campos={ fecha_evento:$('cfF').value, video_url:$('cfV').value.trim()||null, video_tutorial_url:$('cfT').value.trim()||null, video_tutorial_docente:$('cfTD').value.trim()||null, video_tutorial_org:$('cfTO').value.trim()||null, anticipacion_min:+$('cfA').value, actualizado_en:new Date().toISOString(),
        video_tutorial_lider:$('cfTL').value.trim()||null, video_hacer:[$('cfVH').value.trim(),$('cfVHB').value.trim()].filter(Boolean).length?(($('cfVH').value.trim()||$('cfVHB').value.trim())+($('cfVHB').value.trim()&&$('cfVH').value.trim()?' | '+$('cfVHB').value.trim():'')):null, video_asistencia:$('cfVA').value.trim()||null, rompecabezas_img:$('cfRI').value.trim()||null,
        motivos_retardo:$('cfMR').value.split('\n').map(x=>x.trim()).filter(Boolean), motivos_ausencia:$('cfMA').value.split('\n').map(x=>x.trim()).filter(Boolean) };
      const { error } = await sb().from('sd_config').update(campos).eq('id',1);
      if(error) return aviso('No se pudo guardar: '+error.message,'bad');
      Object.assign(S().config,campos); aviso('Configuración guardada','ok');
    };
  }


  /* =================== v30 · cuentas, conexiones, mensajes y encuesta final =================== */
  const ROLES=[['docente','Docente'],['lider','Líder de estación'],['master','Master'],['organizador','Organizador'],['secretario','Secretario'],['admin','Administrador']];
  const ROLN=Object.fromEntries(ROLES);
  // v46: «Organizador Master» = organizador que además llama a lista a 10° y 11° (rol organizador + org_lista)
  const ROLES_U=[...ROLES.slice(0,4),['organizador_m','Organizador Master'],...ROLES.slice(4)], ROLN_U=Object.fromEntries(ROLES_U);
  const rolDe=p=>p.rol==='organizador'&&p.org_lista?'organizador_m':p.rol;
  async function todosPerfiles(){ let out=[], cols='id,correo,nombre,rol,org_master,org_lista,confirmado,avatar'; for(let i=0;;i+=1000){ let r=await sb().from('sd_perfiles').select(cols).order('nombre').range(i,i+999); if(r.error&&/org_lista/.test(r.error.message)){ cols=cols.replace(',org_lista',''); r=await sb().from('sd_perfiles').select(cols).order('nombre').range(i,i+999); } if(r.error) throw r.error; out=out.concat(r.data||[]); if(!r.data||r.data.length<1000) break; } return out; }
  let CU={rol:'todos',q:''};
  function cuentasHTML(perf){
    const q=nrm(CU.q), L=perf.filter(p=>(CU.rol==='todos'||(CU.rol==='orgm'?p.org_master:rolDe(p)===CU.rol))&&(!q||nrm(p.nombre+' '+p.correo).includes(q)));
    return `<h4 style="margin:18px 0 6px">Todas las cuentas (${perf.length})</h4>
      <div class="tools"><select id="cuF"><option value="todos">Todos los perfiles</option>${ROLES_U.map(([k,t])=>`<option value="${k}" ${CU.rol===k?'selected':''}>${t}</option>`).join('')}<option value="orgm" ${CU.rol==='orgm'?'selected':''}>Máster Coordinador</option></select>
        <input id="cuQ" placeholder="Buscar por nombre o correo…" value="${escHTML(CU.q)}" style="flex:1;min-width:200px"><span class="sm">Al cambiar el perfil, la app de esa persona se actualiza sola.</span></div>
      <div class="twrap"><table class="t"><tr><th>Nombre</th><th>Correo</th><th>Perfil</th><th>Máster Coord.</th><th>Estado</th><th></th></tr>
      ${L.slice(0,400).map(p=>`<tr data-id="${p.id}"><td><input data-k="nombre" value="${escHTML(p.nombre||'')}"></td><td class="sm">${escHTML(p.correo)}</td>
        <td><select data-k="rol">${ROLES_U.map(([k,t])=>`<option value="${k}" ${rolDe(p)===k?'selected':''}>${t}</option>`).join('')}</select></td>
        <td style="text-align:center"><input type="checkbox" data-k="org" ${p.org_master?'checked':''}></td>
        <td class="sm">${p.confirmado?'✓ Activa':'Sin ingresar'}</td>
        <td style="white-space:nowrap"><button class="b1 sm" data-g>Guardar</button> ${p.rol!=='admin'?'<button class="b2 sm" data-res title="Restablecer la contraseña a 0000">🔑 0000</button> ':''}<button class="b2 sm" data-del title="Eliminar cuenta">🗑</button></td></tr>`).join('')}</table></div>
      ${L.length>400?`<p class="sm">Se muestran 400 de ${L.length}. Usa el buscador.</p>`:''}`;
  }
  function bindCuentas(perf){
    $('cuF').onchange=e=>{ CU.rol=e.target.value; $('cuBox').innerHTML=cuentasHTML(perf); bindCuentas(perf); };
    $('cuQ').oninput=e=>{ CU.q=e.target.value; const v=e.target.value; $('cuBox').innerHTML=cuentasHTML(perf); bindCuentas(perf); const n=$('cuQ'); n.focus(); n.setSelectionRange(v.length,v.length); };
    $('cuBox').querySelectorAll('[data-g]').forEach(b=>b.onclick=async()=>{ const tr=b.closest('tr'), id=tr.dataset.id, p=perf.find(x=>x.id===id);
      const rolU=tr.querySelector('[data-k=rol]').value, rol=rolU==='organizador_m'?'organizador':rolU, lista=rolU==='organizador_m', org=tr.querySelector('[data-k=org]').checked, nombre=tr.querySelector('[data-k=nombre]').value.trim();
      b.disabled=true; let {error}=await sb().rpc('sd_cambiar_perfil',{p_id:id,p_rol:rol,p_org_master:org,p_nombre:nombre});
      if(!error&&(lista||p.org_lista)){ const r2=await sb().rpc('sd_org_lista',{p_id:id,p_valor:lista}); if(r2.error) error={message:/sd_org_lista/.test(r2.error.message)?'falta ejecutar el archivo 24-decimo-undecimo.sql en Supabase':r2.error.message}; }
      b.disabled=false;
      if(error) return aviso('No se pudo cambiar: '+error.message,'bad');
      Object.assign(p,{rol,org_master:org,org_lista:lista,nombre}); aviso(`${nombre}: ${ROLN_U[rolU]}${org?' · Máster Coordinador':''}`,'ok');
      if(rol==='lider'||p.rol==='lider') aplicarLideres().catch(()=>{}); });
    $('cuBox').querySelectorAll('[data-res]').forEach(b=>b.onclick=async()=>{ const tr=b.closest('tr'), p=perf.find(x=>x.id===tr.dataset.id);   // v39
      if(!confirm(`¿Restablecer la contraseña de ${p.nombre} (${p.correo}) a 0000? Al entrar, la app le pedirá crear una nueva.`)) return;
      b.disabled=true; const {error}=await sb().rpc('sd_restablecer_clave',{p_correo:p.correo}); b.disabled=false;
      if(error) return aviso('No se pudo restablecer: '+error.message+(/function|does not exist/i.test(error.message)?' · Ejecuta en Supabase el archivo 15-restablecer-clave.sql':''),'bad');
      p.confirmado=false; aviso(`Contraseña de ${p.nombre} restablecida a 0000`,'ok'); $('cuBox').innerHTML=cuentasHTML(perf); bindCuentas(perf); });
    $('cuBox').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ const tr=b.closest('tr'), id=tr.dataset.id, p=perf.find(x=>x.id===id);
      if(!confirm(`¿Eliminar la cuenta de ${p.nombre} (${p.correo})? Esta acción no se puede deshacer.`)) return;
      const {error}=await sb().rpc('sd_eliminar_usuario',{p_id:id}); if(error) return aviso('No se pudo eliminar: '+error.message,'bad');
      perf.splice(perf.indexOf(p),1); aviso('Cuenta eliminada','ok'); $('cuBox').innerHTML=cuentasHTML(perf); bindCuentas(perf); });
  }

  /* v64 · 🔎 Buscar persona: en línea, si ha entrado, contraseña, avisos, cursos y acciones rápidas */
  let BQ={q:'',f:'todos'};
  async function tBuscar(){
    const [perf, cx, push]=await Promise.all([ todosPerfiles(), (async()=>{ let out=[]; for(let i=0;;i+=1000){ const r=await sb().from('sd_conexiones').select('perfil_id,inicio,ultimo').range(i,i+999); if(r.error) return out; out=out.concat(r.data||[]); if(!r.data||r.data.length<1000) return out; } })(),
      (async()=>{ try{ const r=await sb().from('sd_push').select('perfil_id'); return r.error?null:(r.data||[]); }catch(_){ return null; } })() ]);
    const st={}; cx.forEach(c=>{ const x=st[c.perfil_id]=st[c.perfil_id]||{veces:0,ult:null}; x.veces++; if(!x.ult||c.ultimo>x.ult) x.ult=c.ultimo; });
    const av={}; (push||[]).forEach(x=>av[x.perfil_id]=(av[x.perfil_id]||0)+1);
    const prog=S().prog.filter(r=>r.tipo==='actividad'), nn=t=>SteamExcel.norm(t||'');
    const cursosDe=p=>{ const k=p.nombre_n||nn(p.nombre); const d=new Set(), c=new Set(); prog.forEach(r=>{ if(r.acompanante_n===k||nn(r.acompanante)===k) d.add(r.curso); if(r.apoyo_n===k||nn(r.apoyo)===k) c.add(r.curso); });
      return [...[...d].map(x=>'Director '+x), ...[...c].map(x=>'Codirector '+x)].concat((p.cursos_manual||[]).length&&!d.size&&!c.size?['Curso '+p.cursos_manual.join(', ')]:[]); };
    const hace=iso=>{ if(!iso) return ''; const m=Math.round((Date.now()-new Date(iso).getTime())/60000); if(m<1) return 'hace un momento'; if(m<60) return `hace ${m} min`; const h=Math.round(m/60); if(h<24) return `hace ${h} h`; return new Date(iso).toLocaleString('es-CO',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}); };
    const pinta=()=>{ const on=window.enLineaAhora?window.enLineaAhora():{}, q=nn(BQ.q);
      const est=p=>on[p.id]?'linea':!st[p.id]&&!p.confirmado?'nunca':!p.confirmado?'clave':'ok';
      const cnt={linea:0,nunca:0,clave:0,ok:0}; perf.forEach(p=>cnt[est(p)]++);
      const L=perf.filter(p=>(BQ.f==='todos'||est(p)===BQ.f||(BQ.f==='sinavisos'&&push&&!av[p.id]))&&(!q||q.split(' ').every(t=>nn(p.nombre+' '+p.correo+' '+(ROLN[p.rol]||p.rol)+' '+cursosDe(p).join(' ')).includes(t))))
        .sort((a,b)=>(!!on[b.id]-!!on[a.id])||String(a.nombre).localeCompare(b.nombre,'es'));
      $('admTab').innerHTML=`<input class="bqin" id="bqQ" placeholder="🔎 Nombre, correo, curso o perfil…" value="${escHTML(BQ.q)}" autocomplete="off">
        <div class="bqf">${[['todos','Todos',perf.length],['linea','🟢 En línea',cnt.linea],['nunca','⚠ Nunca han entrado',cnt.nunca],['clave','🔑 Con clave temporal',cnt.clave]].concat(push?[['sinavisos','🔕 Sin avisos',perf.filter(p=>!av[p.id]).length]]:[]).map(([k,t,n])=>`<span data-f="${k}" class="${BQ.f===k?'on':''}">${t} <b>${n}</b></span>`).join('')}</div>
        <p class="sm">${L.length} persona${L.length===1?'':'s'}${L.length>80?' · se muestran las primeras 80; escribe para filtrar':''}</p>
        ${L.slice(0,80).map(p=>{ const e=est(p), x=st[p.id], cs=cursosDe(p);
          return `<div class="bqc"><div class="bqh"><b>${escHTML(p.nombre)}</b><span class="bqe ${e}">${e==='linea'?'🟢 En línea':e==='nunca'?'⚠ Nunca ha entrado':e==='clave'?'🔑 Clave temporal':'✓ Activa'}</span></div>
            <div class="bqd">${escHTML(ROLN[p.rol]||p.rol)}${p.org_master?' · Máster Coordinador':''}${p.org_lista?' · Organizador Master':''}${cs.length?' · '+escHTML(cs.join(' · ')):''}</div>
            <div class="bqd sm">${escHTML(p.correo)}</div>
            <div class="bqd sm">${x?`Última conexión ${hace(x.ult)} · ${x.veces} ingreso${x.veces>1?'s':''}`:'Sin conexiones registradas'}${push?` · ${av[p.id]?'🔔 avisos activos ('+av[p.id]+')':'🔕 sin avisos en el celular'}`:''}${!p.confirmado?' · aún no cambia la contraseña 0000':''}</div>
            <div class="bqa"><button class="b2" data-rc="${escHTML(p.correo)}">🔑 Restablecer a 0000</button><button class="b2" data-cp="${escHTML(p.correo)}">📋 Copiar correo</button></div></div>`; }).join('')}`;
      const inp=$('bqQ'); inp.oninput=()=>{ BQ.q=inp.value; const pos=inp.selectionStart; pinta(); const n=$('bqQ'); n.focus(); n.setSelectionRange(pos,pos); };
      $('admTab').querySelectorAll('[data-f]').forEach(x=>x.onclick=()=>{ BQ.f=x.dataset.f; pinta(); });
      $('admTab').querySelectorAll('[data-rc]').forEach(b=>b.onclick=async()=>{ if(!confirm(`¿Restablecer la contraseña de ${b.dataset.rc} a 0000? Al entrar, la app le pedirá crear una nueva.`)) return;
        const { error }=await sb().rpc('sd_restablecer_clave',{p_correo:b.dataset.rc}); if(error) return aviso('No se pudo restablecer: '+error.message,'bad'); aviso('Contraseña restablecida a 0000 ✓','ok'); });
      $('admTab').querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>{ try{ navigator.clipboard.writeText(b.dataset.cp); aviso('Correo copiado','ok'); }catch(_){ prompt('Correo:',b.dataset.cp); } });
    };
    pinta(); window.adminPresenciaB=()=>{ if(tab==='buscar'&&$('bqQ')&&document.activeElement!==$('bqQ')) pinta(); };
  }
  /* v64 · 👥 Turnos: qué cursos ya organizaron su día (director y codirector) */
  let TQ={f:'todos',q:''};
  async function tTurnos(){
    if(typeof turCargar!=='function'||typeof turBloques!=='function') { $('admTab').innerHTML='<div class="warnbox">Recarga la app para ver los turnos.</div>'; return; }
    try{ await turCargar(); }catch(_){}
    const cursos=[...new Set(S().prog.filter(r=>r.tipo==='actividad'&&r.curso&&/^\d/.test(r.curso)).map(r=>r.curso))].sort((x,y)=>x.localeCompare(y,'es',{numeric:true}));
    const F=cursos.map(c=>{ const B=turBloques(c), P=turPersonas(c); let ok=0,pe=0,sd=0; B.forEach(s=>{ const t=TUR.m[turK(c,s.h)]; t?(t.confirmado?ok++:pe++):sd++; });
      return {c,P,n:B.length,ok,pe,sd,e:ok===B.length&&B.length?'listo':(ok||pe)?'parcial':'nada'}; });
    const k={listo:F.filter(x=>x.e==='listo').length,parcial:F.filter(x=>x.e==='parcial').length,nada:F.filter(x=>x.e==='nada').length};
    const pinta=()=>{ const q=SteamExcel.norm(TQ.q), L=F.filter(x=>(TQ.f==='todos'||x.e===TQ.f)&&(!q||SteamExcel.norm(`${x.c} ${x.P.D} ${x.P.C}`).includes(q)));
      $('admTab').innerHTML=`<div class="stat"><div><b style="color:#1f9d6b">${k.listo}</b><span>cursos con el día organizado</span></div><div><b style="color:#b07a00">${k.parcial}</b><span>organizándolo</span></div><div><b style="color:#8a94a8">${k.nada}</b><span>sin empezar</span></div><div><b>${F.length?Math.round(k.listo/F.length*100):0}%</b><span>avance</span></div></div>
        ${TUR.cargado?'':'<div class="warnbox">Los turnos aún no están activos (falta el archivo 18 en Supabase).</div>'}
        <input class="bqin" id="tqQ" placeholder="🔎 Curso o docente…" value="${escHTML(TQ.q)}" autocomplete="off">
        <div class="bqf">${[['todos','Todos',F.length],['nada','⚪ Sin empezar',k.nada],['parcial','🟡 Organizándolo',k.parcial],['listo','🟢 Listos',k.listo]].map(([x,t,n])=>`<span data-f="${x}" class="${TQ.f===x?'on':''}">${t} <b>${n}</b></span>`).join('')}</div>
        ${L.map(x=>`<div class="bqc tq ${x.e}"><div class="bqh"><b>${escHTML(x.c)}</b><span class="bqe ${x.e==='listo'?'ok':x.e==='parcial'?'clave':'nunca'}">${x.e==='listo'?'🟢 Día organizado':x.e==='parcial'?'🟡 Organizándolo':'⚪ Sin empezar'}</span></div>
          <div class="bqd">D: <b>${escHTML(x.P.D||'—')}</b><br>C: <b>${escHTML(x.P.C||'—')}</b></div>
          <div class="tqbar"><i style="width:${x.n?x.ok/x.n*100:0}%"></i><i class="pe" style="width:${x.n?x.pe/x.n*100:0}%"></i></div>
          <div class="bqd sm">${x.ok} de ${x.n} bloques acordados${x.pe?` · ${x.pe} por confirmar`:''}${x.sd?` · ${x.sd} sin definir`:''}</div></div>`).join('')}`;
      const inp=$('tqQ'); inp.oninput=()=>{ TQ.q=inp.value; const pos=inp.selectionStart; pinta(); const n=$('tqQ'); n.focus(); n.setSelectionRange(pos,pos); };
      $('admTab').querySelectorAll('[data-f]').forEach(x=>x.onclick=()=>{ TQ.f=x.dataset.f; pinta(); }); };
    pinta();
  }
  /* conexiones: en línea ahora (presencia) + cuántas veces y cuánto tiempo */
  async function tConexiones(){
    const [perf, cx]=await Promise.all([ todosPerfiles(), (async()=>{ let out=[]; for(let i=0;;i+=1000){ const r=await sb().from('sd_conexiones').select('*').range(i,i+999); if(r.error) throw new Error(r.error.message+' (¿ejecutaste el SQL 16?)'); out=out.concat(r.data||[]); if(!r.data||r.data.length<1000) break; } return out; })() ]);
    const st={}; cx.forEach(c=>{ const x=st[c.perfil_id]=st[c.perfil_id]||{veces:0,min:0,ult:null}; x.veces++; x.min+=Math.max(1,Math.round((new Date(c.ultimo)-new Date(c.inicio))/60000)); if(!x.ult||c.ultimo>x.ult) x.ult=c.ultimo; });
    const pinta=()=>{ const on=window.enLineaAhora?window.enLineaAhora():{}, enl=new Set(Object.keys(on));
      const grp=[...ROLES.filter(r=>r[0]!=='admin'),['orgm','Máster Coordinador']].map(([k,t])=>{ const ps=perf.filter(p=>k==='orgm'?p.org_master:p.rol===k); return {k,t,n:ps.length,con:ps.filter(p=>st[p.id]).length,on:ps.filter(p=>enl.has(p.id)).length}; }).filter(g=>g.n);
      const f=CX.rol, L=perf.filter(p=>f==='todos'||(f==='orgm'?p.org_master:p.rol===f)).filter(p=>CX.ver==='nunca'?!st[p.id]:CX.ver==='linea'?enl.has(p.id):true);
      const fm=m=>m>=60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min';
      $('admTab').innerHTML=`<div class="stat"><div><b>${enl.size}</b><span>🟢 en línea ahora</span></div><div><b>${perf.filter(p=>st[p.id]).length}</b><span>se han conectado</span></div><div><b>${perf.filter(p=>!st[p.id]).length}</b><span>aún no se conectan</span></div><div><b>${cx.length}</b><span>conexiones en total</span></div></div>
        <div class="twrap"><table class="t"><tr><th>Perfil</th><th>Cuentas</th><th>🟢 En línea</th><th>Se han conectado</th><th>Aún no</th></tr>${grp.map(g=>`<tr><td><b>${g.t}</b></td><td>${g.n}</td><td>${g.on}</td><td>${g.con}</td><td>${g.n-g.con}</td></tr>`).join('')}</table></div>
        <div class="tools" style="margin-top:12px"><select id="cxR"><option value="todos">Todos</option>${[...ROLES,['orgm','Máster Coordinador']].map(([k,t])=>`<option value="${k}" ${CX.rol===k?'selected':''}>${t}</option>`).join('')}</select>
          <select id="cxV"><option value="todos">Todas las personas</option><option value="linea" ${CX.ver==='linea'?'selected':''}>Solo en línea ahora</option><option value="nunca" ${CX.ver==='nunca'?'selected':''}>Solo los que aún no se conectan</option></select>
          <button class="b2" id="cxX">⬇ Excel</button><span class="sm">«En línea» se actualiza solo. Las conexiones cuentan desde la versión 30.</span></div>
        <div class="twrap"><table class="t"><tr><th></th><th>Nombre</th><th>Perfil</th><th>Veces</th><th>Tiempo conectado</th><th>Última conexión</th></tr>
        ${L.sort((a,b)=>(enl.has(b.id)-enl.has(a.id))||((st[b.id]||{}).veces||0)-((st[a.id]||{}).veces||0)).slice(0,500).map(p=>{ const x=st[p.id]; return `<tr><td>${enl.has(p.id)?'🟢':x?'⚪':'—'}</td><td>${escHTML(p.nombre)}</td><td class="sm">${ROLN[p.rol]||p.rol}${p.org_master?' · Máster Coord.':''}</td><td>${x?x.veces:0}</td><td>${x?fm(x.min):'—'}</td><td class="sm">${x?new Date(x.ult).toLocaleString('es-CO',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'Nunca'}</td></tr>`; }).join('')}</table></div>`;
      $('cxR').onchange=e=>{ CX.rol=e.target.value; pinta(); }; $('cxV').onchange=e=>{ CX.ver=e.target.value; pinta(); };
      $('cxX').onclick=async()=>{ await cargarXLSX(); const ws=XLSX.utils.json_to_sheet(perf.map(p=>{ const x=st[p.id]; return {Nombre:p.nombre,Correo:p.correo,Perfil:ROLN[p.rol]||p.rol,'Máster Coord.':p.org_master?'Sí':'','En línea ahora':enl.has(p.id)?'Sí':'',Veces:x?x.veces:0,'Minutos conectado':x?x.min:0,'Última conexión':x?new Date(x.ult).toLocaleString('es-CO'):'Nunca'}; })); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Conexiones'); XLSX.writeFile(wb,'conexiones-stem-day.xlsx'); };
    };
    window.adminPresencia=()=>{ if(tab==='conexiones'&&$('cxR')) pinta(); if(window.adminPresenciaB) adminPresenciaB(); };
    pinta();
  }
  let CX={rol:'todos',ver:'todos'};

  /* mensajes emergentes: a una persona, a un grupo de personas, a perfiles o a todos */
  async function tMensajes(){
    const [perf, ms, vs]=await Promise.all([ todosPerfiles(), sb().from('sd_mensajes').select('*').order('id',{ascending:false}).limit(60), sb().from('sd_mensajes_vistos').select('mensaje_id') ]);
    if(ms.error) throw new Error(ms.error.message+' (¿ejecutaste el SQL 16?)');
    const vistos={}; (vs.data||[]).forEach(v=>vistos[v.mensaje_id]=(vistos[v.mensaje_id]||0)+1);
    const sel=new Set(); let dest='todos';
    const nivDoc=(()=>{ const M={}; S().prog.filter(r=>r.tipo==='actividad').forEach(r=>[r.acompanante,r.apoyo].forEach(n=>{ if(n) M[nrm(n)]=r.nivel; })); return p=>M[nrm(p.nombre)]||''; })();   // v43
    const alcance=m=>m.destino==='todos'?perf.length:m.destino==='roles'?perf.filter(p=>m.roles.includes(p.rol)||(m.roles.includes('orgmaster')&&p.org_master)||(p.rol==='docente'&&((m.roles.includes('doc_pri')&&nivDoc(p)==='Primaria')||(m.roles.includes('doc_bach')&&nivDoc(p)==='Bachillerato')))).length:m.personas.length;
    const txtDest=m=>m.destino==='todos'?'Todos':m.destino==='roles'?m.roles.map(r=>r==='orgmaster'?'Máster Coordinador':r==='doc_pri'?'Docentes de Primaria':r==='doc_bach'?'Docentes de Bachillerato':ROLN[r]||r).join(', '):m.personas.map(id=>(perf.find(p=>p.id===id)||{}).nombre||'—').join(', ');
    $('admTab').innerHTML=`<div class="okbox"><b>El mensaje aparece en el centro de la pantalla</b> la próxima vez que la persona abra la app (o de inmediato si la tiene abierta). Puedes adjuntar un video (por ejemplo, una actualización).</div>
      <div class="field" style="margin:10px 0"><label>Título</label><input id="msT" maxlength="120" placeholder="Ej.: Cambio de salón para 5B"></div>
      <div class="field" style="margin-bottom:10px"><label>Mensaje</label><textarea id="msX" rows="4" maxlength="2000" placeholder="Escribe el mensaje…"></textarea></div>
      <div class="field" style="margin-bottom:10px"><label>Video (opcional: enlace de YouTube, Drive o .mp4)</label><input id="msV" placeholder="https://…"></div>
      <div class="segs wrap" id="msD"><span data-d="todos" class="on">🌎 Todos</span><span data-d="roles">👥 Perfiles</span><span data-d="personas">👤 Personas</span></div>
      <div id="msOpc"></div>
      <div class="tools" style="margin-top:10px"><button class="b1" id="msE">Enviar mensaje</button><span class="sm" id="msA"></span></div>
      <h4 style="margin:18px 0 6px">Mensajes enviados</h4>
      <div class="twrap"><table class="t"><tr><th>Fecha</th><th>Título</th><th>Para</th><th>Vistos</th><th></th></tr>${(ms.data||[]).map(m=>`<tr><td class="sm">${new Date(m.creado_en).toLocaleString('es-CO',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</td><td><b>${escHTML(m.titulo)}</b><br><span class="sm">${escHTML(m.texto.slice(0,90))}${m.video?' · 🎬':''}</span></td><td class="sm">${escHTML(txtDest(m).slice(0,120))}</td><td>${vistos[m.id]||0} / ${alcance(m)}</td><td><button class="b2 sm" data-x="${m.id}">🗑</button></td></tr>`).join('')||'<tr><td colspan="5" class="sm">Aún no hay mensajes.</td></tr>'}</table></div>`;
    const opc=()=>{ const o=$('msOpc');
      if(dest==='todos') o.innerHTML=`<p class="sm">Lo verán las ${perf.length} cuentas.</p>`;
      if(dest==='roles') o.innerHTML=`<div class="row" style="display:flex;gap:10px;flex-wrap:wrap;margin:6px 0">${[['doc_pri','📗 Docentes de Primaria'],['doc_bach','📘 Docentes de Bachillerato'],...ROLES.filter(r=>r[0]!=='admin'),['orgmaster','Máster Coordinador']].map(([k,t])=>`<label><input type="checkbox" data-r="${k}"> ${t}</label>`).join('')}</div>`;
      if(dest==='personas'){ const pinta=q=>{ q=nrm(q||''); const L=perf.filter(p=>!q||nrm(p.nombre+' '+p.correo).includes(q)).slice(0,60);
          o.innerHTML=`<div class="asel">${[...sel].map(id=>`<span class="lch on" data-q="${id}">✕ ${escHTML((perf.find(p=>p.id===id)||{}).nombre||'')}</span>`).join('')||'<span class="pend">Nadie seleccionado</span>'}</div>
          <input id="msB" placeholder="Buscar persona…" value="${escHTML(q)}" style="width:100%;margin:6px 0"><div class="alist" style="max-height:260px;overflow:auto">${L.map(p=>`<label style="display:block"><input type="checkbox" data-p="${p.id}" ${sel.has(p.id)?'checked':''}> ${escHTML(p.nombre)} <small>${ROLN[p.rol]||''}</small></label>`).join('')}</div>`;
          const b=$('msB'); b.oninput=()=>{ const v=b.value; pinta(v); const n=$('msB'); n.focus(); n.setSelectionRange(v.length,v.length); };
          o.querySelectorAll('[data-p]').forEach(c=>c.onchange=()=>{ c.checked?sel.add(c.dataset.p):sel.delete(c.dataset.p); pinta($('msB').value); });
          o.querySelectorAll('.asel [data-q]').forEach(c=>c.onclick=()=>{ sel.delete(c.dataset.q); pinta($('msB').value); }); }; pinta(''); } };
    $('msD').querySelectorAll('span').forEach(e=>e.onclick=()=>{ dest=e.dataset.d; $('msD').querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===e)); opc(); }); opc();
    $('msE').onclick=async()=>{ const t=$('msT').value.trim(), x=$('msX').value.trim(); if(!t||!x) return aviso('Escribe el título y el mensaje.','bad');
      const roles=[...document.querySelectorAll('#msOpc [data-r]:checked')].map(c=>c.dataset.r);
      if(dest==='roles'&&!roles.length) return aviso('Elige al menos un perfil.','bad'); if(dest==='personas'&&!sel.size) return aviso('Elige al menos una persona.','bad');
      if(window.avisarYa) setTimeout(avisarYa,800); const {error}=await sb().from('sd_mensajes').insert({titulo:t,texto:x,video:$('msV').value.trim()||null,destino:dest,roles:dest==='roles'?roles:[],personas:dest==='personas'?[...sel]:[],creado_por:S().perfil.id});
      if(error) return aviso('No se pudo enviar: '+error.message,'bad'); aviso('Mensaje enviado','ok'); tMensajes(); };
    $('admTab').querySelectorAll('[data-x]').forEach(b=>b.onclick=async()=>{ if(!confirm('¿Borrar este mensaje? Ya no le aparecerá a quien no lo haya visto.')) return; await sb().from('sd_mensajes').delete().eq('id',+b.dataset.x); tMensajes(); });
  }

  /* encuesta final de la jornada */
  async function tFinal(){
    const r=await sb().from('sd_encuesta_final').select('*').order('curso'); if(r.error) throw new Error(r.error.message+' (¿ejecutaste el SQL 16?)');
    const E=r.data||[], cursos=[...new Set(S().prog.filter(x=>x.tipo==='actividad').map(x=>x.curso))];
    const prom=k=>{ const v=E.map(x=>+x.respuestas[k]).filter(v=>v>0); return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1).replace('.',','):'—'; };
    const PREG=(typeof ENC_FIN_DOC!=='undefined'?ENC_FIN_DOC:[]).concat(typeof ENC_FIN_GRUPO!=='undefined'?ENC_FIN_GRUPO:[]);
    $('admTab').innerHTML=`<div class="stat"><div><b>${E.length} / ${cursos.length}</b><span>cursos respondieron</span></div><div><b>${prom('general')}</b><span>jornada en general (de 5)</span></div><div><b>${prom('organizacion')}</b><span>organización (de 5)</span></div><div><b>${prom('app')}</b><span>utilidad de la app (de 5)</span></div></div>
      <div class="tools"><button class="b1" id="efX">⬇ Descargar Excel</button><span class="sm">Se envía a los docentes 20 minutos antes de terminar el último espacio.</span></div>
      ${E.map(e=>`<details class="dcard"><summary><b>${escHTML(e.curso)}</b> · ${escHTML(e.docente||'')} · ★ ${e.respuestas.general||'—'}</summary>${PREG.map(q=>`<p><small>${escHTML(q.t)}</small><br>${escHTML(String(e.respuestas[q.k]??'—'))}</p>`).join('')}</details>`).join('')||'<p class="sm">Aún no hay respuestas.</p>'}`;
    $('efX').onclick=async()=>{ await cargarXLSX(); const ws=XLSX.utils.json_to_sheet(E.map(e=>Object.assign({Curso:e.curso,Docente:e.docente,Fecha:new Date(e.actualizado_en).toLocaleString('es-CO')},Object.fromEntries(PREG.map(q=>[q.t,e.respuestas[q.k]??'']))))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Encuesta final'); XLSX.writeFile(wb,'encuesta-final-stem-day.xlsx'); };
  }

  /* =================== v28 · Líderes de estación =================== */
  const nrm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const actKey=r=>nrm(r.titulo||r.area);
  const salKey=s0=>nrm(s0).replace(/[^a-z0-9]/g,'');
  const lev=(a,b)=>{ if(Math.abs(a.length-b.length)>1) return 9; const d=Array.from({length:a.length+1},(_,i)=>[i]); for(let j=1;j<=b.length;j++) d[0][j]=j;
    for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[a.length][b.length]; };
  function buscarPersona(nombre,dir){ const tk=nrm(nombre).replace(/[^a-z ]/g,' ').split(' ').filter(t=>t.length>1); if(!tk.length) return null;
    const ok=d=>{ const dt=nrm(d.nombre).replace(/[^a-z ]/g,' ').split(' '); return tk.every(t=>dt.some(x=>x===t||(t.length>4&&lev(x,t)<=1))); };
    const c=dir.filter(ok); if(c.length>1){ const cc=c.filter(x=>x.cuenta); if(cc.length===1) return cc[0]; } return c.length===1?c[0]:null; }
  /* v30: «Docente a cargo» puede traer varias personas sin separador («Eliana Cadena Stefany Pardo Karolhay Olmos»),
     con comas, guiones o «y». Se reconocen contra el directorio de a 4, 3 o 2 palabras. */
  function separarPersonas(txt,dir){
    const out=[];
    String(txt||'').split(/\s*(?:[-,;\/]|\sy\s)\s*/i).map(x=>x.trim()).filter(Boolean).forEach(ch=>{
      const d0=buscarPersona(ch,dir); if(d0){ out.push({d:d0,t:ch}); return; }
      const w=ch.split(/\s+/); let i=0, suelto=[];
      while(i<w.length){ let hit=null,len=0;
        for(const L of [4,3,2]){ if(i+L>w.length) continue; const d=buscarPersona(w.slice(i,i+L).join(' '),dir); if(d){ hit=d; len=L; break; } }
        if(hit){ if(suelto.length){ out.push({d:null,t:suelto.join(' ')}); suelto=[]; } out.push({d:hit,t:w.slice(i,i+len).join(' ')}); i+=len; }
        else { suelto.push(w[i]); i++; } }
      if(suelto.length) out.push({d:null,t:suelto.join(' ')});
    });
    return out;
  }
  window.separarPersonas=separarPersonas;
  let LD=null; const LDX=new Set();   // datos para la pestaña: directorio, perfiles, manuales · actividades desplegadas
  async function datosLideres(forzar){
    if(LD&&!forzar) return LD;
    const [d,p,m]=await Promise.all([ sb().from('sd_directorio').select('*'), sb().from('sd_perfiles').select('id,correo,nombre,rol,confirmado,avatar'), sb().from('sd_lideres').select('*').order('id') ]);
    if(m.error) throw new Error('Falta ejecutar el archivo 14-lideres-y-agenda.sql en Supabase ('+m.error.message+')');
    // v30: una sola entrada por persona (gana la corregida a mano o la que ya tiene cuenta)
    const conCuenta=new Set((p.data||[]).map(x=>String(x.correo).toLowerCase())), porNom=new Map();
    (d.data||[]).forEach(x=>{ const k=nrm(x.nombre), y=porNom.get(k), pesa=z=>(z.manual?2:0)+(conCuenta.has(String(z.correo).toLowerCase())?1:0); if(!y||pesa(x)>pesa(y)) porNom.set(k,x); });
    const dir=[...porNom.values()].map(x=>({...x,cuenta:conCuenta.has(String(x.correo).toLowerCase())})), ya=new Set(dir.map(x=>String(x.correo).toLowerCase()));
    (p.data||[]).forEach(x=>{ const c=String(x.correo).toLowerCase(); if(ya.has(c)||x.rol==='organizador') return;
      const mismo=dir.find(y=>nrm(y.nombre)===nrm(x.nombre)); if(mismo){ mismo.correo=c; mismo.cuenta=true; } else dir.push({correo:c,nombre:x.nombre,cuenta:true}); ya.add(c); });   // v30: también las cuentas creadas a mano y el administrador
    LD={dir, perf:p.data||[], man:m.data||[]}; return LD;
  }
  /* quién dirige cada fila: asignación manual (gana) o la columna «Docente a cargo» del Excel */
  function calcularLideres(D){
    const porCorreo=new Map(D.perf.map(p=>[String(p.correo).toLowerCase(),p]));
    const res=new Map();
    S().prog.filter(r=>r.tipo==='actividad').forEach(r=>{
      const ak=actKey(r), sk=salKey(r.salon);
      let man=D.man.filter(x=>x.actividad===ak&&x.salon===sk); if(!man.length) man=D.man.filter(x=>x.actividad===ak&&x.salon==='*');
      let personas=[], pend=[], fuente='';
      if(man.length){ fuente='manual'; personas=man.map(x=>({correo:x.correo.toLowerCase(),nombre:x.nombre})); }
      else { const dc=String(r.docente_cargo||'').trim();
        if(dc&&!/director de curso|docentes del/i.test(dc)){ fuente='excel';
          separarPersonas(dc,D.dir).forEach(x=>{ if(x.d){ if(!personas.some(p=>p.correo===x.d.correo.toLowerCase())) personas.push({correo:x.d.correo.toLowerCase(),nombre:x.d.nombre}); } else pend.push(x.t); }); }
        else if(/docentes del/i.test(dc)) pend.push(dc); }
      const ids=[]; personas.forEach(x=>{ const p=porCorreo.get(x.correo); x.perfil=p||null; if(p&&(p.rol==='lider'||p.rol==='admin')) ids.push(p.id); });   // v30: el administrador también puede liderar (Huracán)
      res.set(r.id,{r,ak,sk,fuente,personas,pend,ids});
    });
    return res;
  }
  async function aplicarLideres(){
    const D=await datosLideres(true), R=calcularLideres(D);
    const pay=[...R.values()].map(x=>({id:x.r.id,lideres:x.ids}));
    const {data,error}=await sb().rpc('sd_set_lideres',{p:pay}); if(error) throw error;
    R.forEach(x=>{ x.r.lideres=x.ids; });
    if(window.recargarDatos){ try{ await window.recargarDatos(); }catch(e){} }
    return data;
  }
  window.aplicarLideres=aplicarLideres;
  async function crearCuentasFaltantes(){
    const D=await datosLideres(true), R=calcularLideres(D), lista=new Map(), porCorreo=new Map(D.perf.map(p=>[String(p.correo).toLowerCase(),p]));
    R.forEach(x=>x.personas.forEach(pp=>{ const p=porCorreo.get(pp.correo); if(!p||p.rol==='docente') lista.set(pp.correo,{nombre:pp.nombre,correo:pp.correo,rol:'lider'}); }));
    const prog=S().prog, nombres=new Map(); prog.filter(r=>r.tipo==='actividad').forEach(r=>[r.acompanante,r.apoyo].forEach(n=>{ if(n) nombres.set(SteamExcel.norm(n),n); }));
    const dirN=(D.dir||[]).map(d=>({...d,n:SteamExcel.norm(d.nombre)}));
    nombres.forEach((n,k)=>{ const d=dirN.find(x=>x.n===k)||dirN.find(x=>x.n.startsWith(k)); if(!d) return; const c=d.correo.toLowerCase(); if(!porCorreo.has(c)&&!lista.has(c)) lista.set(c,{nombre:d.nombre.replace(/\s+\d.*$|\s+TR°.*$/,''),correo:c,rol:'docente'}); });
    if(!lista.size){ aviso('Todas las personas ya tienen cuenta.','ok'); return; }
    const {data,error}=await sb().rpc('sd_crear_cuentas',{p_lista:[...lista.values()]}); if(error) throw error;
    const n=await aplicarLideres();
    aviso(`Cuentas creadas: ${data.creadas} · pasaron a líder: ${data.roles}. Contraseña temporal: 0000.`,'ok');
    return data;
  }
  async function tLideres(){
    const D=await datosLideres(true), R=calcularLideres(D), porCorreo=new Map(D.perf.map(p=>[String(p.correo).toLowerCase(),p]));
    const G={}; R.forEach(x=>{ const g=(G[x.ak]=G[x.ak]||{r:x.r,lugares:{}}); const l=(g.lugares[x.sk]=g.lugares[x.sk]||{salon:x.r.salon||'—',filas:[],x}); l.filas.push(x); });
    const gente=new Map(); R.forEach(x=>x.personas.forEach(p=>gente.set(p.correo,p)));
    const sinCuenta=[...gente.values()].filter(p=>!porCorreo.get(p.correo)), aConv=[...gente.values()].filter(p=>{ const q=porCorreo.get(p.correo); return q&&q.rol==='docente'; });
    const lugares=Object.values(G).reduce((n,g)=>n+Object.keys(g.lugares).length,0), conL=Object.values(G).reduce((n,g)=>n+Object.values(g.lugares).filter(l=>l.filas.some(f=>f.personas.length)).length,0);
    const chip=p=>{ const q=porCorreo.get(p.correo); const st=!q?'<i class="pend">sin cuenta</i>':q.rol==='docente'?'<i class="pend">cuenta de docente</i>':q.rol!=='lider'?`<i class="pend">${escHTML(q.rol)}</i>`:'';
      return `<span class="lch">${escHTML(p.nombre)} ${st}</span>`; };
    let h=`<div class="stat"><div><b>${conL} / ${lugares}</b><span>lugares con líder</span></div><div><b>${gente.size}</b><span>líderes</span></div><div><b>${sinCuenta.length}</b><span>sin cuenta</span></div><div><b>${aConv.length}</b><span>con cuenta de docente</span></div></div>
      <div class="tools"><button class="b1" id="lCrear" ${sinCuenta.length+aConv.length?'':'disabled'}>⭐ Crear cuentas faltantes (${sinCuenta.length+aConv.length})</button><button class="b2" id="lAplicar">Actualizar la app</button>
      <span class="sm">Los líderes salen de la columna «Docente a cargo» del Excel. Lo que asignes aquí a mano <b>gana</b> sobre el Excel y <b>no se borra</b> al volver a cargarlo.</span></div>`;
    Object.entries(G).sort((a,b)=>String(a[1].r.titulo||a[1].r.area).localeCompare(b[1].r.titulo||b[1].r.area,'es')).forEach(([ak,g])=>{
      const col=AREA_C[g.r.categoria]||AREA_C.gen;
      const LUG=Object.entries(g.lugares), muchos=LUG.length>6, abierto=LDX.has(ak);
      h+=`<div class="lgrp" style="--c:${col}"><h4>${escHTML(g.r.titulo?titA(g.r.titulo):g.r.area)} <small>${escHTML(g.r.area||'')} · ${LUG.length} lugar${LUG.length>1?'es':''}</small></h4>`;
      if(muchos){ const conL=LUG.filter(([,l])=>l.filas.some(f=>f.personas.length)).length;
        h+=`<div class="lrow2"><div class="lsal"><b>Todos los lugares</b><small>${LUG.length} lugares · ${conL} con líder</small></div><div class="lppl"><span class="sm">${conL?'':'Sin líder en ningún lugar. '}Puedes asignar líderes a todos a la vez o abrir la lista.</span></div>
          <div class="lbtn"><button class="b2" data-asig="${escHTML(ak)}|*">Asignar a todos</button><button class="b2" data-ver="${escHTML(ak)}">${abierto?'Ocultar':'Ver'} lugares</button></div></div>`; }
      LUG.forEach(([sk,l])=>{ if(muchos&&!abierto) return; const x=l.x, per=new Map(); l.filas.forEach(f=>f.personas.forEach(p=>per.set(p.correo,p))); const pend=[...new Set(l.filas.flatMap(f=>f.pend))];
        const man=l.filas.some(f=>f.fuente==='manual');
        h+=`<div class="lrow2"><div class="lsal"><b>${escHTML(l.salon)}</b><small>${l.filas.length} grupo${l.filas.length>1?'s':''}</small></div>
          <div class="lppl">${[...per.values()].map(chip).join('')||'<span class="pend">Sin líder</span>'}${pend.length?`<span class="lpend">Excel: ${escHTML(pend.join(', '))}${pend.some(p=>/docentes del/i.test(p))?'':' (no está en el directorio)'}</span>`:''}${man?'<span class="lman">✋ asignado a mano</span>':''}</div>
          <div class="lbtn"><button class="b2" data-asig="${escHTML(ak)}|${escHTML(sk)}">Asignar</button>${man?`<button class="b2" data-ex="${escHTML(ak)}|${escHTML(sk)}" title="Quitar la asignación manual">Volver al Excel</button>`:''}</div></div>`; });
      h+='</div>'; });
    $('admTab').innerHTML=h;
    $('lCrear').onclick=async()=>{ $('lCrear').disabled=true; $('lCrear').textContent='Creando cuentas…'; try{ await crearCuentasFaltantes(); }catch(e){ aviso('No se pudieron crear: '+e.message,'bad'); } tLideres(); };
    $('lAplicar').onclick=async()=>{ $('lAplicar').disabled=true; try{ const n=await aplicarLideres(); aviso(`App actualizada (${n} filas con cambios)`,'ok'); }catch(e){ aviso('Error: '+e.message,'bad'); } tLideres(); };
    $('admTab').querySelectorAll('[data-ex]').forEach(b=>b.onclick=async()=>{ const [ak,sk]=b.dataset.ex.split('|');
      const ids=D.man.filter(x=>x.actividad===ak&&(x.salon===sk||x.salon==='*')).map(x=>x.id); if(!ids.length) return;
      if(!confirm('¿Quitar la asignación manual y volver a lo que dice el Excel?')) return;
      const {error}=await sb().from('sd_lideres').delete().in('id',ids); if(error) return aviso(error.message,'bad'); await aplicarLideres(); tLideres(); });
    $('admTab').querySelectorAll('[data-ver]').forEach(b=>b.onclick=()=>{ const k=b.dataset.ver; LDX.has(k)?LDX.delete(k):LDX.add(k); tLideres(); });
    $('admTab').querySelectorAll('[data-asig]').forEach(b=>b.onclick=()=>{ const [ak,sk]=b.dataset.asig.split('|'); asignarModal(ak,sk,G[ak],D,R); });
  }
  function asignarModal(ak,sk,g,D,R){
    const todosSk=sk==='*', l=todosSk?{salon:'todos los lugares',filas:Object.values(g.lugares).flatMap(x=>x.filas)}:g.lugares[sk], actuales=new Map(); if(!todosSk) l.filas.forEach(f=>f.personas.forEach(p=>actuales.set(p.correo,p)));
    const sel=new Map(actuales), base=new Map(); D.dir.forEach(d=>base.set(d.correo.toLowerCase(),{correo:d.correo.toLowerCase(),nombre:d.nombre}));
    D.perf.filter(p=>!['admin'].includes(p.rol)).forEach(p=>{ const c=String(p.correo).toLowerCase(); if(!base.has(c)) base.set(c,{correo:c,nombre:p.nombre}); });
    const todos=[...base.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')), nLug=Object.keys(g.lugares).length;
    const m=document.createElement('div'); m.className='admmodal'; document.body.appendChild(m);
    const pinta=q=>{ q=nrm(q||''); const lista=todos.filter(p=>!q||nrm(p.nombre+' '+p.correo).includes(q)).slice(0,80);
      m.innerHTML=`<div class="amb"><h3>Asignar líderes</h3><p class="sm">${escHTML(g.r.titulo?titA(g.r.titulo):g.r.area)} · <b>${escHTML(l.salon)}</b></p>
        <div class="asel">${[...sel.values()].map(p=>`<span class="lch on" data-q="${escHTML(p.correo)}">✕ ${escHTML(p.nombre)}</span>`).join('')||'<span class="pend">Nadie seleccionado</span>'}</div>
        <input id="asB" placeholder="Buscar docente por nombre o correo…" value="${escHTML(q)}">
        <div class="alist">${lista.map(p=>`<label><input type="checkbox" data-c="${escHTML(p.correo)}" ${sel.has(p.correo)?'checked':''}> ${escHTML(p.nombre)} <small>${escHTML(p.correo)}</small></label>`).join('')}</div>
        ${nLug>1&&!todosSk?`<div class="ascope"><label><input type="radio" name="asA" value="uno" checked> Solo en ${escHTML(l.salon)}</label><label><input type="radio" name="asA" value="todos"> En los ${nLug} lugares de esta actividad</label></div>`:''}
        <div class="abtn"><button class="b2" id="asX">Cancelar</button><button class="b1" id="asOk">Guardar</button></div></div>`;
      const b=m.querySelector('#asB'); b.oninput=()=>{ const v=b.value; pinta(v); const nb=m.querySelector('#asB'); nb.focus(); nb.setSelectionRange(v.length,v.length); };
      m.querySelectorAll('[data-c]').forEach(c=>c.onchange=()=>{ const p=base.get(c.dataset.c); if(c.checked) sel.set(p.correo,p); else sel.delete(p.correo); pinta(m.querySelector('#asB').value); });
      m.querySelectorAll('.asel [data-q]').forEach(c=>c.onclick=()=>{ sel.delete(c.dataset.q); pinta(m.querySelector('#asB').value); });
      m.querySelector('#asX').onclick=()=>m.remove();
      m.querySelector('#asOk').onclick=async()=>{ const todosL=todosSk||(m.querySelector('input[name=asA][value=todos]')&&m.querySelector('input[name=asA][value=todos]').checked), salon=todosL?'*':sk;
        m.querySelector('#asOk').disabled=true;
        let q1=sb().from('sd_lideres').delete().eq('actividad',ak); q1=todosL?q1:q1.eq('salon',sk); const r1=await q1; if(r1.error){ aviso(r1.error.message,'bad'); return; }
        if(sel.size){ const r2=await sb().from('sd_lideres').insert([...sel.values()].map(p=>({actividad:ak,salon,correo:p.correo,nombre:p.nombre}))); if(r2.error){ aviso(r2.error.message,'bad'); return; } }
        m.remove(); try{ await aplicarLideres(); }catch(e){} aviso('Líderes guardados','ok'); tLideres(); }; };
    pinta('');
  }

  /* =================== v28 · Agenda Master =================== */
  const TIPOS={sup:['Supervisar','#173d7a'],acom:['Acompañar actividad','#1f9d6b'],fijo:['Punto fijo','#c2410c'],reu:['Reunión','#7b4bd6'],lib:['Libre','#8a94a8']};
  const H0=6.5, H1=15;
  const hm=v=>{ const h=Math.floor(v), m=Math.round((v-h)*60); return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); };
  const aNum=t=>{ const [a,b]=String(t).slice(0,5).split(':').map(Number); return a+b/60; };
  let AGS=null, agSel=null;
  async function tAgenda(){
    const [p,a]=await Promise.all([ sb().from('sd_perfiles').select('id,nombre,rol').in('rol',['master']).order('nombre'), sb().from('sd_agenda').select('*').order('hora_inicio') ]);
    if(a.error) throw new Error('Falta ejecutar el archivo 14-lideres-y-agenda.sql en Supabase ('+a.error.message+')');
    AGS={m:p.data||[], b:(a.data||[]).map(x=>({...x,hora_inicio:String(x.hora_inicio).slice(0,5),hora_fin:String(x.hora_fin).slice(0,5)}))};
    pintarAgendaAdm();
  }
  function lugaresAg(){ const s=new Set(S().prog.filter(r=>r.tipo==='actividad'&&r.salon).map(r=>String(r.salon).replace(/^[-\s]+|[-\s]+$/g,'')));
    ['Portería principal','Entrada 2','Hall Principal','Coliseo','Cancha de fútbol','Zona verde','Rectoría','Sala de profesores','Restaurante','Bloque 130','Sede Primaria'].forEach(x=>s.add(x)); return [...s].sort((a,b)=>a.localeCompare(b,'es',{numeric:true})); }
  function pintarAgendaAdm(){
    const M=AGS.m, B=AGS.b, W=H1-H0, nom=id=>((M.find(x=>x.id===id)||{}).nombre||'');
    if(agSel&&agSel.id&&!B.find(b=>b.id===agSel.id)) agSel=null;
    const f=agSel||{perfil_id:(M[0]||{}).id,hora_inicio:'08:00',hora_fin:'09:00',lugar:'',tarea:'',tipo:'sup',avisar:true};
    const blk=b=>`<div class="ablk ${agSel&&agSel.id===b.id?'sel':''}" data-id="${b.id}" style="left:${((aNum(b.hora_inicio)-H0)/W*100).toFixed(2)}%;width:calc(${((aNum(b.hora_fin)-aNum(b.hora_inicio))/W*100).toFixed(2)}% - 3px);background:${(TIPOS[b.tipo]||TIPOS.sup)[1]}" title="${escHTML(b.lugar+' · '+(b.tarea||''))}"><b>${escHTML(b.lugar)}</b>${escHTML(b.tarea||'')}</div>`;
    $('admTab').innerHTML=`<div class="aglay"><div class="agmain">
      <div class="tools"><div class="aleg">${Object.values(TIPOS).map(t=>`<span><i style="background:${t[1]}"></i>${t[0]}</span>`).join('')}</div><button class="b1" id="agNuevo">+ Nuevo bloque</button><button class="b2" id="agXls">⬇ Descargar agenda</button><button class="b1" id="agImp" style="background:#b45309">📥 Importar agenda desde Excel</button><input type="file" id="agImpF" accept=".xlsx,.xls" hidden></div>
      ${M.length?`<div class="agantt"><div class="agh"><div>Master</div><div class="agt">${Array.from({length:Math.ceil(W)},(_,i)=>`<span>${fmtHora(hm(H0+i))}</span>`).join('')}</div></div>
      ${M.map(m=>`<div class="agr"><div class="agn"><b>${escHTML(m.nombre)}</b><small>${B.filter(b=>b.perfil_id===m.id).length} bloques</small></div><div class="agt rel" data-p="${m.id}">${B.filter(b=>b.perfil_id===m.id).map(blk).join('')}</div></div>`).join('')}</div>`:'<div class="warnbox">No hay usuarios Master registrados.</div>'}
      <p class="sm">Toca un bloque para editarlo o un espacio vacío de una fila para crear uno nuevo. Los cambios llegan de inmediato al celular de esa persona, con un aviso.</p></div>
      <div class="agform"><h4>${agSel&&agSel.id?'Editar bloque':'Nuevo bloque'}</h4>
        <label>Persona</label><select id="agP">${M.map(m=>`<option value="${m.id}" ${m.id===f.perfil_id?'selected':''}>${escHTML(m.nombre)}</option>`).join('')}</select>
        <div class="two"><div><label>Desde</label><input type="time" id="agD" value="${f.hora_inicio}" min="06:00" max="16:00"></div><div><label>Hasta</label><input type="time" id="agH" value="${f.hora_fin}" min="06:00" max="16:00"></div></div>
        <label>Lugar</label><input id="agL" list="agLs" value="${escHTML(f.lugar)}" placeholder="Ej. Coliseo, 144, Portería principal"><datalist id="agLs">${lugaresAg().map(x=>`<option value="${escHTML(x)}">`).join('')}</datalist>
        <label>Qué debe hacer</label><textarea id="agT" rows="3" maxlength="300" placeholder="Ej. Verificar que los grupos lleguen a tiempo y apoyar al líder de la estación">${escHTML(f.tarea||'')}</textarea>
        <label>Tipo</label><div class="agtipos">${Object.entries(TIPOS).map(([k,t])=>`<span data-k="${k}" class="${k===f.tipo?'on':''}" style="--c:${t[1]}">${t[0]}</span>`).join('')}</div>
        <label class="chk"><input type="checkbox" id="agA" ${f.avisar!==false?'checked':''}> Avisarle antes de este bloque</label>
        <div id="agErr" class="warnbox" hidden></div>
        <div class="agbtns"><button class="b1" id="agG">Guardar</button>${agSel&&agSel.id?'<button class="b2" id="agDup">Duplicar para…</button><button class="b2 del" id="agDel">Eliminar</button>':''}</div></div></div>`;
    let tipo=f.tipo;
    $('admTab').querySelectorAll('.agtipos span').forEach(x=>x.onclick=()=>{ tipo=x.dataset.k; $('admTab').querySelectorAll('.agtipos span').forEach(y=>y.classList.toggle('on',y===x)); });
    $('admTab').querySelectorAll('.ablk').forEach(x=>x.onclick=e=>{ e.stopPropagation(); agSel={...B.find(b=>String(b.id)===x.dataset.id)}; pintarAgendaAdm(); });
    $('admTab').querySelectorAll('.agt.rel').forEach(x=>x.onclick=e=>{ const r=x.getBoundingClientRect(), h=H0+(e.clientX-r.left)/r.width*W, h0=Math.floor(h*4)/4; agSel={perfil_id:x.dataset.p,hora_inicio:hm(h0),hora_fin:hm(Math.min(H1,h0+1)),lugar:'',tarea:'',tipo:'sup',avisar:true}; pintarAgendaAdm(); });
    $('agNuevo').onclick=()=>{ agSel=null; pintarAgendaAdm(); };
    $('agXls').onclick=descargarAgenda;
    $('agImp').onclick=()=>$('agImpF').click(); $('agImpF').onchange=e=>{ const f=e.target.files[0]; e.target.value=''; if(f) importarAgenda(f); };   // v40
    $('agG').onclick=async()=>{ const d={perfil_id:$('agP').value,hora_inicio:$('agD').value,hora_fin:$('agH').value,lugar:$('agL').value.trim(),tarea:$('agT').value.trim()||null,tipo,avisar:$('agA').checked};
      const err=m=>{ $('agErr').hidden=false; $('agErr').textContent=m; };
      if(!d.lugar) return err('Escribe el lugar.'); if(!d.hora_inicio||!d.hora_fin||d.hora_fin<=d.hora_inicio) return err('La hora final debe ser mayor que la inicial.');
      const cruce=B.find(b=>b.perfil_id===d.perfil_id&&(!agSel||b.id!==agSel.id)&&b.hora_inicio<d.hora_fin&&d.hora_inicio<b.hora_fin);
      if(cruce&&!confirm(`Se cruza con otro bloque de ${nom(d.perfil_id)} (${fmtHora(cruce.hora_inicio)}–${fmtHora(cruce.hora_fin)} · ${cruce.lugar}). ¿Guardar de todas formas?`)) return;
      const q=agSel&&agSel.id?sb().from('sd_agenda').update(d).eq('id',agSel.id).select().single():sb().from('sd_agenda').insert(d).select().single();
      const {data,error}=await q; if(error) return err('No se pudo guardar: '+error.message);
      aviso('Bloque guardado','ok'); agSel={...data,hora_inicio:String(data.hora_inicio).slice(0,5),hora_fin:String(data.hora_fin).slice(0,5)}; await tAgenda(); };
    if($('agDel')) $('agDel').onclick=async()=>{ if(!confirm('¿Eliminar este bloque?')) return; const {error}=await sb().from('sd_agenda').delete().eq('id',agSel.id); if(error) return aviso(error.message,'bad'); agSel=null; aviso('Bloque eliminado','ok'); await tAgenda(); };
    if($('agDup')) $('agDup').onclick=()=>{ const m=document.createElement('div'); m.className='admmodal'; document.body.appendChild(m);
      m.innerHTML=`<div class="amb"><h3>Duplicar para…</h3><p class="sm">${fmtHora(agSel.hora_inicio)}–${fmtHora(agSel.hora_fin)} · ${escHTML(agSel.lugar)}${agSel.tarea?' · '+escHTML(agSel.tarea):''}</p>
        <div class="alist">${M.filter(x=>x.id!==agSel.perfil_id).map(x=>`<label><input type="checkbox" value="${x.id}"> ${escHTML(x.nombre)}</label>`).join('')}</div>
        <div class="abtn"><button class="b2" id="duT">Todos</button><button class="b2" id="duX">Cancelar</button><button class="b1" id="duOk">Duplicar</button></div></div>`;
      m.querySelector('#duT').onclick=()=>m.querySelectorAll('input').forEach(i=>i.checked=true); m.querySelector('#duX').onclick=()=>m.remove();
      m.querySelector('#duOk').onclick=async()=>{ const ids=[...m.querySelectorAll('input:checked')].map(i=>i.value); if(!ids.length) return m.remove();
        const {error}=await sb().from('sd_agenda').insert(ids.map(id=>({perfil_id:id,hora_inicio:agSel.hora_inicio,hora_fin:agSel.hora_fin,lugar:agSel.lugar,tarea:agSel.tarea,tipo:agSel.tipo,avisar:agSel.avisar}))); m.remove();
        if(error) return aviso(error.message,'bad'); aviso(`Bloque copiado a ${ids.length} persona${ids.length>1?'s':''}`,'ok'); await tAgenda(); }; };
  }
  /* v40 · Importar la agenda de coordinadores y Bienestar desde Excel (una fila por persona, una columna por franja).
     Crea las cuentas que falten como Master (contraseña 0000), pasa a Master a quien esté como Docente
     y reemplaza los bloques de agenda de esas personas. */
  async function importarAgenda(file){
    // v40b: si el index.html publicado no trae agenda-excel.js, se carga aquí mismo
    if(!window.AgendaExcel){ try{ await new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='js/agenda-excel.js?v=40b'; s.onload=ok; s.onerror=()=>no(new Error('no se encontró')); document.head.appendChild(s); }); }catch(e){} }
    if(!window.AgendaExcel) return aviso('Falta el archivo js/agenda-excel.js en GitHub. Súbelo dentro de la carpeta js y vuelve a intentar.','bad');
    let R; try{ await cargarXLSX(); R=await window.AgendaExcel.leerArchivo(file); }catch(e){ return aviso('No se pudo leer el archivo: '+(e.message||e),'bad'); }
    if(!R.personas.length) return aviso(R.avisos[0]||'No encontré personas en el archivo.','bad');
    let perf; try{ perf=await todosPerfiles(); }catch(e){ return aviso(e.message,'bad'); }
    const porC=new Map(perf.map(p=>[String(p.correo).toLowerCase(),p])), pal=window.AgendaExcel.palabras;
    const F=R.personas.map(p=>{ let q=p.correo?porC.get(p.correo):null;
      if(!q){ const tk=pal(p.nombre); const c=perf.filter(x=>{ const w=pal(x.nombre); return tk.length>=2&&tk.every(z=>w.includes(z)); }); if(c.length===1) q=c[0]; }
      const correo=(q&&q.correo)||p.correo||'';
      const est=!correo?'sincorreo':!q?'crear':q.rol==='master'?'ok':q.rol==='admin'?'admin':q.rol==='docente'?'convertir':'otro';
      return {...p,correo,q,est,inc:['ok','crear','convertir'].includes(est),orig:p.bloques}; });
    const puedeAlinear=R.franjas.some(f=>f[0]==='09:00'&&f[1]==='10:00')&&R.franjas.some(f=>f[0]==='10:00'&&f[1]==='10:30');
    let alin=puedeAlinear; const aplica=()=>F.forEach(x=>x.bloques=alin?window.AgendaExcel.alinear(x.orig):x.orig); aplica();
    const ROLT={docente:'Docente',lider:'Líder de estación',organizador:'Organizador',secretario:'Secretario',admin:'Administrador',master:'Master'};
    const EST={ok:'✓ Master',crear:'Se crea cuenta Master (0000)',convertir:'Docente → pasa a Master',admin:'Administrador · se omite (no compite)',sincorreo:'Sin correo · no se puede cargar'};
    const mini=b=>`<span class="agmini ${b.tipo==='lib'?'lib':''}" title="${escHTML(b.tarea||'')}">${fmtHora(b.hora_inicio)} ${escHTML(b.lugar.length>26?b.lugar.slice(0,25)+'…':b.lugar)}</span>`;
    const m=document.createElement('div'); m.className='admmodal'; document.body.appendChild(m);
    const pinta=()=>{ const n=F.filter(x=>x.inc).length, bl=F.filter(x=>x.inc).reduce((s,x)=>s+x.bloques.length,0);
      m.innerHTML=`<div class="amb" style="max-width:980px;width:96vw"><h3>📥 Importar agenda · ${escHTML(R.hoja)}</h3>
        ${puedeAlinear?`<label class="okbox" style="display:block;cursor:pointer"><input type="checkbox" id="aiAl" ${alin?'checked':''}> <b>Ajustar al horario de los estudiantes (recomendado):</b> la rotación de las 9:00 termina a las 9:45; de 9:45 a 10:00 acompañan el desplazamiento por la ruta asignada y de 10:00 a 10:30 es su descanso.</label>`:''}
        <p class="sm">Franjas: ${R.franjas.map(f=>fmtHora(f[0])+'–'+fmtHora(f[1])).join(' · ')}. Las franjas vacías quedan como <b>descanso</b>. Los bloques de <b>almuerzo</b> y de <b>desplazamiento</b> quedan como «Libre»: aparecen en su agenda pero <b>no suman puntos</b> en la Liga Master.</p>
        <div class="twrap" style="max-height:55vh;overflow:auto"><table class="t"><tr><th></th><th>Persona</th><th>Correo</th><th>Cuenta</th><th>Agenda</th></tr>
        ${F.map((x,i)=>`<tr style="${x.inc?'':'opacity:.55'}"><td><input type="checkbox" data-i="${i}" ${x.inc?'checked':''} ${x.est==='sincorreo'||x.est==='admin'?'disabled':''}></td>
          <td><b>${escHTML(x.nombre)}</b><br><span class="sm">${escHTML(x.cargo)}</span></td><td class="sm">${escHTML(x.correo||'—')}</td>
          <td class="sm">${x.est==='otro'?`Es ${escHTML(ROLT[x.q.rol]||x.q.rol)}${x.inc?' → pasa a Master':' · marca la casilla para pasarlo a Master'}`:EST[x.est]}</td>
          <td><div class="agminis">${x.bloques.map(mini).join('')}</div></td></tr>`).join('')}</table></div>
        ${R.leyenda&&R.leyenda.length?`<details open><summary class="sm"><b>Qué debe hacer cada uno (según el color de la celda)</b></summary><ul class="ulc">${R.leyenda.map(x=>`<li><span style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px;background:#${x.rgb}"></span> ${escHTML(x.texto)}</li>`).join('')}</ul><p class="sm">Pasa el dedo o el ratón sobre cada bloque para ver la tarea que le llegará a la persona.</p></details>`:''}
        ${(()=>{ const av=R.avisos.filter(a=>{ const m=a.match(/^Sin correo en el archivo: (.*)\.$/); return !m||F.some(x=>!x.correo&&x.nombre===m[1]); }); return av.length?`<div class="warnbox">${av.map(escHTML).join('<br>')}</div>`:''; })()}
        <p class="sm" style="margin-top:8px">Se reemplazan los bloques que ya tengan estas ${n} personas. A cada una le llega el aviso «Tu agenda cambió».</p>
        <div class="err" id="aiE"></div>
        <div class="abtn"><button class="b2" id="aiX">Cancelar</button><button class="b1" id="aiOk" ${n?'':'disabled'}>Cargar agenda · ${n} personas · ${bl} bloques</button></div></div>`;
      m.querySelectorAll('[data-i]').forEach(c=>c.onchange=()=>{ F[+c.dataset.i].inc=c.checked; pinta(); });
      if(m.querySelector('#aiAl')) m.querySelector('#aiAl').onchange=e=>{ alin=e.target.checked; aplica(); pinta(); };
      m.querySelector('#aiX').onclick=()=>m.remove();
      m.querySelector('#aiOk').onclick=cargar; };
    const cargar=async()=>{ const b=m.querySelector('#aiOk'), E=m.querySelector('#aiE'); b.disabled=true; b.textContent='Cargando…';
      try{
        const sel=F.filter(x=>x.inc);
        const nuevas=sel.filter(x=>x.est==='crear').map(x=>({nombre:x.nombre,correo:x.correo,rol:'master',org_master:false}));
        if(nuevas.length){ const {error}=await sb().from('sd_directorio').upsert(nuevas.map(x=>({correo:x.correo,nombre:x.nombre})),{onConflict:'correo'}); if(error) throw error;
          const r=await sb().rpc('sd_crear_cuentas',{p_lista:nuevas}); if(r.error) throw r.error; }
        for(const x of sel.filter(x=>x.q&&x.q.rol!=='master')){ const {error}=await sb().rpc('sd_cambiar_perfil',{p_id:x.q.id,p_rol:'master',p_org_master:!!x.q.org_master,p_nombre:null}); if(error) throw error; }
        const P2=await todosPerfiles(), id=new Map(P2.map(p=>[String(p.correo).toLowerCase(),p.id]));
        const ids=sel.map(x=>id.get(x.correo.toLowerCase())).filter(Boolean); if(ids.length!==sel.length) throw new Error('No se encontraron todas las cuentas después de crearlas.');
        const {error:e1}=await sb().from('sd_agenda').delete().in('perfil_id',ids); if(e1) throw e1;
        const filas=sel.flatMap(x=>x.bloques.map(bq=>({perfil_id:id.get(x.correo.toLowerCase()),hora_inicio:bq.hora_inicio,hora_fin:bq.hora_fin,lugar:bq.lugar,tarea:bq.tarea||null,tipo:bq.tipo,avisar:bq.tipo!=='lib'})));
        for(let i=0;i<filas.length;i+=200){ const {error}=await sb().from('sd_agenda').insert(filas.slice(i,i+200)); if(error) throw error; }
        m.remove(); aviso(`Agenda cargada: ${sel.length} personas, ${filas.length} bloques${nuevas.length?` · ${nuevas.length} cuentas nuevas (contraseña 0000)`:''}`,'ok'); agSel=null; await tAgenda();
      }catch(e){ b.disabled=false; b.textContent='Reintentar'; E.textContent='No se pudo cargar: '+(e.message||e); } };
    pinta();
  }
  async function descargarAgenda(){ try{ await cargarXLSX(); const nom=id=>((AGS.m.find(x=>x.id===id)||{}).nombre||'');
      const filas=AGS.b.slice().sort((a,b)=>nom(a.perfil_id).localeCompare(nom(b.perfil_id),'es')||a.hora_inicio.localeCompare(b.hora_inicio)).map(b=>({Master:nom(b.perfil_id),Desde:b.hora_inicio,Hasta:b.hora_fin,Lugar:b.lugar,'Qué debe hacer':b.tarea||'',Tipo:(TIPOS[b.tipo]||TIPOS.sup)[0],Aviso:b.avisar?'Sí':'No'}));
      const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(filas),'Agenda Master'); XLSX.writeFile(wb,'agenda-master-steam-day.xlsx');
    }catch(e){ aviso('No se pudo generar: '+e.message,'bad'); } }

  window.abrirAdmin = abrir;
})();
