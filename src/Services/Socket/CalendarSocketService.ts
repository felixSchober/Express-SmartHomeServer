import {Server, Socket} from 'socket.io';
import {ICalendarControllerService} from '../../Interfaces/Devices/ICalendarControllerService';
import {ICalendarEvent} from '../../Interfaces/Devices/Calendar/ICalendarEvent';
import {IDeviceController} from '../../Interfaces/IDeviceController';
import {ISocketController} from '../../Interfaces/ISocketController';
import {BaseSocketService} from './BaseSocketService';

export class CalendarSocketService extends BaseSocketService {

	constructor(socketName: string,
	            io: Server,
	            socketMessageIdentifier: string,
	            controller: IDeviceController,
	            socketController: ISocketController) {
		super(socketName, io, socketMessageIdentifier, controller, socketController);
	}

	public addSocketObserver(socket: Socket) {
		// we don't have to listen for events here because we can't do anything (yet) for the calendar anyway.
	}

	public sendInitialState() {
		// TODO send initial state for calendar
	}

	public sendUpdates() {
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