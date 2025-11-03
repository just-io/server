export declare function encode(body: string, privateKey: string): string;
export declare function encode<T>(body: T, privateKey: string): string;
export declare function decodeBody(body64: string): string;
export declare function decodeBody<T>(body64: string, toJson: true): T;
export declare function decode(token: string): string;
export declare function decode<T>(token: string, toJson: true): T;
export declare function verify(token: string, privateKey: string): boolean;
type CheckResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: 'invalid-token' | 'invalid-sign';
};
export declare function check(token: string, privateKey: string): CheckResult<string>;
export declare function check<T>(token: string, privateKey: string, toJson: true): CheckResult<T>;
export {};
