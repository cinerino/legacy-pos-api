/**
 * 施設コンテンツルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';
import { query } from 'express-validator';

import permitScopes from '../../middlewares/permitScopes';
import rateLimit from '../../middlewares/rateLimit';
import validator from '../../middlewares/validator';

export interface IEvent4pos {
    additionalProperty?: cinerinoapi.factory.chevre.propertyValue.IPropertyValue<string>[];
    id: string;
}

export interface ISearchConditions4pos {
    page?: number;
    limit?: number;
}

const screeningEventSeriesRouter = express.Router();

screeningEventSeriesRouter.use(rateLimit);

/**
 * イベント検索
 */
screeningEventSeriesRouter.get(
    '',
    permitScopes([]),
    ...[
        query('limit')
            .optional()
            .isInt()
            .toInt(),
        query('page')
            .optional()
            .isInt()
            .toInt()
    ],
    ...[],
    validator,
    async (req, res, next) => {
        try {
            const eventService = new cinerinoapi.service.Event({
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id },
                auth: req.authClient
            });

            const params = <ISearchConditions4pos>req.query;

            const searchConditions: cinerinoapi.factory.chevre.event.screeningEventSeries.ISearchConditions = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (typeof params.limit === 'number') ? Math.min(params.limit, 100) : 100,
                page: (typeof params.page === 'number') ? Math.max(params.page, 1) : 1,
                sort: { startDate: 1 },
                typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEventSeries
            };

            const searchResult = await eventService.search(searchConditions);

            res.json(searchResult.data.map(event2event4pos));
        } catch (error) {
            next(error);
        }
    }
);

export default screeningEventSeriesRouter;

function event2event4pos(event: cinerinoapi.factory.chevre.event.screeningEventSeries.IEvent): IEvent4pos {
    return {
        additionalProperty: (Array.isArray(event.additionalProperty)) ? event.additionalProperty : [],
        id: event.id
    };
}
