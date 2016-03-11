#!/usr/bin/env node

/*
Copyright 2016 SRI International

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*
 * Simple web server to test activity streams with the EUI.
 *
 * Add new routes to the var routes as a constant and use the convenience
 * functions for get, post, put, and del for the http verbs.
 *
 * Requirements:
 *      node.exe (Windows native)
 *      node (OS X, Linux)
 */
var qs = require('querystring'),
	http = require('http'),
	fs = require('fs'),
	path = require('path'),
	JSONt = 'application/json',
	HTMLt = 'text/html',
	XMLt = 'text/xml',
	PLAINt = 'text/plain',
	opt_quiet = false,
	opt_repl = false,
	routes = {
		ROOT: '/',
		ROOTANY: '/*',
		ACTION: '/action',
		setup: start
	};

routes.setup();
routes.get(routes.ROOT, function(req, res) {
	log('...handling route GET ' + routes.ROOT);
	var data = "/";
	res.send(data, 200, HTMLt);
});
routes.get(routes.ROOTANY, function(req, res) {
	log('...handling route GET ' + routes.ROOTANY + ' for ' + req.reqPath);

	var status = 404,
		data = 'The requested URL ' + req.reqPath + ' was not found on this server';

	if (path.existsSync(routes.rootPath + req.reqPath)) {
		status = 200;
		data = fs.readFileSync(routes.rootPath + req.reqPath);
	}

	res.send(data, status, req.contentType);
});
routes.post(routes.ACTION, function(req, res) {
	log('...handling route POST ' + routes.ACTION);

	var param = req.param;
	var actionArgs = param['activity'];

	// log(req.headers);
	// log(req.contentType);
	log(actionArgs);

	// http://www.html5rocks.com/en/tutorials/cors/
	// response['Access-Control-Allow-Origin'] = '*'
	// response['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
	// response['Access-Control-Max-Age'] = 1000
	// # note that '*' is not valid for Access-Control-Allow-Headers
	// response['Access-Control-Allow-Headers'] = 'origin, x-csrftoken, content-type, accept'

	res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
	res.send('{ }\n', 200, JSONt);
	// res.send(JSON.stringify({
	// 	name: name
	// }), 200, JSONt);
});

// create the route handlers and dispatch
function start() {
	if (process.argv.length > 2) {
		var ndx = 2;

		// Check for flags
		while (process.argv[ndx] && process.argv[ndx].charAt(0) === '-') {
			var flag = process.argv[ndx++];

			switch (flag) {
			case '-q':
				opt_quiet = true;
				break;
			case '-i':
				opt_repl = true;
				break;
			default:
				console.log('Usage: ' + process.argv[0] + ' ' + path.basename(process.argv[1]) + ' [OPTIONS]');
				console.log(' -q quiet, no logging to the console');
				console.log(' -i interactive, start with a node repl console');
				console.log(' -h help, show the usage');
				process.exit(0);
			}
		}
	}

	routes.get = function(route, handler) {
		log('...adding GET handler for route ' + route);
		this.gets[route] = handler;
	};
	routes.gets = {};
	routes.post = function(route, handler) {
		log('...adding POST handler for route ' + route);
		this.posts[route] = handler;
	};
	routes.posts = {};
	routes.put = function(route, handler) {
		log('...adding PUT handler for route ' + route);
		this.puts[route] = handler;
	};
	routes.puts = {};
	routes.del = function(route, handler) {
		log('...adding DELETE handler for route ' + route);
		this.dels[route] = handler;
	};
	routes.dels = {};
	routes.dispatch = function(req, res) {
		var url = req.reqPath;

		switch (req.method) {
		case "GET":
			if (this.gets[url]) {
				this.gets[url](req, res);
			} else {
				this.gets['/*'](req, res);
			}
			break;
		case "POST":
			if (this.posts[url]) {
				this.posts[url](req, res);
			} else {
				log('unknown POST route ' + url);
			}break;
		case "PUT":
			if (this.puts[url]) {
				this.puts[url](req, res);
			} else {
				log('unknown PUT route ' + url);
			}
			break;
		case "DELETE":
			if (this.dels[url]) {
				this.dels[url](req, res);
			} else {
				log('unknown DELETE route ' + url);
			}
			break;
		default:
			log('unknown request method ' + req.method);
		}
	}
}

function log(msg) {
	if (!opt_quiet) {
		console.log(msg);
	}
}

function getPathLessTheQueryString(url) {
	return url.indexOf('?') === -1 ? url : url.substring(0, url.indexOf('?'));
}

function getTheQueryString(url) {
	return url.indexOf('?') === -1 ? '' : url.slice(url.indexOf('?') + 1);
}

function req2ContentType(urlLessQueryString, headerContentType) {
	var at = urlLessQueryString.lastIndexOf('.'),
		fileType = urlLessQueryString.slice(at),
		contentType = PLAINt;

	if (at === -1) fileType = "default";

	switch (fileType) {
	case '.htm':
	case '.html':
		contentType = HTMLt;
		break;
	case '.txt':
		contentType = PLAINt;
		break;
	case '.json':
		contentType = JSONt;
		break;
	case '.s3d':
	case '.ssg':
	case '.xml':
		contentType = XMLt;
		break;
	default:
		contentType = headerContentType;
	}

	return contentType;
}


var app = http.createServer(function (hreq, hres) {
	var pltqs = getPathLessTheQueryString(hreq.url),
		req = {
			url: hreq.url,
			method: hreq.method,
			headers: hreq.headers,
			body: '',
			xhr: hreq.headers['x-requested-with'] == 'XMLHttpRequest',
			reqPath: decodeURIComponent(pltqs),
			contentType: req2ContentType(pltqs, hreq.headers['content-type']),
			queryString: getTheQueryString(hreq.url),
			param: undefined,
			httpReq: hreq,
		},
		res = {
			httpRes: hres,
			send: function(data, status, contentType) {
				this.httpRes.writeHead(status, { 'Content-Type': contentType });
				this.httpRes.end(data);
			}
		};
	hreq.on('data', function (data) {
			req.body += data;
	});
	hreq.on('end', function () {
		req.param = qs.parse(req.queryString == '' ? req.body : req.queryString);
		routes.dispatch(req, res);
	});
});
app.listen(3001, "127.0.0.1");

if (opt_repl) {
	console.log('Server interactive mode');

	var repl = require('repl'),
		svr = repl.start();

	svr.defineCommand('x', {
		help: 'Exit the interactive mode and server',
		action: function(code) {
			process.exit(code || 0);
		}
	});

	// TODO: Find a better way, but for now this will do.
	svr.context.qs = qs;
	svr.context.http = http;
	svr.context.fs = fs;
	svr.context.path = path;
	svr.context.JSONt = JSONt;
	svr.context.HTMLt = HTMLt;
	svr.context.PLAINt = PLAINt;
	svr.context.routes = routes;
}

console.log('Node ' + process.version + ' server running at http://localhost:3001/');
