/**
 * 404ハンドラーミドルウェア
 */
import { NextFunction, Request, Response } from 'express';
import { NOT_FOUND } from 'http-status';

import { APIError } from '../error/api';

export default (__: Request, ___: Response, next: NextFunction) => {
    next(new APIError(NOT_FOUND, []));
};
