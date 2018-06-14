import {userConfig} from './userConfig';

const hueIp = userConfig.hueIp;
const hueUser = userConfig.hueUser;

const hueMotionSensorNameIdMapping: {[id: string]: number} = {
	'kitchen': 57,
	'entrance': 64
};

// wattage per light in the 254 brightness state from Philips.
// For entries that are -1 a per device mapping needs to be done
const lightTypePowerMapping: {[id: string]: number} = {
	'Color temperature light': 5.5,
	'Dimmable light': 9.5,
	'Extended color light': 10.0,
	'Color light': -1,
	'On/Off plug-in unit': -1
};

const lightsPowerLevelNotScalable = [
	'On/Off plug-in unit'
];

// wattage that each of the hue devices needs
const lightIdPowerMapping: {[id: string]: number} = {
	'00:17:88:01:01:23:60:18-0b': 10.0, // IRIS Deckenstrahler
	'00:17:88:01:00:cb:7d:95-0b': 13.0, // Lightstrip Fenster
	'84:18:26:00:00:0b:3d:9d-03': 8.0, //Plug Schreibtisch
	'7c:b0:3e:aa:00:a3:41:3b-03': 6.0, //Plug Ambilight
	'7c:b0:3e:aa:00:a3:ca:f5-03': 2.0, //Plug Schrank
	'84:18:26:00:00:0c:6f:b5-03': 4.0, //Plug Theke
	'84:18:26:00:00:0c:6f:43-03': 25.0 // Plug Arbeitsplatte
};

export const hueConfig = {
	hueIp: hueIp,
	hueUser: hueUser,
	hueUrl : hueIp + '/api/' + hueUser + '/',
	hueMotionSensorNameIdMapping: hueMotionSensorNameIdMapping,
	lightTypePowerMapping: lightTypePowerMapping,
	lightIdPowerMapping: lightIdPowerMapping,
	lightsPowerLevelNotScalable: lightsPowerLevelNotScalable,
	maxBrightnessLevel: 254,
	kitchenWorkSceneId: '2LQymE8reGFuffW',
	kitchenGroupId: '9',
	kitchenSceneGroupStatusWidgetId: 'kitchenGroupStatus'
};