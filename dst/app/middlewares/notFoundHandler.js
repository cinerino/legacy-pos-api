"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = require("http-status");
const api_1 = require("../error/api");
exports.default = (__, ___, next) => {
    next(new api_1.APIError(http_status_1.NOT_FOUND, []));
};
