/**
 * 404ハンドラーミドルウェア
 */
import * as cinerinoapi from '@cinerino/sdk';
import { NextFunction, Request, Response } from 'express';

export default (req: Request, __: Response, next: NextFunction) => {
    next(new cinerinoapi.factory.errors.NotFound(`router for [${req.originalUrl}]`));
};
