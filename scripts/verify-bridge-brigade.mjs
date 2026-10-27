// Search original-PNG routes requiring Blocker then Builder with three Lix.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path'; import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import {parseLix,sourceAssets} from '../src/lix/parse.js';
import {detectLixFrames,cutLixFrame} from '../src/lix/frames.js';
import {LixGameModel} from '../src/lix/game.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const level=parseLix(await readFile(path.join(root,'content/original/bridge-brigade.txt'),'utf8'));
const images=new Map();
for(const name of sourceAssets(level)){
  const png=PNG.sync.read(await readFile(path.join(root,'public/lix/images',name)));
  const frame=cutLixFrame(png,detectLixFrames(png));
  images.set(name,{data:frame,canvas:{width:frame.width,height:frame.height}});
}
function run(blockAt=234,bridgeAt=null){
  const model=new LixGameModel(level,images,{maxSeconds:100});
  model.togglePause();
  let blocker=false,builder=false;
  for(let i=0;i<1500&&!model.done;i++){
    const a=model.units[0],b=model.units[1];
    if(blockAt!==null && !blocker && a?.state==='walking'&&a.grounded&&a.vx<0&&a.x<=blockAt)
      blocker=model.assignSkill('blocker',0);
    if(bridgeAt!==null && blocker&&!builder&&b?.state==='walking'&&b.grounded&&b.vx>0&&b.x>=bridgeAt)
      builder=model.assignSkill('builder',1);
    model.tick();
  }
  return {won:model.won,saved:model.saved,used:model.assigned,
    spawned:model.spawned,seconds:model.seconds,
    blockers:model.events.filter(x=>x.type==='blocked').length,
    bricks:model.events.filter(x=>x.type==='brick').length,
    state:model.units.map(x=>({x:x.x,y:x.y,state:x.state})),
    blocker,builder};
}
const trials=[];
for(let x=464;x<=504;x+=2)trials.push({x,...run(234,x)});
const successful=trials.filter(x=>x.won&&x.saved>=2&&x.used===2&&x.blockers>=2&&x.bricks>=1&&x.seconds<100);
const idle=run(null,null),onlyBlocker=run(234,null),onlyBuilder=run(null,478);
const report={title:level.title,successful,trials,withoutSkills:idle,onlyBlocker,onlyBuilder};
await mkdir(path.join(root,'generated/lix'),{recursive:true});
await writeFile(path.join(root,'generated/lix/bridge-brigade-proof.json'),JSON.stringify(report,null,2)+'\n');
console.log('Bridge Brigade crowd-plus-bridge proof:',JSON.stringify({
winningBuilderX:successful.map(x=>x.x),first:successful[0]||null,
noSkillWin:idle.won,blockerOnlyWin:onlyBlocker.won,builderOnlyWin:onlyBuilder.won
}));
if(successful.length<3||idle.won||onlyBlocker.won||onlyBuilder.won)
 throw Error('Bridge Brigade is not reliably solvable using both Blocker and Builder');
