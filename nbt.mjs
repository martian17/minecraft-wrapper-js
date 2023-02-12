import {decodeJavaUTF8, encodeJavaUTF8} from "./javaUTF8.mjs";
import {BufferBuilder} from "./bufferBuilder.mjs";

export const TAG_End = 0;
export const TAG_Byte = 1;
export const TAG_Short = 2;
export const TAG_Int = 3;
export const TAG_Long = 4;
export const TAG_Float = 5;
export const TAG_Double = 6;
export const TAG_Byte_Array = 7;
export const TAG_String = 8;
export const TAG_List = 9;
export const TAG_Compound = 10;
export const TAG_Int_Array = 11;
export const TAG_Long_Array = 12;

const A64 = new BigInt64Array(1);
const A32 = new Int32Array(A64.buffer);
const A16 = new Int16Array(A64.buffer);
const A8 = new Int8Array(A64.buffer);
const F32 = new Float32Array(A64.buffer);
const F64 = new Float64Array(A64.buffer);

class NBT_Number{
    constructor(val,type){
        this.value = val;
        this.type = type;
    }
};

export const decoders = [];

decoders[TAG_End] = (u8,i)=>{
    throw new Error("unexpected TAG_END");
};

decoders[TAG_Byte] = (u8,i)=>{
    A8[0] = u8[i];
    return [new NBT_Number(A8[0],TAG_Byte),i+1];
};

decoders[TAG_Short] = (u8,i)=>{
    A16[0] = (u8[i++]<<8)|u8[i++];
    return [new NBT_Number(A16[0],TAG_Short),i];
};

decoders[TAG_Int] = (u8,i)=>{
    const val = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    return [new NBT_Number(val,TAG_Int),i];
};

decoders[TAG_Long] = (u8,i)=>{
    const v1 = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    const v2 = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    A32[0] = v2;
    A32[1] = v1;
    //const val = BigInt(v1)*4294967296n+BigInt(v2);
    return [A64[0],i];
};

decoders[TAG_Float] = (u8,i)=>{
    A32[0] = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    return [new NBT_Number(F32[0],TAG_Float),i];
};

decoders[TAG_Double] = (u8,i)=>{
    A32[0] = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    A32[1] = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    return [new NBT_Number(F64[0],TAG_Double),i];
};

decoders[TAG_Byte_Array] = (u8,i)=>{
    const len = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    const val = new Int8Array(len);
    for(let j = 0; j < len; j++){
        val[j] = u8[i++];
    }
    return [val,i];
};

decoders[TAG_String] = (u8,i)=>{
    const len = (u8[i++]<<8)|u8[i++];
    const val = decodeJavaUTF8(u8,i,i+len);
    i += len;
    return [val,i];
};

decoders[TAG_List] = (u8,i)=>{
    const typeid = u8[i++];
    const len = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    const val = [];
    for(let j = 0; j < len; j++){
        let v;
        [v,i] = decoders[typeid](u8,i);
        val.push(v);
    }
    return [val,i];
};

decoders[TAG_Compound] = (u8,i)=>{
    const val = {};//Object.create(null);
    while(i < u8.length){
        const typeid = u8[i++];
        if(typeid === TAG_End)break;
        let name,v;
        [name,i] = decoders[TAG_String](u8,i);
        [v,i] = decoders[typeid](u8,i);
        val[name] = v;
    }
    return [val,i];
};

decoders[TAG_Int_Array] = (u8,i)=>{
    const len = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    const val = new Int32Array(len);
    for(let j = 0; j < len; j++){
        val[j] = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    }
    return [val,i];
};

decoders[TAG_Long_Array] = (u8,i)=>{
    const len = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
    const val = new BigInt64Array(len);
    for(let j = 0; j < len; j++){
        const v1 = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
        const v2 = (u8[i++]<<24)|(u8[i++]<<16)|(u8[i++]<<8)|u8[i++];
        val[j] = BigInt(v1)*4294967296n+BigInt(v2);
    }
    return [val,i];
};


export const decodeNBT = function(u8){
    let val,i;
    [val,i] = decoders[TAG_Compound](u8,0);
    console.log(`read nbt with ending ${u8[i]}`);
    return val;
};




const encoders = [];

encoders[TAG_Byte] = (buff,val)=>{
    buff.append_I8(val.value);
};

encoders[TAG_Short] = (buff,val)=>{
    buff.append_I16BE(val.value);
};

encoders[TAG_Int] = (buff,val)=>{
    buff.append_I32BE(val.value);
};

encoders[TAG_Long] = (buff,val)=>{
    buff.append_I64BE(val);
};

encoders[TAG_Float] = (buff,val)=>{
    buff.append_F32BE(val.value);
};

encoders[TAG_Double] = (buff,val)=>{
    buff.append_F64BE(val.value);
};

encoders[TAG_Byte_Array] = (buff,val)=>{
    const valbuff = val.buffer;
    buff.append_I32BE(valbuff.byteLength);
    buff.append_buffer(valbuff);
};

encoders[TAG_String] = (buff,val)=>{
    const strbuff = encodeJavaUTF8(val);
    buff.append_U16BE(strbuff.byteLength);
    buff.append_buffer(strbuff);
};

encoders[TAG_List] = (buff,vals)=>{
    let type;
    if(vals.length === 0){
        type = TAG_End;
    }else{
        type = getType(vals[0]);
    }
    buff.append_U8(type);
    buff.append_I32BE(vals.length);
    for(let val of vals){
        encoders[type](buff,val);
    }
};

encoders[TAG_Compound] = (buff,vals)=>{
    for(let key in vals){
        const type = getType(val);
        buff.append_U8(type);
        encoders[TAG_String](buff,key);
        const val = vals[key];
        encoders[type](buff,val);
    }
    buff.append_U8(TAG_End);
};

encoders[TAG_Int_Array] = (buff,val)=>{
    buff.append_I32BE(val.length);
    buff.append_buffer(val.buffer);
};

encoders[TAG_Long_Array] = (buff,val)=>{
    buff.append_I32BE(val.length);
    buff.append_buffer(val.buffer);
};

const getType = function(obj){
    if(ArrayBuffer.isView(obj)){
        if(obj instanceof Int8Array){
            return TAG_Byte_Array;
        }else if(obj instanceof Int32Array){
            return TAG_Int_Array;
        }else if(obj instanceof BigInt64Array){
            return TAG_Long_Array;
        }
    }else if(obj instanceof Array){
        return TAG_List;
    }else if(obj instanceof NBT_Number){
        return obj.type;
    }else if(typeof obj === "bigint"){
        return TAG_Long;
    }else if(typeof myVar === 'string' || myVar instanceof String){
        return TAG_String;
    }else if(obj instanceof Object){
        return TAG_Compound;
    }else{
        throw new Error("Unknown NBT type:",obj);
    }
};

export const encodeNBT = function(obj){
    const buffer = new BufferBuilder;
    encoders[getType(obj)](buffer,obj);
};


