/* A node js http server that communicates with an android app to turn on/off
 * devices in the home. Each connected device has two op codes for turning on and off.
 * For example, socket 1 contains codes 0(on) and 1(off), socket 2 contains 2(on) and 3 (off).
 * A op code of -1 is simple to query the statuses of the server's connected devices.
 */


// import packages needed for the server
var http = require('http');
var connect = require('connect');
var url = require('url')
var cp = require('child_process');

//var https = require('https');
//var fs = require('fs');
var Fiber = require('fibers');
var fs = require('fs');

var parser = require('querystring')
var state = require('./state')

// create connect applictaion that intercats with node js server
var serverApp = connect();

/*
var options = {
	key:   fs.readFileSync('');
	cert:  fs.readFileSync('');
};*/

// startup file that initializes known sockets connected to the system
fs.readFile('numSockets.nu', 'utf8', function (err,data) {
	// if error occured, cancel starting server
	if (err) {
		console.log('Error reading numSocket file. Shutting down...');
		process.exit();
	}
	// add sockets to state database for the server
	var sockets = data.split(" ");
	for (i = 0; i < sockets.length; i++) {
		state.on.push(0);
	}
	console.log(state.on.length + ' sockets available');
});

// close conncted sockets if they're on
cp.spawn('./close.sh', []);

// function used to pause a fiber function for a delay
function sleep (delay) {
	var fiber = Fiber.current;
	setTimeout(function () {
		fiber.run();
	}, delay);
	Fiber.yield();
}

// function used for adding future authentification fucntions
// main purpose to only allow post requests with valid urls
function authenticate (req, res, next) {
	if (req.url != '/' || req.method != 'POST')
		return;
	console.log("Authentificating request");
	var reqBody = '';
	req.on('data', function(data) {
		reqBody += data;
		if (reqBody.length > 1e7)
			console.log('Request body too long');
			return;
	});
	// when post requests data is finsihed being collected,
	// check for test password
	req.on('end', function(){
		// collect post request data
		req.reqData = parser.parse(reqBody);
		if (req.reqData.pass == '12345') {
			// move on to next function in stack (processing function)
			next();
		}
	});
}

// processes post request data to turn on/off a connected device
function processRequest (req, res, next) {
	
	// encircle all code into a fiber function to allow pausing
	Fiber(function() {
		// begin writting response
		res.writeHead(200,{'Content-Type':'text/plain'});

		// varibales for post request data, op code, and specified outlet
		var reqData = req.reqData;
		var op = parseInt(reqData.op);
		var outlet = Math.floor(op/2);

		// variable to hold child process which turns device on/off
		var currProcess = null;

		// if op code not valid, send error
		if (outlet >= state.on.length)
			res.write('Invalid socket');
		// if op is -1 return status string
		else if (op < 0) {
			console.log('Asking for status');
			var status_res = 'status ';
			// get status of all connected devices
			for (i = 0; i < state.on.length; i++) {
				if (Boolean(state.on[i]))
					status_res = status_res.concat('on ');
				else
					status_res = status_res.concat('off ')
			}
			res.write(status_res);
		}
		// if op code is even (a turn on code)
		else if ((op % 2) == 0) {
			// sleep for 100ms if server is still fufilling another request
			while (Boolean(state.processing)) {
				sleep(100);
			}
			// start child process and change recorded status of device
			var commandOutlet = String.fromCharCode(outlet+97);
			var command = commandOutlet.concat('_on');
			currProcess = cp.spawn('python', ['switch.py', command]);
			state.on[outlet] = 1;
			res.write('on ' + (outlet+1).toString());
			console.log('outlet' + (outlet+1).toString() + ' on');
		}
		// if op code is odd (a turn off code)
		else {
			while (Boolean(state.processing)) {
				sleep(100);
			}
			var commandOutlet = String.fromCharCode(outlet+97);
			var command = commandOutlet.concat('_off');
			currProcess = cp.spawn('python', ['switch.py', command]);
			state.on[outlet] = 0;
			res.write('off ' + (outlet+1).toString());
			console.log('outlet' + (outlet+1).toString() + ' off');
		}

		// if child process was started, set server status to busy and
		// set callback for when child process has finished
		if (currProcess != null) {
			state.processing = 1;
			currProcess.on('close', processComplete);
			console.log('begin processing');
		}
		// send response to origin
		res.end();
	}).run();
}

// callback for when a child process has finished
function processComplete (code) {
	// reset busy status of server
	state.processing = 0;
	console.log('finish processing');
}

// set applictaion to use authenticate fucntion first, then
// the processRequest fucntion when a http request arrives
serverApp.use(authenticate);
serverApp.use(processRequest);

//var server = https.createServer(options,serverApp);
//server.listen(1820);

// create http server with the created connect application
var server = http.createServer(serverApp);
// allow server to listen for requests on port 1821
server.listen(1821);
console.log('Server is now running...');

// if server encounters error, log the error
server.on('error', function (err) {
	console.log(err);
	cp.spawn('./close.sh', []);
	server.close();
	process.exit();
});

// if user presses ctrl+c, begin server shutdown
process.on('SIGINT', function() {
	console.log("Shutting down server");
	cp.spawn('./close.sh', []);
	server.close();
	process.exit();
});
