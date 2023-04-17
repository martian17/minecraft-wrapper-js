import {World} from "#lib/index.mjs";
import {promises as fs} from "fs";
import {decodeRNBT} from "rnbt";
import {encodeNBT, NBT_Long} from "nbt.js";
import Path from "path";
import McVersions from "#scripts/mc-versions.mjs";
import {paths, inquire, resetDir, gzip, exec} from "#scripts/util.mjs";

console.log("Creating a test world");

// Getting WorldPath
const mcRoot = await inquire.mcRoot();
console.log(`Set the root directory to ${mcRoot}`);
const worldName = await inquire.worldName("TEST_EVERY_BLOCKS_LIT");
console.log(`Picked the world name ${worldName}`);
const worldPath = Path.join(mcRoot,"saves",worldName);

// Checking if the world already exists
if(!await inquire.overwriteIfExists(worldPath)){
    process.exit(0);
}

// Getting version
const version = await inquire.default("Please select the minecraft version to extract blocks from",{
    default: McVersions.latest,
    defaultDescription: "latest",
    checkValid: McVersions.exists,
    failMsg: "Please select a valid Minecraft version"
});

// Extracting every states
console.log(`Extracting block data from ${version}`);
const jarBuffer = await McVersions.getClientJar(version);
await resetDir(paths.tmp);
await fs.writeFile(Path.join(paths.tmp,"client.jar"),jarBuffer);
await exec(`
cd ${paths.tmp}
unzip -qq client.jar -d ./client
`);
let states = await fs.readdir(Path.join(paths.tmp,"client/assets/minecraft/blockstates"));
states = states.filter(v=>v.slice(-5) === ".json").map(v=>v.slice(0,-5));
console.log("\nBlock ID extraction complete");



// Actual world creation

// Preparing directories
console.log(`Creating a test world at ${worldPath}`);
await fs.mkdir(worldPath);
const regionPath = Path.join(worldPath,"region");
await fs.mkdir(regionPath);

// Configuring world
console.log("Configuring level.dat (world settings)");
const level = decodeRNBT(""+await fs.readFile(Path.join(paths.devAssets,"level-blank-noon.rnbt")));
level[""].Data.LevelName = worldName;
level[""].Data.LastPlayed = new NBT_Long(BigInt(Date.now()));
level[""].Data.DayTime = new NBT_Long(BigInt(18000));
await fs.writeFile(Path.join(worldPath,"level.dat"),await gzip(encodeNBT(level)));
console.log("level.dat config complete");

// Generating blocks
const world = new World(worldPath);
const dim = world.overworld;
dim.allowChunkGeneration = true;
for(let x = 0; x < Math.ceil(states.length/21*3/16)*16; x++){
    for(let z = 0; z < Math.ceil(21*3/16)*16; z++){
        await dim.setBlock(x,-64,z,{Name:"minecraft:deepslate"});
    }
}
console.log("Placing every blocks found in the given version (This may take a while because of lighting update)");
for(let i = 0; i < states.length; i++){
    const bname = states[i];
    const z = (i%21)*3;
    const x = Math.floor(i/21)*3;
    await dim.setBlock(x,-63,z,{Name:`minecraft:${bname}`});
    await dim.setBlock(x+1,-63,z,{Name:`minecraft:torch`});
}
console.log("Block placement complete");

console.log("Patching holes on the ground");
const white_concrete = {Name:"minecraft:white_concrete"};
for(let [rx,rz,region] of dim.regionCache){
    for(let [id,chunk] of region.chunkCache){
        const x0 = rx*512+(id%32)*16;
        const z0 = rz*512+Math.floor(id/32)*16;
        console.log("c",x0,z0,rx,rz);
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
console.log("Patched remaining holes");

await dim.save();

console.log(`World saved. Now open ${worldName} in your minecraft client.`);


process.exit();











