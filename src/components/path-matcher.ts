type PathItem =
    | {
          type: 'const';
          value: string;
      }
    | {
          type: 'param';
          name: string;
      };

type Node<T> = {
    consts: Map<string, Node<T>>;
    params: Map<string, Node<T>>;
    values: [all: Set<T>, exact: Set<T>];
};

export type Matched<T> = {
    params: Record<string, string>;
    matchedCount: number;
    value: T;
};

export type StringPath = `/${string}`;

export class PathMatcher<T> {
    #makeDefault(): Node<T> {
        return {
            consts: new Map(),
            params: new Map(),
            values: [new Set(), new Set()],
        };
    }

    #root: Node<T> = this.#makeDefault();

    add(pathItems: PathItem[], value: T, exact = false): this {
        let node = this.#root;
        for (const pathItem of pathItems) {
            if (pathItem.type === 'const') {
                let subNode = node.consts.get(pathItem.value);
                if (!subNode) {
                    subNode = this.#makeDefault();
                    node.consts.set(pathItem.value, subNode);
                }
                node = subNode;
            } else {
                let subNode = node.params.get(pathItem.name);
                if (!subNode) {
                    subNode = this.#makeDefault();
                    node.params.set(pathItem.name, subNode);
                }
                node = subNode;
            }
        }
        if (exact) {
            node.values[1].add(value);
        } else {
            node.values[0].add(value);
        }

        return this;
    }

    delete(pathItems: PathItem[], value: T, exact = false): boolean {
        let node: Node<T> | undefined = this.#root;
        for (const pathItem of pathItems) {
            if (!node) {
                return false;
            }
            if (pathItem.type === 'const') {
                node = node.consts.get(pathItem.value);
            } else {
                node = node.params.get(pathItem.name);
            }
        }
        if (!node) {
            return false;
        }
        if (exact) {
            return node.values[1].delete(value);
        } else {
            return node.values[0].delete(value);
        }
    }

    #match(
        node: Node<T>,
        params: Record<string, string>,
        matchedCount: number,
        items: string[],
    ): Matched<T>[] {
        const matched: Matched<T>[] = [];
        const values: Set<T> = new Set(node.values[0]);
        if (!items.length) {
            for (const value of node.values[1]) {
                values.add(value);
            }
        }
        for (const value of values) {
            matched.push({
                matchedCount,
                params,
                value,
            });
        }
        if (!items.length) {
            return matched;
        }
        const subNode = node.consts.get(items[0]);
        if (subNode) {
            matched.push(...this.#match(subNode, params, matchedCount + 1, items.slice(1)));
        }
        for (const entry of node.params) {
            matched.push(
                ...this.#match(
                    entry[1],
                    { ...params, [entry[0]]: items[0] },
                    matchedCount + 1,
                    items.slice(1),
                ),
            );
        }

        return matched;
    }

    match(items: string[]): Matched<T>[] {
        return this.#match(this.#root, {}, 0, items);
    }

    matchLongest(items: string[]): Matched<T> | null {
        return this.match(items).reduce(
            (longest, item) => {
                if (!longest) {
                    return item;
                }
                if (item.matchedCount > longest.matchedCount) {
                    return item;
                }
                return longest;
            },
            null as Matched<T> | null,
        );
    }

    static toPathItems(path: StringPath): PathItem[] {
        const pathItems: PathItem[] = [];
        if (path === '/') {
            return pathItems;
        }
        const items = path.slice(1).split('/');
        for (const item of items) {
            if (item[0] === ':') {
                pathItems.push({
                    type: 'param',
                    name: item.slice(1),
                });
            } else {
                pathItems.push({
                    type: 'const',
                    value: item,
                });
            }
        }

        return pathItems;
    }

    static toItems(path: StringPath): string[] {
        if (path === '/') {
            return [];
        }
        return path.slice(1).split('/');
    }
}
