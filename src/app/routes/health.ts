/**
 * ヘルスチェックルーター
 */
import * as express from 'express';

const healthRouter = express.Router();

healthRouter.get(
    '',
    (_, res, next) => {
        try {
            res.send('healthy!');
        } catch (error) {
            next(error);
        }
    }
);

export default healthRouter;
