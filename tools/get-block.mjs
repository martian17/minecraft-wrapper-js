import {World} from "../index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";
import {encodeRNBT, decodeRNBT} from "rnbt";
import {encodeNBT, decodeNBT, NBT_Long} from "nbt.js";


let [worldPath, x, y, z] = process.argv.slice(2);
[x,y,z] = [x,y,z].map(v=>parseInt(v));

const world = new World(worldPath);
const dim = world.overworld;

console.log(await dim.getBlock(x,y,z));

