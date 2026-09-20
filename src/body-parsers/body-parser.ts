import http from 'node:http';
import { CreateFileLocation, NetRequestBody } from '../types';
import { NetResponseError } from '../components/net-response-error';

export default abstract class BodyParser<Location> {
    abstract parse(
        request: http.IncomingMessage,
        createNewFileLocation: CreateFileLocation<Location>,
        maxContentLength?: number,
    ): Promise<NetRequestBody<Location> | null>;

    readBody(
        request: http.IncomingMessage,
        onChunkGot: (chunk: Buffer) => boolean,
        maxContentLength?: number,
    ): Promise<number> {
        return new Promise<number>((res, rej) => {
            let contentLength = 0;
            let settled = false;

            request.on('data', (chunk: Buffer) => {
                if (settled) {
                    return;
                }
                contentLength += chunk.length;
                if (maxContentLength !== undefined && contentLength > maxContentLength) {
                    settled = true;
                    request.pause();
                    rej(new NetResponseError(413, { type: 'text', content: 'Content Too Large' }));
                    return;
                }
                if (!onChunkGot(chunk)) {
                    request.pause();
                    settled = true;
                    res(contentLength);
                }
            });

            request.on('end', () => {
                if (!settled) {
                    settled = true;
                    res(contentLength);
                }
            });

            request.on('error', (err) => {
                if (!settled) {
                    settled = true;
                    rej(err);
                }
            });
        }).finally(() => {
            request.destroy();
        });
    }
}
