/**
 * アプリケーション固有の型
 */
import * as cinerinoapi from '@cinerino/sdk';

declare global {
    namespace Express {
        // tslint:disable-next-line:interface-name
        export interface Request {
            project: cinerinoapi.factory.project.IProject;
            // agent: cinerinoapi.factory.person.IPerson;
            user: cinerinoapi.factory.chevre.clientUser.IClientUser;
            // accessToken: string;
            authClient?: cinerinoapi.auth.ClientCredentials;
        }
    }
}
