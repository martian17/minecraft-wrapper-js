// extract chunk nbt as binary for use testing in nbt.mjs

import {Dimension} from "../dimension.mjs";
import {execSync} from "child_process";
import {normalizeObject} from "../ds-js/objutil.mjs";
import {promises as fs} from "fs";

//prepare ./temp
execSync(`
rm -rf ./temp/*
cp ./testdata/r.0.0.mca ./temp/
`.trim());

const overworld = new Dimension("./temp"); 

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

await fs.writeFile("./testdata/out.nbt",chunkbuff);


