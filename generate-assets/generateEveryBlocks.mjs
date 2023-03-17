import {World} from "../index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";

const worldPath = process.argv[2];

if(!worldPath){
    console.log("please specify a path to the save data");
    process.exit();
}

let states = await fs.readdir("./temp/blockstates/");
states = states.filter(v=>v.slice(-5) === ".json").map(v=>v.slice(0,-5));

const world = new World(worldPath);
const dim = world.overworld;

for(let i = 0; i < states.length; i++){
    const bname = states[i];
    const z = (i%21)*3;
    const x = Math.floor(i/21)*3;
    await dim.setBlock(x,-63,z,{Name:`minecraft:${bname}`});
}


console.log("saving");
await dim.save();
console.log("saved");
