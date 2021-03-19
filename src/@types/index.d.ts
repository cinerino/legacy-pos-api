/**
 * アプリケーション固有の型
 */
import * as cinerinoapi from '@cinerino/sdk';

declare global {
    namespace Express {
        // tslint:disable-next-line:interface-name
        export interface Request {
            project: cinerinoapi.factory.project.IProject;
            user: cinerinoapi.factory.chevre.clientUser.IClientUser;
            authClient?: cinerinoapi.auth.ClientCredentials;
        }
    }
}
