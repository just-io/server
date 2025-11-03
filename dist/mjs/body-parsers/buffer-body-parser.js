import BodyParser from './body-parser';
export default class BufferBodyParser extends BodyParser {
    #createNewFileLocation;
    constructor(createNewFileLocation) {
        super();
        this.#createNewFileLocation = createNewFileLocation;
    }
    parse(request) {
        return new Promise((res, rej) => {
            const fileLocation = this.#createNewFileLocation();
            const chunks = [];
            request.on('data', (chunk) => {
                chunks.push(chunk);
                fileLocation.writeStream.write(chunk);
            });
            request.on('end', () => {
                fileLocation.writeStream.end();
                res({
                    type: 'buffer',
                    content: {
                        location: fileLocation.location,
                    },
                });
            });
            request.on('error', rej);
        });
    }
}
