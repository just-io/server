@just-io/server
==============

## Introduction

A lightweight TypeScript web server framework with routing, middleware support, body parsing, JWT utilities, and file handling.

## Installation

```bash
npm install @just-io/server
```

This is a TypeScript module.

## Features

- **Routing** with pattern matching and URL parameters
- **Middleware** support for authentication and request processing
- **Body parsing** for JSON, FormData (with file uploads), text, and URL-encoded data
- **Response types**: text, JSON, file (with attachment support)
- **Rate limiting** and request timeout support
- **JWT** encoding, decoding, and verification
- **File storage** utilities

## Usage

### Basic Server Setup

```typescript
import http from 'node:http';
import { Server, MiddlewarelessRouter, makeLocalFileStorage } from '@just-io/server';

const { createFileLocation } = makeLocalFileStorage('./temp');

const server = new Server(new http.Server(), {
    createFileLocation,
    makeGlobal: () => Promise.resolve(),
});

server.addRouter(
    '/api',
    new MiddlewarelessRouter()
        .get('/hello', () => Promise.resolve({
            body: { type: 'text', content: 'Hello World' }
        }))
);

server.listen(8080);
```

### Response Types

#### Empty Response

```typescript
.get('/empty', () => Promise.resolve({}))
```

#### Text Response

```typescript
.get('/text', () => Promise.resolve({
    body: { type: 'text', content: 'Hello World' }
}))
```

#### JSON Response

```typescript
.get('/json', () => Promise.resolve({
    body: { type: 'json', content: { key: 'value' } }
}))
```

#### File Response

```typescript
.get('/file', () => Promise.resolve({
    body: {
        type: 'file',
        contentType: 'text/plain',
        content: { type: 'text', content: 'file contents' }
    }
}))
```

#### File Download (Attachment)

```typescript
.get('/download', () => Promise.resolve({
    body: {
        type: 'file',
        contentType: 'text/plain',
        content: { type: 'text', content: 'file contents' },
        attachment: { filename: 'document.txt' }
    }
}))
```

### URL Parameters

#### Search Parameters

```typescript
.get('/search', (netRequest) => {
    const params = Array.from(netRequest.url.searchParams.entries());
    return Promise.resolve({
        body: { type: 'json', content: params }
    });
})
// GET /search?param_1=1&param_2=2 -> [["param_1","1"],["param_2","2"]]
```

#### Path Parameters

```typescript
.get('/users/:id', (netRequest) => {
    const userId = netRequest.pathname.groups.id;
    return Promise.resolve({
        body: { type: 'json', content: { id: userId } }
    });
})
// GET /users/123 -> { id: "123" }
```

### Request Body Handling

#### JSON Body

```typescript
.post('/json', (netRequest) => {
    if (netRequest.body?.type !== 'json') {
        return Promise.reject(new NetResponseError(400, {
            type: 'text',
            content: 'Body should be JSON'
        }));
    }
    return Promise.resolve({
        body: { type: 'json', content: netRequest.body.content }
    });
})
```

#### FormData Body

```typescript
.post('/form', (netRequest) => {
    if (netRequest.body?.type !== 'form-data') {
        return Promise.reject(new NetResponseError(400));
    }
    return Promise.resolve({
        body: { type: 'json', content: netRequest.body.formValues }
    });
})
// FormData { first: "value", second: ["a", "b"] }
// -> { first: ["value"], second: ["a", "b"] }
```

#### FormData with Files

```typescript
.post('/upload', (netRequest) => {
    if (netRequest.body?.type !== 'form-data') {
        return Promise.reject(new NetResponseError(400));
    }
    // Files have: filename, size, type, location
    const files = Object.values(netRequest.body.formValues)
        .flat()
        .filter(v => typeof v !== 'string')
        .map(f => [f.filename, f.size, f.type]);
    return Promise.resolve({
        body: { type: 'json', content: files }
    });
})
```

### Route Options

#### Accept Content Types

```typescript
.post('/strict-json', {
    options: { acceptContentTypes: ['application/json'] },
    handle: (netRequest) => Promise.resolve({
        body: { type: 'json', content: netRequest.body.content }
    })
})
// Returns 406 Not Acceptable if content-type doesn't match
```

#### Max Content Length

```typescript
.post('/limited', {
    options: { maxContentLength: 1024 },
    handle: () => Promise.resolve({})
})
// Returns 413 Content Too Large if body exceeds limit
```

#### Rate Limiting

```typescript
.get('/rate-limited', {
    options: {
        shouldAbort: (req) => {
            // Return true to abort with 429 Too Many Requests
            return Promise.resolve(isRateLimited(req));
        }
    },
    handle: () => Promise.resolve({})
})
```

#### Request Timeout

