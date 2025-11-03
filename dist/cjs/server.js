"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Server_instances, _Server_routerEntries, _Server_serverSettings, _Server_httpServer, _Server_typeParserEntries, _Server_parsers, _Server_abortControllers, _Server_parseBody, _Server_writeContentToStream, _Server_sendNetResponse, _Server_compouseNetRequest, _Server_handle;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const net_response_error_1 = require("./net-response-error");
const form_data_body_parser_1 = __importDefault(require("./body-parsers/form-data-body-parser"));
const urlencoded_body_parser_1 = __importDefault(require("./body-parsers/urlencoded-body-parser"));
const json_body_parser_1 = __importDefault(require("./body-parsers/json-body-parser"));
const buffer_body_parser_1 = __importDefault(require("./body-parsers/buffer-body-parser"));
const text_body_parser_1 = __importDefault(require("./body-parsers/text-body-parser"));
const defaultTypeParsers = {
    'application/json': 'json',
    'multipart/form-data': 'form-data',
    'application/x-www-form-urlencoded': 'urlencoded',
    'text/plain': 'text',
    default: 'buffer',
};
const DEFAULT_TYPE_PARSER = 'buffer';
const DEFAULT_BUFFER_SIZE = 1024;
class Server {
    constructor(httpServer, serverSettings) {
        _Server_instances.add(this);
        _Server_routerEntries.set(this, []);
        _Server_serverSettings.set(this, void 0);
        _Server_httpServer.set(this, void 0);
        _Server_typeParserEntries.set(this, void 0);
        _Server_parsers.set(this, void 0);
        _Server_abortControllers.set(this, new Set());
        __classPrivateFieldSet(this, _Server_httpServer, httpServer, "f");
        __classPrivateFieldSet(this, _Server_serverSettings, serverSettings, "f");
        __classPrivateFieldGet(this, _Server_httpServer, "f").on('request', (request, response) => __classPrivateFieldGet(this, _Server_instances, "m", _Server_handle).call(this, request, response));
        __classPrivateFieldSet(this, _Server_parsers, {
            'form-data': new form_data_body_parser_1.default(__classPrivateFieldGet(this, _Server_serverSettings, "f").createNewFileLocation),
            urlencoded: new urlencoded_body_parser_1.default(),
            json: new json_body_parser_1.default(),
            buffer: new buffer_body_parser_1.default(__classPrivateFieldGet(this, _Server_serverSettings, "f").createNewFileLocation),
            text: new text_body_parser_1.default(),
        }, "f");
        __classPrivateFieldSet(this, _Server_typeParserEntries, Object.entries(Object.assign(Object.assign({}, defaultTypeParsers), serverSettings.typeParsers)), "f");
    }
    listen(portOrPath) {
        __classPrivateFieldGet(this, _Server_httpServer, "f").listen(portOrPath);
        return this;
    }
    close(timeout) {
        return new Promise((res, rej) => {
            setTimeout(() => {
                __classPrivateFieldGet(this, _Server_abortControllers, "f").forEach((abortController) => abortController.abort());
            }, timeout);
            __classPrivateFieldGet(this, _Server_httpServer, "f").close((error) => (error ? rej(error) : res()));
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addRouter(prefix, router) {
        __classPrivateFieldGet(this, _Server_routerEntries, "f").push([new RegExp(`^${prefix}`), router]);
        return this;
    }
}
exports.Server = Server;
_Server_routerEntries = new WeakMap(), _Server_serverSettings = new WeakMap(), _Server_httpServer = new WeakMap(), _Server_typeParserEntries = new WeakMap(), _Server_parsers = new WeakMap(), _Server_abortControllers = new WeakMap(), _Server_instances = new WeakSet(), _Server_parseBody = function _Server_parseBody(request) {
    if (!request.headers['content-length']) {
        return Promise.resolve(null);
    }
    const type = request.headers['content-type'];
    if (!type) {
        return __classPrivateFieldGet(this, _Server_parsers, "f")[DEFAULT_TYPE_PARSER].parse(request);
    }
    const typeParserEntry = __classPrivateFieldGet(this, _Server_typeParserEntries, "f").find((aTypeParserEntry) => type.includes(aTypeParserEntry[0]));
    if (typeParserEntry) {
        return __classPrivateFieldGet(this, _Server_parsers, "f")[typeParserEntry[1]].parse(request);
    }
    return __classPrivateFieldGet(this, _Server_parsers, "f")[DEFAULT_TYPE_PARSER].parse(request);
}, _Server_writeContentToStream = function _Server_writeContentToStream(stream, content) {
    var _a;
    const size = (_a = __classPrivateFieldGet(this, _Server_serverSettings, "f").bufferSize) !== null && _a !== void 0 ? _a : DEFAULT_BUFFER_SIZE;
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
}, _Server_sendNetResponse = function _Server_sendNetResponse(response, netResponse) {
    return new Promise((res) => {
        var _a, _b, _c, _d, _e;
        response.statusCode = (_a = netResponse.status) !== null && _a !== void 0 ? _a : 200;
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
        switch ((_b = netResponse.body) === null || _b === void 0 ? void 0 : _b.type) {
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
                response.setHeader('content-type', (_c = netResponse.body.contentType) !== null && _c !== void 0 ? _c : 'application/octet-stream');
                break;
            }
            case 'stream': {
                response.setHeader('content-length', netResponse.body.contentLength);
                response.setHeader('content-type', (_d = netResponse.body.contentType) !== null && _d !== void 0 ? _d : 'application/octet-stream');
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
        switch ((_e = netResponse.body) === null || _e === void 0 ? void 0 : _e.type) {
            case 'text': {
                __classPrivateFieldGet(this, _Server_instances, "m", _Server_writeContentToStream).call(this, response, netResponse.body.content).then(() => {
                    response.end();
                    res(netResponse);
                });
                break;
            }
            case 'json': {
                __classPrivateFieldGet(this, _Server_instances, "m", _Server_writeContentToStream).call(this, response, stringifyJson).then(() => {
                    response.end();
                    res(netResponse);
                });
                break;
            }
            case 'buffer': {
                __classPrivateFieldGet(this, _Server_instances, "m", _Server_writeContentToStream).call(this, response, netResponse.body.content).then(() => {
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
                    __classPrivateFieldGet(this, _Server_instances, "m", _Server_writeContentToStream).call(this, response, netResponse.body.content.buffer).then(() => {
                        response.end();
                        res(netResponse);
                    });
                }
                else if (netResponse.body.content.type === 'text') {
                    __classPrivateFieldGet(this, _Server_instances, "m", _Server_writeContentToStream).call(this, response, netResponse.body.content.content).then(() => {
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
}, _Server_compouseNetRequest = function _Server_compouseNetRequest(request, abortSignal) {
    var _a;
    let cookies;
    const netRequest = {
        method: request.method,
        url: new URL((_a = request.url) !== null && _a !== void 0 ? _a : '', `http://${request.headers.host}`),
        headers: request.headers,
        get cookies() {
            if (cookies) {
                return cookies;
            }
            const cookie = request.headers.cookie;
            cookies = !cookie
                ? {}
                : cookie.split('; ').reduce((cookieAcc, str) => {
                    var _a;
                    const [, key, value] = (_a = str.match(/(.+)=(.+)/)) !== null && _a !== void 0 ? _a : [];
                    cookieAcc[key] = value;
                    return cookieAcc;
                }, {});
            return cookies;
        },
        id: (Array.isArray(request.headers['x-request-id'])
            ? request.headers['x-request-id'][0]
            : request.headers['x-request-id']) || node_crypto_1.default.randomUUID(),
        startedAt: Date.now(),
        body: null,
        params: {},
        abortSignal,
        context: {},
    };
    return netRequest;
}, _Server_handle = function _Server_handle(request, response) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        const url = new URL((_a = request.url) !== null && _a !== void 0 ? _a : '', `http://${request.headers.host}`);
        const matchedRouter = __classPrivateFieldGet(this, _Server_routerEntries, "f").reduce((obj, routerEntry) => {
            var _a, _b;
            const prefix = (_a = url.pathname.match(routerEntry[0])) === null || _a === void 0 ? void 0 : _a[0];
            if (obj && obj.prefix.length >= ((_b = prefix === null || prefix === void 0 ? void 0 : prefix.length) !== null && _b !== void 0 ? _b : 0)) {
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
            __classPrivateFieldGet(this, _Server_instances, "m", _Server_sendNetResponse).call(this, response, new net_response_error_1.NetResponseError(404, { type: 'text', content: 'Not Found' }));
            return;
        }
        const cutPathname = url.pathname.substring(matchedRouter.prefix.length);
        const handlerInfo = matchedRouter.router.getHandlerInfo(request.method, cutPathname);
        if (!handlerInfo) {
            yield __classPrivateFieldGet(this, _Server_instances, "m", _Server_sendNetResponse).call(this, response, new net_response_error_1.NetResponseError(404, { type: 'text', content: 'Not Found' }));
            return;
        }
        const [info, params] = handlerInfo;
        if (((_b = info.handler.options) === null || _b === void 0 ? void 0 : _b.maxContentLength) !== undefined) {
            if (!request.headers['content-length']) {
                yield __classPrivateFieldGet(this, _Server_instances, "m", _Server_sendNetResponse).call(this, response, new net_response_error_1.NetResponseError(411, { type: 'text', content: 'Length Required' }));
                request.destroy();
                (_d = (_c = __classPrivateFieldGet(this, _Server_serverSettings, "f")).onRequestAborted) === null || _d === void 0 ? void 0 : _d.call(_c, request, 'length-required');
                return;
            }
            if (Number(request.headers['content-length']) > info.handler.options.maxContentLength) {
                yield __classPrivateFieldGet(this, _Server_instances, "m", _Server_sendNetResponse).call(this, response, new net_response_error_1.NetResponseError(413, { type: 'text', content: 'Content Too Large' }));
                request.destroy();
                (_f = (_e = __classPrivateFieldGet(this, _Server_serverSettings, "f")).onRequestAborted) === null || _f === void 0 ? void 0 : _f.call(_e, request, 'content-too-large');
                return;
            }
        }
        if (((_g = info.handler.options) === null || _g === void 0 ? void 0 : _g.acceptContentTypes) &&
            (!request.headers['content-type'] ||
                !info.handler.options.acceptContentTypes.includes(request.headers['content-type']))) {
            yield __classPrivateFieldGet(this, _Server_instances, "m", _Server_sendNetResponse).call(this, response, new net_response_error_1.NetResponseError(406, { type: 'text', content: 'Not Acceptable' }));
            request.destroy();
            (_j = (_h = __classPrivateFieldGet(this, _Server_serverSettings, "f")).onRequestAborted) === null || _j === void 0 ? void 0 : _j.call(_h, request, 'not-acceptable');
            return;
        }
        if ((_k = info.handler.options) === null || _k === void 0 ? void 0 : _k.shouldAbort) {
            const shouldAbort = yield info.handler.options.shouldAbort(request);
            if (shouldAbort) {
                yield __classPrivateFieldGet(this, _Server_instances, "m", _Server_sendNetResponse).call(this, response, new net_response_error_1.NetResponseError(429, { type: 'text', content: 'Too many requests' }));
                request.destroy();
                (_m = (_l = __classPrivateFieldGet(this, _Server_serverSettings, "f")).onRequestAborted) === null || _m === void 0 ? void 0 : _m.call(_l, request, 'too-many-requests');
                return;
            }
        }
        const abortController = new AbortController();
        const onSocketClose = () => {
            abortController.abort('socket-closed');
        };
        request.socket.on('close', onSocketClose);
        const netRequest = __classPrivateFieldGet(this, _Server_instances, "m", _Server_compouseNetRequest).call(this, request, abortController.signal);
        __classPrivateFieldGet(this, _Server_abortControllers, "f").add(abortController);
        let netResponse;
        try {
            const body = yield __classPrivateFieldGet(this, _Server_instances, "m", _Server_parseBody).call(this, request);
            netRequest.body = body;
            netRequest.params = params;
            if ((_o = info.handler.options) === null || _o === void 0 ? void 0 : _o.timeout) {
                netResponse = yield Promise.race([
                    matchedRouter.router.callHandler(info, netRequest),
                    new Promise((res) => {
                        var _a;
                        return setTimeout(() => {
                            var _a, _b;
                            res(new net_response_error_1.NetResponseError(504, {
                                type: 'text',
                                content: 'Gateway Timeout',
                            }));
                            (_b = (_a = __classPrivateFieldGet(this, _Server_serverSettings, "f")).onRequestAborted) === null || _b === void 0 ? void 0 : _b.call(_a, request, 'timeout');
                            abortController.abort('timeout');
                        }, (_a = info.handler.options) === null || _a === void 0 ? void 0 : _a.timeout);
                    }),
                ]);
            }
            else {
                netResponse = yield matchedRouter.router.callHandler(info, netRequest);
            }
            __classPrivateFieldGet(this, _Server_abortControllers, "f").delete(abortController);
            if (__classPrivateFieldGet(this, _Server_serverSettings, "f").onRequestHandled) {
                netResponse = yield __classPrivateFieldGet(this, _Server_serverSettings, "f").onRequestHandled(netRequest, netResponse);
            }
        }
        catch (err) {
            if (err instanceof net_response_error_1.NetResponseError) {
                netResponse = err;
            }
            else {
                netResponse = new net_response_error_1.NetResponseError(500, {
                    type: 'text',
                    content: 'Internal Server Error',
                });
            }
        }
        if (netRequest.abortSignal.aborted && netRequest.abortSignal.reason !== 'timeout') {
            response.end();
        }
        else {
            yield __classPrivateFieldGet(this, _Server_instances, "m", _Server_sendNetResponse).call(this, response, netResponse);
        }
        request.socket.off('close', onSocketClose);
        (_q = (_p = __classPrivateFieldGet(this, _Server_serverSettings, "f")).onRequestFinished) === null || _q === void 0 ? void 0 : _q.call(_p, netRequest, netResponse);
    });
};
