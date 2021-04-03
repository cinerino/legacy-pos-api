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
 * コンテンツルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const express = require("express");
const express_validator_1 = require("express-validator");
const permitScopes_1 = require("../middlewares/permitScopes");
const rateLimit_1 = require("../middlewares/rateLimit");
const validator_1 = require("../middlewares/validator");
const movieRouter = express.Router();
movieRouter.use(rateLimit_1.default);
/**
 * コンテンツ検索
 */
movieRouter.get('', 
// permitScopes(['pos']),
permitScopes_1.default([]), ...[
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
        const creativeWorkService = new cinerinoapi.service.CreativeWork({
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id },
            auth: req.authClient
        });
        const params = req.query;
        const searchConditions = Object.assign({ 
            // tslint:disable-next-line:no-magic-numbers
            limit: (typeof params.limit === 'number') ? Math.min(params.limit, 100) : 100, page: (typeof params.page === 'number') ? Math.max(params.page, 1) : 1, sort: { identifier: 1 } }, {
        // $projection: {
        //     aggregateEntranceGate: 0,
        //     aggregateOffer: 0,
        //     aggregateReservation: 0,
        //     hasOfferCatalog: 0
        // }
        });
        const searchResult = yield creativeWorkService.searchMovies(searchConditions);
        res.json(searchResult.data.map(movie2movie4pos));
    }
    catch (error) {
        next(error);
    }
}));
exports.default = movieRouter;
function movie2movie4pos(movie) {
    var _a;
    return Object.assign(Object.assign(Object.assign(Object.assign({ additionalProperty: (Array.isArray(movie.additionalProperty)) ? movie.additionalProperty : [] }, (typeof movie.contentRating === 'string') ? { contentRating: movie.contentRating } : undefined), (movie.datePublished !== null && movie.datePublished !== undefined) ? { datePublished: movie.datePublished } : undefined), (typeof movie.headline === 'string') ? { headline: movie.headline } : undefined), { identifier: movie.identifier, name: Object.assign({}, (typeof movie.name === 'string')
            ? { ja: movie.name }
            : (typeof ((_a = movie.name) === null || _a === void 0 ? void 0 : _a.ja) === 'string') ? { ja: movie.name.ja } : undefined) });
}
