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
const permitScopes_1 = require("../middlewares/permitScopes");
const rateLimit_1 = require("../middlewares/rateLimit");
const validator_1 = require("../middlewares/validator");
const event_1 = require("../service/event");
const performancesRouter = express.Router();
performancesRouter.use(rateLimit_1.default);
/**
 * イベント検索
 */
performancesRouter.get('', permitScopes_1.default([]), ...[], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id },
            auth: req.authClient
        });
        const events = yield event_1.searchByChevre(req.query, req.user.client_id)(eventService);
        res.json({ data: events });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = performancesRouter;
