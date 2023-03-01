import {World} from "../index.mjs";

const path = process.argv[2];
const [x=8,y=-61,z=9] = process.argv.slice(3).map(v=>parseInt(v));

if(!path){
    console.log("please specify a path to the save data");
    process.exit();
}

const world = new World(path);
const dim = world.overworld;

console.log(x,z);

const region = await dim.getRegion(x,z);
console.log(region.path);
const chunk = await dim.getChunk(x,z);
console.log(chunk.id);
//console.log(chunk.nbt.sections.map(s=>s.block_states));
console.log(chunk.sections[0]?.nbt?.block_states?.palette);
console.log(chunk.sections[1]?.nbt?.block_states?.palette);
console.log(chunk.sections[2]?.nbt?.block_states?.palette);

console.log(chunk.nbt);
console.log(chunk.nbt.block_entities);



