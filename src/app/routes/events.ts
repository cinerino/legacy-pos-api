/**
 * イベントルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';

import screeningEventRouter from './events/screeningEvent';
import screeningEventSeriesRouter from './events/screeningEventSeries';

const eventsRouter = express.Router();

eventsRouter.use(`/${cinerinoapi.factory.chevre.eventType.ScreeningEvent}`, screeningEventRouter);
eventsRouter.use(`/${cinerinoapi.factory.chevre.eventType.ScreeningEventSeries}`, screeningEventSeriesRouter);

export default eventsRouter;
