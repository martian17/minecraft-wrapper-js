import {promises as fs} from "fs";
import fetch from "node-fetch";


const meta = JSON.parse(await fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json").then(r=>r.text()));

//console.log(meta);

const versions       = new Map;
const releases       = new Map;
const snapshots      = new Map;
const other_versions = new Map;
for(let version of meta.versions){
    versions.set(version.id,version);
    if(version.type === "release"){
        releases.set(version.id,version);
    }else if(version.type === "snapshot"){
        snapshots.set(version.id,version);
    }else{
        other_versions.set(version.id,version);
    }
}

export const latest = meta.latest.release;

export const getClientJar = async function(id){
    if(!versions.has(id))
        throw new Error(`Unknow version: ${id}`);
    const {url} = versions.get(id);
    const v = JSON.parse(await fetch(url).then(r=>r.text()));
    const ab = await fetch(v.downloads.client.url).then(r=>r.arrayBuffer());
    return Buffer.from(ab);
};

export const exists = function(id){
    return versions.has(id);
};

export default {getClientJar,latest,exists};











