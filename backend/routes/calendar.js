const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const config = require('./../config/calendar');
const moment = require('moment');
const controller = require('../controllers/calendar');


router.get('/', function(req, res, next) {
	
	res.send('calendar REST Api');
});

router.get('/events/', function(req, res, next) {
	controller.getEventsFuture()
	.then((result) => {
		res.send(result);
	})
	.catch(function (err) {
		console.error('[CALENDAR]:\trouter.get(\'/events\', function(req, res, next) - Could not get some calendar. Error: ' + err);
		res.status(500).send({'err': err});
	});
});

router.get('/events/today', function(req, res, next) {
	controller.getEventsToday()
	.then((result) => {
		res.send(result);
	})
	.catch(function (err) {
		console.error('[CALENDAR]:\trouter.get(\'/events/today\', function(req, res, next) - Could not get some calendar. Error: ' + err);
		res.status(500).send({'err': err});
	});
});

router.get('/events/tomorrow', function(req, res, next) {
	controller.getEventsTomorrow()
	.then((result) => {
		res.send(result);
	})
	.catch(function (err) {
		console.error('[CALENDAR]:\trouter.get(\'/events/tomorrow\', function(req, res, next) - Could not get some calendar. Error: ' + err);
		res.status(500).send({'err': err});
	});
});

router.get('/events/today/count', function(req, res, next) {
	controller.getEventsToday()
	.then((result) => {
		res.send(result);
	})
	.catch(function (err) {
		console.error('[CALENDAR]:\trouter.get(\'/events/today/count\', function(req, res, next) - Could not get some calendar. Error: ' + err);
		res.status(500).send({'err': err});
	});
	
});

router.get('/events/tomorrow/count', function(req, res, next) {
	controller.getEventsTomorrow()
	.then((result) => {
		res.send(result);
	})
	.catch(function (err) {
		console.error('[CALENDAR]:\trouter.get(\'/events/tomorrow/count\', function(req, res, next) - Could not get some calendar. Error: ' + err);
		res.status(500).send({'err': err});
	});
});


module.exports = router;