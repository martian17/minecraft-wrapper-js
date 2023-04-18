import {Region} from "./region.mjs";
import {intdiv} from "./util.mjs";
import {MultiMap} from "ds-js/multimap.mjs";


export class DimensionBase{
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
        if((region = this.regionCache.get(rx,rz))){
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

    async save(){
        for(let [_rx,_rz,region] of this.regionCache){
            await region.save();
        }
    }
}


// Table source: https://minecraft.fandom.com/wiki/Light
const blockLightTable = {
    "minecraft:beacon":15,
    "minecraft:conduit":15,
    "minecraft:end_gateway":15,
    "minecraft:end_portal":15,
    "minecraft:fire":15,
    "minecraft:jack_o_lantern":15,
    "minecraft:lantern":15,
    "minecraft:lava":15,
    "minecraft:lava_cauldron":15,
    "minecraft:sea_lantern":15,
    "minecraft:shroomlight":15,
    "minecraft:end_rod":14,
    "minecraft:torch":14,
    "minecraft:nether_portal":11,
    "minecraft:crying_obsidian":10,
    "minecraft:soul_fire":10,
    "minecraft:soul_lantern":10,
    "minecraft:soul_torch":10,
    "minecraft:enchanting_table":7,
    "minecraft:ender_chest":7,
    "minecraft:glow_lichen":7,
    "minecraft:sculk_catalyst":6,
    "minecraft:amethyst_cluster":5,
    "minecraft:large_amethyst_bud":4,
    "minecraft:magma_block":3,
    "minecraft:medium_amethyst_bud":2,
    "minecraft:brewing_stand":1,
    "minecraft:brown_mushroom":1,
    "minecraft:dragon_egg":1,
    "minecraft:end_portal_frame":1,
    "minecraft:sculk_sensor":1,
    "minecraft:small_amethyst_bud":1,
};

const opaqueBlocks = {
    "minecraft:tinted_glass":true,
    "minecraft:magma_block":true,
    "minecraft:crying_obsidian":true,
};

const transparentBlockTable = {
    "minecraft:air":true,
    "minecraft:cave_air":true,
    "minecraft:void_air":true,
    "minecraft:allium":true,
    "minecraft:amethyst_cluster":true,
    "minecraft:azalea":true,
    "minecraft:azure_bluet":true,
    "minecraft:bamboo":true,
    "minecraft:barrier":true,
    "minecraft:beacon":true,
    "minecraft:beetroots":true,
    "minecraft:bell":true,
    "minecraft:blue_orchid":true,
    "minecraft:brewing_stand":true,
    "minecraft:cactus":true,
    "minecraft:carrots":true,
    "minecraft:chain":true,
    "minecraft:cobweb":true,
    "minecraft:cocoa":true,
    "minecraft:comparator":true,
    "minecraft:composter":true,
    "minecraft:conduit":true,
    "minecraft:dandelion":true,
    "minecraft:daylight_detector":true,
    "minecraft:farmland":true,
    "minecraft:frogspawn":true,
    "minecraft:flowering_azalea":true,
    "minecraft:hopper":true,
    "minecraft:grindstone":true,
    "minecraft:kelp":true,
    "minecraft:lectern":true,
    "minecraft:lever":true,
    "minecraft:lilac":true,
    "minecraft:lily_of_the_valley":true,
    "minecraft:lily_pad":true,
    "minecraft:peony":true,
    "minecraft:pointed_dripstone":true,
    "minecraft:poppy":true,
    "minecraft:potatoes":true,
    "minecraft:scaffolding":true,
    "minecraft:sculk_sensor":true,
    "minecraft:sculk_shrieker":true,
    "minecraft:sculk_vein":true,
    "minecraft:repeater":true,
    "minecraft:stonecutter":true,
    "minecraft:sugar_cane":true,
    "minecraft:structure_void":true,
    "minecraft:tripwire_hook":true,
    "minecraft:wheat":true,
    "minecraft:spawner":true,
    "minecraft:moving_piston":true,
    "minecraft:light":true,
    "minecraft:bubble_column":true
}

const isTransparent = function(state){
    if(state.Name in transparentBlockTable)
        return true;
    if(state.Name in opaqueBlocks)
        return false;
    if(state.Name in blockLightTable)
        return true;
    if(
        state.Name.endsWith("slab") ||
        state.Name.endsWith("door") ||
        state.Name.endsWith("button") ||
        state.Name.endsWith("leaves") ||
        state.Name.endsWith("leaf") ||
        state.Name.endsWith("fence") ||
        state.Name.endsWith("gate") ||
        state.Name.endsWith("sign") ||
        state.Name.endsWith("wall") ||
        state.Name.endsWith("stairs") ||
        state.Name.endsWith("sapling") ||
        state.Name.endsWith("pressure_plate") ||
        state.Name.endsWith("glass") ||
        state.Name.endsWith("carpet") ||
        state.Name.endsWith("candle") ||
        state.Name.endsWith("bed") ||
        state.Name.endsWith("banner") ||
        state.Name.endsWith("head") ||
        state.Name.endsWith("skull") ||
        state.Name.endsWith("coral") ||
        state.Name.endsWith("pane") ||
        state.Name.endsWith("stem") ||
        state.Name.endsWith("vine") ||
        state.Name.endsWith("vines") ||
        state.Name.endsWith("grass") ||
        state.Name.endsWith("cake") ||
        state.Name.endsWith("rail") ||
        state.Name.endsWith("_fan") ||
        state.Name.endsWith("_mushroom") ||
        state.Name.endsWith("_plant") ||
        state.Name.endsWith("_fungus") ||
        state.Name.endsWith("_egg") ||
        state.Name.endsWith("_roots") ||
        state.Name.endsWith("_path") ||
        state.Name.endsWith("_bars") ||
        state.Name.endsWith("_bud") ||
        state.Name.endsWith("_rod") ||
        state.Name.endsWith("_propagule") ||
        state.Name.endsWith("_wart") ||
        state.Name.endsWith("_sprouts") ||
        state.Name.endsWith("_tulip") ||
        state.Name.endsWith("_daisy") ||
        state.Name.endsWith("_petals") ||
        state.Name.endsWith("wire") ||
        state.Name.endsWith("_blossom") ||
        state.Name.endsWith("_crop") ||
        state.Name.endsWith("_rose") ||
        state.Name.endsWith("pot") ||
        state.Name.endsWith("fire") ||
        state.Name.endsWith("torch") ||
        state.Name.endsWith("anvil") ||
        state.Name.endsWith("chest") ||
        state.Name.endsWith("bush") ||
        state.Name.endsWith("fern") ||
        state.Name.endsWith("lantern") ||
        state.Name.endsWith("ladder") ||
        state.Name.endsWith("cauldron") ||
        state.Name.startsWith("minecraft:potted") ||
        state.Name.endsWith("flower")
    ){
        return true;
    }
    return false;
};

const getBaseBlockLight = function(state){
    if(state.Name.endsWith("froglight"))
        return 15;
    if(state.Name in blockLightTable)
        return blockLightTable[state.Name];
    return 0;
};

const isEntityRequired = function(state){
    if(state.Name.endsWith("shulker_box")){
        return "minecraft:shulker_box";
    }else if(state.Name.endsWith("_sign")){
        return "minecraft:sign";
    }else if(state.Name.endsWith("_banner")){
        return "minecraft:banner";
    }else if(state.Name.endsWith("chest")){
        return "minecraft:chest";
    }else if(state.Name.endsWith("trapped_chest")){
        return "minecraft:trapped_chest";
    }else if(state.Name.endsWith("ender_chest")){
        return "minecraft:ender_chest";
    }else if(state.Name.endsWith("_skull") || state.Name.endsWith("_head")){
        return "minecraft:skull";
    }else if(state.Name.endsWith("_bed")){
        return "minecraft:bed";
    }else if(state.Name.endsWith("decorated_pot")){
        return "minecraft:decorated_pot";
    }else if(state.Name.endsWith("enchanting_table")){
        return "minecraft:enchanting_table";
    }else if(state.Name.endsWith("end_gateway")){
        return "minecraft:end_gateway";
    }else if(state.Name.endsWith("end_portal")){
        return "minecraft:end_portal";
    }else if(state.Name.endsWith("conduit")){
        return "minecraft:conduit";
    }
    return false;
};




const loopAdjacent3D = function*(x,y,z){
    yield [x-1,y,z];
    yield [x+1,y,z];
    yield [x,y-1,z];
    yield [x,y+1,z];
    yield [x,y,z-1];
    yield [x,y,z+1];
};


export class Dimension extends DimensionBase{
    async setBlock(x,y,z,data,entity){
        //Add entity if required
        let entityID;
        if(!entity && (entityID = isEntityRequired(data))){
            entity = {
                id:entityID
            };
        }
        super.setBlock(x,y,z,data,entity);
        //upldate block light
        const level = getBaseBlockLight(data);
        //first zero out the sphere of influence with "reset"
        let edges = [];
        if(await this.getBlockLight(x,y,z) > level && !isTransparent(data))
            edges = await this.resetBlockLight(x,y,z);
        if(level !== 0)
            edges.push([x,y,z,level]);
        for(const [x1,y1,z1,l1] of edges){
            await this.updateBlockLight(x1,y1,z1,l1);
        }
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
                    if(!isTransparent(await this.getBlock(x1,y1,z1)))continue;
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
                    if(!isTransparent(await this.getBlock(x1,y1,z1)))continue;
                    const l1 = await this.getBlockLight(x1,y1,z1);
                    if(l1 >= l-1)continue;
                    pstack1.push([x1,y1,z1]);
                }
            }
            l--;
            pstack = pstack1;
        }
    }

}


