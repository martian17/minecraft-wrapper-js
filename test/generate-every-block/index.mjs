import {World} from "../../lib/index.mjs";
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


import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
import {exec as exec_base} from "child_process";
const exec = util.promisify(exec_base);


import McVersions from "../../scripts/mc-versions.mjs";


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

const level = decodeRNBT(""+await fs.readFile(Path.join(__dirname,"../fixtures/level-blank-noon.rnbt")));

level[""].Data.LevelName = worldName;
level[""].Data.LastPlayed = new NBT_Long(BigInt(Date.now()));

await fs.writeFile(Path.join(worldPath,"level.dat"),await gzip(encodeNBT(level)));

console.log("World config complete");



console.log("");
let version;
while(true){
    version = await rl.question(`Please select the minecraft version to extract blocks from [default=empty: ${McVersions.latest} (latest)]: `);
    if(version === "")version = McVersions.latest;
    if(!McVersions.exists(version)){
        console.log("Error: Please give a valid minecraft version");
        continue;
    }
    break;
}
console.log(`Extracting block data from ${version}`);

const jarBuffer = await McVersions.getClientJar(version);
await exec(`
rm -rf ${tmpdir}
mkdir ${tmpdir}
`);
await fs.writeFile(Path.join(tmpdir,"client.jar"),jarBuffer);
await exec(`
cd ${tmpdir}
unzip -qq client.jar -d ./client
`);
let states = await fs.readdir(Path.join(tmpdir,"client/assets/minecraft/blockstates"));
states = states.filter(v=>v.slice(-5) === ".json").map(v=>v.slice(0,-5));

console.log("\nBlock ID extraction complete");


const regionPath = Path.join(worldPath,"region");
await fs.mkdir(regionPath);
//await fs.mkdir(Path.join(worldPath,"DIM-1"));
//await fs.mkdir(Path.join(worldPath,"DIM1"));

const world = new World(worldPath);
const dim = world.overworld;
dim.allowChunkGeneration = true;
for(let x = 0; x < Math.ceil(states.length/21*3/16)*16; x++){
    for(let z = 0; z < Math.ceil(21*3/16)*16; z++){
        await dim.setBlock(x,-64,z,{Name:"minecraft:deepslate"});
    }
}
console.log("Placing every blocks found in the given version");
for(let i = 0; i < states.length; i++){
    const bname = states[i];
    const z = (i%21)*3;
    const x = Math.floor(i/21)*3;
    await dim.setBlock(x,-63,z,{Name:`minecraft:${bname}`});
}
console.log("Block placement complete");

console.log("Filling void");
const white_concrete = {Name:"minecraft:white_concrete"};
for(let [rx,rz,region] of dim.regionCache){
    for(let [id,chunk] of region.chunkCache){
        const x0 = rx*512+(id%32)*16;
        const z0 = rz*512+Math.floor(id/32)*16;
        for(let cx = 0; cx < 16; cx++){
            for(let cz = 0; cz < 16; cz++){
                const x = x0+cx;
                const z = z0+cz;
                //console.log(await dim.getBlock);
                if((await dim.getBlock(x,-64,z)).Name === "minecraft:air")
                    await dim.setBlock(x,-64,z,white_concrete);
            }
        }
    }
}
console.log("Filled void");

await dim.save();

console.log(`World saved. Now open ${worldName} in your minecraft client.`);


process.exit();











