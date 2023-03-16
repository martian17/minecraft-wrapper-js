import {World} from "../index.mjs";

const path = process.argv[2];
//const [x=8,y=-61,z=9] = process.argv.slice(3).map(v=>parseInt(v));

if(!path){
    console.log("please specify a path to the save data");
    process.exit();
}

const world = new World(path);
const dim = world.overworld;

const chunk = await dim.getChunk(0,0);

await dim.setBlock(0,-60,0,{Name:"minecraft:deepslate"});
await dim.setBlock(1,-60,0,{Name:"minecraft:exposed_cut_copper_stairs"});
await dim.setBlock(2,-60,0,{Name:"minecraft:wither_skeleton_skull"});
await dim.setBlock(3,-60,0,{Name:"minecraft:water"});



console.log(await dim.getBlock(0,-60,0));

console.log("saving");
await dim.save();
console.log("saved");
//console.log(`single block edited in ${path} at x:${x} y:${y} z:${z} saved`);

