/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 10/30/2016
 */

import {isArray, Tokenizer} from './tokenizer';
import {Parser} from './parser';
import {IMyTokenizer, IMyParser} from './defination';
const tokenizer = new Tokenizer<IMyTokenizer>({
    split: /\s*(:|,|\{|}|\[|]|[0-9]+(\.[0-9]+)?|"[^\"]*")\s*/y,
    number: /[0-9]+(\.[0-9]+)?/,
    string: /"[^\"]*"/,
    $lcb : /\{/,
    $rcb : /}/,
    $lsb : /\[/,
    $rsb : /]/,
    $colon : /\:/,
    $comma : /,/,
    $true : /true/,
    $false : /false/,
    $null : /null/
});
const parser = new Parser<IMyTokenizer, IMyParser<IMyTokenizer>>({
    token: tokenizer.token(),
    tokenMap: tokenizer.tokenMap(),
    value: _=>[
        [[_.token.number],$=>$[0]],
        [[_.token.string],$=>$[0]],
        [[_.token.$null],$=>null],
        [[_.token.$false],$=>false],
        [[_.token.$true],$=>true],
        [[_.array],$=>$[0]],
        [[_.object],$=>$[0]]
    ],
    item: _=>[
        [[_.token.string,_.token.$colon,_.value]
            ,$=>Object.defineProperty({},$[0],{value:$[2], enumerable: true})],
    ],
    array: _=>[
        [[_.token.$lsb,_.array_meta,_.token.$rsb], $=>$[1]],
    ],
    object: _=>[
        [[_.token.$lcb,_.object_meta,_.token.$rcb],$=>$[1]],
    ],
    array_meta:_=>[
        [[_.array_meta,_.token.$comma,_.value],$=>$[0].concat([$[2]])],
        [[_.value],$=>[$[0]]],
    ],
    object_meta:_=>[
        [[_.object_meta,_.token.$comma,_.item],$=>Object.assign($[0],$[2])],
        [[_.item],$=>$[0]],
    ]
},true);
function mprint(obj){
    if(isArray(obj))
        return "[" + obj.map(x=>mprint(x)).join(",") + "]";
    else
        return obj;
}
const [token, tokenType] = tokenizer.tokenize(`{"employees": [{ "firstName":"Bill" , "lastName":"Gates" },{ "firstName":"George" , "lastName":"Bush" },{ "firstName":"Thomas" , "lastName":"Carter" }]}`);
const parseResult = parser.parse(token, tokenType, 'object');
console.log(parseResult);

