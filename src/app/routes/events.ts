/**
 * イベントルーター
 */
import * as express from 'express';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

import { searchByChevre } from '../service/event';

const eventsRouter = express.Router();

eventsRouter.use(authentication);
eventsRouter.use(rateLimit);

/**
 * イベント検索
 */
eventsRouter.get(
    '',
    permitScopes(['pos']),
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

export default eventsRouter;
