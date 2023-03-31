import * as Path from "path";
import {Region} from "./region.mjs";
import {intdiv} from "./util.mjs";

export class Dimension{
    // flags
    generateChunks = false;

    constructor(world,path){
        this.world = world;
        this.path = path;
    }
    regions = new Map;
    async getRegion(x,z){
        const {regions} = this;
        const filename = Path.join(
            this.path,
            `r.${intdiv(x,512)}.${intdiv(z,512)}.mca`
        );
        if(regions.has(filename)){
            return regions.get(filename);
        }else{
            //.init() will throw error if file DNE
            const region = await new Region(this,filename).init();
            regions.set(filename,region);
            return region;
        }
    }
    async getChunk(x,z){
        const region = await this.getRegion(x,z);
        return await region.getChunk(x%512,z%512);
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
