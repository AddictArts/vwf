// Copyright 2014, SRI International

'use strict';

var g2js = require('./lib/grouping2js')({ }),
    pretty = require('js-object-pretty-print').pretty;

var grouping2html = function(xml) {
    var groupingObj = g2js.grouping2js(xml),
        text = pretty(groupingObj),
        html;

    html =text.replace(/\n/g, '<br>').replace(/\s/g, '&nbsp;');
    return { html: html, text: text };
};

module.exports = {
    g2js: g2js.grouping2js,
    g2html: grouping2html,
    parser: g2js.parser,
    pretty: pretty
};

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

console.log(grouping2html(xml).text);

try {
    window.addEventListener('load', function() {
        window.document.body.innerHTML = grouping2html(xml).html;
    });
} catch(e) { } // ignore "ReferenceError: window is not defined" when running on the server
