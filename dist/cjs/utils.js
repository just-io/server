"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateContext = updateContext;
function updateContext(request, context) {
    return Object.assign(request, {
        context: Object.assign(request.context, context),
    });
}
