// Copyright 2014, SRI International

'use strict';

var sax = require("sax");

function dae2grouping(options) {
    var options = options || { },
        strict = options.strict || true,
        onerror = options.onerror || function(error) { /* an error happened. */ },
        ontext = options.ontext || function(text) { /* got some text.  t is the string of text. */ },
        onattribute = options.onattribute || function(attr) { /* an attribute.  attr has "name" and "value" */ },
        onend = options.onend || function() { /* parser stream is done, and ready to have more stuff written to it. */ },
        parser = sax.parser(strict),
        groupingObj,
        currentObj,
        beginGroup = false;

    parser.onerror = onerror;
    parser.ontext = ontext;

    parser.onclosetag = function(name) { // closing a tag. name is the name from onopentag node.name
        if (name == 'node') {
            // var p = currentObj.parent;
            // delete currentObj.parent;
            // currentObj = p;

            beginGroup = false;
        }
    };

    parser.onopentag = function(node) { // opened a tag. node has "name" and "attributes", isSelfClosing
        switch (node.name) {
        case 'visual_scene':
            groupingObj.name = node.attributes.name;
            currentObj = groupingObj;
            break;
        case 'node':
            // At this point we don't know if it is a new group or a list of parts
            var groups = [ { 'name': node.attributes.name, 'node': node.attributes.name } ];
            var parts = [ node.attributes.name ];

            beginGroup = true;

            // currentObj.groups = currentObj.groups || [ ];
            // currentObj.groups.push(g);
            // g.parent = currentObj;
            // currentObj = currentObj.groups[ currentObj.groups.length - 1 ];
            break;
        }
    };

    parser.onattribute = onattribute;
    parser.onend = onend;

    return {
        dae2grouping: function(xml) {
            groupingObj = { };
            parser.write(xml).close();
            return groupingObj;
        },
        parser: parser
    };
};

module.exports = dae2grouping;
