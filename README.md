tparse
===================
parser that scales

a LL(1) parser generator in TypeScript

with tparse, you can
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
    $multiply: IToken;
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
    number: _=>[
        [[_.token.number],$=>parseInt($[0])] //first is the rules, the second is the action
    ],
    product: _=>[
        { //this is just another syntax, which is equal to above one
            rules: [_.number],
            action: $=>$[0]
        },
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
```