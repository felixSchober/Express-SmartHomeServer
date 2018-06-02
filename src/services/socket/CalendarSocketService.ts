import {Server, Socket} from 'socket.io';
import {ICalendarControllerService} from '../../interfaces/Devices/ICalendarControllerService';
import {ICalendarEvent} from '../../interfaces/ICalendarEvent';
import {IDeviceController} from '../../interfaces/IDeviceController';
import {ISocketController} from '../../interfaces/ISocketController';
import {BaseSocketService} from './BaseSocketService';

export class CalendarSocketService extends BaseSocketService {

	constructor(socketName: string,
	            io: Server,
	            pollingInterval: number,
	            socketMessageIdentifier: string,
	            controller: IDeviceController,
	            socketController: ISocketController) {
		super(socketName, io, pollingInterval, socketMessageIdentifier, controller, socketController);
	}

	protected addSocketObserver(socket: Socket) {
		// we don't have to listen for events here because we can't do anything (yet) for the calendar anyway.
	}

	protected sendInitialState() {
		// TODO send initial state for calendar
	}

	protected sendUpdates() {
		const calendarController = this.controller as ICalendarControllerService;

		calendarController.getEventsFuture()
			.then((eventList: ICalendarEvent[]) => {

				this.socketController.send('calendarEventsList', eventList);

				// how many events today?
				const eventsToday = calendarController.filterToday(eventList);
				const eventsTomorrow = calendarController.filterTomorrow(eventList);
				this.socketController.send('calendarEventsTodayCount', eventsToday.length);
				this.socketController.send('calendarEventsTomorrowCount', eventsTomorrow.length);
			})
			.catch((err) => {
				this.socketController.log('Could not get calendar events. Error: ' + err, true);
			});
	}
}