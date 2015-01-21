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

        if ($.isXMLDoc(data)) xmlString = (new window.XMLSerializer()).serializeToString(data);
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

var getListOfS3D = function() {
    return $.ajax({
        url: 'http://localhost:3001/file/list/s3d',
        type: 'get',
        cache: false
    })
    .fail(ajaxFail);
};

var getListOfDAE = function() {
    return $.ajax({
        url: 'http://localhost:3001/file/list/dae',
        type: 'get',
        cache: false
    })
    .fail(ajaxFail);
};

var addDataToFolder = function(data, folder) {
    console.log(data[ 0 ]);
    console.log(data[ 1 ]);

    data.forEach(function(url) {
        var lslashIdx = url.lastIndexOf('/'),
            name = lslashIdx === -1 ? url : url.substring(lslashIdx + 1, url.length);

        folder.add({ f: function() { } }, 'f').name(name);
    });
};

var createAssetMenuSelectionGUI = function() {
    var assetGUI = new dat.GUI(),
        assetMenu = { },
        data;

    assetGUI.name = 'Asset Menu';
    // assetGUI.domElement.style.width = '300px';

    var s3dFolder = assetGUI.addFolder('S3D'),
        floraFolder = assetGUI.addFolder('Flora'),
        daeFolder = assetGUI.addFolder('COLLADA (dae)');

    getListOfDAE().done(function(data) { addDataToFolder(data, daeFolder); });
    getListOfS3D().done(function(data) { addDataToFolder(data, s3dFolder); });
};

var ajaxFail = function(jqXHR, textStatus, errorThrown) {
  console.warn(textStatus + ':' + errorThrown);
};

window.$ = $;
window.jQuery = $;
window.addEventListener("DOMContentLoaded", function(event) {
    console.log("DOM fully loaded and parsed");
    getListOfS3D();
    createAssetMenuSelectionGUI();
});
