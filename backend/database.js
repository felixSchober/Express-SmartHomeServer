const mongoUser = 'mongoUser'
const mongoPwd = 'mongoPwd'
const mongoURL = 'mongoURL'

module.exports = {
	remoteUrl : 'mongodb://' + mongoUser + ':' + mongoPwd + '@' + mongoURL,
};