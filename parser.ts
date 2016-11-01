import {IAbstractTokenizer} from "./tokenizer";
/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 11/1/2016
 */
function isArray(o) {
    return Object.prototype.toString.call(o) === "[object Array]";
}
interface IAbstractParserElement {

}
interface IParserElement extends IAbstractParserElement {
    rules: IRuleType[];
    action: ($: any[])=>any;
}
type IParserElementTuple = [IRuleType[],($: any[])=>any];
type IRuleType = IAbstractTokenizer | IAbstractParserElement
class EdgeRule {
    rule: number;
    to: number;

    constructor(rule: number, to: number) {
        this.rule = rule;
        this.to = to;
    }
}
export type ISymbol<IParserElements> = (_: IParserElements)=>(IParserElement|IParserElementTuple)[]
export interface IAbstactParser<ITokenElements extends IAbstractTokenizer> {
    token: ITokenElements;
    tokenMap: Map<string,number>;
}
export class Parser<ITokenElements extends IAbstractTokenizer,
    IParserElements extends IAbstactParser<ITokenElements>> {
    startEdge: EdgeRule[][][]; // name, points, rules
    accept: (($: any[])=>any)[][];
    tokenMap: Map<string,number>;
    tokenMapReverse: Map<number,string>;
    nodeMap: Map<string,number>;
    nodeMapReverse: Map<number,string>;
    isLeftRecursive: boolean[];

    constructor(elementsBuilder: IParserElements, debug = false) {
        this.startEdge = [];
        this.accept = [];
        this.tokenMap = elementsBuilder.tokenMap;
        this.isLeftRecursive = [];
        const nodeKeys = Object
            .keys(elementsBuilder)
            .filter(x=>x != "token" && x != "tokenMap");
        this.nodeMap = new Map<string,number>
        (<[string,number][]>nodeKeys.map((key, index)=>[key, index]));
        const globalMock = nodeKeys
            .reduce(
                (prev, current)=> {
                    prev[current] = this.nodeMap.get(current);
                    return prev;
                }, {});
        globalMock["token"] = {};
        Object
            .keys(elementsBuilder.token)
            .filter(x=>x != "split")
            .forEach(x=>globalMock["token"][x] = this.tokenMap.get(x));
        Object
            .keys(elementsBuilder)
            .filter(x=>x != "token" && x != "tokenMap")
            .forEach(key=> {
                this.startEdge[this.nodeMap.get(key)] = [[]];
                this.accept[this.nodeMap.get(key)] = [];
                const thisEdge = this.startEdge[this.nodeMap.get(key)];
                const elements = elementsBuilder[key](globalMock).map(element=>isArray(element) ? {
                    rules: element[0],
                    action: element[1],
                } : element);
                elements.forEach(rule=> {
                    let nowPoint = 0;
                    rule.rules.forEach((nowRule: number)=> {
                        const now = thisEdge[nowPoint];
                        for (let edge of now) {
                            if (edge.rule === nowRule) {
                                nowPoint = edge.to;
                                return;
                            }
                        }
                        const pointCnt = thisEdge.length;
                        thisEdge.push([]);
                        thisEdge[nowPoint].push({
                            rule: nowRule,
                            to: pointCnt
                        });
                        nowPoint = pointCnt;
                    });
                    this.accept[this.nodeMap.get(key)][nowPoint] = rule.action;
                });
            });
        this.startEdge.forEach((edges, key)=> {
            for (let edge of edges[0]) {
                if (edge.rule == key) {//left recursive
                    this.isLeftRecursive[key] = true;
                    return;
                }
            }
        });
        if (debug) {
            this.tokenMapReverse = new Map<number,string>(<[number,string][]>
                Array.from(this.tokenMap.keys()).map(key=>[this.tokenMap.get(key), key]));
            this.nodeMapReverse = new Map<number,string>(<[number,string][]>
                Array.from(this.nodeMap.keys()).map(key=>[this.nodeMap.get(key), key]));
        }
    }

    tmpToken: string[];
    tmpTokenType: number[];
    parseNow: number;
    tmpLRResult: any;

    __resharpLeftRecuresiveResult(originalResult: any) {
        if (originalResult[originalResult.length - 2]) {
            const nextArray = originalResult[originalResult.length - 2];
            const next = nextArray.slice(0, nextArray.length - 2);
            this.tmpLRResult = nextArray[nextArray.length - 1]([this.tmpLRResult].concat(next));
            this.__resharpLeftRecuresiveResult(nextArray);
        }
    }

    __parse(target: number, parseLeftRecursive: boolean = false) {
        let point = 0;
        let parseResult = null;
        let parseResultPoint = null;
        let tmpParseResult = [];
        let resultPoint = null;
        if (parseLeftRecursive) {
            for (const edge of this.startEdge[target][point]) {
                if (edge.rule == target) {
                    point = edge.to;
                    break;
                }
            }
        }
        while (true) {
            const savedParseNow = this.parseNow;
            let success = false;
            const edges = this.startEdge[target][point];
            for (const edge of edges) {
                if (this.isLeftRecursive[target] && !parseLeftRecursive && edge.rule == target) continue;
                if (edge.rule < 0) { //terminal
                    if (this.tmpTokenType[this.parseNow] == edge.rule) {
                        tmpParseResult.push(this.tmpToken[this.parseNow]);
                        this.parseNow++;
                        point = edge.to;
                        success = true;
                        break;
                    }
                }
                else {//non terminal
                    const tempResult = this.__parse(edge.rule);
                    if (tempResult) {
                        tmpParseResult.push(tempResult);
                        point = edge.to;
                        success = true;
                        break;
                    }
                }
            }
            if (!success) {
                if (parseResult) {
                    this.parseNow = parseResultPoint;
                    if (this.isLeftRecursive[target] && !parseLeftRecursive) {
                        const leftParseResult = this.__parse(target, true);
                        parseResult = this.accept[target][resultPoint](parseResult);
                        if (!leftParseResult) { //single node
                            return parseResult;
                        }
                        this.tmpLRResult = parseResult;
                        this.__resharpLeftRecuresiveResult([parseResult, leftParseResult, null]);
                        return this.tmpLRResult;
                    }
                    if (parseLeftRecursive) {
                        parseResult.push(this.__parse(target, true));
                        return parseResult.concat([this.accept[target][resultPoint]]);
                    }
                    return this.accept[target][resultPoint](parseResult);
                }
                this.parseNow = savedParseNow;
                tmpParseResult = [];
                return null;
            }
            if (this.accept[target][point]) {
                parseResult = tmpParseResult;
                resultPoint = point;
                parseResultPoint = this.parseNow;
            }
        }
    }

    parse(token: string[], tokenType: number[], target: string) {
        this.tmpToken = token;
        this.tmpTokenType = tokenType;
        this.parseNow = 0;
        return this.__parse(this.nodeMap.get(target));
    }

}