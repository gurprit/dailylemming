// Native Lix basic tutorial asset/spawn compatibility check.
// This is a smoke test only, not a claim of original-level solvability.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import {parseLix,sourceAssets} from '../src/lix/parse.js';
import {detectLixFrames,cutLixFrame} from '../src/lix/frames.js';
import {LixGameModel} from '../src/lix/game.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tutorials=['builders','bashers','diggers','miners','blockers'];
for(const name of tutorials){
  const level=parseLix(await readFile(path.join(root,'content/lix/tutorial',name+'.txt'),'utf8'));
  const assets=new Map();
  for(const img of sourceAssets(level)){
    const png=PNG.sync.read(await readFile(path.join(root,'public/lix/images',img)));
    const cut=cutLixFrame(png,detectLixFrames(png));
    assets.set(img,{data:cut,canvas:{width:cut.width,height:cut.height}});
  }
  const model=new LixGameModel(level,assets,{maxSeconds:120});
  if(model.hatches.length<1||model.goals.length<1||model.terrain.pixels.length===0)
    throw Error(name+': expected hatch, goal and non-empty collision map');
  model.togglePause();
  for(let i=0;i<90&&!model.done;i++)model.tick();
  if(model.spawned<1||model.units.length<1)
    throw Error(name+': Lix never spawned');
  console.log(JSON.stringify({
    nativeTutorial:name,title:level.title,author:level.author,
    sprites:assets.size,placements:level.tiles.length,
    hatchCount:model.hatches.length,spawned:model.spawned,
    saved:model.saved,verifiedPlayable:false
  }));
}
