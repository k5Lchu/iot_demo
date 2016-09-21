// import thread pool library
const Pool = require('threads').Pool;

// create shared states/objects
module.exports = {
	on: [],
	pool: new Pool(1)
};
