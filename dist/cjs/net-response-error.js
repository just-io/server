"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetResponseError = void 0;
class NetResponseError extends Error {
    constructor(status, body, headers, cookies) {
        super();
        this.status = status;
        this.body = body;
        this.headers = headers;
        this.cookies = cookies;
    }
}
exports.NetResponseError = NetResponseError;
