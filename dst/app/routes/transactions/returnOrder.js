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
 * 注文返品取引ルーター(POS専用)
 */
const cinerinoapi = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment");
const redis = require("redis");
const permitScopes_1 = require("../../middlewares/permitScopes");
const rateLimit_1 = require("../../middlewares/rateLimit");
const validator_1 = require("../../middlewares/validator");
const placeOrder_1 = require("./placeOrder");
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
});
const returnOrderTransactionsRouter = express_1.Router();
returnOrderTransactionsRouter.use(rateLimit_1.default);
/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post('/confirm', permitScopes_1.default(['pos']), ...[
    express_validator_1.body('performance_day')
        .not()
        .isEmpty()
        .withMessage(() => 'required'),
    express_validator_1.body('payment_no')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const returnOrderService = new cinerinoapi.service.transaction.ReturnOrder({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        // 注文取得
        const confirmationNumber = `${req.body.performance_day}${req.body.payment_no}`;
        const key = `${placeOrder_1.ORDERS_KEY_PREFIX}${confirmationNumber}`;
        const order = yield new Promise((resolve, reject) => {
            redisClient.get(key, (err, result) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    if (typeof result === 'string') {
                        resolve(JSON.parse(result));
                    }
                    else {
                        reject(new cinerinoapi.factory.errors.NotFound('Order'));
                    }
                }
            });
        });
        const returnOrderTransaction = yield returnOrderService.start({
            expires: moment()
                .add(1, 'minute')
                .toDate(),
            object: {
                order: {
                    orderNumber: order.orderNumber,
                    customer: { telephone: order.customer.telephone }
                }
            }
        });
        yield returnOrderService.confirm({ id: returnOrderTransaction.id });
        res.status(http_status_1.CREATED)
            .json({
            id: returnOrderTransaction.id
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = returnOrderTransactionsRouter;
