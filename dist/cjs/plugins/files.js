"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNKNOWN_MIME_TYPE = exports.MIME_TYPES_MAP = void 0;
exports.getMimeTypeByFileExtension = getMimeTypeByFileExtension;
exports.makeLocalFileStorage = makeLocalFileStorage;
const node_fs_1 = __importDefault(require("node:fs"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_path_1 = __importDefault(require("node:path"));
exports.MIME_TYPES_MAP = {
    aac: 'audio/aac',
    abw: 'application/x-abiword',
    arc: 'application/x-freearc',
    avif: 'image/avif',
    avi: 'video/x-msvideo',
    azw: 'application/vnd.amazon.ebook',
    bin: 'application/octet-stream',
    bmp: 'image/bmp',
    bz: 'application/x-bzip',
    bz2: 'application/x-bzip2',
    cda: 'application/x-cdf',
    csh: 'application/x-csh',
    css: 'text/css',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    eot: 'application/vnd.ms-fontobject',
    epub: 'application/epub+zip',
    gz: 'application/gzip',
    gif: 'image/gif',
    htm: 'text/html',
    html: 'text/html',
    ico: 'image/vnd.microsoft.icon',
    ics: 'text/calendar',
    jar: 'application/java-archive',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    js: 'text/javascript',
    json: 'application/json',
    jsonld: 'application/ld+json',
    mid: 'audio/midi',
    midi: 'audio/midi',
    mjs: 'text/javascript',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    mpeg: 'video/mpeg',
    mpkg: 'application/vnd.apple.installer+xml',
    odp: 'application/vnd.oasis.opendocument.presentation',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odt: 'application/vnd.oasis.opendocument.text',
    oga: 'audio/ogg',
    ogv: 'video/ogg',
    ogx: 'application/ogg',
    opus: 'audio/opus',
    otf: 'font/otf',
    png: 'image/png',
    pdf: 'application/pdf',
    php: 'application/x-httpd-php',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    rar: 'application/vnd.rar',
    rtf: 'application/rtf',
    sh: 'application/x-sh',
    svg: 'image/svg+xml',
    tar: 'application/x-tar',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    ts: 'video/mp2t',
    ttf: 'font/ttf',
    txt: 'text/plain',
    vsd: 'application/vnd.visio',
    wav: 'audio/wav',
    weba: 'audio/webm',
    webm: 'video/webm',
    webp: 'image/webp',
    woff: 'font/woff',
    woff2: 'font/woff2',
    xhtml: 'application/xhtml+xml',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xml: 'application/xml',
    xul: 'application/vnd.mozilla.xul+xml',
    zip: 'application/zip',
    '3gp': 'video/3gpp',
    '3g2': 'video/3gpp2',
    '7z': 'application/x-7z-compressed',
};
exports.UNKNOWN_MIME_TYPE = 'application/octet-stream';
function getMimeTypeByFileExtension(filename) {
    var _a, _b, _c;
    const ext = (_b = (_a = filename.match(/\.([^.]+)$/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '';
    return (_c = exports.MIME_TYPES_MAP[ext]) !== null && _c !== void 0 ? _c : exports.UNKNOWN_MIME_TYPE;
}
function makeLocalFileStorage(pathToDirectory) {
    if (!node_fs_1.default.existsSync(pathToDirectory) || !node_fs_1.default.statSync(pathToDirectory).isDirectory()) {
        node_fs_1.default.mkdirSync(pathToDirectory, { recursive: true });
    }
    return {
        createNewFileLocation: () => {
            const name = node_crypto_1.default.randomUUID();
            const location = node_path_1.default.join(pathToDirectory, name);
            return {
                location,
                writeStream: node_fs_1.default.createWriteStream(location),
                makeReadStream: () => node_fs_1.default.createReadStream(location),
            };
        },
        cleanup: (locations) => {
            return locations.reduce((promise, location) => {
                return promise.then(() => node_fs_1.default.promises.unlink(location));
            }, Promise.resolve());
        },
    };
}
