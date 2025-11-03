import { NetResponse, NetResponseBody } from '../types';

export class NetResponseError extends Error implements NetResponse {
    status: number;

    body?: NetResponseBody;

    headers?: NetResponse['headers'];

    cookies?: NetResponse['cookies'];

    constructor(
        status: number,
        body?: NetResponseBody,
        headers?: NetResponse['headers'],
        cookies?: NetResponse['cookies'],
    ) {
        super();
        this.status = status;
        this.body = body;
        this.headers = headers;
        this.cookies = cookies;
    }
}
