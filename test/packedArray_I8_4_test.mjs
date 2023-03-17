import {packedArrayI8_4_get, packedArrayI8_4_set} from "../packedArray8.mjs";

const a = new Uint8Array([0x98,0x3a]);
const b = new Int8Array(a.buffer);
for(let i = 0; i < 4; i++){
	const val = packedArrayI8_4_get(b,i);
	console.log(val);
}

const newvals = [15,14,2,1];

for(let i = 0; i < 4; i++){
	packedArrayI8_4_set(b,i,newvals[i]);
}


for(let i = 0; i < 4; i++){
	const val = packedArrayI8_4_get(b,i);
	console.log(val);
}
