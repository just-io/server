"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("./body-parser"));
const net_response_error_1 = require("../net-response-error");
class JsonBodyParser extends body_parser_1.default {
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
                catch (_a) {
                    rej(new net_response_error_1.NetResponseError(400, {
                        type: 'text',
                        content: 'Invalid application/json body',
                    }));
                }
            });
            request.on('error', rej);
        });
    }
}
exports.default = JsonBodyParser;
