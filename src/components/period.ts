export type PeriodData = [from: number, to?: number];

export class Period {
    static make(from = Date.now()): PeriodData {
        return [from, ];
    }

    static end(period: PeriodData, to = Date.now()): void {
        period[1] = to;
    }

    static duration(period: PeriodData): number {
        if (period[1] === undefined) {
            return Number.NaN;
        }

        return period[1] - period[0];
    }
}
