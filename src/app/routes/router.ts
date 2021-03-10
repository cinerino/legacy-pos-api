/**
 * ルーター
 */
import * as express from 'express';

import healthRouter from './health';
import previewRouter from './preview';
import projectDetailRouter from './projects/detail';

import authentication from '../middlewares/authentication';
import setProject from '../middlewares/setProject';

const USE_PREVIEW_ROUTER = process.env.USE_PREVIEW_ROUTER === '1';

const router = express.Router();

// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })

// 例外的なpublic router
router.use('/health', healthRouter);
if (USE_PREVIEW_ROUTER) {
    router.use('/preview', previewRouter);
}

// 認証
router.use(authentication);

// リクエストプロジェクト設定
router.use(setProject);

router.use('/projects/:id', projectDetailRouter);

export default router;
