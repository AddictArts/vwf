// Copyright 2014, SRI International

'use strict';

var g2js = require('./lib/grouping2js')({ strict: true }),
    dae2g = require('./lib/dae2grouping')({ strict: true }),
    pretty = require('js-object-pretty-print').pretty;

var grouping2html = function(sourceXml) {
    var groupingObj = g2js.grouping2js(sourceXml);

    return groupingObj2html(groupingObj);
};

var groupingObj2html = function(groupingObj) {
    var text = pretty(groupingObj),
        html;

    html = text.replace(/\n/g, '<br>').replace(/\s/g, '&nbsp;');
    return { html: html, text: text };
};

module.exports = {
    g2js: g2js.grouping2js,
    g2html: grouping2html,
    go2html: groupingObj2html,
    dae2g: dae2g.dae2grouping
};

try {
    window.G2JS = module.exports;
} catch(e) { } // ignore "ReferenceError: window is not defined" when running on the server

var xml = '<grouping name="ShootingRange">\
        <group name="environment" node="environment">\
            <part node="grass"/>\
            <part node="tree_line"/>\
        </group>\
    </grouping>',
    o = grouping2html(xml);

console.log(o.text);

var dae = '<library_visual_scenes>\
    <visual_scene id="VisualSceneNode" name="ShootingRange_05">\
        <node id="enviroment" name="enviroment" type="NODE">\
            <node id="grass" name="grass" type="NODE">\
            </node>\
            <node id="tree_line" name="tree_line" type="NODE">\
            </node>\
        </node>\
    </visual_scene>\
    </library_visual_scenes>';

o = groupingObj2html(dae2g.dae2grouping(dae));
console.log(o.text);
