"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchByChevre = void 0;
const cinerinoapi = require("@cinerino/sdk");
const moment = require("moment-timezone");
const EXCLUDE_TICKET_TYPES_IN_EVENTS = process.env.EXCLUDE_TICKET_TYPES_IN_EVENTS === '1';
function searchByChevre(params, clientId) {
    return (eventService) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        let events;
        let excludeTicketTypes = EXCLUDE_TICKET_TYPES_IN_EVENTS;
        // performanceId指定の場合はこちら
        if (typeof params.performanceId === 'string') {
            const event = yield eventService.findById({ id: params.performanceId });
            events = [event];
            excludeTicketTypes = false;
        }
        else {
            const searchConditions = Object.assign(Object.assign({ 
                // tslint:disable-next-line:no-magic-numbers
                limit: (params.limit !== undefined) ? Math.min(Number(params.limit), 100) : 100, page: (params.page !== undefined) ? Math.max(Number(params.page), 1) : 1, sort: { startDate: 1 }, typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent }, (typeof params.day === 'string' && params.day.length > 0)
                ? {
                    startFrom: moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .toDate(),
                    startThrough: moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate()
                }
                : undefined), {
                $projection: {
                    aggregateEntranceGate: 0,
                    aggregateReservation: 0,
                    hasOfferCatalog: 0,
                    location: 0,
                    superEvent: 0,
                    workPerformed: 0
                }
            });
            const searchResult = yield eventService.search(searchConditions);
            events = searchResult.data;
        }
        // 検索結果があれば、ひとつめのイベントのオファーを検索
        if (events.length === 0) {
            return [];
        }
        const firstEvent = events[0];
        const offers = yield eventService.searchTicketOffers({
            event: { id: firstEvent.id },
            seller: {
                typeOf: (_b = (_a = firstEvent.offers) === null || _a === void 0 ? void 0 : _a.seller) === null || _b === void 0 ? void 0 : _b.typeOf,
                id: (_d = (_c = firstEvent.offers) === null || _c === void 0 ? void 0 : _c.seller) === null || _d === void 0 ? void 0 : _d.id
            },
            store: {
                id: clientId
            }
        });
        const unitPriceOffers = offers.map((o) => {
            // tslint:disable-next-line:max-line-length
            const unitPriceSpec = o.priceSpecification.priceComponent.find((p) => p.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification);
            return Object.assign(Object.assign({}, o), { priceSpecification: unitPriceSpec });
        });
        return events
            .map((event) => {
            return event2event4pos({ event, unitPriceOffers, excludeTicketTypes });
        });
    });
}
exports.searchByChevre = searchByChevre;
function event2event4pos(params) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const event = params.event;
    const unitPriceOffers = params.unitPriceOffers;
    // デフォルトはイベントのremainingAttendeeCapacity
    let seatStatus = event.remainingAttendeeCapacity;
    // const normalOffer = unitPriceOffers.find((o) => o.additionalProperty?.find((p) => p.name === 'category')?.value === 'Normal');
    // const wheelchairOffer =
    //     unitPriceOffers.find((o) => o.additionalProperty?.find((p) => p.name === 'category')?.value === 'Wheelchair');
    // 一般座席の残席数
    // aggregateOfferのcategoryで判定する
    const normalOfferRemainingAttendeeCapacity = (_c = (_b = (_a = event.aggregateOffer) === null || _a === void 0 ? void 0 : _a.offers) === null || _b === void 0 ? void 0 : _b.find((o) => { var _a; return ((_a = o.category) === null || _a === void 0 ? void 0 : _a.codeValue) === 'Normal'; })) === null || _c === void 0 ? void 0 : _c.remainingAttendeeCapacity;
    if (typeof normalOfferRemainingAttendeeCapacity === 'number') {
        seatStatus = normalOfferRemainingAttendeeCapacity;
    }
    // 車椅子座席の残席数
    const wheelchairAvailable = (_f = (_e = (_d = event.aggregateOffer) === null || _d === void 0 ? void 0 : _d.offers) === null || _e === void 0 ? void 0 : _e.find((o) => { var _a; return ((_a = o.category) === null || _a === void 0 ? void 0 : _a.codeValue) === 'Wheelchair'; })) === null || _f === void 0 ? void 0 : _f.remainingAttendeeCapacity;
    const tourNumber = (_h = (_g = event.additionalProperty) === null || _g === void 0 ? void 0 : _g.find((p) => p.name === 'tourNumber')) === null || _h === void 0 ? void 0 : _h.value;
    return {
        id: event.id,
        attributes: Object.assign(Object.assign(Object.assign(Object.assign({ day: moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('YYYYMMDD'), open_time: moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('HHmm'), start_time: moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('HHmm'), end_time: moment(event.endDate)
                .tz('Asia/Tokyo')
                .format('HHmm'), online_sales_status: (event.eventStatus === cinerinoapi.factory.chevre.eventStatusType.EventScheduled)
                ? 'Normal'
                : 'Suspended' }, (params.excludeTicketTypes)
            ? undefined
            : {
                ticket_types: unitPriceOffers.map((unitPriceOffer) => {
                    var _a, _b, _c, _d;
                    const availableNum = (_c = (_b = (_a = event.aggregateOffer) === null || _a === void 0 ? void 0 : _a.offers) === null || _b === void 0 ? void 0 : _b.find((o) => o.id === unitPriceOffer.id)) === null || _c === void 0 ? void 0 : _c.remainingAttendeeCapacity;
                    return {
                        name: {
                            en: unitPriceOffer.name.en,
                            ja: unitPriceOffer.name.ja
                        },
                        id: String(unitPriceOffer.identifier),
                        charge: (_d = unitPriceOffer.priceSpecification) === null || _d === void 0 ? void 0 : _d.price,
                        available_num: availableNum
                    };
                })
            }), (typeof seatStatus === 'number') ? { seat_status: String(seatStatus) } : undefined), (typeof wheelchairAvailable === 'number') ? { wheelchair_available: wheelchairAvailable } : undefined), (typeof tourNumber === 'string') ? { tour_number: tourNumber } : undefined)
    };
}
