import {calendar} from '../../config/calendar';
import {Helpers} from '../../Helpers';
import {ICalendarControllerService} from '../../interfaces/Devices/ICalendarControllerService';
import {ICalendar} from '../../interfaces/Devices/Calendar/ICalendar';
import {ICalendarEvent} from '../../interfaces/Devices/Calendar/ICalendarEvent';
import * as nodeICal from 'node-ical';
import * as moment from 'moment';
import {CalendarEvent} from '../../models/CalendarEvent';



export class CalendarService implements ICalendarControllerService {

	private static sortEvents(eventList: ICalendarEvent[]): ICalendarEvent[] {
		return eventList.sort((e1, e2) => {
			if(e1.start < e2.start) return -1;
			if(e1.start > e2.start) return 1;
			return 0;
		});
	}

	private static addFrequencyInterval(d: Date, freq: number, interval: number): Date {
		// const frequencyArray = ['YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY', 'HOURLY', 'MINUTELY', 'SECONDLY'];
		if (freq === 0) return moment(d).add(interval, 'years').toDate();
		else if (freq === 1) return moment(d).add(interval, 'months').toDate();
		else if (freq === 2) return moment(d).add(interval, 'weeks').toDate();
		else if (freq === 3) return moment(d).add(interval, 'days').toDate();
		else if (freq === 4) return moment(d).add(interval, 'hours').toDate();
		else if (freq === 5) return moment(d).add(interval, 'minutes').toDate();
		else if (freq === 6) return moment(d).add(interval, 'seconds').toDate();
		return new Date();
	}

