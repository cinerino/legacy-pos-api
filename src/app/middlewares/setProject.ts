/**
 * リクエストプロジェクト設定ルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';

const setProject = express.Router();

setProject.use((req, _, next) => {
    // デフォルトプロジェクトはPROJECT_ID
    req.project = { typeOf: cinerinoapi.factory.chevre.organizationType.Project, id: <string>process.env.PROJECT_ID };

    next();
});

// プロジェクト指定ルーティング配下については、すべてreq.projectを上書き
setProject.use(
    '/projects/:id',
    (req, _, next) => {
        req.project = { typeOf: cinerinoapi.factory.chevre.organizationType.Project, id: req.params.id };

        next();
    }
);

export default setProject;
