/**
 * イベントルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

import { searchByChevre } from '../service/event';

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: '',
    clientId: '',
    clientSecret: '',
    scopes: [],
    state: ''
});

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
            cinerinoAuthClient.setCredentials({ access_token: req.accessToken });
            const eventService = new cinerinoapi.service.Event({
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id },
                auth: cinerinoAuthClient
            });

            const events = await searchByChevre(req.query, req.user.client_id)(eventService);

            res.json({ data: events });
        } catch (error) {
            next(error);
        }
    }
);

export default eventsRouter;
