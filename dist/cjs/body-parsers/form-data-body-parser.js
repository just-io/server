"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Reader_position, _Reader_chunks, _Reader_currentChunk, _Reader_currentChunkPosition, _Collector_instances, _a, _Collector_rBuffer, _Collector_nBuffer, _Collector_doubleDashBuffer, _Collector_formValues, _Collector_fileLocations, _Collector_boundary, _Collector_minSize, _Collector_state, _Collector_createNewFileLocation, _Collector_reader, _Collector_cutLastNewLineSymbols, _Collector_process, _Collector_readBoundary, _Collector_readEmpty, _Collector_readWhileNotEnds, _Collector_readLine, _FormDataBodyParser_createNewFileLocation;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collector = void 0;
const body_parser_1 = __importDefault(require("./body-parser"));
const net_response_error_1 = require("../net-response-error");
class Reader {
    constructor() {
        _Reader_position.set(this, 0);
        _Reader_chunks.set(this, []);
        _Reader_currentChunk.set(this, 0);
        _Reader_currentChunkPosition.set(this, 0);
    }
    get size() {
        return __classPrivateFieldGet(this, _Reader_chunks, "f").reduce((size, chunk) => size + chunk.length, 0);
    }
    get left() {
        return __classPrivateFieldGet(this, _Reader_chunks, "f")
            .slice(__classPrivateFieldGet(this, _Reader_currentChunk, "f") + 1)
            .reduce((size, chunk) => size + chunk.length, __classPrivateFieldGet(this, _Reader_chunks, "f")[__classPrivateFieldGet(this, _Reader_currentChunk, "f")].length - __classPrivateFieldGet(this, _Reader_currentChunkPosition, "f"));
    }
    addChunk(chunk) {
        __classPrivateFieldGet(this, _Reader_chunks, "f").push(chunk);
    }
    consume() {
        while (__classPrivateFieldGet(this, _Reader_currentChunk, "f") > 0) {
            __classPrivateFieldSet(this, _Reader_currentChunk, __classPrivateFieldGet(this, _Reader_currentChunk, "f") - 1, "f");
            __classPrivateFieldGet(this, _Reader_chunks, "f").shift();
        }
    }
    test(length = 1) {
        const slices = [];
        let total = 0;
        let currentChunk = __classPrivateFieldGet(this, _Reader_currentChunk, "f");
        let position = __classPrivateFieldGet(this, _Reader_currentChunkPosition, "f");
        if (!__classPrivateFieldGet(this, _Reader_chunks, "f")[__classPrivateFieldGet(this, _Reader_currentChunk, "f")]) {
            return Buffer.alloc(0);
        }
        while (total < length) {
            const slice = __classPrivateFieldGet(this, _Reader_chunks, "f")[currentChunk].subarray(position, position + length - total);
            slices.push(slice);
            total += slice.length;
            if (slice.length + position === __classPrivateFieldGet(this, _Reader_chunks, "f")[currentChunk].length) {
                position = 0;
                currentChunk += 1;
            }
            else {
                position += slice.length;
            }
            if (!__classPrivateFieldGet(this, _Reader_chunks, "f")[currentChunk]) {
                break;
            }
        }
        return Buffer.concat(slices);
    }
    read(length = 1) {
        const slices = [];
        let total = 0;
        if (!__classPrivateFieldGet(this, _Reader_chunks, "f")[__classPrivateFieldGet(this, _Reader_currentChunk, "f")]) {
            throw new Error('Not enought');
        }
        while (total < length) {
            const slice = __classPrivateFieldGet(this, _Reader_chunks, "f")[__classPrivateFieldGet(this, _Reader_currentChunk, "f")].subarray(__classPrivateFieldGet(this, _Reader_currentChunkPosition, "f"), __classPrivateFieldGet(this, _Reader_currentChunkPosition, "f") + length - total);
            slices.push(slice);
            total += slice.length;
            if (slice.length + __classPrivateFieldGet(this, _Reader_currentChunkPosition, "f") ===
                __classPrivateFieldGet(this, _Reader_chunks, "f")[__classPrivateFieldGet(this, _Reader_currentChunk, "f")].length) {
                __classPrivateFieldSet(this, _Reader_currentChunkPosition, 0, "f");
                __classPrivateFieldSet(this, _Reader_currentChunk, __classPrivateFieldGet(this, _Reader_currentChunk, "f") + 1, "f");
            }
            else {
                __classPrivateFieldSet(this, _Reader_currentChunkPosition, __classPrivateFieldGet(this, _Reader_currentChunkPosition, "f") + slice.length, "f");
            }
            if (!__classPrivateFieldGet(this, _Reader_chunks, "f")[__classPrivateFieldGet(this, _Reader_currentChunk, "f")]) {
                break;
            }
        }
        __classPrivateFieldSet(this, _Reader_position, __classPrivateFieldGet(this, _Reader_position, "f") + total, "f");
        return Buffer.concat(slices);
    }
}
_Reader_position = new WeakMap(), _Reader_chunks = new WeakMap(), _Reader_currentChunk = new WeakMap(), _Reader_currentChunkPosition = new WeakMap();
class Collector {
    constructor(boundary, minSize, createNewFileLocation) {
        _Collector_instances.add(this);
        _Collector_formValues.set(this, {});
        _Collector_fileLocations.set(this, {});
        _Collector_boundary.set(this, void 0);
        _Collector_minSize.set(this, void 0);
        _Collector_state.set(this, {
            state: 'inited',
        });
        _Collector_createNewFileLocation.set(this, void 0);
        _Collector_reader.set(this, new Reader());
        __classPrivateFieldSet(this, _Collector_boundary, boundary, "f");
        __classPrivateFieldSet(this, _Collector_minSize, minSize, "f");
        __classPrivateFieldSet(this, _Collector_createNewFileLocation, createNewFileLocation, "f");
    }
    collect(chunk) {
        __classPrivateFieldGet(this, _Collector_reader, "f").addChunk(chunk);
        __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_process).call(this);
    }
    end() {
        __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_process).call(this, true);
        return {
            fileLocations: __classPrivateFieldGet(this, _Collector_fileLocations, "f"),
            formValues: __classPrivateFieldGet(this, _Collector_formValues, "f"),
        };
    }
}
exports.Collector = Collector;
_a = Collector, _Collector_formValues = new WeakMap(), _Collector_fileLocations = new WeakMap(), _Collector_boundary = new WeakMap(), _Collector_minSize = new WeakMap(), _Collector_state = new WeakMap(), _Collector_createNewFileLocation = new WeakMap(), _Collector_reader = new WeakMap(), _Collector_instances = new WeakSet(), _Collector_cutLastNewLineSymbols = function _Collector_cutLastNewLineSymbols(buffer) {
    let cutSymbols = 0;
    if (__classPrivateFieldGet(_a, _a, "f", _Collector_rBuffer).compare(buffer.subarray(-2, -1)) === 0) {
        cutSymbols += 1;
    }
    if (__classPrivateFieldGet(_a, _a, "f", _Collector_nBuffer).compare(buffer.subarray(-1)) === 0) {
        cutSymbols += 1;
    }
    return cutSymbols ? buffer.subarray(0, -cutSymbols) : buffer;
}, _Collector_process = function _Collector_process(force = false) {
    __classPrivateFieldGet(this, _Collector_reader, "f").consume();
    if (__classPrivateFieldGet(this, _Collector_reader, "f").left < __classPrivateFieldGet(this, _Collector_minSize, "f") && !force) {
        return;
    }
    switch (__classPrivateFieldGet(this, _Collector_state, "f").state) {
        case 'inited': {
            __classPrivateFieldSet(this, _Collector_state, {
                state: 'reading-boundary',
            }, "f");
            return __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_process).call(this, force);
        }
        case 'reading-boundary': {
            __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readBoundary).call(this);
            if (__classPrivateFieldGet(this, _Collector_reader, "f").test(2).compare(__classPrivateFieldGet(_a, _a, "f", _Collector_doubleDashBuffer)) === 0) {
                __classPrivateFieldSet(this, _Collector_state, {
                    state: 'finished',
                }, "f");
                return;
            }
            __classPrivateFieldSet(this, _Collector_state, {
                state: 'reading-header-disposition',
            }, "f");
            break;
        }
        case 'reading-header-disposition': {
            __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readEmpty).call(this);
            const line = __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readLine).call(this);
            const matched = line.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i);
            if (!matched) {
                throw new Error('Invalid header line');
            }
            const [, name, filename] = matched;
            if (filename) {
                const fileLocation = __classPrivateFieldGet(this, _Collector_createNewFileLocation, "f").call(this);
                __classPrivateFieldSet(this, _Collector_state, {
                    state: 'reading-file',
                    file: {
                        type: '',
                        name,
                        size: 0,
                        filename,
                        fileLocation,
                        location: fileLocation.location,
                    },
                }, "f");
            }
            else {
                __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readEmpty).call(this);
                __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readEmpty).call(this);
                __classPrivateFieldSet(this, _Collector_state, {
                    state: 'reading-value',
                    value: {
                        name,
                        parts: [],
                    },
                }, "f");
            }
            break;
        }
        case 'reading-value': {
            const value = __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readWhileNotEnds).call(this, __classPrivateFieldGet(this, _Collector_boundary, "f"));
            if (__classPrivateFieldGet(this, _Collector_reader, "f").left < __classPrivateFieldGet(this, _Collector_boundary, "f").length) {
                __classPrivateFieldGet(this, _Collector_state, "f").value.parts.push(value);
            }
            else {
                __classPrivateFieldGet(this, _Collector_state, "f").value.parts.push(__classPrivateFieldGet(this, _Collector_instances, "m", _Collector_cutLastNewLineSymbols).call(this, value));
                if (!__classPrivateFieldGet(this, _Collector_formValues, "f")[__classPrivateFieldGet(this, _Collector_state, "f").value.name]) {
                    __classPrivateFieldGet(this, _Collector_formValues, "f")[__classPrivateFieldGet(this, _Collector_state, "f").value.name] = [
                        Buffer.concat(__classPrivateFieldGet(this, _Collector_state, "f").value.parts).toString('utf8'),
                    ];
                }
                else {
                    __classPrivateFieldGet(this, _Collector_formValues, "f")[__classPrivateFieldGet(this, _Collector_state, "f").value.name].push(Buffer.concat(__classPrivateFieldGet(this, _Collector_state, "f").value.parts).toString('utf8'));
                }
                __classPrivateFieldSet(this, _Collector_state, {
                    state: 'reading-boundary',
                }, "f");
            }
            break;
        }
        case 'reading-file': {
            __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readEmpty).call(this);
            const line = __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readLine).call(this);
            const matched = line.match(/Content-Type: (.+)/i);
            if (!matched) {
                throw new Error('Invalid header type line');
            }
            const [, type] = matched;
            __classPrivateFieldGet(this, _Collector_state, "f").file.type = type;
            __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readEmpty).call(this);
            __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readEmpty).call(this);
            const content = __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_readWhileNotEnds).call(this, __classPrivateFieldGet(this, _Collector_boundary, "f"));
            if (__classPrivateFieldGet(this, _Collector_reader, "f").left < __classPrivateFieldGet(this, _Collector_boundary, "f").length) {
                __classPrivateFieldGet(this, _Collector_state, "f").file.fileLocation.writeStream.write(content);
                __classPrivateFieldGet(this, _Collector_state, "f").file.size += content.length;
            }
            else {
                const cutContent = __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_cutLastNewLineSymbols).call(this, content);
                __classPrivateFieldGet(this, _Collector_state, "f").file.fileLocation.writeStream.write(cutContent);
                __classPrivateFieldGet(this, _Collector_state, "f").file.fileLocation.writeStream.end();
                __classPrivateFieldGet(this, _Collector_state, "f").file.size += cutContent.length;
                __classPrivateFieldGet(this, _Collector_fileLocations, "f")[__classPrivateFieldGet(this, _Collector_state, "f").file.fileLocation.location] =
                    __classPrivateFieldGet(this, _Collector_state, "f").file.fileLocation;
                if (!__classPrivateFieldGet(this, _Collector_formValues, "f")[__classPrivateFieldGet(this, _Collector_state, "f").file.name]) {
                    __classPrivateFieldGet(this, _Collector_formValues, "f")[__classPrivateFieldGet(this, _Collector_state, "f").file.name] = [
                        {
                            filename: __classPrivateFieldGet(this, _Collector_state, "f").file.filename,
                            type: __classPrivateFieldGet(this, _Collector_state, "f").file.type,
                            size: __classPrivateFieldGet(this, _Collector_state, "f").file.size,
                            location: __classPrivateFieldGet(this, _Collector_state, "f").file.location,
                        },
                    ];
                }
                else {
                    __classPrivateFieldGet(this, _Collector_formValues, "f")[__classPrivateFieldGet(this, _Collector_state, "f").file.name].push({
                        filename: __classPrivateFieldGet(this, _Collector_state, "f").file.filename,
                        type: __classPrivateFieldGet(this, _Collector_state, "f").file.type,
                        size: __classPrivateFieldGet(this, _Collector_state, "f").file.size,
                        location: __classPrivateFieldGet(this, _Collector_state, "f").file.location,
                    });
                }
                __classPrivateFieldSet(this, _Collector_state, {
                    state: 'reading-boundary',
                }, "f");
            }
            break;
        }
    }
    return __classPrivateFieldGet(this, _Collector_instances, "m", _Collector_process).call(this, force);
}, _Collector_readBoundary = function _Collector_readBoundary() {
    const boundary = __classPrivateFieldGet(this, _Collector_reader, "f").read(__classPrivateFieldGet(this, _Collector_boundary, "f").length);
    if (__classPrivateFieldGet(this, _Collector_boundary, "f").compare(boundary) !== 0) {
        throw new Error('Invalid boundary reading');
    }
}, _Collector_readEmpty = function _Collector_readEmpty() {
    if (__classPrivateFieldGet(_a, _a, "f", _Collector_rBuffer).compare(__classPrivateFieldGet(this, _Collector_reader, "f").test()) === 0) {
        __classPrivateFieldGet(this, _Collector_reader, "f").read();
    }
    if (__classPrivateFieldGet(_a, _a, "f", _Collector_nBuffer).compare(__classPrivateFieldGet(this, _Collector_reader, "f").test()) === 0) {
        __classPrivateFieldGet(this, _Collector_reader, "f").read();
    }
}, _Collector_readWhileNotEnds = function _Collector_readWhileNotEnds(str) {
    let buffer = Buffer.alloc(0);
    while (true) {
        if (__classPrivateFieldGet(this, _Collector_reader, "f").left <= str.length) {
            buffer = Buffer.concat([buffer, __classPrivateFieldGet(this, _Collector_reader, "f").read()]);
            break;
        }
        const ends = __classPrivateFieldGet(this, _Collector_reader, "f").test(str.length);
        if (ends && ends.compare(str) !== 0) {
            buffer = Buffer.concat([buffer, __classPrivateFieldGet(this, _Collector_reader, "f").read()]);
        }
        else {
            break;
        }
    }
    return buffer;
}, _Collector_readLine = function _Collector_readLine() {
    let buffer = Buffer.alloc(0);
    while (true) {
        const symb = __classPrivateFieldGet(this, _Collector_reader, "f").test();
        if (symb &&
            __classPrivateFieldGet(_a, _a, "f", _Collector_rBuffer).compare(symb) !== 0 &&
            __classPrivateFieldGet(_a, _a, "f", _Collector_nBuffer).compare(symb) !== 0) {
            buffer = Buffer.concat([buffer, __classPrivateFieldGet(this, _Collector_reader, "f").read()]);
        }
        else {
            break;
        }
    }
    return buffer.toString('utf8');
};
_Collector_rBuffer = { value: Buffer.from('\r') };
_Collector_nBuffer = { value: Buffer.from('\n') };
_Collector_doubleDashBuffer = { value: Buffer.from('--') };
class FormDataBodyParser extends body_parser_1.default {
    constructor(createNewFileLocation) {
        super();
        _FormDataBodyParser_createNewFileLocation.set(this, void 0);
        __classPrivateFieldSet(this, _FormDataBodyParser_createNewFileLocation, createNewFileLocation, "f");
    }
    parse(request) {
        return new Promise((res, rej) => {
            var _b, _c;
            const type = (_b = request.headers['content-type']) !== null && _b !== void 0 ? _b : '';
            const boundary = (_c = type.match(/boundary="?([^"]+)"?/)) === null || _c === void 0 ? void 0 : _c[1];
            if (!boundary) {
                return rej(new net_response_error_1.NetResponseError(400, {
                    type: 'text',
                    content: 'Invalid header value Content-type',
                }));
            }
            const collector = new Collector(Buffer.from('--' + boundary), boundary.length * 10, __classPrivateFieldGet(this, _FormDataBodyParser_createNewFileLocation, "f"));
            let isTrown = false;
            request.on('data', (chunk) => {
                try {
                    collector.collect(chunk);
                }
                catch (_b) {
                    if (!isTrown) {
                        rej(new net_response_error_1.NetResponseError(400, {
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
                catch (_b) {
                    if (!isTrown) {
                        rej(new net_response_error_1.NetResponseError(400, {
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
_FormDataBodyParser_createNewFileLocation = new WeakMap();
exports.default = FormDataBodyParser;
