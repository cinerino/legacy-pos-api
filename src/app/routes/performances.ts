/**
 * イベントルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';

import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

import { searchByChevre } from '../service/event';

const performancesRouter = express.Router();

performancesRouter.use(rateLimit);

/**
 * イベント検索
 */
performancesRouter.get(
    '',
    permitScopes([]),
    ...[],
    validator,
    async (req, res, next) => {
        try {
            const eventService = new cinerinoapi.service.Event({
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id },
                auth: req.authClient
            });

            const events = await searchByChevre(req.query, req.user.client_id)(eventService);

            res.json({ data: events });
        } catch (error) {
            next(error);
        }
    }
);

export default performancesRouter;
