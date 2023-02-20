import {decodeNBT} from "./nbt.js/index.mjs";
import {newarr} from "./ds-js/arrutil.mjs";

const decodeBlockStates = function(block_states){
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
    const data = block_states.data;
    const i32 = new Int32Array(data.buffer);
    //reading the bitfield
    const bitLen = Math.ceil(Math.log(palette.length)/Math.log(2))
    const bitOffset = 0;
    const result = [];
    for(let i = 0; i < 4096; i++){
        bitOffset += bitLen;
        const innerOffset = bitOffset%32;
        let idx1 = Math.floor(bitOffset/8);
        let idx2 = idx1+1;
        idx1 = (idx1&0xfffffffe)|~(idx1&1);
        idx2 = (idx2&0xfffffffe)|~(idx2&1);
        let int1 = i32[idx1];
        let int2;
        if(idx2 < i32.length){
            int2 = i32[idx2];
        }else{
            int2 = 0;
        }

        let res;
        if(innerOffset === 0){
            res = int1;
        }else{
            res = (int1<<innerOffset)|(int2>>>(32-innerOffset));
        }
        res = res>>>(32-bitLen);
        result.push(palette[res]);
    }
    return result;
};

const encodeBlockState = function(blockArr){

}


//section == subchunk
class Section{
    constructor(nbt){
        console.log(nbt);
        this.y = nbt.Y.value;
        this.blockArr = decodeBlockStates(nbt.block_states);
    }
    getBlockData(x,y,z){

    }
}

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
        //this.sectionOffset = sections[0].y.value;
    }
    getBlockData(x,y,z){

    }
    setBlockData(x,y,z,data){
    }
    getBlockID(x,y,z){
    }
    setBlockID(x,y,z,id){
    }
    toNBT(){
    }
};
