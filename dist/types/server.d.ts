import http from 'node:http';
import { NetRequest, NetResponse, CreateFileLocation, ParserType, RequestProcessingInfo } from './types';
import { Router } from './router';
export interface ServerSettings<Global> {
    createFileLocation: CreateFileLocation;
    onCreatedNetResponse?: (netRequest: NetRequest<Global>, netResponse: NetResponse) => Promise<void>;
    onRequestFinished?: (request: http.IncomingMessage, requestProcessingInfo: RequestProcessingInfo, netRequest?: NetRequest<Global>, netResponse?: NetResponse) => Promise<void>;
    makeGlobal: (request: http.IncomingMessage) => Promise<Global>;
    typeParsers?: Record<string, ParserType>;
    bufferSize?: number;
}
export declare class Server<Global> {
    #private;
    constructor(httpServer: http.Server, serverSettings: ServerSettings<Global>);
    listen(path: string): this;
    listen(port: number): this;
    close(timeout: number): Promise<void>;
    addRouter(prefix: string, router: Router<Global, any>): this;
}
export declare class GloballessServer extends Server<unknown> {
    constructor(httpServer: http.Server, serverSettings: Omit<ServerSettings<unknown>, 'makeGlobal'>);
}
