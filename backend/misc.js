const request = require('request');
const fs = require('fs');
const readline = require('readline');
const openHabConfig = require('./config/openhab');

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

const performRequest = function (options, sender, debug) {
	return new Promise(function (resolve, reject) {
		
		if (debug) {
			console.log(sender + '\tREQUEST: ' + options.uri);
		}
		
		request(options, function (err, response, body) {
			if (err) {
				console.error(sender + '\tConnection error for URI (err)' + options.uri + ':\n' + err);
				reject(err);
			} else if (response == null) {
				console.error(sender + '\tPossible connection error for URI (response was null)' + options.uri);
				reject('response was null');
			} else {
				const res = {status: response.statusCode, data: undefined};
				
				if (body == null || body === "") {
					console.error(sender + '\tPossible connection error (body was null or empty) for URI ' + options.uri);
					reject(res);
				} else {
					// already parse data if response is 200
					if (response.statusCode === 200) {
						try {
							res.data = JSON.parse(body);
						}
						catch (err) {
							console.error(sender + '\tJSON could not parse body for URI ' + options.uri + '. An error occurred:\n' + err);
							console.error(sender + '\t' + err.stack);
							console.error(sender + '\tBody' + body);
							
							res.data = body;
						}
					} else {
						console.error(sender + '\tPossible connection error (Status: ' + response.statusCode + ') for URI ' + options.uri);
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

const doOpenHabRequest = function(path) {
	const options = {
		uri: 'http://' + openHabConfig.url + ':' + openHabConfig.port + '/rest/' + path,
		method: 'GET'
	}
	return performRequest(options, '[OPENHAB]', true);
}


module.exports.getFirstAndLastDayOfWeek = getFirstAndLastDayOfWeek;
module.exports.getFirstDayOfCurrentMonth = getFirstDayOfCurrentMonth;
module.exports.addDaysToDate = addDaysToDate;
module.exports.performRequest = performRequest;
module.exports.sortValueListDescending = sortValueListDescending;
module.exports.sortValueListAscending = sortValueListAscending;
module.exports.doOpenHabRequest = doOpenHabRequest;
