"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * プロジェクト詳細ルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const express = require("express");
const events_1 = require("../events");
const movie_1 = require("../movie");
const performances_1 = require("../performances");
const placeOrder_1 = require("../transactions/placeOrder");
const returnOrder_1 = require("../transactions/returnOrder");
const projectDetailRouter = express.Router();
projectDetailRouter.use((req, _, next) => {
    var _a;
    // プロジェクト未指定は拒否
    if (typeof ((_a = req.project) === null || _a === void 0 ? void 0 : _a.id) !== 'string') {
        next(new cinerinoapi.factory.errors.Forbidden('project not specified'));
        return;
    }
    next();
});
projectDetailRouter.use('/creativeWorks/movie', movie_1.default);
projectDetailRouter.use('/events', events_1.default);
projectDetailRouter.use('/performances', performances_1.default);
projectDetailRouter.use('/transactions/placeOrder', placeOrder_1.default);
projectDetailRouter.use('/transactions/returnOrder', returnOrder_1.default);
exports.default = projectDetailRouter;
