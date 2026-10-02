/* STEAM Day Cafam · Tonos de alerta (Web Audio, sin archivos de sonido) */
const TONOS = {campana:'Campana', timbre:'Timbre escolar', digital:'Digital'};
let _actx = null;
function _beep(f,t0,d,type,vol){ const o=_actx.createOscillator(), g=_actx.createGain(); o.type=type; o.frequency.value=f;
  g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(vol,t0+.01); g.gain.exponentialRampToValueAtTime(.001,t0+d);
  o.connect(g).connect(_actx.destination); o.start(t0); o.stop(t0+d+.05); }
function desbloquearAudio(){ try{ _actx=_actx||new (window.AudioContext||window.webkitAudioContext)(); if(_actx.state==='suspended') _actx.resume(); }catch(e){} }
function sonarTono(tono){
  try{
    desbloquearAudio(); const t=_actx.currentTime;
    if(tono==='timbre'){ for(let i=0;i<10;i++) _beep(i%2?660:880,t+i*.16,.15,'square',.12); }
    else if(tono==='digital'){ [0,.18,.36,.8,.98,1.16].forEach(k=>_beep(1200,t+k,.12,'triangle',.25)); }
    else { [0,.7,1.4].forEach(k=>{ _beep(880,t+k,1.2,'sine',.35); _beep(1320,t+k,.9,'sine',.12); }); }
  }catch(e){}
}
// los navegadores solo permiten sonido después de un toque del usuario
['touchstart','click','keydown'].forEach(ev=>document.addEventListener(ev,desbloquearAudio,{once:true,passive:true}));
