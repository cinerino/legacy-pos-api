"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ルーター
 */
const express = require("express");
const health_1 = require("./health");
const preview_1 = require("./preview");
const detail_1 = require("./projects/detail");
const authentication_1 = require("../middlewares/authentication");
const setProject_1 = require("../middlewares/setProject");
const USE_PREVIEW_ROUTER = process.env.USE_PREVIEW_ROUTER === '1';
const router = express.Router();
// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })
// 例外的なpublic router
router.use('/health', health_1.default);
if (USE_PREVIEW_ROUTER) {
    router.use('/preview', preview_1.default);
}
// 認証
router.use(authentication_1.default);
// リクエストプロジェクト設定
router.use(setProject_1.default);
router.use('/projects/:id', detail_1.default);
exports.default = router;
