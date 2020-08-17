"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * リクエストプロジェクト設定ルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const express = require("express");
const setProject = express.Router();
setProject.use((req, _, next) => {
    // デフォルトプロジェクトはPROJECT_ID
    req.project = { typeOf: cinerinoapi.factory.organizationType.Project, id: process.env.PROJECT_ID };
    next();
});
// プロジェクト指定ルーティング配下については、すべてreq.projectを上書き
setProject.use('/projects/:id', (req, _, next) => {
    req.project = { typeOf: cinerinoapi.factory.organizationType.Project, id: req.params.id };
    next();
});
exports.default = setProject;
