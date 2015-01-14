// Copyright 2014, SRI International

var g2js = require('./lib/grouping2js')({ });

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

var groupingObj = g2js.grouping2js(xml);

console.log(groupingObj);

var pretty = require('js-object-pretty-print').pretty;

console.log(pretty(groupingObj));

try {
    document.body.innerText = pretty(groupingObjp);
} catch(e) { }
