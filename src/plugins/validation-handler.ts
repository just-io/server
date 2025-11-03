import { Handler, RequestOptions } from '../router';
import { NetRequest, NetResponse } from '../types';

export type ValidationHandlerOptions<Value, Global, Context = Record<string, unknown>, Path extends string = string> = {
    name?: string;
    options?: RequestOptions;
    handle: (netRequest: NetRequest<Global, Context, Path>, value: Value) => Promise<NetResponse>;
    validator: (netRequest: NetRequest<Global, Context, Path>) => Promise<Value>;
};

export default class ValidationHandler<Value, Global, Context = Record<string, unknown>, Path extends string = string> implements Handler<Global, Context, Path> {
    #handle: ValidationHandlerOptions<Value, Global, Context, Path>['handle'];

    #validator: ValidationHandlerOptions<Value, Global, Context, Path>['validator'];
    
    name?: string;

    options?: RequestOptions;

    constructor(options: ValidationHandlerOptions<Value, Global, Context, Path>) {
        this.name = options.name;
        this.options = options.options;
        this.#handle = options.handle;
        this.#validator = options.validator;
    }

    async handle(netRequest: NetRequest<Global, Context, Path>): Promise<NetResponse> {
        const value = await this.#validator(netRequest);

        return this.#handle(netRequest, value);
    }
}
