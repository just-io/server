import { FileLocation } from '../types';
export declare const MIME_TYPES_MAP: Record<string, string>;
export declare const UNKNOWN_MIME_TYPE = "application/octet-stream";
export declare function getMimeTypeByFileExtension(filename: string): string;
export declare function makeLocalFileStorage(pathToDirectory: string): {
    createFileLocation(): FileLocation;
};
