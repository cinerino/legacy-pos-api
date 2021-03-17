/**
 * エラーハンドラーミドルウェア
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import {
    BAD_REQUEST,
    CONFLICT, FORBIDDEN,
    INTERNAL_SERVER_ERROR,
    NOT_FOUND,
    NOT_IMPLEMENTED,
    SERVICE_UNAVAILABLE,
    TOO_MANY_REQUESTS,
    UNAUTHORIZED
} from 'http-status';

import { APIError } from '../error/api';

const debug = createDebug('cinerino-legacy-pos-api:middlewares:errorHandler');

export default (err: any, __: Request, res: Response, next: NextFunction) => {
    debug('handling err...', err);

    if (res.headersSent) {
        next(err);

        return;
    }

    let apiError: APIError;
    if (err instanceof APIError) {
        apiError = err;
    } else {
        // エラー配列が入ってくることもある
        if (Array.isArray(err)) {
            apiError = new APIError(cinerinoError2httpStatusCode(err[0]), err);
        } else if (err instanceof cinerinoapi.transporters.RequestError) {
            apiError = new APIError(cinerinoError2httpStatusCode(err), [err]);
        } else {
            // 500
            apiError = new APIError(INTERNAL_SERVER_ERROR, [new cinerinoapi.transporters.RequestError(err.message)]);
        }
    }

    res.status(apiError.code)
        .json({
            error: apiError.toObject()
        });
};

function cinerinoError2httpStatusCode(err: cinerinoapi.transporters.RequestError) {
    let statusCode = BAD_REQUEST;

    switch (err.code) {
        // 401
        case (UNAUTHORIZED):
            statusCode = UNAUTHORIZED;
            break;

        // 403
        case (FORBIDDEN):
            statusCode = FORBIDDEN;
            break;

        // 404
        case (NOT_FOUND):
            statusCode = NOT_FOUND;
            break;

        // 409
        case (CONFLICT):
            statusCode = CONFLICT;
            break;

        // 429
        case (TOO_MANY_REQUESTS):
            statusCode = TOO_MANY_REQUESTS;
            break;

        // 502
        case (NOT_IMPLEMENTED):
            statusCode = NOT_IMPLEMENTED;
            break;

        // 503
        case (SERVICE_UNAVAILABLE):
            statusCode = SERVICE_UNAVAILABLE;
            break;

        // 400
        default:
            statusCode = BAD_REQUEST;
    }

    return statusCode;
}
