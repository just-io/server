import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import http from 'node:http';

import {
    Server,
    NetRequest,
    MiddlewarelessRouter,
    Router,
    NetResponseError,
    updateContext,
    makeLocalFileStorage,
    RequestProcessingInfo,
} from './index';

const BASE_FILE_LOCATION = './temp';

const { createFileLocation } = makeLocalFileStorage(BASE_FILE_LOCATION);

const PORT = 8443;
const ADDRESS = `http://localhost:${PORT}`;

type UserContext = {
    id: string;
    token: string;
};

describe('Server API', () => {
    const requestCount: Record<string, number> = {};
    const server = new Server<unknown>(new http.Server(), {
        createFileLocation,
        makeGlobal: () => Promise.resolve(),
    });
    server
        .addRouter(
            '/found',
            new MiddlewarelessRouter().get('', () => {
                return Promise.resolve({});
            }),
        )
        .addRouter(
            '/common-router',
            new MiddlewarelessRouter()
                .get('/path-with-empty', () => {
                    return Promise.resolve({});
                })
                .get('/path-with-text', () => {
                    return Promise.resolve({
                        body: {
                            type: 'text',
                            content: 'Text',
                        },
                    });
                })
                .get('/path-with-json', () => {
                    return Promise.resolve({
                        body: {
                            type: 'json',
                            content: { key: 'value' },
                        },
                    });
                })
                .get('/path-with-file', () => {
                    return Promise.resolve({
                        body: {
                            type: 'file',
                            contentType: 'text/plain',
                            content: {
                                type: 'text',
                                content: '0123456789',
                            },
                        },
                    });
                })
                .get('/path-with-file-attachment', () => {
                    return Promise.resolve({
                        body: {
                            type: 'file',
                            contentType: 'text/plain',
                            content: {
                                type: 'text',
                                content: '0123456789',
                            },
                            attachment: {
                                filename: 'text.txt',
                            },
                        },
                    });
                })
                .get('/path-with-search-params', (netRequest) => {
                    return Promise.resolve({
                        body: {
                            type: 'json',
                            content: Array.from(netRequest.url.searchParams.entries()),
                        },
                    });
                })
                .get('/path-with-query-params/:id', (netRequest) => {
                    return Promise.resolve({
                        body: {
                            type: 'json',
                            content: { id: netRequest.pathname.groups.id },
                        },
                    });
                })
                .get('/path-with-rate-limiter', {
                    options: {
                        shouldAbort: (req) => {
                            if ((requestCount[req.headers.authorization ?? ''] ?? 0) > 1) {
                                return Promise.resolve(true);
                            }
                            requestCount[req.headers.authorization ?? ''] =
                                (requestCount[req.headers.authorization ?? ''] ?? 0) + 1;
                            return Promise.resolve(false);
                        },
                    },
                    handle: (netRequest) => {
                        return new Promise((res) =>
                            setTimeout(() => {
                                requestCount[netRequest.headers.authorization ?? ''] -= 1;
                                res({});
                            }, 100),
                        );
                    },
                })
                .get('/path-with-timeout', {
                    options: {
                        timeout: 10,
                    },
                    handle: (netRequest) => {
                        return new Promise((res) =>
                            setTimeout(
                                () => {
                                    res({});
                                },
                                parseInt(netRequest.url.searchParams.get('timeout') ?? '0') ?? 0,
                            ),
                        );
                    },
                })
                .get('/path-with-long-response', {
                    handle: () => {
                        return new Promise((res) =>
                            setTimeout(() => {
                                res({});
                            }, 1000),
                        );
                    },
                })
                .get('/path-with-error', {
                    handle: () => {
                        return Promise.reject(new Error());
                    },
                }),
        )
        .addRouter(
            '/context-router',
            new Router<unknown, UserContext>(
                (netRequest: NetRequest<unknown>): Promise<NetRequest<unknown, UserContext>> => {
                    const authorization = netRequest.headers.authorization;
                    if (!authorization) {
                        return Promise.reject(new NetResponseError(403));
                    }
                    const token = authorization.slice('Bearer '.length);
                    try {
                        const userInfo = atob(token).split('.');
                        return Promise.resolve(
                            updateContext(netRequest, {
                                id: userInfo[0],
                                token,
                            }),
                        );
                    } catch {
                        return Promise.reject(
                            new NetResponseError(400, {
                                type: 'text',
                                content: 'Invalid authorization token',
                            }),
                        );
                    }
                },
            ).get('/user-info', (netRequest) => {
                return Promise.resolve({
                    body: {
                        type: 'json',
                        content: {
                            userId: netRequest.context.id,
                        },
                    },
                });
            }),
        )
        .addRouter(
            '/body-router',
            new MiddlewarelessRouter()
                .post('/path-with-json', (netRequest) => {
                    if (netRequest.body?.type !== 'json') {
                        return Promise.reject(
                            new NetResponseError(400, {
                                type: 'text',
                                content: 'Body should be JSON',
                            }),
                        );
                    }
                    return Promise.resolve({
                        body: {
                            type: 'json',
                            content: netRequest.body.content,
                        },
                    });
                })
                .post('/path-with-form-data', (netRequest) => {
                    if (netRequest.body?.type !== 'form-data') {
                        return Promise.reject(
                            new NetResponseError(400, {
                                type: 'text',
                                content: 'Body should be FormData',
                            }),
                        );
                    }
                    return Promise.resolve({
                        body: {
                            type: 'json',
                            content: netRequest.body.formValues,
                        },
                    });
                })
                .post('/path-with-form-data-with-file', (netRequest) => {
                    if (netRequest.body?.type !== 'form-data') {
                        return Promise.reject(
                            new NetResponseError(400, {
                                type: 'text',
                                content: 'Body should be FormData',
                            }),
                        );
                    }

                    const files = Object.values(netRequest.body.formValues)
                        .map((values) => {
                            return values;
                        })
                        .flat()
                        .map((value) =>
                            typeof value === 'string'
                                ? null
                                : [value.filename, value.size, value.type],
                        )
                        .filter(Boolean);

                    return Promise.resolve({
                        body: {
                            type: 'json',
                            content: files,
                        },
                    });
                })
                .post('/path-with-accept-content-types', {
                    options: {
                        acceptContentTypes: ['application/json'],
                    },
                    handle: (netRequest) => {
                        if (netRequest.body?.type !== 'json') {
                            return Promise.reject(
                                new NetResponseError(400, {
                                    type: 'text',
                                    content: 'Body should be JSON',
                                }),
                            );
                        }
                        return Promise.resolve({
                            body: {
                                type: 'json',
                                content: netRequest.body.content,
                            },
                        });
                    },
                })
                .post('/path-with-max-content-length', {
                    options: {
                        maxContentLength: 10,
                    },
                    handle: () => {
                        return Promise.resolve({
                            body: {
                                type: 'json',
                                content: {},
                            },
                        });
                    },
                }),
        );

    before(() => {
        server.listen(PORT);
    });

    describe('Common', () => {
        test('should response 404 on not found url', async () => {
            const response = await fetch(`${ADDRESS}/not-found`);
            const result = await response.text();
            assert.equal(response.status, 404);
            assert.equal(result, 'Not Found');
        });

        test('should response 200 on valid', async () => {
            const response = await fetch(`${ADDRESS}/found`);
            const result = await response.text();
            assert.equal(response.status, 200);
            assert.equal(result, '');
        });

        test('should response 200 on valid url with empty body', async () => {
            const response = await fetch(`${ADDRESS}/common-router/path-with-empty`);
            const result = await response.text();
            assert.equal(response.status, 200);
            assert.equal(result, '');
        });

        test('should response 200 on valid url with text body', async () => {
            const response = await fetch(`${ADDRESS}/common-router/path-with-text`);
            const result = await response.text();
            assert.equal(response.status, 200);
            assert.equal(result, 'Text');
        });

        test('should response 200 on valid url with json body', async () => {
            const response = await fetch(`${ADDRESS}/common-router/path-with-json`);
            const result = await response.json();
            assert.equal(response.status, 200);
            assert.deepStrictEqual(result, { key: 'value' });
        });

        test('should response 200 on valid url with file body', async () => {
            const response = await fetch(`${ADDRESS}/common-router/path-with-file`);
            const result = await response.blob();
            const file = await result.text();
            assert.equal(response.status, 200);
            assert.deepStrictEqual(file, '0123456789');
        });

        test('should response 200 on valid url with file body attachment', async () => {
            const response = await fetch(`${ADDRESS}/common-router/path-with-file-attachment`);
            const result = await response.blob();
            const file = await result.text();
            assert.equal(response.status, 200);
            assert.equal(
                response.headers.get('content-disposition'),
                'attachment; filename=text.txt',
            );
            assert.deepStrictEqual(file, '0123456789');
        });

        test('should response 200 on valid url with search params', async () => {
            const response = await fetch(
                `${ADDRESS}/common-router/path-with-search-params?param_1=1&param_2=2&param_2=3`,
            );
            const result = await response.json();
            assert.equal(response.status, 200);
            assert.deepStrictEqual(result, [
                ['param_1', '1'],
                ['param_2', '2'],
                ['param_2', '3'],
            ]);
        });

        test('should response 200 on valid url with query params', async () => {
            const response = await fetch(`${ADDRESS}/common-router/path-with-query-params/id`);
            const result = await response.json();
            assert.equal(response.status, 200);
            assert.deepStrictEqual(result, { id: 'id' });
        });

        test('should response 500 on server error', async () => {
            const response = await fetch(`${ADDRESS}/common-router/path-with-error`);
            assert.equal(response.status, 500);
        });

        describe('with rate limiter', () => {
            test('should response 200 on less than 2 requests', async () => {
                const responses = await Promise.all([
                    fetch(`${ADDRESS}/common-router/path-with-rate-limiter`, {
                        headers: {
                            authorization: 'less-2',
                        },
                    }),
                    fetch(`${ADDRESS}/common-router/path-with-rate-limiter`, {
                        headers: {
                            authorization: 'less-2',
                        },
                    }),
                ]);
                assert.equal(
                    responses.every((response) => response.status === 200),
                    true,
                );
            });

            test('should response 200 on less than 2 requests and one 429', async () => {
                const responses = await Promise.all([
                    fetch(`${ADDRESS}/common-router/path-with-rate-limiter`, {
                        headers: {
                            authorization: 'more-2',
                        },
                    }),
                    fetch(`${ADDRESS}/common-router/path-with-rate-limiter`, {
                        headers: {
                            authorization: 'more-2',
                        },
                    }),
                    fetch(`${ADDRESS}/common-router/path-with-rate-limiter`, {
                        headers: {
                            authorization: 'more-2',
                        },
                    }),
                ]);
                assert.equal(
                    responses.some((response) => response.status === 429),
                    true,
                );
                assert.equal(
                    responses.findIndex((response) => response.status === 200) !==
                        responses.findLastIndex((response) => response.status === 200),
                    true,
                );
            });
        });

        describe('with timeout', () => {
            test('should response 200', async () => {
                const response = await fetch(
                    `${ADDRESS}/common-router/path-with-timeout?timeout=1`,
                );
                assert.equal(response.status, 200);
            });

            test('should response 429 on timeout', async () => {
                const response = await fetch(
                    `${ADDRESS}/common-router/path-with-timeout?timeout=11`,
                );
                const result = await response.text();
                assert.equal(response.status, 504);
                assert.deepStrictEqual(result, 'Gateway Timeout');
            });
        });

        describe('with long response', () => {
            test('should be aborted', async () => {
                const abortController = new AbortController();
                setTimeout(() => abortController.abort(), 0);
                await assert.rejects(
                    fetch(`${ADDRESS}/common-router/path-with-long-response?timeout=1`, {
                        signal: abortController.signal,
                    }),
                );
            });
        });
    });

    describe('with context', () => {
        test('should response 200 on valid url with right headers', async () => {
            const response = await fetch(`${ADDRESS}/context-router/user-info`, {
                headers: {
                    authorization: `Bearer ${btoa('24.user')}`,
                },
            });
            const result = await response.json();
            assert.equal(response.status, 200);
            assert.deepStrictEqual(result, { userId: '24' });
        });

        test('should response 403 on valid url without headers', async () => {
            const response = await fetch(`${ADDRESS}/context-router/user-info`);
            assert.equal(response.status, 403);
        });

        test('should response 400 on valid url without headers', async () => {
            const response = await fetch(`${ADDRESS}/context-router/user-info`, {
                headers: {
                    authorization: `Bearer ${'24.user'}`,
                },
            });
            const result = await response.text();
            assert.equal(response.status, 400);
            assert.deepStrictEqual(result, 'Invalid authorization token');
        });
    });

    describe('with body', () => {
        describe('with JSON', () => {
            test('should response 200 on valid JSON', async () => {
                const response = await fetch(`${ADDRESS}/body-router/path-with-json`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: '{"json": "json"}',
                });
                const result = await response.json();
                assert.equal(response.status, 200);
                assert.deepStrictEqual(result, { json: 'json' });
            });

            test('should response 400 on invalid JSON', async () => {
                const response = await fetch(`${ADDRESS}/body-router/path-with-json`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: '{"json": json"}',
                });
                const result = await response.text();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, 'Invalid application/json body');
            });

            test('should response 400 on invalid type', async () => {
                const response = await fetch(`${ADDRESS}/body-router/path-with-json`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/js',
                    },
                    body: '{"json": json"}',
                });
                const result = await response.text();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, 'Body should be JSON');
            });
        });

        describe('with FormData', () => {
            test('should response 200 on valid FormData', async () => {
                const formData = new FormData();
                formData.append('first', 'value');
                formData.append('second', 'value');
                formData.append('second', 'value');
                const response = await fetch(`${ADDRESS}/body-router/path-with-form-data`, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                assert.equal(response.status, 200);
                assert.deepStrictEqual(result, { first: ['value'], second: ['value', 'value'] });
            });

            test('should response 400 on invalid type', async () => {
                const response = await fetch(`${ADDRESS}/body-router/path-with-form-data`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/js',
                    },
                    body: '{"json": json"}',
                });
                const result = await response.text();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, 'Body should be FormData');
            });
        });

        describe('with FormData with Files', () => {
            test('should response 200 on valid FormData', async () => {
                const formData = new FormData();
                formData.append('first', 'value');
                formData.append('second', 'value');
                formData.append('second', 'value');
                formData.append(
                    'file',
                    new File(['0123456789'], 'text.txt', { type: 'text/plain' }),
                );
                const response = await fetch(
                    `${ADDRESS}/body-router/path-with-form-data-with-file`,
                    {
                        method: 'POST',
                        body: formData,
                    },
                );
                const result = await response.json();
                assert.equal(response.status, 200);
                assert.deepStrictEqual(result, [['text.txt', 10, 'text/plain']]);
            });
        });

        describe('with accept content types', () => {
            test('should response 200 on content type application/json', async () => {
                const response = await fetch(
                    `${ADDRESS}/body-router/path-with-accept-content-types`,
                    {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: '{"json": "json"}',
                    },
                );
                const result = await response.json();
                assert.equal(response.status, 200);
                assert.deepStrictEqual(result, { json: 'json' });
            });

            test('should response 406 on content type application/json', async () => {
                const formData = new FormData();
                formData.append('first', 'value');
                formData.append('second', 'value');
                formData.append('second', 'value');
                const response = await fetch(
                    `${ADDRESS}/body-router/path-with-accept-content-types`,
                    {
                        method: 'POST',
                        body: formData,
                    },
                );
                const result = await response.text();
                assert.equal(response.status, 406);
                assert.deepStrictEqual(result, 'Not Acceptable');
            });
        });

        describe('with with max content length', () => {
            test('should response 200 on content length less than 10', async () => {
                const response = await fetch(
                    `${ADDRESS}/body-router/path-with-max-content-length`,
                    {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: '{"j": "j"}',
                    },
                );
                const result = await response.json();
                assert.equal(response.status, 200);
                assert.deepStrictEqual(result, {});
            });

            test('should response 413 on content length more or equal than 10', async () => {
                const response = await fetch(
                    `${ADDRESS}/body-router/path-with-max-content-length`,
                    {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: '{"json": "json"}',
                    },
                );
                const result = await response.text();
                assert.equal(response.status, 413);
                assert.deepStrictEqual(result, 'Content Too Large');
            });
        });
    });

    after(() => {
        return server.close(0);
    });
});

