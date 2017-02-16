/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 11/1/2016
 */
import {IToken, IAbstractTokenElements} from '../lib/tokenizer';
import {ISymbol, IAbstractParserElements} from '../lib/parser';
export interface IMyTokenElements extends IAbstractTokenElements {
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

export interface IMyParserElements<T extends IAbstractTokenElements> extends IAbstractParserElements<T> {
    item: ISymbol<IMyParserElements<T>>;
    value: ISymbol<IMyParserElements<T>>;
    array: ISymbol<IMyParserElements<T>>;
    array_meta: ISymbol<IMyParserElements<T>>;
    object: ISymbol<IMyParserElements<T>>;
    object_meta: ISymbol<IMyParserElements<T>>;
}