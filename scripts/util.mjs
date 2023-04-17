import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
import Path from "path";
import {promises as fs} from "fs";
import os from "os";
const homedir = os.homedir();

import util from "util";
import zlib from "zlib";
export const gunzip = util.promisify(zlib.gunzip);
export const gzip = util.promisify(zlib.gzip);
export const inflate = util.promisify(zlib.inflate);
export const deflate = util.promisify(zlib.deflate);

import {exec as exec_base} from "child_process";
export const exec = util.promisify(exec_base);

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
const rl = readline.createInterface({ input, output });


export const paths = {
    root:      Path.join(__dirname,"../"),
    assets:    Path.join(__dirname,"../assets"),
    devAssets: Path.join(__dirname,"../dev-assets"),
    test:      Path.join(__dirname,"../test"),
    tmp:       Path.join(os.tmpdir(),"slimejs"),
    homedir
};


export const pathExists = async function(path){
    let exists = true;
    try{
        await fs.stat(path);
    }catch(err){
        if(err.code === "ENOENT"){
            exists = false;
        }
    }
    return exists;
};


const resolveIfPromise = async function(val){
    if(val instanceof Promise){
        return await val;
    }
    return val;
};

const inquireDefault = async function(prompt,options=""){
    if(typeof options === "string"){
        options = {default:options};
    }
    if(options.default !== ""){
        let dd = "";
        if(options.defaultDescription){
            dd = ` (${options.defaultDescription})`;
        }
        prompt = prompt+`\n [default=empty: ${options.default}${dd}]: `;
    }
    while(true){
        let res = await rl.question(prompt);
        if(res === ""){
            res = options.default;
        }
        if(options.checkValid){
            if(await resolveIfPromise(options.checkValid(res))){
                return res;
            }else{
                if(options.failMsg)
                    console.log(options.failMsg);
                continue;
            }
        }else{
            return res;
        }
    }
};

const inquireYn = async function(prompt){
    const res = await rl.question(prompt+" [Y/n]: ");
    if(res.trim().toLowerCase() === "n"){
        return false;
    }
    return true;
};

const inquireyN = async function(prompt){
    const res = await rl.question(prompt+" [y/N]: ");
    if(res.trim().toLowerCase() === "y"){
        return true;
    }
    return false;
};

export const resetDir = async function(path){
    await fs.rm(path,{recursive:true,force:true});
    await fs.mkdir(path);
};

const inquirePath = async function(prompt,defaultVal){
    return await inquireDefault(prompt,{
        default: defaultVal,
        checkValid: async (res)=>(res !== "" && (await pathExists(res))),
        failMsg: "Please provide a valid directory"
    });
};

let defaultMcRoot = "";
if(process.platform === "win32"){
    defaultMcRoot = Path.join(homedir,"AppData/Roaming/.minecraft/");
}else if(process.platform === "darwin"){
    defaultMcRoot = Path.join(homedir,"Library/Application Support/minecraft/");
}else if(process.platform === "linux"){
    defaultMcRoot = Path.join(homedir,".minecraft/");
}else{
    console.log(`Warning: no default minecraft directory set for ${process.platform}`);
}

export const inquire = {
    overwriteIfExists: async function(path){
        //true if overwrite or path DNE
        if(!await pathExists(path)){
            return true;
        }
        if(await inquireYn(`${path} already exists,\n do you wish to overwrite?`)){
            console.log(`Overwriting ${path}`);
            await fs.rm(path,{recursive:true,force:true});
            return true;
        }else{
            console.log("Aborting");
            return false;
        }
    },
    mcRoot: async function(defaultVal=defaultMcRoot){
        return await inquirePath("Specify the Minecraft root directory",defaultVal);
    },
    worldName: async function(defaultVal){
        return await inquireDefault("Choose the world name",defaultVal);
    },
    default: inquireDefault,
    path: inquirePath,
    Yn: inquireYn,
    yN: inquireyN
};





