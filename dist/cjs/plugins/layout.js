"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderLayout = renderLayout;
exports.makeLayout = makeLayout;
function renderLayout(options, nonce) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    return `
<!DOCTYPE html>
<html lang="${(_a = options.lang) !== null && _a !== void 0 ? _a : 'en'}" style="min-height: 100vh;">
    <head>
        <meta charset="utf-8" />
        ${options.title ? `<title>${(_b = options.title) !== null && _b !== void 0 ? _b : ''}</title>` : ''}
        ${options.csrfToken ? `<meta name="csrf-token" content="${options.csrfToken}" />` : ''}
        ${options.title ? `<meta name="title" content="${options.title}" />` : ''}
        ${options.description ? `<meta name="description" content="${options.description}" />` : ''}
        <link rel="icon" href="${(_d = (_c = options.assets) === null || _c === void 0 ? void 0 : _c.location) !== null && _d !== void 0 ? _d : ''}favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="${(_f = (_e = options.assets) === null || _e === void 0 ? void 0 : _e.location) !== null && _f !== void 0 ? _f : ''}favicon.ico" type="image/x-icon" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${(_j = (_h = (_g = options.assets) === null || _g === void 0 ? void 0 : _g.css) === null || _h === void 0 ? void 0 : _h.map((file) => {
        var _a, _b;
        return `<link rel="stylesheet" type="text/css" href="${(_b = (_a = options.assets) === null || _a === void 0 ? void 0 : _a.location) !== null && _b !== void 0 ? _b : ''}${file}" />`;
    }).join('        \n')) !== null && _j !== void 0 ? _j : ''}
        ${(_m = (_l = (_k = options.assets) === null || _k === void 0 ? void 0 : _k.js) === null || _l === void 0 ? void 0 : _l.map((file) => {
        var _a, _b;
        return `<script nonce="${nonce}" src="${(_b = (_a = options.assets) === null || _a === void 0 ? void 0 : _a.location) !== null && _b !== void 0 ? _b : ''}${file}"></script>`;
    }).join('        \n')) !== null && _m !== void 0 ? _m : ''}
        ${(_p = (_o = options.global) === null || _o === void 0 ? void 0 : _o.map(({ variable, value }) => `<script nonce="${nonce}">window.${variable}=${JSON.stringify(value)}</script>`).join('        \n')) !== null && _p !== void 0 ? _p : ''}
    </head>
    <body>
        ${(_q = options.content) !== null && _q !== void 0 ? _q : ''}
    </body>
</html>
`;
}
function makeLayout(options) {
    var _a, _b, _c, _d;
    const nonce = (_b = (_a = options.csp) === null || _a === void 0 ? void 0 : _a.nonce) !== null && _b !== void 0 ? _b : crypto.randomUUID();
    return {
        layout: renderLayout(options, nonce),
        headers: {
            'content-security-policy': [`script-src 'nonce-${nonce}'`]
                .concat((_d = (_c = options.csp) === null || _c === void 0 ? void 0 : _c.policies.map(([type, ...schemas]) => `'${type}' ${schemas.join(' ')}`)) !== null && _d !== void 0 ? _d : [])
                .join('; '),
        },
    };
}
