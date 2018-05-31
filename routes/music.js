const express = require('express');
const router = express.Router();
const path = require('path');
const http = require('http');
const misc = require('./../misc');

module.exports = router;

const widgetIdCommandMapping = {
	"volumeUp": ["music_volume"],
	"volumeDown": ["music_volume"],
	"playPause": ["music_playPause"],
	"skip": ["music_trackInfo", "music_cover"],
	"previous": ["music_trackInfo", "music_cover"],
	"stop": ["music_trackInfo", "music_cover", "music_playPause"],
	"toggleMute": ["music_toggleMute"]
}

router.get('/', function(req, res, next) {
	res.send('Music API');
});

router.post('/executeCommand/track/:command', function(req, res, next) {
	
	const command = req.params.command;
	console.log('[iTunes] router.post(\'/executeCommand/track/' + command);
	
	switch (command){
		case 'previous':
			executeiTunesServerPost('player/previous', {})
			break;
		case 'skip':
			executeiTunesServerPost('player/skip', {})
			break;
		default:
			console.log('[iTunes] router.post(\'/executeCommand/track/' + command + ' - command not recognized.');
			res.status(400).send(); // bad request
			return;
	}
	res.status(200).send();
});

router.post('/executeCommand/player/:command', function(req, res, next) {
	
	const command = req.params.command;
	console.log('[iTunes] router.post(\'executeCommand/player/' + command);
	let path = '';
	let body = {};
	switch (command){
		case 'volumeUp':
			path = 'volume';
			body = {Data: 5, Name: 'Volume'}
			break;
		case 'volumeDown':
			path = 'volume';
			body = {Data: -5, Name: 'Volume'}
			break;
		case 'toggleMute':
			path = 'mute';
			break;
		case 'playPause':
			path = 'playPause';
			break;
		case 'stop':
			// TODO
			break;
		default:
			console.log('[iTunes] router.post(\'executeCommand/player/' + command + ' - command not recognized.');
			res.status(400).send(); // bad request
			return;
	}
	let promise = executeiTunesServerPost('state/' + path, body);
	handleiTunesServerPostResponse(promise, command);
	
	res.status(200).send();
});

function handleiTunesServerPostResponse(promise, command) {
	promise.then((response) => {
		let type = "";
		let content;
		if (command === "volumeUp" || command === "volumeDown") {
			type = "Number";
			content = [response.data];
		} else if (command === "playPause"){
			type = "Text";
			content = [response.data ? "Pause" : "Play"];
		} else if (command === "skip" || command === "previous") {
			type = "Text";
			content = [formatTrackInfoString(response), ''];
		} else if (command === "stop") {
			type = "Text";
			content = ['', '', 'music_playPause'];
		}
		
		
		let widgetsToPushTo = widgetIdCommandMapping[command];
		for (var i = 0; i < widgetsToPushTo.length; i++) {
			let widgetId = widgetsToPushTo[i];
			
			if (widgetId === "music_cover") {
				misc.pushDataToDashboardWidget('Music', widgetId, 'http://localhost:63266/api/music/cover', type);
			} else {
				misc.pushDataToDashboardWidget('Music', widgetId, content[i], type);
			}
		}
	}).catch(function (err) {
		console.error('[Music]:\thandleiTunesServerPostResponse(promise, ' + command + ') - Could not execute command: ' + err);
	});
}

function formatTrackInfoString(trackInfo) {
	if (trackInfo === null) return "?";
	
	let result = trackInfo.name + '\n' + trackInfo.artist + '\n' + trackInfo.album;
	return result;
}

function executeiTunesServerPost(path, body) {
	const options = {
		uri: 'http://localhost:63266/api/' + path,
		method: 'POST',
		json: body
	}
	return misc.performRequest(options, '[iTunes]', true)
}

function executeiTunesServerGet(path) {
	const options = {
		uri: 'http://localhost:63266/api/' + path,
		method: 'GET'
	}
	return misc.performRequest(options, '[iTunes]', true)
}
module.exports.routePath = 'music';
