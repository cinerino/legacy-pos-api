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
const USE_NEW_RETURN_ORDER_PARAMS_FROM = (typeof process.env.USE_NEW_RETURN_ORDER_PARAMS_FROM === 'string')
    ? moment(process.env.USE_NEW_RETURN_ORDER_PARAMS_FROM)
        .toDate()
    : undefined;
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
    express_validator_1.oneOf([
        [
            // 廃止予定↓
            express_validator_1.body('performance_day')
                .not()
                .isEmpty()
                .withMessage(() => 'required'),
            express_validator_1.body('payment_no')
                .not()
                .isEmpty()
                .withMessage(() => 'required')
        ],
        [
            express_validator_1.body('orderNumber')
                .not()
                .isEmpty()
                .withMessage(() => 'required'),
            express_validator_1.body('customer.telephone')
                .not()
                .isEmpty()
                .withMessage(() => 'required')
        ]
    ])
], validator_1.default, 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const now = moment();
        const useNewReturnOrderParams = USE_NEW_RETURN_ORDER_PARAMS_FROM instanceof Date
            && moment(USE_NEW_RETURN_ORDER_PARAMS_FROM)
                .isSameOrBefore(now);
        if (useNewReturnOrderParams) {
            if (typeof req.body.orderNumber !== 'string' || req.body.orderNumber.length === 0) {
                throw new cinerinoapi.factory.errors.ArgumentNull('orderNumber');
            }
            if (typeof ((_a = req.body.customer) === null || _a === void 0 ? void 0 : _a.telephone) !== 'string' || req.body.customer.telephone.length === 0) {
                throw new cinerinoapi.factory.errors.ArgumentNull('customer.telephone');
            }
        }
        const deliveryService = new cinerinoapi.service.Delivery({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        const orderService = new cinerinoapi.service.Order({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        const returnOrderService = new cinerinoapi.service.transaction.ReturnOrder({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        let order;
        let returnableOrder;
        if (typeof req.body.performance_day === 'string' && req.body.performance_day.length > 0) {
            // 注文取得
            const confirmationNumber = `${req.body.performance_day}${req.body.payment_no}`;
            const key = `${placeOrder_1.ORDERS_KEY_PREFIX}${confirmationNumber}`;
            order = yield new Promise((resolve, reject) => {
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
        }
        if (typeof req.body.orderNumber === 'string' && req.body.orderNumber.length > 0) {
            order = yield orderService.findOneByOrderNumberAndSomething({
                orderNumber: String(req.body.orderNumber),
                customer: { telephone: String((_b = req.body.customer) === null || _b === void 0 ? void 0 : _b.telephone) }
            });
        }
        if (order !== undefined) {
            // 注文クライアントと返品クライアントの同一性を確認
            if (((_c = order.customer) === null || _c === void 0 ? void 0 : _c.id) !== req.user.client_id) {
                throw new cinerinoapi.factory.errors.Argument('orderNumber', 'client not matched');
            }
            // 注文配送
            if (order.orderStatus !== cinerinoapi.factory.orderStatus.OrderDelivered) {
                let tryCount = 0;
                const MAX_TRY_COUNT = 3;
                while (tryCount < MAX_TRY_COUNT) {
                    try {
                        tryCount += 1;
                        yield deliveryService.sendOrder({
                            object: {
                                orderNumber: order.orderNumber,
                                confirmationNumber: order.confirmationNumber
                            }
                        });
                        break;
                    }
                    catch (error) {
                        // tslint:disable-next-line:no-console
                        console.error(error);
                    }
                }
            }
            returnableOrder = {
                orderNumber: String(order.orderNumber),
                customer: { telephone: String((_d = order.customer) === null || _d === void 0 ? void 0 : _d.telephone) }
            };
        }
        if (returnableOrder === undefined) {
            throw new cinerinoapi.factory.errors.Argument('params');
        }
        const returnOrderTransaction = yield returnOrderService.start({
            expires: moment()
                .add(1, 'minute')
                .toDate(),
            object: {
                order: [returnableOrder]
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
