"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 404ハンドラーミドルウェア
 */
const cinerinoapi = require("@cinerino/sdk");
exports.default = (req, __, next) => {
    next(new cinerinoapi.factory.errors.NotFound(`router for [${req.originalUrl}]`));
};
