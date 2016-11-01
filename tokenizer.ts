/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 11/1/2016
 */
function isArray(o) {
    return Object.prototype.toString.call(o) === "[object Array]";
}
export interface IAbstractTokenizer {
    split: RegExp
}
export type IToken = RegExp | [RegExp, number];
export class Tokenizer<ITokenElement extends IAbstractTokenizer> {
    tokenElements: ITokenElement;
    tokenRegExp: [RegExp, number][];
    tokenMapVal: Map<string,number>;

    constructor(tokenElements: ITokenElement) {
        this.tokenElements = tokenElements;
        const tokenKeys = Object.keys(this.tokenElements).filter(x=>x != "split");
        this.tokenMapVal = new Map<string,number>(<[string,number][]>tokenKeys.map((value, index)=>[value, -index - 1]));
        const tokenArray = tokenKeys.map(x=>isArray(this.tokenElements[x]) ?
            this.tokenElements[x].concat([this.tokenMapVal.get(x)])
            : [this.tokenElements[x], 0, this.tokenMapVal.get(x)]);
        tokenArray.sort((a, b)=>a[1] == b[1] ? 0 : a[1] < b[1] ? 1 : -1);
        this.tokenRegExp = <[RegExp, number][]>tokenArray.map(x=>[x[0], x[2]]);

    }

    tokenMap() {
        return this.tokenMapVal;
    }

    token() {
        return this.tokenElements;
    }

    tokenize(str: string): [string[], number[]] {
        const result = [];
        let match;
        while (match = this.tokenElements.split.exec(str)) {
            result.push(match[1]);
        }
        const type = result.map(token=> {
            for (const regExpTuple of this.tokenRegExp) {
                if (regExpTuple[0].test(token)) {
                    return regExpTuple[1];
                }
            }
            throw "illegal token";
        });
        return [result, type];
    }
}
