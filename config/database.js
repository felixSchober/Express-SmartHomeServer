const mongoose = require('mongoose');


const mongoUser = 'nodeServer'
const mongoPwd = 'wm2007ger'
const mongoURL = 'ds153422.mlab.com:53422/smart-home-database'

const connectionString = 'mongodb://' + mongoUser + ':' + mongoPwd + '@' + mongoURL
let db = undefined;

const connectToDb = function (address) {
	// mongoose setup
	mongoose.connect(address);
	
	db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function() {
		console.log('Connection to mongoose successful.')
	});
}

module.exports = {
	remoteUrl : connectionString,
	connect: connectToDb,
	databaseInstance: db
};

