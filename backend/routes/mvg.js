const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const mvgApi = require('@lynbarry/mvg-api');

router.get('/', function(req, res, next) {
	res.send('mvg REST Api');
});


router.get('/departures/:station/all', function(req, res, next) {
	const station = req.params.station;
	
	const limit = req.query.limit || -1;
	const formatDashboard = req.query.formatDashboard || false;
	
	mvgApi.getDepartures(station, ['u', 's', 'b', 't']).then(lines => {
		console.log(lines.toString());
		
		if (formatDashboard) {
			lines = formatResponseToDashboard(lines);
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
	const formatDashboard = req.query.formatDashboard || false;
	
	mvgApi.getDepartures(station, ['u']).then(lines => {
		console.log(lines.toString());
		
		if (formatDashboard) {
			lines = formatResponseToDashboard(lines);
		}
		
		if (limit > 0) {
			lines = lines.slice(0, limit);
		}
		res.send(lines);
	});
});

function formatResponseToDashboard(lines) {
	lines = lines.map((element) => {
		return {
			"label": element.lineType.toUpperCase() + element.lineNumber + " -> " + element.lineDestination,
			"value": element.lineDepartureIn + "m"
		};
	});
	
	return lines;
}

module.exports = router;