import http from 'node:http';

import { CreateFileLocation, NetRequestBody } from '../types';
import BodyParser from './body-parser';
import { NetResponseError } from '../components/net-response-error';

export default class UrlencodedBodyParser<Location> extends BodyParser<Location> {
    parse(
        request: http.IncomingMessage,
        createNewFileLocation: CreateFileLocation<Location>,
        maxContentLength?: number,
    ): Promise<NetRequestBody<Location> | null> {
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
                    type: 'urlencoded',
                    content: new URLSearchParams(data.toString('utf8')),
                };
            } catch {
                throw new NetResponseError(400, {
                    type: 'text',
                    content: 'Invalid application/x-www-form-urlencoded body content',
                });
            }
        });
    }
}
