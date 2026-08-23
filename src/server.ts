import http from 'node:http';
import crypto from 'node:crypto';
import { Writable } from 'node:stream';

import { NetResponseError } from './components/net-response-error';
import {
    NetRequest,
    NetRequestBody,
    NetResponse,
    CreateFileLocation,
    ParserType,
    RequestProcessingInfo,
} from './types';
import FormDataBodyParser from './body-parsers/form-data-body-parser';
import UrencodedBodyParser from './body-parsers/urlencoded-body-parser';
import JsonBodyParser from './body-parsers/json-body-parser';
import BufferBodyParser from './body-parsers/buffer-body-parser';
import BodyParser from './body-parsers/body-parser';
import { Router, HTTPMethod } from './router';
import TextBodyParser from './body-parsers/text-body-parser';
import { Period } from './components/period';
import { PathMatcher, StringPath } from './components/path-matcher';

export interface ServerSettings<Global> {
    createFileLocation: CreateFileLocation;
    onCreatedNetResponse?: (
        netRequest: NetRequest<Global>,
        netResponse: NetResponse,
    ) => Promise<void>;
    onRequestFinished?: (
        request: http.IncomingMessage,
        requestProcessingInfo: RequestProcessingInfo,
        netRequest?: NetRequest<Global>,
        netResponse?: NetResponse,
    ) => Promise<void>;
    makeGlobal: (request: http.IncomingMessage) => Promise<Global>;
    typeParsers?: Record<string, ParserType>;
    bufferSize?: number;
    requestIdExtractor?: (request: http.IncomingMessage) => string;
}

const defaultTypeParsers: Record<string, ParserType> = {
    'application/json': 'json',
    'multipart/form-data': 'form-data',
    'application/x-www-form-urlencoded': 'urlencoded',
    'text/plain': 'text',
    default: 'buffer',
};

const DEFAULT_TYPE_PARSER: ParserType = 'buffer';
const DEFAULT_BUFFER_SIZE: number = 1024;
const DEFAULT_REQUEST_ID_EXTRACTOR = (request: http.IncomingMessage) =>
    (Array.isArray(request.headers['x-request-id'])
        ? request.headers['x-request-id'][0]
        : request.headers['x-request-id']) ?? crypto.randomUUID();

export class Server<Global> {
    #routerPathMatcher: PathMatcher<Router<Global, unknown>> = new PathMatcher();

    #settings: ServerSettings<Global>;

    #httpServer: http.Server;

    #typeParserEntries: [string, ParserType][];

    #parsers: Record<ParserType, BodyParser>;

    #abortControllers: Set<AbortController> = new Set();

    #handlingPromises: Set<Promise<void>> = new Set();

