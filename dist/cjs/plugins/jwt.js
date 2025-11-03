"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encode = encode;
exports.decodeBody = decodeBody;
exports.decode = decode;
exports.verify = verify;
exports.check = check;
const node_crypto_1 = __importDefault(require("node:crypto"));
function encodeToBase64Value(object) {
    return Buffer.from(JSON.stringify(object)).toString('base64');
}
function sign(head64, body64, privateKey) {
    return node_crypto_1.default
        .createHmac('SHA256', privateKey)
        .update(head64 + '.' + body64)
        .digest('base64');
}
function encode(body, privateKey) {
    const head = {
        alg: 'HS256',
        typ: 'JWT',
    };
    const head64 = encodeToBase64Value(head);
    const body64 = typeof body === 'string' ? Buffer.from(body).toString('base64') : encodeToBase64Value(body);
    const sign64 = sign(head64, body64, privateKey);
    return [head64, body64, sign64].join('.');
}
function decodeBody(body64, toJson) {
    if (toJson) {
        return JSON.parse(Buffer.from(body64, 'base64').toString());
    }
    return Buffer.from(body64, 'base64').toString();
}
function decode(token, toJson) {
    const [, body64] = token.split('.');
    return decodeBody(body64, toJson);
}
function verify(token, privateKey) {
    const [head64, body64, sign64] = token.split('.');
    return sign(head64, body64, privateKey) === sign64;
}
function check(token, privateKey, toJson) {
    const [head64, body64, sign64] = token.split('.');
    if (sign(head64, body64, privateKey) !== sign64) {
        return { ok: false, error: 'invalid-sign' };
    }
    try {
        return { ok: true, value: decodeBody(body64, toJson) };
    }
    catch (_a) {
        return { ok: false, error: 'invalid-token' };
    }
}
