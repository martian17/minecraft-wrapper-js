import {World} from "../index.mjs";

const path = process.argv[2];
const [x=8,y=-62,z=9] = process.argv.slice(3).map(v=>parseInt(v));

if(!path){
    console.log("please specify a path to the save data");
}

const world = new World(path);
const dim = world.overworld;

await dim.setBlock(x,y,z,{
    Properties: { rotation: '11' },
    Name: 'minecraft:wither_skeleton_skull'
});

console.log("saving");
await dim.save();
console.log("saved");


