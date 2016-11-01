/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 10/30/2016
 */
import {Tokenizer} from './tokenizer';
import {Parser} from './parser';
import {IMyTokenizer, IMyParser} from './defination';
const tokenizer = new Tokenizer<IMyTokenizer>({
    split: /\s*(=|%|<|>|\+|-|\*|\/|\(|\)|\{|}|\[|]|[0-9]+(\.[0-9]+)?|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*/y,
    number: /[0-9]+(\.[0-9]+)?/,
    name: /[a-zA-Z_$][a-zA-Z0-9_$]*/,
    symbol: /=|%|<|>|\+|-|\*|\\|\(|\)|\{|}|\[|]/,
    $if: [/if/, 3],
    $plus: [/\+/, 3],
    $minus: [/-/, 3],
    $multiply: [/\*/, 3],
    $div: [/\//, 3],
});
const parser = new Parser<IMyTokenizer, IMyParser<IMyTokenizer>>({
    token: tokenizer.token(),
    tokenMap: tokenizer.tokenMap(),
    number: _=>[
        [[_.token.number],$=>parseInt($[0])]
    ],
    product: _=>[
        [[_.number],$=>$[0]],
        [[_.product, _.token.$multiply, _.number],$=>$[0]*$[2]],
        [[_.product, _.token.$div, _.number],$=>$[0]/$[2]]
    ],
    sum: _=>[
        [[_.product],$=>$[0]],
        [[_.sum, _.token.$plus, _.product],$=>$[0]+$[2]],
        [[_.sum, _.token.$minus, _.product],$=>$[0]-$[2]]
    ]
},true);
const [token, tokenType] = tokenizer.tokenize("5+4*3+6*2+1/4");
const parseResult = parser.parse(token, tokenType, 'sum');
console.log(parseResult);

