/* STEM Day · v31 · Llena el archivo oficial de asistencia del colegio (Asistencia_2026.xlsx)
   Solo toca la hoja del mes del evento y la columna del día del evento (más OBSERVACIÓN).
   El resto del libro (otros meses, comentarios, filtros, formatos) queda intacto porque se edita el XML directamente.
   Todo ocurre en el navegador: el archivo no se sube a ningún servidor. */
(function(g){
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const NUM={TRANSICION:'T',PRIMERO:'1',SEGUNDO:'2',TERCERO:'3',CUARTO:'4',QUINTO:'5',SEXTO:'6',SEPTIMO:'7',OCTAVO:'8',NOVENO:'9',DECIMO:'10',UNDECIMO:'11',ONCE:'11'};
  const MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const sinTilde=t=>String(t==null?'':t).normalize('NFD').replace(/[̀-ͯ]/g,'');
  const nrm=t=>sinTilde(t).toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  // «TERCERO G» → «3G»  ·  «3G», «3 G», «3G -ZONA…» → «3G»
  function grupoACurso(gr){ const t=nrm(gr); if(!t) return '';
    let m=t.match(/^(\d{1,2})\s*([A-Z])\b/); if(m) return m[1]+m[2];
    m=t.match(/^([A-Z]+)\s+([A-Z])$/); if(m&&NUM[m[1]]) return NUM[m[1]]+m[2];
    return t.replace(/ /g,''); }
  function gradoDe(gr){ const w=nrm(gr).split(' ')[0]||''; return w.charAt(0)+w.slice(1).toLowerCase(); }
  const colNum=ref=>{ let n=0; for(const ch of ref.replace(/\d+/g,'')) n=n*26+ch.charCodeAt(0)-64; return n; };
  const colLet=n=>{ let s=''; while(n>0){ const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26); } return s; };
  const serialDe=f=>{ const [y,m,d]=f.split('-').map(Number); return Math.round((Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/864e5); };
  const kids=(el,name)=>{ const o=[]; for(let c=el.firstChild;c;c=c.nextSibling) if(c.nodeType===1&&(c.localName||c.nodeName)===name) o.push(c); return o; };
  const hora=min=>{ const h=Math.floor(min/60), m=min%60, h12=((h+11)%12)+1; return `${h12}:${String(m).padStart(2,'0')} ${h<12?'a.m.':'p.m.'}`; };

  // Empareja filas del archivo con estudiantes de la app: matrícula, nombre exacto, mismas palabras o la mayoría de palabras
  function emparejador(recs){
    const porDoc={}, porCur={}, porNom={};
    recs.forEach(r=>{ r.cur=grupoACurso(r.curso); r.nn=nrm(r.nombre); r.tk=r.nn.split(' ').filter(Boolean); r.srt=r.tk.slice().sort().join(' ');
      if(r.documento) porDoc[String(r.documento).replace(/\D/g,'')]=r; (porCur[r.cur]=porCur[r.cur]||[]).push(r); (porNom[r.srt]=porNom[r.srt]||[]).push(r); });
    const f=(cur,nom,doc)=>{ if(doc&&porDoc[doc]) return porDoc[doc]; const L=porCur[cur]||[]; const n=nrm(nom);
      let r=L.find(x=>x.nn===n); if(r) return r; const tk=n.split(' '), srt=tk.slice().sort().join(' ');
      r=L.find(x=>x.srt===srt); if(r) return r;
      const sc=L.map(x=>({x,s:x.tk.filter(t=>tk.includes(t)).length})).filter(z=>z.s>=Math.min(3,z.x.tk.length,tk.length)&&z.s>=2).sort((a,b)=>b.s-a.s);
      return sc.length&&(sc.length===1||sc[0].s>sc[1].s)?sc[0].x:null; };
    f.otroCurso=nom=>{ const srt=nrm(nom).split(' ').sort().join(' '); const L=porNom[srt]||[]; return L.length===1?L[0]:null; };
    return f;
  }
  // Lee las ausencias ya marcadas (X) en la columna del día del evento, con su observación
  async function leerNovedades(buf, o){
    const A=await abrir(buf,o), out=[];
    A.rows.slice(1).forEach(row=>{ const C=A.celdas(row), x=A.val(C[A.cF]); if(!x||nrm(x)!=='X') return;
      out.push({grupo:A.val(C[A.cG]),curso:grupoACurso(A.val(C[A.cG])),nombre:A.val(C[A.cN]),matricula:A.cM?String(A.val(C[A.cM])||'').replace(/\D/g,''):'',obs:A.cO?String(A.val(C[A.cO])||'').trim():''}); });
    return out;
  }
  async function abrir(buf, o){
    const D=o.deps||g, Zip=D.JSZip, P=new D.DOMParser(), X=new D.XMLSerializer();
    const zip=await Zip.loadAsync(buf);
    const leer=async p=>{ const f=zip.file(p); if(!f) throw new Error('El archivo no parece un Excel válido (.xlsx).'); return P.parseFromString(await f.async('string'),'application/xml'); };
    const fecha=o.fecha, dd=fecha.slice(8,10)+'/'+fecha.slice(5,7), mes=MES[+fecha.slice(5,7)-1];
    // 1. hoja del mes
    const wbx=await leer('xl/workbook.xml'), sheets=[...wbx.getElementsByTagNameNS(NS,'sheet')];
    const hoja=sheets.find(s=>nrm(s.getAttribute('name')).toLowerCase()===mes);
    if(!hoja) throw new Error(`No encontré la hoja «${mes.charAt(0).toUpperCase()+mes.slice(1)}» en el archivo.`);
    const rid=hoja.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||hoja.getAttribute('r:id');
    const rels=await leer('xl/_rels/workbook.xml.rels'); const rel=[...rels.getElementsByTagName('Relationship')].find(r=>r.getAttribute('Id')===rid);
    let ruta=rel.getAttribute('Target').replace(/^\/?xl\//,'').replace(/^\//,''); ruta='xl/'+ruta;
    // 2. textos compartidos (solo lectura)
    let SS=[]; if(zip.file('xl/sharedStrings.xml')){ const sx=await leer('xl/sharedStrings.xml'); SS=[...sx.getElementsByTagNameNS(NS,'si')].map(si=>[...si.getElementsByTagNameNS(NS,'t')].map(t=>t.textContent).join('')); }
    const sh=await leer(ruta), sd=sh.getElementsByTagNameNS(NS,'sheetData')[0], rows=kids(sd,'row');
    const val=c=>{ if(!c) return null; const t=c.getAttribute('t'), v=kids(c,'v')[0];
      if(t==='s') return v?SS[+v.textContent]:null; if(t==='inlineStr'){ const is=kids(c,'is')[0]; return is?[...is.getElementsByTagNameNS(NS,'t')].map(x=>x.textContent).join(''):null; }
      return v?v.textContent:null; };
    const celdas=r=>{ const m={}; kids(r,'c').forEach(c=>m[colNum(c.getAttribute('r'))]=c); return m; };
    // 3. encabezados
    const H=celdas(rows[0]); let cG=0,cN=0,cM=0,cO=0,cF=0; const ser=String(serialDe(fecha));
    Object.entries(H).forEach(([k,c])=>{ const v=val(c), t=nrm(v); k=+k;
      if(t==='GRUPO'||t==='CURSO') cG=k; else if(t==='NOMBRE'||t==='ESTUDIANTE') cN=k; else if(t.startsWith('C MATRICULA')||t==='MATRICULA'||t==='CODIGO') cM=k; else if(t.startsWith('OBSERVACION')) cO=k;
      else if(v===ser||String(parseFloat(v))===ser) cF=k; });
    if(!cF) throw new Error(`No encontré la columna del ${dd} en la hoja «${hoja.getAttribute('name')}».`);
    if(!cG||!cN) throw new Error('No encontré las columnas «Grupo» y «NOMBRE» en la primera fila.');
    return {zip,leer,X,fecha,dd,mes,wbx,hoja,ruta,sh,rows,val,celdas,cG,cN,cM,cO,cF};
  }
  async function llenar(buf, recs, o){
    const A=await abrir(buf,o), {zip,leer,X,fecha,dd,wbx,hoja,ruta,sh,rows,val,celdas,cG,cN,cM,cO,cF}=A;
    // 4. estilos: hora (formato h:mm) y retardo (amarillo)
    const stx=await leer('xl/styles.xml'), fills=stx.getElementsByTagNameNS(NS,'fills')[0], xfs=stx.getElementsByTagNameNS(NS,'cellXfs')[0], XF=kids(xfs,'xf');
    let fillAm=null; const cache={};
    const estilo=(s,amarillo)=>{ const k=s+'|'+(amarillo?1:0); if(cache[k]!=null) return cache[k];
      if(amarillo&&fillAm==null){ const f=stx.createElementNS(NS,'fill'), p=stx.createElementNS(NS,'patternFill'), fg=stx.createElementNS(NS,'fgColor'), bg=stx.createElementNS(NS,'bgColor');
        p.setAttribute('patternType','solid'); fg.setAttribute('rgb','FFFFFF00'); bg.setAttribute('indexed','64'); p.appendChild(fg); p.appendChild(bg); f.appendChild(p); fills.appendChild(f);
        fillAm=kids(fills,'fill').length-1; fills.setAttribute('count',String(fillAm+1)); }
      const base=XF[+s]||XF[0], x=base.cloneNode(true); x.setAttribute('numFmtId','20'); x.setAttribute('applyNumberFormat','1');
      if(amarillo){ x.setAttribute('fillId',String(fillAm)); x.setAttribute('applyFill','1'); }
      xfs.appendChild(x); const n=kids(xfs,'xf').length-1; xfs.setAttribute('count',String(n+1)); return cache[k]=n; };
    // 5. índice de estudiantes de la app
    const buscar=emparejador(recs);
    // 6. escribir
    const R={aus:0,asis:0,ret:0,per:0,cambiadas:[],sinFila:[],sinMarca:{}}, usados=new Set();
    const cursosApp=new Set(recs.map(r=>r.cur));
    const poner=(row,cn,fn)=>{ const ref=colLet(cn)+row.getAttribute('r'); let c=kids(row,'c').find(x=>x.getAttribute('r')===ref);
      if(!c){ c=sh.createElementNS(NS,'c'); c.setAttribute('r',ref); const sig=kids(row,'c').find(x=>colNum(x.getAttribute('r'))>cn); row.insertBefore(c,sig||null);
        const sp=row.getAttribute('spans'); if(sp){ const [a,b]=sp.split(':').map(Number); if(cn>b) row.setAttribute('spans',a+':'+cn); } }
      while(c.firstChild) c.removeChild(c.firstChild); c.removeAttribute('t'); fn(c); return c; };
    const texto=(c,t)=>{ c.setAttribute('t','inlineStr'); const is=sh.createElementNS(NS,'is'), te=sh.createElementNS(NS,'t'); te.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve'); te.textContent=t; is.appendChild(te); c.appendChild(is); };
    const numero=(c,n)=>{ const v=sh.createElementNS(NS,'v'); v.textContent=String(n); c.appendChild(v); };
    const reObs=new RegExp('\\s*(\\|\\s*)?(Retardo|Permiso de salida|Ausencia reportada) '+dd.replace('/','\\/')+'[^|]*','g');
    rows.slice(1).forEach(row=>{ const C=celdas(row), gr=val(C[cG]), nom=val(C[cN]); if(!gr||!nom) return;
      const cur=grupoACurso(gr), r=buscar(cur,nom,cM?String(val(C[cM])||'').replace(/\D/g,''):'');
      if(!r){ if(cursosApp.has(cur)) R.sinMarca[cur]=(R.sinMarca[cur]||0)+1; return; }
      usados.add(r); if(!r.estado){ R.sinMarca[cur]=(R.sinMarca[cur]||0)+1; return; }
      const previo=val(C[cF]), s=(C[cF]&&C[cF].getAttribute('s'))||'0';
      if(r.estado==='N'){ poner(row,cF,c=>{ c.setAttribute('s',s); texto(c,'X'); }); R.aus++; }
      else { const min=r.min!=null?r.min:420, am=r.estado==='T';
        poner(row,cF,c=>{ c.setAttribute('s',String(estilo(s,am))); numero(c,(min/1440).toFixed(10).replace(/0+$/,'')); });
        if(previo&&nrm(previo)==='X') R.cambiadas.push(`${gr} · ${nom}`);
        if(r.estado==='A') R.asis++; if(r.estado==='T') R.ret++; if(r.estado==='P') R.per++; }
      if(cO){ let obs=String(val(C[cO])||'').replace(reObs,'').trim();
        let nota=''; if(r.estado==='T') nota=`Retardo ${dd} (llegó ${hora(r.min)}, ${r.retardo} min): ${[r.motivo,r.detalle].filter(Boolean).join(' – ')||'sin motivo'}`;
        if(r.estado==='N'&&r.previa&&!nrm(obs).includes(nrm(r.previa))) nota=`Ausencia reportada ${dd}: ${r.previa}`;
        if(r.estado==='P') nota=`Permiso de salida ${dd}: ${[r.motivo,r.detalle].filter(Boolean).join(' – ')||'sin motivo'}`;
        const nuevo=[obs,nota].filter(Boolean).join(' | '), antes=String(val(C[cO])||'');
        if(nuevo!==antes){ const s2=(C[cO]&&C[cO].getAttribute('s'))||null; poner(row,cO,c=>{ if(s2) c.setAttribute('s',s2); if(nuevo) texto(c,nuevo); }); } } });
    R.sinFila=recs.filter(r=>r.estado&&!usados.has(r)).map(r=>`${r.curso} · ${r.nombre}`);
    // 7. que Excel recalcule los totales al abrir
    let cp=wbx.getElementsByTagNameNS(NS,'calcPr')[0]; if(!cp){ cp=wbx.createElementNS(NS,'calcPr'); const ant=wbx.getElementsByTagNameNS(NS,'definedNames')[0]||wbx.getElementsByTagNameNS(NS,'sheets')[0]; ant.parentNode.insertBefore(cp,ant.nextSibling); }
    cp.setAttribute('fullCalcOnLoad','1');
    zip.file(ruta,X.serializeToString(sh)); zip.file('xl/styles.xml',X.serializeToString(stx)); zip.file('xl/workbook.xml',X.serializeToString(wbx));
    const out=await zip.generateAsync({type:o.tipo||'blob',compression:'DEFLATE',compressionOptions:{level:6},mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    R.hoja=hoja.getAttribute('name'); R.columna=colLet(cF); return {archivo:out,resumen:R};
  }
  g.AsisOficial={llenar,leerNovedades,emparejador,grupoACurso,gradoDe,nrm};
})(typeof window!=='undefined'?window:module.exports);
