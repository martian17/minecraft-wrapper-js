import {World} from "../../lib/index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";
import {encodeRNBT, decodeRNBT} from "rnbt";
import {encodeNBT, decodeNBT, NBT_Long, NBT_Int} from "nbt.js";

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


import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
import {exec as exec_base} from "child_process";
const exec = util.promisify(exec_base);


import McVersions from "./mc-versions.mjs";


import os from "os";
const tmpdir = Path.join(os.tmpdir(),"slimejs");



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


let worldName = await rl.question(`\nChoose the world name\n[default=empty: TEST_LIGHT]: `);
if(worldName === "")
    worldName = "TEST_LIGHT";
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

const level = decodeRNBT(""+await fs.readFile(Path.join(__dirname,"../fixtures/level-blank-noon.rnbt")));

level[""].Data.LevelName = worldName;
level[""].Data.LastPlayed = new NBT_Long(BigInt(Date.now()));
level[""].Data.WorldGenSettings.dimensions["minecraft:overworld"].generator.settings.layers.push({
    block:"minecraft:air",
    height:new NBT_Int(1)
},{
    block:"minecraft:tinted_glass",
    height:new NBT_Int(1)
});
level[""].Data.DayTime = new NBT_Long(BigInt(18000));
level[""].Data.Player.Pos[1].value = -61;

await fs.writeFile(Path.join(worldPath,"level.dat"),await gzip(encodeNBT(level)));

console.log("World config complete");


const regionPath = Path.join(worldPath,"region");
await fs.mkdir(regionPath);
//await fs.mkdir(Path.join(worldPath,"DIM-1"));
//await fs.mkdir(Path.join(worldPath,"DIM1"));

const world = new World(worldPath);
const dim = world.overworld;
dim.allowChunkGeneration = true;
const white_concrete = {Name:"minecraft:white_concrete"};
const tinted_glass = {Name:"minecraft:tinted_glass"};
for(let x = -16; x < 256; x++){
    for(let z = -16; z < 256; z++){
        await dim.setBlock(x,-64,z,white_concrete);
        await dim.setBlock(x,-62,z,tinted_glass);
    }
}
console.log("Placing light emitting blocks");
await dim.setBlock(0,-63,0,{Name:"minecraft:torch"});
await dim.setBlock(8,-63,9,{Name:"minecraft:torch"});
await dim.setBlock(-1,-63,0,{Name:"minecraft:tinted_glass"});
await dim.setBlock(0,-63,-1,{Name:"minecraft:tinted_glass"});
await dim.setBlock(1,-63,-1,{Name:"minecraft:tinted_glass"});
await dim.setBlock(2,-63,-1,{Name:"minecraft:tinted_glass"});
await dim.setBlock(0,-63,1,{Name:"minecraft:tinted_glass"});
await dim.setBlock(1,-63,1,{Name:"minecraft:tinted_glass"});
await dim.setBlock(2,-63,1,{Name:"minecraft:tinted_glass"});
await dim.setBlock(3,-63,0,{Name:"minecraft:cornflower"});
console.log("Block placement complete");
await dim.save();

console.log(`World saved. Now open ${worldName} in your minecraft client.`);


process.exit();











