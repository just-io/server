import http from 'node:http';

import { NetRequestBody } from '../types';
import BodyParser from './body-parser';
import { NetResponseError } from '../components/net-response-error';

export default class JsonBodyParser extends BodyParser {
    parse(
        request: http.IncomingMessage,
        maxContentLength?: number,
    ): Promise<NetRequestBody | null> {
        const chunks: Buffer[] = [];

        return this.readBody(
            request,
            (chunk: Buffer) => {
                chunks.push(chunk);

                return true;
            },
            maxContentLength,
        ).then(() => {
            const data = Buffer.concat(chunks);
            try {
                return {
                    type: 'json',
                    content: JSON.parse(data.toString('utf8')),
                };
            } catch {
                throw new NetResponseError(400, {
                    type: 'text',
                    content: 'Invalid application/json body',
                });
            }
        });
    }
}
