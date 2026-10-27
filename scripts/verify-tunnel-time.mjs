// Prove the player can tunnel to freedom using original terrain PNGs.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { parseLix, sourceAssets } from '../src/lix/parse.js';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';
import { LixGameModel } from '../src/lix/game.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const level = parseLix(await readFile(path.join(root,'content/original/tunnel-time.txt'),'utf8'));
const sprites = new Map();
for (const name of sourceAssets(level)) {
  const png = PNG.sync.read(await readFile(path.join(root,'public/lix/images',name)));
  const frame = cutLixFrame(png, detectLixFrames(png));
  sprites.set(name,{data:frame,canvas:{width:frame.width,height:frame.height}});
}
const results = [];
for(let x=282;x<=300;x+=2){
  const model = new LixGameModel(level,sprites,{maxSeconds:120});
  model.togglePause();
  let used=false;
  for(let n=0;n<1700 && !model.done;n++){
    const u=model.units[0];
    if(!used&&u?.state==='walking'&&u.grounded&&u.vx>0&&u.x>=x){
      used=model.assignSkill('basher',0);
    }
    model.tick();
  }
  if(model.won&&model.assigned===1)
    results.push({x,saved:model.saved,seconds:model.seconds,events:model.events.filter(e=>e.type==='bashed').length});
}
const idle=new LixGameModel(level,sprites,{maxSeconds:65});
idle.togglePause();
for(let n=0;n<1000&&!idle.done;n++)idle.tick();
const report={stage:level.title,successfulStarts:results,withoutSkillWon:idle.won};
await mkdir(path.join(root,'generated/lix'),{recursive:true});
await writeFile(path.join(root,'generated/lix/tunnel-time-proof.json'),JSON.stringify(report,null,2)+'\n');
console.log('Tunnel Time real PNG proof:',JSON.stringify(report));
if(results.length<2||idle.won)throw new Error('Tunnel Time needs a reliable one-basher route and no-skill failure');
