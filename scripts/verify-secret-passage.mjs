// Search two-skill winning routes using the exact CC0 Lix art and engine.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { parseLix, sourceAssets } from '../src/lix/parse.js';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';
import { LixGameModel } from '../src/lix/game.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const level=parseLix(await readFile(path.join(root,'content/original/secret-passage.txt'),'utf8'));
const images=new Map();
for(const name of sourceAssets(level)){
  const png=PNG.sync.read(await readFile(path.join(root,'public/lix/images',name)));
  const frame=cutLixFrame(png,detectLixFrames(png));
  images.set(name,{data:frame,canvas:{width:frame.width,height:frame.height}});
}
function run(mineAt,bashAt){
  const model=new LixGameModel(level,images,{maxSeconds:100});
  model.togglePause();
  let mined=false,bashed=false;
  for(let i=0;i<1500&&!model.done;i++){
    const u=model.units[0];
    if(u?.state==='walking'&&u.grounded&&u.vx>0){
      if(!mined&&mineAt!==null&&u.x>=mineAt)
        mined=model.assignSkill('miner',0);
      else if(mined&&!bashed&&bashAt!==null&&u.x>=bashAt
        && u.y>200) bashed=model.assignSkill('basher',0);
    }
    model.tick();
  }
  const firstUnit=model.units[0];
  return {won:model.won,seconds:model.seconds,saved:model.saved,
    used:model.assigned,mined,bashed,
    endX:firstUnit?.x,endY:firstUnit?.y,state:firstUnit?.state,turned:model.events.filter(e=>e.type==='turned').length,
    mines:model.events.filter(e=>e.type==='mined').length,
    bashes:model.events.filter(e=>e.type==='bashed').length,
    sampleEvents:model.events.filter(e=>['miner-finished','miner-steel','basher-finished','basher-steel','turned','landed','saved'].includes(e.type)).slice(-10)};
}
const wins=[], failures=[];
for(let mine=132;mine<=228;mine+=12)for(let bash=418;bash<=428;bash+=2){
  const r=run(mine,bash);
  if(r.won&&r.used===2&&r.mines>0&&r.bashes>0)wins.push({mine,bash,...r});
  else failures.push({mine,bash,...r});
}
const noSkills=run(null,null);
const minerOnly=run(160,null);
const report={title:level.title,wins:wins.slice(0,30),winningStarts:wins.length,
  noSkillsWon:noSkills.won,minerOnlyWon:minerOnly.won,failedCount:failures.length};
await mkdir(path.join(root,'generated/lix'),{recursive:true});
await writeFile(path.join(root,'generated/lix/secret-passage-proof.json'),JSON.stringify(report,null,2)+'\n');
console.log('Secret Passage two-skill real-PNG proof:',JSON.stringify({
  winningStarts:report.winningStarts,first:wins[0]||null,noSkillsWon:noSkills.won,
  minerOnlyWon:minerOnly.won, exampleFailure:failures.find(x=>x.mine===168&&x.bash===422),
  deepest:failures.filter(x=>x.mined).sort((a,b)=>a.endY-b.endY).at(-1)}));
if(wins.length<3||noSkills.won||minerOnly.won)
  throw new Error('Secret Passage must be reliably solvable with Miner + Basher but not without both');
