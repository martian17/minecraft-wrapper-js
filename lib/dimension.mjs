import * as Path from "path";
import {Region} from "./region.mjs";
import {intdiv} from "./util.mjs";
import {MultiMap} from "ds-js/multimap.mjs";



//light bit maps
const SOLID = 16;//solid or transparent
//values under 16 will be light blocks

//this table will be expanded in the future
//todo: scrape https://minecraft.fandom.com/wiki/Light
const blockLightTable = {
    "minecraft:torch":14,
    "minecraft:magma_block":3 | SOLID,
    "minecraft:air":0,
    "minecraft:cave_air":0,
    "minecraft:void_air":0,
    "minecraft:cornflower":0
};

const getBaseBlockLightBitmap = function(state){
    if(state.Name in blockLightTable){
        return blockLightTable[state.Name];
    }else{
        return 0 | SOLID;
    }
};

const getBaseBlockLight = function(state){
    return getBaseBlockLightBitmap(state)&15;
};

const isSolid = function(state){
    return !!(getBaseBlockLightBitmap(state)&SOLID);
};



const loopAdjacent3D = function*(x,y,z){
    yield [x-1,y,z];
    yield [x+1,y,z];
    yield [x,y-1,z];
    yield [x,y+1,z];
    yield [x,y,z-1];
    yield [x,y,z+1];
};




export class Dimension{
    // flags
    allowChunkGeneration = false;

    constructor(world,path){
        this.world = world;
        this.path = path;
    }
    regionCache = new MultiMap;
    async getRegion(x,z){
        const rx = intdiv(x,512);
        const rz = intdiv(z,512);
        let region;
        if(region = this.regionCache.get(rx,rz)){
            return region;
        }
        region = await new Region(this,rx,rz).init();
        this.regionCache.set(rx,rz,region);
        return region;
    }
    currentChunk = null;
    async getChunk(x,z){
        const region = await this.getRegion(x,z);
        return this.currentChunk = await region.getChunk(x,z);
    }
    async getBlock(x,y,z){
        const chunk = await this.getChunk(x,z);
        return await chunk.getBlock(x,y,z);
    }
    async setBlock(x,y,z,data,entity){
        const chunk = await this.getChunk(x,z);
        await chunk.setBlock(x,y,z,data,entity);
        //upldate block light
        const level = getBaseBlockLight(data);
        //first zero out the sphere of influence with "reset"
        const edges = await this.resetBlockLight(x,y,z);
        if(level !== 0)edges.push([x,y,z,level]);
        for(const [x1,y1,z1,l1] of edges){
            await this.updateBlockLight(x1,y1,z1,l1);
        }
    }

    // Light update
    // Low level methods
    async getBlockLight(x,y,z){
        const chunk = await this.getChunk(x,z);
        return await chunk.getBlockLight(x,y,z);
    }
    async setBlockLight(x,y,z,level){
        const chunk = await this.getChunk(x,z);
        await chunk.setBlockLight(x,y,z,level);
    }
    async getSkyLight(x,y,z){
        const chunk = await this.getChunk(x,z);
        return await chunk.getSkyLight(x,y,z);
    }
    async setSkyLight(x,y,z,level){
        const chunk = await this.getChunk(x,z);
        await chunk.setSkyLight(x,y,z,level);
    }

    // Aggregate methods
    async resetBlockLight(x0,y0,z0){
        //breadth first loop
        const visited = new MultiMap;
        visited.set(x0,y0,z0,true);
        let pstack = [[x0,y0,z0]];
        let l = await this.getBlockLight(x0,y0,z0);
        const edges = [];
        while(pstack.length !== 0 && l !== 0){
            let pstack1 = [];
            for(const [x,y,z] of pstack){
                this.setBlockLight(x,y,z,0);
                for(const [x1,y1,z1] of loopAdjacent3D(x,y,z)){
                    if(y1 < this.currentChunk.ymin || y1 >= this.currentChunk.ymax)continue;
                    if(visited.has(x1,y1,z1))continue;
                    visited.set(x1,y1,z1,true);
                    if(isSolid(await this.getBlock(x1,y1,z1)))continue;
                    const l1 = await this.getBlockLight(x1,y1,z1);
                    if(l1 >= l){
                        edges.push([x1,y1,z1,l1]);
                        continue;
                    }
                    pstack1.push([x1,y1,z1]);
                }
            }
            l--;
            pstack = pstack1;
        }
        return edges;
    }
    async updateBlockLight(x0,y0,z0,l0){
        //breadth first loop
        const visited = new MultiMap;
        visited.set(x0,y0,z0,true);
        let pstack = [[x0,y0,z0]];
        let l = l0;
        while(pstack.length !== 0 && l !== 0){
            let pstack1 = [];
            for(const [x,y,z] of pstack){
                this.setBlockLight(x,y,z,l);
                for(const [x1,y1,z1] of loopAdjacent3D(x,y,z)){
                    if(y1 < this.currentChunk.ymin || y1 >= this.currentChunk.ymax)continue;
                    if(visited.has(x1,y1,z1))continue;
                    visited.set(x1,y1,z1,true);
                    if(isSolid(await this.getBlock(x1,y1,z1)))continue;
                    const l1 = await this.getBlockLight(x1,y1,z1);
                    if(l1 >= l-1)continue;
                    pstack1.push([x1,y1,z1]);
                }
            }
            l--;
            pstack = pstack1;
        }
    }

    async save(){
        for(let [_rx,_rz,region] of this.regionCache){
            await region.save();
        }
    }
};
