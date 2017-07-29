const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const hueConfig = require('./../config/hue')


/* GET all sensors
 * /api/hue/
 */
router.get('/', function(req, res, next) {
	
	doGetRequest('sensors', function (data) {
		res.setHeader('Content-Type', 'application/json');
		res.send(data);
	}, null, 'hue')
	
	
});

function doGetRequest(path, callback, error, name) {
	const options = {
		host: hueConfig.hueIp,
		port: 80,
		path: '/api/' + hueConfig.hueUser + '/' + path,
		method: 'GET'
	};
	request('http://' + options.host + options.path, function (err, response, body) {
		if (err) error(err);
		if (response.statusCode !== 200) error(body);
		
		// from within the callback, write data to response, essentially returning it.
		callback(body);
		
	});
}

module.exports = router;
