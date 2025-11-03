import { NetResponse } from '../types';
export type CSPPolicyDirectiveType = 'script-src' | 'style-src' | 'img-src' | 'default-src' | 'object-src';
export type CSPPolicyDirectiveSchema = 'self' | 'unsafe-eval' | 'wasm-unsafe-eval' | 'unsafe-inline' | 'unsafe-hashes' | 'inline-speculation-rules' | 'strict-dynamic' | 'report-sample' | 'none';
export type CSPPolicy = [
    CSPPolicyDirectiveType,
    ...(CSPPolicyDirectiveSchema | `http:${string}` | `https:${string}` | `ws:${string}` | `blob:`)[]
];
export type LayoutOptions = {
    title?: string;
    description?: string;
    csrfToken?: string;
    assets?: {
        location: string;
        js?: string[];
        css?: string[];
    };
    content?: string;
    lang?: string;
    global?: {
        variable: string;
        value: unknown;
    }[];
    csp?: {
        nonce?: string;
        policies: CSPPolicy[];
    };
    bodyClasses?: string[];
};
export declare function renderLayout(options: Exclude<LayoutOptions, 'csp'>, nonce: string): string;
export declare function makeLayout(options: LayoutOptions): {
    layout: string;
    headers: NetResponse['headers'];
};
