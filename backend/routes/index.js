var express = require('express');
var router = express.Router();
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
	const pathToIndex = path.join(__dirname, '../../', 'dist/index.html')
	res.sendFile(pathToIndex);
});

module.exports = router;