	public filterPast(eventList: ICalendarEvent[]): ICalendarEvent[] {
		return eventList.filter((element: ICalendarEvent) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			return element.start > today;
		});
	}

	public filterToday(eventList: ICalendarEvent[]): ICalendarEvent[] {
		return eventList.filter((element: ICalendarEvent) => {
			return Helpers.checkIfDateToday(element.start);
		});
	}

	public filterTomorrow(eventList: ICalendarEvent[]): ICalendarEvent[] {
		return eventList.filter((element: ICalendarEvent) => {
			return Helpers.checkIfDateTomorrow(element.start)
		});
	}

	public getEventsFuture(): Promise<ICalendarEvent[]> {
		return new Promise((resolve, reject) => {
			this.collectEventsFromCalendarURLList(calendar.urls, true, true)
				.then((eventList) => {
					const eventsToday = this.filterPast(eventList);
					resolve(eventsToday);
				})
				.catch(function (err) {
					console.error('[CALENDAR]:\tgetEventsFuture - Could not get some calendar. Error: ' + err);
					reject(err);
				});
		});
	}

	public getEventsToday(): Promise<ICalendarEvent[]> {
		return new Promise((resolve, reject) => {
			this.collectEventsFromCalendarURLList(calendar.urls, true, true)
				.then((eventList) => {
					// count how many of them are today
					const eventsToday = this.filterToday(eventList);
					resolve(eventsToday);
				})
				.catch(function (err) {
					console.error('[CALENDAR]:\tgetEventsToday - Could not get some calendar. Error: ' + err);
					reject({'err': err});
				});
		});
	}

	public getEventsTomorrow(): Promise<ICalendarEvent[]> {
		return new Promise((resolve, reject) => {
			this.collectEventsFromCalendarURLList(calendar.urls, true, true)
				.then((eventList) => {
					// count how many of them are tomorrow
					const eventsToday = this.filterTomorrow(eventList);
					resolve(eventsToday);
				})
				.catch(function (err) {
					console.error('[CALENDAR]:\tgetEventsTomorrow - Could not get some calendar. Error: ' + err);
					reject({'err': err});
				});
		});
	}

	private collectEventsFromCalendarURLList(calendarList: ReadonlyArray<ICalendar>, convertRecurring?: boolean, manualConversion?: boolean): Promise<ICalendarEvent[]> {

		const anonymizeEvents = false;
		convertRecurring = convertRecurring || true;
		manualConversion = manualConversion || false;

		// create the promises
		const promises: Promise<ICalendarEvent[]>[] = [];

		for (const calendar of calendarList) {
			console.log('[CALENDAR]:\tcollectEventsFromCalendarURLList(' + calendarList + ', ' + convertRecurring + ', ' + manualConversion + ') - ' + calendar.name + ': ' + calendar.url);
			promises.push(this.extractCalendarEventsFromURL(calendar.url, calendar.name, anonymizeEvents, convertRecurring, manualConversion));
		}

		return new Promise(function (resolve, reject) {
			// wait for all the promises to complete
			Promise.all(promises)
				.then(function (results) {
					const eventList: ICalendarEvent[] = [];
					for (let i = 0; i < results.length; i++) {
						const events = results[i];

						// append all events
						eventList.push.apply(eventList, events);
					}

					console.log('[CALENDAR]:\tcollectEventsFromCalendarURLList(' + calendarList + ', ' + convertRecurring + ', ' + manualConversion + ') - Found ' + eventList.length + ' events.');

					// sort events
					CalendarService.sortEvents(eventList);
					resolve(eventList);
				})
				.catch(function (err) {
					console.error('[CALENDAR]:\tcollectEventsFromCalendarURLList(' + calendarList + ', ' + convertRecurring + ', ' + manualConversion + ') - Could not get some calendar. Error: ' + err);
					reject(err);
				});
		});
	}

	private extractCalendarEventsFromURL(url: string, calendarName: string, anonymizeEvents: boolean, convertRecurring: boolean, manualConversion: boolean): Promise<ICalendarEvent[]> {
		console.log('[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ') - Parsing Calendar: ' + calendarName + ' with URL ' + url);

		return new Promise(function (resolve, reject) {
			// if anonymizeEvents is true the calendar needs to have a calendarName
			if (anonymizeEvents && (calendarName === null || calendarName === '') ) {
				console.error('[CALENDAR]:\t[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ') - anonymizeEvents is true and calendarName is not set.');
				reject('anonymizeEvents is true and calendarName is not set.');
			} else {

				// parse calendar
				const eventList: ICalendarEvent[] = [];
				nodeICal.fromURL(url, {}, function (err, data: any) {
					let first = true;
					for (let k in data) {
						if (first) {
							first = false;
							continue;
						}

						const evnt = data[k];

						// skip if we don't have a summary
						if (evnt.summary == undefined || evnt.summary == "") {
							console.error('[CALENDAR]:\t[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ') - event data is null: Event: ' + evnt);
							continue;
						}

						const event = new CalendarEvent(calendarName, evnt.description, evnt.end, evnt.location, '', '', evnt.sequence, evnt.start, evnt.status, evnt.summary, evnt.uid);

						// substitute summary if anonymizeEvents is true
						if (anonymizeEvents) {
							event.summary = calendarName + ' Event';
							event.description = '';
						}

						let organizer = evnt.organizer;

						if (organizer !== null && organizer !== undefined) {
							// does mail exist?
							if (organizer.val !== null && organizer.val !== undefined) {
								// replace mailto
								const potentialMail = organizer.val.replace('mailto:', '');

								// is it a valid mail? If not we do not take it
								const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
								if (re.test(potentialMail)) {
									organizer.mail = potentialMail;
								} else {
									organizer.mail = '';
								}
							} else {
								organizer.mail = '';
							}

							// does a name exist?
							if (organizer.params !== null && organizer.params.CN !== null) {
								organizer.name = organizer.params.CN;
								event.organizerName = organizer.name;
								event.organizerMail = organizer.mail;
							}
						}

						// is the event recurring?
						if (evnt.rrule !== null && evnt.rrule !== undefined) {
							const repeatingOptions = evnt.rrule.options;
							console.log('[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ') - Found rrule for event');

							// converts the recurring event to single events
							if (convertRecurring) {
								let until = repeatingOptions.until;
								if (until === null) {
									until = moment().add(1, 'years').toDate();
								}

								// initialize date counter
								let dateCounter = CalendarService.addFrequencyInterval(event.start, repeatingOptions.freq, repeatingOptions.interval);
								let prevEvent = event;

								while (dateCounter <= until) {

									// create new event by copying this event
									const newEvent = prevEvent.copy();
									newEvent.start = dateCounter;
									newEvent.end = CalendarService.addFrequencyInterval(prevEvent.end, repeatingOptions.freq, repeatingOptions.interval);
									eventList.push(newEvent);

									// advance counter
									dateCounter = CalendarService.addFrequencyInterval(dateCounter, repeatingOptions.freq, repeatingOptions.interval);
									prevEvent = newEvent;

									console.log('[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ') - Add recurring event: ' + moment(newEvent.start).format() + ' - ' + moment(newEvent.end).format());

								}
							} else {
								const frequencyArray = ['YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY', 'HOURLY', 'MINUTELY', 'SECONDLY'];
								const weekdayArray: string[] = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];

								event.repeating = {
									freq: frequencyArray[repeatingOptions.freq],
									count: 0,
									until: null,
									bymonth: null,
									bymonthday: null,
									interval: '',
									wkst: []
								};

								if (repeatingOptions.count !== null) {
									event.repeating.count = repeatingOptions.count;
								}

								if (repeatingOptions.interval !== null) {
									event.repeating.interval = repeatingOptions.interval;
								}

								if (repeatingOptions.until !== null) {
									event.repeating.until = repeatingOptions.until;
								}

								if (repeatingOptions.byweekday !== null && repeatingOptions.byweekday.length > 0) {
									const repeatingWeekdayList = [];
									const ro: number[] = repeatingOptions.byweekday;
									for (let i in ro) {
										repeatingWeekdayList.push(weekdayArray[i]);
									}
									event.repeating.wkst = repeatingWeekdayList;
								}

								if (repeatingOptions.bymonth !== null) {
									event.repeating.bymonth = repeatingOptions.bymonth;
								}

								if (repeatingOptions.bymonthday !== null) {
									event.repeating.bymonthday = repeatingOptions.bymonthday;
								}
							}
						}

						eventList.push(event);
					}
					resolve(eventList);
				});
			}
		});
	}





}