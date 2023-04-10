import {World} from "../index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";
import {encodeRNBT, decodeRNBT} from "rnbt";
import {encodeNBT, decodeNBT, NBT_Long} from "nbt.js";


let [savedir, x=0, y=-64, z=0] = process.argv.slice(2);
[x,y,z] = [x,y,z].map(v=>parseInt(v));

if(!savedir){
    console.log("please specify a path to the save data");
    process.exit();
}

console.log(`Opening save directory ${savedir}`);
const world = new World(savedir);
const dim = world.overworld;
console.log(`Getting the block at x=${x} y=${y} z=${z}`);
console.log(await dim.getBlock(x,y,z));