    constructor(httpServer: http.Server, settings: ServerSettings<Global>) {
        this.#httpServer = httpServer;
        this.#settings = settings;
        this.#httpServer.on('request', (request, response) => {
            const promise = this.#handle(request, response);
            this.#handlingPromises.add(promise);
            promise
                .then(() => {
                    this.#handlingPromises.delete(promise);
                })
                .catch(() => {
                    this.#handlingPromises.delete(promise);
                });
        });
        this.#parsers = {
            'form-data': new FormDataBodyParser(this.#settings.createFileLocation),
            urlencoded: new UrencodedBodyParser(),
            json: new JsonBodyParser(),
            buffer: new BufferBodyParser(this.#settings.createFileLocation),
            text: new TextBodyParser(),
        };

        this.#typeParserEntries = Object.entries({
            ...defaultTypeParsers,
            ...settings.typeParsers,
        });
    }

    listen(path: string): this;
    listen(port: number): this;
    listen(portOrPath: number | string): this {
        this.#httpServer.listen(portOrPath);

        return this;
    }

    async close(timeout: number): Promise<void> {
        const { promise, resolve, reject } = Promise.withResolvers();
        this.#httpServer.close((err) => (err ? reject(err) : resolve(undefined)));

        await promise;

        await Promise.all([
            new Promise<void>((res) => {
                setTimeout(() => {
                    this.#abortControllers.forEach((abortController) => abortController.abort());
                    res();
                }, timeout);
            }),
            ...Array.from(this.#handlingPromises),
        ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addRouter(prefix: StringPath, router: Router<Global, any>): this {
        this.#routerPathMatcher.add(PathMatcher.toPathItems(prefix), router);

        return this;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteRouter(prefix: StringPath, router: Router<Global, any>): boolean {
        return this.#routerPathMatcher.delete(PathMatcher.toPathItems(prefix), router);
    }

    #parseBody(request: http.IncomingMessage): Promise<NetRequestBody | null> {
        if (request.headers['content-length'] === undefined) {
            return Promise.resolve(null);
        }
        const type = request.headers['content-type'];
        if (!type) {
            return this.#parsers[DEFAULT_TYPE_PARSER].parse(request);
        }
        const typeParserEntry = this.#typeParserEntries.find((aTypeParserEntry) =>
            type.includes(aTypeParserEntry[0]),
        );
        if (typeParserEntry) {
            return this.#parsers[typeParserEntry[1]].parse(request);
        }
        return this.#parsers[DEFAULT_TYPE_PARSER].parse(request);
    }

    #writeContentToStream(stream: Writable, content: string | Buffer): Promise<void> {
        const size = this.#settings.bufferSize ?? DEFAULT_BUFFER_SIZE;
        const chunks: (string | Buffer)[] = [];
        for (let i = 0; i < content.length; i += size) {
            chunks.push(content.slice(i, i + size));
        }

        return new Promise((res, rej) => {
            const errorHandler = (err: Error) => {
                rej(err);
            };
            stream.once('error', errorHandler);

            function write() {
                if (chunks.length === 0) {
                    stream.off('error', errorHandler);
                    res();
                    return;
                }
                if (!stream.write(chunks.shift())) {
                    stream.once('drain', write);
                } else {
                    process.nextTick(write);
                }
            }
            write();
        });
    }

    #sendNetResponse(response: http.ServerResponse, netResponse: NetResponse): Promise<void> {
        return new Promise((res, rej) => {
            response.statusCode = netResponse.status ?? 200;
            if (netResponse.headers) {
                Object.entries(netResponse.headers).forEach(([key, value]) => {
                    if (value === undefined) {
                        return;
                    }
                    response.setHeader(key, value);
                });
            }
            if (netResponse.cookies) {
                response.setHeader(
                    'set-cookie',
                    netResponse.cookies.map((cookie) => {
                        let cookieValue = `${cookie.key}=${cookie.value}`;
                        if (cookie.expires) {
                            cookieValue += `; Expires=${cookie.expires.toUTCString()}`;
                        }
                        if (cookie.maxAge) {
                            cookieValue += `; Max-Age=${cookie.maxAge}`;
                        }
                        if (cookie.domain) {
                            cookieValue += `; Domain=${cookie.domain}`;
                        }
                        if (cookie.path) {
                            cookieValue += `; Path=${cookie.path}`;
                        }
                        if (cookie.httpOnly) {
                            cookieValue += '; HttpOnly';
                        }
                        if (cookie.secure) {
                            cookieValue += '; Secure';
                        }
                        if (cookie.sameSite) {
                            cookieValue += `; SameSite=${cookie.sameSite}`;
                        }
                        return cookieValue;
                    }),
                );
            }
            let stringifyJson: string;
            switch (netResponse.body?.type) {
                case 'text': {
                    response.setHeader(
                        'content-length',
                        Buffer.byteLength(netResponse.body.content, 'utf8'),
                    );
                    response.setHeader('content-type', 'text/plain; charset=utf-8');
                    break;
                }
                case 'json': {
                    stringifyJson = JSON.stringify(netResponse.body.content);
                    response.setHeader('content-length', Buffer.byteLength(stringifyJson, 'utf8'));
                    response.setHeader('content-type', 'application/json; charset=utf-8');
                    break;
                }
                case 'buffer': {
                    response.setHeader('content-length', netResponse.body.content.length);
                    response.setHeader(
                        'content-type',
                        netResponse.body.contentType ?? 'application/octet-stream',
                    );
                    break;
                }
                case 'stream': {
                    response.setHeader('content-length', netResponse.body.contentLength);
                    response.setHeader(
                        'content-type',
                        netResponse.body.contentType ?? 'application/octet-stream',
                    );
                    break;
                }
                case 'file': {
                    if (netResponse.body.content.type === 'buffer') {
                        response.setHeader(
                            'content-length',
                            netResponse.body.content.buffer.length,
                        );
                    } else if (netResponse.body.content.type === 'text') {
                        response.setHeader(
                            'content-length',
                            Buffer.byteLength(netResponse.body.content.content, 'utf8'),
                        );
                    } else {
                        response.setHeader('content-length', netResponse.body.content.length);
                    }
                    response.setHeader('content-type', netResponse.body.contentType);
                    if (netResponse.body.attachment) {
                        response.setHeader(
                            'content-disposition',
                            `attachment; filename="${netResponse.body.attachment.filename
                                .replace(/\\/g, '\\\\')
                                .replace(/"/g, '\\"')}"`,
                        );
                    }
                    break;
                }
            }

            if (netResponse.flushHeaders) {
                response.flushHeaders();
            }

            switch (netResponse.body?.type) {
                case 'text': {
                    this.#writeContentToStream(response, netResponse.body.content)
                        .then(() => {
                            response.end();
                            res();
                        })
                        .catch(rej);
                    break;
                }
                case 'json': {
                    this.#writeContentToStream(response, stringifyJson!)
                        .then(() => {
                            response.end();
                            res();
                        })
                        .catch(rej);
                    break;
                }
                case 'buffer': {
                    this.#writeContentToStream(response, netResponse.body.content)
                        .then(() => {
                            response.end();
                            res();
                        })
                        .catch(rej);
                    break;
                }
                case 'stream': {
                    netResponse.body.content.pipe(response);
                    netResponse.body.content.on('end', () => {
                        res();
                    });
                    netResponse.body.content.on('error', (err) => {
                        rej(err);
                    });
                    break;
                }
                case 'file': {
                    if (netResponse.body.content.type === 'buffer') {
                        this.#writeContentToStream(response, netResponse.body.content.buffer)
                            .then(() => {
                                response.end();
                                res();
                            })
                            .catch(rej);
                    } else if (netResponse.body.content.type === 'text') {
                        this.#writeContentToStream(response, netResponse.body.content.content)
                            .then(() => {
                                response.end();
                                res();
                            })
                            .catch(rej);
                    } else {
                        netResponse.body.content.stream.pipe(response);
                        netResponse.body.content.stream.on('end', () => {
                            res();
                        });
                        netResponse.body.content.stream.on('error', (err) => {
                            rej(err);
                        });
                    }
                    break;
                }
                default: {
                    response.end();
                    res();
                    break;
                }
            }
        });
    }

    #composeNetRequest(
        request: http.IncomingMessage,
        abortSignal: AbortSignal,
    ): Promise<NetRequest<Global>> {
        return this.#settings.makeGlobal(request).then((global) => {
            let cookies: Record<string, string> | undefined;

            const netRequest: NetRequest<Global> = {
                method: request.method as string,
                url: new URL(request.url ?? '', `http://${request.headers.host}`),
                headers: request.headers,
                get cookies(): Record<string, string> {
                    if (cookies) {
                        return cookies;
                    }
                    const cookie = request.headers.cookie;
                    cookies = !cookie
                        ? {}
                        : cookie.split('; ').reduce(
                              (cookieAcc, str) => {
                                  const [, key, value] = str.match(/^([^=]+)=(.*)/) ?? [];
                                  if (key) {
                                      cookieAcc[key] = value;
                                  }
                                  return cookieAcc;
                              },
                              {} as Record<string, string>,
                          );
                    return cookies;
                },
                id: (this.#settings.requestIdExtractor ?? DEFAULT_REQUEST_ID_EXTRACTOR)(request),
                startedAt: Date.now(),
                body: null,
                pathname: {
                    router: '',
                    groups: {},
                },
                abortSignal,
                context: {} as Record<string, unknown>,
                global,
            };

            return netRequest;
        });
    }

    async #cleanup(netRequest?: NetRequest<Global>): Promise<void> {
        if (netRequest?.body?.type === 'buffer') {
            await netRequest.body.fileLocation.cleanup();
        } else if (netRequest?.body?.type === 'form-data') {
            for (const fileLocation of Object.values(netRequest.body.fileLocations)) {
                await fileLocation.cleanup();
            }
        }
    }

    async #finishRequest(
        request: http.IncomingMessage,
        response: http.ServerResponse,
        requestProcessingInfo: RequestProcessingInfo,
        destroy: boolean,
        netRequest?: NetRequest<Global>,
        netResponse?: NetResponse,
    ): Promise<void> {
        if (requestProcessingInfo.finishedReason === 'socket-closed' || !netResponse) {
            await this.#cleanup(netRequest);
            return this.#settings.onRequestFinished?.(
                request,
                requestProcessingInfo,
                netRequest,
                netResponse,
            );
        }
        if (netRequest && this.#settings.onCreatedNetResponse) {
            await this.#settings.onCreatedNetResponse(netRequest, netResponse);
        }
        requestProcessingInfo.periods.sending = Period.make();
        let destroyed = false;
        try {
            await this.#sendNetResponse(response, netResponse);
        } catch (err) {
            requestProcessingInfo.finishedReason = 'error';
            response.destroy(err as Error);
            destroyed = true;
        }
        Period.end(requestProcessingInfo.periods.sending);
        if (destroy && !destroyed) {
            request.destroy();
        }
        Period.end(requestProcessingInfo.periods.total);
        await this.#cleanup(netRequest);
        return this.#settings.onRequestFinished?.(
            request,
            requestProcessingInfo,
            netRequest,
            netResponse,
        );
    }

    async #handle(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
        const requestProcessingInfo: RequestProcessingInfo = {
            periods: {
                total: Period.make(),
            },
            finishedReason: 'handled',
        };
        const url = new URL(request.url ?? '', `http://${request.headers.host}`);
        const items = PathMatcher.toItems(url.pathname as StringPath);
        const matchedRouter = this.#routerPathMatcher.matchLongest(items);
        if (!matchedRouter) {
            requestProcessingInfo.finishedReason = 'not-found';
            return this.#finishRequest(
                request,
                response,
                requestProcessingInfo,
                true,
                undefined,
                new NetResponseError(404, { type: 'text', content: 'Not Found' }),
            );
        }
        requestProcessingInfo.router = matchedRouter.value.name ?? url.pathname;
        const cutPathname = url.pathname.substring(
            items
                .slice(0, matchedRouter.matchedCount)
                .reduce((total, item) => total + item.length, 0) + matchedRouter.matchedCount,
        ) as StringPath;
        const handlerInfo = matchedRouter.value.getHandlerInfo(
            request.method as HTTPMethod,
            cutPathname,
        );
        if (!handlerInfo) {
            requestProcessingInfo.finishedReason = 'not-found';
            return this.#finishRequest(
                request,
                response,
                requestProcessingInfo,
                true,
                undefined,
                new NetResponseError(404, { type: 'text', content: 'Not Found' }),
            );
        }

        const [info, result] = handlerInfo;
        requestProcessingInfo.handler = info.handler.name ?? info.path;
        if (info.options?.maxContentLength !== undefined) {
            if (!request.headers['content-length']) {
                requestProcessingInfo.finishedReason = 'length-required';
                return this.#finishRequest(
                    request,
                    response,
                    requestProcessingInfo,
                    true,
                    undefined,
                    new NetResponseError(411, { type: 'text', content: 'Length Required' }),
                );
            }
            if (Number(request.headers['content-length']) > info.options.maxContentLength) {
                requestProcessingInfo.finishedReason = 'content-too-large';
                return this.#finishRequest(
                    request,
                    response,
                    requestProcessingInfo,
                    true,
                    undefined,
                    new NetResponseError(413, { type: 'text', content: 'Content Too Large' }),
                );
            }
        }

        const [contentType] =
            request.headers['content-type']?.split(';').map((value) => value.trim()) ?? [];

        if (
            info.options?.acceptContentTypes &&
            (!contentType || !info.options.acceptContentTypes.includes(contentType))
        ) {
            requestProcessingInfo.finishedReason = 'not-acceptable';
            return this.#finishRequest(
                request,
                response,
                requestProcessingInfo,
                true,
                undefined,
                new NetResponseError(406, { type: 'text', content: 'Not Acceptable' }),
            );
        }

        if (info.options?.shouldAbort) {
            requestProcessingInfo.periods.shouldAbortChecking = Period.make();
            const shouldAbort = await info.options.shouldAbort(request);
            Period.end(requestProcessingInfo.periods.shouldAbortChecking);
            if (shouldAbort) {
                requestProcessingInfo.finishedReason = 'too-many-requests';
                return this.#finishRequest(
                    request,
                    response,
                    requestProcessingInfo,
                    true,
                    undefined,
                    new NetResponseError(429, { type: 'text', content: 'Too many requests' }),
                );
            }
        }

        const abortController = new AbortController();
        const onSocketClose = () => {
            requestProcessingInfo.finishedReason = 'socket-closed';
            abortController.abort('socket-closed');
        };
        request.socket.on('close', onSocketClose);
        requestProcessingInfo.periods.composingNetRequest = Period.make();
        const netRequest = await this.#composeNetRequest(request, abortController.signal);
        Period.end(requestProcessingInfo.periods.composingNetRequest);
        this.#abortControllers.add(abortController);

        let netResponse: NetResponse | undefined;
        try {
            requestProcessingInfo.periods.parsingBody = Period.make();
            const body = await this.#parseBody(request);
            Period.end(requestProcessingInfo.periods.parsingBody);
            netRequest.body = body;
            netRequest.pathname.router = url.pathname;
            netRequest.pathname.groups = result;
            requestProcessingInfo.periods.handling = Period.make();
            if (info.options?.timeout) {
                netResponse = await Promise.race([
                    matchedRouter.value
                        .callHandler(info, netRequest)
                        // eslint-disable-next-line @typescript-eslint/no-shadow
                        .then((netResponse) => {
                            if (requestProcessingInfo.finishedReason === 'timeout') {
                                return;
                            }
                            Period.end(requestProcessingInfo.periods.handling!);
                            if (matchedRouter.value.onCreatedNetResponse) {
                                return matchedRouter.value
                                    .onCreatedNetResponse(netRequest, netResponse)
                                    .then(() => {
                                        if (requestProcessingInfo.finishedReason === 'timeout') {
                                            return;
                                        }
                                        return netResponse;
                                    });
                            }
                            return netResponse;
                        }),
                    new Promise<NetResponse>((res) =>
                        setTimeout(() => {
                            if (requestProcessingInfo.periods.handling?.[1]) {
                                return;
                            }
                            Period.end(requestProcessingInfo.periods.handling!);
                            res(
                                new NetResponseError(504, {
                                    type: 'text',
                                    content: 'Gateway Timeout',
                                }),
                            );
                            requestProcessingInfo.finishedReason = 'timeout';
                            abortController.abort('timeout');
                        }, info.options.timeout),
                    ),
                ]);
            } else {
                netResponse = await matchedRouter.value.callHandler(info, netRequest);
                Period.end(requestProcessingInfo.periods.handling!);
                if (matchedRouter.value.onCreatedNetResponse) {
                    await matchedRouter.value.onCreatedNetResponse(netRequest, netResponse);
                }
            }
        } catch (err) {
            Period.endIfPresent(requestProcessingInfo.periods.parsingBody);
            Period.endIfPresent(requestProcessingInfo.periods.handling);
            if (requestProcessingInfo.finishedReason === 'socket-closed') {
                netResponse = new NetResponseError(0, {
                    type: 'text',
                    content: 'Socket closed',
                });
            } else {
                if (err instanceof NetResponseError) {
                    requestProcessingInfo.finishedReason = 'error';
                    netResponse = err;
                } else {
                    requestProcessingInfo.finishedReason = 'internal-server-error';
                    netResponse = new NetResponseError(500, {
                        type: 'text',
                        content: 'Internal Server Error',
                    });
                }
            }
        } finally {
            this.#abortControllers.delete(abortController);
        }

        return this.#finishRequest(
            request,
            response,
            requestProcessingInfo,
            false,
            netRequest,
            netResponse,
        ).then(() => {
            request.socket.off('close', onSocketClose);
        });
    }
}

export class GloballessServer extends Server<unknown> {
    constructor(
        httpServer: http.Server,
        serverSettings: Omit<ServerSettings<unknown>, 'makeGlobal'>,
    ) {
        super(httpServer, { ...serverSettings, makeGlobal: () => Promise.resolve() });
    }
}
