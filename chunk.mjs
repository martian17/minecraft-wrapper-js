import {decodeNBT,encodeNBT,NBT_Int,NBT_Byte} from "./nbt.js/index.mjs";
import {newarr} from "./ds-js/arrutil.mjs";
import {MultiMap} from "./ds-js/multimap.mjs";
import {normalizeObject} from "./ds-js/objutil.mjs";
import {unpackArray_64BEA, PackedArray_64BEA_Builder} from "./packedArray64BEA.mjs";

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
            //console.log(blocks);
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
    toNBT(){
        const {nbt} = this;
        if(!this.modified)return nbt;
        //console.log("encoding");
        nbt.block_states = encodeBlockState(this.blockArr);
        return nbt;
    }
};

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
        if(!"id" in props)throw new Error("id is required in block entity");
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
        for(let [x,y,z,entity] of this.entities){
            res.push(entity);
        }
        return res;
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
        this.blockEntities = new BlockEntities(nbt.block_entities);
    }
    getBlock(x,y,z){
        const y0 = y-this.ymin;
        const sidx = Math.floor(y0/16);
        return this.sections[sidx].getBlock(x,y0%16,z);
    }
    modified = false;
    setBlock(x,y,z,data,entity){
        this.modified = true;
        const y0 = y-this.ymin;
        const sidx = Math.floor(y0/16);
        const res = this.sections[sidx].setBlock(x,y0%16,z,data);
        if(entity){
            this.blockEntities.set(x,y,z,entity);
        }else{
            this.blockEntities.delete(x,y,z);
        }
        return res;
    }
    getBlockID(x,y,z){
    }
    setBlockID(x,y,z,id){
    }
    toBuffer(){
        const {sections,nbt} = this;
        //console.log(nbt.sections.map(s=>s.block_states));
        nbt.sections = sections.map(section=>section.toNBT());
        nbt.block_entities = this.blockEntities.toNBT();
        //console.log("saving block entities:",nbt.block_entities);
        //console.log(nbt.sections.map(s=>s.block_states?.palette));
        //console.log(nbt.sections.map(s=>s.block_states));
        let res = encodeNBT({"":nbt});
        //console.log(res);
        //console.log(decodeNBT(res));
        return res;
    }
};
