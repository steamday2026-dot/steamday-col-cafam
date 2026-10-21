/* =====================================================================
   STEM Day Cafam · v46 · Décimo y undécimo
   - Lector del Excel: A estudiante · B curso · C área que solicita · D docente líder
     (si el área es LOGÍSTICA, D trae la función y la ubicación). Columna o hojas opcionales con el momento/hora.
   - Llamado a lista: cada líder a sus estudiantes; administración, Máster Coordinador y
     Organizador Master a todos (incluida Logística).
   ===================================================================== */
(function (root) {
  'use strict';
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const limpio = s => String(s == null ? '' : s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const pad = n => String(n).padStart(2, '0');
  const h24 = (h, m) => { h = +h; m = +m; if (h >= 1 && h <= 5) h += 12; return pad(h) + ':' + pad(m); };
  const RX_FR = /(\d{1,2})[:.](\d{2})\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)?\s*(?:a|-|–|hasta)\s*(\d{1,2})[:.](\d{2})/i;
  const RX_H1 = /^(\d{1,2})[:.](\d{2})/;
  function franja(t) { const s = String(t || ''); let m = s.match(RX_FR); if (m) return [h24(m[1], m[2]), h24(m[3], m[4])]; m = s.trim().match(RX_H1); return m ? [h24(m[1], m[2]), null] : null; }
  // «10°A», «10-A», «10 A», «décimo A», «1001» → «10A»
  function curso(t) {
    let s = norm(t).replace(/[°º]/g, '').replace(/\s*-\s*/g, ' ');
    s = s.replace(/^decimo\b/, '10').replace(/^(undecimo|once|onceavo)\b/, '11');
    let m = s.match(/^(10|11)\s*([a-z])$/); if (m) return m[1] + m[2].toUpperCase();
    m = s.match(/^(10|11)0?(\d)$/); if (m) return m[1] + '-' + m[2];
    return limpio(t).toUpperCase().replace(/\s+/g, '');
  }
  const grado = c => /^10/.test(c) ? 'Décimo' : /^11/.test(c) ? 'Undécimo' : '';
  const esLog = a => /log[ií]stic/i.test(String(a || ''));
  // Logística: «Guía de visitantes - Portería principal», «Apoyo en el Coliseo», «Registro: Hall»
  function funcionLugar(t) {
    const s = limpio(t); if (!s) return ['', ''];
    let p = s.split(/\s+[-–—]\s+|\s*[;:|\/]\s*|\s*\n\s*/).filter(Boolean);
    if (p.length > 1) return [p[0], p.slice(1).join(' · ')];
    p = s.split(/,\s*/); if (p.length > 1) return [p[0], p.slice(1).join(', ')];
    const m = s.match(/^(.*?)\s+(?:en|ubicad[oa] en)\s+(?:el |la |los |las )?(.+)$/i);
    return m ? [m[1], m[2].charAt(0).toUpperCase() + m[2].slice(1)] : [s, ''];
  }
  function mapear(H) {
    const c = { nom: 0, cur: 1, area: 2, doc: 3, mom: -1 };
    if (!H) return c;
    H.forEach((h, i) => { const k = norm(h); if (!k) return;
      if (/estudiante|nombre|alumno/.test(k) && !/docente|lider/.test(k)) c.nom = i;
      else if (/^curso|grupo|^grado/.test(k)) c.cur = i;
      else if (/area/.test(k)) c.area = i;
      else if (/docente|lider|funcion|ubicacion|responsable/.test(k)) c.doc = i;
      else if (/hora|momento|franja|jornada|bloque/.test(k)) c.mom = i; });
    return c;
  }
  function leerLibro(wb, XLSX) {
    XLSX = XLSX || root.XLSX; const avisos = [], porEst = new Map(), hojasConDatos = [];
    wb.SheetNames.forEach(n => {
      const R = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' });
      let hr = R.slice(0, 12).findIndex(r => r.some(c => /estudiante|nombre|alumno/i.test(norm(c))) && r.some(c => /curso|grupo|grado/i.test(norm(c))));
      const C = mapear(hr >= 0 ? R[hr] : null), filas = [];
      for (let i = hr + 1; i < R.length; i++) { const r = R[i] || [], nombre = limpio(r[C.nom]), cu = limpio(r[C.cur]);
        if (nombre.length < 5 || !cu || /^(nombre( del)?( estudiante)?|estudiantes?|alumnos?)$/.test(norm(nombre))) continue;
        const c = curso(cu); if (!/^1[01]/.test(c)) continue;
        filas.push({ fila: i + 1, nombre, curso: c, area: limpio(r[C.area]), doc: String(r[C.doc] == null ? '' : r[C.doc]), mom: C.mom >= 0 ? limpio(r[C.mom]) : '' }); }
      if (filas.length) hojasConDatos.push({ n, filas });
    });
    if (!hojasConDatos.length) return { estudiantes: [], momentos: [], avisos: ['No encontré estudiantes de 10° u 11° (columna A: estudiante, B: curso).'] };
    const variasHojas = hojasConDatos.length > 1;
    hojasConDatos.forEach(({ n, filas }) => filas.forEach(f => {
      const momTxt = f.mom || (variasHojas ? n : 'Jornada'), fr = franja(momTxt);
      const log = esLog(f.area), [fun, lug] = log ? funcionLugar(f.doc) : ['', ''];
      const k = norm(f.nombre) + '|' + f.curso;
      let e = porEst.get(k); if (!e) { e = { nombre: f.nombre, curso: f.curso, grado: grado(f.curso), planes: [] }; porEst.set(k, e); }
      const plan = { momento: momTxt, hora_inicio: fr ? fr[0] : null, hora_fin: fr ? fr[1] : null, area: f.area, logistica: log, detalle: limpio(f.doc),
        funcion: fun, lugar: lug, lider_nombre: log ? '' : limpio(f.doc), hoja: n, fila: f.fila };
      const ya = e.planes.findIndex(p => p.momento === plan.momento);
      if (ya >= 0) { avisos.push(`${f.nombre} (${f.curso}) aparece dos veces en «${plan.momento}» (hoja ${n}, fila ${f.fila}); se usa la última.`); e.planes[ya] = plan; } else e.planes.push(plan);
      if (!log && !plan.lider_nombre) avisos.push(`${f.nombre} (${f.curso}): sin docente líder (hoja ${n}, fila ${f.fila}).`);
      if (log && !fun) avisos.push(`${f.nombre} (${f.curso}): Logística sin función ni ubicación (hoja ${n}, fila ${f.fila}).`);
    }));
    const estudiantes = [...porEst.values()].sort((a, b) => a.curso.localeCompare(b.curso, 'es', { numeric: true }) || a.nombre.localeCompare(b.nombre, 'es'));
    const orden = {}; estudiantes.forEach(e => e.orden = (orden[e.curso] = (orden[e.curso] || 0) + 1));
    const momentos = ordenarMomentos([...new Map(estudiantes.flatMap(e => e.planes).map(p => [p.momento, p])).values()]).map(p => p.momento);
    return { estudiantes, momentos, avisos };
  }
  function ordenarMomentos(L) { return L.slice().sort((a, b) => String(a.hora_inicio || '99').localeCompare(String(b.hora_inicio || '99')) || String(a.momento).localeCompare(String(b.momento), 'es', { numeric: true })); }
  const api = { leerLibro, curso, funcionLugar, franja, esLog, ordenarMomentos, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MayoresExcel = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* ===================== En la app ===================== */
if (typeof window !== 'undefined') (function () {
  const MOT_MAY = ['No llegó al colegio', 'Se retiró', 'Está en otra actividad', 'Otros'];
  const EV = { A: ['✓', 'Presente', '#1f9d6b'], T: ['⏱', 'Llegó tarde', '#f2a900'], N: ['✗', 'No está', '#e5484d'] };
  const M = window.MAY = { est: [], plan: [], asis: {}, ok: false, loc: {}, cambios: false };
  const todos = () => !!(S.perfil && (S.perfil.rol === 'admin' || S.perfil.org_master || (S.perfil.rol === 'organizador' && S.perfil.org_lista)));
  window.mayPuedeTodos = todos;
  const yoCorreo = () => String((S.perfil && S.perfil.correo) || '').toLowerCase();
  async function paginas(t, cols, ord) { let out = []; for (let i = 0; ; i += 1000) { let q = S.sb.from(t).select(cols); ord.forEach(o => q = q.order(o)); const r = await q.range(i, i + 999); if (r.error) return r; out = out.concat(r.data || []); if (!r.data || r.data.length < 1000) return { data: out }; } }
  async function cargar() {
    const [e, p, a] = await Promise.all([paginas('sd_may_est', '*', ['curso', 'orden', 'id']), paginas('sd_may_plan', '*', ['id']), paginas('sd_may_asis', '*', ['estudiante_id'])]);
    if (e.error) { M.ok = false; M.err = e.error.message; return; }
    M.ok = true; M.est = e.data || []; M.plan = p.data || []; M.asis = {}; (a.data || []).forEach(x => M.asis[x.estudiante_id + '|' + x.momento] = x); M.sucio = false;
  }
  window.mayCargar = cargar;
  function momentos() { return window.MayoresExcel.ordenarMomentos([...new Map(M.plan.map(p => [p.momento, p])).values()]); }
  function momentoActual(ms) {
    const ah = window.ahora ? ahora() : null; if (!ah || !S.config || ah.fecha !== S.config.fecha_evento) return ms[0];
    const hh = String(Math.floor(ah.min / 60)).padStart(2, '0') + ':' + String(ah.min % 60).padStart(2, '0');
    return ms.filter(p => p.hora_inicio && p.hora_inicio <= hh).pop() || ms[0];
  }
  const grupoDe = p => p.logistica ? 'Logística' : (p.lider_nombre ? 'Con ' + p.lider_nombre : 'Sin líder asignado');
  const nq = t => window.MayoresExcel.norm(t);

  /* líder: pestaña «Lista 10°-11°» solo si tiene estudiantes asignados */
  window.mayIniciar = async function () {
    if (!S.perfil || S.vistaComo) return;
    try { await cargar(); } catch (_) { return; }
    if (!M.ok) return;
    if (!todos() && ['lider', 'docente', 'master'].includes(S.modo) && M.plan.some(p => String(p.lider_correo || '').toLowerCase() === yoCorreo())) {
      const nav = $('nav'); if (nav && !nav.querySelector('[data-p=may]')) {
        const ref = nav.querySelector('[data-p=programa]');
        const sp = document.createElement('span'); sp.dataset.p = 'may';
        sp.innerHTML = '<i class="ic"><svg viewBox="0 0 24 24"><path d="M3 5h2M3 12h2M3 19h2M8 5h13M8 12h13M8 19h13"/></svg></i>10° y 11°';
        sp.onclick = () => irPanel('may'); nav.insertBefore(sp, ref || null);
        nav.classList.toggle('n6', nav.children.length > 5); nav.classList.toggle('n7', nav.children.length > 6);
      }
    }
    try { S.sb.channel('mayores').on('postgres_changes', { event: '*', schema: 'public', table: 'sd_may_asis' }, p => {
      const n = p.new || {}; if (n.estudiante_id) M.asis[n.estudiante_id + '|' + n.momento] = n;
      if (!M.cambios && ((S.panel === 'may') || (S.panel === 'asis' && S.asisVista === 'may'))) { clearTimeout(M._t); M._t = setTimeout(() => pintarMayores(), 700); } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sd_may_plan' }, () => { M.sucio = true; }).subscribe(); } catch (_) {}
  };

  /* panel de llamado a lista */
  window.pintarMayores = async function () {
    const enAsis = S.panel === 'asis', el = enAsis ? $('asisPz') : $('mayPz'); if (!el) return;
    if (!M.ok || M.sucio) { el.innerHTML = '<p class="sm">Cargando…</p>'; await cargar(); }
    if (!M.ok) { el.innerHTML = `${enAsis ? '<div class="sub"><a href="#" id="myVol">← Volver a la asistencia</a></div>' : ''}<div class="warnbox">No se pudo cargar la lista de 10° y 11°${/sd_may/.test(M.err || '') ? ': falta ejecutar el archivo 24-decimo-undecimo.sql en Supabase.' : '.'}</div>`; if ($('myVol')) $('myVol').onclick = e => { e.preventDefault(); S.asisVista = null; pintarAsis(); }; return; }
    const T = todos(), ms = momentos();
    if (!ms.length) { el.innerHTML = `${enAsis ? '<div class="sub"><a href="#" id="myVol">← Volver a la asistencia</a></div>' : ''}<h3>🎓 Décimo y undécimo</h3><div class="alertbox">Aún no se ha cargado la lista de 10° y 11° (Administración → Estudiantes).</div>`; if ($('myVol')) $('myVol').onclick = e => { e.preventDefault(); S.asisVista = null; pintarAsis(); }; return; }
    if (!M.mom || !ms.some(p => p.momento === M.mom)) M.mom = momentoActual(ms).momento;
    const mom = ms.find(p => p.momento === M.mom), estPor = new Map(M.est.map(e => [e.id, e]));
    let filas = M.plan.filter(p => p.momento === M.mom && estPor.has(p.estudiante_id));
    if (!T) filas = filas.filter(p => String(p.lider_correo || '').toLowerCase() === yoCorreo());
    const grupos = [...new Set(filas.map(grupoDe))].sort((a, b) => (a === 'Logística') - (b === 'Logística') || a.localeCompare(b, 'es'));
    if (M.gr && !grupos.includes(M.gr)) M.gr = '';
    const q = nq(M.q || '');
    const vis = filas.filter(p => (!M.gr || grupoDe(p) === M.gr) && (!q || nq(estPor.get(p.estudiante_id).nombre + ' ' + estPor.get(p.estudiante_id).curso).includes(q)))
      .sort((a, b) => grupoDe(a).localeCompare(grupoDe(b), 'es') || estPor.get(a.estudiante_id).curso.localeCompare(estPor.get(b.estudiante_id).curso, 'es', { numeric: true }) || estPor.get(a.estudiante_id).nombre.localeCompare(estPor.get(b.estudiante_id).nombre, 'es'));
    const val = p => { const k = p.estudiante_id + '|' + M.mom; return M.loc[k] || M.asis[k] || null; };
    const cnt = { A: 0, T: 0, N: 0, S: 0 }; vis.forEach(p => { const v = val(p); v ? cnt[v.estado]++ : cnt.S++; });
    let h = `${enAsis ? '<div class="sub"><a href="#" id="myVol">← Volver a la asistencia</a></div>' : ''}
      <h3>🎓 ${T ? 'Décimo y undécimo' : 'Tus estudiantes de 10° y 11°'}</h3>
      <div class="sub">${T ? 'Ves a todos los estudiantes, con su líder o su punto de Logística.' : 'Llama a lista a los estudiantes que te acompañan.'} Los cambios se ven en vivo.</div>
      ${ms.length > 1 ? `<div class="moms">${ms.map(p => `<span data-mm="${escHTML(p.momento)}" class="${p.momento === M.mom ? 'on' : ''}"><b>${p.hora_inicio ? fmtHora(p.hora_inicio).replace(' ', '') : '•'}</b>${escHTML(String(p.momento).slice(0, 16))}</span>`).join('')}</div>` : ''}
      <div class="cnt">${['A', 'T', 'N'].map(k => `<div><b style="color:${EV[k][2]}">${cnt[k]}</b><small>${EV[k][0]} ${EV[k][1]}</small></div>`).join('')}<div><b>${cnt.S}</b><small>⚪ Sin marcar</small></div></div>
      ${M.cambios ? '<div class="leg"><b style="color:#b07a00">Cambios sin guardar</b></div>' : ''}
      ${T && grupos.length > 1 ? `<select id="myGr" class="srch"><option value="">Todos los grupos (${filas.length})</option>${grupos.map(g => `<option ${g === M.gr ? 'selected' : ''} value="${escHTML(g)}">${escHTML(g)} (${filas.filter(p => grupoDe(p) === g).length})</option>`).join('')}</select>` : ''}
      <input class="srch" id="myBus" placeholder="Buscar estudiante o curso…" value="${escHTML(M.q || '')}">
      ${vis.length ? '<button class="pbtn alt" id="myTodos">✓ Marcar a los que faltan como presentes</button><div style="height:8px"></div>' : '<p class="sm">No hay estudiantes en este momento.</p>'}`;
    let gAnt = '';
    vis.forEach(p => { const e = estPor.get(p.estudiante_id), v = val(p), g = grupoDe(p), k = p.estudiante_id + '|' + M.mom;
      if (T && g !== gAnt) { h += `<h4 class="mygr">${g === 'Logística' ? '📦' : '👤'} ${escHTML(g)}</h4>`; gAnt = g; }
      h += `<div class="est"><div class="nm">${escHTML(e.nombre)}<small><b>${escHTML(e.curso)}</b> · ${escHTML(p.area || '')}</small>
        ${p.logistica ? `<small class="mylog">📍 ${escHTML([p.funcion, p.lugar].filter(Boolean).join(' · ') || p.detalle || 'Logística')}</small>` : T ? '' : ''}
        ${v ? `<small style="color:${EV[v.estado][2]}">${EV[v.estado][1]}${v.motivo ? ' · ' + escHTML(v.motivo) : ''}${v.por_nombre && !M.loc[k] ? ' · ' + escHTML(nomCorto(v.por_nombre)) : ''}</small>` : ''}
        ${v && v.estado === 'N' && M.loc[k] ? `<select data-mo="${escHTML(k)}"><option value="">¿Por qué no está?…</option>${MOT_MAY.map(o => `<option ${v.motivo === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : ''}</div>
        <div class="st">${['A', 'T', 'N'].map(s => `<span data-k="${escHTML(k)}" data-v="${s}" class="${v && v.estado === s ? 'on' : ''}">${EV[s][0]}</span>`).join('')}</div></div>`; });
    if (vis.length) h += `<button class="pbtn" id="myGuardar" ${M.cambios ? '' : 'disabled'}>Guardar llamado a lista</button>`;
    if (T) h += `<div class="dlbox" style="margin-top:14px"><b>⬇ Descargar la asistencia de 10° y 11°</b><p class="sm" style="margin:4px 0 8px">Un Excel con cada estudiante, su ubicación y lo marcado en cada momento.</p><button class="b2" id="myXls">Descargar Excel</button></div>`;
    const st = el.parentElement ? el.parentElement.scrollTop : 0; el.innerHTML = h; if (el.parentElement) el.parentElement.scrollTop = st;
    if ($('myVol')) $('myVol').onclick = e => { e.preventDefault(); if (M.cambios && !confirm('Hay cambios sin guardar. ¿Salir de todas formas?')) return; M.loc = {}; M.cambios = false; S.asisVista = null; pintarAsis(); };
    el.querySelectorAll('[data-mm]').forEach(x => x.onclick = () => { if (M.cambios && !confirm('Hay cambios sin guardar. ¿Cambiar de momento?')) return; M.loc = {}; M.cambios = false; M.mom = x.dataset.mm; pintarMayores(); });
    if ($('myGr')) $('myGr').onchange = e => { M.gr = e.target.value; pintarMayores(); };
    $('myBus').oninput = e => { M.q = e.target.value; pintarMayores().then(() => { const b = $('myBus'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }); };
    el.querySelectorAll('.st [data-k]').forEach(x => x.onclick = () => { const k = x.dataset.k, cur = val({ estudiante_id: +k.split('|')[0] }) || {};
      M.loc[k] = { estado: x.dataset.v, motivo: x.dataset.v === 'N' ? (cur.estado === 'N' ? cur.motivo || '' : '') : null }; M.cambios = true; pintarMayores(); });
    el.querySelectorAll('[data-mo]').forEach(x => x.onchange = () => { M.loc[x.dataset.mo].motivo = x.value; });
    if ($('myTodos')) $('myTodos').onclick = () => { vis.forEach(p => { const k = p.estudiante_id + '|' + M.mom; if (!val(p)) M.loc[k] = { estado: 'A', motivo: null }; }); M.cambios = true; pintarMayores(); };
    if ($('myGuardar')) $('myGuardar').onclick = guardar;
    if ($('myXls')) $('myXls').onclick = descargar;
  };
  async function guardar() {
    const ks = Object.keys(M.loc); if (!ks.length) return;
    const falta = ks.filter(k => M.loc[k].estado === 'N' && !M.loc[k].motivo); if (falta.length) return toast('Elige por qué no está cada estudiante marcado con ✗', 'bad', 3800);
    if (S.vistaComo) return toast('Vista previa: no se guarda', 'bad');
    const filas = ks.map(k => { const [id, ...m] = k.split('|'); return { estudiante_id: +id, momento: m.join('|'), estado: M.loc[k].estado, motivo: M.loc[k].estado === 'N' ? M.loc[k].motivo : null, registrado_por: S.perfil.id, por_nombre: S.perfil.nombre || null, actualizado_en: new Date().toISOString() }; });
    $('myGuardar').disabled = true; $('myGuardar').textContent = 'Guardando…';
    const r = await S.sb.from('sd_may_asis').upsert(filas, { onConflict: 'estudiante_id,momento' });
    if (r.error) { toast('No se pudo guardar: ' + r.error.message, 'bad', 5000); pintarMayores(); return; }
    filas.forEach(f => M.asis[f.estudiante_id + '|' + f.momento] = f); M.loc = {}; M.cambios = false;
    toast(`Llamado guardado ✓ · ${filas.filter(f => f.estado === 'N').length} no están`, 'ok', 3500); pintarMayores();
  }
  async function descargar() {
    if (window.cargarXLSX) await cargarXLSX(); else if (!window.XLSX) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    const ms = momentos().map(p => p.momento), estPor = new Map(M.est.map(e => [e.id, e])), filas = [];
    M.est.forEach(e => ms.forEach(m => { const p = M.plan.find(x => x.estudiante_id === e.id && x.momento === m); if (!p) return; const a = M.asis[e.id + '|' + m];
      filas.push({ Curso: e.curso, Estudiante: e.nombre, Momento: m, 'Área que solicita': p.area || '', 'Docente líder': p.logistica ? '' : p.lider_nombre || '', 'Logística: función': p.logistica ? p.funcion || '' : '', 'Logística: ubicación': p.logistica ? p.lugar || p.detalle || '' : '',
        Asistencia: a ? EV[a.estado][1] : 'Sin marcar', Motivo: a && a.motivo || '', 'Marcado por': a && a.por_nombre || '' }); }));
    const ws = XLSX.utils.json_to_sheet(filas); ws['!cols'] = [{ wch: 8 }, { wch: 38 }, { wch: 16 }, { wch: 22 }, { wch: 32 }, { wch: 24 }, { wch: 28 }, { wch: 12 }, { wch: 24 }, { wch: 28 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Asistencia 10 y 11'); XLSX.writeFile(wb, 'asistencia-10-11-stem-day.xlsx');
  }
})();
