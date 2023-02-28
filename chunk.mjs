import {decodeNBT,encodeNBT} from "./nbt.js/index.mjs";
import {newarr} from "./ds-js/arrutil.mjs";
import {normalizeObject} from "./ds-js/objutil.mjs";

const int32ToBinary = function(n){
    const z16 = "0000000000000000";
    return (z16+(n>>>16).toString(2)).slice(-16) +
    (z16+(n&0xffff).toString(2)).slice(-16);
};

//interface view
//view {
//    byteLength
//    byteOffset
//    buffer
//}
const unpackAlignedBitfield_64BE = function*(data/*:view*/,bitDepth/*:int*/){// yields int
    const i32 = new Int32Array(data.buffer,data.byteOffset,data.byteLength/4);
    const period = Math.floor(64/bitLen);
    for(let i = 0; i < 4096; i++){
        const idx = Math.floor(i/period);
        //reverse the offset because of bit order within Int64
        const offset = 64-bitDepth-(i%period)*bitDepth;
        const int1 = i32[idx*2+1];
        const int2 = i32[idx*2];
        let res;
        if(offset < 32){
            if(offset === 0){
                res = int1;
            }else{
                res = (int1<<offset)|(int2>>>(32-offset));
            }
        }else{
            res = int2<<(offset%32);
        }
        yield res>>>(32-bitDepth);
    }
};

class PackedAlignedBitfieldBuilder_64BE{
    constructor(length/*int*/,bitDepth/*int*/){
        const period = this.period = Math.floor(64/bitDepth);
        this.i32 = new Int32Array(Math.ceil(4096/period)*2);
        this.bitDepth = bitDepth;
        this.length = length;
    }
    set(i/*int*/,val/*int*/){
        const {period,bitDepth,i32} = this;
        const idx = Math.floor(i/period);
        //reversed offset
        const offset = 64-bitLen-(i%period);
        const int1 = i32[idx*2+1];
        const int2 = i32[idx*2];
        if(offset < 32)
            i32[idx*2+1] |= val>>>offset;
        if(offset+bitLen > 32)
            i32[idx*2] |= val<<(64-offset-bitLen);
    }
    export(){
        return new BigInt64Array(this.i32.buffer);
    }
};

const decodeBlockStates = function(block_states = {palette:["DNE"]}){
    if(!("palette" in block_states)){
        throw new Error("palette not present in block states");
    }
    const palette = block_states.palette;
    if(!("data" in block_states)){
        if(palette.length !== 1){
            console.log(palette);
            throw new Error("only palette present. expected exactly one content");
        }
        return newarr(4096).map(_=>palette[0]);
    }
    const {data,palette} = block_states;
    const bitDepth = Math.ceil(Math.log(palette.length)/Math.log(2));
    const blocks = [];
    for(let idx of unpackAlignedBitfield_64BE(data,bitDepth)){
        if(idx >= palette.length){
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
    const bitDepth = Math.ceil(Math.log(palette.length)/Math.log(2));
    const data = PackedAlignedBitfieldBuilder_64BE(4096,bitDepth);
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
    getBlockData(x,y,z){
        return this.blockArr[y*256+z*16+x];
    }
    setBlockData(x,y,z,data){
        this.blockArr[y*256+z*16+x] = data;
    }
    toNBT(){
        const {nbt} = this;
        nbt.block_states = encodeBlockState(this.blockArr);
        return nbt;
    }
};

export class Chunk{
    constructor(nbt_buffer,id){
        this.id = id;
        const nbt = this.nbt = decodeNBT(nbt_buffer,{
            readAs:[]
        })[""];
        //ignore the heightmap for now
        this.sections = [];
        for(let section of nbt.sections){
            this.sections.push(new Section(section));
        }
        this.ymin = this.sections[0].y*16;
    }
    getBlockData(x,y,z){
        y = y-this.ymin;
        const sidx = Math.floor(y/16);
        return this.sections[sidx].getBlockData(x,y%16,z);
    }
    setBlockData(x,y,z,data){
        y = y-this.ymin;
        const sidx = Math.floor(y/16);
        return this.sections[sidx].setBlockData(x,y%16,z,data);
    }
    getBlockID(x,y,z){
    }
    setBlockID(x,y,z,id){
    }
    toBuffer(){
        const {sections,nbt} = this;
        nbt.sections = sections.map(section=>section.toNBT());
        return encodeNBT(nbt);
    }
    isModified(){
        return true;
    }
};
