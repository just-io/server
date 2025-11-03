import BodyParser from './body-parser';
import { NetResponseError } from '../net-response-error';
export default class TextBodyParser extends BodyParser {
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
                        type: 'text',
                        content: data.toString('utf8'),
                    });
                }
                catch {
                    rej(new NetResponseError(400, {
                        type: 'text',
                        content: 'Invalid text encoding body',
                    }));
                }
            });
            request.on('error', rej);
        });
    }
}
