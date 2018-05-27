const express = require('express');
const router = express.Router();
const http = require('http');
const misc = require('../misc');
const controller = require('../controllers/mvg');

router.get('/', function(req, res, next) {
	res.send('mvg REST Api');
});


router.get('/departures/:station/all', function(req, res, next) {
	const station = req.params.station;
	
	const limit = req.query.limit || -1;
	const formatDashboard = req.query.formatDashboard || false;
	
	controller.getAllDeparturesForStation(station).then(lines => {
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
	
	controller.getSubwayDeparturesForStation(station).then(lines => {
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