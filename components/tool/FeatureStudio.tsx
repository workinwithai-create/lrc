'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { parseLrc } from '@/lib/lrc-timing';
import { detectHooks, detectSections, lyricLines, scoreTappedEntries, timedKaraokeLine } from '@/lib/song-features';
import LyricVideoExport from './LyricVideoExport';

type Feature = 'karaoke'|'video'|'timing'|'snippets'|'structure';
type Props = { initialLrc?:string; initialAudio?:File|null };
const tabs:{key:Feature;title:string}[]=[
  {key:'karaoke',title:'Karaoke'}, {key:'video',title:'Lyric video'},
  {key:'timing',title:'Timing coach'}, {key:'snippets',title:'Hook clips'},
  {key:'structure',title:'Song map'},
];
const clock=(sec:number)=>Math.floor(Math.max(0,sec)/60)+':'+String(Math.floor(Math.max(0,sec)%60)).padStart(2,'0');
const filename=(x:string)=>x.toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,48)||'song';
function download(blob:Blob,name:string){
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}

/** Decode audio on-device and write a real PCM WAV file for 15-30-second hook exports. */
async function makeWavClip(file:File,start:number,end:number):Promise<Blob>{
  const context=new AudioContext();
  try{
    const decoded=await context.decodeAudioData(await file.arrayBuffer());
    const a=Math.min(decoded.length,Math.floor(start*decoded.sampleRate));
    const b=Math.min(decoded.length,Math.floor(end*decoded.sampleRate));
    if(b<=a)throw new Error('Invalid audio clip range.');
    const n=b-a,channels=Math.min(2,decoded.numberOfChannels);
    const buf=new ArrayBuffer(44+n*channels*2),view=new DataView(buf);
    function put(at:number,text:string){for(let i=0;i<text.length;i++)view.setUint8(at+i,text.charCodeAt(i));}
    put(0,'RIFF');view.setUint32(4,buf.byteLength-8,true);put(8,'WAVE');put(12,'fmt ');
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);
    view.setUint32(24,decoded.sampleRate,true);view.setUint32(28,decoded.sampleRate*channels*2,true);
    view.setUint16(32,channels*2,true);view.setUint16(34,16,true);put(36,'data');view.setUint32(40,n*channels*2,true);
    const streams=Array.from({length:channels},(_,i)=>decoded.getChannelData(i));
    let pos=44;
    for(let i=a;i<b;i++)for(let c=0;c<channels;c++){
      const sample=Math.max(-1,Math.min(1,streams[c][i]));
      view.setInt16(pos,sample<0?sample*32768:sample*32767,true);pos+=2;
    }
    return new Blob([buf],{type:'audio/wav'});
  }finally{void context.close();}
}

