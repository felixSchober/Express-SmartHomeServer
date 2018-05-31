const schedule = require('node-schedule');
const moment = require('moment');
const controller = require('../controllers/calendar');
const socketController = require('../controllers/socket');
module.exports.socketActor = function (io) {
	const calendarUpdate = schedule
	.scheduleJob('*/15 * * * *', function () {
		console.log('[Schedule] - ' + moment().format() + ':\tGet current calendar events');
		sendCalendarEvents(io);
	});
	
	return calendarUpdate;
}

function sendCalendarEvents(io) {
	controller.getEventsFuture()
	.then((result) => {
		const eventList = result.events;
		
		socketController.send(io, 'calendarEventsList', eventList);
		
		// how many events today?
		const eventsToday = controller.filterToday(eventList);
		const eventsTomorrow = controller.filterTomorrow(eventList);
		socketController.send(io, 'calendarEventsTodayCount', eventsToday.length);
		socketController.send(io, 'calendarEventsTomorrowCount', eventsTomorrow.length);
	})
	.catch((err) => {
		socketController.log(io, 'Could not get calendar events. Error: ' + err, true);
	});
}