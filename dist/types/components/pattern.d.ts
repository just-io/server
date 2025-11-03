export type ExtractGroups<Path> = Path extends `${infer Segment}/${infer Rest}` ? ExtractGroup<Segment> & ExtractGroups<Rest> : ExtractGroup<Path>;
export type ExtractGroup<Segment> = Segment extends `:${infer Param}` ? {
    [K in Param]: string;
} : unknown;
export type ExecResult<T extends string> = {
    matched: string;
    groups: ExtractGroups<T>;
};
export default class Pattern<T extends string> {
    #private;
    constructor(input: T);
    exec(str: string): null | ExecResult<T>;
    get input(): string;
}
