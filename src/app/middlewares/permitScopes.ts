/**
 * スコープ許可ミドルウェア
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';

const debug = createDebug('smarttheater-api:middlewares:permitScopes');

const SCOPE_ANY_RESOURCE = 'something';

/**
 * スコープインターフェース
 */
type IScope = string;

export default (permittedScopes: IScope[]) => {
    return (req: Request, __: Response, next: NextFunction) => {
        if (process.env.RESOURECE_SERVER_IDENTIFIER === undefined) {
            next(new Error('RESOURECE_SERVER_IDENTIFIER undefined'));

            return;
        }

        debug('req.user.scopes:', req.user.scopes);

        // ドメインつきのスコープリストも許容するように変更
        const permittedScopesWithResourceServerIdentifier = [
            ...permittedScopes.map((permittedScope) => `${process.env.RESOURECE_SERVER_IDENTIFIER}/${permittedScope}`),
            ...permittedScopes.map((permittedScope) => `${process.env.RESOURECE_SERVER_IDENTIFIER}/auth/${permittedScope}`),
            // SCOPE_ANY_RESOURCEについてはすべて許可
            `${process.env.RESOURECE_SERVER_IDENTIFIER}/${SCOPE_ANY_RESOURCE}`
        ];
        debug('permittedScopesWithResourceServerIdentifier:', permittedScopesWithResourceServerIdentifier);

        // スコープチェック
        try {
            debug('checking scope requirements...', permittedScopesWithResourceServerIdentifier);
            if (!isScopesPermitted(req.user.scopes, permittedScopesWithResourceServerIdentifier)) {
                next(new cinerinoapi.factory.errors.Forbidden('scope requirements not satisfied'));
            } else {
                next();
            }
        } catch (error) {
            next(error);
        }
    };
};

/**
 * 所有スコープが許可されたスコープかどうか
 *
 * @param {string[]} ownedScopes 所有スコープリスト
 * @param {string[]} permittedScopes 許可スコープリスト
 */
export function isScopesPermitted(ownedScopes: string[], permittedScopes: string[]) {
    debug('checking scope requirements...', permittedScopes);
    if (!Array.isArray(ownedScopes)) {
        throw new Error('ownedScopes should be array of string');
    }

    const permittedOwnedScope = permittedScopes.find((permittedScope) => ownedScopes.indexOf(permittedScope) >= 0);

    return (permittedOwnedScope !== undefined);
}
