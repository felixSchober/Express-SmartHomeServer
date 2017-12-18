const schedule = require('node-schedule');
const hs110Plugs = require('./routes/hs110Plugs')
const espresso = require('./routes/espressoMachine');
const moment = require('moment');

module.exports.pollPowerState = schedule
	.scheduleJob('*/' + hs110Plugs.energyHistoryUpdateEveryXSeconds + ' * * * * *', function () {
		console.log('[Schedule] - ' + moment().format() + ':\tStarting power update');
		hs110Plugs.updatePowerStateAndSaveToDb()
})
module.exports.pollNewEspresso = schedule.scheduleJob('*/1 * * * *', function () {
	console.log('[Schedule] - ' + moment().format() + ':\tStarting espresso check');
	espresso.checkIfNewEspressoHasBeenCreated();
})

