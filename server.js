var http = require('http');
var connect = require('connect');
var url = require('url')
var cp = require('child_process');

//var https = require('https');
//var fs = require('fs');

var parser = require('querystring')
var state = require('./state')

var serverApp = connect();
var reqData = null;

/*
var options = {
	key:   fs.readFileSync('');
	cert:  fs.readFileSync('');
};*/

cp.spawn('./close.sh', []);

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
	req.on('end', function(){
		reqData = parser.parse(reqBody);
		if (reqData.pass == '12345') {
			next();
		}
		else
			reqData = null;
	});
}

function processRequest (req, res, next) {
	res.writeHead(200,{"Content-Type":"text/plain"});
	var op = parseInt(reqData.op);
	console.log(op.toString());
	var currProcess = null;
	if (op < 0) {
		console.log('Asking for status');
		if (state.processing == 0) {
			var status_res = "status ";
			if (Boolean(state.on_1))
				status_res = status_res.concat("on ");
			else
				status_res = status_res.concat("off ");
			if (Boolean(state.on_2))
				status_res = status_res.concat("on");
			else
				status_res = status_res.concat("off");
			res.write(status_res);
		}
		else {
			console.log('server busy');
			res.write("busy stat");
		}
	}
	else if ((op % 2) == 0) {
		var outlet = Math.floor(op/2);
		if (state.processing == 0) {
			switch (outlet) {
				case 0:
					currProcess = cp.spawn('python', ['switch.py', 'a_on']);
					res.write("on 1");
					state.on_1 = 1;
					console.log('outlet1 on');
					break;
				case 1:
					currProcess = cp.spawn('python', ['switch.py', 'b_on']);
					res.write("on 2");
					state.on_2 = 1;
					console.log('outlet2 on');
					break;
			}
		}
		else {
			console.log('server busy');
			var busyResponse = "busy on ".concat(outlet.toString());
			res.write(busyResponse);
		}
	}
	else {
		var outlet = Math.floor(op/2);
		if (state.processing == 0) {
			switch (outlet) {
				case 0:
					currProcess = cp.spawn('python', ['switch.py', 'a_off']);
					res.write("off 1");
					state.on_1 = 0;
					console.log('outlet1 off');
					break;
				case 1:
					currProcess = cp.spawn('python', ['switch.py', 'b_off']);
					res.write("off 2");
					state.on_2 = 0;
					console.log('outlet2 off');
					break;
			}
		}
		else {
			console.log('server busy');
			var busyResponse = "busy off ".concat(outlet.toString());
			res.write(busyResponse);
		}
	}
	if (currProcess != null) {
		state.processing = 1;
		currProcess.on('close', processComplete);
		console.log('begin processing');
	}
	res.end();
	reqData = null;
}

function processComplete (code) {
	state.processing = 0;
	console.log('finish processing');
}

serverApp.use(authenticate);
serverApp.use(processRequest);

//var server = https.createServer(options,serverApp);
//server.listen(1820);

var server = http.createServer(serverApp);
server.listen(1821);
console.log("Server is now running...");

server.on('error', function (err) {
	console.log(err);
});

process.on('SIGINT', function() {
	console.log("Shutting down server");
	state.on_1 = 0;
	state.on_2 = 0;
	state.processing = 0;
	cp.spawn('./close.sh', []);
	server.close();
	process.exit();
});
