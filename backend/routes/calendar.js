const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');


router.get('/', function(req, res, next) {
	
	res.send('calendar REST Api');
});


// mock for now
router.get('/events/today/count', function(req, res, next) {
	
	res.send({count: 10});
});

module.exports = router;