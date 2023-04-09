import {World} from "../index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";
import {encodeRNBT, decodeRNBT} from "rnbt";
import {encodeNBT, decodeNBT, NBT_Long} from "nbt.js";


let [worldPath, x, y, z, savePath] = process.argv.slice(2);
[x,y,z] = [x,y,z].map(v=>parseInt(v));

const world = new World(worldPath);
const dim = world.overworld;
const chunk = await dim.getChunk(x,z);
console.log(chunk);
const nbt = {"":chunk.nbt};
console.log(encodeRNBT(nbt,true,2,true));

const rnbt = encodeRNBT(nbt,true,2,false);
await fs.writeFile(savePath,rnbt);


