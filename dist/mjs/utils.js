export function updateContext(request, context) {
    return Object.assign(request, {
        context: Object.assign(request.context, context),
    });
}
