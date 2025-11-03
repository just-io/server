import { NetResponse, NetResponseBody } from './types';
export declare class NetResponseError extends Error implements NetResponse {
    status: number;
    body?: NetResponseBody;
    headers?: NetResponse['headers'];
    cookies?: NetResponse['cookies'];
    constructor(status: number, body?: NetResponseBody, headers?: NetResponse['headers'], cookies?: NetResponse['cookies']);
}
