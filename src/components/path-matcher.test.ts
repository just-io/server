import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PathMatcher } from './path-matcher';

describe('PathMatcher', () => {
    describe('static method toItems', () => {
        test('should split empty path', () => {
            assert.deepEqual(PathMatcher.toItems('/'), []);
        });

        test('should split path with one item', () => {
            assert.deepEqual(PathMatcher.toItems('/api'), ['api']);
        });

        test('should split path with two item', () => {
            assert.deepEqual(PathMatcher.toItems('/api/v1'), ['api', 'v1']);
        });
    });

    describe('static method toPathItems', () => {
        test('should split empty path', () => {
            assert.deepEqual(PathMatcher.toPathItems('/'), []);
        });

        test('should split path with one constant item', () => {
            assert.deepEqual(PathMatcher.toPathItems('/api'), [
                {
                    type: 'const',
                    value: 'api',
                },
            ]);
        });

        test('should split path with one parameter item', () => {
            assert.deepEqual(PathMatcher.toPathItems('/:version'), [
                {
                    type: 'param',
                    name: 'version',
                },
            ]);
        });

        test('should split path with two item', () => {
            assert.deepEqual(PathMatcher.toPathItems('/api/:version'), [
                {
                    type: 'const',
                    value: 'api',
                },
                {
                    type: 'param',
                    name: 'version',
                },
            ]);
        });
    });

    describe('method add', () => {
        test('should add one item', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);
        });

        test('should add only one item', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty', true);
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty', true);

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);
        });
    });

    describe('method delete', () => {
        test('should delete', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);

            assert.deepEqual(pathMatcher.delete(PathMatcher.toPathItems('/'), 'empty'), true);
            assert.deepEqual(pathMatcher.delete(PathMatcher.toPathItems('/'), 'empty'), false);

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), []);
        });

        test('should delete only exact', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty', true);

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);

            assert.deepEqual(pathMatcher.delete(PathMatcher.toPathItems('/'), 'empty'), true);
            assert.deepEqual(pathMatcher.delete(PathMatcher.toPathItems('/'), 'empty'), false);

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);

            assert.deepEqual(pathMatcher.delete(PathMatcher.toPathItems('/'), 'empty', true), true);
            assert.deepEqual(
                pathMatcher.delete(PathMatcher.toPathItems('/'), 'empty', true),
                false,
            );

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), []);
        });
    });

    describe('method match', () => {
        test('should match empty path with empty path', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);
        });

        test('should match empty path without empty path', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/api')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);
        });

        test('should match exect empty path with empty path', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty', true);

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);
        });

        test('should not match exect empty path without empty path', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty', true);

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/api')), []);
        });

        test('should match only empty', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');
            pathMatcher.add(PathMatcher.toPathItems('/api'), 'api');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);
        });

        test('should match only one with same item', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty', true);

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
            ]);
        });

        test('should match two', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');
            pathMatcher.add(PathMatcher.toPathItems('/api'), 'api');
            pathMatcher.add(PathMatcher.toPathItems('/api/v1'), 'api/v1');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/api')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
                {
                    matchedCount: 1,
                    params: {},
                    value: 'api',
                },
            ]);
        });

        test('should match one with exact', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty', true);
            pathMatcher.add(PathMatcher.toPathItems('/api'), 'api');
            pathMatcher.add(PathMatcher.toPathItems('/api/v1'), 'api/v1');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/api')), [
                {
                    matchedCount: 1,
                    params: {},
                    value: 'api',
                },
            ]);
        });

        test('should match one with parameters', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');
            pathMatcher.add(PathMatcher.toPathItems('/:api'), ':api');
            pathMatcher.add(PathMatcher.toPathItems('/api/v1'), 'api/v1');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/api')), [
                {
                    matchedCount: 0,
                    params: {},
                    value: 'empty',
                },
                {
                    matchedCount: 1,
                    params: {
                        api: 'api',
                    },
                    value: ':api',
                },
            ]);
        });

        test('should match one with parameters and exact', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty', true);
            pathMatcher.add(PathMatcher.toPathItems('/:api'), ':api');
            pathMatcher.add(PathMatcher.toPathItems('/api/v1'), 'api/v1');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/api')), [
                {
                    matchedCount: 1,
                    params: {
                        api: 'api',
                    },
                    value: ':api',
                },
            ]);
        });
    });

    describe('method matchLongest', () => {
        test('should return null if not exists', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty', true);
            pathMatcher.add(PathMatcher.toPathItems('/:api'), ':api', true);
            pathMatcher.add(PathMatcher.toPathItems('/api/v1'), 'api/v1');

            assert.deepEqual(pathMatcher.matchLongest(PathMatcher.toItems('/api/v2')), null);
        });

        test('should return longest', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/'), 'empty');
            pathMatcher.add(PathMatcher.toPathItems('/:api'), ':api');
            pathMatcher.add(PathMatcher.toPathItems('/api/v1'), 'api/v1');

            assert.deepEqual(pathMatcher.matchLongest(PathMatcher.toItems('/api/v1')), {
                matchedCount: 2,
                params: {},
                value: 'api/v1',
            });
        });
    });

    describe('complex', () => {
        test('should match', () => {
            const pathMatcher = new PathMatcher<string>();
            pathMatcher.add(PathMatcher.toPathItems('/api/v1/:method'), '/api/v1/:method');
            pathMatcher.add(PathMatcher.toPathItems('/api/:ver/:method'), '/api/:ver/:method');
            pathMatcher.add(PathMatcher.toPathItems('/api/:ver/create'), '/api/:ver/create');
            pathMatcher.add(PathMatcher.toPathItems('/api/:ver/get'), '/api/:ver/get');
            pathMatcher.add(PathMatcher.toPathItems('/api/:ver'), '/api/:ver', true);
            pathMatcher.add(PathMatcher.toPathItems('/api'), '/api');

            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/api/v1/create')), [
                {
                    matchedCount: 1,
                    params: {},
                    value: '/api',
                },
                {
                    matchedCount: 3,
                    params: {
                        method: 'create',
                    },
                    value: '/api/v1/:method',
                },
                {
                    matchedCount: 3,
                    params: {
                        ver: 'v1',
                    },
                    value: '/api/:ver/create',
                },
                {
                    matchedCount: 3,
                    params: {
                        method: 'create',
                        ver: 'v1',
                    },
                    value: '/api/:ver/:method',
                },
            ]);
            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/api/v2/get')), [
                {
                    matchedCount: 1,
                    params: {},
                    value: '/api',
                },
                {
                    matchedCount: 3,
                    params: {
                        ver: 'v2',
                    },
                    value: '/api/:ver/get',
                },
                {
                    matchedCount: 3,
                    params: {
                        method: 'get',
                        ver: 'v2',
                    },
                    value: '/api/:ver/:method',
                },
            ]);
            assert.deepEqual(pathMatcher.match(PathMatcher.toItems('/api/v2')), [
                {
                    matchedCount: 1,
                    params: {},
                    value: '/api',
                },
                {
                    matchedCount: 2,
                    params: {
                        ver: 'v2',
                    },
                    value: '/api/:ver',
                },
            ]);
        });
    });
});
