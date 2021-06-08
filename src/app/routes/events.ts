/**
 * イベントルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';

import screeningEventRouter from './events/screeningEvent';
import screeningEventSeriesRouter from './events/screeningEventSeries';

const eventsRouter = express.Router();

eventsRouter.use(`/${cinerinoapi.factory.eventType.ScreeningEvent}`, screeningEventRouter);
eventsRouter.use(`/${cinerinoapi.factory.eventType.ScreeningEventSeries}`, screeningEventSeriesRouter);

export default eventsRouter;
