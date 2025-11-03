export function match(pattern) {
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
export class Router {
    #handlerInfos = [];
    #composeContext;
    #defaultOptions;
    name = 'unknown router';
    constructor(composeContext, defaultOptions) {
        this.#composeContext = composeContext;
        this.#defaultOptions = defaultOptions;
    }
    addHandler(method, pattern, routeHandler) {
        const handler = typeof routeHandler === 'function' ? { handle: routeHandler } : routeHandler;
        handler.options = Object.assign({}, this.#defaultOptions, handler.options);
        this.#handlerInfos.push({
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
        for (const handlerInfo of this.#handlerInfos) {
            if (handlerInfo.method !== '*' && handlerInfo.method !== method) {
                continue;
            }
            const params = handlerInfo.matcher(pathname);
            if (params) {
                request.params = params;
                return this.#composeContext(request).then((netRequest) => handlerInfo.handler.handle(netRequest));
            }
        }
        return Promise.resolve(null);
    }
    getHandlerInfo(method, pathname) {
        let maxParams = null;
        for (const handlerInfo of this.#handlerInfos) {
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
        return this.#composeContext(request).then((netRequest) => handlerInfo.handler.handle(netRequest));
    }
}
export class ContextlessRouter extends Router {
    constructor(defaultOptions) {
        super((netRequest) => Promise.resolve(netRequest), defaultOptions);
    }
}
