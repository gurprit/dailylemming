// Real-asset proof for the intermediate Double Trouble puzzle. Unlike
// imported community previews, only call this verified after a two-builder win.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { parseLix, sourceAssets } from '../src/lix/parse.js';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';
import { LixGameModel } from '../src/lix/game.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const level = parseLix(await readFile(path.join(root, 'content/original/double-trouble.txt'),'utf8'));
const assets = new Map();
for (const asset of sourceAssets(level)) {
  const raw = PNG.sync.read(await readFile(path.join(root,'public/lix/images',asset)));
  const layout = detectLixFrames(raw);
  const frame = cutLixFrame(raw, layout);
  assets.set(asset,{data:frame,canvas:{width:frame.width,height:frame.height}});
}
let successes=[];
for (let start1=220; start1<=248; start1+=4) {
  for (let start2=428; start2<=460; start2+=4) {
    const m=new LixGameModel(level,assets);
    m.togglePause();
    let first=false,second=false;
    for(let tick=0;tick<1500 && !m.done;tick++){
      const u=m.units[0];
      if (u?.state==='walking'&&u.grounded&&u.vx>0){
        if (!first && u.x>=start1) first=m.assignBuilder(0);
        else if(first&&!second&&u.x>=start2) second=m.assignBuilder(0);
      }
      m.tick();
    }
    if(m.won&&m.assigned===2) successes.push({start1,start2,seconds:m.seconds,saved:m.saved});
  }
}
const noSkills=new LixGameModel(level,assets);
noSkills.togglePause();
for(let i=0;i<1500&&!noSkills.done;i++)noSkills.tick();
const result={title:level.title,solutions:successes.slice(0,25),
  count:successes.length,required:level.numeric.REQUIRED,
  noSkillsWon:noSkills.won};
await mkdir(path.join(root,'generated/lix'),{recursive:true});
await writeFile(path.join(root,'generated/lix/double-trouble-proof.json'),
  JSON.stringify(result,null,2)+'\n');
console.log('Double Trouble two-builder proof:',JSON.stringify({
  count:result.count,first:successes[0]||null,noSkillsWon:result.noSkillsWon}));
if(!successes.length||noSkills.won)
  throw new Error('Double Trouble is not demonstrated solvable by two builders');
