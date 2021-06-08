/**
 * 施設ルーター
 */
// import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';
// import { query } from 'express-validator';

// import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
// import validator from '../middlewares/validator';

// export interface IMovie4pos {
//     additionalProperty?: cinerinoapi.factory.propertyValue.IPropertyValue<string>[];
//     identifier?: string;
//     datePublished?: Date;
//     name?: { ja?: string; en?: string };
//     headline?: string;
//     contentRating?: string;
// }

export interface ISearchConditions4pos {
    page?: number;
    limit?: number;
    datePublishedFrom?: Date;
    datePublishedThrough?: Date;
}

const placesRouter = express.Router();

placesRouter.use(rateLimit);

export default placesRouter;
