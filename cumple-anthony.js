'use strict';
(() => {
  const ENDPOINT = 'https://n8n.huinchodigital.online/webhook/cumple-anthony-confirmaciones-v1';
  const ORIGINAL = 'https://res.cloudinary.com/educafotos01/video/upload/v1790731980/invitacion.mp4';
  const STORAGE = 'cumple-anthony-confirmacion-v1';
  const $ = id => document.getElementById(id);
  const video = $('video');
  const form = $('formulario');
  const fields = ['nombre','asistencia','adultos','ninos','acompanantes','observaciones'];
  let enviando = false, registrada = false, pending = null, saved = null;
  let fallback = false, started = false;
  const remember = () => {
    try { sessionStorage.setItem(STORAGE, JSON.stringify({draft:Object.fromEntries(fields.map(k=>[k,$(k).value])),pending,saved})); } catch {}
  };
  const focus = el => { el.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'auto'}); };
  const group = () => { const yes=$('asistencia').value==='Sí'; $('grupo').hidden=!yes; $('grupo').disabled=!yes; };
  const clock = t => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  const player = () => {
    $('reproducirGrande').hidden = started || video.ended;
    $('verOtraVez').hidden = !video.ended;
    $('pausar').hidden = video.ended;
    $('pausar').textContent = video.paused ? '▶' : '❚❚';
    $('pausar').setAttribute('aria-label',video.paused?'Continuar video':'Pausar video');
    if(Number.isFinite(video.duration)&&video.duration>0){
      $('progreso').disabled=false; $('progreso').value=100*video.currentTime/video.duration;
      $('progreso').setAttribute('aria-valuetext',`${clock(video.currentTime)} de ${clock(video.duration)}`);
      $('tiempo').textContent=`${clock(video.currentTime)} / ${clock(video.duration)}`;
    }
    $('confirmar').classList.toggle('destacado',video.currentTime>=45&&!registrada);
  };
  async function play() {
    try {
      if(video.ended) video.currentTime=0;
      video.muted=false;
      try { video.volume=1; } catch {}
      const playing=video.play();
      $('indicacion').textContent='Cargando el video…';
      await playing;
      $('errorVideo').hidden=true;
      $('reintentarVideo').hidden=true;
      revealControls();
      $('indicacion').textContent='Puedes confirmar tu asistencia cuando quieras.';
    } catch {
      $('errorVideo').hidden=false;
      $('errorVideo').textContent='No se pudo iniciar. Toca reproducir de nuevo o vuelve a cargar el video.';
      $('reintentarVideo').hidden=false;
    }
    player();
  }
  let controlsTimer;
  const revealControls = () => {
    if(video.ended) { $('controles').hidden=true; return; }
    $('controles').hidden=false;
    clearTimeout(controlsTimer);
    controlsTimer=setTimeout(()=>{
      if(!$('controles').contains(document.activeElement)) $('controles').hidden=true;
    },2500);
  };
  $('reproducirGrande').addEventListener('click',play);
  $('pausar').addEventListener('click',()=>{if(video.paused)play();else video.pause();});
  $('verOtraVez').addEventListener('click',play);
  video.addEventListener('play',()=>{started=true;player();});
  video.addEventListener('click',revealControls);
  video.addEventListener('pointermove',revealControls);
  video.addEventListener('contextmenu',e=>e.preventDefault());
  $('controles').addEventListener('pointerdown',revealControls);
  $('controles').addEventListener('focusout',revealControls);
  $('progreso').addEventListener('input',()=>{if(Number.isFinite(video.duration))video.currentTime=Number($('progreso').value)*video.duration/100;player();});
  ['play','pause','timeupdate','loadedmetadata','volumechange'].forEach(e=>video.addEventListener(e,player));
  video.addEventListener('ended',()=>{clearTimeout(controlsTimer);$('controles').hidden=true;player();$('indicacion').textContent=registrada?'¡Gracias por responder!':'¿Nos acompañas? Toca Confirmar asistencia.';});
  video.addEventListener('error',()=>{
    if(!fallback){fallback=true;video.src=ORIGINAL;video.load();return;}
    $('errorVideo').textContent='No se pudo cargar el video. Puedes reintentarlo o confirmar tu asistencia.';
    $('errorVideo').hidden=false;$('reintentarVideo').hidden=false;
  });
  $('reintentarVideo').addEventListener('click',()=>{video.load();play();});
  $('confirmar').addEventListener('click',()=>{video.pause();$('invitacion').hidden=true;$('panel').hidden=false;$('confirmar').setAttribute('aria-expanded','true');focus(registrada?$('exito'):$('tituloFormulario'));});
  $('volverVideo').addEventListener('click',()=>{$('panel').hidden=true;$('invitacion').hidden=false;$('confirmar').setAttribute('aria-expanded','false');if(started&&!video.ended)revealControls();focus(video.ended?$('verOtraVez'):started?$('pausar'):$('reproducirGrande'));});
  $('asistencia').addEventListener('change',group);
  form.addEventListener('input',remember);
  form.addEventListener('change',remember);
  function showSuccess(result){
    registrada=true;saved=result;pending=null;
    $('formulario').hidden=true;$('exito').hidden=false;
    $('resumen').textContent=result.asistencia==='Sí'?`${result.nombre}: ${result.adultos} adulto(s) y ${result.ninos} niño(s). Total: ${result.total} persona(s).`:`${result.nombre}: registramos que no podrás asistir.`;
    $('confirmar').textContent='✅ Ver respuesta registrada';
    $('indicacion').textContent='¡Gracias por responder!';remember();
  }
  try {
    const data=JSON.parse(sessionStorage.getItem(STORAGE)||'null');
    if(data){for(const k of fields)if(typeof data.draft?.[k]==='string')$(k).value=data.draft[k];pending=data.pending||null;saved=data.saved||null;}
  }catch{}
  group();
  if(pending){$('campos').disabled=true;$('enviar').textContent='Comprobar y reintentar';$('estado').textContent='Hay un envío pendiente de confirmar. Comprobaremos el mismo envío para evitar duplicados.';}
  if(saved?.ok===true)showSuccess(saved);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(enviando||registrada)return;
    if(!pending){
      if(!form.reportValidity())return;
      const yes=$('asistencia').value==='Sí';
      const body={nombre:$('nombre').value.trim(),asistencia:$('asistencia').value,adultos:yes?Number($('adultos').value):0,ninos:yes?Number($('ninos').value):0,acompanantes:yes?$('acompanantes').value.trim():'',observaciones:$('observaciones').value.trim(),website:$('website').value};
      if(body.nombre.length<2||![body.adultos,body.ninos,body.adultos+body.ninos].every(Number.isSafeInteger)||body.adultos<0||body.ninos<0||(yes&&body.adultos+body.ninos<1)){
        $('estado').textContent='Revisa el nombre y las cantidades. Debe asistir al menos una persona si respondes Sí.';return;
      }
      if(!window.crypto?.randomUUID){$('estado').textContent='Abre la invitación en un navegador actualizado para enviar tu respuesta.';return;}
      pending={...body,solicitudId:crypto.randomUUID()};remember();
    }
    enviando=true;$('campos').disabled=true;$('enviar').disabled=true;$('enviar').textContent='Guardando…';$('estado').textContent='';form.setAttribute('aria-busy','true');
    const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),30000);
    const slow=setTimeout(()=>{$('estado').textContent='El guardado está tardando. Conservamos tus datos; espera un momento.';},12000);
    try{
      const response=await fetch(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending),signal:abort.signal});
      const result=await response.json();
      if(!response.ok||result.ok!==true){
        if(response.status===400||response.status===403||response.status===413){pending=null;$('campos').disabled=false;remember();}
        throw new Error(result.message||'No pudimos confirmar el guardado. Espera dos minutos y pulsa Comprobar y reintentar.');
      }
      if(result.solicitudId!==pending.solicitudId||!result.registroId||!['Sí','No'].includes(result.asistencia)||typeof result.nombre!=='string'||!Number.isSafeInteger(result.total))throw new Error('La confirmación no está completa. Vuelve a comprobar el mismo envío.');
      showSuccess(result);focus($('exito'));
    }catch(error){
      $('estado').textContent=error.name==='AbortError'||error instanceof TypeError?'No pudimos confirmar el guardado por un problema de conexión. Tus datos están conservados. Espera dos minutos y pulsa Comprobar y reintentar.':error.message;
    }finally{
      clearTimeout(timeout);clearTimeout(slow);enviando=false;form.setAttribute('aria-busy','false');$('enviar').disabled=false;$('enviar').textContent=pending?'Comprobar y reintentar':'Enviar respuesta';remember();
    }
  });
})();
