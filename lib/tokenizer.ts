/**
 *  @file TParse Tokenizer
 *  @author zcy <zurl@live.com>
 *  Created at 11/1/2016
 */

import {isArray} from "./util";
export interface IAbstractTokenElements {
    split: RegExp;
    [key: string]: IToken;
}
export type IToken = RegExp | [RegExp, number];

export class Tokenizer<ITokenElement extends IAbstractTokenElements> {
    tokenElements: ITokenElement;
    tokenRegExp: [RegExp, number][];
    tokenMapVal: Map<string,number>;

    constructor(tokenElements: ITokenElement) {
        this.tokenElements = tokenElements;

        // find all token
        const tokenKeys = Object.keys(this.tokenElements).filter(x=>x != "split");

        // index all token into number, negative stands for token
        this.tokenMapVal = new Map<string,number>(<[string,number][]>
            tokenKeys.map((value, index)=>[value, -index - 1]));

        // [ tokenName, privilege, id]
        const tokenArray = tokenKeys.map(x=>isArray(this.tokenElements[x]) ?
            (this.tokenElements[x] as [RegExp, number]).concat([this.tokenMapVal.get(x)])
            : [this.tokenElements[x], 0, this.tokenMapVal.get(x)]);
        tokenArray.sort((a, b)=>a[1] == b[1] ? 0 : a[1] < b[1] ? 1 : -1);

        this.tokenRegExp = tokenArray.map(x=>[x[0], x[2]]) as [RegExp, number][];
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
        const type = result.map(token => {
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
