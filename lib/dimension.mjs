import * as Path from "path";
import {Region} from "./region.mjs";
import {intdiv} from "./util.mjs";
import {MultiMap} from "ds-js/multimap.mjs";

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
    }
    async save(){
        for(let [_rx,_rz,region] of this.regionCache){
            await region.save();
        }
    }
};
