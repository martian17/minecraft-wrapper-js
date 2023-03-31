import {Chunk} from "./chunk.mjs";
import {intdiv, convertEndian} from "./util.mjs";
import {newarr} from "ds-js/arrutil.mjs";
import {promises as fs} from "fs";
import {BufferBuilder} from "buffer-builder.js";
import zlib from "zlib";

export class Region{
    constructor(dimension,path){
        this.dimension = dimension;
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
    getChunkID(x,z){
        const cx = intdiv(x,16);
        const cz = intdiv(z,16);
        return cz*32+cx;
    }
    getChunkData(chunkID){
        const {i32,u8} = this;
        const chunkmeta = convertEndian(i32[chunkID]);
        const offset = (chunkmeta>>>8)*4096;
        const size = (chunkmeta&0xff)*4096;
        const timestamp = convertEndian(i32[chunkID+1024]);
        return [offset,size,timestamp];
    }
    chunks = new Map;
    async getChunkBuffer(chunkID){
        const {chunks,i32,u8} = this;
        //check if the chunk exists within the buffer
        if(i32[chunkID] === 0)
            throw new Error("Chunk does not exist within the region");
        const [offset,size,timestamp] = this.getChunkData(chunkID);
        // decompressing the chunk
        const data_length = convertEndian(i32[offset/4]);
        const scheme = u8[offset+4];
        if(scheme !== 2/*zlib*/){
            throw new Error("Scheme not supported");
        }
        //testing attention please
        const zlib_data = u8.slice(offset+5,offset+5+data_length-1);
        //const zlib_data = u8.slice(offset+5,offset+5+data_length);
        return zlib.inflateSync(zlib_data);
    }
    async getChunk(x,z){//x and z are relative to this region
        const {chunks} = this;
        const chunkID = this.getChunkID(x,z);
        if(chunks.has(chunkID))return chunks.get(chunkID);
        const chunk = new Chunk(this,await this.getChunkBuffer(chunkID),chunkID);
        chunks.set(chunkID,chunk);
        return chunk;
    }
    async save(){
        let compressedChunks = [];
        let inPlace = true;//use fseek()
        for(let [id,chunk] of this.chunks){
            if(!chunk.modified){
                continue;
            }
            let buff = chunk.toBuffer();
            let compressed = zlib.deflateSync(buff);
            const [offset,sectorSize] = this.getChunkData(chunk.id);
            const size = compressed.byteLength+5;
            if(size > sectorSize){
                inPlace = false;
            }
            compressedChunks.push([offset,id,compressed]);
        }
        if(inPlace){
            const file = await fs.open(this.path,"r+");
            for(let [offset,id,compressed] of compressedChunks){
                await this.saveChunkInPlace(file,compressed,offset);
            }
            await file.close();
        }else{
            //rewrite the entire file
            await this.saveGroundUp(compressedChunks);
        }
    }
    async saveGroundUp(compressedChunks){
        const {i32} = this;
        let chunkmap = newarr(1024);
        const MODIFIED = 0;
        const ORIGINAL = 1;
        const buff = new BufferBuilder(this.buffer.byteLength,8192);
        let offset = 2;
        for(let [_,id,compressed] of compressedChunks){
            const timestamp = (Date.now()/1000)|0;
            const size = Math.ceil((compressed.byteLength+5)/4096);
            const chunkmeta = (offset<<8)|size;
            buff.set_I32BE_aligned(chunkmeta,id);
            buff.set_I32BE_aligned(timestamp,id+1024);
            const writtenSize = compressed.byteLength+1; 
            buff.set_I32BE_aligned(writtenSize,offset*1024);
            buff.set_U8(2,offset*4096+4);
            buff.set_buffer(compressed,offset*4096+5);
            offset += size;
            chunkmap[id] = 1;
        }
        for(let id = 0; id < 1024; id++){
            if(chunkmap[id])continue;
            if(i32[id] === 0)continue;
            const timestamp = i32[id+1024];
            const [offset_bytes,size_bytes] = this.getChunkData(id);
            const size = size_bytes/4096;
            const chunkmeta = (offset<<8)|size;
            buff.set_I32BE_aligned(chunkmeta,id);
            buff.set_I32BE_aligned(timestamp,id+1024);
            buff.set_buffer(
                this.buffer.slice(
                    offset_bytes,
                    offset_bytes+size_bytes
                ),
                offset*4096
            );
            offset += size;
        }
        const totalSize = offset*4096;
        //fill the rest with 0
        if(buff.length < totalSize)
            buff.set_U8(totalSize-1,0);
        await fs.writeFile(this.path,buff.export());
    }
    async saveChunkInPlace(fileHandle,compressed,offset){
        //write with fseek
        //why length include encoding format but not itself???
        const size = compressed.byteLength+1;
        //why big endian　\(ToT)/
        //uncomment this in production
        await fileHandle.write(new Uint8Array([
            size>>>24,
            size>>>16,
            size>>>8,
            size,
            2
        ]),0,5,offset);
        await fileHandle.write(compressed,0,compressed.byteLength,offset+5);
    }
};
