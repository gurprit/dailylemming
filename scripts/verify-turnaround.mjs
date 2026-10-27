// Verify a true multi-Lix Blocker rescue, no automatic/no-skill success.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path'; import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import {parseLix,sourceAssets} from '../src/lix/parse.js';
import {detectLixFrames,cutLixFrame} from '../src/lix/frames.js';
import {LixGameModel} from '../src/lix/game.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const level=parseLix(await readFile(path.join(root,'content/original/turnaround.txt'),'utf8'));
const images=new Map();
for(const name of sourceAssets(level)){
 const png=PNG.sync.read(await readFile(path.join(root,'public/lix/images',name)));
 const data=cutLixFrame(png,detectLixFrames(png));
 images.set(name,{data,canvas:{width:data.width,height:data.height}});
}
function simulate(at=null){
 const model=new LixGameModel(level,images,{maxSeconds:100});
 model.togglePause();let assigned=false;
 for(let i=0;i<1500&&!model.done;i++){
  const u=model.units[0];
  if(at!==null&&!assigned&&u?.state==='walking'&&u.grounded&&u.vx<0&&u.x<=at){
   assigned=model.assignSkill('blocker',0);
  }
  model.tick();
 }
 return {at,assigned,saved:model.saved,lost:model.lost,won:model.won,
  used:model.assigned,seconds:model.seconds,spawned:model.spawned,
  blocks:model.events.filter(e=>e.type==='blocked').length,
  states:model.units.map(u=>({x:u.x,y:u.y,state:u.state,vx:u.vx}))};
}
const trials=[];
for(let at=250;at>=200;at-=2)trials.push(simulate(at));
const successes=trials.filter(x=>x.won&&x.saved>=2&&x.used===1&&x.blocks>=2);
const idle=simulate();
const report={title:level.title,successes,trials,withoutBlocker:idle};
await mkdir(path.join(root,'generated/lix'),{recursive:true});
await writeFile(path.join(root,'generated/lix/turnaround-proof.json'),JSON.stringify(report,null,2)+'\n');
console.log('Turnaround real-art crowd test:',JSON.stringify({successfulStarts:successes.map(x=>x.at),best:successes[0]||null,withoutBlocker:idle}));
if(successes.length<3||idle.won)throw new Error('Turnaround must need a Blocker to save two walkers');
