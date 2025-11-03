import { NetRequest } from './types';
export declare function updateContext<G, T extends Record<string, unknown>, A>(netRequest: NetRequest<G, T>, context: A): NetRequest<G, T & A>;
