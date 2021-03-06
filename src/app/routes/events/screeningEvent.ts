/**
 * イベントルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';
import { query } from 'express-validator';

import permitScopes from '../../middlewares/permitScopes';
import rateLimit from '../../middlewares/rateLimit';
import validator from '../../middlewares/validator';

export interface IEvent4pos {
    additionalProperty?: cinerinoapi.factory.propertyValue.IPropertyValue<string>[];
    doorTime?: Date;
    endDate?: Date;
    eventStatus?: string;
    id: string;
    location?: {
        address?: cinerinoapi.factory.multilingualString;
        branchCode?: string;
        name?: cinerinoapi.factory.multilingualString;
    };
    maximumAttendeeCapacity?: number;
    name?: cinerinoapi.factory.multilingualString;
    offers?: {
        validFrom?: Date;
        validThrough?: Date;
    };
    remainingAttendeeCapacity?: number;
    startDate?: Date;
    superEvent?: {
        id?: string;
        description?: cinerinoapi.factory.multilingualString;
        dubLanguage?: {
            name?: string;
        };
        subtitleLanguage?: {
            name?: string;
        };

    };
    workPerformed?: {
        identifier?: string;
        headline?: string;
        contentRating?: string;
        duration?: string;
    };
}

export interface ISearchConditions4pos {
    page?: number;
    limit?: number;
    offers?: {
        validFrom?: Date;
        validThrough?: Date;
        availableFrom?: Date;
        availableThrough?: Date;
    };
    startFrom?: Date;
    startThrough?: Date;
    superEvent?: { locationBranchCodes?: string[] };
}

const screeningEventRouter = express.Router();

screeningEventRouter.use(rateLimit);

/**
 * イベント検索
 */
screeningEventRouter.get(
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
        query('offers.availableFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('offers.availableThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('offers.validFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('offers.validThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('startFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('startThrough')
            .optional()
            .isISO8601()
            .toDate()
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

            const superEventLocationBranchCodes = params.superEvent?.locationBranchCodes;
            const searchConditions: cinerinoapi.factory.event.screeningEvent.ISearchConditions = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (typeof params.limit === 'number') ? Math.min(params.limit, 100) : 100,
                page: (typeof params.page === 'number') ? Math.max(params.page, 1) : 1,
                sort: { startDate: 1 },
                typeOf: cinerinoapi.factory.eventType.ScreeningEvent,
                eventStatuses: [cinerinoapi.factory.eventStatusType.EventScheduled],
                offers: {
                    ...(params.offers?.availableFrom instanceof Date) ? { availableFrom: params.offers.availableFrom } : undefined,
                    ...(params.offers?.availableThrough instanceof Date) ? { availableThrough: params.offers.availableThrough } : undefined,
                    ...(params.offers?.validFrom instanceof Date) ? { validFrom: params.offers.validFrom } : undefined,
                    ...(params.offers?.validThrough instanceof Date) ? { validThrough: params.offers.validThrough } : undefined
                },
                superEvent: {
                    ...(Array.isArray(superEventLocationBranchCodes)) ? { locationBranchCodes: superEventLocationBranchCodes } : undefined
                },
                ...(params.startFrom instanceof Date) ? { startFrom: params.startFrom } : undefined,
                ...(params.startThrough instanceof Date) ? { startThrough: params.startThrough } : undefined,
                ...{
                    $projection: {
                        aggregateEntranceGate: 0,
                        aggregateOffer: 0,
                        aggregateReservation: 0,
                        hasOfferCatalog: 0
                        // offers: 0,
                        // workPerformed: 0
                    }
                }
            };

            const searchResult = await eventService.search(searchConditions);

            res.json(searchResult.data.map(event2event4pos));
        } catch (error) {
            next(error);
        }
    }
);

export default screeningEventRouter;

function event2event4pos(event: cinerinoapi.factory.event.screeningEvent.IEvent): IEvent4pos {
    return {
        additionalProperty: (Array.isArray(event.additionalProperty)) ? event.additionalProperty : [],
        id: event.id,
        endDate: event.endDate,
        eventStatus: event.eventStatus,
        startDate: event.startDate,
        ...(event.doorTime !== undefined) ? { doorTime: event.doorTime } : undefined,
        ...(typeof event.name?.ja === 'string') ? { name: event.name } : undefined,
        ...(typeof event.maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity: event.maximumAttendeeCapacity } : undefined,
        ...(typeof event.remainingAttendeeCapacity === 'number')
            ? { remainingAttendeeCapacity: event.remainingAttendeeCapacity }
            : undefined,
        location: {
            ...(typeof event.location.address?.ja === 'string') ? { address: event.location.address } : undefined,
            ...(typeof event.location.branchCode === 'string') ? { branchCode: event.location.branchCode } : undefined,
            ...(typeof event.location.name?.ja === 'string') ? { name: event.location.name } : undefined
        },
        offers: {
            ...(event.offers?.validFrom !== undefined) ? { validFrom: event.offers.validFrom } : undefined,
            ...(event.offers?.validThrough !== undefined) ? { validThrough: event.offers.validThrough } : undefined
        },
        superEvent: {
            ...(typeof event.superEvent.id === 'string') ? { id: event.superEvent.id } : undefined,
            ...(typeof event.superEvent.description?.ja === 'string') ? { description: event.superEvent.description } : undefined,
            ...(typeof event.superEvent.dubLanguage?.name === 'string')
                ? { dubLanguage: { name: event.superEvent.dubLanguage.name } }
                : undefined,
            ...(typeof event.superEvent.subtitleLanguage?.name === 'string')
                ? { subtitleLanguage: { name: event.superEvent.subtitleLanguage.name } }
                : undefined
        },
        workPerformed: {
            ...(typeof event.workPerformed?.identifier === 'string') ? { identifier: event.workPerformed.identifier } : undefined,
            ...(typeof event.workPerformed?.headline === 'string') ? { headline: event.workPerformed.headline } : undefined,
            ...(typeof event.workPerformed?.contentRating === 'string') ? { contentRating: event.workPerformed.contentRating } : undefined,
            ...(typeof event.workPerformed?.duration === 'string') ? { duration: event.workPerformed.duration } : undefined
        }
    };
}
