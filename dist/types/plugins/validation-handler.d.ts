import { Handler, RequestOptions } from '../router';
import { NetRequest, NetResponse } from '../types';
export type ValidationHandlerOptions<Value, Global, Context = Record<string, unknown>, Path extends string = string> = {
    name?: string;
    options?: RequestOptions;
    handle: (netRequest: NetRequest<Global, Context, Path>, value: Value) => Promise<NetResponse>;
    validator: (netRequest: NetRequest<Global, Context, Path>) => Promise<Value>;
};
export default class ValidationHandler<Value, Global, Context = Record<string, unknown>, Path extends string = string> implements Handler<Global, Context, Path> {
    #private;
    name?: string;
    options?: RequestOptions;
    constructor(options: ValidationHandlerOptions<Value, Global, Context, Path>);
    handle(netRequest: NetRequest<Global, Context, Path>): Promise<NetResponse>;
}
