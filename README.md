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


## dot behave (.behave) subfolder contents and technical description of each
### backendtxrx.sav.yaml
### begin.save.yaml
### cameranav.save.yaml
### initNode3.save.yaml
### instance.save.yaml

## License

Copyright 2014 United States Government, as represented by the Secretary of Defense, Under Secretary of Defense (Personnel & Readiness) licensed under the [Apache 2.0 License](https://github.com/virtual-world-framework/vwf/blob/master/LICENSE).
