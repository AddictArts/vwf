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
routes.get(routes.INV_CLEAR, function(req, res) {
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
routes.get(routes.INV_CAT, function(req, res) {
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
routes.post(routes.OBJ_CLEAR, function(req, res) {
    log('...handling route POST ' + req.reqPath);

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
        switch (o.ID) {
        case 'myRange':
            data = {
                KbId: "myRange",
                assetURL: "/SAVE/models/environments/range/ShootingRange.dae",
                grouping: '{"name":"ShootingRange"}'
            };
            break;
        case 'myM4':
            data = {
                KbId: "myM4",
                assetURL: "/SAVE/models/weapons/M4/M4_noHierarchy.dae",
                grouping: '{"name":"M4 Carbine","groups":[{"name":"M4 Group","parts":["Sling"],"groups":[{"name":"Buttstock Group","parts":["Buttstock"],"groups":[{"name":"Swivel_LAMA1259863095 Group","parts":["Swivel_LAMA1259863095","Machine_Screw"]},{"name":"Buttstock_Release_Lever_Nut Group","parts":["Buttstock_Release_Lever_Nut","Buttstock_Release_Lever"],"groups":[{"name":"Buttstock_Release_Lever_Screw_LAMA1417807796 Group","parts":["Buttstock_Release_Lever_Screw_LAMA1417807796","Buttstock_Release_Lever_Spring_Pin","Buttstock_Release_Lever_Spring"]}]}]},{"name":"Magazine_g Group","groups":[{"name":"Tube Group","parts":["Tube","Clip_Spring1","Base","Clip_Spring","Follower"],"groups":[{"name":"Casing1 Group","parts":["Casing1","Projectile1"]},{"name":"Casing2 Group","parts":["Casing2","Projectile2"]},{"name":"Casing3 Group","parts":["Casing3","Projectile3"]}]}]},{"name":"Barrel_Assembly Group","parts":["Barrel_Assembly","Upper_Handguard","Lower_Handguard","Small_Sling_Swivel","Compensator","Recessed_Washer__OOCompensator","Spring_Pin2","Spring_Pin3","Rear_Handguard_Clamp","Screw","Gas_Tube_Spring_Pin","Gas_Tube","Handguard_Slip_Ring_Spring","Handguard_Slip_Ring_Retaining_Ring","Handguard_Slip_Ring_LAMA918813252"],"groups":[{"name":"Front_Sight_Post Group","parts":["Front_Sight_Post","Headless_Shoulder_Pin","Spring3","Tubular_Rivet","Synchro_Clamp","Spring_Pin1","Spring_Pin","Swivel_Mount","Flat_Spring","Special_Shaped_Spacer"]}]},{"name":"Lower_Receiver Group","parts":["Lower_Receiver","Bolt_Catch","Bolt_Catch_Spring_Pin","Bolt_Catch_Plunger","Bolt_Catch_Spring","Trigger","Trigger_Spring","Disconnector_Spring__OOBurst__CC","Disconnector_Spring__OOSemi__CC","Trigger_Spring1","Trigger_Pin","Disconnector__Burst","Disconnector__Semi","Magazine_Catch","Magazine_Catch_Spring","Magazine_Catch_Button","Pivot_Pin","Pivot_Pin_Detent","Pivot_Pin_Spring","Takedown_Pin","Takedown_Pin_Detent","Takedown_Pin_Detent_Spring","Selector_Lever","Safety_Detent__OOSelector_Lever__CC","Safety_Spring__OOSelector_Lever__CC","Automatic_Sear","Automatic_Sear_Spring","Sear_Pin","Hammer","Hammer_Spring1","Hammer_Pin","Burst_Cam","Burst_Cam_Clutch_Spring","Hammer_Spring","Lower_Receiver_Extension","Buffer","Action_Spring","Plain_Round_Nut","Receiver_End_Plate","Buffer_Retainer","Buffer_Retainer_Spring"],"groups":[{"name":"Trigger_Guard Group","parts":["Trigger_Guard","Trigger_Guard_Spring_Pin_Retaining_Pin","Trigger_Guard_Detent","Trigger_Guard_Detent_Spring"]},{"name":"Pistol_Grip Group","parts":["Pistol_Grip","Pistol_Grip_Screw","Pistol_Grip_Lock_Washer"]}]},{"name":"Upper_Receiver Group","parts":["Upper_Receiver"],"groups":[{"name":"Charging_Handle Group","parts":["Charging_Handle","Charging_Handle_Latch","Charging_Handle_Spring","Charging_Handle_Spring_Pin"],"groups":[{"name":"Key_and_Bolt_Carrier_Assembly Group","parts":["Key_and_Bolt_Carrier_Assembly","Firing_Pin_Retaining_Pin","Firing_Pin"],"groups":[{"name":"Bolt Group","parts":["Bolt","Bolt_Cam_Pin","Ejector_Spring_Pin","Bolt_Ring","Bolt_Ring2","Bolt_Ring1"],"groups":[{"name":"Ejector Group","parts":["Ejector","Ejector_Spring"]},{"name":"Extractor Group","parts":["Extractor","Extractor_Spring","Extractor_Pin"]},{"name":"Casing4 Group","parts":["Casing4","Projectile4"]}]}]}]},{"name":"Plunger_Assembly Group","parts":["Plunger_Assembly","Pawl__Forward_Assist","Forward_Assist_Spring","Forward_Assist_Spring1","Pawl_Spring_Pin","Pawl_Detent","Pawl_Spring"]},{"name":"Cover_Pin Group","parts":["Cover_Pin","Ejection_Port_Cover","Cover_Spring","Cover_Retaining_Ring__OOC_Clip__CC"]},{"name":"Gun_Carrying_Handle Group","parts":["Gun_Carrying_Handle","Windage_Spring_Pin","Rear_Sight_Screw","Flat_Rear_Sight_Spring","Rear_Sight_Base","Sight_Aperture","Windage_Knob","Spring__Helical__Compression","Knob","Ball_Bearing1","Elevating_Mechanism","Spring2","Spring1","Index_Screw","Ball_Bearing","Pin_Spring","Spring","Ball_Bearing2","Round_Nut1","Washer1","Washer","Clamping_Bar","Round_Nut"]}]}]}]}'
            };
            break;
        }
    }

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(JSON.stringify(data), 200, JSONt);
});
routes.post(routes.OBJ_DIS, routes.posts[ routes.OBJ_CLEAR ]);
routes.post(routes.OBJ_CAT, routes.posts[ routes.OBJ_CLEAR ]);
routes.post(routes.Q_CLEAR, function(req, res) {
    log('...handling route POST ' + req.reqPath);

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
routes.post(routes.Q_DIS, routes.posts[ routes.Q_CLEAR ]);
routes.post(routes.ACT_CLEAR, function(req, res) {
    log('...handling route POST ' + req.reqPath);

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
routes.post(routes.ACT_DIS, routes.posts[ routes.ACT_CLEAR ]);
routes.get(routes.ASSESS_CLEAR, function(req, res) {
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
