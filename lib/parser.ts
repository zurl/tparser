/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 11/1/2016
 */
import {IAbstractTokenElements} from "./tokenizer";
import {isArray} from "./util";
interface ParserClosure{
    target: number;
    tempParseResult: any[];
    finalParseResult: any[];
    finalParseResultNow: number;
    finalParseResultPoint: number;
    parseLeftRecursive: boolean;
    isEmptyFlag: boolean;
}
interface IAbstractParserElement {

}
interface IParserElement extends IAbstractParserElement {
    rules: IRuleType[];
    action: ($: any[])=>any;
}
type IParserElementTuple = [IRuleType[],($: any[])=>any];
type IRuleType = IAbstractTokenElements | IAbstractParserElement
class EdgeRule {
    rule: number;
    to: number;

    constructor(rule: number, to: number) {
        this.rule = rule;
        this.to = to;
    }
}
export type ISymbol<IParserElements> = (_: IParserElements)=>(IParserElement|IParserElementTuple)[]
export interface IAbstractParserElements<ITokenElements extends IAbstractTokenElements> {
    token: ITokenElements;
    tokenMap: Map<string,number>;
}



// The generic constrain is virtual constrain that used to check the
// validity of grammar rules.
export class Parser<ITokenElements extends IAbstractTokenElements,
    IParserElements extends IAbstractParserElements<ITokenElements>> {

    startEdge: EdgeRule[][][]; // name, points, rules
    accept: (($: any[])=>any)[][];
    tokenMap: Map<string,number>;
    tokenMapReverse: Map<number,string>;
    nodeMap: Map<string,number>;
    nodeMapReverse: Map<number,string>;
    isLeftRecursive: boolean[];

    enableDebug: boolean;
    tmpToken: string[];
    tmpTokenType: number[];
    parseNow: number;
    tmpLRResult: any;

    // This two stack is just records of parsing procedure
    // which provide metadata to print debug information
    savedParseStack: [string, number][];
    parseStack: [string, number][];

    // This two flags is used to be a unique identifier
    // Due to the following parser use exception to be
    // a method to jump from deep recursive
    errorFlag : Object;
    parseFailedFlag: Object;

    constructor(elementsBuilder: IParserElements, debug = false, errorFlag = {}) {
        this.errorFlag = errorFlag;
        this.tokenMap = elementsBuilder.tokenMap;
        this.__emptyParseFlag = false;
        this.parseFailedFlag = {};
        this.startEdge = [];
        this.accept = [];
        this.parseStack = [];
        this.isLeftRecursive = [];
        this.enableDebug = debug;
        const nodeKeys = Object
            .keys(elementsBuilder)
            .filter(x=>x != "token" && x != "tokenMap");
        this.nodeMap = new Map<string,number>
        (<[string,number][]>nodeKeys.map((key, index)=>[key, index]));
        const globalMock = nodeKeys
            .reduce(
                (prev, current:string)=> {
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
                elements.forEach(rule => { //EACH RULE
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
        // provide the reversed mapping to provide debug information
        this.tokenMapReverse = new Map<number,string>(<[number,string][]>
            Array.from(this.tokenMap.keys()).map(key=>[this.tokenMap.get(key), key]));
        this.nodeMapReverse = new Map<number,string>(<[number,string][]>
            Array.from(this.nodeMap.keys()).map(key=>[this.nodeMap.get(key), key]));
        if(debug)console.log("construction ok");
    }

    // according the feature of left recursive, we must convert it to
    // right recursive, and to satisfy the order of left recursive,
    // we must reshape the result.
    __reshapeLeftRecursiveResult(originalResult: any) {
        if (originalResult[originalResult.length - 2] != this.parseFailedFlag) {
            const nextArray = originalResult[originalResult.length - 2];
            const next = nextArray.slice(0, nextArray.length - 2);
            this.tmpLRResult = nextArray[nextArray.length - 1]([this.tmpLRResult].concat(next));
            this.__reshapeLeftRecursiveResult(nextArray);
        }
    }

    __emptyParseFlag: boolean;

    __parseStep(point: number, closure: ParserClosure) {
        const target = closure.target;
        const savedParseNow = this.parseNow;
        const edges = this.startEdge[target][point];
        if (this.accept[target][point]) {
            // find a valid result, according to the greedy strategy
            // we should store the result, and try to continue
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
                    this.__parseStep(edge.to, closure);
                }
            }
            else {//non terminal
                if (this.enableDebug)console.log(`try ${this.nodeMapReverse.get(edge.rule)}`);
                const tempResult = this.__parse(edge.rule);
                if(this.__emptyParseFlag){
                    closure.isEmptyFlag = true;
                }
                else closure.isEmptyFlag = false;
                this.__emptyParseFlag = false;
                if (tempResult != this.parseFailedFlag) {
                    closure.tempParseResult.push(tempResult);
                    this.__parseStep(edge.to, closure);
                }
            }
        }
        if (closure.finalParseResult) {
            this.parseNow = closure.finalParseResultNow;
            // specify the left recursive condition, use the special strategy
            // to parse lr item.
            if (this.isLeftRecursive[target] && !closure.parseLeftRecursive) {
                const leftParseResult = this.__parse(target, true);
                this.__emptyParseFlag = false;
                const parseResult = this.accept[target][closure.finalParseResultPoint](closure.finalParseResult);
                if (leftParseResult == this.parseFailedFlag ) { //single node
                    throw parseResult;
                }
                this.tmpLRResult = parseResult;
                this.__reshapeLeftRecursiveResult([parseResult, leftParseResult, this.parseFailedFlag]);
                throw this.tmpLRResult;
            }
            // As it to parse continually
            if (closure.parseLeftRecursive) {
                // append the result reversely
                if(!closure.isEmptyFlag) {  // see on ` items ::= items item | item, item ::= sth | eps`
                    closure.finalParseResult.push(this.__parse(target, true));
                }
                else{
                    throw this.parseFailedFlag;
                }
                throw closure.finalParseResult.concat([this.accept[target][closure.finalParseResultPoint]]);
            }
            if(closure.finalParseResultPoint == 0){
                this.__emptyParseFlag = true;
            }
            throw this.accept[target][closure.finalParseResultPoint](closure.finalParseResult);
        }
        this.parseNow = savedParseNow;
        if (this.enableDebug)console.log("failed");
        this.savedParseStack = this.parseStack.slice(0);
    }

    __parse(target: number, parseLeftRecursive: boolean = false) {
        this.parseStack.push([this.nodeMapReverse.get(target), this.parseNow]);
        if (this.enableDebug)
            console.log(`parser ${this.nodeMapReverse.get(target)} @ `
                +`${this.tokenMapReverse.get(this.tmpTokenType[this.parseNow])}`
                + `@ ${this.tmpToken[this.parseNow]} # ${parseLeftRecursive}`);
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
            finalParseResultPoint : 0,
            isEmptyFlag : false
        };
        try{
            this.__parseStep(point, closure);
        }catch(e){
            if( e == this.errorFlag)throw e;
            return e;
        }
        this.parseStack.pop();
        return this.parseFailedFlag;
    }


    parse(token: string[], tokenType: number[], target: string) {
        this.tmpToken = token;
        this.tmpTokenType = tokenType;
        this.parseNow = 0;
        const result =  this.__parse(this.nodeMap.get(target));
        this.__emptyParseFlag = false;
        if(result == this.parseFailedFlag){
            console.log("Parsing Failed:");
            this.savedParseStack
                .reverse()
                .forEach(item=>{
                    const left = Math.max(0, item[1] - 2);
                    const right = Math.min(this.tmpToken.length - 1, item[1] + 2);
                    console.log(`   at parsing "${item[0]}":\n      ${
                        this.tmpToken.map((x,index)=>index == item[1]?`[${x}]`:x).slice(left,right + 1)}`);
                });
            return null;
        }
        return result;

    }
}
