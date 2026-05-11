import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import http from 'node:http';

import { JSONHandler, JSONBodyHandler } from './json-handler';
import { NetResponseError } from '../components/net-response-error';
import { MiddlewarelessRouter } from '../router';
import { JSONValue, NetRequest } from '../types';
import { makeLocalFileStorage } from './files';
import { Server } from '../server';

const BASE_FILE_LOCATION = './temp';

const { createFileLocation } = makeLocalFileStorage(BASE_FILE_LOCATION);

const PORT = 8442;
const ADDRESS = `http://localhost:${PORT}`;

describe('JSON handlers', () => {
    const server = new Server<unknown>(new http.Server(), {
        createFileLocation,
        makeGlobal: () => Promise.resolve(),
    });

    server.addRouter(
        '/json',
        new MiddlewarelessRouter()
            .get(
                '/:id',
                JSONHandler.make<
                    { 200: { value: number; id: string }; 400: { errors: string[] } },
                    unknown,
                    unknown,
                    '/:id'
                >({
                    reply: async (netRequest) => {
                        if (netRequest.url.searchParams.get('count') == null) {
                            return {
                                status: 400,
                                value: {
                                    errors: ['Parameter "count" is required'],
                                },
                            };
                        }
                        const count = Number(netRequest.url.searchParams.get('count'));
                        if (Number.isNaN(count)) {
                            return {
                                status: 400,
                                value: {
                                    errors: ['Parameter "count" is invalid'],
                                },
                            };
                        }
                        return {
                            status: 200,
                            value: {
                                value: count * 10,
                                id: netRequest.pathname.groups.id,
                            },
                        };
                    },
                }),
            )
            .post(
                '/:id',
                JSONBodyHandler.make<
                    { count: number },
                    { 200: { value: number; id: string }; 400: { errors: string[] } },
                    unknown,
                    unknown,
                    '/:id'
                >({
                    reply: async (value, netRequest) => {
                        return {
                            status: 200,
                            value: {
                                value: value.count * 10,
                                id: netRequest.pathname.groups.id,
                            },
                        };
                    },
                    validate: async (jsonValue) => {
                        if (
                            !jsonValue ||
                            typeof jsonValue !== 'object' ||
                            !('count' in jsonValue) ||
                            Array.isArray(jsonValue) ||
                            typeof jsonValue.count !== 'number'
                        ) {
                            throw new NetResponseError(400, {
                                type: 'json',
                                content: {
                                    errors: ['Not Acceptable'],
                                },
                            });
                        }
                        return {
                            count: jsonValue.count,
                        };
                    },
                }),
            )
            .get(
                '/class/:id',
                new (class extends JSONHandler<
                    { 200: { value: number; id: string }; 400: { errors: string[] } },
                    unknown,
                    unknown,
                    '/class/:id'
                > {
                    async reply(netRequest: NetRequest<unknown, unknown, '/class/:id'>) {
                        if (netRequest.url.searchParams.get('count') == null) {
                            return {
                                status: 400 as const,
                                value: {
                                    errors: ['Parameter "count" is required'],
                                },
                            };
                        }
                        const count = Number(netRequest.url.searchParams.get('count'));
                        if (Number.isNaN(count)) {
                            return {
                                status: 400 as const,
                                value: {
                                    errors: ['Parameter "count" is invalid'],
                                },
                            };
                        }
                        return {
                            status: 200 as const,
                            value: {
                                value: count * 10,
                                id: netRequest.pathname.groups.id,
                            },
                        };
                    }
                })(),
            )
            .post(
                '/class/:id',
                new (class extends JSONBodyHandler<
                    { count: number },
                    { 200: { value: number; id: string }; 400: { errors: string[] } },
                    unknown,
                    unknown,
                    '/class/:id'
                > {
                    async reply(
                        value: { count: number },
                        netRequest: NetRequest<unknown, unknown, '/class/:id'>,
                    ) {
                        return {
                            status: 200 as const,
                            value: {
                                value: value.count * 10,
                                id: netRequest.pathname.groups.id,
                            },
                        };
                    }

                    async validate(jsonValue: JSONValue) {
                        if (
                            !jsonValue ||
                            typeof jsonValue !== 'object' ||
                            !('count' in jsonValue) ||
                            Array.isArray(jsonValue) ||
                            typeof jsonValue.count !== 'number'
                        ) {
                            throw new NetResponseError(400, {
                                type: 'json',
                                content: {
                                    errors: ['Not Acceptable'],
                                },
                            });
                        }
                        return {
                            count: jsonValue.count,
                        };
                    }
                })(),
            ),
    );

    before(() => {
        server.listen(PORT);
    });

    describe('JSONHandler', () => {
        describe('json method', () => {
            test('should return 400 of undefined paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/id`);
                const result = await response.json();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, {
                    errors: ['Parameter "count" is required'],
                });
            });

            test('should return 400 of invalid paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/id?count=hello`);
                const result = await response.json();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, {
                    errors: ['Parameter "count" is invalid'],
                });
            });

            test('should return 200 of valid paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/id?count=10`);
                const result = await response.json();
                assert.equal(response.status, 200);
                assert.deepStrictEqual(result, {
                    value: 100,
                    id: 'id',
                });
            });
        });

        describe('json class', () => {
            test('should return 400 of undefined paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/class/id`);
                const result = await response.json();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, {
                    errors: ['Parameter "count" is required'],
                });
            });

            test('should return 400 of invalid paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/class/id?count=hello`);
                const result = await response.json();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, {
                    errors: ['Parameter "count" is invalid'],
                });
            });

            test('should return 200 of valid paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/class/id?count=10`);
                const result = await response.json();
                assert.equal(response.status, 200);
                assert.deepStrictEqual(result, {
                    value: 100,
                    id: 'id',
                });
            });
        });
    });

    describe('JSOBodyHandler', () => {
        describe('json body method', () => {
            test('should return 400 of undefined paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/id`, {
                    method: 'POST',
                    body: JSON.stringify({}),
                    headers: {
                        'content-type': 'application/json',
                    },
                });
                const result = await response.json();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, {
                    errors: ['Not Acceptable'],
                });
            });

            test('should return 400 of invalid paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/id`, {
                    method: 'POST',
                    body: JSON.stringify({ count: '10' }),
                    headers: {
                        'content-type': 'application/json',
                    },
                });
                const result = await response.json();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, {
                    errors: ['Not Acceptable'],
                });
            });

            test('should return 200 of valid paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/id`, {
                    method: 'POST',
                    body: JSON.stringify({
                        count: 10,
                    }),
                    headers: {
                        'content-type': 'application/json',
                    },
                });
                const result = await response.json();
                assert.equal(response.status, 200);
                assert.deepStrictEqual(result, {
                    value: 100,
                    id: 'id',
                });
            });
        });

        describe('json body class', () => {
            test('should return 400 of undefined paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/class/id`, {
                    method: 'POST',
                    body: JSON.stringify({}),
                    headers: {
                        'content-type': 'application/json',
                    },
                });
                const result = await response.json();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, {
                    errors: ['Not Acceptable'],
                });
            });

            test('should return 400 of invalid paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/class/id`, {
                    method: 'POST',
                    body: JSON.stringify({ count: '10' }),
                    headers: {
                        'content-type': 'application/json',
                    },
                });
                const result = await response.json();
                assert.equal(response.status, 400);
                assert.deepStrictEqual(result, {
                    errors: ['Not Acceptable'],
                });
            });

            test('should return 200 of valid paprameter', async () => {
                const response = await fetch(`${ADDRESS}/json/class/id`, {
                    method: 'POST',
                    body: JSON.stringify({
                        count: 10,
                    }),
                    headers: {
                        'content-type': 'application/json',
                    },
                });
                const result = await response.json();
                assert.equal(response.status, 200);
                assert.deepStrictEqual(result, {
                    value: 100,
                    id: 'id',
                });
            });
        });
    });

    after(() => {
        return server.close(0);
    });
});
