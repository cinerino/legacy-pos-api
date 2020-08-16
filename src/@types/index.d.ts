/**
 * アプリケーション固有の型
 */
import * as cinerinoapi from '@cinerino/sdk';

declare global {
    namespace Express {
        export type IUser = cinerinoapi.factory.clientUser.IClientUser;

        // tslint:disable-next-line:interface-name
        export interface Request {
            project: cinerinoapi.factory.project.IProject;
            agent: cinerinoapi.factory.person.IPerson;
            user: IUser;
            accessToken: string;
        }
    }
}
