import {World} from "../index.mjs";

const path = process.argv[2];
const [x=0,y=-64,z=0] = process.argv.slice(3).map(v=>parseInt(v));

if(!path){
    console.log("please specify a path to the save data");
    process.exit();
}

const world = new World(path);
const dim = world.overworld;

console.log(`Getting the section at x=${x} y=${y} z=${z}`);

const region = await dim.getRegion(x,z);
console.log(region.path);
const chunk = await dim.getChunk(x,z);
console.log(chunk.getSection(y).nbt.block_states.palette);


