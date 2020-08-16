"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ルーター
 */
const express = require("express");
const events_1 = require("./events");
const health_1 = require("./health");
const placeOrder_1 = require("./transactions/placeOrder");
const returnOrder_1 = require("./transactions/returnOrder");
const router = express.Router();
// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })
router.use('/health', health_1.default);
router.use('/performances', events_1.default);
router.use('/transactions/placeOrder', placeOrder_1.default);
router.use('/transactions/returnOrder', returnOrder_1.default);
exports.default = router;
