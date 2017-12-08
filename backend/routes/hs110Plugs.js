const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const request = require('request');
const misc = require('../misc');
const { Client } = require('tplink-smarthome-api');
const energyModel = require('./../models/energy')

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
	
	// get the plugs object from mongoose
	energyModel.getAllPlugs(function (err, plugs) {
		if (err) {
			res.status(500).send({success: false, error: err});
			return;
		}
		
		res.status(200).send({success: true, plugs: plugs});
	});
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

router.put('/plugs', function(req, res, next) {
	if (req === null || req.body === null || req.body.name === undefined || req.body.host === undefined) {
		res.status(400).send({success: false, error: 'The request was not formatted correctly.'});
		return;
	}
	
	energyModel.create({
		name: req.body.name,
		host: req.body.host,
		energyLog: []
	}, function (err, plug) {
		if (err) res.send(err);
		
		console.log('[Plugs]:\tCreated new plug');
		res.send(plug);
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
	
	const plugName = req.params.plugName
	client.getDevice({host: plugs[plugName]})
	.then((device)=>{
		device.emeter.getRealtime().then((response) => {
			
			// log the current level into the database
			energyModel.getPlugEnergyHistory(plugName, function (err, plugDbDocument) {
				if (err) {
					res.status(500).send({success: false, error: err, device: plugs[plugName], state: response});
					return;
				}
				
				console.log('[Plugs]:\tFound plug db entry\n' + plugDbDocument);
				plugDbDocument.energyLog.push(response);
				plugDbDocument.save(function (err) {
					if (err) {
						res.status(500).send({success: false, error: err, device: plugs[plugName], state: response});
					} else {
						console.log('[Plugs]:\tCreated power state log');
						res.status(200).send({success: true, device: plugs[plugName], state: response});
					}
				});
			});
		});
	}).catch(function (err) {
		res.status(500).send({success: false, error: err, device: plugs[plugName]});
	});
});


router.post('/plugs/:plugName/state', function (req, res) {
	if (req !== null && req.body !== null && req.body.stateOn === null) {
		res.status(400).send({success: false, error: 'The request was not formatted correctly.'});
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