#!/usr/bin/env node

// Copyright 2014, SRI International

var qs = require('querystring'),
    http = require('http'),
    fs = require('fs'),
    path = require('path'),
    util = require('util');

/*
 * Simple web server to test activity and query streams with the EUI. 
 *
 * Add new routes to the var routes as a constant and use the convenience
 * functions for get, post, put, and del for the http verbs.
 *
 * Requirements:
 *      node.exe (Windows native)
 *      node (OS X, Linux)
 *
 * http://www.html5rocks.com/en/tutorials/cors/
 * response['Access-Control-Allow-Origin'] = '*'
 * response['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
 * response['Access-Control-Max-Age'] = 1000
 * # note that '*' is not valid for Access-Control-Allow-Headers
 * response['Access-Control-Allow-Headers'] = 'origin, x-csrftoken, content-type, accept'
 */

// ====****====****====****==== ROUTES ====****====****====****==== //
var routes = {
    rootPath: 'public',
    ROOT: '/',
    ROOTANY: '/*',
    PUTANY: '/*',
    INV_CLEAR: '/M4clear/inventory',
    INV_DIS: '/M4dis/inventory',
    INV_CAT: '/cat/inventory',
    OBJ_CLEAR: '/M4clear/object',
    OBJ_DIS: '/M4dis/object',
    OBJ_CAT: '/cat/object',
    ACT_CLEAR: '/M4clear/action',
    ACT_DIS: '/M4dis/action',
    Q_CLEAR: '/M4clear/query',
    Q_DIS: '/M4dis/query',
    Q_CAT: '/cat/query',
    ASSESS_CLEAR: '/M4clear/assessment',
    ASSESS_DIS: '/M4dis/assessment'
};

start(routes); // construct or initialize the routes object
routes.get(routes.ROOT, function(req, res) {
    log('...handling route GET ' + routes.ROOT);

    var data = "/";

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(data, 200, HTMLt);
});

routes.get(routes.ROOTANY, function(req, res) {
    log('...handling route GET ' + routes.ROOTANY + ' for ' + req.reqPath);

    var file = routes.rootPath + req.reqPath,
        status = fs.existsSync(file)? 200 : 404,
        data = 'The requested URL ' + req.reqPath + ' was not found on this server';

    try {
        data = fs.readFileSync(file);
    } catch (e) { }

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(data, status, req.contentType);
});

// jQuery.ajax({
//     url:'http://localhost:3001/foo/s.json.js',
//     type:'put',
//     data:'{ "a" : 1 }',
//     cache: false,
//     processData: false,
//     crossDomain: true,
//     xhrFields: { withCredentials: true } // prompt if you don't set the header below
//     // beforeSend: function(xhr) {
//     //     xhr.setRequestHeader ("Authorization", "Basic  letmein!");
//     // }
// })
// .done(function(data) { jQuery('body').text(data); });
// jQuery.ajax({url:'http://localhost:3001/foo/s.json.js',type:'put',data:'{ "a" : 1 }',cache: false,processData: false,crossDomain: true,xhrFields: { withCredentials: true }}).done(function(data) { jQuery('body').text(data); });
routes.put(routes.PUTANY, function(req, res) {
    log('...handling route ' + req.method + ' ' + routes.PUTANY + ' for ' + req.reqPath);
    // "Preflight" OPTIONS response headers, handle without authentication
    res.httpRes.setHeader('Access-Control-Allow-Origin', req.headers.origin); // can only be a single origin
    res.httpRes.setHeader('Access-Control-Allow-Credentials', 'true');
    res.httpRes.setHeader('Access-Control-Allow-Headers', 'Authorization');
    res.httpRes.setHeader('Access-Control-Allow-Methods', 'PUT');

    if (req.method == 'OPTIONS') {
        res.send('', 200, PLAINt);
        return;
    }

    var putPath = routes.rootPath + '/PutExercise',
        name = req.reqPath.slice(req.reqPath.lastIndexOf('/')), // 'http://foo.com:3001/some.json.js' => '/some.json.js', could use the path.dirname
        file = putPath + name,
        data = file + ' on the server through PUT ' + req.reqPath;

    // after preflight now authenticate with http basic auth
    if (req.headers.authorization === undefined) {
        res.httpRes.setHeader('WWW-Authenticate', 'Basic realm="echoandtestingtxrx"');
        res.send('', 401, PLAINt);
        return;
    }

    // log(util.inspect(req.headers));

    try {
        fs.unlinkSync(file);
        data = 'Replaced ' + data;
    } catch (e) {
        data = 'Added ' + data;
    }

    fs.writeFileSync(file, req.body);
    log(data);
    res.send(data, 200, PLAINt);
});

