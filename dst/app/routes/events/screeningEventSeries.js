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
 * 施設コンテンツルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const express = require("express");
const express_validator_1 = require("express-validator");
const permitScopes_1 = require("../../middlewares/permitScopes");
const rateLimit_1 = require("../../middlewares/rateLimit");
const validator_1 = require("../../middlewares/validator");
const screeningEventSeriesRouter = express.Router();
screeningEventSeriesRouter.use(rateLimit_1.default);
/**
 * イベント検索
 */
screeningEventSeriesRouter.get('', permitScopes_1.default([]), ...[
    express_validator_1.query('limit')
        .optional()
        .isInt()
        .toInt(),
    express_validator_1.query('page')
        .optional()
        .isInt()
        .toInt()
], ...[], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id },
            auth: req.authClient
        });
        const params = req.query;
        const searchConditions = {
            // tslint:disable-next-line:no-magic-numbers
            limit: (typeof params.limit === 'number') ? Math.min(params.limit, 100) : 100,
            page: (typeof params.page === 'number') ? Math.max(params.page, 1) : 1,
            sort: { startDate: 1 },
            typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEventSeries
        };
        const searchResult = yield eventService.search(searchConditions);
        res.json(searchResult.data.map(event2event4pos));
    }
    catch (error) {
        next(error);
    }
}));
exports.default = screeningEventSeriesRouter;
function event2event4pos(event) {
    return {
        additionalProperty: (Array.isArray(event.additionalProperty)) ? event.additionalProperty : [],
        id: event.id
    };
}
