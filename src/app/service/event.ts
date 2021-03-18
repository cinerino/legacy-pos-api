import * as cinerinoapi from '@cinerino/sdk';
import * as moment from 'moment-timezone';

const EXCLUDE_TICKET_TYPES_IN_EVENTS = process.env.EXCLUDE_TICKET_TYPES_IN_EVENTS === '1';

export interface ITicketType {
    charge?: number;
    name: {
        en?: string;
        ja?: string;
    };
    id?: string;
    available_num?: number;
}

export interface IEvent4pos {
    id: string;
    attributes: {
        day: string;
        open_time: string;
        start_time: string;
        end_time: string;
        seat_status?: string;
        tour_number?: string;
        wheelchair_available?: number;
        ticket_types?: ITicketType[];
        online_sales_status: string;
    };
}

export interface ISearchConditions4pos {
    page?: number;
    limit?: number;
    day?: string;
    performanceId?: string;
}

export function searchByChevre(params: ISearchConditions4pos, clientId: string) {
    return async (eventService: cinerinoapi.service.Event): Promise<IEvent4pos[]> => {
        let events: cinerinoapi.factory.chevre.event.screeningEvent.IEvent[];

        let excludeTicketTypes = EXCLUDE_TICKET_TYPES_IN_EVENTS;

        // performanceId指定の場合はこちら
        if (typeof params.performanceId === 'string') {
            const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({ id: params.performanceId });
            events = [event];
            excludeTicketTypes = false;
        } else {
            const searchConditions: cinerinoapi.factory.chevre.event.screeningEvent.ISearchConditions = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (params.limit !== undefined) ? Math.min(Number(params.limit), 100) : 100,
                page: (params.page !== undefined) ? Math.max(Number(params.page), 1) : 1,
                sort: { startDate: 1 },
                typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent,
                ...(typeof params.day === 'string' && params.day.length > 0)
                    ? {
                        startFrom: moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .toDate(),
                        startThrough: moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .add(1, 'day')
                            .toDate()
                    }
                    : undefined,
                ...{
                    $projection: {
                        aggregateEntranceGate: 0,
                        aggregateReservation: 0,
                        hasOfferCatalog: 0,
                        location: 0,
                        superEvent: 0,
                        workPerformed: 0
                    }
                }
            };

            const searchResult = await eventService.search(searchConditions);

            events = searchResult.data;
        }

        // 検索結果があれば、ひとつめのイベントのオファーを検索
        if (events.length === 0) {
            return [];
        }

        const firstEvent = events[0];

        const offers = await eventService.searchTicketOffers({
            event: { id: firstEvent.id },
            seller: {
                typeOf: <cinerinoapi.factory.chevre.organizationType>firstEvent.offers?.seller?.typeOf,
                id: <string>firstEvent.offers?.seller?.id
            },
            store: {
                id: clientId
            }
        });

        const unitPriceOffers: cinerinoapi.factory.chevre.offer.IUnitPriceOffer[] = offers.map((o) => {
            // tslint:disable-next-line:max-line-length
            const unitPriceSpec = <cinerinoapi.factory.chevre.priceSpecification.IPriceSpecification<cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification>>
                o.priceSpecification.priceComponent.find(
                    (p) => p.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                );

            return {
                ...o,
                priceSpecification: unitPriceSpec
            };
        });

        return events
            .map((event) => {
                return event2event4pos({ event, unitPriceOffers, excludeTicketTypes });
            });
    };
}

function event2event4pos(params: {
    event: cinerinoapi.factory.chevre.event.screeningEvent.IEvent;
    unitPriceOffers: cinerinoapi.factory.chevre.offer.IUnitPriceOffer[];
    excludeTicketTypes: boolean;
}): IEvent4pos {
    const event = params.event;
    const unitPriceOffers = params.unitPriceOffers;

    // デフォルトはイベントのremainingAttendeeCapacity
    let seatStatus = event.remainingAttendeeCapacity;

    const normalOffer = unitPriceOffers.find((o) => o.additionalProperty?.find((p) => p.name === 'category')?.value === 'Normal');
    const wheelchairOffer = unitPriceOffers.find((o) => o.additionalProperty?.find((p) => p.name === 'category')?.value === 'Wheelchair');

    // 一般座席の残席数
    const normalOfferRemainingAttendeeCapacity =
        event.aggregateOffer?.offers?.find((o) => o.id === normalOffer?.id)?.remainingAttendeeCapacity;
    if (typeof normalOfferRemainingAttendeeCapacity === 'number') {
        seatStatus = normalOfferRemainingAttendeeCapacity;
    }

    // 車椅子座席の残席数
    const wheelchairAvailable = event.aggregateOffer?.offers?.find((o) => o.id === wheelchairOffer?.id)?.remainingAttendeeCapacity;

    const tourNumber = event.additionalProperty?.find((p) => p.name === 'tourNumber')?.value;

    return {
        id: event.id,
        attributes: {
            day: moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('YYYYMMDD'),
            open_time: moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('HHmm'),
            start_time: moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('HHmm'),
            end_time: moment(event.endDate)
                .tz('Asia/Tokyo')
                .format('HHmm'),
            online_sales_status: (event.eventStatus === cinerinoapi.factory.chevre.eventStatusType.EventScheduled)
                ? 'Normal'
                : 'Suspended',
            ...(params.excludeTicketTypes)
                ? undefined
                : {
                    ticket_types: unitPriceOffers.map((unitPriceOffer) => {
                        const availableNum =
                            event.aggregateOffer?.offers?.find((o) => o.id === unitPriceOffer.id)?.remainingAttendeeCapacity;

                        return {
                            name: {
                                en: (<cinerinoapi.factory.chevre.multilingualString>unitPriceOffer.name).en,
                                ja: (<cinerinoapi.factory.chevre.multilingualString>unitPriceOffer.name).ja
                            },
                            id: String(unitPriceOffer.identifier), // POSに受け渡すのは券種IDでなく券種コードなので要注意
                            charge: unitPriceOffer.priceSpecification?.price,
                            available_num: availableNum
                        };
                    })
                },
            ...(typeof seatStatus === 'number') ? { seat_status: String(seatStatus) } : undefined,
            ...(typeof wheelchairAvailable === 'number') ? { wheelchair_available: wheelchairAvailable } : undefined,
            ...(typeof tourNumber === 'string') ? { tour_number: tourNumber } : undefined
        }
    };
}