type Info = {
    serverName: string;
};

type ContextInfo = {
    info: string;
};

describe('Server inside', () => {
    test('should make Global', async () => {
        const server = new Server<Info>(new http.Server(), {
            createFileLocation,
            makeGlobal: () =>
                Promise.resolve({
                    serverName: 'localhost',
                }),
        }).addRouter(
            '/global',
            new MiddlewarelessRouter<Info>().get('', async (netRequest) => {
                assert.deepStrictEqual(netRequest.global, { serverName: 'localhost' });
                return {};
            }),
        );

        server.listen(PORT + 1);

        const response = await fetch(`http://localhost:${PORT + 1}/global`);
        const result = await response.text();
        assert.equal(response.status, 200);
        assert.equal(result, '');

        return server.close(0);
    });

    test('should make Context', async () => {
        const server = new Server<unknown>(new http.Server(), {
            createFileLocation,
            makeGlobal: () => Promise.resolve(),
        }).addRouter(
            '/context',
            new Router<unknown, ContextInfo>((netRequest) =>
                Promise.resolve(updateContext(netRequest, { info: 'test' })),
            ).get('', async (netRequest) => {
                assert.deepStrictEqual(netRequest.context, { info: 'test' });
                return {};
            }),
        );

        server.listen(PORT + 2);

        const response = await fetch(`http://localhost:${PORT + 2}/context`);
        const result = await response.text();
        assert.equal(response.status, 200);
        assert.equal(result, '');

        return server.close(0);
    });

    test('should call Context', async () => {
        let calls = 0;
        function onRequestFinished(
            request: http.IncomingMessage,
            requestProcessingInfo: RequestProcessingInfo,
        ): Promise<void> {
            calls += 1;
            assert.equal(requestProcessingInfo.finishedReason, 'handled');
            return Promise.resolve();
        }

        const server = new Server<unknown>(new http.Server(), {
            createFileLocation,
            onRequestFinished,
            makeGlobal: () => Promise.resolve(),
        }).addRouter(
            '/finish',
            new Router<unknown, ContextInfo>((netRequest) =>
                Promise.resolve(updateContext(netRequest, { info: 'test' })),
            ).get('', async (netRequest) => {
                assert.deepStrictEqual(netRequest.context, { info: 'test' });
                return {};
            }),
        );

        server.listen(PORT + 3);

        const response = await fetch(`http://localhost:${PORT + 3}/finish`);
        const result = await response.text();
        assert.equal(response.status, 200);
        assert.equal(result, '');
        assert.equal(calls, 1);

        return server.close(0);
    });
});
