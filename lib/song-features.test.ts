import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectSections, detectHooks, timedKaraokeLine, scoreTappedEntries } from './song-features.ts';

const lines = [
  {seconds:0,text:'[Verse 1]'},
  {seconds:2,text:'Watching a lonely sunrise'},
  {seconds:6,text:'Nothing ever stays the same'},
  {seconds:12,text:'[Chorus]'},
  {seconds:14,text:'Come on home again'},
  {seconds:18,text:'I will always be right here'},
  {seconds:22,text:'Come on home again'},
  {seconds:26,text:'I will always be right here'},
  {seconds:31,text:'[Verse 2]'},
  {seconds:35,text:'Walking through the evening'},
  {seconds:43,text:'[Chorus]'},
  {seconds:44,text:'Come on home again'},
  {seconds:48,text:'I will always be right here'},
  {seconds:52,text:'Come on home again'},
  {seconds:56,text:'I will always be right here'},
];
describe('feature helpers',()=>{
 it('recognizes explicit sections and retains order',()=>{
   const sections=detectSections(lines,65);
   assert.deepEqual(sections.map(s=>s.label),['Verse 1','Chorus','Verse 2','Chorus']);
   assert.equal(sections[1].start,12);
 });
 it('prioritizes repeated choruses for hook clips',()=>{
   const candidates=detectHooks(lines,65);
   assert.ok(candidates.length);
   assert.match(candidates[0].label,/chorus/i);
   assert.ok(candidates[0].end-candidates[0].start >= 15);
 });
 it('provides line-level progress without claiming word-level timestamps',()=>{
   const row=timedKaraokeLine(lines,20);
   assert.equal(row?.text,'I will always be right here');
   assert.ok((row?.fraction??0)>0&&(row?.fraction??1)<1);
 });
 it('tells early from late on deliberate manual taps',()=>{
   const rows=scoreTappedEntries([5,10,15],[4.8,10.02,15.5]);
   assert.deepEqual(rows.map(r=>r.verdict),['early','on-time','late']);
 });
});