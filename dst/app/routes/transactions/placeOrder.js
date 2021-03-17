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
exports.ORDERS_KEY_PREFIX = void 0;
/**
 * 注文取引ルーター(POS専用)
 */
const cinerinoapi = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const node_fetch_1 = require("node-fetch");
const redis = require("redis");
const permitScopes_1 = require("../../middlewares/permitScopes");
const rateLimit_1 = require("../../middlewares/rateLimit");
const validator_1 = require("../../middlewares/validator");
const CODE_EXPIRES_IN_SECONDS = 8035200; // 93日
const WAITER_SCOPE = process.env.WAITER_SCOPE;
const TRANSACTION_TTL = 3600;
const TRANSACTION_KEY_PREFIX = 'cinerino-legacy-pos-api:placeOrder:';
const TRANSACTION_AMOUNT_TTL = TRANSACTION_TTL;
const TRANSACTION_AMOUNT_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}amount:`;
const ORDERS_TTL = 86400;
exports.ORDERS_KEY_PREFIX = 'cinerino-legacy-pos-api:orders:';
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
});
function publishWaiterScope(params) {
    return __awaiter(this, void 0, void 0, function* () {
        // WAITER許可証を取得
        const response = yield node_fetch_1.default(`${process.env.WAITER_ENDPOINT}/projects/${params.project.id}/passports`, {
            method: 'POST',
            body: JSON.stringify({ scope: WAITER_SCOPE }),
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            let message = 'Waiter unavailable';
            try {
                message = JSON.stringify(yield response.json());
            }
            catch (error) {
                // no op
            }
            throw new cinerinoapi.factory.errors.ServiceUnavailable(message);
        }
        const { token } = yield response.json();
        return token;
    });
}
const placeOrderTransactionsRouter = express_1.Router();
placeOrderTransactionsRouter.use(rateLimit_1.default);
placeOrderTransactionsRouter.post('/start', permitScopes_1.default(['pos']), ...[
    express_validator_1.body('expires')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
        .isISO8601()
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        const sellerService = new cinerinoapi.service.Seller({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        let seller;
        if (typeof ((_a = req.body.seller) === null || _a === void 0 ? void 0 : _a.id) === 'string') {
            seller = yield sellerService.findById({ id: req.body.seller.id });
        }
        else {
            // 販売者の指定がなければ自動選択
            const searchSellersResult = yield sellerService.search({
                limit: 1
            });
            seller = searchSellersResult.data.shift();
            if (seller === undefined) {
                throw new Error('Seller not found');
            }
        }
        // WAITER許可証を取得
        const token = yield publishWaiterScope({ project: { id: req.project.id } });
        const expires = moment(req.body.expires)
            .toDate();
        const transaction = yield placeOrderService.start({
            expires: expires,
            object: {
                passport: { token }
            },
            seller: {
                typeOf: seller.typeOf,
                id: String(seller.id)
            }
        });
        res.status(http_status_1.CREATED)
            .json({
            id: transaction.id,
            agent: transaction.agent,
            seller: transaction.seller,
            expires: transaction.expires,
            startDate: transaction.startDate
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 購入者情報を変更する
 */
// tslint:disable-next-line:use-default-type-parameter
placeOrderTransactionsRouter.put('/:transactionId/customerContact', permitScopes_1.default(['pos']), ...[
    express_validator_1.body('last_name')
        .not()
        .isEmpty()
        .withMessage(() => 'required'),
    express_validator_1.body('first_name')
        .not()
        .isEmpty()
        .withMessage(() => 'required'),
    express_validator_1.body('tel')
        .not()
        .isEmpty()
        .withMessage(() => 'required'),
    express_validator_1.body('email')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        const profile = Object.assign(Object.assign({}, req.body), { id: req.user.sub, givenName: (typeof req.body.first_name === 'string') ? req.body.first_name : '', familyName: (typeof req.body.last_name === 'string') ? req.body.last_name : '', telephone: (typeof req.body.tel === 'string') ? req.body.tel : '', telephoneRegion: (typeof req.body.address === 'string') ? req.body.address : '' });
        yield placeOrderService.setProfile({
            id: req.params.transactionId,
            agent: profile
        });
        res.status(http_status_1.CREATED)
            .json(Object.assign(Object.assign({}, profile), { 
            // POSへの互換性維持のために値補完
            last_name: profile.familyName, first_name: profile.givenName, tel: profile.telephone }));
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/seatReservation', permitScopes_1.default(['pos']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!Array.isArray(req.body.offers)) {
            req.body.offers = [];
        }
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        const action = yield placeOrderService.createSeatReservationAuthorization({
            transactionId: req.params.transactionId,
            performanceId: req.body.performance_id,
            offers: req.body.offers
        });
        const actionResult = action.result;
        if (actionResult !== undefined) {
            // 金額保管
            const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
            const amount = actionResult.price;
            yield new Promise((resolve, reject) => {
                redisClient.multi()
                    .set(amountKey, amount.toString())
                    .expire(amountKey, TRANSACTION_AMOUNT_TTL)
                    .exec((err) => {
                    if (err !== null) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        res.status(http_status_1.CREATED)
            // responseはアクションIDのみで十分
            .json({ id: action.id });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['pos']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        yield placeOrderService.voidSeatReservation({
            id: req.params.actionId,
            purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: req.params.transactionId }
        });
        // 金額リセット
        const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
        yield new Promise((resolve, reject) => {
            redisClient.multi()
                .set(amountKey, '0')
                .expire(amountKey, TRANSACTION_AMOUNT_TTL)
                .exec((err) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['pos']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    try {
        // クライアントがPOSの場合、決済方法承認アクションを自動生成
        const paymentService = new cinerinoapi.service.Payment({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        // 金額取得
        const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
        const amount = yield new Promise((resolve, reject) => {
            redisClient.get(amountKey, (err, reply) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(Number(reply));
                }
            });
        });
        yield paymentService.authorizeAnyPayment({
            object: {
                typeOf: cinerinoapi.factory.action.authorize.paymentMethod.any.ResultType.Payment,
                paymentMethod: cinerinoapi.factory.chevre.paymentMethodType.Cash,
                name: cinerinoapi.factory.chevre.paymentMethodType.Cash,
                additionalProperty: [],
                amount: amount
            },
            purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: req.params.transactionId }
        });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        const transactionResult = yield placeOrderService.confirm({
            id: req.params.transactionId
        });
        const confirmationNumber = (_c = (_b = transactionResult.order.identifier) === null || _b === void 0 ? void 0 : _b.find((p) => p.name === 'confirmationNumber')) === null || _c === void 0 ? void 0 : _c.value;
        if (confirmationNumber === undefined) {
            throw new cinerinoapi.factory.errors.ServiceUnavailable('confirmationNumber not found');
        }
        // 返品できるようにしばし注文情報を保管
        const orderKey = `${exports.ORDERS_KEY_PREFIX}${confirmationNumber}`;
        yield new Promise((resolve, reject) => {
            redisClient.multi()
                .set(orderKey, JSON.stringify(transactionResult.order))
                .expire(orderKey, ORDERS_TTL)
                .exec((err) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        // 万が一コードを発行できないケースもあるので、考慮すること
        const code = yield publishCode(req, transactionResult.order, req.params.transactionId);
        res.status(http_status_1.CREATED)
            .json({
            orderNumber: transactionResult.order.orderNumber,
            confirmationNumber: transactionResult.order.confirmationNumber,
            // POSへのレスポンスとしてeventReservations属性を生成
            eventReservations: transactionResult.order.acceptedOffers
                .map((o) => {
                const r = o.itemOffered;
                let qrStr = r.id;
                if (typeof code === 'string' && code.length > 0) {
                    qrStr += `@${code}`;
                }
                return {
                    qr_str: qrStr,
                    payment_no: transactionResult.order.confirmationNumber,
                    performance: r.reservationFor.id
                };
            })
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placeOrderTransactionsRouter;
function publishCode(req, order, transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const orderService = new cinerinoapi.service.Order({
            auth: req.authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: req.project.id }
        });
        try {
            // まず注文作成(非同期処理が間に合わない可能性ありなので)
            yield orderService.placeOrder({
                object: {
                    orderNumber: order.orderNumber,
                    confirmationNumber: order.confirmationNumber
                },
                purpose: {
                    typeOf: cinerinoapi.factory.transactionType.PlaceOrder,
                    id: transactionId
                }
            });
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
        // 注文承認
        let code;
        try {
            const authorizeOrderResult = yield orderService.authorize({
                object: {
                    orderNumber: order.orderNumber,
                    customer: { telephone: order.customer.telephone }
                },
                result: {
                    expiresInSeconds: CODE_EXPIRES_IN_SECONDS
                }
            });
            code = authorizeOrderResult.code;
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
        return code;
    });
}
