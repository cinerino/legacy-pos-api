/**
 * ルーター
 */
import * as express from 'express';

import eventsRouter from './events';
import healthRouter from './health';
import placeOrderTransactionsRouter from './transactions/placeOrder';
import returnOrderTransactionsRouter from './transactions/returnOrder';

const router = express.Router();

// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })

router.use('/health', healthRouter);
router.use('/performances', eventsRouter);
router.use('/transactions/placeOrder', placeOrderTransactionsRouter);
router.use('/transactions/returnOrder', returnOrderTransactionsRouter);

export default router;