routes.get(routes.INV_CLEAR, function(req, res) { /* .../inventory */
    log('...handling route GET ' + req.reqPath);

    var data = {
       tooltray: [{
           name: "M4 Carbine",
           ID: "myM4"
        }]
    };

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(data), 200, JSONt);
});
routes.get(routes.INV_DIS, routes.gets[ routes.INV_CLEAR ]);
routes.get('/MyExercise/inventory', routes.gets[ routes.INV_CLEAR ]);

routes.get(routes.INV_CAT, function(req, res) { /* CAT/inventory */
    log('...handling route GET ' + req.reqPath);

    var data = {
       tooltray: [{
           name: "Shooting Range",
           ID: "myRange"
        }, {
           name: "M4 Carbine",
           ID: "myM4"
        }]
    };

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(data), 200, JSONt);
});

routes.post(routes.OBJ_CLEAR, function(req, res) { /* .../object */
    log('...handling route POST ' + req.reqPath);

    var param = req.param,
        oArgs = param[ 'object' ],
        o = JSON.parse(oArgs),
        data = { KbId: "unknown" };

    log(util.inspect(o));

    if (o.type == 'create') {
        switch (o.ID) {
        case 'myRange':
            data = {
                KbId: "myRange",
                assetURL: '/SAVE/models/environments/range/ShootingRange.dae',
                grouping: '{"name":"ShootingRange","groups":[{"name":"environment","node":"environment","parts":["grass","tree_line","sky","targets","ShootingRangeArea1","ShootingRangeArea2","ShootingRangeArea3","ShootingRangeArea4","ShootingRangeArea5","ShootingRangeArea6","ShootingRangeArea7","ShootingRangeArea8"]}]}'
            };
            break;
        case 'myM4':
            data = {
                KbId: "myM4",
                assetURL: "/SAVE/models/weapons/M4/M4_noHierarchy.dae",
                grouping: {"name":"M4 Carbine","parts":["Sling","Barrel_Assembly","Upper_Handguard","Lower_Handguard","Small_Sling_Swivel","Compensator","Recessed_Washer__OOCompensator","Spring_Pin2","Spring_Pin3","Rear_Handguard_Clamp","Screw","Gas_Tube_Spring_Pin","Gas_Tube","Handguard_Slip_Ring_Spring","Handguard_Slip_Ring_Retaining_Ring","Handguard_Slip_Ring_LAMA918813252","Front_Sight_Post","Headless_Shoulder_Pin","Spring3","Tubular_Rivet","Synchro_Clamp","Spring_Pin1","Spring_Pin","Swivel_Mount","Flat_Spring","Special_Shaped_Spacer"],"groups":[{"name":"Buttstock Group","parts":["Buttstock","Swivel_LAMA1259863095","Machine_Screw","Buttstock_Release_Lever_Nut","Buttstock_Release_Lever","Buttstock_Release_Lever_Screw_LAMA1417807796","Buttstock_Release_Lever_Spring_Pin","Buttstock_Release_Lever_Spring"]},{"name":"Magazine_g Group","parts":["Tube","Clip_Spring1","Base","Clip_Spring","Follower"],"groups":[{"name":"Casing1 Group","parts":["Casing1","Projectile1"]},{"name":"Casing2 Group","parts":["Casing2","Projectile2"]},{"name":"Casing3 Group","parts":["Casing3","Projectile3"]}]},{"name":"Lower_Receiver Group","parts":["Lower_Receiver","Trigger","Trigger_Spring","Disconnector_Spring__OOBurst__CC","Disconnector_Spring__OOSemi__CC","Trigger_Spring1","Trigger_Pin","Disconnector__Burst","Disconnector__Semi","Magazine_Catch","Magazine_Catch_Spring","Magazine_Catch_Button","Pivot_Pin","Pivot_Pin_Detent","Pivot_Pin_Spring","Takedown_Pin","Takedown_Pin_Detent","Takedown_Pin_Detent_Spring","Selector_Lever","Safety_Detent__OOSelector_Lever__CC","Safety_Spring__OOSelector_Lever__CC","Automatic_Sear","Automatic_Sear_Spring","Sear_Pin","Hammer","Hammer_Spring1","Hammer_Pin","Burst_Cam","Burst_Cam_Clutch_Spring","Hammer_Spring","Lower_Receiver_Extension","Buffer","Action_Spring","Plain_Round_Nut","Receiver_End_Plate","Buffer_Retainer","Buffer_Retainer_Spring","Trigger_Guard","Trigger_Guard_Spring_Pin_Retaining_Pin","Trigger_Guard_Detent","Trigger_Guard_Detent_Spring","Pistol_Grip","Pistol_Grip_Screw","Pistol_Grip_Lock_Washer"],"groups":[{"name":"Bolt_Catch Group","parts":["Bolt_Catch","Bolt_Catch_Spring_Pin","Bolt_Catch_Plunger","Bolt_Catch_Spring"],"groups":[{"name":"Bolt_Catch_Bottom Group"},{"name":"Bolt_Catch_Top Group"}]},{"name":"PivotPinHead Group"},{"name":"PivotPinTail Group"},{"name":"TakedownPinHead Group"},{"name":"TakedownPinTail Group"}]},{"name":"Upper_Receiver Group","parts":["Upper_Receiver","Plunger_Assembly","Pawl__Forward_Assist","Forward_Assist_Spring","Forward_Assist_Spring1","Pawl_Spring_Pin","Pawl_Detent","Pawl_Spring","Cover_Pin","Ejection_Port_Cover","Cover_Spring","Cover_Retaining_Ring__OOC_Clip__CC"],"groups":[{"name":"Chamber Group"},{"name":"Charging_Handle Group","parts":["Charging_Handle","Charging_Handle_Latch","Charging_Handle_Spring","Charging_Handle_Spring_Pin"]},{"name":"Key_and_Bolt_Carrier_Assembly Group","parts":["Key_and_Bolt_Carrier_Assembly","Firing_Pin_Retaining_Pin","Firing_Pin"],"groups":[{"name":"Bolt Group","parts":["Bolt","Bolt_Cam_Pin","Ejector_Spring_Pin","Bolt_Ring","Bolt_Ring2","Bolt_Ring1","Ejector","Ejector_Spring","Extractor","Extractor_Spring","Extractor_Pin","Casing4","Projectile4"]}]},{"name":"Gun_Carrying_Handle Group","parts":["Gun_Carrying_Handle","Windage_Spring_Pin","Rear_Sight_Screw","Flat_Rear_Sight_Spring","Rear_Sight_Base","Sight_Aperture","Windage_Knob","Spring__Helical__Compression","Knob","Ball_Bearing1","Elevating_Mechanism","Spring2","Spring1","Index_Screw","Ball_Bearing","Pin_Spring","Spring","Ball_Bearing2","Round_Nut1","Washer1","Washer","Clamping_Bar","Round_Nut"]}]}]}
            };
            break;
        }
    }

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(data), 200, JSONt);
});
routes.post(routes.OBJ_DIS, routes.posts[ routes.OBJ_CLEAR ]);
routes.post(routes.OBJ_CAT, routes.posts[ routes.OBJ_CLEAR ]);
routes.post('/MyExercise/object', routes.posts[ routes.OBJ_CLEAR ]);

