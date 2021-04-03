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
/**
 * イベントルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const express = require("express");
const express_validator_1 = require("express-validator");
const permitScopes_1 = require("../middlewares/permitScopes");
const rateLimit_1 = require("../middlewares/rateLimit");
const validator_1 = require("../middlewares/validator");
const eventsRouter = express.Router();
eventsRouter.use(rateLimit_1.default);
/**
 * イベント検索
 */
eventsRouter.get('', 
// permitScopes(['pos']),
permitScopes_1.default([]), ...[
    express_validator_1.query('limit')
        .optional()
        .isInt()
        .toInt(),
    express_validator_1.query('page')
        .optional()
        .isInt()
        .toInt(),
    express_validator_1.query('startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('startThrough')
        .optional()
        .isISO8601()
        .toDate()
], ...[], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id },
            auth: req.authClient
        });
        const params = req.query;
        const searchConditions = Object.assign({ 
            // tslint:disable-next-line:no-magic-numbers
            limit: (typeof params.limit === 'number') ? Math.min(params.limit, 100) : 100, page: (typeof params.page === 'number') ? Math.max(params.page, 1) : 1, sort: { startDate: 1 }, typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent, startFrom: params.startFrom, startThrough: params.startThrough }, {
            $projection: {
                aggregateEntranceGate: 0,
                aggregateOffer: 0,
                aggregateReservation: 0,
                hasOfferCatalog: 0
                // offers: 0,
                // workPerformed: 0
            }
        });
        const searchResult = yield eventService.search(searchConditions);
        res.json(searchResult.data.map(event2event4pos));
    }
    catch (error) {
        next(error);
    }
}));
exports.default = eventsRouter;
function event2event4pos(event) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return Object.assign(Object.assign(Object.assign(Object.assign({ additionalProperty: (Array.isArray(event.additionalProperty)) ? event.additionalProperty : [], id: event.id, endDate: event.endDate, eventStatus: event.eventStatus, startDate: event.startDate }, (event.doorTime !== undefined) ? { doorTime: event.doorTime } : undefined), (typeof event.maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity: event.maximumAttendeeCapacity } : undefined), (typeof event.remainingAttendeeCapacity === 'number')
        ? { remainingAttendeeCapacity: event.remainingAttendeeCapacity }
        : undefined), { location: Object.assign(Object.assign(Object.assign({}, (typeof ((_a = event.location.address) === null || _a === void 0 ? void 0 : _a.ja) === 'string') ? { address: event.location.address } : undefined), (typeof event.location.branchCode === 'string') ? { branchCode: event.location.branchCode } : undefined), (typeof ((_b = event.location.name) === null || _b === void 0 ? void 0 : _b.ja) === 'string') ? { name: event.location.name } : undefined), offers: Object.assign(Object.assign({}, (((_c = event.offers) === null || _c === void 0 ? void 0 : _c.validFrom) !== undefined) ? { validFrom: event.offers.validFrom } : undefined), (((_d = event.offers) === null || _d === void 0 ? void 0 : _d.validThrough) !== undefined) ? { validThrough: event.offers.validThrough } : undefined), superEvent: Object.assign(Object.assign(Object.assign({}, (typeof ((_e = event.superEvent.description) === null || _e === void 0 ? void 0 : _e.ja) === 'string') ? { description: event.superEvent.description } : undefined), (typeof ((_f = event.superEvent.dubLanguage) === null || _f === void 0 ? void 0 : _f.name) === 'string')
            ? { dubLanguage: { name: event.superEvent.dubLanguage.name } }
            : undefined), (typeof ((_g = event.superEvent.subtitleLanguage) === null || _g === void 0 ? void 0 : _g.name) === 'string')
            ? { subtitleLanguage: { name: event.superEvent.subtitleLanguage.name } }
            : undefined), workPerformed: Object.assign(Object.assign(Object.assign({}, (typeof ((_h = event.workPerformed) === null || _h === void 0 ? void 0 : _h.headline) === 'string') ? { headline: event.workPerformed.headline } : undefined), (typeof ((_j = event.workPerformed) === null || _j === void 0 ? void 0 : _j.contentRating) === 'string') ? { contentRating: event.workPerformed.contentRating } : undefined), (typeof ((_k = event.workPerformed) === null || _k === void 0 ? void 0 : _k.duration) === 'string') ? { duration: event.workPerformed.duration } : undefined) });
}
