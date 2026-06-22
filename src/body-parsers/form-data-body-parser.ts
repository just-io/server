import http from 'node:http';

import BodyParser from './body-parser';
import { NetResponseError } from '../components/net-response-error';
import { CreateFileLocation, FileData, FileLocation, FormValues, NetRequestBody } from '../types';

class Reader {
    #position = 0;

    #chunks: Buffer[] = [];

    #currentChunk = 0;

    #currentChunkPosition = 0;

    get size(): number {
        return this.#chunks.reduce((size, chunk) => size + chunk.length, 0);
    }

    get left(): number {
        if (!this.#chunks[this.#currentChunk]) {
            return 0;
        }
        return this.#chunks
            .slice(this.#currentChunk + 1)
            .reduce(
                (size, chunk) => size + chunk.length,
                this.#chunks[this.#currentChunk].length - this.#currentChunkPosition,
            );
    }

    addChunk(chunk: Buffer): void {
        this.#chunks.push(chunk);
    }

    consume(): void {
        while (this.#currentChunk > 0) {
            this.#currentChunk -= 1;
            this.#chunks.shift();
        }
    }

    test(length = 1, offset = 0): Buffer {
        const slices: Buffer[] = [];
        let total = 0;
        let currentChunk = this.#currentChunk;
        let position = this.#currentChunkPosition;
        if (!this.#chunks[this.#currentChunk]) {
            return Buffer.alloc(0);
        }
        for (let i = 0; i < offset; i++) {
            if (position + 1 === this.#chunks[currentChunk].length) {
                position = 0;
                currentChunk += 1;
            } else {
                position += 1;
            }
            if (!this.#chunks[currentChunk]) {
                return Buffer.alloc(0);
            }
        }
        while (total < length) {
            const slice = this.#chunks[currentChunk].subarray(position, position + length - total);
            slices.push(slice);
            total += slice.length;
            if (slice.length + position === this.#chunks[currentChunk].length) {
                position = 0;
                currentChunk += 1;
            } else {
                position += slice.length;
            }
            if (!this.#chunks[currentChunk]) {
                break;
            }
        }
        return Buffer.concat(slices);
    }

    findOffset(buffer: Buffer): number {
        let slice: Buffer = Buffer.alloc(0);
        let currentChunk = this.#currentChunk;
        let position = this.#currentChunkPosition;
        let offset = 0;
        while (this.#chunks[currentChunk]) {
            const s = this.#chunks[currentChunk].subarray(position, position + 1);
            if (slice.length < buffer.length) {
                slice = Buffer.concat([slice, s]);
            } else {
                slice = Buffer.concat([slice.subarray(1), s]);
            }
            if (1 + position === this.#chunks[currentChunk].length) {
                position = 0;
                currentChunk += 1;
            } else {
                position += 1;
            }
            offset += 1;
            if (Buffer.compare(slice, buffer) === 0) {
                return offset - buffer.length;
            }
        }
        return -1;
    }

    read(length = 1): Buffer {
        const slices: Buffer[] = [];
        let total = 0;
        if (!this.#chunks[this.#currentChunk]) {
            throw new Error('Not enought');
        }
        while (total < length) {
            const slice = this.#chunks[this.#currentChunk].subarray(
                this.#currentChunkPosition,
                this.#currentChunkPosition + length - total,
            );
            slices.push(slice);
            total += slice.length;
            if (
                slice.length + this.#currentChunkPosition ===
                this.#chunks[this.#currentChunk].length
            ) {
                this.#currentChunkPosition = 0;
                this.#currentChunk += 1;
            } else {
                this.#currentChunkPosition += slice.length;
            }
            if (!this.#chunks[this.#currentChunk]) {
                break;
            }
        }
        this.#position += total;

        return Buffer.concat(slices);
    }

    readRest(): Buffer {
        const slices: Buffer[] = [];
        let total = 0;
        while (this.#chunks[this.#currentChunk]) {
            const slice = this.#chunks[this.#currentChunk].subarray(this.#currentChunkPosition);
            slices.push(slice);
            total += slice.length;
            this.#currentChunkPosition = 0;
            this.#currentChunk += 1;
        }
        this.#position += total;

        return Buffer.concat(slices);
    }
}

type CollectorState =
    | {
          state: 'inited';
      }
    | {
          state: 'reading-boundary';
      }
    | {
          state: 'reading-header-disposition';
      }
    | {
          state: 'reading-value';
          value: ValueInfo;
      }
    | {
          state: 'reading-file-header';
          file: FileInfo;
      }
    | {
          state: 'reading-file-content';
          file: FileInfo;
      }
    | {
          state: 'finished';
      };

interface ValueInfo {
    name: string;
    parts: Buffer[];
}

interface FileInfo extends FileData {
    name: string;
    fileLocation: FileLocation;
}

export class Collector {
    static #rBuffer = Buffer.from('\r');

    static #nBuffer = Buffer.from('\n');

    static #doubleDashBuffer = Buffer.from('--');

    #formValues: FormValues = {};

    #fileLocations: Record<string, FileLocation> = {};

    #boundary: Buffer;

    #minSize: number;

