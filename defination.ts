/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 11/1/2016
 */
import {IAbstractTokenizer,IToken} from './tokenizer';
import {IAbstactParser,ISymbol} from './parser';
export interface IMyTokenizer extends IAbstractTokenizer {
    number: IToken;
    string: IToken;
    $lcb : IToken;
    $rcb : IToken;
    $lsb : IToken;
    $rsb : IToken;
    $colon : IToken;
    $comma : IToken;
    $true : IToken;
    $false : IToken;
    $null : IToken;
}

export interface IMyParser<T extends IAbstractTokenizer> extends IAbstactParser<T> {
    item: ISymbol<IMyParser<T>>;
    value: ISymbol<IMyParser<T>>;
    array: ISymbol<IMyParser<T>>;
    array_meta: ISymbol<IMyParser<T>>;
    object: ISymbol<IMyParser<T>>;
    object_meta: ISymbol<IMyParser<T>>;
}