export default function FeatureStudio({initialLrc='',initialAudio=null}:Props){
  const [raw,setRaw]=useState(initialLrc);
  const [audio,setAudio]=useState<File|null>(initialAudio);
  const [audioUrl,setAudioUrl]=useState('');
  const [activeTab,setActiveTab]=useState<Feature>('karaoke');
  const [time,setTime]=useState(0),[duration,setDuration]=useState(0);
  const [loop,setLoop]=useState<number|null>(null);
  const [taps,setTaps]=useState<number[]>([]);
  const [hookIndex,setHookIndex]=useState(0),[clipStart,setClipStart]=useState(0),[clipSeconds,setClipSeconds]=useState(25);
  const [renamed,setRenamed]=useState<Record<number,string>>({});
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const player=useRef<HTMLAudioElement>(null);
  const lrc=useMemo(()=>parseLrc(raw),[raw]);
  const spoken=useMemo(()=>lyricLines(lrc.lines),[lrc]);
  const sections=useMemo(()=>detectSections(lrc.lines,duration),[lrc,duration]);
  const hooks=useMemo(()=>detectHooks(lrc.lines,duration),[lrc,duration]);
  const current=useMemo(()=>timedKaraokeLine(lrc.lines,time),[lrc,time]);
  const title=lrc.metadata.find(x=>x.toLowerCase().startsWith('[ti:'))?.slice(4,-1)||'My Song';

  useEffect(()=>{setRaw(initialLrc);},[initialLrc]);
  useEffect(()=>{setAudio(initialAudio);},[initialAudio]);
  useEffect(()=>{if(!audio){setAudioUrl('');return;}const url=URL.createObjectURL(audio);setAudioUrl(url);return()=>URL.revokeObjectURL(url);},[audio]);
  useEffect(()=>{setTaps([]);setLoop(null);setRenamed({});},[raw]);
  useEffect(()=>{const h=hooks[hookIndex];if(!h)return;setClipStart(h.start);setClipSeconds(Math.round(Math.max(15,Math.min(30,h.end-h.start))));},[hooks,hookIndex]);

  function seek(at:number){const el=player.current;if(!el)return;el.currentTime=Math.max(0,at);setTime(el.currentTime);void el.play().catch(()=>setStatus('Tap Play in the audio player to begin.'));}
  function onTick(){
    const el=player.current;if(!el)return;const at=el.currentTime;setTime(at);
    const s=loop!==null?sections[loop]:undefined;
    if(s&&at>=s.end-.05){el.currentTime=s.start;setTime(s.start);}
  }
  async function saveHook(){
    if(!audio)return;setBusy(true);setStatus('Rendering WAV clip from your recording…');
    try{
      const clip=await makeWavClip(audio,clipStart,clipStart+clipSeconds);
      download(clip,filename(title)+'-hook-'+Math.round(clipStart)+'.wav');
      setStatus('WAV hook clip downloaded.');
    }catch(err){setStatus(err instanceof Error?err.message:'Could not export hook.');}
    finally{setBusy(false);}
  }
  function saveMap(){
    const data={title,source:'LRC Forge',sections:sections.map((s,i)=>({label:renamed[i]||s.label,start:s.start,end:s.end,lyrics:s.lines.map(l=>l.text)}))};
    download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),filename(title)+'-song-map.json');setStatus('Arrangement map downloaded.');
  }
  const result=scoreTappedEntries(spoken.map(w=>w.seconds),taps);
  return <section className="forge-workshop" id="forge-workshop">
    <div className="forge-workshop-head">
      <p className="font-mono text-xs text-gold tracking-widest uppercase">LRC Forge · Creative workshop</p>
      <h2 className="font-display uppercase text-4xl sm:text-5xl mt-2">Beyond the LRC</h2>
      <p className="font-serif italic text-lg mt-2 opacity-80">Karaoke, lyric videos, entry timing, hook clips and song structure, all from the same lyrics.</p>
    </div>
    <div className="border-2 border-ink p-4 sm:p-6 bg-paper space-y-4">
      {!initialLrc&&<label className="block">
        <span className="font-mono text-xs font-bold">01 · Choose a timed .lrc file</span>
        <input type="file" accept=".lrc,text/plain" className="block w-full p-3 mt-2 border-2 border-ink" onChange={async e=>{const f=e.currentTarget.files?.[0];if(f){if(f.size>512000){setStatus('LRC must be under 500 KB.');return;}setRaw(await f.text());setStatus('');}}}/>
      </label>}
      <label className="block">
        <span className="font-mono text-xs font-bold">{initialLrc?'Recording':'02 · Choose the original audio'} · private to this browser</span>
        <input type="file" accept=".mp3,.m4a,.wav,.aac,.flac,.ogg,.webm,audio/*" className="block w-full p-3 mt-2 border-2 border-ink" onChange={e=>{setAudio(e.currentTarget.files?.[0]||null);setLoop(null);setTime(0);}}/>
      </label>
      {audio&&<p className="text-xs text-mute break-all">Loaded: {audio.name}</p>}
      {!spoken.length&&<div className="p-3 border-l-4 border-gold bg-gold/10 text-sm">Generate a timed LRC in the main studio first, or import your existing .lrc above. A recording alone does not contain lyric timestamps.</div>}
      <audio ref={player} src={audioUrl||undefined} controls preload="metadata" className="w-full" aria-label="Workshop audio" onTimeUpdate={onTick} onSeeked={onTick} onLoadedMetadata={e=>setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:0)}/>
      <p className="font-mono text-xs text-mute">{clock(time)} / {clock(duration)} · {spoken.length} timed lines · {sections.length} sections</p>
      <div role="tablist" aria-label="LRC tools" className="forge-tabs">
        {tabs.map(t=><button key={t.key} role="tab" aria-selected={activeTab===t.key} className={activeTab===t.key?'forge-tab-selected':''} onClick={()=>{setActiveTab(t.key);setLoop(null);setStatus('');}}>{t.title}</button>)}
      </div>

      {activeTab==='karaoke'&&<div role="tabpanel" className="space-y-4">
        <div className="forge-panel-heading"><h3>Karaoke player</h3><p>Follow timed lines, jump to a phrase, and loop verses or choruses. Highlight progression is estimated within each line; LRC itself does not provide exact word timestamps.</p></div>
        <div className="forge-karaoke-stage">
          {current?<>
            <div className="forge-karaoke-secondary">{spoken[current.index-1]?.text||'♪'}</div>
            <div className="forge-karaoke-current"><span className="forge-karaoke-highlight" style={{width:Math.round(current.fraction*100)+'%'}}/><span className="relative z-10">{current.text}</span></div>
            <div className="forge-karaoke-secondary">{spoken[current.index+1]?.text||'♪'}</div>
          </>:<p className="text-center">Play a recording to follow the lyrics</p>}
        </div>
        <label className="block font-mono text-xs">Loop a section
          <select className="w-full block border-2 border-ink bg-paper p-3 mt-1" value={loop===null?'':String(loop)} onChange={e=>{const index=e.target.value===''?null:Number(e.target.value);setLoop(index);if(index!==null)seek(sections[index].start);}}>
            <option value="">Full song</option>
            {sections.map((s,i)=><option key={i} value={String(i)}>{s.label} · {clock(s.start)}–{clock(s.end)}</option>)}
          </select>
        </label>
        <div className="max-h-48 overflow-auto divide-y divide-ink/10 border border-ink/20">
          {spoken.map((line,i)=><button type="button" key={i} onClick={()=>seek(line.seconds)} className={'block w-full p-2 text-sm text-left '+(i===current?.index?'bg-gold/25 font-bold':'')}>{clock(line.seconds)} · {line.text}</button>)}
        </div>
      </div>}
      {activeTab==='video'&&<div role="tabpanel"><LyricVideoExport lines={lrc.lines} audioFile={audio} title={title}/></div>}
      {activeTab==='timing'&&<div role="tabpanel" className="space-y-4">
        <div className="forge-panel-heading"><h3>Vocal timing practice</h3><p>Listen to your vocal take and tap as each line begins; see how early or late each tap was against the LRC. This is a manual onset practice tool, not automatic vocal recognition or pitch coaching.</p></div>
        <div className="forge-timing-target"><div className="font-mono text-xs opacity-60">NEXT LINE {taps.length+1} / {spoken.length}</div><div className="font-serif italic text-3xl my-4">{spoken[taps.length]?.text||'Practice complete'}</div><div className="font-mono text-xs">Expected at {spoken[taps.length]?clock(spoken[taps.length].seconds):'—'}</div></div>
        <div className="flex flex-wrap gap-3">
          <button disabled={!audio||taps.length>=spoken.length} className="px-5 py-3 bg-blood text-paper font-display text-xl uppercase disabled:opacity-40" onClick={()=>{if(player.current)setTaps(x=>[...x,player.current!.currentTime]);}}>Tap lyric entry</button>
          <button className="px-4 py-3 border-2 border-ink font-mono text-xs" onClick={()=>{setTaps([]);if(spoken.length)seek(spoken[0].seconds);}}>Restart</button>
        </div>
        {!!result.length&&<div className="border border-ink divide-y divide-ink/20 max-h-48 overflow-auto">
          {result.slice(-12).map((r,i)=><div key={i} className="flex justify-between p-2 font-mono text-xs"><span>{r.verdict}</span><strong>{r.difference>0?'+':''}{r.difference.toFixed(2)}s</strong></div>)}
          <p className="p-2 font-mono text-xs font-bold">Average deviation: {(result.reduce((sum,r)=>sum+Math.abs(r.difference),0)/result.length).toFixed(2)}s</p>
        </div>}
      </div>}
      {activeTab==='snippets'&&<div role="tabpanel" className="space-y-4">
        <div className="forge-panel-heading"><h3>Hook extractor</h3><p>Chorus labels and repeated lines suggest strong 15–30-second moments. Adjust the clip and download an actual WAV. This is a lyrics-based ranking, not an audio-based hit predictor.</p></div>
        {hooks.map((h,i)=><button key={i} className={'w-full block text-left p-3 border-2 '+(hookIndex===i?'border-blood bg-gold/10':'border-ink/20')} onClick={()=>{setHookIndex(i);seek(h.start);}}><strong className="font-display text-lg uppercase">{h.label}</strong><span className="font-mono text-xs ml-3">{clock(h.start)}–{clock(h.end)}</span><p className="font-serif italic">{h.excerpt}</p></button>)}
        {!hooks.length&&<p className="text-sm">Not enough lyrics to suggest a hook.</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="font-mono text-xs">Start · seconds<input type="number" className="w-full block mt-1 border-2 border-ink p-3" step=".1" min={0} value={clipStart} onChange={e=>setClipStart(Math.max(0,Number(e.target.value)))}/></label>
          <label className="font-mono text-xs">Duration<select className="w-full block mt-1 border-2 border-ink p-3" value={clipSeconds} onChange={e=>setClipSeconds(Number(e.target.value))}><option value={15}>15 seconds</option><option value={20}>20 seconds</option><option value={25}>25 seconds</option><option value={30}>30 seconds</option></select></label>
        </div>
        <div className="flex flex-wrap gap-3"><button disabled={!audio} onClick={()=>seek(clipStart)} className="border-2 border-ink px-4 py-3 text-sm disabled:opacity-40">Preview clip ▶</button><button disabled={!audio||busy} onClick={()=>void saveHook()} className="bg-blood text-paper px-4 py-3 text-sm disabled:opacity-40">{busy?'Exporting…':'Download WAV clip'}</button></div>
      </div>}
      {activeTab==='structure'&&<div role="tabpanel" className="space-y-4">
        <div className="forge-panel-heading"><h3>Song structure mapper</h3><p>Automatically detects section tags and lyric gaps, and recognizes repeated refrains. Correct the labels and export a timestamped JSON arrangement for INK.</p></div>
        {sections.map((s,i)=><div key={i} className="p-3 border-2 border-ink/20">
          <div className="flex gap-2 items-center flex-wrap"><input aria-label={'Section '+(i+1)+' name'} className="flex-1 min-w-36 font-display text-xl uppercase border-b-2 border-ink bg-paper" value={renamed[i]??s.label} onChange={e=>setRenamed(x=>({...x,[i]:e.target.value}))}/><button className="border border-ink p-2 text-xs font-mono" onClick={()=>seek(s.start)}>{clock(s.start)}–{clock(s.end)} ▶</button></div>
          <p className="font-serif italic text-sm mt-2">{s.lines.slice(0,3).map(l=>l.text).join(' / ')}</p>
        </div>)}
        {!sections.length&&<p className="text-sm">Load timed lyrics to detect structure.</p>}
        <button disabled={!sections.length} onClick={saveMap} className="bg-ink text-paper font-mono text-xs p-3 disabled:opacity-40">Download INK song map (JSON)</button>
      </div>}
      {status&&<p role="status" className="p-3 bg-gold/15 border-l-4 border-blood font-mono text-sm">{status}</p>}
      <p className="font-mono text-xs text-mute">Audio stays on your device. The .lrc supplies line timestamps; precise per-word analysis requires additional alignment.</p>
    </div>
  </section>;
}