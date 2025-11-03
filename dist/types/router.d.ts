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
    onCreatedNetResponse?: (netRequest: NetRequest<Global, Context>, netResponse: NetResponse) => Promise<void>;
};
export interface Handler<Global, Context, Path extends string> {
    name?: string;
    options?: RequestOptions;
    handle: (netRequest: NetRequest<Global, Context, Path>) => Promise<NetResponse>;
}
export type RouteHandler<Global, Context, Path extends string> = Handler<Global, Context, Path> | Handler<Global, Context, Path>['handle'];
export type HTTPMethod = '*' | 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT' | 'HEAD' | 'CONNECT' | 'OPTIONS' | 'TRACE';
export interface Middleware<Global, Context> {
    name?: string;
    handle: (netRequest: NetRequest<Global, Record<string, unknown>>) => Promise<NetRequest<Global, Context>>;
}
export type RouteMiddleware<Global, Context> = Middleware<Global, Context> | Middleware<Global, Context>['handle'];
interface HandlerInfo<Global, Context, Path extends string = string> {
    method: HTTPMethod;
    path: string;
    pattern: Pattern<Path>;
    handler: Handler<Global, Context, Path>;
}
export declare class Router<Global, Context> {
    #private;
    name?: string;
    constructor(routeMiddleware: RouteMiddleware<Global, Context>, options?: RouterRequestOptions<Global, Context>);
    get onCreatedNetResponse(): RouterRequestOptions<Global, Context>['onCreatedNetResponse'];
    addHandler<Path extends string>(method: HTTPMethod, path: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    all<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    get<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    post<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    patch<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    delete<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    put<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    head<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    connect<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    options<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    trace<Path extends string>(pattern: Path, routeHandler: RouteHandler<Global, Context, Path>): this;
    handle(method: HTTPMethod, pathname: string, request: NetRequest<Global, Record<string, unknown>>): Promise<NetResponse | null>;
    getHandlerInfo(method: HTTPMethod, pathname: string): [HandlerInfo<Global, Context>, ExecResult<string>] | null;
    callHandler(handlerInfo: HandlerInfo<Global, Context>, request: NetRequest<Global>): Promise<NetResponse>;
}
export declare class MiddlewarelessRouter<Global> extends Router<Global, unknown> {
    constructor(defaultOptions?: RequestOptions);
}
export {};
