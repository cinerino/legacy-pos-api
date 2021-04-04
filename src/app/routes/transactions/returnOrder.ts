/**
 * 注文返品取引ルーター(POS専用)
 */
import * as cinerinoapi from '@cinerino/sdk';
import { Router } from 'express';
import { body, oneOf } from 'express-validator';
import { CREATED } from 'http-status';
import * as moment from 'moment';
import * as redis from 'redis';

import permitScopes from '../../middlewares/permitScopes';
import rateLimit from '../../middlewares/rateLimit';
import validator from '../../middlewares/validator';

import { ORDERS_KEY_PREFIX } from './placeOrder';

const USE_NEW_RETURN_ORDER_PARAMS_FROM = (typeof process.env.USE_NEW_RETURN_ORDER_PARAMS_FROM === 'string')
    ? moment(process.env.USE_NEW_RETURN_ORDER_PARAMS_FROM)
        .toDate()
    : undefined;

const redisClient = redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
});

const returnOrderTransactionsRouter = Router();

returnOrderTransactionsRouter.use(rateLimit);

/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post(
    '/confirm',
    permitScopes([]),
    ...[
        oneOf([
            [
                // 廃止予定↓
                body('performance_day')
                    .not()
                    .isEmpty()
                    .withMessage(() => 'required'),
                body('payment_no')
                    .not()
                    .isEmpty()
                    .withMessage(() => 'required')
            ],
            [
                body('orderNumber')
                    .not()
                    .isEmpty()
                    .withMessage(() => 'required'),
                body('customer.telephone')
                    .not()
                    .isEmpty()
                    .withMessage(() => 'required')
            ]
        ])
    ],
    validator,
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            const now = moment();
            const useNewReturnOrderParams = USE_NEW_RETURN_ORDER_PARAMS_FROM instanceof Date
                && moment(USE_NEW_RETURN_ORDER_PARAMS_FROM)
                    .isSameOrBefore(now);
            if (useNewReturnOrderParams) {
                if (typeof req.body.orderNumber !== 'string' || req.body.orderNumber.length === 0) {
                    throw new cinerinoapi.factory.errors.ArgumentNull('orderNumber');
                }
                if (typeof req.body.customer?.telephone !== 'string' || req.body.customer.telephone.length === 0) {
                    throw new cinerinoapi.factory.errors.ArgumentNull('customer.telephone');
                }
            }

            const deliveryService = new cinerinoapi.service.Delivery({
                auth: req.authClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });
            const orderService = new cinerinoapi.service.Order({
                auth: req.authClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });
            const returnOrderService = new cinerinoapi.service.transaction.ReturnOrder({
                auth: req.authClient,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });

            let order: cinerinoapi.factory.order.IOrder | undefined;
            let returnableOrder: cinerinoapi.factory.transaction.returnOrder.IReturnableOrder | undefined;

            if (typeof req.body.performance_day === 'string' && req.body.performance_day.length > 0) {
                // 注文取得
                const confirmationNumber = `${req.body.performance_day}${req.body.payment_no}`;
                const key = `${ORDERS_KEY_PREFIX}${confirmationNumber}`;
                order = await new Promise<cinerinoapi.factory.order.IOrder>((resolve, reject) => {
                    redisClient.get(key, (err, result) => {
                        if (err !== null) {
                            reject(err);
                        } else {
                            if (typeof result === 'string') {
                                resolve(JSON.parse(result));
                            } else {
                                reject(new cinerinoapi.factory.errors.NotFound('Order'));
                            }
                        }
                    });
                });
            }

            if (typeof req.body.orderNumber === 'string' && req.body.orderNumber.length > 0) {
                order = await orderService.findOneByOrderNumberAndSomething({
                    orderNumber: String(req.body.orderNumber),
                    customer: { telephone: String(req.body.customer?.telephone) }
                });
            }

            if (order !== undefined) {
                // 注文クライアントと返品クライアントの同一性を確認
                if (order.customer?.id !== req.user.client_id) {
                    throw new cinerinoapi.factory.errors.Argument('orderNumber', 'client not matched');
                }

                // 注文配送
                if (order.orderStatus !== cinerinoapi.factory.orderStatus.OrderDelivered) {
                    let tryCount = 0;
                    const MAX_TRY_COUNT = 3;
                    while (tryCount < MAX_TRY_COUNT) {
                        try {
                            tryCount += 1;

                            await deliveryService.sendOrder({
                                object: {
                                    orderNumber: order.orderNumber,
                                    confirmationNumber: order.confirmationNumber
                                }
                            });
                            break;
                        } catch (error) {
                            // tslint:disable-next-line:no-console
                            console.error(error);
                        }
                    }
                }

                returnableOrder = {
                    orderNumber: String(order.orderNumber),
                    customer: { telephone: String(order.customer?.telephone) }
                };
            }

            if (returnableOrder === undefined) {
                throw new cinerinoapi.factory.errors.Argument('params');
            }

            const returnOrderTransaction = await returnOrderService.start({
                expires: moment()
                    .add(1, 'minute')
                    .toDate(),
                object: {
                    order: [returnableOrder]
                }
            });

            await returnOrderService.confirm({ id: returnOrderTransaction.id });

            res.status(CREATED)
                .json({
                    id: returnOrderTransaction.id
                });
        } catch (error) {
            next(error);
        }
    }
);

export default returnOrderTransactionsRouter;
