import http from 'node:http';
import { CreateFileLocation, NetRequestBody } from '../types';
import BodyParser from './body-parser';
export default class BufferBodyParser extends BodyParser {
    #private;
    constructor(createNewFileLocation: CreateFileLocation);
    parse(request: http.IncomingMessage): Promise<NetRequestBody | null>;
}
