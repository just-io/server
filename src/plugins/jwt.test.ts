import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { decode, encode, verify, check } from './jwt';

const PRIVATE_KEY = 'private-key';

const TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNCJ9.Tn8GSpME+axL6x6Bcgw+sh72DvD/jNzsVgDGrmnMk1A=';
const INVALID_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.iyJ1c2VySWQiOiIyNCJ9.Tn8GSpME+axL6x6Bcgw+sh72DvD/jNzsVgDGrmnMk1A=';

describe('JWT', () => {
    describe('encode', () => {
        test('should return valid token with string', () => {
            const token = encode('{"userId":"24"}', PRIVATE_KEY);
            assert.equal(token, TOKEN);
            const [head, body] = token.split('.').map((value) => atob(value));
            assert.deepStrictEqual(JSON.parse(head), {
                alg: 'HS256',
                typ: 'JWT',
            });
            assert.equal(body, '{"userId":"24"}');
        });

        test('should return valid token with object', () => {
            const token = encode({ userId: '24' }, PRIVATE_KEY);
            assert.equal(token, TOKEN);
            const [head, body] = token.split('.').map((value) => atob(value));
            assert.deepStrictEqual(JSON.parse(head), {
                alg: 'HS256',
                typ: 'JWT',
            });
            assert.deepStrictEqual(JSON.parse(body), {
                userId: '24',
            });
        });
    });

    describe('decode', () => {
        test('should return string', () => {
            const body = decode(TOKEN);
            assert.equal(body, '{"userId":"24"}');
        });

        test('should return object', () => {
            const body = decode(TOKEN, true);
            assert.deepStrictEqual(body, { userId: '24' });
        });
    });

    describe('verify', () => {
        test('should return true', () => {
            const body = verify(TOKEN, PRIVATE_KEY);
            assert.equal(body, true);
        });

        test('should return false with wrong key', () => {
            const body = verify(TOKEN, 'wrong-key');
            assert.equal(body, false);
        });

        test('should return false with wrong token', () => {
            const body = verify(INVALID_TOKEN, PRIVATE_KEY);
            assert.equal(body, false);
        });
    });

    describe('check', () => {
        test('should return ok result with valid key', () => {
            const result = check(TOKEN, PRIVATE_KEY);
            assert.equal(result.ok, true);
            assert.equal(result.value, '{"userId":"24"}');
        });

        test('should return ok object result with valid key', () => {
            const result = check(TOKEN, PRIVATE_KEY, true);
            assert.equal(result.ok, true);
            assert.deepStrictEqual(result.value, { userId: '24' });
        });

        test('should return not ok result with invalid token', () => {
            const result = check(INVALID_TOKEN, PRIVATE_KEY);
            assert.equal(result.ok, false);
            assert.equal(result.error, 'invalid-sign');
        });
    });
});