routes.post(routes.Q_CLEAR, function(req, res) { /* .../query */
    log('...handling route POST ' + req.reqPath);

    var param = req.param,
        queryArgs = param['query'],
        q = JSON.parse(queryArgs),
        kbids = [ ];

    log(util.inspect(q));

    switch (q.type) {
    case 'AllActions':
        break;
    case 'Instance':
        for (var i = 0; i < q.query.length; i++) kbids.push(q.query[ i ] + Date.now());

        break;
    case 'KbId':
        for (var i = 0; i < q.query.length; i++) kbids.push(q.query[ i ] + Date.now());

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
routes.post(routes.Q_DIS, routes.posts[ routes.Q_CLEAR ]);
routes.post(routes.Q_CAT, routes.posts[ routes.Q_CLEAR ]);
routes.post('/MyExercise/query', routes.posts[ routes.Q_CLEAR ]);

routes.post(routes.ACT_CLEAR, function(req, res) { /* .../action */
    log('...handling route POST ' + req.reqPath);

    var param = req.param,
        actionArgs = param['activity'];

    log(util.inspect(actionArgs));
    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send('{ }\n', 200, JSONt);
});
routes.post(routes.ACT_DIS, routes.posts[ routes.ACT_CLEAR ]);

routes.get(routes.ASSESS_CLEAR, function(req, res) { /* .../assessment */
    res.send('<html><body><div id="content"><p><b>You forgot these steps:</b><br/><ul><li>Pull and hold charging handle </li><li>Push and hold bottom of bolt catch </li><li>Release charging handle to cock rifle </li<li>Let go of bolt catch bottom </li><li>Return charging handle to forward position </li><li>Check chamber for ammo </li><li>Select <i>Safe</i> mode </li><li>Release bolt by pushing bolt catch top </li><li>Select <i>Semi</i> mode </li><li>Pull trigger to fire the weapon </li><li>Pull and hold charging handle </li><li>Release charging handle to cock rifle </li><li>Select <i>Safe</i> mode </li></ul></p></div></body></html>', 200, HTMLt);
});
routes.get(routes.ASSESS_DIS, routes.get[ routes.ASSESS_CLEAR ]);

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
        if (process.argv[ ndx ] && process.argv[ ndx ].charAt(0) == '-') {
            util.puts('Usage: ' + process.argv[0] + ' ' + path.basename(process.argv[ 1 ]));
            process.exit(0);
        }
    }

    routes.get = function(route, handler) {
        log('...adding GET handler for route ' + route);
        this.gets[ route ] = handler;
    };
    routes.gets = {};
    routes.post = function(route, handler) {
        log('...adding POST handler for route ' + route);
        this.posts[ route ] = handler;
    };
    routes.posts = {};
    routes.put = function(route, handler) {
        log('...adding PUT handler for route ' + route);
        this.puts[ route ] = handler;
    };
    routes.puts = {};
    routes.del = function(route, handler) {
        log('...adding DELETE handler for route ' + route);
        this.dels[ route ] = handler;
    };
    routes.dels = {};
    routes.dispatch = function(req, res) {
        var url = req.reqPath;

        switch (req.method) {
        case "GET":
            if (this.gets[ url ]) {
                this.gets[ url ](req, res);
            } else {
                this.gets[ '/*' ](req, res);
            }
            break;
        case "POST":
            if (this.posts[ url ]) {
                this.posts[ url ](req, res);
            } else {
                log('unknown POST route ' + url);
            }break;
        case "PUT":
            if (this.puts[ url ]) {
                this.puts[ url ](req, res);
            } else {
                this.puts[ '/*' ](req, res);
            }
            break;
        case "OPTIONS":
            if (this.puts[ url ]) {
                this.puts[ url ](req, res);
            } else {
                this.puts[ '/*' ](req, res);
            }
            break;
        case "DELETE":
            if (this.dels[ url ]) {
                this.dels[ url ](req, res);
            } else {
                log('unknown DELETE route ' + url);
            }
            break;
        default:
            log('unknown request method ' + req.method);
            log(util.inspect(req.headers));
        }
    }
}

function log(msg) {
    util.log(msg);
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
        contentType = fileTypes.hasOwnProperty(fileType)? fileTypes[ fileType ] : PLAINt;

    if (at === -1) contentType = headerContentType;

    return contentType;
}

var notCuidId = 0, // cuid npm package for collision resistant
    app = http.createServer(function (hreq, hres) {
    var pltqs = getPathLessTheQueryString(hreq.url),
        req = {
            id: ++notCuidId,
            url: hreq.url,
            method: hreq.method,
            headers: hreq.headers,
            body: '',
            xhr: hreq.headers['x-requested-with'] == 'XMLHttpRequest',
            reqPath: decodeURIComponent(pltqs),
            contentType: req2ContentType(pltqs, hreq.headers[ 'content-type' ]),
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
