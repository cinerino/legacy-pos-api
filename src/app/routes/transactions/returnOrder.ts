/**
 * 注文返品取引ルーター(POS専用)
 */
import * as cinerinoapi from '@cinerino/sdk';
import { Router } from 'express';
import { body } from 'express-validator';
import { CREATED } from 'http-status';
import * as moment from 'moment';
import * as redis from 'redis';

import { ORDERS_KEY_PREFIX } from './placeOrder';

const redisClient = redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
});

const auth = new cinerinoapi.auth.ClientCredentials({
    domain: '',
    clientId: '',
    clientSecret: '',
    scopes: [],
    state: ''
});

const returnOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import rateLimit from '../../middlewares/rateLimit';
import validator from '../../middlewares/validator';

returnOrderTransactionsRouter.use(authentication);
returnOrderTransactionsRouter.use(rateLimit);

/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post(
    '/confirm',
    permitScopes(['pos']),
    ...[
        body('performance_day')
            .not()
            .isEmpty()
            .withMessage(() => 'required'),
        body('payment_no')
            .not()
            .isEmpty()
            .withMessage(() => 'required')
    ],
    validator,
    async (req, res, next) => {
        try {
            auth.setCredentials({ access_token: req.accessToken });
            const returnOrderService = new cinerinoapi.service.transaction.ReturnOrder({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                project: { id: req.project.id }
            });

            // 注文取得
            const confirmationNumber = `${req.body.performance_day}${req.body.payment_no}`;
            const key = `${ORDERS_KEY_PREFIX}${confirmationNumber}`;
            const order = await new Promise<cinerinoapi.factory.order.IOrder>((resolve, reject) => {
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

            const returnOrderTransaction = await returnOrderService.start({
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
