// Smoke-test genuine Lovely and ranked community maps using real PNG tiles.
// Loading, spawning and inventory validity do NOT constitute solution proofs.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { parseLix, sourceAssets } from '../src/lix/parse.js';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';
import { LixGameModel, PLAYABLE_SKILLS } from '../src/lix/game.js';
import { FEATURED_COMMUNITY_LEVELS } from '../src/lix/featured-levels.js';
import { RANKED_POOLS } from '../src/lix/ranked-levels.js';
import { LEVEL_OPTIONS } from '../src/lix/level-options.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rankedIds=[...new Set(Object.values(RANKED_POOLS).flat())];
for (const id of rankedIds) {
  const meta=LEVEL_OPTIONS[id];
  const levelFile=meta.category==='ranked-community'
    ? path.join(root,'content/lix/ranked',meta.rank,meta.communityFile+'.txt')
    : path.join(root,'content/lix/lovely',meta.communityFile+'.txt');
  const level=parseLix(await readFile(levelFile,'utf8'));
  const images=new Map();
  for (const img of sourceAssets(level)) {
    const png=PNG.sync.read(await readFile(path.join(root,'public/lix/images',img)));
    const frame=cutLixFrame(png,detectLixFrames(png));
    images.set(img,{data:frame,canvas:{width:frame.width,height:frame.height}});
  }
  const skills=Object.entries(level.skills)
    .filter(([name,count])=>count!==0 && name!=='EXPLODER2');
  if(skills.length<2 || skills.some(([name])=>!PLAYABLE_SKILLS.includes(name.toLowerCase())))
    throw Error('Missing multiple real skills: '+id);
  const model=new LixGameModel(level,images);
  model.togglePause();
  for (let t=0;t<Math.min(100,level.numeric.SPAWN_INTERVAL+15) && !model.done;t++)model.tick();
  if(!model.units.length || !model.terrain.pixels.length || !model.goals.length)
    throw Error('Incomplete community map: '+id);
  if(model.initial!==level.numeric.INITIAL || model.required!==level.numeric.REQUIRED)
    throw Error('Inconsistent Lix rescue quota: '+id);
  console.log(JSON.stringify({id,rank:meta.rank||'lovely',title:level.title,originalAuthor:level.author,
    tiles:level.tiles.length,skills:skills.map(([name,count])=>name+':'+count),
    pngs:images.size,initial:model.initial,required:model.required,
    spawned:model.spawned,solutionVerified:false}));
}
