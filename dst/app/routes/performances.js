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
 * パフォーマンスルーター
 */
const express = require("express");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const rateLimit_1 = require("../middlewares/rateLimit");
const validator_1 = require("../middlewares/validator");
const performance_1 = require("../service/performance");
const performanceRouter = express.Router();
performanceRouter.use(authentication_1.default);
performanceRouter.use(rateLimit_1.default);
/**
 * パフォーマンス検索
 */
performanceRouter.get('', permitScopes_1.default(['transactions', 'pos']), ...[], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield performance_1.searchByChevre(req.query)();
        res.json({ data: events });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = performanceRouter;
