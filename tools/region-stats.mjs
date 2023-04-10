import {World} from "../index.mjs";
import {intdiv,reverseEndian} from "../util.mjs";
import {newarr} from "ds-js/arrutil.mjs";
import chalk from "chalk";

const savedir = process.argv[2];
const [x=0,y=0,z=0] = process.argv.slice(3).map(v=>parseInt(v));

if(!savedir){
    console.log("please specify a path to the save data");
    process.exit();
}

const world = new World(savedir);
const dim = world.overworld;

const region = await dim.getRegion(x,z);

const {data_header} = region;

console.log("\nRegion occupancy overview");
const displayRegion = function(){
    const grid = newarr(32).map(_=>newarr(32).map(_=>"__"));
    for(let i = 0; i < 1024; i++){
        const x = i%32;
        const z = intdiv(i,32);
        if(data_header[i] !== 0)grid[z][x] = chalk.rgb(x*8,z*8,(31-z)*8)("██");
    }
    console.log(grid.map(r=>r.join("")).join("\n"));
};

displayRegion();

const sectors = new Map;
let maxIdx = 2;

for(let z = 0; z < 32; z++){
    for(let x = 0; x < 32; x++){
        const id = z*32+x;
        if(data_header[id] === 0)
            continue;
        const [offset,size] = region.getHeaderBitfield(id);
        const timestamp = reverseEndian(region.timestamp_header[id]);
        for(let i = offset; i < offset+size; i++){
            sectors.set(i,id);
        }
        if(offset+size > maxIdx)maxIdx = offset+size;
    }
}

console.log("\nFile sector view (First two sectors are bitfield and timestamp)");

for(let i = 0; i < maxIdx; i++){
    if(i == 0){
        process.stdout.write(chalk.white.inverse("BF"));
    }else if(i === 1){
        process.stdout.write(chalk.yellow.inverse("TS"));
    }else if(sectors.has(i)){
        const id = sectors.get(i);
        const x = id%32;
        const z = intdiv(id,32);
        process.stdout.write(chalk.rgb(x*8,z*8,(31-z)*8)("██"));
    }else{
        process.stdout.write("__");
    }
    if((i+1)%32 === 0)process.stdout.write("\n");
}
console.log("");


