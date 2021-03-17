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
        else if (err.name === 'CinerinoRequestError') {
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
    if (typeof err.code === 'number') {
        statusCode = err.code;
    }
    return statusCode;
}
