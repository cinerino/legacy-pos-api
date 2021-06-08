/**
 * 施設ルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';
import { query } from 'express-validator';

import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

export interface IMovieMovieTheater4pos {
    additionalProperty?: cinerinoapi.factory.propertyValue.IPropertyValue<string>[];
    branchCode?: string;
    name?: { ja?: string; en?: string };
}

export interface ISearchConditions4pos {
    page?: number;
    limit?: number;
}

const placesRouter = express.Router();

placesRouter.use(rateLimit);

/**
 * 施設検索
 */
placesRouter.get(
    `/${cinerinoapi.factory.placeType.MovieTheater}`,
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
            const placeService = new cinerinoapi.service.Place({
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id },
                auth: req.authClient
            });

            const params = <ISearchConditions4pos>req.query;

            const searchConditions: cinerinoapi.factory.place.movieTheater.ISearchConditions = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (typeof params.limit === 'number') ? Math.min(params.limit, 100) : 100,
                page: (typeof params.page === 'number') ? Math.max(params.page, 1) : 1,
                sort: { branchCode: 1 }
            };

            const searchResult = await placeService.searchMovieTheaters(searchConditions);

            res.json(searchResult.data.map(movieTheater2movieTheater4pos));
        } catch (error) {
            next(error);
        }
    }
);

export default placesRouter;

function movieTheater2movieTheater4pos(
    movieTheater: cinerinoapi.factory.place.movieTheater.IPlaceWithoutScreeningRoom
): IMovieMovieTheater4pos {
    return {
        additionalProperty: (Array.isArray(movieTheater.additionalProperty)) ? movieTheater.additionalProperty : [],
        branchCode: movieTheater.branchCode,
        name: {
            ... (typeof movieTheater.name?.en === 'string') ? { en: movieTheater.name.en } : undefined,
            ... (typeof movieTheater.name?.ja === 'string') ? { ja: movieTheater.name.ja } : undefined
        }
    };
}
