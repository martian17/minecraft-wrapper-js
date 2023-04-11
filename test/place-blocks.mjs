import {World} from "../lib/index.mjs";

const path = process.argv[2];

if(!path){
    console.log("please specify a path to the save data");
    process.exit();
}

const world = new World(path);
const dim = world.overworld;


await dim.setBlock(0,-60,0,{Name:"minecraft:deepslate"});
await dim.setBlock(1,-60,0,{Name:"minecraft:exposed_cut_copper_stairs"});
await dim.setBlock(2,-60,0,{Name:"minecraft:wither_skeleton_skull"});
await dim.setBlock(3,-60,0,{Name:"minecraft:water"});


console.log(await dim.getBlock(0,-60,0));
console.log(await dim.getBlock(1,-60,0));
console.log(await dim.getBlock(2,-60,0));
console.log(await dim.getBlock(3,-60,0));


console.log("saving");
await dim.save();
console.log("saved");

