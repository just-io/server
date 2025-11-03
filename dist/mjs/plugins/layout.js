export function renderLayout(options, nonce) {
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
        <link rel="shortcut icon" href="${options.assets?.location ?? ''}favicon.ico" type="image/x-icon" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${options.assets?.css
        ?.map((file) => `<link rel="stylesheet" type="text/css" href="${options.assets?.location ?? ''}${file}" />`)
        .join('        \n') ?? ''}
        ${options.assets?.js
        ?.map((file) => `<script nonce="${nonce}" src="${options.assets?.location ?? ''}${file}"></script>`)
        .join('        \n') ?? ''}
        ${options.global
        ?.map(({ variable, value }) => `<script nonce="${nonce}">window.${variable}=${JSON.stringify(value)}</script>`)
        .join('        \n') ?? ''}
    </head>
    <body>
        ${options.content ?? ''}
    </body>
</html>
`;
}
export function makeLayout(options) {
    const nonce = options.csp?.nonce ?? crypto.randomUUID();
    return {
        layout: renderLayout(options, nonce),
        headers: {
            'content-security-policy': [`script-src 'nonce-${nonce}'`]
                .concat(options.csp?.policies.map(([type, ...schemas]) => `'${type}' ${schemas.join(' ')}`) ?? [])
                .join('; '),
        },
    };
}
