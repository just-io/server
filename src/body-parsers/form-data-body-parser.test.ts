import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { Readable, Writable } from 'node:stream';
import { FileLocation } from '../types';
import { Collector } from './form-data-body-parser';

const boundary = '--Asrf456BGe4h';

const str = `${boundary}
Content-Disposition: form-data; name="DestAddress"

brutal-vasya@example.com
${boundary}
Content-Disposition: form-data; name="DestAddress"

mad-vasya@example.com
${boundary}
Content-Disposition: form-data; name="MessageTitle"

Я негодую
${boundary}
Content-Disposition: form-data; name="MessageText"

Привет, Василий! Твой ручной лев, которого ты оставил
у меня на прошлой неделе, разодрал весь мой диван.
Пожалуйста забери его скорее!
Во вложении две фотки с последствиями.
${boundary}
Content-Disposition: form-data; name="AttachedFiles"; filename="text1.txt"
Content-Type: text/plain

${'0'.repeat(256)}
${boundary}
Content-Disposition: form-data; name="AttachedFiles"; filename="text2.txt"
Content-Type: text/plain

0987654321
${boundary}
Content-Disposition: form-data; name="TestFile"; filename="file-test.txt"
Content-Type: text/plain

HiHiHi--Asrf456B
--Asrf456B

--Asrf456B--Asrf456B
--Asrf456B
--Asrf456Bv
--Asrf456Bv--Asrf456B
${boundary}--
`;

const invalidStr = `${boundary}
Content-Disposation: form-data; name="DestAddress"

brutal-vasya@example.com
${boundary}
Content-Dispossition: form-data; name="DestAddress"

mad-vasya@example.com`;

describe('Collector', () => {
    test('collect', () => {
        const parts = str.split(/(.{32})/).filter(Boolean);

        const files: string[] = [];

        function create(): FileLocation {
            let file = Buffer.alloc(0);
            const writeStream = new Writable({
                write(chunk: Buffer, encoding, callback) {
                    file = Buffer.concat([file, chunk]);
                    callback();
                },
                final(callaback) {
                    files.push(file.toString('utf8'));
                    callaback();
                },
            });
            let offset = 0;
            const readStream = new Readable({
                read(size: number) {
                    const subarray = file.subarray(offset, size);
                    offset += size;
                    if (subarray.length) {
                        return subarray;
                    }
                    return null;
                },
            });

            return {
                location: `/temp/${files.length}`,
                writeStream,
                readStream,
                cleanup: () => Promise.resolve(),
            };
        }

        const collector = new Collector(Buffer.from(boundary), 128, create);
        parts.forEach((part) => {
            collector.collect(Buffer.from(part));
        });
        const result = collector.end();

        assert.ok(typeof result.fileLocations === 'object' && result.fileLocations !== null);
        assert.ok(result.fileLocations['/temp/0'].location === '/temp/0');
        assert.ok(result.fileLocations['/temp/1'].location === '/temp/1');
        assert.ok(result.fileLocations['/temp/2'].location === '/temp/2');

        assert.deepStrictEqual(result.formValues, {
            DestAddress: ['brutal-vasya@example.com', 'mad-vasya@example.com'],
            MessageTitle: ['Я негодую'],
            MessageText: [
                `Привет, Василий! Твой ручной лев, которого ты оставил
у меня на прошлой неделе, разодрал весь мой диван.
Пожалуйста забери его скорее!
Во вложении две фотки с последствиями.`,
            ],
            AttachedFiles: [
                {
                    filename: 'text1.txt',
                    location: '/temp/0',
                    size: 256,
                    type: 'text/plain',
                },
                {
                    filename: 'text2.txt',
                    location: '/temp/1',
                    size: 10,
                    type: 'text/plain',
                },
            ],
            TestFile: [
                {
                    filename: 'file-test.txt',
                    location: '/temp/2',
                    size: 94,
                    type: 'text/plain',
                },
            ],
        });

        assert.deepStrictEqual(files, [
            '0'.repeat(256),
            `0987654321`,
            `HiHiHi--Asrf456B
--Asrf456B

--Asrf456B--Asrf456B
--Asrf456B
--Asrf456Bv
--Asrf456Bv--Asrf456B`,
        ]);
    });

    test('collect with error', () => {
        const parts = invalidStr.split(/(.{32})/).filter(Boolean);

        const files: string[] = [];

        function create(): FileLocation {
            let file = Buffer.alloc(0);
            const writeStream = new Writable({
                write(chunk: Buffer, encoding, callback) {
                    file = Buffer.concat([file, chunk]);
                    callback();
                },
                final(callaback) {
                    files.push(file.toString('utf8'));
                    callaback();
                },
            });
            let offset = 0;
            const readStream = new Readable({
                read(size: number) {
                    const subarray = file.subarray(offset, size);
                    offset += size;
                    if (subarray.length) {
                        return subarray;
                    }
                    return null;
                },
            });

            return {
                location: `/temp/${files.length}`,
                writeStream,
                readStream,
                cleanup: () => Promise.resolve(),
            };
        }

        const collector = new Collector(Buffer.from(boundary), 128, create);
        assert.throws(() => {
            parts.forEach((part) => {
                collector.collect(Buffer.from(part));
            });
            collector.end();
        });
    });
});
