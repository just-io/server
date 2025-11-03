import { Middleware, RequestOptions, Router } from '../router';
export default class StaticRouter<Global, Context = Record<string, unknown>> extends Router<Global, Context> {
    private fullPathToFolder;
    constructor(pathToFolder: string, middleware: Middleware<Global, Context>, defaultOptions?: RequestOptions);
}
