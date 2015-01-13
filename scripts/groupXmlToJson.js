// Copyright 2014, SRI International

'use strict';

var sax = require("sax"),
    strict = true, // set to false for html-mode
    parser = sax.parser(strict),
    groupingObj = { },
    currentObj,
    parseOnEnd = function(data) { ex.groupingObj = data },
    ex = {
        parser: parser,
        groupingObj: undefined
    };

parser.onerror = function(e) { /* an error happened. */ };
parser.ontext = function(t) { /* got some text.  t is the string of text. */ };
parser.onclosetag = function(name) { // closing a tag.  name is the name from onopentag node.name
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
        break;
    case 'group':
        var g = { 'name': node.attributes.name, 'node': node.attributes.node };

        currentObj.groups = currentObj.groups || [ ];
        currentObj.groups.push(g);
        g.parent = currentObj;
        currentObj = currentObj.groups[ currentObj.groups.length - 1 ];
        break;
    case 'part':
        currentObj.parts = currentObj.parts || [ ];
        currentObj.parts.push(node.attributes.node);
        break;
    }
};
parser.onattribute = function(attr) { /* an attribute.  attr has "name" and "value" */ };
parser.onend = function() { // parser stream is done, and ready to have more stuff written to it.
    parseOnEnd(groupingObj);
};

//module.exports = ex;

console.log(parser);
console.log(this);

var xml = '<grouping name="M4 Carbine">\
    <part node="Bling"/>\
    <group name="Empty"/>\
    <group node="M4" name="M4 Group">\
        <group name="B Group">\
            <part node="A"/>\
            <part node="B"/>\
            <group name="B_N Group">\
                <part node="B_N"/>\
            </group>\
        </group>\
        <group name="Mag Group">\
            <part node="C1"/>\
        </group>\
        <part node="Sling"/>\
    </group>\
</grouping>';

parser.write(xml).close(); // xml => groupingObj

console.log(groupingObj);
