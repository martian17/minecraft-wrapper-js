// extract chunk nbt as binary for use testing in nbt.mjs

import {promises as fs} from "fs"; 
import {World} from "../index.mjs";
//const world = new World("./world2");
const world = new World("/home/yutaro/.minecraft/saves/NBT_TEST");
const {overworld} = world;


const region = await overworld.getRegion(8,9);
console.log(`getting chunk data from region ${region.path}.`);
const chunkID = region.getChunkID(8,9);
console.log(`chunkID: ${chunkID}`);
const [offset,size,timestamp] = region.getChunkData(chunkID);
console.log(`offset: ${offset}
sector size (mul 4096): ${size/4096}
sector size (in bytes): ${size}
sector timestamp: ${timestamp}`);
const chunkbuff = await region.getChunkBuffer(chunkID);
console.log(`chunk buffer size: ${chunkbuff.length}`);
console.log(chunkbuff);

await fs.writeFile("out.nbt",chunkbuff);


