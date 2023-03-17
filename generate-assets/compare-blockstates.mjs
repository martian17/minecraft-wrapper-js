import {World} from "../index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";
import {Validator,ValidatorError} from "../obj-schema-validator/index.mjs";


const worldPath = process.argv[2];

if(!worldPath){
    console.log("please specify a path to the save data");
    process.exit();
}

let states = await fs.readdir("./temp/blockstates/");
states = states.filter(v=>v.slice(-5) === ".json").map(v=>v.slice(0,-5));

const world = new World(worldPath);
const dim = world.overworld;



const blockSchema = new Validator({
    type:"object",
    inclusive:false,
    required:{
        "Name":{type:"string",match:/^minecraft:[a-z0-9_]+$/},
    },
    optional:{
        "Properties":{
            type:"object",
            any:{type:"string",match:/^[a-z0-9_]+$/}
        }
    }
});



let blockmap = {};


let validateSuccess = true;

let blocksOfInterest = {
    "pink_shulker_box":1,
    "wheat":1,
    "redstone_wire":1
};

for(let i = 0; i < states.length; i++){
    const bname = states[i];
    const z = (i%21)*3;
    const x = Math.floor(i/21)*3;
    const block = await dim.getBlock(x,-63,z);
    if(block.Name !== `minecraft:${bname}`){
        console.log("name difference detected");
        console.log(bname);
        console.log(block);
    }else{
        blockmap[bname] = block;
    }
    const res = blockSchema.validate(block);
    if(res instanceof ValidatorError){
        console.log(res);
        console.log(block);
        validateSuccess = false;
    }
    if(bname in blocksOfInterest){
        console.log("block of interest:");
        console.log(block);
    }
}

console.log(`block state schema validation ${validateSuccess?"success":"fail"}`);
if(!validateSuccess)process.exit(1);


//tally up the blockstate properties
//tally up every known states



const definitions = {};

const compressVariants = function(obj){
    const props = {};
    let filled = false;
    for(let key in obj){
        if(key === "")continue;
        const pp = key.split(",");
        for(let p of pp){
            let [prop,value] = p.split("=");
            if(!(prop in props)){
                if(filled)console.log("inconsistent variants found",obj);
                props[prop] = {};
            }
            const vals = value.split("|");
            if(vals.length > 1)console.log("or notation in variants",obj);
            for(let val of vals){
                props[prop][val] = 1;
            }
        }
        filled = true;
    }
    return props;
};

const strmapSchema = new Validator({
    type:"object",
    any:{type:"string"}
}); 

const compressMultipart = function(arr){
    const props = {};
    for(let obj of arr){
        const {apply,when} = obj;
        if(!when)continue;
        //discard apply
        //only interested in when
        let objs;
        if("AND" in when){
            objs = when.AND;
        }else if("OR" in when){
            objs = when.OR;
        }else{
            objs = [when];
        }
        for(let obj of objs){
            const res = strmapSchema.validate(obj);
            if(res instanceof ValidatorError){
                console.log(obj);
                console.log(res);
                throw new Error("validator error in multipart strmap schema");
            }
            for(let key in obj){
                if(!(key in props)){
                    props[key] = {};
                }
                const values = obj[key].split("|");
                for(let val of values){
                    props[key][val] = 1;
                }
            }
        }
    }
    return props;
};


let compressStateDef = function(statedef){
    if("variants" in statedef){
        return compressVariants(statedef.variants);
    }else if("multipart"){
        return compressMultipart(statedef.multipart);
    }
};

const displayCompressed = function(compressed){
    console.log(Object.fromEntries(Object.entries(compressed).map(([key,val])=>[key,Object.keys(val)])));
}


const nonPresent = {};
const tallyAll = {};

for(let bname in blockmap){
    const statedef = JSON.parse(await fs.readFile(`./temp/blockstates/${bname}.json`));
    definitions[bname] = statedef;
    const compressed = compressStateDef(statedef);
    //console.log(statedef);
    //console.log(Object.fromEntries(Object.entries(compressed).map(([key,val])=>[key,Object.keys(val)])));

    //compare it with block, and see if there are any deficiency or excess
    const block = blockmap[bname];

    if(block.Properties?.type === "single"){
        console.log(block);
    }
    if(block.Properties?.distance === "7"){
        console.log(block);
    }

    let defic = false;
    for(let bp in block.Properties){
        if(!(bp in compressed)){
            if(!(bp in nonPresent)){
                nonPresent[bp] = {};
            }
            nonPresent[bp][block.Properties[bp]] = 1;
            defic = true;
        }
    }
    if(defic){
        //console.log(compressed,block);
    }
    for(let cp in compressed){
        if(!(cp in block.Properties)){
            console.log("unknown property",cp,block,compressed);
            throw new Error("unknown property");
        }
        if(!(cp in tallyAll)){
            tallyAll[cp] = {};
        }
        const vals = compressed[cp];
        for(let val in vals){
            tallyAll[cp][val] = 1;
        }
    }
}

displayCompressed(nonPresent);
displayCompressed(tallyAll);

for(let key in nonPresent){
    const vals = nonPresent[key];
    if(!(key in tallyAll)){
        console.log("not present in tallyall",key,vals);
    }else{
        const allvals = tallyAll[key];
        for(let val in vals){
            if(!(val in allvals)){
                console.log("props present in both but lacking",key,val,allvals,vals);
            }
        }
    }
}




//tally up the block properties















let sorted = Object.values(blockmap).sort((a,b)=>{
    let sa = 0;
    let sb = 0;
    if("Properties" in a){
        sa = Object.keys(a.Properties).length;
    }
    if("Properties" in b){
        sb = Object.keys(b.Properties).length;
    }
    return sa-sb;
});
/*
console.log("least");
console.log(sorted.slice(0,10));
console.log("most");
console.log(sorted.slice(-10));
*/





