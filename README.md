# SAVE Web Applications

Semantically Enhanced Automated Assessment in Virtual Environments

## Installation

```
$ git clone https://github.com/SRI-SAVE/vwf.git
$ npm install
```

NOTE: On Mac OS X, please make sure you have Xcode Command Line Tools installed prior to executing the script below (https://developer.apple.com/xcode/).

```
$ node node-server.js -a public
```

The SAVE application is now up and running at [http://localhost:3000](http://localhost:3000).

A brief Description of each of the "vwf" applications is below. THe default page puctured below has more details and direct access to each application.

<a href="SAVE.png">![](SAVE.png)</a>

## SAVE Applications Descriptions
#### S3D Annotation
Loads and edits s3d files

## CAT (Content Assembly Tool)
Loads s3d files into a scene for assembly, positioning, and default settings

## EUI (Exercise User Interface) "Instructor"
Load the CAT scene and perform instructor specified actions creating the "gold" standard

## EUI (Exercise User Interface) "Student"
Load the CAT scene and perform student specified actions creating and examine the your "student" assessment.

## Reference
### published/clearing
Example clearing exercise that is published and ready for student "operation" and assessment.

### published/disassembly
Example disassembly exercise that is published and ready for student "operation" and assessment.

### dot behave (.behave) subfolder
The SAVE backend will create this directory inside any published exercise from the CAT tool. This folder and files are necessary for operation and contain application functions common for all published CAT scenes. There are master copies SAVE/behavior. See [Development](#Development) for a descriptions of each of the files and the functions within.

### cat.json.js
Set the baseServerAddress to the SAVE backend. This file is required and needed for proper CAT operation.
NOTE: For development and testing there is a provided nodejs backend server echoandtestingtxrx.js, see [Development](#Development)
```
var __CAT = {
    "baseServerAddress": "http://localhost:3001/CAT"
};
```

### eui.json.js
Set the baseServerAddress to the SAVE backend. This file is required and needed for proper EUI operation.
NOTE: For development and testing there is a provided nodejs backend server echoandtestingtxrx.js, see [Development](#Development)
```
var __EUI = {
    "baseServerAddress": "http://localhost:3001/PutExercise"
};
```

## Development
### echoandtestingtxrx.js
Located in the scripts folder. It is used for simulating the SAVE backend locally.
```
$ node echoandtestingtxrx

http://localhost:3001
```

This server has a complete set of handlers for SAVE 1.2 and essentially can be used to walk all the applications through the stages of the sample exercise.

### Enhancing echoandtestingtxrx
```
route.get(routePath, function(req, res) { /* handle req and send a response */ })
route.put(routePath, function(req, res) { /* handle req and send a response */ })

routes.get('/'), function(req, res) {
    log('...handling route GET /');

    var data = "/";

    res.httpRes.setHeader('Access-Control-Allow-Origin', '*');
    res.send(data, 200, HTMLt);
});
```

Add your own route handlers for get, put, delete, and  post. THe example above is the route "/", ex. "http://localhost" or "http://localhost/". It essentially sends the text "/" to the browser. The 200 is the http status code. Use it to send redirects 304, or errors like 503.

## dot behave (.behave) subfolder contents and technical description of each
### backendtxrx.save.yaml
Communication functions for vwf nodes
```
obj(data, done /* callback */)
query(data, done /* callback */)
activity(data, done /* callback */)
post(json, url, done /* callback */)

this.query({ type: 'Reset' }, function() { self.backendResetSent = true; });
```

Each of these methods correspond to SAVE backend REST requests.

### begin.save.yaml
Initialize the SAVE application
```
processSaveDotJson()
```
Each SAVE application needs the baseServerAddress, essentially this is the bootstrap the application uses to get it to the vwf nodes.

```
this.objectServerAddress = data.baseServerAddress + '/object'; // POST
this.queryServerAddress = data.baseServerAddress + '/query'; // POST
this.activityServerAddress = data.baseServerAddress + '/action'; // POST
```
The vwf root node has these properties.

### cameranav.save.yaml
Camera orbit function, vwf orbit was broken, this is a replacement
```
this.cameraZoom = function(value)
this.cameraOrbit = function(theta)
this.cameraClearLookAt = function()
this.cameraLookAt = function(what)
```

### initNode3.save.yaml
Initialize a SAVE node3
```
this.init = function(KbId, mgroups)
```
This function is called by instance.save.yaml script functions. It is not useful to a SAVE application.

### instance.save.yaml
Instance a SAVE S3D mapped 3D asset into the vwf
```
this.instanceAutoLoads = function()
this.instance = function(trayName, backEndId)
```

These methods are used by the SAVE application GUI to bootstrap the scene and instance selected semantically mapped objects in the scene.
