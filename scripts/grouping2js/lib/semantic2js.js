'use strict';

var sax = require("sax");

function semantic2js(options) {
    var options = options || { },
        strict = options.strict || true,
        onerror = options.onerror || function(error) { /* an error happened. */ },
        onattribute = options.onattribute || function(attr) { /* an attribute.  attr has "name" and "value" */ },
        onend = options.onend || function() { /* parser stream is done, and ready to have more stuff written to it. */ },
        parser = sax.parser(strict),
        semanticObj,
        currentObj,
        currentNode,
        beginS3D = false,
        beginOntext = false;;

    parser.onerror = onerror;

    parser.ontext = function(text) { // got some text. text is the string body of the tag, called twice after open and before end 
        if (!beginS3D) return;

        beginOntext = !beginOntext;

        if (!beginOntext) return;

        switch (currentNode) {
        case 'description':
            currentObj.description = text;
            break;
        case 'author':
            currentObj.author = text;
            break;
        case 'created':
            currentObj.created = text;
            break;
        case 'modified':
            currentObj.modified = text;
            break;
        }
    };

    parser.onclosetag = function(name) { // closing a tag. name is the name from onopentag node.name
        if (!beginS3D) return;

        currentNode = name;

        if (name == 'head') currentObj = semanticObj;
        else if (name == 'semantic_mapping') beginS3D = false;

        // var p = currentObj.parent;
        // delete currentObj.parent;
        // currentObj = p;
        // endNode = false;
    };

    parser.onopentag = function(node) { // opened a tag. node has "name" and "attributes", isSelfClosing
        currentNode = node.name;

        if (currentNode == 'S3D') beginS3D = true;

        if (!beginS3D) return;

        switch (currentNode) {
        case 'S3D':
            currentObj = semanticObj;
            break;
        case 'head':
            currentObj.head = { };
            currentObj = currentObj.head;
            break;
        case 'description':
            currentObj.description = undefined;
            break;
        case 'author':
            currentObj.author = undefined;
            break;
        case 'created':
            currentObj.created = undefined;
            break;
        case 'modified':
            currentObj.modified = undefined;
            break;
        case 'flora_base':
            currentObj.flora_base = {
                id: node.attributes.id,
                uri: node.attributes.uri
            };
            break;
        case 'semantic_mapping':
            currentObj.semantic_mapping = { };
            currentObj = currentObj.semantic_mapping;
            break;
        case 'asset':
            currentObj.asset = {
                name: node.attributes.name,
                uri: node.attributes.uri,
                sid: node.attributes.sid,
                flora_ref: node.attributes.flora_ref,
                groups: [ ],
                objs: [ ]
            };
            currentObj = currentObj.asset;
            break;
        case 'group':
            currentObj.groups.push({
                name: node.attributes.name,
                node: node.attributes.node,
                sid: node.attributes.sid,
                flora_ref: node.attributes.flora_ref
            });
            break;
        case 'object':
            currentObj.objs.push({
                name: node.attributes.name,
                node: node.attributes.node,
                sid: node.attributes.sid,
                flora_ref: node.attributes.flora_ref
            });
            break;
        }
    };

    parser.onattribute = onattribute;
    parser.onend = onend;

    return {
        semantic2js: function(xml) {
            semanticObj = { };
            parser.write(xml).close();
            return semanticObj;
        },
        parser: parser
    };
};

module.exports = semantic2js;
