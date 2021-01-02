/**
 * previewルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import { Router } from 'express';
import * as moment from 'moment-timezone';

import {
    ICheckinCountByWhere,
    ICheckinCountsByTicketType,
    IPerformance,
    IReservationCountByTicketType,
    ISearchConditions
} from '../factory/performance';

export type ISearchResult = IPerformance[];

/**
 * エレベータ運行ステータス
 */
enum EvServiceStatus {
    // 正常運行
    Normal = 'Normal',
    // 減速
    Slowdown = 'Slowdown',
    // 停止
    Suspended = 'Suspended'
}

/**
 * オンライン販売ステータス
 */
enum OnlineSalesStatus {
    // 販売
    Normal = 'Normal',
    // 停止
    Suspended = 'Suspended'
}

// tslint:disable-next-line:max-func-body-length
export function performance2result(performance: IPerformance): IPerformance {
    const tourNumber = performance.additionalProperty?.find((p) => p.name === 'tourNumber')?.value;

    let evServiceStatus = EvServiceStatus.Normal;
    let onlineSalesStatus = OnlineSalesStatus.Normal;

    switch (performance.eventStatus) {
        case cinerinoapi.factory.chevre.eventStatusType.EventCancelled:
            evServiceStatus = EvServiceStatus.Suspended;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventPostponed:
            evServiceStatus = EvServiceStatus.Slowdown;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventScheduled:
            break;

        default:
    }

    const offers = performance.aggregateOffer?.offers;

    let maximumAttendeeCapacity: number | undefined;
    let remainingAttendeeCapacity: number | undefined;
    let remainingAttendeeCapacityForWheelchair: number | undefined;
    let reservationCount: number | undefined;
    let reservationCountsByTicketType: IReservationCountByTicketType[] | undefined;
    const defaultCheckinCountsByTicketType: ICheckinCountsByTicketType[] = (Array.isArray(offers))
        ? offers.map((offer) => {
            return {
                ticketType: <string>offer.id,
                ticketCategory: <string>offer.category?.codeValue,
                count: 0
            };
        })
        : [];
    let checkinCountsByWhere: ICheckinCountByWhere[] = [
        {
            where: 'DAITEN_AUTH',
            checkinCountsByTicketType: defaultCheckinCountsByTicketType
        },
        {
            where: 'TOPDECK_AUTH',
            checkinCountsByTicketType: defaultCheckinCountsByTicketType
        }
    ];
    let checkinCount: number = 0;

    // aggregateOffer,aggregateReservationから算出する
    maximumAttendeeCapacity = performance.aggregateOffer?.offers?.find((o) => o.identifier === '001')?.maximumAttendeeCapacity;
    remainingAttendeeCapacity = performance.aggregateOffer?.offers?.find((o) => o.identifier === '001')?.remainingAttendeeCapacity;
    remainingAttendeeCapacityForWheelchair
        = performance.aggregateOffer?.offers?.find((o) => o.identifier === '004')?.remainingAttendeeCapacity;

    reservationCount = performance.aggregateReservation?.reservationCount;
    reservationCountsByTicketType = performance.aggregateOffer?.offers?.map((offer) => {
        return {
            ticketType: <string>offer.id,
            count: offer.aggregateReservation?.reservationCount
        };
    });

    const places = performance.aggregateEntranceGate?.places;
    if (Array.isArray(places)) {
        checkinCountsByWhere = places.map((entranceGate) => {
            return {
                where: <string>entranceGate.identifier,
                checkinCountsByTicketType: <ICheckinCountsByTicketType[]>
                    entranceGate.aggregateOffer?.offers?.map((offer) => {
                        return {
                            ticketType: offer.id,
                            ticketCategory: offer.category?.codeValue,
                            count: offer.aggregateReservation?.useActionCount
                        };
                    })
            };
        });

        checkinCount = places.reduce<number>(
            (a, b) => {
                let useActionCount = a;

                const offers4b = b.aggregateOffer?.offers;
                if (Array.isArray(offers4b)) {
                    useActionCount += offers4b.reduce<number>(
                        (a2, b2) => {
                            return a2 + Number(b2.aggregateReservation?.useActionCount);
                        },
                        0
                    );

                }

                return useActionCount;
            },
            0
        );

    }

    return {
        ...performance,
        ...{
            evServiceStatus: evServiceStatus,
            onlineSalesStatus: onlineSalesStatus,
            tourNumber: tourNumber
        },

        ...(typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined,
        ...(typeof remainingAttendeeCapacity === 'number') ? { remainingAttendeeCapacity } : undefined,
        ...(typeof remainingAttendeeCapacityForWheelchair === 'number') ? { remainingAttendeeCapacityForWheelchair } : undefined,
        ...(typeof reservationCount === 'number') ? { reservationCount } : undefined,
        ...(Array.isArray(reservationCountsByTicketType)) ? { reservationCountsByTicketType } : undefined,
        // ...(Array.isArray(checkinCountsByWhere)) ? { checkinCountsByWherePreview: checkinCountsByWhere } : undefined,
        // ...(typeof checkinCount === 'number') ? { checkinCountPreview: checkinCount } : undefined,
        ...{ checkinCountsByWhere, checkinCount }
    };
}

const previewRouter = Router();

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: <string>process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.CINERINO_CLIENT_ID,
    clientSecret: <string>process.env.CINERINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});

