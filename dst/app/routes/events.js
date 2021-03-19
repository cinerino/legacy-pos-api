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
eventsRouter.get('', permitScopes_1.default(['pos']), ...[
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
                hasOfferCatalog: 0,
                offers: 0,
                workPerformed: 0
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
    var _a, _b;
    return Object.assign(Object.assign(Object.assign(Object.assign({ id: event.id, location: Object.assign(Object.assign({}, (typeof event.location.branchCode === 'string') ? { branchCode: event.location.branchCode } : undefined), (typeof ((_a = event.location.name) === null || _a === void 0 ? void 0 : _a.ja) === 'string') ? { name: event.location.name } : undefined), endDate: event.endDate, startDate: event.startDate, maximumAttendeeCapacity: event.maximumAttendeeCapacity, remainingAttendeeCapacity: event.remainingAttendeeCapacity, eventStatus: event.eventStatus, additionalProperty: (Array.isArray(event.additionalProperty)) ? event.additionalProperty : [] }, (event.doorTime !== undefined) ? { doorTime: event.doorTime } : undefined), (typeof ((_b = event.name) === null || _b === void 0 ? void 0 : _b.ja) === 'string') ? { name: event.name } : undefined), (typeof event.maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity: event.maximumAttendeeCapacity } : undefined), (typeof event.remainingAttendeeCapacity === 'number')
        ? { remainingAttendeeCapacity: event.remainingAttendeeCapacity }
        : undefined);
}
