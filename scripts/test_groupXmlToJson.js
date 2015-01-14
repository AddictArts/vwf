// Copyright 2014, SRI International

var groupXmlToJson = require('./groupXmlToJson');

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

var group2js = groupXmlToJson();

var groupingObj = group2js.grouping2js(xml);

console.log(groupingObj);
