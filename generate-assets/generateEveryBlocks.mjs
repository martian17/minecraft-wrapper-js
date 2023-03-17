import {World} from "../index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";

const jarPath = process.argv[2];
const worldPath = process.argv[3];
//const [x=8,y=-61,z=9] = process.argv.slice(3).map(v=>parseInt(v));

if(!jarPath){
    console.log("pelase provide the jar path and path to the save data");
    process.exit();
}
if(!worldPath){
    console.log("please specify a path to the save data");
    process.exit();
}

//prepare ./temp
execSync(`
rm -rf ./temp
mkdir ./temp
cp ${jarPath} ./temp/mc.jar
mkdir ./temp/jar
unzip -qq ./temp/mc.jar -d ./temp/jar/
mv ./temp/jar/assets/minecraft/blockstates ./temp/
`.trim());






/*
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

*/


