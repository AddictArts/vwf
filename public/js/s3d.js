// Copyright 2014, SRI International

'use strict';

var G2JS = require('grouping2js'),
    $ = require('jquery');

var updateModelTree = function(treeList) {
  $('#tree').jstree({
    core : {
        data : [ ],
        check_callback: true
    },
    plugins : [ 'state', 'contextmenu' ],
    contextmenu : {
        items : { },
        ccp : false,
        create : false,
        rename : false,
        remove : false
    }
  });
};

// [ { "id" : "M4 Carbine",          "parent" : "#",                    "text" : "M4 Carbine" },
// { "id" : "Sling",                 "parent" : "M4 Carbine",           "text" : "Sling" },
// { "id" : "Barrel_Assembly",       "parent" : "M4 Carbine",           "text" : "Barrel_Assembly" },
// { "id" : "Buttstock Group",       "parent" : "M4 Carbine",           "text" : "Buttstock Group" },
// { "id" : "Buttstock",             "parent" : "Buttstock Group",      "text" : "Buttstock" },
// { "id" : "Swivel_LAMA1259863095", "parent" : "Buttstock Group",      "text" : "Swivel_LAMA1259863095k" },
// { "id" : "Magazine_g Group",      "parent" : "M4 Carbine",           "text" : "Magazine_g Group" },
// { "id" : "Tube",                  "parent" : "Magazine_g Group",     "text" : "Tube" },
// { "id" : "Lower_Receiver Group",  "parent" : "M4 Carbine",           "text" : "Lower_Receiver Group" },
// { "id" : "Lower_Receiver",        "parent" : "Lower_Receiver Group", "text" : "Lower_Receiver" },
// { "id" : "Upper_Receiver Group",  "parent" : "M4 Carbine",           "text" : "Upper_Receiver Group" },
// { "id" : "Upper_Receiver",        "parent" : "Upper_Receiver Group", "text" : "Plunger_Assembly" } ]

//  {
//     name: "ShootingRange",
//     groups: [
//         {
//             name: "environment",
//             node: "environment",
//             parts: [
//                 "grass",
//                 "tree_line",
//                 "sky",
//                 "targets",
//                 "ShootingRangeArea1",
//                 "ShootingRangeArea2",
//                 "ShootingRangeArea3",
//                 "ShootingRangeArea4",
//                 "ShootingRangeArea5",
//                 "ShootingRangeArea6",
//                 "ShootingRangeArea7",
//                 "ShootingRangeArea8"
//             ]
//         }
//     ]
// }
var transformGroupingTojsTree = function(groupingObj, treeList) {
    var treeList = treeList || [ ];

    treeList.push({
        id: groupingObj.name,
        parent: '#',
        text: groupingObj.name
    });

    return treeList; //XXX

    for (var p in groupingObj) {
        if (p == 'groups') {
            groupingObj.groups.forEach(function(group) {
                var children = treeList;

                if (group.node) {
                    treeList.children[ group.node ] = { extends: "http://vwf.example.com/node3.vwf", children: { } };
                    children = treeList.children[ group.node ];
                }

                transformGroupingTojsTree(group, children);
            });
        } else if (p == 'parts') {
            groupingObj.parts.forEach(function(part) {
                treeList.children[ part ] = { extends: "http://vwf.example.com/node3.vwf" };
            });
        }
    }

    return treeList;
};

var showListOfS3D = function(names) {
};

var loadS3D = function(url) {
    // $.ajax({ url:  '/SAVE/testdata/s3d/ShootingRange.xml', type: 'get', cache: false })
    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        var xmlString;

        if ($.isXMLDoc(data)) xmlString = (new window.XMLSerializer()).serializeToString( data );
        else xmlString = data;

        console.log(xmlString);

        var grouping = G2JS.g2js(xmlString),
            treeList = transformGroupingTojsTree(grouping);

        console.log(grouping);
        console.log(treeList);
        console.log(JSON.stringify(treeList));
        updateModelTree(treeList);

        var o = G2JS.g2html(xmlString);

        console.log(o.text);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      console.warn(textStatus + ':' + errorThrown);
    });
};

var getListOfS3D = function(url) {
    $.ajax({ url: 'http://localhost:3001/file/list/s3d', type: 'get', cache: false })
    .done(function(data) {
        console.log(data[ 0 ]);
        console.log(data[ 1 ]);

        loadS3D(data[ 0 ]);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      console.warn(textStatus + ':' + errorThrown);
    });
};

var getListOfDAE = function(url) {
    $.ajax({ url: 'http://localhost:3001/file/list/dae', type: 'get', cache: false })
    .done(function(data) {
        console.log(data[ 0 ]);
        console.log(data[ 1 ]);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
      console.warn(textStatus + ':' + errorThrown);
    });
};


window.$ = $;
window.jQuery = $;
// getListOfS3D();

// document.addEventListener("DOMContentLoaded", function(event) {
// window.addEventListener("load", function(event) {
window.addEventListener("DOMContentLoaded", function(event) {
    console.log("DOM fully loaded and parsed");
    getListOfS3D();
});


// var shootingRangeS3D = '\
// <?xml version="1.0" encoding="utf-8"?>\
// <!-- Copyright 2014, SRI International -->\
// <S3D>\
//     <head>\
//         <description>Semantic 3D mapping file for: Shooting Range environment</description>\
//         <author>cgreuel</author>\
//         <created>2014-08-13</created>\
//         <modified>2014-11-13</modified>  <!-- John Pywtorak -->\
//     </head>\
//     <flora_base id="M4_ont" uri="../../../knowledge/weapons/M4/m4.flr" />  <!-- Using the M4 ontology for the shooting range for 1.0 -->\
//     <semantic_mapping>\
//         <asset name="ShootingRange" uri="/SAVE/models/environments/range/ShootingRange.dae" sid="M4_ont" flora_ref="ShootingRange">\
//             <object name="targets" node="targets" sid="M4_ont" flora_ref="ShootingTarget" /> <!-- Proxy. For now these two point to the same class -->\
//         </asset>\
//     </semantic_mapping>\
//     <grouping name="ShootingRange">\
//         <group name="environment" node="environment">\
//             <part node="grass"/>\
//             <part node="tree_line"/>\
//             <part node="sky"/>\
//             <part node="targets"/>\
//             <part node="ShootingRangeArea1"/>\
//             <part node="ShootingRangeArea2"/>\
//             <part node="ShootingRangeArea3"/>\
//             <part node="ShootingRangeArea4"/>\
//             <part node="ShootingRangeArea5"/>\
//             <part node="ShootingRangeArea6"/>\
//             <part node="ShootingRangeArea7"/>\
//             <part node="ShootingRangeArea8"/>\
//         </group>\
//     </grouping>\
//     </S3D>\
// ';

// console.log(G2JS.g2js(shootingRangeS3D));

// var o = G2JS.g2html(shootingRangeS3D);

// console.log(o.text);
