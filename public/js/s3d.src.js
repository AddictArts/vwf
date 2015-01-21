// Copyright 2015, SRI International

'use strict';

var G2JS = require('../../scripts/grouping2js'),
    $ = require('../../scripts/node_modules/jquery');

var updateModelTree = function(treeList) {
  $('#modelHierarchy').jstree({
    core : {
        data : treeList,
        check_callback: true
    },
    plugins : [ 'contextmenu' ],
    contextmenu : {
        items : { },
        ccp : false,
        create : false,
        rename : false,
        remove : false
    }
  });
};

var transformGroupingTojsTree = function(groupingObj, parent, treeList) {
    var treeList = treeList || [ ],
        parent = parent || groupingObj.name;

    if (treeList.length == 0) {
        treeList.push({
            id: groupingObj.name,
            parent: '#',
            text: groupingObj.name
        });
    }

    for (var p in groupingObj) {
        if (p == 'groups') {
            groupingObj.groups.forEach(function(group) {
                treeList.push({
                    id: group.name,
                    parent: parent,
                    text: group.name
                });
                transformGroupingTojsTree(group, group.name, treeList);
            });
        } else if (p == 'parts') {
            groupingObj.parts.forEach(function(part) {
                treeList.push({
                    id: part,
                    parent: parent,
                    text: part
                });
            });
        }
    }

    return treeList;
};

var loadS3D = function(url) {
    // $.ajax({ url:  '/SAVE/testdata/s3d/ShootingRange.xml', type: 'get', cache: false })
    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        var xmlString;

        if ($.isXMLDoc(data)) xmlString = (new window.XMLSerializer()).serializeToString( data );
        else xmlString = data;

        // console.log(xmlString);

        var grouping = G2JS.g2js(xmlString),
            treeList = transformGroupingTojsTree(grouping);

        updateModelTree(treeList);
        // console.log(grouping);
        // console.log(G2JS.g2html(xmlString).text);
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

        // loadS3D(data[ 0 ]);
        loadS3D(data[ 1 ]);
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

var showListOfS3D = function(names) {
};

var createAssetMenuSelectionGUI = function() {
    var assetGUI = new dat.GUI(),
        assetMenu = { };

    assetGUI.name = 'Asset Menu';
    // assetGUI.add(assetMenu, 'fontsize').name('Fontsize').onFinishChange(function(value) { $('*.dg').css('font-size', value); });
    // assetGUI.add(assetMenu, 'reset').name('Reset');
    // assetGUI.add(assetMenu, 'path').name('Path');

    var s3dFolder = assetGUI.addFolder('S3D');
    var floraFolder = assetGUI.addFolder('Flora');
    var daeFolder = assetGUI.addFolder('COLLADA (dae)');

    // var s3dFolderRef = assetGUI.add(assetMenu, 'saveExercise').name('Save Exercise');

    // s3dFolder.add(assetMenu.camxyz, 'default').name('Default');

    // cameraFolder.add(assetMenu.camxyz, 'x').onFinishChange(
    //    function(newX) { vwf.setProperty(vwfapp.cameraId, 'translation', [ newX, assetMenu.camxyz.y, assetMenu.camxyz.z ]); }
    // );
    // cameraFolder.add(assetMenu.camxyz, 'rotation').onFinishChange(function(val) {
    //     var rx = assetMenu.camxyz.rotX? 1 : 0;
    //     if (rx || ry || rz) vwf_view.kernel.callMethod(vwfapp.cameraId, 'rotateBy', [ [ rx, ry, rz, val ], 0 ]);
    // });
};

window.$ = $;
window.jQuery = $;
window.addEventListener("DOMContentLoaded", function(event) {
    console.log("DOM fully loaded and parsed");
    getListOfS3D();
    createAssetMenuSelectionGUI();
});
