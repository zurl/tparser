/**
 * Created by zcy on 2017/2/16.
 */
export function isArray(o) {
    return Object.prototype.toString.call(o) === "[object Array]";
}
export function countChr(str, chr){
    let result = 0;
    for(let i = 0; i < str.length; i++){
        if(str.charAt(i) == chr)result ++ ;
    }
    return result;
}