// 集計データーつきのパフォーマンス検索
previewRouter.get(
    '/projects/:projectId/performancesWithAggregation',
    async (req, res, next) => {
        try {
            const conditions: ISearchConditions = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Number(req.query.limit) : 100,
                page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : 1,
                sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: 1 },
                startFrom: (typeof req.query.startFrom === 'string')
                    ? moment(req.query.startFrom)
                        .toDate()
                    : undefined,
                startThrough: (typeof req.query.startThrough === 'string')
                    ? moment(req.query.startThrough)
                        .toDate()
                    : undefined
            };

            let searchPerformanceResult: ISearchResult;

            // chevreで取得
            const eventService = new cinerinoapi.service.Event({
                auth: cinerinoAuthClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.params.projectId }
            });

            const searchEventsResult = await eventService.search({
                typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent,
                limit: conditions.limit,
                page: conditions.page,
                sort: { startDate: 1 },
                startFrom: conditions.startFrom,
                startThrough: conditions.startThrough,
                ...{
                    $projection: {
                        checkInCount: 0,
                        maximumAttendeeCapacity: 0,
                        remainingAttendeeCapacity: 0
                    }
                }
            });
            searchPerformanceResult = searchEventsResult.data.map(performance2result);

            res.json(searchPerformanceResult);
        } catch (error) {
            next(new cinerinoapi.factory.errors.ServiceUnavailable(error.message));
        }
    }
);

// 入場場所検索
previewRouter.get(
    '/projects/:projectId/places/checkinGate',
    async (req, res, next) => {
        try {
            // chevreで取得
            const placeService = new cinerinoapi.service.Place({
                auth: cinerinoAuthClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.params.projectId }
            });
            const searchMovieTheatersResult = await placeService.searchMovieTheaters({});
            const movieTheater = searchMovieTheatersResult.data.shift();
            if (movieTheater === undefined) {
                throw new cinerinoapi.factory.errors.NotFound('MovieTheater');
            }

            let entranceGates = movieTheater.hasEntranceGate;
            if (!Array.isArray(entranceGates)) {
                entranceGates = [];
            }

            res.json(entranceGates.map((g) => {
                return {
                    ...g,
                    name: (typeof g.name === 'string') ? g.name : String(g.name?.ja)
                };
            }));
        } catch (error) {
            next(new cinerinoapi.factory.errors.ServiceUnavailable(error.message));
        }
    }
);

export default previewRouter;
