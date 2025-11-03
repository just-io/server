import http from 'node:http';
import { NetRequestBody } from '../types';
export default abstract class BodyParser {
    abstract parse(request: http.IncomingMessage): Promise<NetRequestBody | null>;
}
