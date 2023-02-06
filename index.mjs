import {promises as fs} from "fs";
import * as Path from "path";
import {newarr, peek} from "./ds-js/arrutil.mjs";
import zlib from "zlib";
import {readNBT} from "./nbt.mjs";

class Chunk{
    constructor(u8_nbt,timestamp){
        this.timestamp = timestamp;
        const nbt = this.nbt = readNBT(zlib.inflateSync(zlib_data))[""];
        console.log(this.block_states[1].palette);
        this.
    }

}

class Region{
    constructor(path){
        this.path = path;
    }
    async init(){
        let {path} = this;
        //throws err when file DNE
        this.buffer = await fs.readFile(path);
        this.i32 = new Int32Array(this.buffer.buffer);
        this.u8 = new Uint8Array(this.buffer.buffer);
        return this;
    }
    chunks = new Map;
    async getChunk(x,z){//x and z are relative to this region
        const {chunks,i32,u8} = this;
        const cx = intdiv(x,16);
        const cz = intdiv(z,16);
        const chunkID = cz*32+cx;
        if(chunks.has(chunkID))return chunks.get(chunkID);
        
        //if not cached, check if the chunk exists within the buffer
        const chunkPtr = i32[id];
        if(chunkPtr === 0)
            throw new Error("Chunk does not exist within the region");
        const timestamp = convertEndian(i32[id+1024]);
        const [offset_4k,size_4k] = decodeChunkPointer(chunkPtr);
        const offset = offset_4k*4096;
        const size = size_4k*4096;

        // decompressing the chunk
        const data_length = convertEndian(i32[offset/4]);
        const scheme = u8[offset+4];
        if(scheme !== 2/*zlib*/){
            throw new Error("Scheme not supported");
        }
        const zlib_data = u8.slice(offset+5,offset+5+data_length-1);
        console.log("zlib data: ",zlib_data);
        const chunk = new Chunk(zlib.inflateSync(zlib_data),timestamp);
        chunks.set(chunkID,chunk);
        return chunk;
    }
};


class Dimension{
    constructor(path){
        this.path = path;
    }
    regions = new Map;
    async getRegion(x,z){
        const {regions} = this;
        const filename = Path.join(
            this.path,
            `r.${intdiv(x,512)}.${intdiv(z,512)}.mca`
        );
        if(regions.has(filename)){
            return regions.get(filename);
        }else{
            //construction will throw error if file DNE
            const region = await new Region(filename).init();
            regions.set(filename,region);
            return region;
        }
    }
    async getChunk(x,y,z){
        const region = await this.getRegion(x,z);
        return await region.getChunk(x%512,z%512);
    }
    async getBlock(x,y,z){
        const chunk = await this.getChunk(x,z);
        return await chunk.getBlock(x,y,z);
    }
    async setBlock(x,y,z,id){
        const chunk = await this.getChunk(x,z);
        return await chunk.setBlock(x,y,z,id);
    }
};

export class World{
    constructor(path){
        this.overworld = new Dimension(Path.join(path,"region"));
        this.nether = new Dimension(Path.join(path,"DIM-1/region"));
        this.end = new Dimension(Path.join(path,"DIM1/region"));
    }
};


