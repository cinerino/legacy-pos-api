"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 施設ルーター
 */
// import * as cinerinoapi from '@cinerino/sdk';
const express = require("express");
// import { query } from 'express-validator';
// import permitScopes from '../middlewares/permitScopes';
const rateLimit_1 = require("../middlewares/rateLimit");
const placesRouter = express.Router();
placesRouter.use(rateLimit_1.default);
exports.default = placesRouter;
