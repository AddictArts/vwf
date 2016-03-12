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
'use strict';

var sax = require("sax");

function dae2grouping(options) {
    var options = options || { },
        strict = options.strict || true,
        onerror = options.onerror || function(error) { /* an error happened */ },
        ontext = options.ontext || function(text) { /* got some text. text is the string body of the tag, called twice after open and before end */ },
        onattribute = options.onattribute || function(attr) { /* an attribute.  attr has "name" and "value" */ },
        onend = options.onend || function() { /* parser stream is done, and ready to have more stuff written to it */ },
        parser = sax.parser(strict),
        groupingObj,
        currentObj,
        currentGroup,
        currentPart,
        beginNode, // false
        endNode; // false

    parser.onerror = onerror; // be sure to parser.close() or parser.resume()
    parser.ontext = ontext;

    parser.onclosetag = function(name) { // closing a tag. name is the name from onopentag node.name
        if (name == 'node') {
            if (beginNode && !endNode) {
                currentObj.parts = currentObj.parts || [ ];
                currentObj.parts.push(currentPart);
                beginNode = false;
                endNode = true;
            } else {
                var p = currentObj.parent;
                delete currentObj.parent;
                currentObj = p;
                endNode = false;
            }
        }
    };

    parser.onopentag = function(node) { // opened a tag. node has "name" and "attributes", isSelfClosing
        switch (node.name) {
        case 'visual_scene':
            groupingObj.name = node.attributes.name;
            currentObj = groupingObj;
            break;
        case 'node':
            if (beginNode) { // nested node means it is goruping node elements
                currentObj.groups = currentObj.groups || [ ];
                currentObj.groups.push(currentGroup);
                currentGroup.parent = currentObj;
                currentObj = currentGroup;
            } else {
                beginNode = true;
                endNode = false;
            }

            currentGroup = { name: node.attributes.name, node: node.attributes.name, parent: undefined }; // parent is a temporary reference, removed on ending the group
            currentPart = node.attributes.name;
            break;
        }
    };

    parser.onattribute = onattribute;
    parser.onend = onend;

    return {
        dae2grouping: function(xml) {
            groupingObj = { };
            currentObj = undefined;
            currentGroup = undefined;
            currentPart = undefined;
            beginNode = false;
            endNode = false;
            parser.write(xml).close();
            return groupingObj;
        },
        parser: parser
    };
};

module.exports = dae2grouping;
