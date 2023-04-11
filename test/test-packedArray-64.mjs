import {unpackArray_64BEA as unpack, PackedArray_64BEA_Builder as Packer} from "../lib/packedArray64BEA.mjs";
import {newarr,arreq} from "ds-js/arrutil.mjs";

const len = 1000000;
const depth = 13;

const source = newarr(len).map(_=>Math.floor(Math.random()*(1<<depth)));

const packer = new Packer(depth,len);
for(let i = 0; i < len; i++){
    packer.set(i,source[i]);
}
const packed = packer.export();

const unpacked = [];
for(let val of unpack(packed,depth,len)){
    unpacked.push(val);
}

console.log(source);
console.log(unpacked);
console.log(packed);
console.log(arreq(source,unpacked)?"success":"fail");




