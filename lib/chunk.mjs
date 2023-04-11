import {decodeNBT,encodeNBT,NBT_Int,NBT_Byte} from "nbt.js";
import {decodeRNBT} from "rnbt";
import {newarr} from "ds-js/arrutil.mjs";
import {MultiMap} from "ds-js/multimap.mjs";
import {normalizeObject} from "ds-js/objutil.mjs";
import {unpackArray_64BEA, PackedArray_64BEA_Builder} from "./packedArray64BEA.mjs";
import {packedArrayI8_4_get, packedArrayI8_4_set} from "./packedArray8.mjs";
import {intdiv} from "./util.mjs";
import {promises as fs} from "fs";
import util from "util";
import zlib from "zlib";

import Path from "path";
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const inflate = util.promisify(zlib.inflate);
const deflate = util.promisify(zlib.deflate);

const decodeBlockStates = function(block_states = {palette:["DNE"]}){
    if(!("palette" in block_states)){
        throw new Error("palette not present in block states");
    }
    const {data,palette} = block_states;
    if(!("data" in block_states)){
        if(palette.length !== 1){
            console.log(palette);
            throw new Error("only palette present. expected exactly one content");
        }
        return newarr(4096).map(_=>palette[0]);
    }
    let bitDepth = Math.ceil(Math.log(palette.length)/Math.log(2));
    if(bitDepth < 4)bitDepth = 4;
    const blocks = [];
    for(let idx of unpackArray_64BEA(data,bitDepth,4096)){
        if(idx >= palette.length){
            const arr = [...unpackArray_64BEA(data,bitDepth,4096)];
            console.log("");
            for(let y = 0; y < 16; y++){
                for(let z = 0; z < 16; z++){
                    for(let x = 0; x < 16; x++){
                        const v = arr[y*256+z*16+x];
                        process.stdout.write(`${v} `);
                    }
                    process.stdout.write("\n");
                }
                process.stdout.write("\n");
            }
            console.log(palette);
            throw new Error(`Block ID ${idx} DNE in palette`);
        }
        blocks.push(palette[idx]);
    }
    return blocks;
};

const encodeBlockState = function(blockArr){
    let lastIndex = 0;
    const keys = new Map/*<string,int>*/();
    const palette = [];
    const idmap = [];
    
    for(let i = 0; i < 4096; i++){
        const state = blockArr[i];
        let normalized;
        try{
            normalized = normalizeObject(state);
        }catch(err){
            console.log(state,i,blockArr.slice(i-50,i+50));
            throw err;
        }
        const key = JSON.stringify(normalized);
        let index;
        if(!keys.has(key)){
            palette.push(normalized);
            index = lastIndex;
            keys.set(key,lastIndex++);
        }else{
            index = keys.get(key);
        }
        idmap.push(index);
    }
    if(palette.length === 1){
        return {
            palette
        };
    }
    let bitDepth = Math.ceil(Math.log(palette.length)/Math.log(2));
    if(bitDepth < 4)bitDepth = 4;
    const data = new PackedArray_64BEA_Builder(bitDepth,4096);
    for(let i = 0; i < 4096; i++){
        const idx = idmap[i];
        data.set(i,idx);
    }
    return {
        palette,
        data:data.export()
    };
};


//section == subchunk
class Section{
    constructor(nbt){
        this.y = nbt.Y.value;
        this.blockArr = decodeBlockStates(nbt.block_states);
        this.nbt = nbt;
    }
    modified = false;
    getBlock(x,y,z){
        return this.blockArr[y*256+z*16+x];
    }
    setBlock(x,y,z,data){
        this.modified = true;
        this.blockArr[y*256+z*16+x] = data;
    }
    //todo: test these methods
    //non iterative base methods
    getBlockLight(x,y,z){
        return packedArrayI8_4_get(this.nbt.BlockLight,y*256+z*16+x);
    }
    setBlockLight(x,y,z,value){
        packedArrayI8_4_set(this.nbt.BlockLight,y*256+z*16+x,value);
    }
    getSkyLight(x,y,z){
        return packedArrayI8_4_get(this.nbt.SkyLight,y*256+z*16+x);
    }
    setSkyLight(x,y,z,value){
        packedArrayI8_4_set(this.nbt.SkyLight,y*256+z*16+x,value);
    }

