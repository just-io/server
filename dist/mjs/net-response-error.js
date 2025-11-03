export class NetResponseError extends Error {
    status;
    body;
    headers;
    cookies;
    constructor(status, body, headers, cookies) {
        super();
        this.status = status;
        this.body = body;
        this.headers = headers;
        this.cookies = cookies;
    }
}
