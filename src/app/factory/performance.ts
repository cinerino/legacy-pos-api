// import { chevre, person, propertyValue } from '@cinerino/sdk';

import * as cinerinoapi from '@cinerino/sdk';

/**
 * 検索条件インターフェース
 */
export interface ISearchConditions {
    limit?: number;
    page?: number;
    sort?: any;
    ids?: string[];
    startFrom?: Date;
    startThrough?: Date;
    ttts_extension?: {
        online_sales_update_at?: any;
        refund_status?: string;
    };
    eventStatus?: {
        $in?: cinerinoapi.factory.chevre.eventStatusType[];
    };
}

export interface ICheckinCountsByTicketType {
    ticketType: string;
    ticketCategory: string;
    count?: number;
}

export interface ICheckinCountByWhere {
    /**
     * 入場場所
     */
    where: string;
    /**
     * 券種ごとの入場数
     */
    checkinCountsByTicketType: ICheckinCountsByTicketType[];
}

export interface IReservationCountByTicketType {
    ticketType: string;
    count?: number;
}

/**
 * パフォーマンス集計データインターフェース
 */
export interface IPerformanceAggregation {
    id: string;
    aggregateEntranceGate?: cinerinoapi.factory.chevre.event.screeningEvent.IAggregateEntranceGate;
    aggregateOffer?: cinerinoapi.factory.chevre.event.screeningEvent.IAggregateOffer;
    aggregateReservation?: cinerinoapi.factory.chevre.event.screeningEvent.IAggregateReservation;
    checkinCount?: number;
    checkinCountsByWhere?: ICheckinCountByWhere[];
}

/**
 * パフォーマンスインターフェース
 */
export type IPerformance = {
    project: cinerinoapi.factory.chevre.project.IProject;
    id: string;
    startDate: Date;
    endDate: Date;
    eventStatus: cinerinoapi.factory.chevre.eventStatusType;
    additionalProperty?: cinerinoapi.factory.propertyValue.IPropertyValue<string>[];
} & IPerformanceAggregation;