```typescript
.get('/with-timeout', {
    options: { timeout: 5000 }, // 5 seconds
    handle: () => Promise.resolve({})
})
// Returns 504 Gateway Timeout if handler takes too long
```

### Middleware and Context

#### Router with Middleware

```typescript
import { Router, NetRequest, NetResponseError, updateContext } from '@just-io/server';

type UserContext = { id: string; token: string };

const authRouter = new Router<unknown, UserContext>(
    (netRequest: NetRequest<unknown>): Promise<NetRequest<unknown, UserContext>> => {
        const authorization = netRequest.headers.authorization;
        if (!authorization) {
            return Promise.reject(new NetResponseError(403));
        }
        const token = authorization.slice('Bearer '.length);
        try {
            const userInfo = JSON.parse(atob(token));
            return Promise.resolve(updateContext(netRequest, {
                id: userInfo.id,
                token,
            }));
        } catch {
            return Promise.reject(new NetResponseError(400, {
                type: 'text',
                content: 'Invalid authorization token'
            }));
        }
    }
);

authRouter.get('/user-info', (netRequest) => {
    return Promise.resolve({
        body: {
            type: 'json',
            content: { userId: netRequest.context.id }
        }
    });
});

server.addRouter('/auth', authRouter);
```

### Global State

```typescript
type GlobalInfo = { serverName: string };

const server = new Server<GlobalInfo>(new http.Server(), {
    createFileLocation,
    makeGlobal: () => Promise.resolve({ serverName: 'my-server' }),
});

server.addRouter(
    '/info',
    new MiddlewarelessRouter<GlobalInfo>().get('', (netRequest) => {
        return Promise.resolve({
            body: {
                type: 'json',
                content: { server: netRequest.global.serverName }
            }
        });
    })
);
```

### Request Finished Callback

```typescript
import { RequestProcessingInfo } from '@just-io/server';

const server = new Server(new http.Server(), {
    createFileLocation,
    makeGlobal: () => Promise.resolve(),
    onRequestFinished: (request, info: RequestProcessingInfo) => {
        console.log(`Request finished: ${info.finishedReason}`);
        return Promise.resolve();
    }
});
```

### JWT Utilities

```typescript
import { encode, decode, verify, check } from '@just-io/server';

const privateKey = 'your-secret-key';

// Encode
const token = encode({ userId: '24' }, privateKey);
// -> "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNCJ9...."

// Decode (without verification)
const body = decode(token);        // -> '{"userId":"24"}'
const parsed = decode(token, true); // -> { userId: '24' }

// Verify
const isValid = verify(token, privateKey); // -> true or false

// Check (verify + decode)
const result = check(token, privateKey, true);
if (result.ok) {
    console.log(result.value); // -> { userId: '24' }
} else {
    console.log(result.error); // -> 'invalid-sign'
}
```

### Pattern Matching

```typescript
import Pattern from '@just-io/server';

// Exact match
const exact = new Pattern('/users');
exact.exec('/users');     // -> { matched: '/users', groups: {} }
exact.exec('/notes');     // -> null

// Wildcard
const wildcard = new Pattern('/users/*');
wildcard.exec('/users/12/notes/24'); // -> { matched: '/users/12/notes/24', groups: {} }

// Named parameters
const params = new Pattern('/users/:user-id/notes/:note-id');
params.exec('/users/12/notes/24');
// -> { matched: '/users/12/notes/24', groups: { 'user-id': '12', 'note-id': '24' } }
```

### MIME Type Utilities

```typescript
import { getMimeTypeByFileExtension, UNKNOWN_MIME_TYPE } from '@just-io/server';

getMimeTypeByFileExtension('file.txt');  // -> 'text/plain'
getMimeTypeByFileExtension('file.js');   // -> 'text/javascript'
getMimeTypeByFileExtension('file.tar');  // -> 'application/x-tar'
getMimeTypeByFileExtension('file.xyz');  // -> UNKNOWN_MIME_TYPE
```

## Error Handling

Use `NetResponseError` to return HTTP errors with optional body:

```typescript
import { NetResponseError } from '@just-io/server';

// Simple error
throw new NetResponseError(404);

// Error with message
throw new NetResponseError(400, {
    type: 'text',
    content: 'Invalid request'
});

// Error with JSON body
throw new NetResponseError(422, {
    type: 'json',
    content: { errors: ['field is required'] }
});
```

## HTTP Status Codes

The server handles these status codes automatically:

- `200` - Success
- `400` - Bad Request (invalid JSON, etc.)
- `403` - Forbidden
- `404` - Not Found
- `406` - Not Acceptable (content type mismatch)
- `413` - Content Too Large
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `504` - Gateway Timeout

## Testing

```bash
npm test
```

## License

See LICENSE file.
