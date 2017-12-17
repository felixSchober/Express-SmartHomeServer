const schedule = require('node-schedule');
const hs110Plugs = require('./routes/hs110Plugs')
const espresso = require('./routes/espressoMachine');

module.exports.pollPowerState = schedule.scheduleJob('*/10 * * * * *', function () {
	hs110Plugs.updatePowerStateAndSaveToDb()
})
module.exports.pollNewEspresso = schedule.scheduleJob('*/1 * * * *', espresso.checkIfNewEspressoHasBeenCreated)

