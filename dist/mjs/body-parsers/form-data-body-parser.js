import BodyParser from './body-parser';
import { NetResponseError } from '../net-response-error';
class Reader {
    #position = 0;
    #chunks = [];
    #currentChunk = 0;
    #currentChunkPosition = 0;
    get size() {
        return this.#chunks.reduce((size, chunk) => size + chunk.length, 0);
    }
    get left() {
        return this.#chunks
            .slice(this.#currentChunk + 1)
            .reduce((size, chunk) => size + chunk.length, this.#chunks[this.#currentChunk].length - this.#currentChunkPosition);
    }
    addChunk(chunk) {
        this.#chunks.push(chunk);
    }
    consume() {
        while (this.#currentChunk > 0) {
            this.#currentChunk -= 1;
            this.#chunks.shift();
        }
    }
    test(length = 1) {
        const slices = [];
        let total = 0;
        let currentChunk = this.#currentChunk;
        let position = this.#currentChunkPosition;
        if (!this.#chunks[this.#currentChunk]) {
            return Buffer.alloc(0);
        }
        while (total < length) {
            const slice = this.#chunks[currentChunk].subarray(position, position + length - total);
            slices.push(slice);
            total += slice.length;
            if (slice.length + position === this.#chunks[currentChunk].length) {
                position = 0;
                currentChunk += 1;
            }
            else {
                position += slice.length;
            }
            if (!this.#chunks[currentChunk]) {
                break;
            }
        }
        return Buffer.concat(slices);
    }
    read(length = 1) {
        const slices = [];
        let total = 0;
        if (!this.#chunks[this.#currentChunk]) {
            throw new Error('Not enought');
        }
        while (total < length) {
            const slice = this.#chunks[this.#currentChunk].subarray(this.#currentChunkPosition, this.#currentChunkPosition + length - total);
            slices.push(slice);
            total += slice.length;
            if (slice.length + this.#currentChunkPosition ===
                this.#chunks[this.#currentChunk].length) {
                this.#currentChunkPosition = 0;
                this.#currentChunk += 1;
            }
            else {
                this.#currentChunkPosition += slice.length;
            }
            if (!this.#chunks[this.#currentChunk]) {
                break;
            }
        }
        this.#position += total;
        return Buffer.concat(slices);
    }
}
export class Collector {
    static #rBuffer = Buffer.from('\r');
    static #nBuffer = Buffer.from('\n');
    static #doubleDashBuffer = Buffer.from('--');
    #formValues = {};
    #fileLocations = {};
    #boundary;
    #minSize;
    #state = {
        state: 'inited',
    };
    #createNewFileLocation;
    #reader = new Reader();
    constructor(boundary, minSize, createNewFileLocation) {
        this.#boundary = boundary;
        this.#minSize = minSize;
        this.#createNewFileLocation = createNewFileLocation;
    }
    collect(chunk) {
        this.#reader.addChunk(chunk);
        this.#process();
    }
    end() {
        this.#process(true);
        return {
            fileLocations: this.#fileLocations,
            formValues: this.#formValues,
        };
    }
    #cutLastNewLineSymbols(buffer) {
        let cutSymbols = 0;
        if (Collector.#rBuffer.compare(buffer.subarray(-2, -1)) === 0) {
            cutSymbols += 1;
        }
        if (Collector.#nBuffer.compare(buffer.subarray(-1)) === 0) {
            cutSymbols += 1;
        }
        return cutSymbols ? buffer.subarray(0, -cutSymbols) : buffer;
    }
    #process(force = false) {
        this.#reader.consume();
        if (this.#reader.left < this.#minSize && !force) {
            return;
        }
        switch (this.#state.state) {
            case 'inited': {
                this.#state = {
                    state: 'reading-boundary',
                };
                return this.#process(force);
            }
            case 'reading-boundary': {
                this.#readBoundary();
                if (this.#reader.test(2).compare(Collector.#doubleDashBuffer) === 0) {
                    this.#state = {
                        state: 'finished',
                    };
                    return;
                }
                this.#state = {
                    state: 'reading-header-disposition',
                };
                break;
            }
            case 'reading-header-disposition': {
                this.#readEmpty();
                const line = this.#readLine();
                const matched = line.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i);
                if (!matched) {
                    throw new Error('Invalid header line');
                }
                const [, name, filename] = matched;
                if (filename) {
                    const fileLocation = this.#createNewFileLocation();
                    this.#state = {
                        state: 'reading-file',
                        file: {
                            type: '',
                            name,
                            size: 0,
                            filename,
                            fileLocation,
                            location: fileLocation.location,
                        },
                    };
                }
                else {
                    this.#readEmpty();
                    this.#readEmpty();
                    this.#state = {
                        state: 'reading-value',
                        value: {
                            name,
                            parts: [],
                        },
                    };
                }
                break;
            }
            case 'reading-value': {
                const value = this.#readWhileNotEnds(this.#boundary);
                if (this.#reader.left < this.#boundary.length) {
                    this.#state.value.parts.push(value);
                }
                else {
                    this.#state.value.parts.push(this.#cutLastNewLineSymbols(value));
                    if (!this.#formValues[this.#state.value.name]) {
                        this.#formValues[this.#state.value.name] = [
                            Buffer.concat(this.#state.value.parts).toString('utf8'),
                        ];
                    }
                    else {
                        this.#formValues[this.#state.value.name].push(Buffer.concat(this.#state.value.parts).toString('utf8'));
                    }
                    this.#state = {
                        state: 'reading-boundary',
                    };
                }
                break;
            }
            case 'reading-file': {
                this.#readEmpty();
                const line = this.#readLine();
                const matched = line.match(/Content-Type: (.+)/i);
                if (!matched) {
                    throw new Error('Invalid header type line');
                }
                const [, type] = matched;
                this.#state.file.type = type;
                this.#readEmpty();
                this.#readEmpty();
                const content = this.#readWhileNotEnds(this.#boundary);
                if (this.#reader.left < this.#boundary.length) {
                    this.#state.file.fileLocation.writeStream.write(content);
                    this.#state.file.size += content.length;
                }
                else {
                    const cutContent = this.#cutLastNewLineSymbols(content);
                    this.#state.file.fileLocation.writeStream.write(cutContent);
                    this.#state.file.fileLocation.writeStream.end();
                    this.#state.file.size += cutContent.length;
                    this.#fileLocations[this.#state.file.fileLocation.location] =
                        this.#state.file.fileLocation;
                    if (!this.#formValues[this.#state.file.name]) {
                        this.#formValues[this.#state.file.name] = [
                            {
                                filename: this.#state.file.filename,
                                type: this.#state.file.type,
                                size: this.#state.file.size,
                                location: this.#state.file.location,
                            },
                        ];
                    }
                    else {
                        this.#formValues[this.#state.file.name].push({
                            filename: this.#state.file.filename,
                            type: this.#state.file.type,
                            size: this.#state.file.size,
                            location: this.#state.file.location,
                        });
                    }
                    this.#state = {
                        state: 'reading-boundary',
                    };
                }
                break;
            }
        }
        return this.#process(force);
    }
    #readBoundary() {
        const boundary = this.#reader.read(this.#boundary.length);
        if (this.#boundary.compare(boundary) !== 0) {
            throw new Error('Invalid boundary reading');
        }
    }
    #readEmpty() {
        if (Collector.#rBuffer.compare(this.#reader.test()) === 0) {
            this.#reader.read();
        }
        if (Collector.#nBuffer.compare(this.#reader.test()) === 0) {
            this.#reader.read();
        }
    }
    #readWhileNotEnds(str) {
        let buffer = Buffer.alloc(0);
        while (true) {
            if (this.#reader.left <= str.length) {
                buffer = Buffer.concat([buffer, this.#reader.read()]);
                break;
            }
            const ends = this.#reader.test(str.length);
            if (ends && ends.compare(str) !== 0) {
                buffer = Buffer.concat([buffer, this.#reader.read()]);
            }
            else {
                break;
            }
        }
        return buffer;
    }
    #readLine() {
        let buffer = Buffer.alloc(0);
        while (true) {
            const symb = this.#reader.test();
            if (symb &&
                Collector.#rBuffer.compare(symb) !== 0 &&
                Collector.#nBuffer.compare(symb) !== 0) {
                buffer = Buffer.concat([buffer, this.#reader.read()]);
            }
            else {
                break;
            }
        }
        return buffer.toString('utf8');
    }
}
export default class FormDataBodyParser extends BodyParser {
    #createNewFileLocation;
    constructor(createNewFileLocation) {
        super();
        this.#createNewFileLocation = createNewFileLocation;
    }
    parse(request) {
        return new Promise((res, rej) => {
            const type = request.headers['content-type'] ?? '';
            const boundary = type.match(/boundary="?([^"]+)"?/)?.[1];
            if (!boundary) {
                return rej(new NetResponseError(400, {
                    type: 'text',
                    content: 'Invalid header value Content-type',
                }));
            }
            const collector = new Collector(Buffer.from('--' + boundary), boundary.length * 10, this.#createNewFileLocation);
            let isTrown = false;
            request.on('data', (chunk) => {
                try {
                    collector.collect(chunk);
                }
                catch {
                    if (!isTrown) {
                        rej(new NetResponseError(400, {
                            type: 'text',
                            content: 'Invalid multipart/form-data body',
                        }));
                        isTrown = true;
                    }
                }
            });
            request.on('end', () => {
                try {
                    const { formValues, fileLocations } = collector.end();
                    res({
                        type: 'form-data',
                        formValues,
                        fileLocations,
                    });
                }
                catch {
                    if (!isTrown) {
                        rej(new NetResponseError(400, {
                            type: 'text',
                            content: 'Invalid multipart/form-data body',
                        }));
                    }
                }
            });
            request.on('error', rej);
        });
    }
}
