/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 10/30/2016
 */

function isArray(o) {
    return Object.prototype.toString.call(o) === "[object Array]";
}

interface IAbstractTokenElements {
    split: RegExp
}
type ITokenRuleType = RegExp | [RegExp, number];
type IRuleType = IAbstractTokenElements | IAbstractParserElement

interface IAbstactParserElements<ITokenElements extends IAbstractTokenElements> {
    token: ITokenElements;
    tokenMap: Map<string,number>;
}

interface IAbstractParserElement {

}

interface IParserElement extends IAbstractParserElement {
    rules: IRuleType[];
    action: ($: any[])=>any;
}
type IParserElementBuilder<IParserElements> = (_: IParserElements)=>IParserElement[];


class EdgeRule {
    rule: number;
    to: number;

    constructor(rule: number, to: number) {
        this.rule = rule;
        this.to = to;
    }
}
class Tokenizer<ITokenElement extends IAbstractTokenElements> {
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
class Parser<ITokenElements extends IAbstractTokenElements,
    IParserElements extends IAbstactParserElements<ITokenElements>> {
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
        this.nodeMap = new Map<string,number>(<[string,number][]>nodeKeys.map((key, index)=>[key, index]));
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
                const elements = elementsBuilder[key](globalMock);
                this.startEdge[this.nodeMap.get(key)] = [[]];
                this.accept[this.nodeMap.get(key)] = [];
                const thisEdge = this.startEdge[this.nodeMap.get(key)];
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
        this.startEdge.forEach((edges, key)=>{
            for(let edge of edges[0]){
                if(edge.rule == key){//left recursive
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
    tmpLRResult : any;
    __resharpLeftRecuresiveResult(originalResult: any){
        if(originalResult[originalResult.length - 2]){
            const nextArray = originalResult[originalResult.length - 2];
            const next = nextArray.slice(0,nextArray.length - 2);
            this.tmpLRResult = nextArray[nextArray.length - 1]([this.tmpLRResult].concat(next));
            this.__resharpLeftRecuresiveResult(nextArray);
        }
    }
    __parse(target: number, parseLeftRecursive : boolean = false) {
        let point = 0;
        let parseResult = null;
        let parseResultPoint = null;
        let tmpParseResult = [];
        let resultPoint = null;
        if(parseLeftRecursive){
            console.log("@exe::recursive");
            for (const edge of this.startEdge[target][point]) {
                if(edge.rule == target){
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
                if(this.isLeftRecursive[target] && !parseLeftRecursive && edge.rule == target) continue;
                if (edge.rule < 0) { //terminal
                    if (this.tmpTokenType[this.parseNow] == edge.rule) {
                        console.log(`#parsing: terminal${this.tokenMapReverse.get(edge.rule)}$$${this.tmpToken[this.parseNow]}`);
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
                       // console.log(`#parsing: non-terminal${this.nodeMapReverse.get(edge.rule)}$$${this.tmpToken[this.parseNow]}`);
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
                    if(this.isLeftRecursive[target] && !parseLeftRecursive){
                        console.log("@start::recursive");
                        const leftParseResult = this.__parse(target, true);
                        parseResult = this.accept[target][resultPoint](parseResult);
                        if(!leftParseResult){ //single node
                            return parseResult;
                        }
                        this.tmpLRResult = parseResult;
                        this.__resharpLeftRecuresiveResult([parseResult,leftParseResult,null]);
                        console.log("@stop::recursive");
                        return this.tmpLRResult;
                    }
                    if(parseLeftRecursive){
                        console.log("@mid::recursive");
                        parseResult.push(this.__parse(target, true));
                        return parseResult.concat([this.accept[target][resultPoint]]);
                    }
                    return this.accept[target][resultPoint](parseResult);
                }
                this.parseNow = savedParseNow;
                tmpParseResult = [];
                console.log("failed");
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
interface IMyTokenElements extends IAbstractTokenElements {
    number: ITokenRuleType;
    symbol: ITokenRuleType;
    name: ITokenRuleType;
    $if: ITokenRuleType;
    $plus: ITokenRuleType;
    $minus: ITokenRuleType;
    $div: ITokenRuleType;
    $multiply: ITokenRuleType;
}

interface IMyParserElements<T extends IAbstractTokenElements> extends IAbstactParserElements<T> {
    number: IParserElementBuilder<IMyParserElements<T>>;
    sum: IParserElementBuilder<IMyParserElements<T>>;
    product: IParserElementBuilder<IMyParserElements<T>>;
}

const tokenizer = new Tokenizer<IMyTokenElements>({
    split: /\s*(=|%|<|>|\+|-|\*|\\|\(|\)|\{|}|\[|]|[0-9]+(\.[0-9]+)?|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*/y,
    number: /[0-9]+(\.[0-9]+)?/,
    name: /[a-zA-Z_$][a-zA-Z0-9_$]*/,
    symbol: /=|%|<|>|\+|-|\*|\\|\(|\)|\{|}|\[|]/,
    $if: [/if/, 3],
    $plus: [/\+/, 3],
    $minus: [/-/, 3],
    $multiply: [/\*/, 3],
    $div: [/\//, 3],
});
const [token, tokenType] = tokenizer.tokenize("5+4*3+6*2+1/4");
console.log(token);
console.log(tokenType);
const parser = new Parser<IMyTokenElements, IMyParserElements<IMyTokenElements>>({
    token: tokenizer.token(),
    tokenMap: tokenizer.tokenMap(),
    number: _=>[
        {
            rules: [_.token.number],
            action: $=>parseInt($[0])
        }
    ],
    product: _=>[
        {
            rules: [_.number],
            action: $=>$[0]
        },
        {
            rules: [_.product, _.token.$multiply, _.number],
            action: $=>[$[0], '*', $[2]]
        },
        {
            rules: [_.product, _.token.$div, _.number],
            action: $=>[$[0], '/', $[2]]
        }
    ],
    sum: _=>[
        {
            rules: [_.product],
            action: $=>$[0]
        },
        {
            rules: [_.sum, _.token.$plus, _.product],
            action: $=>[$[0], '+', $[2]]
        },
        {
            rules: [_.sum, _.token.$minus, _.product],
            action: $=>[$[0], '-', $[2]]
        }
    ]
},true);
const parseResult = parser.parse(token, tokenType, 'sum');
console.log(parseResult);

