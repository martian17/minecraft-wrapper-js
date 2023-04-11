import {promises as fs} from "fs";
import Path from "path";
import {Chunk} from "./chunk.mjs";
import {intdiv, reverseEndian} from "./util.mjs";
import {MinHeap,MaxHeap} from "ds-js/heap.mjs"

const i32buff = new Int32Array(1);
const u8buff = new Uint8Array(1);

const SECTOR_SIZE = 4096;
const REGION_SIZE = 1024;

export class Region{
    constructor(dimension,x,z){
        // x and y are coordinates divided by 512
        this.path = Path.join(dimension.path,`r.${x}.${z}.mca`);
        this.x = x;
        this.z = z;
        this.dimension = dimension;
    }
    async init(){
        try{
            this.handle = await fs.open(this.path,"r+");
            await this.loadHeaders();
        }catch(err){
            if(err.code === "ENOENT"){
                if(!this.dimension.allowChunkGeneration)
                    throw new Error("Region DNE, but Dimension.allowChunkGeneration is set to false.");
            }else{
                throw err;
            }
        }
        return this;
    }

    // File I/O
    handle = null;
    async writeChunkBuffer(offset,buffer){
        i32buff[0] = reverseEndian(buffer.byteLength+1);
        u8buff[0] = 2;
        await this.handle.write(i32buff,{position:offset*SECTOR_SIZE});
        await this.handle.write(u8buff,{position:offset*SECTOR_SIZE+4});
        await this.handle.write(buffer,{position:offset*SECTOR_SIZE+5});
    }
    async writeHeaders(){
        await this.handle.write(this.data_header,{position:0});
        await this.handle.write(this.timestamp_header,{position:SECTOR_SIZE*1});
    }
    async readChunkBuffer(offset,size){
        const buffer = Buffer.allocUnsafe(size*SECTOR_SIZE);
        await this.handle.read(buffer, 0, size*SECTOR_SIZE, offset*SECTOR_SIZE);
        const data_length = buffer[0]<<24|buffer[1]<<16|buffer[2]<<8|buffer[3];
        const scheme = buffer[4];
        if(scheme !== 2/*zlib*/){
            console.log(offset,size);
            throw new Error("Scheme not supported");
        }
        return await buffer.subarray(5,5+data_length-1);
    }
    async loadHeaders(){
        this.data_header = new Int32Array(REGION_SIZE);
        this.timestamp_header = new Int32Array(REGION_SIZE);
        await this.handle.read(this.data_header,0,SECTOR_SIZE,0);
        await this.handle.read(this.timestamp_header,0,SECTOR_SIZE,SECTOR_SIZE*1);
    }

    // Misc utils
    newChunkBucket = [];
    chunkCache = new Map;
    getHeaderBitfield(chunkID){
        const header_bitfield = reverseEndian(this.data_header[chunkID]);
        const offset = header_bitfield>>>8;
        const size   = header_bitfield&0xff;
        return [offset,size];
    }

    // Read mechanisms
    async getChunkBuffer(chunkID){
        if(!this.handle)return null;
        if(!this.data_header[chunkID])return null;
        const [offset,size] = this.getHeaderBitfield(chunkID);
        return await this.readChunkBuffer(offset,size);
    }
    async getChunk(x,z){
        // x y are based on region origin
        const chunkID = intdiv(z%512,16)*32+intdiv(x%512,16);
        if(this.chunkCache.has(chunkID))
            return this.chunkCache.get(chunkID);
        let buffer;
        let chunk;
        if((buffer = await this.getChunkBuffer(chunkID))){
            chunk = await Chunk.fromBuffer(this,chunkID,buffer);
        }else{
            if(!this.dimension.allowChunkGeneration)
                throw new Error("Chunk DNE, but Dimension.allowChunkGeneration is set to false.");
            chunk = await Chunk.fromEmpty(this,chunkID,x,z);
            this.newChunkBucket.push(chunk);
        }
        this.chunkCache.set(chunkID,chunk);
        return chunk;
    }


    // Save mechanisms
    async save_new(){
        // w+ flag creates a file if DNE, which is the case here.
        // w+ behaves the same way as r+ after wards
        this.handle = await fs.open(this.path,"w+");
        this.data_header = new Int32Array(REGION_SIZE);
        this.timestamp_header = new Int32Array(REGION_SIZE);
        let offset = 2;
        const timeBE = reverseEndian(Date.now());
        for(let [chunkID,chunk] of this.chunkCache){
            const buffer = await chunk.toBuffer();
            const size = Math.ceil((buffer.byteLength+5)/SECTOR_SIZE);
            // Write to header cache
            this.data_header[chunkID] = reverseEndian(offset<<8|size);
            this.timestamp_header[chunkID] = timeBE;
            // Write to file
            await this.writeChunkBuffer(offset,buffer);
            offset += size;
        }
        await this.writeHeaders();
    }

    async save_update(){
        // Step1. Compress modified chunks and remove it from header 
        const queuedBuffers = new MaxHeap();
        for(let [chunkID,chunk] of this.chunkCache){
            if(!chunk.modified)continue;
            chunk.modified = false;
            
            const buffer = await chunk.toBuffer();
            queuedBuffers.add([chunkID,buffer],buffer.byteLength);
            this.data_header[chunkID] = 0;
        }
        for(let chunk of this.newChunkBucket){
            const buffer = await chunk.toBuffer();
            chunk.modified = false;
            queuedBuffers.add([chunk.id,buffer],buffer.byteLength);
        }
        this.newChunkBucket = [];

        // Step 2. Construct linked list of existing allocations
        const chunks = new MinHeap;
        for(let chunkID = 0; chunkID < REGION_SIZE; chunkID++){
            if(this.data_header[chunkID] === 0)continue;
            const [offset,size] = this.getHeaderBitfield(chunkID);
            chunks.add([offset,offset+size],offset);
        }
        const allocations = {start:2,end:2,prev:null,next:null};
        let top = allocations;
        while(!chunks.isEmpty()){
            const [start,end] = chunks.pop();
            if(start-top.end > 0){
                const old_top = top;
                top = {start,end,prev:old_top,next:null};
                old_top.next = top;
            }else{
                top.end = end;
            }
        }
        
        // Step 3. Get compressed chunks from the queue, look for vacant spaces, and save them.
        const timeBE = reverseEndian(Date.now());
        while(!queuedBuffers.isEmpty()){
            const [chunkID,buffer] = queuedBuffers.pop();
            const size = Math.ceil((buffer.byteLength+5)/SECTOR_SIZE);
            for(let top = allocations; top !== null; top = top.next){
                const offset = top.end;
                const end = top.next === null ? Infinity : top.next.start;
                const available = end-offset;
                if(size > available)continue;
                if(size === available){
                    // merge top and top.next
                    top.end = top.next.end;
                    top.next = top.next.next;
                    if(top.next !== null)top.next.prev = top;
                }else{
                    top.end += size;
                }
                // Write to header cache
                this.data_header[chunkID] = reverseEndian(offset<<8|size);
                this.timestamp_header[chunkID] = timeBE;
                // Write to file
                await this.writeChunkBuffer(offset,buffer);
                break;
            }
        }
        await this.writeHeaders();
    }

    async save(){
        if(this.handle){
            await this.save_update();
        }else{
            await this.save_new();
        }
    }
}
