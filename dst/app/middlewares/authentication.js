"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 認証ミドルウェア
 */
const cinerinoapi = require("@cinerino/sdk");
const express_middleware_1 = require("@motionpicture/express-middleware");
// 許可発行者リスト
const ISSUERS = process.env.TOKEN_ISSUERS.split(',');
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
exports.default = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield express_middleware_1.cognitoAuth({
            issuers: ISSUERS,
            authorizedHandler: (user, token) => __awaiter(void 0, void 0, void 0, function* () {
                req.user = user;
                // リクエストに対してCinerino認証クライアントをセット
                const auth = new cinerinoapi.auth.ClientCredentials({
                    domain: '',
                    clientId: '',
                    clientSecret: '',
                    scopes: [],
                    state: ''
                });
                auth.setCredentials({ access_token: token });
                req.authClient = auth;
                next();
            }),
            unauthorizedHandler: (err) => {
                next(new cinerinoapi.factory.errors.Unauthorized(err.message));
            }
        })(req, res, next);
    }
    catch (error) {
        next(new cinerinoapi.factory.errors.Unauthorized(error.message));
    }
});