    #state: CollectorState = {
        state: 'inited',
    };

    #createNewFileLocation: CreateFileLocation;

    #reader: Reader = new Reader();

    constructor(boundary: Buffer, minSize: number, createNewFileLocation: CreateFileLocation) {
        this.#boundary = boundary;
        this.#minSize = minSize;
        this.#createNewFileLocation = createNewFileLocation;
    }

    collect(chunk: Buffer): void {
        this.#reader.addChunk(chunk);
        this.#process();
    }

    end(): Promise<{ fileLocations: Record<string, FileLocation>; formValues: FormValues }> {
        this.#process(true);

        return Promise.all(
            Object.values(this.#fileLocations).map(
                (fileLocation) =>
                    new Promise<void>((resolve) => fileLocation.writeStream.end(resolve)),
            ),
        ).then(() => {
            return {
                fileLocations: this.#fileLocations,
                formValues: this.#formValues,
            };
        });
    }

    #cutLastNewLineSymbols(buffer: Buffer): Buffer {
        let cutSymbols = 0;
        if (Collector.#rBuffer.compare(buffer.subarray(-2, -1)) === 0) {
            cutSymbols += 1;
        }
        if (Collector.#nBuffer.compare(buffer.subarray(-1)) === 0) {
            cutSymbols += 1;
        }
        return cutSymbols ? buffer.subarray(0, -cutSymbols) : buffer;
    }

    #process(force: boolean = false): void {
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
                const matched = line.match(
                    /Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i,
                );
                if (!matched) {
                    throw new Error('Invalid header line');
                }
                const [, name, filename] = matched;
                if (filename) {
                    const fileLocation = this.#createNewFileLocation();
                    this.#state = {
                        state: 'reading-file-header',
                        file: {
                            type: '',
                            name,
                            size: 0,
                            filename,
                            fileLocation,
                            location: fileLocation.location,
                        },
                    };
                } else {
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
                } else {
                    this.#state.value.parts.push(this.#cutLastNewLineSymbols(value));
                    if (!this.#formValues[this.#state.value.name]) {
                        this.#formValues[this.#state.value.name] = [
                            Buffer.concat(this.#state.value.parts).toString('utf8'),
                        ];
                    } else {
                        this.#formValues[this.#state.value.name].push(
                            Buffer.concat(this.#state.value.parts).toString('utf8'),
                        );
                    }
                    this.#state = {
                        state: 'reading-boundary',
                    };
                }
                break;
            }
            case 'reading-file-header': {
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
                this.#state = {
                    state: 'reading-file-content',
                    file: this.#state.file,
                };
                break;
            }
            case 'reading-file-content': {
                const content = this.#readWhileNotEnds(this.#boundary);
                if (this.#reader.left < this.#boundary.length) {
                    this.#state.file.fileLocation.writeStream.write(content);
                    this.#state.file.size += content.length;
                } else {
                    const cutContent = this.#cutLastNewLineSymbols(content);
                    this.#state.file.fileLocation.writeStream.write(cutContent);
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
                    } else {
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
            case 'finished': {
                return;
            }
        }
        return this.#process(force);
    }

    #readBoundary(): void {
        const boundary = this.#reader.read(this.#boundary.length);
        if (this.#boundary.compare(boundary) !== 0) {
            throw new Error('Invalid boundary reading');
        }
    }

    #readEmpty(): void {
        if (Collector.#rBuffer.compare(this.#reader.test()) === 0) {
            this.#reader.read();
        }
        if (Collector.#nBuffer.compare(this.#reader.test()) === 0) {
            this.#reader.read();
        }
    }

    #readWhileNotEnds(str: Buffer): Buffer {
        const offset = this.#reader.findOffset(str);
        if (offset === -1) {
            return this.#reader.readRest();
        }
        return this.#reader.read(offset);
    }

    #readLine(): string {
        const buffers: Buffer[] = [];
        while (true) {
            const symb = this.#reader.test();
            if (
                symb.length &&
                Collector.#rBuffer.compare(symb) !== 0 &&
                Collector.#nBuffer.compare(symb) !== 0
            ) {
                buffers.push(this.#reader.read());
            } else {
                break;
            }
        }
        return Buffer.concat(buffers).toString('utf8');
    }
}

export default class FormDataBodyParser extends BodyParser {
    #createNewFileLocation: CreateFileLocation;

    constructor(createNewFileLocation: CreateFileLocation) {
        super();
        this.#createNewFileLocation = createNewFileLocation;
    }

    parse(request: http.IncomingMessage): Promise<NetRequestBody | null> {
        return new Promise((res, rej) => {
            const type = request.headers['content-type'] ?? '';
            const boundary = type.match(/boundary="?([^"]+)"?/)?.[1];
            if (!boundary) {
                return rej(
                    new NetResponseError(400, {
                        type: 'text',
                        content: 'Invalid header value Content-type',
                    }),
                );
            }
            const collector = new Collector(
                Buffer.from('--' + boundary),
                boundary.length * 10,
                this.#createNewFileLocation,
            );
            let isThrown = false;
            request.on('data', (chunk: Buffer) => {
                try {
                    collector.collect(chunk);
                } catch {
                    if (!isThrown) {
                        rej(
                            new NetResponseError(400, {
                                type: 'text',
                                content: 'Invalid multipart/form-data body',
                            }),
                        );
                        isThrown = true;
                    }
                }
            });
            request.on('end', () => {
                try {
                    collector
                        .end()
                        .then(({ formValues, fileLocations }) => {
                            res({
                                type: 'form-data',
                                formValues,
                                fileLocations,
                            });
                        })
                        .catch(() => {
                            rej(
                                new NetResponseError(400, {
                                    type: 'text',
                                    content: 'Invalid multipart/form-data body',
                                }),
                            );
                        });
                } catch {
                    if (!isThrown) {
                        rej(
                            new NetResponseError(400, {
                                type: 'text',
                                content: 'Invalid multipart/form-data body',
                            }),
                        );
                    }
                }
            });
            request.on('error', rej);
        });
    }
}
