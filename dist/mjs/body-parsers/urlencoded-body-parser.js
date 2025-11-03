import BodyParser from './body-parser';
import { NetResponseError } from '../net-response-error';
export default class UrlencodedBodyParser extends BodyParser {
    parse(request) {
        return new Promise((res, rej) => {
            const chunks = [];
            request.on('data', (chunk) => {
                chunks.push(chunk);
            });
            request.on('end', () => {
                const data = Buffer.concat(chunks);
                try {
                    res({
                        type: 'urlencoded',
                        content: new URLSearchParams(data.toString('utf8')),
                    });
                }
                catch {
                    rej(new NetResponseError(400, {
                        type: 'text',
                        content: 'Invalid application/x-www-form-urlencoded body content',
                    }));
                }
            });
            request.on('error', rej);
        });
    }
}
