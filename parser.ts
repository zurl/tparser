import {IAbstractTokenizer} from "./tokenizer";
/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 11/1/2016
 */
function isArray(o) {
    return Object.prototype.toString.call(o) === "[object Array]";
}
interface ParserClosure{
    target: number;
    tempParseResult: any[];
    finalParseResult: any[];
    finalParseResultNow: number;
    finalParseResultPoint: number;
    parseLeftRecursive: boolean;
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
        this.parseFailedFlag = {};
        this.startEdge = [];
        this.accept = [];
        this.parseStack = [];
        this.tokenMap = elementsBuilder.tokenMap;
        this.isLeftRecursive = [];
        this.enableDebug = debug;
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
       // if (debug) {
            this.tokenMapReverse = new Map<number,string>(<[number,string][]>
                Array.from(this.tokenMap.keys()).map(key=>[this.tokenMap.get(key), key]));
            this.nodeMapReverse = new Map<number,string>(<[number,string][]>
                Array.from(this.nodeMap.keys()).map(key=>[this.nodeMap.get(key), key]));
        //}
    }

    enableDebug: boolean;
    tmpToken: string[];
    tmpTokenType: number[];
    parseNow: number;
    tmpLRResult: any;
    parseFailedFlag: Object;


    __resharpLeftRecuresiveResult(originalResult: any) {
        if (originalResult[originalResult.length - 2] != this.parseFailedFlag) {
            const nextArray = originalResult[originalResult.length - 2];
            const next = nextArray.slice(0, nextArray.length - 2);
            this.tmpLRResult = nextArray[nextArray.length - 1]([this.tmpLRResult].concat(next));
            this.__resharpLeftRecuresiveResult(nextArray);
        }
    }

    __parse_step(point: number, closure: ParserClosure) {
        const target = closure.target;
        const savedParseNow = this.parseNow;
        const edges = this.startEdge[target][point];
        if (this.accept[target][point]) {
            closure.finalParseResult = closure.tempParseResult;
            closure.finalParseResultPoint = point;
            closure.finalParseResultNow = this.parseNow;
        }
        for (const edge of edges) {
            if (this.isLeftRecursive[target] && !closure.parseLeftRecursive && edge.rule == target) continue;
            if (edge.rule < 0) { //terminal
                if (this.enableDebug)console.log(`try ${this.tokenMapReverse.get(edge.rule)}`);
                if (this.tmpTokenType[this.parseNow] == edge.rule) {
                    this.savedParseStack = null;
                    if (this.enableDebug)console.log("success");
                    closure.tempParseResult.push(this.tmpToken[this.parseNow]);
                    this.parseNow++;
                    this.__parse_step(edge.to, closure);
                }
            }
            else {//non terminal
                if (this.enableDebug)console.log(`try ${this.nodeMapReverse.get(edge.rule)}`);
                const tempResult = this.__parse(edge.rule);
                if (tempResult != this.parseFailedFlag) {
                    closure.tempParseResult.push(tempResult);
                    this.__parse_step(edge.to, closure);
                }
            }
        }
        if (closure.finalParseResult) {
            this.parseNow = closure.finalParseResultNow;
            if (this.isLeftRecursive[target] && !closure.parseLeftRecursive) {
                const leftParseResult = this.__parse(target, true);
                const parseResult = this.accept[target][closure.finalParseResultPoint](closure.finalParseResult);
                if (leftParseResult == this.parseFailedFlag) { //single node
                    throw parseResult;
                }
                this.tmpLRResult = parseResult;
                this.__resharpLeftRecuresiveResult([parseResult, leftParseResult, this.parseFailedFlag]);
                throw this.tmpLRResult;
            }
            if (closure.parseLeftRecursive) {
                closure.finalParseResult.push(this.__parse(target, true));
                throw closure.finalParseResult.concat([this.accept[target][closure.finalParseResultPoint]]);
            }
            throw this.accept[target][closure.finalParseResultPoint](closure.finalParseResult);
        }
        this.parseNow = savedParseNow;
        if (this.enableDebug)console.log("failed");
        this.savedParseStack = this.parseStack.slice(0);
    }

    __parse(target: number, parseLeftRecursive: boolean = false) {
        this.parseStack.push([this.nodeMapReverse.get(target), this.parseNow]);
        if (this.enableDebug)console.log(`parser ${this.nodeMapReverse.get(target)} @ ${this.tokenMapReverse.get(this.tmpTokenType[this.parseNow])} @ ${this.tmpToken[this.parseNow]} # ${parseLeftRecursive}`);
        let point = 0;
        if (parseLeftRecursive) {
            for (const edge of this.startEdge[target][point]) {
                if (edge.rule == target) {
                    point = edge.to;
                    break;
                }
            }
        }
        const closure : ParserClosure = {
            target: target,
            parseLeftRecursive: parseLeftRecursive,
            tempParseResult: [],
            finalParseResult: null,
            finalParseResultNow: this.parseNow,
            finalParseResultPoint : 0
        };
        try{
            this.__parse_step(point, closure);
        }catch(e){
            return e;
        }
        this.parseStack.pop();
        return this.parseFailedFlag;
    }
    savedParseStack: [string, number][];
    parseStack: [string, number][];
    parse(token: string[], tokenType: number[], target: string) {
        this.tmpToken = token;
        this.tmpTokenType = tokenType;
        this.parseNow = 0;
        const result =  this.__parse(this.nodeMap.get(target));
        if(result == this.parseFailedFlag){
            console.log("Parsing Failed:");
            this.savedParseStack
                .reverse()
                .forEach(item=>{
                    const left = Math.max(0, item[1] - 2);
                    const right = Math.min(this.tmpToken.length - 1, item[1] + 2);
                    console.log(`   at parsing "${item[0]}":\n      ${
                        this.tmpToken.map((_,index)=>index == item[1]?`[${_}]`:_).slice(left,right + 1)}`);
                });
            return null;
        }
        return result;

    }

}
function mprint(obj){
    if(isArray(obj))
        return "[" + obj.map(x=>mprint(x)).join(",") + "]";
    else
        return obj;
}