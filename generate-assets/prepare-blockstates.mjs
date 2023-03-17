import {World} from "../index.mjs";
import {promises as fs} from "fs";
import {execSync} from "child_process";

const jarPath = process.argv[2];

if(!jarPath){
    console.log("pelase provide the jar path");
    process.exit();
}

//prepare ./temp
execSync(`
rm -rf ./temp
mkdir ./temp
cp ${jarPath} ./temp/mc.jar
mkdir ./temp/jar
unzip -qq ./temp/mc.jar -d ./temp/jar/
mv ./temp/jar/assets/minecraft/blockstates ./temp/
`.trim());


