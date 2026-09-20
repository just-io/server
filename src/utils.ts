import { NetRequest } from './types';

export function updateContext<L, G, T extends Record<string, unknown>, A>(
    netRequest: NetRequest<L, G, T>,
    context: A,
): NetRequest<L, G, T & A> {
    return Object.assign(netRequest, {
        context: Object.assign(netRequest.context, context),
    }) as NetRequest<L, G, T & A>;
}
