import http from 'node:http';
import BodyParser from './body-parser';
import { CreateFileLocation, FileLocation, FormValues, NetRequestBody } from '../types';
export declare class Collector {
    #private;
    constructor(boundary: Buffer, minSize: number, createNewFileLocation: CreateFileLocation);
    collect(chunk: Buffer): void;
    end(): {
        fileLocations: Record<string, FileLocation>;
        formValues: FormValues;
    };
}
export default class FormDataBodyParser extends BodyParser {
    #private;
    constructor(createNewFileLocation: CreateFileLocation);
    parse(request: http.IncomingMessage): Promise<NetRequestBody | null>;
}
