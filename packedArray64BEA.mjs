const int32ToBinary = function(n){
    const z16 = "0000000000000000";
    return (z16+(n>>>16).toString(2)).slice(-16) +
    (z16+(n&0xffff).toString(2)).slice(-16);
};


//interface view
//view {
//    byteLength
//    byteOffset
//    buffer
//}
//64 bit aligned packed array
export const unpackArray_64BEA = function*(data/*:view*/,bitDepth/*:int*/,length/*:int*/){// yields int
    const i32 = new Int32Array(data.buffer,data.byteOffset,data.byteLength/4);
    const period = Math.floor(64/bitDepth);
    //const length = period*i32.length/2;
    for(let i = 0; i < length; i++){
        const idx = Math.floor(i/period);
        //reverse the offset because of bit order within Int64
        const offset = 64-bitDepth-(i%period)*bitDepth;
        const int1 = i32[idx*2+1];
        const int2 = i32[idx*2];
        let res;
        if(offset < 32){
            if(offset === 0){
                res = int1;
            }else{
                res = (int1<<offset)|(int2>>>(32-offset));
            }
        }else{
            res = int2<<(offset%32);
        }
        yield res>>>(32-bitDepth);
    }
};

export class PackedArray_64BEA_Builder{
    constructor(bitDepth/*int*/,length/*int*/){
        const period = this.period = Math.floor(64/bitDepth);
        this.i32 = new Int32Array(Math.ceil(length/period)*2);
        this.bitDepth = bitDepth;
        this.length = length;
    }
    set(i/*int*/,val/*int*/){
        const {period,bitDepth,i32} = this;
        const idx = Math.floor(i/period);
        const offset = bitDepth*(i%period);
        console.log("offset:",offset,val,idx);
        if(offset < 32){
            i32[idx*2] |= val<<offset;
            console.log(i32[idx*2]);
            if(offset+bitDepth > 32){
                i32[idx*2+1] |= val>>>(32-offset);
            }
        }else{
            i32[idx*2+1] |= val<<(offset-32);
        }
    }
    export(){
        return new BigInt64Array(this.i32.buffer);
    }
};
