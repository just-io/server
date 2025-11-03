import BodyParser from './body-parser';
import { NetResponseError } from '../net-response-error';
export default class JsonBodyParser extends BodyParser {
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
                        type: 'json',
                        content: JSON.parse(data.toString('utf8')),
                    });
                }
                catch {
                    rej(new NetResponseError(400, {
                        type: 'text',
                        content: 'Invalid application/json body',
                    }));
                }
            });
            request.on('error', rej);
        });
    }
}
