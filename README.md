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

#### CAT (Content Assembly Tool)
Loads s3d files into a scene for assembly, positioning, and default settings

#### EUI (Exercise User Interface) "Instructor"
Load the CAT scene and perform instructor specified actions creating the "gold" standard

#### EUI (Exercise User Interface) "Student"
Load the CAT scene and perform student specified actions creating and examine the your "student" assessment.

## Reference
### cat.json.js
Set the baseServerAddress to the SAVE backend
NOTE: For development and testing there is a provided nodejs backend server echoandtestingtxrx.js, see [Development](Development)
```
var __CAT = {
    "baseServerAddress": "http://localhost:3001/CAT"
};
```

### eui.json.js
Set the baseServerAddress to the SAVE backend
NOTE: For development and testing there is a provided nodejs backend server echoandtestingtxrx.js, see [Development](Development)
```
var __EUI = {
    "baseServerAddress": "http://localhost:3001/PutExercise"
};
```

## Development
### echoandtestingtxrx.js

## License

Copyright 2014 United States Government, as represented by the Secretary of Defense, Under Secretary of Defense (Personnel & Readiness) licensed under the [Apache 2.0 License](https://github.com/virtual-world-framework/vwf/blob/master/LICENSE).
