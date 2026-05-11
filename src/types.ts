import http from 'node:http';
import { Readable } from 'node:stream';
import { ExtractGroups } from './components/pattern';
import { PeriodData } from './components/period';

export type JSONValue =
    | string
    | null
    | number
    | boolean
    | JSONValue[]
    | { [key: string]: JSONValue };

export type JSONResponses = {
    [key: number]: JSONValue;
};

export type JSONNetResponseValues<R extends JSONResponses> = {
    [S in keyof R]: {
        status: S & number;
        value: R[S & number];
        headers?: http.OutgoingHttpHeaders;
        cookies?: Cookie[];
    };
}[keyof R];

export interface FileLocation {
    writeStream: {
        write(chunk: Buffer): void;
        end(): void;
    };
    readStream: {
        read(size: number): Buffer | null;
    };
    cleanup: () => Promise<void>;
    location: string;
}

export type FileData = {
    filename: string;
    type: string;
    size: number;
    location: string;
};

export type FormValues = Record<string, [string | FileData, ...(string | FileData)[]]>;

export type ParserType = 'form-data' | 'text' | 'urlencoded' | 'json' | 'buffer';

export type NetRequestBody =
    | {
          type: 'buffer';
          fileLocation: Omit<FileLocation, 'writeStream'>;
      }
    | {
          type: 'urlencoded';
          content: URLSearchParams;
      }
    | {
          type: 'form-data';
          fileLocations: Record<string, Omit<FileLocation, 'writeStream'>>;
          formValues: FormValues;
      }
    | {
          type: 'text';
          content: string;
      }
    | {
          type: 'json';
          content: JSONValue;
      };

export interface NetRequest<
    Global = Record<string, unknown>,
    Context = Record<string, unknown>,
    Path extends string = string,
> {
    method: string;
    url: URL;
    headers: http.IncomingHttpHeaders;
    cookies: Record<string, string>;
    body: NetRequestBody | null;
    id: string;
    startedAt: number;
    pathname: {
        router: string;
        handler: string;
        groups: ExtractGroups<Path>;
    };
    abortSignal: AbortSignal;
    context: Context;
    global: Global;
}

export type NetResponseBody =
    | {
          type: 'buffer';
          content: Buffer;
          contentType?: string;
      }
    | {
          type: 'stream';
          content: Readable;
          contentLength: number;
          contentType?: string;
      }
    | {
          type: 'file';
          content:
              | {
                    type: 'text';
                    content: string;
                }
              | {
                    type: 'buffer';
                    buffer: Buffer;
                }
              | {
                    type: 'stream';
                    stream: Readable;
                    length: number;
                };
          contentType: string;
          attachment?: {
              filename: string;
          };
      }
    | {
          type: 'text';
          content: string;
      }
    | {
          type: 'json';
          content: JSONValue;
      };

export type Cookie = {
    key: string;
    value: string;
    expires?: Date;
    maxAge?: number;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'None' | 'Lax' | 'Strict';
};

export interface NetResponse {
    status?: number;
    body?: NetResponseBody;
    headers?: http.OutgoingHttpHeaders;
    flushHeaders?: boolean;
    cookies?: Cookie[];
}

export type CreateFileLocation = () => FileLocation;

export type RequestFinishedReason =
    | 'not-found'
    | 'length-required'
    | 'content-too-large'
    | 'not-acceptable'
    | 'timeout'
    | 'too-many-requests'
    | 'internal-server-error'
    | 'socket-closed'
    | 'handled'
    | 'error';

export type RequestProcessingInfo = {
    router?: string;
    handler?: string;
    finishedReason: RequestFinishedReason;
    periods: {
        total: PeriodData;
        compousingNetRequest?: PeriodData;
        parsingBody?: PeriodData;
        handling?: PeriodData;
        sending?: PeriodData;
        shouldAbortChecking?: PeriodData;
    };
};
