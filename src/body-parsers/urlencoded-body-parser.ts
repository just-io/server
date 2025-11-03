import http from 'node:http';

import { NetRequestBody } from '../types';
import BodyParser from './body-parser';
import { NetResponseError } from '../components/net-response-error';

export default class UrlencodedBodyParser extends BodyParser {
    parse(request: http.IncomingMessage): Promise<NetRequestBody | null> {
        return new Promise((res, rej) => {
            const chunks: Buffer[] = [];
            request.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });
            request.on('end', () => {
                const data = Buffer.concat(chunks);
                try {
                    res({
                        type: 'urlencoded',
                        content: new URLSearchParams(data.toString('utf8')),
                    });
                } catch {
                    rej(
                        new NetResponseError(400, {
                            type: 'text',
                            content: 'Invalid application/x-www-form-urlencoded body content',
                        }),
                    );
                }
            });
            request.on('error', rej);
        });
    }
}
