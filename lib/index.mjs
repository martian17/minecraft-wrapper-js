import {Dimension} from "./dimension.mjs";
import * as Path from "path";

//world -> dimension -> region -> chunk -> section


export class World{
    constructor(path){
        this.overworld = new Dimension(this,Path.join(path,"region"));
        this.nether = new Dimension(this,Path.join(path,"DIM-1/region"));
        this.end = new Dimension(this,Path.join(path,"DIM1/region"));
    }
    async save(){
        await this.overworld.save();
        await this.nether.save();
        await this.end.save();
    }
};


