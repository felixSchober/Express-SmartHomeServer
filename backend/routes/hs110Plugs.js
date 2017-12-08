const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const { Client } = require('tplink-smarthome-api');
const client = new Client();

const plugs = {
	'Espresso': '192.168.178.62'
};

/* GET welcome message
 * /api/harmony/
 */
//router.get('/', function(req, res, next) {
	
	//res.send('HS110 Plug REST Api');
//});

router.get('/plugs/', function(req, res, next) {
// Search for all plugs and turn them on
	res.send(plugs);
});

router.get('/plugs/:plugName', function(req, res, next) {
	client.getDevice({host: plugs[req.params.plugName]})
	.then((device)=>{
		device.getSysInfo()
		.then(response => {
			res.send(response);
		});
	}).catch(function (err) {
		res.status(500).send({success: false, error: err, device: plugs[req.params.plugName]});
	});
});

router.get('/plugs/:plugName/state', function(req, res, next) {
	client.getDevice({host: plugs[req.params.plugName]})
	.then((device)=>{
		device.getSysInfo()
		.then(response => {
			if (response.relay_state === 1) res.send({stateOn: true});
			else res.send({stateOn: false});
		}).catch(function (err) {
			res.status(500).send({success: false, error: err, device: plugs[req.params.plugName]});
		});
	});
});


router.get('/plugs/:plugName/powerState', function(req, res, next) {
	client.getDevice({host: plugs[req.params.plugName]})
	.then((device)=>{
		device.emeter.getRealtime().then((response) => {
			res.send(response);
		});
	}).catch(function (err) {
		res.status(500).send({success: false, error: err, device: plugs[req.params.plugName]});
	});
});


router.post('/plugs/:plugName/state', function (req, res) {
	if (req !== null && req.body !== null && req.body.stateOn === null) {
		res.status(400).send('The request was not formatted correctly.');
		return;
	}
	
	const stateOn = req.body.stateOn;
	
	client.getDevice({host: plugs[req.params.plugName]})
	.then((device)=>{
		device.setPowerState(stateOn);
		res.send({stateOn: stateOn});
	})
	.catch(function (err) {
		res.status(500).send({success: false, error: err, device: plugs[req.params.plugName]});
	});
});

module.exports = router;