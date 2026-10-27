// Find a genuine one-Digger solution against the exact original CC0 PNGs.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { parseLix, sourceAssets } from '../src/lix/parse.js';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';
import { LixGameModel } from '../src/lix/game.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const level=parseLix(await readFile(path.join(root,'content/original/dig-for-freedom.txt'),'utf8'));
const images=new Map();
for(const name of sourceAssets(level)){
  const png=PNG.sync.read(await readFile(path.join(root,'public/lix/images',name)));
  const frame=cutLixFrame(png,detectLixFrames(png));
  images.set(name,{data:frame,canvas:{width:frame.width,height:frame.height}});
}
const solutions=[];
for(let x=92;x<=244;x+=8){
  const m=new LixGameModel(level,images,{maxSeconds:120});
  m.togglePause();
  let assigned=false;
  for(let i=0;i<1800&&!m.done;i++){
    const u=m.units[0];
    if(!assigned&&u?.state==='walking'&&u.grounded&&u.vx>0&&u.x>=x)
      assigned=m.assignSkill('digger',0);
    m.tick();
  }
  if(m.won&&m.assigned===1)solutions.push({x,seconds:m.seconds,
    digs:m.events.filter(e=>e.type==='dug').length,saved:m.saved});
}
const idle=new LixGameModel(level,images,{maxSeconds:60});
idle.togglePause();
for(let i=0;i<950&&!idle.done;i++)idle.tick();
const summary={level:level.title,count:solutions.length,solutions,
  withoutSkillWon:idle.won};
await mkdir(path.join(root,'generated/lix'),{recursive:true});
await writeFile(path.join(root,'generated/lix/dig-for-freedom-proof.json'),JSON.stringify(summary,null,2)+'\n');
console.log('Dig for Freedom actual-image proof:',JSON.stringify(summary));
if(solutions.length<3||idle.won)throw Error('Digger stage is not reliably solvable with one skill');
