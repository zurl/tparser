/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 2017/2/24
 */


import {Tokenizer, IAbstractTokenElements} from '../lib/tokenizer';
import {Parser, ISymbol, IAbstractParserElements} from '../lib/parser';
import {IMyParserElements, IMyTokenElements} from "./json_eg_def";
import {isArray} from "../lib/util";
export const tokenizer = new Tokenizer({
    split: /\s*(:|,|\{|}|\[|]|[0-9]+(\.[0-9]+)?|"[^"]*")\s*/y,
    number: /[0-9]+(\.[0-9]+)?/,
    string: /"[^"]*"/,
    $lcb: /\{/,
    $rcb: /}/,
    $lsb: /\[/,
    $rsb: /]/,
    $colon: /:/,
    $comma: /,/,
    $true: /true/,
    $false: /false/,
    $null: /null/
});

export interface IMyParserElements2<T extends IAbstractTokenElements> extends IAbstractParserElements<T> {
    dec: ISymbol<IMyParserElements2<T>>;
    decs: ISymbol<IMyParserElements2<T>>;
    fuck: ISymbol<IMyParserElements2<T>>;
}
const parser = new Parser<IMyTokenElements, IMyParserElements2<IMyTokenElements>>({
    token: tokenizer.token(),
    tokenMap: tokenizer.tokenMap(),
    dec: _=>[
        [[], $=>'fuck'],
        [[_.token.$colon], $=>$[0]]
    ],
    decs: _=>[
        [[_.dec], $=>$[0]],
        [[_.decs, _.dec], $=>$]
    ],
    fuck: _=>[
        [[_.decs, _.token.$comma], $=>$],
    ],
},true);
function mprint(obj) {
    if (isArray(obj))
        return "[" + obj.map(x=>mprint(x)).join(",") + "]";
    else
        return obj;
}
const [token, tokenType] = tokenizer.tokenize(`
,
`);
const parserResult = parser.parse(token, tokenType, 'fuck');
console.log(parserResult);