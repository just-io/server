import { NetRequest } from './types';

export function updateContext<G, T extends Record<string, unknown>, A>(
    netRequest: NetRequest<G, T>,
    context: A,
): NetRequest<G, T & A> {
    return Object.assign(netRequest, {
        context: Object.assign(netRequest.context, context),
    }) as NetRequest<G, T & A>;
}
