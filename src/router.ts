import http from 'node:http';

import { ExtractGroup, NetRequest, NetResponse } from './types';
import { Matched, PathMatcher, StringPath } from './components/path-matcher';

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
    handle: (
        netRequest: NetRequest<Global, Record<string, unknown>>,
    ) => Promise<NetRequest<Global, Context>>;
}

export type RouteMiddleware<Global, Context> =
    | Middleware<Global, Context>
    | Middleware<Global, Context>['handle'];

interface HandlerInfo<Global, Context, Path extends string = string> {
    method: HTTPMethod;
    path: string;
    handler: Handler<Global, Context, Path>;
    options: RequestOptions;
}

export class Router<Global, Context> {
    #handlerPathMatcher: PathMatcher<HandlerInfo<Global, Context, string>> = new PathMatcher();

    #middleware: Middleware<Global, Context>;

    #options?: RouterRequestOptions<Global, Context>;

    #routeHandlerMap = new Map<
        RouteHandler<Global, Context, string>,
        HandlerInfo<Global, Context, string>
    >();

    name?: string;

    constructor(
        routeMiddleware: RouteMiddleware<Global, Context>,
        options?: RouterRequestOptions<Global, Context>,
    ) {
        const middleware =
            typeof routeMiddleware === 'function' ? { handle: routeMiddleware } : routeMiddleware;
        this.#middleware = middleware;
        this.#options = options;
    }

    get onCreatedNetResponse(): RouterRequestOptions<Global, Context>['onCreatedNetResponse'] {
        return this.#options?.onCreatedNetResponse;
    }

    addHandler<Path extends StringPath>(
        method: HTTPMethod,
        path: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        const handler =
            typeof routeHandler === 'function' ? { handle: routeHandler } : routeHandler;
        const handlerInfo = {
            method,
            path,
            handler,
            options: Object.assign({}, this.#options, handler.options),
        };
        this.#routeHandlerMap.set(routeHandler, handlerInfo);
        this.#handlerPathMatcher.add(PathMatcher.toPathItems(path), handlerInfo);

        return this;
    }

    deleteHandler<Path extends StringPath>(
        method: HTTPMethod,
        path: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): boolean {
        const handlerInfo = this.#routeHandlerMap.get(routeHandler);
        if (!handlerInfo) {
            return false;
        }

        this.#routeHandlerMap.delete(routeHandler);

        return this.#handlerPathMatcher.delete(PathMatcher.toPathItems(path), handlerInfo);
    }

    all<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('*', pattern, routeHandler);
    }

    get<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('GET', pattern, routeHandler);
    }

    post<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('POST', pattern, routeHandler);
    }

    patch<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('PATCH', pattern, routeHandler);
    }

    delete<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('DELETE', pattern, routeHandler);
    }

    put<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('PUT', pattern, routeHandler);
    }

    head<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('HEAD', pattern, routeHandler);
    }

    connect<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('CONNECT', pattern, routeHandler);
    }

    options<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('OPTIONS', pattern, routeHandler);
    }

    trace<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Global, Context, Path>,
    ): this {
        return this.addHandler('TRACE', pattern, routeHandler);
    }

    getHandlerInfo(
        method: HTTPMethod,
        pathname: StringPath,
    ): [HandlerInfo<Global, Context>, ExtractGroup<string>] | null {
        const matched = this.#handlerPathMatcher.match(PathMatcher.toItems(pathname));
        let maxMatched: null | Matched<HandlerInfo<Global, Context, string>> = null;
        for (const item of matched) {
            if (item.value.method !== '*' && item.value.method !== method) {
                continue;
            }
            if (!maxMatched || maxMatched.matchedCount < item.matchedCount) {
                maxMatched = item;
            }
        }
        if (maxMatched) {
            return [maxMatched.value, maxMatched.params];
        }

        return null;
    }

    callHandler(
        handlerInfo: HandlerInfo<Global, Context>,
        request: NetRequest<Global>,
    ): Promise<NetResponse> {
        return this.#middleware
            .handle(request)
            .then((netRequest) => handlerInfo.handler.handle(netRequest));
    }
}

export class MiddlewarelessRouter<Global> extends Router<Global, unknown> {
    constructor(defaultOptions?: RequestOptions) {
        super((netRequest) => Promise.resolve(netRequest), defaultOptions);
    }
}
