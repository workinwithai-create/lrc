'use client';

import { useEffect, useRef, useState } from 'react';
import type { LrcLine } from '@/lib/lrc-timing';
import { lyricLines } from '@/lib/song-features';
import { getWritingInterval, handwritingFraction } from '@/lib/handwriting-timing';

type Props = {lines:LrcLine[]; audioFile:File|null; title:string; playbackTime?:number};
type Template = 'paper'|'midnight';
const safeFileName=(name:string)=>name.toLowerCase().replace(/[^a-z0-9-]+/g,'-').slice(0,60)||'lyrics';

function paintFrame(canvas:HTMLCanvasElement,lines:LrcLine[],sec:number,template:Template,title:string,lead:number) {
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const w=canvas.width,h=canvas.height;
  const light=template==='paper';
  ctx.fillStyle=light?'#f0e3ca':'#10131f';ctx.fillRect(0,0,w,h);
  if(light) {
    ctx.strokeStyle='rgba(67,113,145,.16)';ctx.lineWidth=2;
    for(let y=150;y<h;y+=65){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.strokeStyle='rgba(181,58,52,.35)';ctx.beginPath();ctx.moveTo(w*.1,0);ctx.lineTo(w*.1,h);ctx.stroke();
  }
  const words=lyricLines(lines);
  ctx.textAlign='center';ctx.fillStyle=light?'#594330':'#f2dbb7';
  ctx.font=String(Math.round(w*.055))+'px Caveat, cursive';
  ctx.fillText(title.slice(0,36),w/2,h*.14,w*.78);
  // Unlike karaoke, the video cue follows the signed *writing* start,
  // so a -0.3s lead actually reveals the next line before it is sung.
  const lineIndex=words.reduce((last,line,i)=>line.seconds+lead<=sec?i:last,-1);
  if(lineIndex<0)return;
  const line=words[lineIndex];
  const interval=getWritingInterval(words,lineIndex,lead,1.1);
  const fraction=handwritingFraction(sec,interval.start,interval.duration);
  ctx.font=String(Math.round(w*.065))+'px Caveat, cursive';
  const previous=words[lineIndex-1]?.text||'';
  const next=words[lineIndex+1]?.text||'';
  ctx.textAlign='center';
  ctx.globalAlpha=.35;
  ctx.fillText(previous.slice(0,54),w/2,h*.38,w*.83);
  ctx.globalAlpha=1;
  // Keep pen position anchored at the left edge while the letters accumulate.
  const letters=Array.from(line.text);
  const written=letters.slice(0,Math.ceil(letters.length*fraction)).join('');
  ctx.textAlign='left';
  ctx.fillText(written,w*.13,h*.52,w*.75);
  if(fraction>0&&fraction<1){
    const extent=ctx.measureText(written).width;
    ctx.fillStyle=light?'#b9774b':'#f2bf74';
    ctx.beginPath();ctx.ellipse(Math.min(w*.86,w*.13+extent)+7,h*.52-11,3,10,-.6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=light?'#594330':'#f2dbb7';
  }
  ctx.textAlign='center';
  ctx.globalAlpha=.32;
  ctx.fillText(next.slice(0,54),w/2,h*.66,w*.83);
  ctx.globalAlpha=1;
  ctx.font=String(Math.round(w*.023))+'px sans-serif';
  ctx.fillText('LRC FORGE  ·  HANDWRITTEN LYRICS',w/2,h*.92,w*.75);
}

export default function LyricVideoExport({lines,audioFile,title,playbackTime=0}:Props) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const [template,setTemplate]=useState<Template>('paper');
  const [ratio,setRatio]=useState<'wide'|'vertical'>('vertical');
  const [lead,setLead]=useState(-.3);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [progress,setProgress]=useState(0);
  const [format,setFormat]=useState('unknown');

  useEffect(()=>{
    const mp4=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'];
    const webm=['video/webm;codecs=vp8,opus','video/webm'];
    if(typeof MediaRecorder==='undefined'){setFormat('unavailable');return;}
    setFormat(mp4.some(t=>MediaRecorder.isTypeSupported(t))?'MP4':webm.some(t=>MediaRecorder.isTypeSupported(t))?'WebM':'unavailable');
  },[]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    [el.width,el.height]=ratio==='vertical'?[720,1280]:[1280,720];
    paintFrame(el,lines,playbackTime,template,title,lead);
  },[lines,ratio,template,title,lead,playbackTime]);

  async function exportVideo(){
    if(!audioFile || !canvas.current){setError('Load the recording before exporting.');return;}
    const el=canvas.current;
    if(typeof el.captureStream!=='function'||typeof MediaRecorder==='undefined'){
      setError('This browser does not support canvas video recording. Try current Chrome or Safari on desktop.');return;
    }
    const mp4=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'];
    const webm=['video/webm;codecs=vp8,opus','video/webm'];
    const mime=[...mp4,...webm].find(m=>MediaRecorder.isTypeSupported(m));
    if(!mime){setError('Your browser does not offer an MP4 or WebM recorder.');return;}
    setBusy(true);setError('');setProgress(0);
    let context:AudioContext|null=null;
    let stream:MediaStream|null=null;
    let url='';
    let audio:HTMLAudioElement|null=null;
    let frame=0;
    try {
      await document.fonts.ready;
      url=URL.createObjectURL(audioFile);
      audio=new Audio(url);audio.preload='auto';
      await new Promise<void>((resolve,reject)=>{
        const ok=()=>{audio!.removeEventListener('error',fail);resolve();};
        const fail=()=>{audio!.removeEventListener('loadedmetadata',ok);reject(new Error('Could not load the audio.'))};
        audio!.addEventListener('loadedmetadata',ok,{once:true});audio!.addEventListener('error',fail,{once:true});
        audio!.load();
      });
      if(!Number.isFinite(audio.duration)||audio.duration<.1||audio.duration>600) throw new Error('Video exports support recordings up to ten minutes.');
      const Ctor=window.AudioContext;
      if(!Ctor)throw new Error('Audio capture is not supported by this browser.');
      context=new Ctor();
      const source=context.createMediaElementSource(audio);
      const dest=context.createMediaStreamDestination();
      source.connect(dest);source.connect(context.destination);
      const captured=el.captureStream(24);
      stream=new MediaStream([...captured.getVideoTracks(),...dest.stream.getAudioTracks()]);
      const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4_000_000});
      const chunks:BlobPart[]=[];
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const done=new Promise<void>((resolve,reject)=>{
        recorder.onerror=()=>reject(new Error('Browser video encoding stopped.'));
        recorder.onstop=()=>resolve();
      });
      await context.resume();
      const instance=audio;
      function draw(){
        paintFrame(el,lines,instance.currentTime,template,title,lead);
        setProgress(Math.floor(instance.currentTime/instance.duration*100));
        if(!instance.ended&&!instance.paused){frame=requestAnimationFrame(draw);}
      }
      recorder.start(1000);
      await instance.play();
      draw();
      await new Promise<void>((resolve,reject)=>{
        instance.addEventListener('ended',()=>resolve(),{once:true});
        instance.addEventListener('error',()=>reject(new Error('Audio stopped while recording.')),{once:true});
      });
      cancelAnimationFrame(frame);
      if(recorder.state!=='inactive')recorder.stop();
      await done;
      if(!chunks.length)throw new Error('Browser returned an empty video file.');
      const mp4Result=mime.startsWith('video/mp4');
      const extension=mp4Result?'mp4':'webm';
      const blob=new Blob(chunks,{type:mime});
      const fileUrl=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=fileUrl;link.download=safeFileName(title)+'-lyrics.'+extension;
      link.click();
      window.setTimeout(()=>URL.revokeObjectURL(fileUrl),10000);
      setProgress(100);
      setError('Video exported as '+extension.toUpperCase()+' with original audio. Check synchronization before posting.');
    } catch(e){
      cancelAnimationFrame(frame);
      setError(e instanceof Error?e.message:'Could not export video.');
    } finally {
      audio?.pause();
      if(stream)stream.getTracks().forEach(track=>track.stop());
      if(context)void context.close();
      if(url)URL.revokeObjectURL(url);
      setBusy(false);
    }
  }
  return <div className="space-y-4">
    <div className="forge-panel-heading">
      <h3>Lyric video generator</h3>
      <p>Create an audio-backed handwritten video in your browser. MP4 is offered only when the browser supports it; otherwise the exported video will be WebM. No server upload.</p>
    </div>
    <div className="grid sm:grid-cols-3 gap-3">
      <label className="font-mono text-xs">Style<select className="block w-full border-2 border-ink bg-paper p-3 mt-1" value={template} onChange={e=>setTemplate(e.target.value as Template)}><option value="paper">Vintage notebook</option><option value="midnight">Midnight stage</option></select></label>
      <label className="font-mono text-xs">Frame<select className="block w-full border-2 border-ink bg-paper p-3 mt-1" value={ratio} onChange={e=>setRatio(e.target.value as 'wide'|'vertical')}><option value="vertical">9:16 Reels/Shorts</option><option value="wide">16:9 YouTube</option></select></label>
      <label className="font-mono text-xs">Pen offset<select className="block w-full border-2 border-ink bg-paper p-3 mt-1" value={lead} onChange={e=>setLead(Number(e.target.value))}><option value={-0.5}>0.5 sec early</option><option value={-0.3}>0.3 sec early</option><option value={0}>On the lyric</option></select></label>
    </div>
    <p className="font-mono text-xs text-mute">Press Play in the workshop audio player to preview the lyric animation here before exporting.</p>
    <canvas ref={canvas} className="block w-full max-w-lg mx-auto border-2 border-ink bg-paper" style={{aspectRatio:ratio==='wide'?'16/9':'9/16',maxHeight:460,width:ratio==='wide'?'100%':'auto'}} aria-label="Lyric video template preview" />
    <div className="flex flex-wrap gap-3 items-center">
      <button type="button" className="bg-blood text-paper px-5 py-3 font-mono font-bold text-sm disabled:opacity-40" disabled={!audioFile||!lines.length||busy||format==='unavailable'} onClick={()=>void exportVideo()}>{busy?'Rendering in real time…':'Export '+(format==='unknown'?'video':format)+' video'}</button>
      <span className="font-mono text-xs">{busy?progress+'% · keep tab open':format==='unavailable'?'Video export not supported in this browser':'Browser output: '+format}</span>
    </div>
    {error&&<p role="status" className="p-3 bg-gold/20 border border-gold text-sm">{error}</p>}
    <p className="text-xs text-mute">Beta: the browser records the animation in real time, so a three-minute song takes about three minutes. Stay on this tab. Browser MP4 encoding support varies; WebM is a valid video fallback.</p>
  </div>;
}