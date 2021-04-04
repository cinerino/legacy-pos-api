/**
 * 注文取引ルーター(POS専用)
 */
import * as cinerinoapi from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body } from 'express-validator';
import { CREATED, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';
import fetch from 'node-fetch';
import * as redis from 'redis';

import permitScopes from '../../middlewares/permitScopes';
import rateLimit from '../../middlewares/rateLimit';
import validator from '../../middlewares/validator';

const CODE_EXPIRES_IN_SECONDS = 8035200; // 93日
const WAITER_SCOPE = process.env.WAITER_SCOPE;

const TRANSACTION_TTL = 3600;
const TRANSACTION_KEY_PREFIX = 'smarttheater-legacy-pos-api:placeOrder:';
const TRANSACTION_AMOUNT_TTL = TRANSACTION_TTL;
const TRANSACTION_AMOUNT_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}amount:`;

const ORDERS_TTL = 86400;
export const ORDERS_KEY_PREFIX = 'smarttheater-legacy-pos-api:orders:';

const redisClient = redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
});

async function publishWaiterScope(params: { project: { id: string } }): Promise<string> {
    // WAITER許可証を取得
    const response = await fetch(
        `${process.env.WAITER_ENDPOINT}/projects/${params.project.id}/passports`,
        {
            method: 'POST',
            body: JSON.stringify({ scope: WAITER_SCOPE }),
            headers: { 'Content-Type': 'application/json' }
        }
    );
    if (!response.ok) {
        let message = 'Waiter unavailable';
        try {
            message = JSON.stringify(await response.json());
        } catch (error) {
            // no op
        }
        throw new cinerinoapi.factory.errors.ServiceUnavailable(message);
    }
    const { token } = await response.json();

    return token;
}

const placeOrderTransactionsRouter = Router();

placeOrderTransactionsRouter.use(rateLimit);

placeOrderTransactionsRouter.post(
    '/start',
    permitScopes([]),
    ...[
        body('expires')
            .not()
            .isEmpty()
            .withMessage(() => 'required')
            .isISO8601()
    ],
    validator,
    async (req, res, next) => {
        try {
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
                auth: req.authClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });
            const sellerService = new cinerinoapi.service.Seller({
                auth: req.authClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });

            let seller: cinerinoapi.factory.seller.ISeller | undefined;

            if (typeof req.body.seller?.id === 'string') {
                seller = await sellerService.findById({ id: req.body.seller.id });
            } else {
                // 販売者の指定がなければ自動選択
                const searchSellersResult = await sellerService.search({
                    limit: 1
                });
                seller = searchSellersResult.data.shift();
                if (seller === undefined) {
                    throw new Error('Seller not found');
                }
            }

            // WAITER許可証を取得
            const token = await publishWaiterScope({ project: { id: req.project.id } });

            const expires = moment(req.body.expires)
                .toDate();

            const transaction = await placeOrderService.start({
                expires: expires,
                object: {
                    passport: { token }
                },
                seller: {
                    typeOf: seller.typeOf,
                    id: String(seller.id)
                }
            });

            res.status(CREATED)
                .json({
                    id: transaction.id,
                    agent: transaction.agent,
                    seller: transaction.seller,
                    expires: transaction.expires,
                    startDate: transaction.startDate
                });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 購入者情報を変更する
 */
// tslint:disable-next-line:use-default-type-parameter
placeOrderTransactionsRouter.put<ParamsDictionary>(
    '/:transactionId/customerContact',
    permitScopes([]),
    ...[
        body('last_name')
            .not()
            .isEmpty()
            .withMessage(() => 'required'),
        body('first_name')
            .not()
            .isEmpty()
            .withMessage(() => 'required'),
        body('tel')
            .not()
            .isEmpty()
            .withMessage(() => 'required'),
        body('email')
            .not()
            .isEmpty()
            .withMessage(() => 'required')
    ],
    validator,
    async (req, res, next) => {
        try {
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
                auth: req.authClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });

            const profile: cinerinoapi.factory.person.IProfile & {
                telephoneRegion?: string;
            } = {
                ...req.body,
                id: req.user.sub,
                givenName: (typeof req.body.first_name === 'string') ? req.body.first_name : '',
                familyName: (typeof req.body.last_name === 'string') ? req.body.last_name : '',
                telephone: (typeof req.body.tel === 'string') ? req.body.tel : '',
                telephoneRegion: (typeof req.body.address === 'string') ? req.body.address : ''
            };

            await placeOrderService.setProfile({
                id: req.params.transactionId,
                agent: profile
            });

            res.status(CREATED)
                .json({
                    ...profile,
                    // POSへの互換性維持のために値補完
                    last_name: profile.familyName,
                    first_name: profile.givenName,
                    tel: profile.telephone
                });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/seatReservation',
    permitScopes([]),
    validator,
    async (req, res, next) => {
        try {
            if (!Array.isArray(req.body.offers)) {
                req.body.offers = [];
            }

            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
                auth: req.authClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });

            const action = await placeOrderService.createSeatReservationAuthorization({
                transactionId: req.params.transactionId,
                performanceId: req.body.performance_id,
                offers: req.body.offers
            });

            const actionResult = action.result;
            if (actionResult !== undefined) {
                // 金額保管
                const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
                const amount = actionResult.price;
                await new Promise((resolve, reject) => {
                    redisClient.multi()
                        .set(amountKey, amount.toString())
                        .expire(amountKey, TRANSACTION_AMOUNT_TTL)
                        .exec((err) => {
                            if (err !== null) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                });
            }

            res.status(CREATED)
                // responseはアクションIDのみで十分
                .json({ id: action.id });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/seatReservation/:actionId',
    permitScopes([]),
    validator,
    async (req, res, next) => {
        try {
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
                auth: req.authClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });

            await placeOrderService.voidSeatReservation({
                id: req.params.actionId,
                purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: req.params.transactionId }
            });

            // 金額リセット
            const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
            await new Promise((resolve, reject) => {
                redisClient.multi()
                    .set(amountKey, '0')
                    .expire(amountKey, TRANSACTION_AMOUNT_TTL)
                    .exec((err) => {
                        if (err !== null) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
            });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/confirm',
    permitScopes([]),
    validator,
    async (req, res, next) => {
        try {
            // クライアントがPOSの場合、決済方法承認アクションを自動生成
            const paymentService = new cinerinoapi.service.Payment({
                auth: req.authClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });

            // 金額取得
            const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
            const amount = await new Promise<number>((resolve, reject) => {
                redisClient.get(amountKey, (err, reply) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve(Number(reply));
                    }
                });
            });

            await paymentService.authorizeAnyPayment({
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
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });

            const transactionResult = await placeOrderService.confirm({
                id: req.params.transactionId
            });

            const confirmationNumber = transactionResult.order.identifier?.find((p) => p.name === 'confirmationNumber')?.value;
            if (confirmationNumber === undefined) {
                throw new cinerinoapi.factory.errors.ServiceUnavailable('confirmationNumber not found');
            }

            // 返品できるようにしばし注文情報を保管
            const orderKey = `${ORDERS_KEY_PREFIX}${confirmationNumber}`;
            await new Promise((resolve, reject) => {
                redisClient.multi()
                    .set(orderKey, JSON.stringify(transactionResult.order))
                    .expire(orderKey, ORDERS_TTL)
                    .exec((err) => {
                        if (err !== null) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
            });

            // 万が一コードを発行できないケースもあるので、考慮すること
            const code = await publishCode(req, transactionResult.order, req.params.transactionId);

            res.status(CREATED)
                .json({
                    orderNumber: transactionResult.order.orderNumber,
                    confirmationNumber: transactionResult.order.confirmationNumber,
                    // POSへのレスポンスとしてeventReservations属性を生成
                    eventReservations: transactionResult.order.acceptedOffers
                        .map((o) => {
                            const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;
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
        } catch (error) {
            next(error);
        }
    }
);

export default placeOrderTransactionsRouter;

async function publishCode(req: Request, order: cinerinoapi.factory.order.IOrder, transactionId: string) {
    const orderService = new cinerinoapi.service.Order({
        auth: req.authClient,
        endpoint: <string>process.env.CINERINO_API_ENDPOINT,
        project: { id: req.project.id }
    });

    let tryCount = 0;
    const MAX_TRY_COUNT = 3;
    while (tryCount < MAX_TRY_COUNT) {
        try {
            tryCount += 1;

            // まず注文作成(非同期処理が間に合わない可能性ありなので)
            await orderService.placeOrder({
                object: {
                    orderNumber: order.orderNumber,
                    confirmationNumber: order.confirmationNumber
                },
                purpose: {
                    typeOf: cinerinoapi.factory.transactionType.PlaceOrder,
                    id: transactionId
                }
            });
            break;
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    }

    // 注文承認
    let code: string | undefined;
    let tryCount4code = 0;
    while (tryCount4code < MAX_TRY_COUNT) {
        try {
            tryCount4code += 1;

            const authorizeOrderResult = await orderService.authorize({
                object: {
                    orderNumber: order.orderNumber,
                    customer: { telephone: order.customer.telephone }
                },
                result: {
                    expiresInSeconds: CODE_EXPIRES_IN_SECONDS
                }
            });
            code = authorizeOrderResult.code;
            break;
        } catch (error) {
            // tslint:disable-next-line:no-console
            console.error(error);
        }
    }

    return code;
}
