/**
 * Created by zcy on 2017/2/16.
 */
export function isArray(o) {
    return Object.prototype.toString.call(o) === "[object Array]";
}