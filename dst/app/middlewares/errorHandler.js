"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * エラーハンドラーミドルウェア
 */
const cinerinoapi = require("@cinerino/sdk");
const createDebug = require("debug");
const http_status_1 = require("http-status");
const api_1 = require("../error/api");
const debug = createDebug('cinerino-legacy-pos-api:middlewares:errorHandler');
exports.default = (err, __, res, next) => {
    debug('handling err...', err);
    if (res.headersSent) {
        next(err);
        return;
    }
    let apiError;
    if (err instanceof api_1.APIError) {
        apiError = err;
    }
    else {
        // エラー配列が入ってくることもある
        if (Array.isArray(err)) {
            apiError = new api_1.APIError(cinerinoError2httpStatusCode(err[0]), err);
        }
        else if (err instanceof cinerinoapi.transporters.RequestError) {
            apiError = new api_1.APIError(cinerinoError2httpStatusCode(err), [err]);
        }
        else {
            // 500
            apiError = new api_1.APIError(http_status_1.INTERNAL_SERVER_ERROR, [new cinerinoapi.transporters.RequestError(err.message)]);
        }
    }
    res.status(apiError.code)
        .json({
        error: apiError.toObject()
    });
};
function cinerinoError2httpStatusCode(err) {
    let statusCode = http_status_1.BAD_REQUEST;
    switch (err.code) {
        // 401
        case (http_status_1.UNAUTHORIZED):
            statusCode = http_status_1.UNAUTHORIZED;
            break;
        // 403
        case (http_status_1.FORBIDDEN):
            statusCode = http_status_1.FORBIDDEN;
            break;
        // 404
        case (http_status_1.NOT_FOUND):
            statusCode = http_status_1.NOT_FOUND;
            break;
        // 409
        case (http_status_1.CONFLICT):
            statusCode = http_status_1.CONFLICT;
            break;
        // 429
        case (http_status_1.TOO_MANY_REQUESTS):
            statusCode = http_status_1.TOO_MANY_REQUESTS;
            break;
        // 502
        case (http_status_1.NOT_IMPLEMENTED):
            statusCode = http_status_1.NOT_IMPLEMENTED;
            break;
        // 503
        case (http_status_1.SERVICE_UNAVAILABLE):
            statusCode = http_status_1.SERVICE_UNAVAILABLE;
            break;
        // 400
        default:
            statusCode = http_status_1.BAD_REQUEST;
    }
    return statusCode;
}
