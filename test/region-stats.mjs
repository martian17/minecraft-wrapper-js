import {World} from "../index.mjs";
import {intdiv,convertEndian} from "../util.mjs";
import {newarr} from "../ds-js/arrutil.mjs";

const path = process.argv[2];
const [x=0,y=0,z=0] = process.argv.slice(3).map(v=>parseInt(v));

if(!path){
    console.log("please specify a path to the save data");
    process.exit();
}

const world = new World(path);
const dim = world.overworld;

const region = await dim.getRegion(x,z);

const displayRegion = function(){
    const {i32} = this;
    const grid = newarr(32).map(_=>newarr(32).map(_=>"__"));
    for(let i = 0; i < 1024; i++){
        const x = i%32;
        const z = intdiv(i,32);
        if(i32[i] !== 0)grid[z][x] = "██";
    }
    console.log("region overview");
    console.log(grid.map(r=>r.join("")).join("\n"));
}.bind(region);

displayRegion();


const regionstats = [];

for(let z = 0; z < 32; z++){
    for(let x = 0; x < 32; x++){
        const id = z*32+x;
        if(region.i32[id] === 0)
            continue;
            //throw new Error("Chunk does not exist within the region");
        let [offset,size,timestamp] = region.getChunkData(id);
        offset /= 4096;
        size /= 4096;
        if(size !== 1)console.log(size,offset);

        // const chunkmeta = convertEndian(region.i32[id]);
        // const offset_ = (chunkmeta>>>8);
        // const size_ = (chunkmeta&0xff);
        // console.log(size_);

        //console.log((await region.getChunkBuffer(id)).length);
        regionstats.push([offset,size,timestamp,id,x,z]);
        if(10 < id && id < 1000)continue;
        console.log(`x:${x} z:${z} offset:${offset} size:${size} ${new Date(timestamp*1000)}`);
    }
}

regionstats.sort((a,b)=>a[0]-b[0]);

console.log("sorted regions");
regionstats.map((r,i)=>{
    const [offset,size,timestamp,id,x,z] = r;
    if(10 < id && id < 1000)return;
    console.log(`x:${x} z:${z} offset:${offset} size:${size} ${new Date(timestamp*1000)}`);
});


console.log("sorted by region size");
regionstats.sort((a,b)=>a[1]-b[1]);
regionstats.map((r,i)=>{
    const [offset,size,timestamp,id,x,z] = r;
    if(10 < id && id < 1000)return;
    console.log(`x:${x} z:${z} offset:${offset} size:${size} ${new Date(timestamp*1000)}`);
});

