const schedule = require('node-schedule');
const hs110Plugs = require('./routes/power')
const espresso = require('./routes/espressoMachine');
const moment = require('moment');

module.exports.pollPowerState = schedule
	.scheduleJob('*/' + hs110Plugs.energyHistoryUpdateEveryXSeconds + ' * * * * *', function () {
		console.log('[Schedule] - ' + moment().format() + ':\tStarting power update');
		hs110Plugs.updatePowerState()
});

// save history every hour
module.exports.savePowerStateToDb = schedule
.scheduleJob('59 * * * *', function () {
	console.log('[Schedule] - ' + moment().format() + ':\tSave PowerState to DB');
	// TODO: Solve problem!
	//hs110Plugs.savePowerStateToDb()
});

module.exports.pollNewEspresso = schedule.scheduleJob('*/1 * * * *', function () {
	console.log('[Schedule] - ' + moment().format() + ':\tStarting espresso check');
	espresso.checkIfNewEspressoHasBeenCreated();
});

