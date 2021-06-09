/**
 * コンテンツルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';
import { query } from 'express-validator';

import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

export interface IMovie4pos {
    additionalProperty?: cinerinoapi.factory.propertyValue.IPropertyValue<string>[];
    identifier?: string;
    datePublished?: Date;
    name?: { ja?: string; en?: string };
    headline?: string;
    contentRating?: string;
}

export interface ISearchConditions4pos {
    page?: number;
    limit?: number;
    datePublishedFrom?: Date;
    datePublishedThrough?: Date;
}

const movieRouter = express.Router();

movieRouter.use(rateLimit);

/**
 * コンテンツ検索
 */
movieRouter.get(
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
            .toInt(),
        query('datePublishedFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('datePublishedThrough')
            .optional()
            .isISO8601()
            .toDate()
    ],
    ...[],
    validator,
    async (req, res, next) => {
        try {
            const creativeWorkService = new cinerinoapi.service.CreativeWork({
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id },
                auth: req.authClient
            });

            const params = <ISearchConditions4pos>req.query;

            const searchConditions: cinerinoapi.factory.creativeWork.movie.ISearchConditions = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (typeof params.limit === 'number') ? Math.min(params.limit, 100) : 100,
                page: (typeof params.page === 'number') ? Math.max(params.page, 1) : 1,
                sort: { identifier: 1 },
                ...(params.datePublishedFrom instanceof Date) ? { datePublishedFrom: params.datePublishedFrom } : undefined,
                ...(params.datePublishedThrough instanceof Date) ? { datePublishedThrough: params.datePublishedThrough } : undefined,
                ...{
                    // $projection: {
                    //     aggregateEntranceGate: 0,
                    //     aggregateOffer: 0,
                    //     aggregateReservation: 0,
                    //     hasOfferCatalog: 0
                    // }
                }
            };

            const searchResult = await creativeWorkService.searchMovies(searchConditions);

            res.json(searchResult.data.map(movie2movie4pos));
        } catch (error) {
            next(error);
        }
    }
);

export default movieRouter;

function movie2movie4pos(movie: cinerinoapi.factory.creativeWork.movie.ICreativeWork): IMovie4pos {
    return {
        additionalProperty: (Array.isArray(movie.additionalProperty)) ? movie.additionalProperty : [],
        ...(typeof movie.contentRating === 'string') ? { contentRating: movie.contentRating } : undefined,
        ...(movie.datePublished !== null && movie.datePublished !== undefined) ? { datePublished: movie.datePublished } : undefined,
        ...(typeof movie.headline === 'string') ? { headline: movie.headline } : undefined,
        identifier: movie.identifier,
        name: {
            ... (typeof movie.name === 'string')
                ? { ja: movie.name }
                : (typeof movie.name?.ja === 'string') ? { ja: movie.name.ja } : undefined
        }
    };
}
