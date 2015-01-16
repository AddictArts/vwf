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
