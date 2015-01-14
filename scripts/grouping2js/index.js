// Copyright 2014, SRI International

'use strict';

var g2js = require('./lib/grouping2js')({ strict: true }),
    pretty = require('js-object-pretty-print').pretty;

var grouping2html = function(sourceXml) {
    var groupingObj = g2js.grouping2js(sourceXml),
        text = pretty(groupingObj),
        html;

    html = text.replace(/\n/g, '<br>').replace(/\s/g, '&nbsp;');
    return { html: html, text: text };
};

module.exports = {
    g2js: g2js.grouping2js,
    g2html: grouping2html,
    parser: g2js.parser,
    pretty: pretty
};

try {
    window.G2JS = module.exports;
} catch(e) { } // ignore "ReferenceError: window is not defined" when running on the server

// var xml = '<grouping name="M4 Carbine">\
//     <part node="Bling"/>\
//     <group name="Empty"/>\
//     <group node="M4" name="M4 Group">\
//         <group name="B Group">\
//             <part node="A"/>\
//             <part node="B"/>\
//             <group name="B_N Group">\
//                 <part node="B_N"/>\
//             </group>\
//         </group>\
//         <group name="Mag Group">\
//             <part node="C1"/>\
//         </group>\
//         <part node="Sling"/>\
//     </group>\
//     </grouping>',
//     o = grouping2html(xml);

// console.log(o.text);

// try {
//     window.addEventListener('load', function() {
//         window.document.body.innerHTML = o.html;
//     });
// } catch(e) { } // ignore "ReferenceError: window is not defined" when running on the server
