"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ヘルスチェックルーター
 */
const express = require("express");
const healthRouter = express.Router();
healthRouter.get('', (_, res, next) => {
    try {
        res.send('healthy!');
    }
    catch (error) {
        next(error);
    }
});
exports.default = healthRouter;
