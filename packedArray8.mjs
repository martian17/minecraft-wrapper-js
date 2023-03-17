export const packedArrayI8_4_get = function(i8,idx){
    const super_idx = idx>>>1;
    const offset = (idx&1)<<2;// 4 or 0
    return (i8[super_idx]>>>offset)&0xf;
};

export const packedArrayI8_4_set = function(i8,idx,val){
    const super_idx = idx>>>1;
    const offset = (idx&1)<<2;// 4 or 0
    const base_data = i8[super_idx]&0xff;
    i8[super_idx] = (base_data&(0xf0>>>offset))|(val<<offset);
};

