
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../../misc');
const config = require('../../config/calendar');
const moment = require('moment');
const icalParser = require('node-ical');

const getEventsFuture = function () {
	return new Promise((resolve, reject) => {
		collectEventsFromCalendarURLList(config.calendarICSUrls, true, true)
		.then((eventList) => {
			const eventsToday = filterPast(eventList)
			resolve({count: eventsToday.length, events: eventsToday});
		})
		.catch(function (err) {
			console.error('[CALENDAR]:\tgetEventsFuture - Could not get some calendar. Error: ' + err);
			reject({'err': err});
		});
	});
}

const getEventsToday = function () {
	return new Promise((resolve, reject) => {
		collectEventsFromCalendarURLList(config.calendarICSUrls, true, true)
		.then((eventList) => {
			// count how many of them are today
			const eventsToday = filterToday(eventList)
			resolve({count: eventsToday.length, events: eventsToday});
		})
		.catch(function (err) {
			console.error('[CALENDAR]:\tgetEventsToday - Could not get some calendar. Error: ' + err);
			reject({'err': err});
		});
	});
}

const getEventsTomorrow = function () {
	return new Promise((resolve, reject) => {
		collectEventsFromCalendarURLList(config.calendarICSUrls, true, true)
		.then((eventList) => {
			// count how many of them are today
			const eventsToday = filterTomorrow(eventList)
			resolve({count: eventsToday.length, events: eventsToday});
		})
		.catch(function (err) {
			console.error('[CALENDAR]:\tgetEventsTomorrow - Could not get some calendar. Error: ' + err);
			reject({'err': err});
		});
	});
}

const filterPast = function(eventList) {
	return eventList.filter((element) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return element.start > today;
	});
}

const filterToday = function(eventList) {
	return eventList.filter((element) => {
		return misc.checkIfDateToday(element.start)
	});
}

const filterTomorrow = function(eventList) {
	return eventList.filter((element) => {
		return misc.checkIfDateTomorrow(element.start)
	});
}

function collectEventsFromCalendarURLList(calendarList, convertRecurring, manualConversion) {
	
	const anonymizeEvents = false;
	const filterRoomName = false;
	
	// create the promises
	const promises = []
	for (var calIndex = 0; calIndex < calendarList.length; calIndex++) {
		const calendar = calendarList[calIndex];
		console.log('[CALENDAR]:\tcollectEventsFromCalendarURLList(' + calendarList + ', ' + convertRecurring + ', ' + manualConversion + ') - ' + calendar.name + ': ' + calendar.url);
		promises.push(extractCalendarEventsFromURL(calendar.url, calendar.name, anonymizeEvents, convertRecurring, manualConversion, filterRoomName));
	}
	
	return new Promise(function (resolve, reject) {
		// wait for all the promises to complete
		Promise.all(promises)
		.then(function (results) {
			const eventList = [];
			for (let i = 0; i < results.length; i++) {
				const events = results[i];
				
				// append all events
				eventList.push.apply(eventList, events);
			}
			
			console.log('[CALENDAR]:\tcollectEventsFromCalendarURLList(' + calendarList + ', ' + convertRecurring + ', ' + manualConversion + ') - Found ' + eventList.length + ' events.');
			
			// sort events
			sortEvents(eventList);
			resolve(eventList);
		})
		.catch(function (err) {
			console.error('[CALENDAR]:\tcollectEventsFromCalendarURLList(' + calendarList + ', ' + convertRecurring + ', ' + manualConversion + ') - Could not get some calendar. Error: ' + err);
			reject(err);
		});
	});
}

function sortEvents(eventList) {
	return eventList.sort((e1, e2) => {
		if (e1.start < e2.start) return -1;
		if (e1.start > e2.start) return 1;
		return 0;
	});
}

