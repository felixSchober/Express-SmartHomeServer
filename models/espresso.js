var mongoose = require('mongoose');

// define mongo model / schema
var espressoSchema = new mongoose.Schema({
	created: {type: Date, default: Date.now()}
});

var espressoMachineSchema = new mongoose.Schema({
	name: String,
	isOn: Boolean,
	updated: { type: Date, default: Date.now() },
	espressos: [espressoSchema]
});

espressoMachineSchema.statics.getEspressoMachine = function (callback) {
	return this.model('EspressoMachine').findOne({ 'name': 'Krupps Espresso' }, callback);
}

module.exports = mongoose.model('EspressoMachine', espressoMachineSchema);