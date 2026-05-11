import { NetResponseError } from '../components/net-response-error';
import { Handler, RequestOptions } from '../router';
import { JSONNetResponseValues, JSONResponses, JSONValue, NetRequest, NetResponse } from '../types';

export type JSONHandlerMakeParameters<
    Responses extends JSONResponses,
    Global,
    Context = Record<string, unknown>,
    Path extends string = string,
> = {
    name?: string;
    options?: RequestOptions;
    reply: (
        netRequest: NetRequest<Global, Context, Path>,
    ) => Promise<JSONNetResponseValues<Responses>>;
};

export abstract class JSONHandler<
    Responses extends JSONResponses,
    Global,
    Context = Record<string, unknown>,
    Path extends string = string,
> implements Handler<Global, Context, Path>
{
    abstract reply(
        netRequest: NetRequest<Global, Context, Path>,
    ): Promise<JSONNetResponseValues<Responses>>;

    async handle(netRequest: NetRequest<Global, Context, Path>): Promise<NetResponse> {
        const result = await this.reply(netRequest);

        return {
            status: result.status,
            body: {
                type: 'json',
                content: result.value,
            },
            cookies: result.cookies,
            headers: result.headers,
        };
    }

    static make<
        Responses extends JSONResponses,
        Global,
        Context = Record<string, unknown>,
        Path extends string = string,
    >(
        parameters: JSONHandlerMakeParameters<Responses, Global, Context, Path>,
    ): Handler<Global, Context, Path> {
        return {
            name: parameters.name,
            options: parameters.options,
            handle: async (netRequest) => {
                const result = await parameters.reply(netRequest);

                return {
                    status: result.status,
                    body: {
                        type: 'json',
                        content: result.value,
                    },
                    cookies: result.cookies,
                    headers: result.headers,
                };
            },
        };
    }
}

export type JSONBodyHandlerMakeParameters<
    Value,
    Responses extends JSONResponses,
    Global,
    Context = Record<string, unknown>,
    Path extends string = string,
> = {
    name?: string;
    options?: RequestOptions;
    reply: (
        value: Value,
        netRequest: NetRequest<Global, Context, Path>,
    ) => Promise<JSONNetResponseValues<Responses>>;
    validate: (
        jsonValue: JSONValue,
        netRequest: NetRequest<Global, Context, Path>,
    ) => Promise<Value>;
};

export abstract class JSONBodyHandler<
    Value,
    Responses extends JSONResponses,
    Global,
    Context = Record<string, unknown>,
    Path extends string = string,
> implements Handler<Global, Context, Path>
{
    abstract reply(
        value: Value,
        netRequest: NetRequest<Global, Context, Path>,
    ): Promise<JSONNetResponseValues<Responses>>;

    abstract validate(
        jsonValue: JSONValue,
        netRequest: NetRequest<Global, Context, Path>,
    ): Promise<Value>;

    async handle(netRequest: NetRequest<Global, Context, Path>): Promise<NetResponse> {
        if (netRequest.body?.type !== 'json') {
            throw new NetResponseError(406, { type: 'text', content: 'Not Acceptable' });
        }
        const value = await this.validate(netRequest.body.content, netRequest);

        const result = await this.reply(value, netRequest);

        return {
            status: result.status,
            body: {
                type: 'json',
                content: result.value,
            },
            cookies: result.cookies,
            headers: result.headers,
        };
    }

    static make<
        Value,
        Responses extends JSONResponses,
        Global,
        Context = Record<string, unknown>,
        Path extends string = string,
    >(
        parameters: JSONBodyHandlerMakeParameters<Value, Responses, Global, Context, Path>,
    ): Handler<Global, Context, Path> {
        return {
            name: parameters.name,
            options: parameters.options,
            handle: async (netRequest) => {
                if (netRequest.body?.type !== 'json') {
                    throw new NetResponseError(406, { type: 'text', content: 'Not Acceptable' });
                }
                const value = await parameters.validate(netRequest.body.content, netRequest);

                const result = await parameters.reply(value, netRequest);

                return {
                    status: result.status,
                    body: {
                        type: 'json',
                        content: result.value,
                    },
                    cookies: result.cookies,
                    headers: result.headers,
                };
            },
        };
    }
}
