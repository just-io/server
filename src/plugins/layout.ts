import crypto from 'node:crypto';

import { NetResponse } from '../types';

export type CSPPolicyDirectiveType =
    | 'script-src'
    | 'style-src'
    | 'img-src'
    | 'default-src'
    | 'object-src';

export type CSPPolicyDirectiveSchema =
    | 'self'
    | 'unsafe-eval'
    | 'wasm-unsafe-eval'
    | 'unsafe-inline'
    | 'unsafe-hashes'
    | 'inline-speculation-rules'
    | 'strict-dynamic'
    | 'report-sample'
    | 'none';

export type CSPPolicy = [
    CSPPolicyDirectiveType,
    CSPPolicyDirectiveSchema,
    ...(`http:${string}` | `https:${string}` | `ws:${string}` | `blob:`)[],
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

export function renderLayout(options: Omit<LayoutOptions, 'csp'>, nonce: string): string {
    return `
<!DOCTYPE html>
<html lang="${options.lang ?? 'en'}" style="min-height: 100vh;">
    <head>
        <meta charset="utf-8" />
        ${options.title ? `<title>${options.title ?? ''}</title>` : ''}
        ${options.csrfToken ? `<meta name="csrf-token" content="${options.csrfToken}" />` : ''}
        ${options.title ? `<meta name="title" content="${options.title}" />` : ''}
        ${options.description ? `<meta name="description" content="${options.description}" />` : ''}
        <link rel="icon" href="${options.assets?.location ?? ''}favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="${
            options.assets?.location ?? ''
        }favicon.ico" type="image/x-icon" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${
            options.assets?.css
                ?.map(
                    (file) =>
                        `<link rel="stylesheet" type="text/css" href="${
                            options.assets?.location ?? ''
                        }${file}" />`,
                )
                .join('        \n') ?? ''
        }
        ${
            options.assets?.js
                ?.map(
                    (file) =>
                        `<script nonce="${nonce}" src="${
                            options.assets?.location ?? ''
                        }${file}"></script>`,
                )
                .join('        \n') ?? ''
        }
        ${
            options.global
                ?.map(
                    ({ variable, value }) =>
                        `<script nonce="${nonce}">window.${variable}=${JSON.stringify(
                            value,
                        )}</script>`,
                )
                .join('        \n') ?? ''
        }
    </head>
    <body ${options.bodyClasses?.length ? `class="${options.bodyClasses.join(' ')}"` : ''}>
        ${options.content ?? ''}
    </body>
</html>
`;
}

export function makeLayout(options: LayoutOptions): {
    layout: string;
    headers: NetResponse['headers'];
} {
    const nonce = options.csp?.nonce ?? crypto.randomUUID();

    return {
        layout: renderLayout(options, nonce),
        headers: {
            'content-security-policy': [`script-src 'nonce-${nonce}'`]
                .concat(
                    options.csp?.policies.map(
                        ([type, schema, ...schemas]) => `${type} '${schema}' ${schemas.join(' ')}`,
                    ) ?? [],
                )
                .join('; '),
        },
    };
}
