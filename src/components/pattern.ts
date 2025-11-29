export type ExtractGroups<Path> = Path extends `${infer Segment}/${infer Rest}`
    ? ExtractGroup<Segment> & ExtractGroups<Rest>
    : ExtractGroup<Path>;

export type ExtractGroup<Segment> = Segment extends `:${infer Param}`
    ? {
          [K in Param]: string;
      }
    : unknown;

export type ExecResult<T extends string> = {
    matched: string;
    groups: ExtractGroups<T>;
};

export default class Pattern<T extends string> {
    #input: T;

    #groups: string[];

    #regexp: RegExp;

    constructor(input: T) {
        this.#input = input;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.#groups = (input.match(/:([^/]+)/g) || []).map((str) => str.match(/:([^/]+)/)![1]);
        this.#regexp = new RegExp(
            `^${input.replace(/\*/g, '.*').replace(/:([^/]+)/g, () => `([^/]+)`)}$`,
        );
    }

    exec(str: string): null | ExecResult<T> {
        const matched = str.match(this.#regexp);
        if (matched) {
            return {
                matched: matched[0],
                groups: this.#groups.reduce(
                    (obj, group, i) => {
                        obj[group] = matched[i + 1];
                        return obj;
                    },
                    {} as Record<string, string>,
                ) as ExtractGroups<T>,
            };
        }
        return null;
    }

    get input(): string {
        return this.#input;
    }
}
