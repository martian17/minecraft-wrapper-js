import {World} from "../../index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";
import {encodeRNBT, decodeRNBT} from "rnbt";
import {encodeNBT, decodeNBT, NBT_Long} from "nbt.js";

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
const rl = readline.createInterface({ input, output });

import Path from "path";
import { homedir } from "os";
const userHomeDir = homedir();


import util from "util";
import zlib from "zlib";
const gunzip = util.promisify(zlib.gunzip);
const gzip = util.promisify(zlib.gzip);



console.log("Creating a test world");
let defaultMcDir;
if(process.platform === "win32"){
    defaultMcDir = Path.join(userHomeDir,"AppData/Roaming/.minecraft/");
}else if(process.platform === "darwin"){
    defaultMcDir = Path.join(userHomeDir,"Library/Application Support/minecraft/");
}else if(process.platform === "linux"){
    defaultMcDir = Path.join(userHomeDir,".minecraft/");
}else{
    console.log(`Unsupported OS ${process.platform}`);
    process.exit(1);
}
let mcRoot = await rl.question(`\nSpecify the Minecraft root directory\n[default=empty: ${defaultMcDir}]: `);
if(mcRoot === "")
    mcRoot = defaultMcDir;
console.log(`Set the root directory to ${mcRoot}`);


let worldName = await rl.question(`\nChoose the world name\n[default=empty: TEST_EVERY_BLOCKS]: `);
if(worldName === "")
    worldName = "TEST_EVERY_BLOCKS";
console.log(`Picked the world name ${worldName}`);

const worldPath = Path.join(mcRoot,"saves",worldName);

console.log(`Creating the test world at ${worldPath}`);

//check if file exists
let exists = true;
try{
    await fs.stat(worldPath)
}catch(err){
    if(err.code === "ENOENT"){
        exists = false;
    }
}

if(exists){
    let yn = await rl.question(`${worldPath} already exists, do you want to overwrite? [Y/n]: `);
    if(yn !== "" && yn.trim()[0].toLowerCase() === "n"){
        console.log("Aborting");
        process.exit(1);
    }else{
        console.log(`Overwriting ${worldPath}`);
        await fs.rm(worldPath,{recursive:true,force:true});
    }
}

await fs.mkdir(worldPath);

const level = decodeRNBT(""+await fs.readFile("./level.rnbt"));

level[""].Data.LevelName = worldName;
level[""].Data.LastPlayed = new NBT_Long(BigInt(Date.now()));

await fs.writeFile(Path.join(worldPath,"level.dat"),await gzip(encodeNBT(level)));

console.log("World config complete");

const regionPath = Path.join(worldPath,"region");
await fs.mkdir(regionPath);
//await fs.mkdir(Path.join(worldPath,"DIM-1"));
//await fs.mkdir(Path.join(worldPath,"DIM1"));

const world = new World(worldPath);
const dim = world.overworld;
dim.allowChunkGeneration = true;
for(let x = 0; x < 16; x++){
    for(let z = 0; z < 16; z++){
        await dim.setBlock(x,-64,z,{Name:"minecraft:deepslate"});
    }
}
await dim.save();

console.log("Set block complete");


process.exit();











