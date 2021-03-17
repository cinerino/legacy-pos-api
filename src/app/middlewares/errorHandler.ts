/**
 * エラーハンドラーミドルウェア
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from 'http-status';

import { APIError } from '../error/api';

const debug = createDebug('smarttheater-legacy-pos-api:middlewares:errorHandler');

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
        } else if (err.name === 'CinerinoRequestError') {
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
    if (typeof err.code === 'number') {
        statusCode = err.code;
    }

    return statusCode;
}
