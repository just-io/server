import http from 'node:http';

import { CreateFileLocation, NetRequestBody } from '../types';
import BodyParser from './body-parser';

export default class BufferBodyParser extends BodyParser {
    #createNewFileLocation: CreateFileLocation;

    constructor(createNewFileLocation: CreateFileLocation) {
        super();
        this.#createNewFileLocation = createNewFileLocation;
    }

    parse(request: http.IncomingMessage): Promise<NetRequestBody | null> {
        return new Promise((res, rej) => {
            const fileLocation = this.#createNewFileLocation();
            request.on('data', (chunk: Buffer) => {
                fileLocation.writeStream.write(chunk);
            });
            request.on('end', () => {
                fileLocation.writeStream.end(() => {
                    res({
                        type: 'buffer',
                        fileLocation,
                    });
                });
            });
            request.on('error', rej);
        });
    }
}
