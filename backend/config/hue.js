const hueIp = '192.168.178.20';
const hueUser = 'UJL3qt0jG-zI0eqhj8w6Ae5b4c9Msq-WwGztDmAu';

const hueMotionSensorNameIdMapping = {
	'kitchen': 57,
	'entrance': 64
};

module.exports = {
	hueIp: '192.168.178.20',
	hueUser: 'UJL3qt0jG-zI0eqhj8w6Ae5b4c9Msq-WwGztDmAu',
	hueUrl : hueIp + '/api/' + hueUser + '/',
	hueMotionSensorNameIdMapping: hueMotionSensorNameIdMapping
};