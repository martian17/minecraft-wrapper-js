export class BufferBuilder{
    length = 0;
    size = 512;
    buffer;
    u8;
    constructor(size,length=0){
        const size = this.size = size || this.size;
        const buffer = this.buffer = new ArrayBuffer(size);
        this.length = length;
        this.refreshViews();
    }
    refreshViews(){
        this.u8 = new Uint8Array(this.buffer);
    }
    alloc(){
        if(this.length < this.size){
            return;
        }
        this.size *= 2;
        const newbuf = new ArrayBuffer(this.size);
        newbuf.set(this.buffer);
        this.buffer = newbuf;
        this.refreshViews();
    }
    grow(n){
        this.length += n;
        this.alloc();
    }
    growIfNoSpace(offset,insertLength){
        const newalloc = offset + insertLength - this.size;
        if(newalloc > 0){
            this.grow(newalloc);
        }
    }
    set(buff,offset = 0){
        this.growIfNoSpace(offset,buff.byteLength);
        this.buffer.set(buff,offset);
    }
    append_buffer(buff){
        this.set(buff,this.length);
    }
    export(){
        return this.buffer.slice(0,this.length);
    }
};

const BE_writers = [];
BE_writers[2] = function(u81,u82,offset){
    u81[offset] = u82[1];
    u81[offset+1] = u82[0];
}

BE_writers[4] = function(u81,u82,offset){
    u81[offset] = u82[3];
    u81[offset+1] = u82[2];
    u81[offset+2] = u82[1];
    u81[offset+3] = u82[0];
}

BE_writers[8] = function(u81,u82,offset){
    u81[offset] = u82[7];
    u81[offset+1] = u82[6];
    u81[offset+2] = u82[5];
    u81[offset+3] = u82[4];
    u81[offset+4] = u82[3];
    u81[offset+5] = u82[2];
    u81[offset+6] = u82[1];
    u81[offset+7] = u82[0];
}



for(let [typename,typearr] of [
    "U8",Uint8Array(1),
    "U16",Uint16Array(1),
    "U32",Uint32Array(1),
    "U64",BigUint64Array(1),
    "I8",Int8Array(1),
    "I16",Int16Array(1),
    "I32",Int32Array(1),
    "I64",BigInt64Array(1),
    "F32",Float32Array(1),
    "F64",Float64Array(1)]){
    const typesize = typearr.buffer.byteLength;
    const u8 = new Uint8Array(typearr.buffer);
    BufferBuilder.prototype["append_"+typename] = function(val){
        typearr[0] = val;
        this.grow(typesize);
        this.buffer.set(typearr.buffer,this.length-typesize);
    }
    BufferBuilder.prototype["set_"+typename] = function(val,offset){
        typearr[0] = val;
        this.growIfNoSpace(offset,typesize);
        this.set(typearr.buffer,offset);
    }
    if(typesize === 1)continue;
    BufferBuilder.prototype["set_"+typename+"_aligned"] = function(val,offset){
        typearr[0] = val;
        offset *= typesize;
        this.growIfNoSpace(offset,typesize);
        this.set(typearr.buffer,offset);
    }

    const BE_writer = BE_writers[typesize];
    BufferBuilder.prototype["append_"+typename+"BE"] = function(val){
        const length0 = this.length;
        typearr[0] = val;
        this.grow(typesize);
        BE_writer(this.u8,u8,length0);
    }
    BufferBuilder.prototype["set_"+typename+"BE"] = function(val,offset){
        typearr[0] = val;
        this.growIfNoSpace(offset,typesize);
        BE_writer(this.u8,u8,offset);
    }
    BufferBuilder.prototype["set_"+typename+"BE_aligned"] = function(val,offset){
        typearr[0] = val;
        offset *= typesize;
        this.growIfNoSpace(offset,typesize);
        BE_writer(this.u8,u8,offset);
    }
}



