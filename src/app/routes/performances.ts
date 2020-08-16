/**
 * パフォーマンスルーター
 */
import * as express from 'express';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

import { searchByChevre } from '../service/performance';

const performanceRouter = express.Router();

performanceRouter.use(authentication);
performanceRouter.use(rateLimit);

/**
 * パフォーマンス検索
 */
performanceRouter.get(
    '',
    permitScopes(['transactions', 'pos']),
    ...[],
    validator,
    async (req, res, next) => {
        try {
            const events = await searchByChevre(req.query)();

            res.json({ data: events });
        } catch (error) {
            next(error);
        }
    }
);

export default performanceRouter;
