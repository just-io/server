import http from 'node:http';
import { Readable } from 'node:stream';
import { PeriodData } from './components/period';

export type ExtractGroups<Path> = Path extends `${infer Segment}/${infer Rest}`
    ? ExtractGroup<Segment> & ExtractGroups<Rest>
    : ExtractGroup<Path>;

export type ExtractGroup<Segment> = Segment extends `:${infer Param}`
    ? {
          [K in Param]: string;
      }
    : unknown;

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

export interface FileLocation<Location> {
    writeStream: {
        write(chunk: Buffer): void;
        end(cb?: () => void): void;
    };
    makeReadStream: () => {
        read(size: number): Buffer | null;
    };
    cleanup: () => Promise<void>;
    location: Location;
}

export type CreateFileLocation<Location> = () => FileLocation<Location>;

export type FileData<Location> = {
    filename: string;
    type: string;
    size: number;
    location: Location;
};

export type FormValues<Location> = Record<
    string,
    [string | FileData<Location>, ...(string | FileData<Location>)[]]
>;

export type ParserType = 'form-data' | 'text' | 'urlencoded' | 'json' | 'buffer';

export type NetRequestBody<Location> =
    | {
          type: 'buffer';
          fileLocation: Omit<FileLocation<Location>, 'writeStream' | 'cleanup'>;
      }
    | {
          type: 'urlencoded';
          content: URLSearchParams;
      }
    | {
          type: 'form-data';
          fileLocations: Record<string, Omit<FileLocation<Location>, 'writeStream' | 'cleanup'>[]>;
          formValues: FormValues<Location>;
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
    Location,
    Global = Record<string, unknown>,
    Context = Record<string, unknown>,
    Path extends string = string,
> {
    method: string;
    url: URL;
    headers: http.IncomingHttpHeaders;
    cookies: Record<string, string>;
    body: NetRequestBody<Location> | null;
    id: string;
    startedAt: number;
    pathname: {
        router: string;
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
    error?: Error;
    periods: {
        total: PeriodData;
        composingNetRequest?: PeriodData;
        parsingBody?: PeriodData;
        handling?: PeriodData;
        sending?: PeriodData;
        shouldAbortChecking?: PeriodData;
    };
};
