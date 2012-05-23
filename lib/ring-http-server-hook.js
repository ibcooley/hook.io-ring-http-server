var util = require('util'),
	http = require('http'),
	RingNode = require('hook.io-ring').RingNode;

var RingHttpServer = module.exports = function RingHttpServer(options) {
	var self = this;
	
	// handle options
	options || (options = {});
	options.name || (options.name = (options.family || 'default') + '-ring-http-server');
	self.portRange = options.portRange || [3100, 3150];

	// call super
	RingNode.call(self, options);

	// set during init
	self.httpServer = null;
};
util.inherits(RingHttpServer, RingNode);

// override me!
RingHttpServer.prototype.getRequestListener = function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Hello World (from hook.io-http-ring)! Override getRequestListener() to make me go away!\n');
};

RingHttpServer.prototype.init = function(done) {
	var self = this;

	self.httpServer = http.createServer(self.getRequestListener());
	self.bindServerToFirstAvailablePort(function(err, port) {
		if (err) return done(err);
		var configValues = self.getDefaultConfigValues();
		configValues.port = port;
		done(null, configValues);
	});
};

RingHttpServer.prototype.bindServerToFirstAvailablePort = function(cb) {
	var self = this;

	var port = self.portRange[0],
		endPort = self.portRange[1];

	if (!port || !endPort || port > endPort)
		throw new Error('Invalid port range: ' + port + '-' + endPort);

	var tryPort = function() {
		self.httpServer.listen(port);
	};
	var onListenError = function(err) {
		if (err.errno === 'EADDRINUSE') {
			if (++port <= endPort) return tryPort();
			return cb(new Error('Failed to successfully bind to a port in the specified range'));
		}
		cb(err);
	};

	self.httpServer.on('error', onListenError);
	self.httpServer.on('listening', function() {
		// on future errors we just want to emit them at the hook level
		self.httpServer.removeListener('error', onListenError);
		self.httpServer.on('error', function(err) {
			self.emit('error', err);
		});
		cb(null, port);
	});

	tryPort();
};
