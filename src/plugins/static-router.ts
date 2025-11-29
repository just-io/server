import fs from 'node:fs';
import path from 'node:path';
import { Middleware, RequestOptions, Router } from '../router';
import { NetResponse } from '../types';
import { getMimeTypeByFileExtension } from './files';
import { NetResponseError } from '../components/net-response-error';

export default class StaticRouter<Global, Context = Record<string, unknown>> extends Router<
    Global,
    Context
> {
    private fullPathToFolder: string;

    constructor(
        pathToFolder: string,
        middleware: Middleware<Global, Context>,
        defaultOptions?: RequestOptions,
    ) {
        super(middleware, defaultOptions);
        this.fullPathToFolder = path.join(pathToFolder);

        this.addHandler('GET', ':filename', (request): Promise<NetResponse> => {
            const filename = request.pathname.handler;

            const location = path.join(this.fullPathToFolder, filename);

            if (!location.startsWith(this.fullPathToFolder)) {
                return Promise.reject(
                    new NetResponseError(403, { type: 'text', content: 'Forbidden' }),
                );
            }

            if (!fs.existsSync(location)) {
                return Promise.reject(
                    new NetResponseError(404, { type: 'text', content: 'Not Found' }),
                );
            }

            return Promise.resolve({
                status: 200,
                body: {
                    type: 'file',
                    contentType: getMimeTypeByFileExtension(filename),
                    content: {
                        type: 'stream',
                        stream: fs.createReadStream(location),
                        length: fs.statSync(location).size,
                    },
                },
            });
        });
    }
}
