/**
 * 注文取引ルーター(POS専用)
 */
import * as cinerinoapi from '@cinerino/sdk';
import { Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body } from 'express-validator';
import { CREATED, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';
import * as redis from 'redis';
import * as request from 'request-promise-native';

import permitScopes from '../../middlewares/permitScopes';
import rateLimit from '../../middlewares/rateLimit';
import validator from '../../middlewares/validator';

const auth = new cinerinoapi.auth.ClientCredentials({
    domain: '',
    clientId: '',
    clientSecret: '',
    scopes: [],
    state: ''
});

const WAITER_SCOPE = process.env.WAITER_SCOPE;

const TRANSACTION_TTL = 3600;
const TRANSACTION_KEY_PREFIX = 'cinerino-legacy-pos-api:placeOrder:';
const TRANSACTION_AMOUNT_TTL = TRANSACTION_TTL;
const TRANSACTION_AMOUNT_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}amount:`;

const ORDERS_TTL = 86400;
export const ORDERS_KEY_PREFIX = 'cinerino-legacy-pos-api:orders:';

const redisClient = redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
});

const placeOrderTransactionsRouter = Router();

placeOrderTransactionsRouter.use(rateLimit);

placeOrderTransactionsRouter.post(
    '/start',
    permitScopes(['pos']),
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
            auth.setCredentials({ access_token: req.accessToken });
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });
            const sellerService = new cinerinoapi.service.Seller({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });

            const searchSellersResult = await sellerService.search({
                limit: 1
            });
            const seller = searchSellersResult.data.shift();
            if (seller === undefined) {
                throw new Error('Seller not found');
            }

            // WAITER許可証を取得
            const { token } = await request.post(
                `${process.env.WAITER_ENDPOINT}/projects/${req.project.id}/passports`,
                {
                    json: true,
                    body: { scope: WAITER_SCOPE }
                }
            )
                .then((result) => result);

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
                .json(transaction);
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
    permitScopes(['pos']),
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
            auth.setCredentials({ access_token: req.accessToken });
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
                auth: auth,
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
    permitScopes(['pos']),
    validator,
    async (req, res, next) => {
        try {
            if (!Array.isArray(req.body.offers)) {
                req.body.offers = [];
            }

            auth.setCredentials({ access_token: req.accessToken });
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
                auth: auth,
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
    permitScopes(['pos']),
    validator,
    async (req, res, next) => {
        try {
            auth.setCredentials({ access_token: req.accessToken });
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
                auth: auth,
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
    permitScopes(['pos']),
    validator,
    async (req, res, next) => {
        try {
            // クライアントがPOSの場合、決済方法承認アクションを自動生成
            auth.setCredentials({ access_token: req.accessToken });
            const paymentService = new cinerinoapi.service.Payment({
                auth: auth,
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
                    typeOf: cinerinoapi.factory.paymentMethodType.Cash,
                    name: cinerinoapi.factory.paymentMethodType.Cash,
                    additionalProperty: [],
                    amount: amount
                },
                purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: req.params.transactionId }
            });

            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
                auth: auth,
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

            res.status(CREATED)
                .json({
                    // POSへのレスポンスとしてeventReservations属性を生成
                    eventReservations: transactionResult.order.acceptedOffers
                        .map((o) => {
                            const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;

                            return {
                                qr_str: r.id,
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
