(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright 2015, SRI International

'use strict';

var g2js = require('./lib/grouping2js')({ strict: true }),
    dae2g = require('./lib/dae2grouping')({ strict: true }),
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
    s3dParser: g2js.parser,
    daeParser: dae2g.parser
};

try {
    window.G2JS = module.exports;
} catch(e) { } // ignore "ReferenceError: window is not defined" when running on the server

},{"./lib/dae2grouping":2,"./lib/grouping2js":3,"js-beautify":4,"js-object-pretty-print":8}],2:[function(require,module,exports){
// Copyright 2015, SRI International

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

},{"sax":9}],3:[function(require,module,exports){
// Copyright 2015, SRI International

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

},{"sax":9}],4:[function(require,module,exports){
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


},{"./lib/beautify":7,"./lib/beautify-css":5,"./lib/beautify-html":6}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{"./beautify-css.js":5,"./beautify.js":7}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{"buffer":10,"stream":29,"string_decoder":30}],10:[function(require,module,exports){
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

},{"base64-js":11,"ieee754":12,"is-array":13}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){

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

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],17:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

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

},{}],18:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":19}],19:[function(require,module,exports){
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

},{"./_stream_readable":21,"./_stream_writable":23,"_process":17,"core-util-is":24,"inherits":15}],20:[function(require,module,exports){
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

},{"./_stream_transform":22,"core-util-is":24,"inherits":15}],21:[function(require,module,exports){
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

},{"_process":17,"buffer":10,"core-util-is":24,"events":14,"inherits":15,"isarray":16,"stream":29,"string_decoder/":30}],22:[function(require,module,exports){
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

},{"./_stream_duplex":19,"core-util-is":24,"inherits":15}],23:[function(require,module,exports){
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

},{"./_stream_duplex":19,"_process":17,"buffer":10,"core-util-is":24,"inherits":15,"stream":29}],24:[function(require,module,exports){
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

},{"buffer":10}],25:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":20}],26:[function(require,module,exports){
var Stream = require('stream'); // hack to fix a circular dependency issue when used with browserify
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":19,"./lib/_stream_passthrough.js":20,"./lib/_stream_readable.js":21,"./lib/_stream_transform.js":22,"./lib/_stream_writable.js":23,"stream":29}],27:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":22}],28:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":23}],29:[function(require,module,exports){
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

},{"events":14,"inherits":15,"readable-stream/duplex.js":18,"readable-stream/passthrough.js":25,"readable-stream/readable.js":26,"readable-stream/transform.js":27,"readable-stream/writable.js":28}],30:[function(require,module,exports){
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

},{"buffer":10}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImluZGV4LmpzIiwibGliL2RhZTJncm91cGluZy5qcyIsImxpYi9ncm91cGluZzJqcy5qcyIsIm5vZGVfbW9kdWxlcy9qcy1iZWF1dGlmeS9qcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9qcy1iZWF1dGlmeS9qcy9saWIvYmVhdXRpZnktY3NzLmpzIiwibm9kZV9tb2R1bGVzL2pzLWJlYXV0aWZ5L2pzL2xpYi9iZWF1dGlmeS1odG1sLmpzIiwibm9kZV9tb2R1bGVzL2pzLWJlYXV0aWZ5L2pzL2xpYi9iZWF1dGlmeS5qcyIsIm5vZGVfbW9kdWxlcy9qcy1vYmplY3QtcHJldHR5LXByaW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NheC9saWIvc2F4LmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaXMtYXJyYXkvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vZHVwbGV4LmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX2R1cGxleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV9wYXNzdGhyb3VnaC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV9yZWFkYWJsZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fd3JpdGFibGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbm9kZV9tb2R1bGVzL2NvcmUtdXRpbC1pcy9saWIvdXRpbC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9wYXNzdGhyb3VnaC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9yZWFkYWJsZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS90cmFuc2Zvcm0uanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9zdHJlYW0tYnJvd3NlcmlmeS9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3N0cmluZ19kZWNvZGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3ZiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2gzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcjREQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2w0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3B5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdDlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNsWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFHQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCAyMDE1LCBTUkkgSW50ZXJuYXRpb25hbFxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBnMmpzID0gcmVxdWlyZSgnLi9saWIvZ3JvdXBpbmcyanMnKSh7IHN0cmljdDogdHJ1ZSB9KSxcbiAgICBkYWUyZyA9IHJlcXVpcmUoJy4vbGliL2RhZTJncm91cGluZycpKHsgc3RyaWN0OiB0cnVlIH0pLFxuICAgIHByZXR0eSA9IHJlcXVpcmUoJ2pzLW9iamVjdC1wcmV0dHktcHJpbnQnKS5wcmV0dHksXG4gICAgYmVhdXRpZnlfaHRtbCA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuaHRtbDtcblxuLy8gcHVibGljIHZpYSBleHBvcnRzLm1vZHVsZVxudmFyIGdyb3VwaW5nMmh0bWwgPSBmdW5jdGlvbihzb3VyY2VYbWwpIHtcbiAgICB2YXIgZ3JvdXBpbmdPYmogPSBnMmpzLmdyb3VwaW5nMmpzKHNvdXJjZVhtbCk7XG5cbiAgICByZXR1cm4gZ3JvdXBpbmdPYmoyaHRtbChncm91cGluZ09iaik7XG59O1xuXG52YXIgZ3JvdXBpbmdPYmoyaHRtbCA9IGZ1bmN0aW9uKGdyb3VwaW5nT2JqKSB7XG4gICAgdmFyIHRleHQgPSBwcmV0dHkoZ3JvdXBpbmdPYmopLFxuICAgICAgICBodG1sID0gc2ltcGxlVGV4dDJodG1sKHRleHQpO1xuXG4gICAgcmV0dXJuIHsgaHRtbDogaHRtbCwgdGV4dDogdGV4dCB9O1xufTtcblxudmFyIGdyb3VwaW5nWG1sMmh0bWwgPSBmdW5jdGlvbihzb3VyY2VYbWwpIHtcbiAgICB2YXIgdGV4dCA9ICBiZWF1dGlmeV9odG1sKHNvdXJjZVhtbCksXG4gICAgICAgIGh0bWwgPSBzaW1wbGVUZXh0Mmh0bWwodGV4dCk7XG5cbiAgICByZXR1cm4geyBodG1sOiBodG1sLCB0ZXh0OiB0ZXh0IH07XG59O1xuXG52YXIgZ3JvdXBpbmdPYmoyeG1sID0gZnVuY3Rpb24oZ3JvdXBpbmdPYmopIHtcbiAgICB2YXIgZ3JvdXBpbmdYbWwgPSAnPGdyb3VwaW5nIG5hbWU9XCInICsgZ3JvdXBpbmdPYmoubmFtZSArICdcIj4nO1xuXG4gICAgZ3JvdXBpbmdYbWwgPSBncm91cHNwYXJ0czJ4bWwoZ3JvdXBpbmdPYmosIGdyb3VwaW5nWG1sKTtcbiAgICByZXR1cm4gZ3JvdXBpbmdYbWwgKyAnPC9ncm91cGluZz4nO1xufTtcblxuLy8gcHJpdmF0ZVxudmFyIHNpbXBsZVRleHQyaHRtbCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB2YXIgaHRtbDtcblxuICAgIGh0bWwgPSAgdGV4dC5yZXBsYWNlKC8mL2csICcmYW1wOycpLnJlcGxhY2UoLzwvZywgJyZsdDsnKS5yZXBsYWNlKC8+L2csICcmZ3Q7JykucmVwbGFjZSgvXFxuL2csICc8YnI+JykucmVwbGFjZSgvXFxzL2csICcmbmJzcDsnKTtcbiAgICByZXR1cm4gaHRtbDtcbn07XG5cbnZhciBncm91cHNwYXJ0czJ4bWwgPSBmdW5jdGlvbihncm91cGluZ09iaiwgZ3JvdXBpbmdYbWwpIHtcbiAgICBmb3IgKHZhciBwIGluIGdyb3VwaW5nT2JqKSB7XG4gICAgICAgIGlmIChwID09ICdncm91cHMnKSB7XG4gICAgICAgICAgICBncm91cGluZ09iai5ncm91cHMuZm9yRWFjaChmdW5jdGlvbihncm91cCkge1xuICAgICAgICAgICAgICAgIGdyb3VwaW5nWG1sICs9ICc8Z3JvdXAgbmFtZT1cIicgKyBncm91cC5uYW1lICsgJ1wiJztcblxuICAgICAgICAgICAgICAgIGlmIChncm91cC5ub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwaW5nWG1sICs9ICcgbm9kZT1cIicgKyBncm91cC5ub2RlICsgJ1wiPic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBpbmdYbWwgKz0gJz4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGdyb3VwaW5nWG1sID0gZ3JvdXBzcGFydHMyeG1sKGdyb3VwLCBncm91cGluZ1htbCk7XG4gICAgICAgICAgICAgICAgZ3JvdXBpbmdYbWwgKz0gJzwvZ3JvdXA+JztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHAgPT0gJ3BhcnRzJykge1xuICAgICAgICAgICAgZ3JvdXBpbmdPYmoucGFydHMuZm9yRWFjaChmdW5jdGlvbihwYXJ0KSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBpbmdYbWwgKz0gJzxwYXJ0IG5vZGU9XCInICsgcGFydCArICdcIi8+JztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGdyb3VwaW5nWG1sO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZzJqczogZzJqcy5ncm91cGluZzJqcyxcbiAgICBnMmh0bWw6IGdyb3VwaW5nMmh0bWwsXG4gICAgZ28yaHRtbDogZ3JvdXBpbmdPYmoyaHRtbCxcbiAgICBnbzJ4bWw6IGdyb3VwaW5nT2JqMnhtbCxcbiAgICBneDJodG1sOiBncm91cGluZ1htbDJodG1sLFxuICAgIGRhZTJnOiBkYWUyZy5kYWUyZ3JvdXBpbmcsXG4gICAgczNkUGFyc2VyOiBnMmpzLnBhcnNlcixcbiAgICBkYWVQYXJzZXI6IGRhZTJnLnBhcnNlclxufTtcblxudHJ5IHtcbiAgICB3aW5kb3cuRzJKUyA9IG1vZHVsZS5leHBvcnRzO1xufSBjYXRjaChlKSB7IH0gLy8gaWdub3JlIFwiUmVmZXJlbmNlRXJyb3I6IHdpbmRvdyBpcyBub3QgZGVmaW5lZFwiIHdoZW4gcnVubmluZyBvbiB0aGUgc2VydmVyXG4iLCIvLyBDb3B5cmlnaHQgMjAxNSwgU1JJIEludGVybmF0aW9uYWxcblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2F4ID0gcmVxdWlyZShcInNheFwiKTtcblxuZnVuY3Rpb24gZGFlMmdyb3VwaW5nKG9wdGlvbnMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwgeyB9LFxuICAgICAgICBzdHJpY3QgPSBvcHRpb25zLnN0cmljdCB8fCB0cnVlLFxuICAgICAgICBvbmVycm9yID0gb3B0aW9ucy5vbmVycm9yIHx8IGZ1bmN0aW9uKGVycm9yKSB7IC8qIGFuIGVycm9yIGhhcHBlbmVkLiAqLyB9LFxuICAgICAgICBvbnRleHQgPSBvcHRpb25zLm9udGV4dCB8fCBmdW5jdGlvbih0ZXh0KSB7IC8qIGdvdCBzb21lIHRleHQuICB0IGlzIHRoZSBzdHJpbmcgb2YgdGV4dC4gKi8gfSxcbiAgICAgICAgb25hdHRyaWJ1dGUgPSBvcHRpb25zLm9uYXR0cmlidXRlIHx8IGZ1bmN0aW9uKGF0dHIpIHsgLyogYW4gYXR0cmlidXRlLiAgYXR0ciBoYXMgXCJuYW1lXCIgYW5kIFwidmFsdWVcIiAqLyB9LFxuICAgICAgICBvbmVuZCA9IG9wdGlvbnMub25lbmQgfHwgZnVuY3Rpb24oKSB7IC8qIHBhcnNlciBzdHJlYW0gaXMgZG9uZSwgYW5kIHJlYWR5IHRvIGhhdmUgbW9yZSBzdHVmZiB3cml0dGVuIHRvIGl0LiAqLyB9LFxuICAgICAgICBwYXJzZXIgPSBzYXgucGFyc2VyKHN0cmljdCksXG4gICAgICAgIGdyb3VwaW5nT2JqLFxuICAgICAgICBjdXJyZW50T2JqLFxuICAgICAgICBjdXJyZW50R3JvdXAsXG4gICAgICAgIGN1cnJlbnRQYXJ0LFxuICAgICAgICBiZWdpbk5vZGUgPSBmYWxzZSxcbiAgICAgICAgZW5kTm9kZSA9IGZhbHNlO1xuXG4gICAgcGFyc2VyLm9uZXJyb3IgPSBvbmVycm9yO1xuICAgIHBhcnNlci5vbnRleHQgPSBvbnRleHQ7XG5cbiAgICBwYXJzZXIub25jbG9zZXRhZyA9IGZ1bmN0aW9uKG5hbWUpIHsgLy8gY2xvc2luZyBhIHRhZy4gbmFtZSBpcyB0aGUgbmFtZSBmcm9tIG9ub3BlbnRhZyBub2RlLm5hbWVcbiAgICAgICAgaWYgKG5hbWUgPT0gJ25vZGUnKSB7XG4gICAgICAgICAgICBpZiAoYmVnaW5Ob2RlICYmICFlbmROb2RlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudE9iai5wYXJ0cyA9IGN1cnJlbnRPYmoucGFydHMgfHwgWyBdO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRPYmoucGFydHMucHVzaChjdXJyZW50UGFydCk7XG4gICAgICAgICAgICAgICAgYmVnaW5Ob2RlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZW5kTm9kZSA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBwID0gY3VycmVudE9iai5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGN1cnJlbnRPYmoucGFyZW50O1xuICAgICAgICAgICAgICAgIGN1cnJlbnRPYmogPSBwO1xuICAgICAgICAgICAgICAgIGVuZE5vZGUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBwYXJzZXIub25vcGVudGFnID0gZnVuY3Rpb24obm9kZSkgeyAvLyBvcGVuZWQgYSB0YWcuIG5vZGUgaGFzIFwibmFtZVwiIGFuZCBcImF0dHJpYnV0ZXNcIiwgaXNTZWxmQ2xvc2luZ1xuICAgICAgICBzd2l0Y2ggKG5vZGUubmFtZSkge1xuICAgICAgICBjYXNlICd2aXN1YWxfc2NlbmUnOlxuICAgICAgICAgICAgZ3JvdXBpbmdPYmoubmFtZSA9IG5vZGUuYXR0cmlidXRlcy5uYW1lO1xuICAgICAgICAgICAgY3VycmVudE9iaiA9IGdyb3VwaW5nT2JqO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ25vZGUnOlxuICAgICAgICAgICAgaWYgKGJlZ2luTm9kZSkgeyAvLyBuZXN0ZWQgbm9kZSBtZWFucyBpdCBpcyBnb3J1cGluZyBub2RlIGVsZW1lbnRzXG4gICAgICAgICAgICAgICAgY3VycmVudE9iai5ncm91cHMgPSBjdXJyZW50T2JqLmdyb3VwcyB8fCBbIF07XG4gICAgICAgICAgICAgICAgY3VycmVudE9iai5ncm91cHMucHVzaChjdXJyZW50R3JvdXApO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRHcm91cC5wYXJlbnQgPSBjdXJyZW50T2JqO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRPYmogPSBjdXJyZW50R3JvdXA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJlZ2luTm9kZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgZW5kTm9kZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjdXJyZW50R3JvdXAgPSB7IG5hbWU6IG5vZGUuYXR0cmlidXRlcy5uYW1lLCBub2RlOiBub2RlLmF0dHJpYnV0ZXMubmFtZSwgcGFyZW50OiB1bmRlZmluZWQgfTsgLy8gcGFyZW50IGlzIGEgdGVtcG9yYXJ5IHJlZmVyZW5jZSwgcmVtb3ZlZCBvbiBlbmRpbmcgdGhlIGdyb3VwXG4gICAgICAgICAgICBjdXJyZW50UGFydCA9IG5vZGUuYXR0cmlidXRlcy5uYW1lO1xuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBwYXJzZXIub25hdHRyaWJ1dGUgPSBvbmF0dHJpYnV0ZTtcbiAgICBwYXJzZXIub25lbmQgPSBvbmVuZDtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGRhZTJncm91cGluZzogZnVuY3Rpb24oeG1sKSB7XG4gICAgICAgICAgICBncm91cGluZ09iaiA9IHsgfTtcbiAgICAgICAgICAgIHBhcnNlci53cml0ZSh4bWwpLmNsb3NlKCk7XG4gICAgICAgICAgICByZXR1cm4gZ3JvdXBpbmdPYmo7XG4gICAgICAgIH0sXG4gICAgICAgIHBhcnNlcjogcGFyc2VyXG4gICAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZGFlMmdyb3VwaW5nO1xuIiwiLy8gQ29weXJpZ2h0IDIwMTUsIFNSSSBJbnRlcm5hdGlvbmFsXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHNheCA9IHJlcXVpcmUoXCJzYXhcIik7XG5cbmZ1bmN0aW9uIGdyb3VwaW5nMmpzKG9wdGlvbnMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IG9wdGlvbnMgfHwgeyB9LFxuICAgICAgICBzdHJpY3QgPSBvcHRpb25zLnN0cmljdCB8fCB0cnVlLFxuICAgICAgICBvbmVycm9yID0gb3B0aW9ucy5vbmVycm9yIHx8IGZ1bmN0aW9uKGVycm9yKSB7IC8qIGFuIGVycm9yIGhhcHBlbmVkLiAqLyB9LFxuICAgICAgICBvbnRleHQgPSBvcHRpb25zLm9udGV4dCB8fCBmdW5jdGlvbih0ZXh0KSB7IC8qIGdvdCBzb21lIHRleHQuICB0IGlzIHRoZSBzdHJpbmcgb2YgdGV4dC4gKi8gfSxcbiAgICAgICAgb25hdHRyaWJ1dGUgPSBvcHRpb25zLm9uYXR0cmlidXRlIHx8IGZ1bmN0aW9uKGF0dHIpIHsgLyogYW4gYXR0cmlidXRlLiAgYXR0ciBoYXMgXCJuYW1lXCIgYW5kIFwidmFsdWVcIiAqLyB9LFxuICAgICAgICBvbmVuZCA9IG9wdGlvbnMub25lbmQgfHwgZnVuY3Rpb24oKSB7IC8qIHBhcnNlciBzdHJlYW0gaXMgZG9uZSwgYW5kIHJlYWR5IHRvIGhhdmUgbW9yZSBzdHVmZiB3cml0dGVuIHRvIGl0LiAqLyB9LFxuICAgICAgICBwYXJzZXIgPSBzYXgucGFyc2VyKHN0cmljdCksXG4gICAgICAgIGdyb3VwaW5nT2JqLFxuICAgICAgICBjdXJyZW50T2JqLFxuICAgICAgICBiZWdpbkdyb3VwaW5nID0gZmFsc2U7XG5cbiAgICBwYXJzZXIub25lcnJvciA9IG9uZXJyb3I7XG4gICAgcGFyc2VyLm9udGV4dCA9IG9udGV4dDtcblxuICAgIHBhcnNlci5vbmNsb3NldGFnID0gZnVuY3Rpb24obmFtZSkgeyAvLyBjbG9zaW5nIGEgdGFnLiAgbmFtZSBpcyB0aGUgbmFtZSBmcm9tIG9ub3BlbnRhZyBub2RlLm5hbWVcbiAgICAgICAgaWYgKCFiZWdpbkdyb3VwaW5nKSByZXR1cm47XG5cbiAgICAgICAgaWYgKG5hbWUgPT0gJ2dyb3VwJykge1xuICAgICAgICAgICAgdmFyIHAgPSBjdXJyZW50T2JqLnBhcmVudDtcbiAgICAgICAgICAgIGRlbGV0ZSBjdXJyZW50T2JqLnBhcmVudDtcbiAgICAgICAgICAgIGN1cnJlbnRPYmogPSBwO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHBhcnNlci5vbm9wZW50YWcgPSBmdW5jdGlvbihub2RlKSB7IC8vIG9wZW5lZCBhIHRhZy4gIG5vZGUgaGFzIFwibmFtZVwiIGFuZCBcImF0dHJpYnV0ZXNcIiwgaXNTZWxmQ2xvc2luZ1xuICAgICAgICBzd2l0Y2ggKG5vZGUubmFtZSkge1xuICAgICAgICBjYXNlICdncm91cGluZyc6XG4gICAgICAgICAgICBncm91cGluZ09iai5uYW1lID0gbm9kZS5hdHRyaWJ1dGVzLm5hbWU7XG4gICAgICAgICAgICBjdXJyZW50T2JqID0gZ3JvdXBpbmdPYmo7XG4gICAgICAgICAgICBiZWdpbkdyb3VwaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdncm91cCc6XG4gICAgICAgICAgICBpZiAoIWJlZ2luR3JvdXBpbmcpIGJyZWFrO1xuXG4gICAgICAgICAgICB2YXIgZyA9IHsgbmFtZTogbm9kZS5hdHRyaWJ1dGVzLm5hbWUsIG5vZGU6IG5vZGUuYXR0cmlidXRlcy5ub2RlIH07XG5cbiAgICAgICAgICAgIGN1cnJlbnRPYmouZ3JvdXBzID0gY3VycmVudE9iai5ncm91cHMgfHwgWyBdO1xuICAgICAgICAgICAgY3VycmVudE9iai5ncm91cHMucHVzaChnKTtcbiAgICAgICAgICAgIGcucGFyZW50ID0gY3VycmVudE9iajtcbiAgICAgICAgICAgIGN1cnJlbnRPYmogPSBnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3BhcnQnOlxuICAgICAgICAgICAgaWYgKCFiZWdpbkdyb3VwaW5nKSBicmVhaztcblxuICAgICAgICAgICAgY3VycmVudE9iai5wYXJ0cyA9IGN1cnJlbnRPYmoucGFydHMgfHwgWyBdO1xuICAgICAgICAgICAgY3VycmVudE9iai5wYXJ0cy5wdXNoKG5vZGUuYXR0cmlidXRlcy5ub2RlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHBhcnNlci5vbmF0dHJpYnV0ZSA9IG9uYXR0cmlidXRlO1xuICAgIHBhcnNlci5vbmVuZCA9IG9uZW5kO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ3JvdXBpbmcyanM6IGZ1bmN0aW9uKHhtbCkge1xuICAgICAgICAgICAgZ3JvdXBpbmdPYmogPSB7IH07XG4gICAgICAgICAgICBwYXJzZXIud3JpdGUoeG1sKS5jbG9zZSgpO1xuICAgICAgICAgICAgcmV0dXJuIGdyb3VwaW5nT2JqO1xuICAgICAgICB9LFxuICAgICAgICBwYXJzZXI6IHBhcnNlclxuICAgIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdyb3VwaW5nMmpzO1xuIiwiLyoqXG5UaGUgZm9sbG93aW5nIGJhdGNoZXMgYXJlIGVxdWl2YWxlbnQ6XG5cbnZhciBiZWF1dGlmeV9qcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5Jyk7XG52YXIgYmVhdXRpZnlfanMgPSByZXF1aXJlKCdqcy1iZWF1dGlmeScpLmpzO1xudmFyIGJlYXV0aWZ5X2pzID0gcmVxdWlyZSgnanMtYmVhdXRpZnknKS5qc19iZWF1dGlmeTtcblxudmFyIGJlYXV0aWZ5X2NzcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuY3NzO1xudmFyIGJlYXV0aWZ5X2NzcyA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuY3NzX2JlYXV0aWZ5O1xuXG52YXIgYmVhdXRpZnlfaHRtbCA9IHJlcXVpcmUoJ2pzLWJlYXV0aWZ5JykuaHRtbDtcbnZhciBiZWF1dGlmeV9odG1sID0gcmVxdWlyZSgnanMtYmVhdXRpZnknKS5odG1sX2JlYXV0aWZ5O1xuXG5BbGwgbWV0aG9kcyByZXR1cm5lZCBhY2NlcHQgdHdvIGFyZ3VtZW50cywgdGhlIHNvdXJjZSBzdHJpbmcgYW5kIGFuIG9wdGlvbnMgb2JqZWN0LlxuKiovXG5cbmZ1bmN0aW9uIGdldF9iZWF1dGlmeShqc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LCBodG1sX2JlYXV0aWZ5KSB7XG4gICAgLy8gdGhlIGRlZmF1bHQgaXMganNcbiAgICB2YXIgYmVhdXRpZnkgPSBmdW5jdGlvbiAoc3JjLCBjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIGpzX2JlYXV0aWZ5LmpzX2JlYXV0aWZ5KHNyYywgY29uZmlnKTtcbiAgICB9O1xuXG4gICAgLy8gc2hvcnQgYWxpYXNlc1xuICAgIGJlYXV0aWZ5LmpzICAgPSBqc19iZWF1dGlmeS5qc19iZWF1dGlmeTtcbiAgICBiZWF1dGlmeS5jc3MgID0gY3NzX2JlYXV0aWZ5LmNzc19iZWF1dGlmeTtcbiAgICBiZWF1dGlmeS5odG1sID0gaHRtbF9iZWF1dGlmeS5odG1sX2JlYXV0aWZ5O1xuXG4gICAgLy8gbGVnYWN5IGFsaWFzZXNcbiAgICBiZWF1dGlmeS5qc19iZWF1dGlmeSAgID0ganNfYmVhdXRpZnkuanNfYmVhdXRpZnk7XG4gICAgYmVhdXRpZnkuY3NzX2JlYXV0aWZ5ICA9IGNzc19iZWF1dGlmeS5jc3NfYmVhdXRpZnk7XG4gICAgYmVhdXRpZnkuaHRtbF9iZWF1dGlmeSA9IGh0bWxfYmVhdXRpZnkuaHRtbF9iZWF1dGlmeTtcblxuICAgIHJldHVybiBiZWF1dGlmeTtcbn1cblxuaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQWRkIHN1cHBvcnQgZm9yIEFNRCAoIGh0dHBzOi8vZ2l0aHViLmNvbS9hbWRqcy9hbWRqcy1hcGkvd2lraS9BTUQjZGVmaW5lYW1kLXByb3BlcnR5LSApXG4gICAgZGVmaW5lKFtcbiAgICAgICAgXCIuL2xpYi9iZWF1dGlmeVwiLFxuICAgICAgICBcIi4vbGliL2JlYXV0aWZ5LWNzc1wiLFxuICAgICAgICBcIi4vbGliL2JlYXV0aWZ5LWh0bWxcIlxuICAgIF0sIGZ1bmN0aW9uKGpzX2JlYXV0aWZ5LCBjc3NfYmVhdXRpZnksIGh0bWxfYmVhdXRpZnkpIHtcbiAgICAgICAgcmV0dXJuIGdldF9iZWF1dGlmeShqc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LCBodG1sX2JlYXV0aWZ5KTtcbiAgICB9KTtcbn0gZWxzZSB7XG4gICAgKGZ1bmN0aW9uKG1vZCkge1xuICAgICAgICB2YXIganNfYmVhdXRpZnkgPSByZXF1aXJlKCcuL2xpYi9iZWF1dGlmeScpO1xuICAgICAgICB2YXIgY3NzX2JlYXV0aWZ5ID0gcmVxdWlyZSgnLi9saWIvYmVhdXRpZnktY3NzJyk7XG4gICAgICAgIHZhciBodG1sX2JlYXV0aWZ5ID0gcmVxdWlyZSgnLi9saWIvYmVhdXRpZnktaHRtbCcpO1xuXG4gICAgICAgIG1vZC5leHBvcnRzID0gZ2V0X2JlYXV0aWZ5KGpzX2JlYXV0aWZ5LCBjc3NfYmVhdXRpZnksIGh0bWxfYmVhdXRpZnkpO1xuXG4gICAgfSkobW9kdWxlKTtcbn1cblxuIiwiLypqc2hpbnQgY3VybHk6dHJ1ZSwgZXFlcWVxOnRydWUsIGxheGJyZWFrOnRydWUsIG5vZW1wdHk6ZmFsc2UgKi9cbi8qXG5cbiAgVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbiAgQ29weXJpZ2h0IChjKSAyMDA3LTIwMTMgRWluYXIgTGllbG1hbmlzIGFuZCBjb250cmlidXRvcnMuXG5cbiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAgb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXNcbiAgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuICBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuICBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0ZcbiAgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkRcbiAgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSU1xuICBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbiAgQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU5cbiAgQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICBTT0ZUV0FSRS5cblxuXG4gQ1NTIEJlYXV0aWZpZXJcbi0tLS0tLS0tLS0tLS0tLVxuXG4gICAgV3JpdHRlbiBieSBIYXJ1dHl1biBBbWlyamFueWFuLCAoYW1pcmphbnlhbkBnbWFpbC5jb20pXG5cbiAgICBCYXNlZCBvbiBjb2RlIGluaXRpYWxseSBkZXZlbG9wZWQgYnk6IEVpbmFyIExpZWxtYW5pcywgPGVpbmFyQGpzYmVhdXRpZmllci5vcmc+XG4gICAgICAgIGh0dHA6Ly9qc2JlYXV0aWZpZXIub3JnL1xuXG4gICAgVXNhZ2U6XG4gICAgICAgIGNzc19iZWF1dGlmeShzb3VyY2VfdGV4dCk7XG4gICAgICAgIGNzc19iZWF1dGlmeShzb3VyY2VfdGV4dCwgb3B0aW9ucyk7XG5cbiAgICBUaGUgb3B0aW9ucyBhcmUgKGRlZmF1bHQgaW4gYnJhY2tldHMpOlxuICAgICAgICBpbmRlbnRfc2l6ZSAoNCkgICAgICAgICAgICAgICAgICAg4oCUIGluZGVudGF0aW9uIHNpemUsXG4gICAgICAgIGluZGVudF9jaGFyIChzcGFjZSkgICAgICAgICAgICAgICDigJQgY2hhcmFjdGVyIHRvIGluZGVudCB3aXRoLFxuICAgICAgICBzZWxlY3Rvcl9zZXBhcmF0b3JfbmV3bGluZSAodHJ1ZSkgLSBzZXBhcmF0ZSBzZWxlY3RvcnMgd2l0aCBuZXdsaW5lIG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdCAoZS5nLiBcImEsXFxuYnJcIiBvciBcImEsIGJyXCIpXG4gICAgICAgIGVuZF93aXRoX25ld2xpbmUgKGZhbHNlKSAgICAgICAgICAtIGVuZCB3aXRoIGEgbmV3bGluZVxuXG4gICAgZS5nXG5cbiAgICBjc3NfYmVhdXRpZnkoY3NzX3NvdXJjZV90ZXh0LCB7XG4gICAgICAnaW5kZW50X3NpemUnOiAxLFxuICAgICAgJ2luZGVudF9jaGFyJzogJ1xcdCcsXG4gICAgICAnc2VsZWN0b3Jfc2VwYXJhdG9yJzogJyAnLFxuICAgICAgJ2VuZF93aXRoX25ld2xpbmUnOiBmYWxzZSxcbiAgICB9KTtcbiovXG5cbi8vIGh0dHA6Ly93d3cudzMub3JnL1RSL0NTUzIxL3N5bmRhdGEuaHRtbCN0b2tlbml6YXRpb25cbi8vIGh0dHA6Ly93d3cudzMub3JnL1RSL2NzczMtc3ludGF4L1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgZnVuY3Rpb24gY3NzX2JlYXV0aWZ5KHNvdXJjZV90ZXh0LCBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB2YXIgaW5kZW50U2l6ZSA9IG9wdGlvbnMuaW5kZW50X3NpemUgfHwgNDtcbiAgICAgICAgdmFyIGluZGVudENoYXJhY3RlciA9IG9wdGlvbnMuaW5kZW50X2NoYXIgfHwgJyAnO1xuICAgICAgICB2YXIgc2VsZWN0b3JTZXBhcmF0b3JOZXdsaW5lID0gKG9wdGlvbnMuc2VsZWN0b3Jfc2VwYXJhdG9yX25ld2xpbmUgPT09IHVuZGVmaW5lZCkgPyB0cnVlIDogb3B0aW9ucy5zZWxlY3Rvcl9zZXBhcmF0b3JfbmV3bGluZTtcbiAgICAgICAgdmFyIGVuZF93aXRoX25ld2xpbmUgPSAob3B0aW9ucy5lbmRfd2l0aF9uZXdsaW5lID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmVuZF93aXRoX25ld2xpbmU7XG5cbiAgICAgICAgLy8gY29tcGF0aWJpbGl0eVxuICAgICAgICBpZiAodHlwZW9mIGluZGVudFNpemUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGluZGVudFNpemUgPSBwYXJzZUludChpbmRlbnRTaXplLCAxMCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIC8vIHRva2VuaXplclxuICAgICAgICB2YXIgd2hpdGVSZSA9IC9eXFxzKyQvO1xuICAgICAgICB2YXIgd29yZFJlID0gL1tcXHckXFwtX10vO1xuXG4gICAgICAgIHZhciBwb3MgPSAtMSxcbiAgICAgICAgICAgIGNoO1xuXG4gICAgICAgIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZV90ZXh0LmNoYXJBdCgrK3Bvcyk7XG4gICAgICAgICAgICByZXR1cm4gY2ggfHwgJyc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwZWVrKHNraXBXaGl0ZXNwYWNlKSB7XG4gICAgICAgICAgICB2YXIgcHJldl9wb3MgPSBwb3M7XG4gICAgICAgICAgICBpZiAoc2tpcFdoaXRlc3BhY2UpIHtcbiAgICAgICAgICAgICAgICBlYXRXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQgPSBzb3VyY2VfdGV4dC5jaGFyQXQocG9zICsgMSkgfHwgJyc7XG4gICAgICAgICAgICBwb3MgPSBwcmV2X3BvcyAtIDE7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZWF0U3RyaW5nKGVuZENoYXJzKSB7XG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBwb3M7XG4gICAgICAgICAgICB3aGlsZSAobmV4dCgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSBcIlxcXFxcIikge1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbmRDaGFycy5pbmRleE9mKGNoKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc291cmNlX3RleHQuc3Vic3RyaW5nKHN0YXJ0LCBwb3MgKyAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHBlZWtTdHJpbmcoZW5kQ2hhcikge1xuICAgICAgICAgICAgdmFyIHByZXZfcG9zID0gcG9zO1xuICAgICAgICAgICAgdmFyIHN0ciA9IGVhdFN0cmluZyhlbmRDaGFyKTtcbiAgICAgICAgICAgIHBvcyA9IHByZXZfcG9zIC0gMTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlYXRXaGl0ZXNwYWNlKCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgICAgICAgICAgd2hpbGUgKHdoaXRlUmUudGVzdChwZWVrKCkpKSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNraXBXaGl0ZXNwYWNlKCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgICAgICAgICAgaWYgKGNoICYmIHdoaXRlUmUudGVzdChjaCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlICh3aGl0ZVJlLnRlc3QobmV4dCgpKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBjaFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVhdENvbW1lbnQoc2luZ2xlTGluZSkge1xuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gcG9zO1xuICAgICAgICAgICAgdmFyIHNpbmdsZUxpbmUgPSBwZWVrKCkgPT09IFwiL1wiO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgd2hpbGUgKG5leHQoKSkge1xuICAgICAgICAgICAgICAgIGlmICghc2luZ2xlTGluZSAmJiBjaCA9PT0gXCIqXCIgJiYgcGVlaygpID09PSBcIi9cIikge1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2luZ2xlTGluZSAmJiBjaCA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc291cmNlX3RleHQuc3Vic3RyaW5nKHN0YXJ0LCBwb3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZV90ZXh0LnN1YnN0cmluZyhzdGFydCwgcG9zKSArIGNoO1xuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiBsb29rQmFjayhzdHIpIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2VfdGV4dC5zdWJzdHJpbmcocG9zIC0gc3RyLmxlbmd0aCwgcG9zKS50b0xvd2VyQ2FzZSgpID09PVxuICAgICAgICAgICAgICAgIHN0cjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5lc3RlZCBwc2V1ZG8tY2xhc3MgaWYgd2UgYXJlIGluc2lkZVJ1bGVcbiAgICAgICAgLy8gYW5kIHRoZSBuZXh0IHNwZWNpYWwgY2hhcmFjdGVyIGZvdW5kIG9wZW5zXG4gICAgICAgIC8vIGEgbmV3IGJsb2NrXG4gICAgICAgIGZ1bmN0aW9uIGZvdW5kTmVzdGVkUHNldWRvQ2xhc3MoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gcG9zICsgMTsgaSA8IHNvdXJjZV90ZXh0Lmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICB2YXIgY2ggPSBzb3VyY2VfdGV4dC5jaGFyQXQoaSk7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSBcIntcIil7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09IFwiO1wiIHx8IGNoID09PSBcIn1cIiB8fCBjaCA9PT0gXCIpXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHByaW50ZXJcbiAgICAgICAgdmFyIGJhc2ViYXNlSW5kZW50U3RyaW5nID0gc291cmNlX3RleHQubWF0Y2goL15bXFx0IF0qLylbMF07XG4gICAgICAgIHZhciBzaW5nbGVJbmRlbnQgPSBuZXcgQXJyYXkoaW5kZW50U2l6ZSArIDEpLmpvaW4oaW5kZW50Q2hhcmFjdGVyKTtcbiAgICAgICAgdmFyIGluZGVudExldmVsID0gMDtcbiAgICAgICAgdmFyIG5lc3RlZExldmVsID0gMDtcblxuICAgICAgICBmdW5jdGlvbiBpbmRlbnQoKSB7XG4gICAgICAgICAgICBpbmRlbnRMZXZlbCsrO1xuICAgICAgICAgICAgYmFzZWJhc2VJbmRlbnRTdHJpbmcgKz0gc2luZ2xlSW5kZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb3V0ZGVudCgpIHtcbiAgICAgICAgICAgIGluZGVudExldmVsLS07XG4gICAgICAgICAgICBiYXNlYmFzZUluZGVudFN0cmluZyA9IGJhc2ViYXNlSW5kZW50U3RyaW5nLnNsaWNlKDAsIC1pbmRlbnRTaXplKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwcmludCA9IHt9O1xuICAgICAgICBwcmludFtcIntcIl0gPSBmdW5jdGlvbihjaCkge1xuICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgcHJpbnRbXCJ9XCJdID0gZnVuY3Rpb24oY2gpIHtcbiAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBwcmludC5fbGFzdENoYXJXaGl0ZXNwYWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gd2hpdGVSZS50ZXN0KG91dHB1dFtvdXRwdXQubGVuZ3RoIC0gMV0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHByaW50Lm5ld0xpbmUgPSBmdW5jdGlvbihrZWVwV2hpdGVzcGFjZSkge1xuICAgICAgICAgICAgaWYgKCFrZWVwV2hpdGVzcGFjZSkge1xuICAgICAgICAgICAgICAgIHByaW50LnRyaW0oKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG91dHB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaCgnXFxuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYmFzZWJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChiYXNlYmFzZUluZGVudFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHByaW50LnNpbmdsZVNwYWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAob3V0cHV0Lmxlbmd0aCAmJiAhcHJpbnQuX2xhc3RDaGFyV2hpdGVzcGFjZSgpKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goJyAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBwcmludC50cmltID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB3aGlsZSAocHJpbnQuX2xhc3RDaGFyV2hpdGVzcGFjZSgpKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnBvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIFxuICAgICAgICB2YXIgb3V0cHV0ID0gW107XG4gICAgICAgIGlmIChiYXNlYmFzZUluZGVudFN0cmluZykge1xuICAgICAgICAgICAgb3V0cHV0LnB1c2goYmFzZWJhc2VJbmRlbnRTdHJpbmcpO1xuICAgICAgICB9XG4gICAgICAgIC8qX19fX19fX19fX19fX19fX19fX19fLS0tLS0tLS0tLS0tLS0tLS0tLS1fX19fX19fX19fX19fX19fX19fX18qL1xuXG4gICAgICAgIHZhciBpbnNpZGVSdWxlID0gZmFsc2U7XG4gICAgICAgIHZhciBlbnRlcmluZ0NvbmRpdGlvbmFsR3JvdXAgPSBmYWxzZTtcbiAgICAgICAgdmFyIHRvcF9jaCA9ICcnO1xuICAgICAgICB2YXIgbGFzdF90b3BfY2ggPSAnJztcblxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdmFyIHdoaXRlc3BhY2UgPSBza2lwV2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgdmFyIGlzQWZ0ZXJTcGFjZSA9IHdoaXRlc3BhY2UgIT09ICcnO1xuICAgICAgICAgICAgdmFyIGlzQWZ0ZXJOZXdsaW5lID0gd2hpdGVzcGFjZS5pbmRleE9mKCdcXG4nKSAhPT0gLTE7XG4gICAgICAgICAgICB2YXIgbGFzdF90b3BfY2ggPSB0b3BfY2g7XG4gICAgICAgICAgICB2YXIgdG9wX2NoID0gY2g7XG5cbiAgICAgICAgICAgIGlmICghY2gpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJyAmJiBwZWVrKCkgPT09ICcqJykgeyAvKiBjc3MgY29tbWVudCAqL1xuICAgICAgICAgICAgICAgIHZhciBoZWFkZXIgPSBsb29rQmFjayhcIlwiKTtcbiAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goZWF0Q29tbWVudCgpKTtcbiAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKCk7XG4gICAgICAgICAgICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICAgICAgICAgICAgICBwcmludC5uZXdMaW5lKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJyAmJiBwZWVrKCkgPT09ICcvJykgeyAvLyBzaW5nbGUgbGluZSBjb21tZW50XG4gICAgICAgICAgICAgICAgaWYgKCFpc0FmdGVyTmV3bGluZSAmJiBsYXN0X3RvcF9jaCAhPT0gJ3snKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnRyaW0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChlYXRDb21tZW50KCkpO1xuICAgICAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICdAJykge1xuICAgICAgICAgICAgICAgIC8vIHBhc3MgYWxvbmcgdGhlIHNwYWNlIHdlIGZvdW5kIGFzIGEgc2VwYXJhdGUgaXRlbVxuICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RyaXAgdHJhaWxpbmcgc3BhY2UsIGlmIHByZXNlbnQsIGZvciBoYXNoIHByb3BlcnR5IGNoZWNrc1xuICAgICAgICAgICAgICAgIHZhciB2YXJpYWJsZU9yUnVsZSA9IHBlZWtTdHJpbmcoXCI6ICw7e30oKVtdLz0nXFxcIlwiKS5yZXBsYWNlKC9cXHMkLywgJycpO1xuXG4gICAgICAgICAgICAgICAgLy8gbWlnaHQgYmUgYSBuZXN0aW5nIGF0LXJ1bGVcbiAgICAgICAgICAgICAgICBpZiAodmFyaWFibGVPclJ1bGUgaW4gY3NzX2JlYXV0aWZ5Lk5FU1RFRF9BVF9SVUxFKSB7XG4gICAgICAgICAgICAgICAgICAgIG5lc3RlZExldmVsICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYWJsZU9yUnVsZSBpbiBjc3NfYmVhdXRpZnkuQ09ORElUSU9OQUxfR1JPVVBfUlVMRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW50ZXJpbmdDb25kaXRpb25hbEdyb3VwID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJzogJy5pbmRleE9mKHZhcmlhYmxlT3JSdWxlW3ZhcmlhYmxlT3JSdWxlLmxlbmd0aCAtMV0pID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy93ZSBoYXZlIGEgdmFyaWFibGUsIGFkZCBpdCBhbmQgaW5zZXJ0IG9uZSBzcGFjZSBiZWZvcmUgY29udGludWluZ1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIHZhcmlhYmxlT3JSdWxlID0gZWF0U3RyaW5nKFwiOiBcIikucmVwbGFjZSgvXFxzJC8sICcnKTtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2godmFyaWFibGVPclJ1bGUpO1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICd7Jykge1xuICAgICAgICAgICAgICAgIGlmIChwZWVrKHRydWUpID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKFwie31cIik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50KCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50W1wie1wiXShjaCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gZW50ZXJpbmcgY29uZGl0aW9uYWwgZ3JvdXBzLCBvbmx5IHJ1bGVzZXRzIGFyZSBhbGxvd2VkXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbnRlcmluZ0NvbmRpdGlvbmFsR3JvdXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudGVyaW5nQ29uZGl0aW9uYWxHcm91cCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zaWRlUnVsZSA9IChpbmRlbnRMZXZlbCA+IG5lc3RlZExldmVsKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgZGVjbGFyYXRpb25zIGFyZSBhbHNvIGFsbG93ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2lkZVJ1bGUgPSAoaW5kZW50TGV2ZWwgPj0gbmVzdGVkTGV2ZWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgb3V0ZGVudCgpO1xuICAgICAgICAgICAgICAgIHByaW50W1wifVwiXShjaCk7XG4gICAgICAgICAgICAgICAgaW5zaWRlUnVsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChuZXN0ZWRMZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICBuZXN0ZWRMZXZlbC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09IFwiOlwiKSB7XG4gICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgIGlmICgoaW5zaWRlUnVsZSB8fCBlbnRlcmluZ0NvbmRpdGlvbmFsR3JvdXApICYmIFxuICAgICAgICAgICAgICAgICAgICAgICAgIShsb29rQmFjayhcIiZcIikgfHwgZm91bmROZXN0ZWRQc2V1ZG9DbGFzcygpKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyAncHJvcGVydHk6IHZhbHVlJyBkZWxpbWl0ZXJcbiAgICAgICAgICAgICAgICAgICAgLy8gd2hpY2ggY291bGQgYmUgaW4gYSBjb25kaXRpb25hbCBncm91cCBxdWVyeVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaCgnOicpO1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNhc3MvbGVzcyBwYXJlbnQgcmVmZXJlbmNlIGRvbid0IHVzZSBhIHNwYWNlXG4gICAgICAgICAgICAgICAgICAgIC8vIHNhc3MgbmVzdGVkIHBzZXVkby1jbGFzcyBkb24ndCB1c2UgYSBzcGFjZVxuICAgICAgICAgICAgICAgICAgICBpZiAocGVlaygpID09PSBcIjpcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHNldWRvLWVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKFwiOjpcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwc2V1ZG8tY2xhc3NcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKCc6Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnXCInIHx8IGNoID09PSAnXFwnJykge1xuICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goZWF0U3RyaW5nKGNoKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnOycpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICAgICAgcHJpbnQubmV3TGluZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJygnKSB7IC8vIG1heSBiZSBhIHVybFxuICAgICAgICAgICAgICAgIGlmIChsb29rQmFjayhcInVybFwiKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQucHVzaChjaCk7XG4gICAgICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoICE9PSAnKScgJiYgY2ggIT09ICdcIicgJiYgY2ggIT09ICdcXCcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goZWF0U3RyaW5nKCcpJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3MtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50LnNpbmdsZVNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgICAgICAgICBlYXRXaGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJywnKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgICAgIGVhdFdoaXRlc3BhY2UoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWluc2lkZVJ1bGUgJiYgc2VsZWN0b3JTZXBhcmF0b3JOZXdsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50Lm5ld0xpbmUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICddJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICdbJykge1xuICAgICAgICAgICAgICAgIGlmIChpc0FmdGVyU3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnQuc2luZ2xlU3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2goY2gpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJz0nKSB7IC8vIG5vIHdoaXRlc3BhY2UgYmVmb3JlIG9yIGFmdGVyXG4gICAgICAgICAgICAgICAgZWF0V2hpdGVzcGFjZSgpO1xuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQWZ0ZXJTcGFjZSkge1xuICAgICAgICAgICAgICAgICAgICBwcmludC5zaW5nbGVTcGFjZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgdmFyIHN3ZWV0Q29kZSA9IG91dHB1dC5qb2luKCcnKS5yZXBsYWNlKC9bXFxyXFxuXFx0IF0rJC8sICcnKTtcblxuICAgICAgICAvLyBlc3RhYmxpc2ggZW5kX3dpdGhfbmV3bGluZVxuICAgICAgICBpZiAoZW5kX3dpdGhfbmV3bGluZSkge1xuICAgICAgICAgICAgc3dlZXRDb2RlICs9IFwiXFxuXCI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3dlZXRDb2RlO1xuICAgIH1cblxuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0NTUy9BdC1ydWxlXG4gICAgY3NzX2JlYXV0aWZ5Lk5FU1RFRF9BVF9SVUxFID0ge1xuICAgICAgICBcIkBwYWdlXCI6IHRydWUsXG4gICAgICAgIFwiQGZvbnQtZmFjZVwiOiB0cnVlLFxuICAgICAgICBcIkBrZXlmcmFtZXNcIjogdHJ1ZSxcbiAgICAgICAgLy8gYWxzbyBpbiBDT05ESVRJT05BTF9HUk9VUF9SVUxFIGJlbG93XG4gICAgICAgIFwiQG1lZGlhXCI6IHRydWUsXG4gICAgICAgIFwiQHN1cHBvcnRzXCI6IHRydWUsXG4gICAgICAgIFwiQGRvY3VtZW50XCI6IHRydWVcbiAgICB9O1xuICAgIGNzc19iZWF1dGlmeS5DT05ESVRJT05BTF9HUk9VUF9SVUxFID0ge1xuICAgICAgICBcIkBtZWRpYVwiOiB0cnVlLFxuICAgICAgICBcIkBzdXBwb3J0c1wiOiB0cnVlLFxuICAgICAgICBcIkBkb2N1bWVudFwiOiB0cnVlXG4gICAgfTtcblxuICAgIC8qZ2xvYmFsIGRlZmluZSAqL1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBZGQgc3VwcG9ydCBmb3IgQU1EICggaHR0cHM6Ly9naXRodWIuY29tL2FtZGpzL2FtZGpzLWFwaS93aWtpL0FNRCNkZWZpbmVhbWQtcHJvcGVydHktIClcbiAgICAgICAgZGVmaW5lKFtdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgY3NzX2JlYXV0aWZ5OiBjc3NfYmVhdXRpZnlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIENvbW1vbkpTLiBKdXN0IHB1dCB0aGlzIGZpbGUgc29tZXdoZXJlIG9uIHlvdXIgcmVxdWlyZS5wYXRoc1xuICAgICAgICAvLyBhbmQgeW91IHdpbGwgYmUgYWJsZSB0byBgdmFyIGh0bWxfYmVhdXRpZnkgPSByZXF1aXJlKFwiYmVhdXRpZnlcIikuaHRtbF9iZWF1dGlmeWAuXG4gICAgICAgIGV4cG9ydHMuY3NzX2JlYXV0aWZ5ID0gY3NzX2JlYXV0aWZ5O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBJZiB3ZSdyZSBydW5uaW5nIGEgd2ViIHBhZ2UgYW5kIGRvbid0IGhhdmUgZWl0aGVyIG9mIHRoZSBhYm92ZSwgYWRkIG91ciBvbmUgZ2xvYmFsXG4gICAgICAgIHdpbmRvdy5jc3NfYmVhdXRpZnkgPSBjc3NfYmVhdXRpZnk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIElmIHdlIGRvbid0IGV2ZW4gaGF2ZSB3aW5kb3csIHRyeSBnbG9iYWwuXG4gICAgICAgIGdsb2JhbC5jc3NfYmVhdXRpZnkgPSBjc3NfYmVhdXRpZnk7XG4gICAgfVxuXG59KCkpO1xuIiwiLypqc2hpbnQgY3VybHk6dHJ1ZSwgZXFlcWVxOnRydWUsIGxheGJyZWFrOnRydWUsIG5vZW1wdHk6ZmFsc2UgKi9cbi8qXG5cbiAgVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbiAgQ29weXJpZ2h0IChjKSAyMDA3LTIwMTMgRWluYXIgTGllbG1hbmlzIGFuZCBjb250cmlidXRvcnMuXG5cbiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb25cbiAgb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXNcbiAgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxuICBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLFxuICBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLFxuICBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuICBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuICBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuICBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0ZcbiAgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkRcbiAgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSU1xuICBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbiAgQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU5cbiAgQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICBTT0ZUV0FSRS5cblxuXG4gU3R5bGUgSFRNTFxuLS0tLS0tLS0tLS0tLS0tXG5cbiAgV3JpdHRlbiBieSBOb2NodW0gU29zc29ua28sIChuc29zc29ua29AaG90bWFpbC5jb20pXG5cbiAgQmFzZWQgb24gY29kZSBpbml0aWFsbHkgZGV2ZWxvcGVkIGJ5OiBFaW5hciBMaWVsbWFuaXMsIDxlaW5hckBqc2JlYXV0aWZpZXIub3JnPlxuICAgIGh0dHA6Ly9qc2JlYXV0aWZpZXIub3JnL1xuXG4gIFVzYWdlOlxuICAgIHN0eWxlX2h0bWwoaHRtbF9zb3VyY2UpO1xuXG4gICAgc3R5bGVfaHRtbChodG1sX3NvdXJjZSwgb3B0aW9ucyk7XG5cbiAgVGhlIG9wdGlvbnMgYXJlOlxuICAgIGluZGVudF9pbm5lcl9odG1sIChkZWZhdWx0IGZhbHNlKSAg4oCUIGluZGVudCA8aGVhZD4gYW5kIDxib2R5PiBzZWN0aW9ucyxcbiAgICBpbmRlbnRfc2l6ZSAoZGVmYXVsdCA0KSAgICAgICAgICDigJQgaW5kZW50YXRpb24gc2l6ZSxcbiAgICBpbmRlbnRfY2hhciAoZGVmYXVsdCBzcGFjZSkgICAgICDigJQgY2hhcmFjdGVyIHRvIGluZGVudCB3aXRoLFxuICAgIHdyYXBfbGluZV9sZW5ndGggKGRlZmF1bHQgMjUwKSAgICAgICAgICAgIC0gIG1heGltdW0gYW1vdW50IG9mIGNoYXJhY3RlcnMgcGVyIGxpbmUgKDAgPSBkaXNhYmxlKVxuICAgIGJyYWNlX3N0eWxlIChkZWZhdWx0IFwiY29sbGFwc2VcIikgLSBcImNvbGxhcHNlXCIgfCBcImV4cGFuZFwiIHwgXCJlbmQtZXhwYW5kXCJcbiAgICAgICAgICAgIHB1dCBicmFjZXMgb24gdGhlIHNhbWUgbGluZSBhcyBjb250cm9sIHN0YXRlbWVudHMgKGRlZmF1bHQpLCBvciBwdXQgYnJhY2VzIG9uIG93biBsaW5lIChBbGxtYW4gLyBBTlNJIHN0eWxlKSwgb3IganVzdCBwdXQgZW5kIGJyYWNlcyBvbiBvd24gbGluZS5cbiAgICB1bmZvcm1hdHRlZCAoZGVmYXVsdHMgdG8gaW5saW5lIHRhZ3MpIC0gbGlzdCBvZiB0YWdzLCB0aGF0IHNob3VsZG4ndCBiZSByZWZvcm1hdHRlZFxuICAgIGluZGVudF9zY3JpcHRzIChkZWZhdWx0IG5vcm1hbCkgIC0gXCJrZWVwXCJ8XCJzZXBhcmF0ZVwifFwibm9ybWFsXCJcbiAgICBwcmVzZXJ2ZV9uZXdsaW5lcyAoZGVmYXVsdCB0cnVlKSAtIHdoZXRoZXIgZXhpc3RpbmcgbGluZSBicmVha3MgYmVmb3JlIGVsZW1lbnRzIHNob3VsZCBiZSBwcmVzZXJ2ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPbmx5IHdvcmtzIGJlZm9yZSBlbGVtZW50cywgbm90IGluc2lkZSB0YWdzIG9yIGZvciB0ZXh0LlxuICAgIG1heF9wcmVzZXJ2ZV9uZXdsaW5lcyAoZGVmYXVsdCB1bmxpbWl0ZWQpIC0gbWF4aW11bSBudW1iZXIgb2YgbGluZSBicmVha3MgdG8gYmUgcHJlc2VydmVkIGluIG9uZSBjaHVua1xuICAgIGluZGVudF9oYW5kbGViYXJzIChkZWZhdWx0IGZhbHNlKSAtIGZvcm1hdCBhbmQgaW5kZW50IHt7I2Zvb319IGFuZCB7ey9mb299fVxuICAgIGVuZF93aXRoX25ld2xpbmUgKGZhbHNlKSAgICAgICAgICAtIGVuZCB3aXRoIGEgbmV3bGluZVxuXG5cbiAgICBlLmcuXG5cbiAgICBzdHlsZV9odG1sKGh0bWxfc291cmNlLCB7XG4gICAgICAnaW5kZW50X2lubmVyX2h0bWwnOiBmYWxzZSxcbiAgICAgICdpbmRlbnRfc2l6ZSc6IDIsXG4gICAgICAnaW5kZW50X2NoYXInOiAnICcsXG4gICAgICAnd3JhcF9saW5lX2xlbmd0aCc6IDc4LFxuICAgICAgJ2JyYWNlX3N0eWxlJzogJ2V4cGFuZCcsXG4gICAgICAndW5mb3JtYXR0ZWQnOiBbJ2EnLCAnc3ViJywgJ3N1cCcsICdiJywgJ2knLCAndSddLFxuICAgICAgJ3ByZXNlcnZlX25ld2xpbmVzJzogdHJ1ZSxcbiAgICAgICdtYXhfcHJlc2VydmVfbmV3bGluZXMnOiA1LFxuICAgICAgJ2luZGVudF9oYW5kbGViYXJzJzogZmFsc2VcbiAgICB9KTtcbiovXG5cbihmdW5jdGlvbigpIHtcblxuICAgIGZ1bmN0aW9uIHRyaW0ocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbHRyaW0ocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9eXFxzKy9nLCAnJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcnRyaW0ocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9cXHMrJC9nLCcnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdHlsZV9odG1sKGh0bWxfc291cmNlLCBvcHRpb25zLCBqc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5KSB7XG4gICAgICAgIC8vV3JhcHBlciBmdW5jdGlvbiB0byBpbnZva2UgYWxsIHRoZSBuZWNlc3NhcnkgY29uc3RydWN0b3JzIGFuZCBkZWFsIHdpdGggdGhlIG91dHB1dC5cblxuICAgICAgICB2YXIgbXVsdGlfcGFyc2VyLFxuICAgICAgICAgICAgaW5kZW50X2lubmVyX2h0bWwsXG4gICAgICAgICAgICBpbmRlbnRfc2l6ZSxcbiAgICAgICAgICAgIGluZGVudF9jaGFyYWN0ZXIsXG4gICAgICAgICAgICB3cmFwX2xpbmVfbGVuZ3RoLFxuICAgICAgICAgICAgYnJhY2Vfc3R5bGUsXG4gICAgICAgICAgICB1bmZvcm1hdHRlZCxcbiAgICAgICAgICAgIHByZXNlcnZlX25ld2xpbmVzLFxuICAgICAgICAgICAgbWF4X3ByZXNlcnZlX25ld2xpbmVzLFxuICAgICAgICAgICAgaW5kZW50X2hhbmRsZWJhcnMsXG4gICAgICAgICAgICBlbmRfd2l0aF9uZXdsaW5lO1xuXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIC8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IHRvIDEuMy40XG4gICAgICAgIGlmICgob3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoID09PSB1bmRlZmluZWQgfHwgcGFyc2VJbnQob3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoLCAxMCkgPT09IDApICYmXG4gICAgICAgICAgICAgICAgKG9wdGlvbnMubWF4X2NoYXIgIT09IHVuZGVmaW5lZCAmJiBwYXJzZUludChvcHRpb25zLm1heF9jaGFyLCAxMCkgIT09IDApKSB7XG4gICAgICAgICAgICBvcHRpb25zLndyYXBfbGluZV9sZW5ndGggPSBvcHRpb25zLm1heF9jaGFyO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5kZW50X2lubmVyX2h0bWwgPSAob3B0aW9ucy5pbmRlbnRfaW5uZXJfaHRtbCA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5pbmRlbnRfaW5uZXJfaHRtbDtcbiAgICAgICAgaW5kZW50X3NpemUgPSAob3B0aW9ucy5pbmRlbnRfc2l6ZSA9PT0gdW5kZWZpbmVkKSA/IDQgOiBwYXJzZUludChvcHRpb25zLmluZGVudF9zaXplLCAxMCk7XG4gICAgICAgIGluZGVudF9jaGFyYWN0ZXIgPSAob3B0aW9ucy5pbmRlbnRfY2hhciA9PT0gdW5kZWZpbmVkKSA/ICcgJyA6IG9wdGlvbnMuaW5kZW50X2NoYXI7XG4gICAgICAgIGJyYWNlX3N0eWxlID0gKG9wdGlvbnMuYnJhY2Vfc3R5bGUgPT09IHVuZGVmaW5lZCkgPyAnY29sbGFwc2UnIDogb3B0aW9ucy5icmFjZV9zdHlsZTtcbiAgICAgICAgd3JhcF9saW5lX2xlbmd0aCA9ICBwYXJzZUludChvcHRpb25zLndyYXBfbGluZV9sZW5ndGgsIDEwKSA9PT0gMCA/IDMyNzg2IDogcGFyc2VJbnQob3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoIHx8IDI1MCwgMTApO1xuICAgICAgICB1bmZvcm1hdHRlZCA9IG9wdGlvbnMudW5mb3JtYXR0ZWQgfHwgWydhJywgJ3NwYW4nLCAnaW1nJywgJ2JkbycsICdlbScsICdzdHJvbmcnLCAnZGZuJywgJ2NvZGUnLCAnc2FtcCcsICdrYmQnLCAndmFyJywgJ2NpdGUnLCAnYWJicicsICdhY3JvbnltJywgJ3EnLCAnc3ViJywgJ3N1cCcsICd0dCcsICdpJywgJ2InLCAnYmlnJywgJ3NtYWxsJywgJ3UnLCAncycsICdzdHJpa2UnLCAnZm9udCcsICdpbnMnLCAnZGVsJywgJ3ByZScsICdhZGRyZXNzJywgJ2R0JywgJ2gxJywgJ2gyJywgJ2gzJywgJ2g0JywgJ2g1JywgJ2g2J107XG4gICAgICAgIHByZXNlcnZlX25ld2xpbmVzID0gKG9wdGlvbnMucHJlc2VydmVfbmV3bGluZXMgPT09IHVuZGVmaW5lZCkgPyB0cnVlIDogb3B0aW9ucy5wcmVzZXJ2ZV9uZXdsaW5lcztcbiAgICAgICAgbWF4X3ByZXNlcnZlX25ld2xpbmVzID0gcHJlc2VydmVfbmV3bGluZXMgP1xuICAgICAgICAgICAgKGlzTmFOKHBhcnNlSW50KG9wdGlvbnMubWF4X3ByZXNlcnZlX25ld2xpbmVzLCAxMCkpID8gMzI3ODYgOiBwYXJzZUludChvcHRpb25zLm1heF9wcmVzZXJ2ZV9uZXdsaW5lcywgMTApKVxuICAgICAgICAgICAgOiAwO1xuICAgICAgICBpbmRlbnRfaGFuZGxlYmFycyA9IChvcHRpb25zLmluZGVudF9oYW5kbGViYXJzID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmluZGVudF9oYW5kbGViYXJzO1xuICAgICAgICBlbmRfd2l0aF9uZXdsaW5lID0gKG9wdGlvbnMuZW5kX3dpdGhfbmV3bGluZSA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5lbmRfd2l0aF9uZXdsaW5lO1xuXG4gICAgICAgIGZ1bmN0aW9uIFBhcnNlcigpIHtcblxuICAgICAgICAgICAgdGhpcy5wb3MgPSAwOyAvL1BhcnNlciBwb3NpdGlvblxuICAgICAgICAgICAgdGhpcy50b2tlbiA9ICcnO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X21vZGUgPSAnQ09OVEVOVCc7IC8vcmVmbGVjdHMgdGhlIGN1cnJlbnQgUGFyc2VyIG1vZGU6IFRBRy9DT05URU5UXG4gICAgICAgICAgICB0aGlzLnRhZ3MgPSB7IC8vQW4gb2JqZWN0IHRvIGhvbGQgdGFncywgdGhlaXIgcG9zaXRpb24sIGFuZCB0aGVpciBwYXJlbnQtdGFncywgaW5pdGlhdGVkIHdpdGggZGVmYXVsdCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBwYXJlbnQ6ICdwYXJlbnQxJyxcbiAgICAgICAgICAgICAgICBwYXJlbnRjb3VudDogMSxcbiAgICAgICAgICAgICAgICBwYXJlbnQxOiAnJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnJztcbiAgICAgICAgICAgIHRoaXMudG9rZW5fdGV4dCA9IHRoaXMubGFzdF90b2tlbiA9IHRoaXMubGFzdF90ZXh0ID0gdGhpcy50b2tlbl90eXBlID0gJyc7XG4gICAgICAgICAgICB0aGlzLm5ld2xpbmVzID0gMDtcbiAgICAgICAgICAgIHRoaXMuaW5kZW50X2NvbnRlbnQgPSBpbmRlbnRfaW5uZXJfaHRtbDtcblxuICAgICAgICAgICAgdGhpcy5VdGlscyA9IHsgLy9VaWxpdGllcyBtYWRlIGF2YWlsYWJsZSB0byB0aGUgdmFyaW91cyBmdW5jdGlvbnNcbiAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlOiBcIlxcblxcclxcdCBcIi5zcGxpdCgnJyksXG4gICAgICAgICAgICAgICAgc2luZ2xlX3Rva2VuOiAnYnIsaW5wdXQsbGluayxtZXRhLCFkb2N0eXBlLGJhc2Vmb250LGJhc2UsYXJlYSxocix3YnIscGFyYW0saW1nLGlzaW5kZXgsP3htbCxlbWJlZCw/cGhwLD8sPz0nLnNwbGl0KCcsJyksIC8vYWxsIHRoZSBzaW5nbGUgdGFncyBmb3IgSFRNTFxuICAgICAgICAgICAgICAgIGV4dHJhX2xpbmVyczogJ2hlYWQsYm9keSwvaHRtbCcuc3BsaXQoJywnKSwgLy9mb3IgdGFncyB0aGF0IG5lZWQgYSBsaW5lIG9mIHdoaXRlc3BhY2UgYmVmb3JlIHRoZW1cbiAgICAgICAgICAgICAgICBpbl9hcnJheTogZnVuY3Rpb24od2hhdCwgYXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAod2hhdCA9PT0gYXJyW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFJldHVybiB0cnVlIGlmZiB0aGUgZ2l2ZW4gdGV4dCBpcyBjb21wb3NlZCBlbnRpcmVseSBvZlxuICAgICAgICAgICAgLy8gd2hpdGVzcGFjZS5cbiAgICAgICAgICAgIHRoaXMuaXNfd2hpdGVzcGFjZSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IHRleHQubGVuZ3RoOyB0ZXh0KyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLlV0aWxzLmluX2FycmF5KHRleHQuY2hhckF0KG4pLCB0aGlzLlV0aWxzLndoaXRlc3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMudHJhdmVyc2Vfd2hpdGVzcGFjZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBpbnB1dF9jaGFyID0gJyc7XG5cbiAgICAgICAgICAgICAgICBpbnB1dF9jaGFyID0gdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLlV0aWxzLmluX2FycmF5KGlucHV0X2NoYXIsIHRoaXMuVXRpbHMud2hpdGVzcGFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXdsaW5lcyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLlV0aWxzLmluX2FycmF5KGlucHV0X2NoYXIsIHRoaXMuVXRpbHMud2hpdGVzcGFjZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmVzZXJ2ZV9uZXdsaW5lcyAmJiBpbnB1dF9jaGFyID09PSAnXFxuJyAmJiB0aGlzLm5ld2xpbmVzIDw9IG1heF9wcmVzZXJ2ZV9uZXdsaW5lcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV3bGluZXMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEFwcGVuZCBhIHNwYWNlIHRvIHRoZSBnaXZlbiBjb250ZW50IChzdHJpbmcgYXJyYXkpIG9yLCBpZiB3ZSBhcmVcbiAgICAgICAgICAgIC8vIGF0IHRoZSB3cmFwX2xpbmVfbGVuZ3RoLCBhcHBlbmQgYSBuZXdsaW5lL2luZGVudGF0aW9uLlxuICAgICAgICAgICAgdGhpcy5zcGFjZV9vcl93cmFwID0gZnVuY3Rpb24oY29udGVudCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpbmVfY2hhcl9jb3VudCA+PSB0aGlzLndyYXBfbGluZV9sZW5ndGgpIHsgLy9pbnNlcnQgYSBsaW5lIHdoZW4gdGhlIHdyYXBfbGluZV9sZW5ndGggaXMgcmVhY2hlZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X25ld2xpbmUoZmFsc2UsIGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X2luZGVudGF0aW9uKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQucHVzaCgnICcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuZ2V0X2NvbnRlbnQgPSBmdW5jdGlvbigpIHsgLy9mdW5jdGlvbiB0byBjYXB0dXJlIHJlZ3VsYXIgY29udGVudCBiZXR3ZWVuIHRhZ3NcbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRfY2hhciA9ICcnLFxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gW10sXG4gICAgICAgICAgICAgICAgICAgIHNwYWNlID0gZmFsc2U7IC8vaWYgYSBzcGFjZSBpcyBuZWVkZWRcblxuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcykgIT09ICc8Jykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy5pbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50Lmxlbmd0aCA/IGNvbnRlbnQuam9pbignJykgOiBbJycsICdUS19FT0YnXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyYXZlcnNlX3doaXRlc3BhY2UoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGFjZV9vcl93cmFwKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZW50X2hhbmRsZWJhcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZWJhcnMgcGFyc2luZyBpcyBjb21wbGljYXRlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHt7I2Zvb319IGFuZCB7ey9mb299fSBhcmUgZm9ybWF0dGVkIHRhZ3MuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB7e3NvbWV0aGluZ319IHNob3VsZCBnZXQgdHJlYXRlZCBhcyBjb250ZW50LCBleGNlcHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB7e2Vsc2V9fSBzcGVjaWZpY2FsbHkgYmVoYXZlcyBsaWtlIHt7I2lmfX0gYW5kIHt7L2lmfX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwZWVrMyA9IHRoaXMuaW5wdXQuc3Vic3RyKHRoaXMucG9zLCAzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWVrMyA9PT0gJ3t7IycgfHwgcGVlazMgPT09ICd7ey8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlc2UgYXJlIHRhZ3MgYW5kIG5vdCBjb250ZW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlucHV0LnN1YnN0cih0aGlzLnBvcywgMikgPT09ICd7eycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXRfdGFnKHRydWUpID09PSAne3tlbHNlfX0nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSB0aGlzLmlucHV0LmNoYXJBdCh0aGlzLnBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zKys7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQucHVzaChpbnB1dF9jaGFyKTsgLy9sZXR0ZXIgYXQtYS10aW1lIChvciBzdHJpbmcpIGluc2VydGVkIHRvIGFuIGFycmF5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50Lmxlbmd0aCA/IGNvbnRlbnQuam9pbignJykgOiAnJztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuZ2V0X2NvbnRlbnRzX3RvID0gZnVuY3Rpb24obmFtZSkgeyAvL2dldCB0aGUgZnVsbCBjb250ZW50IG9mIGEgc2NyaXB0IG9yIHN0eWxlIHRvIHBhc3MgdG8ganNfYmVhdXRpZnlcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb3MgPT09IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbJycsICdUS19FT0YnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGlucHV0X2NoYXIgPSAnJztcbiAgICAgICAgICAgICAgICB2YXIgY29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgIHZhciByZWdfbWF0Y2ggPSBuZXcgUmVnRXhwKCc8LycgKyBuYW1lICsgJ1xcXFxzKj4nLCAnaWdtJyk7XG4gICAgICAgICAgICAgICAgcmVnX21hdGNoLmxhc3RJbmRleCA9IHRoaXMucG9zO1xuICAgICAgICAgICAgICAgIHZhciByZWdfYXJyYXkgPSByZWdfbWF0Y2guZXhlYyh0aGlzLmlucHV0KTtcbiAgICAgICAgICAgICAgICB2YXIgZW5kX3NjcmlwdCA9IHJlZ19hcnJheSA/IHJlZ19hcnJheS5pbmRleCA6IHRoaXMuaW5wdXQubGVuZ3RoOyAvL2Fic29sdXRlIGVuZCBvZiBzY3JpcHRcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wb3MgPCBlbmRfc2NyaXB0KSB7IC8vZ2V0IGV2ZXJ5dGhpbmcgaW4gYmV0d2VlbiB0aGUgc2NyaXB0IHRhZ3NcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IHRoaXMuaW5wdXQuc3Vic3RyaW5nKHRoaXMucG9zLCBlbmRfc2NyaXB0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3MgPSBlbmRfc2NyaXB0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMucmVjb3JkX3RhZyA9IGZ1bmN0aW9uKHRhZykgeyAvL2Z1bmN0aW9uIHRvIHJlY29yZCBhIHRhZyBhbmQgaXRzIHBhcmVudCBpbiB0aGlzLnRhZ3MgT2JqZWN0XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSkgeyAvL2NoZWNrIGZvciB0aGUgZXhpc3RlbmNlIG9mIHRoaXMgdGFnIHR5cGVcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdzW3RhZyArICdjb3VudCddKys7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J11dID0gdGhpcy5pbmRlbnRfbGV2ZWw7IC8vYW5kIHJlY29yZCB0aGUgcHJlc2VudCBpbmRlbnQgbGV2ZWxcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvL290aGVyd2lzZSBpbml0aWFsaXplIHRoaXMgdGFnIHR5cGVcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdzW3RhZyArICdjb3VudCddID0gMTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdzW3RhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXV0gPSB0aGlzLmluZGVudF9sZXZlbDsgLy9hbmQgcmVjb3JkIHRoZSBwcmVzZW50IGluZGVudCBsZXZlbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnRhZ3NbdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddICsgJ3BhcmVudCddID0gdGhpcy50YWdzLnBhcmVudDsgLy9zZXQgdGhlIHBhcmVudCAoaS5lLiBpbiB0aGUgY2FzZSBvZiBhIGRpdiB0aGlzLnRhZ3MuZGl2MXBhcmVudClcbiAgICAgICAgICAgICAgICB0aGlzLnRhZ3MucGFyZW50ID0gdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddOyAvL2FuZCBtYWtlIHRoaXMgdGhlIGN1cnJlbnQgcGFyZW50IChpLmUuIGluIHRoZSBjYXNlIG9mIGEgZGl2ICdkaXYxJylcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMucmV0cmlldmVfdGFnID0gZnVuY3Rpb24odGFnKSB7IC8vZnVuY3Rpb24gdG8gcmV0cmlldmUgdGhlIG9wZW5pbmcgdGFnIHRvIHRoZSBjb3JyZXNwb25kaW5nIGNsb3NlclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10pIHsgLy9pZiB0aGUgb3BlbmVuZXIgaXMgbm90IGluIHRoZSBPYmplY3Qgd2UgaWdub3JlIGl0XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wX3BhcmVudCA9IHRoaXMudGFncy5wYXJlbnQ7IC8vY2hlY2sgdG8gc2VlIGlmIGl0J3MgYSBjbG9zYWJsZSB0YWcuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICh0ZW1wX3BhcmVudCkgeyAvL3RpbGwgd2UgcmVhY2ggJycgKHRoZSBpbml0aWFsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J10gPT09IHRlbXBfcGFyZW50KSB7IC8vaWYgdGhpcyBpcyBpdCB1c2UgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBfcGFyZW50ID0gdGhpcy50YWdzW3RlbXBfcGFyZW50ICsgJ3BhcmVudCddOyAvL290aGVyd2lzZSBrZWVwIG9uIGNsaW1iaW5nIHVwIHRoZSBET00gVHJlZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0ZW1wX3BhcmVudCkgeyAvL2lmIHdlIGNhdWdodCBzb21ldGhpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2xldmVsID0gdGhpcy50YWdzW3RhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXV07IC8vc2V0IHRoZSBpbmRlbnRfbGV2ZWwgYWNjb3JkaW5nbHlcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFncy5wYXJlbnQgPSB0aGlzLnRhZ3NbdGVtcF9wYXJlbnQgKyAncGFyZW50J107IC8vYW5kIHNldCB0aGUgY3VycmVudCBwYXJlbnRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy50YWdzW3RhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSArICdwYXJlbnQnXTsgLy9kZWxldGUgdGhlIGNsb3NlZCB0YWdzIHBhcmVudCByZWZlcmVuY2UuLi5cbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudGFnc1t0YWcgKyB0aGlzLnRhZ3NbdGFnICsgJ2NvdW50J11dOyAvLy4uLmFuZCB0aGUgdGFnIGl0c2VsZlxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50YWdzW3RhZyArICdjb3VudCddID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy50YWdzW3RhZyArICdjb3VudCddO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdzW3RhZyArICdjb3VudCddLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmluZGVudF90b190YWcgPSBmdW5jdGlvbih0YWcpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXRjaCB0aGUgaW5kZW50YXRpb24gbGV2ZWwgdG8gdGhlIGxhc3QgdXNlIG9mIHRoaXMgdGFnLCBidXQgZG9uJ3QgcmVtb3ZlIGl0LlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy50YWdzW3RhZyArICdjb3VudCddKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHRlbXBfcGFyZW50ID0gdGhpcy50YWdzLnBhcmVudDtcbiAgICAgICAgICAgICAgICB3aGlsZSAodGVtcF9wYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhZyArIHRoaXMudGFnc1t0YWcgKyAnY291bnQnXSA9PT0gdGVtcF9wYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRlbXBfcGFyZW50ID0gdGhpcy50YWdzW3RlbXBfcGFyZW50ICsgJ3BhcmVudCddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGVtcF9wYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfbGV2ZWwgPSB0aGlzLnRhZ3NbdGFnICsgdGhpcy50YWdzW3RhZyArICdjb3VudCddXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF90YWcgPSBmdW5jdGlvbihwZWVrKSB7IC8vZnVuY3Rpb24gdG8gZ2V0IGEgZnVsbCB0YWcgYW5kIHBhcnNlIGl0cyB0eXBlXG4gICAgICAgICAgICAgICAgdmFyIGlucHV0X2NoYXIgPSAnJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gJycsXG4gICAgICAgICAgICAgICAgICAgIHNwYWNlID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydCwgdGFnX2VuZCxcbiAgICAgICAgICAgICAgICAgICAgdGFnX3N0YXJ0X2NoYXIsXG4gICAgICAgICAgICAgICAgICAgIG9yaWdfcG9zID0gdGhpcy5wb3MsXG4gICAgICAgICAgICAgICAgICAgIG9yaWdfbGluZV9jaGFyX2NvdW50ID0gdGhpcy5saW5lX2NoYXJfY291bnQ7XG5cbiAgICAgICAgICAgICAgICBwZWVrID0gcGVlayAhPT0gdW5kZWZpbmVkID8gcGVlayA6IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy5pbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3MgPSBvcmlnX3BvcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCA9IG9yaWdfbGluZV9jaGFyX2NvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQubGVuZ3RoID8gY29udGVudC5qb2luKCcnKSA6IFsnJywgJ1RLX0VPRiddO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaW5wdXRfY2hhciA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3MrKztcblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5VdGlscy5pbl9hcnJheShpbnB1dF9jaGFyLCB0aGlzLlV0aWxzLndoaXRlc3BhY2UpKSB7IC8vZG9uJ3Qgd2FudCB0byBpbnNlcnQgdW5uZWNlc3Nhcnkgc3BhY2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYWNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0X2NoYXIgPT09IFwiJ1wiIHx8IGlucHV0X2NoYXIgPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgKz0gdGhpcy5nZXRfdW5mb3JtYXR0ZWQoaW5wdXRfY2hhcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dF9jaGFyID09PSAnPScpIHsgLy9ubyBzcGFjZSBiZWZvcmUgPVxuICAgICAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50Lmxlbmd0aCAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMV0gIT09ICc9JyAmJiBpbnB1dF9jaGFyICE9PSAnPicgJiYgc3BhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vbm8gc3BhY2UgYWZ0ZXIgPSBvciBiZWZvcmUgPlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGFjZV9vcl93cmFwKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRlbnRfaGFuZGxlYmFycyAmJiB0YWdfc3RhcnRfY2hhciA9PT0gJzwnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIGluc2lkZSBhbiBhbmdsZS1icmFja2V0IHRhZywgcHV0IHNwYWNlcyBhcm91bmRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhhbmRsZWJhcnMgbm90IGluc2lkZSBvZiBzdHJpbmdzLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChpbnB1dF9jaGFyICsgdGhpcy5pbnB1dC5jaGFyQXQodGhpcy5wb3MpKSA9PT0gJ3t7Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgKz0gdGhpcy5nZXRfdW5mb3JtYXR0ZWQoJ319Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQubGVuZ3RoICYmIGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAxXSAhPT0gJyAnICYmIGNvbnRlbnRbY29udGVudC5sZW5ndGggLSAxXSAhPT0gJzwnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0X2NoYXIgPSAnICcgKyBpbnB1dF9jaGFyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFjZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXRfY2hhciA9PT0gJzwnICYmICF0YWdfc3RhcnRfY2hhcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFnX3N0YXJ0ID0gdGhpcy5wb3MgLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFnX3N0YXJ0X2NoYXIgPSAnPCc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZW50X2hhbmRsZWJhcnMgJiYgIXRhZ19zdGFydF9jaGFyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudC5sZW5ndGggPj0gMiAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMV0gPT09ICd7JyAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMl0gPT0gJ3snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0X2NoYXIgPT09ICcjJyB8fCBpbnB1dF9jaGFyID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFnX3N0YXJ0ID0gdGhpcy5wb3MgLSAzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZ19zdGFydCA9IHRoaXMucG9zIC0gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFnX3N0YXJ0X2NoYXIgPSAneyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmVfY2hhcl9jb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50LnB1c2goaW5wdXRfY2hhcik7IC8vaW5zZXJ0cyBjaGFyYWN0ZXIgYXQtYS10aW1lIChvciBzdHJpbmcpXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnRbMV0gJiYgY29udGVudFsxXSA9PT0gJyEnKSB7IC8vaWYgd2UncmUgaW4gYSBjb21tZW50LCBkbyBzb21ldGhpbmcgc3BlY2lhbFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgdHJlYXQgYWxsIGNvbW1lbnRzIGFzIGxpdGVyYWxzLCBldmVuIG1vcmUgdGhhbiBwcmVmb3JtYXR0ZWQgdGFnc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UganVzdCBsb29rIGZvciB0aGUgYXBwcm9wcmlhdGUgY2xvc2UgdGFnXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gW3RoaXMuZ2V0X2NvbW1lbnQodGFnX3N0YXJ0KV07XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRlbnRfaGFuZGxlYmFycyAmJiB0YWdfc3RhcnRfY2hhciA9PT0gJ3snICYmIGNvbnRlbnQubGVuZ3RoID4gMiAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMl0gPT09ICd9JyAmJiBjb250ZW50W2NvbnRlbnQubGVuZ3RoIC0gMV0gPT09ICd9Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IHdoaWxlIChpbnB1dF9jaGFyICE9PSAnPicpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHRhZ19jb21wbGV0ZSA9IGNvbnRlbnQuam9pbignJyk7XG4gICAgICAgICAgICAgICAgdmFyIHRhZ19pbmRleDtcbiAgICAgICAgICAgICAgICB2YXIgdGFnX29mZnNldDtcblxuICAgICAgICAgICAgICAgIGlmICh0YWdfY29tcGxldGUuaW5kZXhPZignICcpICE9PSAtMSkgeyAvL2lmIHRoZXJlJ3Mgd2hpdGVzcGFjZSwgdGhhdHMgd2hlcmUgdGhlIHRhZyBuYW1lIGVuZHNcbiAgICAgICAgICAgICAgICAgICAgdGFnX2luZGV4ID0gdGFnX2NvbXBsZXRlLmluZGV4T2YoJyAnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhZ19jb21wbGV0ZVswXSA9PT0gJ3snKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhZ19pbmRleCA9IHRhZ19jb21wbGV0ZS5pbmRleE9mKCd9Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy9vdGhlcndpc2UgZ28gd2l0aCB0aGUgdGFnIGVuZGluZ1xuICAgICAgICAgICAgICAgICAgICB0YWdfaW5kZXggPSB0YWdfY29tcGxldGUuaW5kZXhPZignPicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGFnX2NvbXBsZXRlWzBdID09PSAnPCcgfHwgIWluZGVudF9oYW5kbGViYXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhZ19vZmZzZXQgPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhZ19vZmZzZXQgPSB0YWdfY29tcGxldGVbMl0gPT09ICcjJyA/IDMgOiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgdGFnX2NoZWNrID0gdGFnX2NvbXBsZXRlLnN1YnN0cmluZyh0YWdfb2Zmc2V0LCB0YWdfaW5kZXgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgaWYgKHRhZ19jb21wbGV0ZS5jaGFyQXQodGFnX2NvbXBsZXRlLmxlbmd0aCAtIDIpID09PSAnLycgfHxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5VdGlscy5pbl9hcnJheSh0YWdfY2hlY2ssIHRoaXMuVXRpbHMuc2luZ2xlX3Rva2VuKSkgeyAvL2lmIHRoaXMgdGFnIG5hbWUgaXMgYSBzaW5nbGUgdGFnIHR5cGUgKGVpdGhlciBpbiB0aGUgbGlzdCBvciBoYXMgYSBjbG9zaW5nIC8pXG4gICAgICAgICAgICAgICAgICAgIGlmICghcGVlaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdTSU5HTEUnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRlbnRfaGFuZGxlYmFycyAmJiB0YWdfY29tcGxldGVbMF0gPT09ICd7JyAmJiB0YWdfY2hlY2sgPT09ICdlbHNlJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X3RvX3RhZygnaWYnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFnX3R5cGUgPSAnSEFORExFQkFSU19FTFNFJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2NvbnRlbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmF2ZXJzZV93aGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNfdW5mb3JtYXR0ZWQodGFnX2NoZWNrLCB1bmZvcm1hdHRlZCkpIHsgLy8gZG8gbm90IHJlZm9ybWF0IHRoZSBcInVuZm9ybWF0dGVkXCIgdGFnc1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gdGhpcy5nZXRfdW5mb3JtYXR0ZWQoJzwvJyArIHRhZ19jaGVjayArICc+JywgdGFnX2NvbXBsZXRlKTsgLy8uLi5kZWxlZ2F0ZSB0byBnZXRfdW5mb3JtYXR0ZWQgZnVuY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgY29udGVudC5wdXNoKGNvbW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB0YWdfZW5kID0gdGhpcy5wb3MgLSAxO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJ1NJTkdMRSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0YWdfY2hlY2sgPT09ICdzY3JpcHQnICYmXG4gICAgICAgICAgICAgICAgICAgICh0YWdfY29tcGxldGUuc2VhcmNoKCd0eXBlJykgPT09IC0xIHx8XG4gICAgICAgICAgICAgICAgICAgICh0YWdfY29tcGxldGUuc2VhcmNoKCd0eXBlJykgPiAtMSAmJlxuICAgICAgICAgICAgICAgICAgICB0YWdfY29tcGxldGUuc2VhcmNoKC9cXGIodGV4dHxhcHBsaWNhdGlvbilcXC8oeC0pPyhqYXZhc2NyaXB0fGVjbWFzY3JpcHR8anNjcmlwdHxsaXZlc2NyaXB0KS8pID4gLTEpKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVjb3JkX3RhZyh0YWdfY2hlY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdTQ1JJUFQnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0YWdfY2hlY2sgPT09ICdzdHlsZScgJiZcbiAgICAgICAgICAgICAgICAgICAgKHRhZ19jb21wbGV0ZS5zZWFyY2goJ3R5cGUnKSA9PT0gLTEgfHxcbiAgICAgICAgICAgICAgICAgICAgKHRhZ19jb21wbGV0ZS5zZWFyY2goJ3R5cGUnKSA+IC0xICYmIHRhZ19jb21wbGV0ZS5zZWFyY2goJ3RleHQvY3NzJykgPiAtMSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGVlaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWNvcmRfdGFnKHRhZ19jaGVjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJ1NUWUxFJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFnX2NoZWNrLmNoYXJBdCgwKSA9PT0gJyEnKSB7IC8vcGVlayBmb3IgPCEgY29tbWVudFxuICAgICAgICAgICAgICAgICAgICAvLyBmb3IgY29tbWVudHMgY29udGVudCBpcyBhbHJlYWR5IGNvcnJlY3QuXG4gICAgICAgICAgICAgICAgICAgIGlmICghcGVlaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdTSU5HTEUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmF2ZXJzZV93aGl0ZXNwYWNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YWdfY2hlY2suY2hhckF0KDApID09PSAnLycpIHsgLy90aGlzIHRhZyBpcyBhIGRvdWJsZSB0YWcgc28gY2hlY2sgZm9yIHRhZy1lbmRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmV0cmlldmVfdGFnKHRhZ19jaGVjay5zdWJzdHJpbmcoMSkpOyAvL3JlbW92ZSBpdCBhbmQgYWxsIGFuY2VzdG9yc1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YWdfdHlwZSA9ICdFTkQnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvL290aGVyd2lzZSBpdCdzIGEgc3RhcnQtdGFnXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlY29yZF90YWcodGFnX2NoZWNrKTsgLy9wdXNoIGl0IG9uIHRoZSB0YWcgc3RhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YWdfY2hlY2sudG9Mb3dlckNhc2UoKSAhPT0gJ2h0bWwnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfY29udGVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhZ190eXBlID0gJ1NUQVJUJztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsbG93IHByZXNlcnZpbmcgb2YgbmV3bGluZXMgYWZ0ZXIgYSBzdGFydCBvciBlbmQgdGFnXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyYXZlcnNlX3doaXRlc3BhY2UoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGFjZV9vcl93cmFwKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuVXRpbHMuaW5fYXJyYXkodGFnX2NoZWNrLCB0aGlzLlV0aWxzLmV4dHJhX2xpbmVycykpIHsgLy9jaGVjayBpZiB0aGlzIGRvdWJsZSBuZWVkcyBhbiBleHRyYSBsaW5lXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X25ld2xpbmUoZmFsc2UsIHRoaXMub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm91dHB1dC5sZW5ndGggJiYgdGhpcy5vdXRwdXRbdGhpcy5vdXRwdXQubGVuZ3RoIC0gMl0gIT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmludF9uZXdsaW5lKHRydWUsIHRoaXMub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChwZWVrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zID0gb3JpZ19wb3M7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50ID0gb3JpZ19saW5lX2NoYXJfY291bnQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQuam9pbignJyk7IC8vcmV0dXJucyBmdWxseSBmb3JtYXR0ZWQgdGFnXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF9jb21tZW50ID0gZnVuY3Rpb24oc3RhcnRfcG9zKSB7IC8vZnVuY3Rpb24gdG8gcmV0dXJuIGNvbW1lbnQgY29udGVudCBpbiBpdHMgZW50aXJldHlcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIHdpbGwgaGF2ZSB2ZXJ5IHBvb3IgcGVyZiwgYnV0IHdpbGwgd29yayBmb3Igbm93LlxuICAgICAgICAgICAgICAgIHZhciBjb21tZW50ID0gJycsXG4gICAgICAgICAgICAgICAgICAgIGRlbGltaXRlciA9ICc+JyxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5wb3MgPSBzdGFydF9wb3M7XG4gICAgICAgICAgICAgICAgaW5wdXRfY2hhciA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcysrO1xuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMucG9zIDw9IHRoaXMuaW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gaW5wdXRfY2hhcjtcblxuICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IG5lZWQgdG8gY2hlY2sgZm9yIHRoZSBkZWxpbWl0ZXIgaWYgdGhlIGxhc3QgY2hhcnMgbWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbW1lbnRbY29tbWVudC5sZW5ndGggLSAxXSA9PT0gZGVsaW1pdGVyW2RlbGltaXRlci5sZW5ndGggLSAxXSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudC5pbmRleE9mKGRlbGltaXRlcikgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgbmVlZCB0byBzZWFyY2ggZm9yIGN1c3RvbSBkZWxpbWl0ZXIgZm9yIHRoZSBmaXJzdCBmZXcgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGNoZWQgJiYgY29tbWVudC5sZW5ndGggPCAxMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbW1lbnQuaW5kZXhPZignPCFbaWYnKSA9PT0gMCkgeyAvL3BlZWsgZm9yIDwhW2lmIGNvbmRpdGlvbmFsIGNvbW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxpbWl0ZXIgPSAnPCFbZW5kaWZdPic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbW1lbnQuaW5kZXhPZignPCFbY2RhdGFbJykgPT09IDApIHsgLy9pZiBpdCdzIGEgPFtjZGF0YVsgY29tbWVudC4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGltaXRlciA9ICddXT4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb21tZW50LmluZGV4T2YoJzwhWycpID09PSAwKSB7IC8vIHNvbWUgb3RoZXIgIVsgY29tbWVudD8gLi4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsaW1pdGVyID0gJ10+JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tbWVudC5pbmRleE9mKCc8IS0tJykgPT09IDApIHsgLy8gPCEtLSBjb21tZW50IC4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGltaXRlciA9ICctLT4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaW5wdXRfY2hhciA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3MrKztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gY29tbWVudDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuZ2V0X3VuZm9ybWF0dGVkID0gZnVuY3Rpb24oZGVsaW1pdGVyLCBvcmlnX3RhZykgeyAvL2Z1bmN0aW9uIHRvIHJldHVybiB1bmZvcm1hdHRlZCBjb250ZW50IGluIGl0cyBlbnRpcmV0eVxuXG4gICAgICAgICAgICAgICAgaWYgKG9yaWdfdGFnICYmIG9yaWdfdGFnLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihkZWxpbWl0ZXIpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBpbnB1dF9jaGFyID0gJyc7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICB2YXIgbWluX2luZGV4ID0gMDtcbiAgICAgICAgICAgICAgICB2YXIgc3BhY2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGRvIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy5pbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb250ZW50O1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaW5wdXRfY2hhciA9IHRoaXMuaW5wdXQuY2hhckF0KHRoaXMucG9zKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3MrKztcblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5VdGlscy5pbl9hcnJheShpbnB1dF9jaGFyLCB0aGlzLlV0aWxzLndoaXRlc3BhY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNwYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQtLTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dF9jaGFyID09PSAnXFxuJyB8fCBpbnB1dF9jaGFyID09PSAnXFxyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogIERvbid0IGNoYW5nZSB0YWIgaW5kZW50aW9uIGZvciB1bmZvcm1hdHRlZCBibG9ja3MuICBJZiB1c2luZyBjb2RlIGZvciBodG1sIGVkaXRpbmcsIHRoaXMgd2lsbCBncmVhdGx5IGFmZmVjdCA8cHJlPiB0YWdzIGlmIHRoZXkgYXJlIHNwZWNpZmllZCBpbiB0aGUgJ3VuZm9ybWF0dGVkIGFycmF5J1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTx0aGlzLmluZGVudF9sZXZlbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICBjb250ZW50ICs9IHRoaXMuaW5kZW50X3N0cmluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3BhY2UgPSBmYWxzZTsgLy8uLi5hbmQgbWFrZSBzdXJlIG90aGVyIGluZGVudGF0aW9uIGlzIGVyYXNlZFxuICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gaW5wdXRfY2hhcjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgc3BhY2UgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRlbnRfaGFuZGxlYmFycyAmJiBpbnB1dF9jaGFyID09PSAneycgJiYgY29udGVudC5sZW5ndGggJiYgY29udGVudFtjb250ZW50Lmxlbmd0aCAtIDJdID09PSAneycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZWJhcnMgZXhwcmVzc2lvbnMgaW4gc3RyaW5ncyBzaG91bGQgYWxzbyBiZSB1bmZvcm1hdHRlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gdGhpcy5nZXRfdW5mb3JtYXR0ZWQoJ319Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGVzZSBleHByZXNzaW9ucyBhcmUgb3BhcXVlLiAgSWdub3JlIGRlbGltaXRlcnMgZm91bmQgaW4gdGhlbS5cbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbl9pbmRleCA9IGNvbnRlbnQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoY29udGVudC50b0xvd2VyQ2FzZSgpLmluZGV4T2YoZGVsaW1pdGVyLCBtaW5faW5kZXgpID09PSAtMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmdldF90b2tlbiA9IGZ1bmN0aW9uKCkgeyAvL2luaXRpYWwgaGFuZGxlciBmb3IgdG9rZW4tcmV0cmlldmFsXG4gICAgICAgICAgICAgICAgdmFyIHRva2VuO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGFzdF90b2tlbiA9PT0gJ1RLX1RBR19TQ1JJUFQnIHx8IHRoaXMubGFzdF90b2tlbiA9PT0gJ1RLX1RBR19TVFlMRScpIHsgLy9jaGVjayBpZiB3ZSBuZWVkIHRvIGZvcm1hdCBqYXZhc2NyaXB0XG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlID0gdGhpcy5sYXN0X3Rva2VuLnN1YnN0cig3KTtcbiAgICAgICAgICAgICAgICAgICAgdG9rZW4gPSB0aGlzLmdldF9jb250ZW50c190byh0eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3Rva2VuLCAnVEtfJyArIHR5cGVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50X21vZGUgPT09ICdDT05URU5UJykge1xuICAgICAgICAgICAgICAgICAgICB0b2tlbiA9IHRoaXMuZ2V0X2NvbnRlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbdG9rZW4sICdUS19DT05URU5UJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50X21vZGUgPT09ICdUQUcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuID0gdGhpcy5nZXRfdGFnKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGFnX25hbWVfdHlwZSA9ICdUS19UQUdfJyArIHRoaXMudGFnX3R5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3Rva2VuLCB0YWdfbmFtZV90eXBlXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuZ2V0X2Z1bGxfaW5kZW50ID0gZnVuY3Rpb24obGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBsZXZlbCA9IHRoaXMuaW5kZW50X2xldmVsICsgbGV2ZWwgfHwgMDtcbiAgICAgICAgICAgICAgICBpZiAobGV2ZWwgPCAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gQXJyYXkobGV2ZWwgKyAxKS5qb2luKHRoaXMuaW5kZW50X3N0cmluZyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLmlzX3VuZm9ybWF0dGVkID0gZnVuY3Rpb24odGFnX2NoZWNrLCB1bmZvcm1hdHRlZCkge1xuICAgICAgICAgICAgICAgIC8vaXMgdGhpcyBhbiBIVE1MNSBibG9jay1sZXZlbCBsaW5rP1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5VdGlscy5pbl9hcnJheSh0YWdfY2hlY2ssIHVuZm9ybWF0dGVkKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHRhZ19jaGVjay50b0xvd2VyQ2FzZSgpICE9PSAnYScgfHwgIXRoaXMuVXRpbHMuaW5fYXJyYXkoJ2EnLCB1bmZvcm1hdHRlZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9hdCB0aGlzIHBvaW50IHdlIGhhdmUgYW4gIHRhZzsgaXMgaXRzIGZpcnN0IGNoaWxkIHNvbWV0aGluZyB3ZSB3YW50IHRvIHJlbWFpblxuICAgICAgICAgICAgICAgIC8vdW5mb3JtYXR0ZWQ/XG4gICAgICAgICAgICAgICAgdmFyIG5leHRfdGFnID0gdGhpcy5nZXRfdGFnKHRydWUgLyogcGVlay4gKi8gKTtcblxuICAgICAgICAgICAgICAgIC8vIHRlc3QgbmV4dF90YWcgdG8gc2VlIGlmIGl0IGlzIGp1c3QgaHRtbCB0YWcgKG5vIGV4dGVybmFsIGNvbnRlbnQpXG4gICAgICAgICAgICAgICAgdmFyIHRhZyA9IChuZXh0X3RhZyB8fCBcIlwiKS5tYXRjaCgvXlxccyo8XFxzKlxcLz8oW2Etel0qKVxccypbXj5dKj5cXHMqJC8pO1xuXG4gICAgICAgICAgICAgICAgLy8gaWYgbmV4dF90YWcgY29tZXMgYmFjayBidXQgaXMgbm90IGFuIGlzb2xhdGVkIHRhZywgdGhlblxuICAgICAgICAgICAgICAgIC8vIGxldCdzIHRyZWF0IHRoZSAnYScgdGFnIGFzIGhhdmluZyBjb250ZW50XG4gICAgICAgICAgICAgICAgLy8gYW5kIHJlc3BlY3QgdGhlIHVuZm9ybWF0dGVkIG9wdGlvblxuICAgICAgICAgICAgICAgIGlmICghdGFnIHx8IHRoaXMuVXRpbHMuaW5fYXJyYXkodGFnLCB1bmZvcm1hdHRlZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMucHJpbnRlciA9IGZ1bmN0aW9uKGpzX3NvdXJjZSwgaW5kZW50X2NoYXJhY3RlciwgaW5kZW50X3NpemUsIHdyYXBfbGluZV9sZW5ndGgsIGJyYWNlX3N0eWxlKSB7IC8vaGFuZGxlcyBpbnB1dC9vdXRwdXQgYW5kIHNvbWUgb3RoZXIgcHJpbnRpbmcgZnVuY3Rpb25zXG5cbiAgICAgICAgICAgICAgICB0aGlzLmlucHV0ID0ganNfc291cmNlIHx8ICcnOyAvL2dldHMgdGhlIGlucHV0IGZvciB0aGUgUGFyc2VyXG4gICAgICAgICAgICAgICAgdGhpcy5vdXRwdXQgPSBbXTtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9jaGFyYWN0ZXIgPSBpbmRlbnRfY2hhcmFjdGVyO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X3N0cmluZyA9ICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X3NpemUgPSBpbmRlbnRfc2l6ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmJyYWNlX3N0eWxlID0gYnJhY2Vfc3R5bGU7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfbGV2ZWwgPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMud3JhcF9saW5lX2xlbmd0aCA9IHdyYXBfbGluZV9sZW5ndGg7XG4gICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQgPSAwOyAvL2NvdW50IHRvIHNlZSBpZiB3cmFwX2xpbmVfbGVuZ3RoIHdhcyBleGNlZWRlZFxuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmluZGVudF9zaXplOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRlbnRfc3RyaW5nICs9IHRoaXMuaW5kZW50X2NoYXJhY3RlcjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnByaW50X25ld2xpbmUgPSBmdW5jdGlvbihmb3JjZSwgYXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGluZV9jaGFyX2NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhcnIgfHwgIWFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoZm9yY2UgfHwgKGFyclthcnIubGVuZ3RoIC0gMV0gIT09ICdcXG4nKSkgeyAvL3dlIG1pZ2h0IHdhbnQgdGhlIGV4dHJhIGxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoYXJyW2Fyci5sZW5ndGggLSAxXSAhPT0gJ1xcbicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJyW2Fyci5sZW5ndGggLSAxXSA9IHJ0cmltKGFyclthcnIubGVuZ3RoIC0gMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyLnB1c2goJ1xcbicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfaW5kZW50YXRpb24gPSBmdW5jdGlvbihhcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmluZGVudF9sZXZlbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcnIucHVzaCh0aGlzLmluZGVudF9zdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5lX2NoYXJfY291bnQgKz0gdGhpcy5pbmRlbnRfc3RyaW5nLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB0aGlzLnByaW50X3Rva2VuID0gZnVuY3Rpb24odGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBdm9pZCBwcmludGluZyBpbml0aWFsIHdoaXRlc3BhY2UuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzX3doaXRlc3BhY2UodGV4dCkgJiYgIXRoaXMub3V0cHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0ZXh0IHx8IHRleHQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdXRwdXQubGVuZ3RoICYmIHRoaXMub3V0cHV0W3RoaXMub3V0cHV0Lmxlbmd0aCAtIDFdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfaW5kZW50YXRpb24odGhpcy5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQgPSBsdHJpbSh0ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByaW50X3Rva2VuX3Jhdyh0ZXh0KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdGhpcy5wcmludF90b2tlbl9yYXcgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIGFyZSBnb2luZyB0byBwcmludCBuZXdsaW5lcywgdHJ1bmNhdGUgdHJhaWxpbmdcbiAgICAgICAgICAgICAgICAgICAgLy8gd2hpdGVzcGFjZSwgYXMgdGhlIG5ld2xpbmVzIHdpbGwgcmVwcmVzZW50IHRoZSBzcGFjZS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubmV3bGluZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gcnRyaW0odGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAodGV4dCAmJiB0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHQubGVuZ3RoID4gMSAmJiB0ZXh0W3RleHQubGVuZ3RoIC0gMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdW5mb3JtYXR0ZWQgdGFncyBjYW4gZ3JhYiBuZXdsaW5lcyBhcyB0aGVpciBsYXN0IGNoYXJhY3RlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3V0cHV0LnB1c2godGV4dC5zbGljZSgwLCAtMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfbmV3bGluZShmYWxzZSwgdGhpcy5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm91dHB1dC5wdXNoKHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgbiA9IDA7IG4gPCB0aGlzLm5ld2xpbmVzOyBuKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJpbnRfbmV3bGluZShuID4gMCwgdGhpcy5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubmV3bGluZXMgPSAwO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB0aGlzLmluZGVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGVudF9sZXZlbCsrO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB0aGlzLnVuaW5kZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGVudF9sZXZlbCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZW50X2xldmVsLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgLypfX19fX19fX19fX19fX19fX19fX18tLS0tLS0tLS0tLS0tLS0tLS0tLV9fX19fX19fX19fX19fX19fX19fXyovXG5cbiAgICAgICAgbXVsdGlfcGFyc2VyID0gbmV3IFBhcnNlcigpOyAvL3dyYXBwaW5nIGZ1bmN0aW9ucyBQYXJzZXJcbiAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50ZXIoaHRtbF9zb3VyY2UsIGluZGVudF9jaGFyYWN0ZXIsIGluZGVudF9zaXplLCB3cmFwX2xpbmVfbGVuZ3RoLCBicmFjZV9zdHlsZSk7IC8vaW5pdGlhbGl6ZSBzdGFydGluZyB2YWx1ZXNcblxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgdmFyIHQgPSBtdWx0aV9wYXJzZXIuZ2V0X3Rva2VuKCk7XG4gICAgICAgICAgICBtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCA9IHRbMF07XG4gICAgICAgICAgICBtdWx0aV9wYXJzZXIudG9rZW5fdHlwZSA9IHRbMV07XG5cbiAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIudG9rZW5fdHlwZSA9PT0gJ1RLX0VPRicpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoIChtdWx0aV9wYXJzZXIudG9rZW5fdHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1RBR19TVEFSVCc6XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKGZhbHNlLCBtdWx0aV9wYXJzZXIub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci5pbmRlbnRfY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmluZGVudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmluZGVudF9jb250ZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdDT05URU5UJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfVEFHX1NUWUxFJzpcbiAgICAgICAgICAgICAgICBjYXNlICdUS19UQUdfU0NSSVBUJzpcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X25ld2xpbmUoZmFsc2UsIG11bHRpX3BhcnNlci5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW4obXVsdGlfcGFyc2VyLnRva2VuX3RleHQpO1xuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuY3VycmVudF9tb2RlID0gJ0NPTlRFTlQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdUS19UQUdfRU5EJzpcbiAgICAgICAgICAgICAgICAgICAgLy9QcmludCBuZXcgbGluZSBvbmx5IGlmIHRoZSB0YWcgaGFzIG5vIGNvbnRlbnQgYW5kIGhhcyBjaGlsZFxuICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLmxhc3RfdG9rZW4gPT09ICdUS19DT05URU5UJyAmJiBtdWx0aV9wYXJzZXIubGFzdF90ZXh0ID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRhZ19uYW1lID0gbXVsdGlfcGFyc2VyLnRva2VuX3RleHQubWF0Y2goL1xcdysvKVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWdfZXh0cmFjdGVkX2Zyb21fbGFzdF9vdXRwdXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci5vdXRwdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFnX2V4dHJhY3RlZF9mcm9tX2xhc3Rfb3V0cHV0ID0gbXVsdGlfcGFyc2VyLm91dHB1dFttdWx0aV9wYXJzZXIub3V0cHV0Lmxlbmd0aCAtIDFdLm1hdGNoKC8oPzo8fHt7IylcXHMqKFxcdyspLyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFnX2V4dHJhY3RlZF9mcm9tX2xhc3Rfb3V0cHV0ID09PSBudWxsIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFnX2V4dHJhY3RlZF9mcm9tX2xhc3Rfb3V0cHV0WzFdICE9PSB0YWdfbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF9uZXdsaW5lKGZhbHNlLCBtdWx0aV9wYXJzZXIub3V0cHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW4obXVsdGlfcGFyc2VyLnRva2VuX3RleHQpO1xuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuY3VycmVudF9tb2RlID0gJ0NPTlRFTlQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdUS19UQUdfU0lOR0xFJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRG9uJ3QgYWRkIGEgbmV3bGluZSBiZWZvcmUgZWxlbWVudHMgdGhhdCBzaG91bGQgcmVtYWluIHVuZm9ybWF0dGVkLlxuICAgICAgICAgICAgICAgICAgICB2YXIgdGFnX2NoZWNrID0gbXVsdGlfcGFyc2VyLnRva2VuX3RleHQubWF0Y2goL15cXHMqPChbYS16LV0rKS9pKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0YWdfY2hlY2sgfHwgIW11bHRpX3BhcnNlci5VdGlscy5pbl9hcnJheSh0YWdfY2hlY2tbMV0sIHVuZm9ybWF0dGVkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X25ld2xpbmUoZmFsc2UsIG11bHRpX3BhcnNlci5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbihtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5jdXJyZW50X21vZGUgPSAnQ09OVEVOVCc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1RLX1RBR19IQU5ETEVCQVJTX0VMU0UnOlxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW4obXVsdGlfcGFyc2VyLnRva2VuX3RleHQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLmluZGVudF9jb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuaW5kZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuaW5kZW50X2NvbnRlbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIuY3VycmVudF9tb2RlID0gJ0NPTlRFTlQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdUS19DT05URU5UJzpcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X3Rva2VuKG11bHRpX3BhcnNlci50b2tlbl90ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdUQUcnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdUS19TVFlMRSc6XG4gICAgICAgICAgICAgICAgY2FzZSAnVEtfU0NSSVBUJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKG11bHRpX3BhcnNlci50b2tlbl90ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X25ld2xpbmUoZmFsc2UsIG11bHRpX3BhcnNlci5vdXRwdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRleHQgPSBtdWx0aV9wYXJzZXIudG9rZW5fdGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYmVhdXRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHRfaW5kZW50X2xldmVsID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtdWx0aV9wYXJzZXIudG9rZW5fdHlwZSA9PT0gJ1RLX1NDUklQVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYmVhdXRpZmllciA9IHR5cGVvZiBqc19iZWF1dGlmeSA9PT0gJ2Z1bmN0aW9uJyAmJiBqc19iZWF1dGlmeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobXVsdGlfcGFyc2VyLnRva2VuX3R5cGUgPT09ICdUS19TVFlMRScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYmVhdXRpZmllciA9IHR5cGVvZiBjc3NfYmVhdXRpZnkgPT09ICdmdW5jdGlvbicgJiYgY3NzX2JlYXV0aWZ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5pbmRlbnRfc2NyaXB0cyA9PT0gXCJrZWVwXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHRfaW5kZW50X2xldmVsID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5pbmRlbnRfc2NyaXB0cyA9PT0gXCJzZXBhcmF0ZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0X2luZGVudF9sZXZlbCA9IC1tdWx0aV9wYXJzZXIuaW5kZW50X2xldmVsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZW50YXRpb24gPSBtdWx0aV9wYXJzZXIuZ2V0X2Z1bGxfaW5kZW50KHNjcmlwdF9pbmRlbnRfbGV2ZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9iZWF1dGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FsbCB0aGUgQmVhdXRpZmllciBpZiBhdmFsaWFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0ID0gX2JlYXV0aWZpZXIodGV4dC5yZXBsYWNlKC9eXFxzKi8sIGluZGVudGF0aW9uKSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbXBseSBpbmRlbnQgdGhlIHN0cmluZyBvdGhlcndpc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2hpdGUgPSB0ZXh0Lm1hdGNoKC9eXFxzKi8pWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfbGV2ZWwgPSB3aGl0ZS5tYXRjaCgvW15cXG5cXHJdKiQvKVswXS5zcGxpdChtdWx0aV9wYXJzZXIuaW5kZW50X3N0cmluZykubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVpbmRlbnQgPSBtdWx0aV9wYXJzZXIuZ2V0X2Z1bGxfaW5kZW50KHNjcmlwdF9pbmRlbnRfbGV2ZWwgLSBfbGV2ZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL15cXHMqLywgaW5kZW50YXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHJcXG58XFxyfFxcbi9nLCAnXFxuJyArIHJlaW5kZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxzKyQvLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpX3BhcnNlci5wcmludF90b2tlbl9yYXcodGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLnByaW50X25ld2xpbmUodHJ1ZSwgbXVsdGlfcGFyc2VyLm91dHB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmN1cnJlbnRfbW9kZSA9ICdUQUcnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAvLyBXZSBzaG91bGQgbm90IGJlIGdldHRpbmcgaGVyZSBidXQgd2UgZG9uJ3Qgd2FudCB0byBkcm9wIGlucHV0IG9uIHRoZSBmbG9vclxuICAgICAgICAgICAgICAgICAgICAvLyBKdXN0IG91dHB1dCB0aGUgdGV4dCBhbmQgbW92ZSBvblxuICAgICAgICAgICAgICAgICAgICBpZiAobXVsdGlfcGFyc2VyLnRva2VuX3RleHQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtdWx0aV9wYXJzZXIucHJpbnRfdG9rZW4obXVsdGlfcGFyc2VyLnRva2VuX3RleHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXVsdGlfcGFyc2VyLmxhc3RfdG9rZW4gPSBtdWx0aV9wYXJzZXIudG9rZW5fdHlwZTtcbiAgICAgICAgICAgIG11bHRpX3BhcnNlci5sYXN0X3RleHQgPSBtdWx0aV9wYXJzZXIudG9rZW5fdGV4dDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3dlZXRfY29kZSA9IG11bHRpX3BhcnNlci5vdXRwdXQuam9pbignJykucmVwbGFjZSgvW1xcclxcblxcdCBdKyQvLCAnJyk7XG4gICAgICAgIGlmIChlbmRfd2l0aF9uZXdsaW5lKSB7XG4gICAgICAgICAgICBzd2VldF9jb2RlICs9ICdcXG4nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzd2VldF9jb2RlO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBZGQgc3VwcG9ydCBmb3IgQU1EICggaHR0cHM6Ly9naXRodWIuY29tL2FtZGpzL2FtZGpzLWFwaS93aWtpL0FNRCNkZWZpbmVhbWQtcHJvcGVydHktIClcbiAgICAgICAgZGVmaW5lKFtcInJlcXVpcmVcIiwgXCIuL2JlYXV0aWZ5XCIsIFwiLi9iZWF1dGlmeS1jc3NcIl0sIGZ1bmN0aW9uKHJlcXVpcmVhbWQpIHtcbiAgICAgICAgICAgIHZhciBqc19iZWF1dGlmeSA9ICByZXF1aXJlYW1kKFwiLi9iZWF1dGlmeVwiKTtcbiAgICAgICAgICAgIHZhciBjc3NfYmVhdXRpZnkgPSAgcmVxdWlyZWFtZChcIi4vYmVhdXRpZnktY3NzXCIpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBodG1sX2JlYXV0aWZ5OiBmdW5jdGlvbihodG1sX3NvdXJjZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdHlsZV9odG1sKGh0bWxfc291cmNlLCBvcHRpb25zLCBqc19iZWF1dGlmeS5qc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LmNzc19iZWF1dGlmeSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIENvbW1vbkpTLiBKdXN0IHB1dCB0aGlzIGZpbGUgc29tZXdoZXJlIG9uIHlvdXIgcmVxdWlyZS5wYXRoc1xuICAgICAgICAvLyBhbmQgeW91IHdpbGwgYmUgYWJsZSB0byBgdmFyIGh0bWxfYmVhdXRpZnkgPSByZXF1aXJlKFwiYmVhdXRpZnlcIikuaHRtbF9iZWF1dGlmeWAuXG4gICAgICAgIHZhciBqc19iZWF1dGlmeSA9IHJlcXVpcmUoJy4vYmVhdXRpZnkuanMnKTtcbiAgICAgICAgdmFyIGNzc19iZWF1dGlmeSA9IHJlcXVpcmUoJy4vYmVhdXRpZnktY3NzLmpzJyk7XG5cbiAgICAgICAgZXhwb3J0cy5odG1sX2JlYXV0aWZ5ID0gZnVuY3Rpb24oaHRtbF9zb3VyY2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHlsZV9odG1sKGh0bWxfc291cmNlLCBvcHRpb25zLCBqc19iZWF1dGlmeS5qc19iZWF1dGlmeSwgY3NzX2JlYXV0aWZ5LmNzc19iZWF1dGlmeSk7XG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIElmIHdlJ3JlIHJ1bm5pbmcgYSB3ZWIgcGFnZSBhbmQgZG9uJ3QgaGF2ZSBlaXRoZXIgb2YgdGhlIGFib3ZlLCBhZGQgb3VyIG9uZSBnbG9iYWxcbiAgICAgICAgd2luZG93Lmh0bWxfYmVhdXRpZnkgPSBmdW5jdGlvbihodG1sX3NvdXJjZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIHN0eWxlX2h0bWwoaHRtbF9zb3VyY2UsIG9wdGlvbnMsIHdpbmRvdy5qc19iZWF1dGlmeSwgd2luZG93LmNzc19iZWF1dGlmeSk7XG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIElmIHdlIGRvbid0IGV2ZW4gaGF2ZSB3aW5kb3csIHRyeSBnbG9iYWwuXG4gICAgICAgIGdsb2JhbC5odG1sX2JlYXV0aWZ5ID0gZnVuY3Rpb24oaHRtbF9zb3VyY2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHlsZV9odG1sKGh0bWxfc291cmNlLCBvcHRpb25zLCBnbG9iYWwuanNfYmVhdXRpZnksIGdsb2JhbC5jc3NfYmVhdXRpZnkpO1xuICAgICAgICB9O1xuICAgIH1cblxufSgpKTtcbiIsIi8qanNoaW50IGN1cmx5OnRydWUsIGVxZXFlcTp0cnVlLCBsYXhicmVhazp0cnVlLCBub2VtcHR5OmZhbHNlICovXG4vKlxuXG4gIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG4gIENvcHlyaWdodCAoYykgMjAwNy0yMDEzIEVpbmFyIExpZWxtYW5pcyBhbmQgY29udHJpYnV0b3JzLlxuXG4gIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uXG4gIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzXG4gICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbixcbiAgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSxcbiAgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSxcbiAgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiAgVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbiAgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCxcbiAgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG4gIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlNcbiAgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4gIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAgU09GVFdBUkUuXG5cbiBKUyBCZWF1dGlmaWVyXG4tLS0tLS0tLS0tLS0tLS1cblxuXG4gIFdyaXR0ZW4gYnkgRWluYXIgTGllbG1hbmlzLCA8ZWluYXJAanNiZWF1dGlmaWVyLm9yZz5cbiAgICAgIGh0dHA6Ly9qc2JlYXV0aWZpZXIub3JnL1xuXG4gIE9yaWdpbmFsbHkgY29udmVydGVkIHRvIGphdmFzY3JpcHQgYnkgVml0YWwsIDx2aXRhbDc2QGdtYWlsLmNvbT5cbiAgXCJFbmQgYnJhY2VzIG9uIG93biBsaW5lXCIgYWRkZWQgYnkgQ2hyaXMgSi4gU2h1bGwsIDxjaHJpc2pzaHVsbEBnbWFpbC5jb20+XG4gIFBhcnNpbmcgaW1wcm92ZW1lbnRzIGZvciBicmFjZS1sZXNzIHN0YXRlbWVudHMgYnkgTGlhbSBOZXdtYW4gPGJpdHdpc2VtYW5AZ21haWwuY29tPlxuXG5cbiAgVXNhZ2U6XG4gICAganNfYmVhdXRpZnkoanNfc291cmNlX3RleHQpO1xuICAgIGpzX2JlYXV0aWZ5KGpzX3NvdXJjZV90ZXh0LCBvcHRpb25zKTtcblxuICBUaGUgb3B0aW9ucyBhcmU6XG4gICAgaW5kZW50X3NpemUgKGRlZmF1bHQgNCkgICAgICAgICAgLSBpbmRlbnRhdGlvbiBzaXplLFxuICAgIGluZGVudF9jaGFyIChkZWZhdWx0IHNwYWNlKSAgICAgIC0gY2hhcmFjdGVyIHRvIGluZGVudCB3aXRoLFxuICAgIHByZXNlcnZlX25ld2xpbmVzIChkZWZhdWx0IHRydWUpIC0gd2hldGhlciBleGlzdGluZyBsaW5lIGJyZWFrcyBzaG91bGQgYmUgcHJlc2VydmVkLFxuICAgIG1heF9wcmVzZXJ2ZV9uZXdsaW5lcyAoZGVmYXVsdCB1bmxpbWl0ZWQpIC0gbWF4aW11bSBudW1iZXIgb2YgbGluZSBicmVha3MgdG8gYmUgcHJlc2VydmVkIGluIG9uZSBjaHVuayxcblxuICAgIGpzbGludF9oYXBweSAoZGVmYXVsdCBmYWxzZSkgLSBpZiB0cnVlLCB0aGVuIGpzbGludC1zdHJpY3RlciBtb2RlIGlzIGVuZm9yY2VkLlxuXG4gICAgICAgICAgICBqc2xpbnRfaGFwcHkgICAgICAgICFqc2xpbnRfaGFwcHlcbiAgICAgICAgICAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAgICAgZnVuY3Rpb24gKCkgICAgICAgICBmdW5jdGlvbigpXG5cbiAgICAgICAgICAgIHN3aXRjaCAoKSB7ICAgICAgICAgc3dpdGNoKCkge1xuICAgICAgICAgICAgY2FzZSAxOiAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgYnJlYWs7ICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICB9XG5cbiAgICBzcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uIChkZWZhdWx0IGZhbHNlKSAtIHNob3VsZCB0aGUgc3BhY2UgYmVmb3JlIGFuIGFub255bW91cyBmdW5jdGlvbidzIHBhcmVucyBiZSBhZGRlZCwgXCJmdW5jdGlvbigpXCIgdnMgXCJmdW5jdGlvbiAoKVwiLFxuICAgICAgICAgIE5PVEU6IFRoaXMgb3B0aW9uIGlzIG92ZXJyaWRlbiBieSBqc2xpbnRfaGFwcHkgKGkuZS4gaWYganNsaW50X2hhcHB5IGlzIHRydWUsIHNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24gaXMgdHJ1ZSBieSBkZXNpZ24pXG5cbiAgICBicmFjZV9zdHlsZSAoZGVmYXVsdCBcImNvbGxhcHNlXCIpIC0gXCJjb2xsYXBzZVwiIHwgXCJleHBhbmRcIiB8IFwiZW5kLWV4cGFuZFwiXG4gICAgICAgICAgICBwdXQgYnJhY2VzIG9uIHRoZSBzYW1lIGxpbmUgYXMgY29udHJvbCBzdGF0ZW1lbnRzIChkZWZhdWx0KSwgb3IgcHV0IGJyYWNlcyBvbiBvd24gbGluZSAoQWxsbWFuIC8gQU5TSSBzdHlsZSksIG9yIGp1c3QgcHV0IGVuZCBicmFjZXMgb24gb3duIGxpbmUuXG5cbiAgICBzcGFjZV9iZWZvcmVfY29uZGl0aW9uYWwgKGRlZmF1bHQgdHJ1ZSkgLSBzaG91bGQgdGhlIHNwYWNlIGJlZm9yZSBjb25kaXRpb25hbCBzdGF0ZW1lbnQgYmUgYWRkZWQsIFwiaWYodHJ1ZSlcIiB2cyBcImlmICh0cnVlKVwiLFxuXG4gICAgdW5lc2NhcGVfc3RyaW5ncyAoZGVmYXVsdCBmYWxzZSkgLSBzaG91bGQgcHJpbnRhYmxlIGNoYXJhY3RlcnMgaW4gc3RyaW5ncyBlbmNvZGVkIGluIFxceE5OIG5vdGF0aW9uIGJlIHVuZXNjYXBlZCwgXCJleGFtcGxlXCIgdnMgXCJcXHg2NVxceDc4XFx4NjFcXHg2ZFxceDcwXFx4NmNcXHg2NVwiXG5cbiAgICB3cmFwX2xpbmVfbGVuZ3RoIChkZWZhdWx0IHVubGltaXRlZCkgLSBsaW5lcyBzaG91bGQgd3JhcCBhdCBuZXh0IG9wcG9ydHVuaXR5IGFmdGVyIHRoaXMgbnVtYmVyIG9mIGNoYXJhY3RlcnMuXG4gICAgICAgICAgTk9URTogVGhpcyBpcyBub3QgYSBoYXJkIGxpbWl0LiBMaW5lcyB3aWxsIGNvbnRpbnVlIHVudGlsIGEgcG9pbnQgd2hlcmUgYSBuZXdsaW5lIHdvdWxkXG4gICAgICAgICAgICAgICAgYmUgcHJlc2VydmVkIGlmIGl0IHdlcmUgcHJlc2VudC5cblxuICAgIGVuZF93aXRoX25ld2xpbmUgKGRlZmF1bHQgZmFsc2UpICAtIGVuZCBvdXRwdXQgd2l0aCBhIG5ld2xpbmVcblxuXG4gICAgZS5nXG5cbiAgICBqc19iZWF1dGlmeShqc19zb3VyY2VfdGV4dCwge1xuICAgICAgJ2luZGVudF9zaXplJzogMSxcbiAgICAgICdpbmRlbnRfY2hhcic6ICdcXHQnXG4gICAgfSk7XG5cbiovXG5cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBhY29ybiA9IHt9O1xuICAgIChmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICAgLy8gVGhpcyBzZWN0aW9uIG9mIGNvZGUgaXMgdGFrZW4gZnJvbSBhY29ybi5cbiAgICAgIC8vXG4gICAgICAvLyBBY29ybiB3YXMgd3JpdHRlbiBieSBNYXJpam4gSGF2ZXJiZWtlIGFuZCByZWxlYXNlZCB1bmRlciBhbiBNSVRcbiAgICAgIC8vIGxpY2Vuc2UuIFRoZSBVbmljb2RlIHJlZ2V4cHMgKGZvciBpZGVudGlmaWVycyBhbmQgd2hpdGVzcGFjZSkgd2VyZVxuICAgICAgLy8gdGFrZW4gZnJvbSBbRXNwcmltYV0oaHR0cDovL2VzcHJpbWEub3JnKSBieSBBcml5YSBIaWRheWF0LlxuICAgICAgLy9cbiAgICAgIC8vIEdpdCByZXBvc2l0b3JpZXMgZm9yIEFjb3JuIGFyZSBhdmFpbGFibGUgYXRcbiAgICAgIC8vXG4gICAgICAvLyAgICAgaHR0cDovL21hcmlqbmhhdmVyYmVrZS5ubC9naXQvYWNvcm5cbiAgICAgIC8vICAgICBodHRwczovL2dpdGh1Yi5jb20vbWFyaWpuaC9hY29ybi5naXRcblxuICAgICAgLy8gIyMgQ2hhcmFjdGVyIGNhdGVnb3JpZXNcblxuICAgICAgLy8gQmlnIHVnbHkgcmVndWxhciBleHByZXNzaW9ucyB0aGF0IG1hdGNoIGNoYXJhY3RlcnMgaW4gdGhlXG4gICAgICAvLyB3aGl0ZXNwYWNlLCBpZGVudGlmaWVyLCBhbmQgaWRlbnRpZmllci1zdGFydCBjYXRlZ29yaWVzLiBUaGVzZVxuICAgICAgLy8gYXJlIG9ubHkgYXBwbGllZCB3aGVuIGEgY2hhcmFjdGVyIGlzIGZvdW5kIHRvIGFjdHVhbGx5IGhhdmUgYVxuICAgICAgLy8gY29kZSBwb2ludCBhYm92ZSAxMjguXG5cbiAgICAgIHZhciBub25BU0NJSXdoaXRlc3BhY2UgPSAvW1xcdTE2ODBcXHUxODBlXFx1MjAwMC1cXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1ZmVmZl0vO1xuICAgICAgdmFyIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0Q2hhcnMgPSBcIlxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTI3XFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjEtXFx1MDU4N1xcdTA1ZDAtXFx1MDVlYVxcdTA1ZjAtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5NzdcXHUwOTc5LVxcdTA5N2ZcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2RcXHUwYzU4XFx1MGM1OVxcdTBjNjBcXHUwYzYxXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDYwXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjBcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWMxLVxcdTE5YzdcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTktXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEyZFxcdTIxMmYtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDlkLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmRcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmY2NcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5N1xcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhODAtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWJjMC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXCI7XG4gICAgICB2YXIgbm9uQVNDSUlpZGVudGlmaWVyQ2hhcnMgPSBcIlxcdTAzMDAtXFx1MDM2ZlxcdTA0ODMtXFx1MDQ4N1xcdTA1OTEtXFx1MDViZFxcdTA1YmZcXHUwNWMxXFx1MDVjMlxcdTA1YzRcXHUwNWM1XFx1MDVjN1xcdTA2MTAtXFx1MDYxYVxcdTA2MjAtXFx1MDY0OVxcdTA2NzItXFx1MDZkM1xcdTA2ZTctXFx1MDZlOFxcdTA2ZmItXFx1MDZmY1xcdTA3MzAtXFx1MDc0YVxcdTA4MDAtXFx1MDgxNFxcdTA4MWItXFx1MDgyM1xcdTA4MjUtXFx1MDgyN1xcdTA4MjktXFx1MDgyZFxcdTA4NDAtXFx1MDg1N1xcdTA4ZTQtXFx1MDhmZVxcdTA5MDAtXFx1MDkwM1xcdTA5M2EtXFx1MDkzY1xcdTA5M2UtXFx1MDk0ZlxcdTA5NTEtXFx1MDk1N1xcdTA5NjItXFx1MDk2M1xcdTA5NjYtXFx1MDk2ZlxcdTA5ODEtXFx1MDk4M1xcdTA5YmNcXHUwOWJlLVxcdTA5YzRcXHUwOWM3XFx1MDljOFxcdTA5ZDdcXHUwOWRmLVxcdTA5ZTBcXHUwYTAxLVxcdTBhMDNcXHUwYTNjXFx1MGEzZS1cXHUwYTQyXFx1MGE0N1xcdTBhNDhcXHUwYTRiLVxcdTBhNGRcXHUwYTUxXFx1MGE2Ni1cXHUwYTcxXFx1MGE3NVxcdTBhODEtXFx1MGE4M1xcdTBhYmNcXHUwYWJlLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWUyLVxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYjAxLVxcdTBiMDNcXHUwYjNjXFx1MGIzZS1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNWYtXFx1MGI2MFxcdTBiNjYtXFx1MGI2ZlxcdTBiODJcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMS1cXHUwYzAzXFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzYyLVxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgyXFx1MGM4M1xcdTBjYmNcXHUwY2JlLVxcdTBjYzRcXHUwY2M2LVxcdTBjYzhcXHUwY2NhLVxcdTBjY2RcXHUwY2Q1XFx1MGNkNlxcdTBjZTItXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBkMDJcXHUwZDAzXFx1MGQ0Ni1cXHUwZDQ4XFx1MGQ1N1xcdTBkNjItXFx1MGQ2M1xcdTBkNjYtXFx1MGQ2ZlxcdTBkODJcXHUwZDgzXFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGYyXFx1MGRmM1xcdTBlMzQtXFx1MGUzYVxcdTBlNDAtXFx1MGU0NVxcdTBlNTAtXFx1MGU1OVxcdTBlYjQtXFx1MGViOVxcdTBlYzgtXFx1MGVjZFxcdTBlZDAtXFx1MGVkOVxcdTBmMThcXHUwZjE5XFx1MGYyMC1cXHUwZjI5XFx1MGYzNVxcdTBmMzdcXHUwZjM5XFx1MGY0MS1cXHUwZjQ3XFx1MGY3MS1cXHUwZjg0XFx1MGY4Ni1cXHUwZjg3XFx1MGY4ZC1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMDAtXFx1MTAyOVxcdTEwNDAtXFx1MTA0OVxcdTEwNjctXFx1MTA2ZFxcdTEwNzEtXFx1MTA3NFxcdTEwODItXFx1MTA4ZFxcdTEwOGYtXFx1MTA5ZFxcdTEzNWQtXFx1MTM1ZlxcdTE3MGUtXFx1MTcxMFxcdTE3MjAtXFx1MTczMFxcdTE3NDAtXFx1MTc1MFxcdTE3NzJcXHUxNzczXFx1MTc4MC1cXHUxN2IyXFx1MTdkZFxcdTE3ZTAtXFx1MTdlOVxcdTE4MGItXFx1MTgwZFxcdTE4MTAtXFx1MTgxOVxcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NTEtXFx1MTk2ZFxcdTE5YjAtXFx1MTljMFxcdTE5YzgtXFx1MTljOVxcdTE5ZDAtXFx1MTlkOVxcdTFhMDAtXFx1MWExNVxcdTFhMjAtXFx1MWE1M1xcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFiNDYtXFx1MWI0YlxcdTFiNTAtXFx1MWI1OVxcdTFiNmItXFx1MWI3M1xcdTFiYjAtXFx1MWJiOVxcdTFiZTYtXFx1MWJmM1xcdTFjMDAtXFx1MWMyMlxcdTFjNDAtXFx1MWM0OVxcdTFjNWItXFx1MWM3ZFxcdTFjZDAtXFx1MWNkMlxcdTFkMDAtXFx1MWRiZVxcdTFlMDEtXFx1MWYxNVxcdTIwMGNcXHUyMDBkXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjBkMC1cXHUyMGRjXFx1MjBlMVxcdTIwZTUtXFx1MjBmMFxcdTJkODEtXFx1MmQ5NlxcdTJkZTAtXFx1MmRmZlxcdTMwMjEtXFx1MzAyOFxcdTMwOTlcXHUzMDlhXFx1YTY0MC1cXHVhNjZkXFx1YTY3NC1cXHVhNjdkXFx1YTY5ZlxcdWE2ZjAtXFx1YTZmMVxcdWE3ZjgtXFx1YTgwMFxcdWE4MDZcXHVhODBiXFx1YTgyMy1cXHVhODI3XFx1YTg4MC1cXHVhODgxXFx1YThiNC1cXHVhOGM0XFx1YThkMC1cXHVhOGQ5XFx1YThmMy1cXHVhOGY3XFx1YTkwMC1cXHVhOTA5XFx1YTkyNi1cXHVhOTJkXFx1YTkzMC1cXHVhOTQ1XFx1YTk4MC1cXHVhOTgzXFx1YTliMy1cXHVhOWMwXFx1YWEwMC1cXHVhYTI3XFx1YWE0MC1cXHVhYTQxXFx1YWE0Yy1cXHVhYTRkXFx1YWE1MC1cXHVhYTU5XFx1YWE3YlxcdWFhZTAtXFx1YWFlOVxcdWFhZjItXFx1YWFmM1xcdWFiYzAtXFx1YWJlMVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1ZmIyMC1cXHVmYjI4XFx1ZmUwMC1cXHVmZTBmXFx1ZmUyMC1cXHVmZTI2XFx1ZmUzM1xcdWZlMzRcXHVmZTRkLVxcdWZlNGZcXHVmZjEwLVxcdWZmMTlcXHVmZjNmXCI7XG4gICAgICB2YXIgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnQgPSBuZXcgUmVnRXhwKFwiW1wiICsgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyArIFwiXVwiKTtcbiAgICAgIHZhciBub25BU0NJSWlkZW50aWZpZXIgPSBuZXcgUmVnRXhwKFwiW1wiICsgbm9uQVNDSUlpZGVudGlmaWVyU3RhcnRDaGFycyArIG5vbkFTQ0lJaWRlbnRpZmllckNoYXJzICsgXCJdXCIpO1xuXG4gICAgICAvLyBXaGV0aGVyIGEgc2luZ2xlIGNoYXJhY3RlciBkZW5vdGVzIGEgbmV3bGluZS5cblxuICAgICAgdmFyIG5ld2xpbmUgPSBleHBvcnRzLm5ld2xpbmUgPSAvW1xcblxcclxcdTIwMjhcXHUyMDI5XS87XG5cbiAgICAgIC8vIE1hdGNoZXMgYSB3aG9sZSBsaW5lIGJyZWFrICh3aGVyZSBDUkxGIGlzIGNvbnNpZGVyZWQgYSBzaW5nbGVcbiAgICAgIC8vIGxpbmUgYnJlYWspLiBVc2VkIHRvIGNvdW50IGxpbmVzLlxuXG4gICAgICB2YXIgbGluZUJyZWFrID0gL1xcclxcbnxbXFxuXFxyXFx1MjAyOFxcdTIwMjldL2c7XG5cbiAgICAgIC8vIFRlc3Qgd2hldGhlciBhIGdpdmVuIGNoYXJhY3RlciBjb2RlIHN0YXJ0cyBhbiBpZGVudGlmaWVyLlxuXG4gICAgICB2YXIgaXNJZGVudGlmaWVyU3RhcnQgPSBleHBvcnRzLmlzSWRlbnRpZmllclN0YXJ0ID0gZnVuY3Rpb24oY29kZSkge1xuICAgICAgICBpZiAoY29kZSA8IDY1KSByZXR1cm4gY29kZSA9PT0gMzY7XG4gICAgICAgIGlmIChjb2RlIDwgOTEpIHJldHVybiB0cnVlO1xuICAgICAgICBpZiAoY29kZSA8IDk3KSByZXR1cm4gY29kZSA9PT0gOTU7XG4gICAgICAgIGlmIChjb2RlIDwgMTIzKXJldHVybiB0cnVlO1xuICAgICAgICByZXR1cm4gY29kZSA+PSAweGFhICYmIG5vbkFTQ0lJaWRlbnRpZmllclN0YXJ0LnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKSk7XG4gICAgICB9O1xuXG4gICAgICAvLyBUZXN0IHdoZXRoZXIgYSBnaXZlbiBjaGFyYWN0ZXIgaXMgcGFydCBvZiBhbiBpZGVudGlmaWVyLlxuXG4gICAgICB2YXIgaXNJZGVudGlmaWVyQ2hhciA9IGV4cG9ydHMuaXNJZGVudGlmaWVyQ2hhciA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgICAgICAgaWYgKGNvZGUgPCA0OCkgcmV0dXJuIGNvZGUgPT09IDM2O1xuICAgICAgICBpZiAoY29kZSA8IDU4KSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgaWYgKGNvZGUgPCA2NSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoY29kZSA8IDkxKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgaWYgKGNvZGUgPCA5NykgcmV0dXJuIGNvZGUgPT09IDk1O1xuICAgICAgICBpZiAoY29kZSA8IDEyMylyZXR1cm4gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIGNvZGUgPj0gMHhhYSAmJiBub25BU0NJSWlkZW50aWZpZXIudGVzdChTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpKTtcbiAgICAgIH07XG4gICAgfSkoYWNvcm4pO1xuXG4gICAgZnVuY3Rpb24gaW5fYXJyYXkod2hhdCwgYXJyKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAoYXJyW2ldID09PSB3aGF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyaW0ocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24ganNfYmVhdXRpZnkoanNfc291cmNlX3RleHQsIG9wdGlvbnMpIHtcbiAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgIHZhciBiZWF1dGlmaWVyID0gbmV3IEJlYXV0aWZpZXIoanNfc291cmNlX3RleHQsIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gYmVhdXRpZmllci5iZWF1dGlmeSgpO1xuICAgIH1cblxuICAgIHZhciBNT0RFID0ge1xuICAgICAgICAgICAgQmxvY2tTdGF0ZW1lbnQ6ICdCbG9ja1N0YXRlbWVudCcsIC8vICdCTE9DSydcbiAgICAgICAgICAgIFN0YXRlbWVudDogJ1N0YXRlbWVudCcsIC8vICdTVEFURU1FTlQnXG4gICAgICAgICAgICBPYmplY3RMaXRlcmFsOiAnT2JqZWN0TGl0ZXJhbCcsIC8vICdPQkpFQ1QnLFxuICAgICAgICAgICAgQXJyYXlMaXRlcmFsOiAnQXJyYXlMaXRlcmFsJywgLy8nW0VYUFJFU1NJT05dJyxcbiAgICAgICAgICAgIEZvckluaXRpYWxpemVyOiAnRm9ySW5pdGlhbGl6ZXInLCAvLycoRk9SLUVYUFJFU1NJT04pJyxcbiAgICAgICAgICAgIENvbmRpdGlvbmFsOiAnQ29uZGl0aW9uYWwnLCAvLycoQ09ORC1FWFBSRVNTSU9OKScsXG4gICAgICAgICAgICBFeHByZXNzaW9uOiAnRXhwcmVzc2lvbicgLy8nKEVYUFJFU1NJT04pJ1xuICAgICAgICB9O1xuXG4gICAgZnVuY3Rpb24gQmVhdXRpZmllcihqc19zb3VyY2VfdGV4dCwgb3B0aW9ucykge1xuICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgdmFyIG91dHB1dFxuICAgICAgICB2YXIgdG9rZW5zID0gW10sIHRva2VuX3BvcztcbiAgICAgICAgdmFyIFRva2VuaXplcjtcbiAgICAgICAgdmFyIGN1cnJlbnRfdG9rZW47XG4gICAgICAgIHZhciBsYXN0X3R5cGUsIGxhc3RfbGFzdF90ZXh0LCBpbmRlbnRfc3RyaW5nO1xuICAgICAgICB2YXIgZmxhZ3MsIHByZXZpb3VzX2ZsYWdzLCBmbGFnX3N0b3JlO1xuICAgICAgICB2YXIgcHJlZml4O1xuXG4gICAgICAgIHZhciBoYW5kbGVycywgb3B0O1xuICAgICAgICB2YXIgYmFzZUluZGVudFN0cmluZyA9ICcnO1xuXG4gICAgICAgIGhhbmRsZXJzID0ge1xuICAgICAgICAgICAgJ1RLX1NUQVJUX0VYUFInOiBoYW5kbGVfc3RhcnRfZXhwcixcbiAgICAgICAgICAgICdUS19FTkRfRVhQUic6IGhhbmRsZV9lbmRfZXhwcixcbiAgICAgICAgICAgICdUS19TVEFSVF9CTE9DSyc6IGhhbmRsZV9zdGFydF9ibG9jayxcbiAgICAgICAgICAgICdUS19FTkRfQkxPQ0snOiBoYW5kbGVfZW5kX2Jsb2NrLFxuICAgICAgICAgICAgJ1RLX1dPUkQnOiBoYW5kbGVfd29yZCxcbiAgICAgICAgICAgICdUS19SRVNFUlZFRCc6IGhhbmRsZV93b3JkLFxuICAgICAgICAgICAgJ1RLX1NFTUlDT0xPTic6IGhhbmRsZV9zZW1pY29sb24sXG4gICAgICAgICAgICAnVEtfU1RSSU5HJzogaGFuZGxlX3N0cmluZyxcbiAgICAgICAgICAgICdUS19FUVVBTFMnOiBoYW5kbGVfZXF1YWxzLFxuICAgICAgICAgICAgJ1RLX09QRVJBVE9SJzogaGFuZGxlX29wZXJhdG9yLFxuICAgICAgICAgICAgJ1RLX0NPTU1BJzogaGFuZGxlX2NvbW1hLFxuICAgICAgICAgICAgJ1RLX0JMT0NLX0NPTU1FTlQnOiBoYW5kbGVfYmxvY2tfY29tbWVudCxcbiAgICAgICAgICAgICdUS19JTkxJTkVfQ09NTUVOVCc6IGhhbmRsZV9pbmxpbmVfY29tbWVudCxcbiAgICAgICAgICAgICdUS19DT01NRU5UJzogaGFuZGxlX2NvbW1lbnQsXG4gICAgICAgICAgICAnVEtfRE9UJzogaGFuZGxlX2RvdCxcbiAgICAgICAgICAgICdUS19VTktOT1dOJzogaGFuZGxlX3Vua25vd24sXG4gICAgICAgICAgICAnVEtfRU9GJzogaGFuZGxlX2VvZlxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZV9mbGFncyhmbGFnc19iYXNlLCBtb2RlKSB7XG4gICAgICAgICAgICB2YXIgbmV4dF9pbmRlbnRfbGV2ZWwgPSAwO1xuICAgICAgICAgICAgaWYgKGZsYWdzX2Jhc2UpIHtcbiAgICAgICAgICAgICAgICBuZXh0X2luZGVudF9sZXZlbCA9IGZsYWdzX2Jhc2UuaW5kZW50YXRpb25fbGV2ZWw7XG4gICAgICAgICAgICAgICAgaWYgKCFvdXRwdXQuanVzdF9hZGRlZF9uZXdsaW5lKCkgJiZcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3NfYmFzZS5saW5lX2luZGVudF9sZXZlbCA+IG5leHRfaW5kZW50X2xldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHRfaW5kZW50X2xldmVsID0gZmxhZ3NfYmFzZS5saW5lX2luZGVudF9sZXZlbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBuZXh0X2ZsYWdzID0ge1xuICAgICAgICAgICAgICAgIG1vZGU6IG1vZGUsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBmbGFnc19iYXNlLFxuICAgICAgICAgICAgICAgIGxhc3RfdGV4dDogZmxhZ3NfYmFzZSA/IGZsYWdzX2Jhc2UubGFzdF90ZXh0IDogJycsIC8vIGxhc3QgdG9rZW4gdGV4dFxuICAgICAgICAgICAgICAgIGxhc3Rfd29yZDogZmxhZ3NfYmFzZSA/IGZsYWdzX2Jhc2UubGFzdF93b3JkIDogJycsIC8vIGxhc3QgJ1RLX1dPUkQnIHBhc3NlZFxuICAgICAgICAgICAgICAgIGRlY2xhcmF0aW9uX3N0YXRlbWVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGVjbGFyYXRpb25fYXNzaWdubWVudDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbXVsdGlsaW5lX2ZyYW1lOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpZl9ibG9jazogZmFsc2UsXG4gICAgICAgICAgICAgICAgZWxzZV9ibG9jazogZmFsc2UsXG4gICAgICAgICAgICAgICAgZG9fYmxvY2s6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRvX3doaWxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbl9jYXNlX3N0YXRlbWVudDogZmFsc2UsIC8vIHN3aXRjaCguLil7IElOU0lERSBIRVJFIH1cbiAgICAgICAgICAgICAgICBpbl9jYXNlOiBmYWxzZSwgLy8gd2UncmUgb24gdGhlIGV4YWN0IGxpbmUgd2l0aCBcImNhc2UgMDpcIlxuICAgICAgICAgICAgICAgIGNhc2VfYm9keTogZmFsc2UsIC8vIHRoZSBpbmRlbnRlZCBjYXNlLWFjdGlvbiBibG9ja1xuICAgICAgICAgICAgICAgIGluZGVudGF0aW9uX2xldmVsOiBuZXh0X2luZGVudF9sZXZlbCxcbiAgICAgICAgICAgICAgICBsaW5lX2luZGVudF9sZXZlbDogZmxhZ3NfYmFzZSA/IGZsYWdzX2Jhc2UubGluZV9pbmRlbnRfbGV2ZWwgOiBuZXh0X2luZGVudF9sZXZlbCxcbiAgICAgICAgICAgICAgICBzdGFydF9saW5lX2luZGV4OiBvdXRwdXQuZ2V0X2xpbmVfbnVtYmVyKCksXG4gICAgICAgICAgICAgICAgdGVybmFyeV9kZXB0aDogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBuZXh0X2ZsYWdzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU29tZSBpbnRlcnByZXRlcnMgaGF2ZSB1bmV4cGVjdGVkIHJlc3VsdHMgd2l0aCBmb28gPSBiYXogfHwgYmFyO1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyA/IG9wdGlvbnMgOiB7fTtcbiAgICAgICAgb3B0ID0ge307XG5cbiAgICAgICAgLy8gY29tcGF0aWJpbGl0eVxuICAgICAgICBpZiAob3B0aW9ucy5icmFjZXNfb25fb3duX2xpbmUgIT09IHVuZGVmaW5lZCkgeyAvL2dyYWNlZnVsIGhhbmRsaW5nIG9mIGRlcHJlY2F0ZWQgb3B0aW9uXG4gICAgICAgICAgICBvcHQuYnJhY2Vfc3R5bGUgPSBvcHRpb25zLmJyYWNlc19vbl9vd25fbGluZSA/IFwiZXhwYW5kXCIgOiBcImNvbGxhcHNlXCI7XG4gICAgICAgIH1cbiAgICAgICAgb3B0LmJyYWNlX3N0eWxlID0gb3B0aW9ucy5icmFjZV9zdHlsZSA/IG9wdGlvbnMuYnJhY2Vfc3R5bGUgOiAob3B0LmJyYWNlX3N0eWxlID8gb3B0LmJyYWNlX3N0eWxlIDogXCJjb2xsYXBzZVwiKTtcblxuICAgICAgICAvLyBncmFjZWZ1bCBoYW5kbGluZyBvZiBkZXByZWNhdGVkIG9wdGlvblxuICAgICAgICBpZiAob3B0LmJyYWNlX3N0eWxlID09PSBcImV4cGFuZC1zdHJpY3RcIikge1xuICAgICAgICAgICAgb3B0LmJyYWNlX3N0eWxlID0gXCJleHBhbmRcIjtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgb3B0LmluZGVudF9zaXplID0gb3B0aW9ucy5pbmRlbnRfc2l6ZSA/IHBhcnNlSW50KG9wdGlvbnMuaW5kZW50X3NpemUsIDEwKSA6IDQ7XG4gICAgICAgIG9wdC5pbmRlbnRfY2hhciA9IG9wdGlvbnMuaW5kZW50X2NoYXIgPyBvcHRpb25zLmluZGVudF9jaGFyIDogJyAnO1xuICAgICAgICBvcHQucHJlc2VydmVfbmV3bGluZXMgPSAob3B0aW9ucy5wcmVzZXJ2ZV9uZXdsaW5lcyA9PT0gdW5kZWZpbmVkKSA/IHRydWUgOiBvcHRpb25zLnByZXNlcnZlX25ld2xpbmVzO1xuICAgICAgICBvcHQuYnJlYWtfY2hhaW5lZF9tZXRob2RzID0gKG9wdGlvbnMuYnJlYWtfY2hhaW5lZF9tZXRob2RzID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmJyZWFrX2NoYWluZWRfbWV0aG9kcztcbiAgICAgICAgb3B0Lm1heF9wcmVzZXJ2ZV9uZXdsaW5lcyA9IChvcHRpb25zLm1heF9wcmVzZXJ2ZV9uZXdsaW5lcyA9PT0gdW5kZWZpbmVkKSA/IDAgOiBwYXJzZUludChvcHRpb25zLm1heF9wcmVzZXJ2ZV9uZXdsaW5lcywgMTApO1xuICAgICAgICBvcHQuc3BhY2VfaW5fcGFyZW4gPSAob3B0aW9ucy5zcGFjZV9pbl9wYXJlbiA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy5zcGFjZV9pbl9wYXJlbjtcbiAgICAgICAgb3B0LnNwYWNlX2luX2VtcHR5X3BhcmVuID0gKG9wdGlvbnMuc3BhY2VfaW5fZW1wdHlfcGFyZW4gPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuc3BhY2VfaW5fZW1wdHlfcGFyZW47XG4gICAgICAgIG9wdC5qc2xpbnRfaGFwcHkgPSAob3B0aW9ucy5qc2xpbnRfaGFwcHkgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuanNsaW50X2hhcHB5O1xuICAgICAgICBvcHQuc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbiA9IChvcHRpb25zLnNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24gPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbjtcbiAgICAgICAgb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24gPSAob3B0aW9ucy5rZWVwX2FycmF5X2luZGVudGF0aW9uID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBvcHRpb25zLmtlZXBfYXJyYXlfaW5kZW50YXRpb247XG4gICAgICAgIG9wdC5zcGFjZV9iZWZvcmVfY29uZGl0aW9uYWwgPSAob3B0aW9ucy5zcGFjZV9iZWZvcmVfY29uZGl0aW9uYWwgPT09IHVuZGVmaW5lZCkgPyB0cnVlIDogb3B0aW9ucy5zcGFjZV9iZWZvcmVfY29uZGl0aW9uYWw7XG4gICAgICAgIG9wdC51bmVzY2FwZV9zdHJpbmdzID0gKG9wdGlvbnMudW5lc2NhcGVfc3RyaW5ncyA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogb3B0aW9ucy51bmVzY2FwZV9zdHJpbmdzO1xuICAgICAgICBvcHQud3JhcF9saW5lX2xlbmd0aCA9IChvcHRpb25zLndyYXBfbGluZV9sZW5ndGggPT09IHVuZGVmaW5lZCkgPyAwIDogcGFyc2VJbnQob3B0aW9ucy53cmFwX2xpbmVfbGVuZ3RoLCAxMCk7XG4gICAgICAgIG9wdC5lNHggPSAob3B0aW9ucy5lNHggPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuZTR4O1xuICAgICAgICBvcHQuZW5kX3dpdGhfbmV3bGluZSA9IChvcHRpb25zLmVuZF93aXRoX25ld2xpbmUgPT09IHVuZGVmaW5lZCkgPyBmYWxzZSA6IG9wdGlvbnMuZW5kX3dpdGhfbmV3bGluZTtcblxuXG4gICAgICAgIC8vIGZvcmNlIG9wdC5zcGFjZV9hZnRlcl9hbm9uX2Z1bmN0aW9uIHRvIHRydWUgaWYgb3B0LmpzbGludF9oYXBweVxuICAgICAgICBpZihvcHQuanNsaW50X2hhcHB5KSB7XG4gICAgICAgICAgICBvcHQuc3BhY2VfYWZ0ZXJfYW5vbl9mdW5jdGlvbiA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZihvcHRpb25zLmluZGVudF93aXRoX3RhYnMpe1xuICAgICAgICAgICAgb3B0LmluZGVudF9jaGFyID0gJ1xcdCc7XG4gICAgICAgICAgICBvcHQuaW5kZW50X3NpemUgPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgIGluZGVudF9zdHJpbmcgPSAnJztcbiAgICAgICAgd2hpbGUgKG9wdC5pbmRlbnRfc2l6ZSA+IDApIHtcbiAgICAgICAgICAgIGluZGVudF9zdHJpbmcgKz0gb3B0LmluZGVudF9jaGFyO1xuICAgICAgICAgICAgb3B0LmluZGVudF9zaXplIC09IDE7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJlaW5kZW50X2luZGV4ID0gMDtcbiAgICAgICAgaWYoanNfc291cmNlX3RleHQgJiYganNfc291cmNlX3RleHQubGVuZ3RoKSB7XG4gICAgICAgICAgICB3aGlsZSAoIChqc19zb3VyY2VfdGV4dC5jaGFyQXQocHJlaW5kZW50X2luZGV4KSA9PT0gJyAnIHx8XG4gICAgICAgICAgICAgICAgICAgIGpzX3NvdXJjZV90ZXh0LmNoYXJBdChwcmVpbmRlbnRfaW5kZXgpID09PSAnXFx0JykpIHtcbiAgICAgICAgICAgICAgICBiYXNlSW5kZW50U3RyaW5nICs9IGpzX3NvdXJjZV90ZXh0LmNoYXJBdChwcmVpbmRlbnRfaW5kZXgpO1xuICAgICAgICAgICAgICAgIHByZWluZGVudF9pbmRleCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAganNfc291cmNlX3RleHQgPSBqc19zb3VyY2VfdGV4dC5zdWJzdHJpbmcocHJlaW5kZW50X2luZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxhc3RfdHlwZSA9ICdUS19TVEFSVF9CTE9DSyc7IC8vIGxhc3QgdG9rZW4gdHlwZVxuICAgICAgICBsYXN0X2xhc3RfdGV4dCA9ICcnOyAvLyBwcmUtbGFzdCB0b2tlbiB0ZXh0XG4gICAgICAgIG91dHB1dCA9IG5ldyBPdXRwdXQoaW5kZW50X3N0cmluZywgYmFzZUluZGVudFN0cmluZyk7XG5cblxuICAgICAgICAvLyBTdGFjayBvZiBwYXJzaW5nL2Zvcm1hdHRpbmcgc3RhdGVzLCBpbmNsdWRpbmcgTU9ERS5cbiAgICAgICAgLy8gV2UgdG9rZW5pemUsIHBhcnNlLCBhbmQgb3V0cHV0IGluIGFuIGFsbW9zdCBwdXJlbHkgYSBmb3J3YXJkLW9ubHkgc3RyZWFtIG9mIHRva2VuIGlucHV0XG4gICAgICAgIC8vIGFuZCBmb3JtYXR0ZWQgb3V0cHV0LiAgVGhpcyBtYWtlcyB0aGUgYmVhdXRpZmllciBsZXNzIGFjY3VyYXRlIHRoYW4gZnVsbCBwYXJzZXJzXG4gICAgICAgIC8vIGJ1dCBhbHNvIGZhciBtb3JlIHRvbGVyYW50IG9mIHN5bnRheCBlcnJvcnMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEZvciBleGFtcGxlLCB0aGUgZGVmYXVsdCBtb2RlIGlzIE1PREUuQmxvY2tTdGF0ZW1lbnQuIElmIHdlIHNlZSBhICd7JyB3ZSBwdXNoIGEgbmV3IGZyYW1lIG9mIHR5cGVcbiAgICAgICAgLy8gTU9ERS5CbG9ja1N0YXRlbWVudCBvbiB0aGUgdGhlIHN0YWNrLCBldmVuIHRob3VnaCBpdCBjb3VsZCBiZSBvYmplY3QgbGl0ZXJhbC4gIElmIHdlIGxhdGVyXG4gICAgICAgIC8vIGVuY291bnRlciBhIFwiOlwiLCB3ZSdsbCBzd2l0Y2ggdG8gdG8gTU9ERS5PYmplY3RMaXRlcmFsLiAgSWYgd2UgdGhlbiBzZWUgYSBcIjtcIixcbiAgICAgICAgLy8gbW9zdCBmdWxsIHBhcnNlcnMgd291bGQgZGllLCBidXQgdGhlIGJlYXV0aWZpZXIgZ3JhY2VmdWxseSBmYWxscyBiYWNrIHRvXG4gICAgICAgIC8vIE1PREUuQmxvY2tTdGF0ZW1lbnQgYW5kIGNvbnRpbnVlcyBvbi5cbiAgICAgICAgZmxhZ19zdG9yZSA9IFtdO1xuICAgICAgICBzZXRfbW9kZShNT0RFLkJsb2NrU3RhdGVtZW50KTtcblxuICAgICAgICB0aGlzLmJlYXV0aWZ5ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8qanNoaW50IG9uZXZhcjp0cnVlICovXG4gICAgICAgICAgICB2YXIgbG9jYWxfdG9rZW4sIHN3ZWV0X2NvZGU7XG4gICAgICAgICAgICBUb2tlbml6ZXIgPSBuZXcgdG9rZW5pemVyKGpzX3NvdXJjZV90ZXh0LCBvcHQsIGluZGVudF9zdHJpbmcpO1xuICAgICAgICAgICAgdG9rZW5zID0gVG9rZW5pemVyLnRva2VuaXplKCk7XG4gICAgICAgICAgICB0b2tlbl9wb3MgPSAwO1xuXG4gICAgICAgICAgICB3aGlsZSAobG9jYWxfdG9rZW4gPSBnZXRfdG9rZW4oKSkge1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsb2NhbF90b2tlbi5jb21tZW50c19iZWZvcmUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGNsZWFuZXN0IGhhbmRsaW5nIG9mIGlubGluZSBjb21tZW50cyBpcyB0byB0cmVhdCB0aGVtIGFzIHRob3VnaCB0aGV5IGFyZW4ndCB0aGVyZS5cbiAgICAgICAgICAgICAgICAgICAgLy8gSnVzdCBjb250aW51ZSBmb3JtYXR0aW5nIGFuZCB0aGUgYmVoYXZpb3Igc2hvdWxkIGJlIGxvZ2ljYWwuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsc28gaWdub3JlIHVua25vd24gdG9rZW5zLiAgQWdhaW4sIHRoaXMgc2hvdWxkIHJlc3VsdCBpbiBiZXR0ZXIgYmVoYXZpb3IuXG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZV90b2tlbihsb2NhbF90b2tlbi5jb21tZW50c19iZWZvcmVbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYW5kbGVfdG9rZW4obG9jYWxfdG9rZW4pO1xuXG4gICAgICAgICAgICAgICAgbGFzdF9sYXN0X3RleHQgPSBmbGFncy5sYXN0X3RleHQ7XG4gICAgICAgICAgICAgICAgbGFzdF90eXBlID0gbG9jYWxfdG9rZW4udHlwZTtcbiAgICAgICAgICAgICAgICBmbGFncy5sYXN0X3RleHQgPSBsb2NhbF90b2tlbi50ZXh0O1xuXG4gICAgICAgICAgICAgICAgdG9rZW5fcG9zICs9IDE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN3ZWV0X2NvZGUgPSBvdXRwdXQuZ2V0X2NvZGUoKTtcbiAgICAgICAgICAgIGlmIChvcHQuZW5kX3dpdGhfbmV3bGluZSkge1xuICAgICAgICAgICAgICAgIHN3ZWV0X2NvZGUgKz0gJ1xcbic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzd2VldF9jb2RlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV90b2tlbihsb2NhbF90b2tlbikge1xuICAgICAgICAgICAgdmFyIG5ld2xpbmVzID0gbG9jYWxfdG9rZW4ubmV3bGluZXM7XG4gICAgICAgICAgICB2YXIga2VlcF93aGl0ZXNwYWNlID0gb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24gJiYgaXNfYXJyYXkoZmxhZ3MubW9kZSk7XG5cbiAgICAgICAgICAgIGlmIChrZWVwX3doaXRlc3BhY2UpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbmV3bGluZXM7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGkgPiAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvcHQubWF4X3ByZXNlcnZlX25ld2xpbmVzICYmIG5ld2xpbmVzID4gb3B0Lm1heF9wcmVzZXJ2ZV9uZXdsaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBuZXdsaW5lcyA9IG9wdC5tYXhfcHJlc2VydmVfbmV3bGluZXM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG9wdC5wcmVzZXJ2ZV9uZXdsaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobG9jYWxfdG9rZW4ubmV3bGluZXMgPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IG5ld2xpbmVzOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjdXJyZW50X3Rva2VuID0gbG9jYWxfdG9rZW47XG4gICAgICAgICAgICBoYW5kbGVyc1tjdXJyZW50X3Rva2VuLnR5cGVdKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB3ZSBjb3VsZCB1c2UganVzdCBzdHJpbmcuc3BsaXQsIGJ1dFxuICAgICAgICAvLyBJRSBkb2Vzbid0IGxpa2UgcmV0dXJuaW5nIGVtcHR5IHN0cmluZ3NcblxuICAgICAgICBmdW5jdGlvbiBzcGxpdF9uZXdsaW5lcyhzKSB7XG4gICAgICAgICAgICAvL3JldHVybiBzLnNwbGl0KC9cXHgwZFxceDBhfFxceDBhLyk7XG5cbiAgICAgICAgICAgIHMgPSBzLnJlcGxhY2UoL1xceDBkL2csICcnKTtcbiAgICAgICAgICAgIHZhciBvdXQgPSBbXSxcbiAgICAgICAgICAgICAgICBpZHggPSBzLmluZGV4T2YoXCJcXG5cIik7XG4gICAgICAgICAgICB3aGlsZSAoaWR4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKHMuc3Vic3RyaW5nKDAsIGlkeCkpO1xuICAgICAgICAgICAgICAgIHMgPSBzLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgICAgICAgICAgICBpZHggPSBzLmluZGV4T2YoXCJcXG5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvdXQucHVzaChzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKGZvcmNlX2xpbmV3cmFwKSB7XG4gICAgICAgICAgICBmb3JjZV9saW5ld3JhcCA9IChmb3JjZV9saW5ld3JhcCA9PT0gdW5kZWZpbmVkKSA/IGZhbHNlIDogZm9yY2VfbGluZXdyYXA7XG5cbiAgICAgICAgICAgIGlmIChvdXRwdXQuanVzdF9hZGRlZF9uZXdsaW5lKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKChvcHQucHJlc2VydmVfbmV3bGluZXMgJiYgY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSkgfHwgZm9yY2VfbGluZXdyYXApIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3B0LndyYXBfbGluZV9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBuZXZlciB3cmFwIHRoZSBmaXJzdCB0b2tlbiBvZiBhIGxpbmUgZHVlIHRvIG5ld2xpbmUgY2hlY2sgYWJvdmUuXG4gICAgICAgICAgICAgICAgdmFyIHByb3Bvc2VkX2xpbmVfbGVuZ3RoID0gb3V0cHV0LmN1cnJlbnRfbGluZS5nZXRfY2hhcmFjdGVyX2NvdW50KCkgKyBjdXJyZW50X3Rva2VuLnRleHQubGVuZ3RoICtcbiAgICAgICAgICAgICAgICAgICAgKG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgaWYgKHByb3Bvc2VkX2xpbmVfbGVuZ3RoID49IG9wdC53cmFwX2xpbmVfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByaW50X25ld2xpbmUoZm9yY2VfbmV3bGluZSwgcHJlc2VydmVfc3RhdGVtZW50X2ZsYWdzKSB7XG4gICAgICAgICAgICBpZiAoIXByZXNlcnZlX3N0YXRlbWVudF9mbGFncykge1xuICAgICAgICAgICAgICAgIGlmIChmbGFncy5sYXN0X3RleHQgIT09ICc7JyAmJiBmbGFncy5sYXN0X3RleHQgIT09ICcsJyAmJiBmbGFncy5sYXN0X3RleHQgIT09ICc9JyAmJiBsYXN0X3R5cGUgIT09ICdUS19PUEVSQVRPUicpIHtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50ICYmICFmbGFncy5pZl9ibG9jayAmJiAhZmxhZ3MuZG9fYmxvY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob3V0cHV0LmFkZF9uZXdfbGluZShmb3JjZV9uZXdsaW5lKSkge1xuICAgICAgICAgICAgICAgIGZsYWdzLm11bHRpbGluZV9mcmFtZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcmludF90b2tlbl9saW5lX2luZGVudGF0aW9uKCkge1xuICAgICAgICAgICAgaWYgKG91dHB1dC5qdXN0X2FkZGVkX25ld2xpbmUoKSkge1xuICAgICAgICAgICAgICAgIGlmIChvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbiAmJiBpc19hcnJheShmbGFncy5tb2RlKSAmJiBjdXJyZW50X3Rva2VuLndhbnRlZF9uZXdsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHByZXZlbnQgcmVtb3Zpbmcgb2YgdGhpcyB3aGl0ZXNwYWNlIGFzIHJlZHVuZGFudFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuY3VycmVudF9saW5lLnB1c2goJycpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGN1cnJlbnRfdG9rZW4ud2hpdGVzcGFjZV9iZWZvcmUubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5jdXJyZW50X2xpbmUucHVzaChjdXJyZW50X3Rva2VuLndoaXRlc3BhY2VfYmVmb3JlW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvdXRwdXQuYWRkX2luZGVudF9zdHJpbmcoZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmxpbmVfaW5kZW50X2xldmVsID0gZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcHJpbnRfdG9rZW4ocHJpbnRhYmxlX3Rva2VuKSB7XG4gICAgICAgICAgICBwcmludGFibGVfdG9rZW4gPSBwcmludGFibGVfdG9rZW4gfHwgY3VycmVudF90b2tlbi50ZXh0O1xuICAgICAgICAgICAgcHJpbnRfdG9rZW5fbGluZV9pbmRlbnRhdGlvbigpO1xuICAgICAgICAgICAgb3V0cHV0LmFkZF90b2tlbihwcmludGFibGVfdG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaW5kZW50KCkge1xuICAgICAgICAgICAgZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWwgKz0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRlaW5kZW50KCkge1xuICAgICAgICAgICAgaWYgKGZsYWdzLmluZGVudGF0aW9uX2xldmVsID4gMCAmJlxuICAgICAgICAgICAgICAgICgoIWZsYWdzLnBhcmVudCkgfHwgZmxhZ3MuaW5kZW50YXRpb25fbGV2ZWwgPiBmbGFncy5wYXJlbnQuaW5kZW50YXRpb25fbGV2ZWwpKVxuICAgICAgICAgICAgICAgIGZsYWdzLmluZGVudGF0aW9uX2xldmVsIC09IDE7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZXRfbW9kZShtb2RlKSB7XG4gICAgICAgICAgICBpZiAoZmxhZ3MpIHtcbiAgICAgICAgICAgICAgICBmbGFnX3N0b3JlLnB1c2goZmxhZ3MpO1xuICAgICAgICAgICAgICAgIHByZXZpb3VzX2ZsYWdzID0gZmxhZ3M7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByZXZpb3VzX2ZsYWdzID0gY3JlYXRlX2ZsYWdzKG51bGwsIG1vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmbGFncyA9IGNyZWF0ZV9mbGFncyhwcmV2aW91c19mbGFncywgbW9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc19hcnJheShtb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9kZSA9PT0gTU9ERS5BcnJheUxpdGVyYWw7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc19leHByZXNzaW9uKG1vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBpbl9hcnJheShtb2RlLCBbTU9ERS5FeHByZXNzaW9uLCBNT0RFLkZvckluaXRpYWxpemVyLCBNT0RFLkNvbmRpdGlvbmFsXSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZXN0b3JlX21vZGUoKSB7XG4gICAgICAgICAgICBpZiAoZmxhZ19zdG9yZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcHJldmlvdXNfZmxhZ3MgPSBmbGFncztcbiAgICAgICAgICAgICAgICBmbGFncyA9IGZsYWdfc3RvcmUucG9wKCk7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzX2ZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5yZW1vdmVfcmVkdW5kYW50X2luZGVudGF0aW9uKHByZXZpb3VzX2ZsYWdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzdGFydF9vZl9vYmplY3RfcHJvcGVydHkoKSB7XG4gICAgICAgICAgICByZXR1cm4gZmxhZ3MucGFyZW50Lm1vZGUgPT09IE1PREUuT2JqZWN0TGl0ZXJhbCAmJiBmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCAmJiAoXG4gICAgICAgICAgICAgICAgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJzonICYmIGZsYWdzLnRlcm5hcnlfZGVwdGggPT09IDApIHx8IChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBbJ2dldCcsICdzZXQnXSkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHN0YXJ0X29mX3N0YXRlbWVudCgpIHtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsndmFyJywgJ2xldCcsICdjb25zdCddKSAmJiBjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19XT1JEJykgfHxcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdkbycpIHx8XG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAncmV0dXJuJyAmJiAhY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSkgfHxcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdlbHNlJyAmJiAhKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICdpZicpKSB8fFxuICAgICAgICAgICAgICAgICAgICAobGFzdF90eXBlID09PSAnVEtfRU5EX0VYUFInICYmIChwcmV2aW91c19mbGFncy5tb2RlID09PSBNT0RFLkZvckluaXRpYWxpemVyIHx8IHByZXZpb3VzX2ZsYWdzLm1vZGUgPT09IE1PREUuQ29uZGl0aW9uYWwpKSB8fFxuICAgICAgICAgICAgICAgICAgICAobGFzdF90eXBlID09PSAnVEtfV09SRCcgJiYgZmxhZ3MubW9kZSA9PT0gTU9ERS5CbG9ja1N0YXRlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgIWZsYWdzLmluX2Nhc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICYmICEoY3VycmVudF90b2tlbi50ZXh0ID09PSAnLS0nIHx8IGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJysrJylcbiAgICAgICAgICAgICAgICAgICAgICAgICYmIGN1cnJlbnRfdG9rZW4udHlwZSAhPT0gJ1RLX1dPUkQnICYmIGN1cnJlbnRfdG9rZW4udHlwZSAhPT0gJ1RLX1JFU0VSVkVEJykgfHxcbiAgICAgICAgICAgICAgICAgICAgKGZsYWdzLm1vZGUgPT09IE1PREUuT2JqZWN0TGl0ZXJhbCAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAoZmxhZ3MubGFzdF90ZXh0ID09PSAnOicgJiYgZmxhZ3MudGVybmFyeV9kZXB0aCA9PT0gMCkgfHwgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnZ2V0JywgJ3NldCddKSkpKVxuICAgICAgICAgICAgICAgICkge1xuXG4gICAgICAgICAgICAgICAgc2V0X21vZGUoTU9ERS5TdGF0ZW1lbnQpO1xuICAgICAgICAgICAgICAgIGluZGVudCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsndmFyJywgJ2xldCcsICdjb25zdCddKSAmJiBjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19XT1JEJykge1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5kZWNsYXJhdGlvbl9zdGF0ZW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIElzc3VlICMyNzY6XG4gICAgICAgICAgICAgICAgLy8gSWYgc3RhcnRpbmcgYSBuZXcgc3RhdGVtZW50IHdpdGggW2lmLCBmb3IsIHdoaWxlLCBkb10sIHB1c2ggdG8gYSBuZXcgbGluZS5cbiAgICAgICAgICAgICAgICAvLyBpZiAoYSkgaWYgKGIpIGlmKGMpIGQoKTsgZWxzZSBlKCk7IGVsc2UgZigpO1xuICAgICAgICAgICAgICAgIGlmICghc3RhcnRfb2Zfb2JqZWN0X3Byb3BlcnR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnZG8nLCAnZm9yJywgJ2lmJywgJ3doaWxlJ10pKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFsbF9saW5lc19zdGFydF93aXRoKGxpbmVzLCBjKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxpbmUgPSB0cmltKGxpbmVzW2ldKTtcbiAgICAgICAgICAgICAgICBpZiAobGluZS5jaGFyQXQoMCkgIT09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZWFjaF9saW5lX21hdGNoZXNfaW5kZW50KGxpbmVzLCBpbmRlbnQpIHtcbiAgICAgICAgICAgIHZhciBpID0gMCxcbiAgICAgICAgICAgICAgICBsZW4gPSBsaW5lcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgbGluZTtcbiAgICAgICAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsaW5lID0gbGluZXNbaV07XG4gICAgICAgICAgICAgICAgLy8gYWxsb3cgZW1wdHkgbGluZXMgdG8gcGFzcyB0aHJvdWdoXG4gICAgICAgICAgICAgICAgaWYgKGxpbmUgJiYgbGluZS5pbmRleE9mKGluZGVudCkgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNfc3BlY2lhbF93b3JkKHdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbl9hcnJheSh3b3JkLCBbJ2Nhc2UnLCAncmV0dXJuJywgJ2RvJywgJ2lmJywgJ3Rocm93JywgJ2Vsc2UnXSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRfdG9rZW4ob2Zmc2V0KSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSB0b2tlbl9wb3MgKyAob2Zmc2V0IHx8IDApO1xuICAgICAgICAgICAgcmV0dXJuIChpbmRleCA8IDAgfHwgaW5kZXggPj0gdG9rZW5zLmxlbmd0aCkgPyBudWxsIDogdG9rZW5zW2luZGV4XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9zdGFydF9leHByKCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0X29mX3N0YXRlbWVudCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGNvbmRpdGlvbmFsIHN0YXJ0cyB0aGUgc3RhdGVtZW50IGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbmV4dF9tb2RlID0gTU9ERS5FeHByZXNzaW9uO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ1snKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfV09SRCcgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnKScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhcnJheSBpbmRleCBzcGVjaWZpZXIsIGJyZWFrIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIC8vIGFbeF0sIGZuKClbeF1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFRva2VuaXplci5saW5lX3N0YXJ0ZXJzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc2V0X21vZGUobmV4dF9tb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHQuc3BhY2VfaW5fcGFyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBuZXh0X21vZGUgPSBNT0RFLkFycmF5TGl0ZXJhbDtcbiAgICAgICAgICAgICAgICBpZiAoaXNfYXJyYXkoZmxhZ3MubW9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJ1snIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAoZmxhZ3MubGFzdF90ZXh0ID09PSAnLCcgJiYgKGxhc3RfbGFzdF90ZXh0ID09PSAnXScgfHwgbGFzdF9sYXN0X3RleHQgPT09ICd9JykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBdLCBbIGdvZXMgdG8gbmV3IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0sIFsgZ29lcyB0byBuZXcgbGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2ZvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dF9tb2RlID0gTU9ERS5Gb3JJbml0aWFsaXplcjtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnaWYnLCAnd2hpbGUnXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dF9tb2RlID0gTU9ERS5Db25kaXRpb25hbDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBuZXh0X21vZGUgPSBNT0RFLkV4cHJlc3Npb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmxhZ3MubGFzdF90ZXh0ID09PSAnOycgfHwgbGFzdF90eXBlID09PSAnVEtfU1RBUlRfQkxPQ0snKSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19FTkRfRVhQUicgfHwgbGFzdF90eXBlID09PSAnVEtfU1RBUlRfRVhQUicgfHwgbGFzdF90eXBlID09PSAnVEtfRU5EX0JMT0NLJyB8fCBmbGFncy5sYXN0X3RleHQgPT09ICcuJykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IENvbnNpZGVyIHdoZXRoZXIgZm9yY2luZyB0aGlzIGlzIHJlcXVpcmVkLiAgUmV2aWV3IGZhaWxpbmcgdGVzdHMgd2hlbiByZW1vdmVkLlxuICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSk7XG4gICAgICAgICAgICAgICAgLy8gZG8gbm90aGluZyBvbiAoKCBhbmQgKSggYW5kIF1bIGFuZCBdKCBhbmQgLihcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIShsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnKCcpICYmIGxhc3RfdHlwZSAhPT0gJ1RLX1dPUkQnICYmIGxhc3RfdHlwZSAhPT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIChmbGFncy5sYXN0X3dvcmQgPT09ICdmdW5jdGlvbicgfHwgZmxhZ3MubGFzdF93b3JkID09PSAndHlwZW9mJykpIHx8XG4gICAgICAgICAgICAgICAgKGZsYWdzLmxhc3RfdGV4dCA9PT0gJyonICYmIGxhc3RfbGFzdF90ZXh0ID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgIC8vIGZ1bmN0aW9uKCkgdnMgZnVuY3Rpb24gKClcbiAgICAgICAgICAgICAgICBpZiAob3B0LnNwYWNlX2FmdGVyX2Fub25fZnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgKGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgVG9rZW5pemVyLmxpbmVfc3RhcnRlcnMpIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2NhdGNoJykpIHtcbiAgICAgICAgICAgICAgICBpZiAob3B0LnNwYWNlX2JlZm9yZV9jb25kaXRpb25hbCkge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN1cHBvcnQgb2YgdGhpcyBraW5kIG9mIG5ld2xpbmUgcHJlc2VydmF0aW9uLlxuICAgICAgICAgICAgLy8gYSA9IChiICYmXG4gICAgICAgICAgICAvLyAgICAgKGMgfHwgZCkpO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJygnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0VRVUFMUycgfHwgbGFzdF90eXBlID09PSAnVEtfT1BFUkFUT1InKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3RhcnRfb2Zfb2JqZWN0X3Byb3BlcnR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93X3dyYXBfb3JfcHJlc2VydmVkX25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2V0X21vZGUobmV4dF9tb2RlKTtcbiAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICBpZiAob3B0LnNwYWNlX2luX3BhcmVuKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluIGFsbCBjYXNlcywgaWYgd2UgbmV3bGluZSB3aGlsZSBpbnNpZGUgYW4gZXhwcmVzc2lvbiBpdCBzaG91bGQgYmUgaW5kZW50ZWQuXG4gICAgICAgICAgICBpbmRlbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9lbmRfZXhwcigpIHtcbiAgICAgICAgICAgIC8vIHN0YXRlbWVudHMgaW5zaWRlIGV4cHJlc3Npb25zIGFyZSBub3QgdmFsaWQgc3ludGF4LCBidXQuLi5cbiAgICAgICAgICAgIC8vIHN0YXRlbWVudHMgbXVzdCBhbGwgYmUgY2xvc2VkIHdoZW4gdGhlaXIgY29udGFpbmVyIGNsb3Nlc1xuICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmbGFncy5tdWx0aWxpbmVfZnJhbWUpIHtcbiAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ10nICYmIGlzX2FycmF5KGZsYWdzLm1vZGUpICYmICFvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvcHQuc3BhY2VfaW5fcGFyZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfU1RBUlRfRVhQUicgJiYgISBvcHQuc3BhY2VfaW5fZW1wdHlfcGFyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gKCkgW10gbm8gaW5uZXIgc3BhY2UgaW4gZW1wdHkgcGFyZW5zIGxpa2UgdGhlc2UsIGV2ZXIsIHJlZiAjMzIwXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnXScgJiYgb3B0LmtlZXBfYXJyYXlfaW5kZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0cHV0LnJlbW92ZV9yZWR1bmRhbnRfaW5kZW50YXRpb24ocHJldmlvdXNfZmxhZ3MpO1xuXG4gICAgICAgICAgICAvLyBkbyB7fSB3aGlsZSAoKSAvLyBubyBzdGF0ZW1lbnQgcmVxdWlyZWQgYWZ0ZXJcbiAgICAgICAgICAgIGlmIChmbGFncy5kb193aGlsZSAmJiBwcmV2aW91c19mbGFncy5tb2RlID09PSBNT0RFLkNvbmRpdGlvbmFsKSB7XG4gICAgICAgICAgICAgICAgcHJldmlvdXNfZmxhZ3MubW9kZSA9IE1PREUuRXhwcmVzc2lvbjtcbiAgICAgICAgICAgICAgICBmbGFncy5kb19ibG9jayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGZsYWdzLmRvX3doaWxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9zdGFydF9ibG9jaygpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgYSBPYmplY3RMaXRlcmFsXG4gICAgICAgICAgICB2YXIgbmV4dF90b2tlbiA9IGdldF90b2tlbigxKVxuICAgICAgICAgICAgdmFyIHNlY29uZF90b2tlbiA9IGdldF90b2tlbigyKVxuICAgICAgICAgICAgaWYgKHNlY29uZF90b2tlbiAmJiAoXG4gICAgICAgICAgICAgICAgICAgIChzZWNvbmRfdG9rZW4udGV4dCA9PT0gJzonICYmIGluX2FycmF5KG5leHRfdG9rZW4udHlwZSwgWydUS19TVFJJTkcnLCAnVEtfV09SRCcsICdUS19SRVNFUlZFRCddKSlcbiAgICAgICAgICAgICAgICAgICAgfHwgKGluX2FycmF5KG5leHRfdG9rZW4udGV4dCwgWydnZXQnLCAnc2V0J10pICYmIGluX2FycmF5KHNlY29uZF90b2tlbi50eXBlLCBbJ1RLX1dPUkQnLCAnVEtfUkVTRVJWRUQnXSkpXG4gICAgICAgICAgICAgICAgKSkge1xuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IHN1cHBvcnQgVHlwZVNjcmlwdCxidXQgd2UgZGlkbid0IGJyZWFrIGl0IGZvciBhIHZlcnkgbG9uZyB0aW1lLlxuICAgICAgICAgICAgICAgIC8vIFdlJ2xsIHRyeSB0byBrZWVwIG5vdCBicmVha2luZyBpdC5cbiAgICAgICAgICAgICAgICBpZiAoIWluX2FycmF5KGxhc3RfbGFzdF90ZXh0LCBbJ2NsYXNzJywnaW50ZXJmYWNlJ10pKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldF9tb2RlKE1PREUuT2JqZWN0TGl0ZXJhbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0X21vZGUoTU9ERS5CbG9ja1N0YXRlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRfbW9kZShNT0RFLkJsb2NrU3RhdGVtZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGVtcHR5X2JyYWNlcyA9ICFuZXh0X3Rva2VuLmNvbW1lbnRzX2JlZm9yZS5sZW5ndGggJiYgIG5leHRfdG9rZW4udGV4dCA9PT0gJ30nO1xuICAgICAgICAgICAgdmFyIGVtcHR5X2Fub255bW91c19mdW5jdGlvbiA9IGVtcHR5X2JyYWNlcyAmJiBmbGFncy5sYXN0X3dvcmQgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgICAgICAgICBsYXN0X3R5cGUgPT09ICdUS19FTkRfRVhQUic7XG5cbiAgICAgICAgICAgIGlmIChvcHQuYnJhY2Vfc3R5bGUgPT09IFwiZXhwYW5kXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlICE9PSAnVEtfT1BFUkFUT1InICYmXG4gICAgICAgICAgICAgICAgICAgIChlbXB0eV9hbm9ueW1vdXNfZnVuY3Rpb24gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfdHlwZSA9PT0gJ1RLX0VRVUFMUycgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaXNfc3BlY2lhbF93b3JkKGZsYWdzLmxhc3RfdGV4dCkgJiYgZmxhZ3MubGFzdF90ZXh0ICE9PSAnZWxzZScpKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBjb2xsYXBzZVxuICAgICAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgIT09ICdUS19PUEVSQVRPUicgJiYgbGFzdF90eXBlICE9PSAnVEtfU1RBUlRfRVhQUicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1NUQVJUX0JMT0NLJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBUS19PUEVSQVRPUiBvciBUS19TVEFSVF9FWFBSXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc19hcnJheShwcmV2aW91c19mbGFncy5tb2RlKSAmJiBmbGFncy5sYXN0X3RleHQgPT09ICcsJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RfbGFzdF90ZXh0ID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB9LCB7IGluIGFycmF5IGNvbnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpOyAvLyBbYSwgYiwgYywge1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIGluZGVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2VuZF9ibG9jaygpIHtcbiAgICAgICAgICAgIC8vIHN0YXRlbWVudHMgbXVzdCBhbGwgYmUgY2xvc2VkIHdoZW4gdGhlaXIgY29udGFpbmVyIGNsb3Nlc1xuICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZW1wdHlfYnJhY2VzID0gbGFzdF90eXBlID09PSAnVEtfU1RBUlRfQkxPQ0snO1xuXG4gICAgICAgICAgICBpZiAob3B0LmJyYWNlX3N0eWxlID09PSBcImV4cGFuZFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFlbXB0eV9icmFjZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gc2tpcCB7fVxuICAgICAgICAgICAgICAgIGlmICghZW1wdHlfYnJhY2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc19hcnJheShmbGFncy5tb2RlKSAmJiBvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgUkVBTExZIG5lZWQgYSBuZXdsaW5lIGhlcmUsIGJ1dCBuZXdsaW5lciB3b3VsZCBza2lwIHRoYXRcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdC5rZWVwX2FycmF5X2luZGVudGF0aW9uID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHQua2VlcF9hcnJheV9pbmRlbnRhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV93b3JkKCkge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5tb2RlICE9PSBNT0RFLk9iamVjdExpdGVyYWwgJiZcbiAgICAgICAgICAgICAgICBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnc2V0JywgJ2dldCddKSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRfdG9rZW4udHlwZSA9ICdUS19XT1JEJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5tb2RlID09PSBNT0RFLk9iamVjdExpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dF90b2tlbiA9IGdldF90b2tlbigxKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dF90b2tlbi50ZXh0ID09ICc6Jykge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50X3Rva2VuLnR5cGUgPSAnVEtfV09SRCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRfdG9rZW4ud2FudGVkX25ld2xpbmUgJiYgIWlzX2V4cHJlc3Npb24oZmxhZ3MubW9kZSkgJiZcbiAgICAgICAgICAgICAgICAobGFzdF90eXBlICE9PSAnVEtfT1BFUkFUT1InIHx8IChmbGFncy5sYXN0X3RleHQgPT09ICctLScgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnKysnKSkgJiZcbiAgICAgICAgICAgICAgICBsYXN0X3R5cGUgIT09ICdUS19FUVVBTFMnICYmXG4gICAgICAgICAgICAgICAgKG9wdC5wcmVzZXJ2ZV9uZXdsaW5lcyB8fCAhKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsndmFyJywgJ2xldCcsICdjb25zdCcsICdzZXQnLCAnZ2V0J10pKSkpIHtcblxuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZsYWdzLmRvX2Jsb2NrICYmICFmbGFncy5kb193aGlsZSkge1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnd2hpbGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRvIHt9ICMjIHdoaWxlICgpXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuZG9fd2hpbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8ge30gc2hvdWxkIGFsd2F5cyBoYXZlIHdoaWxlIGFzIHRoZSBuZXh0IHdvcmQuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHdlIGRvbid0IHNlZSB0aGUgZXhwZWN0ZWQgd2hpbGUsIHJlY292ZXJcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5kb19ibG9jayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgbWF5IGJlIGZvbGxvd2VkIGJ5IGVsc2UsIG9yIG5vdFxuICAgICAgICAgICAgLy8gQmFyZS9pbmxpbmUgaWZzIGFyZSB0cmlja3lcbiAgICAgICAgICAgIC8vIE5lZWQgdG8gdW53aW5kIHRoZSBtb2RlcyBjb3JyZWN0bHk6IGlmIChhKSBpZiAoYikgYygpOyBlbHNlIGQoKTsgZWxzZSBlKCk7XG4gICAgICAgICAgICBpZiAoZmxhZ3MuaWZfYmxvY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZsYWdzLmVsc2VfYmxvY2sgJiYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICdlbHNlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MuZWxzZV9ibG9jayA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGZsYWdzLm1vZGUgPT09IE1PREUuU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN0b3JlX21vZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmbGFncy5pZl9ibG9jayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5lbHNlX2Jsb2NrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICdjYXNlJyB8fCAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnZGVmYXVsdCcgJiYgZmxhZ3MuaW5fY2FzZV9zdGF0ZW1lbnQpKSkge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MuY2FzZV9ib2R5IHx8IG9wdC5qc2xpbnRfaGFwcHkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3dpdGNoIGNhc2VzIGZvbGxvd2luZyBvbmUgYW5vdGhlclxuICAgICAgICAgICAgICAgICAgICBkZWluZGVudCgpO1xuICAgICAgICAgICAgICAgICAgICBmbGFncy5jYXNlX2JvZHkgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICBmbGFncy5pbl9jYXNlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBmbGFncy5pbl9jYXNlX3N0YXRlbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGlmIChpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnfScsICc7J10pIHx8IChvdXRwdXQuanVzdF9hZGRlZF9uZXdsaW5lKCkgJiYgISBpbl9hcnJheShmbGFncy5sYXN0X3RleHQsIFsnWycsICd7JywgJzonLCAnPScsICcsJ10pKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlcmUgaXMgYSBuaWNlIGNsZWFuIHNwYWNlIG9mIGF0IGxlYXN0IG9uZSBibGFuayBsaW5lXG4gICAgICAgICAgICAgICAgICAgIC8vIGJlZm9yZSBhIG5ldyBmdW5jdGlvbiBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICggIW91dHB1dC5qdXN0X2FkZGVkX2JsYW5rbGluZSgpICYmICFjdXJyZW50X3Rva2VuLmNvbW1lbnRzX2JlZm9yZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyB8fCBsYXN0X3R5cGUgPT09ICdUS19XT1JEJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWydnZXQnLCAnc2V0JywgJ25ldycsICdyZXR1cm4nLCAnZXhwb3J0J10pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgZmxhZ3MubGFzdF90ZXh0ID09PSAnZGVmYXVsdCcgJiYgbGFzdF9sYXN0X3RleHQgPT09ICdleHBvcnQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfT1BFUkFUT1InIHx8IGZsYWdzLmxhc3RfdGV4dCA9PT0gJz0nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvbyA9IGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWZsYWdzLm11bHRpbGluZV9mcmFtZSAmJiAoaXNfZXhwcmVzc2lvbihmbGFncy5tb2RlKSB8fCBpc19hcnJheShmbGFncy5tb2RlKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gKGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0NPTU1BJyB8fCBsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9FWFBSJyB8fCBsYXN0X3R5cGUgPT09ICdUS19FUVVBTFMnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgIGlmICghc3RhcnRfb2Zfb2JqZWN0X3Byb3BlcnR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiAgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJ2Z1bmN0aW9uJywgJ2dldCcsICdzZXQnXSkpIHtcbiAgICAgICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgICAgIGZsYWdzLmxhc3Rfd29yZCA9IGN1cnJlbnRfdG9rZW4udGV4dDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZWZpeCA9ICdOT05FJztcblxuICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0VORF9CTE9DSycpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJ2Vsc2UnLCAnY2F0Y2gnLCAnZmluYWxseSddKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHQuYnJhY2Vfc3R5bGUgPT09IFwiZXhwYW5kXCIgfHwgb3B0LmJyYWNlX3N0eWxlID09PSBcImVuZC1leHBhbmRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4ID0gJ1NQQUNFJztcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19TRU1JQ09MT04nICYmIGZsYWdzLm1vZGUgPT09IE1PREUuQmxvY2tTdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBTaG91bGQgdGhpcyBiZSBmb3IgU1RBVEVNRU5UIGFzIHdlbGw/XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19TRU1JQ09MT04nICYmIGlzX2V4cHJlc3Npb24oZmxhZ3MubW9kZSkpIHtcbiAgICAgICAgICAgICAgICBwcmVmaXggPSAnU1BBQ0UnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19TVFJJTkcnKSB7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgfHwgbGFzdF90eXBlID09PSAnVEtfV09SRCcgfHxcbiAgICAgICAgICAgICAgICAoZmxhZ3MubGFzdF90ZXh0ID09PSAnKicgJiYgbGFzdF9sYXN0X3RleHQgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ1NQQUNFJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfU1RBUlRfQkxPQ0snKSB7XG4gICAgICAgICAgICAgICAgcHJlZml4ID0gJ05FV0xJTkUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsYXN0X3R5cGUgPT09ICdUS19FTkRfRVhQUicpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBwcmVmaXggPSAnTkVXTElORSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBUb2tlbml6ZXIubGluZV9zdGFydGVycykgJiYgZmxhZ3MubGFzdF90ZXh0ICE9PSAnKScpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MubGFzdF90ZXh0ID09PSAnZWxzZScgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnZXhwb3J0Jykge1xuICAgICAgICAgICAgICAgICAgICBwcmVmaXggPSAnU1BBQ0UnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHByZWZpeCA9ICdORVdMSU5FJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnZWxzZScsICdjYXRjaCcsICdmaW5hbGx5J10pKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSAhPT0gJ1RLX0VORF9CTE9DSycgfHwgb3B0LmJyYWNlX3N0eWxlID09PSBcImV4cGFuZFwiIHx8IG9wdC5icmFjZV9zdHlsZSA9PT0gXCJlbmQtZXhwYW5kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC50cmltKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGluZSA9IG91dHB1dC5jdXJyZW50X2xpbmU7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIHRyaW1tZWQgYW5kIHRoZXJlJ3Mgc29tZXRoaW5nIG90aGVyIHRoYW4gYSBjbG9zZSBibG9jayBiZWZvcmUgdXNcbiAgICAgICAgICAgICAgICAgICAgLy8gcHV0IGEgbmV3bGluZSBiYWNrIGluLiAgSGFuZGxlcyAnfSAvLyBjb21tZW50JyBzY2VuYXJpby5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmUubGFzdCgpICE9PSAnfScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZWZpeCA9PT0gJ05FV0xJTkUnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpc19zcGVjaWFsX3dvcmQoZmxhZ3MubGFzdF90ZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBubyBuZXdsaW5lIGJldHdlZW4gJ3JldHVybiBubm4nXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlICE9PSAnVEtfRU5EX0VYUFInKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobGFzdF90eXBlICE9PSAnVEtfU1RBUlRfRVhQUicgfHwgIShjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBbJ3ZhcicsICdsZXQnLCAnY29uc3QnXSkpKSAmJiBmbGFncy5sYXN0X3RleHQgIT09ICc6Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBmb3JjZSBuZXdsaW5lIG9uICd2YXInOiBmb3IgKHZhciB4ID0gMC4uLilcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnaWYnICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJ2Vsc2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm8gbmV3bGluZSBmb3IgfSBlbHNlIGlmIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkoY3VycmVudF90b2tlbi50ZXh0LCBUb2tlbml6ZXIubGluZV9zdGFydGVycykgJiYgZmxhZ3MubGFzdF90ZXh0ICE9PSAnKScpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmxhZ3MubXVsdGlsaW5lX2ZyYW1lICYmIGlzX2FycmF5KGZsYWdzLm1vZGUpICYmIGZsYWdzLmxhc3RfdGV4dCA9PT0gJywnICYmIGxhc3RfbGFzdF90ZXh0ID09PSAnfScpIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7IC8vIH0sIGluIGxpc3RzIGdldCBhIG5ld2xpbmUgdHJlYXRtZW50XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByZWZpeCA9PT0gJ1NQQUNFJykge1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIGZsYWdzLmxhc3Rfd29yZCA9IGN1cnJlbnRfdG9rZW4udGV4dDtcblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBjdXJyZW50X3Rva2VuLnRleHQgPT09ICdkbycpIHtcbiAgICAgICAgICAgICAgICBmbGFncy5kb19ibG9jayA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgY3VycmVudF90b2tlbi50ZXh0ID09PSAnaWYnKSB7XG4gICAgICAgICAgICAgICAgZmxhZ3MuaWZfYmxvY2sgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX3NlbWljb2xvbigpIHtcbiAgICAgICAgICAgIGlmIChzdGFydF9vZl9zdGF0ZW1lbnQoKSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBjb25kaXRpb25hbCBzdGFydHMgdGhlIHN0YXRlbWVudCBpZiBhcHByb3ByaWF0ZS5cbiAgICAgICAgICAgICAgICAvLyBTZW1pY29sb24gY2FuIGJlIHRoZSBzdGFydCAoYW5kIGVuZCkgb2YgYSBzdGF0ZW1lbnRcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQgJiYgIWZsYWdzLmlmX2Jsb2NrICYmICFmbGFncy5kb19ibG9jaykge1xuICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9zdHJpbmcoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICAgICAgLy8gT25lIGRpZmZlcmVuY2UgLSBzdHJpbmdzIHdhbnQgYXQgbGVhc3QgYSBzcGFjZSBiZWZvcmVcbiAgICAgICAgICAgICAgICBvdXRwdXQuc3BhY2VfYmVmb3JlX3Rva2VuID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX1dPUkQnKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX0NPTU1BJyB8fCBsYXN0X3R5cGUgPT09ICdUS19TVEFSVF9FWFBSJyB8fCBsYXN0X3R5cGUgPT09ICdUS19FUVVBTFMnIHx8IGxhc3RfdHlwZSA9PT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgIGlmICghc3RhcnRfb2Zfb2JqZWN0X3Byb3BlcnR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9lcXVhbHMoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmbGFncy5kZWNsYXJhdGlvbl9zdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBqdXN0IGdvdCBhbiAnPScgaW4gYSB2YXItbGluZSwgZGlmZmVyZW50IGZvcm1hdHRpbmcvbGluZS1icmVha2luZywgZXRjIHdpbGwgbm93IGJlIGRvbmVcbiAgICAgICAgICAgICAgICBmbGFncy5kZWNsYXJhdGlvbl9hc3NpZ25tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2NvbW1hKCkge1xuICAgICAgICAgICAgaWYgKGZsYWdzLmRlY2xhcmF0aW9uX3N0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChpc19leHByZXNzaW9uKGZsYWdzLnBhcmVudC5tb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBkbyBub3QgYnJlYWsgb24gY29tbWEsIGZvcih2YXIgYSA9IDEsIGIgPSAyKVxuICAgICAgICAgICAgICAgICAgICBmbGFncy5kZWNsYXJhdGlvbl9hc3NpZ25tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcblxuICAgICAgICAgICAgICAgIGlmIChmbGFncy5kZWNsYXJhdGlvbl9hc3NpZ25tZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGZsYWdzLmRlY2xhcmF0aW9uX2Fzc2lnbm1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIGlmIChmbGFncy5tb2RlID09PSBNT0RFLk9iamVjdExpdGVyYWwgfHxcbiAgICAgICAgICAgICAgICAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQgJiYgZmxhZ3MucGFyZW50Lm1vZGUgPT09IE1PREUuT2JqZWN0TGl0ZXJhbCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdG9yZV9tb2RlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRVhQUiBvciBET19CTE9DS1xuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfb3BlcmF0b3IoKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRfb2Zfc3RhdGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgY29uZGl0aW9uYWwgc3RhcnRzIHRoZSBzdGF0ZW1lbnQgaWYgYXBwcm9wcmlhdGUuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsYXN0X3R5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaXNfc3BlY2lhbF93b3JkKGZsYWdzLmxhc3RfdGV4dCkpIHtcbiAgICAgICAgICAgICAgICAvLyBcInJldHVyblwiIGhhZCBhIHNwZWNpYWwgaGFuZGxpbmcgaW4gVEtfV09SRC4gTm93IHdlIG5lZWQgdG8gcmV0dXJuIHRoZSBmYXZvclxuICAgICAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBoYWNrIGZvciBhY3Rpb25zY3JpcHQncyBpbXBvcnQgLio7XG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnKicgJiYgbGFzdF90eXBlID09PSAnVEtfRE9UJykge1xuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnOicgJiYgZmxhZ3MuaW5fY2FzZSkge1xuICAgICAgICAgICAgICAgIGZsYWdzLmNhc2VfYm9keSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaW5kZW50KCk7XG4gICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICAgICAgZmxhZ3MuaW5fY2FzZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJzo6Jykge1xuICAgICAgICAgICAgICAgIC8vIG5vIHNwYWNlcyBhcm91bmQgZXhvdGljIG5hbWVzcGFjaW5nIHN5bnRheCBvcGVyYXRvclxuICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNS4xLyNzZWMtNy45LjFcbiAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIGEgbmV3bGluZSBiZXR3ZWVuIC0tIG9yICsrIGFuZCBhbnl0aGluZyBlbHNlIHdlIHNob3VsZCBwcmVzZXJ2ZSBpdC5cbiAgICAgICAgICAgIGlmIChjdXJyZW50X3Rva2VuLndhbnRlZF9uZXdsaW5lICYmIChjdXJyZW50X3Rva2VuLnRleHQgPT09ICctLScgfHwgY3VycmVudF90b2tlbi50ZXh0ID09PSAnKysnKSkge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBbGxvdyBsaW5lIHdyYXBwaW5nIGJldHdlZW4gb3BlcmF0b3JzXG4gICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfT1BFUkFUT1InKSB7XG4gICAgICAgICAgICAgICAgYWxsb3dfd3JhcF9vcl9wcmVzZXJ2ZWRfbmV3bGluZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3BhY2VfYmVmb3JlID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBzcGFjZV9hZnRlciA9IHRydWU7XG5cbiAgICAgICAgICAgIGlmIChpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnLS0nLCAnKysnLCAnIScsICd+J10pIHx8IChpbl9hcnJheShjdXJyZW50X3Rva2VuLnRleHQsIFsnLScsICcrJ10pICYmIChpbl9hcnJheShsYXN0X3R5cGUsIFsnVEtfU1RBUlRfQkxPQ0snLCAnVEtfU1RBUlRfRVhQUicsICdUS19FUVVBTFMnLCAnVEtfT1BFUkFUT1InXSkgfHwgaW5fYXJyYXkoZmxhZ3MubGFzdF90ZXh0LCBUb2tlbml6ZXIubGluZV9zdGFydGVycykgfHwgZmxhZ3MubGFzdF90ZXh0ID09PSAnLCcpKSkge1xuICAgICAgICAgICAgICAgIC8vIHVuYXJ5IG9wZXJhdG9ycyAoYW5kIGJpbmFyeSArLy0gcHJldGVuZGluZyB0byBiZSB1bmFyeSkgc3BlY2lhbCBjYXNlc1xuXG4gICAgICAgICAgICAgICAgc3BhY2VfYmVmb3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc3BhY2VfYWZ0ZXIgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmIChmbGFncy5sYXN0X3RleHQgPT09ICc7JyAmJiBpc19leHByZXNzaW9uKGZsYWdzLm1vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvciAoOzsgKytpKVxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgXl5eXG4gICAgICAgICAgICAgICAgICAgIHNwYWNlX2JlZm9yZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyB8fCBsYXN0X3R5cGUgPT09ICdUS19FTkRfRVhQUicpIHtcbiAgICAgICAgICAgICAgICAgICAgc3BhY2VfYmVmb3JlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxhc3RfdHlwZSA9PT0gJ1RLX09QRVJBVE9SJykge1xuICAgICAgICAgICAgICAgICAgICBzcGFjZV9iZWZvcmUgPVxuICAgICAgICAgICAgICAgICAgICAgICAgKGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWyctLScsICctJ10pICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWyctLScsICctJ10pKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGluX2FycmF5KGN1cnJlbnRfdG9rZW4udGV4dCwgWycrKycsICcrJ10pICYmIGluX2FycmF5KGZsYWdzLmxhc3RfdGV4dCwgWycrKycsICcrJ10pKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoKGZsYWdzLm1vZGUgPT09IE1PREUuQmxvY2tTdGF0ZW1lbnQgfHwgZmxhZ3MubW9kZSA9PT0gTU9ERS5TdGF0ZW1lbnQpICYmIChmbGFncy5sYXN0X3RleHQgPT09ICd7JyB8fCBmbGFncy5sYXN0X3RleHQgPT09ICc7JykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8geyBmb287IC0taSB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvbygpOyAtLWJhcjtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfbmV3bGluZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnOicpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmxhZ3MudGVybmFyeV9kZXB0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDb2xvbiBpcyBpbnZhbGlkIGphdmFzY3JpcHQgb3V0c2lkZSBvZiB0ZXJuYXJ5IGFuZCBvYmplY3QsIGJ1dCBkbyBvdXIgYmVzdCB0byBndWVzcyB3aGF0IHdhcyBtZWFudC5cbiAgICAgICAgICAgICAgICAgICAgc3BhY2VfYmVmb3JlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZmxhZ3MudGVybmFyeV9kZXB0aCAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudF90b2tlbi50ZXh0ID09PSAnPycpIHtcbiAgICAgICAgICAgICAgICBmbGFncy50ZXJuYXJ5X2RlcHRoICs9IDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRfdG9rZW4udGV4dCA9PT0gJyonICYmIGxhc3RfdHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBmbGFncy5sYXN0X3RleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBzcGFjZV9iZWZvcmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzcGFjZV9hZnRlciA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gfHwgc3BhY2VfYmVmb3JlO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSBzcGFjZV9hZnRlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9ibG9ja19jb21tZW50KCkge1xuICAgICAgICAgICAgdmFyIGxpbmVzID0gc3BsaXRfbmV3bGluZXMoY3VycmVudF90b2tlbi50ZXh0KTtcbiAgICAgICAgICAgIHZhciBqOyAvLyBpdGVyYXRvciBmb3IgdGhpcyBjYXNlXG4gICAgICAgICAgICB2YXIgamF2YWRvYyA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHN0YXJsZXNzID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgbGFzdEluZGVudCA9IGN1cnJlbnRfdG9rZW4ud2hpdGVzcGFjZV9iZWZvcmUuam9pbignJyk7XG4gICAgICAgICAgICB2YXIgbGFzdEluZGVudExlbmd0aCA9IGxhc3RJbmRlbnQubGVuZ3RoO1xuXG4gICAgICAgICAgICAvLyBibG9jayBjb21tZW50IHN0YXJ0cyB3aXRoIGEgbmV3IGxpbmVcbiAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBpZiAoYWxsX2xpbmVzX3N0YXJ0X3dpdGgobGluZXMuc2xpY2UoMSksICcqJykpIHtcbiAgICAgICAgICAgICAgICAgICAgamF2YWRvYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGVhY2hfbGluZV9tYXRjaGVzX2luZGVudChsaW5lcy5zbGljZSgxKSwgbGFzdEluZGVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3Rhcmxlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZmlyc3QgbGluZSBhbHdheXMgaW5kZW50ZWRcbiAgICAgICAgICAgIHByaW50X3Rva2VuKGxpbmVzWzBdKTtcbiAgICAgICAgICAgIGZvciAoaiA9IDE7IGogPCBsaW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgICAgIGlmIChqYXZhZG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGphdmFkb2M6IHJlZm9ybWF0IGFuZCByZS1pbmRlbnRcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRfdG9rZW4oJyAnICsgdHJpbShsaW5lc1tqXSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3Rhcmxlc3MgJiYgbGluZXNbal0ubGVuZ3RoID4gbGFzdEluZGVudExlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBzdGFybGVzczogcmUtaW5kZW50IG5vbi1lbXB0eSBjb250ZW50LCBhdm9pZGluZyB0cmltXG4gICAgICAgICAgICAgICAgICAgIHByaW50X3Rva2VuKGxpbmVzW2pdLnN1YnN0cmluZyhsYXN0SW5kZW50TGVuZ3RoKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm9ybWFsIGNvbW1lbnRzIG91dHB1dCByYXdcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0LmFkZF90b2tlbihsaW5lc1tqXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmb3IgY29tbWVudHMgb2YgbW9yZSB0aGFuIG9uZSBsaW5lLCBtYWtlIHN1cmUgdGhlcmUncyBhIG5ldyBsaW5lIGFmdGVyXG4gICAgICAgICAgICBwcmludF9uZXdsaW5lKGZhbHNlLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZV9pbmxpbmVfY29tbWVudCgpIHtcbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICAgICAgcHJpbnRfdG9rZW4oKTtcbiAgICAgICAgICAgIG91dHB1dC5zcGFjZV9iZWZvcmVfdG9rZW4gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX2NvbW1lbnQoKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi53YW50ZWRfbmV3bGluZSkge1xuICAgICAgICAgICAgICAgIHByaW50X25ld2xpbmUoZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQudHJpbSh0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICAgICAgcHJpbnRfbmV3bGluZShmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfZG90KCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0X29mX3N0YXRlbWVudCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGNvbmRpdGlvbmFsIHN0YXJ0cyB0aGUgc3RhdGVtZW50IGlmIGFwcHJvcHJpYXRlLlxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGFzdF90eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGlzX3NwZWNpYWxfd29yZChmbGFncy5sYXN0X3RleHQpKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0LnNwYWNlX2JlZm9yZV90b2tlbiA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGFsbG93IHByZXNlcnZlZCBuZXdsaW5lcyBiZWZvcmUgZG90cyBpbiBnZW5lcmFsXG4gICAgICAgICAgICAgICAgLy8gZm9yY2UgbmV3bGluZXMgb24gZG90cyBhZnRlciBjbG9zZSBwYXJlbiB3aGVuIGJyZWFrX2NoYWluZWQgLSBmb3IgYmFyKCkuYmF6KClcbiAgICAgICAgICAgICAgICBhbGxvd193cmFwX29yX3ByZXNlcnZlZF9uZXdsaW5lKGZsYWdzLmxhc3RfdGV4dCA9PT0gJyknICYmIG9wdC5icmVha19jaGFpbmVkX21ldGhvZHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaGFuZGxlX3Vua25vd24oKSB7XG4gICAgICAgICAgICBwcmludF90b2tlbigpO1xuXG4gICAgICAgICAgICBpZiAoY3VycmVudF90b2tlbi50ZXh0W2N1cnJlbnRfdG9rZW4udGV4dC5sZW5ndGggLSAxXSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICBwcmludF9uZXdsaW5lKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBoYW5kbGVfZW9mKCkge1xuICAgICAgICAgICAgLy8gVW53aW5kIGFueSBvcGVuIHN0YXRlbWVudHNcbiAgICAgICAgICAgIHdoaWxlIChmbGFncy5tb2RlID09PSBNT0RFLlN0YXRlbWVudCkge1xuICAgICAgICAgICAgICAgIHJlc3RvcmVfbW9kZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gT3V0cHV0TGluZSgpIHtcbiAgICAgICAgdmFyIGNoYXJhY3Rlcl9jb3VudCA9IDA7XG4gICAgICAgIHZhciBsaW5lX2l0ZW1zID0gW107XG5cbiAgICAgICAgdGhpcy5nZXRfY2hhcmFjdGVyX2NvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gY2hhcmFjdGVyX2NvdW50O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nZXRfaXRlbV9jb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGxpbmVfaXRlbXMubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nZXRfb3V0cHV0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbGluZV9pdGVtcy5qb2luKCcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubGFzdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGxpbmVfaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybiBsaW5lX2l0ZW1zW2xpbmVfaXRlbXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucHVzaCA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICAgICAgICBsaW5lX2l0ZW1zLnB1c2goaW5wdXQpO1xuICAgICAgICAgICAgY2hhcmFjdGVyX2NvdW50ICs9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVtb3ZlX2luZGVudCA9IGZ1bmN0aW9uKGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBzcGxpY2VfaW5kZXggPSAwO1xuXG4gICAgICAgICAgICAvLyBza2lwIGVtcHR5IGxpbmVzXG4gICAgICAgICAgICBpZiAobGluZV9pdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNraXAgdGhlIHByZWluZGVudCBzdHJpbmcgaWYgcHJlc2VudFxuICAgICAgICAgICAgaWYgKGJhc2VJbmRlbnRTdHJpbmcgJiYgbGluZV9pdGVtc1swXSA9PT0gYmFzZUluZGVudFN0cmluZykge1xuICAgICAgICAgICAgICAgIHNwbGljZV9pbmRleCA9IDE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSBvbmUgaW5kZW50LCBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAobGluZV9pdGVtc1tzcGxpY2VfaW5kZXhdID09PSBpbmRlbnRfc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgY2hhcmFjdGVyX2NvdW50IC09IGxpbmVfaXRlbXNbc3BsaWNlX2luZGV4XS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbGluZV9pdGVtcy5zcGxpY2Uoc3BsaWNlX2luZGV4LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHJpbSA9IGZ1bmN0aW9uKGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLmdldF9pdGVtX2NvdW50KCkgJiZcbiAgICAgICAgICAgICAgICAodGhpcy5sYXN0KCkgPT09ICcgJyB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3QoKSA9PT0gaW5kZW50X3N0cmluZyB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3QoKSA9PT0gYmFzZUluZGVudFN0cmluZykpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IGxpbmVfaXRlbXMucG9wKCk7XG4gICAgICAgICAgICAgICAgY2hhcmFjdGVyX2NvdW50IC09IGl0ZW0ubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gT3V0cHV0KGluZGVudF9zdHJpbmcsIGJhc2VJbmRlbnRTdHJpbmcpIHtcbiAgICAgICAgdmFyIGxpbmVzID1bXTtcbiAgICAgICAgdGhpcy5iYXNlSW5kZW50U3RyaW5nID0gYmFzZUluZGVudFN0cmluZztcbiAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUgPSBudWxsO1xuICAgICAgICB0aGlzLnNwYWNlX2JlZm9yZV90b2tlbiA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuZ2V0X2xpbmVfbnVtYmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbGluZXMubGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNpbmcgb2JqZWN0IGluc3RlYWQgb2Ygc3RyaW5nIHRvIGFsbG93IGZvciBsYXRlciBleHBhbnNpb24gb2YgaW5mbyBhYm91dCBlYWNoIGxpbmVcbiAgICAgICAgdGhpcy5hZGRfbmV3X2xpbmUgPSBmdW5jdGlvbihmb3JjZV9uZXdsaW5lKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRfbGluZV9udW1iZXIoKSA9PT0gMSAmJiB0aGlzLmp1c3RfYWRkZWRfbmV3bGluZSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBubyBuZXdsaW5lIG9uIHN0YXJ0IG9mIGZpbGVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZvcmNlX25ld2xpbmUgfHwgIXRoaXMuanVzdF9hZGRlZF9uZXdsaW5lKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZSA9IG5ldyBPdXRwdXRMaW5lKCk7XG4gICAgICAgICAgICAgICAgbGluZXMucHVzaCh0aGlzLmN1cnJlbnRfbGluZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGluaXRpYWxpemVcbiAgICAgICAgdGhpcy5hZGRfbmV3X2xpbmUodHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5nZXRfY29kZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHN3ZWV0X2NvZGUgPSBsaW5lc1swXS5nZXRfb3V0cHV0KCk7XG4gICAgICAgICAgICBmb3IgKHZhciBsaW5lX2luZGV4ID0gMTsgbGluZV9pbmRleCA8IGxpbmVzLmxlbmd0aDsgbGluZV9pbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgc3dlZXRfY29kZSArPSAnXFxuJyArIGxpbmVzW2xpbmVfaW5kZXhdLmdldF9vdXRwdXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3ZWV0X2NvZGUgPSBzd2VldF9jb2RlLnJlcGxhY2UoL1tcXHJcXG5cXHQgXSskLywgJycpO1xuICAgICAgICAgICAgcmV0dXJuIHN3ZWV0X2NvZGU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFkZF9pbmRlbnRfc3RyaW5nID0gZnVuY3Rpb24oaW5kZW50YXRpb25fbGV2ZWwpIHtcbiAgICAgICAgICAgIGlmIChiYXNlSW5kZW50U3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUucHVzaChiYXNlSW5kZW50U3RyaW5nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTmV2ZXIgaW5kZW50IHlvdXIgZmlyc3Qgb3V0cHV0IGluZGVudCBhdCB0aGUgc3RhcnQgb2YgdGhlIGZpbGVcbiAgICAgICAgICAgIGlmIChsaW5lcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmRlbnRhdGlvbl9sZXZlbDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLnB1c2goaW5kZW50X3N0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hZGRfdG9rZW4gPSBmdW5jdGlvbihwcmludGFibGVfdG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkX3NwYWNlX2JlZm9yZV90b2tlbigpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUucHVzaChwcmludGFibGVfdG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hZGRfc3BhY2VfYmVmb3JlX3Rva2VuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zcGFjZV9iZWZvcmVfdG9rZW4gJiYgdGhpcy5jdXJyZW50X2xpbmUuZ2V0X2l0ZW1fY291bnQoKSkge1xuICAgICAgICAgICAgICAgIHZhciBsYXN0X291dHB1dCA9IHRoaXMuY3VycmVudF9saW5lLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBpZiAobGFzdF9vdXRwdXQgIT09ICcgJyAmJiBsYXN0X291dHB1dCAhPT0gaW5kZW50X3N0cmluZyAmJiBsYXN0X291dHB1dCAhPT0gYmFzZUluZGVudFN0cmluZykgeyAvLyBwcmV2ZW50IG9jY2Fzc2lvbmFsIGR1cGxpY2F0ZSBzcGFjZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZS5wdXNoKCcgJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zcGFjZV9iZWZvcmVfdG9rZW4gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVtb3ZlX3JlZHVuZGFudF9pbmRlbnRhdGlvbiA9IGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICAgICAgLy8gVGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBlZmZlY3RpdmUgYnV0IGhhcyBzb21lIGlzc3VlczpcbiAgICAgICAgICAgIC8vICAgICAtIGxlc3MgdGhhbiBncmVhdCBwZXJmb3JtYW5jZSBkdWUgdG8gYXJyYXkgc3BsaWNpbmdcbiAgICAgICAgICAgIC8vICAgICAtIGNhbiBjYXVzZSBsaW5lIHdyYXAgdG8gaGFwcGVuIHRvbyBzb29uIGR1ZSB0byBpbmRlbnQgcmVtb3ZhbFxuICAgICAgICAgICAgLy8gICAgICAgICAgIGFmdGVyIHdyYXAgcG9pbnRzIGFyZSBjYWxjdWxhdGVkXG4gICAgICAgICAgICAvLyBUaGVzZSBpc3N1ZXMgYXJlIG1pbm9yIGNvbXBhcmVkIHRvIHVnbHkgaW5kZW50YXRpb24uXG5cbiAgICAgICAgICAgIGlmIChmcmFtZS5tdWx0aWxpbmVfZnJhbWUgfHxcbiAgICAgICAgICAgICAgICBmcmFtZS5tb2RlID09PSBNT0RFLkZvckluaXRpYWxpemVyIHx8XG4gICAgICAgICAgICAgICAgZnJhbWUubW9kZSA9PT0gTU9ERS5Db25kaXRpb25hbCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcmVtb3ZlIG9uZSBpbmRlbnQgZnJvbSBlYWNoIGxpbmUgaW5zaWRlIHRoaXMgc2VjdGlvblxuICAgICAgICAgICAgdmFyIGluZGV4ID0gZnJhbWUuc3RhcnRfbGluZV9pbmRleDtcbiAgICAgICAgICAgIHZhciBsaW5lO1xuXG4gICAgICAgICAgICB2YXIgb3V0cHV0X2xlbmd0aCA9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IG91dHB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBsaW5lc1tpbmRleF0ucmVtb3ZlX2luZGVudChpbmRlbnRfc3RyaW5nLCBiYXNlSW5kZW50U3RyaW5nKTtcbiAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50cmltID0gZnVuY3Rpb24oZWF0X25ld2xpbmVzKSB7XG4gICAgICAgICAgICBlYXRfbmV3bGluZXMgPSAoZWF0X25ld2xpbmVzID09PSB1bmRlZmluZWQpID8gZmFsc2UgOiBlYXRfbmV3bGluZXM7XG5cbiAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLnRyaW0oaW5kZW50X3N0cmluZywgYmFzZUluZGVudFN0cmluZyk7XG5cbiAgICAgICAgICAgIHdoaWxlIChlYXRfbmV3bGluZXMgJiYgbGluZXMubGVuZ3RoID4gMSAmJlxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF9saW5lLmdldF9pdGVtX2NvdW50KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICBsaW5lcy5wb3AoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfbGluZSA9IGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2xpbmUudHJpbShpbmRlbnRfc3RyaW5nLCBiYXNlSW5kZW50U3RyaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuanVzdF9hZGRlZF9uZXdsaW5lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50X2xpbmUuZ2V0X2l0ZW1fY291bnQoKSA9PT0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuanVzdF9hZGRlZF9ibGFua2xpbmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmp1c3RfYWRkZWRfbmV3bGluZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gc3RhcnQgb2YgdGhlIGZpbGUgYW5kIG5ld2xpbmUgPSBibGFua1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBsaW5lID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMl07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxpbmUuZ2V0X2l0ZW1fY291bnQoKSA9PT0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgdmFyIFRva2VuID0gZnVuY3Rpb24odHlwZSwgdGV4dCwgbmV3bGluZXMsIHdoaXRlc3BhY2VfYmVmb3JlLCBtb2RlLCBwYXJlbnQpIHtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICAgICAgdGhpcy5jb21tZW50c19iZWZvcmUgPSBbXTtcbiAgICAgICAgdGhpcy5uZXdsaW5lcyA9IG5ld2xpbmVzIHx8IDA7XG4gICAgICAgIHRoaXMud2FudGVkX25ld2xpbmUgPSBuZXdsaW5lcyA+IDA7XG4gICAgICAgIHRoaXMud2hpdGVzcGFjZV9iZWZvcmUgPSB3aGl0ZXNwYWNlX2JlZm9yZSB8fCBbXTtcbiAgICAgICAgdGhpcy5wYXJlbnQgPSBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRva2VuaXplcihpbnB1dCwgb3B0cywgaW5kZW50X3N0cmluZykge1xuXG4gICAgICAgIHZhciB3aGl0ZXNwYWNlID0gXCJcXG5cXHJcXHQgXCIuc3BsaXQoJycpO1xuICAgICAgICB2YXIgZGlnaXQgPSAvWzAtOV0vO1xuXG4gICAgICAgIHZhciBwdW5jdCA9ICgnKyAtICogLyAlICYgKysgLS0gPSArPSAtPSAqPSAvPSAlPSA9PSA9PT0gIT0gIT09ID4gPCA+PSA8PSA+PiA8PCA+Pj4gPj4+PSA+Pj0gPDw9ICYmICY9IHwgfHwgISB+ICwgOiA/IF4gXj0gfD0gOjogPT4nXG4gICAgICAgICAgICAgICAgKycgPCU9IDwlICU+IDw/PSA8PyA/PicpLnNwbGl0KCcgJyk7IC8vIHRyeSB0byBiZSBhIGdvb2QgYm95IGFuZCB0cnkgbm90IHRvIGJyZWFrIHRoZSBtYXJrdXAgbGFuZ3VhZ2UgaWRlbnRpZmllcnNcblxuICAgICAgICAvLyB3b3JkcyB3aGljaCBzaG91bGQgYWx3YXlzIHN0YXJ0IG9uIG5ldyBsaW5lLlxuICAgICAgICB0aGlzLmxpbmVfc3RhcnRlcnMgPSAnY29udGludWUsdHJ5LHRocm93LHJldHVybix2YXIsbGV0LGNvbnN0LGlmLHN3aXRjaCxjYXNlLGRlZmF1bHQsZm9yLHdoaWxlLGJyZWFrLGZ1bmN0aW9uLHlpZWxkLGltcG9ydCxleHBvcnQnLnNwbGl0KCcsJyk7XG4gICAgICAgIHZhciByZXNlcnZlZF93b3JkcyA9IHRoaXMubGluZV9zdGFydGVycy5jb25jYXQoWydkbycsICdpbicsICdlbHNlJywgJ2dldCcsICdzZXQnLCAnbmV3JywgJ2NhdGNoJywgJ2ZpbmFsbHknLCAndHlwZW9mJ10pO1xuXG4gICAgICAgIHZhciBuX25ld2xpbmVzLCB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbiwgaW5faHRtbF9jb21tZW50LCB0b2tlbnMsIHBhcnNlcl9wb3M7XG4gICAgICAgIHZhciBpbnB1dF9sZW5ndGg7XG5cbiAgICAgICAgdGhpcy50b2tlbml6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gY2FjaGUgdGhlIHNvdXJjZSdzIGxlbmd0aC5cbiAgICAgICAgICAgIGlucHV0X2xlbmd0aCA9IGlucHV0Lmxlbmd0aFxuICAgICAgICAgICAgcGFyc2VyX3BvcyA9IDA7XG4gICAgICAgICAgICBpbl9odG1sX2NvbW1lbnQgPSBmYWxzZVxuICAgICAgICAgICAgdG9rZW5zID0gW107XG5cbiAgICAgICAgICAgIHZhciBuZXh0LCBsYXN0O1xuICAgICAgICAgICAgdmFyIHRva2VuX3ZhbHVlcztcbiAgICAgICAgICAgIHZhciBvcGVuID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBvcGVuX3N0YWNrID0gW107XG4gICAgICAgICAgICB2YXIgY29tbWVudHMgPSBbXTtcblxuICAgICAgICAgICAgd2hpbGUgKCEobGFzdCAmJiBsYXN0LnR5cGUgPT09ICdUS19FT0YnKSkge1xuICAgICAgICAgICAgICAgIHRva2VuX3ZhbHVlcyA9IHRva2VuaXplX25leHQoKTtcbiAgICAgICAgICAgICAgICBuZXh0ID0gbmV3IFRva2VuKHRva2VuX3ZhbHVlc1sxXSwgdG9rZW5fdmFsdWVzWzBdLCBuX25ld2xpbmVzLCB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbik7XG4gICAgICAgICAgICAgICAgd2hpbGUobmV4dC50eXBlID09PSAnVEtfSU5MSU5FX0NPTU1FTlQnIHx8IG5leHQudHlwZSA9PT0gJ1RLX0NPTU1FTlQnIHx8XG4gICAgICAgICAgICAgICAgICAgIG5leHQudHlwZSA9PT0gJ1RLX0JMT0NLX0NPTU1FTlQnIHx8IG5leHQudHlwZSA9PT0gJ1RLX1VOS05PV04nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnRzLnB1c2gobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIHRva2VuX3ZhbHVlcyA9IHRva2VuaXplX25leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCA9IG5ldyBUb2tlbih0b2tlbl92YWx1ZXNbMV0sIHRva2VuX3ZhbHVlc1swXSwgbl9uZXdsaW5lcywgd2hpdGVzcGFjZV9iZWZvcmVfdG9rZW4pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjb21tZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dC5jb21tZW50c19iZWZvcmUgPSBjb21tZW50cztcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudHMgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobmV4dC50eXBlID09PSAnVEtfU1RBUlRfQkxPQ0snIHx8IG5leHQudHlwZSA9PT0gJ1RLX1NUQVJUX0VYUFInKSB7XG4gICAgICAgICAgICAgICAgICAgIG5leHQucGFyZW50ID0gbGFzdDtcbiAgICAgICAgICAgICAgICAgICAgb3BlbiA9IG5leHQ7XG4gICAgICAgICAgICAgICAgICAgIG9wZW5fc3RhY2sucHVzaChuZXh0KTtcbiAgICAgICAgICAgICAgICB9ICBlbHNlIGlmICgobmV4dC50eXBlID09PSAnVEtfRU5EX0JMT0NLJyB8fCBuZXh0LnR5cGUgPT09ICdUS19FTkRfRVhQUicpICYmXG4gICAgICAgICAgICAgICAgICAgIChvcGVuICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIChuZXh0LnRleHQgPT09ICddJyAmJiBvcGVuLnRleHQgPT09ICdbJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChuZXh0LnRleHQgPT09ICcpJyAmJiBvcGVuLnRleHQgPT09ICcoJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChuZXh0LnRleHQgPT09ICd9JyAmJiBvcGVuLnRleHQgPT09ICd9JykpKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXh0LnBhcmVudCA9IG9wZW4ucGFyZW50O1xuICAgICAgICAgICAgICAgICAgICBvcGVuID0gb3Blbl9zdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaChuZXh0KTtcbiAgICAgICAgICAgICAgICBsYXN0ID0gbmV4dDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRva2VucztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHRva2VuaXplX25leHQoKSB7XG4gICAgICAgICAgICB2YXIgaSwgcmVzdWx0aW5nX3N0cmluZztcblxuICAgICAgICAgICAgbl9uZXdsaW5lcyA9IDA7XG4gICAgICAgICAgICB3aGl0ZXNwYWNlX2JlZm9yZV90b2tlbiA9IFtdO1xuXG4gICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA+PSBpbnB1dF9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gWycnLCAnVEtfRU9GJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBsYXN0X3Rva2VuO1xuICAgICAgICAgICAgaWYgKHRva2Vucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBsYXN0X3Rva2VuID0gdG9rZW5zW3Rva2Vucy5sZW5ndGgtMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciB0aGUgc2FrZSBvZiB0b2tlbml6aW5nIHdlIGNhbiBwcmV0ZW5kIHRoYXQgdGhlcmUgd2FzIG9uIG9wZW4gYnJhY2UgdG8gc3RhcnRcbiAgICAgICAgICAgICAgICBsYXN0X3Rva2VuID0gbmV3IFRva2VuKCdUS19TVEFSVF9CTE9DSycsICd7Jyk7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgdmFyIGMgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG5cbiAgICAgICAgICAgIHdoaWxlIChpbl9hcnJheShjLCB3aGl0ZXNwYWNlKSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgIG5fbmV3bGluZXMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZV9iZWZvcmVfdG9rZW4gPSBbXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5fbmV3bGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09IGluZGVudF9zdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2VfYmVmb3JlX3Rva2VuLnB1c2goaW5kZW50X3N0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYyAhPT0gJ1xccicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2VfYmVmb3JlX3Rva2VuLnB1c2goJyAnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zID49IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gWycnLCAnVEtfRU9GJ107XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYyA9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChkaWdpdC50ZXN0KGMpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFsbG93X2RlY2ltYWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhciBhbGxvd19lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgbG9jYWxfZGlnaXQgPSBkaWdpdDtcblxuICAgICAgICAgICAgICAgIGlmIChjID09PSAnMCcgJiYgcGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiAvW1h4XS8udGVzdChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN3aXRjaCB0byBoZXggbnVtYmVyLCBubyBkZWNpbWFsIG9yIGUsIGp1c3QgaGV4IGRpZ2l0c1xuICAgICAgICAgICAgICAgICAgICBhbGxvd19kZWNpbWFsID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGFsbG93X2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxfZGlnaXQgPSAvWzAxMjM0NTY3ODlhYmNkZWZBQkNERUZdL1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdlIGtub3cgdGhpcyBmaXJzdCBsb29wIHdpbGwgcnVuLiAgSXQga2VlcHMgdGhlIGxvZ2ljIHNpbXBsZXIuXG4gICAgICAgICAgICAgICAgICAgIGMgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyAtPSAxXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIHRoZSBkaWdpdHNcbiAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBsb2NhbF9kaWdpdC50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYWxsb3dfZGVjaW1hbCAmJiBwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93X2RlY2ltYWwgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChhbGxvd19lICYmIHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgL1tFZV0vLnRlc3QoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIC9bKy1dLy50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93X2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93X2RlY2ltYWwgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX1dPUkQnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFjb3JuLmlzSWRlbnRpZmllclN0YXJ0KGlucHV0LmNoYXJDb2RlQXQocGFyc2VyX3Bvcy0xKSkpIHtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoYWNvcm4uaXNJZGVudGlmaWVyQ2hhcihpbnB1dC5jaGFyQ29kZUF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYyArPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VyX3BvcyA9PT0gaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIShsYXN0X3Rva2VuLnR5cGUgPT09ICdUS19ET1QnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAobGFzdF90b2tlbi50eXBlID09PSAnVEtfUkVTRVJWRUQnICYmIGluX2FycmF5KGxhc3RfdG9rZW4udGV4dCwgWydzZXQnLCAnZ2V0J10pKSlcbiAgICAgICAgICAgICAgICAgICAgJiYgaW5fYXJyYXkoYywgcmVzZXJ2ZWRfd29yZHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAnaW4nKSB7IC8vIGhhY2sgZm9yICdpbicgb3BlcmF0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX09QRVJBVE9SJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfUkVTRVJWRUQnXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19XT1JEJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnKCcgfHwgYyA9PT0gJ1snKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfU1RBUlRfRVhQUiddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJyknIHx8IGMgPT09ICddJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX0VORF9FWFBSJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAneycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19TVEFSVF9CTE9DSyddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfRU5EX0JMT0NLJ107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjID09PSAnOycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2MsICdUS19TRU1JQ09MT04nXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcvJykge1xuICAgICAgICAgICAgICAgIHZhciBjb21tZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgLy8gcGVlayBmb3IgY29tbWVudCAvKiAuLi4gKi9cbiAgICAgICAgICAgICAgICB2YXIgaW5saW5lX2NvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiAhKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJyonICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zICsgMSkgJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MgKyAxKSA9PT0gJy8nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjID09PSBcIlxcblwiIHx8IGMgPT09IFwiXFxyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5saW5lX2NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zID49IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAyO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5saW5lX2NvbW1lbnQgJiYgbl9uZXdsaW5lcyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsnLyonICsgY29tbWVudCArICcqLycsICdUS19JTkxJTkVfQ09NTUVOVCddO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFsnLyonICsgY29tbWVudCArICcqLycsICdUS19CTE9DS19DT01NRU5UJ107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gcGVlayBmb3IgY29tbWVudCAvLyAuLi5cbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9IGM7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgIT09ICdcXHInICYmIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSAhPT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPj0gaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjb21tZW50LCAnVEtfQ09NTUVOVCddO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJ2AnIHx8IGMgPT09IFwiJ1wiIHx8IGMgPT09ICdcIicgfHwgLy8gc3RyaW5nXG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAoYyA9PT0gJy8nKSB8fCAvLyByZWdleHBcbiAgICAgICAgICAgICAgICAgICAgKG9wdHMuZTR4ICYmIGMgPT09IFwiPFwiICYmIGlucHV0LnNsaWNlKHBhcnNlcl9wb3MgLSAxKS5tYXRjaCgvXjwoWy1hLXpBLVo6MC05Xy5dK3x7W157fV0qfXwhXFxbQ0RBVEFcXFtbXFxzXFxTXSo/XFxdXFxdKVxccyooWy1hLXpBLVo6MC05Xy5dKz0oJ1teJ10qJ3xcIlteXCJdKlwifHtbXnt9XSp9KVxccyopKlxcLz9cXHMqPi8pKSAvLyB4bWxcbiAgICAgICAgICAgICAgICApICYmICggLy8gcmVnZXggYW5kIHhtbCBjYW4gb25seSBhcHBlYXIgaW4gc3BlY2lmaWMgbG9jYXRpb25zIGR1cmluZyBwYXJzaW5nXG4gICAgICAgICAgICAgICAgICAgIChsYXN0X3Rva2VuLnR5cGUgPT09ICdUS19SRVNFUlZFRCcgJiYgaW5fYXJyYXkobGFzdF90b2tlbi50ZXh0ICwgWydyZXR1cm4nLCAnY2FzZScsICd0aHJvdycsICdlbHNlJywgJ2RvJywgJ3R5cGVvZicsICd5aWVsZCddKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgKGxhc3RfdG9rZW4udHlwZSA9PT0gJ1RLX0VORF9FWFBSJyAmJiBsYXN0X3Rva2VuLnRleHQgPT09ICcpJyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdF90b2tlbi5wYXJlbnQgJiYgbGFzdF90b2tlbi5wYXJlbnQudHlwZSA9PT0gJ1RLX1JFU0VSVkVEJyAmJiBpbl9hcnJheShsYXN0X3Rva2VuLnBhcmVudC50ZXh0LCBbJ2lmJywgJ3doaWxlJywgJ2ZvciddKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgKGluX2FycmF5KGxhc3RfdG9rZW4udHlwZSwgWydUS19DT01NRU5UJywgJ1RLX1NUQVJUX0VYUFInLCAnVEtfU1RBUlRfQkxPQ0snLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1RLX0VORF9CTE9DSycsICdUS19PUEVSQVRPUicsICdUS19FUVVBTFMnLCAnVEtfRU9GJywgJ1RLX1NFTUlDT0xPTicsICdUS19DT01NQSdcbiAgICAgICAgICAgICAgICAgICAgXSkpXG4gICAgICAgICAgICAgICAgKSkge1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlcCA9IGMsXG4gICAgICAgICAgICAgICAgICAgIGVzYyA9IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBoYXNfY2hhcl9lc2NhcGVzID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nID0gYztcblxuICAgICAgICAgICAgICAgIGlmIChzZXAgPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUgcmVnZXhwXG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbl9jaGFyX2NsYXNzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKChlc2MgfHwgaW5fY2hhcl9jbGFzcyB8fCBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgIT09IHNlcCkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAhYWNvcm4ubmV3bGluZS50ZXN0KGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXNjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXNjID0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnXFxcXCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSA9PT0gJ1snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluX2NoYXJfY2xhc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5fY2hhcl9jbGFzcyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXNjID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9wdHMuZTR4ICYmIHNlcCA9PT0gJzwnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBlNHggeG1sIGxpdGVyYWxzXG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIHZhciB4bWxSZWdFeHAgPSAvPChcXC8/KShbLWEtekEtWjowLTlfLl0rfHtbXnt9XSp9fCFcXFtDREFUQVxcW1tcXHNcXFNdKj9cXF1cXF0pXFxzKihbLWEtekEtWjowLTlfLl0rPSgnW14nXSonfFwiW15cIl0qXCJ8e1tee31dKn0pXFxzKikqKFxcLz8pXFxzKj4vZztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHhtbFN0ciA9IGlucHV0LnNsaWNlKHBhcnNlcl9wb3MgLSAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoID0geG1sUmVnRXhwLmV4ZWMoeG1sU3RyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoLmluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcm9vdFRhZyA9IG1hdGNoWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlcHRoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0VuZFRhZyA9ICEhIG1hdGNoWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWdOYW1lID0gbWF0Y2hbMl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzU2luZ2xldG9uVGFnID0gKCAhISBtYXRjaFttYXRjaC5sZW5ndGggLSAxXSkgfHwgKHRhZ05hbWUuc2xpY2UoMCwgOCkgPT09IFwiIVtDREFUQVtcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhZ05hbWUgPT09IHJvb3RUYWcgJiYgIWlzU2luZ2xldG9uVGFnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0VuZFRhZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS1kZXB0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICsrZGVwdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlcHRoIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoID0geG1sUmVnRXhwLmV4ZWMoeG1sU3RyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB4bWxMZW5ndGggPSBtYXRjaCA/IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoIDogeG1sU3RyLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0geG1sTGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbeG1sU3RyLnNsaWNlKDAsIHhtbExlbmd0aCksIFwiVEtfU1RSSU5HXCJdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlIHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICAvLyBUZW1wbGF0ZSBzdHJpbmdzIGNhbiB0cmF2ZXJzIGxpbmVzIHdpdGhvdXQgZXNjYXBlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgICAgIC8vIE90aGVyIHN0cmluZ3MgY2Fubm90XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGVzYyB8fCAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpICE9PSBzZXAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoc2VwID09PSAnYCcgfHwgIWFjb3JuLm5ld2xpbmUudGVzdChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykpKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nICs9IGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlc2MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAneCcgfHwgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzX2NoYXJfZXNjYXBlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVzYyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlc2MgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICdcXFxcJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGhhc19jaGFyX2VzY2FwZXMgJiYgb3B0cy51bmVzY2FwZV9zdHJpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgPSB1bmVzY2FwZV9zdHJpbmcocmVzdWx0aW5nX3N0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSBzZXApIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0aW5nX3N0cmluZyArPSBzZXA7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VwID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlZ2V4cHMgbWF5IGhhdmUgbW9kaWZpZXJzIC9yZWdleHAvTU9EICwgc28gZmV0Y2ggdGhvc2UsIHRvb1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSBbZ2ltXSBhcmUgdmFsaWQsIGJ1dCBpZiB0aGUgdXNlciBwdXRzIGluIGdhcmJhZ2UsIGRvIHdoYXQgd2UgY2FuIHRvIHRha2UgaXQuXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBhY29ybi5pc0lkZW50aWZpZXJTdGFydChpbnB1dC5jaGFyQ29kZUF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdGluZ19zdHJpbmcgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gW3Jlc3VsdGluZ19zdHJpbmcsICdUS19TVFJJTkcnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcjJykge1xuXG4gICAgICAgICAgICAgICAgaWYgKHRva2Vucy5sZW5ndGggPT09IDAgJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAnIScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2hlYmFuZ1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nID0gYztcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgYyAhPT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBpbnB1dC5jaGFyQXQocGFyc2VyX3Bvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRpbmdfc3RyaW5nICs9IGM7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt0cmltKHJlc3VsdGluZ19zdHJpbmcpICsgJ1xcbicsICdUS19VTktOT1dOJ107XG4gICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgIC8vIFNwaWRlcm1vbmtleS1zcGVjaWZpYyBzaGFycCB2YXJpYWJsZXMgZm9yIGNpcmN1bGFyIHJlZmVyZW5jZXNcbiAgICAgICAgICAgICAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9Fbi9TaGFycF92YXJpYWJsZXNfaW5fSmF2YVNjcmlwdFxuICAgICAgICAgICAgICAgIC8vIGh0dHA6Ly9teHIubW96aWxsYS5vcmcvbW96aWxsYS1jZW50cmFsL3NvdXJjZS9qcy9zcmMvanNzY2FuLmNwcCBhcm91bmQgbGluZSAxOTM1XG4gICAgICAgICAgICAgICAgdmFyIHNoYXJwID0gJyMnO1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoICYmIGRpZ2l0LnRlc3QoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpKSkge1xuICAgICAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hhcnAgKz0gYztcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlcl9wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSB3aGlsZSAocGFyc2VyX3BvcyA8IGlucHV0X2xlbmd0aCAmJiBjICE9PSAnIycgJiYgYyAhPT0gJz0nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09ICcjJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnB1dC5jaGFyQXQocGFyc2VyX3BvcykgPT09ICdbJyAmJiBpbnB1dC5jaGFyQXQocGFyc2VyX3BvcyArIDEpID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYXJwICs9ICdbXSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpID09PSAneycgJiYgaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MgKyAxKSA9PT0gJ30nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFycCArPSAne30nO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyX3BvcyArPSAyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbc2hhcnAsICdUS19XT1JEJ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJzwnICYmIGlucHV0LnN1YnN0cmluZyhwYXJzZXJfcG9zIC0gMSwgcGFyc2VyX3BvcyArIDMpID09PSAnPCEtLScpIHtcbiAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDM7XG4gICAgICAgICAgICAgICAgYyA9ICc8IS0tJztcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpICE9PSAnXFxuJyAmJiBwYXJzZXJfcG9zIDwgaW5wdXRfbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluX2h0bWxfY29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfQ09NTUVOVCddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYyA9PT0gJy0nICYmIGluX2h0bWxfY29tbWVudCAmJiBpbnB1dC5zdWJzdHJpbmcocGFyc2VyX3BvcyAtIDEsIHBhcnNlcl9wb3MgKyAyKSA9PT0gJy0tPicpIHtcbiAgICAgICAgICAgICAgICBpbl9odG1sX2NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnLS0+JywgJ1RLX0NPTU1FTlQnXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGMgPT09ICcuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX0RPVCddO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaW5fYXJyYXkoYywgcHVuY3QpKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHBhcnNlcl9wb3MgPCBpbnB1dF9sZW5ndGggJiYgaW5fYXJyYXkoYyArIGlucHV0LmNoYXJBdChwYXJzZXJfcG9zKSwgcHVuY3QpKSB7XG4gICAgICAgICAgICAgICAgICAgIGMgKz0gaW5wdXQuY2hhckF0KHBhcnNlcl9wb3MpO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXJfcG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZXJfcG9zID49IGlucHV0X2xlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJywnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX0NPTU1BJ107XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfRVFVQUxTJ107XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtjLCAnVEtfT1BFUkFUT1InXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBbYywgJ1RLX1VOS05PV04nXTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gdW5lc2NhcGVfc3RyaW5nKHMpIHtcbiAgICAgICAgICAgIHZhciBlc2MgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBvdXQgPSAnJyxcbiAgICAgICAgICAgICAgICBwb3MgPSAwLFxuICAgICAgICAgICAgICAgIHNfaGV4ID0gJycsXG4gICAgICAgICAgICAgICAgZXNjYXBlZCA9IDAsXG4gICAgICAgICAgICAgICAgYztcblxuICAgICAgICAgICAgd2hpbGUgKGVzYyB8fCBwb3MgPCBzLmxlbmd0aCkge1xuXG4gICAgICAgICAgICAgICAgYyA9IHMuY2hhckF0KHBvcyk7XG4gICAgICAgICAgICAgICAgcG9zKys7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXNjKSB7XG4gICAgICAgICAgICAgICAgICAgIGVzYyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ3gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW1wbGUgaGV4LWVzY2FwZSBcXHgyNFxuICAgICAgICAgICAgICAgICAgICAgICAgc19oZXggPSBzLnN1YnN0cihwb3MsIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1bmljb2RlLWVzY2FwZSwgXFx1MjEzNFxuICAgICAgICAgICAgICAgICAgICAgICAgc19oZXggPSBzLnN1YnN0cihwb3MsIDQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zICs9IDQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzb21lIGNvbW1vbiBlc2NhcGUsIGUuZyBcXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCArPSAnXFxcXCcgKyBjO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzX2hleC5tYXRjaCgvXlswMTIzNDU2Nzg5YWJjZGVmQUJDREVGXSskLykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNvbWUgd2VpcmQgZXNjYXBpbmcsIGJhaWwgb3V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGVhdmluZyB3aG9sZSBzdHJpbmcgaW50YWN0XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGVzY2FwZWQgPSBwYXJzZUludChzX2hleCwgMTYpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlc2NhcGVkID49IDB4MDAgJiYgZXNjYXBlZCA8IDB4MjApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxlYXZlIDB4MDAuLi4weDFmIGVzY2FwZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAneCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcXFx4JyArIHNfaGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcXFx1JyArIHNfaGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXNjYXBlZCA9PT0gMHgyMiB8fCBlc2NhcGVkID09PSAweDI3IHx8IGVzY2FwZWQgPT09IDB4NWMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZS1xdW90ZSwgYXBvc3Ryb3BoZSwgYmFja3NsYXNoIC0gZXNjYXBlIHRoZXNlXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gJ1xcXFwnICsgU3RyaW5nLmZyb21DaGFyQ29kZShlc2NhcGVkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjID09PSAneCcgJiYgZXNjYXBlZCA+IDB4N2UgJiYgZXNjYXBlZCA8PSAweGZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBiYWlsIG91dCBvbiBcXHg3Zi4uXFx4ZmYsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZWF2aW5nIHdob2xlIHN0cmluZyBlc2NhcGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgaXQncyBwcm9iYWJseSBjb21wbGV0ZWx5IGJpbmFyeVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShlc2NhcGVkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVzYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IGM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgfVxuXG4gICAgfVxuXG5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQWRkIHN1cHBvcnQgZm9yIEFNRCAoIGh0dHBzOi8vZ2l0aHViLmNvbS9hbWRqcy9hbWRqcy1hcGkvd2lraS9BTUQjZGVmaW5lYW1kLXByb3BlcnR5LSApXG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4geyBqc19iZWF1dGlmeToganNfYmVhdXRpZnkgfTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAvLyBBZGQgc3VwcG9ydCBmb3IgQ29tbW9uSlMuIEp1c3QgcHV0IHRoaXMgZmlsZSBzb21ld2hlcmUgb24geW91ciByZXF1aXJlLnBhdGhzXG4gICAgICAgIC8vIGFuZCB5b3Ugd2lsbCBiZSBhYmxlIHRvIGB2YXIganNfYmVhdXRpZnkgPSByZXF1aXJlKFwiYmVhdXRpZnlcIikuanNfYmVhdXRpZnlgLlxuICAgICAgICBleHBvcnRzLmpzX2JlYXV0aWZ5ID0ganNfYmVhdXRpZnk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIElmIHdlJ3JlIHJ1bm5pbmcgYSB3ZWIgcGFnZSBhbmQgZG9uJ3QgaGF2ZSBlaXRoZXIgb2YgdGhlIGFib3ZlLCBhZGQgb3VyIG9uZSBnbG9iYWxcbiAgICAgICAgd2luZG93LmpzX2JlYXV0aWZ5ID0ganNfYmVhdXRpZnk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIC8vIElmIHdlIGRvbid0IGV2ZW4gaGF2ZSB3aW5kb3csIHRyeSBnbG9iYWwuXG4gICAgICAgIGdsb2JhbC5qc19iZWF1dGlmeSA9IGpzX2JlYXV0aWZ5O1xuICAgIH1cblxufSgpKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cy5wcmV0dHkgPSBmdW5jdGlvbiAoanNPYmplY3QsIGluZGVudExlbmd0aCwgb3V0cHV0VG8sIGZ1bGxGdW5jdGlvbikge1xuICAgIHZhciBpbmRlbnRTdHJpbmcsXG4gICAgICAgIG5ld0xpbmUsXG4gICAgICAgIG5ld0xpbmVKb2luLFxuICAgICAgICBUT1NUUklORyxcbiAgICAgICAgVFlQRVMsXG4gICAgICAgIHZhbHVlVHlwZSxcbiAgICAgICAgcmVwZWF0U3RyaW5nLFxuICAgICAgICBwcmV0dHlPYmplY3QsXG4gICAgICAgIHByZXR0eU9iamVjdEpTT04sXG4gICAgICAgIHByZXR0eU9iamVjdFByaW50LFxuICAgICAgICBwcmV0dHlBcnJheSxcbiAgICAgICAgZnVuY3Rpb25TaWduYXR1cmUsXG4gICAgICAgIHByZXR0eSxcbiAgICAgICAgdmlzaXRlZDtcblxuICAgIFRPU1RSSU5HID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuICAgIFRZUEVTID0ge1xuICAgICAgICAndW5kZWZpbmVkJyAgICAgICAgOiAndW5kZWZpbmVkJyxcbiAgICAgICAgJ251bWJlcicgICAgICAgICAgIDogJ251bWJlcicsXG4gICAgICAgICdib29sZWFuJyAgICAgICAgICA6ICdib29sZWFuJyxcbiAgICAgICAgJ3N0cmluZycgICAgICAgICAgIDogJ3N0cmluZycsXG4gICAgICAgICdbb2JqZWN0IEZ1bmN0aW9uXSc6ICdmdW5jdGlvbicsXG4gICAgICAgICdbb2JqZWN0IFJlZ0V4cF0nICA6ICdyZWdleHAnLFxuICAgICAgICAnW29iamVjdCBBcnJheV0nICAgOiAnYXJyYXknLFxuICAgICAgICAnW29iamVjdCBEYXRlXScgICAgOiAnZGF0ZScsXG4gICAgICAgICdbb2JqZWN0IEVycm9yXScgICA6ICdlcnJvcidcbiAgICB9O1xuXG4gICAgdmFsdWVUeXBlID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgdmFyIHR5cGUgPSBUWVBFU1t0eXBlb2Ygb10gfHwgVFlQRVNbVE9TVFJJTkcuY2FsbChvKV0gfHwgKG8gPyAnb2JqZWN0JyA6ICdudWxsJyk7XG4gICAgICAgIHJldHVybiB0eXBlO1xuICAgIH07XG5cbiAgICByZXBlYXRTdHJpbmcgPSBmdW5jdGlvbiAoc3JjLCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGRzdCA9ICcnLFxuICAgICAgICAgICAgaW5kZXg7XG4gICAgICAgIGZvciAoaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgICAgICAgICAgZHN0ICs9IHNyYztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkc3Q7XG4gICAgfTtcblxuICAgIHByZXR0eU9iamVjdEpTT04gPSBmdW5jdGlvbiAob2JqZWN0LCBpbmRlbnQpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gW10sXG4gICAgICAgICAgICBwcm9wZXJ0eTtcblxuICAgICAgICBpbmRlbnQgKz0gaW5kZW50U3RyaW5nO1xuICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZS5wdXNoKGluZGVudCArICdcIicgKyBwcm9wZXJ0eSArICdcIjogJyArIHByZXR0eShvYmplY3RbcHJvcGVydHldLCBpbmRlbnQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZS5qb2luKG5ld0xpbmVKb2luKSArIG5ld0xpbmU7XG4gICAgfTtcblxuICAgIHByZXR0eU9iamVjdFByaW50ID0gZnVuY3Rpb24gKG9iamVjdCwgaW5kZW50KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IFtdLFxuICAgICAgICAgICAgcHJvcGVydHk7XG5cbiAgICAgICAgaW5kZW50ICs9IGluZGVudFN0cmluZztcbiAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUucHVzaChpbmRlbnQgKyBwcm9wZXJ0eSArICc6ICcgKyBwcmV0dHkob2JqZWN0W3Byb3BlcnR5XSwgaW5kZW50KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWUuam9pbihuZXdMaW5lSm9pbikgKyBuZXdMaW5lO1xuICAgIH07XG5cbiAgICBwcmV0dHlBcnJheSA9IGZ1bmN0aW9uIChhcnJheSwgaW5kZW50KSB7XG4gICAgICAgIHZhciBpbmRleCxcbiAgICAgICAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCxcbiAgICAgICAgICAgIHZhbHVlID0gW107XG5cbiAgICAgICAgaW5kZW50ICs9IGluZGVudFN0cmluZztcbiAgICAgICAgZm9yIChpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgICAgICAgICB2YWx1ZS5wdXNoKHByZXR0eShhcnJheVtpbmRleF0sIGluZGVudCwgaW5kZW50KSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWUuam9pbihuZXdMaW5lSm9pbikgKyBuZXdMaW5lO1xuICAgIH07XG5cbiAgICBmdW5jdGlvblNpZ25hdHVyZSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBzaWduYXR1cmVFeHByZXNzaW9uLFxuICAgICAgICAgICAgc2lnbmF0dXJlO1xuXG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LnRvU3RyaW5nKCk7XG4gICAgICAgIHNpZ25hdHVyZUV4cHJlc3Npb24gPSBuZXcgUmVnRXhwKCdmdW5jdGlvblxcXFxzKi4qXFxcXHMqXFxcXCguKlxcXFwpJyk7XG4gICAgICAgIHNpZ25hdHVyZSA9IHNpZ25hdHVyZUV4cHJlc3Npb24uZXhlYyhlbGVtZW50KTtcbiAgICAgICAgc2lnbmF0dXJlID0gc2lnbmF0dXJlID8gc2lnbmF0dXJlWzBdIDogJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgICAgICAgcmV0dXJuIGZ1bGxGdW5jdGlvbiA/IGVsZW1lbnQgOiAnXCInICsgc2lnbmF0dXJlICsgJ1wiJztcbiAgICB9O1xuXG4gICAgcHJldHR5ID0gZnVuY3Rpb24gKGVsZW1lbnQsIGluZGVudCwgZnJvbUFycmF5KSB7XG4gICAgICAgIHZhciB0eXBlO1xuXG4gICAgICAgIHR5cGUgPSB2YWx1ZVR5cGUoZWxlbWVudCk7XG4gICAgICAgIGZyb21BcnJheSA9IGZyb21BcnJheSB8fCAnJztcbiAgICAgICAgaWYgKHZpc2l0ZWQuaW5kZXhPZihlbGVtZW50KSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnYXJyYXknOlxuICAgICAgICAgICAgICAgIHZpc2l0ZWQucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbUFycmF5ICsgJ1snICsgbmV3TGluZSArIHByZXR0eUFycmF5KGVsZW1lbnQsIGluZGVudCkgKyBpbmRlbnQgKyAnXSc7XG5cbiAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgIHJldHVybiBmcm9tQXJyYXkgKyAoZWxlbWVudCA/ICd0cnVlJyA6ICdmYWxzZScpO1xuXG4gICAgICAgICAgICBjYXNlICdkYXRlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbUFycmF5ICsgJ1wiJyArIGVsZW1lbnQudG9TdHJpbmcoKSArICdcIic7XG5cbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb21BcnJheSArIGVsZW1lbnQ7XG5cbiAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgdmlzaXRlZC5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmcm9tQXJyYXkgKyAneycgKyBuZXdMaW5lICsgcHJldHR5T2JqZWN0KGVsZW1lbnQsIGluZGVudCkgKyBpbmRlbnQgKyAnfSc7XG5cbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb21BcnJheSArICdcIicgKyBlbGVtZW50ICsgJ1wiJztcblxuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBmcm9tQXJyYXkgKyBmdW5jdGlvblNpZ25hdHVyZShlbGVtZW50KTtcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZnJvbUFycmF5ICsgKChlbGVtZW50ICE9PSB1bmRlZmluZWQpPyBlbGVtZW50LnRvU3RyaW5nKCkgOiAndW5kZWZpbmVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyb21BcnJheSArICdjaXJjdWxhciByZWZlcmVuY2UgdG8gJyArIGVsZW1lbnQudG9TdHJpbmcoKTtcbiAgICB9O1xuXG4gICAgaWYgKGpzT2JqZWN0KSB7XG4gICAgICAgIGlmIChpbmRlbnRMZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaW5kZW50TGVuZ3RoID0gNDtcbiAgICAgICAgfVxuXG4gICAgICAgIG91dHB1dFRvID0gKG91dHB1dFRvIHx8ICdwcmludCcpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGluZGVudFN0cmluZyA9IHJlcGVhdFN0cmluZyhvdXRwdXRUbyA9PT0gJ2h0bWwnID8gJyZuYnNwOycgOiAnICcsIGluZGVudExlbmd0aCk7XG4gICAgICAgIHByZXR0eU9iamVjdCA9IG91dHB1dFRvID09PSAnanNvbicgPyBwcmV0dHlPYmplY3RKU09OIDogcHJldHR5T2JqZWN0UHJpbnQ7XG4gICAgICAgIG5ld0xpbmUgPSBvdXRwdXRUbyA9PT0gJ2h0bWwnID8gJzxici8+JyA6ICdcXG4nO1xuICAgICAgICBuZXdMaW5lSm9pbiA9ICcsJyArIG5ld0xpbmU7XG4gICAgICAgIHZpc2l0ZWQgPSBbXTtcbiAgICAgICAgcmV0dXJuIHByZXR0eShqc09iamVjdCwgJycpICsgbmV3TGluZTtcbiAgICB9XG5cbiAgICByZXR1cm4gJ0Vycm9yOiBubyBKYXZhc2NyaXB0IG9iamVjdCBwcm92aWRlZCc7XG59O1xuIiwiLy8gd3JhcHBlciBmb3Igbm9uLW5vZGUgZW52c1xuOyhmdW5jdGlvbiAoc2F4KSB7XG5cbnNheC5wYXJzZXIgPSBmdW5jdGlvbiAoc3RyaWN0LCBvcHQpIHsgcmV0dXJuIG5ldyBTQVhQYXJzZXIoc3RyaWN0LCBvcHQpIH1cbnNheC5TQVhQYXJzZXIgPSBTQVhQYXJzZXJcbnNheC5TQVhTdHJlYW0gPSBTQVhTdHJlYW1cbnNheC5jcmVhdGVTdHJlYW0gPSBjcmVhdGVTdHJlYW1cblxuLy8gV2hlbiB3ZSBwYXNzIHRoZSBNQVhfQlVGRkVSX0xFTkdUSCBwb3NpdGlvbiwgc3RhcnQgY2hlY2tpbmcgZm9yIGJ1ZmZlciBvdmVycnVucy5cbi8vIFdoZW4gd2UgY2hlY2ssIHNjaGVkdWxlIHRoZSBuZXh0IGNoZWNrIGZvciBNQVhfQlVGRkVSX0xFTkdUSCAtIChtYXgoYnVmZmVyIGxlbmd0aHMpKSxcbi8vIHNpbmNlIHRoYXQncyB0aGUgZWFybGllc3QgdGhhdCBhIGJ1ZmZlciBvdmVycnVuIGNvdWxkIG9jY3VyLiAgVGhpcyB3YXksIGNoZWNrcyBhcmVcbi8vIGFzIHJhcmUgYXMgcmVxdWlyZWQsIGJ1dCBhcyBvZnRlbiBhcyBuZWNlc3NhcnkgdG8gZW5zdXJlIG5ldmVyIGNyb3NzaW5nIHRoaXMgYm91bmQuXG4vLyBGdXJ0aGVybW9yZSwgYnVmZmVycyBhcmUgb25seSB0ZXN0ZWQgYXQgbW9zdCBvbmNlIHBlciB3cml0ZSgpLCBzbyBwYXNzaW5nIGEgdmVyeVxuLy8gbGFyZ2Ugc3RyaW5nIGludG8gd3JpdGUoKSBtaWdodCBoYXZlIHVuZGVzaXJhYmxlIGVmZmVjdHMsIGJ1dCB0aGlzIGlzIG1hbmFnZWFibGUgYnlcbi8vIHRoZSBjYWxsZXIsIHNvIGl0IGlzIGFzc3VtZWQgdG8gYmUgc2FmZS4gIFRodXMsIGEgY2FsbCB0byB3cml0ZSgpIG1heSwgaW4gdGhlIGV4dHJlbWVcbi8vIGVkZ2UgY2FzZSwgcmVzdWx0IGluIGNyZWF0aW5nIGF0IG1vc3Qgb25lIGNvbXBsZXRlIGNvcHkgb2YgdGhlIHN0cmluZyBwYXNzZWQgaW4uXG4vLyBTZXQgdG8gSW5maW5pdHkgdG8gaGF2ZSB1bmxpbWl0ZWQgYnVmZmVycy5cbnNheC5NQVhfQlVGRkVSX0xFTkdUSCA9IDY0ICogMTAyNFxuXG52YXIgYnVmZmVycyA9IFtcbiAgXCJjb21tZW50XCIsIFwic2dtbERlY2xcIiwgXCJ0ZXh0Tm9kZVwiLCBcInRhZ05hbWVcIiwgXCJkb2N0eXBlXCIsXG4gIFwicHJvY0luc3ROYW1lXCIsIFwicHJvY0luc3RCb2R5XCIsIFwiZW50aXR5XCIsIFwiYXR0cmliTmFtZVwiLFxuICBcImF0dHJpYlZhbHVlXCIsIFwiY2RhdGFcIiwgXCJzY3JpcHRcIlxuXVxuXG5zYXguRVZFTlRTID0gLy8gZm9yIGRpc2NvdmVyYWJpbGl0eS5cbiAgWyBcInRleHRcIlxuICAsIFwicHJvY2Vzc2luZ2luc3RydWN0aW9uXCJcbiAgLCBcInNnbWxkZWNsYXJhdGlvblwiXG4gICwgXCJkb2N0eXBlXCJcbiAgLCBcImNvbW1lbnRcIlxuICAsIFwiYXR0cmlidXRlXCJcbiAgLCBcIm9wZW50YWdcIlxuICAsIFwiY2xvc2V0YWdcIlxuICAsIFwib3BlbmNkYXRhXCJcbiAgLCBcImNkYXRhXCJcbiAgLCBcImNsb3NlY2RhdGFcIlxuICAsIFwiZXJyb3JcIlxuICAsIFwiZW5kXCJcbiAgLCBcInJlYWR5XCJcbiAgLCBcInNjcmlwdFwiXG4gICwgXCJvcGVubmFtZXNwYWNlXCJcbiAgLCBcImNsb3NlbmFtZXNwYWNlXCJcbiAgXVxuXG5mdW5jdGlvbiBTQVhQYXJzZXIgKHN0cmljdCwgb3B0KSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTQVhQYXJzZXIpKSByZXR1cm4gbmV3IFNBWFBhcnNlcihzdHJpY3QsIG9wdClcblxuICB2YXIgcGFyc2VyID0gdGhpc1xuICBjbGVhckJ1ZmZlcnMocGFyc2VyKVxuICBwYXJzZXIucSA9IHBhcnNlci5jID0gXCJcIlxuICBwYXJzZXIuYnVmZmVyQ2hlY2tQb3NpdGlvbiA9IHNheC5NQVhfQlVGRkVSX0xFTkdUSFxuICBwYXJzZXIub3B0ID0gb3B0IHx8IHt9XG4gIHBhcnNlci5vcHQubG93ZXJjYXNlID0gcGFyc2VyLm9wdC5sb3dlcmNhc2UgfHwgcGFyc2VyLm9wdC5sb3dlcmNhc2V0YWdzXG4gIHBhcnNlci5sb29zZUNhc2UgPSBwYXJzZXIub3B0Lmxvd2VyY2FzZSA/IFwidG9Mb3dlckNhc2VcIiA6IFwidG9VcHBlckNhc2VcIlxuICBwYXJzZXIudGFncyA9IFtdXG4gIHBhcnNlci5jbG9zZWQgPSBwYXJzZXIuY2xvc2VkUm9vdCA9IHBhcnNlci5zYXdSb290ID0gZmFsc2VcbiAgcGFyc2VyLnRhZyA9IHBhcnNlci5lcnJvciA9IG51bGxcbiAgcGFyc2VyLnN0cmljdCA9ICEhc3RyaWN0XG4gIHBhcnNlci5ub3NjcmlwdCA9ICEhKHN0cmljdCB8fCBwYXJzZXIub3B0Lm5vc2NyaXB0KVxuICBwYXJzZXIuc3RhdGUgPSBTLkJFR0lOXG4gIHBhcnNlci5FTlRJVElFUyA9IE9iamVjdC5jcmVhdGUoc2F4LkVOVElUSUVTKVxuICBwYXJzZXIuYXR0cmliTGlzdCA9IFtdXG5cbiAgLy8gbmFtZXNwYWNlcyBmb3JtIGEgcHJvdG90eXBlIGNoYWluLlxuICAvLyBpdCBhbHdheXMgcG9pbnRzIGF0IHRoZSBjdXJyZW50IHRhZyxcbiAgLy8gd2hpY2ggcHJvdG9zIHRvIGl0cyBwYXJlbnQgdGFnLlxuICBpZiAocGFyc2VyLm9wdC54bWxucykgcGFyc2VyLm5zID0gT2JqZWN0LmNyZWF0ZShyb290TlMpXG5cbiAgLy8gbW9zdGx5IGp1c3QgZm9yIGVycm9yIHJlcG9ydGluZ1xuICBwYXJzZXIudHJhY2tQb3NpdGlvbiA9IHBhcnNlci5vcHQucG9zaXRpb24gIT09IGZhbHNlXG4gIGlmIChwYXJzZXIudHJhY2tQb3NpdGlvbikge1xuICAgIHBhcnNlci5wb3NpdGlvbiA9IHBhcnNlci5saW5lID0gcGFyc2VyLmNvbHVtbiA9IDBcbiAgfVxuICBlbWl0KHBhcnNlciwgXCJvbnJlYWR5XCIpXG59XG5cbmlmICghT2JqZWN0LmNyZWF0ZSkgT2JqZWN0LmNyZWF0ZSA9IGZ1bmN0aW9uIChvKSB7XG4gIGZ1bmN0aW9uIGYgKCkgeyB0aGlzLl9fcHJvdG9fXyA9IG8gfVxuICBmLnByb3RvdHlwZSA9IG9cbiAgcmV0dXJuIG5ldyBmXG59XG5cbmlmICghT2JqZWN0LmdldFByb3RvdHlwZU9mKSBPYmplY3QuZ2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbiAobykge1xuICByZXR1cm4gby5fX3Byb3RvX19cbn1cblxuaWYgKCFPYmplY3Qua2V5cykgT2JqZWN0LmtleXMgPSBmdW5jdGlvbiAobykge1xuICB2YXIgYSA9IFtdXG4gIGZvciAodmFyIGkgaW4gbykgaWYgKG8uaGFzT3duUHJvcGVydHkoaSkpIGEucHVzaChpKVxuICByZXR1cm4gYVxufVxuXG5mdW5jdGlvbiBjaGVja0J1ZmZlckxlbmd0aCAocGFyc2VyKSB7XG4gIHZhciBtYXhBbGxvd2VkID0gTWF0aC5tYXgoc2F4Lk1BWF9CVUZGRVJfTEVOR1RILCAxMClcbiAgICAsIG1heEFjdHVhbCA9IDBcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBidWZmZXJzLmxlbmd0aDsgaSA8IGw7IGkgKyspIHtcbiAgICB2YXIgbGVuID0gcGFyc2VyW2J1ZmZlcnNbaV1dLmxlbmd0aFxuICAgIGlmIChsZW4gPiBtYXhBbGxvd2VkKSB7XG4gICAgICAvLyBUZXh0L2NkYXRhIG5vZGVzIGNhbiBnZXQgYmlnLCBhbmQgc2luY2UgdGhleSdyZSBidWZmZXJlZCxcbiAgICAgIC8vIHdlIGNhbiBnZXQgaGVyZSB1bmRlciBub3JtYWwgY29uZGl0aW9ucy5cbiAgICAgIC8vIEF2b2lkIGlzc3VlcyBieSBlbWl0dGluZyB0aGUgdGV4dCBub2RlIG5vdyxcbiAgICAgIC8vIHNvIGF0IGxlYXN0IGl0IHdvbid0IGdldCBhbnkgYmlnZ2VyLlxuICAgICAgc3dpdGNoIChidWZmZXJzW2ldKSB7XG4gICAgICAgIGNhc2UgXCJ0ZXh0Tm9kZVwiOlxuICAgICAgICAgIGNsb3NlVGV4dChwYXJzZXIpXG4gICAgICAgIGJyZWFrXG5cbiAgICAgICAgY2FzZSBcImNkYXRhXCI6XG4gICAgICAgICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uY2RhdGFcIiwgcGFyc2VyLmNkYXRhKVxuICAgICAgICAgIHBhcnNlci5jZGF0YSA9IFwiXCJcbiAgICAgICAgYnJlYWtcblxuICAgICAgICBjYXNlIFwic2NyaXB0XCI6XG4gICAgICAgICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uc2NyaXB0XCIsIHBhcnNlci5zY3JpcHQpXG4gICAgICAgICAgcGFyc2VyLnNjcmlwdCA9IFwiXCJcbiAgICAgICAgYnJlYWtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGVycm9yKHBhcnNlciwgXCJNYXggYnVmZmVyIGxlbmd0aCBleGNlZWRlZDogXCIrYnVmZmVyc1tpXSlcbiAgICAgIH1cbiAgICB9XG4gICAgbWF4QWN0dWFsID0gTWF0aC5tYXgobWF4QWN0dWFsLCBsZW4pXG4gIH1cbiAgLy8gc2NoZWR1bGUgdGhlIG5leHQgY2hlY2sgZm9yIHRoZSBlYXJsaWVzdCBwb3NzaWJsZSBidWZmZXIgb3ZlcnJ1bi5cbiAgcGFyc2VyLmJ1ZmZlckNoZWNrUG9zaXRpb24gPSAoc2F4Lk1BWF9CVUZGRVJfTEVOR1RIIC0gbWF4QWN0dWFsKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICArIHBhcnNlci5wb3NpdGlvblxufVxuXG5mdW5jdGlvbiBjbGVhckJ1ZmZlcnMgKHBhcnNlcikge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGJ1ZmZlcnMubGVuZ3RoOyBpIDwgbDsgaSArKykge1xuICAgIHBhcnNlcltidWZmZXJzW2ldXSA9IFwiXCJcbiAgfVxufVxuXG5mdW5jdGlvbiBmbHVzaEJ1ZmZlcnMgKHBhcnNlcikge1xuICBjbG9zZVRleHQocGFyc2VyKVxuICBpZiAocGFyc2VyLmNkYXRhICE9PSBcIlwiKSB7XG4gICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uY2RhdGFcIiwgcGFyc2VyLmNkYXRhKVxuICAgIHBhcnNlci5jZGF0YSA9IFwiXCJcbiAgfVxuICBpZiAocGFyc2VyLnNjcmlwdCAhPT0gXCJcIikge1xuICAgIGVtaXROb2RlKHBhcnNlciwgXCJvbnNjcmlwdFwiLCBwYXJzZXIuc2NyaXB0KVxuICAgIHBhcnNlci5zY3JpcHQgPSBcIlwiXG4gIH1cbn1cblxuU0FYUGFyc2VyLnByb3RvdHlwZSA9XG4gIHsgZW5kOiBmdW5jdGlvbiAoKSB7IGVuZCh0aGlzKSB9XG4gICwgd3JpdGU6IHdyaXRlXG4gICwgcmVzdW1lOiBmdW5jdGlvbiAoKSB7IHRoaXMuZXJyb3IgPSBudWxsOyByZXR1cm4gdGhpcyB9XG4gICwgY2xvc2U6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMud3JpdGUobnVsbCkgfVxuICAsIGZsdXNoOiBmdW5jdGlvbiAoKSB7IGZsdXNoQnVmZmVycyh0aGlzKSB9XG4gIH1cblxudHJ5IHtcbiAgdmFyIFN0cmVhbSA9IHJlcXVpcmUoXCJzdHJlYW1cIikuU3RyZWFtXG59IGNhdGNoIChleCkge1xuICB2YXIgU3RyZWFtID0gZnVuY3Rpb24gKCkge31cbn1cblxuXG52YXIgc3RyZWFtV3JhcHMgPSBzYXguRVZFTlRTLmZpbHRlcihmdW5jdGlvbiAoZXYpIHtcbiAgcmV0dXJuIGV2ICE9PSBcImVycm9yXCIgJiYgZXYgIT09IFwiZW5kXCJcbn0pXG5cbmZ1bmN0aW9uIGNyZWF0ZVN0cmVhbSAoc3RyaWN0LCBvcHQpIHtcbiAgcmV0dXJuIG5ldyBTQVhTdHJlYW0oc3RyaWN0LCBvcHQpXG59XG5cbmZ1bmN0aW9uIFNBWFN0cmVhbSAoc3RyaWN0LCBvcHQpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNBWFN0cmVhbSkpIHJldHVybiBuZXcgU0FYU3RyZWFtKHN0cmljdCwgb3B0KVxuXG4gIFN0cmVhbS5hcHBseSh0aGlzKVxuXG4gIHRoaXMuX3BhcnNlciA9IG5ldyBTQVhQYXJzZXIoc3RyaWN0LCBvcHQpXG4gIHRoaXMud3JpdGFibGUgPSB0cnVlXG4gIHRoaXMucmVhZGFibGUgPSB0cnVlXG5cblxuICB2YXIgbWUgPSB0aGlzXG5cbiAgdGhpcy5fcGFyc2VyLm9uZW5kID0gZnVuY3Rpb24gKCkge1xuICAgIG1lLmVtaXQoXCJlbmRcIilcbiAgfVxuXG4gIHRoaXMuX3BhcnNlci5vbmVycm9yID0gZnVuY3Rpb24gKGVyKSB7XG4gICAgbWUuZW1pdChcImVycm9yXCIsIGVyKVxuXG4gICAgLy8gaWYgZGlkbid0IHRocm93LCB0aGVuIG1lYW5zIGVycm9yIHdhcyBoYW5kbGVkLlxuICAgIC8vIGdvIGFoZWFkIGFuZCBjbGVhciBlcnJvciwgc28gd2UgY2FuIHdyaXRlIGFnYWluLlxuICAgIG1lLl9wYXJzZXIuZXJyb3IgPSBudWxsXG4gIH1cblxuICB0aGlzLl9kZWNvZGVyID0gbnVsbDtcblxuICBzdHJlYW1XcmFwcy5mb3JFYWNoKGZ1bmN0aW9uIChldikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtZSwgXCJvblwiICsgZXYsIHtcbiAgICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWUuX3BhcnNlcltcIm9uXCIgKyBldl0gfSxcbiAgICAgIHNldDogZnVuY3Rpb24gKGgpIHtcbiAgICAgICAgaWYgKCFoKSB7XG4gICAgICAgICAgbWUucmVtb3ZlQWxsTGlzdGVuZXJzKGV2KVxuICAgICAgICAgIHJldHVybiBtZS5fcGFyc2VyW1wib25cIitldl0gPSBoXG4gICAgICAgIH1cbiAgICAgICAgbWUub24oZXYsIGgpXG4gICAgICB9LFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICB9KVxuICB9KVxufVxuXG5TQVhTdHJlYW0ucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdHJlYW0ucHJvdG90eXBlLFxuICB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBTQVhTdHJlYW0gfSB9KVxuXG5TQVhTdHJlYW0ucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgaWYgKHR5cGVvZiBCdWZmZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgIHR5cGVvZiBCdWZmZXIuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgIEJ1ZmZlci5pc0J1ZmZlcihkYXRhKSkge1xuICAgIGlmICghdGhpcy5fZGVjb2Rlcikge1xuICAgICAgdmFyIFNEID0gcmVxdWlyZSgnc3RyaW5nX2RlY29kZXInKS5TdHJpbmdEZWNvZGVyXG4gICAgICB0aGlzLl9kZWNvZGVyID0gbmV3IFNEKCd1dGY4JylcbiAgICB9XG4gICAgZGF0YSA9IHRoaXMuX2RlY29kZXIud3JpdGUoZGF0YSk7XG4gIH1cblxuICB0aGlzLl9wYXJzZXIud3JpdGUoZGF0YS50b1N0cmluZygpKVxuICB0aGlzLmVtaXQoXCJkYXRhXCIsIGRhdGEpXG4gIHJldHVybiB0cnVlXG59XG5cblNBWFN0cmVhbS5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKGNodW5rKSB7XG4gIGlmIChjaHVuayAmJiBjaHVuay5sZW5ndGgpIHRoaXMud3JpdGUoY2h1bmspXG4gIHRoaXMuX3BhcnNlci5lbmQoKVxuICByZXR1cm4gdHJ1ZVxufVxuXG5TQVhTdHJlYW0ucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKGV2LCBoYW5kbGVyKSB7XG4gIHZhciBtZSA9IHRoaXNcbiAgaWYgKCFtZS5fcGFyc2VyW1wib25cIitldl0gJiYgc3RyZWFtV3JhcHMuaW5kZXhPZihldikgIT09IC0xKSB7XG4gICAgbWUuX3BhcnNlcltcIm9uXCIrZXZdID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gW2FyZ3VtZW50c1swXV1cbiAgICAgICAgICAgICAgIDogQXJyYXkuYXBwbHkobnVsbCwgYXJndW1lbnRzKVxuICAgICAgYXJncy5zcGxpY2UoMCwgMCwgZXYpXG4gICAgICBtZS5lbWl0LmFwcGx5KG1lLCBhcmdzKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBTdHJlYW0ucHJvdG90eXBlLm9uLmNhbGwobWUsIGV2LCBoYW5kbGVyKVxufVxuXG5cblxuLy8gY2hhcmFjdGVyIGNsYXNzZXMgYW5kIHRva2Vuc1xudmFyIHdoaXRlc3BhY2UgPSBcIlxcclxcblxcdCBcIlxuICAvLyB0aGlzIHJlYWxseSBuZWVkcyB0byBiZSByZXBsYWNlZCB3aXRoIGNoYXJhY3RlciBjbGFzc2VzLlxuICAvLyBYTUwgYWxsb3dzIGFsbCBtYW5uZXIgb2YgcmlkaWN1bG91cyBudW1iZXJzIGFuZCBkaWdpdHMuXG4gICwgbnVtYmVyID0gXCIwMTI0MzU2Nzg5XCJcbiAgLCBsZXR0ZXIgPSBcImFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpcIlxuICAvLyAoTGV0dGVyIHwgXCJfXCIgfCBcIjpcIilcbiAgLCBxdW90ZSA9IFwiJ1xcXCJcIlxuICAsIGVudGl0eSA9IG51bWJlcitsZXR0ZXIrXCIjXCJcbiAgLCBhdHRyaWJFbmQgPSB3aGl0ZXNwYWNlICsgXCI+XCJcbiAgLCBDREFUQSA9IFwiW0NEQVRBW1wiXG4gICwgRE9DVFlQRSA9IFwiRE9DVFlQRVwiXG4gICwgWE1MX05BTUVTUEFDRSA9IFwiaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlXCJcbiAgLCBYTUxOU19OQU1FU1BBQ0UgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAveG1sbnMvXCJcbiAgLCByb290TlMgPSB7IHhtbDogWE1MX05BTUVTUEFDRSwgeG1sbnM6IFhNTE5TX05BTUVTUEFDRSB9XG5cbi8vIHR1cm4gYWxsIHRoZSBzdHJpbmcgY2hhcmFjdGVyIHNldHMgaW50byBjaGFyYWN0ZXIgY2xhc3Mgb2JqZWN0cy5cbndoaXRlc3BhY2UgPSBjaGFyQ2xhc3Mod2hpdGVzcGFjZSlcbm51bWJlciA9IGNoYXJDbGFzcyhudW1iZXIpXG5sZXR0ZXIgPSBjaGFyQ2xhc3MobGV0dGVyKVxuXG4vLyBodHRwOi8vd3d3LnczLm9yZy9UUi9SRUMteG1sLyNOVC1OYW1lU3RhcnRDaGFyXG4vLyBUaGlzIGltcGxlbWVudGF0aW9uIHdvcmtzIG9uIHN0cmluZ3MsIGEgc2luZ2xlIGNoYXJhY3RlciBhdCBhIHRpbWVcbi8vIGFzIHN1Y2gsIGl0IGNhbm5vdCBldmVyIHN1cHBvcnQgYXN0cmFsLXBsYW5lIGNoYXJhY3RlcnMgKDEwMDAwLUVGRkZGKVxuLy8gd2l0aG91dCBhIHNpZ25pZmljYW50IGJyZWFraW5nIGNoYW5nZSB0byBlaXRoZXIgdGhpcyAgcGFyc2VyLCBvciB0aGVcbi8vIEphdmFTY3JpcHQgbGFuZ3VhZ2UuICBJbXBsZW1lbnRhdGlvbiBvZiBhbiBlbW9qaS1jYXBhYmxlIHhtbCBwYXJzZXJcbi8vIGlzIGxlZnQgYXMgYW4gZXhlcmNpc2UgZm9yIHRoZSByZWFkZXIuXG52YXIgbmFtZVN0YXJ0ID0gL1s6X0EtWmEtelxcdTAwQzAtXFx1MDBENlxcdTAwRDgtXFx1MDBGNlxcdTAwRjgtXFx1MDJGRlxcdTAzNzAtXFx1MDM3RFxcdTAzN0YtXFx1MUZGRlxcdTIwMEMtXFx1MjAwRFxcdTIwNzAtXFx1MjE4RlxcdTJDMDAtXFx1MkZFRlxcdTMwMDEtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZGRF0vXG5cbnZhciBuYW1lQm9keSA9IC9bOl9BLVphLXpcXHUwMEMwLVxcdTAwRDZcXHUwMEQ4LVxcdTAwRjZcXHUwMEY4LVxcdTAyRkZcXHUwMzcwLVxcdTAzN0RcXHUwMzdGLVxcdTFGRkZcXHUyMDBDLVxcdTIwMERcXHUyMDcwLVxcdTIxOEZcXHUyQzAwLVxcdTJGRUZcXHUzMDAxLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRkRcXHUwMEI3XFx1MDMwMC1cXHUwMzZGXFx1MjAzRi1cXHUyMDQwXFwuXFxkLV0vXG5cbnF1b3RlID0gY2hhckNsYXNzKHF1b3RlKVxuZW50aXR5ID0gY2hhckNsYXNzKGVudGl0eSlcbmF0dHJpYkVuZCA9IGNoYXJDbGFzcyhhdHRyaWJFbmQpXG5cbmZ1bmN0aW9uIGNoYXJDbGFzcyAoc3RyKSB7XG4gIHJldHVybiBzdHIuc3BsaXQoXCJcIikucmVkdWNlKGZ1bmN0aW9uIChzLCBjKSB7XG4gICAgc1tjXSA9IHRydWVcbiAgICByZXR1cm4gc1xuICB9LCB7fSlcbn1cblxuZnVuY3Rpb24gaXNSZWdFeHAgKGMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChjKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSdcbn1cblxuZnVuY3Rpb24gaXMgKGNoYXJjbGFzcywgYykge1xuICByZXR1cm4gaXNSZWdFeHAoY2hhcmNsYXNzKSA/ICEhYy5tYXRjaChjaGFyY2xhc3MpIDogY2hhcmNsYXNzW2NdXG59XG5cbmZ1bmN0aW9uIG5vdCAoY2hhcmNsYXNzLCBjKSB7XG4gIHJldHVybiAhaXMoY2hhcmNsYXNzLCBjKVxufVxuXG52YXIgUyA9IDBcbnNheC5TVEFURSA9XG57IEJFR0lOICAgICAgICAgICAgICAgICAgICAgOiBTKytcbiwgVEVYVCAgICAgICAgICAgICAgICAgICAgICA6IFMrKyAvLyBnZW5lcmFsIHN0dWZmXG4sIFRFWFRfRU5USVRZICAgICAgICAgICAgICAgOiBTKysgLy8gJmFtcCBhbmQgc3VjaC5cbiwgT1BFTl9XQUtBICAgICAgICAgICAgICAgICA6IFMrKyAvLyA8XG4sIFNHTUxfREVDTCAgICAgICAgICAgICAgICAgOiBTKysgLy8gPCFCTEFSR1xuLCBTR01MX0RFQ0xfUVVPVEVEICAgICAgICAgIDogUysrIC8vIDwhQkxBUkcgZm9vIFwiYmFyXG4sIERPQ1RZUEUgICAgICAgICAgICAgICAgICAgOiBTKysgLy8gPCFET0NUWVBFXG4sIERPQ1RZUEVfUVVPVEVEICAgICAgICAgICAgOiBTKysgLy8gPCFET0NUWVBFIFwiLy9ibGFoXG4sIERPQ1RZUEVfRFREICAgICAgICAgICAgICAgOiBTKysgLy8gPCFET0NUWVBFIFwiLy9ibGFoXCIgWyAuLi5cbiwgRE9DVFlQRV9EVERfUVVPVEVEICAgICAgICA6IFMrKyAvLyA8IURPQ1RZUEUgXCIvL2JsYWhcIiBbIFwiZm9vXG4sIENPTU1FTlRfU1RBUlRJTkcgICAgICAgICAgOiBTKysgLy8gPCEtXG4sIENPTU1FTlQgICAgICAgICAgICAgICAgICAgOiBTKysgLy8gPCEtLVxuLCBDT01NRU5UX0VORElORyAgICAgICAgICAgIDogUysrIC8vIDwhLS0gYmxhaCAtXG4sIENPTU1FTlRfRU5ERUQgICAgICAgICAgICAgOiBTKysgLy8gPCEtLSBibGFoIC0tXG4sIENEQVRBICAgICAgICAgICAgICAgICAgICAgOiBTKysgLy8gPCFbQ0RBVEFbIHNvbWV0aGluZ1xuLCBDREFUQV9FTkRJTkcgICAgICAgICAgICAgIDogUysrIC8vIF1cbiwgQ0RBVEFfRU5ESU5HXzIgICAgICAgICAgICA6IFMrKyAvLyBdXVxuLCBQUk9DX0lOU1QgICAgICAgICAgICAgICAgIDogUysrIC8vIDw/aGlcbiwgUFJPQ19JTlNUX0JPRFkgICAgICAgICAgICA6IFMrKyAvLyA8P2hpIHRoZXJlXG4sIFBST0NfSU5TVF9FTkRJTkcgICAgICAgICAgOiBTKysgLy8gPD9oaSBcInRoZXJlXCIgP1xuLCBPUEVOX1RBRyAgICAgICAgICAgICAgICAgIDogUysrIC8vIDxzdHJvbmdcbiwgT1BFTl9UQUdfU0xBU0ggICAgICAgICAgICA6IFMrKyAvLyA8c3Ryb25nIC9cbiwgQVRUUklCICAgICAgICAgICAgICAgICAgICA6IFMrKyAvLyA8YVxuLCBBVFRSSUJfTkFNRSAgICAgICAgICAgICAgIDogUysrIC8vIDxhIGZvb1xuLCBBVFRSSUJfTkFNRV9TQVdfV0hJVEUgICAgIDogUysrIC8vIDxhIGZvbyBfXG4sIEFUVFJJQl9WQUxVRSAgICAgICAgICAgICAgOiBTKysgLy8gPGEgZm9vPVxuLCBBVFRSSUJfVkFMVUVfUVVPVEVEICAgICAgIDogUysrIC8vIDxhIGZvbz1cImJhclxuLCBBVFRSSUJfVkFMVUVfQ0xPU0VEICAgICAgIDogUysrIC8vIDxhIGZvbz1cImJhclwiXG4sIEFUVFJJQl9WQUxVRV9VTlFVT1RFRCAgICAgOiBTKysgLy8gPGEgZm9vPWJhclxuLCBBVFRSSUJfVkFMVUVfRU5USVRZX1EgICAgIDogUysrIC8vIDxmb28gYmFyPVwiJnF1b3Q7XCJcbiwgQVRUUklCX1ZBTFVFX0VOVElUWV9VICAgICA6IFMrKyAvLyA8Zm9vIGJhcj0mcXVvdDtcbiwgQ0xPU0VfVEFHICAgICAgICAgICAgICAgICA6IFMrKyAvLyA8L2FcbiwgQ0xPU0VfVEFHX1NBV19XSElURSAgICAgICA6IFMrKyAvLyA8L2EgICA+XG4sIFNDUklQVCAgICAgICAgICAgICAgICAgICAgOiBTKysgLy8gPHNjcmlwdD4gLi4uXG4sIFNDUklQVF9FTkRJTkcgICAgICAgICAgICAgOiBTKysgLy8gPHNjcmlwdD4gLi4uIDxcbn1cblxuc2F4LkVOVElUSUVTID1cbnsgXCJhbXBcIiA6IFwiJlwiXG4sIFwiZ3RcIiA6IFwiPlwiXG4sIFwibHRcIiA6IFwiPFwiXG4sIFwicXVvdFwiIDogXCJcXFwiXCJcbiwgXCJhcG9zXCIgOiBcIidcIlxuLCBcIkFFbGlnXCIgOiAxOThcbiwgXCJBYWN1dGVcIiA6IDE5M1xuLCBcIkFjaXJjXCIgOiAxOTRcbiwgXCJBZ3JhdmVcIiA6IDE5MlxuLCBcIkFyaW5nXCIgOiAxOTdcbiwgXCJBdGlsZGVcIiA6IDE5NVxuLCBcIkF1bWxcIiA6IDE5NlxuLCBcIkNjZWRpbFwiIDogMTk5XG4sIFwiRVRIXCIgOiAyMDhcbiwgXCJFYWN1dGVcIiA6IDIwMVxuLCBcIkVjaXJjXCIgOiAyMDJcbiwgXCJFZ3JhdmVcIiA6IDIwMFxuLCBcIkV1bWxcIiA6IDIwM1xuLCBcIklhY3V0ZVwiIDogMjA1XG4sIFwiSWNpcmNcIiA6IDIwNlxuLCBcIklncmF2ZVwiIDogMjA0XG4sIFwiSXVtbFwiIDogMjA3XG4sIFwiTnRpbGRlXCIgOiAyMDlcbiwgXCJPYWN1dGVcIiA6IDIxMVxuLCBcIk9jaXJjXCIgOiAyMTJcbiwgXCJPZ3JhdmVcIiA6IDIxMFxuLCBcIk9zbGFzaFwiIDogMjE2XG4sIFwiT3RpbGRlXCIgOiAyMTNcbiwgXCJPdW1sXCIgOiAyMTRcbiwgXCJUSE9STlwiIDogMjIyXG4sIFwiVWFjdXRlXCIgOiAyMThcbiwgXCJVY2lyY1wiIDogMjE5XG4sIFwiVWdyYXZlXCIgOiAyMTdcbiwgXCJVdW1sXCIgOiAyMjBcbiwgXCJZYWN1dGVcIiA6IDIyMVxuLCBcImFhY3V0ZVwiIDogMjI1XG4sIFwiYWNpcmNcIiA6IDIyNlxuLCBcImFlbGlnXCIgOiAyMzBcbiwgXCJhZ3JhdmVcIiA6IDIyNFxuLCBcImFyaW5nXCIgOiAyMjlcbiwgXCJhdGlsZGVcIiA6IDIyN1xuLCBcImF1bWxcIiA6IDIyOFxuLCBcImNjZWRpbFwiIDogMjMxXG4sIFwiZWFjdXRlXCIgOiAyMzNcbiwgXCJlY2lyY1wiIDogMjM0XG4sIFwiZWdyYXZlXCIgOiAyMzJcbiwgXCJldGhcIiA6IDI0MFxuLCBcImV1bWxcIiA6IDIzNVxuLCBcImlhY3V0ZVwiIDogMjM3XG4sIFwiaWNpcmNcIiA6IDIzOFxuLCBcImlncmF2ZVwiIDogMjM2XG4sIFwiaXVtbFwiIDogMjM5XG4sIFwibnRpbGRlXCIgOiAyNDFcbiwgXCJvYWN1dGVcIiA6IDI0M1xuLCBcIm9jaXJjXCIgOiAyNDRcbiwgXCJvZ3JhdmVcIiA6IDI0MlxuLCBcIm9zbGFzaFwiIDogMjQ4XG4sIFwib3RpbGRlXCIgOiAyNDVcbiwgXCJvdW1sXCIgOiAyNDZcbiwgXCJzemxpZ1wiIDogMjIzXG4sIFwidGhvcm5cIiA6IDI1NFxuLCBcInVhY3V0ZVwiIDogMjUwXG4sIFwidWNpcmNcIiA6IDI1MVxuLCBcInVncmF2ZVwiIDogMjQ5XG4sIFwidXVtbFwiIDogMjUyXG4sIFwieWFjdXRlXCIgOiAyNTNcbiwgXCJ5dW1sXCIgOiAyNTVcbiwgXCJjb3B5XCIgOiAxNjlcbiwgXCJyZWdcIiA6IDE3NFxuLCBcIm5ic3BcIiA6IDE2MFxuLCBcImlleGNsXCIgOiAxNjFcbiwgXCJjZW50XCIgOiAxNjJcbiwgXCJwb3VuZFwiIDogMTYzXG4sIFwiY3VycmVuXCIgOiAxNjRcbiwgXCJ5ZW5cIiA6IDE2NVxuLCBcImJydmJhclwiIDogMTY2XG4sIFwic2VjdFwiIDogMTY3XG4sIFwidW1sXCIgOiAxNjhcbiwgXCJvcmRmXCIgOiAxNzBcbiwgXCJsYXF1b1wiIDogMTcxXG4sIFwibm90XCIgOiAxNzJcbiwgXCJzaHlcIiA6IDE3M1xuLCBcIm1hY3JcIiA6IDE3NVxuLCBcImRlZ1wiIDogMTc2XG4sIFwicGx1c21uXCIgOiAxNzdcbiwgXCJzdXAxXCIgOiAxODVcbiwgXCJzdXAyXCIgOiAxNzhcbiwgXCJzdXAzXCIgOiAxNzlcbiwgXCJhY3V0ZVwiIDogMTgwXG4sIFwibWljcm9cIiA6IDE4MVxuLCBcInBhcmFcIiA6IDE4MlxuLCBcIm1pZGRvdFwiIDogMTgzXG4sIFwiY2VkaWxcIiA6IDE4NFxuLCBcIm9yZG1cIiA6IDE4NlxuLCBcInJhcXVvXCIgOiAxODdcbiwgXCJmcmFjMTRcIiA6IDE4OFxuLCBcImZyYWMxMlwiIDogMTg5XG4sIFwiZnJhYzM0XCIgOiAxOTBcbiwgXCJpcXVlc3RcIiA6IDE5MVxuLCBcInRpbWVzXCIgOiAyMTVcbiwgXCJkaXZpZGVcIiA6IDI0N1xuLCBcIk9FbGlnXCIgOiAzMzhcbiwgXCJvZWxpZ1wiIDogMzM5XG4sIFwiU2Nhcm9uXCIgOiAzNTJcbiwgXCJzY2Fyb25cIiA6IDM1M1xuLCBcIll1bWxcIiA6IDM3NlxuLCBcImZub2ZcIiA6IDQwMlxuLCBcImNpcmNcIiA6IDcxMFxuLCBcInRpbGRlXCIgOiA3MzJcbiwgXCJBbHBoYVwiIDogOTEzXG4sIFwiQmV0YVwiIDogOTE0XG4sIFwiR2FtbWFcIiA6IDkxNVxuLCBcIkRlbHRhXCIgOiA5MTZcbiwgXCJFcHNpbG9uXCIgOiA5MTdcbiwgXCJaZXRhXCIgOiA5MThcbiwgXCJFdGFcIiA6IDkxOVxuLCBcIlRoZXRhXCIgOiA5MjBcbiwgXCJJb3RhXCIgOiA5MjFcbiwgXCJLYXBwYVwiIDogOTIyXG4sIFwiTGFtYmRhXCIgOiA5MjNcbiwgXCJNdVwiIDogOTI0XG4sIFwiTnVcIiA6IDkyNVxuLCBcIlhpXCIgOiA5MjZcbiwgXCJPbWljcm9uXCIgOiA5MjdcbiwgXCJQaVwiIDogOTI4XG4sIFwiUmhvXCIgOiA5MjlcbiwgXCJTaWdtYVwiIDogOTMxXG4sIFwiVGF1XCIgOiA5MzJcbiwgXCJVcHNpbG9uXCIgOiA5MzNcbiwgXCJQaGlcIiA6IDkzNFxuLCBcIkNoaVwiIDogOTM1XG4sIFwiUHNpXCIgOiA5MzZcbiwgXCJPbWVnYVwiIDogOTM3XG4sIFwiYWxwaGFcIiA6IDk0NVxuLCBcImJldGFcIiA6IDk0NlxuLCBcImdhbW1hXCIgOiA5NDdcbiwgXCJkZWx0YVwiIDogOTQ4XG4sIFwiZXBzaWxvblwiIDogOTQ5XG4sIFwiemV0YVwiIDogOTUwXG4sIFwiZXRhXCIgOiA5NTFcbiwgXCJ0aGV0YVwiIDogOTUyXG4sIFwiaW90YVwiIDogOTUzXG4sIFwia2FwcGFcIiA6IDk1NFxuLCBcImxhbWJkYVwiIDogOTU1XG4sIFwibXVcIiA6IDk1NlxuLCBcIm51XCIgOiA5NTdcbiwgXCJ4aVwiIDogOTU4XG4sIFwib21pY3JvblwiIDogOTU5XG4sIFwicGlcIiA6IDk2MFxuLCBcInJob1wiIDogOTYxXG4sIFwic2lnbWFmXCIgOiA5NjJcbiwgXCJzaWdtYVwiIDogOTYzXG4sIFwidGF1XCIgOiA5NjRcbiwgXCJ1cHNpbG9uXCIgOiA5NjVcbiwgXCJwaGlcIiA6IDk2NlxuLCBcImNoaVwiIDogOTY3XG4sIFwicHNpXCIgOiA5NjhcbiwgXCJvbWVnYVwiIDogOTY5XG4sIFwidGhldGFzeW1cIiA6IDk3N1xuLCBcInVwc2loXCIgOiA5NzhcbiwgXCJwaXZcIiA6IDk4MlxuLCBcImVuc3BcIiA6IDgxOTRcbiwgXCJlbXNwXCIgOiA4MTk1XG4sIFwidGhpbnNwXCIgOiA4MjAxXG4sIFwiendualwiIDogODIwNFxuLCBcInp3alwiIDogODIwNVxuLCBcImxybVwiIDogODIwNlxuLCBcInJsbVwiIDogODIwN1xuLCBcIm5kYXNoXCIgOiA4MjExXG4sIFwibWRhc2hcIiA6IDgyMTJcbiwgXCJsc3F1b1wiIDogODIxNlxuLCBcInJzcXVvXCIgOiA4MjE3XG4sIFwic2JxdW9cIiA6IDgyMThcbiwgXCJsZHF1b1wiIDogODIyMFxuLCBcInJkcXVvXCIgOiA4MjIxXG4sIFwiYmRxdW9cIiA6IDgyMjJcbiwgXCJkYWdnZXJcIiA6IDgyMjRcbiwgXCJEYWdnZXJcIiA6IDgyMjVcbiwgXCJidWxsXCIgOiA4MjI2XG4sIFwiaGVsbGlwXCIgOiA4MjMwXG4sIFwicGVybWlsXCIgOiA4MjQwXG4sIFwicHJpbWVcIiA6IDgyNDJcbiwgXCJQcmltZVwiIDogODI0M1xuLCBcImxzYXF1b1wiIDogODI0OVxuLCBcInJzYXF1b1wiIDogODI1MFxuLCBcIm9saW5lXCIgOiA4MjU0XG4sIFwiZnJhc2xcIiA6IDgyNjBcbiwgXCJldXJvXCIgOiA4MzY0XG4sIFwiaW1hZ2VcIiA6IDg0NjVcbiwgXCJ3ZWllcnBcIiA6IDg0NzJcbiwgXCJyZWFsXCIgOiA4NDc2XG4sIFwidHJhZGVcIiA6IDg0ODJcbiwgXCJhbGVmc3ltXCIgOiA4NTAxXG4sIFwibGFyclwiIDogODU5MlxuLCBcInVhcnJcIiA6IDg1OTNcbiwgXCJyYXJyXCIgOiA4NTk0XG4sIFwiZGFyclwiIDogODU5NVxuLCBcImhhcnJcIiA6IDg1OTZcbiwgXCJjcmFyclwiIDogODYyOVxuLCBcImxBcnJcIiA6IDg2NTZcbiwgXCJ1QXJyXCIgOiA4NjU3XG4sIFwickFyclwiIDogODY1OFxuLCBcImRBcnJcIiA6IDg2NTlcbiwgXCJoQXJyXCIgOiA4NjYwXG4sIFwiZm9yYWxsXCIgOiA4NzA0XG4sIFwicGFydFwiIDogODcwNlxuLCBcImV4aXN0XCIgOiA4NzA3XG4sIFwiZW1wdHlcIiA6IDg3MDlcbiwgXCJuYWJsYVwiIDogODcxMVxuLCBcImlzaW5cIiA6IDg3MTJcbiwgXCJub3RpblwiIDogODcxM1xuLCBcIm5pXCIgOiA4NzE1XG4sIFwicHJvZFwiIDogODcxOVxuLCBcInN1bVwiIDogODcyMVxuLCBcIm1pbnVzXCIgOiA4NzIyXG4sIFwibG93YXN0XCIgOiA4NzI3XG4sIFwicmFkaWNcIiA6IDg3MzBcbiwgXCJwcm9wXCIgOiA4NzMzXG4sIFwiaW5maW5cIiA6IDg3MzRcbiwgXCJhbmdcIiA6IDg3MzZcbiwgXCJhbmRcIiA6IDg3NDNcbiwgXCJvclwiIDogODc0NFxuLCBcImNhcFwiIDogODc0NVxuLCBcImN1cFwiIDogODc0NlxuLCBcImludFwiIDogODc0N1xuLCBcInRoZXJlNFwiIDogODc1NlxuLCBcInNpbVwiIDogODc2NFxuLCBcImNvbmdcIiA6IDg3NzNcbiwgXCJhc3ltcFwiIDogODc3NlxuLCBcIm5lXCIgOiA4ODAwXG4sIFwiZXF1aXZcIiA6IDg4MDFcbiwgXCJsZVwiIDogODgwNFxuLCBcImdlXCIgOiA4ODA1XG4sIFwic3ViXCIgOiA4ODM0XG4sIFwic3VwXCIgOiA4ODM1XG4sIFwibnN1YlwiIDogODgzNlxuLCBcInN1YmVcIiA6IDg4MzhcbiwgXCJzdXBlXCIgOiA4ODM5XG4sIFwib3BsdXNcIiA6IDg4NTNcbiwgXCJvdGltZXNcIiA6IDg4NTVcbiwgXCJwZXJwXCIgOiA4ODY5XG4sIFwic2RvdFwiIDogODkwMVxuLCBcImxjZWlsXCIgOiA4OTY4XG4sIFwicmNlaWxcIiA6IDg5NjlcbiwgXCJsZmxvb3JcIiA6IDg5NzBcbiwgXCJyZmxvb3JcIiA6IDg5NzFcbiwgXCJsYW5nXCIgOiA5MDAxXG4sIFwicmFuZ1wiIDogOTAwMlxuLCBcImxvelwiIDogOTY3NFxuLCBcInNwYWRlc1wiIDogOTgyNFxuLCBcImNsdWJzXCIgOiA5ODI3XG4sIFwiaGVhcnRzXCIgOiA5ODI5XG4sIFwiZGlhbXNcIiA6IDk4MzBcbn1cblxuT2JqZWN0LmtleXMoc2F4LkVOVElUSUVTKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIgZSA9IHNheC5FTlRJVElFU1trZXldXG4gICAgdmFyIHMgPSB0eXBlb2YgZSA9PT0gJ251bWJlcicgPyBTdHJpbmcuZnJvbUNoYXJDb2RlKGUpIDogZVxuICAgIHNheC5FTlRJVElFU1trZXldID0gc1xufSlcblxuZm9yICh2YXIgUyBpbiBzYXguU1RBVEUpIHNheC5TVEFURVtzYXguU1RBVEVbU11dID0gU1xuXG4vLyBzaG9ydGhhbmRcblMgPSBzYXguU1RBVEVcblxuZnVuY3Rpb24gZW1pdCAocGFyc2VyLCBldmVudCwgZGF0YSkge1xuICBwYXJzZXJbZXZlbnRdICYmIHBhcnNlcltldmVudF0oZGF0YSlcbn1cblxuZnVuY3Rpb24gZW1pdE5vZGUgKHBhcnNlciwgbm9kZVR5cGUsIGRhdGEpIHtcbiAgaWYgKHBhcnNlci50ZXh0Tm9kZSkgY2xvc2VUZXh0KHBhcnNlcilcbiAgZW1pdChwYXJzZXIsIG5vZGVUeXBlLCBkYXRhKVxufVxuXG5mdW5jdGlvbiBjbG9zZVRleHQgKHBhcnNlcikge1xuICBwYXJzZXIudGV4dE5vZGUgPSB0ZXh0b3B0cyhwYXJzZXIub3B0LCBwYXJzZXIudGV4dE5vZGUpXG4gIGlmIChwYXJzZXIudGV4dE5vZGUpIGVtaXQocGFyc2VyLCBcIm9udGV4dFwiLCBwYXJzZXIudGV4dE5vZGUpXG4gIHBhcnNlci50ZXh0Tm9kZSA9IFwiXCJcbn1cblxuZnVuY3Rpb24gdGV4dG9wdHMgKG9wdCwgdGV4dCkge1xuICBpZiAob3B0LnRyaW0pIHRleHQgPSB0ZXh0LnRyaW0oKVxuICBpZiAob3B0Lm5vcm1hbGl6ZSkgdGV4dCA9IHRleHQucmVwbGFjZSgvXFxzKy9nLCBcIiBcIilcbiAgcmV0dXJuIHRleHRcbn1cblxuZnVuY3Rpb24gZXJyb3IgKHBhcnNlciwgZXIpIHtcbiAgY2xvc2VUZXh0KHBhcnNlcilcbiAgaWYgKHBhcnNlci50cmFja1Bvc2l0aW9uKSB7XG4gICAgZXIgKz0gXCJcXG5MaW5lOiBcIitwYXJzZXIubGluZStcbiAgICAgICAgICBcIlxcbkNvbHVtbjogXCIrcGFyc2VyLmNvbHVtbitcbiAgICAgICAgICBcIlxcbkNoYXI6IFwiK3BhcnNlci5jXG4gIH1cbiAgZXIgPSBuZXcgRXJyb3IoZXIpXG4gIHBhcnNlci5lcnJvciA9IGVyXG4gIGVtaXQocGFyc2VyLCBcIm9uZXJyb3JcIiwgZXIpXG4gIHJldHVybiBwYXJzZXJcbn1cblxuZnVuY3Rpb24gZW5kIChwYXJzZXIpIHtcbiAgaWYgKCFwYXJzZXIuY2xvc2VkUm9vdCkgc3RyaWN0RmFpbChwYXJzZXIsIFwiVW5jbG9zZWQgcm9vdCB0YWdcIilcbiAgaWYgKChwYXJzZXIuc3RhdGUgIT09IFMuQkVHSU4pICYmIChwYXJzZXIuc3RhdGUgIT09IFMuVEVYVCkpIGVycm9yKHBhcnNlciwgXCJVbmV4cGVjdGVkIGVuZFwiKVxuICBjbG9zZVRleHQocGFyc2VyKVxuICBwYXJzZXIuYyA9IFwiXCJcbiAgcGFyc2VyLmNsb3NlZCA9IHRydWVcbiAgZW1pdChwYXJzZXIsIFwib25lbmRcIilcbiAgU0FYUGFyc2VyLmNhbGwocGFyc2VyLCBwYXJzZXIuc3RyaWN0LCBwYXJzZXIub3B0KVxuICByZXR1cm4gcGFyc2VyXG59XG5cbmZ1bmN0aW9uIHN0cmljdEZhaWwgKHBhcnNlciwgbWVzc2FnZSkge1xuICBpZiAodHlwZW9mIHBhcnNlciAhPT0gJ29iamVjdCcgfHwgIShwYXJzZXIgaW5zdGFuY2VvZiBTQVhQYXJzZXIpKVxuICAgIHRocm93IG5ldyBFcnJvcignYmFkIGNhbGwgdG8gc3RyaWN0RmFpbCcpO1xuICBpZiAocGFyc2VyLnN0cmljdCkgZXJyb3IocGFyc2VyLCBtZXNzYWdlKVxufVxuXG5mdW5jdGlvbiBuZXdUYWcgKHBhcnNlcikge1xuICBpZiAoIXBhcnNlci5zdHJpY3QpIHBhcnNlci50YWdOYW1lID0gcGFyc2VyLnRhZ05hbWVbcGFyc2VyLmxvb3NlQ2FzZV0oKVxuICB2YXIgcGFyZW50ID0gcGFyc2VyLnRhZ3NbcGFyc2VyLnRhZ3MubGVuZ3RoIC0gMV0gfHwgcGFyc2VyXG4gICAgLCB0YWcgPSBwYXJzZXIudGFnID0geyBuYW1lIDogcGFyc2VyLnRhZ05hbWUsIGF0dHJpYnV0ZXMgOiB7fSB9XG5cbiAgLy8gd2lsbCBiZSBvdmVycmlkZGVuIGlmIHRhZyBjb250YWlscyBhbiB4bWxucz1cImZvb1wiIG9yIHhtbG5zOmZvbz1cImJhclwiXG4gIGlmIChwYXJzZXIub3B0LnhtbG5zKSB0YWcubnMgPSBwYXJlbnQubnNcbiAgcGFyc2VyLmF0dHJpYkxpc3QubGVuZ3RoID0gMFxufVxuXG5mdW5jdGlvbiBxbmFtZSAobmFtZSwgYXR0cmlidXRlKSB7XG4gIHZhciBpID0gbmFtZS5pbmRleE9mKFwiOlwiKVxuICAgICwgcXVhbE5hbWUgPSBpIDwgMCA/IFsgXCJcIiwgbmFtZSBdIDogbmFtZS5zcGxpdChcIjpcIilcbiAgICAsIHByZWZpeCA9IHF1YWxOYW1lWzBdXG4gICAgLCBsb2NhbCA9IHF1YWxOYW1lWzFdXG5cbiAgLy8gPHggXCJ4bWxuc1wiPVwiaHR0cDovL2Zvb1wiPlxuICBpZiAoYXR0cmlidXRlICYmIG5hbWUgPT09IFwieG1sbnNcIikge1xuICAgIHByZWZpeCA9IFwieG1sbnNcIlxuICAgIGxvY2FsID0gXCJcIlxuICB9XG5cbiAgcmV0dXJuIHsgcHJlZml4OiBwcmVmaXgsIGxvY2FsOiBsb2NhbCB9XG59XG5cbmZ1bmN0aW9uIGF0dHJpYiAocGFyc2VyKSB7XG4gIGlmICghcGFyc2VyLnN0cmljdCkgcGFyc2VyLmF0dHJpYk5hbWUgPSBwYXJzZXIuYXR0cmliTmFtZVtwYXJzZXIubG9vc2VDYXNlXSgpXG5cbiAgaWYgKHBhcnNlci5hdHRyaWJMaXN0LmluZGV4T2YocGFyc2VyLmF0dHJpYk5hbWUpICE9PSAtMSB8fFxuICAgICAgcGFyc2VyLnRhZy5hdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KHBhcnNlci5hdHRyaWJOYW1lKSkge1xuICAgIHJldHVybiBwYXJzZXIuYXR0cmliTmFtZSA9IHBhcnNlci5hdHRyaWJWYWx1ZSA9IFwiXCJcbiAgfVxuXG4gIGlmIChwYXJzZXIub3B0LnhtbG5zKSB7XG4gICAgdmFyIHFuID0gcW5hbWUocGFyc2VyLmF0dHJpYk5hbWUsIHRydWUpXG4gICAgICAsIHByZWZpeCA9IHFuLnByZWZpeFxuICAgICAgLCBsb2NhbCA9IHFuLmxvY2FsXG5cbiAgICBpZiAocHJlZml4ID09PSBcInhtbG5zXCIpIHtcbiAgICAgIC8vIG5hbWVzcGFjZSBiaW5kaW5nIGF0dHJpYnV0ZTsgcHVzaCB0aGUgYmluZGluZyBpbnRvIHNjb3BlXG4gICAgICBpZiAobG9jYWwgPT09IFwieG1sXCIgJiYgcGFyc2VyLmF0dHJpYlZhbHVlICE9PSBYTUxfTkFNRVNQQUNFKSB7XG4gICAgICAgIHN0cmljdEZhaWwoIHBhcnNlclxuICAgICAgICAgICAgICAgICAgLCBcInhtbDogcHJlZml4IG11c3QgYmUgYm91bmQgdG8gXCIgKyBYTUxfTkFNRVNQQUNFICsgXCJcXG5cIlxuICAgICAgICAgICAgICAgICAgKyBcIkFjdHVhbDogXCIgKyBwYXJzZXIuYXR0cmliVmFsdWUgKVxuICAgICAgfSBlbHNlIGlmIChsb2NhbCA9PT0gXCJ4bWxuc1wiICYmIHBhcnNlci5hdHRyaWJWYWx1ZSAhPT0gWE1MTlNfTkFNRVNQQUNFKSB7XG4gICAgICAgIHN0cmljdEZhaWwoIHBhcnNlclxuICAgICAgICAgICAgICAgICAgLCBcInhtbG5zOiBwcmVmaXggbXVzdCBiZSBib3VuZCB0byBcIiArIFhNTE5TX05BTUVTUEFDRSArIFwiXFxuXCJcbiAgICAgICAgICAgICAgICAgICsgXCJBY3R1YWw6IFwiICsgcGFyc2VyLmF0dHJpYlZhbHVlIClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0YWcgPSBwYXJzZXIudGFnXG4gICAgICAgICAgLCBwYXJlbnQgPSBwYXJzZXIudGFnc1twYXJzZXIudGFncy5sZW5ndGggLSAxXSB8fCBwYXJzZXJcbiAgICAgICAgaWYgKHRhZy5ucyA9PT0gcGFyZW50Lm5zKSB7XG4gICAgICAgICAgdGFnLm5zID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQubnMpXG4gICAgICAgIH1cbiAgICAgICAgdGFnLm5zW2xvY2FsXSA9IHBhcnNlci5hdHRyaWJWYWx1ZVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRlZmVyIG9uYXR0cmlidXRlIGV2ZW50cyB1bnRpbCBhbGwgYXR0cmlidXRlcyBoYXZlIGJlZW4gc2VlblxuICAgIC8vIHNvIGFueSBuZXcgYmluZGluZ3MgY2FuIHRha2UgZWZmZWN0OyBwcmVzZXJ2ZSBhdHRyaWJ1dGUgb3JkZXJcbiAgICAvLyBzbyBkZWZlcnJlZCBldmVudHMgY2FuIGJlIGVtaXR0ZWQgaW4gZG9jdW1lbnQgb3JkZXJcbiAgICBwYXJzZXIuYXR0cmliTGlzdC5wdXNoKFtwYXJzZXIuYXR0cmliTmFtZSwgcGFyc2VyLmF0dHJpYlZhbHVlXSlcbiAgfSBlbHNlIHtcbiAgICAvLyBpbiBub24teG1sbnMgbW9kZSwgd2UgY2FuIGVtaXQgdGhlIGV2ZW50IHJpZ2h0IGF3YXlcbiAgICBwYXJzZXIudGFnLmF0dHJpYnV0ZXNbcGFyc2VyLmF0dHJpYk5hbWVdID0gcGFyc2VyLmF0dHJpYlZhbHVlXG4gICAgZW1pdE5vZGUoIHBhcnNlclxuICAgICAgICAgICAgLCBcIm9uYXR0cmlidXRlXCJcbiAgICAgICAgICAgICwgeyBuYW1lOiBwYXJzZXIuYXR0cmliTmFtZVxuICAgICAgICAgICAgICAsIHZhbHVlOiBwYXJzZXIuYXR0cmliVmFsdWUgfSApXG4gIH1cblxuICBwYXJzZXIuYXR0cmliTmFtZSA9IHBhcnNlci5hdHRyaWJWYWx1ZSA9IFwiXCJcbn1cblxuZnVuY3Rpb24gb3BlblRhZyAocGFyc2VyLCBzZWxmQ2xvc2luZykge1xuICBpZiAocGFyc2VyLm9wdC54bWxucykge1xuICAgIC8vIGVtaXQgbmFtZXNwYWNlIGJpbmRpbmcgZXZlbnRzXG4gICAgdmFyIHRhZyA9IHBhcnNlci50YWdcblxuICAgIC8vIGFkZCBuYW1lc3BhY2UgaW5mbyB0byB0YWdcbiAgICB2YXIgcW4gPSBxbmFtZShwYXJzZXIudGFnTmFtZSlcbiAgICB0YWcucHJlZml4ID0gcW4ucHJlZml4XG4gICAgdGFnLmxvY2FsID0gcW4ubG9jYWxcbiAgICB0YWcudXJpID0gdGFnLm5zW3FuLnByZWZpeF0gfHwgXCJcIlxuXG4gICAgaWYgKHRhZy5wcmVmaXggJiYgIXRhZy51cmkpIHtcbiAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIlVuYm91bmQgbmFtZXNwYWNlIHByZWZpeDogXCJcbiAgICAgICAgICAgICAgICAgICAgICAgKyBKU09OLnN0cmluZ2lmeShwYXJzZXIudGFnTmFtZSkpXG4gICAgICB0YWcudXJpID0gcW4ucHJlZml4XG4gICAgfVxuXG4gICAgdmFyIHBhcmVudCA9IHBhcnNlci50YWdzW3BhcnNlci50YWdzLmxlbmd0aCAtIDFdIHx8IHBhcnNlclxuICAgIGlmICh0YWcubnMgJiYgcGFyZW50Lm5zICE9PSB0YWcubnMpIHtcbiAgICAgIE9iamVjdC5rZXlzKHRhZy5ucykuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgICBlbWl0Tm9kZSggcGFyc2VyXG4gICAgICAgICAgICAgICAgLCBcIm9ub3Blbm5hbWVzcGFjZVwiXG4gICAgICAgICAgICAgICAgLCB7IHByZWZpeDogcCAsIHVyaTogdGFnLm5zW3BdIH0gKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgZGVmZXJyZWQgb25hdHRyaWJ1dGUgZXZlbnRzXG4gICAgLy8gTm90ZTogZG8gbm90IGFwcGx5IGRlZmF1bHQgbnMgdG8gYXR0cmlidXRlczpcbiAgICAvLyAgIGh0dHA6Ly93d3cudzMub3JnL1RSL1JFQy14bWwtbmFtZXMvI2RlZmF1bHRpbmdcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHBhcnNlci5hdHRyaWJMaXN0Lmxlbmd0aDsgaSA8IGw7IGkgKyspIHtcbiAgICAgIHZhciBudiA9IHBhcnNlci5hdHRyaWJMaXN0W2ldXG4gICAgICB2YXIgbmFtZSA9IG52WzBdXG4gICAgICAgICwgdmFsdWUgPSBudlsxXVxuICAgICAgICAsIHF1YWxOYW1lID0gcW5hbWUobmFtZSwgdHJ1ZSlcbiAgICAgICAgLCBwcmVmaXggPSBxdWFsTmFtZS5wcmVmaXhcbiAgICAgICAgLCBsb2NhbCA9IHF1YWxOYW1lLmxvY2FsXG4gICAgICAgICwgdXJpID0gcHJlZml4ID09IFwiXCIgPyBcIlwiIDogKHRhZy5uc1twcmVmaXhdIHx8IFwiXCIpXG4gICAgICAgICwgYSA9IHsgbmFtZTogbmFtZVxuICAgICAgICAgICAgICAsIHZhbHVlOiB2YWx1ZVxuICAgICAgICAgICAgICAsIHByZWZpeDogcHJlZml4XG4gICAgICAgICAgICAgICwgbG9jYWw6IGxvY2FsXG4gICAgICAgICAgICAgICwgdXJpOiB1cmlcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAvLyBpZiB0aGVyZSdzIGFueSBhdHRyaWJ1dGVzIHdpdGggYW4gdW5kZWZpbmVkIG5hbWVzcGFjZSxcbiAgICAgIC8vIHRoZW4gZmFpbCBvbiB0aGVtIG5vdy5cbiAgICAgIGlmIChwcmVmaXggJiYgcHJlZml4ICE9IFwieG1sbnNcIiAmJiAhdXJpKSB7XG4gICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIlVuYm91bmQgbmFtZXNwYWNlIHByZWZpeDogXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICArIEpTT04uc3RyaW5naWZ5KHByZWZpeCkpXG4gICAgICAgIGEudXJpID0gcHJlZml4XG4gICAgICB9XG4gICAgICBwYXJzZXIudGFnLmF0dHJpYnV0ZXNbbmFtZV0gPSBhXG4gICAgICBlbWl0Tm9kZShwYXJzZXIsIFwib25hdHRyaWJ1dGVcIiwgYSlcbiAgICB9XG4gICAgcGFyc2VyLmF0dHJpYkxpc3QubGVuZ3RoID0gMFxuICB9XG5cbiAgcGFyc2VyLnRhZy5pc1NlbGZDbG9zaW5nID0gISFzZWxmQ2xvc2luZ1xuXG4gIC8vIHByb2Nlc3MgdGhlIHRhZ1xuICBwYXJzZXIuc2F3Um9vdCA9IHRydWVcbiAgcGFyc2VyLnRhZ3MucHVzaChwYXJzZXIudGFnKVxuICBlbWl0Tm9kZShwYXJzZXIsIFwib25vcGVudGFnXCIsIHBhcnNlci50YWcpXG4gIGlmICghc2VsZkNsb3NpbmcpIHtcbiAgICAvLyBzcGVjaWFsIGNhc2UgZm9yIDxzY3JpcHQ+IGluIG5vbi1zdHJpY3QgbW9kZS5cbiAgICBpZiAoIXBhcnNlci5ub3NjcmlwdCAmJiBwYXJzZXIudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcInNjcmlwdFwiKSB7XG4gICAgICBwYXJzZXIuc3RhdGUgPSBTLlNDUklQVFxuICAgIH0gZWxzZSB7XG4gICAgICBwYXJzZXIuc3RhdGUgPSBTLlRFWFRcbiAgICB9XG4gICAgcGFyc2VyLnRhZyA9IG51bGxcbiAgICBwYXJzZXIudGFnTmFtZSA9IFwiXCJcbiAgfVxuICBwYXJzZXIuYXR0cmliTmFtZSA9IHBhcnNlci5hdHRyaWJWYWx1ZSA9IFwiXCJcbiAgcGFyc2VyLmF0dHJpYkxpc3QubGVuZ3RoID0gMFxufVxuXG5mdW5jdGlvbiBjbG9zZVRhZyAocGFyc2VyKSB7XG4gIGlmICghcGFyc2VyLnRhZ05hbWUpIHtcbiAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJXZWlyZCBlbXB0eSBjbG9zZSB0YWcuXCIpXG4gICAgcGFyc2VyLnRleHROb2RlICs9IFwiPC8+XCJcbiAgICBwYXJzZXIuc3RhdGUgPSBTLlRFWFRcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChwYXJzZXIuc2NyaXB0KSB7XG4gICAgaWYgKHBhcnNlci50YWdOYW1lICE9PSBcInNjcmlwdFwiKSB7XG4gICAgICBwYXJzZXIuc2NyaXB0ICs9IFwiPC9cIiArIHBhcnNlci50YWdOYW1lICsgXCI+XCJcbiAgICAgIHBhcnNlci50YWdOYW1lID0gXCJcIlxuICAgICAgcGFyc2VyLnN0YXRlID0gUy5TQ1JJUFRcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBlbWl0Tm9kZShwYXJzZXIsIFwib25zY3JpcHRcIiwgcGFyc2VyLnNjcmlwdClcbiAgICBwYXJzZXIuc2NyaXB0ID0gXCJcIlxuICB9XG5cbiAgLy8gZmlyc3QgbWFrZSBzdXJlIHRoYXQgdGhlIGNsb3NpbmcgdGFnIGFjdHVhbGx5IGV4aXN0cy5cbiAgLy8gPGE+PGI+PC9jPjwvYj48L2E+IHdpbGwgY2xvc2UgZXZlcnl0aGluZywgb3RoZXJ3aXNlLlxuICB2YXIgdCA9IHBhcnNlci50YWdzLmxlbmd0aFxuICB2YXIgdGFnTmFtZSA9IHBhcnNlci50YWdOYW1lXG4gIGlmICghcGFyc2VyLnN0cmljdCkgdGFnTmFtZSA9IHRhZ05hbWVbcGFyc2VyLmxvb3NlQ2FzZV0oKVxuICB2YXIgY2xvc2VUbyA9IHRhZ05hbWVcbiAgd2hpbGUgKHQgLS0pIHtcbiAgICB2YXIgY2xvc2UgPSBwYXJzZXIudGFnc1t0XVxuICAgIGlmIChjbG9zZS5uYW1lICE9PSBjbG9zZVRvKSB7XG4gICAgICAvLyBmYWlsIHRoZSBmaXJzdCB0aW1lIGluIHN0cmljdCBtb2RlXG4gICAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJVbmV4cGVjdGVkIGNsb3NlIHRhZ1wiKVxuICAgIH0gZWxzZSBicmVha1xuICB9XG5cbiAgLy8gZGlkbid0IGZpbmQgaXQuICB3ZSBhbHJlYWR5IGZhaWxlZCBmb3Igc3RyaWN0LCBzbyBqdXN0IGFib3J0LlxuICBpZiAodCA8IDApIHtcbiAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJVbm1hdGNoZWQgY2xvc2luZyB0YWc6IFwiK3BhcnNlci50YWdOYW1lKVxuICAgIHBhcnNlci50ZXh0Tm9kZSArPSBcIjwvXCIgKyBwYXJzZXIudGFnTmFtZSArIFwiPlwiXG4gICAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgcmV0dXJuXG4gIH1cbiAgcGFyc2VyLnRhZ05hbWUgPSB0YWdOYW1lXG4gIHZhciBzID0gcGFyc2VyLnRhZ3MubGVuZ3RoXG4gIHdoaWxlIChzIC0tPiB0KSB7XG4gICAgdmFyIHRhZyA9IHBhcnNlci50YWcgPSBwYXJzZXIudGFncy5wb3AoKVxuICAgIHBhcnNlci50YWdOYW1lID0gcGFyc2VyLnRhZy5uYW1lXG4gICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uY2xvc2V0YWdcIiwgcGFyc2VyLnRhZ05hbWUpXG5cbiAgICB2YXIgeCA9IHt9XG4gICAgZm9yICh2YXIgaSBpbiB0YWcubnMpIHhbaV0gPSB0YWcubnNbaV1cblxuICAgIHZhciBwYXJlbnQgPSBwYXJzZXIudGFnc1twYXJzZXIudGFncy5sZW5ndGggLSAxXSB8fCBwYXJzZXJcbiAgICBpZiAocGFyc2VyLm9wdC54bWxucyAmJiB0YWcubnMgIT09IHBhcmVudC5ucykge1xuICAgICAgLy8gcmVtb3ZlIG5hbWVzcGFjZSBiaW5kaW5ncyBpbnRyb2R1Y2VkIGJ5IHRhZ1xuICAgICAgT2JqZWN0LmtleXModGFnLm5zKS5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIHZhciBuID0gdGFnLm5zW3BdXG4gICAgICAgIGVtaXROb2RlKHBhcnNlciwgXCJvbmNsb3NlbmFtZXNwYWNlXCIsIHsgcHJlZml4OiBwLCB1cmk6IG4gfSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG4gIGlmICh0ID09PSAwKSBwYXJzZXIuY2xvc2VkUm9vdCA9IHRydWVcbiAgcGFyc2VyLnRhZ05hbWUgPSBwYXJzZXIuYXR0cmliVmFsdWUgPSBwYXJzZXIuYXR0cmliTmFtZSA9IFwiXCJcbiAgcGFyc2VyLmF0dHJpYkxpc3QubGVuZ3RoID0gMFxuICBwYXJzZXIuc3RhdGUgPSBTLlRFWFRcbn1cblxuZnVuY3Rpb24gcGFyc2VFbnRpdHkgKHBhcnNlcikge1xuICB2YXIgZW50aXR5ID0gcGFyc2VyLmVudGl0eVxuICAgICwgZW50aXR5TEMgPSBlbnRpdHkudG9Mb3dlckNhc2UoKVxuICAgICwgbnVtXG4gICAgLCBudW1TdHIgPSBcIlwiXG4gIGlmIChwYXJzZXIuRU5USVRJRVNbZW50aXR5XSlcbiAgICByZXR1cm4gcGFyc2VyLkVOVElUSUVTW2VudGl0eV1cbiAgaWYgKHBhcnNlci5FTlRJVElFU1tlbnRpdHlMQ10pXG4gICAgcmV0dXJuIHBhcnNlci5FTlRJVElFU1tlbnRpdHlMQ11cbiAgZW50aXR5ID0gZW50aXR5TENcbiAgaWYgKGVudGl0eS5jaGFyQXQoMCkgPT09IFwiI1wiKSB7XG4gICAgaWYgKGVudGl0eS5jaGFyQXQoMSkgPT09IFwieFwiKSB7XG4gICAgICBlbnRpdHkgPSBlbnRpdHkuc2xpY2UoMilcbiAgICAgIG51bSA9IHBhcnNlSW50KGVudGl0eSwgMTYpXG4gICAgICBudW1TdHIgPSBudW0udG9TdHJpbmcoMTYpXG4gICAgfSBlbHNlIHtcbiAgICAgIGVudGl0eSA9IGVudGl0eS5zbGljZSgxKVxuICAgICAgbnVtID0gcGFyc2VJbnQoZW50aXR5LCAxMClcbiAgICAgIG51bVN0ciA9IG51bS50b1N0cmluZygxMClcbiAgICB9XG4gIH1cbiAgZW50aXR5ID0gZW50aXR5LnJlcGxhY2UoL14wKy8sIFwiXCIpXG4gIGlmIChudW1TdHIudG9Mb3dlckNhc2UoKSAhPT0gZW50aXR5KSB7XG4gICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiSW52YWxpZCBjaGFyYWN0ZXIgZW50aXR5XCIpXG4gICAgcmV0dXJuIFwiJlwiK3BhcnNlci5lbnRpdHkgKyBcIjtcIlxuICB9XG5cbiAgcmV0dXJuIFN0cmluZy5mcm9tQ29kZVBvaW50KG51bSlcbn1cblxuZnVuY3Rpb24gd3JpdGUgKGNodW5rKSB7XG4gIHZhciBwYXJzZXIgPSB0aGlzXG4gIGlmICh0aGlzLmVycm9yKSB0aHJvdyB0aGlzLmVycm9yXG4gIGlmIChwYXJzZXIuY2xvc2VkKSByZXR1cm4gZXJyb3IocGFyc2VyLFxuICAgIFwiQ2Fubm90IHdyaXRlIGFmdGVyIGNsb3NlLiBBc3NpZ24gYW4gb25yZWFkeSBoYW5kbGVyLlwiKVxuICBpZiAoY2h1bmsgPT09IG51bGwpIHJldHVybiBlbmQocGFyc2VyKVxuICB2YXIgaSA9IDAsIGMgPSBcIlwiXG4gIHdoaWxlIChwYXJzZXIuYyA9IGMgPSBjaHVuay5jaGFyQXQoaSsrKSkge1xuICAgIGlmIChwYXJzZXIudHJhY2tQb3NpdGlvbikge1xuICAgICAgcGFyc2VyLnBvc2l0aW9uICsrXG4gICAgICBpZiAoYyA9PT0gXCJcXG5cIikge1xuICAgICAgICBwYXJzZXIubGluZSArK1xuICAgICAgICBwYXJzZXIuY29sdW1uID0gMFxuICAgICAgfSBlbHNlIHBhcnNlci5jb2x1bW4gKytcbiAgICB9XG4gICAgc3dpdGNoIChwYXJzZXIuc3RhdGUpIHtcblxuICAgICAgY2FzZSBTLkJFR0lOOlxuICAgICAgICBpZiAoYyA9PT0gXCI8XCIpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLk9QRU5fV0FLQVxuICAgICAgICAgIHBhcnNlci5zdGFydFRhZ1Bvc2l0aW9uID0gcGFyc2VyLnBvc2l0aW9uXG4gICAgICAgIH0gZWxzZSBpZiAobm90KHdoaXRlc3BhY2UsYykpIHtcbiAgICAgICAgICAvLyBoYXZlIHRvIHByb2Nlc3MgdGhpcyBhcyBhIHRleHQgbm9kZS5cbiAgICAgICAgICAvLyB3ZWlyZCwgYnV0IGhhcHBlbnMuXG4gICAgICAgICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiTm9uLXdoaXRlc3BhY2UgYmVmb3JlIGZpcnN0IHRhZy5cIilcbiAgICAgICAgICBwYXJzZXIudGV4dE5vZGUgPSBjXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5URVhUOlxuICAgICAgICBpZiAocGFyc2VyLnNhd1Jvb3QgJiYgIXBhcnNlci5jbG9zZWRSb290KSB7XG4gICAgICAgICAgdmFyIHN0YXJ0aSA9IGktMVxuICAgICAgICAgIHdoaWxlIChjICYmIGMhPT1cIjxcIiAmJiBjIT09XCImXCIpIHtcbiAgICAgICAgICAgIGMgPSBjaHVuay5jaGFyQXQoaSsrKVxuICAgICAgICAgICAgaWYgKGMgJiYgcGFyc2VyLnRyYWNrUG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgcGFyc2VyLnBvc2l0aW9uICsrXG4gICAgICAgICAgICAgIGlmIChjID09PSBcIlxcblwiKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VyLmxpbmUgKytcbiAgICAgICAgICAgICAgICBwYXJzZXIuY29sdW1uID0gMFxuICAgICAgICAgICAgICB9IGVsc2UgcGFyc2VyLmNvbHVtbiArK1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBwYXJzZXIudGV4dE5vZGUgKz0gY2h1bmsuc3Vic3RyaW5nKHN0YXJ0aSwgaS0xKVxuICAgICAgICB9XG4gICAgICAgIGlmIChjID09PSBcIjxcIikge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuT1BFTl9XQUtBXG4gICAgICAgICAgcGFyc2VyLnN0YXJ0VGFnUG9zaXRpb24gPSBwYXJzZXIucG9zaXRpb25cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAobm90KHdoaXRlc3BhY2UsIGMpICYmICghcGFyc2VyLnNhd1Jvb3QgfHwgcGFyc2VyLmNsb3NlZFJvb3QpKVxuICAgICAgICAgICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiVGV4dCBkYXRhIG91dHNpZGUgb2Ygcm9vdCBub2RlLlwiKVxuICAgICAgICAgIGlmIChjID09PSBcIiZcIikgcGFyc2VyLnN0YXRlID0gUy5URVhUX0VOVElUWVxuICAgICAgICAgIGVsc2UgcGFyc2VyLnRleHROb2RlICs9IGNcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLlNDUklQVDpcbiAgICAgICAgLy8gb25seSBub24tc3RyaWN0XG4gICAgICAgIGlmIChjID09PSBcIjxcIikge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuU0NSSVBUX0VORElOR1xuICAgICAgICB9IGVsc2UgcGFyc2VyLnNjcmlwdCArPSBjXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuU0NSSVBUX0VORElORzpcbiAgICAgICAgaWYgKGMgPT09IFwiL1wiKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5DTE9TRV9UQUdcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJzZXIuc2NyaXB0ICs9IFwiPFwiICsgY1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuU0NSSVBUXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5PUEVOX1dBS0E6XG4gICAgICAgIC8vIGVpdGhlciBhIC8sID8sICEsIG9yIHRleHQgaXMgY29taW5nIG5leHQuXG4gICAgICAgIGlmIChjID09PSBcIiFcIikge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuU0dNTF9ERUNMXG4gICAgICAgICAgcGFyc2VyLnNnbWxEZWNsID0gXCJcIlxuICAgICAgICB9IGVsc2UgaWYgKGlzKHdoaXRlc3BhY2UsIGMpKSB7XG4gICAgICAgICAgLy8gd2FpdCBmb3IgaXQuLi5cbiAgICAgICAgfSBlbHNlIGlmIChpcyhuYW1lU3RhcnQsYykpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLk9QRU5fVEFHXG4gICAgICAgICAgcGFyc2VyLnRhZ05hbWUgPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gXCIvXCIpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkNMT1NFX1RBR1xuICAgICAgICAgIHBhcnNlci50YWdOYW1lID0gXCJcIlxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09IFwiP1wiKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5QUk9DX0lOU1RcbiAgICAgICAgICBwYXJzZXIucHJvY0luc3ROYW1lID0gcGFyc2VyLnByb2NJbnN0Qm9keSA9IFwiXCJcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHJpY3RGYWlsKHBhcnNlciwgXCJVbmVuY29kZWQgPFwiKVxuICAgICAgICAgIC8vIGlmIHRoZXJlIHdhcyBzb21lIHdoaXRlc3BhY2UsIHRoZW4gYWRkIHRoYXQgaW4uXG4gICAgICAgICAgaWYgKHBhcnNlci5zdGFydFRhZ1Bvc2l0aW9uICsgMSA8IHBhcnNlci5wb3NpdGlvbikge1xuICAgICAgICAgICAgdmFyIHBhZCA9IHBhcnNlci5wb3NpdGlvbiAtIHBhcnNlci5zdGFydFRhZ1Bvc2l0aW9uXG4gICAgICAgICAgICBjID0gbmV3IEFycmF5KHBhZCkuam9pbihcIiBcIikgKyBjXG4gICAgICAgICAgfVxuICAgICAgICAgIHBhcnNlci50ZXh0Tm9kZSArPSBcIjxcIiArIGNcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlRFWFRcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLlNHTUxfREVDTDpcbiAgICAgICAgaWYgKChwYXJzZXIuc2dtbERlY2wrYykudG9VcHBlckNhc2UoKSA9PT0gQ0RBVEEpIHtcbiAgICAgICAgICBlbWl0Tm9kZShwYXJzZXIsIFwib25vcGVuY2RhdGFcIilcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkNEQVRBXG4gICAgICAgICAgcGFyc2VyLnNnbWxEZWNsID0gXCJcIlxuICAgICAgICAgIHBhcnNlci5jZGF0YSA9IFwiXCJcbiAgICAgICAgfSBlbHNlIGlmIChwYXJzZXIuc2dtbERlY2wrYyA9PT0gXCItLVwiKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5DT01NRU5UXG4gICAgICAgICAgcGFyc2VyLmNvbW1lbnQgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnNnbWxEZWNsID0gXCJcIlxuICAgICAgICB9IGVsc2UgaWYgKChwYXJzZXIuc2dtbERlY2wrYykudG9VcHBlckNhc2UoKSA9PT0gRE9DVFlQRSkge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuRE9DVFlQRVxuICAgICAgICAgIGlmIChwYXJzZXIuZG9jdHlwZSB8fCBwYXJzZXIuc2F3Um9vdCkgc3RyaWN0RmFpbChwYXJzZXIsXG4gICAgICAgICAgICBcIkluYXBwcm9wcmlhdGVseSBsb2NhdGVkIGRvY3R5cGUgZGVjbGFyYXRpb25cIilcbiAgICAgICAgICBwYXJzZXIuZG9jdHlwZSA9IFwiXCJcbiAgICAgICAgICBwYXJzZXIuc2dtbERlY2wgPSBcIlwiXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gXCI+XCIpIHtcbiAgICAgICAgICBlbWl0Tm9kZShwYXJzZXIsIFwib25zZ21sZGVjbGFyYXRpb25cIiwgcGFyc2VyLnNnbWxEZWNsKVxuICAgICAgICAgIHBhcnNlci5zZ21sRGVjbCA9IFwiXCJcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlRFWFRcbiAgICAgICAgfSBlbHNlIGlmIChpcyhxdW90ZSwgYykpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlNHTUxfREVDTF9RVU9URURcbiAgICAgICAgICBwYXJzZXIuc2dtbERlY2wgKz0gY1xuICAgICAgICB9IGVsc2UgcGFyc2VyLnNnbWxEZWNsICs9IGNcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5TR01MX0RFQ0xfUVVPVEVEOlxuICAgICAgICBpZiAoYyA9PT0gcGFyc2VyLnEpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlNHTUxfREVDTFxuICAgICAgICAgIHBhcnNlci5xID0gXCJcIlxuICAgICAgICB9XG4gICAgICAgIHBhcnNlci5zZ21sRGVjbCArPSBjXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuRE9DVFlQRTpcbiAgICAgICAgaWYgKGMgPT09IFwiPlwiKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgICAgICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uZG9jdHlwZVwiLCBwYXJzZXIuZG9jdHlwZSlcbiAgICAgICAgICBwYXJzZXIuZG9jdHlwZSA9IHRydWUgLy8ganVzdCByZW1lbWJlciB0aGF0IHdlIHNhdyBpdC5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJzZXIuZG9jdHlwZSArPSBjXG4gICAgICAgICAgaWYgKGMgPT09IFwiW1wiKSBwYXJzZXIuc3RhdGUgPSBTLkRPQ1RZUEVfRFREXG4gICAgICAgICAgZWxzZSBpZiAoaXMocXVvdGUsIGMpKSB7XG4gICAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkRPQ1RZUEVfUVVPVEVEXG4gICAgICAgICAgICBwYXJzZXIucSA9IGNcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5ET0NUWVBFX1FVT1RFRDpcbiAgICAgICAgcGFyc2VyLmRvY3R5cGUgKz0gY1xuICAgICAgICBpZiAoYyA9PT0gcGFyc2VyLnEpIHtcbiAgICAgICAgICBwYXJzZXIucSA9IFwiXCJcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkRPQ1RZUEVcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkRPQ1RZUEVfRFREOlxuICAgICAgICBwYXJzZXIuZG9jdHlwZSArPSBjXG4gICAgICAgIGlmIChjID09PSBcIl1cIikgcGFyc2VyLnN0YXRlID0gUy5ET0NUWVBFXG4gICAgICAgIGVsc2UgaWYgKGlzKHF1b3RlLGMpKSB7XG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5ET0NUWVBFX0RURF9RVU9URURcbiAgICAgICAgICBwYXJzZXIucSA9IGNcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkRPQ1RZUEVfRFREX1FVT1RFRDpcbiAgICAgICAgcGFyc2VyLmRvY3R5cGUgKz0gY1xuICAgICAgICBpZiAoYyA9PT0gcGFyc2VyLnEpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkRPQ1RZUEVfRFREXG4gICAgICAgICAgcGFyc2VyLnEgPSBcIlwiXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5DT01NRU5UOlxuICAgICAgICBpZiAoYyA9PT0gXCItXCIpIHBhcnNlci5zdGF0ZSA9IFMuQ09NTUVOVF9FTkRJTkdcbiAgICAgICAgZWxzZSBwYXJzZXIuY29tbWVudCArPSBjXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQ09NTUVOVF9FTkRJTkc6XG4gICAgICAgIGlmIChjID09PSBcIi1cIikge1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQ09NTUVOVF9FTkRFRFxuICAgICAgICAgIHBhcnNlci5jb21tZW50ID0gdGV4dG9wdHMocGFyc2VyLm9wdCwgcGFyc2VyLmNvbW1lbnQpXG4gICAgICAgICAgaWYgKHBhcnNlci5jb21tZW50KSBlbWl0Tm9kZShwYXJzZXIsIFwib25jb21tZW50XCIsIHBhcnNlci5jb21tZW50KVxuICAgICAgICAgIHBhcnNlci5jb21tZW50ID0gXCJcIlxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnNlci5jb21tZW50ICs9IFwiLVwiICsgY1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQ09NTUVOVFxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQ09NTUVOVF9FTkRFRDpcbiAgICAgICAgaWYgKGMgIT09IFwiPlwiKSB7XG4gICAgICAgICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiTWFsZm9ybWVkIGNvbW1lbnRcIilcbiAgICAgICAgICAvLyBhbGxvdyA8IS0tIGJsYWggLS0gYmxvbyAtLT4gaW4gbm9uLXN0cmljdCBtb2RlLFxuICAgICAgICAgIC8vIHdoaWNoIGlzIGEgY29tbWVudCBvZiBcIiBibGFoIC0tIGJsb28gXCJcbiAgICAgICAgICBwYXJzZXIuY29tbWVudCArPSBcIi0tXCIgKyBjXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5DT01NRU5UXG4gICAgICAgIH0gZWxzZSBwYXJzZXIuc3RhdGUgPSBTLlRFWFRcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5DREFUQTpcbiAgICAgICAgaWYgKGMgPT09IFwiXVwiKSBwYXJzZXIuc3RhdGUgPSBTLkNEQVRBX0VORElOR1xuICAgICAgICBlbHNlIHBhcnNlci5jZGF0YSArPSBjXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQ0RBVEFfRU5ESU5HOlxuICAgICAgICBpZiAoYyA9PT0gXCJdXCIpIHBhcnNlci5zdGF0ZSA9IFMuQ0RBVEFfRU5ESU5HXzJcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgcGFyc2VyLmNkYXRhICs9IFwiXVwiICsgY1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQ0RBVEFcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkNEQVRBX0VORElOR18yOlxuICAgICAgICBpZiAoYyA9PT0gXCI+XCIpIHtcbiAgICAgICAgICBpZiAocGFyc2VyLmNkYXRhKSBlbWl0Tm9kZShwYXJzZXIsIFwib25jZGF0YVwiLCBwYXJzZXIuY2RhdGEpXG4gICAgICAgICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uY2xvc2VjZGF0YVwiKVxuICAgICAgICAgIHBhcnNlci5jZGF0YSA9IFwiXCJcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlRFWFRcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSBcIl1cIikge1xuICAgICAgICAgIHBhcnNlci5jZGF0YSArPSBcIl1cIlxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnNlci5jZGF0YSArPSBcIl1dXCIgKyBjXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5DREFUQVxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuUFJPQ19JTlNUOlxuICAgICAgICBpZiAoYyA9PT0gXCI/XCIpIHBhcnNlci5zdGF0ZSA9IFMuUFJPQ19JTlNUX0VORElOR1xuICAgICAgICBlbHNlIGlmIChpcyh3aGl0ZXNwYWNlLCBjKSkgcGFyc2VyLnN0YXRlID0gUy5QUk9DX0lOU1RfQk9EWVxuICAgICAgICBlbHNlIHBhcnNlci5wcm9jSW5zdE5hbWUgKz0gY1xuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLlBST0NfSU5TVF9CT0RZOlxuICAgICAgICBpZiAoIXBhcnNlci5wcm9jSW5zdEJvZHkgJiYgaXMod2hpdGVzcGFjZSwgYykpIGNvbnRpbnVlXG4gICAgICAgIGVsc2UgaWYgKGMgPT09IFwiP1wiKSBwYXJzZXIuc3RhdGUgPSBTLlBST0NfSU5TVF9FTkRJTkdcbiAgICAgICAgZWxzZSBwYXJzZXIucHJvY0luc3RCb2R5ICs9IGNcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5QUk9DX0lOU1RfRU5ESU5HOlxuICAgICAgICBpZiAoYyA9PT0gXCI+XCIpIHtcbiAgICAgICAgICBlbWl0Tm9kZShwYXJzZXIsIFwib25wcm9jZXNzaW5naW5zdHJ1Y3Rpb25cIiwge1xuICAgICAgICAgICAgbmFtZSA6IHBhcnNlci5wcm9jSW5zdE5hbWUsXG4gICAgICAgICAgICBib2R5IDogcGFyc2VyLnByb2NJbnN0Qm9keVxuICAgICAgICAgIH0pXG4gICAgICAgICAgcGFyc2VyLnByb2NJbnN0TmFtZSA9IHBhcnNlci5wcm9jSW5zdEJvZHkgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5URVhUXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyc2VyLnByb2NJbnN0Qm9keSArPSBcIj9cIiArIGNcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlBST0NfSU5TVF9CT0RZXG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5PUEVOX1RBRzpcbiAgICAgICAgaWYgKGlzKG5hbWVCb2R5LCBjKSkgcGFyc2VyLnRhZ05hbWUgKz0gY1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBuZXdUYWcocGFyc2VyKVxuICAgICAgICAgIGlmIChjID09PSBcIj5cIikgb3BlblRhZyhwYXJzZXIpXG4gICAgICAgICAgZWxzZSBpZiAoYyA9PT0gXCIvXCIpIHBhcnNlci5zdGF0ZSA9IFMuT1BFTl9UQUdfU0xBU0hcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGlmIChub3Qod2hpdGVzcGFjZSwgYykpIHN0cmljdEZhaWwoXG4gICAgICAgICAgICAgIHBhcnNlciwgXCJJbnZhbGlkIGNoYXJhY3RlciBpbiB0YWcgbmFtZVwiKVxuICAgICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5PUEVOX1RBR19TTEFTSDpcbiAgICAgICAgaWYgKGMgPT09IFwiPlwiKSB7XG4gICAgICAgICAgb3BlblRhZyhwYXJzZXIsIHRydWUpXG4gICAgICAgICAgY2xvc2VUYWcocGFyc2VyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIkZvcndhcmQtc2xhc2ggaW4gb3BlbmluZyB0YWcgbm90IGZvbGxvd2VkIGJ5ID5cIilcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQlxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQVRUUklCOlxuICAgICAgICAvLyBoYXZlbid0IHJlYWQgdGhlIGF0dHJpYnV0ZSBuYW1lIHlldC5cbiAgICAgICAgaWYgKGlzKHdoaXRlc3BhY2UsIGMpKSBjb250aW51ZVxuICAgICAgICBlbHNlIGlmIChjID09PSBcIj5cIikgb3BlblRhZyhwYXJzZXIpXG4gICAgICAgIGVsc2UgaWYgKGMgPT09IFwiL1wiKSBwYXJzZXIuc3RhdGUgPSBTLk9QRU5fVEFHX1NMQVNIXG4gICAgICAgIGVsc2UgaWYgKGlzKG5hbWVTdGFydCwgYykpIHtcbiAgICAgICAgICBwYXJzZXIuYXR0cmliTmFtZSA9IGNcbiAgICAgICAgICBwYXJzZXIuYXR0cmliVmFsdWUgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJfTkFNRVxuICAgICAgICB9IGVsc2Ugc3RyaWN0RmFpbChwYXJzZXIsIFwiSW52YWxpZCBhdHRyaWJ1dGUgbmFtZVwiKVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkFUVFJJQl9OQU1FOlxuICAgICAgICBpZiAoYyA9PT0gXCI9XCIpIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCX1ZBTFVFXG4gICAgICAgIGVsc2UgaWYgKGMgPT09IFwiPlwiKSB7XG4gICAgICAgICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiQXR0cmlidXRlIHdpdGhvdXQgdmFsdWVcIilcbiAgICAgICAgICBwYXJzZXIuYXR0cmliVmFsdWUgPSBwYXJzZXIuYXR0cmliTmFtZVxuICAgICAgICAgIGF0dHJpYihwYXJzZXIpXG4gICAgICAgICAgb3BlblRhZyhwYXJzZXIpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXMod2hpdGVzcGFjZSwgYykpIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCX05BTUVfU0FXX1dISVRFXG4gICAgICAgIGVsc2UgaWYgKGlzKG5hbWVCb2R5LCBjKSkgcGFyc2VyLmF0dHJpYk5hbWUgKz0gY1xuICAgICAgICBlbHNlIHN0cmljdEZhaWwocGFyc2VyLCBcIkludmFsaWQgYXR0cmlidXRlIG5hbWVcIilcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5BVFRSSUJfTkFNRV9TQVdfV0hJVEU6XG4gICAgICAgIGlmIChjID09PSBcIj1cIikgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJfVkFMVUVcbiAgICAgICAgZWxzZSBpZiAoaXMod2hpdGVzcGFjZSwgYykpIGNvbnRpbnVlXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIkF0dHJpYnV0ZSB3aXRob3V0IHZhbHVlXCIpXG4gICAgICAgICAgcGFyc2VyLnRhZy5hdHRyaWJ1dGVzW3BhcnNlci5hdHRyaWJOYW1lXSA9IFwiXCJcbiAgICAgICAgICBwYXJzZXIuYXR0cmliVmFsdWUgPSBcIlwiXG4gICAgICAgICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uYXR0cmlidXRlXCIsXG4gICAgICAgICAgICAgICAgICAgeyBuYW1lIDogcGFyc2VyLmF0dHJpYk5hbWUsIHZhbHVlIDogXCJcIiB9KVxuICAgICAgICAgIHBhcnNlci5hdHRyaWJOYW1lID0gXCJcIlxuICAgICAgICAgIGlmIChjID09PSBcIj5cIikgb3BlblRhZyhwYXJzZXIpXG4gICAgICAgICAgZWxzZSBpZiAoaXMobmFtZVN0YXJ0LCBjKSkge1xuICAgICAgICAgICAgcGFyc2VyLmF0dHJpYk5hbWUgPSBjXG4gICAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQl9OQU1FXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIkludmFsaWQgYXR0cmlidXRlIG5hbWVcIilcbiAgICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQVRUUklCX1ZBTFVFOlxuICAgICAgICBpZiAoaXMod2hpdGVzcGFjZSwgYykpIGNvbnRpbnVlXG4gICAgICAgIGVsc2UgaWYgKGlzKHF1b3RlLCBjKSkge1xuICAgICAgICAgIHBhcnNlci5xID0gY1xuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCX1ZBTFVFX1FVT1RFRFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIlVucXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZVwiKVxuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCX1ZBTFVFX1VOUVVPVEVEXG4gICAgICAgICAgcGFyc2VyLmF0dHJpYlZhbHVlID0gY1xuICAgICAgICB9XG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuQVRUUklCX1ZBTFVFX1FVT1RFRDpcbiAgICAgICAgaWYgKGMgIT09IHBhcnNlci5xKSB7XG4gICAgICAgICAgaWYgKGMgPT09IFwiJlwiKSBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQl9WQUxVRV9FTlRJVFlfUVxuICAgICAgICAgIGVsc2UgcGFyc2VyLmF0dHJpYlZhbHVlICs9IGNcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGF0dHJpYihwYXJzZXIpXG4gICAgICAgIHBhcnNlci5xID0gXCJcIlxuICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQl9WQUxVRV9DTE9TRURcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5BVFRSSUJfVkFMVUVfQ0xPU0VEOlxuICAgICAgICBpZiAoaXMod2hpdGVzcGFjZSwgYykpIHtcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQlxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09IFwiPlwiKSBvcGVuVGFnKHBhcnNlcilcbiAgICAgICAgZWxzZSBpZiAoYyA9PT0gXCIvXCIpIHBhcnNlci5zdGF0ZSA9IFMuT1BFTl9UQUdfU0xBU0hcbiAgICAgICAgZWxzZSBpZiAoaXMobmFtZVN0YXJ0LCBjKSkge1xuICAgICAgICAgIHN0cmljdEZhaWwocGFyc2VyLCBcIk5vIHdoaXRlc3BhY2UgYmV0d2VlbiBhdHRyaWJ1dGVzXCIpXG4gICAgICAgICAgcGFyc2VyLmF0dHJpYk5hbWUgPSBjXG4gICAgICAgICAgcGFyc2VyLmF0dHJpYlZhbHVlID0gXCJcIlxuICAgICAgICAgIHBhcnNlci5zdGF0ZSA9IFMuQVRUUklCX05BTUVcbiAgICAgICAgfSBlbHNlIHN0cmljdEZhaWwocGFyc2VyLCBcIkludmFsaWQgYXR0cmlidXRlIG5hbWVcIilcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5BVFRSSUJfVkFMVUVfVU5RVU9URUQ6XG4gICAgICAgIGlmIChub3QoYXR0cmliRW5kLGMpKSB7XG4gICAgICAgICAgaWYgKGMgPT09IFwiJlwiKSBwYXJzZXIuc3RhdGUgPSBTLkFUVFJJQl9WQUxVRV9FTlRJVFlfVVxuICAgICAgICAgIGVsc2UgcGFyc2VyLmF0dHJpYlZhbHVlICs9IGNcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIGF0dHJpYihwYXJzZXIpXG4gICAgICAgIGlmIChjID09PSBcIj5cIikgb3BlblRhZyhwYXJzZXIpXG4gICAgICAgIGVsc2UgcGFyc2VyLnN0YXRlID0gUy5BVFRSSUJcbiAgICAgIGNvbnRpbnVlXG5cbiAgICAgIGNhc2UgUy5DTE9TRV9UQUc6XG4gICAgICAgIGlmICghcGFyc2VyLnRhZ05hbWUpIHtcbiAgICAgICAgICBpZiAoaXMod2hpdGVzcGFjZSwgYykpIGNvbnRpbnVlXG4gICAgICAgICAgZWxzZSBpZiAobm90KG5hbWVTdGFydCwgYykpIHtcbiAgICAgICAgICAgIGlmIChwYXJzZXIuc2NyaXB0KSB7XG4gICAgICAgICAgICAgIHBhcnNlci5zY3JpcHQgKz0gXCI8L1wiICsgY1xuICAgICAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlNDUklQVFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiSW52YWxpZCB0YWduYW1lIGluIGNsb3NpbmcgdGFnLlwiKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBwYXJzZXIudGFnTmFtZSA9IGNcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjID09PSBcIj5cIikgY2xvc2VUYWcocGFyc2VyKVxuICAgICAgICBlbHNlIGlmIChpcyhuYW1lQm9keSwgYykpIHBhcnNlci50YWdOYW1lICs9IGNcbiAgICAgICAgZWxzZSBpZiAocGFyc2VyLnNjcmlwdCkge1xuICAgICAgICAgIHBhcnNlci5zY3JpcHQgKz0gXCI8L1wiICsgcGFyc2VyLnRhZ05hbWVcbiAgICAgICAgICBwYXJzZXIudGFnTmFtZSA9IFwiXCJcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLlNDUklQVFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChub3Qod2hpdGVzcGFjZSwgYykpIHN0cmljdEZhaWwocGFyc2VyLFxuICAgICAgICAgICAgXCJJbnZhbGlkIHRhZ25hbWUgaW4gY2xvc2luZyB0YWdcIilcbiAgICAgICAgICBwYXJzZXIuc3RhdGUgPSBTLkNMT1NFX1RBR19TQVdfV0hJVEVcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgY2FzZSBTLkNMT1NFX1RBR19TQVdfV0hJVEU6XG4gICAgICAgIGlmIChpcyh3aGl0ZXNwYWNlLCBjKSkgY29udGludWVcbiAgICAgICAgaWYgKGMgPT09IFwiPlwiKSBjbG9zZVRhZyhwYXJzZXIpXG4gICAgICAgIGVsc2Ugc3RyaWN0RmFpbChwYXJzZXIsIFwiSW52YWxpZCBjaGFyYWN0ZXJzIGluIGNsb3NpbmcgdGFnXCIpXG4gICAgICBjb250aW51ZVxuXG4gICAgICBjYXNlIFMuVEVYVF9FTlRJVFk6XG4gICAgICBjYXNlIFMuQVRUUklCX1ZBTFVFX0VOVElUWV9ROlxuICAgICAgY2FzZSBTLkFUVFJJQl9WQUxVRV9FTlRJVFlfVTpcbiAgICAgICAgc3dpdGNoKHBhcnNlci5zdGF0ZSkge1xuICAgICAgICAgIGNhc2UgUy5URVhUX0VOVElUWTpcbiAgICAgICAgICAgIHZhciByZXR1cm5TdGF0ZSA9IFMuVEVYVCwgYnVmZmVyID0gXCJ0ZXh0Tm9kZVwiXG4gICAgICAgICAgYnJlYWtcblxuICAgICAgICAgIGNhc2UgUy5BVFRSSUJfVkFMVUVfRU5USVRZX1E6XG4gICAgICAgICAgICB2YXIgcmV0dXJuU3RhdGUgPSBTLkFUVFJJQl9WQUxVRV9RVU9URUQsIGJ1ZmZlciA9IFwiYXR0cmliVmFsdWVcIlxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgICBjYXNlIFMuQVRUUklCX1ZBTFVFX0VOVElUWV9VOlxuICAgICAgICAgICAgdmFyIHJldHVyblN0YXRlID0gUy5BVFRSSUJfVkFMVUVfVU5RVU9URUQsIGJ1ZmZlciA9IFwiYXR0cmliVmFsdWVcIlxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGMgPT09IFwiO1wiKSB7XG4gICAgICAgICAgcGFyc2VyW2J1ZmZlcl0gKz0gcGFyc2VFbnRpdHkocGFyc2VyKVxuICAgICAgICAgIHBhcnNlci5lbnRpdHkgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gcmV0dXJuU3RhdGVcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpcyhlbnRpdHksIGMpKSBwYXJzZXIuZW50aXR5ICs9IGNcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgc3RyaWN0RmFpbChwYXJzZXIsIFwiSW52YWxpZCBjaGFyYWN0ZXIgZW50aXR5XCIpXG4gICAgICAgICAgcGFyc2VyW2J1ZmZlcl0gKz0gXCImXCIgKyBwYXJzZXIuZW50aXR5ICsgY1xuICAgICAgICAgIHBhcnNlci5lbnRpdHkgPSBcIlwiXG4gICAgICAgICAgcGFyc2VyLnN0YXRlID0gcmV0dXJuU3RhdGVcbiAgICAgICAgfVxuICAgICAgY29udGludWVcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKHBhcnNlciwgXCJVbmtub3duIHN0YXRlOiBcIiArIHBhcnNlci5zdGF0ZSlcbiAgICB9XG4gIH0gLy8gd2hpbGVcbiAgLy8gY2RhdGEgYmxvY2tzIGNhbiBnZXQgdmVyeSBiaWcgdW5kZXIgbm9ybWFsIGNvbmRpdGlvbnMuIGVtaXQgYW5kIG1vdmUgb24uXG4gIC8vIGlmIChwYXJzZXIuc3RhdGUgPT09IFMuQ0RBVEEgJiYgcGFyc2VyLmNkYXRhKSB7XG4gIC8vICAgZW1pdE5vZGUocGFyc2VyLCBcIm9uY2RhdGFcIiwgcGFyc2VyLmNkYXRhKVxuICAvLyAgIHBhcnNlci5jZGF0YSA9IFwiXCJcbiAgLy8gfVxuICBpZiAocGFyc2VyLnBvc2l0aW9uID49IHBhcnNlci5idWZmZXJDaGVja1Bvc2l0aW9uKSBjaGVja0J1ZmZlckxlbmd0aChwYXJzZXIpXG4gIHJldHVybiBwYXJzZXJcbn1cblxuLyohIGh0dHA6Ly9tdGhzLmJlL2Zyb21jb2RlcG9pbnQgdjAuMS4wIGJ5IEBtYXRoaWFzICovXG5pZiAoIVN0cmluZy5mcm9tQ29kZVBvaW50KSB7XG4gICAgICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RyaW5nRnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcbiAgICAgICAgICAgICAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgICAgICAgICAgICAgIHZhciBmcm9tQ29kZVBvaW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgTUFYX1NJWkUgPSAweDQwMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29kZVVuaXRzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGlnaFN1cnJvZ2F0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb3dTdXJyb2dhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvZGVQb2ludCA9IE51bWJlcihhcmd1bWVudHNbaW5kZXhdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICFpc0Zpbml0ZShjb2RlUG9pbnQpIHx8IC8vIGBOYU5gLCBgK0luZmluaXR5YCwgb3IgYC1JbmZpbml0eWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlUG9pbnQgPCAwIHx8IC8vIG5vdCBhIHZhbGlkIFVuaWNvZGUgY29kZSBwb2ludFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGVQb2ludCA+IDB4MTBGRkZGIHx8IC8vIG5vdCBhIHZhbGlkIFVuaWNvZGUgY29kZSBwb2ludFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb29yKGNvZGVQb2ludCkgIT0gY29kZVBvaW50IC8vIG5vdCBhbiBpbnRlZ2VyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IFJhbmdlRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludDogJyArIGNvZGVQb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGVQb2ludCA8PSAweEZGRkYpIHsgLy8gQk1QIGNvZGUgcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlVW5pdHMucHVzaChjb2RlUG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyBBc3RyYWwgY29kZSBwb2ludDsgc3BsaXQgaW4gc3Vycm9nYXRlIGhhbHZlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmcjc3Vycm9nYXRlLWZvcm11bGFlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZVBvaW50IC09IDB4MTAwMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlnaFN1cnJvZ2F0ZSA9IChjb2RlUG9pbnQgPj4gMTApICsgMHhEODAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvd1N1cnJvZ2F0ZSA9IChjb2RlUG9pbnQgJSAweDQwMCkgKyAweERDMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZVVuaXRzLnB1c2goaGlnaFN1cnJvZ2F0ZSwgbG93U3Vycm9nYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggKyAxID09IGxlbmd0aCB8fCBjb2RlVW5pdHMubGVuZ3RoID4gTUFYX1NJWkUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGNvZGVVbml0cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZVVuaXRzLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU3RyaW5nLCAnZnJvbUNvZGVQb2ludCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3ZhbHVlJzogZnJvbUNvZGVQb2ludCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbmZpZ3VyYWJsZSc6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd3cml0YWJsZSc6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTdHJpbmcuZnJvbUNvZGVQb2ludCA9IGZyb21Db2RlUG9pbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KCkpO1xufVxuXG59KSh0eXBlb2YgZXhwb3J0cyA9PT0gXCJ1bmRlZmluZWRcIiA/IHNheCA9IHt9IDogZXhwb3J0cyk7XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXMtYXJyYXknKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxudmFyIGtNYXhMZW5ndGggPSAweDNmZmZmZmZmXG52YXIgcm9vdFBhcmVudCA9IHt9XG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIE5vdGU6XG4gKlxuICogLSBJbXBsZW1lbnRhdGlvbiBtdXN0IHN1cHBvcnQgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMuXG4gKiAgIEZpcmVmb3ggNC0yOSBsYWNrZWQgc3VwcG9ydCwgZml4ZWQgaW4gRmlyZWZveCAzMCsuXG4gKiAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogIC0gSUUxMCBoYXMgYSBicm9rZW4gYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFycmF5cyBvZlxuICogICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG4gKlxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXkgd2lsbFxuICogZ2V0IHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24sIHdoaWNoIGlzIHNsb3dlciBidXQgd2lsbCB3b3JrIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSAoZnVuY3Rpb24gKCkge1xuICB0cnkge1xuICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIDQyID09PSBhcnIuZm9vKCkgJiYgLy8gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgbmV3IFVpbnQ4QXJyYXkoMSkuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gc3ViamVjdCA+IDAgPyBzdWJqZWN0ID4+PiAwIDogMFxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnICYmIHN1YmplY3QgIT09IG51bGwpIHsgLy8gYXNzdW1lIG9iamVjdCBpcyBhcnJheS1saWtlXG4gICAgaWYgKHN1YmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShzdWJqZWN0LmRhdGEpKVxuICAgICAgc3ViamVjdCA9IHN1YmplY3QuZGF0YVxuICAgIGxlbmd0aCA9ICtzdWJqZWN0Lmxlbmd0aCA+IDAgPyBNYXRoLmZsb29yKCtzdWJqZWN0Lmxlbmd0aCkgOiAwXG4gIH0gZWxzZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4ga01heExlbmd0aClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICdzaXplOiAweCcgKyBrTWF4TGVuZ3RoLnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBzdWJqZWN0LmJ5dGVMZW5ndGggPT09ICdudW1iZXInKSB7XG4gICAgLy8gU3BlZWQgb3B0aW1pemF0aW9uIC0tIHVzZSBzZXQgaWYgd2UncmUgY29weWluZyBmcm9tIGEgdHlwZWQgYXJyYXlcbiAgICBidWYuX3NldChzdWJqZWN0KVxuICB9IGVsc2UgaWYgKGlzQXJyYXlpc2goc3ViamVjdCkpIHtcbiAgICAvLyBUcmVhdCBhcnJheS1pc2ggb2JqZWN0cyBhcyBhIGJ5dGUgYXJyYXlcbiAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspXG4gICAgICAgIGJ1ZltpXSA9IHN1YmplY3QucmVhZFVJbnQ4KGkpXG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgYnVmW2ldID0gKChzdWJqZWN0W2ldICUgMjU2KSArIDI1NikgJSAyNTZcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBidWYud3JpdGUoc3ViamVjdCwgMCwgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICBpZiAobGVuZ3RoID4gMCAmJiBsZW5ndGggPD0gQnVmZmVyLnBvb2xTaXplKVxuICAgIGJ1Zi5wYXJlbnQgPSByb290UGFyZW50XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNsb3dCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG4gIGRlbGV0ZSBidWYucGFyZW50XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW4gJiYgYVtpXSA9PT0gYltpXTsgaSsrKSB7fVxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0WywgbGVuZ3RoXSknKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKHRvdGFsTGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICB0b3RhbExlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxMZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggPj4+IDFcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbi8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcblxuLy8gdG9TdHJpbmcoZW5jb2RpbmcsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKVxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpXG4gICAgICBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpXG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChzdHJMZW4gJSAyICE9PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihieXRlKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gdXRmMTZsZVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aCwgMilcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG5cbiAgaWYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignYXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKTtcblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IGJpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gdXRmMTZsZVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlbjtcbiAgICBpZiAoc3RhcnQgPCAwKVxuICAgICAgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApXG4gICAgICBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpXG4gICAgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgaWYgKG5ld0J1Zi5sZW5ndGgpXG4gICAgbmV3QnVmLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IHRoaXNcblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKVxuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsO1xuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpXG4gICAgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpXG4gICAgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpXG4gICAgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KVxuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdidWZmZXIgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpLCAwKVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpXG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgPj4+IDAgJiAweEZGXG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSA+Pj4gMCAmIDB4RkZcblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuZnVuY3Rpb24gb2JqZWN0V3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuKSB7XG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSB2YWx1ZVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSW50KHRoaXMsXG4gICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgICAgIGJ5dGVMZW5ndGgsXG4gICAgICAgICAgICAgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKSAtIDEsXG4gICAgICAgICAgICAgLU1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSkpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSlcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJbnQodGhpcyxcbiAgICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgICAgYnl0ZUxlbmd0aCxcbiAgICAgICAgICAgICBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpIC0gMSxcbiAgICAgICAgICAgICAtTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKSlcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB9IGVsc2Ugb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydClcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRfc3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0X3N0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0X3N0YXJ0IDwgMClcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gc291cmNlLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgfVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuY29uc3RydWN0b3IgPSBCdWZmZXJcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmVxdWFscyA9IEJQLmVxdWFsc1xuICBhcnIuY29tcGFyZSA9IEJQLmNvbXBhcmVcbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludExFID0gQlAucmVhZFVJbnRMRVxuICBhcnIucmVhZFVJbnRCRSA9IEJQLnJlYWRVSW50QkVcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50TEUgPSBCUC5yZWFkSW50TEVcbiAgYXJyLnJlYWRJbnRCRSA9IEJQLnJlYWRJbnRCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnRMRSA9IEJQLndyaXRlVUludExFXG4gIGFyci53cml0ZVVJbnRCRSA9IEJQLndyaXRlVUludEJFXG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnRMRSA9IEJQLndyaXRlSW50TEVcbiAgYXJyLndyaXRlSW50QkUgPSBCUC53cml0ZUludEJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtelxcLV0vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gaXNBcnJheWlzaCAoc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMoc3RyaW5nLCB1bml0cykge1xuICB2YXIgY29kZVBvaW50LCBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBieXRlcyA9IFtdXG4gIHZhciBpID0gMFxuXG4gIGZvciAoOyBpPGxlbmd0aDsgaSsrKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuXG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKGxlYWRTdXJyb2dhdGUpIHtcblxuICAgICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNvZGVQb2ludCA9IGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDAgfCAweDEwMDAwXG4gICAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgZWxzZSB7XG5cbiAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgIGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgICB9XG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH1cbiAgICBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgICk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgICk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MjAwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcblxuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoLCB1bml0U2l6ZSkge1xuICBpZiAodW5pdFNpemUpIGxlbmd0aCAtPSBsZW5ndGggJSB1bml0U2l6ZTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG4iLCJ2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXHR2YXIgUExVU19VUkxfU0FGRSA9ICctJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSF9VUkxfU0FGRSA9ICdfJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMgfHxcblx0XHQgICAgY29kZSA9PT0gUExVU19VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0ggfHxcblx0XHQgICAgY29kZSA9PT0gU0xBU0hfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhbk11dGF0aW9uT2JzZXJ2ZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuXG4gICAgaWYgKGNhbk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgdmFyIGhpZGRlbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxdWV1ZUxpc3QgPSBxdWV1ZS5zbGljZSgpO1xuICAgICAgICAgICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHF1ZXVlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShoaWRkZW5EaXYsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaGlkZGVuRGl2LnNldEF0dHJpYnV0ZSgneWVzJywgJ25vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi9fc3RyZWFtX2R1cGxleC5qc1wiKVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIGEgZHVwbGV4IHN0cmVhbSBpcyBqdXN0IGEgc3RyZWFtIHRoYXQgaXMgYm90aCByZWFkYWJsZSBhbmQgd3JpdGFibGUuXG4vLyBTaW5jZSBKUyBkb2Vzbid0IGhhdmUgbXVsdGlwbGUgcHJvdG90eXBhbCBpbmhlcml0YW5jZSwgdGhpcyBjbGFzc1xuLy8gcHJvdG90eXBhbGx5IGluaGVyaXRzIGZyb20gUmVhZGFibGUsIGFuZCB0aGVuIHBhcmFzaXRpY2FsbHkgZnJvbVxuLy8gV3JpdGFibGUuXG5cbm1vZHVsZS5leHBvcnRzID0gRHVwbGV4O1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIGtleXMucHVzaChrZXkpO1xuICByZXR1cm4ga2V5cztcbn1cbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFJlYWRhYmxlID0gcmVxdWlyZSgnLi9fc3RyZWFtX3JlYWRhYmxlJyk7XG52YXIgV3JpdGFibGUgPSByZXF1aXJlKCcuL19zdHJlYW1fd3JpdGFibGUnKTtcblxudXRpbC5pbmhlcml0cyhEdXBsZXgsIFJlYWRhYmxlKTtcblxuZm9yRWFjaChvYmplY3RLZXlzKFdyaXRhYmxlLnByb3RvdHlwZSksIGZ1bmN0aW9uKG1ldGhvZCkge1xuICBpZiAoIUR1cGxleC5wcm90b3R5cGVbbWV0aG9kXSlcbiAgICBEdXBsZXgucHJvdG90eXBlW21ldGhvZF0gPSBXcml0YWJsZS5wcm90b3R5cGVbbWV0aG9kXTtcbn0pO1xuXG5mdW5jdGlvbiBEdXBsZXgob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSlcbiAgICByZXR1cm4gbmV3IER1cGxleChvcHRpb25zKTtcblxuICBSZWFkYWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICBXcml0YWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMucmVhZGFibGUgPT09IGZhbHNlKVxuICAgIHRoaXMucmVhZGFibGUgPSBmYWxzZTtcblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLndyaXRhYmxlID09PSBmYWxzZSlcbiAgICB0aGlzLndyaXRhYmxlID0gZmFsc2U7XG5cbiAgdGhpcy5hbGxvd0hhbGZPcGVuID0gdHJ1ZTtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5hbGxvd0hhbGZPcGVuID09PSBmYWxzZSlcbiAgICB0aGlzLmFsbG93SGFsZk9wZW4gPSBmYWxzZTtcblxuICB0aGlzLm9uY2UoJ2VuZCcsIG9uZW5kKTtcbn1cblxuLy8gdGhlIG5vLWhhbGYtb3BlbiBlbmZvcmNlclxuZnVuY3Rpb24gb25lbmQoKSB7XG4gIC8vIGlmIHdlIGFsbG93IGhhbGYtb3BlbiBzdGF0ZSwgb3IgaWYgdGhlIHdyaXRhYmxlIHNpZGUgZW5kZWQsXG4gIC8vIHRoZW4gd2UncmUgb2suXG4gIGlmICh0aGlzLmFsbG93SGFsZk9wZW4gfHwgdGhpcy5fd3JpdGFibGVTdGF0ZS5lbmRlZClcbiAgICByZXR1cm47XG5cbiAgLy8gbm8gbW9yZSBkYXRhIGNhbiBiZSB3cml0dGVuLlxuICAvLyBCdXQgYWxsb3cgbW9yZSB3cml0ZXMgdG8gaGFwcGVuIGluIHRoaXMgdGljay5cbiAgcHJvY2Vzcy5uZXh0VGljayh0aGlzLmVuZC5iaW5kKHRoaXMpKTtcbn1cblxuZnVuY3Rpb24gZm9yRWFjaCAoeHMsIGYpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmKHhzW2ldLCBpKTtcbiAgfVxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIGEgcGFzc3Rocm91Z2ggc3RyZWFtLlxuLy8gYmFzaWNhbGx5IGp1c3QgdGhlIG1vc3QgbWluaW1hbCBzb3J0IG9mIFRyYW5zZm9ybSBzdHJlYW0uXG4vLyBFdmVyeSB3cml0dGVuIGNodW5rIGdldHMgb3V0cHV0IGFzLWlzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhc3NUaHJvdWdoO1xuXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9fc3RyZWFtX3RyYW5zZm9ybScpO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnV0aWwuaW5oZXJpdHMoUGFzc1Rocm91Z2gsIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIFBhc3NUaHJvdWdoKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBhc3NUaHJvdWdoKSlcbiAgICByZXR1cm4gbmV3IFBhc3NUaHJvdWdoKG9wdGlvbnMpO1xuXG4gIFRyYW5zZm9ybS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5QYXNzVGhyb3VnaC5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2IobnVsbCwgY2h1bmspO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRhYmxlO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpc2FycmF5Jyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5SZWFkYWJsZS5SZWFkYWJsZVN0YXRlID0gUmVhZGFibGVTdGF0ZTtcblxudmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xuaWYgKCFFRS5saXN0ZW5lckNvdW50KSBFRS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICByZXR1cm4gZW1pdHRlci5saXN0ZW5lcnModHlwZSkubGVuZ3RoO1xufTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFN0cmluZ0RlY29kZXI7XG5cbnV0aWwuaW5oZXJpdHMoUmVhZGFibGUsIFN0cmVhbSk7XG5cbmZ1bmN0aW9uIFJlYWRhYmxlU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHRoZSBwb2ludCBhdCB3aGljaCBpdCBzdG9wcyBjYWxsaW5nIF9yZWFkKCkgdG8gZmlsbCB0aGUgYnVmZmVyXG4gIC8vIE5vdGU6IDAgaXMgYSB2YWxpZCB2YWx1ZSwgbWVhbnMgXCJkb24ndCBjYWxsIF9yZWFkIHByZWVtcHRpdmVseSBldmVyXCJcbiAgdmFyIGh3bSA9IG9wdGlvbnMuaGlnaFdhdGVyTWFyaztcbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gKGh3bSB8fCBod20gPT09IDApID8gaHdtIDogMTYgKiAxMDI0O1xuXG4gIC8vIGNhc3QgdG8gaW50cy5cbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gfn50aGlzLmhpZ2hXYXRlck1hcms7XG5cbiAgdGhpcy5idWZmZXIgPSBbXTtcbiAgdGhpcy5sZW5ndGggPSAwO1xuICB0aGlzLnBpcGVzID0gbnVsbDtcbiAgdGhpcy5waXBlc0NvdW50ID0gMDtcbiAgdGhpcy5mbG93aW5nID0gZmFsc2U7XG4gIHRoaXMuZW5kZWQgPSBmYWxzZTtcbiAgdGhpcy5lbmRFbWl0dGVkID0gZmFsc2U7XG4gIHRoaXMucmVhZGluZyA9IGZhbHNlO1xuXG4gIC8vIEluIHN0cmVhbXMgdGhhdCBuZXZlciBoYXZlIGFueSBkYXRhLCBhbmQgZG8gcHVzaChudWxsKSByaWdodCBhd2F5LFxuICAvLyB0aGUgY29uc3VtZXIgY2FuIG1pc3MgdGhlICdlbmQnIGV2ZW50IGlmIHRoZXkgZG8gc29tZSBJL08gYmVmb3JlXG4gIC8vIGNvbnN1bWluZyB0aGUgc3RyZWFtLiAgU28sIHdlIGRvbid0IGVtaXQoJ2VuZCcpIHVudGlsIHNvbWUgcmVhZGluZ1xuICAvLyBoYXBwZW5zLlxuICB0aGlzLmNhbGxlZFJlYWQgPSBmYWxzZTtcblxuICAvLyBhIGZsYWcgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIHRoZSBvbndyaXRlIGNiIGlzIGNhbGxlZCBpbW1lZGlhdGVseSxcbiAgLy8gb3Igb24gYSBsYXRlciB0aWNrLiAgV2Ugc2V0IHRoaXMgdG8gdHJ1ZSBhdCBmaXJzdCwgYmVjdWFzZSBhbnlcbiAgLy8gYWN0aW9ucyB0aGF0IHNob3VsZG4ndCBoYXBwZW4gdW50aWwgXCJsYXRlclwiIHNob3VsZCBnZW5lcmFsbHkgYWxzb1xuICAvLyBub3QgaGFwcGVuIGJlZm9yZSB0aGUgZmlyc3Qgd3JpdGUgY2FsbC5cbiAgdGhpcy5zeW5jID0gdHJ1ZTtcblxuICAvLyB3aGVuZXZlciB3ZSByZXR1cm4gbnVsbCwgdGhlbiB3ZSBzZXQgYSBmbGFnIHRvIHNheVxuICAvLyB0aGF0IHdlJ3JlIGF3YWl0aW5nIGEgJ3JlYWRhYmxlJyBldmVudCBlbWlzc2lvbi5cbiAgdGhpcy5uZWVkUmVhZGFibGUgPSBmYWxzZTtcbiAgdGhpcy5lbWl0dGVkUmVhZGFibGUgPSBmYWxzZTtcbiAgdGhpcy5yZWFkYWJsZUxpc3RlbmluZyA9IGZhbHNlO1xuXG5cbiAgLy8gb2JqZWN0IHN0cmVhbSBmbGFnLiBVc2VkIHRvIG1ha2UgcmVhZChuKSBpZ25vcmUgbiBhbmQgdG9cbiAgLy8gbWFrZSBhbGwgdGhlIGJ1ZmZlciBtZXJnaW5nIGFuZCBsZW5ndGggY2hlY2tzIGdvIGF3YXlcbiAgdGhpcy5vYmplY3RNb2RlID0gISFvcHRpb25zLm9iamVjdE1vZGU7XG5cbiAgLy8gQ3J5cHRvIGlzIGtpbmQgb2Ygb2xkIGFuZCBjcnVzdHkuICBIaXN0b3JpY2FsbHksIGl0cyBkZWZhdWx0IHN0cmluZ1xuICAvLyBlbmNvZGluZyBpcyAnYmluYXJ5JyBzbyB3ZSBoYXZlIHRvIG1ha2UgdGhpcyBjb25maWd1cmFibGUuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpbiB0aGUgdW5pdmVyc2UgdXNlcyAndXRmOCcsIHRob3VnaC5cbiAgdGhpcy5kZWZhdWx0RW5jb2RpbmcgPSBvcHRpb25zLmRlZmF1bHRFbmNvZGluZyB8fCAndXRmOCc7XG5cbiAgLy8gd2hlbiBwaXBpbmcsIHdlIG9ubHkgY2FyZSBhYm91dCAncmVhZGFibGUnIGV2ZW50cyB0aGF0IGhhcHBlblxuICAvLyBhZnRlciByZWFkKClpbmcgYWxsIHRoZSBieXRlcyBhbmQgbm90IGdldHRpbmcgYW55IHB1c2hiYWNrLlxuICB0aGlzLnJhbk91dCA9IGZhbHNlO1xuXG4gIC8vIHRoZSBudW1iZXIgb2Ygd3JpdGVycyB0aGF0IGFyZSBhd2FpdGluZyBhIGRyYWluIGV2ZW50IGluIC5waXBlKClzXG4gIHRoaXMuYXdhaXREcmFpbiA9IDA7XG5cbiAgLy8gaWYgdHJ1ZSwgYSBtYXliZVJlYWRNb3JlIGhhcyBiZWVuIHNjaGVkdWxlZFxuICB0aGlzLnJlYWRpbmdNb3JlID0gZmFsc2U7XG5cbiAgdGhpcy5kZWNvZGVyID0gbnVsbDtcbiAgdGhpcy5lbmNvZGluZyA9IG51bGw7XG4gIGlmIChvcHRpb25zLmVuY29kaW5nKSB7XG4gICAgaWYgKCFTdHJpbmdEZWNvZGVyKVxuICAgICAgU3RyaW5nRGVjb2RlciA9IHJlcXVpcmUoJ3N0cmluZ19kZWNvZGVyLycpLlN0cmluZ0RlY29kZXI7XG4gICAgdGhpcy5kZWNvZGVyID0gbmV3IFN0cmluZ0RlY29kZXIob3B0aW9ucy5lbmNvZGluZyk7XG4gICAgdGhpcy5lbmNvZGluZyA9IG9wdGlvbnMuZW5jb2Rpbmc7XG4gIH1cbn1cblxuZnVuY3Rpb24gUmVhZGFibGUob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVhZGFibGUpKVxuICAgIHJldHVybiBuZXcgUmVhZGFibGUob3B0aW9ucyk7XG5cbiAgdGhpcy5fcmVhZGFibGVTdGF0ZSA9IG5ldyBSZWFkYWJsZVN0YXRlKG9wdGlvbnMsIHRoaXMpO1xuXG4gIC8vIGxlZ2FjeVxuICB0aGlzLnJlYWRhYmxlID0gdHJ1ZTtcblxuICBTdHJlYW0uY2FsbCh0aGlzKTtcbn1cblxuLy8gTWFudWFsbHkgc2hvdmUgc29tZXRoaW5nIGludG8gdGhlIHJlYWQoKSBidWZmZXIuXG4vLyBUaGlzIHJldHVybnMgdHJ1ZSBpZiB0aGUgaGlnaFdhdGVyTWFyayBoYXMgbm90IGJlZW4gaGl0IHlldCxcbi8vIHNpbWlsYXIgdG8gaG93IFdyaXRhYmxlLndyaXRlKCkgcmV0dXJucyB0cnVlIGlmIHlvdSBzaG91bGRcbi8vIHdyaXRlKCkgc29tZSBtb3JlLlxuUmVhZGFibGUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICBpZiAodHlwZW9mIGNodW5rID09PSAnc3RyaW5nJyAmJiAhc3RhdGUub2JqZWN0TW9kZSkge1xuICAgIGVuY29kaW5nID0gZW5jb2RpbmcgfHwgc3RhdGUuZGVmYXVsdEVuY29kaW5nO1xuICAgIGlmIChlbmNvZGluZyAhPT0gc3RhdGUuZW5jb2RpbmcpIHtcbiAgICAgIGNodW5rID0gbmV3IEJ1ZmZlcihjaHVuaywgZW5jb2RpbmcpO1xuICAgICAgZW5jb2RpbmcgPSAnJztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVhZGFibGVBZGRDaHVuayh0aGlzLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBmYWxzZSk7XG59O1xuXG4vLyBVbnNoaWZ0IHNob3VsZCAqYWx3YXlzKiBiZSBzb21ldGhpbmcgZGlyZWN0bHkgb3V0IG9mIHJlYWQoKVxuUmVhZGFibGUucHJvdG90eXBlLnVuc2hpZnQgPSBmdW5jdGlvbihjaHVuaykge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICByZXR1cm4gcmVhZGFibGVBZGRDaHVuayh0aGlzLCBzdGF0ZSwgY2h1bmssICcnLCB0cnVlKTtcbn07XG5cbmZ1bmN0aW9uIHJlYWRhYmxlQWRkQ2h1bmsoc3RyZWFtLCBzdGF0ZSwgY2h1bmssIGVuY29kaW5nLCBhZGRUb0Zyb250KSB7XG4gIHZhciBlciA9IGNodW5rSW52YWxpZChzdGF0ZSwgY2h1bmspO1xuICBpZiAoZXIpIHtcbiAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG4gIH0gZWxzZSBpZiAoY2h1bmsgPT09IG51bGwgfHwgY2h1bmsgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXRlLnJlYWRpbmcgPSBmYWxzZTtcbiAgICBpZiAoIXN0YXRlLmVuZGVkKVxuICAgICAgb25Fb2ZDaHVuayhzdHJlYW0sIHN0YXRlKTtcbiAgfSBlbHNlIGlmIChzdGF0ZS5vYmplY3RNb2RlIHx8IGNodW5rICYmIGNodW5rLmxlbmd0aCA+IDApIHtcbiAgICBpZiAoc3RhdGUuZW5kZWQgJiYgIWFkZFRvRnJvbnQpIHtcbiAgICAgIHZhciBlID0gbmV3IEVycm9yKCdzdHJlYW0ucHVzaCgpIGFmdGVyIEVPRicpO1xuICAgICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZSk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5lbmRFbWl0dGVkICYmIGFkZFRvRnJvbnQpIHtcbiAgICAgIHZhciBlID0gbmV3IEVycm9yKCdzdHJlYW0udW5zaGlmdCgpIGFmdGVyIGVuZCBldmVudCcpO1xuICAgICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChzdGF0ZS5kZWNvZGVyICYmICFhZGRUb0Zyb250ICYmICFlbmNvZGluZylcbiAgICAgICAgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLndyaXRlKGNodW5rKTtcblxuICAgICAgLy8gdXBkYXRlIHRoZSBidWZmZXIgaW5mby5cbiAgICAgIHN0YXRlLmxlbmd0aCArPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcbiAgICAgIGlmIChhZGRUb0Zyb250KSB7XG4gICAgICAgIHN0YXRlLmJ1ZmZlci51bnNoaWZ0KGNodW5rKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnJlYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgc3RhdGUuYnVmZmVyLnB1c2goY2h1bmspO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3RhdGUubmVlZFJlYWRhYmxlKVxuICAgICAgICBlbWl0UmVhZGFibGUoc3RyZWFtKTtcblxuICAgICAgbWF5YmVSZWFkTW9yZShzdHJlYW0sIHN0YXRlKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoIWFkZFRvRnJvbnQpIHtcbiAgICBzdGF0ZS5yZWFkaW5nID0gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gbmVlZE1vcmVEYXRhKHN0YXRlKTtcbn1cblxuXG5cbi8vIGlmIGl0J3MgcGFzdCB0aGUgaGlnaCB3YXRlciBtYXJrLCB3ZSBjYW4gcHVzaCBpbiBzb21lIG1vcmUuXG4vLyBBbHNvLCBpZiB3ZSBoYXZlIG5vIGRhdGEgeWV0LCB3ZSBjYW4gc3RhbmQgc29tZVxuLy8gbW9yZSBieXRlcy4gIFRoaXMgaXMgdG8gd29yayBhcm91bmQgY2FzZXMgd2hlcmUgaHdtPTAsXG4vLyBzdWNoIGFzIHRoZSByZXBsLiAgQWxzbywgaWYgdGhlIHB1c2goKSB0cmlnZ2VyZWQgYVxuLy8gcmVhZGFibGUgZXZlbnQsIGFuZCB0aGUgdXNlciBjYWxsZWQgcmVhZChsYXJnZU51bWJlcikgc3VjaCB0aGF0XG4vLyBuZWVkUmVhZGFibGUgd2FzIHNldCwgdGhlbiB3ZSBvdWdodCB0byBwdXNoIG1vcmUsIHNvIHRoYXQgYW5vdGhlclxuLy8gJ3JlYWRhYmxlJyBldmVudCB3aWxsIGJlIHRyaWdnZXJlZC5cbmZ1bmN0aW9uIG5lZWRNb3JlRGF0YShzdGF0ZSkge1xuICByZXR1cm4gIXN0YXRlLmVuZGVkICYmXG4gICAgICAgICAoc3RhdGUubmVlZFJlYWRhYmxlIHx8XG4gICAgICAgICAgc3RhdGUubGVuZ3RoIDwgc3RhdGUuaGlnaFdhdGVyTWFyayB8fFxuICAgICAgICAgIHN0YXRlLmxlbmd0aCA9PT0gMCk7XG59XG5cbi8vIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuUmVhZGFibGUucHJvdG90eXBlLnNldEVuY29kaW5nID0gZnVuY3Rpb24oZW5jKSB7XG4gIGlmICghU3RyaW5nRGVjb2RlcilcbiAgICBTdHJpbmdEZWNvZGVyID0gcmVxdWlyZSgnc3RyaW5nX2RlY29kZXIvJykuU3RyaW5nRGVjb2RlcjtcbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5kZWNvZGVyID0gbmV3IFN0cmluZ0RlY29kZXIoZW5jKTtcbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5lbmNvZGluZyA9IGVuYztcbn07XG5cbi8vIERvbid0IHJhaXNlIHRoZSBod20gPiAxMjhNQlxudmFyIE1BWF9IV00gPSAweDgwMDAwMDtcbmZ1bmN0aW9uIHJvdW5kVXBUb05leHRQb3dlck9mMihuKSB7XG4gIGlmIChuID49IE1BWF9IV00pIHtcbiAgICBuID0gTUFYX0hXTTtcbiAgfSBlbHNlIHtcbiAgICAvLyBHZXQgdGhlIG5leHQgaGlnaGVzdCBwb3dlciBvZiAyXG4gICAgbi0tO1xuICAgIGZvciAodmFyIHAgPSAxOyBwIDwgMzI7IHAgPDw9IDEpIG4gfD0gbiA+PiBwO1xuICAgIG4rKztcbiAgfVxuICByZXR1cm4gbjtcbn1cblxuZnVuY3Rpb24gaG93TXVjaFRvUmVhZChuLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmIHN0YXRlLmVuZGVkKVxuICAgIHJldHVybiAwO1xuXG4gIGlmIChzdGF0ZS5vYmplY3RNb2RlKVxuICAgIHJldHVybiBuID09PSAwID8gMCA6IDE7XG5cbiAgaWYgKG4gPT09IG51bGwgfHwgaXNOYU4obikpIHtcbiAgICAvLyBvbmx5IGZsb3cgb25lIGJ1ZmZlciBhdCBhIHRpbWVcbiAgICBpZiAoc3RhdGUuZmxvd2luZyAmJiBzdGF0ZS5idWZmZXIubGVuZ3RoKVxuICAgICAgcmV0dXJuIHN0YXRlLmJ1ZmZlclswXS5sZW5ndGg7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHN0YXRlLmxlbmd0aDtcbiAgfVxuXG4gIGlmIChuIDw9IDApXG4gICAgcmV0dXJuIDA7XG5cbiAgLy8gSWYgd2UncmUgYXNraW5nIGZvciBtb3JlIHRoYW4gdGhlIHRhcmdldCBidWZmZXIgbGV2ZWwsXG4gIC8vIHRoZW4gcmFpc2UgdGhlIHdhdGVyIG1hcmsuICBCdW1wIHVwIHRvIHRoZSBuZXh0IGhpZ2hlc3RcbiAgLy8gcG93ZXIgb2YgMiwgdG8gcHJldmVudCBpbmNyZWFzaW5nIGl0IGV4Y2Vzc2l2ZWx5IGluIHRpbnlcbiAgLy8gYW1vdW50cy5cbiAgaWYgKG4gPiBzdGF0ZS5oaWdoV2F0ZXJNYXJrKVxuICAgIHN0YXRlLmhpZ2hXYXRlck1hcmsgPSByb3VuZFVwVG9OZXh0UG93ZXJPZjIobik7XG5cbiAgLy8gZG9uJ3QgaGF2ZSB0aGF0IG11Y2guICByZXR1cm4gbnVsbCwgdW5sZXNzIHdlJ3ZlIGVuZGVkLlxuICBpZiAobiA+IHN0YXRlLmxlbmd0aCkge1xuICAgIGlmICghc3RhdGUuZW5kZWQpIHtcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgICByZXR1cm4gMDtcbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiBzdGF0ZS5sZW5ndGg7XG4gIH1cblxuICByZXR1cm4gbjtcbn1cblxuLy8geW91IGNhbiBvdmVycmlkZSBlaXRoZXIgdGhpcyBtZXRob2QsIG9yIHRoZSBhc3luYyBfcmVhZChuKSBiZWxvdy5cblJlYWRhYmxlLnByb3RvdHlwZS5yZWFkID0gZnVuY3Rpb24obikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICBzdGF0ZS5jYWxsZWRSZWFkID0gdHJ1ZTtcbiAgdmFyIG5PcmlnID0gbjtcbiAgdmFyIHJldDtcblxuICBpZiAodHlwZW9mIG4gIT09ICdudW1iZXInIHx8IG4gPiAwKVxuICAgIHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSA9IGZhbHNlO1xuXG4gIC8vIGlmIHdlJ3JlIGRvaW5nIHJlYWQoMCkgdG8gdHJpZ2dlciBhIHJlYWRhYmxlIGV2ZW50LCBidXQgd2VcbiAgLy8gYWxyZWFkeSBoYXZlIGEgYnVuY2ggb2YgZGF0YSBpbiB0aGUgYnVmZmVyLCB0aGVuIGp1c3QgdHJpZ2dlclxuICAvLyB0aGUgJ3JlYWRhYmxlJyBldmVudCBhbmQgbW92ZSBvbi5cbiAgaWYgKG4gPT09IDAgJiZcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSAmJlxuICAgICAgKHN0YXRlLmxlbmd0aCA+PSBzdGF0ZS5oaWdoV2F0ZXJNYXJrIHx8IHN0YXRlLmVuZGVkKSkge1xuICAgIGVtaXRSZWFkYWJsZSh0aGlzKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIG4gPSBob3dNdWNoVG9SZWFkKG4sIHN0YXRlKTtcblxuICAvLyBpZiB3ZSd2ZSBlbmRlZCwgYW5kIHdlJ3JlIG5vdyBjbGVhciwgdGhlbiBmaW5pc2ggaXQgdXAuXG4gIGlmIChuID09PSAwICYmIHN0YXRlLmVuZGVkKSB7XG4gICAgcmV0ID0gbnVsbDtcblxuICAgIC8vIEluIGNhc2VzIHdoZXJlIHRoZSBkZWNvZGVyIGRpZCBub3QgcmVjZWl2ZSBlbm91Z2ggZGF0YVxuICAgIC8vIHRvIHByb2R1Y2UgYSBmdWxsIGNodW5rLCB0aGVuIGltbWVkaWF0ZWx5IHJlY2VpdmVkIGFuXG4gICAgLy8gRU9GLCBzdGF0ZS5idWZmZXIgd2lsbCBjb250YWluIFs8QnVmZmVyID4sIDxCdWZmZXIgMDAgLi4uPl0uXG4gICAgLy8gaG93TXVjaFRvUmVhZCB3aWxsIHNlZSB0aGlzIGFuZCBjb2VyY2UgdGhlIGFtb3VudCB0b1xuICAgIC8vIHJlYWQgdG8gemVybyAoYmVjYXVzZSBpdCdzIGxvb2tpbmcgYXQgdGhlIGxlbmd0aCBvZiB0aGVcbiAgICAvLyBmaXJzdCA8QnVmZmVyID4gaW4gc3RhdGUuYnVmZmVyKSwgYW5kIHdlJ2xsIGVuZCB1cCBoZXJlLlxuICAgIC8vXG4gICAgLy8gVGhpcyBjYW4gb25seSBoYXBwZW4gdmlhIHN0YXRlLmRlY29kZXIgLS0gbm8gb3RoZXIgdmVudWVcbiAgICAvLyBleGlzdHMgZm9yIHB1c2hpbmcgYSB6ZXJvLWxlbmd0aCBjaHVuayBpbnRvIHN0YXRlLmJ1ZmZlclxuICAgIC8vIGFuZCB0cmlnZ2VyaW5nIHRoaXMgYmVoYXZpb3IuIEluIHRoaXMgY2FzZSwgd2UgcmV0dXJuIG91clxuICAgIC8vIHJlbWFpbmluZyBkYXRhIGFuZCBlbmQgdGhlIHN0cmVhbSwgaWYgYXBwcm9wcmlhdGUuXG4gICAgaWYgKHN0YXRlLmxlbmd0aCA+IDAgJiYgc3RhdGUuZGVjb2Rlcikge1xuICAgICAgcmV0ID0gZnJvbUxpc3Qobiwgc3RhdGUpO1xuICAgICAgc3RhdGUubGVuZ3RoIC09IHJldC5sZW5ndGg7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMClcbiAgICAgIGVuZFJlYWRhYmxlKHRoaXMpO1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIEFsbCB0aGUgYWN0dWFsIGNodW5rIGdlbmVyYXRpb24gbG9naWMgbmVlZHMgdG8gYmVcbiAgLy8gKmJlbG93KiB0aGUgY2FsbCB0byBfcmVhZC4gIFRoZSByZWFzb24gaXMgdGhhdCBpbiBjZXJ0YWluXG4gIC8vIHN5bnRoZXRpYyBzdHJlYW0gY2FzZXMsIHN1Y2ggYXMgcGFzc3Rocm91Z2ggc3RyZWFtcywgX3JlYWRcbiAgLy8gbWF5IGJlIGEgY29tcGxldGVseSBzeW5jaHJvbm91cyBvcGVyYXRpb24gd2hpY2ggbWF5IGNoYW5nZVxuICAvLyB0aGUgc3RhdGUgb2YgdGhlIHJlYWQgYnVmZmVyLCBwcm92aWRpbmcgZW5vdWdoIGRhdGEgd2hlblxuICAvLyBiZWZvcmUgdGhlcmUgd2FzICpub3QqIGVub3VnaC5cbiAgLy9cbiAgLy8gU28sIHRoZSBzdGVwcyBhcmU6XG4gIC8vIDEuIEZpZ3VyZSBvdXQgd2hhdCB0aGUgc3RhdGUgb2YgdGhpbmdzIHdpbGwgYmUgYWZ0ZXIgd2UgZG9cbiAgLy8gYSByZWFkIGZyb20gdGhlIGJ1ZmZlci5cbiAgLy9cbiAgLy8gMi4gSWYgdGhhdCByZXN1bHRpbmcgc3RhdGUgd2lsbCB0cmlnZ2VyIGEgX3JlYWQsIHRoZW4gY2FsbCBfcmVhZC5cbiAgLy8gTm90ZSB0aGF0IHRoaXMgbWF5IGJlIGFzeW5jaHJvbm91cywgb3Igc3luY2hyb25vdXMuICBZZXMsIGl0IGlzXG4gIC8vIGRlZXBseSB1Z2x5IHRvIHdyaXRlIEFQSXMgdGhpcyB3YXksIGJ1dCB0aGF0IHN0aWxsIGRvZXNuJ3QgbWVhblxuICAvLyB0aGF0IHRoZSBSZWFkYWJsZSBjbGFzcyBzaG91bGQgYmVoYXZlIGltcHJvcGVybHksIGFzIHN0cmVhbXMgYXJlXG4gIC8vIGRlc2lnbmVkIHRvIGJlIHN5bmMvYXN5bmMgYWdub3N0aWMuXG4gIC8vIFRha2Ugbm90ZSBpZiB0aGUgX3JlYWQgY2FsbCBpcyBzeW5jIG9yIGFzeW5jIChpZSwgaWYgdGhlIHJlYWQgY2FsbFxuICAvLyBoYXMgcmV0dXJuZWQgeWV0KSwgc28gdGhhdCB3ZSBrbm93IHdoZXRoZXIgb3Igbm90IGl0J3Mgc2FmZSB0byBlbWl0XG4gIC8vICdyZWFkYWJsZScgZXRjLlxuICAvL1xuICAvLyAzLiBBY3R1YWxseSBwdWxsIHRoZSByZXF1ZXN0ZWQgY2h1bmtzIG91dCBvZiB0aGUgYnVmZmVyIGFuZCByZXR1cm4uXG5cbiAgLy8gaWYgd2UgbmVlZCBhIHJlYWRhYmxlIGV2ZW50LCB0aGVuIHdlIG5lZWQgdG8gZG8gc29tZSByZWFkaW5nLlxuICB2YXIgZG9SZWFkID0gc3RhdGUubmVlZFJlYWRhYmxlO1xuXG4gIC8vIGlmIHdlIGN1cnJlbnRseSBoYXZlIGxlc3MgdGhhbiB0aGUgaGlnaFdhdGVyTWFyaywgdGhlbiBhbHNvIHJlYWQgc29tZVxuICBpZiAoc3RhdGUubGVuZ3RoIC0gbiA8PSBzdGF0ZS5oaWdoV2F0ZXJNYXJrKVxuICAgIGRvUmVhZCA9IHRydWU7XG5cbiAgLy8gaG93ZXZlciwgaWYgd2UndmUgZW5kZWQsIHRoZW4gdGhlcmUncyBubyBwb2ludCwgYW5kIGlmIHdlJ3JlIGFscmVhZHlcbiAgLy8gcmVhZGluZywgdGhlbiBpdCdzIHVubmVjZXNzYXJ5LlxuICBpZiAoc3RhdGUuZW5kZWQgfHwgc3RhdGUucmVhZGluZylcbiAgICBkb1JlYWQgPSBmYWxzZTtcblxuICBpZiAoZG9SZWFkKSB7XG4gICAgc3RhdGUucmVhZGluZyA9IHRydWU7XG4gICAgc3RhdGUuc3luYyA9IHRydWU7XG4gICAgLy8gaWYgdGhlIGxlbmd0aCBpcyBjdXJyZW50bHkgemVybywgdGhlbiB3ZSAqbmVlZCogYSByZWFkYWJsZSBldmVudC5cbiAgICBpZiAoc3RhdGUubGVuZ3RoID09PSAwKVxuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICAvLyBjYWxsIGludGVybmFsIHJlYWQgbWV0aG9kXG4gICAgdGhpcy5fcmVhZChzdGF0ZS5oaWdoV2F0ZXJNYXJrKTtcbiAgICBzdGF0ZS5zeW5jID0gZmFsc2U7XG4gIH1cblxuICAvLyBJZiBfcmVhZCBjYWxsZWQgaXRzIGNhbGxiYWNrIHN5bmNocm9ub3VzbHksIHRoZW4gYHJlYWRpbmdgXG4gIC8vIHdpbGwgYmUgZmFsc2UsIGFuZCB3ZSBuZWVkIHRvIHJlLWV2YWx1YXRlIGhvdyBtdWNoIGRhdGEgd2VcbiAgLy8gY2FuIHJldHVybiB0byB0aGUgdXNlci5cbiAgaWYgKGRvUmVhZCAmJiAhc3RhdGUucmVhZGluZylcbiAgICBuID0gaG93TXVjaFRvUmVhZChuT3JpZywgc3RhdGUpO1xuXG4gIGlmIChuID4gMClcbiAgICByZXQgPSBmcm9tTGlzdChuLCBzdGF0ZSk7XG4gIGVsc2VcbiAgICByZXQgPSBudWxsO1xuXG4gIGlmIChyZXQgPT09IG51bGwpIHtcbiAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgIG4gPSAwO1xuICB9XG5cbiAgc3RhdGUubGVuZ3RoIC09IG47XG5cbiAgLy8gSWYgd2UgaGF2ZSBub3RoaW5nIGluIHRoZSBidWZmZXIsIHRoZW4gd2Ugd2FudCB0byBrbm93XG4gIC8vIGFzIHNvb24gYXMgd2UgKmRvKiBnZXQgc29tZXRoaW5nIGludG8gdGhlIGJ1ZmZlci5cbiAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCAmJiAhc3RhdGUuZW5kZWQpXG4gICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcblxuICAvLyBJZiB3ZSBoYXBwZW5lZCB0byByZWFkKCkgZXhhY3RseSB0aGUgcmVtYWluaW5nIGFtb3VudCBpbiB0aGVcbiAgLy8gYnVmZmVyLCBhbmQgdGhlIEVPRiBoYXMgYmVlbiBzZWVuIGF0IHRoaXMgcG9pbnQsIHRoZW4gbWFrZSBzdXJlXG4gIC8vIHRoYXQgd2UgZW1pdCAnZW5kJyBvbiB0aGUgdmVyeSBuZXh0IHRpY2suXG4gIGlmIChzdGF0ZS5lbmRlZCAmJiAhc3RhdGUuZW5kRW1pdHRlZCAmJiBzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgZW5kUmVhZGFibGUodGhpcyk7XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGNodW5rSW52YWxpZChzdGF0ZSwgY2h1bmspIHtcbiAgdmFyIGVyID0gbnVsbDtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoY2h1bmspICYmXG4gICAgICAnc3RyaW5nJyAhPT0gdHlwZW9mIGNodW5rICYmXG4gICAgICBjaHVuayAhPT0gbnVsbCAmJlxuICAgICAgY2h1bmsgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICBlciA9IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgbm9uLXN0cmluZy9idWZmZXIgY2h1bmsnKTtcbiAgfVxuICByZXR1cm4gZXI7XG59XG5cblxuZnVuY3Rpb24gb25Fb2ZDaHVuayhzdHJlYW0sIHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5kZWNvZGVyICYmICFzdGF0ZS5lbmRlZCkge1xuICAgIHZhciBjaHVuayA9IHN0YXRlLmRlY29kZXIuZW5kKCk7XG4gICAgaWYgKGNodW5rICYmIGNodW5rLmxlbmd0aCkge1xuICAgICAgc3RhdGUuYnVmZmVyLnB1c2goY2h1bmspO1xuICAgICAgc3RhdGUubGVuZ3RoICs9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuICAgIH1cbiAgfVxuICBzdGF0ZS5lbmRlZCA9IHRydWU7XG5cbiAgLy8gaWYgd2UndmUgZW5kZWQgYW5kIHdlIGhhdmUgc29tZSBkYXRhIGxlZnQsIHRoZW4gZW1pdFxuICAvLyAncmVhZGFibGUnIG5vdyB0byBtYWtlIHN1cmUgaXQgZ2V0cyBwaWNrZWQgdXAuXG4gIGlmIChzdGF0ZS5sZW5ndGggPiAwKVxuICAgIGVtaXRSZWFkYWJsZShzdHJlYW0pO1xuICBlbHNlXG4gICAgZW5kUmVhZGFibGUoc3RyZWFtKTtcbn1cblxuLy8gRG9uJ3QgZW1pdCByZWFkYWJsZSByaWdodCBhd2F5IGluIHN5bmMgbW9kZSwgYmVjYXVzZSB0aGlzIGNhbiB0cmlnZ2VyXG4vLyBhbm90aGVyIHJlYWQoKSBjYWxsID0+IHN0YWNrIG92ZXJmbG93LiAgVGhpcyB3YXksIGl0IG1pZ2h0IHRyaWdnZXJcbi8vIGEgbmV4dFRpY2sgcmVjdXJzaW9uIHdhcm5pbmcsIGJ1dCB0aGF0J3Mgbm90IHNvIGJhZC5cbmZ1bmN0aW9uIGVtaXRSZWFkYWJsZShzdHJlYW0pIHtcbiAgdmFyIHN0YXRlID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuICBzdGF0ZS5uZWVkUmVhZGFibGUgPSBmYWxzZTtcbiAgaWYgKHN0YXRlLmVtaXR0ZWRSZWFkYWJsZSlcbiAgICByZXR1cm47XG5cbiAgc3RhdGUuZW1pdHRlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgaWYgKHN0YXRlLnN5bmMpXG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGVtaXRSZWFkYWJsZV8oc3RyZWFtKTtcbiAgICB9KTtcbiAgZWxzZVxuICAgIGVtaXRSZWFkYWJsZV8oc3RyZWFtKTtcbn1cblxuZnVuY3Rpb24gZW1pdFJlYWRhYmxlXyhzdHJlYW0pIHtcbiAgc3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG59XG5cblxuLy8gYXQgdGhpcyBwb2ludCwgdGhlIHVzZXIgaGFzIHByZXN1bWFibHkgc2VlbiB0aGUgJ3JlYWRhYmxlJyBldmVudCxcbi8vIGFuZCBjYWxsZWQgcmVhZCgpIHRvIGNvbnN1bWUgc29tZSBkYXRhLiAgdGhhdCBtYXkgaGF2ZSB0cmlnZ2VyZWRcbi8vIGluIHR1cm4gYW5vdGhlciBfcmVhZChuKSBjYWxsLCBpbiB3aGljaCBjYXNlIHJlYWRpbmcgPSB0cnVlIGlmXG4vLyBpdCdzIGluIHByb2dyZXNzLlxuLy8gSG93ZXZlciwgaWYgd2UncmUgbm90IGVuZGVkLCBvciByZWFkaW5nLCBhbmQgdGhlIGxlbmd0aCA8IGh3bSxcbi8vIHRoZW4gZ28gYWhlYWQgYW5kIHRyeSB0byByZWFkIHNvbWUgbW9yZSBwcmVlbXB0aXZlbHkuXG5mdW5jdGlvbiBtYXliZVJlYWRNb3JlKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKCFzdGF0ZS5yZWFkaW5nTW9yZSkge1xuICAgIHN0YXRlLnJlYWRpbmdNb3JlID0gdHJ1ZTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgbWF5YmVSZWFkTW9yZV8oc3RyZWFtLCBzdGF0ZSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWF5YmVSZWFkTW9yZV8oc3RyZWFtLCBzdGF0ZSkge1xuICB2YXIgbGVuID0gc3RhdGUubGVuZ3RoO1xuICB3aGlsZSAoIXN0YXRlLnJlYWRpbmcgJiYgIXN0YXRlLmZsb3dpbmcgJiYgIXN0YXRlLmVuZGVkICYmXG4gICAgICAgICBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrKSB7XG4gICAgc3RyZWFtLnJlYWQoMCk7XG4gICAgaWYgKGxlbiA9PT0gc3RhdGUubGVuZ3RoKVxuICAgICAgLy8gZGlkbid0IGdldCBhbnkgZGF0YSwgc3RvcCBzcGlubmluZy5cbiAgICAgIGJyZWFrO1xuICAgIGVsc2VcbiAgICAgIGxlbiA9IHN0YXRlLmxlbmd0aDtcbiAgfVxuICBzdGF0ZS5yZWFkaW5nTW9yZSA9IGZhbHNlO1xufVxuXG4vLyBhYnN0cmFjdCBtZXRob2QuICB0byBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIGltcGxlbWVudGF0aW9uIGNsYXNzZXMuXG4vLyBjYWxsIGNiKGVyLCBkYXRhKSB3aGVyZSBkYXRhIGlzIDw9IG4gaW4gbGVuZ3RoLlxuLy8gZm9yIHZpcnR1YWwgKG5vbi1zdHJpbmcsIG5vbi1idWZmZXIpIHN0cmVhbXMsIFwibGVuZ3RoXCIgaXMgc29tZXdoYXRcbi8vIGFyYml0cmFyeSwgYW5kIHBlcmhhcHMgbm90IHZlcnkgbWVhbmluZ2Z1bC5cblJlYWRhYmxlLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJykpO1xufTtcblxuUmVhZGFibGUucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbihkZXN0LCBwaXBlT3B0cykge1xuICB2YXIgc3JjID0gdGhpcztcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICBzd2l0Y2ggKHN0YXRlLnBpcGVzQ291bnQpIHtcbiAgICBjYXNlIDA6XG4gICAgICBzdGF0ZS5waXBlcyA9IGRlc3Q7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE6XG4gICAgICBzdGF0ZS5waXBlcyA9IFtzdGF0ZS5waXBlcywgZGVzdF07XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgc3RhdGUucGlwZXMucHVzaChkZXN0KTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIHN0YXRlLnBpcGVzQ291bnQgKz0gMTtcblxuICB2YXIgZG9FbmQgPSAoIXBpcGVPcHRzIHx8IHBpcGVPcHRzLmVuZCAhPT0gZmFsc2UpICYmXG4gICAgICAgICAgICAgIGRlc3QgIT09IHByb2Nlc3Muc3Rkb3V0ICYmXG4gICAgICAgICAgICAgIGRlc3QgIT09IHByb2Nlc3Muc3RkZXJyO1xuXG4gIHZhciBlbmRGbiA9IGRvRW5kID8gb25lbmQgOiBjbGVhbnVwO1xuICBpZiAoc3RhdGUuZW5kRW1pdHRlZClcbiAgICBwcm9jZXNzLm5leHRUaWNrKGVuZEZuKTtcbiAgZWxzZVxuICAgIHNyYy5vbmNlKCdlbmQnLCBlbmRGbik7XG5cbiAgZGVzdC5vbigndW5waXBlJywgb251bnBpcGUpO1xuICBmdW5jdGlvbiBvbnVucGlwZShyZWFkYWJsZSkge1xuICAgIGlmIChyZWFkYWJsZSAhPT0gc3JjKSByZXR1cm47XG4gICAgY2xlYW51cCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25lbmQoKSB7XG4gICAgZGVzdC5lbmQoKTtcbiAgfVxuXG4gIC8vIHdoZW4gdGhlIGRlc3QgZHJhaW5zLCBpdCByZWR1Y2VzIHRoZSBhd2FpdERyYWluIGNvdW50ZXJcbiAgLy8gb24gdGhlIHNvdXJjZS4gIFRoaXMgd291bGQgYmUgbW9yZSBlbGVnYW50IHdpdGggYSAub25jZSgpXG4gIC8vIGhhbmRsZXIgaW4gZmxvdygpLCBidXQgYWRkaW5nIGFuZCByZW1vdmluZyByZXBlYXRlZGx5IGlzXG4gIC8vIHRvbyBzbG93LlxuICB2YXIgb25kcmFpbiA9IHBpcGVPbkRyYWluKHNyYyk7XG4gIGRlc3Qub24oJ2RyYWluJywgb25kcmFpbik7XG5cbiAgZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICAvLyBjbGVhbnVwIGV2ZW50IGhhbmRsZXJzIG9uY2UgdGhlIHBpcGUgaXMgYnJva2VuXG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBvbmNsb3NlKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZHJhaW4nLCBvbmRyYWluKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uZXJyb3IpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ3VucGlwZScsIG9udW5waXBlKTtcbiAgICBzcmMucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIG9uZW5kKTtcbiAgICBzcmMucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIGNsZWFudXApO1xuXG4gICAgLy8gaWYgdGhlIHJlYWRlciBpcyB3YWl0aW5nIGZvciBhIGRyYWluIGV2ZW50IGZyb20gdGhpc1xuICAgIC8vIHNwZWNpZmljIHdyaXRlciwgdGhlbiBpdCB3b3VsZCBjYXVzZSBpdCB0byBuZXZlciBzdGFydFxuICAgIC8vIGZsb3dpbmcgYWdhaW4uXG4gICAgLy8gU28sIGlmIHRoaXMgaXMgYXdhaXRpbmcgYSBkcmFpbiwgdGhlbiB3ZSBqdXN0IGNhbGwgaXQgbm93LlxuICAgIC8vIElmIHdlIGRvbid0IGtub3csIHRoZW4gYXNzdW1lIHRoYXQgd2UgYXJlIHdhaXRpbmcgZm9yIG9uZS5cbiAgICBpZiAoIWRlc3QuX3dyaXRhYmxlU3RhdGUgfHwgZGVzdC5fd3JpdGFibGVTdGF0ZS5uZWVkRHJhaW4pXG4gICAgICBvbmRyYWluKCk7XG4gIH1cblxuICAvLyBpZiB0aGUgZGVzdCBoYXMgYW4gZXJyb3IsIHRoZW4gc3RvcCBwaXBpbmcgaW50byBpdC5cbiAgLy8gaG93ZXZlciwgZG9uJ3Qgc3VwcHJlc3MgdGhlIHRocm93aW5nIGJlaGF2aW9yIGZvciB0aGlzLlxuICBmdW5jdGlvbiBvbmVycm9yKGVyKSB7XG4gICAgdW5waXBlKCk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbmVycm9yKTtcbiAgICBpZiAoRUUubGlzdGVuZXJDb3VudChkZXN0LCAnZXJyb3InKSA9PT0gMClcbiAgICAgIGRlc3QuZW1pdCgnZXJyb3InLCBlcik7XG4gIH1cbiAgLy8gVGhpcyBpcyBhIGJydXRhbGx5IHVnbHkgaGFjayB0byBtYWtlIHN1cmUgdGhhdCBvdXIgZXJyb3IgaGFuZGxlclxuICAvLyBpcyBhdHRhY2hlZCBiZWZvcmUgYW55IHVzZXJsYW5kIG9uZXMuICBORVZFUiBETyBUSElTLlxuICBpZiAoIWRlc3QuX2V2ZW50cyB8fCAhZGVzdC5fZXZlbnRzLmVycm9yKVxuICAgIGRlc3Qub24oJ2Vycm9yJywgb25lcnJvcik7XG4gIGVsc2UgaWYgKGlzQXJyYXkoZGVzdC5fZXZlbnRzLmVycm9yKSlcbiAgICBkZXN0Ll9ldmVudHMuZXJyb3IudW5zaGlmdChvbmVycm9yKTtcbiAgZWxzZVxuICAgIGRlc3QuX2V2ZW50cy5lcnJvciA9IFtvbmVycm9yLCBkZXN0Ll9ldmVudHMuZXJyb3JdO1xuXG5cblxuICAvLyBCb3RoIGNsb3NlIGFuZCBmaW5pc2ggc2hvdWxkIHRyaWdnZXIgdW5waXBlLCBidXQgb25seSBvbmNlLlxuICBmdW5jdGlvbiBvbmNsb3NlKCkge1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcbiAgICB1bnBpcGUoKTtcbiAgfVxuICBkZXN0Lm9uY2UoJ2Nsb3NlJywgb25jbG9zZSk7XG4gIGZ1bmN0aW9uIG9uZmluaXNoKCkge1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG4gICAgdW5waXBlKCk7XG4gIH1cbiAgZGVzdC5vbmNlKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG5cbiAgZnVuY3Rpb24gdW5waXBlKCkge1xuICAgIHNyYy51bnBpcGUoZGVzdCk7XG4gIH1cblxuICAvLyB0ZWxsIHRoZSBkZXN0IHRoYXQgaXQncyBiZWluZyBwaXBlZCB0b1xuICBkZXN0LmVtaXQoJ3BpcGUnLCBzcmMpO1xuXG4gIC8vIHN0YXJ0IHRoZSBmbG93IGlmIGl0IGhhc24ndCBiZWVuIHN0YXJ0ZWQgYWxyZWFkeS5cbiAgaWYgKCFzdGF0ZS5mbG93aW5nKSB7XG4gICAgLy8gdGhlIGhhbmRsZXIgdGhhdCB3YWl0cyBmb3IgcmVhZGFibGUgZXZlbnRzIGFmdGVyIGFsbFxuICAgIC8vIHRoZSBkYXRhIGdldHMgc3Vja2VkIG91dCBpbiBmbG93LlxuICAgIC8vIFRoaXMgd291bGQgYmUgZWFzaWVyIHRvIGZvbGxvdyB3aXRoIGEgLm9uY2UoKSBoYW5kbGVyXG4gICAgLy8gaW4gZmxvdygpLCBidXQgdGhhdCBpcyB0b28gc2xvdy5cbiAgICB0aGlzLm9uKCdyZWFkYWJsZScsIHBpcGVPblJlYWRhYmxlKTtcblxuICAgIHN0YXRlLmZsb3dpbmcgPSB0cnVlO1xuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBmbG93KHNyYyk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZGVzdDtcbn07XG5cbmZ1bmN0aW9uIHBpcGVPbkRyYWluKHNyYykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRlc3QgPSB0aGlzO1xuICAgIHZhciBzdGF0ZSA9IHNyYy5fcmVhZGFibGVTdGF0ZTtcbiAgICBzdGF0ZS5hd2FpdERyYWluLS07XG4gICAgaWYgKHN0YXRlLmF3YWl0RHJhaW4gPT09IDApXG4gICAgICBmbG93KHNyYyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGZsb3coc3JjKSB7XG4gIHZhciBzdGF0ZSA9IHNyYy5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIGNodW5rO1xuICBzdGF0ZS5hd2FpdERyYWluID0gMDtcblxuICBmdW5jdGlvbiB3cml0ZShkZXN0LCBpLCBsaXN0KSB7XG4gICAgdmFyIHdyaXR0ZW4gPSBkZXN0LndyaXRlKGNodW5rKTtcbiAgICBpZiAoZmFsc2UgPT09IHdyaXR0ZW4pIHtcbiAgICAgIHN0YXRlLmF3YWl0RHJhaW4rKztcbiAgICB9XG4gIH1cblxuICB3aGlsZSAoc3RhdGUucGlwZXNDb3VudCAmJiBudWxsICE9PSAoY2h1bmsgPSBzcmMucmVhZCgpKSkge1xuXG4gICAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDEpXG4gICAgICB3cml0ZShzdGF0ZS5waXBlcywgMCwgbnVsbCk7XG4gICAgZWxzZVxuICAgICAgZm9yRWFjaChzdGF0ZS5waXBlcywgd3JpdGUpO1xuXG4gICAgc3JjLmVtaXQoJ2RhdGEnLCBjaHVuayk7XG5cbiAgICAvLyBpZiBhbnlvbmUgbmVlZHMgYSBkcmFpbiwgdGhlbiB3ZSBoYXZlIHRvIHdhaXQgZm9yIHRoYXQuXG4gICAgaWYgKHN0YXRlLmF3YWl0RHJhaW4gPiAwKVxuICAgICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaWYgZXZlcnkgZGVzdGluYXRpb24gd2FzIHVucGlwZWQsIGVpdGhlciBiZWZvcmUgZW50ZXJpbmcgdGhpc1xuICAvLyBmdW5jdGlvbiwgb3IgaW4gdGhlIHdoaWxlIGxvb3AsIHRoZW4gc3RvcCBmbG93aW5nLlxuICAvL1xuICAvLyBOQjogVGhpcyBpcyBhIHByZXR0eSByYXJlIGVkZ2UgY2FzZS5cbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDApIHtcbiAgICBzdGF0ZS5mbG93aW5nID0gZmFsc2U7XG5cbiAgICAvLyBpZiB0aGVyZSB3ZXJlIGRhdGEgZXZlbnQgbGlzdGVuZXJzIGFkZGVkLCB0aGVuIHN3aXRjaCB0byBvbGQgbW9kZS5cbiAgICBpZiAoRUUubGlzdGVuZXJDb3VudChzcmMsICdkYXRhJykgPiAwKVxuICAgICAgZW1pdERhdGFFdmVudHMoc3JjKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBhdCB0aGlzIHBvaW50LCBubyBvbmUgbmVlZGVkIGEgZHJhaW4sIHNvIHdlIGp1c3QgcmFuIG91dCBvZiBkYXRhXG4gIC8vIG9uIHRoZSBuZXh0IHJlYWRhYmxlIGV2ZW50LCBzdGFydCBpdCBvdmVyIGFnYWluLlxuICBzdGF0ZS5yYW5PdXQgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBwaXBlT25SZWFkYWJsZSgpIHtcbiAgaWYgKHRoaXMuX3JlYWRhYmxlU3RhdGUucmFuT3V0KSB7XG4gICAgdGhpcy5fcmVhZGFibGVTdGF0ZS5yYW5PdXQgPSBmYWxzZTtcbiAgICBmbG93KHRoaXMpO1xuICB9XG59XG5cblxuUmVhZGFibGUucHJvdG90eXBlLnVucGlwZSA9IGZ1bmN0aW9uKGRlc3QpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICAvLyBpZiB3ZSdyZSBub3QgcGlwaW5nIGFueXdoZXJlLCB0aGVuIGRvIG5vdGhpbmcuXG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAwKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIGp1c3Qgb25lIGRlc3RpbmF0aW9uLiAgbW9zdCBjb21tb24gY2FzZS5cbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDEpIHtcbiAgICAvLyBwYXNzZWQgaW4gb25lLCBidXQgaXQncyBub3QgdGhlIHJpZ2h0IG9uZS5cbiAgICBpZiAoZGVzdCAmJiBkZXN0ICE9PSBzdGF0ZS5waXBlcylcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKCFkZXN0KVxuICAgICAgZGVzdCA9IHN0YXRlLnBpcGVzO1xuXG4gICAgLy8gZ290IGEgbWF0Y2guXG4gICAgc3RhdGUucGlwZXMgPSBudWxsO1xuICAgIHN0YXRlLnBpcGVzQ291bnQgPSAwO1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoJ3JlYWRhYmxlJywgcGlwZU9uUmVhZGFibGUpO1xuICAgIHN0YXRlLmZsb3dpbmcgPSBmYWxzZTtcbiAgICBpZiAoZGVzdClcbiAgICAgIGRlc3QuZW1pdCgndW5waXBlJywgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBzbG93IGNhc2UuIG11bHRpcGxlIHBpcGUgZGVzdGluYXRpb25zLlxuXG4gIGlmICghZGVzdCkge1xuICAgIC8vIHJlbW92ZSBhbGwuXG4gICAgdmFyIGRlc3RzID0gc3RhdGUucGlwZXM7XG4gICAgdmFyIGxlbiA9IHN0YXRlLnBpcGVzQ291bnQ7XG4gICAgc3RhdGUucGlwZXMgPSBudWxsO1xuICAgIHN0YXRlLnBpcGVzQ291bnQgPSAwO1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoJ3JlYWRhYmxlJywgcGlwZU9uUmVhZGFibGUpO1xuICAgIHN0YXRlLmZsb3dpbmcgPSBmYWxzZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBkZXN0c1tpXS5lbWl0KCd1bnBpcGUnLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHRyeSB0byBmaW5kIHRoZSByaWdodCBvbmUuXG4gIHZhciBpID0gaW5kZXhPZihzdGF0ZS5waXBlcywgZGVzdCk7XG4gIGlmIChpID09PSAtMSlcbiAgICByZXR1cm4gdGhpcztcblxuICBzdGF0ZS5waXBlcy5zcGxpY2UoaSwgMSk7XG4gIHN0YXRlLnBpcGVzQ291bnQgLT0gMTtcbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDEpXG4gICAgc3RhdGUucGlwZXMgPSBzdGF0ZS5waXBlc1swXTtcblxuICBkZXN0LmVtaXQoJ3VucGlwZScsIHRoaXMpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gc2V0IHVwIGRhdGEgZXZlbnRzIGlmIHRoZXkgYXJlIGFza2VkIGZvclxuLy8gRW5zdXJlIHJlYWRhYmxlIGxpc3RlbmVycyBldmVudHVhbGx5IGdldCBzb21ldGhpbmdcblJlYWRhYmxlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2LCBmbikge1xuICB2YXIgcmVzID0gU3RyZWFtLnByb3RvdHlwZS5vbi5jYWxsKHRoaXMsIGV2LCBmbik7XG5cbiAgaWYgKGV2ID09PSAnZGF0YScgJiYgIXRoaXMuX3JlYWRhYmxlU3RhdGUuZmxvd2luZylcbiAgICBlbWl0RGF0YUV2ZW50cyh0aGlzKTtcblxuICBpZiAoZXYgPT09ICdyZWFkYWJsZScgJiYgdGhpcy5yZWFkYWJsZSkge1xuICAgIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gICAgaWYgKCFzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZykge1xuICAgICAgc3RhdGUucmVhZGFibGVMaXN0ZW5pbmcgPSB0cnVlO1xuICAgICAgc3RhdGUuZW1pdHRlZFJlYWRhYmxlID0gZmFsc2U7XG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgICAgaWYgKCFzdGF0ZS5yZWFkaW5nKSB7XG4gICAgICAgIHRoaXMucmVhZCgwKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGVuZ3RoKSB7XG4gICAgICAgIGVtaXRSZWFkYWJsZSh0aGlzLCBzdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcztcbn07XG5SZWFkYWJsZS5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBSZWFkYWJsZS5wcm90b3R5cGUub247XG5cbi8vIHBhdXNlKCkgYW5kIHJlc3VtZSgpIGFyZSByZW1uYW50cyBvZiB0aGUgbGVnYWN5IHJlYWRhYmxlIHN0cmVhbSBBUElcbi8vIElmIHRoZSB1c2VyIHVzZXMgdGhlbSwgdGhlbiBzd2l0Y2ggaW50byBvbGQgbW9kZS5cblJlYWRhYmxlLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbigpIHtcbiAgZW1pdERhdGFFdmVudHModGhpcyk7XG4gIHRoaXMucmVhZCgwKTtcbiAgdGhpcy5lbWl0KCdyZXN1bWUnKTtcbn07XG5cblJlYWRhYmxlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICBlbWl0RGF0YUV2ZW50cyh0aGlzLCB0cnVlKTtcbiAgdGhpcy5lbWl0KCdwYXVzZScpO1xufTtcblxuZnVuY3Rpb24gZW1pdERhdGFFdmVudHMoc3RyZWFtLCBzdGFydFBhdXNlZCkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG5cbiAgaWYgKHN0YXRlLmZsb3dpbmcpIHtcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL3JlYWRhYmxlLXN0cmVhbS9pc3N1ZXMvMTZcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBzd2l0Y2ggdG8gb2xkIG1vZGUgbm93LicpO1xuICB9XG5cbiAgdmFyIHBhdXNlZCA9IHN0YXJ0UGF1c2VkIHx8IGZhbHNlO1xuICB2YXIgcmVhZGFibGUgPSBmYWxzZTtcblxuICAvLyBjb252ZXJ0IHRvIGFuIG9sZC1zdHlsZSBzdHJlYW0uXG4gIHN0cmVhbS5yZWFkYWJsZSA9IHRydWU7XG4gIHN0cmVhbS5waXBlID0gU3RyZWFtLnByb3RvdHlwZS5waXBlO1xuICBzdHJlYW0ub24gPSBzdHJlYW0uYWRkTGlzdGVuZXIgPSBTdHJlYW0ucHJvdG90eXBlLm9uO1xuXG4gIHN0cmVhbS5vbigncmVhZGFibGUnLCBmdW5jdGlvbigpIHtcbiAgICByZWFkYWJsZSA9IHRydWU7XG5cbiAgICB2YXIgYztcbiAgICB3aGlsZSAoIXBhdXNlZCAmJiAobnVsbCAhPT0gKGMgPSBzdHJlYW0ucmVhZCgpKSkpXG4gICAgICBzdHJlYW0uZW1pdCgnZGF0YScsIGMpO1xuXG4gICAgaWYgKGMgPT09IG51bGwpIHtcbiAgICAgIHJlYWRhYmxlID0gZmFsc2U7XG4gICAgICBzdHJlYW0uX3JlYWRhYmxlU3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIHN0cmVhbS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHBhdXNlZCA9IHRydWU7XG4gICAgdGhpcy5lbWl0KCdwYXVzZScpO1xuICB9O1xuXG4gIHN0cmVhbS5yZXN1bWUgPSBmdW5jdGlvbigpIHtcbiAgICBwYXVzZWQgPSBmYWxzZTtcbiAgICBpZiAocmVhZGFibGUpXG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICBzdHJlYW0uZW1pdCgncmVhZGFibGUnKTtcbiAgICAgIH0pO1xuICAgIGVsc2VcbiAgICAgIHRoaXMucmVhZCgwKTtcbiAgICB0aGlzLmVtaXQoJ3Jlc3VtZScpO1xuICB9O1xuXG4gIC8vIG5vdyBtYWtlIGl0IHN0YXJ0LCBqdXN0IGluIGNhc2UgaXQgaGFkbid0IGFscmVhZHkuXG4gIHN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xufVxuXG4vLyB3cmFwIGFuIG9sZC1zdHlsZSBzdHJlYW0gYXMgdGhlIGFzeW5jIGRhdGEgc291cmNlLlxuLy8gVGhpcyBpcyAqbm90KiBwYXJ0IG9mIHRoZSByZWFkYWJsZSBzdHJlYW0gaW50ZXJmYWNlLlxuLy8gSXQgaXMgYW4gdWdseSB1bmZvcnR1bmF0ZSBtZXNzIG9mIGhpc3RvcnkuXG5SZWFkYWJsZS5wcm90b3R5cGUud3JhcCA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuICB2YXIgcGF1c2VkID0gZmFsc2U7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzdHJlYW0ub24oJ2VuZCcsIGZ1bmN0aW9uKCkge1xuICAgIGlmIChzdGF0ZS5kZWNvZGVyICYmICFzdGF0ZS5lbmRlZCkge1xuICAgICAgdmFyIGNodW5rID0gc3RhdGUuZGVjb2Rlci5lbmQoKTtcbiAgICAgIGlmIChjaHVuayAmJiBjaHVuay5sZW5ndGgpXG4gICAgICAgIHNlbGYucHVzaChjaHVuayk7XG4gICAgfVxuXG4gICAgc2VsZi5wdXNoKG51bGwpO1xuICB9KTtcblxuICBzdHJlYW0ub24oJ2RhdGEnLCBmdW5jdGlvbihjaHVuaykge1xuICAgIGlmIChzdGF0ZS5kZWNvZGVyKVxuICAgICAgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLndyaXRlKGNodW5rKTtcblxuICAgIC8vIGRvbid0IHNraXAgb3ZlciBmYWxzeSB2YWx1ZXMgaW4gb2JqZWN0TW9kZVxuICAgIC8vaWYgKHN0YXRlLm9iamVjdE1vZGUgJiYgdXRpbC5pc051bGxPclVuZGVmaW5lZChjaHVuaykpXG4gICAgaWYgKHN0YXRlLm9iamVjdE1vZGUgJiYgKGNodW5rID09PSBudWxsIHx8IGNodW5rID09PSB1bmRlZmluZWQpKVxuICAgICAgcmV0dXJuO1xuICAgIGVsc2UgaWYgKCFzdGF0ZS5vYmplY3RNb2RlICYmICghY2h1bmsgfHwgIWNodW5rLmxlbmd0aCkpXG4gICAgICByZXR1cm47XG5cbiAgICB2YXIgcmV0ID0gc2VsZi5wdXNoKGNodW5rKTtcbiAgICBpZiAoIXJldCkge1xuICAgICAgcGF1c2VkID0gdHJ1ZTtcbiAgICAgIHN0cmVhbS5wYXVzZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gcHJveHkgYWxsIHRoZSBvdGhlciBtZXRob2RzLlxuICAvLyBpbXBvcnRhbnQgd2hlbiB3cmFwcGluZyBmaWx0ZXJzIGFuZCBkdXBsZXhlcy5cbiAgZm9yICh2YXIgaSBpbiBzdHJlYW0pIHtcbiAgICBpZiAodHlwZW9mIHN0cmVhbVtpXSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICB0eXBlb2YgdGhpc1tpXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXNbaV0gPSBmdW5jdGlvbihtZXRob2QpIHsgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gc3RyZWFtW21ldGhvZF0uYXBwbHkoc3RyZWFtLCBhcmd1bWVudHMpO1xuICAgICAgfX0oaSk7XG4gICAgfVxuICB9XG5cbiAgLy8gcHJveHkgY2VydGFpbiBpbXBvcnRhbnQgZXZlbnRzLlxuICB2YXIgZXZlbnRzID0gWydlcnJvcicsICdjbG9zZScsICdkZXN0cm95JywgJ3BhdXNlJywgJ3Jlc3VtZSddO1xuICBmb3JFYWNoKGV2ZW50cywgZnVuY3Rpb24oZXYpIHtcbiAgICBzdHJlYW0ub24oZXYsIHNlbGYuZW1pdC5iaW5kKHNlbGYsIGV2KSk7XG4gIH0pO1xuXG4gIC8vIHdoZW4gd2UgdHJ5IHRvIGNvbnN1bWUgc29tZSBtb3JlIGJ5dGVzLCBzaW1wbHkgdW5wYXVzZSB0aGVcbiAgLy8gdW5kZXJseWluZyBzdHJlYW0uXG4gIHNlbGYuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gICAgaWYgKHBhdXNlZCkge1xuICAgICAgcGF1c2VkID0gZmFsc2U7XG4gICAgICBzdHJlYW0ucmVzdW1lKCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufTtcblxuXG5cbi8vIGV4cG9zZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgb25seS5cblJlYWRhYmxlLl9mcm9tTGlzdCA9IGZyb21MaXN0O1xuXG4vLyBQbHVjayBvZmYgbiBieXRlcyBmcm9tIGFuIGFycmF5IG9mIGJ1ZmZlcnMuXG4vLyBMZW5ndGggaXMgdGhlIGNvbWJpbmVkIGxlbmd0aHMgb2YgYWxsIHRoZSBidWZmZXJzIGluIHRoZSBsaXN0LlxuZnVuY3Rpb24gZnJvbUxpc3Qobiwgc3RhdGUpIHtcbiAgdmFyIGxpc3QgPSBzdGF0ZS5idWZmZXI7XG4gIHZhciBsZW5ndGggPSBzdGF0ZS5sZW5ndGg7XG4gIHZhciBzdHJpbmdNb2RlID0gISFzdGF0ZS5kZWNvZGVyO1xuICB2YXIgb2JqZWN0TW9kZSA9ICEhc3RhdGUub2JqZWN0TW9kZTtcbiAgdmFyIHJldDtcblxuICAvLyBub3RoaW5nIGluIHRoZSBsaXN0LCBkZWZpbml0ZWx5IGVtcHR5LlxuICBpZiAobGlzdC5sZW5ndGggPT09IDApXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgaWYgKGxlbmd0aCA9PT0gMClcbiAgICByZXQgPSBudWxsO1xuICBlbHNlIGlmIChvYmplY3RNb2RlKVxuICAgIHJldCA9IGxpc3Quc2hpZnQoKTtcbiAgZWxzZSBpZiAoIW4gfHwgbiA+PSBsZW5ndGgpIHtcbiAgICAvLyByZWFkIGl0IGFsbCwgdHJ1bmNhdGUgdGhlIGFycmF5LlxuICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgcmV0ID0gbGlzdC5qb2luKCcnKTtcbiAgICBlbHNlXG4gICAgICByZXQgPSBCdWZmZXIuY29uY2F0KGxpc3QsIGxlbmd0aCk7XG4gICAgbGlzdC5sZW5ndGggPSAwO1xuICB9IGVsc2Uge1xuICAgIC8vIHJlYWQganVzdCBzb21lIG9mIGl0LlxuICAgIGlmIChuIDwgbGlzdFswXS5sZW5ndGgpIHtcbiAgICAgIC8vIGp1c3QgdGFrZSBhIHBhcnQgb2YgdGhlIGZpcnN0IGxpc3QgaXRlbS5cbiAgICAgIC8vIHNsaWNlIGlzIHRoZSBzYW1lIGZvciBidWZmZXJzIGFuZCBzdHJpbmdzLlxuICAgICAgdmFyIGJ1ZiA9IGxpc3RbMF07XG4gICAgICByZXQgPSBidWYuc2xpY2UoMCwgbik7XG4gICAgICBsaXN0WzBdID0gYnVmLnNsaWNlKG4pO1xuICAgIH0gZWxzZSBpZiAobiA9PT0gbGlzdFswXS5sZW5ndGgpIHtcbiAgICAgIC8vIGZpcnN0IGxpc3QgaXMgYSBwZXJmZWN0IG1hdGNoXG4gICAgICByZXQgPSBsaXN0LnNoaWZ0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNvbXBsZXggY2FzZS5cbiAgICAgIC8vIHdlIGhhdmUgZW5vdWdoIHRvIGNvdmVyIGl0LCBidXQgaXQgc3BhbnMgcGFzdCB0aGUgZmlyc3QgYnVmZmVyLlxuICAgICAgaWYgKHN0cmluZ01vZGUpXG4gICAgICAgIHJldCA9ICcnO1xuICAgICAgZWxzZVxuICAgICAgICByZXQgPSBuZXcgQnVmZmVyKG4pO1xuXG4gICAgICB2YXIgYyA9IDA7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbCAmJiBjIDwgbjsgaSsrKSB7XG4gICAgICAgIHZhciBidWYgPSBsaXN0WzBdO1xuICAgICAgICB2YXIgY3B5ID0gTWF0aC5taW4obiAtIGMsIGJ1Zi5sZW5ndGgpO1xuXG4gICAgICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgICAgIHJldCArPSBidWYuc2xpY2UoMCwgY3B5KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGJ1Zi5jb3B5KHJldCwgYywgMCwgY3B5KTtcblxuICAgICAgICBpZiAoY3B5IDwgYnVmLmxlbmd0aClcbiAgICAgICAgICBsaXN0WzBdID0gYnVmLnNsaWNlKGNweSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBsaXN0LnNoaWZ0KCk7XG5cbiAgICAgICAgYyArPSBjcHk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gZW5kUmVhZGFibGUoc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcblxuICAvLyBJZiB3ZSBnZXQgaGVyZSBiZWZvcmUgY29uc3VtaW5nIGFsbCB0aGUgYnl0ZXMsIHRoZW4gdGhhdCBpcyBhXG4gIC8vIGJ1ZyBpbiBub2RlLiAgU2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgaWYgKHN0YXRlLmxlbmd0aCA+IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKCdlbmRSZWFkYWJsZSBjYWxsZWQgb24gbm9uLWVtcHR5IHN0cmVhbScpO1xuXG4gIGlmICghc3RhdGUuZW5kRW1pdHRlZCAmJiBzdGF0ZS5jYWxsZWRSZWFkKSB7XG4gICAgc3RhdGUuZW5kZWQgPSB0cnVlO1xuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAvLyBDaGVjayB0aGF0IHdlIGRpZG4ndCBnZXQgb25lIGxhc3QgdW5zaGlmdC5cbiAgICAgIGlmICghc3RhdGUuZW5kRW1pdHRlZCAmJiBzdGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc3RhdGUuZW5kRW1pdHRlZCA9IHRydWU7XG4gICAgICAgIHN0cmVhbS5yZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgICBzdHJlYW0uZW1pdCgnZW5kJyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZm9yRWFjaCAoeHMsIGYpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmKHhzW2ldLCBpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbmRleE9mICh4cywgeCkge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmICh4c1tpXSA9PT0geCkgcmV0dXJuIGk7XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cblxuLy8gYSB0cmFuc2Zvcm0gc3RyZWFtIGlzIGEgcmVhZGFibGUvd3JpdGFibGUgc3RyZWFtIHdoZXJlIHlvdSBkb1xuLy8gc29tZXRoaW5nIHdpdGggdGhlIGRhdGEuICBTb21ldGltZXMgaXQncyBjYWxsZWQgYSBcImZpbHRlclwiLFxuLy8gYnV0IHRoYXQncyBub3QgYSBncmVhdCBuYW1lIGZvciBpdCwgc2luY2UgdGhhdCBpbXBsaWVzIGEgdGhpbmcgd2hlcmVcbi8vIHNvbWUgYml0cyBwYXNzIHRocm91Z2gsIGFuZCBvdGhlcnMgYXJlIHNpbXBseSBpZ25vcmVkLiAgKFRoYXQgd291bGRcbi8vIGJlIGEgdmFsaWQgZXhhbXBsZSBvZiBhIHRyYW5zZm9ybSwgb2YgY291cnNlLilcbi8vXG4vLyBXaGlsZSB0aGUgb3V0cHV0IGlzIGNhdXNhbGx5IHJlbGF0ZWQgdG8gdGhlIGlucHV0LCBpdCdzIG5vdCBhXG4vLyBuZWNlc3NhcmlseSBzeW1tZXRyaWMgb3Igc3luY2hyb25vdXMgdHJhbnNmb3JtYXRpb24uICBGb3IgZXhhbXBsZSxcbi8vIGEgemxpYiBzdHJlYW0gbWlnaHQgdGFrZSBtdWx0aXBsZSBwbGFpbi10ZXh0IHdyaXRlcygpLCBhbmQgdGhlblxuLy8gZW1pdCBhIHNpbmdsZSBjb21wcmVzc2VkIGNodW5rIHNvbWUgdGltZSBpbiB0aGUgZnV0dXJlLlxuLy9cbi8vIEhlcmUncyBob3cgdGhpcyB3b3Jrczpcbi8vXG4vLyBUaGUgVHJhbnNmb3JtIHN0cmVhbSBoYXMgYWxsIHRoZSBhc3BlY3RzIG9mIHRoZSByZWFkYWJsZSBhbmQgd3JpdGFibGVcbi8vIHN0cmVhbSBjbGFzc2VzLiAgV2hlbiB5b3Ugd3JpdGUoY2h1bmspLCB0aGF0IGNhbGxzIF93cml0ZShjaHVuayxjYilcbi8vIGludGVybmFsbHksIGFuZCByZXR1cm5zIGZhbHNlIGlmIHRoZXJlJ3MgYSBsb3Qgb2YgcGVuZGluZyB3cml0ZXNcbi8vIGJ1ZmZlcmVkIHVwLiAgV2hlbiB5b3UgY2FsbCByZWFkKCksIHRoYXQgY2FsbHMgX3JlYWQobikgdW50aWxcbi8vIHRoZXJlJ3MgZW5vdWdoIHBlbmRpbmcgcmVhZGFibGUgZGF0YSBidWZmZXJlZCB1cC5cbi8vXG4vLyBJbiBhIHRyYW5zZm9ybSBzdHJlYW0sIHRoZSB3cml0dGVuIGRhdGEgaXMgcGxhY2VkIGluIGEgYnVmZmVyLiAgV2hlblxuLy8gX3JlYWQobikgaXMgY2FsbGVkLCBpdCB0cmFuc2Zvcm1zIHRoZSBxdWV1ZWQgdXAgZGF0YSwgY2FsbGluZyB0aGVcbi8vIGJ1ZmZlcmVkIF93cml0ZSBjYidzIGFzIGl0IGNvbnN1bWVzIGNodW5rcy4gIElmIGNvbnN1bWluZyBhIHNpbmdsZVxuLy8gd3JpdHRlbiBjaHVuayB3b3VsZCByZXN1bHQgaW4gbXVsdGlwbGUgb3V0cHV0IGNodW5rcywgdGhlbiB0aGUgZmlyc3Rcbi8vIG91dHB1dHRlZCBiaXQgY2FsbHMgdGhlIHJlYWRjYiwgYW5kIHN1YnNlcXVlbnQgY2h1bmtzIGp1c3QgZ28gaW50b1xuLy8gdGhlIHJlYWQgYnVmZmVyLCBhbmQgd2lsbCBjYXVzZSBpdCB0byBlbWl0ICdyZWFkYWJsZScgaWYgbmVjZXNzYXJ5LlxuLy9cbi8vIFRoaXMgd2F5LCBiYWNrLXByZXNzdXJlIGlzIGFjdHVhbGx5IGRldGVybWluZWQgYnkgdGhlIHJlYWRpbmcgc2lkZSxcbi8vIHNpbmNlIF9yZWFkIGhhcyB0byBiZSBjYWxsZWQgdG8gc3RhcnQgcHJvY2Vzc2luZyBhIG5ldyBjaHVuay4gIEhvd2V2ZXIsXG4vLyBhIHBhdGhvbG9naWNhbCBpbmZsYXRlIHR5cGUgb2YgdHJhbnNmb3JtIGNhbiBjYXVzZSBleGNlc3NpdmUgYnVmZmVyaW5nXG4vLyBoZXJlLiAgRm9yIGV4YW1wbGUsIGltYWdpbmUgYSBzdHJlYW0gd2hlcmUgZXZlcnkgYnl0ZSBvZiBpbnB1dCBpc1xuLy8gaW50ZXJwcmV0ZWQgYXMgYW4gaW50ZWdlciBmcm9tIDAtMjU1LCBhbmQgdGhlbiByZXN1bHRzIGluIHRoYXQgbWFueVxuLy8gYnl0ZXMgb2Ygb3V0cHV0LiAgV3JpdGluZyB0aGUgNCBieXRlcyB7ZmYsZmYsZmYsZmZ9IHdvdWxkIHJlc3VsdCBpblxuLy8gMWtiIG9mIGRhdGEgYmVpbmcgb3V0cHV0LiAgSW4gdGhpcyBjYXNlLCB5b3UgY291bGQgd3JpdGUgYSB2ZXJ5IHNtYWxsXG4vLyBhbW91bnQgb2YgaW5wdXQsIGFuZCBlbmQgdXAgd2l0aCBhIHZlcnkgbGFyZ2UgYW1vdW50IG9mIG91dHB1dC4gIEluXG4vLyBzdWNoIGEgcGF0aG9sb2dpY2FsIGluZmxhdGluZyBtZWNoYW5pc20sIHRoZXJlJ2QgYmUgbm8gd2F5IHRvIHRlbGxcbi8vIHRoZSBzeXN0ZW0gdG8gc3RvcCBkb2luZyB0aGUgdHJhbnNmb3JtLiAgQSBzaW5nbGUgNE1CIHdyaXRlIGNvdWxkXG4vLyBjYXVzZSB0aGUgc3lzdGVtIHRvIHJ1biBvdXQgb2YgbWVtb3J5LlxuLy9cbi8vIEhvd2V2ZXIsIGV2ZW4gaW4gc3VjaCBhIHBhdGhvbG9naWNhbCBjYXNlLCBvbmx5IGEgc2luZ2xlIHdyaXR0ZW4gY2h1bmtcbi8vIHdvdWxkIGJlIGNvbnN1bWVkLCBhbmQgdGhlbiB0aGUgcmVzdCB3b3VsZCB3YWl0ICh1bi10cmFuc2Zvcm1lZCkgdW50aWxcbi8vIHRoZSByZXN1bHRzIG9mIHRoZSBwcmV2aW91cyB0cmFuc2Zvcm1lZCBjaHVuayB3ZXJlIGNvbnN1bWVkLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTtcblxudmFyIER1cGxleCA9IHJlcXVpcmUoJy4vX3N0cmVhbV9kdXBsZXgnKTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG51dGlsLmluaGVyaXRzKFRyYW5zZm9ybSwgRHVwbGV4KTtcblxuXG5mdW5jdGlvbiBUcmFuc2Zvcm1TdGF0ZShvcHRpb25zLCBzdHJlYW0pIHtcbiAgdGhpcy5hZnRlclRyYW5zZm9ybSA9IGZ1bmN0aW9uKGVyLCBkYXRhKSB7XG4gICAgcmV0dXJuIGFmdGVyVHJhbnNmb3JtKHN0cmVhbSwgZXIsIGRhdGEpO1xuICB9O1xuXG4gIHRoaXMubmVlZFRyYW5zZm9ybSA9IGZhbHNlO1xuICB0aGlzLnRyYW5zZm9ybWluZyA9IGZhbHNlO1xuICB0aGlzLndyaXRlY2IgPSBudWxsO1xuICB0aGlzLndyaXRlY2h1bmsgPSBudWxsO1xufVxuXG5mdW5jdGlvbiBhZnRlclRyYW5zZm9ybShzdHJlYW0sIGVyLCBkYXRhKSB7XG4gIHZhciB0cyA9IHN0cmVhbS5fdHJhbnNmb3JtU3RhdGU7XG4gIHRzLnRyYW5zZm9ybWluZyA9IGZhbHNlO1xuXG4gIHZhciBjYiA9IHRzLndyaXRlY2I7XG5cbiAgaWYgKCFjYilcbiAgICByZXR1cm4gc3RyZWFtLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdubyB3cml0ZWNiIGluIFRyYW5zZm9ybSBjbGFzcycpKTtcblxuICB0cy53cml0ZWNodW5rID0gbnVsbDtcbiAgdHMud3JpdGVjYiA9IG51bGw7XG5cbiAgaWYgKGRhdGEgIT09IG51bGwgJiYgZGF0YSAhPT0gdW5kZWZpbmVkKVxuICAgIHN0cmVhbS5wdXNoKGRhdGEpO1xuXG4gIGlmIChjYilcbiAgICBjYihlcik7XG5cbiAgdmFyIHJzID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuICBycy5yZWFkaW5nID0gZmFsc2U7XG4gIGlmIChycy5uZWVkUmVhZGFibGUgfHwgcnMubGVuZ3RoIDwgcnMuaGlnaFdhdGVyTWFyaykge1xuICAgIHN0cmVhbS5fcmVhZChycy5oaWdoV2F0ZXJNYXJrKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIFRyYW5zZm9ybShvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBUcmFuc2Zvcm0pKVxuICAgIHJldHVybiBuZXcgVHJhbnNmb3JtKG9wdGlvbnMpO1xuXG4gIER1cGxleC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gIHZhciB0cyA9IHRoaXMuX3RyYW5zZm9ybVN0YXRlID0gbmV3IFRyYW5zZm9ybVN0YXRlKG9wdGlvbnMsIHRoaXMpO1xuXG4gIC8vIHdoZW4gdGhlIHdyaXRhYmxlIHNpZGUgZmluaXNoZXMsIHRoZW4gZmx1c2ggb3V0IGFueXRoaW5nIHJlbWFpbmluZy5cbiAgdmFyIHN0cmVhbSA9IHRoaXM7XG5cbiAgLy8gc3RhcnQgb3V0IGFza2luZyBmb3IgYSByZWFkYWJsZSBldmVudCBvbmNlIGRhdGEgaXMgdHJhbnNmb3JtZWQuXG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcblxuICAvLyB3ZSBoYXZlIGltcGxlbWVudGVkIHRoZSBfcmVhZCBtZXRob2QsIGFuZCBkb25lIHRoZSBvdGhlciB0aGluZ3NcbiAgLy8gdGhhdCBSZWFkYWJsZSB3YW50cyBiZWZvcmUgdGhlIGZpcnN0IF9yZWFkIGNhbGwsIHNvIHVuc2V0IHRoZVxuICAvLyBzeW5jIGd1YXJkIGZsYWcuXG4gIHRoaXMuX3JlYWRhYmxlU3RhdGUuc3luYyA9IGZhbHNlO1xuXG4gIHRoaXMub25jZSgnZmluaXNoJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLl9mbHVzaClcbiAgICAgIHRoaXMuX2ZsdXNoKGZ1bmN0aW9uKGVyKSB7XG4gICAgICAgIGRvbmUoc3RyZWFtLCBlcik7XG4gICAgICB9KTtcbiAgICBlbHNlXG4gICAgICBkb25lKHN0cmVhbSk7XG4gIH0pO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcpIHtcbiAgdGhpcy5fdHJhbnNmb3JtU3RhdGUubmVlZFRyYW5zZm9ybSA9IGZhbHNlO1xuICByZXR1cm4gRHVwbGV4LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgY2h1bmssIGVuY29kaW5nKTtcbn07XG5cbi8vIFRoaXMgaXMgdGhlIHBhcnQgd2hlcmUgeW91IGRvIHN0dWZmIVxuLy8gb3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiBpbiBpbXBsZW1lbnRhdGlvbiBjbGFzc2VzLlxuLy8gJ2NodW5rJyBpcyBhbiBpbnB1dCBjaHVuay5cbi8vXG4vLyBDYWxsIGBwdXNoKG5ld0NodW5rKWAgdG8gcGFzcyBhbG9uZyB0cmFuc2Zvcm1lZCBvdXRwdXRcbi8vIHRvIHRoZSByZWFkYWJsZSBzaWRlLiAgWW91IG1heSBjYWxsICdwdXNoJyB6ZXJvIG9yIG1vcmUgdGltZXMuXG4vL1xuLy8gQ2FsbCBgY2IoZXJyKWAgd2hlbiB5b3UgYXJlIGRvbmUgd2l0aCB0aGlzIGNodW5rLiAgSWYgeW91IHBhc3Ncbi8vIGFuIGVycm9yLCB0aGVuIHRoYXQnbGwgcHV0IHRoZSBodXJ0IG9uIHRoZSB3aG9sZSBvcGVyYXRpb24uICBJZiB5b3Vcbi8vIG5ldmVyIGNhbGwgY2IoKSwgdGhlbiB5b3UnbGwgbmV2ZXIgZ2V0IGFub3RoZXIgY2h1bmsuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl93cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHRzID0gdGhpcy5fdHJhbnNmb3JtU3RhdGU7XG4gIHRzLndyaXRlY2IgPSBjYjtcbiAgdHMud3JpdGVjaHVuayA9IGNodW5rO1xuICB0cy53cml0ZWVuY29kaW5nID0gZW5jb2Rpbmc7XG4gIGlmICghdHMudHJhbnNmb3JtaW5nKSB7XG4gICAgdmFyIHJzID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgICBpZiAodHMubmVlZFRyYW5zZm9ybSB8fFxuICAgICAgICBycy5uZWVkUmVhZGFibGUgfHxcbiAgICAgICAgcnMubGVuZ3RoIDwgcnMuaGlnaFdhdGVyTWFyaylcbiAgICAgIHRoaXMuX3JlYWQocnMuaGlnaFdhdGVyTWFyayk7XG4gIH1cbn07XG5cbi8vIERvZXNuJ3QgbWF0dGVyIHdoYXQgdGhlIGFyZ3MgYXJlIGhlcmUuXG4vLyBfdHJhbnNmb3JtIGRvZXMgYWxsIHRoZSB3b3JrLlxuLy8gVGhhdCB3ZSBnb3QgaGVyZSBtZWFucyB0aGF0IHRoZSByZWFkYWJsZSBzaWRlIHdhbnRzIG1vcmUgZGF0YS5cblRyYW5zZm9ybS5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gIHZhciB0cyA9IHRoaXMuX3RyYW5zZm9ybVN0YXRlO1xuXG4gIGlmICh0cy53cml0ZWNodW5rICE9PSBudWxsICYmIHRzLndyaXRlY2IgJiYgIXRzLnRyYW5zZm9ybWluZykge1xuICAgIHRzLnRyYW5zZm9ybWluZyA9IHRydWU7XG4gICAgdGhpcy5fdHJhbnNmb3JtKHRzLndyaXRlY2h1bmssIHRzLndyaXRlZW5jb2RpbmcsIHRzLmFmdGVyVHJhbnNmb3JtKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBtYXJrIHRoYXQgd2UgbmVlZCBhIHRyYW5zZm9ybSwgc28gdGhhdCBhbnkgZGF0YSB0aGF0IGNvbWVzIGluXG4gICAgLy8gd2lsbCBnZXQgcHJvY2Vzc2VkLCBub3cgdGhhdCB3ZSd2ZSBhc2tlZCBmb3IgaXQuXG4gICAgdHMubmVlZFRyYW5zZm9ybSA9IHRydWU7XG4gIH1cbn07XG5cblxuZnVuY3Rpb24gZG9uZShzdHJlYW0sIGVyKSB7XG4gIGlmIChlcilcbiAgICByZXR1cm4gc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuXG4gIC8vIGlmIHRoZXJlJ3Mgbm90aGluZyBpbiB0aGUgd3JpdGUgYnVmZmVyLCB0aGVuIHRoYXQgbWVhbnNcbiAgLy8gdGhhdCBub3RoaW5nIG1vcmUgd2lsbCBldmVyIGJlIHByb3ZpZGVkXG4gIHZhciB3cyA9IHN0cmVhbS5fd3JpdGFibGVTdGF0ZTtcbiAgdmFyIHJzID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuICB2YXIgdHMgPSBzdHJlYW0uX3RyYW5zZm9ybVN0YXRlO1xuXG4gIGlmICh3cy5sZW5ndGgpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYWxsaW5nIHRyYW5zZm9ybSBkb25lIHdoZW4gd3MubGVuZ3RoICE9IDAnKTtcblxuICBpZiAodHMudHJhbnNmb3JtaW5nKVxuICAgIHRocm93IG5ldyBFcnJvcignY2FsbGluZyB0cmFuc2Zvcm0gZG9uZSB3aGVuIHN0aWxsIHRyYW5zZm9ybWluZycpO1xuXG4gIHJldHVybiBzdHJlYW0ucHVzaChudWxsKTtcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBBIGJpdCBzaW1wbGVyIHRoYW4gcmVhZGFibGUgc3RyZWFtcy5cbi8vIEltcGxlbWVudCBhbiBhc3luYyAuX3dyaXRlKGNodW5rLCBjYiksIGFuZCBpdCdsbCBoYW5kbGUgYWxsXG4vLyB0aGUgZHJhaW4gZXZlbnQgZW1pc3Npb24gYW5kIGJ1ZmZlcmluZy5cblxubW9kdWxlLmV4cG9ydHMgPSBXcml0YWJsZTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuV3JpdGFibGUuV3JpdGFibGVTdGF0ZSA9IFdyaXRhYmxlU3RhdGU7XG5cblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG5cbnV0aWwuaW5oZXJpdHMoV3JpdGFibGUsIFN0cmVhbSk7XG5cbmZ1bmN0aW9uIFdyaXRlUmVxKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdGhpcy5jaHVuayA9IGNodW5rO1xuICB0aGlzLmVuY29kaW5nID0gZW5jb2Rpbmc7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYjtcbn1cblxuZnVuY3Rpb24gV3JpdGFibGVTdGF0ZShvcHRpb25zLCBzdHJlYW0pIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gdGhlIHBvaW50IGF0IHdoaWNoIHdyaXRlKCkgc3RhcnRzIHJldHVybmluZyBmYWxzZVxuICAvLyBOb3RlOiAwIGlzIGEgdmFsaWQgdmFsdWUsIG1lYW5zIHRoYXQgd2UgYWx3YXlzIHJldHVybiBmYWxzZSBpZlxuICAvLyB0aGUgZW50aXJlIGJ1ZmZlciBpcyBub3QgZmx1c2hlZCBpbW1lZGlhdGVseSBvbiB3cml0ZSgpXG4gIHZhciBod20gPSBvcHRpb25zLmhpZ2hXYXRlck1hcms7XG4gIHRoaXMuaGlnaFdhdGVyTWFyayA9IChod20gfHwgaHdtID09PSAwKSA/IGh3bSA6IDE2ICogMTAyNDtcblxuICAvLyBvYmplY3Qgc3RyZWFtIGZsYWcgdG8gaW5kaWNhdGUgd2hldGhlciBvciBub3QgdGhpcyBzdHJlYW1cbiAgLy8gY29udGFpbnMgYnVmZmVycyBvciBvYmplY3RzLlxuICB0aGlzLm9iamVjdE1vZGUgPSAhIW9wdGlvbnMub2JqZWN0TW9kZTtcblxuICAvLyBjYXN0IHRvIGludHMuXG4gIHRoaXMuaGlnaFdhdGVyTWFyayA9IH5+dGhpcy5oaWdoV2F0ZXJNYXJrO1xuXG4gIHRoaXMubmVlZERyYWluID0gZmFsc2U7XG4gIC8vIGF0IHRoZSBzdGFydCBvZiBjYWxsaW5nIGVuZCgpXG4gIHRoaXMuZW5kaW5nID0gZmFsc2U7XG4gIC8vIHdoZW4gZW5kKCkgaGFzIGJlZW4gY2FsbGVkLCBhbmQgcmV0dXJuZWRcbiAgdGhpcy5lbmRlZCA9IGZhbHNlO1xuICAvLyB3aGVuICdmaW5pc2gnIGlzIGVtaXR0ZWRcbiAgdGhpcy5maW5pc2hlZCA9IGZhbHNlO1xuXG4gIC8vIHNob3VsZCB3ZSBkZWNvZGUgc3RyaW5ncyBpbnRvIGJ1ZmZlcnMgYmVmb3JlIHBhc3NpbmcgdG8gX3dyaXRlP1xuICAvLyB0aGlzIGlzIGhlcmUgc28gdGhhdCBzb21lIG5vZGUtY29yZSBzdHJlYW1zIGNhbiBvcHRpbWl6ZSBzdHJpbmdcbiAgLy8gaGFuZGxpbmcgYXQgYSBsb3dlciBsZXZlbC5cbiAgdmFyIG5vRGVjb2RlID0gb3B0aW9ucy5kZWNvZGVTdHJpbmdzID09PSBmYWxzZTtcbiAgdGhpcy5kZWNvZGVTdHJpbmdzID0gIW5vRGVjb2RlO1xuXG4gIC8vIENyeXB0byBpcyBraW5kIG9mIG9sZCBhbmQgY3J1c3R5LiAgSGlzdG9yaWNhbGx5LCBpdHMgZGVmYXVsdCBzdHJpbmdcbiAgLy8gZW5jb2RpbmcgaXMgJ2JpbmFyeScgc28gd2UgaGF2ZSB0byBtYWtlIHRoaXMgY29uZmlndXJhYmxlLlxuICAvLyBFdmVyeXRoaW5nIGVsc2UgaW4gdGhlIHVuaXZlcnNlIHVzZXMgJ3V0ZjgnLCB0aG91Z2guXG4gIHRoaXMuZGVmYXVsdEVuY29kaW5nID0gb3B0aW9ucy5kZWZhdWx0RW5jb2RpbmcgfHwgJ3V0ZjgnO1xuXG4gIC8vIG5vdCBhbiBhY3R1YWwgYnVmZmVyIHdlIGtlZXAgdHJhY2sgb2YsIGJ1dCBhIG1lYXN1cmVtZW50XG4gIC8vIG9mIGhvdyBtdWNoIHdlJ3JlIHdhaXRpbmcgdG8gZ2V0IHB1c2hlZCB0byBzb21lIHVuZGVybHlpbmdcbiAgLy8gc29ja2V0IG9yIGZpbGUuXG4gIHRoaXMubGVuZ3RoID0gMDtcblxuICAvLyBhIGZsYWcgdG8gc2VlIHdoZW4gd2UncmUgaW4gdGhlIG1pZGRsZSBvZiBhIHdyaXRlLlxuICB0aGlzLndyaXRpbmcgPSBmYWxzZTtcblxuICAvLyBhIGZsYWcgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIHRoZSBvbndyaXRlIGNiIGlzIGNhbGxlZCBpbW1lZGlhdGVseSxcbiAgLy8gb3Igb24gYSBsYXRlciB0aWNrLiAgV2Ugc2V0IHRoaXMgdG8gdHJ1ZSBhdCBmaXJzdCwgYmVjdWFzZSBhbnlcbiAgLy8gYWN0aW9ucyB0aGF0IHNob3VsZG4ndCBoYXBwZW4gdW50aWwgXCJsYXRlclwiIHNob3VsZCBnZW5lcmFsbHkgYWxzb1xuICAvLyBub3QgaGFwcGVuIGJlZm9yZSB0aGUgZmlyc3Qgd3JpdGUgY2FsbC5cbiAgdGhpcy5zeW5jID0gdHJ1ZTtcblxuICAvLyBhIGZsYWcgdG8ga25vdyBpZiB3ZSdyZSBwcm9jZXNzaW5nIHByZXZpb3VzbHkgYnVmZmVyZWQgaXRlbXMsIHdoaWNoXG4gIC8vIG1heSBjYWxsIHRoZSBfd3JpdGUoKSBjYWxsYmFjayBpbiB0aGUgc2FtZSB0aWNrLCBzbyB0aGF0IHdlIGRvbid0XG4gIC8vIGVuZCB1cCBpbiBhbiBvdmVybGFwcGVkIG9ud3JpdGUgc2l0dWF0aW9uLlxuICB0aGlzLmJ1ZmZlclByb2Nlc3NpbmcgPSBmYWxzZTtcblxuICAvLyB0aGUgY2FsbGJhY2sgdGhhdCdzIHBhc3NlZCB0byBfd3JpdGUoY2h1bmssY2IpXG4gIHRoaXMub253cml0ZSA9IGZ1bmN0aW9uKGVyKSB7XG4gICAgb253cml0ZShzdHJlYW0sIGVyKTtcbiAgfTtcblxuICAvLyB0aGUgY2FsbGJhY2sgdGhhdCB0aGUgdXNlciBzdXBwbGllcyB0byB3cml0ZShjaHVuayxlbmNvZGluZyxjYilcbiAgdGhpcy53cml0ZWNiID0gbnVsbDtcblxuICAvLyB0aGUgYW1vdW50IHRoYXQgaXMgYmVpbmcgd3JpdHRlbiB3aGVuIF93cml0ZSBpcyBjYWxsZWQuXG4gIHRoaXMud3JpdGVsZW4gPSAwO1xuXG4gIHRoaXMuYnVmZmVyID0gW107XG5cbiAgLy8gVHJ1ZSBpZiB0aGUgZXJyb3Igd2FzIGFscmVhZHkgZW1pdHRlZCBhbmQgc2hvdWxkIG5vdCBiZSB0aHJvd24gYWdhaW5cbiAgdGhpcy5lcnJvckVtaXR0ZWQgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gV3JpdGFibGUob3B0aW9ucykge1xuICB2YXIgRHVwbGV4ID0gcmVxdWlyZSgnLi9fc3RyZWFtX2R1cGxleCcpO1xuXG4gIC8vIFdyaXRhYmxlIGN0b3IgaXMgYXBwbGllZCB0byBEdXBsZXhlcywgdGhvdWdoIHRoZXkncmUgbm90XG4gIC8vIGluc3RhbmNlb2YgV3JpdGFibGUsIHRoZXkncmUgaW5zdGFuY2VvZiBSZWFkYWJsZS5cbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdyaXRhYmxlKSAmJiAhKHRoaXMgaW5zdGFuY2VvZiBEdXBsZXgpKVxuICAgIHJldHVybiBuZXcgV3JpdGFibGUob3B0aW9ucyk7XG5cbiAgdGhpcy5fd3JpdGFibGVTdGF0ZSA9IG5ldyBXcml0YWJsZVN0YXRlKG9wdGlvbnMsIHRoaXMpO1xuXG4gIC8vIGxlZ2FjeS5cbiAgdGhpcy53cml0YWJsZSA9IHRydWU7XG5cbiAgU3RyZWFtLmNhbGwodGhpcyk7XG59XG5cbi8vIE90aGVyd2lzZSBwZW9wbGUgY2FuIHBpcGUgV3JpdGFibGUgc3RyZWFtcywgd2hpY2ggaXMganVzdCB3cm9uZy5cbldyaXRhYmxlLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ0Nhbm5vdCBwaXBlLiBOb3QgcmVhZGFibGUuJykpO1xufTtcblxuXG5mdW5jdGlvbiB3cml0ZUFmdGVyRW5kKHN0cmVhbSwgc3RhdGUsIGNiKSB7XG4gIHZhciBlciA9IG5ldyBFcnJvcignd3JpdGUgYWZ0ZXIgZW5kJyk7XG4gIC8vIFRPRE86IGRlZmVyIGVycm9yIGV2ZW50cyBjb25zaXN0ZW50bHkgZXZlcnl3aGVyZSwgbm90IGp1c3QgdGhlIGNiXG4gIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbiAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICBjYihlcik7XG4gIH0pO1xufVxuXG4vLyBJZiB3ZSBnZXQgc29tZXRoaW5nIHRoYXQgaXMgbm90IGEgYnVmZmVyLCBzdHJpbmcsIG51bGwsIG9yIHVuZGVmaW5lZCxcbi8vIGFuZCB3ZSdyZSBub3QgaW4gb2JqZWN0TW9kZSwgdGhlbiB0aGF0J3MgYW4gZXJyb3IuXG4vLyBPdGhlcndpc2Ugc3RyZWFtIGNodW5rcyBhcmUgYWxsIGNvbnNpZGVyZWQgdG8gYmUgb2YgbGVuZ3RoPTEsIGFuZCB0aGVcbi8vIHdhdGVybWFya3MgZGV0ZXJtaW5lIGhvdyBtYW55IG9iamVjdHMgdG8ga2VlcCBpbiB0aGUgYnVmZmVyLCByYXRoZXIgdGhhblxuLy8gaG93IG1hbnkgYnl0ZXMgb3IgY2hhcmFjdGVycy5cbmZ1bmN0aW9uIHZhbGlkQ2h1bmsoc3RyZWFtLCBzdGF0ZSwgY2h1bmssIGNiKSB7XG4gIHZhciB2YWxpZCA9IHRydWU7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGNodW5rKSAmJlxuICAgICAgJ3N0cmluZycgIT09IHR5cGVvZiBjaHVuayAmJlxuICAgICAgY2h1bmsgIT09IG51bGwgJiZcbiAgICAgIGNodW5rICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICFzdGF0ZS5vYmplY3RNb2RlKSB7XG4gICAgdmFyIGVyID0gbmV3IFR5cGVFcnJvcignSW52YWxpZCBub24tc3RyaW5nL2J1ZmZlciBjaHVuaycpO1xuICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2IoZXIpO1xuICAgIH0pO1xuICAgIHZhbGlkID0gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHZhbGlkO1xufVxuXG5Xcml0YWJsZS5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3dyaXRhYmxlU3RhdGU7XG4gIHZhciByZXQgPSBmYWxzZTtcblxuICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBlbmNvZGluZztcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH1cblxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKGNodW5rKSlcbiAgICBlbmNvZGluZyA9ICdidWZmZXInO1xuICBlbHNlIGlmICghZW5jb2RpbmcpXG4gICAgZW5jb2RpbmcgPSBzdGF0ZS5kZWZhdWx0RW5jb2Rpbmc7XG5cbiAgaWYgKHR5cGVvZiBjYiAhPT0gJ2Z1bmN0aW9uJylcbiAgICBjYiA9IGZ1bmN0aW9uKCkge307XG5cbiAgaWYgKHN0YXRlLmVuZGVkKVxuICAgIHdyaXRlQWZ0ZXJFbmQodGhpcywgc3RhdGUsIGNiKTtcbiAgZWxzZSBpZiAodmFsaWRDaHVuayh0aGlzLCBzdGF0ZSwgY2h1bmssIGNiKSlcbiAgICByZXQgPSB3cml0ZU9yQnVmZmVyKHRoaXMsIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGNiKTtcblxuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gZGVjb2RlQ2h1bmsoc3RhdGUsIGNodW5rLCBlbmNvZGluZykge1xuICBpZiAoIXN0YXRlLm9iamVjdE1vZGUgJiZcbiAgICAgIHN0YXRlLmRlY29kZVN0cmluZ3MgIT09IGZhbHNlICYmXG4gICAgICB0eXBlb2YgY2h1bmsgPT09ICdzdHJpbmcnKSB7XG4gICAgY2h1bmsgPSBuZXcgQnVmZmVyKGNodW5rLCBlbmNvZGluZyk7XG4gIH1cbiAgcmV0dXJuIGNodW5rO1xufVxuXG4vLyBpZiB3ZSdyZSBhbHJlYWR5IHdyaXRpbmcgc29tZXRoaW5nLCB0aGVuIGp1c3QgcHV0IHRoaXNcbi8vIGluIHRoZSBxdWV1ZSwgYW5kIHdhaXQgb3VyIHR1cm4uICBPdGhlcndpc2UsIGNhbGwgX3dyaXRlXG4vLyBJZiB3ZSByZXR1cm4gZmFsc2UsIHRoZW4gd2UgbmVlZCBhIGRyYWluIGV2ZW50LCBzbyBzZXQgdGhhdCBmbGFnLlxuZnVuY3Rpb24gd3JpdGVPckJ1ZmZlcihzdHJlYW0sIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNodW5rID0gZGVjb2RlQ2h1bmsoc3RhdGUsIGNodW5rLCBlbmNvZGluZyk7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspKVxuICAgIGVuY29kaW5nID0gJ2J1ZmZlcic7XG4gIHZhciBsZW4gPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcblxuICBzdGF0ZS5sZW5ndGggKz0gbGVuO1xuXG4gIHZhciByZXQgPSBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrO1xuICAvLyB3ZSBtdXN0IGVuc3VyZSB0aGF0IHByZXZpb3VzIG5lZWREcmFpbiB3aWxsIG5vdCBiZSByZXNldCB0byBmYWxzZS5cbiAgaWYgKCFyZXQpXG4gICAgc3RhdGUubmVlZERyYWluID0gdHJ1ZTtcblxuICBpZiAoc3RhdGUud3JpdGluZylcbiAgICBzdGF0ZS5idWZmZXIucHVzaChuZXcgV3JpdGVSZXEoY2h1bmssIGVuY29kaW5nLCBjYikpO1xuICBlbHNlXG4gICAgZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpO1xuXG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGRvV3JpdGUoc3RyZWFtLCBzdGF0ZSwgbGVuLCBjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHN0YXRlLndyaXRlbGVuID0gbGVuO1xuICBzdGF0ZS53cml0ZWNiID0gY2I7XG4gIHN0YXRlLndyaXRpbmcgPSB0cnVlO1xuICBzdGF0ZS5zeW5jID0gdHJ1ZTtcbiAgc3RyZWFtLl93cml0ZShjaHVuaywgZW5jb2RpbmcsIHN0YXRlLm9ud3JpdGUpO1xuICBzdGF0ZS5zeW5jID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGVFcnJvcihzdHJlYW0sIHN0YXRlLCBzeW5jLCBlciwgY2IpIHtcbiAgaWYgKHN5bmMpXG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGNiKGVyKTtcbiAgICB9KTtcbiAgZWxzZVxuICAgIGNiKGVyKTtcblxuICBzdHJlYW0uX3dyaXRhYmxlU3RhdGUuZXJyb3JFbWl0dGVkID0gdHJ1ZTtcbiAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xufVxuXG5mdW5jdGlvbiBvbndyaXRlU3RhdGVVcGRhdGUoc3RhdGUpIHtcbiAgc3RhdGUud3JpdGluZyA9IGZhbHNlO1xuICBzdGF0ZS53cml0ZWNiID0gbnVsbDtcbiAgc3RhdGUubGVuZ3RoIC09IHN0YXRlLndyaXRlbGVuO1xuICBzdGF0ZS53cml0ZWxlbiA9IDA7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGUoc3RyZWFtLCBlcikge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3dyaXRhYmxlU3RhdGU7XG4gIHZhciBzeW5jID0gc3RhdGUuc3luYztcbiAgdmFyIGNiID0gc3RhdGUud3JpdGVjYjtcblxuICBvbndyaXRlU3RhdGVVcGRhdGUoc3RhdGUpO1xuXG4gIGlmIChlcilcbiAgICBvbndyaXRlRXJyb3Ioc3RyZWFtLCBzdGF0ZSwgc3luYywgZXIsIGNiKTtcbiAgZWxzZSB7XG4gICAgLy8gQ2hlY2sgaWYgd2UncmUgYWN0dWFsbHkgcmVhZHkgdG8gZmluaXNoLCBidXQgZG9uJ3QgZW1pdCB5ZXRcbiAgICB2YXIgZmluaXNoZWQgPSBuZWVkRmluaXNoKHN0cmVhbSwgc3RhdGUpO1xuXG4gICAgaWYgKCFmaW5pc2hlZCAmJiAhc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyAmJiBzdGF0ZS5idWZmZXIubGVuZ3RoKVxuICAgICAgY2xlYXJCdWZmZXIoc3RyZWFtLCBzdGF0ZSk7XG5cbiAgICBpZiAoc3luYykge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFmdGVyV3JpdGUoc3RyZWFtLCBzdGF0ZSwgZmluaXNoZWQsIGNiKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpIHtcbiAgaWYgKCFmaW5pc2hlZClcbiAgICBvbndyaXRlRHJhaW4oc3RyZWFtLCBzdGF0ZSk7XG4gIGNiKCk7XG4gIGlmIChmaW5pc2hlZClcbiAgICBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKTtcbn1cblxuLy8gTXVzdCBmb3JjZSBjYWxsYmFjayB0byBiZSBjYWxsZWQgb24gbmV4dFRpY2ssIHNvIHRoYXQgd2UgZG9uJ3Rcbi8vIGVtaXQgJ2RyYWluJyBiZWZvcmUgdGhlIHdyaXRlKCkgY29uc3VtZXIgZ2V0cyB0aGUgJ2ZhbHNlJyByZXR1cm5cbi8vIHZhbHVlLCBhbmQgaGFzIGEgY2hhbmNlIHRvIGF0dGFjaCBhICdkcmFpbicgbGlzdGVuZXIuXG5mdW5jdGlvbiBvbndyaXRlRHJhaW4oc3RyZWFtLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmIHN0YXRlLm5lZWREcmFpbikge1xuICAgIHN0YXRlLm5lZWREcmFpbiA9IGZhbHNlO1xuICAgIHN0cmVhbS5lbWl0KCdkcmFpbicpO1xuICB9XG59XG5cblxuLy8gaWYgdGhlcmUncyBzb21ldGhpbmcgaW4gdGhlIGJ1ZmZlciB3YWl0aW5nLCB0aGVuIHByb2Nlc3MgaXRcbmZ1bmN0aW9uIGNsZWFyQnVmZmVyKHN0cmVhbSwgc3RhdGUpIHtcbiAgc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyA9IHRydWU7XG5cbiAgZm9yICh2YXIgYyA9IDA7IGMgPCBzdGF0ZS5idWZmZXIubGVuZ3RoOyBjKyspIHtcbiAgICB2YXIgZW50cnkgPSBzdGF0ZS5idWZmZXJbY107XG4gICAgdmFyIGNodW5rID0gZW50cnkuY2h1bms7XG4gICAgdmFyIGVuY29kaW5nID0gZW50cnkuZW5jb2Rpbmc7XG4gICAgdmFyIGNiID0gZW50cnkuY2FsbGJhY2s7XG4gICAgdmFyIGxlbiA9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuXG4gICAgZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpO1xuXG4gICAgLy8gaWYgd2UgZGlkbid0IGNhbGwgdGhlIG9ud3JpdGUgaW1tZWRpYXRlbHksIHRoZW5cbiAgICAvLyBpdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gd2FpdCB1bnRpbCBpdCBkb2VzLlxuICAgIC8vIGFsc28sIHRoYXQgbWVhbnMgdGhhdCB0aGUgY2h1bmsgYW5kIGNiIGFyZSBjdXJyZW50bHlcbiAgICAvLyBiZWluZyBwcm9jZXNzZWQsIHNvIG1vdmUgdGhlIGJ1ZmZlciBjb3VudGVyIHBhc3QgdGhlbS5cbiAgICBpZiAoc3RhdGUud3JpdGluZykge1xuICAgICAgYysrO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgc3RhdGUuYnVmZmVyUHJvY2Vzc2luZyA9IGZhbHNlO1xuICBpZiAoYyA8IHN0YXRlLmJ1ZmZlci5sZW5ndGgpXG4gICAgc3RhdGUuYnVmZmVyID0gc3RhdGUuYnVmZmVyLnNsaWNlKGMpO1xuICBlbHNlXG4gICAgc3RhdGUuYnVmZmVyLmxlbmd0aCA9IDA7XG59XG5cbldyaXRhYmxlLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNiKG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJykpO1xufTtcblxuV3JpdGFibGUucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fd3JpdGFibGVTdGF0ZTtcblxuICBpZiAodHlwZW9mIGNodW5rID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBjaHVuaztcbiAgICBjaHVuayA9IG51bGw7XG4gICAgZW5jb2RpbmcgPSBudWxsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGNiID0gZW5jb2Rpbmc7XG4gICAgZW5jb2RpbmcgPSBudWxsO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBjaHVuayAhPT0gJ3VuZGVmaW5lZCcgJiYgY2h1bmsgIT09IG51bGwpXG4gICAgdGhpcy53cml0ZShjaHVuaywgZW5jb2RpbmcpO1xuXG4gIC8vIGlnbm9yZSB1bm5lY2Vzc2FyeSBlbmQoKSBjYWxscy5cbiAgaWYgKCFzdGF0ZS5lbmRpbmcgJiYgIXN0YXRlLmZpbmlzaGVkKVxuICAgIGVuZFdyaXRhYmxlKHRoaXMsIHN0YXRlLCBjYik7XG59O1xuXG5cbmZ1bmN0aW9uIG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSkge1xuICByZXR1cm4gKHN0YXRlLmVuZGluZyAmJlxuICAgICAgICAgIHN0YXRlLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICFzdGF0ZS5maW5pc2hlZCAmJlxuICAgICAgICAgICFzdGF0ZS53cml0aW5nKTtcbn1cblxuZnVuY3Rpb24gZmluaXNoTWF5YmUoc3RyZWFtLCBzdGF0ZSkge1xuICB2YXIgbmVlZCA9IG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSk7XG4gIGlmIChuZWVkKSB7XG4gICAgc3RhdGUuZmluaXNoZWQgPSB0cnVlO1xuICAgIHN0cmVhbS5lbWl0KCdmaW5pc2gnKTtcbiAgfVxuICByZXR1cm4gbmVlZDtcbn1cblxuZnVuY3Rpb24gZW5kV3JpdGFibGUoc3RyZWFtLCBzdGF0ZSwgY2IpIHtcbiAgc3RhdGUuZW5kaW5nID0gdHJ1ZTtcbiAgZmluaXNoTWF5YmUoc3RyZWFtLCBzdGF0ZSk7XG4gIGlmIChjYikge1xuICAgIGlmIChzdGF0ZS5maW5pc2hlZClcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soY2IpO1xuICAgIGVsc2VcbiAgICAgIHN0cmVhbS5vbmNlKCdmaW5pc2gnLCBjYik7XG4gIH1cbiAgc3RhdGUuZW5kZWQgPSB0cnVlO1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5mdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIEJ1ZmZlci5pc0J1ZmZlcihhcmcpO1xufVxuZXhwb3J0cy5pc0J1ZmZlciA9IGlzQnVmZmVyO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvX3N0cmVhbV9wYXNzdGhyb3VnaC5qc1wiKVxuIiwidmFyIFN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpOyAvLyBoYWNrIHRvIGZpeCBhIGNpcmN1bGFyIGRlcGVuZGVuY3kgaXNzdWUgd2hlbiB1c2VkIHdpdGggYnJvd3NlcmlmeVxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvX3N0cmVhbV9yZWFkYWJsZS5qcycpO1xuZXhwb3J0cy5TdHJlYW0gPSBTdHJlYW07XG5leHBvcnRzLlJlYWRhYmxlID0gZXhwb3J0cztcbmV4cG9ydHMuV3JpdGFibGUgPSByZXF1aXJlKCcuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzJyk7XG5leHBvcnRzLkR1cGxleCA9IHJlcXVpcmUoJy4vbGliL19zdHJlYW1fZHVwbGV4LmpzJyk7XG5leHBvcnRzLlRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vbGliL19zdHJlYW1fdHJhbnNmb3JtLmpzJyk7XG5leHBvcnRzLlBhc3NUaHJvdWdoID0gcmVxdWlyZSgnLi9saWIvX3N0cmVhbV9wYXNzdGhyb3VnaC5qcycpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanNcIilcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliL19zdHJlYW1fd3JpdGFibGUuanNcIilcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFN0cmVhbTtcblxudmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuaW5oZXJpdHMoU3RyZWFtLCBFRSk7XG5TdHJlYW0uUmVhZGFibGUgPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vcmVhZGFibGUuanMnKTtcblN0cmVhbS5Xcml0YWJsZSA9IHJlcXVpcmUoJ3JlYWRhYmxlLXN0cmVhbS93cml0YWJsZS5qcycpO1xuU3RyZWFtLkR1cGxleCA9IHJlcXVpcmUoJ3JlYWRhYmxlLXN0cmVhbS9kdXBsZXguanMnKTtcblN0cmVhbS5UcmFuc2Zvcm0gPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vdHJhbnNmb3JtLmpzJyk7XG5TdHJlYW0uUGFzc1Rocm91Z2ggPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vcGFzc3Rocm91Z2guanMnKTtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC40LnhcblN0cmVhbS5TdHJlYW0gPSBTdHJlYW07XG5cblxuXG4vLyBvbGQtc3R5bGUgc3RyZWFtcy4gIE5vdGUgdGhhdCB0aGUgcGlwZSBtZXRob2QgKHRoZSBvbmx5IHJlbGV2YW50XG4vLyBwYXJ0IG9mIHRoaXMgY2xhc3MpIGlzIG92ZXJyaWRkZW4gaW4gdGhlIFJlYWRhYmxlIGNsYXNzLlxuXG5mdW5jdGlvbiBTdHJlYW0oKSB7XG4gIEVFLmNhbGwodGhpcyk7XG59XG5cblN0cmVhbS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKGRlc3QsIG9wdGlvbnMpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXM7XG5cbiAgZnVuY3Rpb24gb25kYXRhKGNodW5rKSB7XG4gICAgaWYgKGRlc3Qud3JpdGFibGUpIHtcbiAgICAgIGlmIChmYWxzZSA9PT0gZGVzdC53cml0ZShjaHVuaykgJiYgc291cmNlLnBhdXNlKSB7XG4gICAgICAgIHNvdXJjZS5wYXVzZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNvdXJjZS5vbignZGF0YScsIG9uZGF0YSk7XG5cbiAgZnVuY3Rpb24gb25kcmFpbigpIHtcbiAgICBpZiAoc291cmNlLnJlYWRhYmxlICYmIHNvdXJjZS5yZXN1bWUpIHtcbiAgICAgIHNvdXJjZS5yZXN1bWUoKTtcbiAgICB9XG4gIH1cblxuICBkZXN0Lm9uKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gIC8vIElmIHRoZSAnZW5kJyBvcHRpb24gaXMgbm90IHN1cHBsaWVkLCBkZXN0LmVuZCgpIHdpbGwgYmUgY2FsbGVkIHdoZW5cbiAgLy8gc291cmNlIGdldHMgdGhlICdlbmQnIG9yICdjbG9zZScgZXZlbnRzLiAgT25seSBkZXN0LmVuZCgpIG9uY2UuXG4gIGlmICghZGVzdC5faXNTdGRpbyAmJiAoIW9wdGlvbnMgfHwgb3B0aW9ucy5lbmQgIT09IGZhbHNlKSkge1xuICAgIHNvdXJjZS5vbignZW5kJywgb25lbmQpO1xuICAgIHNvdXJjZS5vbignY2xvc2UnLCBvbmNsb3NlKTtcbiAgfVxuXG4gIHZhciBkaWRPbkVuZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBvbmVuZCgpIHtcbiAgICBpZiAoZGlkT25FbmQpIHJldHVybjtcbiAgICBkaWRPbkVuZCA9IHRydWU7XG5cbiAgICBkZXN0LmVuZCgpO1xuICB9XG5cblxuICBmdW5jdGlvbiBvbmNsb3NlKCkge1xuICAgIGlmIChkaWRPbkVuZCkgcmV0dXJuO1xuICAgIGRpZE9uRW5kID0gdHJ1ZTtcblxuICAgIGlmICh0eXBlb2YgZGVzdC5kZXN0cm95ID09PSAnZnVuY3Rpb24nKSBkZXN0LmRlc3Ryb3koKTtcbiAgfVxuXG4gIC8vIGRvbid0IGxlYXZlIGRhbmdsaW5nIHBpcGVzIHdoZW4gdGhlcmUgYXJlIGVycm9ycy5cbiAgZnVuY3Rpb24gb25lcnJvcihlcikge1xuICAgIGNsZWFudXAoKTtcbiAgICBpZiAoRUUubGlzdGVuZXJDb3VudCh0aGlzLCAnZXJyb3InKSA9PT0gMCkge1xuICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCBzdHJlYW0gZXJyb3IgaW4gcGlwZS5cbiAgICB9XG4gIH1cblxuICBzb3VyY2Uub24oJ2Vycm9yJywgb25lcnJvcik7XG4gIGRlc3Qub24oJ2Vycm9yJywgb25lcnJvcik7XG5cbiAgLy8gcmVtb3ZlIGFsbCB0aGUgZXZlbnQgbGlzdGVuZXJzIHRoYXQgd2VyZSBhZGRlZC5cbiAgZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2RhdGEnLCBvbmRhdGEpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2RyYWluJywgb25kcmFpbik7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbmVycm9yKTtcblxuICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIGNsZWFudXApO1xuXG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBjbGVhbnVwKTtcbiAgfVxuXG4gIHNvdXJjZS5vbignZW5kJywgY2xlYW51cCk7XG4gIHNvdXJjZS5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0Lm9uKCdjbG9zZScsIGNsZWFudXApO1xuXG4gIGRlc3QuZW1pdCgncGlwZScsIHNvdXJjZSk7XG5cbiAgLy8gQWxsb3cgZm9yIHVuaXgtbGlrZSB1c2FnZTogQS5waXBlKEIpLnBpcGUoQylcbiAgcmV0dXJuIGRlc3Q7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG5cbnZhciBpc0J1ZmZlckVuY29kaW5nID0gQnVmZmVyLmlzRW5jb2RpbmdcbiAgfHwgZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgICAgICBzd2l0Y2ggKGVuY29kaW5nICYmIGVuY29kaW5nLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgIGNhc2UgJ2hleCc6IGNhc2UgJ3V0ZjgnOiBjYXNlICd1dGYtOCc6IGNhc2UgJ2FzY2lpJzogY2FzZSAnYmluYXJ5JzogY2FzZSAnYmFzZTY0JzogY2FzZSAndWNzMic6IGNhc2UgJ3Vjcy0yJzogY2FzZSAndXRmMTZsZSc6IGNhc2UgJ3V0Zi0xNmxlJzogY2FzZSAncmF3JzogcmV0dXJuIHRydWU7XG4gICAgICAgICBkZWZhdWx0OiByZXR1cm4gZmFsc2U7XG4gICAgICAgfVxuICAgICB9XG5cblxuZnVuY3Rpb24gYXNzZXJ0RW5jb2RpbmcoZW5jb2RpbmcpIHtcbiAgaWYgKGVuY29kaW5nICYmICFpc0J1ZmZlckVuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKTtcbiAgfVxufVxuXG4vLyBTdHJpbmdEZWNvZGVyIHByb3ZpZGVzIGFuIGludGVyZmFjZSBmb3IgZWZmaWNpZW50bHkgc3BsaXR0aW5nIGEgc2VyaWVzIG9mXG4vLyBidWZmZXJzIGludG8gYSBzZXJpZXMgb2YgSlMgc3RyaW5ncyB3aXRob3V0IGJyZWFraW5nIGFwYXJ0IG11bHRpLWJ5dGVcbi8vIGNoYXJhY3RlcnMuIENFU1UtOCBpcyBoYW5kbGVkIGFzIHBhcnQgb2YgdGhlIFVURi04IGVuY29kaW5nLlxuLy9cbi8vIEBUT0RPIEhhbmRsaW5nIGFsbCBlbmNvZGluZ3MgaW5zaWRlIGEgc2luZ2xlIG9iamVjdCBtYWtlcyBpdCB2ZXJ5IGRpZmZpY3VsdFxuLy8gdG8gcmVhc29uIGFib3V0IHRoaXMgY29kZSwgc28gaXQgc2hvdWxkIGJlIHNwbGl0IHVwIGluIHRoZSBmdXR1cmUuXG4vLyBAVE9ETyBUaGVyZSBzaG91bGQgYmUgYSB1dGY4LXN0cmljdCBlbmNvZGluZyB0aGF0IHJlamVjdHMgaW52YWxpZCBVVEYtOCBjb2RlXG4vLyBwb2ludHMgYXMgdXNlZCBieSBDRVNVLTguXG52YXIgU3RyaW5nRGVjb2RlciA9IGV4cG9ydHMuU3RyaW5nRGVjb2RlciA9IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gIHRoaXMuZW5jb2RpbmcgPSAoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1stX10vLCAnJyk7XG4gIGFzc2VydEVuY29kaW5nKGVuY29kaW5nKTtcbiAgc3dpdGNoICh0aGlzLmVuY29kaW5nKSB7XG4gICAgY2FzZSAndXRmOCc6XG4gICAgICAvLyBDRVNVLTggcmVwcmVzZW50cyBlYWNoIG9mIFN1cnJvZ2F0ZSBQYWlyIGJ5IDMtYnl0ZXNcbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDM7XG4gICAgICBicmVhaztcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIC8vIFVURi0xNiByZXByZXNlbnRzIGVhY2ggb2YgU3Vycm9nYXRlIFBhaXIgYnkgMi1ieXRlc1xuICAgICAgdGhpcy5zdXJyb2dhdGVTaXplID0gMjtcbiAgICAgIHRoaXMuZGV0ZWN0SW5jb21wbGV0ZUNoYXIgPSB1dGYxNkRldGVjdEluY29tcGxldGVDaGFyO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIC8vIEJhc2UtNjQgc3RvcmVzIDMgYnl0ZXMgaW4gNCBjaGFycywgYW5kIHBhZHMgdGhlIHJlbWFpbmRlci5cbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDM7XG4gICAgICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyID0gYmFzZTY0RGV0ZWN0SW5jb21wbGV0ZUNoYXI7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhpcy53cml0ZSA9IHBhc3NUaHJvdWdoV3JpdGU7XG4gICAgICByZXR1cm47XG4gIH1cblxuICAvLyBFbm91Z2ggc3BhY2UgdG8gc3RvcmUgYWxsIGJ5dGVzIG9mIGEgc2luZ2xlIGNoYXJhY3Rlci4gVVRGLTggbmVlZHMgNFxuICAvLyBieXRlcywgYnV0IENFU1UtOCBtYXkgcmVxdWlyZSB1cCB0byA2ICgzIGJ5dGVzIHBlciBzdXJyb2dhdGUpLlxuICB0aGlzLmNoYXJCdWZmZXIgPSBuZXcgQnVmZmVyKDYpO1xuICAvLyBOdW1iZXIgb2YgYnl0ZXMgcmVjZWl2ZWQgZm9yIHRoZSBjdXJyZW50IGluY29tcGxldGUgbXVsdGktYnl0ZSBjaGFyYWN0ZXIuXG4gIHRoaXMuY2hhclJlY2VpdmVkID0gMDtcbiAgLy8gTnVtYmVyIG9mIGJ5dGVzIGV4cGVjdGVkIGZvciB0aGUgY3VycmVudCBpbmNvbXBsZXRlIG11bHRpLWJ5dGUgY2hhcmFjdGVyLlxuICB0aGlzLmNoYXJMZW5ndGggPSAwO1xufTtcblxuXG4vLyB3cml0ZSBkZWNvZGVzIHRoZSBnaXZlbiBidWZmZXIgYW5kIHJldHVybnMgaXQgYXMgSlMgc3RyaW5nIHRoYXQgaXNcbi8vIGd1YXJhbnRlZWQgdG8gbm90IGNvbnRhaW4gYW55IHBhcnRpYWwgbXVsdGktYnl0ZSBjaGFyYWN0ZXJzLiBBbnkgcGFydGlhbFxuLy8gY2hhcmFjdGVyIGZvdW5kIGF0IHRoZSBlbmQgb2YgdGhlIGJ1ZmZlciBpcyBidWZmZXJlZCB1cCwgYW5kIHdpbGwgYmVcbi8vIHJldHVybmVkIHdoZW4gY2FsbGluZyB3cml0ZSBhZ2FpbiB3aXRoIHRoZSByZW1haW5pbmcgYnl0ZXMuXG4vL1xuLy8gTm90ZTogQ29udmVydGluZyBhIEJ1ZmZlciBjb250YWluaW5nIGFuIG9ycGhhbiBzdXJyb2dhdGUgdG8gYSBTdHJpbmdcbi8vIGN1cnJlbnRseSB3b3JrcywgYnV0IGNvbnZlcnRpbmcgYSBTdHJpbmcgdG8gYSBCdWZmZXIgKHZpYSBgbmV3IEJ1ZmZlcmAsIG9yXG4vLyBCdWZmZXIjd3JpdGUpIHdpbGwgcmVwbGFjZSBpbmNvbXBsZXRlIHN1cnJvZ2F0ZXMgd2l0aCB0aGUgdW5pY29kZVxuLy8gcmVwbGFjZW1lbnQgY2hhcmFjdGVyLiBTZWUgaHR0cHM6Ly9jb2RlcmV2aWV3LmNocm9taXVtLm9yZy8xMjExNzMwMDkvIC5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciBjaGFyU3RyID0gJyc7XG4gIC8vIGlmIG91ciBsYXN0IHdyaXRlIGVuZGVkIHdpdGggYW4gaW5jb21wbGV0ZSBtdWx0aWJ5dGUgY2hhcmFjdGVyXG4gIHdoaWxlICh0aGlzLmNoYXJMZW5ndGgpIHtcbiAgICAvLyBkZXRlcm1pbmUgaG93IG1hbnkgcmVtYWluaW5nIGJ5dGVzIHRoaXMgYnVmZmVyIGhhcyB0byBvZmZlciBmb3IgdGhpcyBjaGFyXG4gICAgdmFyIGF2YWlsYWJsZSA9IChidWZmZXIubGVuZ3RoID49IHRoaXMuY2hhckxlbmd0aCAtIHRoaXMuY2hhclJlY2VpdmVkKSA/XG4gICAgICAgIHRoaXMuY2hhckxlbmd0aCAtIHRoaXMuY2hhclJlY2VpdmVkIDpcbiAgICAgICAgYnVmZmVyLmxlbmd0aDtcblxuICAgIC8vIGFkZCB0aGUgbmV3IGJ5dGVzIHRvIHRoZSBjaGFyIGJ1ZmZlclxuICAgIGJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgdGhpcy5jaGFyUmVjZWl2ZWQsIDAsIGF2YWlsYWJsZSk7XG4gICAgdGhpcy5jaGFyUmVjZWl2ZWQgKz0gYXZhaWxhYmxlO1xuXG4gICAgaWYgKHRoaXMuY2hhclJlY2VpdmVkIDwgdGhpcy5jaGFyTGVuZ3RoKSB7XG4gICAgICAvLyBzdGlsbCBub3QgZW5vdWdoIGNoYXJzIGluIHRoaXMgYnVmZmVyPyB3YWl0IGZvciBtb3JlIC4uLlxuICAgICAgcmV0dXJuICcnO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZSBieXRlcyBiZWxvbmdpbmcgdG8gdGhlIGN1cnJlbnQgY2hhcmFjdGVyIGZyb20gdGhlIGJ1ZmZlclxuICAgIGJ1ZmZlciA9IGJ1ZmZlci5zbGljZShhdmFpbGFibGUsIGJ1ZmZlci5sZW5ndGgpO1xuXG4gICAgLy8gZ2V0IHRoZSBjaGFyYWN0ZXIgdGhhdCB3YXMgc3BsaXRcbiAgICBjaGFyU3RyID0gdGhpcy5jaGFyQnVmZmVyLnNsaWNlKDAsIHRoaXMuY2hhckxlbmd0aCkudG9TdHJpbmcodGhpcy5lbmNvZGluZyk7XG5cbiAgICAvLyBDRVNVLTg6IGxlYWQgc3Vycm9nYXRlIChEODAwLURCRkYpIGlzIGFsc28gdGhlIGluY29tcGxldGUgY2hhcmFjdGVyXG4gICAgdmFyIGNoYXJDb2RlID0gY2hhclN0ci5jaGFyQ29kZUF0KGNoYXJTdHIubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGNoYXJDb2RlID49IDB4RDgwMCAmJiBjaGFyQ29kZSA8PSAweERCRkYpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCArPSB0aGlzLnN1cnJvZ2F0ZVNpemU7XG4gICAgICBjaGFyU3RyID0gJyc7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgdGhpcy5jaGFyUmVjZWl2ZWQgPSB0aGlzLmNoYXJMZW5ndGggPSAwO1xuXG4gICAgLy8gaWYgdGhlcmUgYXJlIG5vIG1vcmUgYnl0ZXMgaW4gdGhpcyBidWZmZXIsIGp1c3QgZW1pdCBvdXIgY2hhclxuICAgIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gY2hhclN0cjtcbiAgICB9XG4gICAgYnJlYWs7XG4gIH1cblxuICAvLyBkZXRlcm1pbmUgYW5kIHNldCBjaGFyTGVuZ3RoIC8gY2hhclJlY2VpdmVkXG4gIHRoaXMuZGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKTtcblxuICB2YXIgZW5kID0gYnVmZmVyLmxlbmd0aDtcbiAgaWYgKHRoaXMuY2hhckxlbmd0aCkge1xuICAgIC8vIGJ1ZmZlciB0aGUgaW5jb21wbGV0ZSBjaGFyYWN0ZXIgYnl0ZXMgd2UgZ290XG4gICAgYnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCAwLCBidWZmZXIubGVuZ3RoIC0gdGhpcy5jaGFyUmVjZWl2ZWQsIGVuZCk7XG4gICAgZW5kIC09IHRoaXMuY2hhclJlY2VpdmVkO1xuICB9XG5cbiAgY2hhclN0ciArPSBidWZmZXIudG9TdHJpbmcodGhpcy5lbmNvZGluZywgMCwgZW5kKTtcblxuICB2YXIgZW5kID0gY2hhclN0ci5sZW5ndGggLSAxO1xuICB2YXIgY2hhckNvZGUgPSBjaGFyU3RyLmNoYXJDb2RlQXQoZW5kKTtcbiAgLy8gQ0VTVS04OiBsZWFkIHN1cnJvZ2F0ZSAoRDgwMC1EQkZGKSBpcyBhbHNvIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlclxuICBpZiAoY2hhckNvZGUgPj0gMHhEODAwICYmIGNoYXJDb2RlIDw9IDB4REJGRikge1xuICAgIHZhciBzaXplID0gdGhpcy5zdXJyb2dhdGVTaXplO1xuICAgIHRoaXMuY2hhckxlbmd0aCArPSBzaXplO1xuICAgIHRoaXMuY2hhclJlY2VpdmVkICs9IHNpemU7XG4gICAgdGhpcy5jaGFyQnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCBzaXplLCAwLCBzaXplKTtcbiAgICBidWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIDAsIDAsIHNpemUpO1xuICAgIHJldHVybiBjaGFyU3RyLnN1YnN0cmluZygwLCBlbmQpO1xuICB9XG5cbiAgLy8gb3IganVzdCBlbWl0IHRoZSBjaGFyU3RyXG4gIHJldHVybiBjaGFyU3RyO1xufTtcblxuLy8gZGV0ZWN0SW5jb21wbGV0ZUNoYXIgZGV0ZXJtaW5lcyBpZiB0aGVyZSBpcyBhbiBpbmNvbXBsZXRlIFVURi04IGNoYXJhY3RlciBhdFxuLy8gdGhlIGVuZCBvZiB0aGUgZ2l2ZW4gYnVmZmVyLiBJZiBzbywgaXQgc2V0cyB0aGlzLmNoYXJMZW5ndGggdG8gdGhlIGJ5dGVcbi8vIGxlbmd0aCB0aGF0IGNoYXJhY3RlciwgYW5kIHNldHMgdGhpcy5jaGFyUmVjZWl2ZWQgdG8gdGhlIG51bWJlciBvZiBieXRlc1xuLy8gdGhhdCBhcmUgYXZhaWxhYmxlIGZvciB0aGlzIGNoYXJhY3Rlci5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLmRldGVjdEluY29tcGxldGVDaGFyID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIC8vIGRldGVybWluZSBob3cgbWFueSBieXRlcyB3ZSBoYXZlIHRvIGNoZWNrIGF0IHRoZSBlbmQgb2YgdGhpcyBidWZmZXJcbiAgdmFyIGkgPSAoYnVmZmVyLmxlbmd0aCA+PSAzKSA/IDMgOiBidWZmZXIubGVuZ3RoO1xuXG4gIC8vIEZpZ3VyZSBvdXQgaWYgb25lIG9mIHRoZSBsYXN0IGkgYnl0ZXMgb2Ygb3VyIGJ1ZmZlciBhbm5vdW5jZXMgYW5cbiAgLy8gaW5jb21wbGV0ZSBjaGFyLlxuICBmb3IgKDsgaSA+IDA7IGktLSkge1xuICAgIHZhciBjID0gYnVmZmVyW2J1ZmZlci5sZW5ndGggLSBpXTtcblxuICAgIC8vIFNlZSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1VURi04I0Rlc2NyaXB0aW9uXG5cbiAgICAvLyAxMTBYWFhYWFxuICAgIGlmIChpID09IDEgJiYgYyA+PiA1ID09IDB4MDYpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCA9IDI7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyAxMTEwWFhYWFxuICAgIGlmIChpIDw9IDIgJiYgYyA+PiA0ID09IDB4MEUpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCA9IDM7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyAxMTExMFhYWFxuICAgIGlmIChpIDw9IDMgJiYgYyA+PiAzID09IDB4MUUpIHtcbiAgICAgIHRoaXMuY2hhckxlbmd0aCA9IDQ7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgdGhpcy5jaGFyUmVjZWl2ZWQgPSBpO1xufTtcblxuU3RyaW5nRGVjb2Rlci5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gIHZhciByZXMgPSAnJztcbiAgaWYgKGJ1ZmZlciAmJiBidWZmZXIubGVuZ3RoKVxuICAgIHJlcyA9IHRoaXMud3JpdGUoYnVmZmVyKTtcblxuICBpZiAodGhpcy5jaGFyUmVjZWl2ZWQpIHtcbiAgICB2YXIgY3IgPSB0aGlzLmNoYXJSZWNlaXZlZDtcbiAgICB2YXIgYnVmID0gdGhpcy5jaGFyQnVmZmVyO1xuICAgIHZhciBlbmMgPSB0aGlzLmVuY29kaW5nO1xuICAgIHJlcyArPSBidWYuc2xpY2UoMCwgY3IpLnRvU3RyaW5nKGVuYyk7XG4gIH1cblxuICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gcGFzc1Rocm91Z2hXcml0ZShidWZmZXIpIHtcbiAgcmV0dXJuIGJ1ZmZlci50b1N0cmluZyh0aGlzLmVuY29kaW5nKTtcbn1cblxuZnVuY3Rpb24gdXRmMTZEZXRlY3RJbmNvbXBsZXRlQ2hhcihidWZmZXIpIHtcbiAgdGhpcy5jaGFyUmVjZWl2ZWQgPSBidWZmZXIubGVuZ3RoICUgMjtcbiAgdGhpcy5jaGFyTGVuZ3RoID0gdGhpcy5jaGFyUmVjZWl2ZWQgPyAyIDogMDtcbn1cblxuZnVuY3Rpb24gYmFzZTY0RGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKSB7XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gYnVmZmVyLmxlbmd0aCAlIDM7XG4gIHRoaXMuY2hhckxlbmd0aCA9IHRoaXMuY2hhclJlY2VpdmVkID8gMyA6IDA7XG59XG4iXX0=
