(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright 2015, SRI International

'use strict';

var g2js = require('./lib/grouping2js')({ strict: true }),
    dae2g = require('./lib/dae2grouping')({ strict: true }),
    s2js = require('./lib/semantic2js')({ strict: true }),
    pretty = require('js-object-pretty-print').pretty,
    beautify_html = require('js-beautify').html;

// public via exports.module
var grouping2html = function(sourceXml) {
    var groupingObj = g2js.grouping2js(sourceXml);

    return groupingObj2html(groupingObj);
};

var groupingObj2html = function(groupingObj) {
    var text = pretty(groupingObj),
        html = simpleText2html(text);

    return { html: html, text: text };
};

var groupingXml2html = function(sourceXml) {
    var text =  beautify_html(sourceXml),
        html = simpleText2html(text);

    return { html: html, text: text };
};

var groupingObj2xml = function(groupingObj) {
    var groupingXml = '<grouping name="' + groupingObj.name + '">';

    groupingXml = groupsparts2xml(groupingObj, groupingXml);
    return groupingXml + '</grouping>';
};

var semantic2html = function(sourceXml) {
    var semanticObj = g2js.grouping2js(sourceXml);

    return semanticObj2html(semanticObj);
};

var semanticObj2html = function(semanticObj) {
    var text = pretty(semanticObj),
        html = simpleText2html(text);

    return { html: html, text: text };
};

// private
var simpleText2html = function(text) {
    var html;

    html =  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>').replace(/\s/g, '&nbsp;');
    return html;
};

var groupsparts2xml = function(groupingObj, groupingXml) {
    for (var p in groupingObj) {
        if (p == 'groups') {
            groupingObj.groups.forEach(function(group) {
                groupingXml += '<group name="' + group.name + '"';

                if (group.node) {
                    groupingXml += ' node="' + group.node + '">';
                } else {
                    groupingXml += '>';
                }

                groupingXml = groupsparts2xml(group, groupingXml);
                groupingXml += '</group>';
            });
        } else if (p == 'parts') {
            groupingObj.parts.forEach(function(part) {
                groupingXml += '<part node="' + part + '"/>';
            });
        }
    }

    return groupingXml;
};

module.exports = {
    g2js: g2js.grouping2js,
    g2html: grouping2html,
    go2html: groupingObj2html,
    go2xml: groupingObj2xml,
    gx2html: groupingXml2html,
    dae2g: dae2g.dae2grouping,
    s2js: s2js.semantic2js,
    s2html: semantic2html,
    so2html: semanticObj2html,
    s3dParser: g2js.parser,
    daeParser: dae2g.parser
};

try {
    window.G2JS = module.exports;
} catch(e) { } // ignore "ReferenceError: window is not defined" when running on the server

},{"./lib/dae2grouping":2,"./lib/grouping2js":3,"./lib/semantic2js":4,"js-beautify":5,"js-object-pretty-print":9}],2:[function(require,module,exports){
// Copyright 2015, SRI International

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
        beginNode = false,
        endNode = false;

    parser.onerror = onerror;
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
            parser.write(xml).close();
            return groupingObj;
        },
        parser: parser
    };
};

module.exports = dae2grouping;

},{"sax":10}],3:[function(require,module,exports){
// Copyright 2015, SRI International

'use strict';

var sax = require("sax");

function grouping2js(options) {
    var options = options || { },
        strict = options.strict || true,
        onerror = options.onerror || function(error) { /* an error happened */ },
        ontext = options.ontext || function(text) { /* got some text. text is the string body of the tag, called twice after open and before end  */ },
        onattribute = options.onattribute || function(attr) { /* an attribute.  attr has "name" and "value" */ },
        onend = options.onend || function() { /* parser stream is done, and ready to have more stuff written to it */ },
        parser = sax.parser(strict),
        groupingObj,
        currentObj,
        beginGrouping = false;

    parser.onerror = onerror;
    parser.ontext = ontext;

    parser.onclosetag = function(name) { // closing a tag. name is the name from onopentag node.name
        if (!beginGrouping) return;

        if (name == 'group') {
            var p = currentObj.parent;
            delete currentObj.parent;
            currentObj = p;
        }
    };

    parser.onopentag = function(node) { // opened a tag. node has "name" and "attributes", isSelfClosing
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

},{"sax":10}],4:[function(require,module,exports){
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

},{"sax":10}],5:[function(require,module,exports){
/**
The following batches are equivalent:

var beautify_js = require('js-beautify');
var beautify_js = require('js-beautify').js;
var beautify_js = require('js-beautify').js_beautify;

var beautify_css = require('js-beautify').css;
var beautify_css = require('js-beautify').css_beautify;

var beautify_html = require('js-beautify').html;
var beautify_html = require('js-beautify').html_beautify;

All methods returned accept two arguments, the source string and an options object.
**/

function get_beautify(js_beautify, css_beautify, html_beautify) {
    // the default is js
    var beautify = function (src, config) {
        return js_beautify.js_beautify(src, config);
    };

    // short aliases
    beautify.js   = js_beautify.js_beautify;
    beautify.css  = css_beautify.css_beautify;
    beautify.html = html_beautify.html_beautify;

    // legacy aliases
    beautify.js_beautify   = js_beautify.js_beautify;
    beautify.css_beautify  = css_beautify.css_beautify;
    beautify.html_beautify = html_beautify.html_beautify;

    return beautify;
}

if (typeof define === "function" && define.amd) {
    // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
    define([
        "./lib/beautify",
        "./lib/beautify-css",
        "./lib/beautify-html"
    ], function(js_beautify, css_beautify, html_beautify) {
        return get_beautify(js_beautify, css_beautify, html_beautify);
    });
} else {
    (function(mod) {
        var js_beautify = require('./lib/beautify');
        var css_beautify = require('./lib/beautify-css');
        var html_beautify = require('./lib/beautify-html');

        mod.exports = get_beautify(js_beautify, css_beautify, html_beautify);

    })(module);
}


},{"./lib/beautify":8,"./lib/beautify-css":6,"./lib/beautify-html":7}],6:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 CSS Beautifier
---------------

    Written by Harutyun Amirjanyan, (amirjanyan@gmail.com)

    Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
        http://jsbeautifier.org/

    Usage:
        css_beautify(source_text);
        css_beautify(source_text, options);

    The options are (default in brackets):
        indent_size (4)                   — indentation size,
        indent_char (space)               — character to indent with,
        selector_separator_newline (true) - separate selectors with newline or
                                            not (e.g. "a,\nbr" or "a, br")
        end_with_newline (false)          - end with a newline

    e.g

    css_beautify(css_source_text, {
      'indent_size': 1,
      'indent_char': '\t',
      'selector_separator': ' ',
      'end_with_newline': false,
    });
*/

// http://www.w3.org/TR/CSS21/syndata.html#tokenization
// http://www.w3.org/TR/css3-syntax/

(function() {
    function css_beautify(source_text, options) {
        options = options || {};
        var indentSize = options.indent_size || 4;
        var indentCharacter = options.indent_char || ' ';
        var selectorSeparatorNewline = (options.selector_separator_newline === undefined) ? true : options.selector_separator_newline;
        var end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;

        // compatibility
        if (typeof indentSize === "string") {
            indentSize = parseInt(indentSize, 10);
        }


        // tokenizer
        var whiteRe = /^\s+$/;
        var wordRe = /[\w$\-_]/;

        var pos = -1,
            ch;

        function next() {
            ch = source_text.charAt(++pos);
            return ch || '';
        }

        function peek(skipWhitespace) {
            var prev_pos = pos;
            if (skipWhitespace) {
                eatWhitespace();
            }
            result = source_text.charAt(pos + 1) || '';
            pos = prev_pos - 1;
            next();
            return result;
        }

        function eatString(endChars) {
            var start = pos;
            while (next()) {
                if (ch === "\\") {
                    next();
                } else if (endChars.indexOf(ch) !== -1) {
                    break;
                } else if (ch === "\n") {
                    break;
                }
            }
            return source_text.substring(start, pos + 1);
        }

        function peekString(endChar) {
            var prev_pos = pos;
            var str = eatString(endChar);
            pos = prev_pos - 1;
            next();
            return str;
        }

        function eatWhitespace() {
            var result = '';
            while (whiteRe.test(peek())) {
                next()
                result += ch;
            }
            return result;
        }

        function skipWhitespace() {
            var result = '';
            if (ch && whiteRe.test(ch)) {
                result = ch;
            }
            while (whiteRe.test(next())) {
                result += ch
            }
            return result;
        }

        function eatComment(singleLine) {
            var start = pos;
            var singleLine = peek() === "/";
            next();
            while (next()) {
                if (!singleLine && ch === "*" && peek() === "/") {
                    next();
                    break;
                } else if (singleLine && ch === "\n") {
                    return source_text.substring(start, pos);
                }
            }

            return source_text.substring(start, pos) + ch;
        }


        function lookBack(str) {
            return source_text.substring(pos - str.length, pos).toLowerCase() ===
                str;
        }

        // Nested pseudo-class if we are insideRule
        // and the next special character found opens
        // a new block
        function foundNestedPseudoClass() {
            for (var i = pos + 1; i < source_text.length; i++){
                var ch = source_text.charAt(i);
                if (ch === "{"){
                    return true;
                } else if (ch === ";" || ch === "}" || ch === ")") {
                    return false;
                }
            }
            return false;
        }

        // printer
        var basebaseIndentString = source_text.match(/^[\t ]*/)[0];
        var singleIndent = new Array(indentSize + 1).join(indentCharacter);
        var indentLevel = 0;
        var nestedLevel = 0;

        function indent() {
            indentLevel++;
            basebaseIndentString += singleIndent;
        }

        function outdent() {
            indentLevel--;
            basebaseIndentString = basebaseIndentString.slice(0, -indentSize);
        }

        var print = {};
        print["{"] = function(ch) {
            print.singleSpace();
            output.push(ch);
            print.newLine();
        };
        print["}"] = function(ch) {
            print.newLine();
            output.push(ch);
            print.newLine();
        };

        print._lastCharWhitespace = function() {
            return whiteRe.test(output[output.length - 1]);
        };

        print.newLine = function(keepWhitespace) {
            if (!keepWhitespace) {
                print.trim();
            }

            if (output.length) {
                output.push('\n');
            }
            if (basebaseIndentString) {
                output.push(basebaseIndentString);
            }
        };
        print.singleSpace = function() {
            if (output.length && !print._lastCharWhitespace()) {
                output.push(' ');
            }
        };

        print.trim = function() {
            while (print._lastCharWhitespace()) {
                output.pop();
            }
        };

        
        var output = [];
        if (basebaseIndentString) {
            output.push(basebaseIndentString);
        }
        /*_____________________--------------------_____________________*/

        var insideRule = false;
        var enteringConditionalGroup = false;
        var top_ch = '';
        var last_top_ch = '';

        while (true) {
            var whitespace = skipWhitespace();
            var isAfterSpace = whitespace !== '';
            var isAfterNewline = whitespace.indexOf('\n') !== -1;
            var last_top_ch = top_ch;
            var top_ch = ch;

            if (!ch) {
                break;
            } else if (ch === '/' && peek() === '*') { /* css comment */
                var header = lookBack("");
                print.newLine();
                output.push(eatComment());
                print.newLine();
                if (header) {
                    print.newLine(true);
                }
            } else if (ch === '/' && peek() === '/') { // single line comment
                if (!isAfterNewline && last_top_ch !== '{') {
                    print.trim();
                }
                print.singleSpace();
                output.push(eatComment());
                print.newLine();
            } else if (ch === '@') {
                // pass along the space we found as a separate item
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(ch);

                // strip trailing space, if present, for hash property checks
                var variableOrRule = peekString(": ,;{}()[]/='\"").replace(/\s$/, '');

                // might be a nesting at-rule
                if (variableOrRule in css_beautify.NESTED_AT_RULE) {
                    nestedLevel += 1;
                    if (variableOrRule in css_beautify.CONDITIONAL_GROUP_RULE) {
                        enteringConditionalGroup = true;
                    }
                } else if (': '.indexOf(variableOrRule[variableOrRule.length -1]) >= 0) {
                    //we have a variable, add it and insert one space before continuing
                    next();
                    variableOrRule = eatString(": ").replace(/\s$/, '');
                    output.push(variableOrRule);
                    print.singleSpace();
                }
            } else if (ch === '{') {
                if (peek(true) === '}') {
                    eatWhitespace();
                    next();
                    print.singleSpace();
                    output.push("{}");
                } else {
                    indent();
                    print["{"](ch);
                    // when entering conditional groups, only rulesets are allowed
                    if (enteringConditionalGroup) {
                        enteringConditionalGroup = false;
                        insideRule = (indentLevel > nestedLevel);
                    } else {
                        // otherwise, declarations are also allowed
                        insideRule = (indentLevel >= nestedLevel);
                    }
                }
            } else if (ch === '}') {
                outdent();
                print["}"](ch);
                insideRule = false;
                if (nestedLevel) {
                    nestedLevel--;
                }
            } else if (ch === ":") {
                eatWhitespace();
                if ((insideRule || enteringConditionalGroup) && 
                        !(lookBack("&") || foundNestedPseudoClass())) {
                    // 'property: value' delimiter
                    // which could be in a conditional group query
                    output.push(':');
                    print.singleSpace();
                } else {
                    // sass/less parent reference don't use a space
                    // sass nested pseudo-class don't use a space
                    if (peek() === ":") {
                        // pseudo-element
                        next();
                        output.push("::");
                    } else {
                        // pseudo-class
                        output.push(':');
                    }
                }
            } else if (ch === '"' || ch === '\'') {
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(eatString(ch));
            } else if (ch === ';') {
                output.push(ch);
                print.newLine();
            } else if (ch === '(') { // may be a url
                if (lookBack("url")) {
                    output.push(ch);
                    eatWhitespace();
                    if (next()) {
                        if (ch !== ')' && ch !== '"' && ch !== '\'') {
                            output.push(eatString(')'));
                        } else {
                            pos--;
                        }
                    }
                } else {
                    if (isAfterSpace) {
                        print.singleSpace();
                    }
                    output.push(ch);
                    eatWhitespace();
                }
            } else if (ch === ')') {
                output.push(ch);
            } else if (ch === ',') {
                output.push(ch);
                eatWhitespace();
                if (!insideRule && selectorSeparatorNewline) {
                    print.newLine();
                } else {
                    print.singleSpace();
                }
            } else if (ch === ']') {
                output.push(ch);
            } else if (ch === '[') {
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(ch);
            } else if (ch === '=') { // no whitespace before or after
                eatWhitespace();
                output.push(ch);
            } else {
                if (isAfterSpace) {
                    print.singleSpace();
                }

                output.push(ch);
            }
        }


        var sweetCode = output.join('').replace(/[\r\n\t ]+$/, '');

        // establish end_with_newline
        if (end_with_newline) {
            sweetCode += "\n";
        }

        return sweetCode;
    }

    // https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
    css_beautify.NESTED_AT_RULE = {
        "@page": true,
        "@font-face": true,
        "@keyframes": true,
        // also in CONDITIONAL_GROUP_RULE below
        "@media": true,
        "@supports": true,
        "@document": true
    };
    css_beautify.CONDITIONAL_GROUP_RULE = {
        "@media": true,
        "@supports": true,
        "@document": true
    };

    /*global define */
    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define([], function() {
            return {
                css_beautify: css_beautify
            };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var html_beautify = require("beautify").html_beautify`.
        exports.css_beautify = css_beautify;
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.css_beautify = css_beautify;
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.css_beautify = css_beautify;
    }

}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],7:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
    http://jsbeautifier.org/

  Usage:
    style_html(html_source);

    style_html(html_source, options);

  The options are:
    indent_inner_html (default false)  — indent <head> and <body> sections,
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    wrap_line_length (default 250)            -  maximum amount of characters per line (0 = disable)
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.
    unformatted (defaults to inline tags) - list of tags, that shouldn't be reformatted
    indent_scripts (default normal)  - "keep"|"separate"|"normal"
    preserve_newlines (default true) - whether existing line breaks before elements should be preserved
                                        Only works before elements, not inside tags or for text.
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk
    indent_handlebars (default false) - format and indent {{#foo}} and {{/foo}}
    end_with_newline (false)          - end with a newline


    e.g.

    style_html(html_source, {
      'indent_inner_html': false,
      'indent_size': 2,
      'indent_char': ' ',
      'wrap_line_length': 78,
      'brace_style': 'expand',
      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u'],
      'preserve_newlines': true,
      'max_preserve_newlines': 5,
      'indent_handlebars': false
    });
*/

(function() {

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function ltrim(s) {
        return s.replace(/^\s+/g, '');
    }

    function rtrim(s) {
        return s.replace(/\s+$/g,'');
    }

    function style_html(html_source, options, js_beautify, css_beautify) {
        //Wrapper function to invoke all the necessary constructors and deal with the output.

        var multi_parser,
            indent_inner_html,
            indent_size,
            indent_character,
            wrap_line_length,
            brace_style,
            unformatted,
            preserve_newlines,
            max_preserve_newlines,
            indent_handlebars,
            end_with_newline;

        options = options || {};

        // backwards compatibility to 1.3.4
        if ((options.wrap_line_length === undefined || parseInt(options.wrap_line_length, 10) === 0) &&
                (options.max_char !== undefined && parseInt(options.max_char, 10) !== 0)) {
            options.wrap_line_length = options.max_char;
        }

        indent_inner_html = (options.indent_inner_html === undefined) ? false : options.indent_inner_html;
        indent_size = (options.indent_size === undefined) ? 4 : parseInt(options.indent_size, 10);
        indent_character = (options.indent_char === undefined) ? ' ' : options.indent_char;
        brace_style = (options.brace_style === undefined) ? 'collapse' : options.brace_style;
        wrap_line_length =  parseInt(options.wrap_line_length, 10) === 0 ? 32786 : parseInt(options.wrap_line_length || 250, 10);
        unformatted = options.unformatted || ['a', 'span', 'img', 'bdo', 'em', 'strong', 'dfn', 'code', 'samp', 'kbd', 'var', 'cite', 'abbr', 'acronym', 'q', 'sub', 'sup', 'tt', 'i', 'b', 'big', 'small', 'u', 's', 'strike', 'font', 'ins', 'del', 'pre', 'address', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
        max_preserve_newlines = preserve_newlines ?
            (isNaN(parseInt(options.max_preserve_newlines, 10)) ? 32786 : parseInt(options.max_preserve_newlines, 10))
            : 0;
        indent_handlebars = (options.indent_handlebars === undefined) ? false : options.indent_handlebars;
        end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;

        function Parser() {

            this.pos = 0; //Parser position
            this.token = '';
            this.current_mode = 'CONTENT'; //reflects the current Parser mode: TAG/CONTENT
            this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
                parent: 'parent1',
                parentcount: 1,
                parent1: ''
            };
            this.tag_type = '';
            this.token_text = this.last_token = this.last_text = this.token_type = '';
            this.newlines = 0;
            this.indent_content = indent_inner_html;

            this.Utils = { //Uilities made available to the various functions
                whitespace: "\n\r\t ".split(''),
                single_token: 'br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed,?php,?,?='.split(','), //all the single tags for HTML
                extra_liners: 'head,body,/html'.split(','), //for tags that need a line of whitespace before them
                in_array: function(what, arr) {
                    for (var i = 0; i < arr.length; i++) {
                        if (what === arr[i]) {
                            return true;
                        }
                    }
                    return false;
                }
            };

            // Return true iff the given text is composed entirely of
            // whitespace.
            this.is_whitespace = function(text) {
                for (var n = 0; n < text.length; text++) {
                    if (!this.Utils.in_array(text.charAt(n), this.Utils.whitespace)) {
                        return false;
                    }
                }
                return true;
            }

            this.traverse_whitespace = function() {
                var input_char = '';

                input_char = this.input.charAt(this.pos);
                if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                    this.newlines = 0;
                    while (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                        if (preserve_newlines && input_char === '\n' && this.newlines <= max_preserve_newlines) {
                            this.newlines += 1;
                        }

                        this.pos++;
                        input_char = this.input.charAt(this.pos);
                    }
                    return true;
                }
                return false;
            };

            // Append a space to the given content (string array) or, if we are
            // at the wrap_line_length, append a newline/indentation.
            this.space_or_wrap = function(content) {
                if (this.line_char_count >= this.wrap_line_length) { //insert a line when the wrap_line_length is reached
                    this.print_newline(false, content);
                    this.print_indentation(content);
                } else {
                    this.line_char_count++;
                    content.push(' ');
                }
            };

            this.get_content = function() { //function to capture regular content between tags
                var input_char = '',
                    content = [],
                    space = false; //if a space is needed

                while (this.input.charAt(this.pos) !== '<') {
                    if (this.pos >= this.input.length) {
                        return content.length ? content.join('') : ['', 'TK_EOF'];
                    }

                    if (this.traverse_whitespace()) {
                        this.space_or_wrap(content);
                        continue;
                    }

                    if (indent_handlebars) {
                        // Handlebars parsing is complicated.
                        // {{#foo}} and {{/foo}} are formatted tags.
                        // {{something}} should get treated as content, except:
                        // {{else}} specifically behaves like {{#if}} and {{/if}}
                        var peek3 = this.input.substr(this.pos, 3);
                        if (peek3 === '{{#' || peek3 === '{{/') {
                            // These are tags and not content.
                            break;
                        } else if (this.input.substr(this.pos, 2) === '{{') {
                            if (this.get_tag(true) === '{{else}}') {
                                break;
                            }
                        }
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;
                    this.line_char_count++;
                    content.push(input_char); //letter at-a-time (or string) inserted to an array
                }
                return content.length ? content.join('') : '';
            };

            this.get_contents_to = function(name) { //get the full content of a script or style to pass to js_beautify
                if (this.pos === this.input.length) {
                    return ['', 'TK_EOF'];
                }
                var input_char = '';
                var content = '';
                var reg_match = new RegExp('</' + name + '\\s*>', 'igm');
                reg_match.lastIndex = this.pos;
                var reg_array = reg_match.exec(this.input);
                var end_script = reg_array ? reg_array.index : this.input.length; //absolute end of script
                if (this.pos < end_script) { //get everything in between the script tags
                    content = this.input.substring(this.pos, end_script);
                    this.pos = end_script;
                }
                return content;
            };

            this.record_tag = function(tag) { //function to record a tag and its parent in this.tags Object
                if (this.tags[tag + 'count']) { //check for the existence of this tag type
                    this.tags[tag + 'count']++;
                    this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
                } else { //otherwise initialize this tag type
                    this.tags[tag + 'count'] = 1;
                    this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
                }
                this.tags[tag + this.tags[tag + 'count'] + 'parent'] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
                this.tags.parent = tag + this.tags[tag + 'count']; //and make this the current parent (i.e. in the case of a div 'div1')
            };

            this.retrieve_tag = function(tag) { //function to retrieve the opening tag to the corresponding closer
                if (this.tags[tag + 'count']) { //if the openener is not in the Object we ignore it
                    var temp_parent = this.tags.parent; //check to see if it's a closable tag.
                    while (temp_parent) { //till we reach '' (the initial value);
                        if (tag + this.tags[tag + 'count'] === temp_parent) { //if this is it use it
                            break;
                        }
                        temp_parent = this.tags[temp_parent + 'parent']; //otherwise keep on climbing up the DOM Tree
                    }
                    if (temp_parent) { //if we caught something
                        this.indent_level = this.tags[tag + this.tags[tag + 'count']]; //set the indent_level accordingly
                        this.tags.parent = this.tags[temp_parent + 'parent']; //and set the current parent
                    }
                    delete this.tags[tag + this.tags[tag + 'count'] + 'parent']; //delete the closed tags parent reference...
                    delete this.tags[tag + this.tags[tag + 'count']]; //...and the tag itself
                    if (this.tags[tag + 'count'] === 1) {
                        delete this.tags[tag + 'count'];
                    } else {
                        this.tags[tag + 'count']--;
                    }
                }
            };

            this.indent_to_tag = function(tag) {
                // Match the indentation level to the last use of this tag, but don't remove it.
                if (!this.tags[tag + 'count']) {
                    return;
                }
                var temp_parent = this.tags.parent;
                while (temp_parent) {
                    if (tag + this.tags[tag + 'count'] === temp_parent) {
                        break;
                    }
                    temp_parent = this.tags[temp_parent + 'parent'];
                }
                if (temp_parent) {
                    this.indent_level = this.tags[tag + this.tags[tag + 'count']];
                }
            };

            this.get_tag = function(peek) { //function to get a full tag and parse its type
                var input_char = '',
                    content = [],
                    comment = '',
                    space = false,
                    tag_start, tag_end,
                    tag_start_char,
                    orig_pos = this.pos,
                    orig_line_char_count = this.line_char_count;

                peek = peek !== undefined ? peek : false;

                do {
                    if (this.pos >= this.input.length) {
                        if (peek) {
                            this.pos = orig_pos;
                            this.line_char_count = orig_line_char_count;
                        }
                        return content.length ? content.join('') : ['', 'TK_EOF'];
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;

                    if (this.Utils.in_array(input_char, this.Utils.whitespace)) { //don't want to insert unnecessary space
                        space = true;
                        continue;
                    }

                    if (input_char === "'" || input_char === '"') {
                        input_char += this.get_unformatted(input_char);
                        space = true;

                    }

                    if (input_char === '=') { //no space before =
                        space = false;
                    }

                    if (content.length && content[content.length - 1] !== '=' && input_char !== '>' && space) {
                        //no space after = or before >
                        this.space_or_wrap(content);
                        space = false;
                    }

                    if (indent_handlebars && tag_start_char === '<') {
                        // When inside an angle-bracket tag, put spaces around
                        // handlebars not inside of strings.
                        if ((input_char + this.input.charAt(this.pos)) === '{{') {
                            input_char += this.get_unformatted('}}');
                            if (content.length && content[content.length - 1] !== ' ' && content[content.length - 1] !== '<') {
                                input_char = ' ' + input_char;
                            }
                            space = true;
                        }
                    }

                    if (input_char === '<' && !tag_start_char) {
                        tag_start = this.pos - 1;
                        tag_start_char = '<';
                    }

                    if (indent_handlebars && !tag_start_char) {
                        if (content.length >= 2 && content[content.length - 1] === '{' && content[content.length - 2] == '{') {
                            if (input_char === '#' || input_char === '/') {
                                tag_start = this.pos - 3;
                            } else {
                                tag_start = this.pos - 2;
                            }
                            tag_start_char = '{';
                        }
                    }

                    this.line_char_count++;
                    content.push(input_char); //inserts character at-a-time (or string)

                    if (content[1] && content[1] === '!') { //if we're in a comment, do something special
                        // We treat all comments as literals, even more than preformatted tags
                        // we just look for the appropriate close tag
                        content = [this.get_comment(tag_start)];
                        break;
                    }

                    if (indent_handlebars && tag_start_char === '{' && content.length > 2 && content[content.length - 2] === '}' && content[content.length - 1] === '}') {
                        break;
                    }
                } while (input_char !== '>');

                var tag_complete = content.join('');
                var tag_index;
                var tag_offset;

                if (tag_complete.indexOf(' ') !== -1) { //if there's whitespace, thats where the tag name ends
                    tag_index = tag_complete.indexOf(' ');
                } else if (tag_complete[0] === '{') {
                    tag_index = tag_complete.indexOf('}');
                } else { //otherwise go with the tag ending
                    tag_index = tag_complete.indexOf('>');
                }
                if (tag_complete[0] === '<' || !indent_handlebars) {
                    tag_offset = 1;
                } else {
                    tag_offset = tag_complete[2] === '#' ? 3 : 2;
                }
                var tag_check = tag_complete.substring(tag_offset, tag_index).toLowerCase();
                if (tag_complete.charAt(tag_complete.length - 2) === '/' ||
                    this.Utils.in_array(tag_check, this.Utils.single_token)) { //if this tag name is a single tag type (either in the list or has a closing /)
                    if (!peek) {
                        this.tag_type = 'SINGLE';
                    }
                } else if (indent_handlebars && tag_complete[0] === '{' && tag_check === 'else') {
                    if (!peek) {
                        this.indent_to_tag('if');
                        this.tag_type = 'HANDLEBARS_ELSE';
                        this.indent_content = true;
                        this.traverse_whitespace();
                    }
                } else if (this.is_unformatted(tag_check, unformatted)) { // do not reformat the "unformatted" tags
                    comment = this.get_unformatted('</' + tag_check + '>', tag_complete); //...delegate to get_unformatted function
                    content.push(comment);
                    tag_end = this.pos - 1;
                    this.tag_type = 'SINGLE';
                } else if (tag_check === 'script' &&
                    (tag_complete.search('type') === -1 ||
                    (tag_complete.search('type') > -1 &&
                    tag_complete.search(/\b(text|application)\/(x-)?(javascript|ecmascript|jscript|livescript)/) > -1))) {
                    if (!peek) {
                        this.record_tag(tag_check);
                        this.tag_type = 'SCRIPT';
                    }
                } else if (tag_check === 'style' &&
                    (tag_complete.search('type') === -1 ||
                    (tag_complete.search('type') > -1 && tag_complete.search('text/css') > -1))) {
                    if (!peek) {
                        this.record_tag(tag_check);
                        this.tag_type = 'STYLE';
                    }
                } else if (tag_check.charAt(0) === '!') { //peek for <! comment
                    // for comments content is already correct.
                    if (!peek) {
                        this.tag_type = 'SINGLE';
                        this.traverse_whitespace();
                    }
                } else if (!peek) {
                    if (tag_check.charAt(0) === '/') { //this tag is a double tag so check for tag-ending
                        this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
                        this.tag_type = 'END';
                    } else { //otherwise it's a start-tag
                        this.record_tag(tag_check); //push it on the tag stack
                        if (tag_check.toLowerCase() !== 'html') {
                            this.indent_content = true;
                        }
                        this.tag_type = 'START';
                    }

                    // Allow preserving of newlines after a start or end tag
                    if (this.traverse_whitespace()) {
                        this.space_or_wrap(content);
                    }

                    if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) { //check if this double needs an extra line
                        this.print_newline(false, this.output);
                        if (this.output.length && this.output[this.output.length - 2] !== '\n') {
                            this.print_newline(true, this.output);
                        }
                    }
                }

                if (peek) {
                    this.pos = orig_pos;
                    this.line_char_count = orig_line_char_count;
                }

                return content.join(''); //returns fully formatted tag
            };

            this.get_comment = function(start_pos) { //function to return comment content in its entirety
                // this is will have very poor perf, but will work for now.
                var comment = '',
                    delimiter = '>',
                    matched = false;

                this.pos = start_pos;
                input_char = this.input.charAt(this.pos);
                this.pos++;

                while (this.pos <= this.input.length) {
                    comment += input_char;

                    // only need to check for the delimiter if the last chars match
                    if (comment[comment.length - 1] === delimiter[delimiter.length - 1] &&
                        comment.indexOf(delimiter) !== -1) {
                        break;
                    }

                    // only need to search for custom delimiter for the first few characters
                    if (!matched && comment.length < 10) {
                        if (comment.indexOf('<![if') === 0) { //peek for <![if conditional comment
                            delimiter = '<![endif]>';
                            matched = true;
                        } else if (comment.indexOf('<![cdata[') === 0) { //if it's a <[cdata[ comment...
                            delimiter = ']]>';
                            matched = true;
                        } else if (comment.indexOf('<![') === 0) { // some other ![ comment? ...
                            delimiter = ']>';
                            matched = true;
                        } else if (comment.indexOf('<!--') === 0) { // <!-- comment ...
                            delimiter = '-->';
                            matched = true;
                        }
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;
                }

                return comment;
            };

            this.get_unformatted = function(delimiter, orig_tag) { //function to return unformatted content in its entirety

                if (orig_tag && orig_tag.toLowerCase().indexOf(delimiter) !== -1) {
                    return '';
                }
                var input_char = '';
                var content = '';
                var min_index = 0;
                var space = true;
                do {

                    if (this.pos >= this.input.length) {
                        return content;
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;

                    if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                        if (!space) {
                            this.line_char_count--;
                            continue;
                        }
                        if (input_char === '\n' || input_char === '\r') {
                            content += '\n';
                            /*  Don't change tab indention for unformatted blocks.  If using code for html editing, this will greatly affect <pre> tags if they are specified in the 'unformatted array'
                for (var i=0; i<this.indent_level; i++) {
                  content += this.indent_string;
                }
                space = false; //...and make sure other indentation is erased
                */
                            this.line_char_count = 0;
                            continue;
                        }
                    }
                    content += input_char;
                    this.line_char_count++;
                    space = true;

                    if (indent_handlebars && input_char === '{' && content.length && content[content.length - 2] === '{') {
                        // Handlebars expressions in strings should also be unformatted.
                        content += this.get_unformatted('}}');
                        // These expressions are opaque.  Ignore delimiters found in them.
                        min_index = content.length;
                    }
                } while (content.toLowerCase().indexOf(delimiter, min_index) === -1);
                return content;
            };

            this.get_token = function() { //initial handler for token-retrieval
                var token;

                if (this.last_token === 'TK_TAG_SCRIPT' || this.last_token === 'TK_TAG_STYLE') { //check if we need to format javascript
                    var type = this.last_token.substr(7);
                    token = this.get_contents_to(type);
                    if (typeof token !== 'string') {
                        return token;
                    }
                    return [token, 'TK_' + type];
                }
                if (this.current_mode === 'CONTENT') {
                    token = this.get_content();
                    if (typeof token !== 'string') {
                        return token;
                    } else {
                        return [token, 'TK_CONTENT'];
                    }
                }

                if (this.current_mode === 'TAG') {
                    token = this.get_tag();
                    if (typeof token !== 'string') {
                        return token;
                    } else {
                        var tag_name_type = 'TK_TAG_' + this.tag_type;
                        return [token, tag_name_type];
                    }
                }
            };

            this.get_full_indent = function(level) {
                level = this.indent_level + level || 0;
                if (level < 1) {
                    return '';
                }

                return Array(level + 1).join(this.indent_string);
            };

            this.is_unformatted = function(tag_check, unformatted) {
                //is this an HTML5 block-level link?
                if (!this.Utils.in_array(tag_check, unformatted)) {
                    return false;
                }

                if (tag_check.toLowerCase() !== 'a' || !this.Utils.in_array('a', unformatted)) {
                    return true;
                }

                //at this point we have an  tag; is its first child something we want to remain
                //unformatted?
                var next_tag = this.get_tag(true /* peek. */ );

                // test next_tag to see if it is just html tag (no external content)
                var tag = (next_tag || "").match(/^\s*<\s*\/?([a-z]*)\s*[^>]*>\s*$/);

                // if next_tag comes back but is not an isolated tag, then
                // let's treat the 'a' tag as having content
                // and respect the unformatted option
                if (!tag || this.Utils.in_array(tag, unformatted)) {
                    return true;
                } else {
                    return false;
                }
            };

            this.printer = function(js_source, indent_character, indent_size, wrap_line_length, brace_style) { //handles input/output and some other printing functions

                this.input = js_source || ''; //gets the input for the Parser
                this.output = [];
                this.indent_character = indent_character;
                this.indent_string = '';
                this.indent_size = indent_size;
                this.brace_style = brace_style;
                this.indent_level = 0;
                this.wrap_line_length = wrap_line_length;
                this.line_char_count = 0; //count to see if wrap_line_length was exceeded

                for (var i = 0; i < this.indent_size; i++) {
                    this.indent_string += this.indent_character;
                }

                this.print_newline = function(force, arr) {
                    this.line_char_count = 0;
                    if (!arr || !arr.length) {
                        return;
                    }
                    if (force || (arr[arr.length - 1] !== '\n')) { //we might want the extra line
                        if ((arr[arr.length - 1] !== '\n')) {
                            arr[arr.length - 1] = rtrim(arr[arr.length - 1]);
                        }
                        arr.push('\n');
                    }
                };

                this.print_indentation = function(arr) {
                    for (var i = 0; i < this.indent_level; i++) {
                        arr.push(this.indent_string);
                        this.line_char_count += this.indent_string.length;
                    }
                };

                this.print_token = function(text) {
                    // Avoid printing initial whitespace.
                    if (this.is_whitespace(text) && !this.output.length) {
                        return;
                    }
                    if (text || text !== '') {
                        if (this.output.length && this.output[this.output.length - 1] === '\n') {
                            this.print_indentation(this.output);
                            text = ltrim(text);
                        }
                    }
                    this.print_token_raw(text);
                };

                this.print_token_raw = function(text) {
                    // If we are going to print newlines, truncate trailing
                    // whitespace, as the newlines will represent the space.
                    if (this.newlines > 0) {
                        text = rtrim(text);
                    }

                    if (text && text !== '') {
                        if (text.length > 1 && text[text.length - 1] === '\n') {
                            // unformatted tags can grab newlines as their last character
                            this.output.push(text.slice(0, -1));
                            this.print_newline(false, this.output);
                        } else {
                            this.output.push(text);
                        }
                    }

                    for (var n = 0; n < this.newlines; n++) {
                        this.print_newline(n > 0, this.output);
                    }
                    this.newlines = 0;
                };

                this.indent = function() {
                    this.indent_level++;
                };

                this.unindent = function() {
                    if (this.indent_level > 0) {
                        this.indent_level--;
                    }
                };
            };
            return this;
        }

        /*_____________________--------------------_____________________*/

        multi_parser = new Parser(); //wrapping functions Parser
        multi_parser.printer(html_source, indent_character, indent_size, wrap_line_length, brace_style); //initialize starting values

        while (true) {
            var t = multi_parser.get_token();
            multi_parser.token_text = t[0];
            multi_parser.token_type = t[1];

            if (multi_parser.token_type === 'TK_EOF') {
                break;
            }

            switch (multi_parser.token_type) {
                case 'TK_TAG_START':
                    multi_parser.print_newline(false, multi_parser.output);
                    multi_parser.print_token(multi_parser.token_text);
                    if (multi_parser.indent_content) {
                        multi_parser.indent();
                        multi_parser.indent_content = false;
                    }
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_STYLE':
                case 'TK_TAG_SCRIPT':
                    multi_parser.print_newline(false, multi_parser.output);
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_END':
                    //Print new line only if the tag has no content and has child
                    if (multi_parser.last_token === 'TK_CONTENT' && multi_parser.last_text === '') {
                        var tag_name = multi_parser.token_text.match(/\w+/)[0];
                        var tag_extracted_from_last_output = null;
                        if (multi_parser.output.length) {
                            tag_extracted_from_last_output = multi_parser.output[multi_parser.output.length - 1].match(/(?:<|{{#)\s*(\w+)/);
                        }
                        if (tag_extracted_from_last_output === null ||
                            tag_extracted_from_last_output[1] !== tag_name) {
                            multi_parser.print_newline(false, multi_parser.output);
                        }
                    }
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_SINGLE':
                    // Don't add a newline before elements that should remain unformatted.
                    var tag_check = multi_parser.token_text.match(/^\s*<([a-z-]+)/i);
                    if (!tag_check || !multi_parser.Utils.in_array(tag_check[1], unformatted)) {
                        multi_parser.print_newline(false, multi_parser.output);
                    }
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_HANDLEBARS_ELSE':
                    multi_parser.print_token(multi_parser.token_text);
                    if (multi_parser.indent_content) {
                        multi_parser.indent();
                        multi_parser.indent_content = false;
                    }
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_CONTENT':
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'TAG';
                    break;
                case 'TK_STYLE':
                case 'TK_SCRIPT':
                    if (multi_parser.token_text !== '') {
                        multi_parser.print_newline(false, multi_parser.output);
                        var text = multi_parser.token_text,
                            _beautifier,
                            script_indent_level = 1;
                        if (multi_parser.token_type === 'TK_SCRIPT') {
                            _beautifier = typeof js_beautify === 'function' && js_beautify;
                        } else if (multi_parser.token_type === 'TK_STYLE') {
                            _beautifier = typeof css_beautify === 'function' && css_beautify;
                        }

                        if (options.indent_scripts === "keep") {
                            script_indent_level = 0;
                        } else if (options.indent_scripts === "separate") {
                            script_indent_level = -multi_parser.indent_level;
                        }

                        var indentation = multi_parser.get_full_indent(script_indent_level);
                        if (_beautifier) {
                            // call the Beautifier if avaliable
                            text = _beautifier(text.replace(/^\s*/, indentation), options);
                        } else {
                            // simply indent the string otherwise
                            var white = text.match(/^\s*/)[0];
                            var _level = white.match(/[^\n\r]*$/)[0].split(multi_parser.indent_string).length - 1;
                            var reindent = multi_parser.get_full_indent(script_indent_level - _level);
                            text = text.replace(/^\s*/, indentation)
                                .replace(/\r\n|\r|\n/g, '\n' + reindent)
                                .replace(/\s+$/, '');
                        }
                        if (text) {
                            multi_parser.print_token_raw(text);
                            multi_parser.print_newline(true, multi_parser.output);
                        }
                    }
                    multi_parser.current_mode = 'TAG';
                    break;
                default:
                    // We should not be getting here but we don't want to drop input on the floor
                    // Just output the text and move on
                    if (multi_parser.token_text !== '') {
                        multi_parser.print_token(multi_parser.token_text);
                    }
                    break;
            }
            multi_parser.last_token = multi_parser.token_type;
            multi_parser.last_text = multi_parser.token_text;
        }
        var sweet_code = multi_parser.output.join('').replace(/[\r\n\t ]+$/, '');
        if (end_with_newline) {
            sweet_code += '\n';
        }
        return sweet_code;
    }

    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define(["require", "./beautify", "./beautify-css"], function(requireamd) {
            var js_beautify =  requireamd("./beautify");
            var css_beautify =  requireamd("./beautify-css");

            return {
              html_beautify: function(html_source, options) {
                return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
              }
            };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var html_beautify = require("beautify").html_beautify`.
        var js_beautify = require('./beautify.js');
        var css_beautify = require('./beautify-css.js');

        exports.html_beautify = function(html_source, options) {
            return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
        };
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.html_beautify = function(html_source, options) {
            return style_html(html_source, options, window.js_beautify, window.css_beautify);
        };
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.html_beautify = function(html_source, options) {
            return style_html(html_source, options, global.js_beautify, global.css_beautify);
        };
    }

}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./beautify-css.js":6,"./beautify.js":8}],8:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

 JS Beautifier
---------------


  Written by Einar Lielmanis, <einar@jsbeautifier.org>
      http://jsbeautifier.org/

  Originally converted to javascript by Vital, <vital76@gmail.com>
  "End braces on own line" added by Chris J. Shull, <chrisjshull@gmail.com>
  Parsing improvements for brace-less statements by Liam Newman <bitwiseman@gmail.com>


  Usage:
    js_beautify(js_source_text);
    js_beautify(js_source_text, options);

  The options are:
    indent_size (default 4)          - indentation size,
    indent_char (default space)      - character to indent with,
    preserve_newlines (default true) - whether existing line breaks should be preserved,
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk,

    jslint_happy (default false) - if true, then jslint-stricter mode is enforced.

            jslint_happy        !jslint_happy
            ---------------------------------
            function ()         function()

            switch () {         switch() {
            case 1:               case 1:
              break;                break;
            }                   }

    space_after_anon_function (default false) - should the space before an anonymous function's parens be added, "function()" vs "function ()",
          NOTE: This option is overriden by jslint_happy (i.e. if jslint_happy is true, space_after_anon_function is true by design)

    brace_style (default "collapse") - "collapse" | "expand" | "end-expand"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line.

    space_before_conditional (default true) - should the space before conditional statement be added, "if(true)" vs "if (true)",

    unescape_strings (default false) - should printable characters in strings encoded in \xNN notation be unescaped, "example" vs "\x65\x78\x61\x6d\x70\x6c\x65"

    wrap_line_length (default unlimited) - lines should wrap at next opportunity after this number of characters.
          NOTE: This is not a hard limit. Lines will continue until a point where a newline would
                be preserved if it were present.

    end_with_newline (default false)  - end output with a newline


    e.g

    js_beautify(js_source_text, {
      'indent_size': 1,
      'indent_char': '\t'
    });

*/

(function() {

    var acorn = {};
    (function (exports) {
      // This section of code is taken from acorn.
      //
      // Acorn was written by Marijn Haverbeke and released under an MIT
      // license. The Unicode regexps (for identifiers and whitespace) were
      // taken from [Esprima](http://esprima.org) by Ariya Hidayat.
      //
      // Git repositories for Acorn are available at
      //
      //     http://marijnhaverbeke.nl/git/acorn
      //     https://github.com/marijnh/acorn.git

      // ## Character categories

      // Big ugly regular expressions that match characters in the
      // whitespace, identifier, and identifier-start categories. These
      // are only applied when a character is found to actually have a
      // code point above 128.

      var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
      var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
      var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
      var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
      var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

      // Whether a single character denotes a newline.

      var newline = exports.newline = /[\n\r\u2028\u2029]/;

      // Matches a whole line break (where CRLF is considered a single
      // line break). Used to count lines.

      var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

      // Test whether a given character code starts an identifier.

      var isIdentifierStart = exports.isIdentifierStart = function(code) {
        if (code < 65) return code === 36;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
      };

      // Test whether a given character is part of an identifier.

      var isIdentifierChar = exports.isIdentifierChar = function(code) {
        if (code < 48) return code === 36;
        if (code < 58) return true;
        if (code < 65) return false;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
      };
    })(acorn);

    function in_array(what, arr) {
        for (var i = 0; i < arr.length; i += 1) {
            if (arr[i] === what) {
                return true;
            }
        }
        return false;
    }

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function js_beautify(js_source_text, options) {
        "use strict";
        var beautifier = new Beautifier(js_source_text, options);
        return beautifier.beautify();
    }

    var MODE = {
            BlockStatement: 'BlockStatement', // 'BLOCK'
            Statement: 'Statement', // 'STATEMENT'
            ObjectLiteral: 'ObjectLiteral', // 'OBJECT',
            ArrayLiteral: 'ArrayLiteral', //'[EXPRESSION]',
            ForInitializer: 'ForInitializer', //'(FOR-EXPRESSION)',
            Conditional: 'Conditional', //'(COND-EXPRESSION)',
            Expression: 'Expression' //'(EXPRESSION)'
        };

    function Beautifier(js_source_text, options) {
        "use strict";
        var output
        var tokens = [], token_pos;
        var Tokenizer;
        var current_token;
        var last_type, last_last_text, indent_string;
        var flags, previous_flags, flag_store;
        var prefix;

        var handlers, opt;
        var baseIndentString = '';

        handlers = {
            'TK_START_EXPR': handle_start_expr,
            'TK_END_EXPR': handle_end_expr,
            'TK_START_BLOCK': handle_start_block,
            'TK_END_BLOCK': handle_end_block,
            'TK_WORD': handle_word,
            'TK_RESERVED': handle_word,
            'TK_SEMICOLON': handle_semicolon,
            'TK_STRING': handle_string,
            'TK_EQUALS': handle_equals,
            'TK_OPERATOR': handle_operator,
            'TK_COMMA': handle_comma,
            'TK_BLOCK_COMMENT': handle_block_comment,
            'TK_INLINE_COMMENT': handle_inline_comment,
            'TK_COMMENT': handle_comment,
            'TK_DOT': handle_dot,
            'TK_UNKNOWN': handle_unknown,
            'TK_EOF': handle_eof
        };

        function create_flags(flags_base, mode) {
            var next_indent_level = 0;
            if (flags_base) {
                next_indent_level = flags_base.indentation_level;
                if (!output.just_added_newline() &&
                    flags_base.line_indent_level > next_indent_level) {
                    next_indent_level = flags_base.line_indent_level;
                }
            }

            var next_flags = {
                mode: mode,
                parent: flags_base,
                last_text: flags_base ? flags_base.last_text : '', // last token text
                last_word: flags_base ? flags_base.last_word : '', // last 'TK_WORD' passed
                declaration_statement: false,
                declaration_assignment: false,
                multiline_frame: false,
                if_block: false,
                else_block: false,
                do_block: false,
                do_while: false,
                in_case_statement: false, // switch(..){ INSIDE HERE }
                in_case: false, // we're on the exact line with "case 0:"
                case_body: false, // the indented case-action block
                indentation_level: next_indent_level,
                line_indent_level: flags_base ? flags_base.line_indent_level : next_indent_level,
                start_line_index: output.get_line_number(),
                ternary_depth: 0
            };
            return next_flags;
        }

        // Some interpreters have unexpected results with foo = baz || bar;
        options = options ? options : {};
        opt = {};

        // compatibility
        if (options.braces_on_own_line !== undefined) { //graceful handling of deprecated option
            opt.brace_style = options.braces_on_own_line ? "expand" : "collapse";
        }
        opt.brace_style = options.brace_style ? options.brace_style : (opt.brace_style ? opt.brace_style : "collapse");

        // graceful handling of deprecated option
        if (opt.brace_style === "expand-strict") {
            opt.brace_style = "expand";
        }


        opt.indent_size = options.indent_size ? parseInt(options.indent_size, 10) : 4;
        opt.indent_char = options.indent_char ? options.indent_char : ' ';
        opt.preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
        opt.break_chained_methods = (options.break_chained_methods === undefined) ? false : options.break_chained_methods;
        opt.max_preserve_newlines = (options.max_preserve_newlines === undefined) ? 0 : parseInt(options.max_preserve_newlines, 10);
        opt.space_in_paren = (options.space_in_paren === undefined) ? false : options.space_in_paren;
        opt.space_in_empty_paren = (options.space_in_empty_paren === undefined) ? false : options.space_in_empty_paren;
        opt.jslint_happy = (options.jslint_happy === undefined) ? false : options.jslint_happy;
        opt.space_after_anon_function = (options.space_after_anon_function === undefined) ? false : options.space_after_anon_function;
        opt.keep_array_indentation = (options.keep_array_indentation === undefined) ? false : options.keep_array_indentation;
        opt.space_before_conditional = (options.space_before_conditional === undefined) ? true : options.space_before_conditional;
        opt.unescape_strings = (options.unescape_strings === undefined) ? false : options.unescape_strings;
        opt.wrap_line_length = (options.wrap_line_length === undefined) ? 0 : parseInt(options.wrap_line_length, 10);
        opt.e4x = (options.e4x === undefined) ? false : options.e4x;
        opt.end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;


        // force opt.space_after_anon_function to true if opt.jslint_happy
        if(opt.jslint_happy) {
            opt.space_after_anon_function = true;
        }

        if(options.indent_with_tabs){
            opt.indent_char = '\t';
            opt.indent_size = 1;
        }

        //----------------------------------
        indent_string = '';
        while (opt.indent_size > 0) {
            indent_string += opt.indent_char;
            opt.indent_size -= 1;
        }

        var preindent_index = 0;
        if(js_source_text && js_source_text.length) {
            while ( (js_source_text.charAt(preindent_index) === ' ' ||
                    js_source_text.charAt(preindent_index) === '\t')) {
                baseIndentString += js_source_text.charAt(preindent_index);
                preindent_index += 1;
            }
            js_source_text = js_source_text.substring(preindent_index);
        }

        last_type = 'TK_START_BLOCK'; // last token type
        last_last_text = ''; // pre-last token text
        output = new Output(indent_string, baseIndentString);


        // Stack of parsing/formatting states, including MODE.
        // We tokenize, parse, and output in an almost purely a forward-only stream of token input
        // and formatted output.  This makes the beautifier less accurate than full parsers
        // but also far more tolerant of syntax errors.
        //
        // For example, the default mode is MODE.BlockStatement. If we see a '{' we push a new frame of type
        // MODE.BlockStatement on the the stack, even though it could be object literal.  If we later
        // encounter a ":", we'll switch to to MODE.ObjectLiteral.  If we then see a ";",
        // most full parsers would die, but the beautifier gracefully falls back to
        // MODE.BlockStatement and continues on.
        flag_store = [];
        set_mode(MODE.BlockStatement);

        this.beautify = function() {

            /*jshint onevar:true */
            var local_token, sweet_code;
            Tokenizer = new tokenizer(js_source_text, opt, indent_string);
            tokens = Tokenizer.tokenize();
            token_pos = 0;

            while (local_token = get_token()) {
                for(var i = 0; i < local_token.comments_before.length; i++) {
                    // The cleanest handling of inline comments is to treat them as though they aren't there.
                    // Just continue formatting and the behavior should be logical.
                    // Also ignore unknown tokens.  Again, this should result in better behavior.
                    handle_token(local_token.comments_before[i]);
                }
                handle_token(local_token);

                last_last_text = flags.last_text;
                last_type = local_token.type;
                flags.last_text = local_token.text;

                token_pos += 1;
            }

            sweet_code = output.get_code();
            if (opt.end_with_newline) {
                sweet_code += '\n';
            }

            return sweet_code;
        };

        function handle_token(local_token) {
            var newlines = local_token.newlines;
            var keep_whitespace = opt.keep_array_indentation && is_array(flags.mode);

            if (keep_whitespace) {
                for (i = 0; i < newlines; i += 1) {
                    print_newline(i > 0);
                }
            } else {
                if (opt.max_preserve_newlines && newlines > opt.max_preserve_newlines) {
                    newlines = opt.max_preserve_newlines;
                }

                if (opt.preserve_newlines) {
                    if (local_token.newlines > 1) {
                        print_newline();
                        for (var i = 1; i < newlines; i += 1) {
                            print_newline(true);
                        }
                    }
                }
            }

            current_token = local_token;
            handlers[current_token.type]();
        }

        // we could use just string.split, but
        // IE doesn't like returning empty strings

        function split_newlines(s) {
            //return s.split(/\x0d\x0a|\x0a/);

            s = s.replace(/\x0d/g, '');
            var out = [],
                idx = s.indexOf("\n");
            while (idx !== -1) {
                out.push(s.substring(0, idx));
                s = s.substring(idx + 1);
                idx = s.indexOf("\n");
            }
            if (s.length) {
                out.push(s);
            }
            return out;
        }

        function allow_wrap_or_preserved_newline(force_linewrap) {
            force_linewrap = (force_linewrap === undefined) ? false : force_linewrap;

            if (output.just_added_newline()) {
                return
            }

            if ((opt.preserve_newlines && current_token.wanted_newline) || force_linewrap) {
                print_newline(false, true);
            } else if (opt.wrap_line_length) {
                // We never wrap the first token of a line due to newline check above.
                var proposed_line_length = output.current_line.get_character_count() + current_token.text.length +
                    (output.space_before_token ? 1 : 0);
                if (proposed_line_length >= opt.wrap_line_length) {
                    print_newline(false, true);
                }
            }
        }

        function print_newline(force_newline, preserve_statement_flags) {
            if (!preserve_statement_flags) {
                if (flags.last_text !== ';' && flags.last_text !== ',' && flags.last_text !== '=' && last_type !== 'TK_OPERATOR') {
                    while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
                        restore_mode();
                    }
                }
            }

            if (output.add_new_line(force_newline)) {
                flags.multiline_frame = true;
            }
        }

        function print_token_line_indentation() {
            if (output.just_added_newline()) {
                if (opt.keep_array_indentation && is_array(flags.mode) && current_token.wanted_newline) {
                    // prevent removing of this whitespace as redundant
                    output.current_line.push('');
                    for (var i = 0; i < current_token.whitespace_before.length; i += 1) {
                        output.current_line.push(current_token.whitespace_before[i]);
                    }
                    output.space_before_token = false;
                } else if (output.add_indent_string(flags.indentation_level)) {
                    flags.line_indent_level = flags.indentation_level;
                }
            }
        }

        function print_token(printable_token) {
            printable_token = printable_token || current_token.text;
            print_token_line_indentation();
            output.add_token(printable_token);
        }

        function indent() {
            flags.indentation_level += 1;
        }

        function deindent() {
            if (flags.indentation_level > 0 &&
                ((!flags.parent) || flags.indentation_level > flags.parent.indentation_level))
                flags.indentation_level -= 1;
        }

        function set_mode(mode) {
            if (flags) {
                flag_store.push(flags);
                previous_flags = flags;
            } else {
                previous_flags = create_flags(null, mode);
            }

            flags = create_flags(previous_flags, mode);
        }

        function is_array(mode) {
            return mode === MODE.ArrayLiteral;
        }

        function is_expression(mode) {
            return in_array(mode, [MODE.Expression, MODE.ForInitializer, MODE.Conditional]);
        }

        function restore_mode() {
            if (flag_store.length > 0) {
                previous_flags = flags;
                flags = flag_store.pop();
                if (previous_flags.mode === MODE.Statement) {
                    output.remove_redundant_indentation(previous_flags);
                }
            }
        }

        function start_of_object_property() {
            return flags.parent.mode === MODE.ObjectLiteral && flags.mode === MODE.Statement && (
                (flags.last_text === ':' && flags.ternary_depth === 0) || (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set'])));
        }

        function start_of_statement() {
            if (
                    (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const']) && current_token.type === 'TK_WORD') ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'do') ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'return' && !current_token.wanted_newline) ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'else' && !(current_token.type === 'TK_RESERVED' && current_token.text === 'if')) ||
                    (last_type === 'TK_END_EXPR' && (previous_flags.mode === MODE.ForInitializer || previous_flags.mode === MODE.Conditional)) ||
                    (last_type === 'TK_WORD' && flags.mode === MODE.BlockStatement
                        && !flags.in_case
                        && !(current_token.text === '--' || current_token.text === '++')
                        && current_token.type !== 'TK_WORD' && current_token.type !== 'TK_RESERVED') ||
                    (flags.mode === MODE.ObjectLiteral && (
                        (flags.last_text === ':' && flags.ternary_depth === 0) || (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set']))))
                ) {

                set_mode(MODE.Statement);
                indent();

                if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const']) && current_token.type === 'TK_WORD') {
                    flags.declaration_statement = true;
                }

                // Issue #276:
                // If starting a new statement with [if, for, while, do], push to a new line.
                // if (a) if (b) if(c) d(); else e(); else f();
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline(
                        current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['do', 'for', 'if', 'while']));
                }

                return true;
            }
            return false;
        }

        function all_lines_start_with(lines, c) {
            for (var i = 0; i < lines.length; i++) {
                var line = trim(lines[i]);
                if (line.charAt(0) !== c) {
                    return false;
                }
            }
            return true;
        }

        function each_line_matches_indent(lines, indent) {
            var i = 0,
                len = lines.length,
                line;
            for (; i < len; i++) {
                line = lines[i];
                // allow empty lines to pass through
                if (line && line.indexOf(indent) !== 0) {
                    return false;
                }
            }
            return true;
        }

        function is_special_word(word) {
            return in_array(word, ['case', 'return', 'do', 'if', 'throw', 'else']);
        }

        function get_token(offset) {
            var index = token_pos + (offset || 0);
            return (index < 0 || index >= tokens.length) ? null : tokens[index];
        }

        function handle_start_expr() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            var next_mode = MODE.Expression;
            if (current_token.text === '[') {

                if (last_type === 'TK_WORD' || flags.last_text === ')') {
                    // this is array index specifier, break immediately
                    // a[x], fn()[x]
                    if (last_type === 'TK_RESERVED' && in_array(flags.last_text, Tokenizer.line_starters)) {
                        output.space_before_token = true;
                    }
                    set_mode(next_mode);
                    print_token();
                    indent();
                    if (opt.space_in_paren) {
                        output.space_before_token = true;
                    }
                    return;
                }

                next_mode = MODE.ArrayLiteral;
                if (is_array(flags.mode)) {
                    if (flags.last_text === '[' ||
                        (flags.last_text === ',' && (last_last_text === ']' || last_last_text === '}'))) {
                        // ], [ goes to new line
                        // }, [ goes to new line
                        if (!opt.keep_array_indentation) {
                            print_newline();
                        }
                    }
                }

            } else {
                if (last_type === 'TK_RESERVED' && flags.last_text === 'for') {
                    next_mode = MODE.ForInitializer;
                } else if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['if', 'while'])) {
                    next_mode = MODE.Conditional;
                } else {
                    // next_mode = MODE.Expression;
                }
            }

            if (flags.last_text === ';' || last_type === 'TK_START_BLOCK') {
                print_newline();
            } else if (last_type === 'TK_END_EXPR' || last_type === 'TK_START_EXPR' || last_type === 'TK_END_BLOCK' || flags.last_text === '.') {
                // TODO: Consider whether forcing this is required.  Review failing tests when removed.
                allow_wrap_or_preserved_newline(current_token.wanted_newline);
                // do nothing on (( and )( and ][ and ]( and .(
            } else if (!(last_type === 'TK_RESERVED' && current_token.text === '(') && last_type !== 'TK_WORD' && last_type !== 'TK_OPERATOR') {
                output.space_before_token = true;
            } else if ((last_type === 'TK_RESERVED' && (flags.last_word === 'function' || flags.last_word === 'typeof')) ||
                (flags.last_text === '*' && last_last_text === 'function')) {
                // function() vs function ()
                if (opt.space_after_anon_function) {
                    output.space_before_token = true;
                }
            } else if (last_type === 'TK_RESERVED' && (in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === 'catch')) {
                if (opt.space_before_conditional) {
                    output.space_before_token = true;
                }
            }

            // Support of this kind of newline preservation.
            // a = (b &&
            //     (c || d));
            if (current_token.text === '(') {
                if (last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                    if (!start_of_object_property()) {
                        allow_wrap_or_preserved_newline();
                    }
                }
            }

            set_mode(next_mode);
            print_token();
            if (opt.space_in_paren) {
                output.space_before_token = true;
            }

            // In all cases, if we newline while inside an expression it should be indented.
            indent();
        }

        function handle_end_expr() {
            // statements inside expressions are not valid syntax, but...
            // statements must all be closed when their container closes
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }

            if (flags.multiline_frame) {
                allow_wrap_or_preserved_newline(current_token.text === ']' && is_array(flags.mode) && !opt.keep_array_indentation);
            }

            if (opt.space_in_paren) {
                if (last_type === 'TK_START_EXPR' && ! opt.space_in_empty_paren) {
                    // () [] no inner space in empty parens like these, ever, ref #320
                    output.trim();
                    output.space_before_token = false;
                } else {
                    output.space_before_token = true;
                }
            }
            if (current_token.text === ']' && opt.keep_array_indentation) {
                print_token();
                restore_mode();
            } else {
                restore_mode();
                print_token();
            }
            output.remove_redundant_indentation(previous_flags);

            // do {} while () // no statement required after
            if (flags.do_while && previous_flags.mode === MODE.Conditional) {
                previous_flags.mode = MODE.Expression;
                flags.do_block = false;
                flags.do_while = false;

            }
        }

        function handle_start_block() {
            // Check if this is should be treated as a ObjectLiteral
            var next_token = get_token(1)
            var second_token = get_token(2)
            if (second_token && (
                    (second_token.text === ':' && in_array(next_token.type, ['TK_STRING', 'TK_WORD', 'TK_RESERVED']))
                    || (in_array(next_token.text, ['get', 'set']) && in_array(second_token.type, ['TK_WORD', 'TK_RESERVED']))
                )) {
                // We don't support TypeScript,but we didn't break it for a very long time.
                // We'll try to keep not breaking it.
                if (!in_array(last_last_text, ['class','interface'])) {
                    set_mode(MODE.ObjectLiteral);
                } else {
                    set_mode(MODE.BlockStatement);
                }
            } else {
                set_mode(MODE.BlockStatement);
            }

            var empty_braces = !next_token.comments_before.length &&  next_token.text === '}';
            var empty_anonymous_function = empty_braces && flags.last_word === 'function' &&
                last_type === 'TK_END_EXPR';

            if (opt.brace_style === "expand") {
                if (last_type !== 'TK_OPERATOR' &&
                    (empty_anonymous_function ||
                        last_type === 'TK_EQUALS' ||
                        (last_type === 'TK_RESERVED' && is_special_word(flags.last_text) && flags.last_text !== 'else'))) {
                    output.space_before_token = true;
                } else {
                    print_newline(false, true);
                }
            } else { // collapse
                if (last_type !== 'TK_OPERATOR' && last_type !== 'TK_START_EXPR') {
                    if (last_type === 'TK_START_BLOCK') {
                        print_newline();
                    } else {
                        output.space_before_token = true;
                    }
                } else {
                    // if TK_OPERATOR or TK_START_EXPR
                    if (is_array(previous_flags.mode) && flags.last_text === ',') {
                        if (last_last_text === '}') {
                            // }, { in array context
                            output.space_before_token = true;
                        } else {
                            print_newline(); // [a, b, c, {
                        }
                    }
                }
            }
            print_token();
            indent();
        }

        function handle_end_block() {
            // statements must all be closed when their container closes
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }
            var empty_braces = last_type === 'TK_START_BLOCK';

            if (opt.brace_style === "expand") {
                if (!empty_braces) {
                    print_newline();
                }
            } else {
                // skip {}
                if (!empty_braces) {
                    if (is_array(flags.mode) && opt.keep_array_indentation) {
                        // we REALLY need a newline here, but newliner would skip that
                        opt.keep_array_indentation = false;
                        print_newline();
                        opt.keep_array_indentation = true;

                    } else {
                        print_newline();
                    }
                }
            }
            restore_mode();
            print_token();
        }

        function handle_word() {
            if (current_token.type === 'TK_RESERVED' && flags.mode !== MODE.ObjectLiteral &&
                in_array(current_token.text, ['set', 'get'])) {
                current_token.type = 'TK_WORD';
            }

            if (current_token.type === 'TK_RESERVED' && flags.mode === MODE.ObjectLiteral) {
                var next_token = get_token(1);
                if (next_token.text == ':') {
                    current_token.type = 'TK_WORD';
                }
            }

            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            } else if (current_token.wanted_newline && !is_expression(flags.mode) &&
                (last_type !== 'TK_OPERATOR' || (flags.last_text === '--' || flags.last_text === '++')) &&
                last_type !== 'TK_EQUALS' &&
                (opt.preserve_newlines || !(last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const', 'set', 'get'])))) {

                print_newline();
            }

            if (flags.do_block && !flags.do_while) {
                if (current_token.type === 'TK_RESERVED' && current_token.text === 'while') {
                    // do {} ## while ()
                    output.space_before_token = true;
                    print_token();
                    output.space_before_token = true;
                    flags.do_while = true;
                    return;
                } else {
                    // do {} should always have while as the next word.
                    // if we don't see the expected while, recover
                    print_newline();
                    flags.do_block = false;
                }
            }

            // if may be followed by else, or not
            // Bare/inline ifs are tricky
            // Need to unwind the modes correctly: if (a) if (b) c(); else d(); else e();
            if (flags.if_block) {
                if (!flags.else_block && (current_token.type === 'TK_RESERVED' && current_token.text === 'else')) {
                    flags.else_block = true;
                } else {
                    while (flags.mode === MODE.Statement) {
                        restore_mode();
                    }
                    flags.if_block = false;
                    flags.else_block = false;
                }
            }

            if (current_token.type === 'TK_RESERVED' && (current_token.text === 'case' || (current_token.text === 'default' && flags.in_case_statement))) {
                print_newline();
                if (flags.case_body || opt.jslint_happy) {
                    // switch cases following one another
                    deindent();
                    flags.case_body = false;
                }
                print_token();
                flags.in_case = true;
                flags.in_case_statement = true;
                return;
            }

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'function') {
                if (in_array(flags.last_text, ['}', ';']) || (output.just_added_newline() && ! in_array(flags.last_text, ['[', '{', ':', '=', ',']))) {
                    // make sure there is a nice clean space of at least one blank line
                    // before a new function definition
                    if ( !output.just_added_blankline() && !current_token.comments_before.length) {
                        print_newline();
                        print_newline(true);
                    }
                }
                if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD') {
                    if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set', 'new', 'return', 'export'])) {
                        output.space_before_token = true;
                    } else if (last_type === 'TK_RESERVED' && flags.last_text === 'default' && last_last_text === 'export') {
                        output.space_before_token = true;
                    } else {
                        print_newline();
                    }
                } else if (last_type === 'TK_OPERATOR' || flags.last_text === '=') {
                    // foo = function
                    output.space_before_token = true;
                } else if (!flags.multiline_frame && (is_expression(flags.mode) || is_array(flags.mode))) {
                    // (function
                } else {
                    print_newline();
                }
            }

            if (last_type === 'TK_COMMA' || last_type === 'TK_START_EXPR' || last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline();
                }
            }

            if (current_token.type === 'TK_RESERVED' &&  in_array(current_token.text, ['function', 'get', 'set'])) {
                print_token();
                flags.last_word = current_token.text;
                return;
            }

            prefix = 'NONE';

            if (last_type === 'TK_END_BLOCK') {
                if (!(current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['else', 'catch', 'finally']))) {
                    prefix = 'NEWLINE';
                } else {
                    if (opt.brace_style === "expand" || opt.brace_style === "end-expand") {
                        prefix = 'NEWLINE';
                    } else {
                        prefix = 'SPACE';
                        output.space_before_token = true;
                    }
                }
            } else if (last_type === 'TK_SEMICOLON' && flags.mode === MODE.BlockStatement) {
                // TODO: Should this be for STATEMENT as well?
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_SEMICOLON' && is_expression(flags.mode)) {
                prefix = 'SPACE';
            } else if (last_type === 'TK_STRING') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD' ||
                (flags.last_text === '*' && last_last_text === 'function')) {
                prefix = 'SPACE';
            } else if (last_type === 'TK_START_BLOCK') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_END_EXPR') {
                output.space_before_token = true;
                prefix = 'NEWLINE';
            }

            if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ')') {
                if (flags.last_text === 'else' || flags.last_text === 'export') {
                    prefix = 'SPACE';
                } else {
                    prefix = 'NEWLINE';
                }

            }

            if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['else', 'catch', 'finally'])) {
                if (last_type !== 'TK_END_BLOCK' || opt.brace_style === "expand" || opt.brace_style === "end-expand") {
                    print_newline();
                } else {
                    output.trim(true);
                    var line = output.current_line;
                    // If we trimmed and there's something other than a close block before us
                    // put a newline back in.  Handles '} // comment' scenario.
                    if (line.last() !== '}') {
                        print_newline();
                    }
                    output.space_before_token = true;
                }
            } else if (prefix === 'NEWLINE') {
                if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                    // no newline between 'return nnn'
                    output.space_before_token = true;
                } else if (last_type !== 'TK_END_EXPR') {
                    if ((last_type !== 'TK_START_EXPR' || !(current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['var', 'let', 'const']))) && flags.last_text !== ':') {
                        // no need to force newline on 'var': for (var x = 0...)
                        if (current_token.type === 'TK_RESERVED' && current_token.text === 'if' && flags.last_text === 'else') {
                            // no newline for } else if {
                            output.space_before_token = true;
                        } else {
                            print_newline();
                        }
                    }
                } else if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ')') {
                    print_newline();
                }
            } else if (flags.multiline_frame && is_array(flags.mode) && flags.last_text === ',' && last_last_text === '}') {
                print_newline(); // }, in lists get a newline treatment
            } else if (prefix === 'SPACE') {
                output.space_before_token = true;
            }
            print_token();
            flags.last_word = current_token.text;

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'do') {
                flags.do_block = true;
            }

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'if') {
                flags.if_block = true;
            }
        }

        function handle_semicolon() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
                // Semicolon can be the start (and end) of a statement
                output.space_before_token = false;
            }
            while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
                restore_mode();
            }
            print_token();
        }

        function handle_string() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
                // One difference - strings want at least a space before
                output.space_before_token = true;
            } else if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD') {
                output.space_before_token = true;
            } else if (last_type === 'TK_COMMA' || last_type === 'TK_START_EXPR' || last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline();
                }
            } else {
                print_newline();
            }
            print_token();
        }

        function handle_equals() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (flags.declaration_statement) {
                // just got an '=' in a var-line, different formatting/line-breaking, etc will now be done
                flags.declaration_assignment = true;
            }
            output.space_before_token = true;
            print_token();
            output.space_before_token = true;
        }

        function handle_comma() {
            if (flags.declaration_statement) {
                if (is_expression(flags.parent.mode)) {
                    // do not break on comma, for(var a = 1, b = 2)
                    flags.declaration_assignment = false;
                }

                print_token();

                if (flags.declaration_assignment) {
                    flags.declaration_assignment = false;
                    print_newline(false, true);
                } else {
                    output.space_before_token = true;
                }
                return;
            }

            print_token();
            if (flags.mode === MODE.ObjectLiteral ||
                (flags.mode === MODE.Statement && flags.parent.mode === MODE.ObjectLiteral)) {
                if (flags.mode === MODE.Statement) {
                    restore_mode();
                }
                print_newline();
            } else {
                // EXPR or DO_BLOCK
                output.space_before_token = true;
            }

        }

        function handle_operator() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                // "return" had a special handling in TK_WORD. Now we need to return the favor
                output.space_before_token = true;
                print_token();
                return;
            }

            // hack for actionscript's import .*;
            if (current_token.text === '*' && last_type === 'TK_DOT') {
                print_token();
                return;
            }

            if (current_token.text === ':' && flags.in_case) {
                flags.case_body = true;
                indent();
                print_token();
                print_newline();
                flags.in_case = false;
                return;
            }

            if (current_token.text === '::') {
                // no spaces around exotic namespacing syntax operator
                print_token();
                return;
            }

            // http://www.ecma-international.org/ecma-262/5.1/#sec-7.9.1
            // if there is a newline between -- or ++ and anything else we should preserve it.
            if (current_token.wanted_newline && (current_token.text === '--' || current_token.text === '++')) {
                print_newline(false, true);
            }

            // Allow line wrapping between operators
            if (last_type === 'TK_OPERATOR') {
                allow_wrap_or_preserved_newline();
            }

            var space_before = true;
            var space_after = true;

            if (in_array(current_token.text, ['--', '++', '!', '~']) || (in_array(current_token.text, ['-', '+']) && (in_array(last_type, ['TK_START_BLOCK', 'TK_START_EXPR', 'TK_EQUALS', 'TK_OPERATOR']) || in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === ','))) {
                // unary operators (and binary +/- pretending to be unary) special cases

                space_before = false;
                space_after = false;

                if (flags.last_text === ';' && is_expression(flags.mode)) {
                    // for (;; ++i)
                    //        ^^^
                    space_before = true;
                }

                if (last_type === 'TK_RESERVED' || last_type === 'TK_END_EXPR') {
                    space_before = true;
                } else if (last_type === 'TK_OPERATOR') {
                    space_before =
                        (in_array(current_token.text, ['--', '-']) && in_array(flags.last_text, ['--', '-'])) ||
                        (in_array(current_token.text, ['++', '+']) && in_array(flags.last_text, ['++', '+']));
                }

                if ((flags.mode === MODE.BlockStatement || flags.mode === MODE.Statement) && (flags.last_text === '{' || flags.last_text === ';')) {
                    // { foo; --i }
                    // foo(); --bar;
                    print_newline();
                }
            } else if (current_token.text === ':') {
                if (flags.ternary_depth === 0) {
                    // Colon is invalid javascript outside of ternary and object, but do our best to guess what was meant.
                    space_before = false;
                } else {
                    flags.ternary_depth -= 1;
                }
            } else if (current_token.text === '?') {
                flags.ternary_depth += 1;
            } else if (current_token.text === '*' && last_type === 'TK_RESERVED' && flags.last_text === 'function') {
                space_before = false;
                space_after = false;
            }
            output.space_before_token = output.space_before_token || space_before;
            print_token();
            output.space_before_token = space_after;
        }

        function handle_block_comment() {
            var lines = split_newlines(current_token.text);
            var j; // iterator for this case
            var javadoc = false;
            var starless = false;
            var lastIndent = current_token.whitespace_before.join('');
            var lastIndentLength = lastIndent.length;

            // block comment starts with a new line
            print_newline(false, true);
            if (lines.length > 1) {
                if (all_lines_start_with(lines.slice(1), '*')) {
                    javadoc = true;
                }
                else if (each_line_matches_indent(lines.slice(1), lastIndent)) {
                    starless = true;
                }
            }

            // first line always indented
            print_token(lines[0]);
            for (j = 1; j < lines.length; j++) {
                print_newline(false, true);
                if (javadoc) {
                    // javadoc: reformat and re-indent
                    print_token(' ' + trim(lines[j]));
                } else if (starless && lines[j].length > lastIndentLength) {
                    // starless: re-indent non-empty content, avoiding trim
                    print_token(lines[j].substring(lastIndentLength));
                } else {
                    // normal comments output raw
                    output.add_token(lines[j]);
                }
            }

            // for comments of more than one line, make sure there's a new line after
            print_newline(false, true);
        }

        function handle_inline_comment() {
            output.space_before_token = true;
            print_token();
            output.space_before_token = true;
        }

        function handle_comment() {
            if (current_token.wanted_newline) {
                print_newline(false, true);
            } else {
                output.trim(true);
            }

            output.space_before_token = true;
            print_token();
            print_newline(false, true);
        }

        function handle_dot() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                output.space_before_token = true;
            } else {
                // allow preserved newlines before dots in general
                // force newlines on dots after close paren when break_chained - for bar().baz()
                allow_wrap_or_preserved_newline(flags.last_text === ')' && opt.break_chained_methods);
            }

            print_token();
        }

        function handle_unknown() {
            print_token();

            if (current_token.text[current_token.text.length - 1] === '\n') {
                print_newline();
            }
        }

        function handle_eof() {
            // Unwind any open statements
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }
        }
    }

    function OutputLine() {
        var character_count = 0;
        var line_items = [];

        this.get_character_count = function() {
            return character_count;
        }

        this.get_item_count = function() {
            return line_items.length;
        }

        this.get_output = function() {
            return line_items.join('');
        }

        this.last = function() {
            if (line_items.length) {
              return line_items[line_items.length - 1];
            } else {
              return null;
            }
        }

        this.push = function(input) {
            line_items.push(input);
            character_count += input.length;
        }

        this.remove_indent = function(indent_string, baseIndentString) {
            var splice_index = 0;

            // skip empty lines
            if (line_items.length === 0) {
                return;
            }

            // skip the preindent string if present
            if (baseIndentString && line_items[0] === baseIndentString) {
                splice_index = 1;
            }

            // remove one indent, if present
            if (line_items[splice_index] === indent_string) {
                character_count -= line_items[splice_index].length;
                line_items.splice(splice_index, 1);
            }
        }

        this.trim = function(indent_string, baseIndentString) {
            while (this.get_item_count() &&
                (this.last() === ' ' ||
                    this.last() === indent_string ||
                    this.last() === baseIndentString)) {
                var item = line_items.pop();
                character_count -= item.length;
            }
        }
    }

    function Output(indent_string, baseIndentString) {
        var lines =[];
        this.baseIndentString = baseIndentString;
        this.current_line = null;
        this.space_before_token = false;

        this.get_line_number = function() {
            return lines.length;
        }

        // Using object instead of string to allow for later expansion of info about each line
        this.add_new_line = function(force_newline) {
            if (this.get_line_number() === 1 && this.just_added_newline()) {
                return false; // no newline on start of file
            }

            if (force_newline || !this.just_added_newline()) {
                this.current_line = new OutputLine();
                lines.push(this.current_line);
                return true;
            }

            return false;
        }

        // initialize
        this.add_new_line(true);

        this.get_code = function() {
            var sweet_code = lines[0].get_output();
            for (var line_index = 1; line_index < lines.length; line_index++) {
                sweet_code += '\n' + lines[line_index].get_output();
            }
            sweet_code = sweet_code.replace(/[\r\n\t ]+$/, '');
            return sweet_code;
        }

        this.add_indent_string = function(indentation_level) {
            if (baseIndentString) {
                this.current_line.push(baseIndentString);
            }

            // Never indent your first output indent at the start of the file
            if (lines.length > 1) {
                for (var i = 0; i < indentation_level; i += 1) {
                    this.current_line.push(indent_string);
                }
                return true;
            }
            return false;
        }

        this.add_token = function(printable_token) {
            this.add_space_before_token();
            this.current_line.push(printable_token);
        }

        this.add_space_before_token = function() {
            if (this.space_before_token && this.current_line.get_item_count()) {
                var last_output = this.current_line.last();
                if (last_output !== ' ' && last_output !== indent_string && last_output !== baseIndentString) { // prevent occassional duplicate space
                    this.current_line.push(' ');
                }
            }
            this.space_before_token = false;
        }

        this.remove_redundant_indentation = function (frame) {
            // This implementation is effective but has some issues:
            //     - less than great performance due to array splicing
            //     - can cause line wrap to happen too soon due to indent removal
            //           after wrap points are calculated
            // These issues are minor compared to ugly indentation.

            if (frame.multiline_frame ||
                frame.mode === MODE.ForInitializer ||
                frame.mode === MODE.Conditional) {
                return;
            }

            // remove one indent from each line inside this section
            var index = frame.start_line_index;
            var line;

            var output_length = lines.length;
            while (index < output_length) {
                lines[index].remove_indent(indent_string, baseIndentString);
                index++;
            }
        }

        this.trim = function(eat_newlines) {
            eat_newlines = (eat_newlines === undefined) ? false : eat_newlines;

            this.current_line.trim(indent_string, baseIndentString);

            while (eat_newlines && lines.length > 1 &&
                this.current_line.get_item_count() === 0) {
                lines.pop();
                this.current_line = lines[lines.length - 1]
                this.current_line.trim(indent_string, baseIndentString);
            }
        }

        this.just_added_newline = function() {
            return this.current_line.get_item_count() === 0;
        }

        this.just_added_blankline = function() {
            if (this.just_added_newline()) {
                if (lines.length === 1) {
                    return true; // start of the file and newline = blank
                }

                var line = lines[lines.length - 2];
                return line.get_item_count() === 0;
            }
            return false;
        }
    }


    var Token = function(type, text, newlines, whitespace_before, mode, parent) {
        this.type = type;
        this.text = text;
        this.comments_before = [];
        this.newlines = newlines || 0;
        this.wanted_newline = newlines > 0;
        this.whitespace_before = whitespace_before || [];
        this.parent = null;
    }

    function tokenizer(input, opts, indent_string) {

        var whitespace = "\n\r\t ".split('');
        var digit = /[0-9]/;

        var punct = ('+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! ~ , : ? ^ ^= |= :: =>'
                +' <%= <% %> <?= <? ?>').split(' '); // try to be a good boy and try not to break the markup language identifiers

        // words which should always start on new line.
        this.line_starters = 'continue,try,throw,return,var,let,const,if,switch,case,default,for,while,break,function,yield,import,export'.split(',');
        var reserved_words = this.line_starters.concat(['do', 'in', 'else', 'get', 'set', 'new', 'catch', 'finally', 'typeof']);

        var n_newlines, whitespace_before_token, in_html_comment, tokens, parser_pos;
        var input_length;

        this.tokenize = function() {
            // cache the source's length.
            input_length = input.length
            parser_pos = 0;
            in_html_comment = false
            tokens = [];

            var next, last;
            var token_values;
            var open = null;
            var open_stack = [];
            var comments = [];

            while (!(last && last.type === 'TK_EOF')) {
                token_values = tokenize_next();
                next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
                while(next.type === 'TK_INLINE_COMMENT' || next.type === 'TK_COMMENT' ||
                    next.type === 'TK_BLOCK_COMMENT' || next.type === 'TK_UNKNOWN') {
                    comments.push(next);
                    token_values = tokenize_next();
                    next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
                }

                if (comments.length) {
                    next.comments_before = comments;
                    comments = [];
                }

                if (next.type === 'TK_START_BLOCK' || next.type === 'TK_START_EXPR') {
                    next.parent = last;
                    open = next;
                    open_stack.push(next);
                }  else if ((next.type === 'TK_END_BLOCK' || next.type === 'TK_END_EXPR') &&
                    (open && (
                        (next.text === ']' && open.text === '[') ||
                        (next.text === ')' && open.text === '(') ||
                        (next.text === '}' && open.text === '}')))) {
                    next.parent = open.parent;
                    open = open_stack.pop();
                }

                tokens.push(next);
                last = next;
            }

            return tokens;
        }

        function tokenize_next() {
            var i, resulting_string;

            n_newlines = 0;
            whitespace_before_token = [];

            if (parser_pos >= input_length) {
                return ['', 'TK_EOF'];
            }

            var last_token;
            if (tokens.length) {
                last_token = tokens[tokens.length-1];
            } else {
                // For the sake of tokenizing we can pretend that there was on open brace to start
                last_token = new Token('TK_START_BLOCK', '{');
            }


            var c = input.charAt(parser_pos);
            parser_pos += 1;

            while (in_array(c, whitespace)) {

                if (c === '\n') {
                    n_newlines += 1;
                    whitespace_before_token = [];
                } else if (n_newlines) {
                    if (c === indent_string) {
                        whitespace_before_token.push(indent_string);
                    } else if (c !== '\r') {
                        whitespace_before_token.push(' ');
                    }
                }

                if (parser_pos >= input_length) {
                    return ['', 'TK_EOF'];
                }

                c = input.charAt(parser_pos);
                parser_pos += 1;
            }

            if (digit.test(c)) {
                var allow_decimal = true;
                var allow_e = true;
                var local_digit = digit;

                if (c === '0' && parser_pos < input_length && /[Xx]/.test(input.charAt(parser_pos))) {
                    // switch to hex number, no decimal or e, just hex digits
                    allow_decimal = false;
                    allow_e = false;
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    local_digit = /[0123456789abcdefABCDEF]/
                } else {
                    // we know this first loop will run.  It keeps the logic simpler.
                    c = '';
                    parser_pos -= 1
                }

                // Add the digits
                while (parser_pos < input_length && local_digit.test(input.charAt(parser_pos))) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;

                    if (allow_decimal && parser_pos < input_length && input.charAt(parser_pos) === '.') {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;
                        allow_decimal = false;
                    }

                    if (allow_e && parser_pos < input_length && /[Ee]/.test(input.charAt(parser_pos))) {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;

                        if (parser_pos < input_length && /[+-]/.test(input.charAt(parser_pos))) {
                            c += input.charAt(parser_pos);
                            parser_pos += 1;
                        }

                        allow_e = false;
                        allow_decimal = false;
                    }
                }

                return [c, 'TK_WORD'];
            }

            if (acorn.isIdentifierStart(input.charCodeAt(parser_pos-1))) {
                if (parser_pos < input_length) {
                    while (acorn.isIdentifierChar(input.charCodeAt(parser_pos))) {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos === input_length) {
                            break;
                        }
                    }
                }

                if (!(last_token.type === 'TK_DOT' ||
                        (last_token.type === 'TK_RESERVED' && in_array(last_token.text, ['set', 'get'])))
                    && in_array(c, reserved_words)) {
                    if (c === 'in') { // hack for 'in' operator
                        return [c, 'TK_OPERATOR'];
                    }
                    return [c, 'TK_RESERVED'];
                }

                return [c, 'TK_WORD'];
            }

            if (c === '(' || c === '[') {
                return [c, 'TK_START_EXPR'];
            }

            if (c === ')' || c === ']') {
                return [c, 'TK_END_EXPR'];
            }

            if (c === '{') {
                return [c, 'TK_START_BLOCK'];
            }

            if (c === '}') {
                return [c, 'TK_END_BLOCK'];
            }

            if (c === ';') {
                return [c, 'TK_SEMICOLON'];
            }

            if (c === '/') {
                var comment = '';
                // peek for comment /* ... */
                var inline_comment = true;
                if (input.charAt(parser_pos) === '*') {
                    parser_pos += 1;
                    if (parser_pos < input_length) {
                        while (parser_pos < input_length && !(input.charAt(parser_pos) === '*' && input.charAt(parser_pos + 1) && input.charAt(parser_pos + 1) === '/')) {
                            c = input.charAt(parser_pos);
                            comment += c;
                            if (c === "\n" || c === "\r") {
                                inline_comment = false;
                            }
                            parser_pos += 1;
                            if (parser_pos >= input_length) {
                                break;
                            }
                        }
                    }
                    parser_pos += 2;
                    if (inline_comment && n_newlines === 0) {
                        return ['/*' + comment + '*/', 'TK_INLINE_COMMENT'];
                    } else {
                        return ['/*' + comment + '*/', 'TK_BLOCK_COMMENT'];
                    }
                }
                // peek for comment // ...
                if (input.charAt(parser_pos) === '/') {
                    comment = c;
                    while (input.charAt(parser_pos) !== '\r' && input.charAt(parser_pos) !== '\n') {
                        comment += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos >= input_length) {
                            break;
                        }
                    }
                    return [comment, 'TK_COMMENT'];
                }

            }

            if (c === '`' || c === "'" || c === '"' || // string
                (
                    (c === '/') || // regexp
                    (opts.e4x && c === "<" && input.slice(parser_pos - 1).match(/^<([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])\s*([-a-zA-Z:0-9_.]+=('[^']*'|"[^"]*"|{[^{}]*})\s*)*\/?\s*>/)) // xml
                ) && ( // regex and xml can only appear in specific locations during parsing
                    (last_token.type === 'TK_RESERVED' && in_array(last_token.text , ['return', 'case', 'throw', 'else', 'do', 'typeof', 'yield'])) ||
                    (last_token.type === 'TK_END_EXPR' && last_token.text === ')' &&
                        last_token.parent && last_token.parent.type === 'TK_RESERVED' && in_array(last_token.parent.text, ['if', 'while', 'for'])) ||
                    (in_array(last_token.type, ['TK_COMMENT', 'TK_START_EXPR', 'TK_START_BLOCK',
                        'TK_END_BLOCK', 'TK_OPERATOR', 'TK_EQUALS', 'TK_EOF', 'TK_SEMICOLON', 'TK_COMMA'
                    ]))
                )) {

                var sep = c,
                    esc = false,
                    has_char_escapes = false;

                resulting_string = c;

                if (sep === '/') {
                    //
                    // handle regexp
                    //
                    var in_char_class = false;
                    while (parser_pos < input_length &&
                            ((esc || in_char_class || input.charAt(parser_pos) !== sep) &&
                            !acorn.newline.test(input.charAt(parser_pos)))) {
                        resulting_string += input.charAt(parser_pos);
                        if (!esc) {
                            esc = input.charAt(parser_pos) === '\\';
                            if (input.charAt(parser_pos) === '[') {
                                in_char_class = true;
                            } else if (input.charAt(parser_pos) === ']') {
                                in_char_class = false;
                            }
                        } else {
                            esc = false;
                        }
                        parser_pos += 1;
                    }
                } else if (opts.e4x && sep === '<') {
                    //
                    // handle e4x xml literals
                    //
                    var xmlRegExp = /<(\/?)([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])\s*([-a-zA-Z:0-9_.]+=('[^']*'|"[^"]*"|{[^{}]*})\s*)*(\/?)\s*>/g;
                    var xmlStr = input.slice(parser_pos - 1);
                    var match = xmlRegExp.exec(xmlStr);
                    if (match && match.index === 0) {
                        var rootTag = match[2];
                        var depth = 0;
                        while (match) {
                            var isEndTag = !! match[1];
                            var tagName = match[2];
                            var isSingletonTag = ( !! match[match.length - 1]) || (tagName.slice(0, 8) === "![CDATA[");
                            if (tagName === rootTag && !isSingletonTag) {
                                if (isEndTag) {
                                    --depth;
                                } else {
                                    ++depth;
                                }
                            }
                            if (depth <= 0) {
                                break;
                            }
                            match = xmlRegExp.exec(xmlStr);
                        }
                        var xmlLength = match ? match.index + match[0].length : xmlStr.length;
                        parser_pos += xmlLength - 1;
                        return [xmlStr.slice(0, xmlLength), "TK_STRING"];
                    }
                } else {
                    //
                    // handle string
                    //
                    // Template strings can travers lines without escape characters.
                    // Other strings cannot
                    while (parser_pos < input_length &&
                            (esc || (input.charAt(parser_pos) !== sep &&
                            (sep === '`' || !acorn.newline.test(input.charAt(parser_pos)))))) {
                        resulting_string += input.charAt(parser_pos);
                        if (esc) {
                            if (input.charAt(parser_pos) === 'x' || input.charAt(parser_pos) === 'u') {
                                has_char_escapes = true;
                            }
                            esc = false;
                        } else {
                            esc = input.charAt(parser_pos) === '\\';
                        }
                        parser_pos += 1;
                    }

                }

                if (has_char_escapes && opts.unescape_strings) {
                    resulting_string = unescape_string(resulting_string);
                }

                if (parser_pos < input_length && input.charAt(parser_pos) === sep) {
                    resulting_string += sep;
                    parser_pos += 1;

                    if (sep === '/') {
                        // regexps may have modifiers /regexp/MOD , so fetch those, too
                        // Only [gim] are valid, but if the user puts in garbage, do what we can to take it.
                        while (parser_pos < input_length && acorn.isIdentifierStart(input.charCodeAt(parser_pos))) {
                            resulting_string += input.charAt(parser_pos);
                            parser_pos += 1;
                        }
                    }
                }
                return [resulting_string, 'TK_STRING'];
            }

            if (c === '#') {

                if (tokens.length === 0 && input.charAt(parser_pos) === '!') {
                    // shebang
                    resulting_string = c;
                    while (parser_pos < input_length && c !== '\n') {
                        c = input.charAt(parser_pos);
                        resulting_string += c;
                        parser_pos += 1;
                    }
                    return [trim(resulting_string) + '\n', 'TK_UNKNOWN'];
                }



                // Spidermonkey-specific sharp variables for circular references
                // https://developer.mozilla.org/En/Sharp_variables_in_JavaScript
                // http://mxr.mozilla.org/mozilla-central/source/js/src/jsscan.cpp around line 1935
                var sharp = '#';
                if (parser_pos < input_length && digit.test(input.charAt(parser_pos))) {
                    do {
                        c = input.charAt(parser_pos);
                        sharp += c;
                        parser_pos += 1;
                    } while (parser_pos < input_length && c !== '#' && c !== '=');
                    if (c === '#') {
                        //
                    } else if (input.charAt(parser_pos) === '[' && input.charAt(parser_pos + 1) === ']') {
                        sharp += '[]';
                        parser_pos += 2;
                    } else if (input.charAt(parser_pos) === '{' && input.charAt(parser_pos + 1) === '}') {
                        sharp += '{}';
                        parser_pos += 2;
                    }
                    return [sharp, 'TK_WORD'];
                }
            }

            if (c === '<' && input.substring(parser_pos - 1, parser_pos + 3) === '<!--') {
                parser_pos += 3;
                c = '<!--';
                while (input.charAt(parser_pos) !== '\n' && parser_pos < input_length) {
                    c += input.charAt(parser_pos);
                    parser_pos++;
                }
                in_html_comment = true;
                return [c, 'TK_COMMENT'];
            }

            if (c === '-' && in_html_comment && input.substring(parser_pos - 1, parser_pos + 2) === '-->') {
                in_html_comment = false;
                parser_pos += 2;
                return ['-->', 'TK_COMMENT'];
            }

            if (c === '.') {
                return [c, 'TK_DOT'];
            }

            if (in_array(c, punct)) {
                while (parser_pos < input_length && in_array(c + input.charAt(parser_pos), punct)) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    if (parser_pos >= input_length) {
                        break;
                    }
                }

                if (c === ',') {
                    return [c, 'TK_COMMA'];
                } else if (c === '=') {
                    return [c, 'TK_EQUALS'];
                } else {
                    return [c, 'TK_OPERATOR'];
                }
            }

            return [c, 'TK_UNKNOWN'];
        }


        function unescape_string(s) {
            var esc = false,
                out = '',
                pos = 0,
                s_hex = '',
                escaped = 0,
                c;

            while (esc || pos < s.length) {

                c = s.charAt(pos);
                pos++;

                if (esc) {
                    esc = false;
                    if (c === 'x') {
                        // simple hex-escape \x24
                        s_hex = s.substr(pos, 2);
                        pos += 2;
                    } else if (c === 'u') {
                        // unicode-escape, \u2134
                        s_hex = s.substr(pos, 4);
                        pos += 4;
                    } else {
                        // some common escape, e.g \n
                        out += '\\' + c;
                        continue;
                    }
                    if (!s_hex.match(/^[0123456789abcdefABCDEF]+$/)) {
                        // some weird escaping, bail out,
                        // leaving whole string intact
                        return s;
                    }

                    escaped = parseInt(s_hex, 16);

                    if (escaped >= 0x00 && escaped < 0x20) {
                        // leave 0x00...0x1f escaped
                        if (c === 'x') {
                            out += '\\x' + s_hex;
                        } else {
                            out += '\\u' + s_hex;
                        }
                        continue;
                    } else if (escaped === 0x22 || escaped === 0x27 || escaped === 0x5c) {
                        // single-quote, apostrophe, backslash - escape these
                        out += '\\' + String.fromCharCode(escaped);
                    } else if (c === 'x' && escaped > 0x7e && escaped <= 0xff) {
                        // we bail out on \x7f..\xff,
                        // leaving whole string escaped,
                        // as it's probably completely binary
                        return s;
                    } else {
                        out += String.fromCharCode(escaped);
                    }
                } else if (c === '\\') {
                    esc = true;
                } else {
                    out += c;
                }
            }
            return out;
        }

    }


    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define([], function() {
            return { js_beautify: js_beautify };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var js_beautify = require("beautify").js_beautify`.
        exports.js_beautify = js_beautify;
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.js_beautify = js_beautify;
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.js_beautify = js_beautify;
    }

}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
"use strict";

module.exports.pretty = function (jsObject, indentLength, outputTo, fullFunction) {
    var indentString,
        newLine,
        newLineJoin,
        TOSTRING,
        TYPES,
        valueType,
        repeatString,
        prettyObject,
        prettyObjectJSON,
        prettyObjectPrint,
        prettyArray,
        functionSignature,
        pretty,
        visited;

    TOSTRING = Object.prototype.toString;

    TYPES = {
        'undefined'        : 'undefined',
        'number'           : 'number',
        'boolean'          : 'boolean',
        'string'           : 'string',
        '[object Function]': 'function',
        '[object RegExp]'  : 'regexp',
        '[object Array]'   : 'array',
        '[object Date]'    : 'date',
        '[object Error]'   : 'error'
    };

    valueType = function (o) {
        var type = TYPES[typeof o] || TYPES[TOSTRING.call(o)] || (o ? 'object' : 'null');
        return type;
    };

    repeatString = function (src, length) {
        var dst = '',
            index;
        for (index = 0; index < length; index += 1) {
            dst += src;
        }

        return dst;
    };

    prettyObjectJSON = function (object, indent) {
        var value = [],
            property;

        indent += indentString;
        for (property in object) {
            if (object.hasOwnProperty(property)) {
                value.push(indent + '"' + property + '": ' + pretty(object[property], indent));
            }
        }

        return value.join(newLineJoin) + newLine;
    };

    prettyObjectPrint = function (object, indent) {
        var value = [],
            property;

        indent += indentString;
        for (property in object) {
            if (object.hasOwnProperty(property)) {
                value.push(indent + property + ': ' + pretty(object[property], indent));
            }
        }

        return value.join(newLineJoin) + newLine;
    };

    prettyArray = function (array, indent) {
        var index,
            length = array.length,
            value = [];

        indent += indentString;
        for (index = 0; index < length; index += 1) {
            value.push(pretty(array[index], indent, indent));
        }

        return value.join(newLineJoin) + newLine;
    };

    functionSignature = function (element) {
        var signatureExpression,
            signature;

        element = element.toString();
        signatureExpression = new RegExp('function\\s*.*\\s*\\(.*\\)');
        signature = signatureExpression.exec(element);
        signature = signature ? signature[0] : '[object Function]';
        return fullFunction ? element : '"' + signature + '"';
    };

    pretty = function (element, indent, fromArray) {
        var type;

        type = valueType(element);
        fromArray = fromArray || '';
        if (visited.indexOf(element) === -1) {
            switch (type) {
            case 'array':
                visited.push(element);
                return fromArray + '[' + newLine + prettyArray(element, indent) + indent + ']';

            case 'boolean':
                return fromArray + (element ? 'true' : 'false');

            case 'date':
                return fromArray + '"' + element.toString() + '"';

            case 'number':
                return fromArray + element;

            case 'object':
                visited.push(element);
                return fromArray + '{' + newLine + prettyObject(element, indent) + indent + '}';

            case 'string':
                return fromArray + '"' + element + '"';

            case 'function':
                return fromArray + functionSignature(element);

            default:
                return fromArray + ((element !== undefined)? element.toString() : 'undefined');
            }
        }
        return fromArray + 'circular reference to ' + element.toString();
    };

    if (jsObject) {
        if (indentLength === undefined) {
            indentLength = 4;
        }

        outputTo = (outputTo || 'print').toLowerCase();
        indentString = repeatString(outputTo === 'html' ? '&nbsp;' : ' ', indentLength);
        prettyObject = outputTo === 'json' ? prettyObjectJSON : prettyObjectPrint;
        newLine = outputTo === 'html' ? '<br/>' : '\n';
        newLineJoin = ',' + newLine;
        visited = [];
        return pretty(jsObject, '') + newLine;
    }

    return 'Error: no Javascript object provided';
};

},{}],10:[function(require,module,exports){
(function (Buffer){
// wrapper for non-node envs
;(function (sax) {

sax.parser = function (strict, opt) { return new SAXParser(strict, opt) }
sax.SAXParser = SAXParser
sax.SAXStream = SAXStream
sax.createStream = createStream

// When we pass the MAX_BUFFER_LENGTH position, start checking for buffer overruns.
// When we check, schedule the next check for MAX_BUFFER_LENGTH - (max(buffer lengths)),
// since that's the earliest that a buffer overrun could occur.  This way, checks are
// as rare as required, but as often as necessary to ensure never crossing this bound.
// Furthermore, buffers are only tested at most once per write(), so passing a very
// large string into write() might have undesirable effects, but this is manageable by
// the caller, so it is assumed to be safe.  Thus, a call to write() may, in the extreme
// edge case, result in creating at most one complete copy of the string passed in.
// Set to Infinity to have unlimited buffers.
sax.MAX_BUFFER_LENGTH = 64 * 1024

var buffers = [
  "comment", "sgmlDecl", "textNode", "tagName", "doctype",
  "procInstName", "procInstBody", "entity", "attribName",
  "attribValue", "cdata", "script"
]

sax.EVENTS = // for discoverability.
  [ "text"
  , "processinginstruction"
  , "sgmldeclaration"
  , "doctype"
  , "comment"
  , "attribute"
  , "opentag"
  , "closetag"
  , "opencdata"
  , "cdata"
  , "closecdata"
  , "error"
  , "end"
  , "ready"
  , "script"
  , "opennamespace"
  , "closenamespace"
  ]

function SAXParser (strict, opt) {
  if (!(this instanceof SAXParser)) return new SAXParser(strict, opt)

  var parser = this
  clearBuffers(parser)
  parser.q = parser.c = ""
  parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH
  parser.opt = opt || {}
  parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags
  parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase"
  parser.tags = []
  parser.closed = parser.closedRoot = parser.sawRoot = false
  parser.tag = parser.error = null
  parser.strict = !!strict
  parser.noscript = !!(strict || parser.opt.noscript)
  parser.state = S.BEGIN
  parser.ENTITIES = Object.create(sax.ENTITIES)
  parser.attribList = []

  // namespaces form a prototype chain.
  // it always points at the current tag,
  // which protos to its parent tag.
  if (parser.opt.xmlns) parser.ns = Object.create(rootNS)

  // mostly just for error reporting
  parser.trackPosition = parser.opt.position !== false
  if (parser.trackPosition) {
    parser.position = parser.line = parser.column = 0
  }
  emit(parser, "onready")
}

if (!Object.create) Object.create = function (o) {
  function f () { this.__proto__ = o }
  f.prototype = o
  return new f
}

if (!Object.getPrototypeOf) Object.getPrototypeOf = function (o) {
  return o.__proto__
}

if (!Object.keys) Object.keys = function (o) {
  var a = []
  for (var i in o) if (o.hasOwnProperty(i)) a.push(i)
  return a
}

function checkBufferLength (parser) {
  var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10)
    , maxActual = 0
  for (var i = 0, l = buffers.length; i < l; i ++) {
    var len = parser[buffers[i]].length
    if (len > maxAllowed) {
      // Text/cdata nodes can get big, and since they're buffered,
      // we can get here under normal conditions.
      // Avoid issues by emitting the text node now,
      // so at least it won't get any bigger.
      switch (buffers[i]) {
        case "textNode":
          closeText(parser)
        break

        case "cdata":
          emitNode(parser, "oncdata", parser.cdata)
          parser.cdata = ""
        break

        case "script":
          emitNode(parser, "onscript", parser.script)
          parser.script = ""
        break

        default:
          error(parser, "Max buffer length exceeded: "+buffers[i])
      }
    }
    maxActual = Math.max(maxActual, len)
  }
  // schedule the next check for the earliest possible buffer overrun.
  parser.bufferCheckPosition = (sax.MAX_BUFFER_LENGTH - maxActual)
                             + parser.position
}

function clearBuffers (parser) {
  for (var i = 0, l = buffers.length; i < l; i ++) {
    parser[buffers[i]] = ""
  }
}

function flushBuffers (parser) {
  closeText(parser)
  if (parser.cdata !== "") {
    emitNode(parser, "oncdata", parser.cdata)
    parser.cdata = ""
  }
  if (parser.script !== "") {
    emitNode(parser, "onscript", parser.script)
    parser.script = ""
  }
}

SAXParser.prototype =
  { end: function () { end(this) }
  , write: write
  , resume: function () { this.error = null; return this }
  , close: function () { return this.write(null) }
  , flush: function () { flushBuffers(this) }
  }

try {
  var Stream = require("stream").Stream
} catch (ex) {
  var Stream = function () {}
}


var streamWraps = sax.EVENTS.filter(function (ev) {
  return ev !== "error" && ev !== "end"
})

function createStream (strict, opt) {
  return new SAXStream(strict, opt)
}

function SAXStream (strict, opt) {
  if (!(this instanceof SAXStream)) return new SAXStream(strict, opt)

  Stream.apply(this)

  this._parser = new SAXParser(strict, opt)
  this.writable = true
  this.readable = true


  var me = this

  this._parser.onend = function () {
    me.emit("end")
  }

  this._parser.onerror = function (er) {
    me.emit("error", er)

    // if didn't throw, then means error was handled.
    // go ahead and clear error, so we can write again.
    me._parser.error = null
  }

  this._decoder = null;

  streamWraps.forEach(function (ev) {
    Object.defineProperty(me, "on" + ev, {
      get: function () { return me._parser["on" + ev] },
      set: function (h) {
        if (!h) {
          me.removeAllListeners(ev)
          return me._parser["on"+ev] = h
        }
        me.on(ev, h)
      },
      enumerable: true,
      configurable: false
    })
  })
}

SAXStream.prototype = Object.create(Stream.prototype,
  { constructor: { value: SAXStream } })

SAXStream.prototype.write = function (data) {
  if (typeof Buffer === 'function' &&
      typeof Buffer.isBuffer === 'function' &&
      Buffer.isBuffer(data)) {
    if (!this._decoder) {
      var SD = require('string_decoder').StringDecoder
      this._decoder = new SD('utf8')
    }
    data = this._decoder.write(data);
  }

  this._parser.write(data.toString())
  this.emit("data", data)
  return true
}

SAXStream.prototype.end = function (chunk) {
  if (chunk && chunk.length) this.write(chunk)
  this._parser.end()
  return true
}

SAXStream.prototype.on = function (ev, handler) {
  var me = this
  if (!me._parser["on"+ev] && streamWraps.indexOf(ev) !== -1) {
    me._parser["on"+ev] = function () {
      var args = arguments.length === 1 ? [arguments[0]]
               : Array.apply(null, arguments)
      args.splice(0, 0, ev)
      me.emit.apply(me, args)
    }
  }

  return Stream.prototype.on.call(me, ev, handler)
}



// character classes and tokens
var whitespace = "\r\n\t "
  // this really needs to be replaced with character classes.
  // XML allows all manner of ridiculous numbers and digits.
  , number = "0124356789"
  , letter = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  // (Letter | "_" | ":")
  , quote = "'\""
  , entity = number+letter+"#"
  , attribEnd = whitespace + ">"
  , CDATA = "[CDATA["
  , DOCTYPE = "DOCTYPE"
  , XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
  , XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/"
  , rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE }

// turn all the string character sets into character class objects.
whitespace = charClass(whitespace)
number = charClass(number)
letter = charClass(letter)

// http://www.w3.org/TR/REC-xml/#NT-NameStartChar
// This implementation works on strings, a single character at a time
// as such, it cannot ever support astral-plane characters (10000-EFFFF)
// without a significant breaking change to either this  parser, or the
// JavaScript language.  Implementation of an emoji-capable xml parser
// is left as an exercise for the reader.
var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/

var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/

quote = charClass(quote)
entity = charClass(entity)
attribEnd = charClass(attribEnd)

function charClass (str) {
  return str.split("").reduce(function (s, c) {
    s[c] = true
    return s
  }, {})
}

function isRegExp (c) {
  return Object.prototype.toString.call(c) === '[object RegExp]'
}

function is (charclass, c) {
  return isRegExp(charclass) ? !!c.match(charclass) : charclass[c]
}

function not (charclass, c) {
  return !is(charclass, c)
}

var S = 0
sax.STATE =
{ BEGIN                     : S++
, TEXT                      : S++ // general stuff
, TEXT_ENTITY               : S++ // &amp and such.
, OPEN_WAKA                 : S++ // <
, SGML_DECL                 : S++ // <!BLARG
, SGML_DECL_QUOTED          : S++ // <!BLARG foo "bar
, DOCTYPE                   : S++ // <!DOCTYPE
, DOCTYPE_QUOTED            : S++ // <!DOCTYPE "//blah
, DOCTYPE_DTD               : S++ // <!DOCTYPE "//blah" [ ...
, DOCTYPE_DTD_QUOTED        : S++ // <!DOCTYPE "//blah" [ "foo
, COMMENT_STARTING          : S++ // <!-
, COMMENT                   : S++ // <!--
, COMMENT_ENDING            : S++ // <!-- blah -
, COMMENT_ENDED             : S++ // <!-- blah --
, CDATA                     : S++ // <![CDATA[ something
, CDATA_ENDING              : S++ // ]
, CDATA_ENDING_2            : S++ // ]]
, PROC_INST                 : S++ // <?hi
, PROC_INST_BODY            : S++ // <?hi there
, PROC_INST_ENDING          : S++ // <?hi "there" ?
, OPEN_TAG                  : S++ // <strong
, OPEN_TAG_SLASH            : S++ // <strong /
, ATTRIB                    : S++ // <a
, ATTRIB_NAME               : S++ // <a foo
, ATTRIB_NAME_SAW_WHITE     : S++ // <a foo _
, ATTRIB_VALUE              : S++ // <a foo=
, ATTRIB_VALUE_QUOTED       : S++ // <a foo="bar
, ATTRIB_VALUE_CLOSED       : S++ // <a foo="bar"
, ATTRIB_VALUE_UNQUOTED     : S++ // <a foo=bar
, ATTRIB_VALUE_ENTITY_Q     : S++ // <foo bar="&quot;"
, ATTRIB_VALUE_ENTITY_U     : S++ // <foo bar=&quot;
, CLOSE_TAG                 : S++ // </a
, CLOSE_TAG_SAW_WHITE       : S++ // </a   >
, SCRIPT                    : S++ // <script> ...
, SCRIPT_ENDING             : S++ // <script> ... <
}

sax.ENTITIES =
{ "amp" : "&"
, "gt" : ">"
, "lt" : "<"
, "quot" : "\""
, "apos" : "'"
, "AElig" : 198
, "Aacute" : 193
, "Acirc" : 194
, "Agrave" : 192
, "Aring" : 197
, "Atilde" : 195
, "Auml" : 196
, "Ccedil" : 199
, "ETH" : 208
, "Eacute" : 201
, "Ecirc" : 202
, "Egrave" : 200
, "Euml" : 203
, "Iacute" : 205
, "Icirc" : 206
, "Igrave" : 204
, "Iuml" : 207
, "Ntilde" : 209
, "Oacute" : 211
, "Ocirc" : 212
, "Ograve" : 210
, "Oslash" : 216
, "Otilde" : 213
, "Ouml" : 214
, "THORN" : 222
, "Uacute" : 218
, "Ucirc" : 219
, "Ugrave" : 217
, "Uuml" : 220
, "Yacute" : 221
, "aacute" : 225
, "acirc" : 226
, "aelig" : 230
, "agrave" : 224
, "aring" : 229
, "atilde" : 227
, "auml" : 228
, "ccedil" : 231
, "eacute" : 233
, "ecirc" : 234
, "egrave" : 232
, "eth" : 240
, "euml" : 235
, "iacute" : 237
, "icirc" : 238
, "igrave" : 236
, "iuml" : 239
, "ntilde" : 241
, "oacute" : 243
, "ocirc" : 244
, "ograve" : 242
, "oslash" : 248
, "otilde" : 245
, "ouml" : 246
, "szlig" : 223
, "thorn" : 254
, "uacute" : 250
, "ucirc" : 251
, "ugrave" : 249
, "uuml" : 252
, "yacute" : 253
, "yuml" : 255
, "copy" : 169
, "reg" : 174
, "nbsp" : 160
, "iexcl" : 161
, "cent" : 162
, "pound" : 163
, "curren" : 164
, "yen" : 165
, "brvbar" : 166
, "sect" : 167
, "uml" : 168
, "ordf" : 170
, "laquo" : 171
, "not" : 172
, "shy" : 173
, "macr" : 175
, "deg" : 176
, "plusmn" : 177
, "sup1" : 185
, "sup2" : 178
, "sup3" : 179
, "acute" : 180
, "micro" : 181
, "para" : 182
, "middot" : 183
, "cedil" : 184
, "ordm" : 186
, "raquo" : 187
, "frac14" : 188
, "frac12" : 189
, "frac34" : 190
, "iquest" : 191
, "times" : 215
, "divide" : 247
, "OElig" : 338
, "oelig" : 339
, "Scaron" : 352
, "scaron" : 353
, "Yuml" : 376
, "fnof" : 402
, "circ" : 710
, "tilde" : 732
, "Alpha" : 913
, "Beta" : 914
, "Gamma" : 915
, "Delta" : 916
, "Epsilon" : 917
, "Zeta" : 918
, "Eta" : 919
, "Theta" : 920
, "Iota" : 921
, "Kappa" : 922
, "Lambda" : 923
, "Mu" : 924
, "Nu" : 925
, "Xi" : 926
, "Omicron" : 927
, "Pi" : 928
, "Rho" : 929
, "Sigma" : 931
, "Tau" : 932
, "Upsilon" : 933
, "Phi" : 934
, "Chi" : 935
, "Psi" : 936
, "Omega" : 937
, "alpha" : 945
, "beta" : 946
, "gamma" : 947
, "delta" : 948
, "epsilon" : 949
, "zeta" : 950
, "eta" : 951
, "theta" : 952
, "iota" : 953
, "kappa" : 954
, "lambda" : 955
, "mu" : 956
, "nu" : 957
, "xi" : 958
, "omicron" : 959
, "pi" : 960
, "rho" : 961
, "sigmaf" : 962
, "sigma" : 963
, "tau" : 964
, "upsilon" : 965
, "phi" : 966
, "chi" : 967
, "psi" : 968
, "omega" : 969
, "thetasym" : 977
, "upsih" : 978
, "piv" : 982
, "ensp" : 8194
, "emsp" : 8195
, "thinsp" : 8201
, "zwnj" : 8204
, "zwj" : 8205
, "lrm" : 8206
, "rlm" : 8207
, "ndash" : 8211
, "mdash" : 8212
, "lsquo" : 8216
, "rsquo" : 8217
, "sbquo" : 8218
, "ldquo" : 8220
, "rdquo" : 8221
, "bdquo" : 8222
, "dagger" : 8224
, "Dagger" : 8225
, "bull" : 8226
, "hellip" : 8230
, "permil" : 8240
, "prime" : 8242
, "Prime" : 8243
, "lsaquo" : 8249
, "rsaquo" : 8250
, "oline" : 8254
, "frasl" : 8260
, "euro" : 8364
, "image" : 8465
, "weierp" : 8472
, "real" : 8476
, "trade" : 8482
, "alefsym" : 8501
, "larr" : 8592
, "uarr" : 8593
, "rarr" : 8594
, "darr" : 8595
, "harr" : 8596
, "crarr" : 8629
, "lArr" : 8656
, "uArr" : 8657
, "rArr" : 8658
, "dArr" : 8659
, "hArr" : 8660
, "forall" : 8704
, "part" : 8706
, "exist" : 8707
, "empty" : 8709
, "nabla" : 8711
, "isin" : 8712
, "notin" : 8713
, "ni" : 8715
, "prod" : 8719
, "sum" : 8721
, "minus" : 8722
, "lowast" : 8727
, "radic" : 8730
, "prop" : 8733
, "infin" : 8734
, "ang" : 8736
, "and" : 8743
, "or" : 8744
, "cap" : 8745
, "cup" : 8746
, "int" : 8747
, "there4" : 8756
, "sim" : 8764
, "cong" : 8773
, "asymp" : 8776
, "ne" : 8800
, "equiv" : 8801
, "le" : 8804
, "ge" : 8805
, "sub" : 8834
, "sup" : 8835
, "nsub" : 8836
, "sube" : 8838
, "supe" : 8839
, "oplus" : 8853
, "otimes" : 8855
, "perp" : 8869
, "sdot" : 8901
, "lceil" : 8968
, "rceil" : 8969
, "lfloor" : 8970
, "rfloor" : 8971
, "lang" : 9001
, "rang" : 9002
, "loz" : 9674
, "spades" : 9824
, "clubs" : 9827
, "hearts" : 9829
, "diams" : 9830
}

Object.keys(sax.ENTITIES).forEach(function (key) {
    var e = sax.ENTITIES[key]
    var s = typeof e === 'number' ? String.fromCharCode(e) : e
    sax.ENTITIES[key] = s
})

for (var S in sax.STATE) sax.STATE[sax.STATE[S]] = S

// shorthand
S = sax.STATE

function emit (parser, event, data) {
  parser[event] && parser[event](data)
}

function emitNode (parser, nodeType, data) {
  if (parser.textNode) closeText(parser)
  emit(parser, nodeType, data)
}

function closeText (parser) {
  parser.textNode = textopts(parser.opt, parser.textNode)
  if (parser.textNode) emit(parser, "ontext", parser.textNode)
  parser.textNode = ""
}

function textopts (opt, text) {
  if (opt.trim) text = text.trim()
  if (opt.normalize) text = text.replace(/\s+/g, " ")
  return text
}

function error (parser, er) {
  closeText(parser)
  if (parser.trackPosition) {
    er += "\nLine: "+parser.line+
          "\nColumn: "+parser.column+
          "\nChar: "+parser.c
  }
  er = new Error(er)
  parser.error = er
  emit(parser, "onerror", er)
  return parser
}

function end (parser) {
  if (!parser.closedRoot) strictFail(parser, "Unclosed root tag")
  if ((parser.state !== S.BEGIN) && (parser.state !== S.TEXT)) error(parser, "Unexpected end")
  closeText(parser)
  parser.c = ""
  parser.closed = true
  emit(parser, "onend")
  SAXParser.call(parser, parser.strict, parser.opt)
  return parser
}

function strictFail (parser, message) {
  if (typeof parser !== 'object' || !(parser instanceof SAXParser))
    throw new Error('bad call to strictFail');
  if (parser.strict) error(parser, message)
}

function newTag (parser) {
  if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]()
  var parent = parser.tags[parser.tags.length - 1] || parser
    , tag = parser.tag = { name : parser.tagName, attributes : {} }

  // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
  if (parser.opt.xmlns) tag.ns = parent.ns
  parser.attribList.length = 0
}

function qname (name, attribute) {
  var i = name.indexOf(":")
    , qualName = i < 0 ? [ "", name ] : name.split(":")
    , prefix = qualName[0]
    , local = qualName[1]

  // <x "xmlns"="http://foo">
  if (attribute && name === "xmlns") {
    prefix = "xmlns"
    local = ""
  }

  return { prefix: prefix, local: local }
}

function attrib (parser) {
  if (!parser.strict) parser.attribName = parser.attribName[parser.looseCase]()

  if (parser.attribList.indexOf(parser.attribName) !== -1 ||
      parser.tag.attributes.hasOwnProperty(parser.attribName)) {
    return parser.attribName = parser.attribValue = ""
  }

  if (parser.opt.xmlns) {
    var qn = qname(parser.attribName, true)
      , prefix = qn.prefix
      , local = qn.local

    if (prefix === "xmlns") {
      // namespace binding attribute; push the binding into scope
      if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
        strictFail( parser
                  , "xml: prefix must be bound to " + XML_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
        strictFail( parser
                  , "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else {
        var tag = parser.tag
          , parent = parser.tags[parser.tags.length - 1] || parser
        if (tag.ns === parent.ns) {
          tag.ns = Object.create(parent.ns)
        }
        tag.ns[local] = parser.attribValue
      }
    }

    // defer onattribute events until all attributes have been seen
    // so any new bindings can take effect; preserve attribute order
    // so deferred events can be emitted in document order
    parser.attribList.push([parser.attribName, parser.attribValue])
  } else {
    // in non-xmlns mode, we can emit the event right away
    parser.tag.attributes[parser.attribName] = parser.attribValue
    emitNode( parser
            , "onattribute"
            , { name: parser.attribName
              , value: parser.attribValue } )
  }

  parser.attribName = parser.attribValue = ""
}

function openTag (parser, selfClosing) {
  if (parser.opt.xmlns) {
    // emit namespace binding events
    var tag = parser.tag

    // add namespace info to tag
    var qn = qname(parser.tagName)
    tag.prefix = qn.prefix
    tag.local = qn.local
    tag.uri = tag.ns[qn.prefix] || ""

    if (tag.prefix && !tag.uri) {
      strictFail(parser, "Unbound namespace prefix: "
                       + JSON.stringify(parser.tagName))
      tag.uri = qn.prefix
    }

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (tag.ns && parent.ns !== tag.ns) {
      Object.keys(tag.ns).forEach(function (p) {
        emitNode( parser
                , "onopennamespace"
                , { prefix: p , uri: tag.ns[p] } )
      })
    }

    // handle deferred onattribute events
    // Note: do not apply default ns to attributes:
    //   http://www.w3.org/TR/REC-xml-names/#defaulting
    for (var i = 0, l = parser.attribList.length; i < l; i ++) {
      var nv = parser.attribList[i]
      var name = nv[0]
        , value = nv[1]
        , qualName = qname(name, true)
        , prefix = qualName.prefix
        , local = qualName.local
        , uri = prefix == "" ? "" : (tag.ns[prefix] || "")
        , a = { name: name
              , value: value
              , prefix: prefix
              , local: local
              , uri: uri
              }

      // if there's any attributes with an undefined namespace,
      // then fail on them now.
      if (prefix && prefix != "xmlns" && !uri) {
        strictFail(parser, "Unbound namespace prefix: "
                         + JSON.stringify(prefix))
        a.uri = prefix
      }
      parser.tag.attributes[name] = a
      emitNode(parser, "onattribute", a)
    }
    parser.attribList.length = 0
  }

  parser.tag.isSelfClosing = !!selfClosing

  // process the tag
  parser.sawRoot = true
  parser.tags.push(parser.tag)
  emitNode(parser, "onopentag", parser.tag)
  if (!selfClosing) {
    // special case for <script> in non-strict mode.
    if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
      parser.state = S.SCRIPT
    } else {
      parser.state = S.TEXT
    }
    parser.tag = null
    parser.tagName = ""
  }
  parser.attribName = parser.attribValue = ""
  parser.attribList.length = 0
}

function closeTag (parser) {
  if (!parser.tagName) {
    strictFail(parser, "Weird empty close tag.")
    parser.textNode += "</>"
    parser.state = S.TEXT
    return
  }

  if (parser.script) {
    if (parser.tagName !== "script") {
      parser.script += "</" + parser.tagName + ">"
      parser.tagName = ""
      parser.state = S.SCRIPT
      return
    }
    emitNode(parser, "onscript", parser.script)
    parser.script = ""
  }

  // first make sure that the closing tag actually exists.
  // <a><b></c></b></a> will close everything, otherwise.
  var t = parser.tags.length
  var tagName = parser.tagName
  if (!parser.strict) tagName = tagName[parser.looseCase]()
  var closeTo = tagName
  while (t --) {
    var close = parser.tags[t]
    if (close.name !== closeTo) {
      // fail the first time in strict mode
      strictFail(parser, "Unexpected close tag")
    } else break
  }

  // didn't find it.  we already failed for strict, so just abort.
  if (t < 0) {
    strictFail(parser, "Unmatched closing tag: "+parser.tagName)
    parser.textNode += "</" + parser.tagName + ">"
    parser.state = S.TEXT
    return
  }
  parser.tagName = tagName
  var s = parser.tags.length
  while (s --> t) {
    var tag = parser.tag = parser.tags.pop()
    parser.tagName = parser.tag.name
    emitNode(parser, "onclosetag", parser.tagName)

    var x = {}
    for (var i in tag.ns) x[i] = tag.ns[i]

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (parser.opt.xmlns && tag.ns !== parent.ns) {
      // remove namespace bindings introduced by tag
      Object.keys(tag.ns).forEach(function (p) {
        var n = tag.ns[p]
        emitNode(parser, "onclosenamespace", { prefix: p, uri: n })
      })
    }
  }
  if (t === 0) parser.closedRoot = true
  parser.tagName = parser.attribValue = parser.attribName = ""
  parser.attribList.length = 0
  parser.state = S.TEXT
}

function parseEntity (parser) {
  var entity = parser.entity
    , entityLC = entity.toLowerCase()
    , num
    , numStr = ""
  if (parser.ENTITIES[entity])
    return parser.ENTITIES[entity]
  if (parser.ENTITIES[entityLC])
    return parser.ENTITIES[entityLC]
  entity = entityLC
  if (entity.charAt(0) === "#") {
    if (entity.charAt(1) === "x") {
      entity = entity.slice(2)
      num = parseInt(entity, 16)
      numStr = num.toString(16)
    } else {
      entity = entity.slice(1)
      num = parseInt(entity, 10)
      numStr = num.toString(10)
    }
  }
  entity = entity.replace(/^0+/, "")
  if (numStr.toLowerCase() !== entity) {
    strictFail(parser, "Invalid character entity")
    return "&"+parser.entity + ";"
  }

  return String.fromCodePoint(num)
}

function write (chunk) {
  var parser = this
  if (this.error) throw this.error
  if (parser.closed) return error(parser,
    "Cannot write after close. Assign an onready handler.")
  if (chunk === null) return end(parser)
  var i = 0, c = ""
  while (parser.c = c = chunk.charAt(i++)) {
    if (parser.trackPosition) {
      parser.position ++
      if (c === "\n") {
        parser.line ++
        parser.column = 0
      } else parser.column ++
    }
    switch (parser.state) {

      case S.BEGIN:
        if (c === "<") {
          parser.state = S.OPEN_WAKA
          parser.startTagPosition = parser.position
        } else if (not(whitespace,c)) {
          // have to process this as a text node.
          // weird, but happens.
          strictFail(parser, "Non-whitespace before first tag.")
          parser.textNode = c
          parser.state = S.TEXT
        }
      continue

      case S.TEXT:
        if (parser.sawRoot && !parser.closedRoot) {
          var starti = i-1
          while (c && c!=="<" && c!=="&") {
            c = chunk.charAt(i++)
            if (c && parser.trackPosition) {
              parser.position ++
              if (c === "\n") {
                parser.line ++
                parser.column = 0
              } else parser.column ++
            }
          }
          parser.textNode += chunk.substring(starti, i-1)
        }
        if (c === "<") {
          parser.state = S.OPEN_WAKA
          parser.startTagPosition = parser.position
        } else {
          if (not(whitespace, c) && (!parser.sawRoot || parser.closedRoot))
            strictFail(parser, "Text data outside of root node.")
          if (c === "&") parser.state = S.TEXT_ENTITY
          else parser.textNode += c
        }
      continue

      case S.SCRIPT:
        // only non-strict
        if (c === "<") {
          parser.state = S.SCRIPT_ENDING
        } else parser.script += c
      continue

      case S.SCRIPT_ENDING:
        if (c === "/") {
          parser.state = S.CLOSE_TAG
        } else {
          parser.script += "<" + c
          parser.state = S.SCRIPT
        }
      continue

      case S.OPEN_WAKA:
        // either a /, ?, !, or text is coming next.
        if (c === "!") {
          parser.state = S.SGML_DECL
          parser.sgmlDecl = ""
        } else if (is(whitespace, c)) {
          // wait for it...
        } else if (is(nameStart,c)) {
          parser.state = S.OPEN_TAG
          parser.tagName = c
        } else if (c === "/") {
          parser.state = S.CLOSE_TAG
          parser.tagName = ""
        } else if (c === "?") {
          parser.state = S.PROC_INST
          parser.procInstName = parser.procInstBody = ""
        } else {
          strictFail(parser, "Unencoded <")
          // if there was some whitespace, then add that in.
          if (parser.startTagPosition + 1 < parser.position) {
            var pad = parser.position - parser.startTagPosition
            c = new Array(pad).join(" ") + c
          }
          parser.textNode += "<" + c
          parser.state = S.TEXT
        }
      continue

      case S.SGML_DECL:
        if ((parser.sgmlDecl+c).toUpperCase() === CDATA) {
          emitNode(parser, "onopencdata")
          parser.state = S.CDATA
          parser.sgmlDecl = ""
          parser.cdata = ""
        } else if (parser.sgmlDecl+c === "--") {
          parser.state = S.COMMENT
          parser.comment = ""
          parser.sgmlDecl = ""
        } else if ((parser.sgmlDecl+c).toUpperCase() === DOCTYPE) {
          parser.state = S.DOCTYPE
          if (parser.doctype || parser.sawRoot) strictFail(parser,
            "Inappropriately located doctype declaration")
          parser.doctype = ""
          parser.sgmlDecl = ""
        } else if (c === ">") {
          emitNode(parser, "onsgmldeclaration", parser.sgmlDecl)
          parser.sgmlDecl = ""
          parser.state = S.TEXT
        } else if (is(quote, c)) {
          parser.state = S.SGML_DECL_QUOTED
          parser.sgmlDecl += c
        } else parser.sgmlDecl += c
      continue

      case S.SGML_DECL_QUOTED:
        if (c === parser.q) {
          parser.state = S.SGML_DECL
          parser.q = ""
        }
        parser.sgmlDecl += c
      continue

      case S.DOCTYPE:
        if (c === ">") {
          parser.state = S.TEXT
          emitNode(parser, "ondoctype", parser.doctype)
          parser.doctype = true // just remember that we saw it.
        } else {
          parser.doctype += c
          if (c === "[") parser.state = S.DOCTYPE_DTD
          else if (is(quote, c)) {
            parser.state = S.DOCTYPE_QUOTED
            parser.q = c
          }
        }
      continue

      case S.DOCTYPE_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.q = ""
          parser.state = S.DOCTYPE
        }
      continue

      case S.DOCTYPE_DTD:
        parser.doctype += c
        if (c === "]") parser.state = S.DOCTYPE
        else if (is(quote,c)) {
          parser.state = S.DOCTYPE_DTD_QUOTED
          parser.q = c
        }
      continue

      case S.DOCTYPE_DTD_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.state = S.DOCTYPE_DTD
          parser.q = ""
        }
      continue

      case S.COMMENT:
        if (c === "-") parser.state = S.COMMENT_ENDING
        else parser.comment += c
      continue

      case S.COMMENT_ENDING:
        if (c === "-") {
          parser.state = S.COMMENT_ENDED
          parser.comment = textopts(parser.opt, parser.comment)
          if (parser.comment) emitNode(parser, "oncomment", parser.comment)
          parser.comment = ""
        } else {
          parser.comment += "-" + c
          parser.state = S.COMMENT
        }
      continue

      case S.COMMENT_ENDED:
        if (c !== ">") {
          strictFail(parser, "Malformed comment")
          // allow <!-- blah -- bloo --> in non-strict mode,
          // which is a comment of " blah -- bloo "
          parser.comment += "--" + c
          parser.state = S.COMMENT
        } else parser.state = S.TEXT
      continue

      case S.CDATA:
        if (c === "]") parser.state = S.CDATA_ENDING
        else parser.cdata += c
      continue

      case S.CDATA_ENDING:
        if (c === "]") parser.state = S.CDATA_ENDING_2
        else {
          parser.cdata += "]" + c
          parser.state = S.CDATA
        }
      continue

      case S.CDATA_ENDING_2:
        if (c === ">") {
          if (parser.cdata) emitNode(parser, "oncdata", parser.cdata)
          emitNode(parser, "onclosecdata")
          parser.cdata = ""
          parser.state = S.TEXT
        } else if (c === "]") {
          parser.cdata += "]"
        } else {
          parser.cdata += "]]" + c
          parser.state = S.CDATA
        }
      continue

      case S.PROC_INST:
        if (c === "?") parser.state = S.PROC_INST_ENDING
        else if (is(whitespace, c)) parser.state = S.PROC_INST_BODY
        else parser.procInstName += c
      continue

      case S.PROC_INST_BODY:
        if (!parser.procInstBody && is(whitespace, c)) continue
        else if (c === "?") parser.state = S.PROC_INST_ENDING
        else parser.procInstBody += c
      continue

      case S.PROC_INST_ENDING:
        if (c === ">") {
          emitNode(parser, "onprocessinginstruction", {
            name : parser.procInstName,
            body : parser.procInstBody
          })
          parser.procInstName = parser.procInstBody = ""
          parser.state = S.TEXT
        } else {
          parser.procInstBody += "?" + c
          parser.state = S.PROC_INST_BODY
        }
      continue

      case S.OPEN_TAG:
        if (is(nameBody, c)) parser.tagName += c
        else {
          newTag(parser)
          if (c === ">") openTag(parser)
          else if (c === "/") parser.state = S.OPEN_TAG_SLASH
          else {
            if (not(whitespace, c)) strictFail(
              parser, "Invalid character in tag name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.OPEN_TAG_SLASH:
        if (c === ">") {
          openTag(parser, true)
          closeTag(parser)
        } else {
          strictFail(parser, "Forward-slash in opening tag not followed by >")
          parser.state = S.ATTRIB
        }
      continue

      case S.ATTRIB:
        // haven't read the attribute name yet.
        if (is(whitespace, c)) continue
        else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (c === ">") {
          strictFail(parser, "Attribute without value")
          parser.attribValue = parser.attribName
          attrib(parser)
          openTag(parser)
        }
        else if (is(whitespace, c)) parser.state = S.ATTRIB_NAME_SAW_WHITE
        else if (is(nameBody, c)) parser.attribName += c
        else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME_SAW_WHITE:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (is(whitespace, c)) continue
        else {
          strictFail(parser, "Attribute without value")
          parser.tag.attributes[parser.attribName] = ""
          parser.attribValue = ""
          emitNode(parser, "onattribute",
                   { name : parser.attribName, value : "" })
          parser.attribName = ""
          if (c === ">") openTag(parser)
          else if (is(nameStart, c)) {
            parser.attribName = c
            parser.state = S.ATTRIB_NAME
          } else {
            strictFail(parser, "Invalid attribute name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.ATTRIB_VALUE:
        if (is(whitespace, c)) continue
        else if (is(quote, c)) {
          parser.q = c
          parser.state = S.ATTRIB_VALUE_QUOTED
        } else {
          strictFail(parser, "Unquoted attribute value")
          parser.state = S.ATTRIB_VALUE_UNQUOTED
          parser.attribValue = c
        }
      continue

      case S.ATTRIB_VALUE_QUOTED:
        if (c !== parser.q) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_Q
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        parser.q = ""
        parser.state = S.ATTRIB_VALUE_CLOSED
      continue

      case S.ATTRIB_VALUE_CLOSED:
        if (is(whitespace, c)) {
          parser.state = S.ATTRIB
        } else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          strictFail(parser, "No whitespace between attributes")
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_VALUE_UNQUOTED:
        if (not(attribEnd,c)) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_U
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        if (c === ">") openTag(parser)
        else parser.state = S.ATTRIB
      continue

      case S.CLOSE_TAG:
        if (!parser.tagName) {
          if (is(whitespace, c)) continue
          else if (not(nameStart, c)) {
            if (parser.script) {
              parser.script += "</" + c
              parser.state = S.SCRIPT
            } else {
              strictFail(parser, "Invalid tagname in closing tag.")
            }
          } else parser.tagName = c
        }
        else if (c === ">") closeTag(parser)
        else if (is(nameBody, c)) parser.tagName += c
        else if (parser.script) {
          parser.script += "</" + parser.tagName
          parser.tagName = ""
          parser.state = S.SCRIPT
        } else {
          if (not(whitespace, c)) strictFail(parser,
            "Invalid tagname in closing tag")
          parser.state = S.CLOSE_TAG_SAW_WHITE
        }
      continue

      case S.CLOSE_TAG_SAW_WHITE:
        if (is(whitespace, c)) continue
        if (c === ">") closeTag(parser)
        else strictFail(parser, "Invalid characters in closing tag")
      continue

      case S.TEXT_ENTITY:
      case S.ATTRIB_VALUE_ENTITY_Q:
      case S.ATTRIB_VALUE_ENTITY_U:
        switch(parser.state) {
          case S.TEXT_ENTITY:
            var returnState = S.TEXT, buffer = "textNode"
          break

          case S.ATTRIB_VALUE_ENTITY_Q:
            var returnState = S.ATTRIB_VALUE_QUOTED, buffer = "attribValue"
          break

          case S.ATTRIB_VALUE_ENTITY_U:
            var returnState = S.ATTRIB_VALUE_UNQUOTED, buffer = "attribValue"
          break
        }
        if (c === ";") {
          parser[buffer] += parseEntity(parser)
          parser.entity = ""
          parser.state = returnState
        }
        else if (is(entity, c)) parser.entity += c
        else {
          strictFail(parser, "Invalid character entity")
          parser[buffer] += "&" + parser.entity + c
          parser.entity = ""
          parser.state = returnState
        }
      continue

      default:
        throw new Error(parser, "Unknown state: " + parser.state)
    }
  } // while
  // cdata blocks can get very big under normal conditions. emit and move on.
  // if (parser.state === S.CDATA && parser.cdata) {
  //   emitNode(parser, "oncdata", parser.cdata)
  //   parser.cdata = ""
  // }
  if (parser.position >= parser.bufferCheckPosition) checkBufferLength(parser)
  return parser
}

/*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
if (!String.fromCodePoint) {
        (function() {
                var stringFromCharCode = String.fromCharCode;
                var floor = Math.floor;
                var fromCodePoint = function() {
                        var MAX_SIZE = 0x4000;
                        var codeUnits = [];
                        var highSurrogate;
                        var lowSurrogate;
                        var index = -1;
                        var length = arguments.length;
                        if (!length) {
                                return '';
                        }
                        var result = '';
                        while (++index < length) {
                                var codePoint = Number(arguments[index]);
                                if (
                                        !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
                                        codePoint < 0 || // not a valid Unicode code point
                                        codePoint > 0x10FFFF || // not a valid Unicode code point
                                        floor(codePoint) != codePoint // not an integer
                                ) {
                                        throw RangeError('Invalid code point: ' + codePoint);
                                }
                                if (codePoint <= 0xFFFF) { // BMP code point
                                        codeUnits.push(codePoint);
                                } else { // Astral code point; split in surrogate halves
                                        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                                        codePoint -= 0x10000;
                                        highSurrogate = (codePoint >> 10) + 0xD800;
                                        lowSurrogate = (codePoint % 0x400) + 0xDC00;
                                        codeUnits.push(highSurrogate, lowSurrogate);
                                }
                                if (index + 1 == length || codeUnits.length > MAX_SIZE) {
                                        result += stringFromCharCode.apply(null, codeUnits);
                                        codeUnits.length = 0;
                                }
                        }
                        return result;
                };
                if (Object.defineProperty) {
                        Object.defineProperty(String, 'fromCodePoint', {
                                'value': fromCodePoint,
                                'configurable': true,
                                'writable': true
                        });
                } else {
                        String.fromCodePoint = fromCodePoint;
                }
        }());
}

})(typeof exports === "undefined" ? sax = {} : exports);

}).call(this,require("buffer").Buffer)

},{"buffer":11,"stream":30,"string_decoder":31}],11:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  if (length > 0 && length <= Buffer.poolSize)
    buf.parent = rootParent

  return buf
}

function SlowBuffer(subject, encoding, noZero) {
  if (!(this instanceof SlowBuffer))
    return new SlowBuffer(subject, encoding, noZero)

  var buf = new Buffer(subject, encoding, noZero)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length, 2)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0

  if (length < 0 || offset < 0 || offset > this.length)
    throw new RangeError('attempt to write outside buffer bounds');

  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length)
    newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul

  return val
}

Buffer.prototype.readUIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100))
    val += this[offset + --byteLength] * mul;

  return val
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100))
    val += this[offset + --i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (target_start >= target.length) target_start = target.length
  if (!target_start) target_start = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || source.length === 0) return 0

  // Fatal error conditions
  if (target_start < 0)
    throw new RangeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes(string, units) {
  var codePoint, length = string.length
  var leadSurrogate = null
  units = units || Infinity
  var bytes = []
  var i = 0

  for (; i<length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {

      // last char was a lead
      if (leadSurrogate) {

        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        }

        // valid surrogate pair
        else {
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      }

      // no lead yet
      else {

        // unexpected trail
        if (codePoint > 0xDBFF) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // unpaired lead
        else if (i + 1 === length) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        else {
          leadSurrogate = codePoint
          continue
        }
      }
    }

    // valid bmp char, but last char was a lead
    else if (leadSurrogate) {
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    }
    else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    }
    else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    }
    else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    }
    else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {

    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length, unitSize) {
  if (unitSize) length -= length % unitSize;
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":12,"ieee754":13,"is-array":14}],12:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],13:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],14:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],15:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],16:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],17:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],18:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],19:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":20}],20:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))

},{"./_stream_readable":22,"./_stream_writable":24,"_process":18,"core-util-is":25,"inherits":16}],21:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":23,"core-util-is":25,"inherits":16}],22:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;
  var ret;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    ret = null;

    // In cases where the decoder did not receive enough data
    // to produce a full chunk, then immediately received an
    // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
    // howMuchToRead will see this and coerce the amount to
    // read to zero (because it's looking at the length of the
    // first <Buffer > in state.buffer), and we'll end up here.
    //
    // This can only happen via state.decoder -- no other venue
    // exists for pushing a zero-length chunk into state.buffer
    // and triggering this behavior. In this case, we return our
    // remaining data and end the stream, if appropriate.
    if (state.length > 0 && state.decoder) {
      ret = fromList(n, state);
      state.length -= ret.length;
    }

    if (state.length === 0)
      endReadable(this);

    return ret;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    process.nextTick(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    process.nextTick(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      process.nextTick(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    //if (state.objectMode && util.isNullOrUndefined(chunk))
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))

},{"_process":18,"buffer":11,"core-util-is":25,"events":15,"inherits":16,"isarray":17,"stream":30,"string_decoder/":31}],23:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":20,"core-util-is":25,"inherits":16}],24:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      cb(er);
    });
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))

},{"./_stream_duplex":20,"_process":18,"buffer":11,"core-util-is":25,"inherits":16,"stream":30}],25:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)

},{"buffer":11}],26:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":21}],27:[function(require,module,exports){
var Stream = require('stream'); // hack to fix a circular dependency issue when used with browserify
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":20,"./lib/_stream_passthrough.js":21,"./lib/_stream_readable.js":22,"./lib/_stream_transform.js":23,"./lib/_stream_writable.js":24,"stream":30}],28:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":23}],29:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":24}],30:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":15,"inherits":16,"readable-stream/duplex.js":19,"readable-stream/passthrough.js":26,"readable-stream/readable.js":27,"readable-stream/transform.js":28,"readable-stream/writable.js":29}],31:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":11}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImluZGV4LmpzIiwibGliL2RhZTJncm91cGluZy5qcyIsImxpYi9ncm91cGluZzJqcy5qcyIsImxpYi9zZW1hbnRpYzJqcy5qcyIsIm5vZGVfbW9kdWxlcy9qcy1iZWF1dGlmeS9qcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9qcy1iZWF1dGlmeS9qcy9saWIvYmVhdXRpZnktY3NzLmpzIiwibm9kZV9tb2R1bGVzL2pzLWJlYXV0aWZ5L2pzL2xpYi9iZWF1dGlmeS1odG1sLmpzIiwibm9kZV9tb2R1bGVzL2pzLWJlYXV0aWZ5L2pzL2xpYi9iZWF1dGlmeS5qcyIsIm5vZGVfbW9kdWxlcy9qcy1vYmplY3QtcHJldHR5LXByaW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NheC9saWIvc2F4LmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaXMtYXJyYXkvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vZHVwbGV4LmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX2R1cGxleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV9wYXNzdGhyb3VnaC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV9yZWFkYWJsZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fd3JpdGFibGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbm9kZV9tb2R1bGVzL2NvcmUtdXRpbC1pcy9saWIvdXRpbC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9wYXNzdGhyb3VnaC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9yZWFkYWJsZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS90cmFuc2Zvcm0uanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9zdHJlYW0tYnJvd3NlcmlmeS9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmluZ19kZWNvZGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2gzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcjREQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2w0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3B5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBOzs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN0OUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMUdBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IDIwMTUsIFNSSSBJbnRlcm5hdGlvbmFsXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGcyanMgPSByZXF1aXJlKCcuL2xpYi9ncm91cGluZzJqcycpKHsgc3RyaWN0OiB0cnVlIH0pLFxuICAgIGRhZTJnID0gcmVxdWlyZSgnLi9saWIvZGFlMmdyb3VwaW5nJykoeyBzdHJpY3Q6IHRydWUgfSksXG4gICAgczJqcyA9IHJlcXVpcmUoJy4vbGliL3NlbWFudGljMmpzJykoeyBzdHJpY3Q6IHRydWUgfSksXG4gICAgcHJldHR5ID0gcmVxdWlyZSgnanMtb2JqZWN0LXByZXR0eS1wcmludCcpLnByZXR0eSxcbiAgICBiZWF1dGlmeV9odG1sID0gcmVxdWlyZSgnanMtYmVhdXRpZnknKS5odG1sO1xuXG4vLyBwdWJsaWMgdmlhIGV4cG9ydHMubW9kdWxlXG52YXIgZ3JvdXBpbmcyaHRtbCA9IGZ1bmN0aW9uKHNvdXJjZVhtbCkge1xuICAgIHZhciBncm91cGluZ09iaiA9IGcyanMuZ3JvdXBpbmcyanMoc291cmNlWG1sKTtcblxuICAgIHJldHVybiBncm91cGluZ09iajJodG1sKGdyb3VwaW5nT2JqKTtcbn07XG5cbnZhciBncm91cGluZ09iajJodG1sID0gZnVuY3Rpb24oZ3JvdXBpbmdPYmopIHtcbiAgICB2YXIgdGV4dCA9IHByZXR0eShncm91cGluZ09iaiksXG4gICAgICAgIGh0bWwgPSBzaW1wbGVUZXh0Mmh0bWwodGV4dCk7XG5cbiAgICByZXR1cm4geyBodG1sOiBodG1sLCB0ZXh0OiB0ZXh0IH07XG59O1xuXG52YXIgZ3JvdXBpbmdYbWwyaHRtbCA9IGZ1bmN0aW9uKHNvdXJjZVhtbCkge1xuICAgIHZhciB0ZXh0ID0gIGJlYXV0aWZ5X2h0bWwoc291cmNlWG1sKSxcbiAgICAgICAgaHRtbCA9IHNpbXBsZVRleHQyaHRtbCh0ZXh0KTtcblxuICAgIHJldHVybiB7IGh0bWw6IGh0bWwsIHRleHQ6IHRleHQgfTtcbn07XG5cbnZhciBncm91cGluZ09iajJ4bWwgPSBmdW5jdGlvbihncm91cGluZ09iaikge1xuICAgIHZhciBncm91cGluZ1htbCA9ICc8Z3JvdXBpbmcgbmFtZT1cIicgKyBncm91cGluZ09iai5uYW1lICsgJ1wiPic7XG5cbiAgICBncm91cGluZ1htbCA9IGdyb3Vwc3BhcnRzMnhtbChncm91cGluZ09iaiwgZ3JvdXBpbmdYbWwpO1xuICAgIHJldHVybiBncm91cGluZ1htbCArICc8L2dyb3VwaW5nPic7XG59O1xuXG52YXIgc2VtYW50aWMyaHRtbCA9IGZ1bmN0aW9uKHNvdXJjZVhtbCkge1xuICAgIHZhciBzZW1hbnRpY09iaiA9IGcyanMuZ3JvdXBpbmcyanMoc291cmNlWG1sKTtcblxuICAgIHJldHVybiBzZW1hbnRpY09iajJodG1sKHNlbWFudGljT2JqKTtcbn07XG5cbnZhciBzZW1hbnRpY09iajJodG1sID0gZnVuY3Rpb24oc2VtYW50aWNPYmopIHtcbiAgICB2YXIgdGV4dCA9IHByZXR0eShzZW1hbnRpY09iaiksXG4gICAgICAgIGh0bWwgPSBzaW1wbGVUZXh0Mmh0bWwodGV4dCk7XG5cbiAgICByZXR1cm4geyBodG1sOiBodG1sLCB0ZXh0OiB0ZXh0IH07XG59O1xuXG4vLyBwcml2YXRlXG52YXIgc2ltcGxlVGV4dDJodG1sID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHZhciBodG1sO1xuXG4gICAgaHRtbCA9ICB0ZXh0LnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoLz4vZywgJyZndDsnKS5yZXBsYWNlKC9cXG4vZywgJzxicj4nKS5yZXBsYWNlKC9cXHMvZywgJyZuYnNwOycpO1xuICAgIHJldHVybiBodG1sO1xufTtcblxudmFyIGdyb3Vwc3BhcnRzMnhtbCA9IGZ1bmN0aW9uKGdyb3VwaW5nT2JqLCBncm91cGluZ1htbCkge1xuICAgIGZvciAodmFyIHAgaW4gZ3JvdXBpbmdPYmopIHtcbiAgICAgICAgaWYgKHAgPT0gJ2dyb3VwcycpIHtcbiAgICAgICAgICAgIGdyb3VwaW5nT2JqLmdyb3Vwcy5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBpbmdYbWwgKz0gJzxncm91cCBuYW1lPVwiJyArIGdyb3VwLm5hbWUgKyAnXCInO1xuXG4gICAgICAgICAgICAgICAgaWYgKGdyb3VwLm5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBpbmdYbWwgKz0gJyBub2RlPVwiJyArIGdyb3VwLm5vZGUgKyAnXCI+JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBncm91cGluZ1htbCArPSAnPic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZ3JvdXBpbmdYbWwgPSBncm91cHNwYXJ0czJ4bWwoZ3JvdXAsIGdyb3VwaW5nWG1sKTtcbiAgICAgICAgICAgICAgICBncm91cGluZ1htbCArPSAnPC9ncm91cD4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAocCA9PSAncGFydHMnKSB7XG4gICAgICAgICAgICBncm91cGluZ09iai5wYXJ0cy5mb3JFYWNoKGZ1bmN0aW9uKHBhcnQpIHtcbiAgICAgICAgICAgICAgICBncm91cGluZ1htbCArPSAnPHBhcnQgbm9kZT1cIicgKyBwYXJ0ICsgJ1wiLz4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZ3JvdXBpbmdYbWw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnMmpzOiBnMmpzLmdyb3VwaW5nMmpzLFxuICAgIGcyaHRtbDogZ3JvdXBpbmcyaHRtbCxcbiAgICBnbzJodG1sOiBncm91cGluZ09iajJodG1sLFxuICAgIGdvMnhtbDogZ3JvdXBpbmdPYmoyeG1sLFxuICAgIGd4Mmh0bWw6IGdyb3VwaW5nWG1sMmh0bWwsXG4gICAgZGFlMmc6IGRhZTJnLmRhZTJncm91cGluZyxcbiAgICBzMmpzOiBzMmpzLnNlbWFudGljMmpzLFxuICAgIHMyaHRtbDogc2VtYW50aWMyaHRtbCxcbiAgICBzbzJodG1sOiBzZW1hbnRpY09iajJodG1sLFxuICAgIHMzZFBhcnNlcjogZzJqcy5wYXJzZXIsXG4gICAgZGFlUGFyc2VyOiBkYWUyZy5wYXJzZXJcbn07XG5cbnRyeSB7XG4gICAgd2luZG93LkcySlMgPSBtb2R1bGUuZXhwb3J0cztcbn0gY2F0Y2goZSkgeyB9IC8vIGlnbm9yZSBcIlJlZmVyZW5jZUVycm9yOiB3aW5kb3cgaXMgbm90IGRlZmluZWRcIiB3aGVuIHJ1bm5pbmcgb24gdGhlIHNlcnZlclxuIiwiLy8gQ29weXJpZ2h0IDIwMTUsIFNSSSBJbnRlcm5hdGlvbmFsXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHNheCA9IHJlcXVpcmUoXCJzYXhcIik7XG5cbmZ1bmN0aW9uIGRhZTJncm91cGluZyhvcHRpb25zKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHsgfSxcbiAgICAgICAgc3RyaWN0ID0gb3B0aW9ucy5zdHJpY3QgfHwgdHJ1ZSxcbiAgICAgICAgb25lcnJvciA9IG9wdGlvbnMub25lcnJvciB8fCBmdW5jdGlvbihlcnJvcikgeyAvKiBhbiBlcnJvciBoYXBwZW5lZCAqLyB9LFxuICAgICAgICBvbnRleHQgPSBvcHRpb25zLm9udGV4dCB8fCBmdW5jdGlvbih0ZXh0KSB7IC8qIGdvdCBzb21lIHRleHQuIHRleHQgaXMgdGhlIHN0cmluZyBib2R5IG9mIHRoZSB0YWcsIGNhbGxlZCB0d2ljZSBhZnRlciBvcGVuIGFuZCBiZWZvcmUgZW5kICovIH0sXG4gICAgICAgIG9uYXR0cmlidXRlID0gb3B0aW9ucy5vbmF0dHJpYnV0ZSB8fCBmdW5jdGlvbihhdHRyKSB7IC8qIGFuIGF0dHJpYnV0ZS4gIGF0dHIgaGFzIFwibmFtZVwiIGFuZCBcInZhbHVlXCIgKi8gfSxcbiAgICAgICAgb25lbmQgPSBvcHRpb25zLm9uZW5kIHx8IGZ1bmN0aW9uKCkgeyAvKiBwYXJzZXIgc3RyZWFtIGlzIGRvbmUsIGFuZCByZWFkeSB0byBoYXZlIG1vcmUgc3R1ZmYgd3JpdHRlbiB0byBpdCAqLyB9LFxuICAgICAgICBwYXJzZXIgPSBzYXgucGFyc2VyKHN0cmljdCksXG4gICAgICAgIGdyb3VwaW5nT2JqLFxuICAgICAgICBjdXJyZW50T2JqLFxuICAgICAgICBjdXJyZW50R3JvdXAsXG4gICAgICAgIGN1cnJlbnRQYXJ0LFxuICAgICAgICBiZWdpbk5vZGUgPSBmYWxzZSxcbiAgICAgICAgZW5kTm9kZSA9IGZhbHNlO1xuXG4gICAgcGFyc2VyLm9uZXJyb3IgPSBvbmVycm9yO1xuICAgIHBhcnNlci5vbnRleHQgPSBvbnRleHQ7XG5cbiAgICBwYXJzZXIub25jbG9zZXRhZyA9IGZ1bmN0aW9uKG5hbWUpIHsgLy8gY2xvc2luZyBhIHRhZy4gbmFtZSBpcyB0aGUgbmFtZSBmcm9tIG9ub3BlbnRhZyBub2RlLm5hbWVcbiAgICAgICAgaWYgKG5hbWUgPT0gJ25vZGUnKSB7XG4gICAgICAgICAgICBpZiAoYmVnaW5Ob2RlICYmICFlbmROb2RlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudE9iai5wYXJ0cyA9IGN1cnJlbnRPYmoucGFydHMgfHwgWyBdO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRPYmoucGFydHMucHVzaChjdXJyZW50UGFydCk7XG4gICAgICAgICAgICAgICAgYmVnaW5Ob2RlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZW5kTm9kZSA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBwID0gY3VycmVudE9iai5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGN1cnJlbnRPYmoucGFyZW50O1xuICAgICAgICAgICAgICAgIGN1cnJlbnRPYmogPSBwO1xuICAgICAgICAgICAgICAgIGVuZE5vZGUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBwYXJzZXIub25vcGVudGFnID0gZnVuY3Rpb24obm9kZSkgeyAvLyBvcGVuZWQgYSB0YWcuIG5vZGUgaGFzIFwibmFtZVwiIGFuZCBcImF0dHJpYnV0ZXNcIiwgaXNTZWxmQ2xvc2luZ1xuICAgICAgICBzd2l0Y2ggKG5vZGUubmFtZSkge1xuICAgICAgICBjYXNlICd2aXN1YWxfc2NlbmUnOlxuICAgICAgICAgICAgZ3JvdXBpbmdPYmoubmFtZSA9IG5vZGUuYXR0cmlidXRlcy5uYW1lO1xuICAgICAgICAgICAgY3VycmVudE9iaiA9IGdyb3VwaW5nT2JqO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ25vZGUnOlxuICAgICAgICAgICAgaWYgKGJlZ2luTm9kZSkgeyAvLyBuZXN0ZWQgbm9kZSBtZWFucyBpdCBpcyBnb3J1cGluZyBub2RlIGVsZW1lbnRzXG4gICAgICAgICAgICAgICAgY3VycmVudE9iai5ncm91cHMgPSBjdXJyZW50T2JqLmdyb3VwcyB8fCBbIF07XG4gICAgICAgICAgICAgICAgY3VycmVudE9iai5ncm91cHMucHVzaChjdXJyZW50R3JvdXApO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRHcm91cC5wYXJlbnQgPSBjdXJyZW50T2JqO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRPYmogPSBjdXJyZW50R3JvdXA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJlZ2luTm9kZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgZW5kTm9kZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjdXJyZW50R3JvdXAgPSB7IG5hbWU6IG5vZGUuYXR0cmlidXRlcy5uYW1lLCBub2RlOiBub2RlLmF0dHJpYnV0ZXMubmFtZSwgcGFyZW50OiB1bmRlZmluZWQgfTsgLy8gcGFyZW50IGlzIGEgdGVtcG9yYXJ5IHJlZmVyZW5jZSwgcmVtb3ZlZCBvbiBlbmRpbmcgdGhlIGdyb3VwXG4gICAgICAgICAgICBjdXJyZW50UGFydCA9IG5vZGUuYXR0cmlidXRlcy5uYW1lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcGFyc2VyLm9uYXR0cmlidXRlID0gb25hdHRyaWJ1dGU7XG4gICAgcGFyc2VyLm9uZW5kID0gb25lbmQ7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBkYWUyZ3JvdXBpbmc6IGZ1bmN0aW9uKHhtbCkge1xuICAgICAgICAgICAgZ3JvdXBpbmdPYmogPSB7IH07XG4gICAgICAgICAgICBwYXJzZXIud3JpdGUoeG1sKS5jbG9zZSgpO1xuICAgICAgICAgICAgcmV0dXJuIGdyb3VwaW5nT2JqO1xuICAgICAgICB9LFxuICAgICAgICBwYXJzZXI6IHBhcnNlclxuICAgIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRhZTJncm91cGluZztcbiIsIi8vIENvcHlyaWdodCAyMDE1LCBTUkkgSW50ZXJuYXRpb25hbFxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzYXggPSByZXF1aXJlKFwic2F4XCIpO1xuXG5mdW5jdGlvbiBncm91cGluZzJqcyhvcHRpb25zKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHsgfSxcbiAgICAgICAgc3RyaWN0ID0gb3B0aW9ucy5zdHJpY3QgfHwgdHJ1ZSxcbiAgICAgICAgb25lcnJvciA9IG9wdGlvbnMub25lcnJvciB8fCBmdW5jdGlvbihlcnJvcikgeyAvKiBhbiBlcnJvciBoYXBwZW5lZCAqLyB9LFxuICAgICAgICBvbnRleHQgPSBvcHRpb25zLm9udGV4dCB8fCBmdW5jdGlvbih0ZXh0KSB7IC8qIGdvdCBzb21lIHRleHQuIHRleHQgaXMgdGhlIHN0cmluZyBib2R5IG9mIHRoZSB0YWcsIGNhbGxlZCB0d2ljZSBhZnRlciBvcGVuIGFuZCBiZWZvcmUgZW5kICAqLyB9LFxuICAgICAgICBvbmF0dHJpYnV0ZSA9IG9wdGlvbnMub25hdHRyaWJ1dGUgfHwgZnVuY3Rpb24oYXR0cikgeyAvKiBhbiBhdHRyaWJ1dGUuICBhdHRyIGhhcyBcIm5hbWVcIiBhbmQgXCJ2YWx1ZVwiICovIH0sXG4gICAgICAgIG9uZW5kID0gb3B0aW9ucy5vbmVuZCB8fCBmdW5jdGlvbigpIHsgLyogcGFyc2VyIHN0cmVhbSBpcyBkb25lLCBhbmQgcmVhZHkgdG8gaGF2ZSBtb3JlIHN0dWZmIHdyaXR0ZW4gdG8gaXQgKi8gfSxcbiAgICAgICAgcGFyc2VyID0gc2F4LnBhcnNlcihzdHJpY3QpLFxuICAgICAgICBncm91cGluZ09iaixcbiAgICAgICAgY3VycmVudE9iaixcbiAgICAgICAgYmVnaW5Hcm91cGluZyA9IGZhbHNlO1xuXG4gICAgcGFyc2VyLm9uZXJyb3IgPSBvbmVycm9yO1xuICAgIHBhcnNlci5vbnRleHQgPSBvbnRleHQ7XG5cbiAgICBwYXJzZXIub25jbG9zZXRhZyA9IGZ1bmN0aW9uKG5hbWUpIHsgLy8gY2xvc2luZyBhIHRhZy4gbmFtZSBpcyB0aGUgbmFtZSBmcm9tIG9ub3BlbnRhZyBub2RlLm5hbWVcbiAgICAgICAgaWYgKCFiZWdpbkdyb3VwaW5nKSByZXR1cm47XG5cbiAgICAgICAgaWYgKG5hbWUgPT0gJ2dyb3VwJykge1xuICAgICAgICAgICAgdmFyIHAgPSBjdXJyZW50T2JqLnBhcmVudDtcbiAgICAgICAgICAgIGRlbGV0ZSBjdXJyZW50T2JqLnBhcmVudDtcbiAgICAgICAgICAgIGN1cnJlbnRPYmogPSBwO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHBhcnNlci5vbm9wZW50YWcgPSBmdW5jdGlvbihub2RlKSB7IC8vIG9wZW5lZCBhIHRhZy4gbm9kZSBoYXMgXCJuYW1lXCIgYW5kIFwiYXR0cmlidXRlc1wiLCBpc1NlbGZDbG9zaW5nXG4gICAgICAgIHN3aXRjaCAobm9kZS5uYW1lKSB7XG4gICAgICAgIGNhc2UgJ2dyb3VwaW5nJzpcbiAgICAgICAgICAgIGdyb3VwaW5nT2JqLm5hbWUgPSBub2RlLmF0dHJpYnV0ZXMubmFtZTtcbiAgICAgICAgICAgIGN1cnJlbnRPYmogPSBncm91cGluZ09iajtcbiAgICAgICAgICAgIGJlZ2luR3JvdXBpbmcgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2dyb3VwJzpcbiAgICAgICAgICAgIGlmICghYmVnaW5Hcm91cGluZykgYnJlYWs7XG5cbiAgICAgICAgICAgIHZhciBnID0geyBuYW1lOiBub2RlLmF0dHJpYnV0ZXMubmFtZSwgbm9kZTogbm9kZS5hdHRyaWJ1dGVzLm5vZGUgfTtcblxuICAgICAgICAgICAgY3VycmVudE9iai5ncm91cHMgPSBjdXJyZW50T2JqLmdyb3VwcyB8fCBbIF07XG4gICAgICAgICAgICBjdXJyZW50T2JqLmdyb3Vwcy5wdXNoKGcpO1xuICAgICAgICAgICAgZy5wYXJlbnQgPSBjdXJyZW50T2JqO1xuICAgICAgICAgICAgY3VycmVudE9iaiA9IGc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncGFydCc6XG4gICAgICAgICAgICBpZiAoIWJlZ2luR3JvdXBpbmcpIGJyZWFrO1xuXG4gICAgICAgICAgICBjdXJyZW50T2JqLnBhcnRzID0gY3VycmVudE9iai5wYXJ0cyB8fCBbIF07XG4gICAgICAgICAgICBjdXJyZW50T2JqLnBhcnRzLnB1c2gobm9kZS5hdHRyaWJ1dGVzLm5vZGUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcGFyc2VyLm9uYXR0cmlidXRlID0gb25hdHRyaWJ1dGU7XG4gICAgcGFyc2VyLm9uZW5kID0gb25lbmQ7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBncm91cGluZzJqczogZnVuY3Rpb24oeG1sKSB7XG4gICAgICAgICAgICBncm91cGluZ09iaiA9IHsgfTtcbiAgICAgICAgICAgIHBhcnNlci53cml0ZSh4bWwpLmNsb3NlKCk7XG4gICAgICAgICAgICByZXR1cm4gZ3JvdXBpbmdPYmo7XG4gICAgICAgIH0sXG4gICAgICAgIHBhcnNlcjogcGFyc2VyXG4gICAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZ3JvdXBpbmcyanM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzYXggPSByZXF1aXJlKFwic2F4XCIpO1xuXG5mdW5jdGlvbiBzZW1hbnRpYzJqcyhvcHRpb25zKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHsgfSxcbiAgICAgICAgc3RyaWN0ID0gb3B0aW9ucy5zdHJpY3QgfHwgdHJ1ZSxcbiAgICAgICAgb25lcnJvciA9IG9wdGlvbnMub25lcnJvciB8fCBmdW5jdGlvbihlcnJvcikgeyAvKiBhbiBlcnJvciBoYXBwZW5lZC4gKi8gfSxcbiAgICAgICAgb25hdHRyaWJ1dGUgPSBvcHRpb25zLm9uYXR0cmlidXRlIHx8IGZ1bmN0aW9uKGF0dHIpIHsgLyogYW4gYXR0cmlidXRlLiAgYXR0ciBoYXMgXCJuYW1lXCIgYW5kIFwidmFsdWVcIiAqLyB9LFxuICAgICAgICBvbmVuZCA9IG9wdGlvbnMub25lbmQgfHwgZnVuY3Rpb24oKSB7IC8qIHBhcnNlciBzdHJlYW0gaXMgZG9uZSwgYW5kIHJlYWR5IHRvIGhhdmUgbW9yZSBzdHVmZiB3cml0dGVuIHRvIGl0LiAqLyB9LFxuICAgICAgICBwYXJzZXIgPSBzYXgucGFyc2VyKHN0cmljdCksXG4gICAgICAgIHNlbWFudGljT2JqLFxuICAgICAgICBjdXJyZW50T2JqLFxuICAgICAgICBjdXJyZW50Tm9kZSxcbiAgICAgICAgYmVnaW5TM0QgPSBmYWxzZSxcbiAgICAgICAgYmVnaW5PbnRleHQgPSBmYWxzZTs7XG5cbiAgICBwYXJzZXIub25lcnJvciA9IG9uZXJyb3I7XG5cbiAgICBwYXJzZXIub250ZXh0ID0gZnVuY3Rpb24odGV4dCkgeyAvLyBnb3Qgc29tZSB0ZXh0LiB0ZXh0IGlzIHRoZSBzdHJpbmcgYm9keSBvZiB0aGUgdGFnLCBjYWxsZWQgdHdpY2UgYWZ0ZXIgb3BlbiBhbmQgYmVmb3JlIGVuZCBcbiAgICAgICAgaWYgKCFiZWdpblMzRCkgcmV0dXJuO1xuXG4gICAgICAgIGJlZ2luT250ZXh0ID0gIWJlZ2luT250ZXh0O1xuXG4gICAgICAgIGlmICghYmVnaW5PbnRleHQpIHJldHVybjtcblxuICAgICAgICBzd2l0Y2ggKGN1cnJlbnROb2RlKSB7XG4gICAgICAgIGNhc2UgJ2Rlc2NyaXB0aW9uJzpcbiAgICAgICAgICAgIGN1cnJlbnRPYmouZGVzY3JpcHRpb24gPSB0ZXh0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2F1dGhvcic6XG4gICAgICAgICAgICBjdXJyZW50T2JqLmF1dGhvciA9IHRleHQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY3JlYXRlZCc6XG4gICAgICAgICAgICBjdXJyZW50T2JqLmNyZWF0ZWQgPSB0ZXh0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ21vZGlmaWVkJzpcbiAgICAgICAgICAgIGN1cnJlbnRPYmoubW9kaWZpZWQgPSB0ZXh0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcGFyc2VyLm9uY2xvc2V0YWcgPSBmdW5jdGlvbihuYW1lKSB7IC8vIGNsb3NpbmcgYSB0YWcuIG5hbWUgaXMgdGhlIG5hbWUgZnJvbSBvbm9wZW50YWcgbm9kZS5uYW1lXG4gICAgICAgIGlmICghYmVnaW5TM0QpIHJldHVybjtcblxuICAgICAgICBjdXJyZW50Tm9kZSA9IG5hbWU7XG5cbiAgICAgICAgaWYgKG5hbWUgPT0gJ2hlYWQnKSBjdXJyZW50T2JqID0gc2VtYW50aWNPYmo7XG4gICAgICAgIGVsc2UgaWYgKG5hbWUgPT0gJ3NlbWFudGljX21hcHBpbmcnKSBiZWdpblMzRCA9IGZhbHNlO1xuICAgIH07XG5cbiAgICBwYXJzZXIub25vcGVudGFnID0gZnVuY3Rpb24obm9kZSkgeyAvLyBvcGVuZWQgYSB0YWcuIG5vZGUgaGFzIFwibmFtZVwiIGFuZCBcImF0dHJpYnV0ZXNcIiwgaXNTZWxmQ2xvc2luZ1xuICAgICAgICBjdXJyZW50Tm9kZSA9IG5vZGUubmFtZTtcblxuICAgICAgICBpZiAoY3VycmVudE5vZGUgPT0gJ1MzRCcpIGJlZ2luUzNEID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIWJlZ2luUzNEKSByZXR1cm47XG5cbiAgICAgICAgc3dpdGNoIChjdXJyZW50Tm9kZSkge1xuICAgICAgICBjYXNlICdTM0QnOlxuICAgICAgICAgICAgY3VycmVudE9iaiA9IHNlbWFudGljT2JqO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2hlYWQnOlxuICAgICAgICAgICAgY3VycmVudE9iai5oZWFkID0geyB9O1xuICAgICAgICAgICAgY3VycmVudE9iaiA9IGN1cnJlbnRPYmouaGVhZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZXNjcmlwdGlvbic6XG4gICAgICAgICAgICBjdXJyZW50T2JqLmRlc2NyaXB0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2F1dGhvcic6XG4gICAgICAgICAgICBjdXJyZW50T2JqLmF1dGhvciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjcmVhdGVkJzpcbiAgICAgICAgICAgIGN1cnJlbnRPYmouY3JlYXRlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdtb2RpZmllZCc6XG4gICAgICAgICAgICBjdXJyZW50T2JqLm1vZGlmaWVkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Zsb3JhX2Jhc2UnOlxuICAgICAgICAgICAgY3VycmVudE9iai5mbG9yYV9iYXNlID0ge1xuICAgICAgICAgICAgICAgIGlkOiBub2RlLmF0dHJpYnV0ZXMuaWQsXG4gICAgICAgICAgICAgICAgdXJpOiBub2RlLmF0dHJpYnV0ZXMudXJpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3NlbWFudGljX21hcHBpbmcnOlxuICAgICAgICAgICAgY3VycmVudE9iai5zZW1hbnRpY19tYXBwaW5nID0geyB9O1xuICAgICAgICAgICAgY3VycmVudE9iaiA9IGN1cnJlbnRPYmouc2VtYW50aWNfbWFwcGluZztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdhc3NldCc6XG4gICAgICAgICAgICBjdXJyZW50T2JqLmFzc2V0ID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUuYXR0cmlidXRlcy5uYW1lLFxuICAgICAgICAgICAgICAgIHVyaTogbm9kZS5hdHRyaWJ1dGVzLnVyaSxcbiAgICAgICAgICAgICAgICBzaWQ6IG5vZGUuYXR0cmlidXRlcy5zaWQsXG4gICAgICAgICAgICAgICAgZmxvcmFfcmVmOiBub2RlLmF0dHJpYnV0ZXMuZmxvcmFfcmVmLFxuICAgICAgICAgICAgICAgIGdyb3VwczogWyBdLFxuICAgICAgICAgICAgICAgIG9ianM6IFsgXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGN1cnJlbnRPYmogPSBjdXJyZW50T2JqLmFzc2V0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2dyb3VwJzpcbiAgICAgICAgICAgIGN1cnJlbnRPYmouZ3JvdXBzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUuYXR0cmlidXRlcy5uYW1lLFxuICAgICAgICAgICAgICAgIG5vZGU6IG5vZGUuYXR0cmlidXRlcy5ub2RlLFxuICAgICAgICAgICAgICAgIHNpZDogbm9kZS5hdHRyaWJ1dGVzLnNpZCxcbiAgICAgICAgICAgICAgICBmbG9yYV9yZWY6IG5vZGUuYXR0cmlidXRlcy5mbG9yYV9yZWZcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICBjdXJyZW50T2JqLm9ianMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogbm9kZS5hdHRyaWJ1dGVzLm5hbWUsXG4gICAgICAgICAgICAgICAgbm9kZTogbm9kZS5hdHRyaWJ1dGVzLm5vZGUsXG4gICAgICAgICAgICAgICAgc2lkOiBub2RlLmF0dHJpYnV0ZXMuc2lkLFxuICAgICAgICAgICAgICAgIGZsb3JhX3JlZjogbm9kZS5hdHRyaWJ1dGVzLmZsb3JhX3JlZlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBwYXJzZXIub25hdHRyaWJ1dGUgPSBvbmF0dHJpYnV0ZTtcbiAgICBwYXJzZXIub25lbmQgPSBvbmVuZDtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHNlbWFudGljMmpzOiBmdW5jdGlvbih4bWwpIHtcbiAgICAgICAgICAgIHNlbWFudGljT2JqID0geyB9O1xuICAgICAgICAgICAgcGFyc2VyLndyaXRlKHhtbCkuY2xvc2UoKTtcbiAgICAgICAgICAgIHJldHVybiBzZW1hbnRpY09iajtcbiAgICAgICAgfSxcbiAgICAgICAgcGFyc2VyOiBwYXJzZXJcbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzZW1hbnRpYzJqcztcbiIsIi8qKlxuVGhlIGZvbGxvd2luZyBiYXRjaGVzIGFyZSBlcXVpdmFsZW50OlxuXG52YXIgYmVhdXRpZnlfanMgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpO1xudmFyIGJlYXV0aWZ5X2pzID0gcmVxdWlyZSgnanMtYmVhdXRpZnknKS5qcztcbnZhciBiZWF1dGlmeV9qcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuanNfYmVhdXRpZnk7XG5cbnZhciBiZWF1dGlmeV9jc3MgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmNzcztcbnZhciBiZWF1dGlmeV9jc3MgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmNzc19iZWF1dGlmeTtcblxudmFyIGJlYXV0aWZ5X2h0bWwgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmh0bWw7XG52YXIgYmVhdXRpZnlfaHRtbCA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuaHRtbF9iZWF1dGlmeTtcblxuQWxsIG1ldGhvZHMgcmV0dXJuZWQgYWNjZXB0IHR3byBhcmd1bWVudHMsIHRoZSBzb3VyY2Ugc3RyaW5nIGFuZCBhbiBvcHRpb25zIG9iamVjdC5cbioqL1xuXG5mdW5jdGlvbiBnZXRfYmVhdXRpZnkoanNfYmVhdXRpZnksIGNzc19iZWF1dGlmeSwgaHRtbF9iZWF1dGlmeSkge1xuICAgIC8vIHRoZSBkZWZhdWx0IGlzIGpzXG4gICAgdmFyIGJlYXV0aWZ5ID0gZnVuY3Rpb24gKHNyYywgY29uZmlnKSB7XG4gICAgICAgIHJldHVybiBqc19iZWF1dGlmeS5qc19iZWF1dGlmeShzcmMsIGNvbmZpZyk7XG4gICAgfTtcblxuICAgIC8vIHNob3J0IGFsaWFzZXNcbiAgICBiZWF1dGlmeS5qcyAgID0ganNfYmVhdXRpZnkuanNfYmVhdXRpZnk7XG4gICAgYmVhdXRpZnkuY3NzICA9IGNzc19iZWF1dGlmeS5jc3NfYmVhdXRpZnk7XG4gICAgYmVhdXRpZnkuaHRtbCA9IGh0bWxfYmVhdXRpZnkuaHRtbF9iZWF1dGlmeTtcblxuICAgIC8vIGxlZ2FjeSBhbGlhc2VzXG4gICAgYmVhdXRpZnkuanNfYmVhdXRpZnkgICA9IGpzX2JlYXV0aWZ5LmpzX2JlYXV0aWZ5O1xuICAgIGJlYXV0aWZ5LmNzc19iZWF1dGlmeSAgPSBjc3NfYmVhdXRpZnkuY3NzX2JlYXV0aWZ5O1xuICAgIGJlYXV0aWZ5Lmh0bWxfYmVhdXRpZnkgPSBodG1sX2JlYXV0aWZ5Lmh0bWxfYmVhdXRpZnk7XG5cbiAgICByZXR1cm4gYmVhdXRpZnk7XG59XG5cbmlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFkZCBzdXBwb3J0IGZvciBBTUQgKCBodHRwczovL2dpdGh1Yi5jb20vYW1kanMvYW1kanMtYXBpL3dpa2kvQU1EI2RlZmluZWFtZC1wcm9wZXJ0eS0gKVxuICAgIGRlZmluZShbXG4gICAgICAgIFwiLi9saWIvYmVhdXRpZnlcIixcbiAgICAgICAgXCIuL2xpYi9iZWF1dGlmeS1jc3NcIixcbiAgICAgICAgXCIuL2xpYi9iZWF1dGlmeS1odG1sXCJcbiAgICBdLCBmdW5jdGlvbihqc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LCBodG1sX2JlYXV0aWZ5KSB7XG4gICAgICAgIHJldHVybiBnZXRfYmVhdXRpZnkoanNfYmVhdXRpZnksIGNzc19iZWF1dGlmeSwgaHRtbF9iZWF1dGlmeSk7XG4gICAgfSk7XG59IGVsc2Uge1xuICAgIChmdW5jdGlvbihtb2QpIHtcbiAgICAgICAgdmFyIGpzX2JlYXV0aWZ5ID0gcmVxdWlyZSgnLi9saWIvYmVhdXRpZnknKTtcbiAgICAgICAgdmFyIGNzc19iZWF1dGlmeSA9IHJlcXVpcmUoJy4vbGliL2JlYXV0aWZ5LWNzcycpO1xuICAgICAgICB2YXIgaHRtbF9iZWF1dGlmeSA9IHJlcXVpcmUoJy4vbGliL2JlYXV0aWZ5LWh0bWwnKTtcblxuICAgICAgICBtb2QuZXhwb3J0cyA9IGdldF9iZWF1dGlmeShqc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LCBodG1sX2JlYXV0aWZ5KTtcblxuICAgIH0pKG1vZHVsZSk7XG59XG5cbiIsIi8qanNoaW50IGN1cmx5OnRydWUsIGVxZXFlcTp0cnVlLCBsYXhicmVhazp0cnVlLCBub2VtcHR5OmZhbHNlICovXG4vKlxuXG4gIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gIENvcHlyaWdodCAoYykgMjAwNy0yMDEzIEVpbmFyIExpZWxtYW5pcyBhbmQgY29udHJpYnV0b3JzLlxuXG4gIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzXG4gICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbiAgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCxcbiAgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG4gIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlNcbiAgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4gIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAgU09GVFdBUkUuXG5cblxuIENTUyBCZWF1dGlmaWVyXG4tLS0tLS0tLS0tLS0tLS1cblxuICAgIFdyaXR0ZW4gYnkgSGFydXR5dW4gQW1pcmphbnlhbiwgKGFtaXJqYW55YW5AZ21haWwuY29tKVxuXG4gICAgQmFzZWQgb24gY29kZSBpbml0aWFsbHkgZGV2ZWxvcGVkIGJ5OiBFaW5hciBMaWVsbWFuaXMsIDxlaW5hckBqc2JlYXV0aWZpZXIub3JnPlxuICAgICAgICBodHRwOi8vanNiZWF1dGlmaWVyLm9yZy9cblxuICAgIFVzYWdlOlxuICAgICAgICBjc3NfYmVhdXRpZnkoc291cmNlX3RleHQpO1xuICAgICAgICBjc3NfYmVhdXRpZnkoc291cmNlX3RleHQsIG9wdGlvbnMpO1xuXG4gICAgVGhlIG9wdGlvbnMgYXJlIChkZWZhdWx0IGluIGJyYWNrZXRzKTpcbiAgICAgICAgaW5kZW50X3NpemUgKDQpICAgICAgICAgICAgICAgICAgIOKAlCBpbmRlbnRhdGlvbiBzaXplLFxuICAgICAgICBpbmRlbnRfY2hhciAoc3BhY2UpICAgICAgICAgICAgICAg4oCUIGNoYXJhY3RlciB0byBpbmRlbnQgd2l0aCxcbiAgICAgICAgc2VsZWN0b3Jfc2VwYXJhdG9yX25ld2xpbmUgKHRydWUpIC0gc2VwYXJhdGUgc2VsZWN0b3JzIHdpdGggbmV3bGluZSBvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3QgKGUuZy4gXCJhLFxcbmJyXCIgb3IgXCJhLCBiclwiKVxuICAgICAgICBlbmRfd2l0aF9uZXdsaW5lIChmYWxzZSkgICAgICAgICAgLSBlbmQgd2l0aCBhIG5ld2xpbmVcblxuICAgIGUuZ1xuXG4gICAgY3NzX2JlYXV0aWZ5KGNzc19zb3VyY2VfdGV4dCwge1xuICAgICAgJ2luZGVudF9zaXplJzogMSxcbiAgICAgICdpbmRlbnRfY2hhcic6ICdcXHQnLFxuICAgICAgJ3NlbGVjdG9yX3NlcGFyYXRvcic6ICcgJyxcbiAgICAgICdlbmRfd2l0aF9uZXdsaW5lJzogZmFsc2UsXG4gICAgfSk7XG4qL1xuXG4vLyBodHRwOi8vd3d3LnczLm9yZy9UUi9DU1MyMS9zeW5kYXRhLmh0bWwjdG9rZW5pemF0aW9uXG4vLyBodHRwOi8vd3d3LnczLm9yZy9UUi9jc3MzLXN5bnRheC9cblxuKGZ1bmN0aW9uKCkge1xuICAgIGZ1bmN0aW9uIGNzc19iZWF1dGlmeShzb3VyY2VfdGV4dCwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdmFyIGluZGVudFNpemUgPSBvcHRpb25zLmluZGVudF9zaXplIHx8IDQ7XG4gICAgICAgIHZhciBpbmRlbnRDaGFyYWN0ZXIgPSBvcHRpb25zLmluZGVudF9jaGFyIHx8ICcgJztcbiAgICAgICAgdmFyIHNlbGVjdG9yU2VwYXJhdG9yTmV3bGluZSA9IChvcHRpb25zLnNlbGVjdG9yX3NlcGFyYXRvcl9uZXdsaW5lID09PSB1bmRlZmluZWQpID8gdHJ1ZSA6IG9wdGlvbnMuc2VsZWN0b3Jfc2VwYXJhdG9yX25ld2xpbmU7XG4gICAgICAgIHZhciBlbmRfd2l0aF9uZXdsaW5lID0gKG9wdGlvbnMuZW5kX3dpdGhfbmV3bGluZSA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5lbmRfd2l0aF9uZXdsaW5lO1xuXG4gICAgICAgIC8vIGNvbXBhdGliaWxpdHlcbiAgICAgICAgaWYgKHR5cGVvZiBpbmRlbnRTaXplID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBpbmRlbnRTaXplID0gcGFyc2VJbnQoaW5kZW50U2l6ZSwgMTApO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyB0b2tlbml6ZXJcbiAgICAgICAgdmFyIHdoaXRlUmUgPSAvXlxccyskLztcbiAgICAgICAgdmFyIHdvcmRSZSA9IC9bXFx3JFxcLV9dLztcblxuICAgICAgICB2YXIgcG9zID0gLTEsXG4gICAgICAgICAgICBjaDtcblxuICAgICAgICBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VfdGV4dC5jaGFyQXQoKytwb3MpO1xuICAgICAgICAgICAgcmV0dXJuIGNoIHx8ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcGVlayhza2lwV2hpdGVzcGFjZSkge1xuICAgICAgICAgICAgdmFyIHByZXZfcG9zID0gcG9zO1xuICAgICAgICAgICAgaWYgKHNraXBXaGl0ZXNwYWNlKSB7XG4gICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0ID0gc291cmNlX3RleHQuY2hhckF0KHBvcyArIDEpIHx8ICcnO1xuICAgICAgICAgICAgcG9zID0gcHJldl9wb3MgLSAxO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVhdFN0cmluZyhlbmRDaGFycykge1xuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gcG9zO1xuICAgICAgICAgICAgd2hpbGUgKG5leHQoKSkge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5kQ2hhcnMuaW5kZXhPZihjaCkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09IFwiXFxuXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZV90ZXh0LnN1YnN0cmluZyhzdGFydCwgcG9zICsgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwZWVrU3RyaW5nKGVuZENoYXIpIHtcbiAgICAgICAgICAgIHZhciBwcmV2X3BvcyA9IHBvcztcbiAgICAgICAgICAgIHZhciBzdHIgPSBlYXRTdHJpbmcoZW5kQ2hhcik7XG4gICAgICAgICAgICBwb3MgPSBwcmV2X3BvcyAtIDE7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZWF0V2hpdGVzcGFjZSgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSAnJztcbiAgICAgICAgICAgIHdoaWxlICh3aGl0ZVJlLnRlc3QocGVlaygpKSkge1xuICAgICAgICAgICAgICAgIG5leHQoKVxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBza2lwV2hpdGVzcGFjZSgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSAnJztcbiAgICAgICAgICAgIGlmIChjaCAmJiB3aGl0ZVJlLnRlc3QoY2gpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAod2hpdGVSZS50ZXN0KG5leHQoKSkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gY2hcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlYXRDb21tZW50KHNpbmdsZUxpbmUpIHtcbiAgICAgICAgICAgIHZhciBzdGFydCA9IHBvcztcbiAgICAgICAgICAgIHZhciBzaW5nbGVMaW5lID0gcGVlaygpID09PSBcIi9cIjtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIHdoaWxlIChuZXh0KCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXNpbmdsZUxpbmUgJiYgY2ggPT09IFwiKlwiICYmIHBlZWsoKSA9PT0gXCIvXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNpbmdsZUxpbmUgJiYgY2ggPT09IFwiXFxuXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZV90ZXh0LnN1YnN0cmluZyhzdGFydCwgcG9zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzb3VyY2VfdGV4dC5zdWJzdHJpbmcoc3RhcnQsIHBvcykgKyBjaDtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gbG9va0JhY2soc3RyKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlX3RleHQuc3Vic3RyaW5nKHBvcyAtIHN0ci5sZW5ndGgsIHBvcykudG9Mb3dlckNhc2UoKSA9PT1cbiAgICAgICAgICAgICAgICBzdHI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXN0ZWQgcHNldWRvLWNsYXNzIGlmIHdlIGFyZSBpbnNpZGVSdWxlXG4gICAgICAgIC8vIGFuZCB0aGUgbmV4dCBzcGVjaWFsIGNoYXJhY3RlciBmb3VuZCBvcGVuc1xuICAgICAgICAvLyBhIG5ldyBibG9ja1xuICAgICAgICBmdW5jdGlvbiBmb3VuZE5lc3RlZFBzZXVkb0NsYXNzKCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IHBvcyArIDE7IGkgPCBzb3VyY2VfdGV4dC5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgdmFyIGNoID0gc291cmNlX3RleHQuY2hhckF0KGkpO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gXCJ7XCIpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSBcIjtcIiB8fCBjaCA9PT0gXCJ9XCIgfHwgY2ggPT09IFwiKVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwcmludGVyXG4gICAgICAgIHZhciBiYXNlYmFzZUluZGVudFN0cmluZyA9IHNvdXJjZV90ZXh0Lm1hdGNoKC9eW1xcdCBdKi8pWzBdO1xuICAgICAgICB2YXIgc2luZ2xlSW5kZW50ID0gbmV3IEFycmF5KGluZGVudFNpemUgKyAxKS5qb2luKGluZGVudENoYXJhY3Rlcik7XG4gICAgICAgIHZhciBpbmRlbnRMZXZlbCA9IDA7XG4gICAgICAgIHZhciBuZXN0ZWRMZXZlbCA9IDA7XG5cbiAgICAgICAgZnVuY3Rpb24gaW5kZW50KCkge1xuICAgICAgICAgICAgaW5kZW50TGV2ZWwrKztcbiAgICAgICAgICAgIGJhc2ViYXNlSW5kZW50U3RyaW5nICs9IHNpbmdsZUluZGVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG91dGRlbnQoKSB7XG4gICAgICAgICAgICBpbmRlbnRMZXZlbC0tO1xuICAgICAgICAgICAgYmFzZWJhc2VJbmRlbnRTdHJpbmcgPSBiYXNlYmFzZUluZGVudFN0cmluZy5zbGljZSgwLCAtaW5kZW50U2l6ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJpbnQgPSB7fTtcbiAgICAgICAgcHJpbnRbXCJ7XCJdID0gZnVuY3Rpb24oY2gpIHtcbiAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgIH07XG4gICAgICAgIHByaW50W1wifVwiXSA9IGZ1bmN0aW9uKGNoKSB7XG4gICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJpbnQuX2xhc3RDaGFyV2hpdGVzcGFjZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHdoaXRlUmUudGVzdChvdXRwdXRbb3V0cHV0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgfTtcblxuICAgICAgICBwcmludC5uZXdMaW5lID0gZnVuY3Rpb24oa2VlcFdoaXRlc3BhY2UpIHtcbiAgICAgICAgICAgIGlmICgha2VlcFdoaXRlc3BhY2UpIHtcbiAgICAgICAgICAgICAgICBwcmludC50cmltKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvdXRwdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goJ1xcbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGJhc2ViYXNlSW5kZW50U3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goYmFzZWJhc2VJbmRlbnRTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBwcmludC5zaW5nbGVTcGFjZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKG91dHB1dC5sZW5ndGggJiYgIXByaW50Ll9sYXN0Q2hhcldoaXRlc3BhY2UoKSkge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKCcgJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcHJpbnQudHJpbSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgd2hpbGUgKHByaW50Ll9sYXN0Q2hhcldoaXRlc3BhY2UoKSkge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wb3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBcbiAgICAgICAgdmFyIG91dHB1dCA9IFtdO1xuICAgICAgICBpZiAoYmFzZWJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgIG91dHB1dC5wdXNoKGJhc2ViYXNlSW5kZW50U3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICAvKl9fX19fX19fX19fX19fX19fX19fXy0tLS0tLS0tLS0tLS0tLS0tLS0tX19fX19fX19fX19fX19fX19fX19fKi9cblxuICAgICAgICB2YXIgaW5zaWRlUnVsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgZW50ZXJpbmdDb25kaXRpb25hbEdyb3VwID0gZmFsc2U7XG4gICAgICAgIHZhciB0b3BfY2ggPSAnJztcbiAgICAgICAgdmFyIGxhc3RfdG9wX2NoID0gJyc7XG5cbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHZhciB3aGl0ZXNwYWNlID0gc2tpcFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgIHZhciBpc0FmdGVyU3BhY2UgPSB3aGl0ZXNwYWNlICE9PSAnJztcbiAgICAgICAgICAgIHZhciBpc0FmdGVyTmV3bGluZSA9IHdoaXRlc3BhY2UuaW5kZXhPZignXFxuJykgIT09IC0xO1xuICAgICAgICAgICAgdmFyIGxhc3RfdG9wX2NoID0gdG9wX2NoO1xuICAgICAgICAgICAgdmFyIHRvcF9jaCA9IGNoO1xuXG4gICAgICAgICAgICBpZiAoIWNoKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycgJiYgcGVlaygpID09PSAnKicpIHsgLyogY3NzIGNvbW1lbnQgKi9cbiAgICAgICAgICAgICAgICB2YXIgaGVhZGVyID0gbG9va0JhY2soXCJcIik7XG4gICAgICAgICAgICAgICAgcHJpbnQubmV3TGluZSgpO1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGVhdENvbW1lbnQoKSk7XG4gICAgICAgICAgICAgICAgcHJpbnQubmV3TGluZSgpO1xuICAgICAgICAgICAgICAgIGlmIChoZWFkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQubmV3TGluZSh0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycgJiYgcGVlaygpID09PSAnLycpIHsgLy8gc2luZ2xlIGxpbmUgY29tbWVudFxuICAgICAgICAgICAgICAgIGlmICghaXNBZnRlck5ld2xpbmUgJiYgbGFzdF90b3BfY2ggIT09ICd7Jykge1xuICAgICAgICAgICAgICAgICAgICBwcmludC50cmltKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goZWF0Q29tbWVudCgpKTtcbiAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnQCcpIHtcbiAgICAgICAgICAgICAgICAvLyBwYXNzIGFsb25nIHRoZSBzcGFjZSB3ZSBmb3VuZCBhcyBhIHNlcGFyYXRlIGl0ZW1cbiAgICAgICAgICAgICAgICBpZiAoaXNBZnRlclNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0cmlwIHRyYWlsaW5nIHNwYWNlLCBpZiBwcmVzZW50LCBmb3IgaGFzaCBwcm9wZXJ0eSBjaGVja3NcbiAgICAgICAgICAgICAgICB2YXIgdmFyaWFibGVPclJ1bGUgPSBwZWVrU3RyaW5nKFwiOiAsO3t9KClbXS89J1xcXCJcIikucmVwbGFjZSgvXFxzJC8sICcnKTtcblxuICAgICAgICAgICAgICAgIC8vIG1pZ2h0IGJlIGEgbmVzdGluZyBhdC1ydWxlXG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlT3JSdWxlIGluIGNzc19iZWF1dGlmeS5ORVNURURfQVRfUlVMRSkge1xuICAgICAgICAgICAgICAgICAgICBuZXN0ZWRMZXZlbCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFyaWFibGVPclJ1bGUgaW4gY3NzX2JlYXV0aWZ5LkNPTkRJVElPTkFMX0dST1VQX1JVTEUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudGVyaW5nQ29uZGl0aW9uYWxHcm91cCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCc6ICcuaW5kZXhPZih2YXJpYWJsZU9yUnVsZVt2YXJpYWJsZU9yUnVsZS5sZW5ndGggLTFdKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vd2UgaGF2ZSBhIHZhcmlhYmxlLCBhZGQgaXQgYW5kIGluc2VydCBvbmUgc3BhY2UgYmVmb3JlIGNvbnRpbnVpbmdcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZU9yUnVsZSA9IGVhdFN0cmluZyhcIjogXCIpLnJlcGxhY2UoL1xccyQvLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKHZhcmlhYmxlT3JSdWxlKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAneycpIHtcbiAgICAgICAgICAgICAgICBpZiAocGVlayh0cnVlKSA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChcInt9XCIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudCgpO1xuICAgICAgICAgICAgICAgICAgICBwcmludFtcIntcIl0oY2gpO1xuICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIGVudGVyaW5nIGNvbmRpdGlvbmFsIGdyb3Vwcywgb25seSBydWxlc2V0cyBhcmUgYWxsb3dlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoZW50ZXJpbmdDb25kaXRpb25hbEdyb3VwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRlcmluZ0NvbmRpdGlvbmFsR3JvdXAgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2lkZVJ1bGUgPSAoaW5kZW50TGV2ZWwgPiBuZXN0ZWRMZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UsIGRlY2xhcmF0aW9ucyBhcmUgYWxzbyBhbGxvd2VkXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnNpZGVSdWxlID0gKGluZGVudExldmVsID49IG5lc3RlZExldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICd9Jykge1xuICAgICAgICAgICAgICAgIG91dGRlbnQoKTtcbiAgICAgICAgICAgICAgICBwcmludFtcIn1cIl0oY2gpO1xuICAgICAgICAgICAgICAgIGluc2lkZVJ1bGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAobmVzdGVkTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgbmVzdGVkTGV2ZWwtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSBcIjpcIikge1xuICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICBpZiAoKGluc2lkZVJ1bGUgfHwgZW50ZXJpbmdDb25kaXRpb25hbEdyb3VwKSAmJiBcbiAgICAgICAgICAgICAgICAgICAgICAgICEobG9va0JhY2soXCImXCIpIHx8IGZvdW5kTmVzdGVkUHNldWRvQ2xhc3MoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gJ3Byb3BlcnR5OiB2YWx1ZScgZGVsaW1pdGVyXG4gICAgICAgICAgICAgICAgICAgIC8vIHdoaWNoIGNvdWxkIGJlIGluIGEgY29uZGl0aW9uYWwgZ3JvdXAgcXVlcnlcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goJzonKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBzYXNzL2xlc3MgcGFyZW50IHJlZmVyZW5jZSBkb24ndCB1c2UgYSBzcGFjZVxuICAgICAgICAgICAgICAgICAgICAvLyBzYXNzIG5lc3RlZCBwc2V1ZG8tY2xhc3MgZG9uJ3QgdXNlIGEgc3BhY2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBlZWsoKSA9PT0gXCI6XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBzZXVkby1lbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChcIjo6XCIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHNldWRvLWNsYXNzXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaCgnOicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ1wiJyB8fCBjaCA9PT0gJ1xcJycpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBZnRlclNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGVhdFN0cmluZyhjaCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJzsnKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcoJykgeyAvLyBtYXkgYmUgYSB1cmxcbiAgICAgICAgICAgICAgICBpZiAobG9va0JhY2soXCJ1cmxcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgICAgICAgICBlYXRXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaCAhPT0gJyknICYmIGNoICE9PSAnXCInICYmIGNoICE9PSAnXFwnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGVhdFN0cmluZygnKScpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zLS07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNBZnRlclNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcpJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcsJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgICAgICBlYXRXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnNpZGVSdWxlICYmIHNlbGVjdG9yU2VwYXJhdG9yTmV3bGluZSkge1xuICAgICAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnWycpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBZnRlclNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICc9JykgeyAvLyBubyB3aGl0ZXNwYWNlIGJlZm9yZSBvciBhZnRlclxuICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIHZhciBzd2VldENvZGUgPSBvdXRwdXQuam9pbignJykucmVwbGFjZSgvW1xcclxcblxcdCBdKyQvLCAnJyk7XG5cbiAgICAgICAgLy8gZXN0YWJsaXNoIGVuZF93aXRoX25ld2xpbmVcbiAgICAgICAgaWYgKGVuZF93aXRoX25ld2xpbmUpIHtcbiAgICAgICAgICAgIHN3ZWV0Q29kZSArPSBcIlxcblwiO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN3ZWV0Q29kZTtcbiAgICB9XG5cbiAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9DU1MvQXQtcnVsZVxuICAgIGNzc19iZWF1dGlmeS5ORVNURURfQVRfUlVMRSA9IHtcbiAgICAgICAgXCJAcGFnZVwiOiB0cnVlLFxuICAgICAgICBcIkBmb250LWZhY2VcIjogdHJ1ZSxcbiAgICAgICAgXCJAa2V5ZnJhbWVzXCI6IHRydWUsXG4gICAgICAgIC8vIGFsc28gaW4gQ09ORElUSU9OQUxfR1JPVVBfUlVMRSBiZWxvd1xuICAgICAgICBcIkBtZWRpYVwiOiB0cnVlLFxuICAgICAgICBcIkBzdXBwb3J0c1wiOiB0cnVlLFxuICAgICAgICBcIkBkb2N1bWVudFwiOiB0cnVlXG4gICAgfTtcbiAgICBjc3NfYmVhdXRpZnkuQ09ORElUSU9OQUxfR1JPVVBfUlVMRSA9IHtcbiAgICAgICAgXCJAbWVkaWFcIjogdHJ1ZSxcbiAgICAgICAgXCJAc3VwcG9ydHNcIjogdHJ1ZSxcbiAgICAgICAgXCJAZG9jdW1lbnRcIjogdHJ1ZVxuICAgIH07XG5cbiAgICAvKmdsb2JhbCBkZWZpbmUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIEFNRCAoIGh0dHBzOi8vZ2l0aHViLmNvbS9hbWRqcy9hbWRqcy1hcGkvd2lraS9BTUQjZGVmaW5lYW1kLXByb3BlcnR5LSApXG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGNzc19iZWF1dGlmeTogY3NzX2JlYXV0aWZ5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIEFkZCBzdXBwb3J0IGZvciBDb21tb25KUy4gSnVzdCBwdXQgdGhpcyBmaWxlIHNvbWV3aGVyZSBvbiB5b3VyIHJlcXVpcmUucGF0aHNcbiAgICAgICAgLy8gYW5kIHlvdSB3aWxsIGJlIGFibGUgdG8gYHZhciBodG1sX2JlYXV0aWZ5ID0gcmVxdWlyZShcImJlYXV0aWZ5XCIpLmh0bWxfYmVhdXRpZnlgLlxuICAgICAgICBleHBvcnRzLmNzc19iZWF1dGlmeSA9IGNzc19iZWF1dGlmeTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gSWYgd2UncmUgcnVubmluZyBhIHdlYiBwYWdlIGFuZCBkb24ndCBoYXZlIGVpdGhlciBvZiB0aGUgYWJvdmUsIGFkZCBvdXIgb25lIGdsb2JhbFxuICAgICAgICB3aW5kb3cuY3NzX2JlYXV0aWZ5ID0gY3NzX2JlYXV0aWZ5O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSBkb24ndCBldmVuIGhhdmUgd2luZG93LCB0cnkgZ2xvYmFsLlxuICAgICAgICBnbG9iYWwuY3NzX2JlYXV0aWZ5ID0gY3NzX2JlYXV0aWZ5O1xuICAgIH1cblxufSgpKTtcbiIsIi8qanNoaW50IGN1cmx5OnRydWUsIGVxZXFlcTp0cnVlLCBsYXhicmVhazp0cnVlLCBub2VtcHR5OmZhbHNlICovXG4vKlxuXG4gIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gIENvcHlyaWdodCAoYykgMjAwNy0yMDEzIEVpbmFyIExpZWxtYW5pcyBhbmQgY29udHJpYnV0b3JzLlxuXG4gIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzXG4gICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbiAgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCxcbiAgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG4gIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlNcbiAgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4gIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAgU09GVFdBUkUuXG5cblxuIFN0eWxlIEhUTUxcbi0tLS0tLS0tLS0tLS0tLVxuXG4gIFdyaXR0ZW4gYnkgTm9jaHVtIFNvc3NvbmtvLCAobnNvc3NvbmtvQGhvdG1haWwuY29tKVxuXG4gIEJhc2VkIG9uIGNvZGUgaW5pdGlhbGx5IGRldmVsb3BlZCBieTogRWluYXIgTGllbG1hbmlzLCA8ZWluYXJAanNiZWF1dGlmaWVyLm9yZz5cbiAgICBodHRwOi8vanNiZWF1dGlmaWVyLm9yZy9cblxuICBVc2FnZTpcbiAgICBzdHlsZV9odG1sKGh0bWxfc291cmNlKTtcblxuICAgIHN0eWxlX2h0bWwoaHRtbF9zb3VyY2UsIG9wdGlvbnMpO1xuXG4gIFRoZSBvcHRpb25zIGFyZTpcbiAgICBpbmRlbnRfaW5uZXJfaHRtbCAoZGVmYXVsdCBmYWxzZSkgIOKAlCBpbmRlbnQgPGhlYWQ+IGFuZCA8Ym9keT4gc2VjdGlvbnMsXG4gICAgaW5kZW50X3NpemUgKGRlZmF1bHQgNCkgICAgICAgICAg4oCUIGluZGVudGF0aW9uIHNpemUsXG4gICAgaW5kZW50X2NoYXIgKGRlZmF1bHQgc3BhY2UpICAgICAg4oCUIGNoYXJhY3RlciB0byBpbmRlbnQgd2l0aCxcbiAgICB3cmFwX2xpbmVfbGVuZ3RoIChkZWZhdWx0IDI1MCkgICAgICAgICAgICAtICBtYXhpbXVtIGFtb3VudCBvZiBjaGFyYWN0ZXJzIHBlciBsaW5lICgwID0gZGlzYWJsZSlcbiAgICBicmFjZV9zdHlsZSAoZGVmYXVsdCBcImNvbGxhcHNlXCIpIC0gXCJjb2xsYXBzZVwiIHwgXCJleHBhbmRcIiB8IFwiZW5kLWV4cGFuZFwiXG4gICAgICAgICAgICBwdXQgYnJhY2VzIG9uIHRoZSBzYW1lIGxpbmUgYXMgY29udHJvbCBzdGF0ZW1lbnRzIChkZWZhdWx0KSwgb3IgcHV0IGJyYWNlcyBvbiBvd24gbGluZSAoQWxsbWFuIC8gQU5TSSBzdHlsZSksIG9yIGp1c3QgcHV0IGVuZCBicmFjZXMgb24gb3duIGxpbmUuXG4gICAgdW5mb3JtYXR0ZWQgKGRlZmF1bHRzIHRvIGlubGluZSB0YWdzKSAtIGxpc3Qgb2YgdGFncywgdGhhdCBzaG91bGRuJ3QgYmUgcmVmb3JtYXR0ZWRcbiAgICBpbmRlbnRfc2NyaXB0cyAoZGVmYXVsdCBub3JtYWwpICAtIFwia2VlcFwifFwic2VwYXJhdGVcInxcIm5vcm1hbFwiXG4gICAgcHJlc2VydmVfbmV3bGluZXMgKGRlZmF1bHQgdHJ1ZSkgLSB3aGV0aGVyIGV4aXN0aW5nIGxpbmUgYnJlYWtzIGJlZm9yZSBlbGVtZW50cyBzaG91bGQgYmUgcHJlc2VydmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT25seSB3b3JrcyBiZWZvcmUgZWxlbWVudHMsIG5vdCBpbnNpZGUgdGFncyBvciBmb3IgdGV4dC5cbiAgICBtYXhfcHJlc2VydmVfbmV3bGluZXMgKGRlZmF1bHQgdW5saW1pdGVkKSAtIG1heGltdW0gbnVtYmVyIG9mIGxpbmUgYnJlYWtzIHRvIGJlIHByZXNlcnZlZCBpbiBvbmUgY2h1bmtcbiAgICBpbmRlbnRfaGFuZGxlYmFycyAoZGVmYXVsdCBmYWxzZSkgLSBmb3JtYXQgYW5kIGluZGVudCB7eyNmb299fSBhbmQge3svZm9vfX1cbiAgICBlbmRfd2l0aF9uZXdsaW5lIChmYWxzZSkgICAgICAgICAgLSBlbmQgd2l0aCBhIG5ld2xpbmVcblxuXG4gICAgZS5nLlxuXG4gICAgc3R5bGVfaHRtbChodG1sX3NvdXJjZSwge1xuICAgICAgJ2luZGVudF9pbm5lcl9odG1sJzogZmFsc2UsXG4gICAgICAnaW5kZW50X3NpemUnOiAyLFxuICAgICAgJ2luZGVudF9jaGFyJzogJyAnLFxuICAgICAgJ3dyYXBfbGluZV9sZW5ndGgnOiA3OCxcbiAgICAgICdicmFjZV9zdHlsZSc6ICdleHBhbmQnLFxuICAgICAgJ3VuZm9ybWF0dGVkJzogWydhJywgJ3N1YicsICdzdXAnLCAnYicsICdpJywgJ3UnXSxcbiAgICAgICdwcmVzZXJ2ZV9uZXdsaW5lcyc6IHRydWUsXG4gICAgICAnbWF4X3ByZXNlcnZlX25ld2xpbmVzJzogNSxcbiAgICAgICdpbmRlbnRfaGFuZGxlYmFycyc6IGZhbHNlXG4gICAgfSk7XG4qL1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICBmdW5jdGlvbiB0cmltKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGx0cmltKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXlxccysvZywgJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJ0cmltKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXFxzKyQvZywnJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucywganNfYmVhdXRpZnksIGNzc19iZWF1dGlmeSkge1xuICAgICAgICAvL1dyYXBwZXIgZnVuY3Rpb24gdG8gaW52b2tlIGFsbCB0aGUgbmVjZXNzYXJ5IGNvbnN0cnVjdG9ycyBhbmQgZGVhbCB3aXRoIHRoZSBvdXRwdXQuXG5cbiAgICAgICAgdmFyIG11bHRpX3BhcnNlcixcbiAgICAgICAgICAgIGluZGVudF9pbm5lcl9odG1sLFxuICAgICAgICAgICAgaW5kZW50X3NpemUsXG4gICAgICAgICAgICBpbmRlbnRfY2hhcmFjdGVyLFxuICAgICAgICAgICAgd3JhcF9saW5lX2xlbmd0aCxcbiAgICAgICAgICAgIGJyYWNlX3N0eWxlLFxuICAgICAgICAgICAgdW5mb3JtYXR0ZWQsXG4gICAgICAgICAgICBwcmVzZXJ2ZV9uZXdsaW5lcyxcbiAgICAgICAgICAgIG1heF9wcmVzZXJ2ZV9uZXdsaW5lcyxcbiAgICAgICAgICAgIGluZGVudF9oYW5kbGViYXJzLFxuICAgICAgICAgICAgZW5kX3dpdGhfbmV3bGluZTtcblxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSB0byAxLjMuNFxuICAgICAgICBpZiAoKG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IHBhcnNlSW50KG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCwgMTApID09PSAwKSAmJlxuICAgICAgICAgICAgICAgIChvcHRpb25zLm1heF9jaGFyICE9PSB1bmRlZmluZWQgJiYgcGFyc2VJbnQob3B0aW9ucy5tYXhfY2hhciwgMTApICE9PSAwKSkge1xuICAgICAgICAgICAgb3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoID0gb3B0aW9ucy5tYXhfY2hhcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZGVudF9pbm5lcl9odG1sID0gKG9wdGlvbnMuaW5kZW50X2lubmVyX2h0bWwgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuaW5kZW50X2lubmVyX2h0bWw7XG4gICAgICAgIGluZGVudF9zaXplID0gKG9wdGlvbnMuaW5kZW50X3NpemUgPT09IHVuZGVmaW5lZCkgPyA0IDogcGFyc2VJbnQob3B0aW9ucy5pbmRlbnRfc2l6ZSwgMTApO1xuICAgICAgICBpbmRlbnRfY2hhcmFjdGVyID0gKG9wdGlvbnMuaW5kZW50X2NoYXIgPT09IHVuZGVmaW5lZCkgPyAnICcgOiBvcHRpb25zLmluZGVudF9jaGFyO1xuICAgICAgICBicmFjZV9zdHlsZSA9IChvcHRpb25zLmJyYWNlX3N0eWxlID09PSB1bmRlZmluZWQpID8gJ2NvbGxhcHNlJyA6IG9wdGlvbnMuYnJhY2Vfc3R5bGU7XG4gICAgICAgIHdyYXBfbGluZV9sZW5ndGggPSAgcGFyc2VJbnQob3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoLCAxMCkgPT09IDAgPyAzMjc4NiA6IHBhcnNlSW50KG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCB8fCAyNTAsIDEwKTtcbiAgICAgICAgdW5mb3JtYXR0ZWQgPSBvcHRpb25zLnVuZm9ybWF0dGVkIHx8IFsnYScsICdzcGFuJywgJ2ltZycsICdiZG8nLCAnZW0nLCAnc3Ryb25nJywgJ2RmbicsICdjb2RlJywgJ3NhbXAnLCAna2JkJywgJ3ZhcicsICdjaXRlJywgJ2FiYnInLCAnYWNyb255bScsICdxJywgJ3N1YicsICdzdXAnLCAndHQnLCAnaScsICdiJywgJ2JpZycsICdzbWFsbCcsICd1JywgJ3MnLCAnc3RyaWtlJywgJ2ZvbnQnLCAnaW5zJywgJ2RlbCcsICdwcmUnLCAnYWRkcmVzcycsICdkdCcsICdoMScsICdoMicsICdoMycsICdoNCcsICdoNScsICdoNiddO1xuICAgICAgICBwcmVzZXJ2ZV9uZXdsaW5lcyA9IChvcHRpb25zLnByZXNlcnZlX25ld2xpbmVzID09PSB1bmRlZmluZWQpID8gdHJ1ZSA6IG9wdGlvbnMucHJlc2VydmVfbmV3bGluZXM7XG4gICAgICAgIG1heF9wcmVzZXJ2ZV9uZXdsaW5lcyA9IHByZXNlcnZlX25ld2xpbmVzID9cbiAgICAgICAgICAgIChpc05hTihwYXJzZUludChvcHRpb25zLm1heF9wcmVzZXJ2ZV9uZXdsaW5lcywgMTApKSA/IDMyNzg2IDogcGFyc2VJbnQob3B0aW9ucy5tYXhfcHJlc2VydmVfbmV3bGluZXMsIDEwKSlcbiAgICAgICAgICAgIDogMDtcbiAgICAgICAgaW5kZW50X2hhbmRsZWJhcnMgPSAob3B0aW9ucy5pbmRlbnRfaGFuZGxlYmFycyA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5pbmRlbnRfaGFuZGxlYmFycztcbiAgICAgICAgZW5kX3dpdGhfbmV3bGluZSA9IChvcHRpb25zLmVuZF93aXRoX25ld2xpbmUgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuZW5kX3dpdGhfbmV3bGluZTtcblxuICAgICAgICBmdW5jdGlvbiBQYXJzZXIoKSB7XG5cbiAgICAgICAgICAgIHRoaXMucG9zID0gMDsgLy9QYXJzZXIgcG9zaXRpb25cbiAgICAgICAgICAgIHRoaXMudG9rZW4gPSAnJztcbiAgICAgICAgICAgIHRoaXMuY3VycmVudF9tb2RlID0gJ0NPTlRFTlQnOyAvL3JlZmxlY3RzIHRoZSBjdXJyZW50IFBhcnNlciBtb2RlOiBUQUcvQ09OVEVOVFxuICAgICAgICAgICAgdGhpcy50YWdzID0geyAvL0FuIG9iamVjdCB0byBob2xkIHRhZ3MsIHRoZWlyIHBvc2l0aW9uLCBhbmQgdGhlaXIgcGFyZW50LXRhZ3MsIGluaXRpYXRlZCB3aXRoIGRlZmF1bHQgdmFsdWVzXG4gICAgICAgICAgICAgICAgcGFyZW50OiAncGFyZW50MScsXG4gICAgICAgICAgICAgICAgcGFyZW50Y291bnQ6IDEsXG4gICAgICAgICAgICAgICAgcGFyZW50MTogJydcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJyc7XG4gICAgICAgICAgICB0aGlzLnRva2VuX3RleHQgPSB0aGlzLmxhc3RfdG9rZW4gPSB0aGlzLmxhc3RfdGV4dCA9IHRoaXMudG9rZW5fdHlwZSA9ICcnO1xuICAgICAgICAgICAgdGhpcy5uZXdsaW5lcyA9IDA7XG4gICAgICAgICAgICB0aGlzLmluZGVudF9jb250ZW50ID0gaW5kZW50X2lubmVyX2h0bWw7XG5cbiAgICAgICAgICAgIHRoaXMuVXRpbHMgPSB7IC8vVWlsaXRpZXMgbWFkZSBhdmFpbGFibGUgdG8gdGhlIHZhcmlvdXMgZnVuY3Rpb25zXG4gICAgICAgICAgICAgICAgd2hpdGVzcGFjZTogXCJcXG5cXHJcXHQgXCIuc3BsaXQoJycpLFxuICAgICAgICAgICAgICAgIHNpbmdsZV90b2tlbjogJ2JyLGlucHV0LGxpbmssbWV0YSwhZG9jdHlwZSxiYXNlZm9udCxiYXNlLGFyZWEsaHIsd2JyLHBhcmFtLGltZyxpc2luZGV4LD94bWwsZW1iZWQsP3BocCw/LD89Jy5zcGxpdCgnLCcpLCAvL2FsbCB0aGUgc2luZ2xlIHRhZ3MgZm9yIEhUTUxcbiAgICAgICAgICAgICAgICBleHRyYV9saW5lcnM6ICdoZWFkLGJvZHksL2h0bWwnLnNwbGl0KCcsJyksIC8vZm9yIHRhZ3MgdGhhdCBuZWVkIGEgbGluZSBvZiB3aGl0ZXNwYWNlIGJlZm9yZSB0aGVtXG4gICAgICAgICAgICAgICAgaW5fYXJyYXk6IGZ1bmN0aW9uKHdoYXQsIGFycikge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdoYXQgPT09IGFycltpXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBSZXR1cm4gdHJ1ZSBpZmYgdGhlIGdpdmVuIHRleHQgaXMgY29tcG9zZWQgZW50aXJlbHkgb2ZcbiAgICAgICAgICAgIC8vIHdoaXRlc3BhY2UuXG4gICAgICAgICAgICB0aGlzLmlzX3doaXRlc3BhY2UgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCB0ZXh0Lmxlbmd0aDsgdGV4dCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5VdGlscy5pbl9hcnJheSh0ZXh0LmNoYXJBdChuKSwgdGhpcy5VdGlscy53aGl0ZXNwYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnRyYXZlcnNlX3doaXRlc3BhY2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRfY2hhciA9ICcnO1xuXG4gICAgICAgICAgICAgICAgaW5wdXRfY2hhciA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5VdGlscy5pbl9hcnJheShpbnB1dF9jaGFyLCB0aGlzLlV0aWxzLndoaXRlc3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmV3bGluZXMgPSAwO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy5VdGlscy5pbl9hcnJheShpbnB1dF9jaGFyLCB0aGlzLlV0aWxzLndoaXRlc3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJlc2VydmVfbmV3bGluZXMgJiYgaW5wdXRfY2hhciA9PT0gJ1xcbicgJiYgdGhpcy5uZXdsaW5lcyA8PSBtYXhfcHJlc2VydmVfbmV3bGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5ld2xpbmVzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBBcHBlbmQgYSBzcGFjZSB0byB0aGUgZ2l2ZW4gY29udGVudCAoc3RyaW5nIGFycmF5KSBvciwgaWYgd2UgYXJlXG4gICAgICAgICAgICAvLyBhdCB0aGUgd3JhcF9saW5lX2xlbmd0aCwgYXBwZW5kIGEgbmV3bGluZS9pbmRlbnRhdGlvbi5cbiAgICAgICAgICAgIHRoaXMuc3BhY2Vfb3Jfd3JhcCA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saW5lX2NoYXJfY291bnQgPj0gdGhpcy53cmFwX2xpbmVfbGVuZ3RoKSB7IC8vaW5zZXJ0IGEgbGluZSB3aGVuIHRoZSB3cmFwX2xpbmVfbGVuZ3RoIGlzIHJlYWNoZWRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9uZXdsaW5lKGZhbHNlLCBjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9pbmRlbnRhdGlvbihjb250ZW50KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50LnB1c2goJyAnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF9jb250ZW50ID0gZnVuY3Rpb24oKSB7IC8vZnVuY3Rpb24gdG8gY2FwdHVyZSByZWd1bGFyIGNvbnRlbnQgYmV0d2VlbiB0YWdzXG4gICAgICAgICAgICAgICAgdmFyIGlucHV0X2NoYXIgPSAnJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IGZhbHNlOyAvL2lmIGEgc3BhY2UgaXMgbmVlZGVkXG5cbiAgICAgICAgICAgICAgICB3aGlsZSAodGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpICE9PSAnPCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudC5sZW5ndGggPyBjb250ZW50LmpvaW4oJycpIDogWycnLCAnVEtfRU9GJ107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cmF2ZXJzZV93aGl0ZXNwYWNlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3BhY2Vfb3Jfd3JhcChjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGVudF9oYW5kbGViYXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGViYXJzIHBhcnNpbmcgaXMgY29tcGxpY2F0ZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB7eyNmb299fSBhbmQge3svZm9vfX0gYXJlIGZvcm1hdHRlZCB0YWdzLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8ge3tzb21ldGhpbmd9fSBzaG91bGQgZ2V0IHRyZWF0ZWQgYXMgY29udGVudCwgZXhjZXB0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8ge3tlbHNlfX0gc3BlY2lmaWNhbGx5IGJlaGF2ZXMgbGlrZSB7eyNpZn19IGFuZCB7ey9pZn19XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGVlazMgPSB0aGlzLmlucHV0LnN1YnN0cih0aGlzLnBvcywgMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVlazMgPT09ICd7eyMnIHx8IHBlZWszID09PSAne3svJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZXNlIGFyZSB0YWdzIGFuZCBub3QgY29udGVudC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pbnB1dC5zdWJzdHIodGhpcy5wb3MsIDIpID09PSAne3snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2V0X3RhZyh0cnVlKSA9PT0gJ3t7ZWxzZX19Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcysrO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50LnB1c2goaW5wdXRfY2hhcik7IC8vbGV0dGVyIGF0LWEtdGltZSAob3Igc3RyaW5nKSBpbnNlcnRlZCB0byBhbiBhcnJheVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudC5sZW5ndGggPyBjb250ZW50LmpvaW4oJycpIDogJyc7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF9jb250ZW50c190byA9IGZ1bmN0aW9uKG5hbWUpIHsgLy9nZXQgdGhlIGZ1bGwgY29udGVudCBvZiBhIHNjcmlwdCBvciBzdHlsZSB0byBwYXNzIHRvIGpzX2JlYXV0aWZ5XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zID09PSB0aGlzLmlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gWycnLCAnVEtfRU9GJ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBpbnB1dF9jaGFyID0gJyc7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICB2YXIgcmVnX21hdGNoID0gbmV3IFJlZ0V4cCgnPC8nICsgbmFtZSArICdcXFxccyo+JywgJ2lnbScpO1xuICAgICAgICAgICAgICAgIHJlZ19tYXRjaC5sYXN0SW5kZXggPSB0aGlzLnBvcztcbiAgICAgICAgICAgICAgICB2YXIgcmVnX2FycmF5ID0gcmVnX21hdGNoLmV4ZWModGhpcy5pbnB1dCk7XG4gICAgICAgICAgICAgICAgdmFyIGVuZF9zY3JpcHQgPSByZWdfYXJyYXkgPyByZWdfYXJyYXkuaW5kZXggOiB0aGlzLmlucHV0Lmxlbmd0aDsgLy9hYnNvbHV0ZSBlbmQgb2Ygc2NyaXB0XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zIDwgZW5kX3NjcmlwdCkgeyAvL2dldCBldmVyeXRoaW5nIGluIGJldHdlZW4gdGhlIHNjcmlwdCB0YWdzXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSB0aGlzLmlucHV0LnN1YnN0cmluZyh0aGlzLnBvcywgZW5kX3NjcmlwdCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zID0gZW5kX3NjcmlwdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnJlY29yZF90YWcgPSBmdW5jdGlvbih0YWcpIHsgLy9mdW5jdGlvbiB0byByZWNvcmQgYSB0YWcgYW5kIGl0cyBwYXJlbnQgaW4gdGhpcy50YWdzIE9iamVjdFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10pIHsgLy9jaGVjayBmb3IgdGhlIGV4aXN0ZW5jZSBvZiB0aGlzIHRhZyB0eXBlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSsrO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ3NbdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddXSA9IHRoaXMuaW5kZW50X2xldmVsOyAvL2FuZCByZWNvcmQgdGhlIHByZXNlbnQgaW5kZW50IGxldmVsXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy9vdGhlcndpc2UgaW5pdGlhbGl6ZSB0aGlzIHRhZyB0eXBlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J11dID0gdGhpcy5pbmRlbnRfbGV2ZWw7IC8vYW5kIHJlY29yZCB0aGUgcHJlc2VudCBpbmRlbnQgbGV2ZWxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy50YWdzW3RhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSArICdwYXJlbnQnXSA9IHRoaXMudGFncy5wYXJlbnQ7IC8vc2V0IHRoZSBwYXJlbnQgKGkuZS4gaW4gdGhlIGNhc2Ugb2YgYSBkaXYgdGhpcy50YWdzLmRpdjFwYXJlbnQpXG4gICAgICAgICAgICAgICAgdGhpcy50YWdzLnBhcmVudCA9IHRhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXTsgLy9hbmQgbWFrZSB0aGlzIHRoZSBjdXJyZW50IHBhcmVudCAoaS5lLiBpbiB0aGUgY2FzZSBvZiBhIGRpdiAnZGl2MScpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnJldHJpZXZlX3RhZyA9IGZ1bmN0aW9uKHRhZykgeyAvL2Z1bmN0aW9uIHRvIHJldHJpZXZlIHRoZSBvcGVuaW5nIHRhZyB0byB0aGUgY29ycmVzcG9uZGluZyBjbG9zZXJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50YWdzW3RhZyArICdjb3VudCddKSB7IC8vaWYgdGhlIG9wZW5lbmVyIGlzIG5vdCBpbiB0aGUgT2JqZWN0IHdlIGlnbm9yZSBpdFxuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcF9wYXJlbnQgPSB0aGlzLnRhZ3MucGFyZW50OyAvL2NoZWNrIHRvIHNlZSBpZiBpdCdzIGEgY2xvc2FibGUgdGFnLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodGVtcF9wYXJlbnQpIHsgLy90aWxsIHdlIHJlYWNoICcnICh0aGUgaW5pdGlhbCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddID09PSB0ZW1wX3BhcmVudCkgeyAvL2lmIHRoaXMgaXMgaXQgdXNlIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wX3BhcmVudCA9IHRoaXMudGFnc1t0ZW1wX3BhcmVudCArICdwYXJlbnQnXTsgLy9vdGhlcndpc2Uga2VlcCBvbiBjbGltYmluZyB1cCB0aGUgRE9NIFRyZWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodGVtcF9wYXJlbnQpIHsgLy9pZiB3ZSBjYXVnaHQgc29tZXRoaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9sZXZlbCA9IHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J11dOyAvL3NldCB0aGUgaW5kZW50X2xldmVsIGFjY29yZGluZ2x5XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ3MucGFyZW50ID0gdGhpcy50YWdzW3RlbXBfcGFyZW50ICsgJ3BhcmVudCddOyAvL2FuZCBzZXQgdGhlIGN1cnJlbnQgcGFyZW50XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10gKyAncGFyZW50J107IC8vZGVsZXRlIHRoZSBjbG9zZWQgdGFncyBwYXJlbnQgcmVmZXJlbmNlLi4uXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnRhZ3NbdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddXTsgLy8uLi5hbmQgdGhlIHRhZyBpdHNlbGZcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXS0tO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5pbmRlbnRfdG9fdGFnID0gZnVuY3Rpb24odGFnKSB7XG4gICAgICAgICAgICAgICAgLy8gTWF0Y2ggdGhlIGluZGVudGF0aW9uIGxldmVsIHRvIHRoZSBsYXN0IHVzZSBvZiB0aGlzIHRhZywgYnV0IGRvbid0IHJlbW92ZSBpdC5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGFnc1t0YWcgKyAnY291bnQnXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB0ZW1wX3BhcmVudCA9IHRoaXMudGFncy5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHRlbXBfcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10gPT09IHRlbXBfcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0ZW1wX3BhcmVudCA9IHRoaXMudGFnc1t0ZW1wX3BhcmVudCArICdwYXJlbnQnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRlbXBfcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2xldmVsID0gdGhpcy50YWdzW3RhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfdGFnID0gZnVuY3Rpb24ocGVlaykgeyAvL2Z1bmN0aW9uIHRvIGdldCBhIGZ1bGwgdGFnIGFuZCBwYXJzZSBpdHMgdHlwZVxuICAgICAgICAgICAgICAgIHZhciBpbnB1dF9jaGFyID0gJycsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9ICcnLFxuICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0YWdfc3RhcnQsIHRhZ19lbmQsXG4gICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydF9jaGFyLFxuICAgICAgICAgICAgICAgICAgICBvcmlnX3BvcyA9IHRoaXMucG9zLFxuICAgICAgICAgICAgICAgICAgICBvcmlnX2xpbmVfY2hhcl9jb3VudCA9IHRoaXMubGluZV9jaGFyX2NvdW50O1xuXG4gICAgICAgICAgICAgICAgcGVlayA9IHBlZWsgIT09IHVuZGVmaW5lZCA/IHBlZWsgOiBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVlaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9zID0gb3JpZ19wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQgPSBvcmlnX2xpbmVfY2hhcl9jb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50Lmxlbmd0aCA/IGNvbnRlbnQuam9pbignJykgOiBbJycsICdUS19FT0YnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuVXRpbHMuaW5fYXJyYXkoaW5wdXRfY2hhciwgdGhpcy5VdGlscy53aGl0ZXNwYWNlKSkgeyAvL2Rvbid0IHdhbnQgdG8gaW5zZXJ0IHVubmVjZXNzYXJ5IHNwYWNlXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dF9jaGFyID09PSBcIidcIiB8fCBpbnB1dF9jaGFyID09PSAnXCInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyICs9IHRoaXMuZ2V0X3VuZm9ybWF0dGVkKGlucHV0X2NoYXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRfY2hhciA9PT0gJz0nKSB7IC8vbm8gc3BhY2UgYmVmb3JlID1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudC5sZW5ndGggJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdICE9PSAnPScgJiYgaW5wdXRfY2hhciAhPT0gJz4nICYmIHNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL25vIHNwYWNlIGFmdGVyID0gb3IgYmVmb3JlID5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3BhY2Vfb3Jfd3JhcChjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZW50X2hhbmRsZWJhcnMgJiYgdGFnX3N0YXJ0X2NoYXIgPT09ICc8Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBpbnNpZGUgYW4gYW5nbGUtYnJhY2tldCB0YWcsIHB1dCBzcGFjZXMgYXJvdW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGViYXJzIG5vdCBpbnNpZGUgb2Ygc3RyaW5ncy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoaW5wdXRfY2hhciArIHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKSkgPT09ICd7eycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyICs9IHRoaXMuZ2V0X3VuZm9ybWF0dGVkKCd9fScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50Lmxlbmd0aCAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMV0gIT09ICcgJyAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMV0gIT09ICc8Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gJyAnICsgaW5wdXRfY2hhcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0X2NoYXIgPT09ICc8JyAmJiAhdGFnX3N0YXJ0X2NoYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydCA9IHRoaXMucG9zIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydF9jaGFyID0gJzwnO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGVudF9oYW5kbGViYXJzICYmICF0YWdfc3RhcnRfY2hhcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQubGVuZ3RoID49IDIgJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdID09PSAneycgJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDJdID09ICd7Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dF9jaGFyID09PSAnIycgfHwgaW5wdXRfY2hhciA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydCA9IHRoaXMucG9zIC0gMztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWdfc3RhcnQgPSB0aGlzLnBvcyAtIDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydF9jaGFyID0gJ3snO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgY29udGVudC5wdXNoKGlucHV0X2NoYXIpOyAvL2luc2VydHMgY2hhcmFjdGVyIGF0LWEtdGltZSAob3Igc3RyaW5nKVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50WzFdICYmIGNvbnRlbnRbMV0gPT09ICchJykgeyAvL2lmIHdlJ3JlIGluIGEgY29tbWVudCwgZG8gc29tZXRoaW5nIHNwZWNpYWxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIHRyZWF0IGFsbCBjb21tZW50cyBhcyBsaXRlcmFscywgZXZlbiBtb3JlIHRoYW4gcHJlZm9ybWF0dGVkIHRhZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGp1c3QgbG9vayBmb3IgdGhlIGFwcHJvcHJpYXRlIGNsb3NlIHRhZ1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IFt0aGlzLmdldF9jb21tZW50KHRhZ19zdGFydCldO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZW50X2hhbmRsZWJhcnMgJiYgdGFnX3N0YXJ0X2NoYXIgPT09ICd7JyAmJiBjb250ZW50Lmxlbmd0aCA+IDIgJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDJdID09PSAnfScgJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDFdID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoaW5wdXRfY2hhciAhPT0gJz4nKTtcblxuICAgICAgICAgICAgICAgIHZhciB0YWdfY29tcGxldGUgPSBjb250ZW50LmpvaW4oJycpO1xuICAgICAgICAgICAgICAgIHZhciB0YWdfaW5kZXg7XG4gICAgICAgICAgICAgICAgdmFyIHRhZ19vZmZzZXQ7XG5cbiAgICAgICAgICAgICAgICBpZiAodGFnX2NvbXBsZXRlLmluZGV4T2YoJyAnKSAhPT0gLTEpIHsgLy9pZiB0aGVyZSdzIHdoaXRlc3BhY2UsIHRoYXRzIHdoZXJlIHRoZSB0YWcgbmFtZSBlbmRzXG4gICAgICAgICAgICAgICAgICAgIHRhZ19pbmRleCA9IHRhZ19jb21wbGV0ZS5pbmRleE9mKCcgJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0YWdfY29tcGxldGVbMF0gPT09ICd7Jykge1xuICAgICAgICAgICAgICAgICAgICB0YWdfaW5kZXggPSB0YWdfY29tcGxldGUuaW5kZXhPZignfScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vb3RoZXJ3aXNlIGdvIHdpdGggdGhlIHRhZyBlbmRpbmdcbiAgICAgICAgICAgICAgICAgICAgdGFnX2luZGV4ID0gdGFnX2NvbXBsZXRlLmluZGV4T2YoJz4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRhZ19jb21wbGV0ZVswXSA9PT0gJzwnIHx8ICFpbmRlbnRfaGFuZGxlYmFycykge1xuICAgICAgICAgICAgICAgICAgICB0YWdfb2Zmc2V0ID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YWdfb2Zmc2V0ID0gdGFnX2NvbXBsZXRlWzJdID09PSAnIycgPyAzIDogMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHRhZ19jaGVjayA9IHRhZ19jb21wbGV0ZS5zdWJzdHJpbmcodGFnX29mZnNldCwgdGFnX2luZGV4KS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIGlmICh0YWdfY29tcGxldGUuY2hhckF0KHRhZ19jb21wbGV0ZS5sZW5ndGggLSAyKSA9PT0gJy8nIHx8XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuVXRpbHMuaW5fYXJyYXkodGFnX2NoZWNrLCB0aGlzLlV0aWxzLnNpbmdsZV90b2tlbikpIHsgLy9pZiB0aGlzIHRhZyBuYW1lIGlzIGEgc2luZ2xlIHRhZyB0eXBlIChlaXRoZXIgaW4gdGhlIGxpc3Qgb3IgaGFzIGEgY2xvc2luZyAvKVxuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnU0lOR0xFJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5kZW50X2hhbmRsZWJhcnMgJiYgdGFnX2NvbXBsZXRlWzBdID09PSAneycgJiYgdGFnX2NoZWNrID09PSAnZWxzZScpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF90b190YWcoJ2lmJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJ0hBTkRMRUJBUlNfRUxTRSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9jb250ZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhdmVyc2Vfd2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzX3VuZm9ybWF0dGVkKHRhZ19jaGVjaywgdW5mb3JtYXR0ZWQpKSB7IC8vIGRvIG5vdCByZWZvcm1hdCB0aGUgXCJ1bmZvcm1hdHRlZFwiIHRhZ3NcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9IHRoaXMuZ2V0X3VuZm9ybWF0dGVkKCc8LycgKyB0YWdfY2hlY2sgKyAnPicsIHRhZ19jb21wbGV0ZSk7IC8vLi4uZGVsZWdhdGUgdG8gZ2V0X3VuZm9ybWF0dGVkIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQucHVzaChjb21tZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGFnX2VuZCA9IHRoaXMucG9zIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdTSU5HTEUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFnX2NoZWNrID09PSAnc2NyaXB0JyAmJlxuICAgICAgICAgICAgICAgICAgICAodGFnX2NvbXBsZXRlLnNlYXJjaCgndHlwZScpID09PSAtMSB8fFxuICAgICAgICAgICAgICAgICAgICAodGFnX2NvbXBsZXRlLnNlYXJjaCgndHlwZScpID4gLTEgJiZcbiAgICAgICAgICAgICAgICAgICAgdGFnX2NvbXBsZXRlLnNlYXJjaCgvXFxiKHRleHR8YXBwbGljYXRpb24pXFwvKHgtKT8oamF2YXNjcmlwdHxlY21hc2NyaXB0fGpzY3JpcHR8bGl2ZXNjcmlwdCkvKSA+IC0xKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlY29yZF90YWcodGFnX2NoZWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnU0NSSVBUJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFnX2NoZWNrID09PSAnc3R5bGUnICYmXG4gICAgICAgICAgICAgICAgICAgICh0YWdfY29tcGxldGUuc2VhcmNoKCd0eXBlJykgPT09IC0xIHx8XG4gICAgICAgICAgICAgICAgICAgICh0YWdfY29tcGxldGUuc2VhcmNoKCd0eXBlJykgPiAtMSAmJiB0YWdfY29tcGxldGUuc2VhcmNoKCd0ZXh0L2NzcycpID4gLTEpKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVjb3JkX3RhZyh0YWdfY2hlY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdTVFlMRSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhZ19jaGVjay5jaGFyQXQoMCkgPT09ICchJykgeyAvL3BlZWsgZm9yIDwhIGNvbW1lbnRcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yIGNvbW1lbnRzIGNvbnRlbnQgaXMgYWxyZWFkeSBjb3JyZWN0LlxuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnU0lOR0xFJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhdmVyc2Vfd2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghcGVlaykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFnX2NoZWNrLmNoYXJBdCgwKSA9PT0gJy8nKSB7IC8vdGhpcyB0YWcgaXMgYSBkb3VibGUgdGFnIHNvIGNoZWNrIGZvciB0YWctZW5kaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJldHJpZXZlX3RhZyh0YWdfY2hlY2suc3Vic3RyaW5nKDEpKTsgLy9yZW1vdmUgaXQgYW5kIGFsbCBhbmNlc3RvcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnRU5EJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy9vdGhlcndpc2UgaXQncyBhIHN0YXJ0LXRhZ1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRfdGFnKHRhZ19jaGVjayk7IC8vcHVzaCBpdCBvbiB0aGUgdGFnIHN0YWNrXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFnX2NoZWNrLnRvTG93ZXJDYXNlKCkgIT09ICdodG1sJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2NvbnRlbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdTVEFSVCc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBBbGxvdyBwcmVzZXJ2aW5nIG9mIG5ld2xpbmVzIGFmdGVyIGEgc3RhcnQgb3IgZW5kIHRhZ1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cmF2ZXJzZV93aGl0ZXNwYWNlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3BhY2Vfb3Jfd3JhcChjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLlV0aWxzLmluX2FycmF5KHRhZ19jaGVjaywgdGhpcy5VdGlscy5leHRyYV9saW5lcnMpKSB7IC8vY2hlY2sgaWYgdGhpcyBkb3VibGUgbmVlZHMgYW4gZXh0cmEgbGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9uZXdsaW5lKGZhbHNlLCB0aGlzLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdXRwdXQubGVuZ3RoICYmIHRoaXMub3V0cHV0W3RoaXMub3V0cHV0Lmxlbmd0aCAtIDJdICE9PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfbmV3bGluZSh0cnVlLCB0aGlzLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocGVlaykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcyA9IG9yaWdfcG9zO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCA9IG9yaWdfbGluZV9jaGFyX2NvdW50O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50LmpvaW4oJycpOyAvL3JldHVybnMgZnVsbHkgZm9ybWF0dGVkIHRhZ1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfY29tbWVudCA9IGZ1bmN0aW9uKHN0YXJ0X3BvcykgeyAvL2Z1bmN0aW9uIHRvIHJldHVybiBjb21tZW50IGNvbnRlbnQgaW4gaXRzIGVudGlyZXR5XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyB3aWxsIGhhdmUgdmVyeSBwb29yIHBlcmYsIGJ1dCB3aWxsIHdvcmsgZm9yIG5vdy5cbiAgICAgICAgICAgICAgICB2YXIgY29tbWVudCA9ICcnLFxuICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSAnPicsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIHRoaXMucG9zID0gc3RhcnRfcG9zO1xuICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3MrKztcblxuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLnBvcyA8PSB0aGlzLmlucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGlucHV0X2NoYXI7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gb25seSBuZWVkIHRvIGNoZWNrIGZvciB0aGUgZGVsaW1pdGVyIGlmIHRoZSBsYXN0IGNoYXJzIG1hdGNoXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21tZW50W2NvbW1lbnQubGVuZ3RoIC0gMV0gPT09IGRlbGltaXRlcltkZWxpbWl0ZXIubGVuZ3RoIC0gMV0gJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQuaW5kZXhPZihkZWxpbWl0ZXIpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IG5lZWQgdG8gc2VhcmNoIGZvciBjdXN0b20gZGVsaW1pdGVyIGZvciB0aGUgZmlyc3QgZmV3IGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaGVkICYmIGNvbW1lbnQubGVuZ3RoIDwgMTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21tZW50LmluZGV4T2YoJzwhW2lmJykgPT09IDApIHsgLy9wZWVrIGZvciA8IVtpZiBjb25kaXRpb25hbCBjb21tZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsaW1pdGVyID0gJzwhW2VuZGlmXT4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb21tZW50LmluZGV4T2YoJzwhW2NkYXRhWycpID09PSAwKSB7IC8vaWYgaXQncyBhIDxbY2RhdGFbIGNvbW1lbnQuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSAnXV0+JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tbWVudC5pbmRleE9mKCc8IVsnKSA9PT0gMCkgeyAvLyBzb21lIG90aGVyICFbIGNvbW1lbnQ/IC4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGltaXRlciA9ICddPic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbW1lbnQuaW5kZXhPZignPCEtLScpID09PSAwKSB7IC8vIDwhLS0gY29tbWVudCAuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSAnLS0+JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbW1lbnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF91bmZvcm1hdHRlZCA9IGZ1bmN0aW9uKGRlbGltaXRlciwgb3JpZ190YWcpIHsgLy9mdW5jdGlvbiB0byByZXR1cm4gdW5mb3JtYXR0ZWQgY29udGVudCBpbiBpdHMgZW50aXJldHlcblxuICAgICAgICAgICAgICAgIGlmIChvcmlnX3RhZyAmJiBvcmlnX3RhZy50b0xvd2VyQ2FzZSgpLmluZGV4T2YoZGVsaW1pdGVyKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRfY2hhciA9ICcnO1xuICAgICAgICAgICAgICAgIHZhciBjb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgdmFyIG1pbl9pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgdmFyIHNwYWNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBkbyB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucG9zID49IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuVXRpbHMuaW5fYXJyYXkoaW5wdXRfY2hhciwgdGhpcy5VdGlscy53aGl0ZXNwYWNlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzcGFjZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50LS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRfY2hhciA9PT0gJ1xcbicgfHwgaW5wdXRfY2hhciA9PT0gJ1xccicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qICBEb24ndCBjaGFuZ2UgdGFiIGluZGVudGlvbiBmb3IgdW5mb3JtYXR0ZWQgYmxvY2tzLiAgSWYgdXNpbmcgY29kZSBmb3IgaHRtbCBlZGl0aW5nLCB0aGlzIHdpbGwgZ3JlYXRseSBhZmZlY3QgPHByZT4gdGFncyBpZiB0aGV5IGFyZSBzcGVjaWZpZWQgaW4gdGhlICd1bmZvcm1hdHRlZCBhcnJheSdcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8dGhpcy5pbmRlbnRfbGV2ZWw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgY29udGVudCArPSB0aGlzLmluZGVudF9zdHJpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNwYWNlID0gZmFsc2U7IC8vLi4uYW5kIG1ha2Ugc3VyZSBvdGhlciBpbmRlbnRhdGlvbiBpcyBlcmFzZWRcbiAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGlucHV0X2NoYXI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIHNwYWNlID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZW50X2hhbmRsZWJhcnMgJiYgaW5wdXRfY2hhciA9PT0gJ3snICYmIGNvbnRlbnQubGVuZ3RoICYmIGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAyXSA9PT0gJ3snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGViYXJzIGV4cHJlc3Npb25zIGluIHN0cmluZ3Mgc2hvdWxkIGFsc28gYmUgdW5mb3JtYXR0ZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IHRoaXMuZ2V0X3VuZm9ybWF0dGVkKCd9fScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlc2UgZXhwcmVzc2lvbnMgYXJlIG9wYXF1ZS4gIElnbm9yZSBkZWxpbWl0ZXJzIGZvdW5kIGluIHRoZW0uXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5faW5kZXggPSBjb250ZW50Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGNvbnRlbnQudG9Mb3dlckNhc2UoKS5pbmRleE9mKGRlbGltaXRlciwgbWluX2luZGV4KSA9PT0gLTEpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5nZXRfdG9rZW4gPSBmdW5jdGlvbigpIHsgLy9pbml0aWFsIGhhbmRsZXIgZm9yIHRva2VuLXJldHJpZXZhbFxuICAgICAgICAgICAgICAgIHZhciB0b2tlbjtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxhc3RfdG9rZW4gPT09ICdUS19UQUdfU0NSSVBUJyB8fCB0aGlzLmxhc3RfdG9rZW4gPT09ICdUS19UQUdfU1RZTEUnKSB7IC8vY2hlY2sgaWYgd2UgbmVlZCB0byBmb3JtYXQgamF2YXNjcmlwdFxuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IHRoaXMubGFzdF90b2tlbi5zdWJzdHIoNyk7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuID0gdGhpcy5nZXRfY29udGVudHNfdG8odHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0b2tlbiwgJ1RLXycgKyB0eXBlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF9tb2RlID09PSAnQ09OVEVOVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4gPSB0aGlzLmdldF9jb250ZW50KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3Rva2VuLCAnVEtfQ09OVEVOVCddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF9tb2RlID09PSAnVEFHJykge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbiA9IHRoaXMuZ2V0X3RhZygpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRhZ19uYW1lX3R5cGUgPSAnVEtfVEFHXycgKyB0aGlzLnRhZ190eXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0b2tlbiwgdGFnX25hbWVfdHlwZV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF9mdWxsX2luZGVudCA9IGZ1bmN0aW9uKGxldmVsKSB7XG4gICAgICAgICAgICAgICAgbGV2ZWwgPSB0aGlzLmluZGVudF9sZXZlbCArIGxldmVsIHx8IDA7XG4gICAgICAgICAgICAgICAgaWYgKGxldmVsIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIEFycmF5KGxldmVsICsgMSkuam9pbih0aGlzLmluZGVudF9zdHJpbmcpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5pc191bmZvcm1hdHRlZCA9IGZ1bmN0aW9uKHRhZ19jaGVjaywgdW5mb3JtYXR0ZWQpIHtcbiAgICAgICAgICAgICAgICAvL2lzIHRoaXMgYW4gSFRNTDUgYmxvY2stbGV2ZWwgbGluaz9cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuVXRpbHMuaW5fYXJyYXkodGFnX2NoZWNrLCB1bmZvcm1hdHRlZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0YWdfY2hlY2sudG9Mb3dlckNhc2UoKSAhPT0gJ2EnIHx8ICF0aGlzLlV0aWxzLmluX2FycmF5KCdhJywgdW5mb3JtYXR0ZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vYXQgdGhpcyBwb2ludCB3ZSBoYXZlIGFuICB0YWc7IGlzIGl0cyBmaXJzdCBjaGlsZCBzb21ldGhpbmcgd2Ugd2FudCB0byByZW1haW5cbiAgICAgICAgICAgICAgICAvL3VuZm9ybWF0dGVkP1xuICAgICAgICAgICAgICAgIHZhciBuZXh0X3RhZyA9IHRoaXMuZ2V0X3RhZyh0cnVlIC8qIHBlZWsuICovICk7XG5cbiAgICAgICAgICAgICAgICAvLyB0ZXN0IG5leHRfdGFnIHRvIHNlZSBpZiBpdCBpcyBqdXN0IGh0bWwgdGFnIChubyBleHRlcm5hbCBjb250ZW50KVxuICAgICAgICAgICAgICAgIHZhciB0YWcgPSAobmV4dF90YWcgfHwgXCJcIikubWF0Y2goL15cXHMqPFxccypcXC8/KFthLXpdKilcXHMqW14+XSo+XFxzKiQvKTtcblxuICAgICAgICAgICAgICAgIC8vIGlmIG5leHRfdGFnIGNvbWVzIGJhY2sgYnV0IGlzIG5vdCBhbiBpc29sYXRlZCB0YWcsIHRoZW5cbiAgICAgICAgICAgICAgICAvLyBsZXQncyB0cmVhdCB0aGUgJ2EnIHRhZyBhcyBoYXZpbmcgY29udGVudFxuICAgICAgICAgICAgICAgIC8vIGFuZCByZXNwZWN0IHRoZSB1bmZvcm1hdHRlZCBvcHRpb25cbiAgICAgICAgICAgICAgICBpZiAoIXRhZyB8fCB0aGlzLlV0aWxzLmluX2FycmF5KHRhZywgdW5mb3JtYXR0ZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnByaW50ZXIgPSBmdW5jdGlvbihqc19zb3VyY2UsIGluZGVudF9jaGFyYWN0ZXIsIGluZGVudF9zaXplLCB3cmFwX2xpbmVfbGVuZ3RoLCBicmFjZV9zdHlsZSkgeyAvL2hhbmRsZXMgaW5wdXQvb3V0cHV0IGFuZCBzb21lIG90aGVyIHByaW50aW5nIGZ1bmN0aW9uc1xuXG4gICAgICAgICAgICAgICAgdGhpcy5pbnB1dCA9IGpzX3NvdXJjZSB8fCAnJzsgLy9nZXRzIHRoZSBpbnB1dCBmb3IgdGhlIFBhcnNlclxuICAgICAgICAgICAgICAgIHRoaXMub3V0cHV0ID0gW107XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfY2hhcmFjdGVyID0gaW5kZW50X2NoYXJhY3RlcjtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9zdHJpbmcgPSAnJztcbiAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9zaXplID0gaW5kZW50X3NpemU7XG4gICAgICAgICAgICAgICAgdGhpcy5icmFjZV9zdHlsZSA9IGJyYWNlX3N0eWxlO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2xldmVsID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBfbGluZV9sZW5ndGggPSB3cmFwX2xpbmVfbGVuZ3RoO1xuICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50ID0gMDsgLy9jb3VudCB0byBzZWUgaWYgd3JhcF9saW5lX2xlbmd0aCB3YXMgZXhjZWVkZWRcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5pbmRlbnRfc2l6ZTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X3N0cmluZyArPSB0aGlzLmluZGVudF9jaGFyYWN0ZXI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5wcmludF9uZXdsaW5lID0gZnVuY3Rpb24oZm9yY2UsIGFycikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXJyIHx8ICFhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGZvcmNlIHx8IChhcnJbYXJyLmxlbmd0aCAtIDFdICE9PSAnXFxuJykpIHsgLy93ZSBtaWdodCB3YW50IHRoZSBleHRyYSBsaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGFyclthcnIubGVuZ3RoIC0gMV0gIT09ICdcXG4nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyclthcnIubGVuZ3RoIC0gMV0gPSBydHJpbShhcnJbYXJyLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGFyci5wdXNoKCdcXG4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB0aGlzLnByaW50X2luZGVudGF0aW9uID0gZnVuY3Rpb24oYXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5pbmRlbnRfbGV2ZWw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJyLnB1c2godGhpcy5pbmRlbnRfc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50ICs9IHRoaXMuaW5kZW50X3N0cmluZy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy5wcmludF90b2tlbiA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXZvaWQgcHJpbnRpbmcgaW5pdGlhbCB3aGl0ZXNwYWNlLlxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc193aGl0ZXNwYWNlKHRleHQpICYmICF0aGlzLm91dHB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodGV4dCB8fCB0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3V0cHV0Lmxlbmd0aCAmJiB0aGlzLm91dHB1dFt0aGlzLm91dHB1dC5sZW5ndGggLSAxXSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X2luZGVudGF0aW9uKHRoaXMub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gbHRyaW0odGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF90b2tlbl9yYXcodGV4dCk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfdG9rZW5fcmF3ID0gZnVuY3Rpb24odGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBhcmUgZ29pbmcgdG8gcHJpbnQgbmV3bGluZXMsIHRydW5jYXRlIHRyYWlsaW5nXG4gICAgICAgICAgICAgICAgICAgIC8vIHdoaXRlc3BhY2UsIGFzIHRoZSBuZXdsaW5lcyB3aWxsIHJlcHJlc2VudCB0aGUgc3BhY2UuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm5ld2xpbmVzID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dCA9IHJ0cmltKHRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQgJiYgdGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZXh0Lmxlbmd0aCA+IDEgJiYgdGV4dFt0ZXh0Lmxlbmd0aCAtIDFdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVuZm9ybWF0dGVkIHRhZ3MgY2FuIGdyYWIgbmV3bGluZXMgYXMgdGhlaXIgbGFzdCBjaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm91dHB1dC5wdXNoKHRleHQuc2xpY2UoMCwgLTEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X25ld2xpbmUoZmFsc2UsIHRoaXMub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vdXRwdXQucHVzaCh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgdGhpcy5uZXdsaW5lczsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X25ld2xpbmUobiA+IDAsIHRoaXMub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5ld2xpbmVzID0gMDtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy5pbmRlbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfbGV2ZWwrKztcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy51bmluZGVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pbmRlbnRfbGV2ZWwgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9sZXZlbC0tO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8qX19fX19fX19fX19fX19fX19fX19fLS0tLS0tLS0tLS0tLS0tLS0tLS1fX19fX19fX19fX19fX19fX19fX18qL1xuXG4gICAgICAgIG11bHRpX3BhcnNlciA9IG5ldyBQYXJzZXIoKTsgLy93cmFwcGluZyBmdW5jdGlvbnMgUGFyc2VyXG4gICAgICAgIG11bHRpX3BhcnNlci5wcmludGVyKGh0bWxfc291cmNlLCBpbmRlbnRfY2hhcmFjdGVyLCBpbmRlbnRfc2l6ZSwgd3JhcF9saW5lX2xlbmd0aCwgYnJhY2Vfc3R5bGUpOyAvL2luaXRpYWxpemUgc3RhcnRpbmcgdmFsdWVzXG5cbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHZhciB0ID0gbXVsdGlfcGFyc2VyLmdldF90b2tlbigpO1xuICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnRva2VuX3RleHQgPSB0WzBdO1xuICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnRva2VuX3R5cGUgPSB0WzFdO1xuXG4gICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLnRva2VuX3R5cGUgPT09ICdUS19FT0YnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN3aXRjaCAobXVsdGlfcGFyc2VyLnRva2VuX3R5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdUS19UQUdfU1RBUlQnOlxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfbmV3bGluZShmYWxzZSwgbXVsdGlfcGFyc2VyLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbihtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIuaW5kZW50X2NvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5pbmRlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5pbmRlbnRfY29udGVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnQ09OVEVOVCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1RBR19TVFlMRSc6XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfVEFHX1NDUklQVCc6XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKGZhbHNlLCBtdWx0aV9wYXJzZXIub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdDT05URU5UJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfVEFHX0VORCc6XG4gICAgICAgICAgICAgICAgICAgIC8vUHJpbnQgbmV3IGxpbmUgb25seSBpZiB0aGUgdGFnIGhhcyBubyBjb250ZW50IGFuZCBoYXMgY2hpbGRcbiAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci5sYXN0X3Rva2VuID09PSAnVEtfQ09OVEVOVCcgJiYgbXVsdGlfcGFyc2VyLmxhc3RfdGV4dCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWdfbmFtZSA9IG11bHRpX3BhcnNlci50b2tlbl90ZXh0Lm1hdGNoKC9cXHcrLylbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGFnX2V4dHJhY3RlZF9mcm9tX2xhc3Rfb3V0cHV0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIub3V0cHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19leHRyYWN0ZWRfZnJvbV9sYXN0X291dHB1dCA9IG11bHRpX3BhcnNlci5vdXRwdXRbbXVsdGlfcGFyc2VyLm91dHB1dC5sZW5ndGggLSAxXS5tYXRjaCgvKD86PHx7eyMpXFxzKihcXHcrKS8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhZ19leHRyYWN0ZWRfZnJvbV9sYXN0X291dHB1dCA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19leHRyYWN0ZWRfZnJvbV9sYXN0X291dHB1dFsxXSAhPT0gdGFnX25hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfbmV3bGluZShmYWxzZSwgbXVsdGlfcGFyc2VyLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdDT05URU5UJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfVEFHX1NJTkdMRSc6XG4gICAgICAgICAgICAgICAgICAgIC8vIERvbid0IGFkZCBhIG5ld2xpbmUgYmVmb3JlIGVsZW1lbnRzIHRoYXQgc2hvdWxkIHJlbWFpbiB1bmZvcm1hdHRlZC5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZ19jaGVjayA9IG11bHRpX3BhcnNlci50b2tlbl90ZXh0Lm1hdGNoKC9eXFxzKjwoW2Etei1dKykvaSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGFnX2NoZWNrIHx8ICFtdWx0aV9wYXJzZXIuVXRpbHMuaW5fYXJyYXkodGFnX2NoZWNrWzFdLCB1bmZvcm1hdHRlZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKGZhbHNlLCBtdWx0aV9wYXJzZXIub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW4obXVsdGlfcGFyc2VyLnRva2VuX3RleHQpO1xuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuY3VycmVudF9tb2RlID0gJ0NPTlRFTlQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdUS19UQUdfSEFORExFQkFSU19FTFNFJzpcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci5pbmRlbnRfY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmluZGVudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmluZGVudF9jb250ZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdDT05URU5UJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfQ09OVEVOVCc6XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbihtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnVEFHJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfU1RZTEUnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1NDUklQVCc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKGZhbHNlLCBtdWx0aV9wYXJzZXIub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gbXVsdGlfcGFyc2VyLnRva2VuX3RleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2JlYXV0aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0X2luZGVudF9sZXZlbCA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLnRva2VuX3R5cGUgPT09ICdUS19TQ1JJUFQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2JlYXV0aWZpZXIgPSB0eXBlb2YganNfYmVhdXRpZnkgPT09ICdmdW5jdGlvbicgJiYganNfYmVhdXRpZnk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG11bHRpX3BhcnNlci50b2tlbl90eXBlID09PSAnVEtfU1RZTEUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2JlYXV0aWZpZXIgPSB0eXBlb2YgY3NzX2JlYXV0aWZ5ID09PSAnZnVuY3Rpb24nICYmIGNzc19iZWF1dGlmeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuaW5kZW50X3NjcmlwdHMgPT09IFwia2VlcFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0X2luZGVudF9sZXZlbCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaW5kZW50X3NjcmlwdHMgPT09IFwic2VwYXJhdGVcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdF9pbmRlbnRfbGV2ZWwgPSAtbXVsdGlfcGFyc2VyLmluZGVudF9sZXZlbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGluZGVudGF0aW9uID0gbXVsdGlfcGFyc2VyLmdldF9mdWxsX2luZGVudChzY3JpcHRfaW5kZW50X2xldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfYmVhdXRpZmllcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbGwgdGhlIEJlYXV0aWZpZXIgaWYgYXZhbGlhYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dCA9IF9iZWF1dGlmaWVyKHRleHQucmVwbGFjZSgvXlxccyovLCBpbmRlbnRhdGlvbiksIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW1wbHkgaW5kZW50IHRoZSBzdHJpbmcgb3RoZXJ3aXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdoaXRlID0gdGV4dC5tYXRjaCgvXlxccyovKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgX2xldmVsID0gd2hpdGUubWF0Y2goL1teXFxuXFxyXSokLylbMF0uc3BsaXQobXVsdGlfcGFyc2VyLmluZGVudF9zdHJpbmcpLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlaW5kZW50ID0gbXVsdGlfcGFyc2VyLmdldF9mdWxsX2luZGVudChzY3JpcHRfaW5kZW50X2xldmVsIC0gX2xldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eXFxzKi8sIGluZGVudGF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxyXFxufFxccnxcXG4vZywgJ1xcbicgKyByZWluZGVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xccyskLywgJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW5fcmF3KHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKHRydWUsIG11bHRpX3BhcnNlci5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnVEFHJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgLy8gV2Ugc2hvdWxkIG5vdCBiZSBnZXR0aW5nIGhlcmUgYnV0IHdlIGRvbid0IHdhbnQgdG8gZHJvcCBpbnB1dCBvbiB0aGUgZmxvb3JcbiAgICAgICAgICAgICAgICAgICAgLy8gSnVzdCBvdXRwdXQgdGhlIHRleHQgYW5kIG1vdmUgb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci50b2tlbl90ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG11bHRpX3BhcnNlci5sYXN0X3Rva2VuID0gbXVsdGlfcGFyc2VyLnRva2VuX3R5cGU7XG4gICAgICAgICAgICBtdWx0aV9wYXJzZXIubGFzdF90ZXh0ID0gbXVsdGlfcGFyc2VyLnRva2VuX3RleHQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN3ZWV0X2NvZGUgPSBtdWx0aV9wYXJzZXIub3V0cHV0LmpvaW4oJycpLnJlcGxhY2UoL1tcXHJcXG5cXHQgXSskLywgJycpO1xuICAgICAgICBpZiAoZW5kX3dpdGhfbmV3bGluZSkge1xuICAgICAgICAgICAgc3dlZXRfY29kZSArPSAnXFxuJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3dlZXRfY29kZTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIEFNRCAoIGh0dHBzOi8vZ2l0aHViLmNvbS9hbWRqcy9hbWRqcy1hcGkvd2lraS9BTUQjZGVmaW5lYW1kLXByb3BlcnR5LSApXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiLi9iZWF1dGlmeVwiLCBcIi4vYmVhdXRpZnktY3NzXCJdLCBmdW5jdGlvbihyZXF1aXJlYW1kKSB7XG4gICAgICAgICAgICB2YXIganNfYmVhdXRpZnkgPSAgcmVxdWlyZWFtZChcIi4vYmVhdXRpZnlcIik7XG4gICAgICAgICAgICB2YXIgY3NzX2JlYXV0aWZ5ID0gIHJlcXVpcmVhbWQoXCIuL2JlYXV0aWZ5LWNzc1wiKTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgaHRtbF9iZWF1dGlmeTogZnVuY3Rpb24oaHRtbF9zb3VyY2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucywganNfYmVhdXRpZnkuanNfYmVhdXRpZnksIGNzc19iZWF1dGlmeS5jc3NfYmVhdXRpZnkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIEFkZCBzdXBwb3J0IGZvciBDb21tb25KUy4gSnVzdCBwdXQgdGhpcyBmaWxlIHNvbWV3aGVyZSBvbiB5b3VyIHJlcXVpcmUucGF0aHNcbiAgICAgICAgLy8gYW5kIHlvdSB3aWxsIGJlIGFibGUgdG8gYHZhciBodG1sX2JlYXV0aWZ5ID0gcmVxdWlyZShcImJlYXV0aWZ5XCIpLmh0bWxfYmVhdXRpZnlgLlxuICAgICAgICB2YXIganNfYmVhdXRpZnkgPSByZXF1aXJlKCcuL2JlYXV0aWZ5LmpzJyk7XG4gICAgICAgIHZhciBjc3NfYmVhdXRpZnkgPSByZXF1aXJlKCcuL2JlYXV0aWZ5LWNzcy5qcycpO1xuXG4gICAgICAgIGV4cG9ydHMuaHRtbF9iZWF1dGlmeSA9IGZ1bmN0aW9uKGh0bWxfc291cmNlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucywganNfYmVhdXRpZnkuanNfYmVhdXRpZnksIGNzc19iZWF1dGlmeS5jc3NfYmVhdXRpZnkpO1xuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSdyZSBydW5uaW5nIGEgd2ViIHBhZ2UgYW5kIGRvbid0IGhhdmUgZWl0aGVyIG9mIHRoZSBhYm92ZSwgYWRkIG91ciBvbmUgZ2xvYmFsXG4gICAgICAgIHdpbmRvdy5odG1sX2JlYXV0aWZ5ID0gZnVuY3Rpb24oaHRtbF9zb3VyY2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHlsZV9odG1sKGh0bWxfc291cmNlLCBvcHRpb25zLCB3aW5kb3cuanNfYmVhdXRpZnksIHdpbmRvdy5jc3NfYmVhdXRpZnkpO1xuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSBkb24ndCBldmVuIGhhdmUgd2luZG93LCB0cnkgZ2xvYmFsLlxuICAgICAgICBnbG9iYWwuaHRtbF9iZWF1dGlmeSA9IGZ1bmN0aW9uKGh0bWxfc291cmNlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICByZXR1cm4gc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucywgZ2xvYmFsLmpzX2JlYXV0aWZ5LCBnbG9iYWwuY3NzX2JlYXV0aWZ5KTtcbiAgICAgICAgfTtcbiAgICB9XG5cbn0oKSk7XG4iLCIvKmpzaGludCBjdXJseTp0cnVlLCBlcWVxZXE6dHJ1ZSwgbGF4YnJlYWs6dHJ1ZSwgbm9lbXB0eTpmYWxzZSAqL1xuLypcblxuICBUaGUgTUlUIExpY2Vuc2UgKE1JVClcblxuICBDb3B5cmlnaHQgKGMpIDIwMDctMjAxMyBFaW5hciBMaWVsbWFuaXMgYW5kIGNvbnRyaWJ1dG9ycy5cblxuICBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvblxuICBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlc1xuICAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsXG4gIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsXG4gIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG4gIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlXG4gIGluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG4gIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsXG4gIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuICBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORFxuICBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTXG4gIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTlxuICBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTlxuICBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gIFNPRlRXQVJFLlxuXG4gSlMgQmVhdXRpZmllclxuLS0tLS0tLS0tLS0tLS0tXG5cblxuICBXcml0dGVuIGJ5IEVpbmFyIExpZWxtYW5pcywgPGVpbmFyQGpzYmVhdXRpZmllci5vcmc+XG4gICAgICBodHRwOi8vanNiZWF1dGlmaWVyLm9yZy9cblxuICBPcmlnaW5hbGx5IGNvbnZlcnRlZCB0byBqYXZhc2NyaXB0IGJ5IFZpdGFsLCA8dml0YWw3NkBnbWFpbC5jb20+XG4gIFwiRW5kIGJyYWNlcyBvbiBvd24gbGluZVwiIGFkZGVkIGJ5IENocmlzIEouIFNodWxsLCA8Y2hyaXNqc2h1bGxAZ21haWwuY29tPlxuICBQYXJzaW5nIGltcHJvdmVtZW50cyBmb3IgYnJhY2UtbGVzcyBzdGF0ZW1lbnRzIGJ5IExpYW0gTmV3bWFuIDxiaXR3aXNlbWFuQGdtYWlsLmNvbT5cblxuXG4gIFVzYWdlOlxuICAgIGpzX2JlYXV0aWZ5KGpzX3NvdXJjZV90ZXh0KTtcbiAgICBqc19iZWF1dGlmeShqc19zb3VyY2VfdGV4dCwgb3B0aW9ucyk7XG5cbiAgVGhlIG9wdGlvbnMgYXJlOlxuICAgIGluZGVudF9zaXplIChkZWZhdWx0IDQpICAgICAgICAgIC0gaW5kZW50YXRpb24gc2l6ZSxcbiAgICBpbmRlbnRfY2hhciAoZGVmYXVsdCBzcGFjZSkgICAgICAtIGNoYXJhY3RlciB0byBpbmRlbnQgd2l0aCxcbiAgICBwcmVzZXJ2ZV9uZXdsaW5lcyAoZGVmYXVsdCB0cnVlKSAtIHdoZXRoZXIgZXhpc3RpbmcgbGluZSBicmVha3Mgc2hvdWxkIGJlIHByZXNlcnZlZCxcbiAgICBtYXhfcHJlc2VydmVfbmV3bGluZXMgKGRlZmF1bHQgdW5saW1pdGVkKSAtIG1heGltdW0gbnVtYmVyIG9mIGxpbmUgYnJlYWtzIHRvIGJlIHByZXNlcnZlZCBpbiBvbmUgY2h1bmssXG5cbiAgICBqc2xpbnRfaGFwcHkgKGRlZmF1bHQgZmFsc2UpIC0gaWYgdHJ1ZSwgdGhlbiBqc2xpbnQtc3RyaWN0ZXIgbW9kZSBpcyBlbmZvcmNlZC5cblxuICAgICAgICAgICAganNsaW50X2hhcHB5ICAgICAgICAhanNsaW50X2hhcHB5XG4gICAgICAgICAgICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgICAgIGZ1bmN0aW9uICgpICAgICAgICAgZnVuY3Rpb24oKVxuXG4gICAgICAgICAgICBzd2l0Y2ggKCkgeyAgICAgICAgIHN3aXRjaCgpIHtcbiAgICAgICAgICAgIGNhc2UgMTogICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgIGJyZWFrOyAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgfVxuXG4gICAgc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbiAoZGVmYXVsdCBmYWxzZSkgLSBzaG91bGQgdGhlIHNwYWNlIGJlZm9yZSBhbiBhbm9ueW1vdXMgZnVuY3Rpb24ncyBwYXJlbnMgYmUgYWRkZWQsIFwiZnVuY3Rpb24oKVwiIHZzIFwiZnVuY3Rpb24gKClcIixcbiAgICAgICAgICBOT1RFOiBUaGlzIG9wdGlvbiBpcyBvdmVycmlkZW4gYnkganNsaW50X2hhcHB5IChpLmUuIGlmIGpzbGludF9oYXBweSBpcyB0cnVlLCBzcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uIGlzIHRydWUgYnkgZGVzaWduKVxuXG4gICAgYnJhY2Vfc3R5bGUgKGRlZmF1bHQgXCJjb2xsYXBzZVwiKSAtIFwiY29sbGFwc2VcIiB8IFwiZXhwYW5kXCIgfCBcImVuZC1leHBhbmRcIlxuICAgICAgICAgICAgcHV0IGJyYWNlcyBvbiB0aGUgc2FtZSBsaW5lIGFzIGNvbnRyb2wgc3RhdGVtZW50cyAoZGVmYXVsdCksIG9yIHB1dCBicmFjZXMgb24gb3duIGxpbmUgKEFsbG1hbiAvIEFOU0kgc3R5bGUpLCBvciBqdXN0IHB1dCBlbmQgYnJhY2VzIG9uIG93biBsaW5lLlxuXG4gICAgc3BhY2VfYmVmb3JlX2NvbmRpdGlvbmFsIChkZWZhdWx0IHRydWUpIC0gc2hvdWxkIHRoZSBzcGFjZSBiZWZvcmUgY29uZGl0aW9uYWwgc3RhdGVtZW50IGJlIGFkZGVkLCBcImlmKHRydWUpXCIgdnMgXCJpZiAodHJ1ZSlcIixcblxuICAgIHVuZXNjYXBlX3N0cmluZ3MgKGRlZmF1bHQgZmFsc2UpIC0gc2hvdWxkIHByaW50YWJsZSBjaGFyYWN0ZXJzIGluIHN0cmluZ3MgZW5jb2RlZCBpbiBcXHhOTiBub3RhdGlvbiBiZSB1bmVzY2FwZWQsIFwiZXhhbXBsZVwiIHZzIFwiXFx4NjVcXHg3OFxceDYxXFx4NmRcXHg3MFxceDZjXFx4NjVcIlxuXG4gICAgd3JhcF9saW5lX2xlbmd0aCAoZGVmYXVsdCB1bmxpbWl0ZWQpIC0gbGluZXMgc2hvdWxkIHdyYXAgYXQgbmV4dCBvcHBvcnR1bml0eSBhZnRlciB0aGlzIG51bWJlciBvZiBjaGFyYWN0ZXJzLlxuICAgICAgICAgIE5PVEU6IFRoaXMgaXMgbm90IGEgaGFyZCBsaW1pdC4gTGluZXMgd2lsbCBjb250aW51ZSB1bnRpbCBhIHBvaW50IHdoZXJlIGEgbmV3bGluZSB3b3VsZFxuICAgICAgICAgICAgICAgIGJlIHByZXNlcnZlZCBpZiBpdCB3ZXJlIHByZXNlbnQuXG5cbiAgICBlbmRfd2l0aF9uZXdsaW5lIChkZWZhdWx0IGZhbHNlKSAgLSBlbmQgb3V0cHV0IHdpdGggYSBuZXdsaW5lXG5cblxuICAgIGUuZ1xuXG4gICAganNfYmVhdXRpZnkoanNfc291cmNlX3RleHQsIHtcbiAgICAgICdpbmRlbnRfc2l6ZSc6IDEsXG4gICAgICAnaW5kZW50X2NoYXInOiAnXFx0J1xuICAgIH0pO1xuXG4qL1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgYWNvcm4gPSB7fTtcbiAgICAoZnVuY3Rpb24gKGV4cG9ydHMpIHtcbiAgICAgIC8vIFRoaXMgc2VjdGlvbiBvZiBjb2RlIGlzIHRha2VuIGZyb20gYWNvcm4uXG4gICAgICAvL1xuICAgICAgLy8gQWNvcm4gd2FzIHdyaXR0ZW4gYnkgTWFyaWpuIEhhdmVyYmVrZSBhbmQgcmVsZWFzZWQgdW5kZXIgYW4gTUlUXG4gICAgICAvLyBsaWNlbnNlLiBUaGUgVW5pY29kZSByZWdleHBzIChmb3IgaWRlbnRpZmllcnMgYW5kIHdoaXRlc3BhY2UpIHdlcmVcbiAgICAgIC8vIHRha2VuIGZyb20gW0VzcHJpbWFdKGh0dHA6Ly9lc3ByaW1hLm9yZykgYnkgQXJpeWEgSGlkYXlhdC5cbiAgICAgIC8vXG4gICAgICAvLyBHaXQgcmVwb3NpdG9yaWVzIGZvciBBY29ybiBhcmUgYXZhaWxhYmxlIGF0XG4gICAgICAvL1xuICAgICAgLy8gICAgIGh0dHA6Ly9tYXJpam5oYXZlcmJla2UubmwvZ2l0L2Fjb3JuXG4gICAgICAvLyAgICAgaHR0cHM6Ly9naXRodWIuY29tL21hcmlqbmgvYWNvcm4uZ2l0XG5cbiAgICAgIC8vICMjIENoYXJhY3RlciBjYXRlZ29yaWVzXG5cbiAgICAgIC8vIEJpZyB1Z2x5IHJlZ3VsYXIgZXhwcmVzc2lvbnMgdGhhdCBtYXRjaCBjaGFyYWN0ZXJzIGluIHRoZVxuICAgICAgLy8gd2hpdGVzcGFjZSwgaWRlbnRpZmllciwgYW5kIGlkZW50aWZpZXItc3RhcnQgY2F0ZWdvcmllcy4gVGhlc2VcbiAgICAgIC8vIGFyZSBvbmx5IGFwcGxpZWQgd2hlbiBhIGNoYXJhY3RlciBpcyBmb3VuZCB0byBhY3R1YWxseSBoYXZlIGFcbiAgICAgIC8vIGNvZGUgcG9pbnQgYWJvdmUgMTI4LlxuXG4gICAgICB2YXIgbm9uQVNDSUl3aGl0ZXNwYWNlID0gL1tcXHUxNjgwXFx1MTgwZVxcdTIwMDAtXFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdWZlZmZdLztcbiAgICAgIHZhciBub25BU0NJSWlkZW50aWZpZXJTdGFydENoYXJzID0gXCJcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyN1xcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYxLVxcdTA1ODdcXHUwNWQwLVxcdTA1ZWFcXHUwNWYwLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDhhMFxcdTA4YTItXFx1MDhhY1xcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTc3XFx1MDk3OS1cXHUwOTdmXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzNcXHUwYzM1LVxcdTBjMzlcXHUwYzNkXFx1MGM1OFxcdTBjNTlcXHUwYzYwXFx1MGM2MVxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ2MFxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y0XFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmYwXFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzdcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFjXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTljMS1cXHUxOWM3XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE5LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMmRcXHUyMTJmLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUyZTJmXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5ZC1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJkXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmNjXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OTdcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3OGVcXHVhNzkwLVxcdWE3OTNcXHVhN2EwLVxcdWE3YWFcXHVhN2Y4LVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTgwLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiYzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY1wiO1xuICAgICAgdmFyIG5vbkFTQ0lJaWRlbnRpZmllckNoYXJzID0gXCJcXHUwMzAwLVxcdTAzNmZcXHUwNDgzLVxcdTA0ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNjEwLVxcdTA2MWFcXHUwNjIwLVxcdTA2NDlcXHUwNjcyLVxcdTA2ZDNcXHUwNmU3LVxcdTA2ZThcXHUwNmZiLVxcdTA2ZmNcXHUwNzMwLVxcdTA3NGFcXHUwODAwLVxcdTA4MTRcXHUwODFiLVxcdTA4MjNcXHUwODI1LVxcdTA4MjdcXHUwODI5LVxcdTA4MmRcXHUwODQwLVxcdTA4NTdcXHUwOGU0LVxcdTA4ZmVcXHUwOTAwLVxcdTA5MDNcXHUwOTNhLVxcdTA5M2NcXHUwOTNlLVxcdTA5NGZcXHUwOTUxLVxcdTA5NTdcXHUwOTYyLVxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTgxLVxcdTA5ODNcXHUwOWJjXFx1MDliZS1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWQ3XFx1MDlkZi1cXHUwOWUwXFx1MGEwMS1cXHUwYTAzXFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNjYtXFx1MGE3MVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYWJjXFx1MGFiZS1cXHUwYWM1XFx1MGFjNy1cXHUwYWM5XFx1MGFjYi1cXHUwYWNkXFx1MGFlMi1cXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGIwMS1cXHUwYjAzXFx1MGIzY1xcdTBiM2UtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjVmLVxcdTBiNjBcXHUwYjY2LVxcdTBiNmZcXHUwYjgyXFx1MGJiZS1cXHUwYmMyXFx1MGJjNi1cXHUwYmM4XFx1MGJjYS1cXHUwYmNkXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDEtXFx1MGMwM1xcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM2Mi1cXHUwYzYzXFx1MGM2Ni1cXHUwYzZmXFx1MGM4MlxcdTBjODNcXHUwY2JjXFx1MGNiZS1cXHUwY2M0XFx1MGNjNi1cXHUwY2M4XFx1MGNjYS1cXHUwY2NkXFx1MGNkNVxcdTBjZDZcXHUwY2UyLVxcdTBjZTNcXHUwY2U2LVxcdTBjZWZcXHUwZDAyXFx1MGQwM1xcdTBkNDYtXFx1MGQ0OFxcdTBkNTdcXHUwZDYyLVxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDgyXFx1MGQ4M1xcdTBkY2FcXHUwZGNmLVxcdTBkZDRcXHUwZGQ2XFx1MGRkOC1cXHUwZGRmXFx1MGRmMlxcdTBkZjNcXHUwZTM0LVxcdTBlM2FcXHUwZTQwLVxcdTBlNDVcXHUwZTUwLVxcdTBlNTlcXHUwZWI0LVxcdTBlYjlcXHUwZWM4LVxcdTBlY2RcXHUwZWQwLVxcdTBlZDlcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmNDEtXFx1MGY0N1xcdTBmNzEtXFx1MGY4NFxcdTBmODYtXFx1MGY4N1xcdTBmOGQtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDAwLVxcdTEwMjlcXHUxMDQwLVxcdTEwNDlcXHUxMDY3LVxcdTEwNmRcXHUxMDcxLVxcdTEwNzRcXHUxMDgyLVxcdTEwOGRcXHUxMDhmLVxcdTEwOWRcXHUxMzVkLVxcdTEzNWZcXHUxNzBlLVxcdTE3MTBcXHUxNzIwLVxcdTE3MzBcXHUxNzQwLVxcdTE3NTBcXHUxNzcyXFx1MTc3M1xcdTE3ODAtXFx1MTdiMlxcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTUxLVxcdTE5NmRcXHUxOWIwLVxcdTE5YzBcXHUxOWM4LVxcdTE5YzlcXHUxOWQwLVxcdTE5ZDlcXHUxYTAwLVxcdTFhMTVcXHUxYTIwLVxcdTFhNTNcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYjQ2LVxcdTFiNGJcXHUxYjUwLVxcdTFiNTlcXHUxYjZiLVxcdTFiNzNcXHUxYmIwLVxcdTFiYjlcXHUxYmU2LVxcdTFiZjNcXHUxYzAwLVxcdTFjMjJcXHUxYzQwLVxcdTFjNDlcXHUxYzViLVxcdTFjN2RcXHUxY2QwLVxcdTFjZDJcXHUxZDAwLVxcdTFkYmVcXHUxZTAxLVxcdTFmMTVcXHUyMDBjXFx1MjAwZFxcdTIwM2ZcXHUyMDQwXFx1MjA1NFxcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyZDgxLVxcdTJkOTZcXHUyZGUwLVxcdTJkZmZcXHUzMDIxLVxcdTMwMjhcXHUzMDk5XFx1MzA5YVxcdWE2NDAtXFx1YTY2ZFxcdWE2NzQtXFx1YTY3ZFxcdWE2OWZcXHVhNmYwLVxcdWE2ZjFcXHVhN2Y4LVxcdWE4MDBcXHVhODA2XFx1YTgwYlxcdWE4MjMtXFx1YTgyN1xcdWE4ODAtXFx1YTg4MVxcdWE4YjQtXFx1YThjNFxcdWE4ZDAtXFx1YThkOVxcdWE4ZjMtXFx1YThmN1xcdWE5MDAtXFx1YTkwOVxcdWE5MjYtXFx1YTkyZFxcdWE5MzAtXFx1YTk0NVxcdWE5ODAtXFx1YTk4M1xcdWE5YjMtXFx1YTljMFxcdWFhMDAtXFx1YWEyN1xcdWFhNDAtXFx1YWE0MVxcdWFhNGMtXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhN2JcXHVhYWUwLVxcdWFhZTlcXHVhYWYyLVxcdWFhZjNcXHVhYmMwLVxcdWFiZTFcXHVhYmVjXFx1YWJlZFxcdWFiZjAtXFx1YWJmOVxcdWZiMjAtXFx1ZmIyOFxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyNlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmYxMC1cXHVmZjE5XFx1ZmYzZlwiO1xuICAgICAgdmFyIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0ID0gbmV3IFJlZ0V4cChcIltcIiArIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0Q2hhcnMgKyBcIl1cIik7XG4gICAgICB2YXIgbm9uQVNDSUlpZGVudGlmaWVyID0gbmV3IFJlZ0V4cChcIltcIiArIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0Q2hhcnMgKyBub25BU0NJSWlkZW50aWZpZXJDaGFycyArIFwiXVwiKTtcblxuICAgICAgLy8gV2hldGhlciBhIHNpbmdsZSBjaGFyYWN0ZXIgZGVub3RlcyBhIG5ld2xpbmUuXG5cbiAgICAgIHZhciBuZXdsaW5lID0gZXhwb3J0cy5uZXdsaW5lID0gL1tcXG5cXHJcXHUyMDI4XFx1MjAyOV0vO1xuXG4gICAgICAvLyBNYXRjaGVzIGEgd2hvbGUgbGluZSBicmVhayAod2hlcmUgQ1JMRiBpcyBjb25zaWRlcmVkIGEgc2luZ2xlXG4gICAgICAvLyBsaW5lIGJyZWFrKS4gVXNlZCB0byBjb3VudCBsaW5lcy5cblxuICAgICAgdmFyIGxpbmVCcmVhayA9IC9cXHJcXG58W1xcblxcclxcdTIwMjhcXHUyMDI5XS9nO1xuXG4gICAgICAvLyBUZXN0IHdoZXRoZXIgYSBnaXZlbiBjaGFyYWN0ZXIgY29kZSBzdGFydHMgYW4gaWRlbnRpZmllci5cblxuICAgICAgdmFyIGlzSWRlbnRpZmllclN0YXJ0ID0gZXhwb3J0cy5pc0lkZW50aWZpZXJTdGFydCA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgICAgICAgaWYgKGNvZGUgPCA2NSkgcmV0dXJuIGNvZGUgPT09IDM2O1xuICAgICAgICBpZiAoY29kZSA8IDkxKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgaWYgKGNvZGUgPCA5NykgcmV0dXJuIGNvZGUgPT09IDk1O1xuICAgICAgICBpZiAoY29kZSA8IDEyMylyZXR1cm4gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGNvZGUgPj0gMHhhYSAmJiBub25BU0NJSWlkZW50aWZpZXJTdGFydC50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkpO1xuICAgICAgfTtcblxuICAgICAgLy8gVGVzdCB3aGV0aGVyIGEgZ2l2ZW4gY2hhcmFjdGVyIGlzIHBhcnQgb2YgYW4gaWRlbnRpZmllci5cblxuICAgICAgdmFyIGlzSWRlbnRpZmllckNoYXIgPSBleHBvcnRzLmlzSWRlbnRpZmllckNoYXIgPSBmdW5jdGlvbihjb2RlKSB7XG4gICAgICAgIGlmIChjb2RlIDwgNDgpIHJldHVybiBjb2RlID09PSAzNjtcbiAgICAgICAgaWYgKGNvZGUgPCA1OCkgcmV0dXJuIHRydWU7XG4gICAgICAgIGlmIChjb2RlIDwgNjUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGNvZGUgPCA5MSkgcmV0dXJuIHRydWU7XG4gICAgICAgIGlmIChjb2RlIDwgOTcpIHJldHVybiBjb2RlID09PSA5NTtcbiAgICAgICAgaWYgKGNvZGUgPCAxMjMpcmV0dXJuIHRydWU7XG4gICAgICAgIHJldHVybiBjb2RlID49IDB4YWEgJiYgbm9uQVNDSUlpZGVudGlmaWVyLnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKSk7XG4gICAgICB9O1xuICAgIH0pKGFjb3JuKTtcblxuICAgIGZ1bmN0aW9uIGluX2FycmF5KHdoYXQsIGFycikge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKGFycltpXSA9PT0gd2hhdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmltKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGpzX2JlYXV0aWZ5KGpzX3NvdXJjZV90ZXh0LCBvcHRpb25zKSB7XG4gICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICB2YXIgYmVhdXRpZmllciA9IG5ldyBCZWF1dGlmaWVyKGpzX3NvdXJjZV90ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIGJlYXV0aWZpZXIuYmVhdXRpZnkoKTtcbiAgICB9XG5cbiAgICB2YXIgTU9ERSA9IHtcbiAgICAgICAgICAgIEJsb2NrU3RhdGVtZW50OiAnQmxvY2tTdGF0ZW1lbnQnLCAvLyAnQkxPQ0snXG4gICAgICAgICAgICBTdGF0ZW1lbnQ6ICdTdGF0ZW1lbnQnLCAvLyAnU1RBVEVNRU5UJ1xuICAgICAgICAgICAgT2JqZWN0TGl0ZXJhbDogJ09iamVjdExpdGVyYWwnLCAvLyAnT0JKRUNUJyxcbiAgICAgICAgICAgIEFycmF5TGl0ZXJhbDogJ0FycmF5TGl0ZXJhbCcsIC8vJ1tFWFBSRVNTSU9OXScsXG4gICAgICAgICAgICBGb3JJbml0aWFsaXplcjogJ0ZvckluaXRpYWxpemVyJywgLy8nKEZPUi1FWFBSRVNTSU9OKScsXG4gICAgICAgICAgICBDb25kaXRpb25hbDogJ0NvbmRpdGlvbmFsJywgLy8nKENPTkQtRVhQUkVTU0lPTiknLFxuICAgICAgICAgICAgRXhwcmVzc2lvbjogJ0V4cHJlc3Npb24nIC8vJyhFWFBSRVNTSU9OKSdcbiAgICAgICAgfTtcblxuICAgIGZ1bmN0aW9uIEJlYXV0aWZpZXIoanNfc291cmNlX3RleHQsIG9wdGlvbnMpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgIHZhciBvdXRwdXRcbiAgICAgICAgdmFyIHRva2VucyA9IFtdLCB0b2tlbl9wb3M7XG4gICAgICAgIHZhciBUb2tlbml6ZXI7XG4gICAgICAgIHZhciBjdXJyZW50X3Rva2VuO1xuICAgICAgICB2YXIgbGFzdF90eXBlLCBsYXN0X2xhc3RfdGV4dCwgaW5kZW50X3N0cmluZztcbiAgICAgICAgdmFyIGZsYWdzLCBwcmV2aW91c19mbGFncywgZmxhZ19zdG9yZTtcbiAgICAgICAgdmFyIHByZWZpeDtcblxuICAgICAgICB2YXIgaGFuZGxlcnMsIG9wdDtcbiAgICAgICAgdmFyIGJhc2VJbmRlbnRTdHJpbmcgPSAnJztcblxuICAgICAgICBoYW5kbGVycyA9IHtcbiAgICAgICAgICAgICdUS19TVEFSVF9FWFBSJzogaGFuZGxlX3N0YXJ0X2V4cHIsXG4gICAgICAgICAgICAnVEtfRU5EX0VYUFInOiBoYW5kbGVfZW5kX2V4cHIsXG4gICAgICAgICAgICAnVEtfU1RBUlRfQkxPQ0snOiBoYW5kbGVfc3RhcnRfYmxvY2ssXG4gICAgICAgICAgICAnVEtfRU5EX0JMT0NLJzogaGFuZGxlX2VuZF9ibG9jayxcbiAgICAgICAgICAgICdUS19XT1JEJzogaGFuZGxlX3dvcmQsXG4gICAgICAgICAgICAnVEtfUkVTRVJWRUQnOiBoYW5kbGVfd29yZCxcbiAgICAgICAgICAgICdUS19TRU1JQ09MT04nOiBoYW5kbGVfc2VtaWNvbG9uLFxuICAgICAgICAgICAgJ1RLX1NUUklORyc6IGhhbmRsZV9zdHJpbmcsXG4gICAgICAgICAgICAnVEtfRVFVQUxTJzogaGFuZGxlX2VxdWFscyxcbiAgICAgICAgICAgICdUS19PUEVSQVRPUic6IGhhbmRsZV9vcGVyYXRvcixcbiAgICAgICAgICAgICdUS19DT01NQSc6IGhhbmRsZV9jb21tYSxcbiAgICAgICAgICAgICdUS19CTE9DS19DT01NRU5UJzogaGFuZGxlX2Jsb2NrX2NvbW1lbnQsXG4gICAgICAgICAgICAnVEtfSU5MSU5FX0NPTU1FTlQnOiBoYW5kbGVfaW5saW5lX2NvbW1lbnQsXG4gICAgICAgICAgICAnVEtfQ09NTUVOVCc6IGhhbmRsZV9jb21tZW50LFxuICAgICAgICAgICAgJ1RLX0RPVCc6IGhhbmRsZV9kb3QsXG4gICAgICAgICAgICAnVEtfVU5LTk9XTic6IGhhbmRsZV91bmtub3duLFxuICAgICAgICAgICAgJ1RLX0VPRic6IGhhbmRsZV9lb2ZcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBjcmVhdGVfZmxhZ3MoZmxhZ3NfYmFzZSwgbW9kZSkge1xuICAgICAgICAgICAgdmFyIG5leHRfaW5kZW50X2xldmVsID0gMDtcbiAgICAgICAgICAgIGlmIChmbGFnc19iYXNlKSB7XG4gICAgICAgICAgICAgICAgbmV4dF9pbmRlbnRfbGV2ZWwgPSBmbGFnc19iYXNlLmluZGVudGF0aW9uX2xldmVsO1xuICAgICAgICAgICAgICAgIGlmICghb3V0cHV0Lmp1c3RfYWRkZWRfbmV3bGluZSgpICYmXG4gICAgICAgICAgICAgICAgICAgIGZsYWdzX2Jhc2UubGluZV9pbmRlbnRfbGV2ZWwgPiBuZXh0X2luZGVudF9sZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0X2luZGVudF9sZXZlbCA9IGZsYWdzX2Jhc2UubGluZV9pbmRlbnRfbGV2ZWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbmV4dF9mbGFncyA9IHtcbiAgICAgICAgICAgICAgICBtb2RlOiBtb2RlLFxuICAgICAgICAgICAgICAgIHBhcmVudDogZmxhZ3NfYmFzZSxcbiAgICAgICAgICAgICAgICBsYXN0X3RleHQ6IGZsYWdzX2Jhc2UgPyBmbGFnc19iYXNlLmxhc3RfdGV4dCA6ICcnLCAvLyBsYXN0IHRva2VuIHRleHRcbiAgICAgICAgICAgICAgICBsYXN0X3dvcmQ6IGZsYWdzX2Jhc2UgPyBmbGFnc19iYXNlLmxhc3Rfd29yZCA6ICcnLCAvLyBsYXN0ICdUS19XT1JEJyBwYXNzZWRcbiAgICAgICAgICAgICAgICBkZWNsYXJhdGlvbl9zdGF0ZW1lbnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRlY2xhcmF0aW9uX2Fzc2lnbm1lbnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG11bHRpbGluZV9mcmFtZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgaWZfYmxvY2s6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVsc2VfYmxvY2s6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRvX2Jsb2NrOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkb193aGlsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW5fY2FzZV9zdGF0ZW1lbnQ6IGZhbHNlLCAvLyBzd2l0Y2goLi4peyBJTlNJREUgSEVSRSB9XG4gICAgICAgICAgICAgICAgaW5fY2FzZTogZmFsc2UsIC8vIHdlJ3JlIG9uIHRoZSBleGFjdCBsaW5lIHdpdGggXCJjYXNlIDA6XCJcbiAgICAgICAgICAgICAgICBjYXNlX2JvZHk6IGZhbHNlLCAvLyB0aGUgaW5kZW50ZWQgY2FzZS1hY3Rpb24gYmxvY2tcbiAgICAgICAgICAgICAgICBpbmRlbnRhdGlvbl9sZXZlbDogbmV4dF9pbmRlbnRfbGV2ZWwsXG4gICAgICAgICAgICAgICAgbGluZV9pbmRlbnRfbGV2ZWw6IGZsYWdzX2Jhc2UgPyBmbGFnc19iYXNlLmxpbmVfaW5kZW50X2xldmVsIDogbmV4dF9pbmRlbnRfbGV2ZWwsXG4gICAgICAgICAgICAgICAgc3RhcnRfbGluZV9pbmRleDogb3V0cHV0LmdldF9saW5lX251bWJlcigpLFxuICAgICAgICAgICAgICAgIHRlcm5hcnlfZGVwdGg6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gbmV4dF9mbGFncztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNvbWUgaW50ZXJwcmV0ZXJzIGhhdmUgdW5leHBlY3RlZCByZXN1bHRzIHdpdGggZm9vID0gYmF6IHx8IGJhcjtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgPyBvcHRpb25zIDoge307XG4gICAgICAgIG9wdCA9IHt9O1xuXG4gICAgICAgIC8vIGNvbXBhdGliaWxpdHlcbiAgICAgICAgaWYgKG9wdGlvbnMuYnJhY2VzX29uX293bl9saW5lICE9PSB1bmRlZmluZWQpIHsgLy9ncmFjZWZ1bCBoYW5kbGluZyBvZiBkZXByZWNhdGVkIG9wdGlvblxuICAgICAgICAgICAgb3B0LmJyYWNlX3N0eWxlID0gb3B0aW9ucy5icmFjZXNfb25fb3duX2xpbmUgPyBcImV4cGFuZFwiIDogXCJjb2xsYXBzZVwiO1xuICAgICAgICB9XG4gICAgICAgIG9wdC5icmFjZV9zdHlsZSA9IG9wdGlvbnMuYnJhY2Vfc3R5bGUgPyBvcHRpb25zLmJyYWNlX3N0eWxlIDogKG9wdC5icmFjZV9zdHlsZSA/IG9wdC5icmFjZV9zdHlsZSA6IFwiY29sbGFwc2VcIik7XG5cbiAgICAgICAgLy8gZ3JhY2VmdWwgaGFuZGxpbmcgb2YgZGVwcmVjYXRlZCBvcHRpb25cbiAgICAgICAgaWYgKG9wdC5icmFjZV9zdHlsZSA9PT0gXCJleHBhbmQtc3RyaWN0XCIpIHtcbiAgICAgICAgICAgIG9wdC5icmFjZV9zdHlsZSA9IFwiZXhwYW5kXCI7XG4gICAgICAgIH1cblxuXG4gICAgICAgIG9wdC5pbmRlbnRfc2l6ZSA9IG9wdGlvbnMuaW5kZW50X3NpemUgPyBwYXJzZUludChvcHRpb25zLmluZGVudF9zaXplLCAxMCkgOiA0O1xuICAgICAgICBvcHQuaW5kZW50X2NoYXIgPSBvcHRpb25zLmluZGVudF9jaGFyID8gb3B0aW9ucy5pbmRlbnRfY2hhciA6ICcgJztcbiAgICAgICAgb3B0LnByZXNlcnZlX25ld2xpbmVzID0gKG9wdGlvbnMucHJlc2VydmVfbmV3bGluZXMgPT09IHVuZGVmaW5lZCkgPyB0cnVlIDogb3B0aW9ucy5wcmVzZXJ2ZV9uZXdsaW5lcztcbiAgICAgICAgb3B0LmJyZWFrX2NoYWluZWRfbWV0aG9kcyA9IChvcHRpb25zLmJyZWFrX2NoYWluZWRfbWV0aG9kcyA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5icmVha19jaGFpbmVkX21ldGhvZHM7XG4gICAgICAgIG9wdC5tYXhfcHJlc2VydmVfbmV3bGluZXMgPSAob3B0aW9ucy5tYXhfcHJlc2VydmVfbmV3bGluZXMgPT09IHVuZGVmaW5lZCkgPyAwIDogcGFyc2VJbnQob3B0aW9ucy5tYXhfcHJlc2VydmVfbmV3bGluZXMsIDEwKTtcbiAgICAgICAgb3B0LnNwYWNlX2luX3BhcmVuID0gKG9wdGlvbnMuc3BhY2VfaW5fcGFyZW4gPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuc3BhY2VfaW5fcGFyZW47XG4gICAgICAgIG9wdC5zcGFjZV9pbl9lbXB0eV9wYXJlbiA9IChvcHRpb25zLnNwYWNlX2luX2VtcHR5X3BhcmVuID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLnNwYWNlX2luX2VtcHR5X3BhcmVuO1xuICAgICAgICBvcHQuanNsaW50X2hhcHB5ID0gKG9wdGlvbnMuanNsaW50X2hhcHB5ID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmpzbGludF9oYXBweTtcbiAgICAgICAgb3B0LnNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24gPSAob3B0aW9ucy5zcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLnNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb247XG4gICAgICAgIG9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uID0gKG9wdGlvbnMua2VlcF9hcnJheV9pbmRlbnRhdGlvbiA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5rZWVwX2FycmF5X2luZGVudGF0aW9uO1xuICAgICAgICBvcHQuc3BhY2VfYmVmb3JlX2NvbmRpdGlvbmFsID0gKG9wdGlvbnMuc3BhY2VfYmVmb3JlX2NvbmRpdGlvbmFsID09PSB1bmRlZmluZWQpID8gdHJ1ZSA6IG9wdGlvbnMuc3BhY2VfYmVmb3JlX2NvbmRpdGlvbmFsO1xuICAgICAgICBvcHQudW5lc2NhcGVfc3RyaW5ncyA9IChvcHRpb25zLnVuZXNjYXBlX3N0cmluZ3MgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMudW5lc2NhcGVfc3RyaW5ncztcbiAgICAgICAgb3B0LndyYXBfbGluZV9sZW5ndGggPSAob3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoID09PSB1bmRlZmluZWQpID8gMCA6IHBhcnNlSW50KG9wdGlvbnMud3JhcF9saW5lX2xlbmd0aCwgMTApO1xuICAgICAgICBvcHQuZTR4ID0gKG9wdGlvbnMuZTR4ID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmU0eDtcbiAgICAgICAgb3B0LmVuZF93aXRoX25ld2xpbmUgPSAob3B0aW9ucy5lbmRfd2l0aF9uZXdsaW5lID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmVuZF93aXRoX25ld2xpbmU7XG5cblxuICAgICAgICAvLyBmb3JjZSBvcHQuc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbiB0byB0cnVlIGlmIG9wdC5qc2xpbnRfaGFwcHlcbiAgICAgICAgaWYob3B0LmpzbGludF9oYXBweSkge1xuICAgICAgICAgICAgb3B0LnNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYob3B0aW9ucy5pbmRlbnRfd2l0aF90YWJzKXtcbiAgICAgICAgICAgIG9wdC5pbmRlbnRfY2hhciA9ICdcXHQnO1xuICAgICAgICAgICAgb3B0LmluZGVudF9zaXplID0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICBpbmRlbnRfc3RyaW5nID0gJyc7XG4gICAgICAgIHdoaWxlIChvcHQuaW5kZW50X3NpemUgPiAwKSB7XG4gICAgICAgICAgICBpbmRlbnRfc3RyaW5nICs9IG9wdC5pbmRlbnRfY2hhcjtcbiAgICAgICAgICAgIG9wdC5pbmRlbnRfc2l6ZSAtPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByZWluZGVudF9pbmRleCA9IDA7XG4gICAgICAgIGlmKGpzX3NvdXJjZV90ZXh0ICYmIGpzX3NvdXJjZV90ZXh0Lmxlbmd0aCkge1xuICAgICAgICAgICAgd2hpbGUgKCAoanNfc291cmNlX3RleHQuY2hhckF0KHByZWluZGVudF9pbmRleCkgPT09ICcgJyB8fFxuICAgICAgICAgICAgICAgICAgICBqc19zb3VyY2VfdGV4dC5jaGFyQXQocHJlaW5kZW50X2luZGV4KSA9PT0gJ1xcdCcpKSB7XG4gICAgICAgICAgICAgICAgYmFzZUluZGVudFN0cmluZyArPSBqc19zb3VyY2VfdGV4dC5jaGFyQXQocHJlaW5kZW50X2luZGV4KTtcbiAgICAgICAgICAgICAgICBwcmVpbmRlbnRfaW5kZXggKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGpzX3NvdXJjZV90ZXh0ID0ganNfc291cmNlX3RleHQuc3Vic3RyaW5nKHByZWluZGVudF9pbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICBsYXN0X3R5cGUgPSAnVEtfU1RBUlRfQkxPQ0snOyAvLyBsYXN0IHRva2VuIHR5cGVcbiAgICAgICAgbGFzdF9sYXN0X3RleHQgPSAnJzsgLy8gcHJlLWxhc3QgdG9rZW4gdGV4dFxuICAgICAgICBvdXRwdXQgPSBuZXcgT3V0cHV0KGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpO1xuXG5cbiAgICAgICAgLy8gU3RhY2sgb2YgcGFyc2luZy9mb3JtYXR0aW5nIHN0YXRlcywgaW5jbHVkaW5nIE1PREUuXG4gICAgICAgIC8vIFdlIHRva2VuaXplLCBwYXJzZSwgYW5kIG91dHB1dCBpbiBhbiBhbG1vc3QgcHVyZWx5IGEgZm9yd2FyZC1vbmx5IHN0cmVhbSBvZiB0b2tlbiBpbnB1dFxuICAgICAgICAvLyBhbmQgZm9ybWF0dGVkIG91dHB1dC4gIFRoaXMgbWFrZXMgdGhlIGJlYXV0aWZpZXIgbGVzcyBhY2N1cmF0ZSB0aGFuIGZ1bGwgcGFyc2Vyc1xuICAgICAgICAvLyBidXQgYWxzbyBmYXIgbW9yZSB0b2xlcmFudCBvZiBzeW50YXggZXJyb3JzLlxuICAgICAgICAvL1xuICAgICAgICAvLyBGb3IgZXhhbXBsZSwgdGhlIGRlZmF1bHQgbW9kZSBpcyBNT0RFLkJsb2NrU3RhdGVtZW50LiBJZiB3ZSBzZWUgYSAneycgd2UgcHVzaCBhIG5ldyBmcmFtZSBvZiB0eXBlXG4gICAgICAgIC8vIE1PREUuQmxvY2tTdGF0ZW1lbnQgb24gdGhlIHRoZSBzdGFjaywgZXZlbiB0aG91Z2ggaXQgY291bGQgYmUgb2JqZWN0IGxpdGVyYWwuICBJZiB3ZSBsYXRlclxuICAgICAgICAvLyBlbmNvdW50ZXIgYSBcIjpcIiwgd2UnbGwgc3dpdGNoIHRvIHRvIE1PREUuT2JqZWN0TGl0ZXJhbC4gIElmIHdlIHRoZW4gc2VlIGEgXCI7XCIsXG4gICAgICAgIC8vIG1vc3QgZnVsbCBwYXJzZXJzIHdvdWxkIGRpZSwgYnV0IHRoZSBiZWF1dGlmaWVyIGdyYWNlZnVsbHkgZmFsbHMgYmFjayB0b1xuICAgICAgICAvLyBNT0RFLkJsb2NrU3RhdGVtZW50IGFuZCBjb250aW51ZXMgb24uXG4gICAgICAgIGZsYWdfc3RvcmUgPSBbXTtcbiAgICAgICAgc2V0X21vZGUoTU9ERS5CbG9ja1N0YXRlbWVudCk7XG5cbiAgICAgICAgdGhpcy5iZWF1dGlmeSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAvKmpzaGludCBvbmV2YXI6dHJ1ZSAqL1xuICAgICAgICAgICAgdmFyIGxvY2FsX3Rva2VuLCBzd2VldF9jb2RlO1xuICAgICAgICAgICAgVG9rZW5pemVyID0gbmV3IHRva2VuaXplcihqc19zb3VyY2VfdGV4dCwgb3B0LCBpbmRlbnRfc3RyaW5nKTtcbiAgICAgICAgICAgIHRva2VucyA9IFRva2VuaXplci50b2tlbml6ZSgpO1xuICAgICAgICAgICAgdG9rZW5fcG9zID0gMDtcblxuICAgICAgICAgICAgd2hpbGUgKGxvY2FsX3Rva2VuID0gZ2V0X3Rva2VuKCkpIHtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbG9jYWxfdG9rZW4uY29tbWVudHNfYmVmb3JlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSBjbGVhbmVzdCBoYW5kbGluZyBvZiBpbmxpbmUgY29tbWVudHMgaXMgdG8gdHJlYXQgdGhlbSBhcyB0aG91Z2ggdGhleSBhcmVuJ3QgdGhlcmUuXG4gICAgICAgICAgICAgICAgICAgIC8vIEp1c3QgY29udGludWUgZm9ybWF0dGluZyBhbmQgdGhlIGJlaGF2aW9yIHNob3VsZCBiZSBsb2dpY2FsLlxuICAgICAgICAgICAgICAgICAgICAvLyBBbHNvIGlnbm9yZSB1bmtub3duIHRva2Vucy4gIEFnYWluLCB0aGlzIHNob3VsZCByZXN1bHQgaW4gYmV0dGVyIGJlaGF2aW9yLlxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVfdG9rZW4obG9jYWxfdG9rZW4uY29tbWVudHNfYmVmb3JlW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaGFuZGxlX3Rva2VuKGxvY2FsX3Rva2VuKTtcblxuICAgICAgICAgICAgICAgIGxhc3RfbGFzdF90ZXh0ID0gZmxhZ3MubGFzdF90ZXh0O1xuICAgICAgICAgICAgICAgIGxhc3RfdHlwZSA9IGxvY2FsX3Rva2VuLnR5cGU7XG4gICAgICAgICAgICAgICAgZmxhZ3MubGFzdF90ZXh0ID0gbG9jYWxfdG9rZW4udGV4dDtcblxuICAgICAgICAgICAgICAgIHRva2VuX3BvcyArPSAxO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2VldF9jb2RlID0gb3V0cHV0LmdldF9jb2RlKCk7XG4gICAgICAgICAgICBpZiAob3B0LmVuZF93aXRoX25ld2xpbmUpIHtcbiAgICAgICAgICAgICAgICBzd2VldF9jb2RlICs9ICdcXG4nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc3dlZXRfY29kZTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfdG9rZW4obG9jYWxfdG9rZW4pIHtcbiAgICAgICAgICAgIHZhciBuZXdsaW5lcyA9IGxvY2FsX3Rva2VuLm5ld2xpbmVzO1xuICAgICAgICAgICAgdmFyIGtlZXBfd2hpdGVzcGFjZSA9IG9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uICYmIGlzX2FycmF5KGZsYWdzLm1vZGUpO1xuXG4gICAgICAgICAgICBpZiAoa2VlcF93aGl0ZXNwYWNlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IG5ld2xpbmVzOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZShpID4gMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0Lm1heF9wcmVzZXJ2ZV9uZXdsaW5lcyAmJiBuZXdsaW5lcyA+IG9wdC5tYXhfcHJlc2VydmVfbmV3bGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3bGluZXMgPSBvcHQubWF4X3ByZXNlcnZlX25ld2xpbmVzO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChvcHQucHJlc2VydmVfbmV3bGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2FsX3Rva2VuLm5ld2xpbmVzID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBuZXdsaW5lczsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY3VycmVudF90b2tlbiA9IGxvY2FsX3Rva2VuO1xuICAgICAgICAgICAgaGFuZGxlcnNbY3VycmVudF90b2tlbi50eXBlXSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gd2UgY291bGQgdXNlIGp1c3Qgc3RyaW5nLnNwbGl0LCBidXRcbiAgICAgICAgLy8gSUUgZG9lc24ndCBsaWtlIHJldHVybmluZyBlbXB0eSBzdHJpbmdzXG5cbiAgICAgICAgZnVuY3Rpb24gc3BsaXRfbmV3bGluZXMocykge1xuICAgICAgICAgICAgLy9yZXR1cm4gcy5zcGxpdCgvXFx4MGRcXHgwYXxcXHgwYS8pO1xuXG4gICAgICAgICAgICBzID0gcy5yZXBsYWNlKC9cXHgwZC9nLCAnJyk7XG4gICAgICAgICAgICB2YXIgb3V0ID0gW10sXG4gICAgICAgICAgICAgICAgaWR4ID0gcy5pbmRleE9mKFwiXFxuXCIpO1xuICAgICAgICAgICAgd2hpbGUgKGlkeCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBvdXQucHVzaChzLnN1YnN0cmluZygwLCBpZHgpKTtcbiAgICAgICAgICAgICAgICBzID0gcy5zdWJzdHJpbmcoaWR4ICsgMSk7XG4gICAgICAgICAgICAgICAgaWR4ID0gcy5pbmRleE9mKFwiXFxuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb3V0LnB1c2gocyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZShmb3JjZV9saW5ld3JhcCkge1xuICAgICAgICAgICAgZm9yY2VfbGluZXdyYXAgPSAoZm9yY2VfbGluZXdyYXAgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IGZvcmNlX2xpbmV3cmFwO1xuXG4gICAgICAgICAgICBpZiAob3V0cHV0Lmp1c3RfYWRkZWRfbmV3bGluZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgob3B0LnByZXNlcnZlX25ld2xpbmVzICYmIGN1cnJlbnRfdG9rZW4ud2FudGVkX25ld2xpbmUpIHx8IGZvcmNlX2xpbmV3cmFwKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdC53cmFwX2xpbmVfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgbmV2ZXIgd3JhcCB0aGUgZmlyc3QgdG9rZW4gb2YgYSBsaW5lIGR1ZSB0byBuZXdsaW5lIGNoZWNrIGFib3ZlLlxuICAgICAgICAgICAgICAgIHZhciBwcm9wb3NlZF9saW5lX2xlbmd0aCA9IG91dHB1dC5jdXJyZW50X2xpbmUuZ2V0X2NoYXJhY3Rlcl9jb3VudCgpICsgY3VycmVudF90b2tlbi50ZXh0Lmxlbmd0aCArXG4gICAgICAgICAgICAgICAgICAgIChvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID8gMSA6IDApO1xuICAgICAgICAgICAgICAgIGlmIChwcm9wb3NlZF9saW5lX2xlbmd0aCA+PSBvcHQud3JhcF9saW5lX2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcmludF9uZXdsaW5lKGZvcmNlX25ld2xpbmUsIHByZXNlcnZlX3N0YXRlbWVudF9mbGFncykge1xuICAgICAgICAgICAgaWYgKCFwcmVzZXJ2ZV9zdGF0ZW1lbnRfZmxhZ3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MubGFzdF90ZXh0ICE9PSAnOycgJiYgZmxhZ3MubGFzdF90ZXh0ICE9PSAnLCcgJiYgZmxhZ3MubGFzdF90ZXh0ICE9PSAnPScgJiYgbGFzdF90eXBlICE9PSAnVEtfT1BFUkFUT1InKSB7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCAmJiAhZmxhZ3MuaWZfYmxvY2sgJiYgIWZsYWdzLmRvX2Jsb2NrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG91dHB1dC5hZGRfbmV3X2xpbmUoZm9yY2VfbmV3bGluZSkpIHtcbiAgICAgICAgICAgICAgICBmbGFncy5tdWx0aWxpbmVfZnJhbWUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcHJpbnRfdG9rZW5fbGluZV9pbmRlbnRhdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChvdXRwdXQuanVzdF9hZGRlZF9uZXdsaW5lKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24gJiYgaXNfYXJyYXkoZmxhZ3MubW9kZSkgJiYgY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwcmV2ZW50IHJlbW92aW5nIG9mIHRoaXMgd2hpdGVzcGFjZSBhcyByZWR1bmRhbnRcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LmN1cnJlbnRfbGluZS5wdXNoKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjdXJyZW50X3Rva2VuLndoaXRlc3BhY2VfYmVmb3JlLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuY3VycmVudF9saW5lLnB1c2goY3VycmVudF90b2tlbi53aGl0ZXNwYWNlX2JlZm9yZVtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3V0cHV0LmFkZF9pbmRlbnRfc3RyaW5nKGZsYWdzLmluZGVudGF0aW9uX2xldmVsKSkge1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5saW5lX2luZGVudF9sZXZlbCA9IGZsYWdzLmluZGVudGF0aW9uX2xldmVsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByaW50X3Rva2VuKHByaW50YWJsZV90b2tlbikge1xuICAgICAgICAgICAgcHJpbnRhYmxlX3Rva2VuID0gcHJpbnRhYmxlX3Rva2VuIHx8IGN1cnJlbnRfdG9rZW4udGV4dDtcbiAgICAgICAgICAgIHByaW50X3Rva2VuX2xpbmVfaW5kZW50YXRpb24oKTtcbiAgICAgICAgICAgIG91dHB1dC5hZGRfdG9rZW4ocHJpbnRhYmxlX3Rva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGluZGVudCgpIHtcbiAgICAgICAgICAgIGZsYWdzLmluZGVudGF0aW9uX2xldmVsICs9IDE7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBkZWluZGVudCgpIHtcbiAgICAgICAgICAgIGlmIChmbGFncy5pbmRlbnRhdGlvbl9sZXZlbCA+IDAgJiZcbiAgICAgICAgICAgICAgICAoKCFmbGFncy5wYXJlbnQpIHx8IGZsYWdzLmluZGVudGF0aW9uX2xldmVsID4gZmxhZ3MucGFyZW50LmluZGVudGF0aW9uX2xldmVsKSlcbiAgICAgICAgICAgICAgICBmbGFncy5pbmRlbnRhdGlvbl9sZXZlbCAtPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0X21vZGUobW9kZSkge1xuICAgICAgICAgICAgaWYgKGZsYWdzKSB7XG4gICAgICAgICAgICAgICAgZmxhZ19zdG9yZS5wdXNoKGZsYWdzKTtcbiAgICAgICAgICAgICAgICBwcmV2aW91c19mbGFncyA9IGZsYWdzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwcmV2aW91c19mbGFncyA9IGNyZWF0ZV9mbGFncyhudWxsLCBtb2RlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZmxhZ3MgPSBjcmVhdGVfZmxhZ3MocHJldmlvdXNfZmxhZ3MsIG1vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNfYXJyYXkobW9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vZGUgPT09IE1PREUuQXJyYXlMaXRlcmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNfZXhwcmVzc2lvbihtb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5fYXJyYXkobW9kZSwgW01PREUuRXhwcmVzc2lvbiwgTU9ERS5Gb3JJbml0aWFsaXplciwgTU9ERS5Db25kaXRpb25hbF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzdG9yZV9tb2RlKCkge1xuICAgICAgICAgICAgaWYgKGZsYWdfc3RvcmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHByZXZpb3VzX2ZsYWdzID0gZmxhZ3M7XG4gICAgICAgICAgICAgICAgZmxhZ3MgPSBmbGFnX3N0b3JlLnBvcCgpO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c19mbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQucmVtb3ZlX3JlZHVuZGFudF9pbmRlbnRhdGlvbihwcmV2aW91c19mbGFncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3RhcnRfb2Zfb2JqZWN0X3Byb3BlcnR5KCkge1xuICAgICAgICAgICAgcmV0dXJuIGZsYWdzLnBhcmVudC5tb2RlID09PSBNT0RFLk9iamVjdExpdGVyYWwgJiYgZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQgJiYgKFxuICAgICAgICAgICAgICAgIChmbGFncy5sYXN0X3RleHQgPT09ICc6JyAmJiBmbGFncy50ZXJuYXJ5X2RlcHRoID09PSAwKSB8fCAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWydnZXQnLCAnc2V0J10pKSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzdGFydF9vZl9zdGF0ZW1lbnQoKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ3ZhcicsICdsZXQnLCAnY29uc3QnXSkgJiYgY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfV09SRCcpIHx8XG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAnZG8nKSB8fFxuICAgICAgICAgICAgICAgICAgICAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJ3JldHVybicgJiYgIWN1cnJlbnRfdG9rZW4ud2FudGVkX25ld2xpbmUpIHx8XG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAnZWxzZScgJiYgIShjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnaWYnKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX0VORF9FWFBSJyAmJiAocHJldmlvdXNfZmxhZ3MubW9kZSA9PT0gTU9ERS5Gb3JJbml0aWFsaXplciB8fCBwcmV2aW91c19mbGFncy5tb2RlID09PSBNT0RFLkNvbmRpdGlvbmFsKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX1dPUkQnICYmIGZsYWdzLm1vZGUgPT09IE1PREUuQmxvY2tTdGF0ZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICYmICFmbGFncy5pbl9jYXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiAhKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJy0tJyB8fCBjdXJyZW50X3Rva2VuLnRleHQgPT09ICcrKycpXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiBjdXJyZW50X3Rva2VuLnR5cGUgIT09ICdUS19XT1JEJyAmJiBjdXJyZW50X3Rva2VuLnR5cGUgIT09ICdUS19SRVNFUlZFRCcpIHx8XG4gICAgICAgICAgICAgICAgICAgIChmbGFncy5tb2RlID09PSBNT0RFLk9iamVjdExpdGVyYWwgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJzonICYmIGZsYWdzLnRlcm5hcnlfZGVwdGggPT09IDApIHx8IChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ2dldCcsICdzZXQnXSkpKSlcbiAgICAgICAgICAgICAgICApIHtcblxuICAgICAgICAgICAgICAgIHNldF9tb2RlKE1PREUuU3RhdGVtZW50KTtcbiAgICAgICAgICAgICAgICBpbmRlbnQoKTtcblxuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ3ZhcicsICdsZXQnLCAnY29uc3QnXSkgJiYgY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfV09SRCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuZGVjbGFyYXRpb25fc3RhdGVtZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBJc3N1ZSAjMjc2OlxuICAgICAgICAgICAgICAgIC8vIElmIHN0YXJ0aW5nIGEgbmV3IHN0YXRlbWVudCB3aXRoIFtpZiwgZm9yLCB3aGlsZSwgZG9dLCBwdXNoIHRvIGEgbmV3IGxpbmUuXG4gICAgICAgICAgICAgICAgLy8gaWYgKGEpIGlmIChiKSBpZihjKSBkKCk7IGVsc2UgZSgpOyBlbHNlIGYoKTtcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0X29mX29iamVjdF9wcm9wZXJ0eSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJ2RvJywgJ2ZvcicsICdpZicsICd3aGlsZSddKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhbGxfbGluZXNfc3RhcnRfd2l0aChsaW5lcywgYykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBsaW5lID0gdHJpbShsaW5lc1tpXSk7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmUuY2hhckF0KDApICE9PSBjKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVhY2hfbGluZV9tYXRjaGVzX2luZGVudChsaW5lcywgaW5kZW50KSB7XG4gICAgICAgICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgICAgICAgbGVuID0gbGluZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGxpbmU7XG4gICAgICAgICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGluZSA9IGxpbmVzW2ldO1xuICAgICAgICAgICAgICAgIC8vIGFsbG93IGVtcHR5IGxpbmVzIHRvIHBhc3MgdGhyb3VnaFxuICAgICAgICAgICAgICAgIGlmIChsaW5lICYmIGxpbmUuaW5kZXhPZihpbmRlbnQpICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzX3NwZWNpYWxfd29yZCh3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5fYXJyYXkod29yZCwgWydjYXNlJywgJ3JldHVybicsICdkbycsICdpZicsICd0aHJvdycsICdlbHNlJ10pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0X3Rva2VuKG9mZnNldCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gdG9rZW5fcG9zICsgKG9mZnNldCB8fCAwKTtcbiAgICAgICAgICAgIHJldHVybiAoaW5kZXggPCAwIHx8IGluZGV4ID49IHRva2Vucy5sZW5ndGgpID8gbnVsbCA6IHRva2Vuc1tpbmRleF07XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfc3RhcnRfZXhwcigpIHtcbiAgICAgICAgICAgIGlmIChzdGFydF9vZl9zdGF0ZW1lbnQoKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBjb25kaXRpb25hbCBzdGFydHMgdGhlIHN0YXRlbWVudCBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG5leHRfbW9kZSA9IE1PREUuRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICdbJykge1xuXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1dPUkQnIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgYXJyYXkgaW5kZXggc3BlY2lmaWVyLCBicmVhayBpbW1lZGlhdGVseVxuICAgICAgICAgICAgICAgICAgICAvLyBhW3hdLCBmbigpW3hdXG4gICAgICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBUb2tlbml6ZXIubGluZV9zdGFydGVycykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNldF9tb2RlKG5leHRfbW9kZSk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgICAgIGluZGVudCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0LnNwYWNlX2luX3BhcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbmV4dF9tb2RlID0gTU9ERS5BcnJheUxpdGVyYWw7XG4gICAgICAgICAgICAgICAgaWYgKGlzX2FycmF5KGZsYWdzLm1vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmbGFncy5sYXN0X3RleHQgPT09ICdbJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJywnICYmIChsYXN0X2xhc3RfdGV4dCA9PT0gJ10nIHx8IGxhc3RfbGFzdF90ZXh0ID09PSAnfScpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gXSwgWyBnb2VzIHRvIG5ldyBsaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB9LCBbIGdvZXMgdG8gbmV3IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdmb3InKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRfbW9kZSA9IE1PREUuRm9ySW5pdGlhbGl6ZXI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ2lmJywgJ3doaWxlJ10pKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRfbW9kZSA9IE1PREUuQ29uZGl0aW9uYWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbmV4dF9tb2RlID0gTU9ERS5FeHByZXNzaW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJzsnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX1NUQVJUX0JMT0NLJykge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfRU5EX0VYUFInIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX1NUQVJUX0VYUFInIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX0VORF9CTE9DSycgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBDb25zaWRlciB3aGV0aGVyIGZvcmNpbmcgdGhpcyBpcyByZXF1aXJlZC4gIFJldmlldyBmYWlsaW5nIHRlc3RzIHdoZW4gcmVtb3ZlZC5cbiAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKGN1cnJlbnRfdG9rZW4ud2FudGVkX25ld2xpbmUpO1xuICAgICAgICAgICAgICAgIC8vIGRvIG5vdGhpbmcgb24gKCggYW5kICkoIGFuZCBdWyBhbmQgXSggYW5kIC4oXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCEobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJygnKSAmJiBsYXN0X3R5cGUgIT09ICdUS19XT1JEJyAmJiBsYXN0X3R5cGUgIT09ICdUS19PUEVSQVRPUicpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiAoZmxhZ3MubGFzdF93b3JkID09PSAnZnVuY3Rpb24nIHx8IGZsYWdzLmxhc3Rfd29yZCA9PT0gJ3R5cGVvZicpKSB8fFxuICAgICAgICAgICAgICAgIChmbGFncy5sYXN0X3RleHQgPT09ICcqJyAmJiBsYXN0X2xhc3RfdGV4dCA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICAgICAgICAvLyBmdW5jdGlvbigpIHZzIGZ1bmN0aW9uICgpXG4gICAgICAgICAgICAgICAgaWYgKG9wdC5zcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIChpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFRva2VuaXplci5saW5lX3N0YXJ0ZXJzKSB8fCBmbGFncy5sYXN0X3RleHQgPT09ICdjYXRjaCcpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdC5zcGFjZV9iZWZvcmVfY29uZGl0aW9uYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdXBwb3J0IG9mIHRoaXMga2luZCBvZiBuZXdsaW5lIHByZXNlcnZhdGlvbi5cbiAgICAgICAgICAgIC8vIGEgPSAoYiAmJlxuICAgICAgICAgICAgLy8gICAgIChjIHx8IGQpKTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICcoJykge1xuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19FUVVBTFMnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0X29mX29iamVjdF9wcm9wZXJ0eSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNldF9tb2RlKG5leHRfbW9kZSk7XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgaWYgKG9wdC5zcGFjZV9pbl9wYXJlbikge1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbiBhbGwgY2FzZXMsIGlmIHdlIG5ld2xpbmUgd2hpbGUgaW5zaWRlIGFuIGV4cHJlc3Npb24gaXQgc2hvdWxkIGJlIGluZGVudGVkLlxuICAgICAgICAgICAgaW5kZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfZW5kX2V4cHIoKSB7XG4gICAgICAgICAgICAvLyBzdGF0ZW1lbnRzIGluc2lkZSBleHByZXNzaW9ucyBhcmUgbm90IHZhbGlkIHN5bnRheCwgYnV0Li4uXG4gICAgICAgICAgICAvLyBzdGF0ZW1lbnRzIG11c3QgYWxsIGJlIGNsb3NlZCB3aGVuIHRoZWlyIGNvbnRhaW5lciBjbG9zZXNcbiAgICAgICAgICAgIHdoaWxlIChmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmxhZ3MubXVsdGlsaW5lX2ZyYW1lKSB7XG4gICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZShjdXJyZW50X3Rva2VuLnRleHQgPT09ICddJyAmJiBpc19hcnJheShmbGFncy5tb2RlKSAmJiAhb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob3B0LnNwYWNlX2luX3BhcmVuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1NUQVJUX0VYUFInICYmICEgb3B0LnNwYWNlX2luX2VtcHR5X3BhcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vICgpIFtdIG5vIGlubmVyIHNwYWNlIGluIGVtcHR5IHBhcmVucyBsaWtlIHRoZXNlLCBldmVyLCByZWYgIzMyMFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ10nICYmIG9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dHB1dC5yZW1vdmVfcmVkdW5kYW50X2luZGVudGF0aW9uKHByZXZpb3VzX2ZsYWdzKTtcblxuICAgICAgICAgICAgLy8gZG8ge30gd2hpbGUgKCkgLy8gbm8gc3RhdGVtZW50IHJlcXVpcmVkIGFmdGVyXG4gICAgICAgICAgICBpZiAoZmxhZ3MuZG9fd2hpbGUgJiYgcHJldmlvdXNfZmxhZ3MubW9kZSA9PT0gTU9ERS5Db25kaXRpb25hbCkge1xuICAgICAgICAgICAgICAgIHByZXZpb3VzX2ZsYWdzLm1vZGUgPSBNT0RFLkV4cHJlc3Npb247XG4gICAgICAgICAgICAgICAgZmxhZ3MuZG9fYmxvY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBmbGFncy5kb193aGlsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfc3RhcnRfYmxvY2soKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIHNob3VsZCBiZSB0cmVhdGVkIGFzIGEgT2JqZWN0TGl0ZXJhbFxuICAgICAgICAgICAgdmFyIG5leHRfdG9rZW4gPSBnZXRfdG9rZW4oMSlcbiAgICAgICAgICAgIHZhciBzZWNvbmRfdG9rZW4gPSBnZXRfdG9rZW4oMilcbiAgICAgICAgICAgIGlmIChzZWNvbmRfdG9rZW4gJiYgKFxuICAgICAgICAgICAgICAgICAgICAoc2Vjb25kX3Rva2VuLnRleHQgPT09ICc6JyAmJiBpbl9hcnJheShuZXh0X3Rva2VuLnR5cGUsIFsnVEtfU1RSSU5HJywgJ1RLX1dPUkQnLCAnVEtfUkVTRVJWRUQnXSkpXG4gICAgICAgICAgICAgICAgICAgIHx8IChpbl9hcnJheShuZXh0X3Rva2VuLnRleHQsIFsnZ2V0JywgJ3NldCddKSAmJiBpbl9hcnJheShzZWNvbmRfdG9rZW4udHlwZSwgWydUS19XT1JEJywgJ1RLX1JFU0VSVkVEJ10pKVxuICAgICAgICAgICAgICAgICkpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBkb24ndCBzdXBwb3J0IFR5cGVTY3JpcHQsYnV0IHdlIGRpZG4ndCBicmVhayBpdCBmb3IgYSB2ZXJ5IGxvbmcgdGltZS5cbiAgICAgICAgICAgICAgICAvLyBXZSdsbCB0cnkgdG8ga2VlcCBub3QgYnJlYWtpbmcgaXQuXG4gICAgICAgICAgICAgICAgaWYgKCFpbl9hcnJheShsYXN0X2xhc3RfdGV4dCwgWydjbGFzcycsJ2ludGVyZmFjZSddKSkge1xuICAgICAgICAgICAgICAgICAgICBzZXRfbW9kZShNT0RFLk9iamVjdExpdGVyYWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNldF9tb2RlKE1PREUuQmxvY2tTdGF0ZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0X21vZGUoTU9ERS5CbG9ja1N0YXRlbWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBlbXB0eV9icmFjZXMgPSAhbmV4dF90b2tlbi5jb21tZW50c19iZWZvcmUubGVuZ3RoICYmICBuZXh0X3Rva2VuLnRleHQgPT09ICd9JztcbiAgICAgICAgICAgIHZhciBlbXB0eV9hbm9ueW1vdXNfZnVuY3Rpb24gPSBlbXB0eV9icmFjZXMgJiYgZmxhZ3MubGFzdF93b3JkID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICAgICAgbGFzdF90eXBlID09PSAnVEtfRU5EX0VYUFInO1xuXG4gICAgICAgICAgICBpZiAob3B0LmJyYWNlX3N0eWxlID09PSBcImV4cGFuZFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSAhPT0gJ1RLX09QRVJBVE9SJyAmJlxuICAgICAgICAgICAgICAgICAgICAoZW1wdHlfYW5vbnltb3VzX2Z1bmN0aW9uIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0X3R5cGUgPT09ICdUS19FUVVBTFMnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGlzX3NwZWNpYWxfd29yZChmbGFncy5sYXN0X3RleHQpICYmIGZsYWdzLmxhc3RfdGV4dCAhPT0gJ2Vsc2UnKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHsgLy8gY29sbGFwc2VcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlICE9PSAnVEtfT1BFUkFUT1InICYmIGxhc3RfdHlwZSAhPT0gJ1RLX1NUQVJUX0VYUFInKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9CTE9DSycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgVEtfT1BFUkFUT1Igb3IgVEtfU1RBUlRfRVhQUlxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNfYXJyYXkocHJldmlvdXNfZmxhZ3MubW9kZSkgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAnLCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYXN0X2xhc3RfdGV4dCA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gfSwgeyBpbiBhcnJheSBjb250ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTsgLy8gW2EsIGIsIGMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICBpbmRlbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9lbmRfYmxvY2soKSB7XG4gICAgICAgICAgICAvLyBzdGF0ZW1lbnRzIG11c3QgYWxsIGJlIGNsb3NlZCB3aGVuIHRoZWlyIGNvbnRhaW5lciBjbG9zZXNcbiAgICAgICAgICAgIHdoaWxlIChmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGVtcHR5X2JyYWNlcyA9IGxhc3RfdHlwZSA9PT0gJ1RLX1NUQVJUX0JMT0NLJztcblxuICAgICAgICAgICAgaWYgKG9wdC5icmFjZV9zdHlsZSA9PT0gXCJleHBhbmRcIikge1xuICAgICAgICAgICAgICAgIGlmICghZW1wdHlfYnJhY2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHNraXAge31cbiAgICAgICAgICAgICAgICBpZiAoIWVtcHR5X2JyYWNlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNfYXJyYXkoZmxhZ3MubW9kZSkgJiYgb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIFJFQUxMWSBuZWVkIGEgbmV3bGluZSBoZXJlLCBidXQgbmV3bGluZXIgd291bGQgc2tpcCB0aGF0XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfd29yZCgpIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubW9kZSAhPT0gTU9ERS5PYmplY3RMaXRlcmFsICYmXG4gICAgICAgICAgICAgICAgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJ3NldCcsICdnZXQnXSkpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50X3Rva2VuLnR5cGUgPSAnVEtfV09SRCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubW9kZSA9PT0gTU9ERS5PYmplY3RMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5leHRfdG9rZW4gPSBnZXRfdG9rZW4oMSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHRfdG9rZW4udGV4dCA9PSAnOicpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudF90b2tlbi50eXBlID0gJ1RLX1dPUkQnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN0YXJ0X29mX3N0YXRlbWVudCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGNvbmRpdGlvbmFsIHN0YXJ0cyB0aGUgc3RhdGVtZW50IGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50X3Rva2VuLndhbnRlZF9uZXdsaW5lICYmICFpc19leHByZXNzaW9uKGZsYWdzLm1vZGUpICYmXG4gICAgICAgICAgICAgICAgKGxhc3RfdHlwZSAhPT0gJ1RLX09QRVJBVE9SJyB8fCAoZmxhZ3MubGFzdF90ZXh0ID09PSAnLS0nIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJysrJykpICYmXG4gICAgICAgICAgICAgICAgbGFzdF90eXBlICE9PSAnVEtfRVFVQUxTJyAmJlxuICAgICAgICAgICAgICAgIChvcHQucHJlc2VydmVfbmV3bGluZXMgfHwgIShsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ3ZhcicsICdsZXQnLCAnY29uc3QnLCAnc2V0JywgJ2dldCddKSkpKSB7XG5cbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmbGFncy5kb19ibG9jayAmJiAhZmxhZ3MuZG9fd2hpbGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ3doaWxlJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBkbyB7fSAjIyB3aGlsZSAoKVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmRvX3doaWxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRvIHt9IHNob3VsZCBhbHdheXMgaGF2ZSB3aGlsZSBhcyB0aGUgbmV4dCB3b3JkLlxuICAgICAgICAgICAgICAgICAgICAvLyBpZiB3ZSBkb24ndCBzZWUgdGhlIGV4cGVjdGVkIHdoaWxlLCByZWNvdmVyXG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuZG9fYmxvY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIG1heSBiZSBmb2xsb3dlZCBieSBlbHNlLCBvciBub3RcbiAgICAgICAgICAgIC8vIEJhcmUvaW5saW5lIGlmcyBhcmUgdHJpY2t5XG4gICAgICAgICAgICAvLyBOZWVkIHRvIHVud2luZCB0aGUgbW9kZXMgY29ycmVjdGx5OiBpZiAoYSkgaWYgKGIpIGMoKTsgZWxzZSBkKCk7IGVsc2UgZSgpO1xuICAgICAgICAgICAgaWYgKGZsYWdzLmlmX2Jsb2NrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmbGFncy5lbHNlX2Jsb2NrICYmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnZWxzZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmVsc2VfYmxvY2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuaWZfYmxvY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuZWxzZV9ibG9jayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnY2FzZScgfHwgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ2RlZmF1bHQnICYmIGZsYWdzLmluX2Nhc2Vfc3RhdGVtZW50KSkpIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgaWYgKGZsYWdzLmNhc2VfYm9keSB8fCBvcHQuanNsaW50X2hhcHB5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN3aXRjaCBjYXNlcyBmb2xsb3dpbmcgb25lIGFub3RoZXJcbiAgICAgICAgICAgICAgICAgICAgZGVpbmRlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuY2FzZV9ib2R5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgZmxhZ3MuaW5fY2FzZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgZmxhZ3MuaW5fY2FzZV9zdGF0ZW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ30nLCAnOyddKSB8fCAob3V0cHV0Lmp1c3RfYWRkZWRfbmV3bGluZSgpICYmICEgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ1snLCAneycsICc6JywgJz0nLCAnLCddKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZXJlIGlzIGEgbmljZSBjbGVhbiBzcGFjZSBvZiBhdCBsZWFzdCBvbmUgYmxhbmsgbGluZVxuICAgICAgICAgICAgICAgICAgICAvLyBiZWZvcmUgYSBuZXcgZnVuY3Rpb24gZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAoICFvdXRwdXQuanVzdF9hZGRlZF9ibGFua2xpbmUoKSAmJiAhY3VycmVudF90b2tlbi5jb21tZW50c19iZWZvcmUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgfHwgbGFzdF90eXBlID09PSAnVEtfV09SRCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnZ2V0JywgJ3NldCcsICduZXcnLCAncmV0dXJuJywgJ2V4cG9ydCddKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2RlZmF1bHQnICYmIGxhc3RfbGFzdF90ZXh0ID09PSAnZXhwb3J0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX09QRVJBVE9SJyB8fCBmbGFncy5sYXN0X3RleHQgPT09ICc9Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBmb28gPSBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFmbGFncy5tdWx0aWxpbmVfZnJhbWUgJiYgKGlzX2V4cHJlc3Npb24oZmxhZ3MubW9kZSkgfHwgaXNfYXJyYXkoZmxhZ3MubW9kZSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIChmdW5jdGlvblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19DT01NQScgfHwgbGFzdF90eXBlID09PSAnVEtfU1RBUlRfRVhQUicgfHwgbGFzdF90eXBlID09PSAnVEtfRVFVQUxTJyB8fCBsYXN0X3R5cGUgPT09ICdUS19PUEVSQVRPUicpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0X29mX29iamVjdF9wcm9wZXJ0eSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgIGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWydmdW5jdGlvbicsICdnZXQnLCAnc2V0J10pKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICBmbGFncy5sYXN0X3dvcmQgPSBjdXJyZW50X3Rva2VuLnRleHQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmVmaXggPSAnTk9ORSc7XG5cbiAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19FTkRfQkxPQ0snKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWydlbHNlJywgJ2NhdGNoJywgJ2ZpbmFsbHknXSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZWZpeCA9ICdORVdMSU5FJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0LmJyYWNlX3N0eWxlID09PSBcImV4cGFuZFwiIHx8IG9wdC5icmFjZV9zdHlsZSA9PT0gXCJlbmQtZXhwYW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZpeCA9ICdORVdMSU5FJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZpeCA9ICdTUEFDRSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfU0VNSUNPTE9OJyAmJiBmbGFncy5tb2RlID09PSBNT0RFLkJsb2NrU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogU2hvdWxkIHRoaXMgYmUgZm9yIFNUQVRFTUVOVCBhcyB3ZWxsP1xuICAgICAgICAgICAgICAgIHByZWZpeCA9ICdORVdMSU5FJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfU0VNSUNPTE9OJyAmJiBpc19leHByZXNzaW9uKGZsYWdzLm1vZGUpKSB7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ1NQQUNFJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfU1RSSU5HJykge1xuICAgICAgICAgICAgICAgIHByZWZpeCA9ICdORVdMSU5FJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX1dPUkQnIHx8XG4gICAgICAgICAgICAgICAgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJyonICYmIGxhc3RfbGFzdF90ZXh0ID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgIHByZWZpeCA9ICdTUEFDRSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1NUQVJUX0JMT0NLJykge1xuICAgICAgICAgICAgICAgIHByZWZpeCA9ICdORVdMSU5FJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfRU5EX0VYUFInKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgVG9rZW5pemVyLmxpbmVfc3RhcnRlcnMpICYmIGZsYWdzLmxhc3RfdGV4dCAhPT0gJyknKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2Vsc2UnIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2V4cG9ydCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJlZml4ID0gJ1NQQUNFJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwcmVmaXggPSAnTkVXTElORSc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJ2Vsc2UnLCAnY2F0Y2gnLCAnZmluYWxseSddKSkge1xuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgIT09ICdUS19FTkRfQkxPQ0snIHx8IG9wdC5icmFjZV9zdHlsZSA9PT0gXCJleHBhbmRcIiB8fCBvcHQuYnJhY2Vfc3R5bGUgPT09IFwiZW5kLWV4cGFuZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQudHJpbSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpbmUgPSBvdXRwdXQuY3VycmVudF9saW5lO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSB0cmltbWVkIGFuZCB0aGVyZSdzIHNvbWV0aGluZyBvdGhlciB0aGFuIGEgY2xvc2UgYmxvY2sgYmVmb3JlIHVzXG4gICAgICAgICAgICAgICAgICAgIC8vIHB1dCBhIG5ld2xpbmUgYmFjayBpbi4gIEhhbmRsZXMgJ30gLy8gY29tbWVudCcgc2NlbmFyaW8uXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5lLmxhc3QoKSAhPT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmVmaXggPT09ICdORVdMSU5FJykge1xuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaXNfc3BlY2lhbF93b3JkKGZsYWdzLmxhc3RfdGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm8gbmV3bGluZSBiZXR3ZWVuICdyZXR1cm4gbm5uJ1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSAhPT0gJ1RLX0VORF9FWFBSJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGxhc3RfdHlwZSAhPT0gJ1RLX1NUQVJUX0VYUFInIHx8ICEoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWyd2YXInLCAnbGV0JywgJ2NvbnN0J10pKSkgJiYgZmxhZ3MubGFzdF90ZXh0ICE9PSAnOicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gZm9yY2UgbmV3bGluZSBvbiAndmFyJzogZm9yICh2YXIgeCA9IDAuLi4pXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ2lmJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdlbHNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vIG5ld2xpbmUgZm9yIH0gZWxzZSBpZiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgVG9rZW5pemVyLmxpbmVfc3RhcnRlcnMpICYmIGZsYWdzLmxhc3RfdGV4dCAhPT0gJyknKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZsYWdzLm11bHRpbGluZV9mcmFtZSAmJiBpc19hcnJheShmbGFncy5tb2RlKSAmJiBmbGFncy5sYXN0X3RleHQgPT09ICcsJyAmJiBsYXN0X2xhc3RfdGV4dCA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpOyAvLyB9LCBpbiBsaXN0cyBnZXQgYSBuZXdsaW5lIHRyZWF0bWVudFxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmVmaXggPT09ICdTUEFDRScpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICBmbGFncy5sYXN0X3dvcmQgPSBjdXJyZW50X3Rva2VuLnRleHQ7XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnZG8nKSB7XG4gICAgICAgICAgICAgICAgZmxhZ3MuZG9fYmxvY2sgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ2lmJykge1xuICAgICAgICAgICAgICAgIGZsYWdzLmlmX2Jsb2NrID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9zZW1pY29sb24oKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICAgICAgLy8gU2VtaWNvbG9uIGNhbiBiZSB0aGUgc3RhcnQgKGFuZCBlbmQpIG9mIGEgc3RhdGVtZW50XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50ICYmICFmbGFncy5pZl9ibG9jayAmJiAhZmxhZ3MuZG9fYmxvY2spIHtcbiAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfc3RyaW5nKCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0X29mX3N0YXRlbWVudCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGNvbmRpdGlvbmFsIHN0YXJ0cyB0aGUgc3RhdGVtZW50IGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICAgICAgICAgIC8vIE9uZSBkaWZmZXJlbmNlIC0gc3RyaW5ncyB3YW50IGF0IGxlYXN0IGEgc3BhY2UgYmVmb3JlXG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyB8fCBsYXN0X3R5cGUgPT09ICdUS19XT1JEJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19DT01NQScgfHwgbGFzdF90eXBlID09PSAnVEtfU1RBUlRfRVhQUicgfHwgbGFzdF90eXBlID09PSAnVEtfRVFVQUxTJyB8fCBsYXN0X3R5cGUgPT09ICdUS19PUEVSQVRPUicpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0X29mX29iamVjdF9wcm9wZXJ0eSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfZXF1YWxzKCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0X29mX3N0YXRlbWVudCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGNvbmRpdGlvbmFsIHN0YXJ0cyB0aGUgc3RhdGVtZW50IGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmxhZ3MuZGVjbGFyYXRpb25fc3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgLy8ganVzdCBnb3QgYW4gJz0nIGluIGEgdmFyLWxpbmUsIGRpZmZlcmVudCBmb3JtYXR0aW5nL2xpbmUtYnJlYWtpbmcsIGV0YyB3aWxsIG5vdyBiZSBkb25lXG4gICAgICAgICAgICAgICAgZmxhZ3MuZGVjbGFyYXRpb25fYXNzaWdubWVudCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9jb21tYSgpIHtcbiAgICAgICAgICAgIGlmIChmbGFncy5kZWNsYXJhdGlvbl9zdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNfZXhwcmVzc2lvbihmbGFncy5wYXJlbnQubW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8gbm90IGJyZWFrIG9uIGNvbW1hLCBmb3IodmFyIGEgPSAxLCBiID0gMilcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuZGVjbGFyYXRpb25fYXNzaWdubWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MuZGVjbGFyYXRpb25fYXNzaWdubWVudCkge1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5kZWNsYXJhdGlvbl9hc3NpZ25tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICBpZiAoZmxhZ3MubW9kZSA9PT0gTU9ERS5PYmplY3RMaXRlcmFsIHx8XG4gICAgICAgICAgICAgICAgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50ICYmIGZsYWdzLnBhcmVudC5tb2RlID09PSBNT0RFLk9iamVjdExpdGVyYWwpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVYUFIgb3IgRE9fQkxPQ0tcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX29wZXJhdG9yKCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0X29mX3N0YXRlbWVudCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGNvbmRpdGlvbmFsIHN0YXJ0cyB0aGUgc3RhdGVtZW50IGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGlzX3NwZWNpYWxfd29yZChmbGFncy5sYXN0X3RleHQpKSB7XG4gICAgICAgICAgICAgICAgLy8gXCJyZXR1cm5cIiBoYWQgYSBzcGVjaWFsIGhhbmRsaW5nIGluIFRLX1dPUkQuIE5vdyB3ZSBuZWVkIHRvIHJldHVybiB0aGUgZmF2b3JcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaGFjayBmb3IgYWN0aW9uc2NyaXB0J3MgaW1wb3J0IC4qO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJyonICYmIGxhc3RfdHlwZSA9PT0gJ1RLX0RPVCcpIHtcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJzonICYmIGZsYWdzLmluX2Nhc2UpIHtcbiAgICAgICAgICAgICAgICBmbGFncy5jYXNlX2JvZHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGluZGVudCgpO1xuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIGZsYWdzLmluX2Nhc2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICc6OicpIHtcbiAgICAgICAgICAgICAgICAvLyBubyBzcGFjZXMgYXJvdW5kIGV4b3RpYyBuYW1lc3BhY2luZyBzeW50YXggb3BlcmF0b3JcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzUuMS8jc2VjLTcuOS4xXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSBpcyBhIG5ld2xpbmUgYmV0d2VlbiAtLSBvciArKyBhbmQgYW55dGhpbmcgZWxzZSB3ZSBzaG91bGQgcHJlc2VydmUgaXQuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSAmJiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnLS0nIHx8IGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJysrJykpIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWxsb3cgbGluZSB3cmFwcGluZyBiZXR3ZWVuIG9wZXJhdG9yc1xuICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHNwYWNlX2JlZm9yZSA9IHRydWU7XG4gICAgICAgICAgICB2YXIgc3BhY2VfYWZ0ZXIgPSB0cnVlO1xuXG4gICAgICAgICAgICBpZiAoaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJy0tJywgJysrJywgJyEnLCAnfiddKSB8fCAoaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJy0nLCAnKyddKSAmJiAoaW5fYXJyYXkobGFzdF90eXBlLCBbJ1RLX1NUQVJUX0JMT0NLJywgJ1RLX1NUQVJUX0VYUFInLCAnVEtfRVFVQUxTJywgJ1RLX09QRVJBVE9SJ10pIHx8IGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgVG9rZW5pemVyLmxpbmVfc3RhcnRlcnMpIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJywnKSkpIHtcbiAgICAgICAgICAgICAgICAvLyB1bmFyeSBvcGVyYXRvcnMgKGFuZCBiaW5hcnkgKy8tIHByZXRlbmRpbmcgdG8gYmUgdW5hcnkpIHNwZWNpYWwgY2FzZXNcblxuICAgICAgICAgICAgICAgIHNwYWNlX2JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHNwYWNlX2FmdGVyID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MubGFzdF90ZXh0ID09PSAnOycgJiYgaXNfZXhwcmVzc2lvbihmbGFncy5tb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBmb3IgKDs7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgIF5eXlxuICAgICAgICAgICAgICAgICAgICBzcGFjZV9iZWZvcmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgfHwgbGFzdF90eXBlID09PSAnVEtfRU5EX0VYUFInKSB7XG4gICAgICAgICAgICAgICAgICAgIHNwYWNlX2JlZm9yZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19PUEVSQVRPUicpIHtcbiAgICAgICAgICAgICAgICAgICAgc3BhY2VfYmVmb3JlID1cbiAgICAgICAgICAgICAgICAgICAgICAgIChpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnLS0nLCAnLSddKSAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnLS0nLCAnLSddKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnKysnLCAnKyddKSAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnKysnLCAnKyddKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKChmbGFncy5tb2RlID09PSBNT0RFLkJsb2NrU3RhdGVtZW50IHx8IGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSAmJiAoZmxhZ3MubGFzdF90ZXh0ID09PSAneycgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnOycpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHsgZm9vOyAtLWkgfVxuICAgICAgICAgICAgICAgICAgICAvLyBmb28oKTsgLS1iYXI7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJzonKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZsYWdzLnRlcm5hcnlfZGVwdGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29sb24gaXMgaW52YWxpZCBqYXZhc2NyaXB0IG91dHNpZGUgb2YgdGVybmFyeSBhbmQgb2JqZWN0LCBidXQgZG8gb3VyIGJlc3QgdG8gZ3Vlc3Mgd2hhdCB3YXMgbWVhbnQuXG4gICAgICAgICAgICAgICAgICAgIHNwYWNlX2JlZm9yZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLnRlcm5hcnlfZGVwdGggLT0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJz8nKSB7XG4gICAgICAgICAgICAgICAgZmxhZ3MudGVybmFyeV9kZXB0aCArPSAxO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICcqJyAmJiBsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgc3BhY2VfYmVmb3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc3BhY2VfYWZ0ZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuIHx8IHNwYWNlX2JlZm9yZTtcbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gc3BhY2VfYWZ0ZXI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfYmxvY2tfY29tbWVudCgpIHtcbiAgICAgICAgICAgIHZhciBsaW5lcyA9IHNwbGl0X25ld2xpbmVzKGN1cnJlbnRfdG9rZW4udGV4dCk7XG4gICAgICAgICAgICB2YXIgajsgLy8gaXRlcmF0b3IgZm9yIHRoaXMgY2FzZVxuICAgICAgICAgICAgdmFyIGphdmFkb2MgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciBzdGFybGVzcyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIGxhc3RJbmRlbnQgPSBjdXJyZW50X3Rva2VuLndoaXRlc3BhY2VfYmVmb3JlLmpvaW4oJycpO1xuICAgICAgICAgICAgdmFyIGxhc3RJbmRlbnRMZW5ndGggPSBsYXN0SW5kZW50Lmxlbmd0aDtcblxuICAgICAgICAgICAgLy8gYmxvY2sgY29tbWVudCBzdGFydHMgd2l0aCBhIG5ldyBsaW5lXG4gICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChsaW5lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFsbF9saW5lc19zdGFydF93aXRoKGxpbmVzLnNsaWNlKDEpLCAnKicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGphdmFkb2MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChlYWNoX2xpbmVfbWF0Y2hlc19pbmRlbnQobGluZXMuc2xpY2UoMSksIGxhc3RJbmRlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJsZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZpcnN0IGxpbmUgYWx3YXlzIGluZGVudGVkXG4gICAgICAgICAgICBwcmludF90b2tlbihsaW5lc1swXSk7XG4gICAgICAgICAgICBmb3IgKGogPSAxOyBqIDwgbGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBpZiAoamF2YWRvYykge1xuICAgICAgICAgICAgICAgICAgICAvLyBqYXZhZG9jOiByZWZvcm1hdCBhbmQgcmUtaW5kZW50XG4gICAgICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCcgJyArIHRyaW0obGluZXNbal0pKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXJsZXNzICYmIGxpbmVzW2pdLmxlbmd0aCA+IGxhc3RJbmRlbnRMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3Rhcmxlc3M6IHJlLWluZGVudCBub24tZW1wdHkgY29udGVudCwgYXZvaWRpbmcgdHJpbVxuICAgICAgICAgICAgICAgICAgICBwcmludF90b2tlbihsaW5lc1tqXS5zdWJzdHJpbmcobGFzdEluZGVudExlbmd0aCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5vcm1hbCBjb21tZW50cyBvdXRwdXQgcmF3XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5hZGRfdG9rZW4obGluZXNbal0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZm9yIGNvbW1lbnRzIG9mIG1vcmUgdGhhbiBvbmUgbGluZSwgbWFrZSBzdXJlIHRoZXJlJ3MgYSBuZXcgbGluZSBhZnRlclxuICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfaW5saW5lX2NvbW1lbnQoKSB7XG4gICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9jb21tZW50KCkge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4ud2FudGVkX25ld2xpbmUpIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnRyaW0odHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2RvdCgpIHtcbiAgICAgICAgICAgIGlmIChzdGFydF9vZl9zdGF0ZW1lbnQoKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBjb25kaXRpb25hbCBzdGFydHMgdGhlIHN0YXRlbWVudCBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpc19zcGVjaWFsX3dvcmQoZmxhZ3MubGFzdF90ZXh0KSkge1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBhbGxvdyBwcmVzZXJ2ZWQgbmV3bGluZXMgYmVmb3JlIGRvdHMgaW4gZ2VuZXJhbFxuICAgICAgICAgICAgICAgIC8vIGZvcmNlIG5ld2xpbmVzIG9uIGRvdHMgYWZ0ZXIgY2xvc2UgcGFyZW4gd2hlbiBicmVha19jaGFpbmVkIC0gZm9yIGJhcigpLmJheigpXG4gICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZShmbGFncy5sYXN0X3RleHQgPT09ICcpJyAmJiBvcHQuYnJlYWtfY2hhaW5lZF9tZXRob2RzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV91bmtub3duKCkge1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dFtjdXJyZW50X3Rva2VuLnRleHQubGVuZ3RoIC0gMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2VvZigpIHtcbiAgICAgICAgICAgIC8vIFVud2luZCBhbnkgb3BlbiBzdGF0ZW1lbnRzXG4gICAgICAgICAgICB3aGlsZSAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIE91dHB1dExpbmUoKSB7XG4gICAgICAgIHZhciBjaGFyYWN0ZXJfY291bnQgPSAwO1xuICAgICAgICB2YXIgbGluZV9pdGVtcyA9IFtdO1xuXG4gICAgICAgIHRoaXMuZ2V0X2NoYXJhY3Rlcl9jb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGNoYXJhY3Rlcl9jb3VudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZ2V0X2l0ZW1fY291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBsaW5lX2l0ZW1zLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZ2V0X291dHB1dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpbmVfaXRlbXMuam9pbignJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxhc3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChsaW5lX2l0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm4gbGluZV9pdGVtc1tsaW5lX2l0ZW1zLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnB1c2ggPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICAgICAgbGluZV9pdGVtcy5wdXNoKGlucHV0KTtcbiAgICAgICAgICAgIGNoYXJhY3Rlcl9jb3VudCArPSBpbnB1dC5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlbW92ZV9pbmRlbnQgPSBmdW5jdGlvbihpbmRlbnRfc3RyaW5nLCBiYXNlSW5kZW50U3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgc3BsaWNlX2luZGV4ID0gMDtcblxuICAgICAgICAgICAgLy8gc2tpcCBlbXB0eSBsaW5lc1xuICAgICAgICAgICAgaWYgKGxpbmVfaXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBza2lwIHRoZSBwcmVpbmRlbnQgc3RyaW5nIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGlmIChiYXNlSW5kZW50U3RyaW5nICYmIGxpbmVfaXRlbXNbMF0gPT09IGJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICBzcGxpY2VfaW5kZXggPSAxO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyByZW1vdmUgb25lIGluZGVudCwgaWYgcHJlc2VudFxuICAgICAgICAgICAgaWYgKGxpbmVfaXRlbXNbc3BsaWNlX2luZGV4XSA9PT0gaW5kZW50X3N0cmluZykge1xuICAgICAgICAgICAgICAgIGNoYXJhY3Rlcl9jb3VudCAtPSBsaW5lX2l0ZW1zW3NwbGljZV9pbmRleF0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGxpbmVfaXRlbXMuc3BsaWNlKHNwbGljZV9pbmRleCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRyaW0gPSBmdW5jdGlvbihpbmRlbnRfc3RyaW5nLCBiYXNlSW5kZW50U3RyaW5nKSB7XG4gICAgICAgICAgICB3aGlsZSAodGhpcy5nZXRfaXRlbV9jb3VudCgpICYmXG4gICAgICAgICAgICAgICAgKHRoaXMubGFzdCgpID09PSAnICcgfHxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0KCkgPT09IGluZGVudF9zdHJpbmcgfHxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0KCkgPT09IGJhc2VJbmRlbnRTdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSBsaW5lX2l0ZW1zLnBvcCgpO1xuICAgICAgICAgICAgICAgIGNoYXJhY3Rlcl9jb3VudCAtPSBpdGVtLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIE91dHB1dChpbmRlbnRfc3RyaW5nLCBiYXNlSW5kZW50U3RyaW5nKSB7XG4gICAgICAgIHZhciBsaW5lcyA9W107XG4gICAgICAgIHRoaXMuYmFzZUluZGVudFN0cmluZyA9IGJhc2VJbmRlbnRTdHJpbmc7XG4gICAgICAgIHRoaXMuY3VycmVudF9saW5lID0gbnVsbDtcbiAgICAgICAgdGhpcy5zcGFjZV9iZWZvcmVfdG9rZW4gPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmdldF9saW5lX251bWJlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpbmVzLmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzaW5nIG9iamVjdCBpbnN0ZWFkIG9mIHN0cmluZyB0byBhbGxvdyBmb3IgbGF0ZXIgZXhwYW5zaW9uIG9mIGluZm8gYWJvdXQgZWFjaCBsaW5lXG4gICAgICAgIHRoaXMuYWRkX25ld19saW5lID0gZnVuY3Rpb24oZm9yY2VfbmV3bGluZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0X2xpbmVfbnVtYmVyKCkgPT09IDEgJiYgdGhpcy5qdXN0X2FkZGVkX25ld2xpbmUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gbm8gbmV3bGluZSBvbiBzdGFydCBvZiBmaWxlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmb3JjZV9uZXdsaW5lIHx8ICF0aGlzLmp1c3RfYWRkZWRfbmV3bGluZSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUgPSBuZXcgT3V0cHV0TGluZSgpO1xuICAgICAgICAgICAgICAgIGxpbmVzLnB1c2godGhpcy5jdXJyZW50X2xpbmUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpbml0aWFsaXplXG4gICAgICAgIHRoaXMuYWRkX25ld19saW5lKHRydWUpO1xuXG4gICAgICAgIHRoaXMuZ2V0X2NvZGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzd2VldF9jb2RlID0gbGluZXNbMF0uZ2V0X291dHB1dCgpO1xuICAgICAgICAgICAgZm9yICh2YXIgbGluZV9pbmRleCA9IDE7IGxpbmVfaW5kZXggPCBsaW5lcy5sZW5ndGg7IGxpbmVfaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIHN3ZWV0X2NvZGUgKz0gJ1xcbicgKyBsaW5lc1tsaW5lX2luZGV4XS5nZXRfb3V0cHV0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2VldF9jb2RlID0gc3dlZXRfY29kZS5yZXBsYWNlKC9bXFxyXFxuXFx0IF0rJC8sICcnKTtcbiAgICAgICAgICAgIHJldHVybiBzd2VldF9jb2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hZGRfaW5kZW50X3N0cmluZyA9IGZ1bmN0aW9uKGluZGVudGF0aW9uX2xldmVsKSB7XG4gICAgICAgICAgICBpZiAoYmFzZUluZGVudFN0cmluZykge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLnB1c2goYmFzZUluZGVudFN0cmluZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE5ldmVyIGluZGVudCB5b3VyIGZpcnN0IG91dHB1dCBpbmRlbnQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBmaWxlXG4gICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZW50YXRpb25fbGV2ZWw7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZS5wdXNoKGluZGVudF9zdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYWRkX3Rva2VuID0gZnVuY3Rpb24ocHJpbnRhYmxlX3Rva2VuKSB7XG4gICAgICAgICAgICB0aGlzLmFkZF9zcGFjZV9iZWZvcmVfdG9rZW4oKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLnB1c2gocHJpbnRhYmxlX3Rva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYWRkX3NwYWNlX2JlZm9yZV90b2tlbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3BhY2VfYmVmb3JlX3Rva2VuICYmIHRoaXMuY3VycmVudF9saW5lLmdldF9pdGVtX2NvdW50KCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgbGFzdF9vdXRwdXQgPSB0aGlzLmN1cnJlbnRfbGluZS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3Rfb3V0cHV0ICE9PSAnICcgJiYgbGFzdF9vdXRwdXQgIT09IGluZGVudF9zdHJpbmcgJiYgbGFzdF9vdXRwdXQgIT09IGJhc2VJbmRlbnRTdHJpbmcpIHsgLy8gcHJldmVudCBvY2Nhc3Npb25hbCBkdXBsaWNhdGUgc3BhY2VcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUucHVzaCgnICcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BhY2VfYmVmb3JlX3Rva2VuID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlbW92ZV9yZWR1bmRhbnRfaW5kZW50YXRpb24gPSBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaW1wbGVtZW50YXRpb24gaXMgZWZmZWN0aXZlIGJ1dCBoYXMgc29tZSBpc3N1ZXM6XG4gICAgICAgICAgICAvLyAgICAgLSBsZXNzIHRoYW4gZ3JlYXQgcGVyZm9ybWFuY2UgZHVlIHRvIGFycmF5IHNwbGljaW5nXG4gICAgICAgICAgICAvLyAgICAgLSBjYW4gY2F1c2UgbGluZSB3cmFwIHRvIGhhcHBlbiB0b28gc29vbiBkdWUgdG8gaW5kZW50IHJlbW92YWxcbiAgICAgICAgICAgIC8vICAgICAgICAgICBhZnRlciB3cmFwIHBvaW50cyBhcmUgY2FsY3VsYXRlZFxuICAgICAgICAgICAgLy8gVGhlc2UgaXNzdWVzIGFyZSBtaW5vciBjb21wYXJlZCB0byB1Z2x5IGluZGVudGF0aW9uLlxuXG4gICAgICAgICAgICBpZiAoZnJhbWUubXVsdGlsaW5lX2ZyYW1lIHx8XG4gICAgICAgICAgICAgICAgZnJhbWUubW9kZSA9PT0gTU9ERS5Gb3JJbml0aWFsaXplciB8fFxuICAgICAgICAgICAgICAgIGZyYW1lLm1vZGUgPT09IE1PREUuQ29uZGl0aW9uYWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSBvbmUgaW5kZW50IGZyb20gZWFjaCBsaW5lIGluc2lkZSB0aGlzIHNlY3Rpb25cbiAgICAgICAgICAgIHZhciBpbmRleCA9IGZyYW1lLnN0YXJ0X2xpbmVfaW5kZXg7XG4gICAgICAgICAgICB2YXIgbGluZTtcblxuICAgICAgICAgICAgdmFyIG91dHB1dF9sZW5ndGggPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBvdXRwdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbGluZXNbaW5kZXhdLnJlbW92ZV9pbmRlbnQoaW5kZW50X3N0cmluZywgYmFzZUluZGVudFN0cmluZyk7XG4gICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHJpbSA9IGZ1bmN0aW9uKGVhdF9uZXdsaW5lcykge1xuICAgICAgICAgICAgZWF0X25ld2xpbmVzID0gKGVhdF9uZXdsaW5lcyA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogZWF0X25ld2xpbmVzO1xuXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZS50cmltKGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpO1xuXG4gICAgICAgICAgICB3aGlsZSAoZWF0X25ld2xpbmVzICYmIGxpbmVzLmxlbmd0aCA+IDEgJiZcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZS5nZXRfaXRlbV9jb3VudCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbGluZXMucG9wKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUgPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXVxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLnRyaW0oaW5kZW50X3N0cmluZywgYmFzZUluZGVudFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmp1c3RfYWRkZWRfbmV3bGluZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudF9saW5lLmdldF9pdGVtX2NvdW50KCkgPT09IDA7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmp1c3RfYWRkZWRfYmxhbmtsaW5lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5qdXN0X2FkZGVkX25ld2xpbmUoKSkge1xuICAgICAgICAgICAgICAgIGlmIChsaW5lcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7IC8vIHN0YXJ0IG9mIHRoZSBmaWxlIGFuZCBuZXdsaW5lID0gYmxhbmtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgbGluZSA9IGxpbmVzW2xpbmVzLmxlbmd0aCAtIDJdO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaW5lLmdldF9pdGVtX2NvdW50KCkgPT09IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIHZhciBUb2tlbiA9IGZ1bmN0aW9uKHR5cGUsIHRleHQsIG5ld2xpbmVzLCB3aGl0ZXNwYWNlX2JlZm9yZSwgbW9kZSwgcGFyZW50KSB7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMudGV4dCA9IHRleHQ7XG4gICAgICAgIHRoaXMuY29tbWVudHNfYmVmb3JlID0gW107XG4gICAgICAgIHRoaXMubmV3bGluZXMgPSBuZXdsaW5lcyB8fCAwO1xuICAgICAgICB0aGlzLndhbnRlZF9uZXdsaW5lID0gbmV3bGluZXMgPiAwO1xuICAgICAgICB0aGlzLndoaXRlc3BhY2VfYmVmb3JlID0gd2hpdGVzcGFjZV9iZWZvcmUgfHwgW107XG4gICAgICAgIHRoaXMucGFyZW50ID0gbnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b2tlbml6ZXIoaW5wdXQsIG9wdHMsIGluZGVudF9zdHJpbmcpIHtcblxuICAgICAgICB2YXIgd2hpdGVzcGFjZSA9IFwiXFxuXFxyXFx0IFwiLnNwbGl0KCcnKTtcbiAgICAgICAgdmFyIGRpZ2l0ID0gL1swLTldLztcblxuICAgICAgICB2YXIgcHVuY3QgPSAoJysgLSAqIC8gJSAmICsrIC0tID0gKz0gLT0gKj0gLz0gJT0gPT0gPT09ICE9ICE9PSA+IDwgPj0gPD0gPj4gPDwgPj4+ID4+Pj0gPj49IDw8PSAmJiAmPSB8IHx8ICEgfiAsIDogPyBeIF49IHw9IDo6ID0+J1xuICAgICAgICAgICAgICAgICsnIDwlPSA8JSAlPiA8Pz0gPD8gPz4nKS5zcGxpdCgnICcpOyAvLyB0cnkgdG8gYmUgYSBnb29kIGJveSBhbmQgdHJ5IG5vdCB0byBicmVhayB0aGUgbWFya3VwIGxhbmd1YWdlIGlkZW50aWZpZXJzXG5cbiAgICAgICAgLy8gd29yZHMgd2hpY2ggc2hvdWxkIGFsd2F5cyBzdGFydCBvbiBuZXcgbGluZS5cbiAgICAgICAgdGhpcy5saW5lX3N0YXJ0ZXJzID0gJ2NvbnRpbnVlLHRyeSx0aHJvdyxyZXR1cm4sdmFyLGxldCxjb25zdCxpZixzd2l0Y2gsY2FzZSxkZWZhdWx0LGZvcix3aGlsZSxicmVhayxmdW5jdGlvbix5aWVsZCxpbXBvcnQsZXhwb3J0Jy5zcGxpdCgnLCcpO1xuICAgICAgICB2YXIgcmVzZXJ2ZWRfd29yZHMgPSB0aGlzLmxpbmVfc3RhcnRlcnMuY29uY2F0KFsnZG8nLCAnaW4nLCAnZWxzZScsICdnZXQnLCAnc2V0JywgJ25ldycsICdjYXRjaCcsICdmaW5hbGx5JywgJ3R5cGVvZiddKTtcblxuICAgICAgICB2YXIgbl9uZXdsaW5lcywgd2hpdGVzcGFjZV9iZWZvcmVfdG9rZW4sIGluX2h0bWxfY29tbWVudCwgdG9rZW5zLCBwYXJzZXJfcG9zO1xuICAgICAgICB2YXIgaW5wdXRfbGVuZ3RoO1xuXG4gICAgICAgIHRoaXMudG9rZW5pemUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIGNhY2hlIHRoZSBzb3VyY2UncyBsZW5ndGguXG4gICAgICAgICAgICBpbnB1dF9sZW5ndGggPSBpbnB1dC5sZW5ndGhcbiAgICAgICAgICAgIHBhcnNlcl9wb3MgPSAwO1xuICAgICAgICAgICAgaW5faHRtbF9jb21tZW50ID0gZmFsc2VcbiAgICAgICAgICAgIHRva2VucyA9IFtdO1xuXG4gICAgICAgICAgICB2YXIgbmV4dCwgbGFzdDtcbiAgICAgICAgICAgIHZhciB0b2tlbl92YWx1ZXM7XG4gICAgICAgICAgICB2YXIgb3BlbiA9IG51bGw7XG4gICAgICAgICAgICB2YXIgb3Blbl9zdGFjayA9IFtdO1xuICAgICAgICAgICAgdmFyIGNvbW1lbnRzID0gW107XG5cbiAgICAgICAgICAgIHdoaWxlICghKGxhc3QgJiYgbGFzdC50eXBlID09PSAnVEtfRU9GJykpIHtcbiAgICAgICAgICAgICAgICB0b2tlbl92YWx1ZXMgPSB0b2tlbml6ZV9uZXh0KCk7XG4gICAgICAgICAgICAgICAgbmV4dCA9IG5ldyBUb2tlbih0b2tlbl92YWx1ZXNbMV0sIHRva2VuX3ZhbHVlc1swXSwgbl9uZXdsaW5lcywgd2hpdGVzcGFjZV9iZWZvcmVfdG9rZW4pO1xuICAgICAgICAgICAgICAgIHdoaWxlKG5leHQudHlwZSA9PT0gJ1RLX0lOTElORV9DT01NRU5UJyB8fCBuZXh0LnR5cGUgPT09ICdUS19DT01NRU5UJyB8fFxuICAgICAgICAgICAgICAgICAgICBuZXh0LnR5cGUgPT09ICdUS19CTE9DS19DT01NRU5UJyB8fCBuZXh0LnR5cGUgPT09ICdUS19VTktOT1dOJykge1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50cy5wdXNoKG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB0b2tlbl92YWx1ZXMgPSB0b2tlbml6ZV9uZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIG5leHQgPSBuZXcgVG9rZW4odG9rZW5fdmFsdWVzWzFdLCB0b2tlbl92YWx1ZXNbMF0sIG5fbmV3bGluZXMsIHdoaXRlc3BhY2VfYmVmb3JlX3Rva2VuKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY29tbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHQuY29tbWVudHNfYmVmb3JlID0gY29tbWVudHM7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnRzID0gW107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG5leHQudHlwZSA9PT0gJ1RLX1NUQVJUX0JMT0NLJyB8fCBuZXh0LnR5cGUgPT09ICdUS19TVEFSVF9FWFBSJykge1xuICAgICAgICAgICAgICAgICAgICBuZXh0LnBhcmVudCA9IGxhc3Q7XG4gICAgICAgICAgICAgICAgICAgIG9wZW4gPSBuZXh0O1xuICAgICAgICAgICAgICAgICAgICBvcGVuX3N0YWNrLnB1c2gobmV4dCk7XG4gICAgICAgICAgICAgICAgfSAgZWxzZSBpZiAoKG5leHQudHlwZSA9PT0gJ1RLX0VORF9CTE9DSycgfHwgbmV4dC50eXBlID09PSAnVEtfRU5EX0VYUFInKSAmJlxuICAgICAgICAgICAgICAgICAgICAob3BlbiAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAobmV4dC50ZXh0ID09PSAnXScgJiYgb3Blbi50ZXh0ID09PSAnWycpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAobmV4dC50ZXh0ID09PSAnKScgJiYgb3Blbi50ZXh0ID09PSAnKCcpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAobmV4dC50ZXh0ID09PSAnfScgJiYgb3Blbi50ZXh0ID09PSAnfScpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dC5wYXJlbnQgPSBvcGVuLnBhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgb3BlbiA9IG9wZW5fc3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdG9rZW5zLnB1c2gobmV4dCk7XG4gICAgICAgICAgICAgICAgbGFzdCA9IG5leHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0b2tlbnM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB0b2tlbml6ZV9uZXh0KCkge1xuICAgICAgICAgICAgdmFyIGksIHJlc3VsdGluZ19zdHJpbmc7XG5cbiAgICAgICAgICAgIG5fbmV3bGluZXMgPSAwO1xuICAgICAgICAgICAgd2hpdGVzcGFjZV9iZWZvcmVfdG9rZW4gPSBbXTtcblxuICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPj0gaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnJywgJ1RLX0VPRiddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbGFzdF90b2tlbjtcbiAgICAgICAgICAgIGlmICh0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbGFzdF90b2tlbiA9IHRva2Vuc1t0b2tlbnMubGVuZ3RoLTFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgdGhlIHNha2Ugb2YgdG9rZW5pemluZyB3ZSBjYW4gcHJldGVuZCB0aGF0IHRoZXJlIHdhcyBvbiBvcGVuIGJyYWNlIHRvIHN0YXJ0XG4gICAgICAgICAgICAgICAgbGFzdF90b2tlbiA9IG5ldyBUb2tlbignVEtfU1RBUlRfQkxPQ0snLCAneycpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHZhciBjID0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuXG4gICAgICAgICAgICB3aGlsZSAoaW5fYXJyYXkoYywgd2hpdGVzcGFjZSkpIHtcblxuICAgICAgICAgICAgICAgIGlmIChjID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICBuX25ld2xpbmVzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2VfYmVmb3JlX3Rva2VuID0gW107XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuX25ld2xpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSBpbmRlbnRfc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbi5wdXNoKGluZGVudF9zdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGMgIT09ICdcXHInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbi5wdXNoKCcgJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA+PSBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsnJywgJ1RLX0VPRiddO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGMgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGlnaXQudGVzdChjKSkge1xuICAgICAgICAgICAgICAgIHZhciBhbGxvd19kZWNpbWFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgYWxsb3dfZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGxvY2FsX2RpZ2l0ID0gZGlnaXQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJzAnICYmIHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgL1tYeF0vLnRlc3QoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzd2l0Y2ggdG8gaGV4IG51bWJlciwgbm8gZGVjaW1hbCBvciBlLCBqdXN0IGhleCBkaWdpdHNcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dfZGVjaW1hbCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBhbGxvd19lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsX2RpZ2l0ID0gL1swMTIzNDU2Nzg5YWJjZGVmQUJDREVGXS9cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB3ZSBrbm93IHRoaXMgZmlyc3QgbG9vcCB3aWxsIHJ1bi4gIEl0IGtlZXBzIHRoZSBsb2dpYyBzaW1wbGVyLlxuICAgICAgICAgICAgICAgICAgICBjID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgLT0gMVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFkZCB0aGUgZGlnaXRzXG4gICAgICAgICAgICAgICAgd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgbG9jYWxfZGlnaXQudGVzdChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93X2RlY2ltYWwgJiYgcGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICcuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxvd19kZWNpbWFsID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dfZSAmJiBwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIC9bRWVdLy50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiAvWystXS8udGVzdChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxvd19lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxvd19kZWNpbWFsID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19XT1JEJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhY29ybi5pc0lkZW50aWZpZXJTdGFydChpbnB1dC5jaGFyQ29kZUF0KHBhcnNlcl9wb3MtMSkpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGFjb3JuLmlzSWRlbnRpZmllckNoYXIoaW5wdXQuY2hhckNvZGVBdChwYXJzZXJfcG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPT09IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCEobGFzdF90b2tlbi50eXBlID09PSAnVEtfRE9UJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGxhc3RfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShsYXN0X3Rva2VuLnRleHQsIFsnc2V0JywgJ2dldCddKSkpXG4gICAgICAgICAgICAgICAgICAgICYmIGluX2FycmF5KGMsIHJlc2VydmVkX3dvcmRzKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ2luJykgeyAvLyBoYWNrIGZvciAnaW4nIG9wZXJhdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19PUEVSQVRPUiddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX1JFU0VSVkVEJ107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfV09SRCddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJygnIHx8IGMgPT09ICdbJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX1NUQVJUX0VYUFInXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcpJyB8fCBjID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19FTkRfRVhQUiddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJ3snKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfU1RBUlRfQkxPQ0snXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICd9Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX0VORF9CTE9DSyddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJzsnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfU0VNSUNPTE9OJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29tbWVudCA9ICcnO1xuICAgICAgICAgICAgICAgIC8vIHBlZWsgZm9yIGNvbW1lbnQgLyogLi4uICovXG4gICAgICAgICAgICAgICAgdmFyIGlubGluZV9jb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgIShpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICcqJyAmJiBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcyArIDEpICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zICsgMSkgPT09ICcvJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjID0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gXCJcXG5cIiB8fCBjID09PSBcIlxcclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlubGluZV9jb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA+PSBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlubGluZV9jb21tZW50ICYmIG5fbmV3bGluZXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbJy8qJyArIGNvbW1lbnQgKyAnKi8nLCAnVEtfSU5MSU5FX0NPTU1FTlQnXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbJy8qJyArIGNvbW1lbnQgKyAnKi8nLCAnVEtfQkxPQ0tfQ09NTUVOVCddO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHBlZWsgZm9yIGNvbW1lbnQgLy8gLi4uXG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSBjO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpICE9PSAnXFxyJyAmJiBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgIT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zID49IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbY29tbWVudCwgJ1RLX0NPTU1FTlQnXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICdgJyB8fCBjID09PSBcIidcIiB8fCBjID09PSAnXCInIHx8IC8vIHN0cmluZ1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgKGMgPT09ICcvJykgfHwgLy8gcmVnZXhwXG4gICAgICAgICAgICAgICAgICAgIChvcHRzLmU0eCAmJiBjID09PSBcIjxcIiAmJiBpbnB1dC5zbGljZShwYXJzZXJfcG9zIC0gMSkubWF0Y2goL148KFstYS16QS1aOjAtOV8uXSt8e1tee31dKn18IVxcW0NEQVRBXFxbW1xcc1xcU10qP1xcXVxcXSlcXHMqKFstYS16QS1aOjAtOV8uXSs9KCdbXiddKid8XCJbXlwiXSpcInx7W157fV0qfSlcXHMqKSpcXC8/XFxzKj4vKSkgLy8geG1sXG4gICAgICAgICAgICAgICAgKSAmJiAoIC8vIHJlZ2V4IGFuZCB4bWwgY2FuIG9ubHkgYXBwZWFyIGluIHNwZWNpZmljIGxvY2F0aW9ucyBkdXJpbmcgcGFyc2luZ1xuICAgICAgICAgICAgICAgICAgICAobGFzdF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGxhc3RfdG9rZW4udGV4dCAsIFsncmV0dXJuJywgJ2Nhc2UnLCAndGhyb3cnLCAnZWxzZScsICdkbycsICd0eXBlb2YnLCAneWllbGQnXSkpIHx8XG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3Rva2VuLnR5cGUgPT09ICdUS19FTkRfRVhQUicgJiYgbGFzdF90b2tlbi50ZXh0ID09PSAnKScgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfdG9rZW4ucGFyZW50ICYmIGxhc3RfdG9rZW4ucGFyZW50LnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkobGFzdF90b2tlbi5wYXJlbnQudGV4dCwgWydpZicsICd3aGlsZScsICdmb3InXSkpIHx8XG4gICAgICAgICAgICAgICAgICAgIChpbl9hcnJheShsYXN0X3Rva2VuLnR5cGUsIFsnVEtfQ09NTUVOVCcsICdUS19TVEFSVF9FWFBSJywgJ1RLX1NUQVJUX0JMT0NLJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdUS19FTkRfQkxPQ0snLCAnVEtfT1BFUkFUT1InLCAnVEtfRVFVQUxTJywgJ1RLX0VPRicsICdUS19TRU1JQ09MT04nLCAnVEtfQ09NTUEnXG4gICAgICAgICAgICAgICAgICAgIF0pKVxuICAgICAgICAgICAgICAgICkpIHtcblxuICAgICAgICAgICAgICAgIHZhciBzZXAgPSBjLFxuICAgICAgICAgICAgICAgICAgICBlc2MgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgaGFzX2NoYXJfZXNjYXBlcyA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgcmVzdWx0aW5nX3N0cmluZyA9IGM7XG5cbiAgICAgICAgICAgICAgICBpZiAoc2VwID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlIHJlZ2V4cFxuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5fY2hhcl9jbGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICgoZXNjIHx8IGluX2NoYXJfY2xhc3MgfHwgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpICE9PSBzZXApICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIWFjb3JuLm5ld2xpbmUudGVzdChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0aW5nX3N0cmluZyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVzYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVzYyA9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJ1xcXFwnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICdbJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbl9jaGFyX2NsYXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluX2NoYXJfY2xhc3MgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVzYyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRzLmU0eCAmJiBzZXAgPT09ICc8Jykge1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUgZTR4IHhtbCBsaXRlcmFsc1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICB2YXIgeG1sUmVnRXhwID0gLzwoXFwvPykoWy1hLXpBLVo6MC05Xy5dK3x7W157fV0qfXwhXFxbQ0RBVEFcXFtbXFxzXFxTXSo/XFxdXFxdKVxccyooWy1hLXpBLVo6MC05Xy5dKz0oJ1teJ10qJ3xcIlteXCJdKlwifHtbXnt9XSp9KVxccyopKihcXC8/KVxccyo+L2c7XG4gICAgICAgICAgICAgICAgICAgIHZhciB4bWxTdHIgPSBpbnB1dC5zbGljZShwYXJzZXJfcG9zIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaCA9IHhtbFJlZ0V4cC5leGVjKHhtbFN0cik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaCAmJiBtYXRjaC5pbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJvb3RUYWcgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkZXB0aCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNFbmRUYWcgPSAhISBtYXRjaFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGFnTmFtZSA9IG1hdGNoWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc1NpbmdsZXRvblRhZyA9ICggISEgbWF0Y2hbbWF0Y2gubGVuZ3RoIC0gMV0pIHx8ICh0YWdOYW1lLnNsaWNlKDAsIDgpID09PSBcIiFbQ0RBVEFbXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YWdOYW1lID09PSByb290VGFnICYmICFpc1NpbmdsZXRvblRhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNFbmRUYWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tZGVwdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICArK2RlcHRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXB0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaCA9IHhtbFJlZ0V4cC5leGVjKHhtbFN0cik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgeG1sTGVuZ3RoID0gbWF0Y2ggPyBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCA6IHhtbFN0ci5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IHhtbExlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3htbFN0ci5zbGljZSgwLCB4bWxMZW5ndGgpLCBcIlRLX1NUUklOR1wiXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gVGVtcGxhdGUgc3RyaW5ncyBjYW4gdHJhdmVycyBsaW5lcyB3aXRob3V0IGVzY2FwZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgICAgICAvLyBPdGhlciBzdHJpbmdzIGNhbm5vdFxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChlc2MgfHwgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSAhPT0gc2VwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKHNlcCA9PT0gJ2AnIHx8ICFhY29ybi5uZXdsaW5lLnRlc3QoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpKSkpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0aW5nX3N0cmluZyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXNjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJ3gnIHx8IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc19jaGFyX2VzY2FwZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlc2MgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXNjID0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnXFxcXCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChoYXNfY2hhcl9lc2NhcGVzICYmIG9wdHMudW5lc2NhcGVfc3RyaW5ncykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nID0gdW5lc2NhcGVfc3RyaW5nKHJlc3VsdGluZ19zdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gc2VwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgKz0gc2VwO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlcCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZWdleHBzIG1heSBoYXZlIG1vZGlmaWVycyAvcmVnZXhwL01PRCAsIHNvIGZldGNoIHRob3NlLCB0b29cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgW2dpbV0gYXJlIHZhbGlkLCBidXQgaWYgdGhlIHVzZXIgcHV0cyBpbiBnYXJiYWdlLCBkbyB3aGF0IHdlIGNhbiB0byB0YWtlIGl0LlxuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgYWNvcm4uaXNJZGVudGlmaWVyU3RhcnQoaW5wdXQuY2hhckNvZGVBdChwYXJzZXJfcG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtyZXN1bHRpbmdfc3RyaW5nLCAnVEtfU1RSSU5HJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnIycpIHtcblxuICAgICAgICAgICAgICAgIGlmICh0b2tlbnMubGVuZ3RoID09PSAwICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJyEnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNoZWJhbmdcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0aW5nX3N0cmluZyA9IGM7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGMgIT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0aW5nX3N0cmluZyArPSBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbdHJpbShyZXN1bHRpbmdfc3RyaW5nKSArICdcXG4nLCAnVEtfVU5LTk9XTiddO1xuICAgICAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgICAgICAvLyBTcGlkZXJtb25rZXktc3BlY2lmaWMgc2hhcnAgdmFyaWFibGVzIGZvciBjaXJjdWxhciByZWZlcmVuY2VzXG4gICAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvRW4vU2hhcnBfdmFyaWFibGVzX2luX0phdmFTY3JpcHRcbiAgICAgICAgICAgICAgICAvLyBodHRwOi8vbXhyLm1vemlsbGEub3JnL21vemlsbGEtY2VudHJhbC9zb3VyY2UvanMvc3JjL2pzc2Nhbi5jcHAgYXJvdW5kIGxpbmUgMTkzNVxuICAgICAgICAgICAgICAgIHZhciBzaGFycCA9ICcjJztcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBkaWdpdC50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYXJwICs9IGM7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgYyAhPT0gJyMnICYmIGMgIT09ICc9Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAnIycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnWycgJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MgKyAxKSA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFycCArPSAnW10nO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAyO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJ3snICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zICsgMSkgPT09ICd9Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hhcnAgKz0gJ3t9JztcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3NoYXJwLCAnVEtfV09SRCddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICc8JyAmJiBpbnB1dC5zdWJzdHJpbmcocGFyc2VyX3BvcyAtIDEsIHBhcnNlcl9wb3MgKyAzKSA9PT0gJzwhLS0nKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAzO1xuICAgICAgICAgICAgICAgIGMgPSAnPCEtLSc7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSAhPT0gJ1xcbicgJiYgcGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcysrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbl9odG1sX2NvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX0NPTU1FTlQnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICctJyAmJiBpbl9odG1sX2NvbW1lbnQgJiYgaW5wdXQuc3Vic3RyaW5nKHBhcnNlcl9wb3MgLSAxLCBwYXJzZXJfcG9zICsgMikgPT09ICctLT4nKSB7XG4gICAgICAgICAgICAgICAgaW5faHRtbF9jb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAyO1xuICAgICAgICAgICAgICAgIHJldHVybiBbJy0tPicsICdUS19DT01NRU5UJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19ET1QnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGluX2FycmF5KGMsIHB1bmN0KSkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGluX2FycmF5KGMgKyBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcyksIHB1bmN0KSkge1xuICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA+PSBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICcsJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19DT01NQSddO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJz0nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX0VRVUFMUyddO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX09QRVJBVE9SJ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gW2MsICdUS19VTktOT1dOJ107XG4gICAgICAgIH1cblxuXG4gICAgICAgIGZ1bmN0aW9uIHVuZXNjYXBlX3N0cmluZyhzKSB7XG4gICAgICAgICAgICB2YXIgZXNjID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgb3V0ID0gJycsXG4gICAgICAgICAgICAgICAgcG9zID0gMCxcbiAgICAgICAgICAgICAgICBzX2hleCA9ICcnLFxuICAgICAgICAgICAgICAgIGVzY2FwZWQgPSAwLFxuICAgICAgICAgICAgICAgIGM7XG5cbiAgICAgICAgICAgIHdoaWxlIChlc2MgfHwgcG9zIDwgcy5sZW5ndGgpIHtcblxuICAgICAgICAgICAgICAgIGMgPSBzLmNoYXJBdChwb3MpO1xuICAgICAgICAgICAgICAgIHBvcysrO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVzYykge1xuICAgICAgICAgICAgICAgICAgICBlc2MgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09ICd4Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2ltcGxlIGhleC1lc2NhcGUgXFx4MjRcbiAgICAgICAgICAgICAgICAgICAgICAgIHNfaGV4ID0gcy5zdWJzdHIocG9zLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcyArPSAyO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICd1Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdW5pY29kZS1lc2NhcGUsIFxcdTIxMzRcbiAgICAgICAgICAgICAgICAgICAgICAgIHNfaGV4ID0gcy5zdWJzdHIocG9zLCA0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcyArPSA0O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc29tZSBjb21tb24gZXNjYXBlLCBlLmcgXFxuXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcXFwnICsgYztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghc19oZXgubWF0Y2goL15bMDEyMzQ1Njc4OWFiY2RlZkFCQ0RFRl0rJC8pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzb21lIHdlaXJkIGVzY2FwaW5nLCBiYWlsIG91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxlYXZpbmcgd2hvbGUgc3RyaW5nIGludGFjdFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBlc2NhcGVkID0gcGFyc2VJbnQoc19oZXgsIDE2KTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZXNjYXBlZCA+PSAweDAwICYmIGVzY2FwZWQgPCAweDIwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZWF2ZSAweDAwLi4uMHgxZiBlc2NhcGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ3gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICdcXFxceCcgKyBzX2hleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICdcXFxcdScgKyBzX2hleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVzY2FwZWQgPT09IDB4MjIgfHwgZXNjYXBlZCA9PT0gMHgyNyB8fCBlc2NhcGVkID09PSAweDVjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGUtcXVvdGUsIGFwb3N0cm9waGUsIGJhY2tzbGFzaCAtIGVzY2FwZSB0aGVzZVxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9ICdcXFxcJyArIFN0cmluZy5mcm9tQ2hhckNvZGUoZXNjYXBlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ3gnICYmIGVzY2FwZWQgPiAweDdlICYmIGVzY2FwZWQgPD0gMHhmZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgYmFpbCBvdXQgb24gXFx4N2YuLlxceGZmLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGVhdmluZyB3aG9sZSBzdHJpbmcgZXNjYXBlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIGl0J3MgcHJvYmFibHkgY29tcGxldGVseSBiaW5hcnlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoZXNjYXBlZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICAgICBlc2MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBjO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cblxuICAgIH1cblxuXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIC8vIEFkZCBzdXBwb3J0IGZvciBBTUQgKCBodHRwczovL2dpdGh1Yi5jb20vYW1kanMvYW1kanMtYXBpL3dpa2kvQU1EI2RlZmluZWFtZC1wcm9wZXJ0eS0gKVxuICAgICAgICBkZWZpbmUoW10sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHsganNfYmVhdXRpZnk6IGpzX2JlYXV0aWZ5IH07XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIENvbW1vbkpTLiBKdXN0IHB1dCB0aGlzIGZpbGUgc29tZXdoZXJlIG9uIHlvdXIgcmVxdWlyZS5wYXRoc1xuICAgICAgICAvLyBhbmQgeW91IHdpbGwgYmUgYWJsZSB0byBgdmFyIGpzX2JlYXV0aWZ5ID0gcmVxdWlyZShcImJlYXV0aWZ5XCIpLmpzX2JlYXV0aWZ5YC5cbiAgICAgICAgZXhwb3J0cy5qc19iZWF1dGlmeSA9IGpzX2JlYXV0aWZ5O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSdyZSBydW5uaW5nIGEgd2ViIHBhZ2UgYW5kIGRvbid0IGhhdmUgZWl0aGVyIG9mIHRoZSBhYm92ZSwgYWRkIG91ciBvbmUgZ2xvYmFsXG4gICAgICAgIHdpbmRvdy5qc19iZWF1dGlmeSA9IGpzX2JlYXV0aWZ5O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSBkb24ndCBldmVuIGhhdmUgd2luZG93LCB0cnkgZ2xvYmFsLlxuICAgICAgICBnbG9iYWwuanNfYmVhdXRpZnkgPSBqc19iZWF1dGlmeTtcbiAgICB9XG5cbn0oKSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMucHJldHR5ID0gZnVuY3Rpb24gKGpzT2JqZWN0LCBpbmRlbnRMZW5ndGgsIG91dHB1dFRvLCBmdWxsRnVuY3Rpb24pIHtcbiAgICB2YXIgaW5kZW50U3RyaW5nLFxuICAgICAgICBuZXdMaW5lLFxuICAgICAgICBuZXdMaW5lSm9pbixcbiAgICAgICAgVE9TVFJJTkcsXG4gICAgICAgIFRZUEVTLFxuICAgICAgICB2YWx1ZVR5cGUsXG4gICAgICAgIHJlcGVhdFN0cmluZyxcbiAgICAgICAgcHJldHR5T2JqZWN0LFxuICAgICAgICBwcmV0dHlPYmplY3RKU09OLFxuICAgICAgICBwcmV0dHlPYmplY3RQcmludCxcbiAgICAgICAgcHJldHR5QXJyYXksXG4gICAgICAgIGZ1bmN0aW9uU2lnbmF0dXJlLFxuICAgICAgICBwcmV0dHksXG4gICAgICAgIHZpc2l0ZWQ7XG5cbiAgICBUT1NUUklORyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbiAgICBUWVBFUyA9IHtcbiAgICAgICAgJ3VuZGVmaW5lZCcgICAgICAgIDogJ3VuZGVmaW5lZCcsXG4gICAgICAgICdudW1iZXInICAgICAgICAgICA6ICdudW1iZXInLFxuICAgICAgICAnYm9vbGVhbicgICAgICAgICAgOiAnYm9vbGVhbicsXG4gICAgICAgICdzdHJpbmcnICAgICAgICAgICA6ICdzdHJpbmcnLFxuICAgICAgICAnW29iamVjdCBGdW5jdGlvbl0nOiAnZnVuY3Rpb24nLFxuICAgICAgICAnW29iamVjdCBSZWdFeHBdJyAgOiAncmVnZXhwJyxcbiAgICAgICAgJ1tvYmplY3QgQXJyYXldJyAgIDogJ2FycmF5JyxcbiAgICAgICAgJ1tvYmplY3QgRGF0ZV0nICAgIDogJ2RhdGUnLFxuICAgICAgICAnW29iamVjdCBFcnJvcl0nICAgOiAnZXJyb3InXG4gICAgfTtcblxuICAgIHZhbHVlVHlwZSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHZhciB0eXBlID0gVFlQRVNbdHlwZW9mIG9dIHx8IFRZUEVTW1RPU1RSSU5HLmNhbGwobyldIHx8IChvID8gJ29iamVjdCcgOiAnbnVsbCcpO1xuICAgICAgICByZXR1cm4gdHlwZTtcbiAgICB9O1xuXG4gICAgcmVwZWF0U3RyaW5nID0gZnVuY3Rpb24gKHNyYywgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBkc3QgPSAnJyxcbiAgICAgICAgICAgIGluZGV4O1xuICAgICAgICBmb3IgKGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAgICAgICAgIGRzdCArPSBzcmM7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZHN0O1xuICAgIH07XG5cbiAgICBwcmV0dHlPYmplY3RKU09OID0gZnVuY3Rpb24gKG9iamVjdCwgaW5kZW50KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IFtdLFxuICAgICAgICAgICAgcHJvcGVydHk7XG5cbiAgICAgICAgaW5kZW50ICs9IGluZGVudFN0cmluZztcbiAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUucHVzaChpbmRlbnQgKyAnXCInICsgcHJvcGVydHkgKyAnXCI6ICcgKyBwcmV0dHkob2JqZWN0W3Byb3BlcnR5XSwgaW5kZW50KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWUuam9pbihuZXdMaW5lSm9pbikgKyBuZXdMaW5lO1xuICAgIH07XG5cbiAgICBwcmV0dHlPYmplY3RQcmludCA9IGZ1bmN0aW9uIChvYmplY3QsIGluZGVudCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBbXSxcbiAgICAgICAgICAgIHByb3BlcnR5O1xuXG4gICAgICAgIGluZGVudCArPSBpbmRlbnRTdHJpbmc7XG4gICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIHZhbHVlLnB1c2goaW5kZW50ICsgcHJvcGVydHkgKyAnOiAnICsgcHJldHR5KG9iamVjdFtwcm9wZXJ0eV0sIGluZGVudCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlLmpvaW4obmV3TGluZUpvaW4pICsgbmV3TGluZTtcbiAgICB9O1xuXG4gICAgcHJldHR5QXJyYXkgPSBmdW5jdGlvbiAoYXJyYXksIGluZGVudCkge1xuICAgICAgICB2YXIgaW5kZXgsXG4gICAgICAgICAgICBsZW5ndGggPSBhcnJheS5sZW5ndGgsXG4gICAgICAgICAgICB2YWx1ZSA9IFtdO1xuXG4gICAgICAgIGluZGVudCArPSBpbmRlbnRTdHJpbmc7XG4gICAgICAgIGZvciAoaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgICAgICAgICAgdmFsdWUucHVzaChwcmV0dHkoYXJyYXlbaW5kZXhdLCBpbmRlbnQsIGluZGVudCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlLmpvaW4obmV3TGluZUpvaW4pICsgbmV3TGluZTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb25TaWduYXR1cmUgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgc2lnbmF0dXJlRXhwcmVzc2lvbixcbiAgICAgICAgICAgIHNpZ25hdHVyZTtcblxuICAgICAgICBlbGVtZW50ID0gZWxlbWVudC50b1N0cmluZygpO1xuICAgICAgICBzaWduYXR1cmVFeHByZXNzaW9uID0gbmV3IFJlZ0V4cCgnZnVuY3Rpb25cXFxccyouKlxcXFxzKlxcXFwoLipcXFxcKScpO1xuICAgICAgICBzaWduYXR1cmUgPSBzaWduYXR1cmVFeHByZXNzaW9uLmV4ZWMoZWxlbWVudCk7XG4gICAgICAgIHNpZ25hdHVyZSA9IHNpZ25hdHVyZSA/IHNpZ25hdHVyZVswXSA6ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gICAgICAgIHJldHVybiBmdWxsRnVuY3Rpb24gPyBlbGVtZW50IDogJ1wiJyArIHNpZ25hdHVyZSArICdcIic7XG4gICAgfTtcblxuICAgIHByZXR0eSA9IGZ1bmN0aW9uIChlbGVtZW50LCBpbmRlbnQsIGZyb21BcnJheSkge1xuICAgICAgICB2YXIgdHlwZTtcblxuICAgICAgICB0eXBlID0gdmFsdWVUeXBlKGVsZW1lbnQpO1xuICAgICAgICBmcm9tQXJyYXkgPSBmcm9tQXJyYXkgfHwgJyc7XG4gICAgICAgIGlmICh2aXNpdGVkLmluZGV4T2YoZWxlbWVudCkgPT09IC0xKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2FycmF5JzpcbiAgICAgICAgICAgICAgICB2aXNpdGVkLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb21BcnJheSArICdbJyArIG5ld0xpbmUgKyBwcmV0dHlBcnJheShlbGVtZW50LCBpbmRlbnQpICsgaW5kZW50ICsgJ10nO1xuXG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbUFycmF5ICsgKGVsZW1lbnQgPyAndHJ1ZScgOiAnZmFsc2UnKTtcblxuICAgICAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb21BcnJheSArICdcIicgKyBlbGVtZW50LnRvU3RyaW5nKCkgKyAnXCInO1xuXG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBmcm9tQXJyYXkgKyBlbGVtZW50O1xuXG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIHZpc2l0ZWQucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbUFycmF5ICsgJ3snICsgbmV3TGluZSArIHByZXR0eU9iamVjdChlbGVtZW50LCBpbmRlbnQpICsgaW5kZW50ICsgJ30nO1xuXG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBmcm9tQXJyYXkgKyAnXCInICsgZWxlbWVudCArICdcIic7XG5cbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbUFycmF5ICsgZnVuY3Rpb25TaWduYXR1cmUoZWxlbWVudCk7XG5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb21BcnJheSArICgoZWxlbWVudCAhPT0gdW5kZWZpbmVkKT8gZWxlbWVudC50b1N0cmluZygpIDogJ3VuZGVmaW5lZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmcm9tQXJyYXkgKyAnY2lyY3VsYXIgcmVmZXJlbmNlIHRvICcgKyBlbGVtZW50LnRvU3RyaW5nKCk7XG4gICAgfTtcblxuICAgIGlmIChqc09iamVjdCkge1xuICAgICAgICBpZiAoaW5kZW50TGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGluZGVudExlbmd0aCA9IDQ7XG4gICAgICAgIH1cblxuICAgICAgICBvdXRwdXRUbyA9IChvdXRwdXRUbyB8fCAncHJpbnQnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBpbmRlbnRTdHJpbmcgPSByZXBlYXRTdHJpbmcob3V0cHV0VG8gPT09ICdodG1sJyA/ICcmbmJzcDsnIDogJyAnLCBpbmRlbnRMZW5ndGgpO1xuICAgICAgICBwcmV0dHlPYmplY3QgPSBvdXRwdXRUbyA9PT0gJ2pzb24nID8gcHJldHR5T2JqZWN0SlNPTiA6IHByZXR0eU9iamVjdFByaW50O1xuICAgICAgICBuZXdMaW5lID0gb3V0cHV0VG8gPT09ICdodG1sJyA/ICc8YnIvPicgOiAnXFxuJztcbiAgICAgICAgbmV3TGluZUpvaW4gPSAnLCcgKyBuZXdMaW5lO1xuICAgICAgICB2aXNpdGVkID0gW107XG4gICAgICAgIHJldHVybiBwcmV0dHkoanNPYmplY3QsICcnKSArIG5ld0xpbmU7XG4gICAgfVxuXG4gICAgcmV0dXJuICdFcnJvcjogbm8gSmF2YXNjcmlwdCBvYmplY3QgcHJvdmlkZWQnO1xufTtcbiIsIi8vIHdyYXBwZXIgZm9yIG5vbi1ub2RlIGVudnNcbjsoZnVuY3Rpb24gKHNheCkge1xuXG5zYXgucGFyc2VyID0gZnVuY3Rpb24gKHN0cmljdCwgb3B0KSB7IHJldHVybiBuZXcgU0FYUGFyc2VyKHN0cmljdCwgb3B0KSB9XG5zYXguU0FYUGFyc2VyID0gU0FYUGFyc2VyXG5zYXguU0FYU3RyZWFtID0gU0FYU3RyZWFtXG5zYXguY3JlYXRlU3RyZWFtID0gY3JlYXRlU3RyZWFtXG5cbi8vIFdoZW4gd2UgcGFzcyB0aGUgTUFYX0JVRkZFUl9MRU5HVEggcG9zaXRpb24sIHN0YXJ0IGNoZWNraW5nIGZvciBidWZmZXIgb3ZlcnJ1bnMuXG4vLyBXaGVuIHdlIGNoZWNrLCBzY2hlZHVsZSB0aGUgbmV4dCBjaGVjayBmb3IgTUFYX0JVRkZFUl9MRU5HVEggLSAobWF4KGJ1ZmZlciBsZW5ndGhzKSksXG4vLyBzaW5jZSB0aGF0J3MgdGhlIGVhcmxpZXN0IHRoYXQgYSBidWZmZXIgb3ZlcnJ1biBjb3VsZCBvY2N1ci4gIFRoaXMgd2F5LCBjaGVja3MgYXJlXG4vLyBhcyByYXJlIGFzIHJlcXVpcmVkLCBidXQgYXMgb2Z0ZW4gYXMgbmVjZXNzYXJ5IHRvIGVuc3VyZSBuZXZlciBjcm9zc2luZyB0aGlzIGJvdW5kLlxuLy8gRnVydGhlcm1vcmUsIGJ1ZmZlcnMgYXJlIG9ubHkgdGVzdGVkIGF0IG1vc3Qgb25jZSBwZXIgd3JpdGUoKSwgc28gcGFzc2luZyBhIHZlcnlcbi8vIGxhcmdlIHN0cmluZyBpbnRvIHdyaXRlKCkgbWlnaHQgaGF2ZSB1bmRlc2lyYWJsZSBlZmZlY3RzLCBidXQgdGhpcyBpcyBtYW5hZ2VhYmxlIGJ5XG4vLyB0aGUgY2FsbGVyLCBzbyBpdCBpcyBhc3N1bWVkIHRvIGJlIHNhZmUuICBUaHVzLCBhIGNhbGwgdG8gd3JpdGUoKSBtYXksIGluIHRoZSBleHRyZW1lXG4vLyBlZGdlIGNhc2UsIHJlc3VsdCBpbiBjcmVhdGluZyBhdCBtb3N0IG9uZSBjb21wbGV0ZSBjb3B5IG9mIHRoZSBzdHJpbmcgcGFzc2VkIGluLlxuLy8gU2V0IHRvIEluZmluaXR5IHRvIGhhdmUgdW5saW1pdGVkIGJ1ZmZlcnMuXG5zYXguTUFYX0JVRkZFUl9MRU5HVEggPSA2NCAqIDEwMjRcblxudmFyIGJ1ZmZlcnMgPSBbXG4gIFwiY29tbWVudFwiLCBcInNnbWxEZWNsXCIsIFwidGV4dE5vZGVcIiwgXCJ0YWdOYW1lXCIsIFwiZG9jdHlwZVwiLFxuICBcInByb2NJbnN0TmFtZVwiLCBcInByb2NJbnN0Qm9keVwiLCBcImVudGl0eVwiLCBcImF0dHJpYk5hbWVcIixcbiAgXCJhdHRyaWJWYWx1ZVwiLCBcImNkYXRhXCIsIFwic2NyaXB0XCJcbl1cblxuc2F4LkVWRU5UUyA9IC8vIGZvciBkaXNjb3ZlcmFiaWxpdHkuXG4gIFsgXCJ0ZXh0XCJcbiAgLCBcInByb2Nlc3NpbmdpbnN0cnVjdGlvblwiXG4gICwgXCJzZ21sZGVjbGFyYXRpb25cIlxuICAsIFwiZG9jdHlwZVwiXG4gICwgXCJjb21tZW50XCJcbiAgLCBcImF0dHJpYnV0ZVwiXG4gICwgXCJvcGVudGFnXCJcbiAgLCBcImNsb3NldGFnXCJcbiAgLCBcIm9wZW5jZGF0YVwiXG4gICwgXCJjZGF0YVwiXG4gICwgXCJjbG9zZWNkYXRhXCJcbiAgLCBcImVycm9yXCJcbiAgLCBcImVuZFwiXG4gICwgXCJyZWFkeVwiXG4gICwgXCJzY3JpcHRcIlxuICAsIFwib3Blbm5hbWVzcGFjZVwiXG4gICwgXCJjbG9zZW5hbWVzcGFjZVwiXG4gIF1cblxuZnVuY3Rpb24gU0FYUGFyc2VyIChzdHJpY3QsIG9wdCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU0FYUGFyc2VyKSkgcmV0dXJuIG5ldyBTQVhQYXJzZXIoc3RyaWN0LCBvcHQpXG5cbiAgdmFyIHBhcnNlciA9IHRoaXNcbiAgY2xlYXJCdWZmZXJzKHBhcnNlcilcbiAgcGFyc2VyLnEgPSBwYXJzZXIuYyA9IFwiXCJcbiAgcGFyc2VyLmJ1ZmZlckNoZWNrUG9zaXRpb24gPSBzYXguTUFYX0JVRkZFUl9MRU5HVEhcbiAgcGFyc2VyLm9wdCA9IG9wdCB8fCB7fVxuICBwYXJzZXIub3B0Lmxvd2VyY2FzZSA9IHBhcnNlci5vcHQubG93ZXJjYXNlIHx8IHBhcnNlci5vcHQubG93ZXJjYXNldGFnc1xuICBwYXJzZXIubG9vc2VDYXNlID0gcGFyc2VyLm9wdC5sb3dlcmNhc2UgPyBcInRvTG93ZXJDYXNlXCIgOiBcInRvVXBwZXJDYXNlXCJcbiAgcGFyc2VyLnRhZ3MgPSBbXVxuICBwYXJzZXIuY2xvc2VkID0gcGFyc2VyLmNsb3NlZFJvb3QgPSBwYXJzZXIuc2F3Um9vdCA9IGZhbHNlXG4gIHBhcnNlci50YWcgPSBwYXJzZXIuZXJyb3IgPSBudWxsXG4gIHBhcnNlci5zdHJpY3QgPSAhIXN0cmljdFxuICBwYXJzZXIubm9zY3JpcHQgPSAhIShzdHJpY3QgfHwgcGFyc2VyLm9wdC5ub3NjcmlwdClcbiAgcGFyc2VyLnN0YXRlID0gUy5CRUdJTlxuICBwYXJzZXIuRU5USVRJRVMgPSBPYmplY3QuY3JlYXRlKHNheC5FTlRJVElFUylcbiAgcGFyc2VyLmF0dHJpYkxpc3QgPSBbXVxuXG4gIC8vIG5hbWVzcGFjZXMgZm9ybSBhIHByb3RvdHlwZSBjaGFpbi5cbiAgLy8gaXQgYWx3YXlzIHBvaW50cyBhdCB0aGUgY3VycmVudCB0YWcsXG4gIC8vIHdoaWNoIHByb3RvcyB0byBpdHMgcGFyZW50IHRhZy5cbiAgaWYgKHBhcnNlci5vcHQueG1sbnMpIHBhcnNlci5ucyA9IE9iamVjdC5jcmVhdGUocm9vdE5TKVxuXG4gIC8vIG1vc3RseSBqdXN0IGZvciBlcnJvciByZXBvcnRpbmdcbiAgcGFyc2VyLnRyYWNrUG9zaXRpb24gPSBwYXJzZXIub3B0LnBvc2l0aW9uICE9PSBmYWxzZVxuICBpZiAocGFyc2VyLnRyYWNrUG9zaXRpb24pIHtcbiAgICBwYXJzZXIucG9zaXRpb24gPSBwYXJzZXIubGluZSA9IHBhcnNlci5jb2x1bW4gPSAwXG4gIH1cbiAgZW1pdChwYXJzZXIsIFwib25yZWFkeVwiKVxufVxuXG5pZiAoIU9iamVjdC5jcmVhdGUpIE9iamVjdC5jcmVhdGUgPSBmdW5jdGlvbiAobykge1xuICBmdW5jdGlvbiBmICgpIHsgdGhpcy5fX3Byb3RvX18gPSBvIH1cbiAgZi5wcm90b3R5cGUgPSBvXG4gIHJldHVybiBuZXcgZlxufVxuXG5pZiAoIU9iamVjdC5nZXRQcm90b3R5cGVPZikgT2JqZWN0LmdldFByb3RvdHlwZU9mID0gZnVuY3Rpb24gKG8pIHtcbiAgcmV0dXJuIG8uX19wcm90b19fXG59XG5cbmlmICghT2JqZWN0LmtleXMpIE9iamVjdC5rZXlzID0gZnVuY3Rpb24gKG8pIHtcbiAgdmFyIGEgPSBbXVxuICBmb3IgKHZhciBpIGluIG8pIGlmIChvLmhhc093blByb3BlcnR5KGkpKSBhLnB1c2goaSlcbiAgcmV0dXJuIGFcbn1cblxuZnVuY3Rpb24gY2hlY2tCdWZmZXJMZW5ndGggKHBhcnNlcikge1xuICB2YXIgbWF4QWxsb3dlZCA9IE1hdGgubWF4KHNheC5NQVhfQlVGRkVSX0xFTkdUSCwgMTApXG4gICAgLCBtYXhBY3R1YWwgPSAwXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYnVmZmVycy5sZW5ndGg7IGkgPCBsOyBpICsrKSB7XG4gICAgdmFyIGxlbiA9IHBhcnNlcltidWZmZXJzW2ldXS5sZW5ndGhcbiAgICBpZiAobGVuID4gbWF4QWxsb3dlZCkge1xuICAgICAgLy8gVGV4dC9jZGF0YSBub2RlcyBjYW4gZ2V0IGJpZywgYW5kIHNpbmNlIHRoZXkncmUgYnVmZmVyZWQsXG4gICAgICAvLyB3ZSBjYW4gZ2V0IGhlcmUgdW5kZXIgbm9ybWFsIGNvbmRpdGlvbnMuXG4gICAgICAvLyBBdm9pZCBpc3N1ZXMgYnkgZW1pdHRpbmcgdGhlIHRleHQgbm9kZSBub3csXG4gICAgICAvLyBzbyBhdCBsZWFzdCBpdCB3b24ndCBnZXQgYW55IGJpZ2dlci5cbiAgICAgIHN3aXRjaCAoYnVmZmVyc1tpXSkge1xuICAgICAgICBjYXNlIFwidGV4dE5vZGVcIjpcbiAgICAgICAgICBjbG9zZVRleHQocGFyc2VyKVxuICAgICAgICBicmVha1xuXG4gICAgICAgIGNhc2UgXCJjZGF0YVwiOlxuICAgICAgICAgIGVtaXROb2RlKHBhcnNlciwgXCJvbmNkYXRhXCIsIHBhcnNlci5jZGF0YSlcbiAgICAgICAgICBwYXJzZXIuY2RhdGEgPSBcIlwiXG4gICAgICAgIGJyZWFrXG5cbiAgICAgICAgY2FzZSBcInNjcmlwdFwiOlxuICAgICAgICAgIGVtaXROb2RlKHBhcnNlciwgXCJvbnNjcmlwdFwiLCBwYXJzZXIuc2NyaXB0KVxuICAgICAgICAgIHBhcnNlci5zY3JpcHQgPSBcIlwiXG4gICAgICAgIGJyZWFrXG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBlcnJvcihwYXJzZXIsIFwiTWF4IGJ1ZmZlciBsZW5ndGggZXhjZWVkZWQ6IFwiK2J1ZmZlcnNbaV0pXG4gICAgICB9XG4gICAgfVxuICAgIG1heEFjdHVhbCA9IE1hdGgubWF4KG1heEFjdHVhbCwgbGVuKVxuICB9XG4gIC8vIHNjaGVkdWxlIHRoZSBuZXh0IGNoZWNrIGZvciB0aGUgZWFybGllc3QgcG9zc2libGUgYnVmZmVyIG92ZXJydW4uXG4gIHBhcnNlci5idWZmZXJDaGVja1Bvc2l0aW9uID0gKHNheC5NQVhfQlVGRkVSX0xFTkdUSCAtIG1heEFjdHVhbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKyBwYXJzZXIucG9zaXRpb25cbn1cblxuZnVuY3Rpb24gY2xlYXJCdWZmZXJzIChwYXJzZXIpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBidWZmZXJzLmxlbmd0aDsgaSA8IGw7IGkgKyspIHtcbiAgICBwYXJzZXJbYnVmZmVyc1tpXV0gPSBcIlwiXG4gIH1cbn1cblxuZnVuY3Rpb24gZmx1c2hCdWZmZXJzIChwYXJzZXIpIHtcbiAgY2xvc2VUZXh0KHBhcnNlcilcbiAgaWYgKHBhcnNlci5jZGF0YSAhPT0gXCJcIikge1xuICAgIGVtaXROb2RlKHBhcnNlciwgXCJvbmNkYXRhXCIsIHBhcnNlci5jZGF0YSlcbiAgICBwYXJzZXIuY2RhdGEgPSBcIlwiXG4gIH1cbiAgaWYgKHBhcnNlci5zY3JpcHQgIT09IFwiXCIpIHtcbiAgICBlbWl0Tm9kZShwYXJzZXIsIFwib25zY3JpcHRcIiwgcGFyc2VyLnNjcmlwdClcbiAgICBwYXJzZXIuc2NyaXB0ID0gXCJcIlxuICB9XG59XG5cblNBWFBhcnNlci5wcm90b3R5cGUgPVxuICB7IGVuZDogZnVuY3Rpb24gKCkgeyBlbmQodGhpcykgfVxuICAsIHdyaXRlOiB3cml0ZVxuICAsIHJlc3VtZTogZnVuY3Rpb24gKCkgeyB0aGlzLmVycm9yID0gbnVsbDsgcmV0dXJuIHRoaXMgfVxuICAsIGNsb3NlOiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLndyaXRlKG51bGwpIH1cbiAgLCBmbHVzaDogZnVuY3Rpb24gKCkgeyBmbHVzaEJ1ZmZlcnModGhpcykgfVxuICB9XG5cbnRyeSB7XG4gIHZhciBTdHJlYW0gPSByZXF1aXJlKFwic3RyZWFtXCIpLlN0cmVhbVxufSBjYXRjaCAoZXgpIHtcbiAgdmFyIFN0cmVhbSA9IGZ1bmN0aW9uICgpIHt9XG59XG5cblxudmFyIHN0cmVhbVdyYXBzID0gc2F4LkVWRU5UUy5maWx0ZXIoZnVuY3Rpb24gKGV2KSB7XG4gIHJldHVybiBldiAhPT0gXCJlcnJvclwiICYmIGV2ICE9PSBcImVuZFwiXG59KVxuXG5mdW5jdGlvbiBjcmVhdGVTdHJlYW0gKHN0cmljdCwgb3B0KSB7XG4gIHJldHVybiBuZXcgU0FYU3RyZWFtKHN0cmljdCwgb3B0KVxufVxuXG5mdW5jdGlvbiBTQVhTdHJlYW0gKHN0cmljdCwgb3B0KSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTQVhTdHJlYW0pKSByZXR1cm4gbmV3IFNBWFN0cmVhbShzdHJpY3QsIG9wdClcblxuICBTdHJlYW0uYXBwbHkodGhpcylcblxuICB0aGlzLl9wYXJzZXIgPSBuZXcgU0FYUGFyc2VyKHN0cmljdCwgb3B0KVxuICB0aGlzLndyaXRhYmxlID0gdHJ1ZVxuICB0aGlzLnJlYWRhYmxlID0gdHJ1ZVxuXG5cbiAgdmFyIG1lID0gdGhpc1xuXG4gIHRoaXMuX3BhcnNlci5vbmVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBtZS5lbWl0KFwiZW5kXCIpXG4gIH1cblxuICB0aGlzLl9wYXJzZXIub25lcnJvciA9IGZ1bmN0aW9uIChlcikge1xuICAgIG1lLmVtaXQoXCJlcnJvclwiLCBlcilcblxuICAgIC8vIGlmIGRpZG4ndCB0aHJvdywgdGhlbiBtZWFucyBlcnJvciB3YXMgaGFuZGxlZC5cbiAgICAvLyBnbyBhaGVhZCBhbmQgY2xlYXIgZXJyb3IsIHNvIHdlIGNhbiB3cml0ZSBhZ2Fpbi5cbiAgICBtZS5fcGFyc2VyLmVycm9yID0gbnVsbFxuICB9XG5cbiAgdGhpcy5fZGVjb2RlciA9IG51bGw7XG5cbiAgc3RyZWFtV3JhcHMuZm9yRWFjaChmdW5jdGlvbiAoZXYpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobWUsIFwib25cIiArIGV2LCB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1lLl9wYXJzZXJbXCJvblwiICsgZXZdIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uIChoKSB7XG4gICAgICAgIGlmICghaCkge1xuICAgICAgICAgIG1lLnJlbW92ZUFsbExpc3RlbmVycyhldilcbiAgICAgICAgICByZXR1cm4gbWUuX3BhcnNlcltcIm9uXCIrZXZdID0gaFxuICAgICAgICB9XG4gICAgICAgIG1lLm9uKGV2LCBoKVxuICAgICAgfSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlXG4gICAgfSlcbiAgfSlcbn1cblxuU0FYU3RyZWFtLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU3RyZWFtLnByb3RvdHlwZSxcbiAgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogU0FYU3RyZWFtIH0gfSlcblxuU0FYU3RyZWFtLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gIGlmICh0eXBlb2YgQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gICAgICB0eXBlb2YgQnVmZmVyLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmXG4gICAgICBCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIHtcbiAgICBpZiAoIXRoaXMuX2RlY29kZXIpIHtcbiAgICAgIHZhciBTRCA9IHJlcXVpcmUoJ3N0cmluZ19kZWNvZGVyJykuU3RyaW5nRGVjb2RlclxuICAgICAgdGhpcy5fZGVjb2RlciA9IG5ldyBTRCgndXRmOCcpXG4gICAgfVxuICAgIGRhdGEgPSB0aGlzLl9kZWNvZGVyLndyaXRlKGRhdGEpO1xuICB9XG5cbiAgdGhpcy5fcGFyc2VyLndyaXRlKGRhdGEudG9TdHJpbmcoKSlcbiAgdGhpcy5lbWl0KFwiZGF0YVwiLCBkYXRhKVxuICByZXR1cm4gdHJ1ZVxufVxuXG5TQVhTdHJlYW0ucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIChjaHVuaykge1xuICBpZiAoY2h1bmsgJiYgY2h1bmsubGVuZ3RoKSB0aGlzLndyaXRlKGNodW5rKVxuICB0aGlzLl9wYXJzZXIuZW5kKClcbiAgcmV0dXJuIHRydWVcbn1cblxuU0FYU3RyZWFtLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIChldiwgaGFuZGxlcikge1xuICB2YXIgbWUgPSB0aGlzXG4gIGlmICghbWUuX3BhcnNlcltcIm9uXCIrZXZdICYmIHN0cmVhbVdyYXBzLmluZGV4T2YoZXYpICE9PSAtMSkge1xuICAgIG1lLl9wYXJzZXJbXCJvblwiK2V2XSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IFthcmd1bWVudHNbMF1dXG4gICAgICAgICAgICAgICA6IEFycmF5LmFwcGx5KG51bGwsIGFyZ3VtZW50cylcbiAgICAgIGFyZ3Muc3BsaWNlKDAsIDAsIGV2KVxuICAgICAgbWUuZW1pdC5hcHBseShtZSwgYXJncylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gU3RyZWFtLnByb3RvdHlwZS5vbi5jYWxsKG1lLCBldiwgaGFuZGxlcilcbn1cblxuXG5cbi8vIGNoYXJhY3RlciBjbGFzc2VzIGFuZCB0b2tlbnNcbnZhciB3aGl0ZXNwYWNlID0gXCJcXHJcXG5cXHQgXCJcbiAgLy8gdGhpcyByZWFsbHkgbmVlZHMgdG8gYmUgcmVwbGFjZWQgd2l0aCBjaGFyYWN0ZXIgY2xhc3Nlcy5cbiAgLy8gWE1MIGFsbG93cyBhbGwgbWFubmVyIG9mIHJpZGljdWxvdXMgbnVtYmVycyBhbmQgZGlnaXRzLlxuICAsIG51bWJlciA9IFwiMDEyNDM1Njc4OVwiXG4gICwgbGV0dGVyID0gXCJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaXCJcbiAgLy8gKExldHRlciB8IFwiX1wiIHwgXCI6XCIpXG4gICwgcXVvdGUgPSBcIidcXFwiXCJcbiAgLCBlbnRpdHkgPSBudW1iZXIrbGV0dGVyK1wiI1wiXG4gICwgYXR0cmliRW5kID0gd2hpdGVzcGFjZSArIFwiPlwiXG4gICwgQ0RBVEEgPSBcIltDREFUQVtcIlxuICAsIERPQ1RZUEUgPSBcIkRPQ1RZUEVcIlxuICAsIFhNTF9OQU1FU1BBQ0UgPSBcImh0dHA6Ly93d3cudzMub3JnL1hNTC8xOTk4L25hbWVzcGFjZVwiXG4gICwgWE1MTlNfTkFNRVNQQUNFID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3htbG5zL1wiXG4gICwgcm9vdE5TID0geyB4bWw6IFhNTF9OQU1FU1BBQ0UsIHhtbG5zOiBYTUxOU19OQU1FU1BBQ0UgfVxuXG4vLyB0dXJuIGFsbCB0aGUgc3RyaW5nIGNoYXJhY3RlciBzZXRzIGludG8gY2hhcmFjdGVyIGNsYXNzIG9iamVjdHMuXG53aGl0ZXNwYWNlID0gY2hhckNsYXNzKHdoaXRlc3BhY2UpXG5udW1iZXIgPSBjaGFyQ2xhc3MobnVtYmVyKVxubGV0dGVyID0gY2hhckNsYXNzKGxldHRlcilcblxuLy8gaHR0cDovL3d3dy53My5vcmcvVFIvUkVDLXhtbC8jTlQtTmFtZVN0YXJ0Q2hhclxuLy8gVGhpcyBpbXBsZW1lbnRhdGlvbiB3b3JrcyBvbiBzdHJpbmdzLCBhIHNpbmdsZSBjaGFyYWN0ZXIgYXQgYSB0aW1lXG4vLyBhcyBzdWNoLCBpdCBjYW5ub3QgZXZlciBzdXBwb3J0IGFzdHJhbC1wbGFuZSBjaGFyYWN0ZXJzICgxMDAwMC1FRkZGRilcbi8vIHdpdGhvdXQgYSBzaWduaWZpY2FudCBicmVha2luZyBjaGFuZ2UgdG8gZWl0aGVyIHRoaXMgIHBhcnNlciwgb3IgdGhlXG4vLyBKYXZhU2NyaXB0IGxhbmd1YWdlLiAgSW1wbGVtZW50YXRpb24gb2YgYW4gZW1vamktY2FwYWJsZSB4bWwgcGFyc2VyXG4vLyBpcyBsZWZ0IGFzIGFuIGV4ZXJjaXNlIGZvciB0aGUgcmVhZGVyLlxudmFyIG5hbWVTdGFydCA9IC9bOl9BLVphLXpcXHUwMEMwLVxcdTAwRDZcXHUwMEQ4LVxcdTAwRjZcXHUwMEY4LVxcdTAyRkZcXHUwMzcwLVxcdTAzN0RcXHUwMzdGLVxcdTFGRkZcXHUyMDBDLVxcdTIwMERcXHUyMDcwLVxcdTIxOEZcXHUyQzAwLVxcdTJGRUZcXHUzMDAxLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRkRdL1xuXG52YXIgbmFtZUJvZHkgPSAvWzpfQS1aYS16XFx1MDBDMC1cXHUwMEQ2XFx1MDBEOC1cXHUwMEY2XFx1MDBGOC1cXHUwMkZGXFx1MDM3MC1cXHUwMzdEXFx1MDM3Ri1cXHUxRkZGXFx1MjAwQy1cXHUyMDBEXFx1MjA3MC1cXHUyMThGXFx1MkMwMC1cXHUyRkVGXFx1MzAwMS1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkZEXFx1MDBCN1xcdTAzMDAtXFx1MDM2RlxcdTIwM0YtXFx1MjA0MFxcLlxcZC1dL1xuXG5xdW90ZSA9IGNoYXJDbGFzcyhxdW90ZSlcbmVudGl0eSA9IGNoYXJDbGFzcyhlbnRpdHkpXG5hdHRyaWJFbmQgPSBjaGFyQ2xhc3MoYXR0cmliRW5kKVxuXG5mdW5jdGlvbiBjaGFyQ2xhc3MgKHN0cikge1xuICByZXR1cm4gc3RyLnNwbGl0KFwiXCIpLnJlZHVjZShmdW5jdGlvbiAocywgYykge1xuICAgIHNbY10gPSB0cnVlXG4gICAgcmV0dXJuIHNcbiAgfSwge30pXG59XG5cbmZ1bmN0aW9uIGlzUmVnRXhwIChjKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYykgPT09ICdbb2JqZWN0IFJlZ0V4cF0nXG59XG5cbmZ1bmN0aW9uIGlzIChjaGFyY2xhc3MsIGMpIHtcbiAgcmV0dXJuIGlzUmVnRXhwKGNoYXJjbGFzcykgPyAhIWMubWF0Y2goY2hhcmNsYXNzKSA6IGNoYXJjbGFzc1tjXVxufVxuXG5mdW5jdGlvbiBub3QgKGNoYXJjbGFzcywgYykge1xuICByZXR1cm4gIWlzKGNoYXJjbGFzcywgYylcbn1cblxudmFyIFMgPSAwXG5zYXguU1RBVEUgPVxueyBCRUdJTiAgICAgICAgICAgICAgICAgICAgIDogUysrXG4sIFRFWFQgICAgICAgICAgICAgICAgICAgICAgOiBTKysgLy8gZ2VuZXJhbCBzdHVmZlxuLCBURVhUX0VOVElUWSAgICAgICAgICAgICAgIDogUysrIC8vICZhbXAgYW5kIHN1Y2guXG4sIE9QRU5fV0FLQSAgICAgICAgICAgICAgICAgOiBTKysgLy8gPFxuLCBTR01MX0RFQ0wgICAgICAgICAgICAgICAgIDogUysrIC8vIDwhQkxBUkdcbiwgU0dNTF9ERUNMX1FVT1RFRCAgICAgICAgICA6IFMrKyAvLyA8IUJMQVJHIGZvbyBcImJhclxuLCBET0NUWVBFICAgICAgICAgICAgICAgICAgIDogUysrIC8vIDwhRE9DVFlQRVxuLCBET0NUWVBFX1FVT1RFRCAgICAgICAgICAgIDogUysrIC8vIDwhRE9DVFlQRSBcIi8vYmxhaFxuLCBET0NUWVBFX0RURCAgICAgICAgICAgICAgIDogUysrIC8vIDwhRE9DVFlQRSBcIi8vYmxhaFwiIFsgLi4uXG4sIERPQ1RZUEVfRFREX1FVT1RFRCAgICAgICAgOiBTKysgLy8gPCFET0NUWVBFIFwiLy9ibGFoXCIgWyBcImZvb1xuLCBDT01NRU5UX1NUQVJUSU5HICAgICAgICAgIDogUysrIC8vIDwhLVxuLCBDT01NRU5UICAgICAgICAgICAgICAgICAgIDogUysrIC8vIDwhLS1cbiwgQ09NTUVOVF9FTkRJTkcgICAgICAgICAgICA6IFMrKyAvLyA8IS0tIGJsYWggLVxuLCBDT01NRU5UX0VOREVEICAgICAgICAgICAgIDogUysrIC8vIDwhLS0gYmxhaCAtLVxuLCBDREFUQSAgICAgICAgICAgICAgICAgICAgIDogUysrIC8vIDwhW0NEQVRBWyBzb21ldGhpbmdcbiwgQ0RBVEFfRU5ESU5HICAgICAgICAgICAgICA6IFMrKyAvLyBdXG4sIENEQVRBX0VORElOR18yICAgICAgICAgICAgOiBTKysgLy8gXV1cbiwgUFJPQ19JTlNUICAgICAgICAgICAgICAgICA6IFMrKyAvLyA8P2hpXG4sIFBST0NfSU5TVF9CT0RZICAgICAgICAgICAgOiBTKysgLy8gPD9oaSB0aGVyZVxuLCBQUk9DX0lOU1RfRU5ESU5HICAgICAgICAgIDogUysrIC8vIDw/aGkgXCJ0aGVyZVwiID9cbiwgT1BFTl9UQUcgICAgICAgICAgICAgICAgICA6IFMrKyAvLyA8c3Ryb25nXG4sIE9QRU5fVEFHX1NMQVNIICAgICAgICAgICAgOiBTKysgLy8gPHN0cm9uZyAvXG4sIEFUVFJJQiAgICAgICAgICAgICAgICAgICAgOiBTKysgLy8gPGFcbiwgQVRUUklCX05BTUUgICAgICAgICAgICAgICA6IFMrKyAvLyA8YSBmb29cbiwgQVRUUklCX05BTUVfU0FXX1dISVRFICAgICA6IFMrKyAvLyA8YSBmb28gX1xuLCBBVFRSSUJfVkFMVUUgICAgICAgICAgICAgIDogUysrIC8vIDxhIGZvbz1cbiwgQVRUUklCX1ZBTFVFX1FVT1RFRCAgICAgICA6IFMrKyAvLyA8YSBmb289XCJiYXJcbiwgQVRUUklCX1ZBTFVFX0NMT1NFRCAgICAgICA6IFMrKyAvLyA8YSBmb289XCJiYXJcIlxuLCBBVFRSSUJfVkFMVUVfVU5RVU9URUQgICAgIDogUysrIC8vIDxhIGZvbz1iYXJcbiwgQVRUUklCX1ZBTFVFX0VOVElUWV9RICAgICA6IFMrKyAvLyA8Zm9vIGJhcj1cIiZxdW90O1wiXG4sIEFUVFJJQl9WQUxVRV9FTlRJVFlfVSAgICAgOiBTKysgLy8gPGZvbyBiYXI9JnF1b3Q7XG4sIENMT1NFX1RBRyAgICAgICAgICAgICAgICAgOiBTKysgLy8gPC9hXG4sIENMT1NFX1RBR19TQVdfV0hJVEUgICAgICAgOiBTKysgLy8gPC9hICAgPlxuLCBTQ1JJUFQgICAgICAgICAgICAgICAgICAgIDogUysrIC8vIDxzY3JpcHQ+IC4uLlxuLCBTQ1JJUFRfRU5ESU5HICAgICAgICAgICAgIDogUysrIC8vIDxzY3JpcHQ+IC4uLiA8XG59XG5cbnNheC5FTlRJVElFUyA9XG57IFwiYW1wXCIgOiBcIiZcIlxuLCBcImd0XCIgOiBcIj5cIlxuLCBcImx0XCIgOiBcIjxcIlxuLCBcInF1b3RcIiA6IFwiXFxcIlwiXG4sIFwiYXBvc1wiIDogXCInXCJcbiwgXCJBRWxpZ1wiIDogMTk4XG4sIFwiQWFjdXRlXCIgOiAxOTNcbiwgXCJBY2lyY1wiIDogMTk0XG4sIFwiQWdyYXZlXCIgOiAxOTJcbiwgXCJBcmluZ1wiIDogMTk3XG4sIFwiQXRpbGRlXCIgOiAxOTVcbiwgXCJBdW1sXCIgOiAxOTZcbiwgXCJDY2VkaWxcIiA6IDE5OVxuLCBcIkVUSFwiIDogMjA4XG4sIFwiRWFjdXRlXCIgOiAyMDFcbiwgXCJFY2lyY1wiIDogMjAyXG4sIFwiRWdyYXZlXCIgOiAyMDBcbiwgXCJFdW1sXCIgOiAyMDNcbiwgXCJJYWN1dGVcIiA6IDIwNVxuLCBcIkljaXJjXCIgOiAyMDZcbiwgXCJJZ3JhdmVcIiA6IDIwNFxuLCBcIkl1bWxcIiA6IDIwN1xuLCBcIk50aWxkZVwiIDogMjA5XG4sIFwiT2FjdXRlXCIgOiAyMTFcbiwgXCJPY2lyY1wiIDogMjEyXG4sIFwiT2dyYXZlXCIgOiAyMTBcbiwgXCJPc2xhc2hcIiA6IDIxNlxuLCBcIk90aWxkZVwiIDogMjEzXG4sIFwiT3VtbFwiIDogMjE0XG4sIFwiVEhPUk5cIiA6IDIyMlxuLCBcIlVhY3V0ZVwiIDogMjE4XG4sIFwiVWNpcmNcIiA6IDIxOVxuLCBcIlVncmF2ZVwiIDogMjE3XG4sIFwiVXVtbFwiIDogMjIwXG4sIFwiWWFjdXRlXCIgOiAyMjFcbiwgXCJhYWN1dGVcIiA6IDIyNVxuLCBcImFjaXJjXCIgOiAyMjZcbiwgXCJhZWxpZ1wiIDogMjMwXG4sIFwiYWdyYXZlXCIgOiAyMjRcbiwgXCJhcmluZ1wiIDogMjI5XG4sIFwiYXRpbGRlXCIgOiAyMjdcbiwgXCJhdW1sXCIgOiAyMjhcbiwgXCJjY2VkaWxcIiA6IDIzMVxuLCBcImVhY3V0ZVwiIDogMjMzXG4sIFwiZWNpcmNcIiA6IDIzNFxuLCBcImVncmF2ZVwiIDogMjMyXG4sIFwiZXRoXCIgOiAyNDBcbiwgXCJldW1sXCIgOiAyMzVcbiwgXCJpYWN1dGVcIiA6IDIzN1xuLCBcImljaXJjXCIgOiAyMzhcbiwgXCJpZ3JhdmVcIiA6IDIzNlxuLCBcIml1bWxcIiA6IDIzOVxuLCBcIm50aWxkZVwiIDogMjQxXG4sIFwib2FjdXRlXCIgOiAyNDNcbiwgXCJvY2lyY1wiIDogMjQ0XG4sIFwib2dyYXZlXCIgOiAyNDJcbiwgXCJvc2xhc2hcIiA6IDI0OFxuLCBcIm90aWxkZVwiIDogMjQ1XG4sIFwib3VtbFwiIDogMjQ2XG4sIFwic3psaWdcIiA6IDIyM1xuLCBcInRob3JuXCIgOiAyNTRcbiwgXCJ1YWN1dGVcIiA6IDI1MFxuLCBcInVjaXJjXCIgOiAyNTFcbiwgXCJ1Z3JhdmVcIiA6IDI0OVxuLCBcInV1bWxcIiA6IDI1MlxuLCBcInlhY3V0ZVwiIDogMjUzXG4sIFwieXVtbFwiIDogMjU1XG4sIFwiY29weVwiIDogMTY5XG4sIFwicmVnXCIgOiAxNzRcbiwgXCJuYnNwXCIgOiAxNjBcbiwgXCJpZXhjbFwiIDogMTYxXG4sIFwiY2VudFwiIDogMTYyXG4sIFwicG91bmRcIiA6IDE2M1xuLCBcImN1cnJlblwiIDogMTY0XG4sIFwieWVuXCIgOiAxNjVcbiwgXCJicnZiYXJcIiA6IDE2NlxuLCBcInNlY3RcIiA6IDE2N1xuLCBcInVtbFwiIDogMTY4XG4sIFwib3JkZlwiIDogMTcwXG4sIFwibGFxdW9cIiA6IDE3MVxuLCBcIm5vdFwiIDogMTcyXG4sIFwic2h5XCIgOiAxNzNcbiwgXCJtYWNyXCIgOiAxNzVcbiwgXCJkZWdcIiA6IDE3NlxuLCBcInBsdXNtblwiIDogMTc3XG4sIFwic3VwMVwiIDogMTg1XG4sIFwic3VwMlwiIDogMTc4XG4sIFwic3VwM1wiIDogMTc5XG4sIFwiYWN1dGVcIiA6IDE4MFxuLCBcIm1pY3JvXCIgOiAxODFcbiwgXCJwYXJhXCIgOiAxODJcbiwgXCJtaWRkb3RcIiA6IDE4M1xuLCBcImNlZGlsXCIgOiAxODRcbiwgXCJvcmRtXCIgOiAxODZcbiwgXCJyYXF1b1wiIDogMTg3XG4sIFwiZnJhYzE0XCIgOiAxODhcbiwgXCJmcmFjMTJcIiA6IDE4OVxuLCBcImZyYWMzNFwiIDogMTkwXG4sIFwiaXF1ZXN0XCIgOiAxOTFcbiwgXCJ0aW1lc1wiIDogMjE1XG4sIFwiZGl2aWRlXCIgOiAyNDdcbiwgXCJPRWxpZ1wiIDogMzM4XG4sIFwib2VsaWdcIiA6IDMzOVxuLCBcIlNjYXJvblwiIDogMzUyXG4sIFwic2Nhcm9uXCIgOiAzNTNcbiwgXCJZdW1sXCIgOiAzNzZcbiwgXCJmbm9mXCIgOiA0MDJcbiwgXCJjaXJjXCIgOiA3MTBcbiwgXCJ0aWxkZVwiIDogNzMyXG4sIFwiQWxwaGFcIiA6IDkxM1xuLCBcIkJldGFcIiA6IDkxNFxuLCBcIkdhbW1hXCIgOiA5MTVcbiwgXCJEZWx0YVwiIDogOTE2XG4sIFwiRXBzaWxvblwiIDogOTE3XG4sIFwiWmV0YVwiIDogOTE4XG4sIFwiRXRhXCIgOiA5MTlcbiwgXCJUaGV0YVwiIDogOTIwXG4sIFwiSW90YVwiIDogOTIxXG4sIFwiS2FwcGFcIiA6IDkyMlxuLCBcIkxhbWJkYVwiIDogOTIzXG4sIFwiTXVcIiA6IDkyNFxuLCBcIk51XCIgOiA5MjVcbiwgXCJYaVwiIDogOTI2XG4sIFwiT21pY3JvblwiIDogOTI3XG4sIFwiUGlcIiA6IDkyOFxuLCBcIlJob1wiIDogOTI5XG4sIFwiU2lnbWFcIiA6IDkzMVxuLCBcIlRhdVwiIDogOTMyXG4sIFwiVXBzaWxvblwiIDogOTMzXG4sIFwiUGhpXCIgOiA5MzRcbiwgXCJDaGlcIiA6IDkzNVxuLCBcIlBzaVwiIDogOTM2XG4sIFwiT21lZ2FcIiA6IDkzN1xuLCBcImFscGhhXCIgOiA5NDVcbiwgXCJiZXRhXCIgOiA5NDZcbiwgXCJnYW1tYVwiIDogOTQ3XG4sIFwiZGVsdGFcIiA6IDk0OFxuLCBcImVwc2lsb25cIiA6IDk0OVxuLCBcInpldGFcIiA6IDk1MFxuLCBcImV0YVwiIDogOTUxXG4sIFwidGhldGFcIiA6IDk1MlxuLCBcImlvdGFcIiA6IDk1M1xuLCBcImthcHBhXCIgOiA5NTRcbiwgXCJsYW1iZGFcIiA6IDk1NVxuLCBcIm11XCIgOiA5NTZcbiwgXCJudVwiIDogOTU3XG4sIFwieGlcIiA6IDk1OFxuLCBcIm9taWNyb25cIiA6IDk1OVxuLCBcInBpXCIgOiA5NjBcbiwgXCJyaG9cIiA6IDk2MVxuLCBcInNpZ21hZlwiIDogOTYyXG4sIFwic2lnbWFcIiA6IDk2M1xuLCBcInRhdVwiIDogOTY0XG4sIFwidXBzaWxvblwiIDogOTY1XG4sIFwicGhpXCIgOiA5NjZcbiwgXCJjaGlcIiA6IDk2N1xuLCBcInBzaVwiIDogOTY4XG4sIFwib21lZ2FcIiA6IDk2OVxuLCBcInRoZXRhc3ltXCIgOiA5NzdcbiwgXCJ1cHNpaFwiIDogOTc4XG4sIFwicGl2XCIgOiA5ODJcbiwgXCJlbnNwXCIgOiA4MTk0XG4sIFwiZW1zcFwiIDogODE5NVxuLCBcInRoaW5zcFwiIDogODIwMVxuLCBcInp3bmpcIiA6IDgyMDRcbiwgXCJ6d2pcIiA6IDgyMDVcbiwgXCJscm1cIiA6IDgyMDZcbiwgXCJybG1cIiA6IDgyMDdcbiwgXCJuZGFzaFwiIDogODIxMVxuLCBcIm1kYXNoXCIgOiA4MjEyXG4sIFwibHNxdW9cIiA6IDgyMTZcbiwgXCJyc3F1b1wiIDogODIxN1xuLCBcInNicXVvXCIgOiA4MjE4XG4sIFwibGRxdW9cIiA6IDgyMjBcbiwgXCJyZHF1b1wiIDogODIyMVxuLCBcImJkcXVvXCIgOiA4MjIyXG4sIFwiZGFnZ2VyXCIgOiA4MjI0XG4sIFwiRGFnZ2VyXCIgOiA4MjI1XG4sIFwiYnVsbFwiIDogODIyNlxuLCBcImhlbGxpcFwiIDogODIzMFxuLCBcInBlcm1pbFwiIDogODI0MFxuLCBcInByaW1lXCIgOiA4MjQyXG4sIFwiUHJpbWVcIiA6IDgyNDNcbiwgXCJsc2FxdW9cIiA6IDgyNDlcbiwgXCJyc2FxdW9cIiA6IDgyNTBcbiwgXCJvbGluZVwiIDogODI1NFxuLCBcImZyYXNsXCIgOiA4MjYwXG4sIFwiZXVyb1wiIDogODM2NFxuLCBcImltYWdlXCIgOiA4NDY1XG4sIFwid2VpZXJwXCIgOiA4NDcyXG4sIFwicmVhbFwiIDogODQ3NlxuLCBcInRyYWRlXCIgOiA4NDgyXG4sIFwiYWxlZnN5bVwiIDogODUwMVxuLCBcImxhcnJcIiA6IDg1OTJcbiwgXCJ1YXJyXCIgOiA4NTkzXG4sIFwicmFyclwiIDogODU5NFxuLCBcImRhcnJcIiA6IDg1OTVcbiwgXCJoYXJyXCIgOiA4NTk2XG4sIFwiY3JhcnJcIiA6IDg2MjlcbiwgXCJsQXJyXCIgOiA4NjU2XG4sIFwidUFyclwiIDogODY1N1xuLCBcInJBcnJcIiA6IDg2NThcbiwgXCJkQXJyXCIgOiA4NjU5XG4sIFwiaEFyclwiIDogODY2MFxuLCBcImZvcmFsbFwiIDogODcwNFxuLCBcInBhcnRcIiA6IDg3MDZcbiwgXCJleGlzdFwiIDogODcwN1xuLCBcImVtcHR5XCIgOiA4NzA5XG4sIFwibmFibGFcIiA6IDg3MTFcbiwgXCJpc2luXCIgOiA4NzEyXG4sIFwibm90aW5cIiA6IDg3MTNcbiwgXCJuaVwiIDogODcxNVxuLCBcInByb2RcIiA6IDg3MTlcbiwgXCJzdW1cIiA6IDg3MjFcbiwgXCJtaW51c1wiIDogODcyMlxuLCBcImxvd2FzdFwiIDogODcyN1xuLCBcInJhZGljXCIgOiA4NzMwXG4sIFwicHJvcFwiIDogODczM1xuLCBcImluZmluXCIgOiA4NzM0XG4sIFwiYW5nXCIgOiA4NzM2XG4sIFwiYW5kXCIgOiA4NzQzXG4sIFwib3JcIiA6IDg3NDRcbiwgXCJjYXBcIiA6IDg3NDVcbiwgXCJjdXBcIiA6IDg3NDZcbiwgXCJpbnRcIiA6IDg3NDdcbiwgXCJ0aGVyZTRcIiA6IDg3NTZcbiwgXCJzaW1cIiA6IDg3NjRcbiwgXCJjb25nXCIgOiA4NzczXG4sIFwiYXN5bXBcIiA6IDg3NzZcbiwgXCJuZVwiIDogODgwMFxuLCBcImVxdWl2XCIgOiA4ODAxXG4sIFwibGVcIiA6IDg4MDRcbiwgXCJnZVwiIDogODgwNVxuLCBcInN1YlwiIDogODgzNFxuLCBcInN1cFwiIDogODgzNVxuLCBcIm5zdWJcIiA6IDg4MzZcbiwgXCJzdWJlXCIgOiA4ODM4XG4sIFwic3VwZVwiIDogODgzOVxuLCBcIm9wbHVzXCIgOiA4ODUzXG4sIFwib3RpbWVzXCIgOiA4ODU1XG4sIFwicGVycFwiIDogODg2OVxuLCBcInNkb3RcIiA6IDg5MDFcbiwgXCJsY2VpbFwiIDogODk2OFxuLCBcInJjZWlsXCIgOiA4OTY5XG4sIFwibGZsb29yXCIgOiA4OTcwXG4sIFwicmZsb29yXCIgOiA4OTcxXG4sIFwibGFuZ1wiIDogOTAwMVxuLCBcInJhbmdcIiA6IDkwMDJcbiwgXCJsb3pcIiA6IDk2NzRcbiwgXCJzcGFkZXNcIiA6IDk4MjRcbiwgXCJjbHVic1wiIDogOTgyN1xuLCBcImhlYXJ0c1wiIDogOTgyOVxuLCBcImRpYW1zXCIgOiA5ODMwXG59XG5cbk9iamVjdC5rZXlzKHNheC5FTlRJVElFUykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIGUgPSBzYXguRU5USVRJRVNba2V5XVxuICAgIHZhciBzID0gdHlwZW9mIGUgPT09ICdudW1iZXInID8gU3RyaW5nLmZyb21DaGFyQ29kZShlKSA6IGVcbiAgICBzYXguRU5USVRJRVNba2V5XSA9IHNcbn0pXG5cbmZvciAodmFyIFMgaW4gc2F4LlNUQVRFKSBzYXguU1RBVEVbc2F4LlNUQVRFW1NdXSA9IFNcblxuLy8gc2hvcnRoYW5kXG5TID0gc2F4LlNUQVRFXG5cbmZ1bmN0aW9uIGVtaXQgKHBhcnNlciwgZXZlbnQsIGRhdGEpIHtcbiAgcGFyc2VyW2V2ZW50XSAmJiBwYXJzZXJbZXZlbnRdKGRhdGEpXG59XG5cbmZ1bmN0aW9uIGVtaXROb2RlIChwYXJzZXIsIG5vZGVUeXBlLCBkYXRhKSB7XG4gIGlmIChwYXJzZXIudGV4dE5vZGUpIGNsb3NlVGV4dChwYXJzZXIpXG4gIGVtaXQocGFyc2VyLCBub2RlVHlwZSwgZGF0YSlcbn1cblxuZnVuY3Rpb24gY2xvc2VUZXh0IChwYXJzZXIpIHtcbiAgcGFyc2VyLnRleHROb2RlID0gdGV4dG9wdHMocGFyc2VyLm9wdCwgcGFyc2VyLnRleHROb2RlKVxuICBpZiAocGFyc2VyLnRleHROb2RlKSBlbWl0KHBhcnNlciwgXCJvbnRleHRcIiwgcGFyc2VyLnRleHROb2RlKVxuICBwYXJzZXIudGV4dE5vZGUgPSBcIlwiXG59XG5cbmZ1bmN0aW9uIHRleHRvcHRzIChvcHQsIHRleHQpIHtcbiAgaWYgKG9wdC50cmltKSB0ZXh0ID0gdGV4dC50cmltKClcbiAgaWYgKG9wdC5ub3JtYWxpemUpIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xccysvZywgXCIgXCIpXG4gIHJldHVybiB0ZXh0XG59XG5cbmZ1bmN0aW9uIGVycm9yIChwYXJzZXIsIGVyKSB7XG4gIGNsb3NlVGV4dChwYXJzZXIpXG4gIGlmIChwYXJzZXIudHJhY2tQb3NpdGlvbikge1xuICAgIGVyICs9IFwiXFxuTGluZTogXCIrcGFyc2VyLmxpbmUrXG4gICAgICAgICAgXCJcXG5Db2x1bW46IFwiK3BhcnNlci5jb2x1bW4rXG4gICAgICAgICAgXCJcXG5DaGFyOiBcIitwYXJzZXIuY1xuICB9XG4gIGVyID0gbmV3IEVycm9yKGVyKVxuICBwYXJzZXIuZXJyb3IgPSBlclxuICBlbWl0KHBhcnNlciwgXCJvbmVycm9yXCIsIGVyKVxuICByZXR1cm4gcGFyc2VyXG59XG5cbmZ1bmN0aW9uIGVuZCAocGFyc2VyKSB7XG4gIGlmICghcGFyc2VyLmNsb3NlZFJvb3QpIHN0cmljdEZhaWwocGFyc2VyLCBcIlVuY2xvc2VkIHJvb3QgdGFnXCIpXG4gIGlmICgocGFyc2VyLnN0YXRlICE9PSBTLkJFR0lOKSAmJiAocGFyc2VyLnN0YXRlICE9PSBTLlRFWFQpKSBlcnJvcihwYXJzZXIsIFwiVW5leHBlY3RlZCBlbmRcIilcbiAgY2xvc2VUZXh0KHBhcnNlcilcbiAgcGFyc2VyLmMgPSBcIlwiXG4gIHBhcnNlci5jbG9zZWQgPSB0cnVlXG4gIGVtaXQocGFyc2VyLCBcIm9uZW5kXCIpXG4gIFNBWFBhcnNlci5jYWxsKHBhcnNlciwgcGFyc2VyLnN0cmljdCwgcGFyc2VyLm9wdClcbiAgcmV0dXJuIHBhcnNlclxufVxuXG5mdW5jdGlvbiBzdHJpY3RGYWlsIChwYXJzZXIsIG1lc3NhZ2UpIHtcbiAgaWYgKHR5cGVvZiBwYXJzZXIgIT09ICdvYmplY3QnIHx8ICEocGFyc2VyIGluc3RhbmNlb2YgU0FYUGFyc2VyKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBjYWxsIHRvIHN0cmljdEZhaWwnKTtcbiAgaWYgKHBhcnNlci5zdHJpY3QpIGVycm9yKHBhcnNlciwgbWVzc2FnZSlcbn1cblxuZnVuY3Rpb24gbmV3VGFnIChwYXJzZXIpIHtcbiAgaWYgKCFwYXJzZXIuc3RyaWN0KSBwYXJzZXIudGFnTmFtZSA9IHBhcnNlci50YWdOYW1lW3BhcnNlci5sb29zZUNhc2VdKClcbiAgdmFyIHBhcmVudCA9IHBhcnNlci50YWdzW3BhcnNlci50YWdzLmxlbmd0aCAtIDFdIHx8IHBhcnNlclxuICAgICwgdGFnID0gcGFyc2VyLnRhZyA9IHsgbmFtZSA6IHBhcnNlci50YWdOYW1lLCBhdHRyaWJ1dGVzIDoge30gfVxuXG4gIC8vIHdpbGwgYmUgb3ZlcnJpZGRlbiBpZiB0YWcgY29udGFpbHMgYW4geG1sbnM9XCJmb29cIiBvciB4bWxuczpmb289XCJiYXJcIlxuICBpZiAocGFyc2VyLm9wdC54bWxucykgdGFnLm5zID0gcGFyZW50Lm5zXG4gIHBhcnNlci5hdHRyaWJMaXN0Lmxlbmd0aCA9IDBcbn1cblxuZnVuY3Rpb24gcW5hbWUgKG5hbWUsIGF0dHJpYnV0ZSkge1xuICB2YXIgaSA9IG5hbWUuaW5kZXhPZihcIjpcIilcbiAgICAsIHF1YWxOYW1lID0gaSA8IDAgPyBbIFwiXCIsIG5hbWUgXSA6IG5hbWUuc3BsaXQoXCI6XCIpXG4gICAgLCBwcmVmaXggPSBxdWFsTmFtZVswXVxuICAgICwgbG9jYWwgPSBxdWFsTmFtZVsxXVxuXG4gIC8vIDx4IFwieG1sbnNcIj1cImh0dHA6Ly9mb29cIj5cbiAgaWYgKGF0dHJpYnV0ZSAmJiBuYW1lID09PSBcInhtbG5zXCIpIHtcbiAgICBwcmVmaXggPSBcInhtbG5zXCJcbiAgICBsb2NhbCA9IFwiXCJcbiAgfVxuXG4gIHJldHVybiB7IHByZWZpeDogcHJlZml4LCBsb2NhbDogbG9jYWwgfVxufVxuXG5mdW5jdGlvbiBhdHRyaWIgKHBhcnNlcikge1xuICBpZiAoIXBhcnNlci5zdHJpY3QpIHBhcnNlci5hdHRyaWJOYW1lID0gcGFyc2VyLmF0dHJpYk5hbWVbcGFyc2VyLmxvb3NlQ2FzZV0oKVxuXG4gIGlmIChwYXJzZXIuYXR0cmliTGlzdC5pbmRleE9mKHBhcnNlci5hdHRyaWJOYW1lKSAhPT0gLTEgfHxcbiAgICAgIHBhcnNlci50YWcuYXR0cmlidXRlcy5oYXNPd25Qcm9wZXJ0eShwYXJzZXIuYXR0cmliTmFtZSkpIHtcbiAgICByZXR1cm4gcGFyc2VyLmF0dHJpYk5hbWUgPSBwYXJzZXIuYXR0cmliVmFsdWUgPSBcIlwiXG4gIH1cblxuICBpZiAocGFyc2VyLm9wdC54bWxucykge1xuICAgIHZhciBxbiA9IHFuYW1lKHBhcnNlci5hdHRyaWJOYW1lLCB0cnVlKVxuICAgICAgLCBwcmVmaXggPSBxbi5wcmVmaXhcbiAgICAgICwgbG9jYWwgPSBxbi5sb2NhbFxuXG4gICAgaWYgKHByZWZpeCA9PT0gXCJ4bWxuc1wiKSB7XG4gICAgICAvLyBuYW1lc3BhY2UgYmluZGluZyBhdHRyaWJ1dGU7IHB1c2ggdGhlIGJpbmRpbmcgaW50byBzY29wZVxuICAgICAgaWYgKGxvY2FsID09PSBcInhtbFwiICYmIHBhcnNlci5hdHRyaWJWYWx1ZSAhPT0gWE1MX05BTUVTUEFDRSkge1xuICAgICAgICBzdHJpY3RGYWlsKCBwYXJzZXJcbiAgICAgICAgICAgICAgICAgICwgXCJ4bWw6IHByZWZpeCBtdXN0IGJlIGJvdW5kIHRvIFwiICsgWE1MX05BTUVTUEFDRSArIFwiXFxuXCJcbiAgICAgICAgICAgICAgICAgICsgXCJBY3R1YWw6IFwiICsgcGFyc2VyLmF0dHJpYlZhbHVlIClcbiAgICAgIH0gZWxzZSBpZiAobG9jYWwgPT09IFwieG1sbnNcIiAmJiBwYXJzZXIuYXR0cmliVmFsdWUgIT09IFhNTE5TX05BTUVTUEFDRSkge1xuICAgICAgICBzdHJpY3RGYWlsKCBwYXJzZXJcbiAgICAgICAgICAgICAgICAgICwgXCJ4bWxuczogcHJlZml4IG11c3QgYmUgYm91bmQgdG8gXCIgKyBYTUxOU19OQU1FU1BBQ0UgKyBcIlxcblwiXG4gICAgICAgICAgICAgICAgICArIFwiQWN0dWFsOiBcIiArIHBhcnNlci5hdHRyaWJWYWx1ZSApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGFnID0gcGFyc2VyLnRhZ1xuICAgICAgICAgICwgcGFyZW50ID0gcGFyc2VyLnRhZ3NbcGFyc2VyLnRhZ3MubGVuZ3RoIC0gMV0gfHwgcGFyc2VyXG4gICAgICAgIGlmICh0YWcubnMgPT09IHBhcmVudC5ucykge1xuICAgICAgICAgIHRhZy5ucyA9IE9iamVjdC5jcmVhdGUocGFyZW50Lm5zKVxuICAgICAgICB9XG4gICAgICAgIHRhZy5uc1tsb2NhbF0gPSBwYXJzZXIuYXR0cmliVmFsdWVcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkZWZlciBvbmF0dHJpYnV0ZSBldmVudHMgdW50aWwgYWxsIGF0dHJpYnV0ZXMgaGF2ZSBiZWVuIHNlZW5cbiAgICAvLyBzbyBhbnkgbmV3IGJpbmRpbmdzIGNhbiB0YWtlIGVmZmVjdDsgcHJlc2VydmUgYXR0cmlidXRlIG9yZGVyXG4gICAgLy8gc28gZGVmZXJyZWQgZXZlbnRzIGNhbiBiZSBlbWl0dGVkIGluIGRvY3VtZW50IG9yZGVyXG4gICAgcGFyc2VyLmF0dHJpYkxpc3QucHVzaChbcGFyc2VyLmF0dHJpYk5hbWUsIHBhcnNlci5hdHRyaWJWYWx1ZV0pXG4gIH0gZWxzZSB7XG4gICAgLy8gaW4gbm9uLXhtbG5zIG1vZGUsIHdlIGNhbiBlbWl0IHRoZSBldmVudCByaWdodCBhd2F5XG4gICAgcGFyc2VyLnRhZy5hdHRyaWJ1dGVzW3BhcnNlci5hdHRyaWJOYW1lXSA9IHBhcnNlci5hdHRyaWJWYWx1ZVxuICAgIGVtaXROb2RlKCBwYXJzZXJcbiAgICAgICAgICAgICwgXCJvbmF0dHJpYnV0ZVwiXG4gICAgICAgICAgICAsIHsgbmFtZTogcGFyc2VyLmF0dHJpYk5hbWVcbiAgICAgICAgICAgICAgLCB2YWx1ZTogcGFyc2VyLmF0dHJpYlZhbHVlIH0gKVxuICB9XG5cbiAgcGFyc2VyLmF0dHJpYk5hbWUgPSBwYXJzZXIuYXR0cmliVmFsdWUgPSBcIlwiXG59XG5cbmZ1bmN0aW9uIG9wZW5UYWcgKHBhcnNlciwgc2VsZkNsb3NpbmcpIHtcbiAgaWYgKHBhcnNlci5vcHQueG1sbnMpIHtcbiAgICAvLyBlbWl0IG5hbWVzcGFjZSBiaW5kaW5nIGV2ZW50c1xuICAgIHZhciB0YWcgPSBwYXJzZXIudGFnXG5cbiAgICAvLyBhZGQgbmFtZXNwYWNlIGluZm8gdG8gdGFnXG4gICAgdmFyIHFuID0gcW5hbWUocGFyc2VyLnRhZ05hbWUpXG4gICAgdGFnLnByZWZpeCA9IHFuLnByZWZpeFxuICAgIHRhZy5sb2NhbCA9IHFuLmxvY2FsXG4gICAgdGFnLnVyaSA9IHRhZy5uc1txbi5wcmVmaXhdIHx8IFwiXCJcblxuICAgIGlmICh0YWcucHJlZml4ICYmICF0YWcudXJpKSB7XG4gICAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJVbmJvdW5kIG5hbWVzcGFjZSBwcmVmaXg6IFwiXG4gICAgICAgICAgICAgICAgICAgICAgICsgSlNPTi5zdHJpbmdpZnkocGFyc2VyLnRhZ05hbWUpKVxuICAgICAgdGFnLnVyaSA9IHFuLnByZWZpeFxuICAgIH1cblxuICAgIHZhciBwYXJlbnQgPSBwYXJzZXIudGFnc1twYXJzZXIudGFncy5sZW5ndGggLSAxXSB8fCBwYXJzZXJcbiAgICBpZiAodGFnLm5zICYmIHBhcmVudC5ucyAhPT0gdGFnLm5zKSB7XG4gICAgICBPYmplY3Qua2V5cyh0YWcubnMpLmZvckVhY2goZnVuY3Rpb24gKHApIHtcbiAgICAgICAgZW1pdE5vZGUoIHBhcnNlclxuICAgICAgICAgICAgICAgICwgXCJvbm9wZW5uYW1lc3BhY2VcIlxuICAgICAgICAgICAgICAgICwgeyBwcmVmaXg6IHAgLCB1cmk6IHRhZy5uc1twXSB9IClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGRlZmVycmVkIG9uYXR0cmlidXRlIGV2ZW50c1xuICAgIC8vIE5vdGU6IGRvIG5vdCBhcHBseSBkZWZhdWx0IG5zIHRvIGF0dHJpYnV0ZXM6XG4gICAgLy8gICBodHRwOi8vd3d3LnczLm9yZy9UUi9SRUMteG1sLW5hbWVzLyNkZWZhdWx0aW5nXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYXJzZXIuYXR0cmliTGlzdC5sZW5ndGg7IGkgPCBsOyBpICsrKSB7XG4gICAgICB2YXIgbnYgPSBwYXJzZXIuYXR0cmliTGlzdFtpXVxuICAgICAgdmFyIG5hbWUgPSBudlswXVxuICAgICAgICAsIHZhbHVlID0gbnZbMV1cbiAgICAgICAgLCBxdWFsTmFtZSA9IHFuYW1lKG5hbWUsIHRydWUpXG4gICAgICAgICwgcHJlZml4ID0gcXVhbE5hbWUucHJlZml4XG4gICAgICAgICwgbG9jYWwgPSBxdWFsTmFtZS5sb2NhbFxuICAgICAgICAsIHVyaSA9IHByZWZpeCA9PSBcIlwiID8gXCJcIiA6ICh0YWcubnNbcHJlZml4XSB8fCBcIlwiKVxuICAgICAgICAsIGEgPSB7IG5hbWU6IG5hbWVcbiAgICAgICAgICAgICAgLCB2YWx1ZTogdmFsdWVcbiAgICAgICAgICAgICAgLCBwcmVmaXg6IHByZWZpeFxuICAgICAgICAgICAgICAsIGxvY2FsOiBsb2NhbFxuICAgICAgICAgICAgICAsIHVyaTogdXJpXG4gICAgICAgICAgICAgIH1cblxuICAgICAgLy8gaWYgdGhlcmUncyBhbnkgYXR0cmlidXRlcyB3aXRoIGFuIHVuZGVmaW5lZCBuYW1lc3BhY2UsXG4gICAgICAvLyB0aGVuIGZhaWwgb24gdGhlbSBub3cuXG4gICAgICBpZiAocHJlZml4ICYmIHByZWZpeCAhPSBcInhtbG5zXCIgJiYgIXVyaSkge1xuICAgICAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJVbmJvdW5kIG5hbWVzcGFjZSBwcmVmaXg6IFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgKyBKU09OLnN0cmluZ2lmeShwcmVmaXgpKVxuICAgICAgICBhLnVyaSA9IHByZWZpeFxuICAgICAgfVxuICAgICAgcGFyc2VyLnRhZy5hdHRyaWJ1dGVzW25hbWVdID0gYVxuICAgICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uYXR0cmlidXRlXCIsIGEpXG4gICAgfVxuICAgIHBhcnNlci5hdHRyaWJMaXN0Lmxlbmd0aCA9IDBcbiAgfVxuXG4gIHBhcnNlci50YWcuaXNTZWxmQ2xvc2luZyA9ICEhc2VsZkNsb3NpbmdcblxuICAvLyBwcm9jZXNzIHRoZSB0YWdcbiAgcGFyc2VyLnNhd1Jvb3QgPSB0cnVlXG4gIHBhcnNlci50YWdzLnB1c2gocGFyc2VyLnRhZylcbiAgZW1pdE5vZGUocGFyc2VyLCBcIm9ub3BlbnRhZ1wiLCBwYXJzZXIudGFnKVxuICBpZiAoIXNlbGZDbG9zaW5nKSB7XG4gICAgLy8gc3BlY2lhbCBjYXNlIGZvciA8c2NyaXB0PiBpbiBub24tc3RyaWN0IG1vZGUuXG4gICAgaWYgKCFwYXJzZXIubm9zY3JpcHQgJiYgcGFyc2VyLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJzY3JpcHRcIikge1xuICAgICAgcGFyc2VyLnN0YXRlID0gUy5TQ1JJUFRcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgfVxuICAgIHBhcnNlci50YWcgPSBudWxsXG4gICAgcGFyc2VyLnRhZ05hbWUgPSBcIlwiXG4gIH1cbiAgcGFyc2VyLmF0dHJpYk5hbWUgPSBwYXJzZXIuYXR0cmliVmFsdWUgPSBcIlwiXG4gIHBhcnNlci5hdHRyaWJMaXN0Lmxlbmd0aCA9IDBcbn1cblxuZnVuY3Rpb24gY2xvc2VUYWcgKHBhcnNlcikge1xuICBpZiAoIXBhcnNlci50YWdOYW1lKSB7XG4gICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiV2VpcmQgZW1wdHkgY2xvc2UgdGFnLlwiKVxuICAgIHBhcnNlci50ZXh0Tm9kZSArPSBcIjwvPlwiXG4gICAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAocGFyc2VyLnNjcmlwdCkge1xuICAgIGlmIChwYXJzZXIudGFnTmFtZSAhPT0gXCJzY3JpcHRcIikge1xuICAgICAgcGFyc2VyLnNjcmlwdCArPSBcIjwvXCIgKyBwYXJzZXIudGFnTmFtZSArIFwiPlwiXG4gICAgICBwYXJzZXIudGFnTmFtZSA9IFwiXCJcbiAgICAgIHBhcnNlci5zdGF0ZSA9IFMuU0NSSVBUXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uc2NyaXB0XCIsIHBhcnNlci5zY3JpcHQpXG4gICAgcGFyc2VyLnNjcmlwdCA9IFwiXCJcbiAgfVxuXG4gIC8vIGZpcnN0IG1ha2Ugc3VyZSB0aGF0IHRoZSBjbG9zaW5nIHRhZyBhY3R1YWxseSBleGlzdHMuXG4gIC8vIDxhPjxiPjwvYz48L2I+PC9hPiB3aWxsIGNsb3NlIGV2ZXJ5dGhpbmcsIG90aGVyd2lzZS5cbiAgdmFyIHQgPSBwYXJzZXIudGFncy5sZW5ndGhcbiAgdmFyIHRhZ05hbWUgPSBwYXJzZXIudGFnTmFtZVxuICBpZiAoIXBhcnNlci5zdHJpY3QpIHRhZ05hbWUgPSB0YWdOYW1lW3BhcnNlci5sb29zZUNhc2VdKClcbiAgdmFyIGNsb3NlVG8gPSB0YWdOYW1lXG4gIHdoaWxlICh0IC0tKSB7XG4gICAgdmFyIGNsb3NlID0gcGFyc2VyLnRhZ3NbdF1cbiAgICBpZiAoY2xvc2UubmFtZSAhPT0gY2xvc2VUbykge1xuICAgICAgLy8gZmFpbCB0aGUgZmlyc3QgdGltZSBpbiBzdHJpY3QgbW9kZVxuICAgICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiVW5leHBlY3RlZCBjbG9zZSB0YWdcIilcbiAgICB9IGVsc2UgYnJlYWtcbiAgfVxuXG4gIC8vIGRpZG4ndCBmaW5kIGl0LiAgd2UgYWxyZWFkeSBmYWlsZWQgZm9yIHN0cmljdCwgc28ganVzdCBhYm9ydC5cbiAgaWYgKHQgPCAwKSB7XG4gICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiVW5tYXRjaGVkIGNsb3NpbmcgdGFnOiBcIitwYXJzZXIudGFnTmFtZSlcbiAgICBwYXJzZXIudGV4dE5vZGUgKz0gXCI8L1wiICsgcGFyc2VyLnRhZ05hbWUgKyBcIj5cIlxuICAgIHBhcnNlci5zdGF0ZSA9IFMuVEVYVFxuICAgIHJldHVyblxuICB9XG4gIHBhcnNlci50YWdOYW1lID0gdGFnTmFtZVxuICB2YXIgcyA9IHBhcnNlci50YWdzLmxlbmd0aFxuICB3aGlsZSAocyAtLT4gdCkge1xuICAgIHZhciB0YWcgPSBwYXJzZXIudGFnID0gcGFyc2VyLnRhZ3MucG9wKClcbiAgICBwYXJzZXIudGFnTmFtZSA9IHBhcnNlci50YWcubmFtZVxuICAgIGVtaXROb2RlKHBhcnNlciwgXCJvbmNsb3NldGFnXCIsIHBhcnNlci50YWdOYW1lKVxuXG4gICAgdmFyIHggPSB7fVxuICAgIGZvciAodmFyIGkgaW4gdGFnLm5zKSB4W2ldID0gdGFnLm5zW2ldXG5cbiAgICB2YXIgcGFyZW50ID0gcGFyc2VyLnRhZ3NbcGFyc2VyLnRhZ3MubGVuZ3RoIC0gMV0gfHwgcGFyc2VyXG4gICAgaWYgKHBhcnNlci5vcHQueG1sbnMgJiYgdGFnLm5zICE9PSBwYXJlbnQubnMpIHtcbiAgICAgIC8vIHJlbW92ZSBuYW1lc3BhY2UgYmluZGluZ3MgaW50cm9kdWNlZCBieSB0YWdcbiAgICAgIE9iamVjdC5rZXlzKHRhZy5ucykuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgICB2YXIgbiA9IHRhZy5uc1twXVxuICAgICAgICBlbWl0Tm9kZShwYXJzZXIsIFwib25jbG9zZW5hbWVzcGFjZVwiLCB7IHByZWZpeDogcCwgdXJpOiBuIH0pXG4gICAgICB9KVxuICAgIH1cbiAgfVxuICBpZiAodCA9PT0gMCkgcGFyc2VyLmNsb3NlZFJvb3QgPSB0cnVlXG4gIHBhcnNlci50YWdOYW1lID0gcGFyc2VyLmF0dHJpYlZhbHVlID0gcGFyc2VyLmF0dHJpYk5hbWUgPSBcIlwiXG4gIHBhcnNlci5hdHRyaWJMaXN0Lmxlbmd0aCA9IDBcbiAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG59XG5cbmZ1bmN0aW9uIHBhcnNlRW50aXR5IChwYXJzZXIpIHtcbiAgdmFyIGVudGl0eSA9IHBhcnNlci5lbnRpdHlcbiAgICAsIGVudGl0eUxDID0gZW50aXR5LnRvTG93ZXJDYXNlKClcbiAgICAsIG51bVxuICAgICwgbnVtU3RyID0gXCJcIlxuICBpZiAocGFyc2VyLkVOVElUSUVTW2VudGl0eV0pXG4gICAgcmV0dXJuIHBhcnNlci5FTlRJVElFU1tlbnRpdHldXG4gIGlmIChwYXJzZXIuRU5USVRJRVNbZW50aXR5TENdKVxuICAgIHJldHVybiBwYXJzZXIuRU5USVRJRVNbZW50aXR5TENdXG4gIGVudGl0eSA9IGVudGl0eUxDXG4gIGlmIChlbnRpdHkuY2hhckF0KDApID09PSBcIiNcIikge1xuICAgIGlmIChlbnRpdHkuY2hhckF0KDEpID09PSBcInhcIikge1xuICAgICAgZW50aXR5ID0gZW50aXR5LnNsaWNlKDIpXG4gICAgICBudW0gPSBwYXJzZUludChlbnRpdHksIDE2KVxuICAgICAgbnVtU3RyID0gbnVtLnRvU3RyaW5nKDE2KVxuICAgIH0gZWxzZSB7XG4gICAgICBlbnRpdHkgPSBlbnRpdHkuc2xpY2UoMSlcbiAgICAgIG51bSA9IHBhcnNlSW50KGVudGl0eSwgMTApXG4gICAgICBudW1TdHIgPSBudW0udG9TdHJpbmcoMTApXG4gICAgfVxuICB9XG4gIGVudGl0eSA9IGVudGl0eS5yZXBsYWNlKC9eMCsvLCBcIlwiKVxuICBpZiAobnVtU3RyLnRvTG93ZXJDYXNlKCkgIT09IGVudGl0eSkge1xuICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIkludmFsaWQgY2hhcmFjdGVyIGVudGl0eVwiKVxuICAgIHJldHVybiBcIiZcIitwYXJzZXIuZW50aXR5ICsgXCI7XCJcbiAgfVxuXG4gIHJldHVybiBTdHJpbmcuZnJvbUNvZGVQb2ludChudW0pXG59XG5cbmZ1bmN0aW9uIHdyaXRlIChjaHVuaykge1xuICB2YXIgcGFyc2VyID0gdGhpc1xuICBpZiAodGhpcy5lcnJvcikgdGhyb3cgdGhpcy5lcnJvclxuICBpZiAocGFyc2VyLmNsb3NlZCkgcmV0dXJuIGVycm9yKHBhcnNlcixcbiAgICBcIkNhbm5vdCB3cml0ZSBhZnRlciBjbG9zZS4gQXNzaWduIGFuIG9ucmVhZHkgaGFuZGxlci5cIilcbiAgaWYgKGNodW5rID09PSBudWxsKSByZXR1cm4gZW5kKHBhcnNlcilcbiAgdmFyIGkgPSAwLCBjID0gXCJcIlxuICB3aGlsZSAocGFyc2VyLmMgPSBjID0gY2h1bmsuY2hhckF0KGkrKykpIHtcbiAgICBpZiAocGFyc2VyLnRyYWNrUG9zaXRpb24pIHtcbiAgICAgIHBhcnNlci5wb3NpdGlvbiArK1xuICAgICAgaWYgKGMgPT09IFwiXFxuXCIpIHtcbiAgICAgICAgcGFyc2VyLmxpbmUgKytcbiAgICAgICAgcGFyc2VyLmNvbHVtbiA9IDBcbiAgICAgIH0gZWxzZSBwYXJzZXIuY29sdW1uICsrXG4gICAgfVxuICAgIHN3aXRjaCAocGFyc2VyLnN0YXRlKSB7XG5cbiAgICAgIGNhc2UgUy5CRUdJTjpcbiAgICAgICAgaWYgKGMgPT09IFwiPFwiKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5PUEVOX1dBS0FcbiAgICAgICAgICBwYXJzZXIuc3RhcnRUYWdQb3NpdGlvbiA9IHBhcnNlci5wb3NpdGlvblxuICAgICAgICB9IGVsc2UgaWYgKG5vdCh3aGl0ZXNwYWNlLGMpKSB7XG4gICAgICAgICAgLy8gaGF2ZSB0byBwcm9jZXNzIHRoaXMgYXMgYSB0ZXh0IG5vZGUuXG4gICAgICAgICAgLy8gd2VpcmQsIGJ1dCBoYXBwZW5zLlxuICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIk5vbi13aGl0ZXNwYWNlIGJlZm9yZSBmaXJzdCB0YWcuXCIpXG4gICAgICAgICAgcGFyc2VyLnRleHROb2RlID0gY1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuVEVYVFxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuVEVYVDpcbiAgICAgICAgaWYgKHBhcnNlci5zYXdSb290ICYmICFwYXJzZXIuY2xvc2VkUm9vdCkge1xuICAgICAgICAgIHZhciBzdGFydGkgPSBpLTFcbiAgICAgICAgICB3aGlsZSAoYyAmJiBjIT09XCI8XCIgJiYgYyE9PVwiJlwiKSB7XG4gICAgICAgICAgICBjID0gY2h1bmsuY2hhckF0KGkrKylcbiAgICAgICAgICAgIGlmIChjICYmIHBhcnNlci50cmFja1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICAgIHBhcnNlci5wb3NpdGlvbiArK1xuICAgICAgICAgICAgICBpZiAoYyA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgICAgIHBhcnNlci5saW5lICsrXG4gICAgICAgICAgICAgICAgcGFyc2VyLmNvbHVtbiA9IDBcbiAgICAgICAgICAgICAgfSBlbHNlIHBhcnNlci5jb2x1bW4gKytcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcGFyc2VyLnRleHROb2RlICs9IGNodW5rLnN1YnN0cmluZyhzdGFydGksIGktMSlcbiAgICAgICAgfVxuICAgICAgICBpZiAoYyA9PT0gXCI8XCIpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLk9QRU5fV0FLQVxuICAgICAgICAgIHBhcnNlci5zdGFydFRhZ1Bvc2l0aW9uID0gcGFyc2VyLnBvc2l0aW9uXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKG5vdCh3aGl0ZXNwYWNlLCBjKSAmJiAoIXBhcnNlci5zYXdSb290IHx8IHBhcnNlci5jbG9zZWRSb290KSlcbiAgICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIlRleHQgZGF0YSBvdXRzaWRlIG9mIHJvb3Qgbm9kZS5cIilcbiAgICAgICAgICBpZiAoYyA9PT0gXCImXCIpIHBhcnNlci5zdGF0ZSA9IFMuVEVYVF9FTlRJVFlcbiAgICAgICAgICBlbHNlIHBhcnNlci50ZXh0Tm9kZSArPSBjXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5TQ1JJUFQ6XG4gICAgICAgIC8vIG9ubHkgbm9uLXN0cmljdFxuICAgICAgICBpZiAoYyA9PT0gXCI8XCIpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlNDUklQVF9FTkRJTkdcbiAgICAgICAgfSBlbHNlIHBhcnNlci5zY3JpcHQgKz0gY1xuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLlNDUklQVF9FTkRJTkc6XG4gICAgICAgIGlmIChjID09PSBcIi9cIikge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQ0xPU0VfVEFHXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyc2VyLnNjcmlwdCArPSBcIjxcIiArIGNcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlNDUklQVFxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuT1BFTl9XQUtBOlxuICAgICAgICAvLyBlaXRoZXIgYSAvLCA/LCAhLCBvciB0ZXh0IGlzIGNvbWluZyBuZXh0LlxuICAgICAgICBpZiAoYyA9PT0gXCIhXCIpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlNHTUxfREVDTFxuICAgICAgICAgIHBhcnNlci5zZ21sRGVjbCA9IFwiXCJcbiAgICAgICAgfSBlbHNlIGlmIChpcyh3aGl0ZXNwYWNlLCBjKSkge1xuICAgICAgICAgIC8vIHdhaXQgZm9yIGl0Li4uXG4gICAgICAgIH0gZWxzZSBpZiAoaXMobmFtZVN0YXJ0LGMpKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5PUEVOX1RBR1xuICAgICAgICAgIHBhcnNlci50YWdOYW1lID0gY1xuICAgICAgICB9IGVsc2UgaWYgKGMgPT09IFwiL1wiKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5DTE9TRV9UQUdcbiAgICAgICAgICBwYXJzZXIudGFnTmFtZSA9IFwiXCJcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSBcIj9cIikge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuUFJPQ19JTlNUXG4gICAgICAgICAgcGFyc2VyLnByb2NJbnN0TmFtZSA9IHBhcnNlci5wcm9jSW5zdEJvZHkgPSBcIlwiXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiVW5lbmNvZGVkIDxcIilcbiAgICAgICAgICAvLyBpZiB0aGVyZSB3YXMgc29tZSB3aGl0ZXNwYWNlLCB0aGVuIGFkZCB0aGF0IGluLlxuICAgICAgICAgIGlmIChwYXJzZXIuc3RhcnRUYWdQb3NpdGlvbiArIDEgPCBwYXJzZXIucG9zaXRpb24pIHtcbiAgICAgICAgICAgIHZhciBwYWQgPSBwYXJzZXIucG9zaXRpb24gLSBwYXJzZXIuc3RhcnRUYWdQb3NpdGlvblxuICAgICAgICAgICAgYyA9IG5ldyBBcnJheShwYWQpLmpvaW4oXCIgXCIpICsgY1xuICAgICAgICAgIH1cbiAgICAgICAgICBwYXJzZXIudGV4dE5vZGUgKz0gXCI8XCIgKyBjXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5TR01MX0RFQ0w6XG4gICAgICAgIGlmICgocGFyc2VyLnNnbWxEZWNsK2MpLnRvVXBwZXJDYXNlKCkgPT09IENEQVRBKSB7XG4gICAgICAgICAgZW1pdE5vZGUocGFyc2VyLCBcIm9ub3BlbmNkYXRhXCIpXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5DREFUQVxuICAgICAgICAgIHBhcnNlci5zZ21sRGVjbCA9IFwiXCJcbiAgICAgICAgICBwYXJzZXIuY2RhdGEgPSBcIlwiXG4gICAgICAgIH0gZWxzZSBpZiAocGFyc2VyLnNnbWxEZWNsK2MgPT09IFwiLS1cIikge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQ09NTUVOVFxuICAgICAgICAgIHBhcnNlci5jb21tZW50ID0gXCJcIlxuICAgICAgICAgIHBhcnNlci5zZ21sRGVjbCA9IFwiXCJcbiAgICAgICAgfSBlbHNlIGlmICgocGFyc2VyLnNnbWxEZWNsK2MpLnRvVXBwZXJDYXNlKCkgPT09IERPQ1RZUEUpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkRPQ1RZUEVcbiAgICAgICAgICBpZiAocGFyc2VyLmRvY3R5cGUgfHwgcGFyc2VyLnNhd1Jvb3QpIHN0cmljdEZhaWwocGFyc2VyLFxuICAgICAgICAgICAgXCJJbmFwcHJvcHJpYXRlbHkgbG9jYXRlZCBkb2N0eXBlIGRlY2xhcmF0aW9uXCIpXG4gICAgICAgICAgcGFyc2VyLmRvY3R5cGUgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnNnbWxEZWNsID0gXCJcIlxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09IFwiPlwiKSB7XG4gICAgICAgICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uc2dtbGRlY2xhcmF0aW9uXCIsIHBhcnNlci5zZ21sRGVjbClcbiAgICAgICAgICBwYXJzZXIuc2dtbERlY2wgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgICAgIH0gZWxzZSBpZiAoaXMocXVvdGUsIGMpKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5TR01MX0RFQ0xfUVVPVEVEXG4gICAgICAgICAgcGFyc2VyLnNnbWxEZWNsICs9IGNcbiAgICAgICAgfSBlbHNlIHBhcnNlci5zZ21sRGVjbCArPSBjXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuU0dNTF9ERUNMX1FVT1RFRDpcbiAgICAgICAgaWYgKGMgPT09IHBhcnNlci5xKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5TR01MX0RFQ0xcbiAgICAgICAgICBwYXJzZXIucSA9IFwiXCJcbiAgICAgICAgfVxuICAgICAgICBwYXJzZXIuc2dtbERlY2wgKz0gY1xuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkRPQ1RZUEU6XG4gICAgICAgIGlmIChjID09PSBcIj5cIikge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuVEVYVFxuICAgICAgICAgIGVtaXROb2RlKHBhcnNlciwgXCJvbmRvY3R5cGVcIiwgcGFyc2VyLmRvY3R5cGUpXG4gICAgICAgICAgcGFyc2VyLmRvY3R5cGUgPSB0cnVlIC8vIGp1c3QgcmVtZW1iZXIgdGhhdCB3ZSBzYXcgaXQuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyc2VyLmRvY3R5cGUgKz0gY1xuICAgICAgICAgIGlmIChjID09PSBcIltcIikgcGFyc2VyLnN0YXRlID0gUy5ET0NUWVBFX0RURFxuICAgICAgICAgIGVsc2UgaWYgKGlzKHF1b3RlLCBjKSkge1xuICAgICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5ET0NUWVBFX1FVT1RFRFxuICAgICAgICAgICAgcGFyc2VyLnEgPSBjXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuRE9DVFlQRV9RVU9URUQ6XG4gICAgICAgIHBhcnNlci5kb2N0eXBlICs9IGNcbiAgICAgICAgaWYgKGMgPT09IHBhcnNlci5xKSB7XG4gICAgICAgICAgcGFyc2VyLnEgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5ET0NUWVBFXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5ET0NUWVBFX0RURDpcbiAgICAgICAgcGFyc2VyLmRvY3R5cGUgKz0gY1xuICAgICAgICBpZiAoYyA9PT0gXCJdXCIpIHBhcnNlci5zdGF0ZSA9IFMuRE9DVFlQRVxuICAgICAgICBlbHNlIGlmIChpcyhxdW90ZSxjKSkge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuRE9DVFlQRV9EVERfUVVPVEVEXG4gICAgICAgICAgcGFyc2VyLnEgPSBjXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5ET0NUWVBFX0RURF9RVU9URUQ6XG4gICAgICAgIHBhcnNlci5kb2N0eXBlICs9IGNcbiAgICAgICAgaWYgKGMgPT09IHBhcnNlci5xKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5ET0NUWVBFX0RURFxuICAgICAgICAgIHBhcnNlci5xID0gXCJcIlxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQ09NTUVOVDpcbiAgICAgICAgaWYgKGMgPT09IFwiLVwiKSBwYXJzZXIuc3RhdGUgPSBTLkNPTU1FTlRfRU5ESU5HXG4gICAgICAgIGVsc2UgcGFyc2VyLmNvbW1lbnQgKz0gY1xuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkNPTU1FTlRfRU5ESU5HOlxuICAgICAgICBpZiAoYyA9PT0gXCItXCIpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkNPTU1FTlRfRU5ERURcbiAgICAgICAgICBwYXJzZXIuY29tbWVudCA9IHRleHRvcHRzKHBhcnNlci5vcHQsIHBhcnNlci5jb21tZW50KVxuICAgICAgICAgIGlmIChwYXJzZXIuY29tbWVudCkgZW1pdE5vZGUocGFyc2VyLCBcIm9uY29tbWVudFwiLCBwYXJzZXIuY29tbWVudClcbiAgICAgICAgICBwYXJzZXIuY29tbWVudCA9IFwiXCJcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJzZXIuY29tbWVudCArPSBcIi1cIiArIGNcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkNPTU1FTlRcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkNPTU1FTlRfRU5ERUQ6XG4gICAgICAgIGlmIChjICE9PSBcIj5cIikge1xuICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIk1hbGZvcm1lZCBjb21tZW50XCIpXG4gICAgICAgICAgLy8gYWxsb3cgPCEtLSBibGFoIC0tIGJsb28gLS0+IGluIG5vbi1zdHJpY3QgbW9kZSxcbiAgICAgICAgICAvLyB3aGljaCBpcyBhIGNvbW1lbnQgb2YgXCIgYmxhaCAtLSBibG9vIFwiXG4gICAgICAgICAgcGFyc2VyLmNvbW1lbnQgKz0gXCItLVwiICsgY1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQ09NTUVOVFxuICAgICAgICB9IGVsc2UgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQ0RBVEE6XG4gICAgICAgIGlmIChjID09PSBcIl1cIikgcGFyc2VyLnN0YXRlID0gUy5DREFUQV9FTkRJTkdcbiAgICAgICAgZWxzZSBwYXJzZXIuY2RhdGEgKz0gY1xuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkNEQVRBX0VORElORzpcbiAgICAgICAgaWYgKGMgPT09IFwiXVwiKSBwYXJzZXIuc3RhdGUgPSBTLkNEQVRBX0VORElOR18yXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHBhcnNlci5jZGF0YSArPSBcIl1cIiArIGNcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkNEQVRBXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5DREFUQV9FTkRJTkdfMjpcbiAgICAgICAgaWYgKGMgPT09IFwiPlwiKSB7XG4gICAgICAgICAgaWYgKHBhcnNlci5jZGF0YSkgZW1pdE5vZGUocGFyc2VyLCBcIm9uY2RhdGFcIiwgcGFyc2VyLmNkYXRhKVxuICAgICAgICAgIGVtaXROb2RlKHBhcnNlciwgXCJvbmNsb3NlY2RhdGFcIilcbiAgICAgICAgICBwYXJzZXIuY2RhdGEgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gXCJdXCIpIHtcbiAgICAgICAgICBwYXJzZXIuY2RhdGEgKz0gXCJdXCJcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJzZXIuY2RhdGEgKz0gXCJdXVwiICsgY1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQ0RBVEFcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLlBST0NfSU5TVDpcbiAgICAgICAgaWYgKGMgPT09IFwiP1wiKSBwYXJzZXIuc3RhdGUgPSBTLlBST0NfSU5TVF9FTkRJTkdcbiAgICAgICAgZWxzZSBpZiAoaXMod2hpdGVzcGFjZSwgYykpIHBhcnNlci5zdGF0ZSA9IFMuUFJPQ19JTlNUX0JPRFlcbiAgICAgICAgZWxzZSBwYXJzZXIucHJvY0luc3ROYW1lICs9IGNcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5QUk9DX0lOU1RfQk9EWTpcbiAgICAgICAgaWYgKCFwYXJzZXIucHJvY0luc3RCb2R5ICYmIGlzKHdoaXRlc3BhY2UsIGMpKSBjb250aW51ZVxuICAgICAgICBlbHNlIGlmIChjID09PSBcIj9cIikgcGFyc2VyLnN0YXRlID0gUy5QUk9DX0lOU1RfRU5ESU5HXG4gICAgICAgIGVsc2UgcGFyc2VyLnByb2NJbnN0Qm9keSArPSBjXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuUFJPQ19JTlNUX0VORElORzpcbiAgICAgICAgaWYgKGMgPT09IFwiPlwiKSB7XG4gICAgICAgICAgZW1pdE5vZGUocGFyc2VyLCBcIm9ucHJvY2Vzc2luZ2luc3RydWN0aW9uXCIsIHtcbiAgICAgICAgICAgIG5hbWUgOiBwYXJzZXIucHJvY0luc3ROYW1lLFxuICAgICAgICAgICAgYm9keSA6IHBhcnNlci5wcm9jSW5zdEJvZHlcbiAgICAgICAgICB9KVxuICAgICAgICAgIHBhcnNlci5wcm9jSW5zdE5hbWUgPSBwYXJzZXIucHJvY0luc3RCb2R5ID0gXCJcIlxuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuVEVYVFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnNlci5wcm9jSW5zdEJvZHkgKz0gXCI/XCIgKyBjXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5QUk9DX0lOU1RfQk9EWVxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuT1BFTl9UQUc6XG4gICAgICAgIGlmIChpcyhuYW1lQm9keSwgYykpIHBhcnNlci50YWdOYW1lICs9IGNcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbmV3VGFnKHBhcnNlcilcbiAgICAgICAgICBpZiAoYyA9PT0gXCI+XCIpIG9wZW5UYWcocGFyc2VyKVxuICAgICAgICAgIGVsc2UgaWYgKGMgPT09IFwiL1wiKSBwYXJzZXIuc3RhdGUgPSBTLk9QRU5fVEFHX1NMQVNIXG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAobm90KHdoaXRlc3BhY2UsIGMpKSBzdHJpY3RGYWlsKFxuICAgICAgICAgICAgICBwYXJzZXIsIFwiSW52YWxpZCBjaGFyYWN0ZXIgaW4gdGFnIG5hbWVcIilcbiAgICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuT1BFTl9UQUdfU0xBU0g6XG4gICAgICAgIGlmIChjID09PSBcIj5cIikge1xuICAgICAgICAgIG9wZW5UYWcocGFyc2VyLCB0cnVlKVxuICAgICAgICAgIGNsb3NlVGFnKHBhcnNlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJGb3J3YXJkLXNsYXNoIGluIG9wZW5pbmcgdGFnIG5vdCBmb2xsb3dlZCBieSA+XCIpXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkFUVFJJQjpcbiAgICAgICAgLy8gaGF2ZW4ndCByZWFkIHRoZSBhdHRyaWJ1dGUgbmFtZSB5ZXQuXG4gICAgICAgIGlmIChpcyh3aGl0ZXNwYWNlLCBjKSkgY29udGludWVcbiAgICAgICAgZWxzZSBpZiAoYyA9PT0gXCI+XCIpIG9wZW5UYWcocGFyc2VyKVxuICAgICAgICBlbHNlIGlmIChjID09PSBcIi9cIikgcGFyc2VyLnN0YXRlID0gUy5PUEVOX1RBR19TTEFTSFxuICAgICAgICBlbHNlIGlmIChpcyhuYW1lU3RhcnQsIGMpKSB7XG4gICAgICAgICAgcGFyc2VyLmF0dHJpYk5hbWUgPSBjXG4gICAgICAgICAgcGFyc2VyLmF0dHJpYlZhbHVlID0gXCJcIlxuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCX05BTUVcbiAgICAgICAgfSBlbHNlIHN0cmljdEZhaWwocGFyc2VyLCBcIkludmFsaWQgYXR0cmlidXRlIG5hbWVcIilcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5BVFRSSUJfTkFNRTpcbiAgICAgICAgaWYgKGMgPT09IFwiPVwiKSBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQl9WQUxVRVxuICAgICAgICBlbHNlIGlmIChjID09PSBcIj5cIikge1xuICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIkF0dHJpYnV0ZSB3aXRob3V0IHZhbHVlXCIpXG4gICAgICAgICAgcGFyc2VyLmF0dHJpYlZhbHVlID0gcGFyc2VyLmF0dHJpYk5hbWVcbiAgICAgICAgICBhdHRyaWIocGFyc2VyKVxuICAgICAgICAgIG9wZW5UYWcocGFyc2VyKVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzKHdoaXRlc3BhY2UsIGMpKSBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQl9OQU1FX1NBV19XSElURVxuICAgICAgICBlbHNlIGlmIChpcyhuYW1lQm9keSwgYykpIHBhcnNlci5hdHRyaWJOYW1lICs9IGNcbiAgICAgICAgZWxzZSBzdHJpY3RGYWlsKHBhcnNlciwgXCJJbnZhbGlkIGF0dHJpYnV0ZSBuYW1lXCIpXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQVRUUklCX05BTUVfU0FXX1dISVRFOlxuICAgICAgICBpZiAoYyA9PT0gXCI9XCIpIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCX1ZBTFVFXG4gICAgICAgIGVsc2UgaWYgKGlzKHdoaXRlc3BhY2UsIGMpKSBjb250aW51ZVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJBdHRyaWJ1dGUgd2l0aG91dCB2YWx1ZVwiKVxuICAgICAgICAgIHBhcnNlci50YWcuYXR0cmlidXRlc1twYXJzZXIuYXR0cmliTmFtZV0gPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLmF0dHJpYlZhbHVlID0gXCJcIlxuICAgICAgICAgIGVtaXROb2RlKHBhcnNlciwgXCJvbmF0dHJpYnV0ZVwiLFxuICAgICAgICAgICAgICAgICAgIHsgbmFtZSA6IHBhcnNlci5hdHRyaWJOYW1lLCB2YWx1ZSA6IFwiXCIgfSlcbiAgICAgICAgICBwYXJzZXIuYXR0cmliTmFtZSA9IFwiXCJcbiAgICAgICAgICBpZiAoYyA9PT0gXCI+XCIpIG9wZW5UYWcocGFyc2VyKVxuICAgICAgICAgIGVsc2UgaWYgKGlzKG5hbWVTdGFydCwgYykpIHtcbiAgICAgICAgICAgIHBhcnNlci5hdHRyaWJOYW1lID0gY1xuICAgICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJfTkFNRVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJJbnZhbGlkIGF0dHJpYnV0ZSBuYW1lXCIpXG4gICAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkFUVFJJQl9WQUxVRTpcbiAgICAgICAgaWYgKGlzKHdoaXRlc3BhY2UsIGMpKSBjb250aW51ZVxuICAgICAgICBlbHNlIGlmIChpcyhxdW90ZSwgYykpIHtcbiAgICAgICAgICBwYXJzZXIucSA9IGNcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQl9WQUxVRV9RVU9URURcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJVbnF1b3RlZCBhdHRyaWJ1dGUgdmFsdWVcIilcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQl9WQUxVRV9VTlFVT1RFRFxuICAgICAgICAgIHBhcnNlci5hdHRyaWJWYWx1ZSA9IGNcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkFUVFJJQl9WQUxVRV9RVU9URUQ6XG4gICAgICAgIGlmIChjICE9PSBwYXJzZXIucSkge1xuICAgICAgICAgIGlmIChjID09PSBcIiZcIikgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJfVkFMVUVfRU5USVRZX1FcbiAgICAgICAgICBlbHNlIHBhcnNlci5hdHRyaWJWYWx1ZSArPSBjXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBhdHRyaWIocGFyc2VyKVxuICAgICAgICBwYXJzZXIucSA9IFwiXCJcbiAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJfVkFMVUVfQ0xPU0VEXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQVRUUklCX1ZBTFVFX0NMT1NFRDpcbiAgICAgICAgaWYgKGlzKHdoaXRlc3BhY2UsIGMpKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSBcIj5cIikgb3BlblRhZyhwYXJzZXIpXG4gICAgICAgIGVsc2UgaWYgKGMgPT09IFwiL1wiKSBwYXJzZXIuc3RhdGUgPSBTLk9QRU5fVEFHX1NMQVNIXG4gICAgICAgIGVsc2UgaWYgKGlzKG5hbWVTdGFydCwgYykpIHtcbiAgICAgICAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJObyB3aGl0ZXNwYWNlIGJldHdlZW4gYXR0cmlidXRlc1wiKVxuICAgICAgICAgIHBhcnNlci5hdHRyaWJOYW1lID0gY1xuICAgICAgICAgIHBhcnNlci5hdHRyaWJWYWx1ZSA9IFwiXCJcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQl9OQU1FXG4gICAgICAgIH0gZWxzZSBzdHJpY3RGYWlsKHBhcnNlciwgXCJJbnZhbGlkIGF0dHJpYnV0ZSBuYW1lXCIpXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQVRUUklCX1ZBTFVFX1VOUVVPVEVEOlxuICAgICAgICBpZiAobm90KGF0dHJpYkVuZCxjKSkge1xuICAgICAgICAgIGlmIChjID09PSBcIiZcIikgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJfVkFMVUVfRU5USVRZX1VcbiAgICAgICAgICBlbHNlIHBhcnNlci5hdHRyaWJWYWx1ZSArPSBjXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgICBhdHRyaWIocGFyc2VyKVxuICAgICAgICBpZiAoYyA9PT0gXCI+XCIpIG9wZW5UYWcocGFyc2VyKVxuICAgICAgICBlbHNlIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQ0xPU0VfVEFHOlxuICAgICAgICBpZiAoIXBhcnNlci50YWdOYW1lKSB7XG4gICAgICAgICAgaWYgKGlzKHdoaXRlc3BhY2UsIGMpKSBjb250aW51ZVxuICAgICAgICAgIGVsc2UgaWYgKG5vdChuYW1lU3RhcnQsIGMpKSB7XG4gICAgICAgICAgICBpZiAocGFyc2VyLnNjcmlwdCkge1xuICAgICAgICAgICAgICBwYXJzZXIuc2NyaXB0ICs9IFwiPC9cIiArIGNcbiAgICAgICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5TQ1JJUFRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIkludmFsaWQgdGFnbmFtZSBpbiBjbG9zaW5nIHRhZy5cIilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgcGFyc2VyLnRhZ05hbWUgPSBjXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYyA9PT0gXCI+XCIpIGNsb3NlVGFnKHBhcnNlcilcbiAgICAgICAgZWxzZSBpZiAoaXMobmFtZUJvZHksIGMpKSBwYXJzZXIudGFnTmFtZSArPSBjXG4gICAgICAgIGVsc2UgaWYgKHBhcnNlci5zY3JpcHQpIHtcbiAgICAgICAgICBwYXJzZXIuc2NyaXB0ICs9IFwiPC9cIiArIHBhcnNlci50YWdOYW1lXG4gICAgICAgICAgcGFyc2VyLnRhZ05hbWUgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5TQ1JJUFRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAobm90KHdoaXRlc3BhY2UsIGMpKSBzdHJpY3RGYWlsKHBhcnNlcixcbiAgICAgICAgICAgIFwiSW52YWxpZCB0YWduYW1lIGluIGNsb3NpbmcgdGFnXCIpXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5DTE9TRV9UQUdfU0FXX1dISVRFXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5DTE9TRV9UQUdfU0FXX1dISVRFOlxuICAgICAgICBpZiAoaXMod2hpdGVzcGFjZSwgYykpIGNvbnRpbnVlXG4gICAgICAgIGlmIChjID09PSBcIj5cIikgY2xvc2VUYWcocGFyc2VyKVxuICAgICAgICBlbHNlIHN0cmljdEZhaWwocGFyc2VyLCBcIkludmFsaWQgY2hhcmFjdGVycyBpbiBjbG9zaW5nIHRhZ1wiKVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLlRFWFRfRU5USVRZOlxuICAgICAgY2FzZSBTLkFUVFJJQl9WQUxVRV9FTlRJVFlfUTpcbiAgICAgIGNhc2UgUy5BVFRSSUJfVkFMVUVfRU5USVRZX1U6XG4gICAgICAgIHN3aXRjaChwYXJzZXIuc3RhdGUpIHtcbiAgICAgICAgICBjYXNlIFMuVEVYVF9FTlRJVFk6XG4gICAgICAgICAgICB2YXIgcmV0dXJuU3RhdGUgPSBTLlRFWFQsIGJ1ZmZlciA9IFwidGV4dE5vZGVcIlxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICBjYXNlIFMuQVRUUklCX1ZBTFVFX0VOVElUWV9ROlxuICAgICAgICAgICAgdmFyIHJldHVyblN0YXRlID0gUy5BVFRSSUJfVkFMVUVfUVVPVEVELCBidWZmZXIgPSBcImF0dHJpYlZhbHVlXCJcbiAgICAgICAgICBicmVha1xuXG4gICAgICAgICAgY2FzZSBTLkFUVFJJQl9WQUxVRV9FTlRJVFlfVTpcbiAgICAgICAgICAgIHZhciByZXR1cm5TdGF0ZSA9IFMuQVRUUklCX1ZBTFVFX1VOUVVPVEVELCBidWZmZXIgPSBcImF0dHJpYlZhbHVlXCJcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIGlmIChjID09PSBcIjtcIikge1xuICAgICAgICAgIHBhcnNlcltidWZmZXJdICs9IHBhcnNlRW50aXR5KHBhcnNlcilcbiAgICAgICAgICBwYXJzZXIuZW50aXR5ID0gXCJcIlxuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IHJldHVyblN0YXRlXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXMoZW50aXR5LCBjKSkgcGFyc2VyLmVudGl0eSArPSBjXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIkludmFsaWQgY2hhcmFjdGVyIGVudGl0eVwiKVxuICAgICAgICAgIHBhcnNlcltidWZmZXJdICs9IFwiJlwiICsgcGFyc2VyLmVudGl0eSArIGNcbiAgICAgICAgICBwYXJzZXIuZW50aXR5ID0gXCJcIlxuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IHJldHVyblN0YXRlXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihwYXJzZXIsIFwiVW5rbm93biBzdGF0ZTogXCIgKyBwYXJzZXIuc3RhdGUpXG4gICAgfVxuICB9IC8vIHdoaWxlXG4gIC8vIGNkYXRhIGJsb2NrcyBjYW4gZ2V0IHZlcnkgYmlnIHVuZGVyIG5vcm1hbCBjb25kaXRpb25zLiBlbWl0IGFuZCBtb3ZlIG9uLlxuICAvLyBpZiAocGFyc2VyLnN0YXRlID09PSBTLkNEQVRBICYmIHBhcnNlci5jZGF0YSkge1xuICAvLyAgIGVtaXROb2RlKHBhcnNlciwgXCJvbmNkYXRhXCIsIHBhcnNlci5jZGF0YSlcbiAgLy8gICBwYXJzZXIuY2RhdGEgPSBcIlwiXG4gIC8vIH1cbiAgaWYgKHBhcnNlci5wb3NpdGlvbiA+PSBwYXJzZXIuYnVmZmVyQ2hlY2tQb3NpdGlvbikgY2hlY2tCdWZmZXJMZW5ndGgocGFyc2VyKVxuICByZXR1cm4gcGFyc2VyXG59XG5cbi8qISBodHRwOi8vbXRocy5iZS9mcm9tY29kZXBvaW50IHYwLjEuMCBieSBAbWF0aGlhcyAqL1xuaWYgKCFTdHJpbmcuZnJvbUNvZGVQb2ludCkge1xuICAgICAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG4gICAgICAgICAgICAgICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgICAgICAgICAgICAgICB2YXIgZnJvbUNvZGVQb2ludCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIE1BWF9TSVpFID0gMHg0MDAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvZGVVbml0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhpZ2hTdXJyb2dhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbG93U3Vycm9nYXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2RlUG9pbnQgPSBOdW1iZXIoYXJndW1lbnRzW2luZGV4XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAhaXNGaW5pdGUoY29kZVBvaW50KSB8fCAvLyBgTmFOYCwgYCtJbmZpbml0eWAsIG9yIGAtSW5maW5pdHlgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZVBvaW50IDwgMCB8fCAvLyBub3QgYSB2YWxpZCBVbmljb2RlIGNvZGUgcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlUG9pbnQgPiAweDEwRkZGRiB8fCAvLyBub3QgYSB2YWxpZCBVbmljb2RlIGNvZGUgcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbG9vcihjb2RlUG9pbnQpICE9IGNvZGVQb2ludCAvLyBub3QgYW4gaW50ZWdlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBSYW5nZUVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQ6ICcgKyBjb2RlUG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2RlUG9pbnQgPD0gMHhGRkZGKSB7IC8vIEJNUCBjb2RlIHBvaW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZVVuaXRzLnB1c2goY29kZVBvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gQXN0cmFsIGNvZGUgcG9pbnQ7IHNwbGl0IGluIHN1cnJvZ2F0ZSBoYWx2ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nI3N1cnJvZ2F0ZS1mb3JtdWxhZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhpZ2hTdXJyb2dhdGUgPSAoY29kZVBvaW50ID4+IDEwKSArIDB4RDgwMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb3dTdXJyb2dhdGUgPSAoY29kZVBvaW50ICUgMHg0MDApICsgMHhEQzAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVVbml0cy5wdXNoKGhpZ2hTdXJyb2dhdGUsIGxvd1N1cnJvZ2F0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ICsgMSA9PSBsZW5ndGggfHwgY29kZVVuaXRzLmxlbmd0aCA+IE1BWF9TSVpFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZS5hcHBseShudWxsLCBjb2RlVW5pdHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVVbml0cy5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFN0cmluZywgJ2Zyb21Db2RlUG9pbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd2YWx1ZSc6IGZyb21Db2RlUG9pbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjb25maWd1cmFibGUnOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnd3JpdGFibGUnOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgU3RyaW5nLmZyb21Db2RlUG9pbnQgPSBmcm9tQ29kZVBvaW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfSgpKTtcbn1cblxufSkodHlwZW9mIGV4cG9ydHMgPT09IFwidW5kZWZpbmVkXCIgPyBzYXggPSB7fSA6IGV4cG9ydHMpO1xuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzLWFycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbnZhciBrTWF4TGVuZ3RoID0gMHgzZmZmZmZmZlxudmFyIHJvb3RQYXJlbnQgPSB7fVxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBOb3RlOlxuICpcbiAqIC0gSW1wbGVtZW50YXRpb24gbXVzdCBzdXBwb3J0IGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLlxuICogICBGaXJlZm94IDQtMjkgbGFja2VkIHN1cHBvcnQsIGZpeGVkIGluIEZpcmVmb3ggMzArLlxuICogICBTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOC5cbiAqXG4gKiAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAtIElFMTAgaGFzIGEgYnJva2VuIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhcnJheXMgb2ZcbiAqICAgIGluY29ycmVjdCBsZW5ndGggaW4gc29tZSBzaXR1YXRpb25zLlxuICpcbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5IHdpbGxcbiAqIGdldCB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uLCB3aGljaCBpcyBzbG93ZXIgYnV0IHdpbGwgd29yayBjb3JyZWN0bHkuXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gKGZ1bmN0aW9uICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiA0MiA9PT0gYXJyLmZvbygpICYmIC8vIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgJiYgLy8gY2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gICAgICAgIG5ldyBVaW50OEFycmF5KDEpLnN1YmFycmF5KDEsIDEpLmJ5dGVMZW5ndGggPT09IDAgLy8gaWUxMCBoYXMgYnJva2VuIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59KSgpXG5cbi8qKlxuICogQ2xhc3M6IEJ1ZmZlclxuICogPT09PT09PT09PT09PVxuICpcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgYXJlIGF1Z21lbnRlZFxuICogd2l0aCBmdW5jdGlvbiBwcm9wZXJ0aWVzIGZvciBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgQVBJIGZ1bmN0aW9ucy4gV2UgdXNlXG4gKiBgVWludDhBcnJheWAgc28gdGhhdCBzcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdCByZXR1cm5zXG4gKiBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBCeSBhdWdtZW50aW5nIHRoZSBpbnN0YW5jZXMsIHdlIGNhbiBhdm9pZCBtb2RpZnlpbmcgdGhlIGBVaW50OEFycmF5YFxuICogcHJvdG90eXBlLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpXG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybylcblxuICB2YXIgdHlwZSA9IHR5cGVvZiBzdWJqZWN0XG5cbiAgLy8gRmluZCB0aGUgbGVuZ3RoXG4gIHZhciBsZW5ndGhcbiAgaWYgKHR5cGUgPT09ICdudW1iZXInKVxuICAgIGxlbmd0aCA9IHN1YmplY3QgPiAwID8gc3ViamVjdCA+Pj4gMCA6IDBcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBsZW5ndGggPSBCdWZmZXIuYnl0ZUxlbmd0aChzdWJqZWN0LCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JyAmJiBzdWJqZWN0ICE9PSBudWxsKSB7IC8vIGFzc3VtZSBvYmplY3QgaXMgYXJyYXktbGlrZVxuICAgIGlmIChzdWJqZWN0LnR5cGUgPT09ICdCdWZmZXInICYmIGlzQXJyYXkoc3ViamVjdC5kYXRhKSlcbiAgICAgIHN1YmplY3QgPSBzdWJqZWN0LmRhdGFcbiAgICBsZW5ndGggPSArc3ViamVjdC5sZW5ndGggPiAwID8gTWF0aC5mbG9vcigrc3ViamVjdC5sZW5ndGgpIDogMFxuICB9IGVsc2VcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtdXN0IHN0YXJ0IHdpdGggbnVtYmVyLCBidWZmZXIsIGFycmF5IG9yIHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IGtNYXhMZW5ndGgpXG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAnc2l6ZTogMHgnICsga01heExlbmd0aC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcblxuICB2YXIgYnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFByZWZlcnJlZDogUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICBidWYgPSBCdWZmZXIuX2F1Z21lbnQobmV3IFVpbnQ4QXJyYXkobGVuZ3RoKSlcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIFRISVMgaW5zdGFuY2Ugb2YgQnVmZmVyIChjcmVhdGVkIGJ5IGBuZXdgKVxuICAgIGJ1ZiA9IHRoaXNcbiAgICBidWYubGVuZ3RoID0gbGVuZ3RoXG4gICAgYnVmLl9pc0J1ZmZlciA9IHRydWVcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiB0eXBlb2Ygc3ViamVjdC5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgIC8vIFNwZWVkIG9wdGltaXphdGlvbiAtLSB1c2Ugc2V0IGlmIHdlJ3JlIGNvcHlpbmcgZnJvbSBhIHR5cGVkIGFycmF5XG4gICAgYnVmLl9zZXQoc3ViamVjdClcbiAgfSBlbHNlIGlmIChpc0FycmF5aXNoKHN1YmplY3QpKSB7XG4gICAgLy8gVHJlYXQgYXJyYXktaXNoIG9iamVjdHMgYXMgYSBieXRlIGFycmF5XG4gICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSkge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0LnJlYWRVSW50OChpKVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspXG4gICAgICAgIGJ1ZltpXSA9ICgoc3ViamVjdFtpXSAlIDI1NikgKyAyNTYpICUgMjU2XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgYnVmLndyaXRlKHN1YmplY3QsIDAsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmICFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgaWYgKGxlbmd0aCA+IDAgJiYgbGVuZ3RoIDw9IEJ1ZmZlci5wb29sU2l6ZSlcbiAgICBidWYucGFyZW50ID0gcm9vdFBhcmVudFxuXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTbG93QnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IFNsb3dCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybylcblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuICBkZWxldGUgYnVmLnBhcmVudFxuICByZXR1cm4gYnVmXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9IG51bGwgJiYgYi5faXNCdWZmZXIpXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSlcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuICYmIGFbaV0gPT09IGJbaV07IGkrKykge31cbiAgaWYgKGkgIT09IGxlbikge1xuICAgIHggPSBhW2ldXG4gICAgeSA9IGJbaV1cbiAgfVxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gKGxpc3QsIHRvdGFsTGVuZ3RoKSB7XG4gIGlmICghaXNBcnJheShsaXN0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVXNhZ2U6IEJ1ZmZlci5jb25jYXQobGlzdFssIGxlbmd0aF0pJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmICh0b3RhbExlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdG90YWxMZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsTGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodG90YWxMZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAncmF3JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggKiAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoID4+PiAxXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG4vLyBwcmUtc2V0IGZvciB2YWx1ZXMgdGhhdCBtYXkgZXhpc3QgaW4gdGhlIGZ1dHVyZVxuQnVmZmVyLnByb3RvdHlwZS5sZW5ndGggPSB1bmRlZmluZWRcbkJ1ZmZlci5wcm90b3R5cGUucGFyZW50ID0gdW5kZWZpbmVkXG5cbi8vIHRvU3RyaW5nKGVuY29kaW5nLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA9PT0gSW5maW5pdHkgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG4gIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmIChlbmQgPD0gc3RhcnQpIHJldHVybiAnJ1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSlcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KVxuICAgICAgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYnl0ZSA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAoaXNOYU4oYnl0ZSkpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBieXRlXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgsIDIpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBTdXBwb3J0IGJvdGggKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKVxuICAvLyBhbmQgdGhlIGxlZ2FjeSAoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpXG4gIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgaWYgKCFpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2UgeyAgLy8gbGVnYWN5XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoXG4gICAgbGVuZ3RoID0gc3dhcFxuICB9XG5cbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuXG4gIGlmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDAgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpXG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJyk7XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHV0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBiaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW47XG4gICAgaWYgKHN0YXJ0IDwgMClcbiAgICAgIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKVxuICAgICAgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KVxuICAgIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZlxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBuZXdCdWYgPSBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfVxuXG4gIGlmIChuZXdCdWYubGVuZ3RoKVxuICAgIG5ld0J1Zi5wYXJlbnQgPSB0aGlzLnBhcmVudCB8fCB0aGlzXG5cbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bDtcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKVxuICAgIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKVxuICAgIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKVxuICAgIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYnVmZmVyIG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSwgMClcblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpID4+PiAwICYgMHhGRlxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpLCAwKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgPj4+IDAgJiAweEZGXG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0ludCh0aGlzLFxuICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgIG9mZnNldCxcbiAgICAgICAgICAgICBieXRlTGVuZ3RoLFxuICAgICAgICAgICAgIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSkgLSAxLFxuICAgICAgICAgICAgIC1NYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpKVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSW50KHRoaXMsXG4gICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgICAgIGJ5dGVMZW5ndGgsXG4gICAgICAgICAgICAgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKSAtIDEsXG4gICAgICAgICAgICAgLU1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSkpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0X3N0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldF9zdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRfc3RhcnQpIHRhcmdldF9zdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCBzb3VyY2UubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldF9zdGFydCA8IDApXG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHNvdXJjZS5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMDAgfHwgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRfc3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0X3N0YXJ0KVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXZhbHVlKSB2YWx1ZSA9IDBcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kKSBlbmQgPSB0aGlzLmxlbmd0aFxuXG4gIGlmIChlbmQgPCBzdGFydCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCA8IHN0YXJ0JylcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDAgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdlbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gdmFsdWVcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gdXRmOFRvQnl0ZXModmFsdWUudG9TdHJpbmcoKSlcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGBBcnJheUJ1ZmZlcmAgd2l0aCB0aGUgKmNvcGllZCogbWVtb3J5IG9mIHRoZSBidWZmZXIgaW5zdGFuY2UuXG4gKiBBZGRlZCBpbiBOb2RlIDAuMTIuIE9ubHkgYXZhaWxhYmxlIGluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBBcnJheUJ1ZmZlci5cbiAqL1xuQnVmZmVyLnByb3RvdHlwZS50b0FycmF5QnVmZmVyID0gZnVuY3Rpb24gKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIH1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLmNvbnN0cnVjdG9yID0gQnVmZmVyXG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5lcXVhbHMgPSBCUC5lcXVhbHNcbiAgYXJyLmNvbXBhcmUgPSBCUC5jb21wYXJlXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnRMRSA9IEJQLnJlYWRVSW50TEVcbiAgYXJyLnJlYWRVSW50QkUgPSBCUC5yZWFkVUludEJFXG4gIGFyci5yZWFkVUludDggPSBCUC5yZWFkVUludDhcbiAgYXJyLnJlYWRVSW50MTZMRSA9IEJQLnJlYWRVSW50MTZMRVxuICBhcnIucmVhZFVJbnQxNkJFID0gQlAucmVhZFVJbnQxNkJFXG4gIGFyci5yZWFkVUludDMyTEUgPSBCUC5yZWFkVUludDMyTEVcbiAgYXJyLnJlYWRVSW50MzJCRSA9IEJQLnJlYWRVSW50MzJCRVxuICBhcnIucmVhZEludExFID0gQlAucmVhZEludExFXG4gIGFyci5yZWFkSW50QkUgPSBCUC5yZWFkSW50QkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50TEUgPSBCUC53cml0ZVVJbnRMRVxuICBhcnIud3JpdGVVSW50QkUgPSBCUC53cml0ZVVJbnRCRVxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50TEUgPSBCUC53cml0ZUludExFXG4gIGFyci53cml0ZUludEJFID0gQlAud3JpdGVJbnRCRVxuICBhcnIud3JpdGVJbnQ4ID0gQlAud3JpdGVJbnQ4XG4gIGFyci53cml0ZUludDE2TEUgPSBCUC53cml0ZUludDE2TEVcbiAgYXJyLndyaXRlSW50MTZCRSA9IEJQLndyaXRlSW50MTZCRVxuICBhcnIud3JpdGVJbnQzMkxFID0gQlAud3JpdGVJbnQzMkxFXG4gIGFyci53cml0ZUludDMyQkUgPSBCUC53cml0ZUludDMyQkVcbiAgYXJyLndyaXRlRmxvYXRMRSA9IEJQLndyaXRlRmxvYXRMRVxuICBhcnIud3JpdGVGbG9hdEJFID0gQlAud3JpdGVGbG9hdEJFXG4gIGFyci53cml0ZURvdWJsZUxFID0gQlAud3JpdGVEb3VibGVMRVxuICBhcnIud3JpdGVEb3VibGVCRSA9IEJQLndyaXRlRG91YmxlQkVcbiAgYXJyLmZpbGwgPSBCUC5maWxsXG4gIGFyci5pbnNwZWN0ID0gQlAuaW5zcGVjdFxuICBhcnIudG9BcnJheUJ1ZmZlciA9IEJQLnRvQXJyYXlCdWZmZXJcblxuICByZXR1cm4gYXJyXG59XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXitcXC8wLTlBLXpcXC1dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyaW5ndHJpbShzdHIpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzKHN0cmluZywgdW5pdHMpIHtcbiAgdmFyIGNvZGVQb2ludCwgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgYnl0ZXMgPSBbXVxuICB2YXIgaSA9IDBcblxuICBmb3IgKDsgaTxsZW5ndGg7IGkrKykge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcblxuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmIChsZWFkU3Vycm9nYXRlKSB7XG5cbiAgICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBjb2RlUG9pbnQgPSBsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwIHwgMHgxMDAwMFxuICAgICAgICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgIGVsc2Uge1xuXG4gICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgIGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gICAgfVxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9XG4gICAgZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApO1xuICAgIH1cbiAgICBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApO1xuICAgIH1cbiAgICBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDIwMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG5cbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCwgdW5pdFNpemUpIHtcbiAgaWYgKHVuaXRTaXplKSBsZW5ndGggLT0gbGVuZ3RoICUgdW5pdFNpemU7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpXG4gICAgICBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVNfVVJMX1NBRkUgPSAnLScuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0hfVVJMX1NBRkUgPSAnXycuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTIHx8XG5cdFx0ICAgIGNvZGUgPT09IFBMVVNfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIIHx8XG5cdFx0ICAgIGNvZGUgPT09IFNMQVNIX1VSTF9TQUZFKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIG5CaXRzID0gLTcsXG4gICAgICBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDAsXG4gICAgICBkID0gaXNMRSA/IC0xIDogMSxcbiAgICAgIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV07XG5cbiAgaSArPSBkO1xuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBzID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gZUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIGUgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBtTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXM7XG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KTtcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pO1xuICAgIGUgPSBlIC0gZUJpYXM7XG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbik7XG59O1xuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGMsXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApLFxuICAgICAgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpLFxuICAgICAgZCA9IGlzTEUgPyAxIDogLTEsXG4gICAgICBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwO1xuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpO1xuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwO1xuICAgIGUgPSBlTWF4O1xuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKTtcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS07XG4gICAgICBjICo9IDI7XG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcyk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrO1xuICAgICAgYyAvPSAyO1xuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDA7XG4gICAgICBlID0gZU1heDtcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gZSArIGVCaWFzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gMDtcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KTtcblxuICBlID0gKGUgPDwgbUxlbikgfCBtO1xuICBlTGVuICs9IG1MZW47XG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCk7XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4O1xufTtcbiIsIlxuLyoqXG4gKiBpc0FycmF5XG4gKi9cblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIHRvU3RyaW5nXG4gKi9cblxudmFyIHN0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogV2hldGhlciBvciBub3QgdGhlIGdpdmVuIGB2YWxgXG4gKiBpcyBhbiBhcnJheS5cbiAqXG4gKiBleGFtcGxlOlxuICpcbiAqICAgICAgICBpc0FycmF5KFtdKTtcbiAqICAgICAgICAvLyA+IHRydWVcbiAqICAgICAgICBpc0FycmF5KGFyZ3VtZW50cyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICogICAgICAgIGlzQXJyYXkoJycpO1xuICogICAgICAgIC8vID4gZmFsc2VcbiAqXG4gKiBAcGFyYW0ge21peGVkfSB2YWxcbiAqIEByZXR1cm4ge2Jvb2x9XG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBpc0FycmF5IHx8IGZ1bmN0aW9uICh2YWwpIHtcbiAgcmV0dXJuICEhIHZhbCAmJiAnW29iamVjdCBBcnJheV0nID09IHN0ci5jYWxsKHZhbCk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvX3N0cmVhbV9kdXBsZXguanNcIilcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBhIGR1cGxleCBzdHJlYW0gaXMganVzdCBhIHN0cmVhbSB0aGF0IGlzIGJvdGggcmVhZGFibGUgYW5kIHdyaXRhYmxlLlxuLy8gU2luY2UgSlMgZG9lc24ndCBoYXZlIG11bHRpcGxlIHByb3RvdHlwYWwgaW5oZXJpdGFuY2UsIHRoaXMgY2xhc3Ncbi8vIHByb3RvdHlwYWxseSBpbmhlcml0cyBmcm9tIFJlYWRhYmxlLCBhbmQgdGhlbiBwYXJhc2l0aWNhbGx5IGZyb21cbi8vIFdyaXRhYmxlLlxuXG5tb2R1bGUuZXhwb3J0cyA9IER1cGxleDtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSBrZXlzLnB1c2goa2V5KTtcbiAgcmV0dXJuIGtleXM7XG59XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnZhciBSZWFkYWJsZSA9IHJlcXVpcmUoJy4vX3N0cmVhbV9yZWFkYWJsZScpO1xudmFyIFdyaXRhYmxlID0gcmVxdWlyZSgnLi9fc3RyZWFtX3dyaXRhYmxlJyk7XG5cbnV0aWwuaW5oZXJpdHMoRHVwbGV4LCBSZWFkYWJsZSk7XG5cbmZvckVhY2gob2JqZWN0S2V5cyhXcml0YWJsZS5wcm90b3R5cGUpLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgaWYgKCFEdXBsZXgucHJvdG90eXBlW21ldGhvZF0pXG4gICAgRHVwbGV4LnByb3RvdHlwZVttZXRob2RdID0gV3JpdGFibGUucHJvdG90eXBlW21ldGhvZF07XG59KTtcblxuZnVuY3Rpb24gRHVwbGV4KG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIER1cGxleCkpXG4gICAgcmV0dXJuIG5ldyBEdXBsZXgob3B0aW9ucyk7XG5cbiAgUmVhZGFibGUuY2FsbCh0aGlzLCBvcHRpb25zKTtcbiAgV3JpdGFibGUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnJlYWRhYmxlID09PSBmYWxzZSlcbiAgICB0aGlzLnJlYWRhYmxlID0gZmFsc2U7XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy53cml0YWJsZSA9PT0gZmFsc2UpXG4gICAgdGhpcy53cml0YWJsZSA9IGZhbHNlO1xuXG4gIHRoaXMuYWxsb3dIYWxmT3BlbiA9IHRydWU7XG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMuYWxsb3dIYWxmT3BlbiA9PT0gZmFsc2UpXG4gICAgdGhpcy5hbGxvd0hhbGZPcGVuID0gZmFsc2U7XG5cbiAgdGhpcy5vbmNlKCdlbmQnLCBvbmVuZCk7XG59XG5cbi8vIHRoZSBuby1oYWxmLW9wZW4gZW5mb3JjZXJcbmZ1bmN0aW9uIG9uZW5kKCkge1xuICAvLyBpZiB3ZSBhbGxvdyBoYWxmLW9wZW4gc3RhdGUsIG9yIGlmIHRoZSB3cml0YWJsZSBzaWRlIGVuZGVkLFxuICAvLyB0aGVuIHdlJ3JlIG9rLlxuICBpZiAodGhpcy5hbGxvd0hhbGZPcGVuIHx8IHRoaXMuX3dyaXRhYmxlU3RhdGUuZW5kZWQpXG4gICAgcmV0dXJuO1xuXG4gIC8vIG5vIG1vcmUgZGF0YSBjYW4gYmUgd3JpdHRlbi5cbiAgLy8gQnV0IGFsbG93IG1vcmUgd3JpdGVzIHRvIGhhcHBlbiBpbiB0aGlzIHRpY2suXG4gIHByb2Nlc3MubmV4dFRpY2sodGhpcy5lbmQuYmluZCh0aGlzKSk7XG59XG5cbmZ1bmN0aW9uIGZvckVhY2ggKHhzLCBmKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0geHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZih4c1tpXSwgaSk7XG4gIH1cbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBhIHBhc3N0aHJvdWdoIHN0cmVhbS5cbi8vIGJhc2ljYWxseSBqdXN0IHRoZSBtb3N0IG1pbmltYWwgc29ydCBvZiBUcmFuc2Zvcm0gc3RyZWFtLlxuLy8gRXZlcnkgd3JpdHRlbiBjaHVuayBnZXRzIG91dHB1dCBhcy1pcy5cblxubW9kdWxlLmV4cG9ydHMgPSBQYXNzVGhyb3VnaDtcblxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vX3N0cmVhbV90cmFuc2Zvcm0nKTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG51dGlsLmluaGVyaXRzKFBhc3NUaHJvdWdoLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBQYXNzVGhyb3VnaChvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQYXNzVGhyb3VnaCkpXG4gICAgcmV0dXJuIG5ldyBQYXNzVGhyb3VnaChvcHRpb25zKTtcblxuICBUcmFuc2Zvcm0uY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuUGFzc1Rocm91Z2gucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNiKG51bGwsIGNodW5rKTtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFkYWJsZTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuUmVhZGFibGUuUmVhZGFibGVTdGF0ZSA9IFJlYWRhYmxlU3RhdGU7XG5cbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbmlmICghRUUubGlzdGVuZXJDb3VudCkgRUUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJzKHR5cGUpLmxlbmd0aDtcbn07XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnZhciBTdHJpbmdEZWNvZGVyO1xuXG51dGlsLmluaGVyaXRzKFJlYWRhYmxlLCBTdHJlYW0pO1xuXG5mdW5jdGlvbiBSZWFkYWJsZVN0YXRlKG9wdGlvbnMsIHN0cmVhbSkge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyB0aGUgcG9pbnQgYXQgd2hpY2ggaXQgc3RvcHMgY2FsbGluZyBfcmVhZCgpIHRvIGZpbGwgdGhlIGJ1ZmZlclxuICAvLyBOb3RlOiAwIGlzIGEgdmFsaWQgdmFsdWUsIG1lYW5zIFwiZG9uJ3QgY2FsbCBfcmVhZCBwcmVlbXB0aXZlbHkgZXZlclwiXG4gIHZhciBod20gPSBvcHRpb25zLmhpZ2hXYXRlck1hcms7XG4gIHRoaXMuaGlnaFdhdGVyTWFyayA9IChod20gfHwgaHdtID09PSAwKSA/IGh3bSA6IDE2ICogMTAyNDtcblxuICAvLyBjYXN0IHRvIGludHMuXG4gIHRoaXMuaGlnaFdhdGVyTWFyayA9IH5+dGhpcy5oaWdoV2F0ZXJNYXJrO1xuXG4gIHRoaXMuYnVmZmVyID0gW107XG4gIHRoaXMubGVuZ3RoID0gMDtcbiAgdGhpcy5waXBlcyA9IG51bGw7XG4gIHRoaXMucGlwZXNDb3VudCA9IDA7XG4gIHRoaXMuZmxvd2luZyA9IGZhbHNlO1xuICB0aGlzLmVuZGVkID0gZmFsc2U7XG4gIHRoaXMuZW5kRW1pdHRlZCA9IGZhbHNlO1xuICB0aGlzLnJlYWRpbmcgPSBmYWxzZTtcblxuICAvLyBJbiBzdHJlYW1zIHRoYXQgbmV2ZXIgaGF2ZSBhbnkgZGF0YSwgYW5kIGRvIHB1c2gobnVsbCkgcmlnaHQgYXdheSxcbiAgLy8gdGhlIGNvbnN1bWVyIGNhbiBtaXNzIHRoZSAnZW5kJyBldmVudCBpZiB0aGV5IGRvIHNvbWUgSS9PIGJlZm9yZVxuICAvLyBjb25zdW1pbmcgdGhlIHN0cmVhbS4gIFNvLCB3ZSBkb24ndCBlbWl0KCdlbmQnKSB1bnRpbCBzb21lIHJlYWRpbmdcbiAgLy8gaGFwcGVucy5cbiAgdGhpcy5jYWxsZWRSZWFkID0gZmFsc2U7XG5cbiAgLy8gYSBmbGFnIHRvIGJlIGFibGUgdG8gdGVsbCBpZiB0aGUgb253cml0ZSBjYiBpcyBjYWxsZWQgaW1tZWRpYXRlbHksXG4gIC8vIG9yIG9uIGEgbGF0ZXIgdGljay4gIFdlIHNldCB0aGlzIHRvIHRydWUgYXQgZmlyc3QsIGJlY3Vhc2UgYW55XG4gIC8vIGFjdGlvbnMgdGhhdCBzaG91bGRuJ3QgaGFwcGVuIHVudGlsIFwibGF0ZXJcIiBzaG91bGQgZ2VuZXJhbGx5IGFsc29cbiAgLy8gbm90IGhhcHBlbiBiZWZvcmUgdGhlIGZpcnN0IHdyaXRlIGNhbGwuXG4gIHRoaXMuc3luYyA9IHRydWU7XG5cbiAgLy8gd2hlbmV2ZXIgd2UgcmV0dXJuIG51bGwsIHRoZW4gd2Ugc2V0IGEgZmxhZyB0byBzYXlcbiAgLy8gdGhhdCB3ZSdyZSBhd2FpdGluZyBhICdyZWFkYWJsZScgZXZlbnQgZW1pc3Npb24uXG4gIHRoaXMubmVlZFJlYWRhYmxlID0gZmFsc2U7XG4gIHRoaXMuZW1pdHRlZFJlYWRhYmxlID0gZmFsc2U7XG4gIHRoaXMucmVhZGFibGVMaXN0ZW5pbmcgPSBmYWxzZTtcblxuXG4gIC8vIG9iamVjdCBzdHJlYW0gZmxhZy4gVXNlZCB0byBtYWtlIHJlYWQobikgaWdub3JlIG4gYW5kIHRvXG4gIC8vIG1ha2UgYWxsIHRoZSBidWZmZXIgbWVyZ2luZyBhbmQgbGVuZ3RoIGNoZWNrcyBnbyBhd2F5XG4gIHRoaXMub2JqZWN0TW9kZSA9ICEhb3B0aW9ucy5vYmplY3RNb2RlO1xuXG4gIC8vIENyeXB0byBpcyBraW5kIG9mIG9sZCBhbmQgY3J1c3R5LiAgSGlzdG9yaWNhbGx5LCBpdHMgZGVmYXVsdCBzdHJpbmdcbiAgLy8gZW5jb2RpbmcgaXMgJ2JpbmFyeScgc28gd2UgaGF2ZSB0byBtYWtlIHRoaXMgY29uZmlndXJhYmxlLlxuICAvLyBFdmVyeXRoaW5nIGVsc2UgaW4gdGhlIHVuaXZlcnNlIHVzZXMgJ3V0ZjgnLCB0aG91Z2guXG4gIHRoaXMuZGVmYXVsdEVuY29kaW5nID0gb3B0aW9ucy5kZWZhdWx0RW5jb2RpbmcgfHwgJ3V0ZjgnO1xuXG4gIC8vIHdoZW4gcGlwaW5nLCB3ZSBvbmx5IGNhcmUgYWJvdXQgJ3JlYWRhYmxlJyBldmVudHMgdGhhdCBoYXBwZW5cbiAgLy8gYWZ0ZXIgcmVhZCgpaW5nIGFsbCB0aGUgYnl0ZXMgYW5kIG5vdCBnZXR0aW5nIGFueSBwdXNoYmFjay5cbiAgdGhpcy5yYW5PdXQgPSBmYWxzZTtcblxuICAvLyB0aGUgbnVtYmVyIG9mIHdyaXRlcnMgdGhhdCBhcmUgYXdhaXRpbmcgYSBkcmFpbiBldmVudCBpbiAucGlwZSgpc1xuICB0aGlzLmF3YWl0RHJhaW4gPSAwO1xuXG4gIC8vIGlmIHRydWUsIGEgbWF5YmVSZWFkTW9yZSBoYXMgYmVlbiBzY2hlZHVsZWRcbiAgdGhpcy5yZWFkaW5nTW9yZSA9IGZhbHNlO1xuXG4gIHRoaXMuZGVjb2RlciA9IG51bGw7XG4gIHRoaXMuZW5jb2RpbmcgPSBudWxsO1xuICBpZiAob3B0aW9ucy5lbmNvZGluZykge1xuICAgIGlmICghU3RyaW5nRGVjb2RlcilcbiAgICAgIFN0cmluZ0RlY29kZXIgPSByZXF1aXJlKCdzdHJpbmdfZGVjb2Rlci8nKS5TdHJpbmdEZWNvZGVyO1xuICAgIHRoaXMuZGVjb2RlciA9IG5ldyBTdHJpbmdEZWNvZGVyKG9wdGlvbnMuZW5jb2RpbmcpO1xuICAgIHRoaXMuZW5jb2RpbmcgPSBvcHRpb25zLmVuY29kaW5nO1xuICB9XG59XG5cbmZ1bmN0aW9uIFJlYWRhYmxlKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJlYWRhYmxlKSlcbiAgICByZXR1cm4gbmV3IFJlYWRhYmxlKG9wdGlvbnMpO1xuXG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUgPSBuZXcgUmVhZGFibGVTdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyBsZWdhY3lcbiAgdGhpcy5yZWFkYWJsZSA9IHRydWU7XG5cbiAgU3RyZWFtLmNhbGwodGhpcyk7XG59XG5cbi8vIE1hbnVhbGx5IHNob3ZlIHNvbWV0aGluZyBpbnRvIHRoZSByZWFkKCkgYnVmZmVyLlxuLy8gVGhpcyByZXR1cm5zIHRydWUgaWYgdGhlIGhpZ2hXYXRlck1hcmsgaGFzIG5vdCBiZWVuIGhpdCB5ZXQsXG4vLyBzaW1pbGFyIHRvIGhvdyBXcml0YWJsZS53cml0ZSgpIHJldHVybnMgdHJ1ZSBpZiB5b3Ugc2hvdWxkXG4vLyB3cml0ZSgpIHNvbWUgbW9yZS5cblJlYWRhYmxlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG5cbiAgaWYgKHR5cGVvZiBjaHVuayA9PT0gJ3N0cmluZycgJiYgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICBlbmNvZGluZyA9IGVuY29kaW5nIHx8IHN0YXRlLmRlZmF1bHRFbmNvZGluZztcbiAgICBpZiAoZW5jb2RpbmcgIT09IHN0YXRlLmVuY29kaW5nKSB7XG4gICAgICBjaHVuayA9IG5ldyBCdWZmZXIoY2h1bmssIGVuY29kaW5nKTtcbiAgICAgIGVuY29kaW5nID0gJyc7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgZmFsc2UpO1xufTtcblxuLy8gVW5zaGlmdCBzaG91bGQgKmFsd2F5cyogYmUgc29tZXRoaW5nIGRpcmVjdGx5IG91dCBvZiByZWFkKClcblJlYWRhYmxlLnByb3RvdHlwZS51bnNoaWZ0ID0gZnVuY3Rpb24oY2h1bmspIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgcmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCAnJywgdHJ1ZSk7XG59O1xuXG5mdW5jdGlvbiByZWFkYWJsZUFkZENodW5rKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgYWRkVG9Gcm9udCkge1xuICB2YXIgZXIgPSBjaHVua0ludmFsaWQoc3RhdGUsIGNodW5rKTtcbiAgaWYgKGVyKSB7XG4gICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICB9IGVsc2UgaWYgKGNodW5rID09PSBudWxsIHx8IGNodW5rID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGF0ZS5yZWFkaW5nID0gZmFsc2U7XG4gICAgaWYgKCFzdGF0ZS5lbmRlZClcbiAgICAgIG9uRW9mQ2h1bmsoc3RyZWFtLCBzdGF0ZSk7XG4gIH0gZWxzZSBpZiAoc3RhdGUub2JqZWN0TW9kZSB8fCBjaHVuayAmJiBjaHVuay5sZW5ndGggPiAwKSB7XG4gICAgaWYgKHN0YXRlLmVuZGVkICYmICFhZGRUb0Zyb250KSB7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcignc3RyZWFtLnB1c2goKSBhZnRlciBFT0YnKTtcbiAgICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGUpO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUuZW5kRW1pdHRlZCAmJiBhZGRUb0Zyb250KSB7XG4gICAgICB2YXIgZSA9IG5ldyBFcnJvcignc3RyZWFtLnVuc2hpZnQoKSBhZnRlciBlbmQgZXZlbnQnKTtcbiAgICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc3RhdGUuZGVjb2RlciAmJiAhYWRkVG9Gcm9udCAmJiAhZW5jb2RpbmcpXG4gICAgICAgIGNodW5rID0gc3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgYnVmZmVyIGluZm8uXG4gICAgICBzdGF0ZS5sZW5ndGggKz0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG4gICAgICBpZiAoYWRkVG9Gcm9udCkge1xuICAgICAgICBzdGF0ZS5idWZmZXIudW5zaGlmdChjaHVuayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5yZWFkaW5nID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0YXRlLm5lZWRSZWFkYWJsZSlcbiAgICAgICAgZW1pdFJlYWRhYmxlKHN0cmVhbSk7XG5cbiAgICAgIG1heWJlUmVhZE1vcmUoc3RyZWFtLCBzdGF0ZSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKCFhZGRUb0Zyb250KSB7XG4gICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIG5lZWRNb3JlRGF0YShzdGF0ZSk7XG59XG5cblxuXG4vLyBpZiBpdCdzIHBhc3QgdGhlIGhpZ2ggd2F0ZXIgbWFyaywgd2UgY2FuIHB1c2ggaW4gc29tZSBtb3JlLlxuLy8gQWxzbywgaWYgd2UgaGF2ZSBubyBkYXRhIHlldCwgd2UgY2FuIHN0YW5kIHNvbWVcbi8vIG1vcmUgYnl0ZXMuICBUaGlzIGlzIHRvIHdvcmsgYXJvdW5kIGNhc2VzIHdoZXJlIGh3bT0wLFxuLy8gc3VjaCBhcyB0aGUgcmVwbC4gIEFsc28sIGlmIHRoZSBwdXNoKCkgdHJpZ2dlcmVkIGFcbi8vIHJlYWRhYmxlIGV2ZW50LCBhbmQgdGhlIHVzZXIgY2FsbGVkIHJlYWQobGFyZ2VOdW1iZXIpIHN1Y2ggdGhhdFxuLy8gbmVlZFJlYWRhYmxlIHdhcyBzZXQsIHRoZW4gd2Ugb3VnaHQgdG8gcHVzaCBtb3JlLCBzbyB0aGF0IGFub3RoZXJcbi8vICdyZWFkYWJsZScgZXZlbnQgd2lsbCBiZSB0cmlnZ2VyZWQuXG5mdW5jdGlvbiBuZWVkTW9yZURhdGEoc3RhdGUpIHtcbiAgcmV0dXJuICFzdGF0ZS5lbmRlZCAmJlxuICAgICAgICAgKHN0YXRlLm5lZWRSZWFkYWJsZSB8fFxuICAgICAgICAgIHN0YXRlLmxlbmd0aCA8IHN0YXRlLmhpZ2hXYXRlck1hcmsgfHxcbiAgICAgICAgICBzdGF0ZS5sZW5ndGggPT09IDApO1xufVxuXG4vLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cblJlYWRhYmxlLnByb3RvdHlwZS5zZXRFbmNvZGluZyA9IGZ1bmN0aW9uKGVuYykge1xuICBpZiAoIVN0cmluZ0RlY29kZXIpXG4gICAgU3RyaW5nRGVjb2RlciA9IHJlcXVpcmUoJ3N0cmluZ19kZWNvZGVyLycpLlN0cmluZ0RlY29kZXI7XG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUuZGVjb2RlciA9IG5ldyBTdHJpbmdEZWNvZGVyKGVuYyk7XG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUuZW5jb2RpbmcgPSBlbmM7XG59O1xuXG4vLyBEb24ndCByYWlzZSB0aGUgaHdtID4gMTI4TUJcbnZhciBNQVhfSFdNID0gMHg4MDAwMDA7XG5mdW5jdGlvbiByb3VuZFVwVG9OZXh0UG93ZXJPZjIobikge1xuICBpZiAobiA+PSBNQVhfSFdNKSB7XG4gICAgbiA9IE1BWF9IV007XG4gIH0gZWxzZSB7XG4gICAgLy8gR2V0IHRoZSBuZXh0IGhpZ2hlc3QgcG93ZXIgb2YgMlxuICAgIG4tLTtcbiAgICBmb3IgKHZhciBwID0gMTsgcCA8IDMyOyBwIDw8PSAxKSBuIHw9IG4gPj4gcDtcbiAgICBuKys7XG4gIH1cbiAgcmV0dXJuIG47XG59XG5cbmZ1bmN0aW9uIGhvd011Y2hUb1JlYWQobiwgc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCAmJiBzdGF0ZS5lbmRlZClcbiAgICByZXR1cm4gMDtcblxuICBpZiAoc3RhdGUub2JqZWN0TW9kZSlcbiAgICByZXR1cm4gbiA9PT0gMCA/IDAgOiAxO1xuXG4gIGlmIChuID09PSBudWxsIHx8IGlzTmFOKG4pKSB7XG4gICAgLy8gb25seSBmbG93IG9uZSBidWZmZXIgYXQgYSB0aW1lXG4gICAgaWYgKHN0YXRlLmZsb3dpbmcgJiYgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICAgIHJldHVybiBzdGF0ZS5idWZmZXJbMF0ubGVuZ3RoO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBzdGF0ZS5sZW5ndGg7XG4gIH1cblxuICBpZiAobiA8PSAwKVxuICAgIHJldHVybiAwO1xuXG4gIC8vIElmIHdlJ3JlIGFza2luZyBmb3IgbW9yZSB0aGFuIHRoZSB0YXJnZXQgYnVmZmVyIGxldmVsLFxuICAvLyB0aGVuIHJhaXNlIHRoZSB3YXRlciBtYXJrLiAgQnVtcCB1cCB0byB0aGUgbmV4dCBoaWdoZXN0XG4gIC8vIHBvd2VyIG9mIDIsIHRvIHByZXZlbnQgaW5jcmVhc2luZyBpdCBleGNlc3NpdmVseSBpbiB0aW55XG4gIC8vIGFtb3VudHMuXG4gIGlmIChuID4gc3RhdGUuaGlnaFdhdGVyTWFyaylcbiAgICBzdGF0ZS5oaWdoV2F0ZXJNYXJrID0gcm91bmRVcFRvTmV4dFBvd2VyT2YyKG4pO1xuXG4gIC8vIGRvbid0IGhhdmUgdGhhdCBtdWNoLiAgcmV0dXJuIG51bGwsIHVubGVzcyB3ZSd2ZSBlbmRlZC5cbiAgaWYgKG4gPiBzdGF0ZS5sZW5ndGgpIHtcbiAgICBpZiAoIXN0YXRlLmVuZGVkKSB7XG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgICAgcmV0dXJuIDA7XG4gICAgfSBlbHNlXG4gICAgICByZXR1cm4gc3RhdGUubGVuZ3RoO1xuICB9XG5cbiAgcmV0dXJuIG47XG59XG5cbi8vIHlvdSBjYW4gb3ZlcnJpZGUgZWl0aGVyIHRoaXMgbWV0aG9kLCBvciB0aGUgYXN5bmMgX3JlYWQobikgYmVsb3cuXG5SZWFkYWJsZS5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgc3RhdGUuY2FsbGVkUmVhZCA9IHRydWU7XG4gIHZhciBuT3JpZyA9IG47XG4gIHZhciByZXQ7XG5cbiAgaWYgKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCBuID4gMClcbiAgICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSBmYWxzZTtcblxuICAvLyBpZiB3ZSdyZSBkb2luZyByZWFkKDApIHRvIHRyaWdnZXIgYSByZWFkYWJsZSBldmVudCwgYnV0IHdlXG4gIC8vIGFscmVhZHkgaGF2ZSBhIGJ1bmNoIG9mIGRhdGEgaW4gdGhlIGJ1ZmZlciwgdGhlbiBqdXN0IHRyaWdnZXJcbiAgLy8gdGhlICdyZWFkYWJsZScgZXZlbnQgYW5kIG1vdmUgb24uXG4gIGlmIChuID09PSAwICYmXG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgJiZcbiAgICAgIChzdGF0ZS5sZW5ndGggPj0gc3RhdGUuaGlnaFdhdGVyTWFyayB8fCBzdGF0ZS5lbmRlZCkpIHtcbiAgICBlbWl0UmVhZGFibGUodGhpcyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBuID0gaG93TXVjaFRvUmVhZChuLCBzdGF0ZSk7XG5cbiAgLy8gaWYgd2UndmUgZW5kZWQsIGFuZCB3ZSdyZSBub3cgY2xlYXIsIHRoZW4gZmluaXNoIGl0IHVwLlxuICBpZiAobiA9PT0gMCAmJiBzdGF0ZS5lbmRlZCkge1xuICAgIHJldCA9IG51bGw7XG5cbiAgICAvLyBJbiBjYXNlcyB3aGVyZSB0aGUgZGVjb2RlciBkaWQgbm90IHJlY2VpdmUgZW5vdWdoIGRhdGFcbiAgICAvLyB0byBwcm9kdWNlIGEgZnVsbCBjaHVuaywgdGhlbiBpbW1lZGlhdGVseSByZWNlaXZlZCBhblxuICAgIC8vIEVPRiwgc3RhdGUuYnVmZmVyIHdpbGwgY29udGFpbiBbPEJ1ZmZlciA+LCA8QnVmZmVyIDAwIC4uLj5dLlxuICAgIC8vIGhvd011Y2hUb1JlYWQgd2lsbCBzZWUgdGhpcyBhbmQgY29lcmNlIHRoZSBhbW91bnQgdG9cbiAgICAvLyByZWFkIHRvIHplcm8gKGJlY2F1c2UgaXQncyBsb29raW5nIGF0IHRoZSBsZW5ndGggb2YgdGhlXG4gICAgLy8gZmlyc3QgPEJ1ZmZlciA+IGluIHN0YXRlLmJ1ZmZlciksIGFuZCB3ZSdsbCBlbmQgdXAgaGVyZS5cbiAgICAvL1xuICAgIC8vIFRoaXMgY2FuIG9ubHkgaGFwcGVuIHZpYSBzdGF0ZS5kZWNvZGVyIC0tIG5vIG90aGVyIHZlbnVlXG4gICAgLy8gZXhpc3RzIGZvciBwdXNoaW5nIGEgemVyby1sZW5ndGggY2h1bmsgaW50byBzdGF0ZS5idWZmZXJcbiAgICAvLyBhbmQgdHJpZ2dlcmluZyB0aGlzIGJlaGF2aW9yLiBJbiB0aGlzIGNhc2UsIHdlIHJldHVybiBvdXJcbiAgICAvLyByZW1haW5pbmcgZGF0YSBhbmQgZW5kIHRoZSBzdHJlYW0sIGlmIGFwcHJvcHJpYXRlLlxuICAgIGlmIChzdGF0ZS5sZW5ndGggPiAwICYmIHN0YXRlLmRlY29kZXIpIHtcbiAgICAgIHJldCA9IGZyb21MaXN0KG4sIHN0YXRlKTtcbiAgICAgIHN0YXRlLmxlbmd0aCAtPSByZXQubGVuZ3RoO1xuICAgIH1cblxuICAgIGlmIChzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgICBlbmRSZWFkYWJsZSh0aGlzKTtcblxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBBbGwgdGhlIGFjdHVhbCBjaHVuayBnZW5lcmF0aW9uIGxvZ2ljIG5lZWRzIHRvIGJlXG4gIC8vICpiZWxvdyogdGhlIGNhbGwgdG8gX3JlYWQuICBUaGUgcmVhc29uIGlzIHRoYXQgaW4gY2VydGFpblxuICAvLyBzeW50aGV0aWMgc3RyZWFtIGNhc2VzLCBzdWNoIGFzIHBhc3N0aHJvdWdoIHN0cmVhbXMsIF9yZWFkXG4gIC8vIG1heSBiZSBhIGNvbXBsZXRlbHkgc3luY2hyb25vdXMgb3BlcmF0aW9uIHdoaWNoIG1heSBjaGFuZ2VcbiAgLy8gdGhlIHN0YXRlIG9mIHRoZSByZWFkIGJ1ZmZlciwgcHJvdmlkaW5nIGVub3VnaCBkYXRhIHdoZW5cbiAgLy8gYmVmb3JlIHRoZXJlIHdhcyAqbm90KiBlbm91Z2guXG4gIC8vXG4gIC8vIFNvLCB0aGUgc3RlcHMgYXJlOlxuICAvLyAxLiBGaWd1cmUgb3V0IHdoYXQgdGhlIHN0YXRlIG9mIHRoaW5ncyB3aWxsIGJlIGFmdGVyIHdlIGRvXG4gIC8vIGEgcmVhZCBmcm9tIHRoZSBidWZmZXIuXG4gIC8vXG4gIC8vIDIuIElmIHRoYXQgcmVzdWx0aW5nIHN0YXRlIHdpbGwgdHJpZ2dlciBhIF9yZWFkLCB0aGVuIGNhbGwgX3JlYWQuXG4gIC8vIE5vdGUgdGhhdCB0aGlzIG1heSBiZSBhc3luY2hyb25vdXMsIG9yIHN5bmNocm9ub3VzLiAgWWVzLCBpdCBpc1xuICAvLyBkZWVwbHkgdWdseSB0byB3cml0ZSBBUElzIHRoaXMgd2F5LCBidXQgdGhhdCBzdGlsbCBkb2Vzbid0IG1lYW5cbiAgLy8gdGhhdCB0aGUgUmVhZGFibGUgY2xhc3Mgc2hvdWxkIGJlaGF2ZSBpbXByb3Blcmx5LCBhcyBzdHJlYW1zIGFyZVxuICAvLyBkZXNpZ25lZCB0byBiZSBzeW5jL2FzeW5jIGFnbm9zdGljLlxuICAvLyBUYWtlIG5vdGUgaWYgdGhlIF9yZWFkIGNhbGwgaXMgc3luYyBvciBhc3luYyAoaWUsIGlmIHRoZSByZWFkIGNhbGxcbiAgLy8gaGFzIHJldHVybmVkIHlldCksIHNvIHRoYXQgd2Uga25vdyB3aGV0aGVyIG9yIG5vdCBpdCdzIHNhZmUgdG8gZW1pdFxuICAvLyAncmVhZGFibGUnIGV0Yy5cbiAgLy9cbiAgLy8gMy4gQWN0dWFsbHkgcHVsbCB0aGUgcmVxdWVzdGVkIGNodW5rcyBvdXQgb2YgdGhlIGJ1ZmZlciBhbmQgcmV0dXJuLlxuXG4gIC8vIGlmIHdlIG5lZWQgYSByZWFkYWJsZSBldmVudCwgdGhlbiB3ZSBuZWVkIHRvIGRvIHNvbWUgcmVhZGluZy5cbiAgdmFyIGRvUmVhZCA9IHN0YXRlLm5lZWRSZWFkYWJsZTtcblxuICAvLyBpZiB3ZSBjdXJyZW50bHkgaGF2ZSBsZXNzIHRoYW4gdGhlIGhpZ2hXYXRlck1hcmssIHRoZW4gYWxzbyByZWFkIHNvbWVcbiAgaWYgKHN0YXRlLmxlbmd0aCAtIG4gPD0gc3RhdGUuaGlnaFdhdGVyTWFyaylcbiAgICBkb1JlYWQgPSB0cnVlO1xuXG4gIC8vIGhvd2V2ZXIsIGlmIHdlJ3ZlIGVuZGVkLCB0aGVuIHRoZXJlJ3Mgbm8gcG9pbnQsIGFuZCBpZiB3ZSdyZSBhbHJlYWR5XG4gIC8vIHJlYWRpbmcsIHRoZW4gaXQncyB1bm5lY2Vzc2FyeS5cbiAgaWYgKHN0YXRlLmVuZGVkIHx8IHN0YXRlLnJlYWRpbmcpXG4gICAgZG9SZWFkID0gZmFsc2U7XG5cbiAgaWYgKGRvUmVhZCkge1xuICAgIHN0YXRlLnJlYWRpbmcgPSB0cnVlO1xuICAgIHN0YXRlLnN5bmMgPSB0cnVlO1xuICAgIC8vIGlmIHRoZSBsZW5ndGggaXMgY3VycmVudGx5IHplcm8sIHRoZW4gd2UgKm5lZWQqIGEgcmVhZGFibGUgZXZlbnQuXG4gICAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMClcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgLy8gY2FsbCBpbnRlcm5hbCByZWFkIG1ldGhvZFxuICAgIHRoaXMuX3JlYWQoc3RhdGUuaGlnaFdhdGVyTWFyayk7XG4gICAgc3RhdGUuc3luYyA9IGZhbHNlO1xuICB9XG5cbiAgLy8gSWYgX3JlYWQgY2FsbGVkIGl0cyBjYWxsYmFjayBzeW5jaHJvbm91c2x5LCB0aGVuIGByZWFkaW5nYFxuICAvLyB3aWxsIGJlIGZhbHNlLCBhbmQgd2UgbmVlZCB0byByZS1ldmFsdWF0ZSBob3cgbXVjaCBkYXRhIHdlXG4gIC8vIGNhbiByZXR1cm4gdG8gdGhlIHVzZXIuXG4gIGlmIChkb1JlYWQgJiYgIXN0YXRlLnJlYWRpbmcpXG4gICAgbiA9IGhvd011Y2hUb1JlYWQobk9yaWcsIHN0YXRlKTtcblxuICBpZiAobiA+IDApXG4gICAgcmV0ID0gZnJvbUxpc3Qobiwgc3RhdGUpO1xuICBlbHNlXG4gICAgcmV0ID0gbnVsbDtcblxuICBpZiAocmV0ID09PSBudWxsKSB7XG4gICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICBuID0gMDtcbiAgfVxuXG4gIHN0YXRlLmxlbmd0aCAtPSBuO1xuXG4gIC8vIElmIHdlIGhhdmUgbm90aGluZyBpbiB0aGUgYnVmZmVyLCB0aGVuIHdlIHdhbnQgdG8ga25vd1xuICAvLyBhcyBzb29uIGFzIHdlICpkbyogZ2V0IHNvbWV0aGluZyBpbnRvIHRoZSBidWZmZXIuXG4gIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgJiYgIXN0YXRlLmVuZGVkKVxuICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG5cbiAgLy8gSWYgd2UgaGFwcGVuZWQgdG8gcmVhZCgpIGV4YWN0bHkgdGhlIHJlbWFpbmluZyBhbW91bnQgaW4gdGhlXG4gIC8vIGJ1ZmZlciwgYW5kIHRoZSBFT0YgaGFzIGJlZW4gc2VlbiBhdCB0aGlzIHBvaW50LCB0aGVuIG1ha2Ugc3VyZVxuICAvLyB0aGF0IHdlIGVtaXQgJ2VuZCcgb24gdGhlIHZlcnkgbmV4dCB0aWNrLlxuICBpZiAoc3RhdGUuZW5kZWQgJiYgIXN0YXRlLmVuZEVtaXR0ZWQgJiYgc3RhdGUubGVuZ3RoID09PSAwKVxuICAgIGVuZFJlYWRhYmxlKHRoaXMpO1xuXG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBjaHVua0ludmFsaWQoc3RhdGUsIGNodW5rKSB7XG4gIHZhciBlciA9IG51bGw7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGNodW5rKSAmJlxuICAgICAgJ3N0cmluZycgIT09IHR5cGVvZiBjaHVuayAmJlxuICAgICAgY2h1bmsgIT09IG51bGwgJiZcbiAgICAgIGNodW5rICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICFzdGF0ZS5vYmplY3RNb2RlKSB7XG4gICAgZXIgPSBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIG5vbi1zdHJpbmcvYnVmZmVyIGNodW5rJyk7XG4gIH1cbiAgcmV0dXJuIGVyO1xufVxuXG5cbmZ1bmN0aW9uIG9uRW9mQ2h1bmsoc3RyZWFtLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUuZGVjb2RlciAmJiAhc3RhdGUuZW5kZWQpIHtcbiAgICB2YXIgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLmVuZCgpO1xuICAgIGlmIChjaHVuayAmJiBjaHVuay5sZW5ndGgpIHtcbiAgICAgIHN0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtcbiAgICAgIHN0YXRlLmxlbmd0aCArPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcbiAgICB9XG4gIH1cbiAgc3RhdGUuZW5kZWQgPSB0cnVlO1xuXG4gIC8vIGlmIHdlJ3ZlIGVuZGVkIGFuZCB3ZSBoYXZlIHNvbWUgZGF0YSBsZWZ0LCB0aGVuIGVtaXRcbiAgLy8gJ3JlYWRhYmxlJyBub3cgdG8gbWFrZSBzdXJlIGl0IGdldHMgcGlja2VkIHVwLlxuICBpZiAoc3RhdGUubGVuZ3RoID4gMClcbiAgICBlbWl0UmVhZGFibGUoc3RyZWFtKTtcbiAgZWxzZVxuICAgIGVuZFJlYWRhYmxlKHN0cmVhbSk7XG59XG5cbi8vIERvbid0IGVtaXQgcmVhZGFibGUgcmlnaHQgYXdheSBpbiBzeW5jIG1vZGUsIGJlY2F1c2UgdGhpcyBjYW4gdHJpZ2dlclxuLy8gYW5vdGhlciByZWFkKCkgY2FsbCA9PiBzdGFjayBvdmVyZmxvdy4gIFRoaXMgd2F5LCBpdCBtaWdodCB0cmlnZ2VyXG4vLyBhIG5leHRUaWNrIHJlY3Vyc2lvbiB3YXJuaW5nLCBidXQgdGhhdCdzIG5vdCBzbyBiYWQuXG5mdW5jdGlvbiBlbWl0UmVhZGFibGUoc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgc3RhdGUubmVlZFJlYWRhYmxlID0gZmFsc2U7XG4gIGlmIChzdGF0ZS5lbWl0dGVkUmVhZGFibGUpXG4gICAgcmV0dXJuO1xuXG4gIHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSA9IHRydWU7XG4gIGlmIChzdGF0ZS5zeW5jKVxuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0UmVhZGFibGVfKHN0cmVhbSk7XG4gICAgfSk7XG4gIGVsc2VcbiAgICBlbWl0UmVhZGFibGVfKHN0cmVhbSk7XG59XG5cbmZ1bmN0aW9uIGVtaXRSZWFkYWJsZV8oc3RyZWFtKSB7XG4gIHN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xufVxuXG5cbi8vIGF0IHRoaXMgcG9pbnQsIHRoZSB1c2VyIGhhcyBwcmVzdW1hYmx5IHNlZW4gdGhlICdyZWFkYWJsZScgZXZlbnQsXG4vLyBhbmQgY2FsbGVkIHJlYWQoKSB0byBjb25zdW1lIHNvbWUgZGF0YS4gIHRoYXQgbWF5IGhhdmUgdHJpZ2dlcmVkXG4vLyBpbiB0dXJuIGFub3RoZXIgX3JlYWQobikgY2FsbCwgaW4gd2hpY2ggY2FzZSByZWFkaW5nID0gdHJ1ZSBpZlxuLy8gaXQncyBpbiBwcm9ncmVzcy5cbi8vIEhvd2V2ZXIsIGlmIHdlJ3JlIG5vdCBlbmRlZCwgb3IgcmVhZGluZywgYW5kIHRoZSBsZW5ndGggPCBod20sXG4vLyB0aGVuIGdvIGFoZWFkIGFuZCB0cnkgdG8gcmVhZCBzb21lIG1vcmUgcHJlZW1wdGl2ZWx5LlxuZnVuY3Rpb24gbWF5YmVSZWFkTW9yZShzdHJlYW0sIHN0YXRlKSB7XG4gIGlmICghc3RhdGUucmVhZGluZ01vcmUpIHtcbiAgICBzdGF0ZS5yZWFkaW5nTW9yZSA9IHRydWU7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIG1heWJlUmVhZE1vcmVfKHN0cmVhbSwgc3RhdGUpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1heWJlUmVhZE1vcmVfKHN0cmVhbSwgc3RhdGUpIHtcbiAgdmFyIGxlbiA9IHN0YXRlLmxlbmd0aDtcbiAgd2hpbGUgKCFzdGF0ZS5yZWFkaW5nICYmICFzdGF0ZS5mbG93aW5nICYmICFzdGF0ZS5lbmRlZCAmJlxuICAgICAgICAgc3RhdGUubGVuZ3RoIDwgc3RhdGUuaGlnaFdhdGVyTWFyaykge1xuICAgIHN0cmVhbS5yZWFkKDApO1xuICAgIGlmIChsZW4gPT09IHN0YXRlLmxlbmd0aClcbiAgICAgIC8vIGRpZG4ndCBnZXQgYW55IGRhdGEsIHN0b3Agc3Bpbm5pbmcuXG4gICAgICBicmVhaztcbiAgICBlbHNlXG4gICAgICBsZW4gPSBzdGF0ZS5sZW5ndGg7XG4gIH1cbiAgc3RhdGUucmVhZGluZ01vcmUgPSBmYWxzZTtcbn1cblxuLy8gYWJzdHJhY3QgbWV0aG9kLiAgdG8gYmUgb3ZlcnJpZGRlbiBpbiBzcGVjaWZpYyBpbXBsZW1lbnRhdGlvbiBjbGFzc2VzLlxuLy8gY2FsbCBjYihlciwgZGF0YSkgd2hlcmUgZGF0YSBpcyA8PSBuIGluIGxlbmd0aC5cbi8vIGZvciB2aXJ0dWFsIChub24tc3RyaW5nLCBub24tYnVmZmVyKSBzdHJlYW1zLCBcImxlbmd0aFwiIGlzIHNvbWV3aGF0XG4vLyBhcmJpdHJhcnksIGFuZCBwZXJoYXBzIG5vdCB2ZXJ5IG1lYW5pbmdmdWwuXG5SZWFkYWJsZS5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpKTtcbn07XG5cblJlYWRhYmxlLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24oZGVzdCwgcGlwZU9wdHMpIHtcbiAgdmFyIHNyYyA9IHRoaXM7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG5cbiAgc3dpdGNoIChzdGF0ZS5waXBlc0NvdW50KSB7XG4gICAgY2FzZSAwOlxuICAgICAgc3RhdGUucGlwZXMgPSBkZXN0O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAxOlxuICAgICAgc3RhdGUucGlwZXMgPSBbc3RhdGUucGlwZXMsIGRlc3RdO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHN0YXRlLnBpcGVzLnB1c2goZGVzdCk7XG4gICAgICBicmVhaztcbiAgfVxuICBzdGF0ZS5waXBlc0NvdW50ICs9IDE7XG5cbiAgdmFyIGRvRW5kID0gKCFwaXBlT3B0cyB8fCBwaXBlT3B0cy5lbmQgIT09IGZhbHNlKSAmJlxuICAgICAgICAgICAgICBkZXN0ICE9PSBwcm9jZXNzLnN0ZG91dCAmJlxuICAgICAgICAgICAgICBkZXN0ICE9PSBwcm9jZXNzLnN0ZGVycjtcblxuICB2YXIgZW5kRm4gPSBkb0VuZCA/IG9uZW5kIDogY2xlYW51cDtcbiAgaWYgKHN0YXRlLmVuZEVtaXR0ZWQpXG4gICAgcHJvY2Vzcy5uZXh0VGljayhlbmRGbik7XG4gIGVsc2VcbiAgICBzcmMub25jZSgnZW5kJywgZW5kRm4pO1xuXG4gIGRlc3Qub24oJ3VucGlwZScsIG9udW5waXBlKTtcbiAgZnVuY3Rpb24gb251bnBpcGUocmVhZGFibGUpIHtcbiAgICBpZiAocmVhZGFibGUgIT09IHNyYykgcmV0dXJuO1xuICAgIGNsZWFudXAoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uZW5kKCkge1xuICAgIGRlc3QuZW5kKCk7XG4gIH1cblxuICAvLyB3aGVuIHRoZSBkZXN0IGRyYWlucywgaXQgcmVkdWNlcyB0aGUgYXdhaXREcmFpbiBjb3VudGVyXG4gIC8vIG9uIHRoZSBzb3VyY2UuICBUaGlzIHdvdWxkIGJlIG1vcmUgZWxlZ2FudCB3aXRoIGEgLm9uY2UoKVxuICAvLyBoYW5kbGVyIGluIGZsb3coKSwgYnV0IGFkZGluZyBhbmQgcmVtb3ZpbmcgcmVwZWF0ZWRseSBpc1xuICAvLyB0b28gc2xvdy5cbiAgdmFyIG9uZHJhaW4gPSBwaXBlT25EcmFpbihzcmMpO1xuICBkZXN0Lm9uKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgLy8gY2xlYW51cCBldmVudCBoYW5kbGVycyBvbmNlIHRoZSBwaXBlIGlzIGJyb2tlblxuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZmluaXNoJywgb25maW5pc2gpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2RyYWluJywgb25kcmFpbik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbmVycm9yKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCd1bnBpcGUnLCBvbnVucGlwZSk7XG4gICAgc3JjLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBvbmVuZCk7XG4gICAgc3JjLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBjbGVhbnVwKTtcblxuICAgIC8vIGlmIHRoZSByZWFkZXIgaXMgd2FpdGluZyBmb3IgYSBkcmFpbiBldmVudCBmcm9tIHRoaXNcbiAgICAvLyBzcGVjaWZpYyB3cml0ZXIsIHRoZW4gaXQgd291bGQgY2F1c2UgaXQgdG8gbmV2ZXIgc3RhcnRcbiAgICAvLyBmbG93aW5nIGFnYWluLlxuICAgIC8vIFNvLCBpZiB0aGlzIGlzIGF3YWl0aW5nIGEgZHJhaW4sIHRoZW4gd2UganVzdCBjYWxsIGl0IG5vdy5cbiAgICAvLyBJZiB3ZSBkb24ndCBrbm93LCB0aGVuIGFzc3VtZSB0aGF0IHdlIGFyZSB3YWl0aW5nIGZvciBvbmUuXG4gICAgaWYgKCFkZXN0Ll93cml0YWJsZVN0YXRlIHx8IGRlc3QuX3dyaXRhYmxlU3RhdGUubmVlZERyYWluKVxuICAgICAgb25kcmFpbigpO1xuICB9XG5cbiAgLy8gaWYgdGhlIGRlc3QgaGFzIGFuIGVycm9yLCB0aGVuIHN0b3AgcGlwaW5nIGludG8gaXQuXG4gIC8vIGhvd2V2ZXIsIGRvbid0IHN1cHByZXNzIHRoZSB0aHJvd2luZyBiZWhhdmlvciBmb3IgdGhpcy5cbiAgZnVuY3Rpb24gb25lcnJvcihlcikge1xuICAgIHVucGlwZSgpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgaWYgKEVFLmxpc3RlbmVyQ291bnQoZGVzdCwgJ2Vycm9yJykgPT09IDApXG4gICAgICBkZXN0LmVtaXQoJ2Vycm9yJywgZXIpO1xuICB9XG4gIC8vIFRoaXMgaXMgYSBicnV0YWxseSB1Z2x5IGhhY2sgdG8gbWFrZSBzdXJlIHRoYXQgb3VyIGVycm9yIGhhbmRsZXJcbiAgLy8gaXMgYXR0YWNoZWQgYmVmb3JlIGFueSB1c2VybGFuZCBvbmVzLiAgTkVWRVIgRE8gVEhJUy5cbiAgaWYgKCFkZXN0Ll9ldmVudHMgfHwgIWRlc3QuX2V2ZW50cy5lcnJvcilcbiAgICBkZXN0Lm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuICBlbHNlIGlmIChpc0FycmF5KGRlc3QuX2V2ZW50cy5lcnJvcikpXG4gICAgZGVzdC5fZXZlbnRzLmVycm9yLnVuc2hpZnQob25lcnJvcik7XG4gIGVsc2VcbiAgICBkZXN0Ll9ldmVudHMuZXJyb3IgPSBbb25lcnJvciwgZGVzdC5fZXZlbnRzLmVycm9yXTtcblxuXG5cbiAgLy8gQm90aCBjbG9zZSBhbmQgZmluaXNoIHNob3VsZCB0cmlnZ2VyIHVucGlwZSwgYnV0IG9ubHkgb25jZS5cbiAgZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG4gICAgdW5waXBlKCk7XG4gIH1cbiAgZGVzdC5vbmNlKCdjbG9zZScsIG9uY2xvc2UpO1xuICBmdW5jdGlvbiBvbmZpbmlzaCgpIHtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuICAgIHVucGlwZSgpO1xuICB9XG4gIGRlc3Qub25jZSgnZmluaXNoJywgb25maW5pc2gpO1xuXG4gIGZ1bmN0aW9uIHVucGlwZSgpIHtcbiAgICBzcmMudW5waXBlKGRlc3QpO1xuICB9XG5cbiAgLy8gdGVsbCB0aGUgZGVzdCB0aGF0IGl0J3MgYmVpbmcgcGlwZWQgdG9cbiAgZGVzdC5lbWl0KCdwaXBlJywgc3JjKTtcblxuICAvLyBzdGFydCB0aGUgZmxvdyBpZiBpdCBoYXNuJ3QgYmVlbiBzdGFydGVkIGFscmVhZHkuXG4gIGlmICghc3RhdGUuZmxvd2luZykge1xuICAgIC8vIHRoZSBoYW5kbGVyIHRoYXQgd2FpdHMgZm9yIHJlYWRhYmxlIGV2ZW50cyBhZnRlciBhbGxcbiAgICAvLyB0aGUgZGF0YSBnZXRzIHN1Y2tlZCBvdXQgaW4gZmxvdy5cbiAgICAvLyBUaGlzIHdvdWxkIGJlIGVhc2llciB0byBmb2xsb3cgd2l0aCBhIC5vbmNlKCkgaGFuZGxlclxuICAgIC8vIGluIGZsb3coKSwgYnV0IHRoYXQgaXMgdG9vIHNsb3cuXG4gICAgdGhpcy5vbigncmVhZGFibGUnLCBwaXBlT25SZWFkYWJsZSk7XG5cbiAgICBzdGF0ZS5mbG93aW5nID0gdHJ1ZTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgZmxvdyhzcmMpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGRlc3Q7XG59O1xuXG5mdW5jdGlvbiBwaXBlT25EcmFpbihzcmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBkZXN0ID0gdGhpcztcbiAgICB2YXIgc3RhdGUgPSBzcmMuX3JlYWRhYmxlU3RhdGU7XG4gICAgc3RhdGUuYXdhaXREcmFpbi0tO1xuICAgIGlmIChzdGF0ZS5hd2FpdERyYWluID09PSAwKVxuICAgICAgZmxvdyhzcmMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBmbG93KHNyYykge1xuICB2YXIgc3RhdGUgPSBzcmMuX3JlYWRhYmxlU3RhdGU7XG4gIHZhciBjaHVuaztcbiAgc3RhdGUuYXdhaXREcmFpbiA9IDA7XG5cbiAgZnVuY3Rpb24gd3JpdGUoZGVzdCwgaSwgbGlzdCkge1xuICAgIHZhciB3cml0dGVuID0gZGVzdC53cml0ZShjaHVuayk7XG4gICAgaWYgKGZhbHNlID09PSB3cml0dGVuKSB7XG4gICAgICBzdGF0ZS5hd2FpdERyYWluKys7XG4gICAgfVxuICB9XG5cbiAgd2hpbGUgKHN0YXRlLnBpcGVzQ291bnQgJiYgbnVsbCAhPT0gKGNodW5rID0gc3JjLnJlYWQoKSkpIHtcblxuICAgIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAxKVxuICAgICAgd3JpdGUoc3RhdGUucGlwZXMsIDAsIG51bGwpO1xuICAgIGVsc2VcbiAgICAgIGZvckVhY2goc3RhdGUucGlwZXMsIHdyaXRlKTtcblxuICAgIHNyYy5lbWl0KCdkYXRhJywgY2h1bmspO1xuXG4gICAgLy8gaWYgYW55b25lIG5lZWRzIGEgZHJhaW4sIHRoZW4gd2UgaGF2ZSB0byB3YWl0IGZvciB0aGF0LlxuICAgIGlmIChzdGF0ZS5hd2FpdERyYWluID4gMClcbiAgICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGlmIGV2ZXJ5IGRlc3RpbmF0aW9uIHdhcyB1bnBpcGVkLCBlaXRoZXIgYmVmb3JlIGVudGVyaW5nIHRoaXNcbiAgLy8gZnVuY3Rpb24sIG9yIGluIHRoZSB3aGlsZSBsb29wLCB0aGVuIHN0b3AgZmxvd2luZy5cbiAgLy9cbiAgLy8gTkI6IFRoaXMgaXMgYSBwcmV0dHkgcmFyZSBlZGdlIGNhc2UuXG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAwKSB7XG4gICAgc3RhdGUuZmxvd2luZyA9IGZhbHNlO1xuXG4gICAgLy8gaWYgdGhlcmUgd2VyZSBkYXRhIGV2ZW50IGxpc3RlbmVycyBhZGRlZCwgdGhlbiBzd2l0Y2ggdG8gb2xkIG1vZGUuXG4gICAgaWYgKEVFLmxpc3RlbmVyQ291bnQoc3JjLCAnZGF0YScpID4gMClcbiAgICAgIGVtaXREYXRhRXZlbnRzKHNyYyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gYXQgdGhpcyBwb2ludCwgbm8gb25lIG5lZWRlZCBhIGRyYWluLCBzbyB3ZSBqdXN0IHJhbiBvdXQgb2YgZGF0YVxuICAvLyBvbiB0aGUgbmV4dCByZWFkYWJsZSBldmVudCwgc3RhcnQgaXQgb3ZlciBhZ2Fpbi5cbiAgc3RhdGUucmFuT3V0ID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcGlwZU9uUmVhZGFibGUoKSB7XG4gIGlmICh0aGlzLl9yZWFkYWJsZVN0YXRlLnJhbk91dCkge1xuICAgIHRoaXMuX3JlYWRhYmxlU3RhdGUucmFuT3V0ID0gZmFsc2U7XG4gICAgZmxvdyh0aGlzKTtcbiAgfVxufVxuXG5cblJlYWRhYmxlLnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbihkZXN0KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG5cbiAgLy8gaWYgd2UncmUgbm90IHBpcGluZyBhbnl3aGVyZSwgdGhlbiBkbyBub3RoaW5nLlxuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMClcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBqdXN0IG9uZSBkZXN0aW5hdGlvbi4gIG1vc3QgY29tbW9uIGNhc2UuXG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAxKSB7XG4gICAgLy8gcGFzc2VkIGluIG9uZSwgYnV0IGl0J3Mgbm90IHRoZSByaWdodCBvbmUuXG4gICAgaWYgKGRlc3QgJiYgZGVzdCAhPT0gc3RhdGUucGlwZXMpXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmICghZGVzdClcbiAgICAgIGRlc3QgPSBzdGF0ZS5waXBlcztcblxuICAgIC8vIGdvdCBhIG1hdGNoLlxuICAgIHN0YXRlLnBpcGVzID0gbnVsbDtcbiAgICBzdGF0ZS5waXBlc0NvdW50ID0gMDtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdyZWFkYWJsZScsIHBpcGVPblJlYWRhYmxlKTtcbiAgICBzdGF0ZS5mbG93aW5nID0gZmFsc2U7XG4gICAgaWYgKGRlc3QpXG4gICAgICBkZXN0LmVtaXQoJ3VucGlwZScsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc2xvdyBjYXNlLiBtdWx0aXBsZSBwaXBlIGRlc3RpbmF0aW9ucy5cblxuICBpZiAoIWRlc3QpIHtcbiAgICAvLyByZW1vdmUgYWxsLlxuICAgIHZhciBkZXN0cyA9IHN0YXRlLnBpcGVzO1xuICAgIHZhciBsZW4gPSBzdGF0ZS5waXBlc0NvdW50O1xuICAgIHN0YXRlLnBpcGVzID0gbnVsbDtcbiAgICBzdGF0ZS5waXBlc0NvdW50ID0gMDtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdyZWFkYWJsZScsIHBpcGVPblJlYWRhYmxlKTtcbiAgICBzdGF0ZS5mbG93aW5nID0gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgZGVzdHNbaV0uZW1pdCgndW5waXBlJywgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyB0cnkgdG8gZmluZCB0aGUgcmlnaHQgb25lLlxuICB2YXIgaSA9IGluZGV4T2Yoc3RhdGUucGlwZXMsIGRlc3QpO1xuICBpZiAoaSA9PT0gLTEpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgc3RhdGUucGlwZXMuc3BsaWNlKGksIDEpO1xuICBzdGF0ZS5waXBlc0NvdW50IC09IDE7XG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAxKVxuICAgIHN0YXRlLnBpcGVzID0gc3RhdGUucGlwZXNbMF07XG5cbiAgZGVzdC5lbWl0KCd1bnBpcGUnLCB0aGlzKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIHNldCB1cCBkYXRhIGV2ZW50cyBpZiB0aGV5IGFyZSBhc2tlZCBmb3Jcbi8vIEVuc3VyZSByZWFkYWJsZSBsaXN0ZW5lcnMgZXZlbnR1YWxseSBnZXQgc29tZXRoaW5nXG5SZWFkYWJsZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldiwgZm4pIHtcbiAgdmFyIHJlcyA9IFN0cmVhbS5wcm90b3R5cGUub24uY2FsbCh0aGlzLCBldiwgZm4pO1xuXG4gIGlmIChldiA9PT0gJ2RhdGEnICYmICF0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmcpXG4gICAgZW1pdERhdGFFdmVudHModGhpcyk7XG5cbiAgaWYgKGV2ID09PSAncmVhZGFibGUnICYmIHRoaXMucmVhZGFibGUpIHtcbiAgICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICAgIGlmICghc3RhdGUucmVhZGFibGVMaXN0ZW5pbmcpIHtcbiAgICAgIHN0YXRlLnJlYWRhYmxlTGlzdGVuaW5nID0gdHJ1ZTtcbiAgICAgIHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICAgIGlmICghc3RhdGUucmVhZGluZykge1xuICAgICAgICB0aGlzLnJlYWQoMCk7XG4gICAgICB9IGVsc2UgaWYgKHN0YXRlLmxlbmd0aCkge1xuICAgICAgICBlbWl0UmVhZGFibGUodGhpcywgc3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXM7XG59O1xuUmVhZGFibGUucHJvdG90eXBlLmFkZExpc3RlbmVyID0gUmVhZGFibGUucHJvdG90eXBlLm9uO1xuXG4vLyBwYXVzZSgpIGFuZCByZXN1bWUoKSBhcmUgcmVtbmFudHMgb2YgdGhlIGxlZ2FjeSByZWFkYWJsZSBzdHJlYW0gQVBJXG4vLyBJZiB0aGUgdXNlciB1c2VzIHRoZW0sIHRoZW4gc3dpdGNoIGludG8gb2xkIG1vZGUuXG5SZWFkYWJsZS5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24oKSB7XG4gIGVtaXREYXRhRXZlbnRzKHRoaXMpO1xuICB0aGlzLnJlYWQoMCk7XG4gIHRoaXMuZW1pdCgncmVzdW1lJyk7XG59O1xuXG5SZWFkYWJsZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgZW1pdERhdGFFdmVudHModGhpcywgdHJ1ZSk7XG4gIHRoaXMuZW1pdCgncGF1c2UnKTtcbn07XG5cbmZ1bmN0aW9uIGVtaXREYXRhRXZlbnRzKHN0cmVhbSwgc3RhcnRQYXVzZWQpIHtcbiAgdmFyIHN0YXRlID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuXG4gIGlmIChzdGF0ZS5mbG93aW5nKSB7XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2lzYWFjcy9yZWFkYWJsZS1zdHJlYW0vaXNzdWVzLzE2XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgc3dpdGNoIHRvIG9sZCBtb2RlIG5vdy4nKTtcbiAgfVxuXG4gIHZhciBwYXVzZWQgPSBzdGFydFBhdXNlZCB8fCBmYWxzZTtcbiAgdmFyIHJlYWRhYmxlID0gZmFsc2U7XG5cbiAgLy8gY29udmVydCB0byBhbiBvbGQtc3R5bGUgc3RyZWFtLlxuICBzdHJlYW0ucmVhZGFibGUgPSB0cnVlO1xuICBzdHJlYW0ucGlwZSA9IFN0cmVhbS5wcm90b3R5cGUucGlwZTtcbiAgc3RyZWFtLm9uID0gc3RyZWFtLmFkZExpc3RlbmVyID0gU3RyZWFtLnByb3RvdHlwZS5vbjtcblxuICBzdHJlYW0ub24oJ3JlYWRhYmxlJywgZnVuY3Rpb24oKSB7XG4gICAgcmVhZGFibGUgPSB0cnVlO1xuXG4gICAgdmFyIGM7XG4gICAgd2hpbGUgKCFwYXVzZWQgJiYgKG51bGwgIT09IChjID0gc3RyZWFtLnJlYWQoKSkpKVxuICAgICAgc3RyZWFtLmVtaXQoJ2RhdGEnLCBjKTtcblxuICAgIGlmIChjID09PSBudWxsKSB7XG4gICAgICByZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgc3RyZWFtLl9yZWFkYWJsZVN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgfVxuICB9KTtcblxuICBzdHJlYW0ucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBwYXVzZWQgPSB0cnVlO1xuICAgIHRoaXMuZW1pdCgncGF1c2UnKTtcbiAgfTtcblxuICBzdHJlYW0ucmVzdW1lID0gZnVuY3Rpb24oKSB7XG4gICAgcGF1c2VkID0gZmFsc2U7XG4gICAgaWYgKHJlYWRhYmxlKVxuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgc3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG4gICAgICB9KTtcbiAgICBlbHNlXG4gICAgICB0aGlzLnJlYWQoMCk7XG4gICAgdGhpcy5lbWl0KCdyZXN1bWUnKTtcbiAgfTtcblxuICAvLyBub3cgbWFrZSBpdCBzdGFydCwganVzdCBpbiBjYXNlIGl0IGhhZG4ndCBhbHJlYWR5LlxuICBzdHJlYW0uZW1pdCgncmVhZGFibGUnKTtcbn1cblxuLy8gd3JhcCBhbiBvbGQtc3R5bGUgc3RyZWFtIGFzIHRoZSBhc3luYyBkYXRhIHNvdXJjZS5cbi8vIFRoaXMgaXMgKm5vdCogcGFydCBvZiB0aGUgcmVhZGFibGUgc3RyZWFtIGludGVyZmFjZS5cbi8vIEl0IGlzIGFuIHVnbHkgdW5mb3J0dW5hdGUgbWVzcyBvZiBoaXN0b3J5LlxuUmVhZGFibGUucHJvdG90eXBlLndyYXAgPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIHBhdXNlZCA9IGZhbHNlO1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgc3RyZWFtLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcbiAgICBpZiAoc3RhdGUuZGVjb2RlciAmJiAhc3RhdGUuZW5kZWQpIHtcbiAgICAgIHZhciBjaHVuayA9IHN0YXRlLmRlY29kZXIuZW5kKCk7XG4gICAgICBpZiAoY2h1bmsgJiYgY2h1bmsubGVuZ3RoKVxuICAgICAgICBzZWxmLnB1c2goY2h1bmspO1xuICAgIH1cblxuICAgIHNlbGYucHVzaChudWxsKTtcbiAgfSk7XG5cbiAgc3RyZWFtLm9uKCdkYXRhJywgZnVuY3Rpb24oY2h1bmspIHtcbiAgICBpZiAoc3RhdGUuZGVjb2RlcilcbiAgICAgIGNodW5rID0gc3RhdGUuZGVjb2Rlci53cml0ZShjaHVuayk7XG5cbiAgICAvLyBkb24ndCBza2lwIG92ZXIgZmFsc3kgdmFsdWVzIGluIG9iamVjdE1vZGVcbiAgICAvL2lmIChzdGF0ZS5vYmplY3RNb2RlICYmIHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoY2h1bmspKVxuICAgIGlmIChzdGF0ZS5vYmplY3RNb2RlICYmIChjaHVuayA9PT0gbnVsbCB8fCBjaHVuayA9PT0gdW5kZWZpbmVkKSlcbiAgICAgIHJldHVybjtcbiAgICBlbHNlIGlmICghc3RhdGUub2JqZWN0TW9kZSAmJiAoIWNodW5rIHx8ICFjaHVuay5sZW5ndGgpKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdmFyIHJldCA9IHNlbGYucHVzaChjaHVuayk7XG4gICAgaWYgKCFyZXQpIHtcbiAgICAgIHBhdXNlZCA9IHRydWU7XG4gICAgICBzdHJlYW0ucGF1c2UoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHByb3h5IGFsbCB0aGUgb3RoZXIgbWV0aG9kcy5cbiAgLy8gaW1wb3J0YW50IHdoZW4gd3JhcHBpbmcgZmlsdGVycyBhbmQgZHVwbGV4ZXMuXG4gIGZvciAodmFyIGkgaW4gc3RyZWFtKSB7XG4gICAgaWYgKHR5cGVvZiBzdHJlYW1baV0gPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgdHlwZW9mIHRoaXNbaV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzW2ldID0gZnVuY3Rpb24obWV0aG9kKSB7IHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhbVttZXRob2RdLmFwcGx5KHN0cmVhbSwgYXJndW1lbnRzKTtcbiAgICAgIH19KGkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIHByb3h5IGNlcnRhaW4gaW1wb3J0YW50IGV2ZW50cy5cbiAgdmFyIGV2ZW50cyA9IFsnZXJyb3InLCAnY2xvc2UnLCAnZGVzdHJveScsICdwYXVzZScsICdyZXN1bWUnXTtcbiAgZm9yRWFjaChldmVudHMsIGZ1bmN0aW9uKGV2KSB7XG4gICAgc3RyZWFtLm9uKGV2LCBzZWxmLmVtaXQuYmluZChzZWxmLCBldikpO1xuICB9KTtcblxuICAvLyB3aGVuIHdlIHRyeSB0byBjb25zdW1lIHNvbWUgbW9yZSBieXRlcywgc2ltcGx5IHVucGF1c2UgdGhlXG4gIC8vIHVuZGVybHlpbmcgc3RyZWFtLlxuICBzZWxmLl9yZWFkID0gZnVuY3Rpb24obikge1xuICAgIGlmIChwYXVzZWQpIHtcbiAgICAgIHBhdXNlZCA9IGZhbHNlO1xuICAgICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn07XG5cblxuXG4vLyBleHBvc2VkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkuXG5SZWFkYWJsZS5fZnJvbUxpc3QgPSBmcm9tTGlzdDtcblxuLy8gUGx1Y2sgb2ZmIG4gYnl0ZXMgZnJvbSBhbiBhcnJheSBvZiBidWZmZXJzLlxuLy8gTGVuZ3RoIGlzIHRoZSBjb21iaW5lZCBsZW5ndGhzIG9mIGFsbCB0aGUgYnVmZmVycyBpbiB0aGUgbGlzdC5cbmZ1bmN0aW9uIGZyb21MaXN0KG4sIHN0YXRlKSB7XG4gIHZhciBsaXN0ID0gc3RhdGUuYnVmZmVyO1xuICB2YXIgbGVuZ3RoID0gc3RhdGUubGVuZ3RoO1xuICB2YXIgc3RyaW5nTW9kZSA9ICEhc3RhdGUuZGVjb2RlcjtcbiAgdmFyIG9iamVjdE1vZGUgPSAhIXN0YXRlLm9iamVjdE1vZGU7XG4gIHZhciByZXQ7XG5cbiAgLy8gbm90aGluZyBpbiB0aGUgbGlzdCwgZGVmaW5pdGVseSBlbXB0eS5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKVxuICAgIHJldHVybiBudWxsO1xuXG4gIGlmIChsZW5ndGggPT09IDApXG4gICAgcmV0ID0gbnVsbDtcbiAgZWxzZSBpZiAob2JqZWN0TW9kZSlcbiAgICByZXQgPSBsaXN0LnNoaWZ0KCk7XG4gIGVsc2UgaWYgKCFuIHx8IG4gPj0gbGVuZ3RoKSB7XG4gICAgLy8gcmVhZCBpdCBhbGwsIHRydW5jYXRlIHRoZSBhcnJheS5cbiAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgIHJldCA9IGxpc3Quam9pbignJyk7XG4gICAgZWxzZVxuICAgICAgcmV0ID0gQnVmZmVyLmNvbmNhdChsaXN0LCBsZW5ndGgpO1xuICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgfSBlbHNlIHtcbiAgICAvLyByZWFkIGp1c3Qgc29tZSBvZiBpdC5cbiAgICBpZiAobiA8IGxpc3RbMF0ubGVuZ3RoKSB7XG4gICAgICAvLyBqdXN0IHRha2UgYSBwYXJ0IG9mIHRoZSBmaXJzdCBsaXN0IGl0ZW0uXG4gICAgICAvLyBzbGljZSBpcyB0aGUgc2FtZSBmb3IgYnVmZmVycyBhbmQgc3RyaW5ncy5cbiAgICAgIHZhciBidWYgPSBsaXN0WzBdO1xuICAgICAgcmV0ID0gYnVmLnNsaWNlKDAsIG4pO1xuICAgICAgbGlzdFswXSA9IGJ1Zi5zbGljZShuKTtcbiAgICB9IGVsc2UgaWYgKG4gPT09IGxpc3RbMF0ubGVuZ3RoKSB7XG4gICAgICAvLyBmaXJzdCBsaXN0IGlzIGEgcGVyZmVjdCBtYXRjaFxuICAgICAgcmV0ID0gbGlzdC5zaGlmdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb21wbGV4IGNhc2UuXG4gICAgICAvLyB3ZSBoYXZlIGVub3VnaCB0byBjb3ZlciBpdCwgYnV0IGl0IHNwYW5zIHBhc3QgdGhlIGZpcnN0IGJ1ZmZlci5cbiAgICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgICByZXQgPSAnJztcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0ID0gbmV3IEJ1ZmZlcihuKTtcblxuICAgICAgdmFyIGMgPSAwO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0Lmxlbmd0aDsgaSA8IGwgJiYgYyA8IG47IGkrKykge1xuICAgICAgICB2YXIgYnVmID0gbGlzdFswXTtcbiAgICAgICAgdmFyIGNweSA9IE1hdGgubWluKG4gLSBjLCBidWYubGVuZ3RoKTtcblxuICAgICAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgICAgICByZXQgKz0gYnVmLnNsaWNlKDAsIGNweSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBidWYuY29weShyZXQsIGMsIDAsIGNweSk7XG5cbiAgICAgICAgaWYgKGNweSA8IGJ1Zi5sZW5ndGgpXG4gICAgICAgICAgbGlzdFswXSA9IGJ1Zi5zbGljZShjcHkpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgbGlzdC5zaGlmdCgpO1xuXG4gICAgICAgIGMgKz0gY3B5O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGVuZFJlYWRhYmxlKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG5cbiAgLy8gSWYgd2UgZ2V0IGhlcmUgYmVmb3JlIGNvbnN1bWluZyBhbGwgdGhlIGJ5dGVzLCB0aGVuIHRoYXQgaXMgYVxuICAvLyBidWcgaW4gbm9kZS4gIFNob3VsZCBuZXZlciBoYXBwZW4uXG4gIGlmIChzdGF0ZS5sZW5ndGggPiAwKVxuICAgIHRocm93IG5ldyBFcnJvcignZW5kUmVhZGFibGUgY2FsbGVkIG9uIG5vbi1lbXB0eSBzdHJlYW0nKTtcblxuICBpZiAoIXN0YXRlLmVuZEVtaXR0ZWQgJiYgc3RhdGUuY2FsbGVkUmVhZCkge1xuICAgIHN0YXRlLmVuZGVkID0gdHJ1ZTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgLy8gQ2hlY2sgdGhhdCB3ZSBkaWRuJ3QgZ2V0IG9uZSBsYXN0IHVuc2hpZnQuXG4gICAgICBpZiAoIXN0YXRlLmVuZEVtaXR0ZWQgJiYgc3RhdGUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHN0YXRlLmVuZEVtaXR0ZWQgPSB0cnVlO1xuICAgICAgICBzdHJlYW0ucmVhZGFibGUgPSBmYWxzZTtcbiAgICAgICAgc3RyZWFtLmVtaXQoJ2VuZCcpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZvckVhY2ggKHhzLCBmKSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0geHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgZih4c1tpXSwgaSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5kZXhPZiAoeHMsIHgpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoeHNbaV0gPT09IHgpIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5cbi8vIGEgdHJhbnNmb3JtIHN0cmVhbSBpcyBhIHJlYWRhYmxlL3dyaXRhYmxlIHN0cmVhbSB3aGVyZSB5b3UgZG9cbi8vIHNvbWV0aGluZyB3aXRoIHRoZSBkYXRhLiAgU29tZXRpbWVzIGl0J3MgY2FsbGVkIGEgXCJmaWx0ZXJcIixcbi8vIGJ1dCB0aGF0J3Mgbm90IGEgZ3JlYXQgbmFtZSBmb3IgaXQsIHNpbmNlIHRoYXQgaW1wbGllcyBhIHRoaW5nIHdoZXJlXG4vLyBzb21lIGJpdHMgcGFzcyB0aHJvdWdoLCBhbmQgb3RoZXJzIGFyZSBzaW1wbHkgaWdub3JlZC4gIChUaGF0IHdvdWxkXG4vLyBiZSBhIHZhbGlkIGV4YW1wbGUgb2YgYSB0cmFuc2Zvcm0sIG9mIGNvdXJzZS4pXG4vL1xuLy8gV2hpbGUgdGhlIG91dHB1dCBpcyBjYXVzYWxseSByZWxhdGVkIHRvIHRoZSBpbnB1dCwgaXQncyBub3QgYVxuLy8gbmVjZXNzYXJpbHkgc3ltbWV0cmljIG9yIHN5bmNocm9ub3VzIHRyYW5zZm9ybWF0aW9uLiAgRm9yIGV4YW1wbGUsXG4vLyBhIHpsaWIgc3RyZWFtIG1pZ2h0IHRha2UgbXVsdGlwbGUgcGxhaW4tdGV4dCB3cml0ZXMoKSwgYW5kIHRoZW5cbi8vIGVtaXQgYSBzaW5nbGUgY29tcHJlc3NlZCBjaHVuayBzb21lIHRpbWUgaW4gdGhlIGZ1dHVyZS5cbi8vXG4vLyBIZXJlJ3MgaG93IHRoaXMgd29ya3M6XG4vL1xuLy8gVGhlIFRyYW5zZm9ybSBzdHJlYW0gaGFzIGFsbCB0aGUgYXNwZWN0cyBvZiB0aGUgcmVhZGFibGUgYW5kIHdyaXRhYmxlXG4vLyBzdHJlYW0gY2xhc3Nlcy4gIFdoZW4geW91IHdyaXRlKGNodW5rKSwgdGhhdCBjYWxscyBfd3JpdGUoY2h1bmssY2IpXG4vLyBpbnRlcm5hbGx5LCBhbmQgcmV0dXJucyBmYWxzZSBpZiB0aGVyZSdzIGEgbG90IG9mIHBlbmRpbmcgd3JpdGVzXG4vLyBidWZmZXJlZCB1cC4gIFdoZW4geW91IGNhbGwgcmVhZCgpLCB0aGF0IGNhbGxzIF9yZWFkKG4pIHVudGlsXG4vLyB0aGVyZSdzIGVub3VnaCBwZW5kaW5nIHJlYWRhYmxlIGRhdGEgYnVmZmVyZWQgdXAuXG4vL1xuLy8gSW4gYSB0cmFuc2Zvcm0gc3RyZWFtLCB0aGUgd3JpdHRlbiBkYXRhIGlzIHBsYWNlZCBpbiBhIGJ1ZmZlci4gIFdoZW5cbi8vIF9yZWFkKG4pIGlzIGNhbGxlZCwgaXQgdHJhbnNmb3JtcyB0aGUgcXVldWVkIHVwIGRhdGEsIGNhbGxpbmcgdGhlXG4vLyBidWZmZXJlZCBfd3JpdGUgY2IncyBhcyBpdCBjb25zdW1lcyBjaHVua3MuICBJZiBjb25zdW1pbmcgYSBzaW5nbGVcbi8vIHdyaXR0ZW4gY2h1bmsgd291bGQgcmVzdWx0IGluIG11bHRpcGxlIG91dHB1dCBjaHVua3MsIHRoZW4gdGhlIGZpcnN0XG4vLyBvdXRwdXR0ZWQgYml0IGNhbGxzIHRoZSByZWFkY2IsIGFuZCBzdWJzZXF1ZW50IGNodW5rcyBqdXN0IGdvIGludG9cbi8vIHRoZSByZWFkIGJ1ZmZlciwgYW5kIHdpbGwgY2F1c2UgaXQgdG8gZW1pdCAncmVhZGFibGUnIGlmIG5lY2Vzc2FyeS5cbi8vXG4vLyBUaGlzIHdheSwgYmFjay1wcmVzc3VyZSBpcyBhY3R1YWxseSBkZXRlcm1pbmVkIGJ5IHRoZSByZWFkaW5nIHNpZGUsXG4vLyBzaW5jZSBfcmVhZCBoYXMgdG8gYmUgY2FsbGVkIHRvIHN0YXJ0IHByb2Nlc3NpbmcgYSBuZXcgY2h1bmsuICBIb3dldmVyLFxuLy8gYSBwYXRob2xvZ2ljYWwgaW5mbGF0ZSB0eXBlIG9mIHRyYW5zZm9ybSBjYW4gY2F1c2UgZXhjZXNzaXZlIGJ1ZmZlcmluZ1xuLy8gaGVyZS4gIEZvciBleGFtcGxlLCBpbWFnaW5lIGEgc3RyZWFtIHdoZXJlIGV2ZXJ5IGJ5dGUgb2YgaW5wdXQgaXNcbi8vIGludGVycHJldGVkIGFzIGFuIGludGVnZXIgZnJvbSAwLTI1NSwgYW5kIHRoZW4gcmVzdWx0cyBpbiB0aGF0IG1hbnlcbi8vIGJ5dGVzIG9mIG91dHB1dC4gIFdyaXRpbmcgdGhlIDQgYnl0ZXMge2ZmLGZmLGZmLGZmfSB3b3VsZCByZXN1bHQgaW5cbi8vIDFrYiBvZiBkYXRhIGJlaW5nIG91dHB1dC4gIEluIHRoaXMgY2FzZSwgeW91IGNvdWxkIHdyaXRlIGEgdmVyeSBzbWFsbFxuLy8gYW1vdW50IG9mIGlucHV0LCBhbmQgZW5kIHVwIHdpdGggYSB2ZXJ5IGxhcmdlIGFtb3VudCBvZiBvdXRwdXQuICBJblxuLy8gc3VjaCBhIHBhdGhvbG9naWNhbCBpbmZsYXRpbmcgbWVjaGFuaXNtLCB0aGVyZSdkIGJlIG5vIHdheSB0byB0ZWxsXG4vLyB0aGUgc3lzdGVtIHRvIHN0b3AgZG9pbmcgdGhlIHRyYW5zZm9ybS4gIEEgc2luZ2xlIDRNQiB3cml0ZSBjb3VsZFxuLy8gY2F1c2UgdGhlIHN5c3RlbSB0byBydW4gb3V0IG9mIG1lbW9yeS5cbi8vXG4vLyBIb3dldmVyLCBldmVuIGluIHN1Y2ggYSBwYXRob2xvZ2ljYWwgY2FzZSwgb25seSBhIHNpbmdsZSB3cml0dGVuIGNodW5rXG4vLyB3b3VsZCBiZSBjb25zdW1lZCwgYW5kIHRoZW4gdGhlIHJlc3Qgd291bGQgd2FpdCAodW4tdHJhbnNmb3JtZWQpIHVudGlsXG4vLyB0aGUgcmVzdWx0cyBvZiB0aGUgcHJldmlvdXMgdHJhbnNmb3JtZWQgY2h1bmsgd2VyZSBjb25zdW1lZC5cblxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2Zvcm07XG5cbnZhciBEdXBsZXggPSByZXF1aXJlKCcuL19zdHJlYW1fZHVwbGV4Jyk7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudXRpbC5pbmhlcml0cyhUcmFuc2Zvcm0sIER1cGxleCk7XG5cblxuZnVuY3Rpb24gVHJhbnNmb3JtU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIHRoaXMuYWZ0ZXJUcmFuc2Zvcm0gPSBmdW5jdGlvbihlciwgZGF0YSkge1xuICAgIHJldHVybiBhZnRlclRyYW5zZm9ybShzdHJlYW0sIGVyLCBkYXRhKTtcbiAgfTtcblxuICB0aGlzLm5lZWRUcmFuc2Zvcm0gPSBmYWxzZTtcbiAgdGhpcy50cmFuc2Zvcm1pbmcgPSBmYWxzZTtcbiAgdGhpcy53cml0ZWNiID0gbnVsbDtcbiAgdGhpcy53cml0ZWNodW5rID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gYWZ0ZXJUcmFuc2Zvcm0oc3RyZWFtLCBlciwgZGF0YSkge1xuICB2YXIgdHMgPSBzdHJlYW0uX3RyYW5zZm9ybVN0YXRlO1xuICB0cy50cmFuc2Zvcm1pbmcgPSBmYWxzZTtcblxuICB2YXIgY2IgPSB0cy53cml0ZWNiO1xuXG4gIGlmICghY2IpXG4gICAgcmV0dXJuIHN0cmVhbS5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignbm8gd3JpdGVjYiBpbiBUcmFuc2Zvcm0gY2xhc3MnKSk7XG5cbiAgdHMud3JpdGVjaHVuayA9IG51bGw7XG4gIHRzLndyaXRlY2IgPSBudWxsO1xuXG4gIGlmIChkYXRhICE9PSBudWxsICYmIGRhdGEgIT09IHVuZGVmaW5lZClcbiAgICBzdHJlYW0ucHVzaChkYXRhKTtcblxuICBpZiAoY2IpXG4gICAgY2IoZXIpO1xuXG4gIHZhciBycyA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgcnMucmVhZGluZyA9IGZhbHNlO1xuICBpZiAocnMubmVlZFJlYWRhYmxlIHx8IHJzLmxlbmd0aCA8IHJzLmhpZ2hXYXRlck1hcmspIHtcbiAgICBzdHJlYW0uX3JlYWQocnMuaGlnaFdhdGVyTWFyayk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBUcmFuc2Zvcm0ob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVHJhbnNmb3JtKSlcbiAgICByZXR1cm4gbmV3IFRyYW5zZm9ybShvcHRpb25zKTtcblxuICBEdXBsZXguY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZSA9IG5ldyBUcmFuc2Zvcm1TdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyB3aGVuIHRoZSB3cml0YWJsZSBzaWRlIGZpbmlzaGVzLCB0aGVuIGZsdXNoIG91dCBhbnl0aGluZyByZW1haW5pbmcuXG4gIHZhciBzdHJlYW0gPSB0aGlzO1xuXG4gIC8vIHN0YXJ0IG91dCBhc2tpbmcgZm9yIGEgcmVhZGFibGUgZXZlbnQgb25jZSBkYXRhIGlzIHRyYW5zZm9ybWVkLlxuICB0aGlzLl9yZWFkYWJsZVN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG5cbiAgLy8gd2UgaGF2ZSBpbXBsZW1lbnRlZCB0aGUgX3JlYWQgbWV0aG9kLCBhbmQgZG9uZSB0aGUgb3RoZXIgdGhpbmdzXG4gIC8vIHRoYXQgUmVhZGFibGUgd2FudHMgYmVmb3JlIHRoZSBmaXJzdCBfcmVhZCBjYWxsLCBzbyB1bnNldCB0aGVcbiAgLy8gc3luYyBndWFyZCBmbGFnLlxuICB0aGlzLl9yZWFkYWJsZVN0YXRlLnN5bmMgPSBmYWxzZTtcblxuICB0aGlzLm9uY2UoJ2ZpbmlzaCcsIGZ1bmN0aW9uKCkge1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5fZmx1c2gpXG4gICAgICB0aGlzLl9mbHVzaChmdW5jdGlvbihlcikge1xuICAgICAgICBkb25lKHN0cmVhbSwgZXIpO1xuICAgICAgfSk7XG4gICAgZWxzZVxuICAgICAgZG9uZShzdHJlYW0pO1xuICB9KTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nKSB7XG4gIHRoaXMuX3RyYW5zZm9ybVN0YXRlLm5lZWRUcmFuc2Zvcm0gPSBmYWxzZTtcbiAgcmV0dXJuIER1cGxleC5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIGNodW5rLCBlbmNvZGluZyk7XG59O1xuXG4vLyBUaGlzIGlzIHRoZSBwYXJ0IHdoZXJlIHlvdSBkbyBzdHVmZiFcbi8vIG92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gaW4gaW1wbGVtZW50YXRpb24gY2xhc3Nlcy5cbi8vICdjaHVuaycgaXMgYW4gaW5wdXQgY2h1bmsuXG4vL1xuLy8gQ2FsbCBgcHVzaChuZXdDaHVuaylgIHRvIHBhc3MgYWxvbmcgdHJhbnNmb3JtZWQgb3V0cHV0XG4vLyB0byB0aGUgcmVhZGFibGUgc2lkZS4gIFlvdSBtYXkgY2FsbCAncHVzaCcgemVybyBvciBtb3JlIHRpbWVzLlxuLy9cbi8vIENhbGwgYGNiKGVycilgIHdoZW4geW91IGFyZSBkb25lIHdpdGggdGhpcyBjaHVuay4gIElmIHlvdSBwYXNzXG4vLyBhbiBlcnJvciwgdGhlbiB0aGF0J2xsIHB1dCB0aGUgaHVydCBvbiB0aGUgd2hvbGUgb3BlcmF0aW9uLiAgSWYgeW91XG4vLyBuZXZlciBjYWxsIGNiKCksIHRoZW4geW91J2xsIG5ldmVyIGdldCBhbm90aGVyIGNodW5rLlxuVHJhbnNmb3JtLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciB0cyA9IHRoaXMuX3RyYW5zZm9ybVN0YXRlO1xuICB0cy53cml0ZWNiID0gY2I7XG4gIHRzLndyaXRlY2h1bmsgPSBjaHVuaztcbiAgdHMud3JpdGVlbmNvZGluZyA9IGVuY29kaW5nO1xuICBpZiAoIXRzLnRyYW5zZm9ybWluZykge1xuICAgIHZhciBycyA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gICAgaWYgKHRzLm5lZWRUcmFuc2Zvcm0gfHxcbiAgICAgICAgcnMubmVlZFJlYWRhYmxlIHx8XG4gICAgICAgIHJzLmxlbmd0aCA8IHJzLmhpZ2hXYXRlck1hcmspXG4gICAgICB0aGlzLl9yZWFkKHJzLmhpZ2hXYXRlck1hcmspO1xuICB9XG59O1xuXG4vLyBEb2Vzbid0IG1hdHRlciB3aGF0IHRoZSBhcmdzIGFyZSBoZXJlLlxuLy8gX3RyYW5zZm9ybSBkb2VzIGFsbCB0aGUgd29yay5cbi8vIFRoYXQgd2UgZ290IGhlcmUgbWVhbnMgdGhhdCB0aGUgcmVhZGFibGUgc2lkZSB3YW50cyBtb3JlIGRhdGEuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24obikge1xuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZTtcblxuICBpZiAodHMud3JpdGVjaHVuayAhPT0gbnVsbCAmJiB0cy53cml0ZWNiICYmICF0cy50cmFuc2Zvcm1pbmcpIHtcbiAgICB0cy50cmFuc2Zvcm1pbmcgPSB0cnVlO1xuICAgIHRoaXMuX3RyYW5zZm9ybSh0cy53cml0ZWNodW5rLCB0cy53cml0ZWVuY29kaW5nLCB0cy5hZnRlclRyYW5zZm9ybSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gbWFyayB0aGF0IHdlIG5lZWQgYSB0cmFuc2Zvcm0sIHNvIHRoYXQgYW55IGRhdGEgdGhhdCBjb21lcyBpblxuICAgIC8vIHdpbGwgZ2V0IHByb2Nlc3NlZCwgbm93IHRoYXQgd2UndmUgYXNrZWQgZm9yIGl0LlxuICAgIHRzLm5lZWRUcmFuc2Zvcm0gPSB0cnVlO1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIGRvbmUoc3RyZWFtLCBlcikge1xuICBpZiAoZXIpXG4gICAgcmV0dXJuIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcblxuICAvLyBpZiB0aGVyZSdzIG5vdGhpbmcgaW4gdGhlIHdyaXRlIGJ1ZmZlciwgdGhlbiB0aGF0IG1lYW5zXG4gIC8vIHRoYXQgbm90aGluZyBtb3JlIHdpbGwgZXZlciBiZSBwcm92aWRlZFxuICB2YXIgd3MgPSBzdHJlYW0uX3dyaXRhYmxlU3RhdGU7XG4gIHZhciBycyA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIHRzID0gc3RyZWFtLl90cmFuc2Zvcm1TdGF0ZTtcblxuICBpZiAod3MubGVuZ3RoKVxuICAgIHRocm93IG5ldyBFcnJvcignY2FsbGluZyB0cmFuc2Zvcm0gZG9uZSB3aGVuIHdzLmxlbmd0aCAhPSAwJyk7XG5cbiAgaWYgKHRzLnRyYW5zZm9ybWluZylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbGxpbmcgdHJhbnNmb3JtIGRvbmUgd2hlbiBzdGlsbCB0cmFuc2Zvcm1pbmcnKTtcblxuICByZXR1cm4gc3RyZWFtLnB1c2gobnVsbCk7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gQSBiaXQgc2ltcGxlciB0aGFuIHJlYWRhYmxlIHN0cmVhbXMuXG4vLyBJbXBsZW1lbnQgYW4gYXN5bmMgLl93cml0ZShjaHVuaywgY2IpLCBhbmQgaXQnbGwgaGFuZGxlIGFsbFxuLy8gdGhlIGRyYWluIGV2ZW50IGVtaXNzaW9uIGFuZCBidWZmZXJpbmcuXG5cbm1vZHVsZS5leHBvcnRzID0gV3JpdGFibGU7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbldyaXRhYmxlLldyaXRhYmxlU3RhdGUgPSBXcml0YWJsZVN0YXRlO1xuXG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuXG51dGlsLmluaGVyaXRzKFdyaXRhYmxlLCBTdHJlYW0pO1xuXG5mdW5jdGlvbiBXcml0ZVJlcShjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHRoaXMuY2h1bmsgPSBjaHVuaztcbiAgdGhpcy5lbmNvZGluZyA9IGVuY29kaW5nO1xuICB0aGlzLmNhbGxiYWNrID0gY2I7XG59XG5cbmZ1bmN0aW9uIFdyaXRhYmxlU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHRoZSBwb2ludCBhdCB3aGljaCB3cml0ZSgpIHN0YXJ0cyByZXR1cm5pbmcgZmFsc2VcbiAgLy8gTm90ZTogMCBpcyBhIHZhbGlkIHZhbHVlLCBtZWFucyB0aGF0IHdlIGFsd2F5cyByZXR1cm4gZmFsc2UgaWZcbiAgLy8gdGhlIGVudGlyZSBidWZmZXIgaXMgbm90IGZsdXNoZWQgaW1tZWRpYXRlbHkgb24gd3JpdGUoKVxuICB2YXIgaHdtID0gb3B0aW9ucy5oaWdoV2F0ZXJNYXJrO1xuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSAoaHdtIHx8IGh3bSA9PT0gMCkgPyBod20gOiAxNiAqIDEwMjQ7XG5cbiAgLy8gb2JqZWN0IHN0cmVhbSBmbGFnIHRvIGluZGljYXRlIHdoZXRoZXIgb3Igbm90IHRoaXMgc3RyZWFtXG4gIC8vIGNvbnRhaW5zIGJ1ZmZlcnMgb3Igb2JqZWN0cy5cbiAgdGhpcy5vYmplY3RNb2RlID0gISFvcHRpb25zLm9iamVjdE1vZGU7XG5cbiAgLy8gY2FzdCB0byBpbnRzLlxuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSB+fnRoaXMuaGlnaFdhdGVyTWFyaztcblxuICB0aGlzLm5lZWREcmFpbiA9IGZhbHNlO1xuICAvLyBhdCB0aGUgc3RhcnQgb2YgY2FsbGluZyBlbmQoKVxuICB0aGlzLmVuZGluZyA9IGZhbHNlO1xuICAvLyB3aGVuIGVuZCgpIGhhcyBiZWVuIGNhbGxlZCwgYW5kIHJldHVybmVkXG4gIHRoaXMuZW5kZWQgPSBmYWxzZTtcbiAgLy8gd2hlbiAnZmluaXNoJyBpcyBlbWl0dGVkXG4gIHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcblxuICAvLyBzaG91bGQgd2UgZGVjb2RlIHN0cmluZ3MgaW50byBidWZmZXJzIGJlZm9yZSBwYXNzaW5nIHRvIF93cml0ZT9cbiAgLy8gdGhpcyBpcyBoZXJlIHNvIHRoYXQgc29tZSBub2RlLWNvcmUgc3RyZWFtcyBjYW4gb3B0aW1pemUgc3RyaW5nXG4gIC8vIGhhbmRsaW5nIGF0IGEgbG93ZXIgbGV2ZWwuXG4gIHZhciBub0RlY29kZSA9IG9wdGlvbnMuZGVjb2RlU3RyaW5ncyA9PT0gZmFsc2U7XG4gIHRoaXMuZGVjb2RlU3RyaW5ncyA9ICFub0RlY29kZTtcblxuICAvLyBDcnlwdG8gaXMga2luZCBvZiBvbGQgYW5kIGNydXN0eS4gIEhpc3RvcmljYWxseSwgaXRzIGRlZmF1bHQgc3RyaW5nXG4gIC8vIGVuY29kaW5nIGlzICdiaW5hcnknIHNvIHdlIGhhdmUgdG8gbWFrZSB0aGlzIGNvbmZpZ3VyYWJsZS5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGluIHRoZSB1bml2ZXJzZSB1c2VzICd1dGY4JywgdGhvdWdoLlxuICB0aGlzLmRlZmF1bHRFbmNvZGluZyA9IG9wdGlvbnMuZGVmYXVsdEVuY29kaW5nIHx8ICd1dGY4JztcblxuICAvLyBub3QgYW4gYWN0dWFsIGJ1ZmZlciB3ZSBrZWVwIHRyYWNrIG9mLCBidXQgYSBtZWFzdXJlbWVudFxuICAvLyBvZiBob3cgbXVjaCB3ZSdyZSB3YWl0aW5nIHRvIGdldCBwdXNoZWQgdG8gc29tZSB1bmRlcmx5aW5nXG4gIC8vIHNvY2tldCBvciBmaWxlLlxuICB0aGlzLmxlbmd0aCA9IDA7XG5cbiAgLy8gYSBmbGFnIHRvIHNlZSB3aGVuIHdlJ3JlIGluIHRoZSBtaWRkbGUgb2YgYSB3cml0ZS5cbiAgdGhpcy53cml0aW5nID0gZmFsc2U7XG5cbiAgLy8gYSBmbGFnIHRvIGJlIGFibGUgdG8gdGVsbCBpZiB0aGUgb253cml0ZSBjYiBpcyBjYWxsZWQgaW1tZWRpYXRlbHksXG4gIC8vIG9yIG9uIGEgbGF0ZXIgdGljay4gIFdlIHNldCB0aGlzIHRvIHRydWUgYXQgZmlyc3QsIGJlY3Vhc2UgYW55XG4gIC8vIGFjdGlvbnMgdGhhdCBzaG91bGRuJ3QgaGFwcGVuIHVudGlsIFwibGF0ZXJcIiBzaG91bGQgZ2VuZXJhbGx5IGFsc29cbiAgLy8gbm90IGhhcHBlbiBiZWZvcmUgdGhlIGZpcnN0IHdyaXRlIGNhbGwuXG4gIHRoaXMuc3luYyA9IHRydWU7XG5cbiAgLy8gYSBmbGFnIHRvIGtub3cgaWYgd2UncmUgcHJvY2Vzc2luZyBwcmV2aW91c2x5IGJ1ZmZlcmVkIGl0ZW1zLCB3aGljaFxuICAvLyBtYXkgY2FsbCB0aGUgX3dyaXRlKCkgY2FsbGJhY2sgaW4gdGhlIHNhbWUgdGljaywgc28gdGhhdCB3ZSBkb24ndFxuICAvLyBlbmQgdXAgaW4gYW4gb3ZlcmxhcHBlZCBvbndyaXRlIHNpdHVhdGlvbi5cbiAgdGhpcy5idWZmZXJQcm9jZXNzaW5nID0gZmFsc2U7XG5cbiAgLy8gdGhlIGNhbGxiYWNrIHRoYXQncyBwYXNzZWQgdG8gX3dyaXRlKGNodW5rLGNiKVxuICB0aGlzLm9ud3JpdGUgPSBmdW5jdGlvbihlcikge1xuICAgIG9ud3JpdGUoc3RyZWFtLCBlcik7XG4gIH07XG5cbiAgLy8gdGhlIGNhbGxiYWNrIHRoYXQgdGhlIHVzZXIgc3VwcGxpZXMgdG8gd3JpdGUoY2h1bmssZW5jb2RpbmcsY2IpXG4gIHRoaXMud3JpdGVjYiA9IG51bGw7XG5cbiAgLy8gdGhlIGFtb3VudCB0aGF0IGlzIGJlaW5nIHdyaXR0ZW4gd2hlbiBfd3JpdGUgaXMgY2FsbGVkLlxuICB0aGlzLndyaXRlbGVuID0gMDtcblxuICB0aGlzLmJ1ZmZlciA9IFtdO1xuXG4gIC8vIFRydWUgaWYgdGhlIGVycm9yIHdhcyBhbHJlYWR5IGVtaXR0ZWQgYW5kIHNob3VsZCBub3QgYmUgdGhyb3duIGFnYWluXG4gIHRoaXMuZXJyb3JFbWl0dGVkID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIFdyaXRhYmxlKG9wdGlvbnMpIHtcbiAgdmFyIER1cGxleCA9IHJlcXVpcmUoJy4vX3N0cmVhbV9kdXBsZXgnKTtcblxuICAvLyBXcml0YWJsZSBjdG9yIGlzIGFwcGxpZWQgdG8gRHVwbGV4ZXMsIHRob3VnaCB0aGV5J3JlIG5vdFxuICAvLyBpbnN0YW5jZW9mIFdyaXRhYmxlLCB0aGV5J3JlIGluc3RhbmNlb2YgUmVhZGFibGUuXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXcml0YWJsZSkgJiYgISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSlcbiAgICByZXR1cm4gbmV3IFdyaXRhYmxlKG9wdGlvbnMpO1xuXG4gIHRoaXMuX3dyaXRhYmxlU3RhdGUgPSBuZXcgV3JpdGFibGVTdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyBsZWdhY3kuXG4gIHRoaXMud3JpdGFibGUgPSB0cnVlO1xuXG4gIFN0cmVhbS5jYWxsKHRoaXMpO1xufVxuXG4vLyBPdGhlcndpc2UgcGVvcGxlIGNhbiBwaXBlIFdyaXRhYmxlIHN0cmVhbXMsIHdoaWNoIGlzIGp1c3Qgd3JvbmcuXG5Xcml0YWJsZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdDYW5ub3QgcGlwZS4gTm90IHJlYWRhYmxlLicpKTtcbn07XG5cblxuZnVuY3Rpb24gd3JpdGVBZnRlckVuZChzdHJlYW0sIHN0YXRlLCBjYikge1xuICB2YXIgZXIgPSBuZXcgRXJyb3IoJ3dyaXRlIGFmdGVyIGVuZCcpO1xuICAvLyBUT0RPOiBkZWZlciBlcnJvciBldmVudHMgY29uc2lzdGVudGx5IGV2ZXJ5d2hlcmUsIG5vdCBqdXN0IHRoZSBjYlxuICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG4gIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgY2IoZXIpO1xuICB9KTtcbn1cblxuLy8gSWYgd2UgZ2V0IHNvbWV0aGluZyB0aGF0IGlzIG5vdCBhIGJ1ZmZlciwgc3RyaW5nLCBudWxsLCBvciB1bmRlZmluZWQsXG4vLyBhbmQgd2UncmUgbm90IGluIG9iamVjdE1vZGUsIHRoZW4gdGhhdCdzIGFuIGVycm9yLlxuLy8gT3RoZXJ3aXNlIHN0cmVhbSBjaHVua3MgYXJlIGFsbCBjb25zaWRlcmVkIHRvIGJlIG9mIGxlbmd0aD0xLCBhbmQgdGhlXG4vLyB3YXRlcm1hcmtzIGRldGVybWluZSBob3cgbWFueSBvYmplY3RzIHRvIGtlZXAgaW4gdGhlIGJ1ZmZlciwgcmF0aGVyIHRoYW5cbi8vIGhvdyBtYW55IGJ5dGVzIG9yIGNoYXJhY3RlcnMuXG5mdW5jdGlvbiB2YWxpZENodW5rKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBjYikge1xuICB2YXIgdmFsaWQgPSB0cnVlO1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgJiZcbiAgICAgICdzdHJpbmcnICE9PSB0eXBlb2YgY2h1bmsgJiZcbiAgICAgIGNodW5rICE9PSBudWxsICYmXG4gICAgICBjaHVuayAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhc3RhdGUub2JqZWN0TW9kZSkge1xuICAgIHZhciBlciA9IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgbm9uLXN0cmluZy9idWZmZXIgY2h1bmsnKTtcbiAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNiKGVyKTtcbiAgICB9KTtcbiAgICB2YWxpZCA9IGZhbHNlO1xuICB9XG4gIHJldHVybiB2YWxpZDtcbn1cblxuV3JpdGFibGUucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl93cml0YWJsZVN0YXRlO1xuICB2YXIgcmV0ID0gZmFsc2U7XG5cbiAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gZW5jb2Rpbmc7XG4gICAgZW5jb2RpbmcgPSBudWxsO1xuICB9XG5cbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpXG4gICAgZW5jb2RpbmcgPSAnYnVmZmVyJztcbiAgZWxzZSBpZiAoIWVuY29kaW5nKVxuICAgIGVuY29kaW5nID0gc3RhdGUuZGVmYXVsdEVuY29kaW5nO1xuXG4gIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpXG4gICAgY2IgPSBmdW5jdGlvbigpIHt9O1xuXG4gIGlmIChzdGF0ZS5lbmRlZClcbiAgICB3cml0ZUFmdGVyRW5kKHRoaXMsIHN0YXRlLCBjYik7XG4gIGVsc2UgaWYgKHZhbGlkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCBjYikpXG4gICAgcmV0ID0gd3JpdGVPckJ1ZmZlcih0aGlzLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGRlY29kZUNodW5rKHN0YXRlLCBjaHVuaywgZW5jb2RpbmcpIHtcbiAgaWYgKCFzdGF0ZS5vYmplY3RNb2RlICYmXG4gICAgICBzdGF0ZS5kZWNvZGVTdHJpbmdzICE9PSBmYWxzZSAmJlxuICAgICAgdHlwZW9mIGNodW5rID09PSAnc3RyaW5nJykge1xuICAgIGNodW5rID0gbmV3IEJ1ZmZlcihjaHVuaywgZW5jb2RpbmcpO1xuICB9XG4gIHJldHVybiBjaHVuaztcbn1cblxuLy8gaWYgd2UncmUgYWxyZWFkeSB3cml0aW5nIHNvbWV0aGluZywgdGhlbiBqdXN0IHB1dCB0aGlzXG4vLyBpbiB0aGUgcXVldWUsIGFuZCB3YWl0IG91ciB0dXJuLiAgT3RoZXJ3aXNlLCBjYWxsIF93cml0ZVxuLy8gSWYgd2UgcmV0dXJuIGZhbHNlLCB0aGVuIHdlIG5lZWQgYSBkcmFpbiBldmVudCwgc28gc2V0IHRoYXQgZmxhZy5cbmZ1bmN0aW9uIHdyaXRlT3JCdWZmZXIoc3RyZWFtLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBjaHVuayA9IGRlY29kZUNodW5rKHN0YXRlLCBjaHVuaywgZW5jb2RpbmcpO1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKGNodW5rKSlcbiAgICBlbmNvZGluZyA9ICdidWZmZXInO1xuICB2YXIgbGVuID0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG5cbiAgc3RhdGUubGVuZ3RoICs9IGxlbjtcblxuICB2YXIgcmV0ID0gc3RhdGUubGVuZ3RoIDwgc3RhdGUuaGlnaFdhdGVyTWFyaztcbiAgLy8gd2UgbXVzdCBlbnN1cmUgdGhhdCBwcmV2aW91cyBuZWVkRHJhaW4gd2lsbCBub3QgYmUgcmVzZXQgdG8gZmFsc2UuXG4gIGlmICghcmV0KVxuICAgIHN0YXRlLm5lZWREcmFpbiA9IHRydWU7XG5cbiAgaWYgKHN0YXRlLndyaXRpbmcpXG4gICAgc3RhdGUuYnVmZmVyLnB1c2gobmV3IFdyaXRlUmVxKGNodW5rLCBlbmNvZGluZywgY2IpKTtcbiAgZWxzZVxuICAgIGRvV3JpdGUoc3RyZWFtLCBzdGF0ZSwgbGVuLCBjaHVuaywgZW5jb2RpbmcsIGNiKTtcblxuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBkb1dyaXRlKHN0cmVhbSwgc3RhdGUsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBzdGF0ZS53cml0ZWxlbiA9IGxlbjtcbiAgc3RhdGUud3JpdGVjYiA9IGNiO1xuICBzdGF0ZS53cml0aW5nID0gdHJ1ZTtcbiAgc3RhdGUuc3luYyA9IHRydWU7XG4gIHN0cmVhbS5fd3JpdGUoY2h1bmssIGVuY29kaW5nLCBzdGF0ZS5vbndyaXRlKTtcbiAgc3RhdGUuc3luYyA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBvbndyaXRlRXJyb3Ioc3RyZWFtLCBzdGF0ZSwgc3luYywgZXIsIGNiKSB7XG4gIGlmIChzeW5jKVxuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYihlcik7XG4gICAgfSk7XG4gIGVsc2VcbiAgICBjYihlcik7XG5cbiAgc3RyZWFtLl93cml0YWJsZVN0YXRlLmVycm9yRW1pdHRlZCA9IHRydWU7XG4gIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbn1cblxuZnVuY3Rpb24gb253cml0ZVN0YXRlVXBkYXRlKHN0YXRlKSB7XG4gIHN0YXRlLndyaXRpbmcgPSBmYWxzZTtcbiAgc3RhdGUud3JpdGVjYiA9IG51bGw7XG4gIHN0YXRlLmxlbmd0aCAtPSBzdGF0ZS53cml0ZWxlbjtcbiAgc3RhdGUud3JpdGVsZW4gPSAwO1xufVxuXG5mdW5jdGlvbiBvbndyaXRlKHN0cmVhbSwgZXIpIHtcbiAgdmFyIHN0YXRlID0gc3RyZWFtLl93cml0YWJsZVN0YXRlO1xuICB2YXIgc3luYyA9IHN0YXRlLnN5bmM7XG4gIHZhciBjYiA9IHN0YXRlLndyaXRlY2I7XG5cbiAgb253cml0ZVN0YXRlVXBkYXRlKHN0YXRlKTtcblxuICBpZiAoZXIpXG4gICAgb253cml0ZUVycm9yKHN0cmVhbSwgc3RhdGUsIHN5bmMsIGVyLCBjYik7XG4gIGVsc2Uge1xuICAgIC8vIENoZWNrIGlmIHdlJ3JlIGFjdHVhbGx5IHJlYWR5IHRvIGZpbmlzaCwgYnV0IGRvbid0IGVtaXQgeWV0XG4gICAgdmFyIGZpbmlzaGVkID0gbmVlZEZpbmlzaChzdHJlYW0sIHN0YXRlKTtcblxuICAgIGlmICghZmluaXNoZWQgJiYgIXN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcgJiYgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICAgIGNsZWFyQnVmZmVyKHN0cmVhbSwgc3RhdGUpO1xuXG4gICAgaWYgKHN5bmMpIHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgIGFmdGVyV3JpdGUoc3RyZWFtLCBzdGF0ZSwgZmluaXNoZWQsIGNiKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYik7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFmdGVyV3JpdGUoc3RyZWFtLCBzdGF0ZSwgZmluaXNoZWQsIGNiKSB7XG4gIGlmICghZmluaXNoZWQpXG4gICAgb253cml0ZURyYWluKHN0cmVhbSwgc3RhdGUpO1xuICBjYigpO1xuICBpZiAoZmluaXNoZWQpXG4gICAgZmluaXNoTWF5YmUoc3RyZWFtLCBzdGF0ZSk7XG59XG5cbi8vIE11c3QgZm9yY2UgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIG9uIG5leHRUaWNrLCBzbyB0aGF0IHdlIGRvbid0XG4vLyBlbWl0ICdkcmFpbicgYmVmb3JlIHRoZSB3cml0ZSgpIGNvbnN1bWVyIGdldHMgdGhlICdmYWxzZScgcmV0dXJuXG4vLyB2YWx1ZSwgYW5kIGhhcyBhIGNoYW5jZSB0byBhdHRhY2ggYSAnZHJhaW4nIGxpc3RlbmVyLlxuZnVuY3Rpb24gb253cml0ZURyYWluKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCAmJiBzdGF0ZS5uZWVkRHJhaW4pIHtcbiAgICBzdGF0ZS5uZWVkRHJhaW4gPSBmYWxzZTtcbiAgICBzdHJlYW0uZW1pdCgnZHJhaW4nKTtcbiAgfVxufVxuXG5cbi8vIGlmIHRoZXJlJ3Mgc29tZXRoaW5nIGluIHRoZSBidWZmZXIgd2FpdGluZywgdGhlbiBwcm9jZXNzIGl0XG5mdW5jdGlvbiBjbGVhckJ1ZmZlcihzdHJlYW0sIHN0YXRlKSB7XG4gIHN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcgPSB0cnVlO1xuXG4gIGZvciAodmFyIGMgPSAwOyBjIDwgc3RhdGUuYnVmZmVyLmxlbmd0aDsgYysrKSB7XG4gICAgdmFyIGVudHJ5ID0gc3RhdGUuYnVmZmVyW2NdO1xuICAgIHZhciBjaHVuayA9IGVudHJ5LmNodW5rO1xuICAgIHZhciBlbmNvZGluZyA9IGVudHJ5LmVuY29kaW5nO1xuICAgIHZhciBjYiA9IGVudHJ5LmNhbGxiYWNrO1xuICAgIHZhciBsZW4gPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcblxuICAgIGRvV3JpdGUoc3RyZWFtLCBzdGF0ZSwgbGVuLCBjaHVuaywgZW5jb2RpbmcsIGNiKTtcblxuICAgIC8vIGlmIHdlIGRpZG4ndCBjYWxsIHRoZSBvbndyaXRlIGltbWVkaWF0ZWx5LCB0aGVuXG4gICAgLy8gaXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHdhaXQgdW50aWwgaXQgZG9lcy5cbiAgICAvLyBhbHNvLCB0aGF0IG1lYW5zIHRoYXQgdGhlIGNodW5rIGFuZCBjYiBhcmUgY3VycmVudGx5XG4gICAgLy8gYmVpbmcgcHJvY2Vzc2VkLCBzbyBtb3ZlIHRoZSBidWZmZXIgY291bnRlciBwYXN0IHRoZW0uXG4gICAgaWYgKHN0YXRlLndyaXRpbmcpIHtcbiAgICAgIGMrKztcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRlLmJ1ZmZlclByb2Nlc3NpbmcgPSBmYWxzZTtcbiAgaWYgKGMgPCBzdGF0ZS5idWZmZXIubGVuZ3RoKVxuICAgIHN0YXRlLmJ1ZmZlciA9IHN0YXRlLmJ1ZmZlci5zbGljZShjKTtcbiAgZWxzZVxuICAgIHN0YXRlLmJ1ZmZlci5sZW5ndGggPSAwO1xufVxuXG5Xcml0YWJsZS5wcm90b3R5cGUuX3dyaXRlID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBjYihuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpKTtcbn07XG5cbldyaXRhYmxlLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3dyaXRhYmxlU3RhdGU7XG5cbiAgaWYgKHR5cGVvZiBjaHVuayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gY2h1bms7XG4gICAgY2h1bmsgPSBudWxsO1xuICAgIGVuY29kaW5nID0gbnVsbDtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGVuY29kaW5nO1xuICAgIGVuY29kaW5nID0gbnVsbDtcbiAgfVxuXG4gIGlmICh0eXBlb2YgY2h1bmsgIT09ICd1bmRlZmluZWQnICYmIGNodW5rICE9PSBudWxsKVxuICAgIHRoaXMud3JpdGUoY2h1bmssIGVuY29kaW5nKTtcblxuICAvLyBpZ25vcmUgdW5uZWNlc3NhcnkgZW5kKCkgY2FsbHMuXG4gIGlmICghc3RhdGUuZW5kaW5nICYmICFzdGF0ZS5maW5pc2hlZClcbiAgICBlbmRXcml0YWJsZSh0aGlzLCBzdGF0ZSwgY2IpO1xufTtcblxuXG5mdW5jdGlvbiBuZWVkRmluaXNoKHN0cmVhbSwgc3RhdGUpIHtcbiAgcmV0dXJuIChzdGF0ZS5lbmRpbmcgJiZcbiAgICAgICAgICBzdGF0ZS5sZW5ndGggPT09IDAgJiZcbiAgICAgICAgICAhc3RhdGUuZmluaXNoZWQgJiZcbiAgICAgICAgICAhc3RhdGUud3JpdGluZyk7XG59XG5cbmZ1bmN0aW9uIGZpbmlzaE1heWJlKHN0cmVhbSwgc3RhdGUpIHtcbiAgdmFyIG5lZWQgPSBuZWVkRmluaXNoKHN0cmVhbSwgc3RhdGUpO1xuICBpZiAobmVlZCkge1xuICAgIHN0YXRlLmZpbmlzaGVkID0gdHJ1ZTtcbiAgICBzdHJlYW0uZW1pdCgnZmluaXNoJyk7XG4gIH1cbiAgcmV0dXJuIG5lZWQ7XG59XG5cbmZ1bmN0aW9uIGVuZFdyaXRhYmxlKHN0cmVhbSwgc3RhdGUsIGNiKSB7XG4gIHN0YXRlLmVuZGluZyA9IHRydWU7XG4gIGZpbmlzaE1heWJlKHN0cmVhbSwgc3RhdGUpO1xuICBpZiAoY2IpIHtcbiAgICBpZiAoc3RhdGUuZmluaXNoZWQpXG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGNiKTtcbiAgICBlbHNlXG4gICAgICBzdHJlYW0ub25jZSgnZmluaXNoJywgY2IpO1xuICB9XG4gIHN0YXRlLmVuZGVkID0gdHJ1ZTtcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBCdWZmZXIuaXNCdWZmZXIoYXJnKTtcbn1cbmV4cG9ydHMuaXNCdWZmZXIgPSBpc0J1ZmZlcjtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanNcIilcbiIsInZhciBTdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTsgLy8gaGFjayB0byBmaXggYSBjaXJjdWxhciBkZXBlbmRlbmN5IGlzc3VlIHdoZW4gdXNlZCB3aXRoIGJyb3dzZXJpZnlcbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL19zdHJlYW1fcmVhZGFibGUuanMnKTtcbmV4cG9ydHMuU3RyZWFtID0gU3RyZWFtO1xuZXhwb3J0cy5SZWFkYWJsZSA9IGV4cG9ydHM7XG5leHBvcnRzLldyaXRhYmxlID0gcmVxdWlyZSgnLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcycpO1xuZXhwb3J0cy5EdXBsZXggPSByZXF1aXJlKCcuL2xpYi9fc3RyZWFtX2R1cGxleC5qcycpO1xuZXhwb3J0cy5UcmFuc2Zvcm0gPSByZXF1aXJlKCcuL2xpYi9fc3RyZWFtX3RyYW5zZm9ybS5qcycpO1xuZXhwb3J0cy5QYXNzVGhyb3VnaCA9IHJlcXVpcmUoJy4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliL19zdHJlYW1fdHJhbnNmb3JtLmpzXCIpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzXCIpXG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW07XG5cbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmluaGVyaXRzKFN0cmVhbSwgRUUpO1xuU3RyZWFtLlJlYWRhYmxlID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3JlYWRhYmxlLmpzJyk7XG5TdHJlYW0uV3JpdGFibGUgPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUuanMnKTtcblN0cmVhbS5EdXBsZXggPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vZHVwbGV4LmpzJyk7XG5TdHJlYW0uVHJhbnNmb3JtID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybS5qcycpO1xuU3RyZWFtLlBhc3NUaHJvdWdoID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3Bhc3N0aHJvdWdoLmpzJyk7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuNC54XG5TdHJlYW0uU3RyZWFtID0gU3RyZWFtO1xuXG5cblxuLy8gb2xkLXN0eWxlIHN0cmVhbXMuICBOb3RlIHRoYXQgdGhlIHBpcGUgbWV0aG9kICh0aGUgb25seSByZWxldmFudFxuLy8gcGFydCBvZiB0aGlzIGNsYXNzKSBpcyBvdmVycmlkZGVuIGluIHRoZSBSZWFkYWJsZSBjbGFzcy5cblxuZnVuY3Rpb24gU3RyZWFtKCkge1xuICBFRS5jYWxsKHRoaXMpO1xufVxuXG5TdHJlYW0ucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbihkZXN0LCBvcHRpb25zKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzO1xuXG4gIGZ1bmN0aW9uIG9uZGF0YShjaHVuaykge1xuICAgIGlmIChkZXN0LndyaXRhYmxlKSB7XG4gICAgICBpZiAoZmFsc2UgPT09IGRlc3Qud3JpdGUoY2h1bmspICYmIHNvdXJjZS5wYXVzZSkge1xuICAgICAgICBzb3VyY2UucGF1c2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzb3VyY2Uub24oJ2RhdGEnLCBvbmRhdGEpO1xuXG4gIGZ1bmN0aW9uIG9uZHJhaW4oKSB7XG4gICAgaWYgKHNvdXJjZS5yZWFkYWJsZSAmJiBzb3VyY2UucmVzdW1lKSB7XG4gICAgICBzb3VyY2UucmVzdW1lKCk7XG4gICAgfVxuICB9XG5cbiAgZGVzdC5vbignZHJhaW4nLCBvbmRyYWluKTtcblxuICAvLyBJZiB0aGUgJ2VuZCcgb3B0aW9uIGlzIG5vdCBzdXBwbGllZCwgZGVzdC5lbmQoKSB3aWxsIGJlIGNhbGxlZCB3aGVuXG4gIC8vIHNvdXJjZSBnZXRzIHRoZSAnZW5kJyBvciAnY2xvc2UnIGV2ZW50cy4gIE9ubHkgZGVzdC5lbmQoKSBvbmNlLlxuICBpZiAoIWRlc3QuX2lzU3RkaW8gJiYgKCFvcHRpb25zIHx8IG9wdGlvbnMuZW5kICE9PSBmYWxzZSkpIHtcbiAgICBzb3VyY2Uub24oJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2Uub24oJ2Nsb3NlJywgb25jbG9zZSk7XG4gIH1cblxuICB2YXIgZGlkT25FbmQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gb25lbmQoKSB7XG4gICAgaWYgKGRpZE9uRW5kKSByZXR1cm47XG4gICAgZGlkT25FbmQgPSB0cnVlO1xuXG4gICAgZGVzdC5lbmQoKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgICBpZiAoZGlkT25FbmQpIHJldHVybjtcbiAgICBkaWRPbkVuZCA9IHRydWU7XG5cbiAgICBpZiAodHlwZW9mIGRlc3QuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykgZGVzdC5kZXN0cm95KCk7XG4gIH1cblxuICAvLyBkb24ndCBsZWF2ZSBkYW5nbGluZyBwaXBlcyB3aGVuIHRoZXJlIGFyZSBlcnJvcnMuXG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICBjbGVhbnVwKCk7XG4gICAgaWYgKEVFLmxpc3RlbmVyQ291bnQodGhpcywgJ2Vycm9yJykgPT09IDApIHtcbiAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgc3RyZWFtIGVycm9yIGluIHBpcGUuXG4gICAgfVxuICB9XG5cbiAgc291cmNlLm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuICBkZXN0Lm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuXG4gIC8vIHJlbW92ZSBhbGwgdGhlIGV2ZW50IGxpc3RlbmVycyB0aGF0IHdlcmUgYWRkZWQuXG4gIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdkYXRhJywgb25kYXRhKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBvbmVuZCk7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuXG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uZXJyb3IpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIGNsZWFudXApO1xuICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBjbGVhbnVwKTtcblxuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgY2xlYW51cCk7XG4gIH1cblxuICBzb3VyY2Uub24oJ2VuZCcsIGNsZWFudXApO1xuICBzb3VyY2Uub24oJ2Nsb3NlJywgY2xlYW51cCk7XG5cbiAgZGVzdC5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0LmVtaXQoJ3BpcGUnLCBzb3VyY2UpO1xuXG4gIC8vIEFsbG93IGZvciB1bml4LWxpa2UgdXNhZ2U6IEEucGlwZShCKS5waXBlKEMpXG4gIHJldHVybiBkZXN0O1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG52YXIgaXNCdWZmZXJFbmNvZGluZyA9IEJ1ZmZlci5pc0VuY29kaW5nXG4gIHx8IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgICAgc3dpdGNoIChlbmNvZGluZyAmJiBlbmNvZGluZy50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICBjYXNlICdoZXgnOiBjYXNlICd1dGY4JzogY2FzZSAndXRmLTgnOiBjYXNlICdhc2NpaSc6IGNhc2UgJ2JpbmFyeSc6IGNhc2UgJ2Jhc2U2NCc6IGNhc2UgJ3VjczInOiBjYXNlICd1Y3MtMic6IGNhc2UgJ3V0ZjE2bGUnOiBjYXNlICd1dGYtMTZsZSc6IGNhc2UgJ3Jhdyc6IHJldHVybiB0cnVlO1xuICAgICAgICAgZGVmYXVsdDogcmV0dXJuIGZhbHNlO1xuICAgICAgIH1cbiAgICAgfVxuXG5cbmZ1bmN0aW9uIGFzc2VydEVuY29kaW5nKGVuY29kaW5nKSB7XG4gIGlmIChlbmNvZGluZyAmJiAhaXNCdWZmZXJFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZyk7XG4gIH1cbn1cblxuLy8gU3RyaW5nRGVjb2RlciBwcm92aWRlcyBhbiBpbnRlcmZhY2UgZm9yIGVmZmljaWVudGx5IHNwbGl0dGluZyBhIHNlcmllcyBvZlxuLy8gYnVmZmVycyBpbnRvIGEgc2VyaWVzIG9mIEpTIHN0cmluZ3Mgd2l0aG91dCBicmVha2luZyBhcGFydCBtdWx0aS1ieXRlXG4vLyBjaGFyYWN0ZXJzLiBDRVNVLTggaXMgaGFuZGxlZCBhcyBwYXJ0IG9mIHRoZSBVVEYtOCBlbmNvZGluZy5cbi8vXG4vLyBAVE9ETyBIYW5kbGluZyBhbGwgZW5jb2RpbmdzIGluc2lkZSBhIHNpbmdsZSBvYmplY3QgbWFrZXMgaXQgdmVyeSBkaWZmaWN1bHRcbi8vIHRvIHJlYXNvbiBhYm91dCB0aGlzIGNvZGUsIHNvIGl0IHNob3VsZCBiZSBzcGxpdCB1cCBpbiB0aGUgZnV0dXJlLlxuLy8gQFRPRE8gVGhlcmUgc2hvdWxkIGJlIGEgdXRmOC1zdHJpY3QgZW5jb2RpbmcgdGhhdCByZWplY3RzIGludmFsaWQgVVRGLTggY29kZVxuLy8gcG9pbnRzIGFzIHVzZWQgYnkgQ0VTVS04LlxudmFyIFN0cmluZ0RlY29kZXIgPSBleHBvcnRzLlN0cmluZ0RlY29kZXIgPSBmdW5jdGlvbihlbmNvZGluZykge1xuICB0aGlzLmVuY29kaW5nID0gKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bLV9dLywgJycpO1xuICBhc3NlcnRFbmNvZGluZyhlbmNvZGluZyk7XG4gIHN3aXRjaCAodGhpcy5lbmNvZGluZykge1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgLy8gQ0VTVS04IHJlcHJlc2VudHMgZWFjaCBvZiBTdXJyb2dhdGUgUGFpciBieSAzLWJ5dGVzXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICAvLyBVVEYtMTYgcmVwcmVzZW50cyBlYWNoIG9mIFN1cnJvZ2F0ZSBQYWlyIGJ5IDItYnl0ZXNcbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDI7XG4gICAgICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyID0gdXRmMTZEZXRlY3RJbmNvbXBsZXRlQ2hhcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAvLyBCYXNlLTY0IHN0b3JlcyAzIGJ5dGVzIGluIDQgY2hhcnMsIGFuZCBwYWRzIHRoZSByZW1haW5kZXIuXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgdGhpcy5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMud3JpdGUgPSBwYXNzVGhyb3VnaFdyaXRlO1xuICAgICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRW5vdWdoIHNwYWNlIHRvIHN0b3JlIGFsbCBieXRlcyBvZiBhIHNpbmdsZSBjaGFyYWN0ZXIuIFVURi04IG5lZWRzIDRcbiAgLy8gYnl0ZXMsIGJ1dCBDRVNVLTggbWF5IHJlcXVpcmUgdXAgdG8gNiAoMyBieXRlcyBwZXIgc3Vycm9nYXRlKS5cbiAgdGhpcy5jaGFyQnVmZmVyID0gbmV3IEJ1ZmZlcig2KTtcbiAgLy8gTnVtYmVyIG9mIGJ5dGVzIHJlY2VpdmVkIGZvciB0aGUgY3VycmVudCBpbmNvbXBsZXRlIG11bHRpLWJ5dGUgY2hhcmFjdGVyLlxuICB0aGlzLmNoYXJSZWNlaXZlZCA9IDA7XG4gIC8vIE51bWJlciBvZiBieXRlcyBleHBlY3RlZCBmb3IgdGhlIGN1cnJlbnQgaW5jb21wbGV0ZSBtdWx0aS1ieXRlIGNoYXJhY3Rlci5cbiAgdGhpcy5jaGFyTGVuZ3RoID0gMDtcbn07XG5cblxuLy8gd3JpdGUgZGVjb2RlcyB0aGUgZ2l2ZW4gYnVmZmVyIGFuZCByZXR1cm5zIGl0IGFzIEpTIHN0cmluZyB0aGF0IGlzXG4vLyBndWFyYW50ZWVkIHRvIG5vdCBjb250YWluIGFueSBwYXJ0aWFsIG11bHRpLWJ5dGUgY2hhcmFjdGVycy4gQW55IHBhcnRpYWxcbi8vIGNoYXJhY3RlciBmb3VuZCBhdCB0aGUgZW5kIG9mIHRoZSBidWZmZXIgaXMgYnVmZmVyZWQgdXAsIGFuZCB3aWxsIGJlXG4vLyByZXR1cm5lZCB3aGVuIGNhbGxpbmcgd3JpdGUgYWdhaW4gd2l0aCB0aGUgcmVtYWluaW5nIGJ5dGVzLlxuLy9cbi8vIE5vdGU6IENvbnZlcnRpbmcgYSBCdWZmZXIgY29udGFpbmluZyBhbiBvcnBoYW4gc3Vycm9nYXRlIHRvIGEgU3RyaW5nXG4vLyBjdXJyZW50bHkgd29ya3MsIGJ1dCBjb252ZXJ0aW5nIGEgU3RyaW5nIHRvIGEgQnVmZmVyICh2aWEgYG5ldyBCdWZmZXJgLCBvclxuLy8gQnVmZmVyI3dyaXRlKSB3aWxsIHJlcGxhY2UgaW5jb21wbGV0ZSBzdXJyb2dhdGVzIHdpdGggdGhlIHVuaWNvZGVcbi8vIHJlcGxhY2VtZW50IGNoYXJhY3Rlci4gU2VlIGh0dHBzOi8vY29kZXJldmlldy5jaHJvbWl1bS5vcmcvMTIxMTczMDA5LyAuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgY2hhclN0ciA9ICcnO1xuICAvLyBpZiBvdXIgbGFzdCB3cml0ZSBlbmRlZCB3aXRoIGFuIGluY29tcGxldGUgbXVsdGlieXRlIGNoYXJhY3RlclxuICB3aGlsZSAodGhpcy5jaGFyTGVuZ3RoKSB7XG4gICAgLy8gZGV0ZXJtaW5lIGhvdyBtYW55IHJlbWFpbmluZyBieXRlcyB0aGlzIGJ1ZmZlciBoYXMgdG8gb2ZmZXIgZm9yIHRoaXMgY2hhclxuICAgIHZhciBhdmFpbGFibGUgPSAoYnVmZmVyLmxlbmd0aCA+PSB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCkgP1xuICAgICAgICB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCA6XG4gICAgICAgIGJ1ZmZlci5sZW5ndGg7XG5cbiAgICAvLyBhZGQgdGhlIG5ldyBieXRlcyB0byB0aGUgY2hhciBidWZmZXJcbiAgICBidWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIHRoaXMuY2hhclJlY2VpdmVkLCAwLCBhdmFpbGFibGUpO1xuICAgIHRoaXMuY2hhclJlY2VpdmVkICs9IGF2YWlsYWJsZTtcblxuICAgIGlmICh0aGlzLmNoYXJSZWNlaXZlZCA8IHRoaXMuY2hhckxlbmd0aCkge1xuICAgICAgLy8gc3RpbGwgbm90IGVub3VnaCBjaGFycyBpbiB0aGlzIGJ1ZmZlcj8gd2FpdCBmb3IgbW9yZSAuLi5cbiAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgYnl0ZXMgYmVsb25naW5nIHRvIHRoZSBjdXJyZW50IGNoYXJhY3RlciBmcm9tIHRoZSBidWZmZXJcbiAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoYXZhaWxhYmxlLCBidWZmZXIubGVuZ3RoKTtcblxuICAgIC8vIGdldCB0aGUgY2hhcmFjdGVyIHRoYXQgd2FzIHNwbGl0XG4gICAgY2hhclN0ciA9IHRoaXMuY2hhckJ1ZmZlci5zbGljZSgwLCB0aGlzLmNoYXJMZW5ndGgpLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcpO1xuXG4gICAgLy8gQ0VTVS04OiBsZWFkIHN1cnJvZ2F0ZSAoRDgwMC1EQkZGKSBpcyBhbHNvIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlclxuICAgIHZhciBjaGFyQ29kZSA9IGNoYXJTdHIuY2hhckNvZGVBdChjaGFyU3RyLmxlbmd0aCAtIDEpO1xuICAgIGlmIChjaGFyQ29kZSA+PSAweEQ4MDAgJiYgY2hhckNvZGUgPD0gMHhEQkZGKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggKz0gdGhpcy5zdXJyb2dhdGVTaXplO1xuICAgICAgY2hhclN0ciA9ICcnO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHRoaXMuY2hhclJlY2VpdmVkID0gdGhpcy5jaGFyTGVuZ3RoID0gMDtcblxuICAgIC8vIGlmIHRoZXJlIGFyZSBubyBtb3JlIGJ5dGVzIGluIHRoaXMgYnVmZmVyLCBqdXN0IGVtaXQgb3VyIGNoYXJcbiAgICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGNoYXJTdHI7XG4gICAgfVxuICAgIGJyZWFrO1xuICB9XG5cbiAgLy8gZGV0ZXJtaW5lIGFuZCBzZXQgY2hhckxlbmd0aCAvIGNoYXJSZWNlaXZlZFxuICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcik7XG5cbiAgdmFyIGVuZCA9IGJ1ZmZlci5sZW5ndGg7XG4gIGlmICh0aGlzLmNoYXJMZW5ndGgpIHtcbiAgICAvLyBidWZmZXIgdGhlIGluY29tcGxldGUgY2hhcmFjdGVyIGJ5dGVzIHdlIGdvdFxuICAgIGJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCAtIHRoaXMuY2hhclJlY2VpdmVkLCBlbmQpO1xuICAgIGVuZCAtPSB0aGlzLmNoYXJSZWNlaXZlZDtcbiAgfVxuXG4gIGNoYXJTdHIgKz0gYnVmZmVyLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcsIDAsIGVuZCk7XG5cbiAgdmFyIGVuZCA9IGNoYXJTdHIubGVuZ3RoIC0gMTtcbiAgdmFyIGNoYXJDb2RlID0gY2hhclN0ci5jaGFyQ29kZUF0KGVuZCk7XG4gIC8vIENFU1UtODogbGVhZCBzdXJyb2dhdGUgKEQ4MDAtREJGRikgaXMgYWxzbyB0aGUgaW5jb21wbGV0ZSBjaGFyYWN0ZXJcbiAgaWYgKGNoYXJDb2RlID49IDB4RDgwMCAmJiBjaGFyQ29kZSA8PSAweERCRkYpIHtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuc3Vycm9nYXRlU2l6ZTtcbiAgICB0aGlzLmNoYXJMZW5ndGggKz0gc2l6ZTtcbiAgICB0aGlzLmNoYXJSZWNlaXZlZCArPSBzaXplO1xuICAgIHRoaXMuY2hhckJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgc2l6ZSwgMCwgc2l6ZSk7XG4gICAgYnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCAwLCAwLCBzaXplKTtcbiAgICByZXR1cm4gY2hhclN0ci5zdWJzdHJpbmcoMCwgZW5kKTtcbiAgfVxuXG4gIC8vIG9yIGp1c3QgZW1pdCB0aGUgY2hhclN0clxuICByZXR1cm4gY2hhclN0cjtcbn07XG5cbi8vIGRldGVjdEluY29tcGxldGVDaGFyIGRldGVybWluZXMgaWYgdGhlcmUgaXMgYW4gaW5jb21wbGV0ZSBVVEYtOCBjaGFyYWN0ZXIgYXRcbi8vIHRoZSBlbmQgb2YgdGhlIGdpdmVuIGJ1ZmZlci4gSWYgc28sIGl0IHNldHMgdGhpcy5jaGFyTGVuZ3RoIHRvIHRoZSBieXRlXG4vLyBsZW5ndGggdGhhdCBjaGFyYWN0ZXIsIGFuZCBzZXRzIHRoaXMuY2hhclJlY2VpdmVkIHRvIHRoZSBudW1iZXIgb2YgYnl0ZXNcbi8vIHRoYXQgYXJlIGF2YWlsYWJsZSBmb3IgdGhpcyBjaGFyYWN0ZXIuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAvLyBkZXRlcm1pbmUgaG93IG1hbnkgYnl0ZXMgd2UgaGF2ZSB0byBjaGVjayBhdCB0aGUgZW5kIG9mIHRoaXMgYnVmZmVyXG4gIHZhciBpID0gKGJ1ZmZlci5sZW5ndGggPj0gMykgPyAzIDogYnVmZmVyLmxlbmd0aDtcblxuICAvLyBGaWd1cmUgb3V0IGlmIG9uZSBvZiB0aGUgbGFzdCBpIGJ5dGVzIG9mIG91ciBidWZmZXIgYW5ub3VuY2VzIGFuXG4gIC8vIGluY29tcGxldGUgY2hhci5cbiAgZm9yICg7IGkgPiAwOyBpLS0pIHtcbiAgICB2YXIgYyA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gaV07XG5cbiAgICAvLyBTZWUgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9VVEYtOCNEZXNjcmlwdGlvblxuXG4gICAgLy8gMTEwWFhYWFhcbiAgICBpZiAoaSA9PSAxICYmIGMgPj4gNSA9PSAweDA2KSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMFhYWFhcbiAgICBpZiAoaSA8PSAyICYmIGMgPj4gNCA9PSAweDBFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMTBYWFhcbiAgICBpZiAoaSA8PSAzICYmIGMgPj4gMyA9PSAweDFFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSA0O1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gaTtcbn07XG5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgcmVzID0gJyc7XG4gIGlmIChidWZmZXIgJiYgYnVmZmVyLmxlbmd0aClcbiAgICByZXMgPSB0aGlzLndyaXRlKGJ1ZmZlcik7XG5cbiAgaWYgKHRoaXMuY2hhclJlY2VpdmVkKSB7XG4gICAgdmFyIGNyID0gdGhpcy5jaGFyUmVjZWl2ZWQ7XG4gICAgdmFyIGJ1ZiA9IHRoaXMuY2hhckJ1ZmZlcjtcbiAgICB2YXIgZW5jID0gdGhpcy5lbmNvZGluZztcbiAgICByZXMgKz0gYnVmLnNsaWNlKDAsIGNyKS50b1N0cmluZyhlbmMpO1xuICB9XG5cbiAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIHBhc3NUaHJvdWdoV3JpdGUoYnVmZmVyKSB7XG4gIHJldHVybiBidWZmZXIudG9TdHJpbmcodGhpcy5lbmNvZGluZyk7XG59XG5cbmZ1bmN0aW9uIHV0ZjE2RGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKSB7XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gYnVmZmVyLmxlbmd0aCAlIDI7XG4gIHRoaXMuY2hhckxlbmd0aCA9IHRoaXMuY2hhclJlY2VpdmVkID8gMiA6IDA7XG59XG5cbmZ1bmN0aW9uIGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcikge1xuICB0aGlzLmNoYXJSZWNlaXZlZCA9IGJ1ZmZlci5sZW5ndGggJSAzO1xuICB0aGlzLmNoYXJMZW5ndGggPSB0aGlzLmNoYXJSZWNlaXZlZCA/IDMgOiAwO1xufVxuIl19
