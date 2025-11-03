import http from 'node:http';

import { NetRequest, NetResponse } from './types';
import Pattern, { ExecResult } from './components/pattern';

export type RequestOptions = {
    acceptContentTypes?: string[];
    maxContentLength?: number;
    timeout?: number;
    shouldAbort?: (req: http.IncomingMessage) => Promise<boolean>;
};

export type RouterRequestOptions<Global, Context> = RequestOptions & {
    onCreatedNetResponse?: (
        netRequest: NetRequest<Global, Context>,
        netResponse: NetResponse,
    ) => Promise<void>;
};

export interface Handler<Global, Context, Path extends string> {
    name?: string;
    options?: RequestOptions;
    handle: (netRequest: NetRequest<Global, Context, Path>) => Promise<NetResponse>;
}

export type RouteHandler<Global, Context, Path extends string> =
    | Handler<Global, Context, Path>
    | Handler<Global, Context, Path>['handle'];

export type HTTPMethod =
    | '*'
    | 'GET'
    | 'POST'
    | 'DELETE'
    | 'PATCH'
    | 'PUT'
    | 'HEAD'
    | 'CONNECT'
    | 'OPTIONS'
    | 'TRACE';

export interface Middleware<Global, Context> {
    name?: string;
    handle: (netRequest: NetRequest<Global, Record<string, unknown>>) => Promise<NetRequest<Global, Context>>;
}

export type RouteMiddleware<Global, Context> = 
    | Middleware<Global, Context>
    | Middleware<Global, Context>['handle'];

interface HandlerInfo<Global, Context, Path extends string = string> {
    method: HTTPMethod;
    path: string;
    pattern: Pattern<Path>;
    handler: Handler<Global, Context, Path>;
}

export class Router<Global, Context> {
    #handlerInfos: HandlerInfo<Global, Context, string>[] = [];

    #middleware: Middleware<Global, Context>;

    #options?: RouterRequestOptions<Global, Context>;

    name?: string;

    constructor(routeMiddleware: RouteMiddleware<Global, Context>, options?: RouterRequestOptions<Global, Context>) {
        const middleware =
            typeof routeMiddleware === 'function' ? { handle: routeMiddleware } : routeMiddleware;
        this.#middleware = middleware;
        this.#options = options;
    }

    get onCreatedNetResponse(): RouterRequestOptions<Global, Context>['onCreatedNetResponse'] {
        return this.#options?.onCreatedNetResponse;
    }

    addHandler<Path extends string>(
        method: HTTPMethod,
        path: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        const handler =
            typeof routeHandler === 'function' ? { handle: routeHandler } : routeHandler;
        handler.options = Object.assign({}, this.#options, handler.options);
        this.#handlerInfos.push({
            method,
            path,
            pattern: new Pattern(path),
            handler,
        });
        return this;
    }

    all<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('*', pattern, routeHandler);
    }

    get<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('GET', pattern, routeHandler);
    }

    post<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('POST', pattern, routeHandler);
    }

    patch<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('PATCH', pattern, routeHandler);
    }

    delete<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('DELETE', pattern, routeHandler);
    }

    put<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('PUT', pattern, routeHandler);
    }

    head<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('HEAD', pattern, routeHandler);
    }

    connect<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('CONNECT', pattern, routeHandler);
    }

    options<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('OPTIONS', pattern, routeHandler);
    }

    trace<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this {
        return this.addHandler('TRACE', pattern, routeHandler);
    }

    handle(
        method: HTTPMethod,
        pathname: string,
        request: NetRequest<Global, Record<string, unknown>>,
    ): Promise<NetResponse | null> {
        for (const handlerInfo of this.#handlerInfos) {
            if (handlerInfo.method !== '*' && handlerInfo.method !== method) {
                continue;
            }
            const result = handlerInfo.pattern.exec(pathname);
            if (result) {
                request.pathname.handler = result.matched;
                request.pathname.groups = result.groups;

                return this.#middleware.handle(request).then((netRequest) =>
                    handlerInfo.handler.handle(netRequest),
                );
            }
        }

        return Promise.resolve(null);
    }

    getHandlerInfo(method: HTTPMethod, pathname: string): [HandlerInfo<Global, Context>, ExecResult<string>] | null {
        let maxParams:
            | null
            | [HandlerInfo<Global, Context>, ExecResult<string>] = null;
        for (const handlerInfo of this.#handlerInfos) {
            if (handlerInfo.method !== '*' && handlerInfo.method !== method) {
                continue;
            }
            const result = handlerInfo.pattern.exec(pathname) as null | ExecResult<string>;
            if (result && (!maxParams || result.matched.length > maxParams[1].matched.length)) {
                maxParams = [handlerInfo, result];
            }
        }
        if (maxParams) {
            return [maxParams[0], maxParams[1]];
        }

        return null;
    }

    callHandler(handlerInfo: HandlerInfo<Global, Context>, request: NetRequest<Global>): Promise<NetResponse> {
        return this.#middleware.handle(request).then((netRequest) =>
            handlerInfo.handler.handle(netRequest),
        );
    }
}

export class MiddlewarelessRouter<Global> extends Router<Global, unknown> {
    constructor(defaultOptions?: RequestOptions) {
        super((netRequest) => Promise.resolve(netRequest), defaultOptions);
    }
}
