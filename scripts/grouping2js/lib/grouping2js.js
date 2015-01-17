// Copyright 2014, SRI International

'use strict';

var sax = require("sax");

function grouping2js(options) {
    var options = options || { },
        strict = options.strict || true,
        onerror = options.onerror || function(error) { /* an error happened. */ },
        ontext = options.ontext || function(text) { /* got some text.  t is the string of text. */ },
        onattribute = options.onattribute || function(attr) { /* an attribute.  attr has "name" and "value" */ },
        onend = options.onend || function() { /* parser stream is done, and ready to have more stuff written to it. */ },
        parser = sax.parser(strict),
        groupingObj,
        currentObj,
        beginGrouping = false;

    parser.onerror = onerror;
    parser.ontext = ontext;

    parser.onclosetag = function(name) { // closing a tag.  name is the name from onopentag node.name
        if (!beginGrouping) return;

        if (name == 'group') {
            var p = currentObj.parent;
            delete currentObj.parent;
            currentObj = p;
        }
    };

    parser.onopentag = function(node) { // opened a tag.  node has "name" and "attributes", isSelfClosing
        switch (node.name) {
        case 'grouping':
            groupingObj.name = node.attributes.name;
            currentObj = groupingObj;
            beginGrouping = true;
            break;
        case 'group':
            if (!beginGrouping) break;

            var g = { name: node.attributes.name, node: node.attributes.node };

            currentObj.groups = currentObj.groups || [ ];
            currentObj.groups.push(g);
            g.parent = currentObj;
            currentObj = g;
            break;
        case 'part':
            if (!beginGrouping) break;

            currentObj.parts = currentObj.parts || [ ];
            currentObj.parts.push(node.attributes.node);
            break;
        }
    };

    parser.onattribute = onattribute;
    parser.onend = onend;

    return {
        grouping2js: function(xml) {
            groupingObj = { };
            parser.write(xml).close();
            return groupingObj;
        },
        parser: parser
    };
};

module.exports = grouping2js;
