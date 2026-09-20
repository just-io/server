import http from 'node:http';

import { CreateFileLocation, NetRequestBody } from '../types';
import BodyParser from './body-parser';

export default class BufferBodyParser<Location> extends BodyParser<Location> {
    parse(
        request: http.IncomingMessage,
        createNewFileLocation: CreateFileLocation<Location>,
        maxContentLength?: number,
    ): Promise<NetRequestBody<Location> | null> {
        const fileLocation = createNewFileLocation();

        return this.readBody(
            request,
            (chunk: Buffer) => {
                fileLocation.writeStream.write(chunk);

                return true;
            },
            maxContentLength,
        )
            .then(() => {
                return new Promise<NetRequestBody<Location>>((res) => {
                    fileLocation.writeStream.end(() => {
                        res({
                            type: 'buffer',
                            fileLocation,
                        });
                    });
                });
            })
            .catch((error) => {
                return new Promise<NetRequestBody<Location>>((res, rej) => {
                    fileLocation.writeStream.end(() => {
                        rej(error);
                    });
                });
            });
    }
}
