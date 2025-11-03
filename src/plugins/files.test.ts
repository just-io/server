import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getMimeTypeByFileExtension, UNKNOWN_MIME_TYPE } from './files';

describe('getMimeTypeByFileExtension', () => {
    test('should return right type', () => {
        assert.equal(getMimeTypeByFileExtension('file.txt'), 'text/plain');
        assert.equal(getMimeTypeByFileExtension('file.tar'), 'application/x-tar');
        assert.equal(getMimeTypeByFileExtension('file.js'), 'text/javascript');
    });

    test('should return unknown type for file without extension', () => {
        assert.equal(getMimeTypeByFileExtension('file'), UNKNOWN_MIME_TYPE);
    });

    test('should return unknown type', () => {
        assert.equal(getMimeTypeByFileExtension('file.txte'), UNKNOWN_MIME_TYPE);
    });
});
