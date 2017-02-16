/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 11/1/2016
 */
import {IAbstractParserConstrain, IAbstractParserElements, IItem} from '../lib/parser';
import {IAbstractTokenElements} from "../lib/tokenizer";


export interface IMyParserElements{
    item: string;
    value: string;
    array: string;
    array_meta: string;
    object: string;
    object_meta: string;
}