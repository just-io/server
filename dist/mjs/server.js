import crypto from 'node:crypto';
import { NetResponseError } from './net-response-error';
import FormDataBodyParser from './body-parsers/form-data-body-parser';
import UrencodedBodyParser from './body-parsers/urlencoded-body-parser';
import JsonBodyParser from './body-parsers/json-body-parser';
import BufferBodyParser from './body-parsers/buffer-body-parser';
import TextBodyParser from './body-parsers/text-body-parser';
const defaultTypeParsers = {
    'application/json': 'json',
    'multipart/form-data': 'form-data',
    'application/x-www-form-urlencoded': 'urlencoded',
    'text/plain': 'text',
    default: 'buffer',
};
const DEFAULT_TYPE_PARSER = 'buffer';
const DEFAULT_BUFFER_SIZE = 1024;
export class Server {
    #routerEntries = [];
    #serverSettings;
    #httpServer;
    #typeParserEntries;
    #parsers;
    #abortControllers = new Set();
    constructor(httpServer, serverSettings) {
        this.#httpServer = httpServer;
        this.#serverSettings = serverSettings;
        this.#httpServer.on('request', (request, response) => this.#handle(request, response));
        this.#parsers = {
            'form-data': new FormDataBodyParser(this.#serverSettings.createNewFileLocation),
            urlencoded: new UrencodedBodyParser(),
            json: new JsonBodyParser(),
            buffer: new BufferBodyParser(this.#serverSettings.createNewFileLocation),
            text: new TextBodyParser(),
        };
        this.#typeParserEntries = Object.entries({
            ...defaultTypeParsers,
            ...serverSettings.typeParsers,
        });
    }
    listen(portOrPath) {
        this.#httpServer.listen(portOrPath);
        return this;
    }
    close(timeout) {
        return new Promise((res, rej) => {
            setTimeout(() => {
                this.#abortControllers.forEach((abortController) => abortController.abort());
            }, timeout);
            this.#httpServer.close((error) => (error ? rej(error) : res()));
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addRouter(prefix, router) {
        this.#routerEntries.push([new RegExp(`^${prefix}`), router]);
        return this;
    }
    #parseBody(request) {
        if (!request.headers['content-length']) {
            return Promise.resolve(null);
        }
        const type = request.headers['content-type'];
        if (!type) {
            return this.#parsers[DEFAULT_TYPE_PARSER].parse(request);
        }
        const typeParserEntry = this.#typeParserEntries.find((aTypeParserEntry) => type.includes(aTypeParserEntry[0]));
        if (typeParserEntry) {
            return this.#parsers[typeParserEntry[1]].parse(request);
        }
        return this.#parsers[DEFAULT_TYPE_PARSER].parse(request);
    }
    #writeContentToStream(stream, content) {
        const size = this.#serverSettings.bufferSize ?? DEFAULT_BUFFER_SIZE;
        const chunks = [];
        for (let i = 0; i < content.length; i += size) {
            chunks.push(content.slice(i, i + size));
        }
        return new Promise((res) => {
            function write() {
                if (chunks.length === 0) {
                    res();
                    return;
                }
                if (!stream.write(chunks.shift())) {
                    stream.once('drain', write);
                }
                else {
                    process.nextTick(write);
                }
            }
            write();
        });
    }
    #sendNetResponse(response, netResponse) {
        return new Promise((res) => {
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
                response.setHeader('set-cookie', netResponse.cookies.map((cookie) => {
                    let cookieValue = `${cookie.key}=${cookie.value}`;
                    if (cookie.expires) {
                        cookieValue += `; Expires=${cookie.expires.toString().split('+')[0]}`;
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
                }));
            }
            let stringifyJson;
            switch (netResponse.body?.type) {
                case 'text': {
                    response.setHeader('content-length', Buffer.byteLength(netResponse.body.content, 'utf8'));
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
                    response.setHeader('content-type', netResponse.body.contentType ?? 'application/octet-stream');
                    break;
                }
                case 'stream': {
                    response.setHeader('content-length', netResponse.body.contentLength);
                    response.setHeader('content-type', netResponse.body.contentType ?? 'application/octet-stream');
                    break;
                }
                case 'file': {
                    if (netResponse.body.content.type === 'buffer') {
                        response.setHeader('content-length', netResponse.body.content.buffer.length);
                    }
                    else if (netResponse.body.content.type === 'text') {
                        response.setHeader('content-length', netResponse.body.content.content.length);
                    }
                    else {
                        response.setHeader('content-length', netResponse.body.content.length);
                    }
                    response.setHeader('content-type', netResponse.body.contentType);
                    if (netResponse.body.attachment) {
                        response.setHeader('content-disposition', `attachment; filename=${netResponse.body.attachment.filename}`);
                    }
                    break;
                }
            }
            switch (netResponse.body?.type) {
                case 'text': {
                    this.#writeContentToStream(response, netResponse.body.content).then(() => {
                        response.end();
                        res(netResponse);
                    });
                    break;
                }
                case 'json': {
                    this.#writeContentToStream(response, stringifyJson).then(() => {
                        response.end();
                        res(netResponse);
                    });
                    break;
                }
                case 'buffer': {
                    this.#writeContentToStream(response, netResponse.body.content).then(() => {
                        response.end();
                        res(netResponse);
                    });
                    break;
                }
                case 'stream': {
                    netResponse.body.content.pipe(response);
                    netResponse.body.content.on('end', () => {
                        response.end();
                        res(netResponse);
                    });
                    break;
                }
                case 'file': {
                    if (netResponse.body.content.type === 'buffer') {
                        this.#writeContentToStream(response, netResponse.body.content.buffer).then(() => {
                            response.end();
                            res(netResponse);
                        });
                    }
                    else if (netResponse.body.content.type === 'text') {
                        this.#writeContentToStream(response, netResponse.body.content.content).then(() => {
                            response.end();
                            res(netResponse);
                        });
                    }
                    else {
                        netResponse.body.content.stream.pipe(response);
                        netResponse.body.content.stream.on('end', () => {
                            response.end();
                            res(netResponse);
                        });
                    }
                    break;
                }
                default: {
                    response.end();
                    res(netResponse);
                    break;
                }
            }
        });
    }
    #compouseNetRequest(request, abortSignal) {
        let cookies;
        const netRequest = {
            method: request.method,
            url: new URL(request.url ?? '', `http://${request.headers.host}`),
            headers: request.headers,
            get cookies() {
                if (cookies) {
                    return cookies;
                }
                const cookie = request.headers.cookie;
                cookies = !cookie
                    ? {}
                    : cookie.split('; ').reduce((cookieAcc, str) => {
                        const [, key, value] = str.match(/(.+)=(.+)/) ?? [];
                        cookieAcc[key] = value;
                        return cookieAcc;
                    }, {});
                return cookies;
            },
            id: (Array.isArray(request.headers['x-request-id'])
                ? request.headers['x-request-id'][0]
                : request.headers['x-request-id']) || crypto.randomUUID(),
            startedAt: Date.now(),
            body: null,
            params: {},
            abortSignal,
            context: {},
        };
        return netRequest;
    }
    async #handle(request, response) {
        const url = new URL(request.url ?? '', `http://${request.headers.host}`);
        const matchedRouter = this.#routerEntries.reduce((obj, routerEntry) => {
            const prefix = url.pathname.match(routerEntry[0])?.[0];
            if (obj && obj.prefix.length >= (prefix?.length ?? 0)) {
                return obj;
            }
            if (prefix) {
                return {
                    prefix,
                    router: routerEntry[1],
                };
            }
            return null;
        }, null);
        if (!matchedRouter) {
            this.#sendNetResponse(response, new NetResponseError(404, { type: 'text', content: 'Not Found' }));
            return;
        }
        const cutPathname = url.pathname.substring(matchedRouter.prefix.length);
        const handlerInfo = matchedRouter.router.getHandlerInfo(request.method, cutPathname);
        if (!handlerInfo) {
            await this.#sendNetResponse(response, new NetResponseError(404, { type: 'text', content: 'Not Found' }));
            return;
        }
        const [info, params] = handlerInfo;
        if (info.handler.options?.maxContentLength !== undefined) {
            if (!request.headers['content-length']) {
                await this.#sendNetResponse(response, new NetResponseError(411, { type: 'text', content: 'Length Required' }));
                request.destroy();
                this.#serverSettings.onRequestAborted?.(request, 'length-required');
                return;
            }
            if (Number(request.headers['content-length']) > info.handler.options.maxContentLength) {
                await this.#sendNetResponse(response, new NetResponseError(413, { type: 'text', content: 'Content Too Large' }));
                request.destroy();
                this.#serverSettings.onRequestAborted?.(request, 'content-too-large');
                return;
            }
        }
        if (info.handler.options?.acceptContentTypes &&
            (!request.headers['content-type'] ||
                !info.handler.options.acceptContentTypes.includes(request.headers['content-type']))) {
            await this.#sendNetResponse(response, new NetResponseError(406, { type: 'text', content: 'Not Acceptable' }));
            request.destroy();
            this.#serverSettings.onRequestAborted?.(request, 'not-acceptable');
            return;
        }
        if (info.handler.options?.shouldAbort) {
            const shouldAbort = await info.handler.options.shouldAbort(request);
            if (shouldAbort) {
                await this.#sendNetResponse(response, new NetResponseError(429, { type: 'text', content: 'Too many requests' }));
                request.destroy();
                this.#serverSettings.onRequestAborted?.(request, 'too-many-requests');
                return;
            }
        }
        const abortController = new AbortController();
        const onSocketClose = () => {
            abortController.abort('socket-closed');
        };
        request.socket.on('close', onSocketClose);
        const netRequest = this.#compouseNetRequest(request, abortController.signal);
        this.#abortControllers.add(abortController);
        let netResponse;
        try {
            const body = await this.#parseBody(request);
            netRequest.body = body;
            netRequest.params = params;
            if (info.handler.options?.timeout) {
                netResponse = await Promise.race([
                    matchedRouter.router.callHandler(info, netRequest),
                    new Promise((res) => setTimeout(() => {
                        res(new NetResponseError(504, {
                            type: 'text',
                            content: 'Gateway Timeout',
                        }));
                        this.#serverSettings.onRequestAborted?.(request, 'timeout');
                        abortController.abort('timeout');
                    }, info.handler.options?.timeout)),
                ]);
            }
            else {
                netResponse = await matchedRouter.router.callHandler(info, netRequest);
            }
            this.#abortControllers.delete(abortController);
            if (this.#serverSettings.onRequestHandled) {
                netResponse = await this.#serverSettings.onRequestHandled(netRequest, netResponse);
            }
        }
        catch (err) {
            if (err instanceof NetResponseError) {
                netResponse = err;
            }
            else {
                netResponse = new NetResponseError(500, {
                    type: 'text',
                    content: 'Internal Server Error',
                });
            }
        }
        if (netRequest.abortSignal.aborted && netRequest.abortSignal.reason !== 'timeout') {
            response.end();
        }
        else {
            await this.#sendNetResponse(response, netResponse);
        }
        request.socket.off('close', onSocketClose);
        this.#serverSettings.onRequestFinished?.(netRequest, netResponse);
    }
}
