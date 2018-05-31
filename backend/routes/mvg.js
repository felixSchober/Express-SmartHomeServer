const express = require('express');
const router = express.Router();
const http = require('http');
const misc = require('../misc');
const moment = require('moment');

const u3Stations = ['Moosach', 'Olympia-Einkaufszentrum', 'Oberwiesenfeld', 'Scheidplatz', 'Münchner Freiheit', 'Universität', 'Odeonsplatz', 'Marienplatz', 'Sendlinger Tor', 'Goetheplatz', 'Thalkirchen', 'Obersendling', 'Fürstenried West'];
const refreshCacheEveryXMinutes = 8;
let lastRefreshed = moment().subtract(10, 'years');
let u3DepaturesCache = [[], [], []]; // index 0: Moosach - index 1: Fürstenried West

router.get('/', function(req, res, next) {
	res.send('mvg REST Api');
});


router.get('/departures/:station/all', function(req, res, next) {
	const station = req.params.station;
	
	const limit = req.query.limit || -1;
	const formatDashboard = req.query.formatDashboard || false;
	
	controller.getAllDeparturesForStation(station).then(lines => {
		if (formatDashboard) {
			lines = formatCacheToDashboard(lines);
		}
		
		if (limit > 0) {
			lines = lines.slice(0, limit);
		}
		res.send(lines);
	});
});

router.get('/departures/:station/subway', function(req, res, next) {
	const station = req.params.station;
	
	const limit = req.query.limit || -1;
	const lineNumber = parseInt(req.query.lineNumber) || 3;
	const formatDashboard = req.query.formatDashboard || false;
	
	const refreshTimeDiff = moment().diff(lastRefreshed, 'minutes');
	const shouldRefresh = u3DepaturesCache[0].length === 0 || u3DepaturesCache[1].length === 0 || refreshTimeDiff >= refreshCacheEveryXMinutes || lineNumber !== 3;
	if (shouldRefresh) {
		lastRefreshed = moment();
	controller.getSubwayDeparturesForStation(station).then(lines => {
		console.log(lines.toString());
			fillDepartureCache(lines);
			
			res.send(prepareOutput(lines, limit, formatDashboard));
		});
	} else {
		// use cache
	
		
		// refresh cache
		refreshDepartureCache(u3DepaturesCache[0]);
		refreshDepartureCache(u3DepaturesCache[1]);
		refreshDepartureCache(u3DepaturesCache[2]);
		
		res.send(prepareOutput(u3DepaturesCache[2], limit, formatDashboard));
	}
});

function fillDepartureCache(departures) {
	// empty cache
	u3DepaturesCache = [[], [], []];
	
	for (var i = 0; i < departures.length; i++) {
		addDepartureToCache(departures[i]);
	}
}

function addDepartureToCache(element) {
	// determine departure time
	const departureTime = moment().add('minutes', element.lineDepartureIn);
	const directionIndex = determineDirection(element.lineDestination);
	
	const train = {
		lineNumber: element.lineType.toUpperCase() + element.lineNumber,
		directionIndex: directionIndex,
		lineDestination: element.lineDestination,
		lineDepartureIn: element.lineDepartureIn,
		departureTime: departureTime
	}
	u3DepaturesCache[directionIndex].push(train); // direction specific
	u3DepaturesCache[2].push(train); // all departures
}

function determineDirection(toStation) {
	const toIndex = u3Stations.indexOf(toStation);
	
	if (toIndex === -1) return -1;
	
	// direction Moosach
	else if (toIndex <= 2) return 0;
	
	// direction Fürstenried West
	else return 1;
}

function refreshDepartureCache(departures) {
	// refresh departureIn Time
	departures = departures.map((element) => {
		const departureTime = element.departureTime;
		const departureIn = moment().diff(departureTime, 'minutes');
		element.lineDepartureIn = -departureIn;
		return element;
	});
	
	// remove elements that have a departure time less than 1 minute
	departures = departures.filter((element) => {
		return element.lineDepartureIn > 1;
	});
	
	return departures;
}

function prepareOutput(data, limit, formatDashboard) {
	if (formatDashboard) {
		data = formatCacheToDashboard(data);
	}
	
	if (limit > 0) {
		data = data.slice(0, limit);
	}
	
	return data;
}

function formatCacheToDashboard(lines) {
	lines = lines.map((element) => {
		return {
			"label": element.lineNumber + " -> " + element.lineDestination,
			"value": element.lineDepartureIn + "m"
		};
	});
	
	return lines;
}

module.exports = router;