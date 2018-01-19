const request = require('request');
const fs = require('fs');
const readline = require('readline');
const openHabConfig = require('./config/openhab');
const moment = require('moment');
const config = require('./config/misc');

const getFirstAndLastDayOfWeek = function() {
	let today, todayNumber, mondayNumber, sundayNumber, monday, sunday;
	today = new Date();
	todayNumber = today.getDay();
	mondayNumber = 1 - todayNumber;
	sundayNumber = 7 - todayNumber;
	monday = new Date(today.getFullYear(), today.getMonth(), today.getDate()+mondayNumber);
	sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate()+sundayNumber );
	
	return {monday: monday, sunday: sunday};
}

const getFirstDayOfCurrentMonth = function () {
	const today = new Date();
	return new Date(today.getFullYear(), today.getMonth(), 1 );
}

const addDaysToDate = function(date, days) {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

const performRequest = function (options, sender, debug, parseJson) {
	return new Promise(function (resolve, reject) {
		
		if (debug) {
			console.log(sender + '\t' + options.method + ' REQUEST: ' + options.uri);
		}
		
		// default for parseJson is true
		if (parseJson === undefined) {
			parseJson = true;
		}
		
		request(options, function (err, response, body) {
			if (err) {
				console.error('[' + sender + ']:\tperformRequest(' + options.uri + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Error while connecting to URI. Error: ' + err);
				reject(err);
			} else if (response == null) {
				console.error('[' + sender + ']:\tperformRequest(' + options.uri + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Possible connection error. Response was null.');
				reject('response was null');
			} else {
				const res = {status: response.statusCode, data: undefined};
				
				if ((response.statusCode !== 200 || response.statusCode !== 204) && (body == null || body === "")) {
					console.error('[' + sender + ']:\tperformRequest(' + options.uri + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Possible connection error. Body was empty but status is 200 OK');
					reject(res);
				} else {
					// already parse data if response is 200
					if (response.statusCode === 200) {
						if (parseJson) {
							try {
								res.data = JSON.parse(body);
							}
							catch (err) {
								console.error('[' + sender + ']:\tperformRequest(' + options.uri + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - JSON could not parse body although status is 200 OK and parseJSON is ' + parseJson + '\n More details: \n');
								console.error('[' + sender + ']:\tperformRequest(' + options.uri + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - ERROR: ' + err);
								console.error('[' + sender + ']:\tperformRequest(' + options.uri + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - STACK:' + err.stack);
								console.error('[' + sender + ']:\tperformRequest(' + options.uri + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Response BODY' + body);
								
								res.data = body;
							}
						}
					} else {
						console.error('[' + sender + ']:\tperformRequest(' + options.uri + ', ' + sender + ', ' + debug + ', ' + parseJson + ') - Possible connection error. Status is not 200 OK. STATUS: ' + response.statusCode);
						res.data = body
					}
					
					resolve(res);
				}
			}
		});
	});
}

const sortValueListDescending = function (list) {
	list.sort(function (a, b) {
		
		if (a.value < b.value) return 1;
		if (a.value > b.value) return -1;
		return 0;
	});
}

const sortValueListAscending = function (list) {
	list.sort(function (a, b) {
		
		if (a.value > b.value) return 1;
		if (a.value < b.value) return -1;
		return 0;
	});
}

const doOpenHabGetRequest = function(path) {
	const options = {
		uri: 'http://' + openHabConfig.url + ':' + openHabConfig.port + '/rest/' + path,
		method: 'GET'
	}
	return performRequest(options, '[OPENHAB]', true);
}

const doOpenHabPostRequest = function(path, body) {
	const options = {
		uri: 'http://' + openHabConfig.url + ':' + openHabConfig.port + '/rest/' + path,
		method: 'POST',
		body: body
	}
	return performRequest(options, '[OPENHAB]', true, false);
}

const pushDataToDashboardWidget = function (sender, widgetId, data) {
	const jsonBody = {
		'auth_token': config.dashboardApiKey,
		'current': data
	};
	const options = {
		uri: 'http://' + config.dashboardHost + '/widgets/' + widgetId,
		method: 'POST',
		json: jsonBody
	}
	
	// we will already await the result here since those operations are not mission critical and would otherwise clutter
	// the calling code since there are other more important operations there
	performRequest(options, sender, true, false)
	.then(function (result) {
		// everything should look fine here since the dashboard doesn't return anything by default. Just status code 204
		// even if it didn't work
		if (result.status === 204) {
			console.log('[' + sender + ']:\tpushDataToDashboardWidget(' + sender + ', ' + widgetId + ', ' + data + ') - Request successful');
		} else {
			console.error('[' + sender + ']:\tpushDataToDashboardWidget(' + sender + ', ' + widgetId + ', ' + data + ') - Request not successful. (Status: ' + result.status + ') Error: ' + result.data);
		}
	}).catch(function (err) {
		console.error('[' + sender + ']:\tpushDataToDashboardWidget(' + sender + ', ' + widgetId + ', ' + data + ') - Could not push data to dashboard. Error: ' + err);
	});
}

const checkIfDateToday = function (d) {
	const today = new Date();
	return (d.setHours(0, 0, 0, 0) == today.setHours(0, 0, 0, 0));
}

const checkIfDateTomorrow = function (d) {
	// create tomorrow object
	const today = moment();
	const tomorrow = today.add(1, 'days').toDate();
	return (d.setHours(0, 0, 0, 0) == tomorrow.setHours(0, 0, 0, 0));
}


module.exports.getFirstAndLastDayOfWeek = getFirstAndLastDayOfWeek;
module.exports.getFirstDayOfCurrentMonth = getFirstDayOfCurrentMonth;
module.exports.addDaysToDate = addDaysToDate;
module.exports.performRequest = performRequest;
module.exports.sortValueListDescending = sortValueListDescending;
module.exports.sortValueListAscending = sortValueListAscending;
module.exports.doOpenHabGetRequest = doOpenHabGetRequest;
module.exports.doOpenHabPostRequest = doOpenHabPostRequest;
module.exports.checkIfDateToday = checkIfDateToday;
module.exports.checkIfDateTomorrow = checkIfDateTomorrow;
module.exports.pushDataToDashboardWidget = pushDataToDashboardWidget;
