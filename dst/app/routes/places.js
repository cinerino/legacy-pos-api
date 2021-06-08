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
 * 施設ルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const express = require("express");
const express_validator_1 = require("express-validator");
const permitScopes_1 = require("../middlewares/permitScopes");
const rateLimit_1 = require("../middlewares/rateLimit");
const validator_1 = require("../middlewares/validator");
const placesRouter = express.Router();
placesRouter.use(rateLimit_1.default);
/**
 * 施設検索
 */
placesRouter.get(`/${cinerinoapi.factory.placeType.MovieTheater}`, permitScopes_1.default([]), ...[
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
        const placeService = new cinerinoapi.service.Place({
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id },
            auth: req.authClient
        });
        const params = req.query;
        const searchConditions = {
            // tslint:disable-next-line:no-magic-numbers
            limit: (typeof params.limit === 'number') ? Math.min(params.limit, 100) : 100,
            page: (typeof params.page === 'number') ? Math.max(params.page, 1) : 1,
            sort: { branchCode: 1 }
        };
        const searchResult = yield placeService.searchMovieTheaters(searchConditions);
        res.json(searchResult.data.map(movieTheater2movieTheater4pos));
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placesRouter;
function movieTheater2movieTheater4pos(movieTheater) {
    var _a, _b;
    return {
        additionalProperty: (Array.isArray(movieTheater.additionalProperty)) ? movieTheater.additionalProperty : [],
        branchCode: movieTheater.branchCode,
        name: Object.assign(Object.assign({}, (typeof ((_a = movieTheater.name) === null || _a === void 0 ? void 0 : _a.en) === 'string') ? { en: movieTheater.name.en } : undefined), (typeof ((_b = movieTheater.name) === null || _b === void 0 ? void 0 : _b.ja) === 'string') ? { ja: movieTheater.name.ja } : undefined)
    };
}
