"use strict";
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
var _Router_handlerInfos, _Router_composeContext, _Router_defaultOptions;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextlessRouter = exports.Router = void 0;
exports.match = match;
function match(pattern) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const groups = (pattern.match(/<(.+?)>/g) || []).map((str) => str.match(/<(.+?)(?::(.+?))?>/)[1]);
    const regexp = new RegExp(pattern.replace(/<(?:.+?)(?::(.+?))?>/g, (_str, p) => (p ? `(${p})` : `(.*)`)));
    return (str) => {
        const matched = str.match(regexp);
        if (matched) {
            return {
                matched: matched[0].length,
                params: groups.reduce((obj, group, i) => {
                    obj[group] = matched[i + 1];
                    return obj;
                }, {}),
            };
        }
        return null;
    };
}
class Router {
    constructor(composeContext, defaultOptions) {
        _Router_handlerInfos.set(this, []);
        _Router_composeContext.set(this, void 0);
        _Router_defaultOptions.set(this, void 0);
        this.name = 'unknown router';
        __classPrivateFieldSet(this, _Router_composeContext, composeContext, "f");
        __classPrivateFieldSet(this, _Router_defaultOptions, defaultOptions, "f");
    }
    addHandler(method, pattern, routeHandler) {
        const handler = typeof routeHandler === 'function' ? { handle: routeHandler } : routeHandler;
        handler.options = Object.assign({}, __classPrivateFieldGet(this, _Router_defaultOptions, "f"), handler.options);
        __classPrivateFieldGet(this, _Router_handlerInfos, "f").push({
            method,
            pattern,
            matcher: match(pattern),
            handler,
        });
        return this;
    }
    get(pattern, routeHandler) {
        return this.addHandler('GET', pattern, routeHandler);
    }
    post(pattern, routeHandler) {
        return this.addHandler('POST', pattern, routeHandler);
    }
    patch(pattern, routeHandler) {
        return this.addHandler('PATCH', pattern, routeHandler);
    }
    delete(pattern, routeHandler) {
        return this.addHandler('DELETE', pattern, routeHandler);
    }
    all(pattern, routeHandler) {
        return this.addHandler('*', pattern, routeHandler);
    }
    handle(method, pathname, request) {
        for (const handlerInfo of __classPrivateFieldGet(this, _Router_handlerInfos, "f")) {
            if (handlerInfo.method !== '*' && handlerInfo.method !== method) {
                continue;
            }
            const params = handlerInfo.matcher(pathname);
            if (params) {
                request.params = params;
                return __classPrivateFieldGet(this, _Router_composeContext, "f").call(this, request).then((netRequest) => handlerInfo.handler.handle(netRequest));
            }
        }
        return Promise.resolve(null);
    }
    getHandlerInfo(method, pathname) {
        let maxParams = null;
        for (const handlerInfo of __classPrivateFieldGet(this, _Router_handlerInfos, "f")) {
            if (handlerInfo.method !== '*' && handlerInfo.method !== method) {
                continue;
            }
            const params = handlerInfo.matcher(pathname);
            if (params && (!maxParams || params.matched > maxParams[1].matched)) {
                maxParams = [handlerInfo, params];
            }
        }
        if (maxParams) {
            return [maxParams[0], maxParams[1].params];
        }
        return null;
    }
    callHandler(handlerInfo, request) {
        return __classPrivateFieldGet(this, _Router_composeContext, "f").call(this, request).then((netRequest) => handlerInfo.handler.handle(netRequest));
    }
}
exports.Router = Router;
_Router_handlerInfos = new WeakMap(), _Router_composeContext = new WeakMap(), _Router_defaultOptions = new WeakMap();
class ContextlessRouter extends Router {
    constructor(defaultOptions) {
        super((netRequest) => Promise.resolve(netRequest), defaultOptions);
    }
}
exports.ContextlessRouter = ContextlessRouter;
