import {decodeNBT,encodeNBT} from "./nbt.js/index.mjs";
import {newarr} from "./ds-js/arrutil.mjs";
import {normalizeObject} from "./ds-js/objutil.mjs";
import {unpackArray_64BEA, PackedArray_64BEA_Builder} from "./packedArray64BEA.mjs";

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
    for(let idx of unpackAlignedBitfield_64BE(data,bitDepth,4096)){
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
    const data = PackedAlignedBitfieldBuilder_64BE(bitDepth,4096);
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
