import http from 'node:http';

import { ExtractGroup, NetRequest, NetResponse } from './types';
import { Matched, PathMatcher, StringPath } from './components/path-matcher';

export type RequestOptions = {
    acceptContentTypes?: string[];
    maxContentLength?: number;
    timeout?: number;
    shouldAbort?: (req: http.IncomingMessage) => Promise<boolean>;
};

export type RouterRequestOptions<Location, Global, Context> = RequestOptions & {
    onCreatedNetResponse?: (
        netRequest: NetRequest<Location, Global, Context>,
        netResponse: NetResponse,
    ) => Promise<void>;
};

export interface Handler<Location, Global, Context, Path extends string> {
    name?: string;
    options?: RequestOptions;
    handle: (netRequest: NetRequest<Location, Global, Context, Path>) => Promise<NetResponse>;
}

export type RouteHandler<Location, Global, Context, Path extends string> =
    | Handler<Location, Global, Context, Path>
    | Handler<Location, Global, Context, Path>['handle'];

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

export interface Middleware<Location, Global, Context> {
    name?: string;
    handle: (
        netRequest: NetRequest<Location, Global, Record<string, unknown>>,
    ) => Promise<NetRequest<Location, Global, Context>>;
}

export type RouteMiddleware<Location, Global, Context> =
    | Middleware<Location, Global, Context>
    | Middleware<Location, Global, Context>['handle'];

interface HandlerInfo<Location, Global, Context, Path extends string = string> {
    method: HTTPMethod;
    path: string;
    handler: Handler<Location, Global, Context, Path>;
    options: RequestOptions;
}

export class Router<Location, Global, Context> {
    #handlerPathMatcher: PathMatcher<HandlerInfo<Location, Global, Context, string>> =
        new PathMatcher();

    #middleware: Middleware<Location, Global, Context>;

    #options?: RouterRequestOptions<Location, Global, Context>;

    #routeHandlerMap: Map<
        string,
        Map<
            RouteHandler<Location, Global, Context, string>,
            HandlerInfo<Location, Global, Context, string>
        >
    > = new Map();

    name?: string;

    constructor(
        routeMiddleware: RouteMiddleware<Location, Global, Context>,
        options?: RouterRequestOptions<Location, Global, Context>,
    ) {
        const middleware =
            typeof routeMiddleware === 'function' ? { handle: routeMiddleware } : routeMiddleware;
        this.#middleware = middleware;
        this.#options = options;
    }

    get onCreatedNetResponse(): RouterRequestOptions<
        Location,
        Global,
        Context
    >['onCreatedNetResponse'] {
        return this.#options?.onCreatedNetResponse;
    }

    addHandler<Path extends StringPath>(
        method: HTTPMethod,
        path: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        const handler =
            typeof routeHandler === 'function' ? { handle: routeHandler } : routeHandler;
        const handlerInfo = {
            method,
            path,
            handler,
            options: Object.assign({}, this.#options, handler.options),
        };
        const methodpath = `${method}:${path}`;
        const map = this.#routeHandlerMap.get(methodpath) ?? new Map();
        if (!this.#routeHandlerMap.has(methodpath)) {
            this.#routeHandlerMap.set(methodpath, map);
        }
        map.set(routeHandler, handlerInfo);
        this.#handlerPathMatcher.add(PathMatcher.toPathItems(path), handlerInfo, exact);

        return this;
    }

    deleteHandler<Path extends StringPath>(
        method: HTTPMethod,
        path: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): boolean {
        const methodpath = `${method}:${path}`;
        const handlerInfo = this.#routeHandlerMap.get(methodpath)?.get(routeHandler);
        if (!handlerInfo) {
            return false;
        }

        this.#routeHandlerMap.get(methodpath)?.delete(routeHandler);
        if (this.#routeHandlerMap.get(methodpath)?.size === 0) {
            this.#routeHandlerMap.delete(methodpath);
        }

        return this.#handlerPathMatcher.delete(PathMatcher.toPathItems(path), handlerInfo, exact);
    }

    all<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('*', pattern, routeHandler, exact);
    }

    get<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('GET', pattern, routeHandler, exact);
    }

    post<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('POST', pattern, routeHandler, exact);
    }

    patch<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('PATCH', pattern, routeHandler, exact);
    }

    delete<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('DELETE', pattern, routeHandler, exact);
    }

    put<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('PUT', pattern, routeHandler, exact);
    }

    head<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('HEAD', pattern, routeHandler, exact);
    }

    connect<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('CONNECT', pattern, routeHandler, exact);
    }

    options<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('OPTIONS', pattern, routeHandler, exact);
    }

    trace<Path extends StringPath>(
        pattern: Path,
        routeHandler: RouteHandler<Location, Global, Context, Path>,
        exact?: boolean,
    ): this {
        return this.addHandler('TRACE', pattern, routeHandler, exact);
    }

    getHandlerInfo(
        method: HTTPMethod,
        pathname: StringPath,
    ): [HandlerInfo<Location, Global, Context>, ExtractGroup<string>] | null {
        const matched = this.#handlerPathMatcher.match(PathMatcher.toItems(pathname));
        let maxMatched: null | Matched<HandlerInfo<Location, Global, Context, string>> = null;
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
        handlerInfo: HandlerInfo<Location, Global, Context>,
        request: NetRequest<Location, Global>,
    ): Promise<NetResponse> {
        return this.#middleware
            .handle(request)
            .then((netRequest) => handlerInfo.handler.handle(netRequest));
    }
}

export class MiddlewarelessRouter<Location, Global> extends Router<Location, Global, unknown> {
    constructor(defaultOptions?: RequestOptions) {
        super((netRequest) => Promise.resolve(netRequest), defaultOptions);
    }
}
