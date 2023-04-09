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
    regions = new MultiMap;
    async getRegion(x,z){
        const rx = x%512;
        const rz = z%512;
        let region;
        if(region = this.regions.get(rx,rz)){
            return region;
        }
        region = await new Region(this,rx,rz).init();
        this.regions.set(rx,rz,region);
    }
    async getChunk(x,z){
        const region = await this.getRegion(x,z);
        return await region.getChunk(x,z);
    }
    async getBlock(x,y,z){
        const chunk = await this.getChunk(x,z);
        return await chunk.getBlock(x%16,y,z%16);
    }
    async setBlock(x,y,z,data,entity){
        const chunk = await this.getChunk(x,z);
        return await chunk.setBlock(x%16,y,z%16,data,entity);
    }
    async save(){
        for(let [_,region] of this.regions){
            await region.save();
        }
    }
};