function extractCalendarEventsFromURL(url, calendarName, anonymizeEvents, convertRecurring, manualConversion, filterRoom) {
	console.log('[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ', ' + filterRoom + ') - Parsing Calendar: ' + calendarName + ' with URL ' + url);
	return new Promise(function (resolve, reject) {
		// if anonymizeEvents is true the calendar needs to have a calendarName
		if (anonymizeEvents && (calendarName === null || calendarName === '') ) {
			console.error('[CALENDAR]:\t[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ', ' + filterRoom + ') - anonymizeEvents is true and calendarName is not set.');
			reject('anonymizeEvents is true and calendarName is not set.');
		} else {
			
			// parse calendar
			const eventList = [];
			icalParser.fromURL(url, {}, function (err, data) {
				let first = true
				for (var k in data) {
					if (first) {
						first = false;
						continue;
					}
					
					const evnt = data[k];
					
					// skip if we don't have a summary
					if (evnt.summary == undefined || evnt.summary == "") {
						console.error('[CALENDAR]:\t[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ', ' + filterRoom + ') - event data is null: Event: ' + evnt);
						continue;
					}
					
					// if we should filter by room name only proceed if room name matches
					if (filterRoom !== null && filterRoom !== undefined && filterRoom === true) {
						// if no location is specified - continue
						if (evnt.location === null || evnt.location === undefined) continue;
						
						const evtRoom = extractRoomInformationFromLocation(evnt.location);
						
						// does the room match our filter?
						const roomMatch = findMatchingRoomFromRoomMapping(evtRoom, [filterRoom], 3);
						
						// if not continue and do not add this event
						if (roomMatch === undefined) continue;
					}
					
					//console.log('\tSummary: ' + evnt.summary + ' (' + evnt.location + ')');
					
					const start = convertFuckingDateSoThatGoogleCanEatShit(evnt.start, manualConversion);
					const end = convertFuckingDateSoThatGoogleCanEatShit(evnt.end, manualConversion);
					
					const event = {
						start: start,
						end: end,
						summary: evnt.summary,
						description: evnt.description,
						location: evnt.location,
						status: evnt.status,
						uid: evnt.uid,
						sequence: evnt.sequence,
						calendar: calendarName
					};
					
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
							event.organizer = organizer.name + '<' + organizer.mail + '>';
						}
					}
					
					// is the event recurring?
					if (evnt.rrule !== null && evnt.rrule !== undefined) {
						const repeatingOptions = evnt.rrule.options;
						console.log('[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ', ' + filterRoom + ') - Found rrule for event');
						
						// converts the recurring event to single events
						if (convertRecurring) {
							let until = repeatingOptions.until;
							if (until === null) {
								until = moment().add(1, 'years').toDate();
							}
							
							// initialize date counter
							let dateCounter = addFrequencyInterval(start, repeatingOptions.freq, repeatingOptions.interval);
							let prevEvent = event;
							
							while (dateCounter <= until) {
								
								// create new event by copying this event
								const newEvent = copyEvent(prevEvent);
								newEvent.start = dateCounter;
								newEvent.end = addFrequencyInterval(prevEvent.end, repeatingOptions.freq, repeatingOptions.interval);
								eventList.push(newEvent);
								
								// advance counter
								dateCounter = addFrequencyInterval(dateCounter, repeatingOptions.freq, repeatingOptions.interval);
								prevEvent = newEvent;
								
								console.log('[CALENDAR]:\textractCalendarEventsFromURL(' + url + ', ' + calendarName + ', ' + anonymizeEvents + ', ' + convertRecurring + ', ' + manualConversion + ', ' + filterRoom + ') - Add recurring event: ' + moment(newEvent.start).format() + ' - ' + moment(newEvent.end).format());
								
							}
						} else {
							const frequencyArray = ['YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY', 'HOURLY', 'MINUTELY', 'SECONDLY'];
							const weekdayArray = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
							
							event.repeating = {
								freq: frequencyArray[repeatingOptions.freq]
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
								for (var i in repeatingOptions.byweekday) {
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

function addFrequencyInterval(d, freq, interval) {
	// const frequencyArray = ['YEARLY', 'MONTHLY', 'WEEKLY', 'DAILY', 'HOURLY', 'MINUTELY', 'SECONDLY'];
	if (freq === 0) return moment(d).add(interval, 'years').toDate();
	else if (freq === 1) return moment(d).add(interval, 'months').toDate();
	else if (freq === 2) return moment(d).add(interval, 'weeks').toDate();
	else if (freq === 3) return moment(d).add(interval, 'days').toDate();
	else if (freq === 4) return moment(d).add(interval, 'hours').toDate();
	else if (freq === 5) return moment(d).add(interval, 'minutes').toDate();
	else if (freq === 6) return moment(d).add(interval, 'seconds').toDate();
}

function copyEvent(event) {
	return {
		start: event.start,
		end: event.end,
		summary: event.summary,
		description: event.description,
		location: event.location,
		status: event.status,
		sequence: event.sequence,
		organizer: event.organizer
	};
}

function convertFuckingDateSoThatGoogleCanEatShit(d, manualConversion) {
	// HACKY HACKY
	if (!manualConversion) return d;
	const dlsts = moment('10-29-2017 3:00', 'YYYY-MM-DD HH:mm').toDate();
	const today = new Date();
	
	// winter time
	if (today >= dlsts) {
		return d;
	}
	
	return moment(d).subtract(1, 'hours').toDate();
}

function extractRoomInformationFromLocation(locationString) {
	// try to get the room number which should come in this format XX.XX.XXX
	// We relax this a little bit by allowing any number with dots
	const roomNumber = locationString.replace(/[^\d.]/g, '');
	
	
	// try to get the room name which should only contain letters
	const roomName = locationString.replace(/[^a-zA-Z]+/, '');
	
	return {name: roomName, roomNumber: roomNumber};
}

function findMatchingRoomFromRoomMapping(room, roomMapping, editDistanceThreshold) {
	
	// first let's try a direct comparision
	const roomIndexName = roomMapping.findIndex(i => i.name === room.name);
	if (roomIndexName === -1) {
		// try room number direct mapping
		const roomIndexNumber = roomMapping.findIndex(i => i.roomNumber === room.roomNumber);
		
		// found by room number
		if (roomIndexNumber !== -1) {
			return roomMapping[roomIndexNumber];
		}
	} else {
		// found by room name
		return roomMapping[roomIndexName];
	}
	
	// not found yet -> try edit distance
	let minEditDistance = editDistanceThreshold + 1;
	let minEditDistanceRoomIndex = -1;
	
	for (var i = 0; i < roomMapping.length; i++) {
		d = calculateEditDistance(roomMapping[i].name, room.name);
		
		if (d < editDistanceThreshold) {
			minEditDistance = d;
			minEditDistanceRoomIndex = i;
		}
	}
	
	if (minEditDistanceRoomIndex === -1) return undefined;
	return roomMapping[minEditDistanceRoomIndex];
}

module.exports.getEventsFuture = getEventsFuture;
module.exports.getEventsToday = getEventsToday;
module.exports.getEventsTomorrow = getEventsTomorrow;
module.exports.filterPast = filterPast;
module.exports.filterToday = filterToday;
module.exports.filterTomorrow = filterTomorrow;