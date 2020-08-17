"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * プロジェクト詳細ルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const express = require("express");
const events_1 = require("../events");
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
projectDetailRouter.use('/performances', events_1.default);
projectDetailRouter.use('/transactions/placeOrder', placeOrder_1.default);
projectDetailRouter.use('/transactions/returnOrder', returnOrder_1.default);
exports.default = projectDetailRouter;
