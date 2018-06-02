import {ICalendarEvent} from '../ICalendarEvent';
import {IDeviceController} from '../IDeviceController';

export interface ICalendarControllerService extends IDeviceController {
	getEventsFuture(): Promise<ICalendarEvent[]>;
	getEventsToday(): Promise<ICalendarEvent[]>;
	getEventsTomorrow(): Promise<ICalendarEvent[]>;
	filterPast(eventList: ICalendarEvent[]): ICalendarEvent[];
	filterToday(eventList: ICalendarEvent[]): ICalendarEvent[];
	filterTomorrow(eventList: ICalendarEvent[]): ICalendarEvent[];
}