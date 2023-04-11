export const intdiv = function(a,b){
    return Math.floor(a/b);
};

export const reverseEndian = function(num){
    return (num>>>24&0xff)
    |(num>>>8&0xff00)
    |(num<<8&0xff0000)
    |(num<<24&0xff000000);
};
