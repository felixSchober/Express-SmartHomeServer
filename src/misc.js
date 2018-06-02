const request = require('request');
const openHabConfig = require('./config/openhab');
const moment = require('moment');

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

const getWelcomeLogMessage = function () {
	console.log('   _____                      _   _    _                         _____                          ');
	console.log('  / ____|                    | | | |  | |                       / ____|                         ');
	console.log(' | (___  _ __ ___   __ _ _ __| |_| |__| | ___  _ __ ___   ___  | (___   ___ _ ____   _____ _ __ ');
	console.log("  \\___ \\| '_ ` _ \\ / _` | '__| __|  __  |/ _ \\| '_ ` _ \\ / _ \\  \\___ \\ / _ \\ '__\\ \\ / / _ \\ '__|");
	console.log("  ____) | | | | | | (_| | |  | |_| |  | | (_) | | | | | |  __/  ____) |  __/ |   \\ V /  __/ |   ");
	console.log(" |_____/|_| |_| |_|\\__,_|_|   \\__|_|  |_|\\___/|_| |_| |_|\\___| |_____/ \\___|_|    \\_/ \\___|_|   ");
	console.log('\n\n\n');
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
module.exports.getWelcomeLogMessage = getWelcomeLogMessage;
