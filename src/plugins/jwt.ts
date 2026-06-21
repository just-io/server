import crypto from 'node:crypto';

interface Head {
    alg: 'HS256';
    typ: 'JWT';
}

function encodeToBase64Value<T>(object: T): string {
    return Buffer.from(JSON.stringify(object)).toString('base64url');
}

function sign(head64: string, body64: string, privateKey: string): string {
    return crypto
        .createHmac('SHA256', privateKey)
        .update(head64 + '.' + body64)
        .digest('base64url');
}

export function encode(body: string, privateKey: string): string;
export function encode<T>(body: T, privateKey: string): string;
export function encode<T>(body: string | T, privateKey: string): string {
    const head: Head = {
        alg: 'HS256',
        typ: 'JWT',
    };
    const head64 = encodeToBase64Value(head);
    const body64 =
        typeof body === 'string'
            ? Buffer.from(body).toString('base64url')
            : encodeToBase64Value(body);
    const sign64 = sign(head64, body64, privateKey);

    return [head64, body64, sign64].join('.');
}

export function decodeBody(body64: string): string;
export function decodeBody<T>(body64: string, toJson: true): T;
export function decodeBody<T>(body64: string, toJson?: true): T | string {
    if (toJson) {
        return JSON.parse(Buffer.from(body64, 'base64url').toString()) as T;
    }
    return Buffer.from(body64, 'base64url').toString();
}

export function decode(token: string): string;
export function decode<T>(token: string, toJson: true): T;
export function decode<T>(token: string, toJson?: true): T | string {
    const [, body64] = token.split('.');
    return decodeBody(body64, toJson as true);
}

export function verify(token: string, privateKey: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return false;
    }
    const [head64, body64, sign64] = parts;
    const tokenBuffer = Buffer.from(sign(head64, body64, privateKey));
    const signBuffer = Buffer.from(sign64);
    return (
        tokenBuffer.length === signBuffer.length && crypto.timingSafeEqual(tokenBuffer, signBuffer)
    );
}

type CheckResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: 'invalid-token' | 'invalid-sign' };

export function check(token: string, privateKey: string): CheckResult<string>;
export function check<T>(token: string, privateKey: string, toJson: true): CheckResult<T>;
export function check<T>(
    token: string,
    privateKey: string,
    toJson?: true,
): CheckResult<string | T> {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return { ok: false, error: 'invalid-token' };
    }
    const [head64, body64, sign64] = parts;
    const tokenBuffer = Buffer.from(sign(head64, body64, privateKey));
    const signBuffer = Buffer.from(sign64);
    if (tokenBuffer.length !== signBuffer.length) {
        return { ok: false, error: 'invalid-token' };
    }
    if (!crypto.timingSafeEqual(tokenBuffer, signBuffer)) {
        return { ok: false, error: 'invalid-sign' };
    }
    try {
        return { ok: true, value: decodeBody(body64, toJson as true) };
    } catch {
        return { ok: false, error: 'invalid-token' };
    }
}
