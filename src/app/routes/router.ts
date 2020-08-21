/**
 * ルーター
 */
import * as express from 'express';

import healthRouter from './health';
import projectDetailRouter from './projects/detail';

import authentication from '../middlewares/authentication';
import setProject from '../middlewares/setProject';

const USE_PROJECTLESS_ROUTER = process.env.USE_PROJECTLESS_ROUTER === '1';

const router = express.Router();

// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })

// 例外的なpublic router
router.use('/health', healthRouter);

// 認証
router.use(authentication);

// リクエストプロジェクト設定
router.use(setProject);

// 以下、プロジェクト指定済の状態でルーティング
if (USE_PROJECTLESS_ROUTER) {
    router.use('', projectDetailRouter);
}
router.use('/projects/:id', projectDetailRouter);

export default router;
