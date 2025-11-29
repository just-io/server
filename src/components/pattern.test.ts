import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import Pattern from './pattern';

describe('Pattern', () => {
    test('should match string', () => {
        const pattern = new Pattern('/users');
        assert.deepStrictEqual(pattern.exec('/users'), { matched: '/users', groups: {} });
    });

    test('should not match string', () => {
        const pattern = new Pattern('/users');
        assert.equal(pattern.exec('/notes'), null);
        assert.equal(pattern.exec('/notes/24'), null);
        assert.equal(pattern.exec('/users/12/notes/24'), null);
    });

    test('should match empty', () => {
        const pattern = new Pattern('');
        assert.deepStrictEqual(pattern.exec(''), { matched: '', groups: {} });
    });

    test('should not match empty', () => {
        const pattern = new Pattern('');
        assert.equal(pattern.exec('/users'), null);
        assert.equal(pattern.exec('/users/12/notes/24'), null);
    });

    test('should match with regexp', () => {
        const pattern = new Pattern('/users/*');
        assert.deepStrictEqual(pattern.exec('/users/'), { matched: '/users/', groups: {} });
        assert.deepStrictEqual(pattern.exec('/users/12/notes/24'), {
            matched: '/users/12/notes/24',
            groups: {},
        });
    });

    test('should not match with regexp', () => {
        const pattern = new Pattern('/users/*');
        assert.equal(pattern.exec('/users'), null);
        assert.equal(pattern.exec('/notes/'), null);
        assert.equal(pattern.exec('/notes/24'), null);
    });

    test('should match with one group', () => {
        const pattern = new Pattern('/users/:user-id');
        assert.deepStrictEqual(pattern.exec('/users/12'), {
            matched: '/users/12',
            groups: { 'user-id': '12' },
        });
    });

    test('should match with one group inside', () => {
        const pattern = new Pattern('/users/:user-id/notes');
        assert.deepStrictEqual(pattern.exec('/users/12/notes'), {
            matched: '/users/12/notes',
            groups: { 'user-id': '12' },
        });
    });

    test('should not match with one group inside', () => {
        const pattern = new Pattern('/users/:user-id/notes');
        assert.equal(pattern.exec('/notes/24'), null);
        assert.equal(pattern.exec('/users/12/notes/24'), null);
    });

    test('should not match with one group', () => {
        const pattern = new Pattern('/users/:user-id');
        assert.equal(pattern.exec('/users'), null);
        assert.equal(pattern.exec('/users/'), null);
        assert.equal(pattern.exec('/notes/'), null);
        assert.equal(pattern.exec('/notes/24'), null);
        assert.equal(pattern.exec('/users/12/notes'), null);
        assert.equal(pattern.exec('/users/12/notes/24'), null);
    });

    test('should match with two groups', () => {
        const pattern = new Pattern('/users/:user-id/notes/:note-id');
        assert.deepStrictEqual(pattern.exec('/users/12/notes/24'), {
            matched: '/users/12/notes/24',
            groups: { 'user-id': '12', 'note-id': '24' },
        });
    });

    test('should not match with two groups', () => {
        const pattern = new Pattern('/users/:user-id/notes/:note-id');
        assert.equal(pattern.exec('/users'), null);
        assert.equal(pattern.exec('/notes/24'), null);
        assert.equal(pattern.exec('/users/24/notes'), null);
        assert.equal(pattern.exec('/users/24/notes/'), null);
        assert.equal(pattern.exec('/users/12/notes/24/tags'), null);
    });
});
