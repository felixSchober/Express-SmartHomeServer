var mongoose = require('mongoose');

// define mongo model / schema
var energySchema = new mongoose.Schema({
	current: Number,
	voltage: Number,
	power: Number,
	created: {type: Date, default: Date.now()}
});

var plugEnergyStateSchema = new mongoose.Schema({
	name: String,
	host: String,
	updated: { type: Date, default: Date.now() },
	energyLog: [energySchema]
});

plugEnergyStateSchema.statics.getPlugEnergyHistory = function (plugName, callback) {
	return this.model('EnergyLog').findOne({ 'name': plugName }, callback);
}

plugEnergyStateSchema.statics.getAllPlugs = function (callback) {
	return this.model('EnergyLog').find({}, callback);
}
module.exports = mongoose.model('EnergyLog', plugEnergyStateSchema);