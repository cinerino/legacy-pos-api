import * as cinerinoapi from '@cinerino/sdk';
import * as moment from 'moment-timezone';

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
        let events: cinerinoapi.factory.event.screeningEvent.IEvent[];

        let excludeTicketTypes = true;

        // performanceId指定の場合はこちら
        if (typeof params.performanceId === 'string') {
            const event = await eventService.findById<cinerinoapi.factory.eventType.ScreeningEvent>({ id: params.performanceId });
            events = [event];
            excludeTicketTypes = false;
        } else {
            const searchConditions: cinerinoapi.factory.event.screeningEvent.ISearchConditions = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (params.limit !== undefined) ? Math.min(Number(params.limit), 100) : 100,
                page: (params.page !== undefined) ? Math.max(Number(params.page), 1) : 1,
                sort: { startDate: 1 },
                typeOf: cinerinoapi.factory.eventType.ScreeningEvent,
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

        let unitPriceOffers: cinerinoapi.factory.offer.IUnitPriceOffer[] = [];

        // オファーリスト除外でなければ、オファー検索
        if (!excludeTicketTypes) {
            const offers = await eventService.searchTicketOffers({
                event: { id: firstEvent.id },
                seller: {
                    typeOf: <cinerinoapi.factory.organizationType>firstEvent.offers?.seller?.typeOf,
                    id: <string>firstEvent.offers?.seller?.id
                },
                store: {
                    id: clientId
                }
            });

            unitPriceOffers = offers.map((o) => {
                // tslint:disable-next-line:max-line-length
                const unitPriceSpec = <cinerinoapi.factory.priceSpecification.IPriceSpecification<cinerinoapi.factory.priceSpecificationType.UnitPriceSpecification>>
                    o.priceSpecification.priceComponent.find(
                        (p) => p.typeOf === cinerinoapi.factory.priceSpecificationType.UnitPriceSpecification
                    );

                return {
                    ...o,
                    priceSpecification: unitPriceSpec
                };
            });
        }

        return events
            .map((event) => {
                return event2event4pos({ event, unitPriceOffers, excludeTicketTypes });
            });
    };
}

function event2event4pos(params: {
    event: cinerinoapi.factory.event.screeningEvent.IEvent;
    unitPriceOffers: cinerinoapi.factory.offer.IUnitPriceOffer[];
    excludeTicketTypes: boolean;
}): IEvent4pos {
    const event = params.event;

    // デフォルトはイベントのremainingAttendeeCapacity
    let seatStatus = event.remainingAttendeeCapacity;

    // const normalOffer = unitPriceOffers.find((o) => o.additionalProperty?.find((p) => p.name === 'category')?.value === 'Normal');
    // const wheelchairOffer =
    //     unitPriceOffers.find((o) => o.additionalProperty?.find((p) => p.name === 'category')?.value === 'Wheelchair');

    // 一般座席の残席数
    // aggregateOfferのcategoryで判定する
    const normalOfferRemainingAttendeeCapacity =
        event.aggregateOffer?.offers?.find((o) => o.category?.codeValue === 'Normal')?.remainingAttendeeCapacity;
    if (typeof normalOfferRemainingAttendeeCapacity === 'number') {
        seatStatus = normalOfferRemainingAttendeeCapacity;
    }

    // 車椅子座席の残席数
    const wheelchairAvailable =
        event.aggregateOffer?.offers?.find((o) => o.category?.codeValue === 'Wheelchair')?.remainingAttendeeCapacity;

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
            online_sales_status: (event.eventStatus === cinerinoapi.factory.eventStatusType.EventScheduled)
                ? 'Normal'
                : 'Suspended',
            ...(params.excludeTicketTypes)
                ? undefined
                : {
                    ticket_types: params.unitPriceOffers.map((unitPriceOffer) => {
                        const availableNum =
                            event.aggregateOffer?.offers?.find((o) => o.id === unitPriceOffer.id)?.remainingAttendeeCapacity;

                        return {
                            name: {
                                en: (<cinerinoapi.factory.multilingualString>unitPriceOffer.name).en,
                                ja: (<cinerinoapi.factory.multilingualString>unitPriceOffer.name).ja
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
