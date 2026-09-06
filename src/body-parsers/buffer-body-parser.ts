import http from 'node:http';

import { CreateFileLocation, NetRequestBody } from '../types';
import BodyParser from './body-parser';

export default class BufferBodyParser extends BodyParser {
    #createNewFileLocation: CreateFileLocation;

    constructor(createNewFileLocation: CreateFileLocation) {
        super();
        this.#createNewFileLocation = createNewFileLocation;
    }

    parse(
        request: http.IncomingMessage,
        maxContentLength?: number,
    ): Promise<NetRequestBody | null> {
        const fileLocation = this.#createNewFileLocation();

        return this.readBody(
            request,
            (chunk: Buffer) => {
                fileLocation.writeStream.write(chunk);

                return true;
            },
            maxContentLength,
        ).then(
            () =>
                new Promise((res) => {
                    fileLocation.writeStream.end(() => {
                        res({
                            type: 'buffer',
                            fileLocation,
                        });
                    });
                }),
        );
    }
}
