import http from 'node:http';
import { NetRequestBody } from '../types';
import BodyParser from './body-parser';
export default class UrlencodedBodyParser extends BodyParser {
    parse(request: http.IncomingMessage): Promise<NetRequestBody | null>;
}
