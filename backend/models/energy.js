var mongoose = require('mongoose');

// define mongo model / schema
var energySchema = new mongoose.Schema({
	current: Number,
	voltage: Number,
	power: Number,
	created: {type: Date, default: Date.now()}
});

var energyDayLog = new mongoose.Schema({
	log: [
		[Number], // 00:00
		[Number], // 01:00
		[Number], // 02:00
		[Number], // 03:00
		[Number], // 04:00
		[Number], // 05:00
		[Number], // 06:00
		[Number], // 07:00
		[Number], // 08:00
		[Number], // 09:00
		[Number], // 10:00
		[Number], // 11:00
		[Number], // 12:00
		[Number], // 13:00
		[Number], // 14:00
		[Number], // 15:00
		[Number], // 16:00
		[Number], // 17:00
		[Number], // 18:00
		[Number], // 19:00
		[Number], // 20:00
		[Number], // 21:00
		[Number], // 22:00
		[Number], // 23:00
	]
});

var plugEnergyStateSchema = new mongoose.Schema({
	name: String,
	host: String,
	updated: { type: Date, default: Date.now() },
	energyLog: [energyDayLog]
});

plugEnergyStateSchema.statics.getPlugEnergyHistory = function (plugName, callback) {
	return this.model('EnergyLog').findOne({ 'name': plugName }, callback);
}

plugEnergyStateSchema.statics.getAllPlugs = function (callback) {
	return this.model('EnergyLog').find({}, callback);
}
module.exports = mongoose.model('EnergyLog', plugEnergyStateSchema);