tparser -- an LL(1) parser generator in TypeScript
===================
Author : Zhang Chengyi <zurl@live.com>

tparser is an LL(1) parser generator in TypeScript,
which is used for making the parser quickly, easily and scaled.

with tparser, you can
+ Write Parser Without Compile it
+ Write Parser in Typed DSL
+ Check the syntax of Parser before test it
+ Enjoy the auto-completion of IDE provided by Typescript

## Usage

### Tokenizer Definition
```typescript
import {IAbstractTokenizer,IToken} from './tokenizer';
export interface IMyTokenizer extends IAbstractTokenizer {
    number: IToken; //just the name of token
    $plus: IToken;
    $minus: IToken;
    $div: IToken;
    $multiply: [IToken, 2]; // you can provide the privilege level
    //...
}
```
### Tokenizer
```typescript
import {Tokenizer} from './tokenizer';
import {IMyTokenizer} from './defination';
const tokenizer = new Tokenizer<IMyTokenizer>({
    split: /\s*(=|%|<|>|\+|-|\*|\/|\(|\)|\{|}|\[|]|[0-9]+(\.[0-9]+)?|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*/y,
    //regexp for split
    number: /[0-9]+(\.[0-9]+)?/,
    $if: [/if/, 3],
    $plus: [/\+/, 3],
    $minus: [/-/, 3],
    $multiply: [/\*/, 3],
    $div: [/\//, 3],
    //...
});
const [token, tokenType] = tokenizer.tokenize("5+4*3+6*2+1/4");
```

### Parser Definition
```typescript
import {IAbstactParser,ISymbol} from './parser';
export interface IMyParser<T extends IAbstractTokenizer> extends IAbstactParser<T> {
    number: ISymbol<IMyParser<T>>;
    sum: ISymbol<IMyParser<T>>;
    product: ISymbol<IMyParser<T>>;
}
```

### Parser
```typescript
const parser = new Parser<IMyTokenizer, IMyParser<IMyTokenizer>>({
    token: tokenizer.token(),
    tokenMap: tokenizer.tokenMap(),
    number: _=>[ // the `_` stands for the self-bound elements
                 // all of the number 
        [[_.token.number],$=>parseInt($[0])] 
        //first is the rules, the second is the action
    ],
    product: _=>[
        [[_.product, _.token.$multiply, _.number],$=>$[0]*$[2]],
        [[_.product, _.token.$div, _.number],$=>$[0]/$[2]]
    ],
    sum: _=>[
        [[_.product],$=>$[0]], // the first is the rule, the second is the action
        [[_.sum, _.token.$plus, _.product],$=>$[0]+$[2]],
        [[_.sum, _.token.$minus, _.product],$=>$[0]-$[2]]
    ]
},true);
const [token, tokenType] = tokenizer.tokenize("5+4*3+6*2+1/4");
const parseResult = parser.parse(token, tokenType, 'sum');
console.log(parseResult);
```

## appendix

a experimental feature : the BNF-CONVERTER

see on ./meta-compiler