const mongoose = require('mongoose');
const userConfig = require('./passwordsAndUsers');

const mongoUser = userConfig.mongoUser;
const mongoPwd = userConfig.mongoPwd;
const mongoURL = userConfig.mongoURL;

const connectionString = 'mongodb://' + mongoUser + ':' + mongoPwd + '@' + mongoURL;
let db = undefined;

const connectToDb = function (address) {
	// mongoose setup
	mongoose.connect(address);
	console.log('[Database] Connect to mongo db instance on ' + mongoURL);
	db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function() {
		console.log('[Database] Connection to mongoose successful.')
	});
}

module.exports = {
	remoteUrl : connectionString,
	connect: connectToDb,
	databaseInstance: db
};

