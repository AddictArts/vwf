#!/usr/bin/env node

// Copyright 2014, SRI International

var qs = require('querystring'),
    http = require('http'),
    fs = require('fs'),
    path = require('path');

/*
 * Simple web server to test activity and query streams with the EUI. 
 *
 * Add new routes to the var routes as a constant and use the convenience
 * functions for get, post, put, and del for the http verbs.
 *
 * Requirements:
 *      node.exe (Windows native)
 *      node (OS X, Linux)
 */

// ====****====****====****==== ROUTES ====****====****====****==== //
var routes = {
    ROOT: '/',
    ROOTANY: '/*',
    INVENTORY: '/M4clear/inventory',
    OBJECT: '/M4clear/object',
    ACTION: '/M4clear/action',
    QUERY: '/M4clear/query',
    ASSESSMENT: '/M4clear/assessment'
};

start(routes); // construct or initialize the routes object
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
routes.get(routes.INVENTORY, function(req, res) {
    log('...handling route GET ' + routes.INVENTORY);

    var data = {
       tooltray: [{
           name: "M4 Carbine",
           ID: "myM4"
        }]
    };

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(data), 200, JSONt);
});
routes.get(routes.ASSESSMENT, function(req, res) {
    res.send('<html><body><div id="content"><p><b>You forgot these steps:</b><br/><ul>\
           <li>Pull and hold charging handle </li>\
           <li>Push and hold bottom of bolt catch </li>\
           <li>Release charging handle to cock rifle </li>\
           <li>Let go of bolt catch bottom </li>\
           <li>Return charging handle to forward position </li>\
           <li>Check chamber for ammo </li>\
           <li>Select <i>Safe</i> mode </li>\
           <li>Release bolt by pushing bolt catch top </li>\
           <li>Select <i>Semi</i> mode </li>\
           <li>Pull trigger to fire the weapon </li>\
           <li>Pull and hold charging handle </li>\
           <li>Release charging handle to cock rifle </li>\
           <li>Select <i>Safe</i> mode </li>\
         </ul></p></div></body></html>', 200, HTMLt);
});
routes.post(routes.OBJECT, function(req, res) {
    log('...handling route POST ' + routes.OBJECT);

    // request json
    // {
    //     "type": "create",
    //     "ID": "idstringfromtooltray"
    // }

    var param = req.param;
    var oArgs = param['object'];
    var data = { KbId: "unknown" };
    var o = JSON.parse(oArgs);

    log(o);

    if (o.type == 'create') {
        data = {
            KbId: "myM4",
            assetURL: "models/M4_v09.dae"
        };
    }

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(data), 200, JSONt);
});
routes.post(routes.QUERY, function(req, res) {
    log('...handling route POST ' + routes.QUERY);

    var param = req.param;
    var queryArgs = param['query'];
    var q = JSON.parse(queryArgs);
    var kbids = [ ];

    log(q);

    switch (q.type) {
    case 'Instance':
        for (var i = 0; i < q.query.length; i++) kbids.push(q.query[i] + Date.now());

        break;
    case 'KbId':
        for (var i = 0; i < q.query.length; i++) kbids.push(q.query[i] + Date.now());

        break;
    case 'Reset':
        // don't need to do anything usefull to test reset query type at this point of the backends life...
        break;
    default:
        log('no handling for query type ' + q.type + ' request');
        kbid = undefined;
    }

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify({
        KbIds: kbids
    }), 200, JSONt);
});
routes.post(routes.ACTION, function(req, res) {
    log('...handling route POST ' + routes.ACTION);

    var param = req.param;
    var actionArgs = param['activity'];

    log(actionArgs);
    // http://www.html5rocks.com/en/tutorials/cors/
    // response['Access-Control-Allow-Origin'] = '*'
    // response['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
    // response['Access-Control-Max-Age'] = 1000
    // # note that '*' is not valid for Access-Control-Allow-Headers
    // response['Access-Control-Allow-Headers'] = 'origin, x-csrftoken, content-type, accept'
    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send('{ }\n', 200, JSONt);
});


// ====****====****====****==== SERVER ====****====****====****==== //
var JSONt = 'application/json',
    HTMLt = 'text/html',
    XMLt = 'text/xml',
    PLAINt = 'text/plain',
    fileTypes = {
        '.htm':  HTMLt,
        '.html': HTMLt,
        '.txt':  PLAINt,
        '.json': JSONt,
        '.s3d':  XMLt,
        '.ssg':  XMLt,
        '.xml':  XMLt
    };

// create the route handlers and dispatch
function start(routes) {
    if (process.argv.length > 2) {
        var ndx = 2;

        // Check for any flag
        if (process.argv[ndx] && process.argv[ndx].charAt(0) == '-') {
            console.log('Usage: ' + process.argv[0] + ' ' + path.basename(process.argv[1]));
            process.exit(0);
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
    console.log(msg);
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
        contentType = fileTypes.hasOwnProperty(fileType)? fileTypes[fileType] : PLAINt;

    if (at === -1) contentType = headerContentType;

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
console.log('Node ' + process.version + ' server running at http://localhost:3001/');
