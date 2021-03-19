/**
 * 認証ミドルウェア
 */
import * as cinerinoapi from '@cinerino/sdk';

import { cognitoAuth } from '@motionpicture/express-middleware';
import { NextFunction, Request, Response } from 'express';

// 許可発行者リスト
const ISSUERS = (<string>process.env.TOKEN_ISSUERS).split(',');

// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        await cognitoAuth({
            issuers: ISSUERS,
            authorizedHandler: async (user, token) => {
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
            },
            unauthorizedHandler: (err) => {
                next(new cinerinoapi.factory.errors.Unauthorized(err.message));
            }
        })(req, res, next);
    } catch (error) {
        next(new cinerinoapi.factory.errors.Unauthorized(error.message));
    }
};
