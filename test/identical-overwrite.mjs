import {Dimension} from "#lib/dimension.mjs";
import {normalizeObject} from "ds-js/objutil.mjs";
import {paths, resetDir, exec} from "#scripts/util.mjs";
import Path from "path";


const originaldir = Path.join(paths.tmp,"original");
const modifieddir = Path.join(paths.tmp,"modified");
const fixtures =    Path.join(paths.test,"fixtures");

const normalizeStringify = function(obj){
    return JSON.stringify(normalizeObject(obj));
};

const objEqual = function(obj1,obj2){
    const s1 = JSON.stringify(normalizeObject(obj1));
    const s2 = JSON.stringify(normalizeObject(obj2));
    return s1 === s2;
};

//prepare a test data
await resetDir(paths.tmp);
await exec(`
mkdir ${originaldir}
mkdir ${modifieddir}
cp ${Path.join(fixtures,"r.0.0.mca")} ${originaldir}
cp ${Path.join(fixtures,"r.0.0.mca")} ${modifieddir}
`.trim());

const dim1 = new Dimension({},modifieddir);
console.log("loaded dim1");
//read all blocks from the initial chunk, and set it as that block
for(let x = 0; x < 16; x++){
    for(let z = 0; z < 16; z++){
        for(let y = -64; y < 320; y++){
            const block = await dim1.getBlock(x,y,z);
            await dim1.setBlock(x,y,z,block);
        }
    }
}
console.log("saving the dim1");
await dim1.save();
console.log("saved the dim1");


const dim0 = new Dimension({},originaldir);
const dim2 = new Dimension({},modifieddir);
console.log("loaded dim0 and dim2");
let success = true;
for(let x = 0; x < 16; x++){
    for(let z = 0; z < 16; z++){
        for(let y = -64; y < 320; y++){
            const block0 = await dim0.getBlock(x,y,z);
            const block1 = await dim2.getBlock(x,y,z);
            if(!objEqual(block0,block1)){
                success = false;
                throw new Error(`Different blocks detected at x:${x} y:${y} z:${z}`+
                `original: ${normalizeStringify(block0)}`+
                `modified: ${normalizeStringify(block1)}`);
            }
        }
    }
}
console.log(success?"success":"fail");

process.exit();
