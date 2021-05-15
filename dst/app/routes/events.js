"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * イベントルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const express = require("express");
const screeningEvent_1 = require("./events/screeningEvent");
const screeningEventSeries_1 = require("./events/screeningEventSeries");
const eventsRouter = express.Router();
eventsRouter.use(`/${cinerinoapi.factory.chevre.eventType.ScreeningEvent}`, screeningEvent_1.default);
eventsRouter.use(`/${cinerinoapi.factory.chevre.eventType.ScreeningEventSeries}`, screeningEventSeries_1.default);
exports.default = eventsRouter;
