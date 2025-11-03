"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _BufferBodyParser_createNewFileLocation;
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("./body-parser"));
class BufferBodyParser extends body_parser_1.default {
    constructor(createNewFileLocation) {
        super();
        _BufferBodyParser_createNewFileLocation.set(this, void 0);
        __classPrivateFieldSet(this, _BufferBodyParser_createNewFileLocation, createNewFileLocation, "f");
    }
    parse(request) {
        return new Promise((res, rej) => {
            const fileLocation = __classPrivateFieldGet(this, _BufferBodyParser_createNewFileLocation, "f").call(this);
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
_BufferBodyParser_createNewFileLocation = new WeakMap();
exports.default = BufferBodyParser;
