const request = require('request');
const misc = require('../../misc');
const openHabConfig = require('../../config/openhab');

const channelNumberMapping = {
	'ARD': [1],
	'ZDF': [2],
	'SAT1': [3],
	'RTL': [4],
	'RTL2': [5],
	'VOX': [6],
	'PRO7': [7],
	'KABEL': [8],
	'NTV': [9],
	'N24': [1, 0],
	'ZDFINFO': [1, 1],
	'ZDFNEO': [1, 8],
	'KABEL1DOKU': [1, 3],
	'RTLNITRO': [3, 4],
	'TELE5': [1, 2],
	'SIXX': [1, 1],
	'ARTE': [1, 6],
	'CNN': [1, 7],
	'EUROSPORT': [1, 4],
	'SAT1GOLD': [2, 2],
	'3SAT': [5, 6],
	'BR': [4, 6],
	'SPORT1': [2, 0],
	'EINSPLUS': [1, 1],
	'SWR': [6, 7],
	'TAGESSCHAU24': [1, 5],
	'PRO7MAX': [2, 3],
	'WDW': [3, 7]
}

let currentChannelName = 'ARD';
let channelList = ['ARD',
		'ZDF',
		'SAT1',
		'RTL',
		'RTL2',
		'VOX',
		'PRO7',
		'KABEL',
		'NTV',
		'N24',
		'ZDFINFO',
		'ZDFNEO',
		'KABEL1DOKU',
		'RTLNITRO',
		'TELE5',
		'SIXX',
		'ARTE',
		'CNN',
		'EUROSPORT',
		'SAT1GOLD',
		'3SAT',
		'BR',
		'SPORT1',
		'EINSPLUS',
		'SWR',
		'TAGESSCHAU24',
		'PRO7MAX',
		'WDW'];

const getCurrentActivity = function () {
	return new Promise((resolve, reject) => {
		misc.doOpenHabGetRequest('items/HarmonyHub_CurrentActivity')
		.then(function (result) {
			
			const isActivityRunning = (result.data.state !== 'PowerOff');
			
			const response = {
				'activityRunning': isActivityRunning,
				'activity': result.data.state
			}
			resolve(response);
		})
		.catch(function (err) {
			console.error('[HARMONY]:\tgetCurrentActivity - Error while performing request. Error: ' + err);
			reject('Error while performing request.' + err);
		});
	});
}

const startActivity = function (device) {
	return new Promise((resolve, reject) => {
		misc.doOpenHabPostRequest('items/HarmonyHub_CurrentActivity', device)
		.then((result) => {
			resolve({success: true, result: result, device: device});
		})
		.catch((err) => {
			console.error('[HARMONY]:\tstartActivity({0}) - Error while performing request. Error: {1}'.format(device, err));
			reject({success: false, error: err, device: device});
		});
	});
}

const stopActivity = function () {
	return new Promise((resolve, reject) => {
		misc.doOpenHabPostRequest('items/HarmonyHub_CurrentActivity', 'PowerOff')
		.then((result) => {
			resolve({success: true, result: result});
		})
		.catch((err) => {
			console.error('[HARMONY]:\tstopActivity() - Error while performing request. Error: {1}'.format(err));
			reject({success: false, error: err});
		});
	});
}

const changeChannel = function (channelName) {
	return new Promise((resolve, reject) => {
		const changeChannelFunctionName = '[Harmony]:\tchangeChannel({0}) - '.format(channelName);
		const channelNumberList = channelNumberMapping[channelName];
		console.log(changeChannelFunctionName + 'Switching to {0} ({1})'.format(channelName, channelNumberList));
		
		let currentNumber = channelNumberList[0];
		misc.doOpenHabPostRequest('items/' + openHabConfig.harmonyDeviceButtonPressItems['tv'], '' + currentNumber)
		.then((result) => {
			
			// channel number is > 9
			if (channelNumberList.length > 1) {
				let currentNumber = channelNumberList[1];
				misc.doOpenHabPostRequest('items/' + openHabConfig.harmonyDeviceButtonPressItems['tv'], '' + currentNumber)
				.then((result2) => {
					resolve({success: true, result: result2});
				})
				.catch(function (err) {
					console.error(changeChannelFunctionName +'Could not send second channel command. Error: ' + err);
					resolve({success: false, error: err, message: 'Could not send second channel command'});
				});
			} else {
				resolve({success: true, result: result});
			}
		})
		.catch((err) => {
			console.error(changeChannelFunctionName + 'Error while performing request. Error: {0}'.format(err));
			reject({success: false, error: err, channelName: changeChannel});
		});
	});
}

const getCurrentChannel = function () {
	return channelList.indexOf(currentChannelName);
}

module.exports.getCurrentActivity = getCurrentActivity;
module.exports.startActivity = startActivity;
module.exports.stopActivity = stopActivity;
module.exports.changeChannel = changeChannel;
module.exports.getCurrentChannel = getCurrentChannel;