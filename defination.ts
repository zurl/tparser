/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 11/1/2016
 */
import {IAbstractTokenizer,IToken} from './tokenizer';
import {IAbstactParser,ISymbol} from './parser';
export interface IMyTokenizer extends IAbstractTokenizer {
    number: IToken;
    symbol: IToken;
    name: IToken;
    $if: IToken;
    $plus: IToken;
    $minus: IToken;
    $div: IToken;
    $multiply: IToken;
}

export interface IMyParser<T extends IAbstractTokenizer> extends IAbstactParser<T> {
    number: ISymbol<IMyParser<T>>;
    sum: ISymbol<IMyParser<T>>;
    product: ISymbol<IMyParser<T>>;
}