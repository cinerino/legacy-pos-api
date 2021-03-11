/**
 * プロジェクト詳細ルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';

import eventsRouter from '../events';
import performancesRouter from '../performances';
import placeOrderTransactionsRouter from '../transactions/placeOrder';
import returnOrderTransactionsRouter from '../transactions/returnOrder';

const projectDetailRouter = express.Router();

projectDetailRouter.use((req, _, next) => {
    // プロジェクト未指定は拒否
    if (typeof req.project?.id !== 'string') {
        next(new cinerinoapi.factory.errors.Forbidden('project not specified'));

        return;
    }

    next();
});

projectDetailRouter.use('/events', eventsRouter);
projectDetailRouter.use('/performances', performancesRouter);
projectDetailRouter.use('/transactions/placeOrder', placeOrderTransactionsRouter);
projectDetailRouter.use('/transactions/returnOrder', returnOrderTransactionsRouter);

export default projectDetailRouter;
