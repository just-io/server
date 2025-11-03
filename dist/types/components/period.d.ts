export type PeriodData = [from: number, to?: number];
export declare class Period {
    static make(from?: number): PeriodData;
    static end(period: PeriodData, to?: number): void;
    static duration(period: PeriodData): number;
}
