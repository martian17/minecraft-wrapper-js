import {World} from "../index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";
import {encodeRNBT, decodeRNBT} from "rnbt";
import {encodeNBT, decodeNBT, NBT_Long} from "nbt.js";


let [worldPath, savePath, x=0, z=0] = process.argv.slice(2);
[x,z] = [x,z].map(v=>parseInt(v));


if(!worldPath || !savePath){
    console.log("please specify a path to the save data and output file path");
    process.exit();
}
console.log(`Opening save directory ${worldPath}`);
const world = new World(worldPath);
const dim = world.overworld;
console.log(`Getting the chunk at x=${x} z=${z}`);
const chunk = await dim.getChunk(x,z);
const nbt = {"":chunk.nbt};
console.log(encodeRNBT(nbt,true,2,true));
const rnbt = encodeRNBT(nbt,true,2,false);
await fs.writeFile(savePath,rnbt);
console.log(`Saved rnbt to ${savePath}`);

