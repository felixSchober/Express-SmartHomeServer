const request = require('request');
const misc = require('../misc');
const mvgApi = require('@lynbarry/mvg-api');

const getAllDeparturesForStation = function (stationName) {
	return mvgApi.getDepartures(stationName, ['u', 's', 'b', 't']);
}

const getSubwayDeparturesForStation = function (stationName) {
	return mvgApi.getDepartures(stationName, ['u']);
}

module.exports.getAllDeparturesForStation = getAllDeparturesForStation;
module.exports.getSubwayDeparturesForStation = getSubwayDeparturesForStation;