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
    dae2g: dae2g.dae2grouping
};

try {
    window.G2JS = module.exports;
} catch(e) { } // ignore "ReferenceError: window is not defined" when running on the server

// XXX tests
// var xml = '<grouping name="ShootingRange">\
//         <group name="environment" node="environment">\
//             <part node="grass"/>\
//             <part node="tree_line"/>\
//         </group>\
//         <group name="environment">\
//             <part node="grass"/>\
//             <part node="tree_line"/>\
//         </group>\
//     </grouping>',
//     o = grouping2html(xml),
//     gx = groupingObj2xml(g2js.grouping2js(xml));

// console.log(o.text);
// console.log(gx);
// console.log(groupingXml2html(gx).text);

// var dae = '<library_visual_scenes>\
//     <visual_scene id="VisualSceneNode" name="ShootingRange_05">\
//         <node id="enviroment" name="enviroment" type="NODE">\
//             <node id="grass" name="grass" type="NODE">\
//             </node>\
//             <node id="tree_line" name="tree_line" type="NODE">\
//             </node>\
//             <node id="e" name="e" type="NODE">\
//                 <node id="g" name="g" type="NODE">\
//                 </node>\
//                 <node id="t" name="t" type="NODE">\
//                 </node>\
//             </node>\
//         </node>\
//         <node id="aaa" name="aaa" type="NODE">\
//         </node>\
//         <node id="bbb" name="bbb" type="NODE">\
//         </node>\
//         <node id="zzz" name="zzz" type="NODE">\
//             <node id="xxx" name="xxx" type="NODE">\
//             </node>\
//             <node id="yyy" name="yyy" type="NODE">\
//             </node>\
//         </node>\
//     </visual_scene>\
//     </library_visual_scenes>',
//     go = dae2g.dae2grouping(dae),
//     gx = groupingObj2xml(go);

// o = groupingObj2html(go);
// console.log(o.text);
// console.log(gx);
// o = groupingXml2html(gx);
// console.log(o.text);
// console.log(o.html);
