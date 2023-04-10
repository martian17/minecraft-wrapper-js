// Extract chunk nbt as binary for use testing in nbt.mjs

import {World} from "../index.mjs";
import {execSync} from "child_process";
import {normalizeObject} from "ds-js/objutil.mjs";
import {promises as fs} from "fs";
import chalk from "chalk";
import util from "util";
import zlib from "zlib";
const inflate = util.promisify(zlib.inflate);

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
const rl = readline.createInterface({ input, output });

const savedir = process.argv[2];
const outfile = process.argv[3];

if(!savedir || !outfile){
    console.log("Please provide an input save path and output file path.");
    process.exit();
}

// Get chunk buffer without calling decodeNBT
const world = new World(savedir);
const dim = world.overworld;
const region = await dim.getRegion(0,0);
const NBT_Buffer = await inflate(await region.getChunkBuffer(0));

console.log("Extracted buffer:",NBT_Buffer);

const yn = await rl.question(`Extracted a chunk at [x=0, z=0] as a binary buffer from ${chalk.yellow(savedir)}. Do you want to write it to ${chalk.yellow(outfile)}? [y/N]: `);
if(yn.trim().toLowerCase() !== "y")process.exit();
await fs.writeFile(outfile,NBT_Buffer);
console.log(`Chunk NBT extraction completed. Result is stored in ${chalk.yellow(outfile)}`);

process.exit();
