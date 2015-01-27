// Copyright 2015, SRI International

'use strict';

var g2js = require('../index.js'),
    grouping2js = g2js.g2js,
    dae2grouping = g2js.dae2g,
    grouping2html = g2js.g2html,
    groupingObj2html = g2js.go2html,
    groupingObj2xml = g2js.go2xml,
    groupingXml2html = g2js.gx2html,
    semantic2js = g2js.s2js,
    semanticObj2xml = g2js.so2xml,
    semanticObj2html = g2js.so2html,
    semanticXml2html = g2js.sx2html,
    s3dp = g2js.s3dParser,
    daep = g2js.daeParser;

console.log('================================================\ngrouping2js s3d grouping xml tests\n================================================');

var xml = '<grouping name="ShootingRange">\
        <group name="environment" node="environment">\
            <part node="grass"/>\
            <part node="tree_line"/>\
        </group>\
        <group name="environment">\
            <part node="grass"/>\
            <part node="tree_line"/>\
        </group>\
    </grouping>',
    o = grouping2html(xml),
    gx = groupingObj2xml(grouping2js(xml));

console.log('s3d xml 2 js\n------------------------');
console.log(o.text);
console.log('------------------------\ns3d xml 2 js 2 xml\n------------------------');
console.log(gx);
console.log('------------------------\ns3d xml 2 js 2 xml text\n------------------------');
console.log(groupingXml2html(gx).text);
console.log('================================================\ngrouping2js collada (dae) tests\n================================================');

var dae = '<library_visual_scenes>\
    <visual_scene id="VisualSceneNode" name="ShootingRange_05">\
        <node id="enviroment" name="enviroment" type="NODE">\
            <node id="grass" name="grass" type="NODE">\
            </node>\
            <node id="tree_line" name="tree_line" type="NODE">\
            </node>\
            <node id="e" name="e" type="NODE">\
                <node id="g" name="g" type="NODE">\
                </node>\
                <node id="t" name="t" type="NODE">\
                </node>\
            </node>\
        </node>\
        <node id="aaa" name="aaa" type="NODE">\
        </node>\
        <node id="bbb" name="bbb" type="NODE">\
        </node>\
        <node id="zzz" name="zzz" type="NODE">\
            <node id="xxx" name="xxx" type="NODE">\
            </node>\
            <node id="yyy" name="yyy" type="NODE">\
            </node>\
        </node>\
    </visual_scene>\
</library_visual_scenes>',
    go = dae2grouping(dae);

gx = groupingObj2xml(go);
o = groupingObj2html(go);
console.log('dae 2 js text\n------------------------');
console.log(o.text);
console.log('------------------------\ndae 2 grouping xml\n------------------------');
console.log(gx);
o = groupingXml2html(gx);
console.log('------------------------\ndae 2 grouping xml text\n------------------------');
console.log(o.text);
console.log('------------------------\ndae 2 grouping xml (html)\n------------------------');
console.log(o.html);
console.log('================================================\ngrouping2js s3d parse error tests\n================================================');
s3dp.onerror = daep.onerror = function(error) {
    console.log(error);
    console.log('Parser resumed...');
    s3dp.resume();
};
daep.onerror = function(error) {
    console.log(error);
    console.log('Parser resumed...');
    daep.resume();
};

// <- missing / self-closed on the part, unexpected close tag
var badxml = '<grouping name="ShootingRange"><group name="environment" node="environment"><part node="grass"></group></grouping>';

try {
    o = grouping2js(badxml);
} catch(err) { }

console.log('================================================\ngrouping2js dae parse error tests\n================================================');

// <- type attribute not assigned for node zzz, attribute without value
var baddae = '<library_visual_scenes>\
    <visual_scene id="VisualSceneNode" name="ShootingRange_05">\
        <node id="zzz" name="zzz" type>\
            <node id="xxx" name="xxx" type="NODE">\
            </node>\
        </node>\
    </visual_scene>\
</library_visual_scenes>';

try {
    go = dae2grouping(baddae);
} catch(err) { }

console.log('================================================\nsemantic2js s3d tests\n================================================');

var s3d = '<?xml version="1.0" encoding="utf-8"?>\
    <!-- Copyright 2015, SRI International -->\
    <S3D>\
        <head>\
            <description>Semantic 3D mapping file for: Shooting Range environment</description>\
            <author>cgreuel</author>\
            <created>2014-08-13</created>\
            <modified>2014-11-13</modified> <!-- John Pywtorak -->\
        </head>\
        <flora_base id="M4_ont" uri="../../../knowledge/weapons/M4/m4.flr" />\
        <semantic_mapping>\
            <asset name="ShootingRange" uri="/SAVE/models/environments/range/ShootingRange.dae" sid="M4_ont" flora_ref="ShootingRange">\
                <group name="environment" node="environment" sid="M4_ont" flora_ref="BoltCarrierGroup" />\
                <group name="Meta Group" sid="M4_ont" flora_ref="Meta" />\
                <object name="targets" node="targets" sid="M4_ont" flora_ref="ShootingTarget" />\
                <object name="grass" node="grass" sid="M4_ont" flora_ref="Grass" />\
            </asset>\
        </semantic_mapping>\
        <grouping name="ShootingRange">\
            <group name="environment" node="environment">\
                <group name="Meta Group"/>\
                <part node="targets"/>\
                <part node="grass"/>\
            </group>\
        </grouping>\
    </S3D>',
    so = semantic2js(s3d),
    sx = semanticObj2xml(so);

o = semanticObj2html(so);
console.log('semantic (s3d mapping only) 2 js text\n------------------------');
console.log(o.text);
o = semanticXml2html(sx);
console.log('------------------------\nsemantic 2 xml (s3d mapping only) 2 text\n------------------------');
console.log(o.text);
sx = semanticObj2xml(so, grouping2js(s3d))
o = semanticXml2html(sx);
console.log('------------------------\nsemantic 2 xml (with grouping) 2 text\n------------------------');
console.log(o.text);