    toNBT(){
        const {nbt} = this;
        if(!this.modified)return nbt;
        nbt.block_states = encodeBlockState(this.blockArr);
        return nbt;
    }
}

class BlockEntities{
    entities = new MultiMap;
    constructor(nbt){
        const {entities} = this;
        for(let entity of nbt){
            const x = entity.x.value;
            const y = entity.y.value;
            const z = entity.z.value;
            if(entities.has(x,y,z)){
                throw new Error("multiple block entities detected at the same coordinate");
            }
            entities.set(x,y,z,entity);
        }
    }
    set(x,y,z,props){
        const entity = {};
        if("keepPacked" in props){
            entity.keepPacked =  new NBT_Byte(props.keepPacked);
        }else{
            entity.keepPacked =  new NBT_Byte(0);
        }
        entity.x = new NBT_Int(x);
        entity.y = new NBT_Int(y);
        entity.z = new NBT_Int(z);
        if(!("id" in props))throw new Error("id is required in block entity");
        entity.id = props.id;
        for(let prop in props){
            if(prop in entity) continue;
            entity[prop] = props[prop];
        }
        this.entities.set(x,y,z,entity);
    }
    delete(x,y,z){
        this.entities.delete(x,y,z);
    }
    toNBT(){
        const res = [];
        for(let [_x,_y,_z,entity] of this.entities){
            res.push(entity);
        }
        return res;
    }
}


let default_rnbt;
export class Chunk{
    static async fromBuffer(region,id,buffer){
        const chunk = new Chunk(region,id);
        return chunk.init(decodeNBT(await inflate(buffer))[""]);
    }
    static async fromEmpty(region,id,x,z){
        if(!default_rnbt)default_rnbt = ""+await fs.readFile(Path.join(__dirname,"../assets/chunk-default.rnbt"));
        const nbt = decodeRNBT(default_rnbt)[""];
        nbt.xPos.value = intdiv(x,16)*16;
        nbt.zPos.value = intdiv(z,16)*16;
        const chunk = new Chunk(region,id);
        return chunk.init(nbt);
    }
    constructor(region,id){
        this.region = region;
        this.id = id;
    }
    init(nbt){
        this.nbt = nbt;
        this.sections = newarr(nbt.sections.length);
        this.ymin = nbt.yPos.value*16;
        this.blockEntities = new BlockEntities(nbt.block_entities);
        return this;
    }

    getSection(y){
        const y0 = y-this.ymin;
        const sidx = Math.floor(y0/16);
        if(this.sections[sidx])
            return this.sections[sidx];
        return this.sections[sidx] = new Section(this.nbt.sections[sidx]);
    }
    getBlock(x,y,z){
        return this.getSection(y).
            getBlock(x,(y-this.ymin)%16,z);
    }
    modified = false;
    setBlock(x,y,z,data,entity){
        this.modified = true;
        this.getSection(y).
            setBlock(x,(y-this.ymin)%16,z,data);
        if(entity){
            this.blockEntities.set(x,y,z,entity);
        }else{
            this.blockEntities.delete(x,y,z);
        }
    }
    async toBuffer(){
        const {nbt} = this;
        const nbtSections = [];
        for(let i = 0; i < this.sections.length; i++){
            const section = this.sections[i];
            if(!section){
                // section is not loaded
                nbtSections.push(this.nbt.sections[i]);
            }else{
                // section is loaded
                nbtSections.push(section.toNBT());
            }
        }
        nbt.sections = nbtSections;
        nbt.block_entities = this.blockEntities.toNBT();
        return await deflate(encodeNBT({"":nbt}));
    }
}
