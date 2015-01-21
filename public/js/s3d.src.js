// Copyright 2015, SRI International

'use strict';

var G2JS = require('../../scripts/grouping2js'),
    $ = require('../../scripts/node_modules/jquery');

var updateModelTree = function(treeList) {
    var instance = $('#modelHierarchy').jstree(true); 

    if (instance) instance.destroy();

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

var getListOfFlora = function() {
    return $.ajax({
        url: 'http://localhost:3001/file/list/flora',
        type: 'get',
        cache: false
    })
    .fail(ajaxFail);
};

var createS3DRepoTree = function(data) {
    var treeList = [{
            id: 'S3D Repository',
            parent: '#',
            text: 'S3D Repository'
        }],
        treeId2Url = { };

    data.forEach(function(url) {
        console.info('Adding: ' + url + ' to s3d repo tree');

        var lslashIdx = url.lastIndexOf('/'),
            name = lslashIdx === -1 ? url : url.substring(lslashIdx + 1, url.length);

        treeList.push({
            id: name,
            parent: 'S3D Repository',
            text: name
        });
        treeId2Url[ name ] = url;
    });
    $('#s3ds').jstree({
        core : {
            multiple : false,
            data : treeList,
            check_callback: true
        },
        plugins : [ ]
    }).on('changed.jstree', function(jqe, data) {
        if (data.action == 'select_node') {
            var id = data.selected[ 0 ];

            console.info('Loading: ' + id + ' from:' + treeId2Url[ id ]);
            loadS3D(treeId2Url[ id ]);
        }
    });
};

var createDAERepoTree = function(data) {
    var treeList = [{
        id: '3D Repository',
        parent: '#',
        text: '3D Repository'
    }];

    data.forEach(function(url) {
        console.info('Adding: ' + url + ' to dae repo tree');

        var lslashIdx = url.lastIndexOf('/'),
            name = lslashIdx === -1 ? url : url.substring(lslashIdx + 1, url.length);

        treeList.push({
            id: name,
            parent: '3D Repository',
            text: name
        });
    });
    $('#daes').jstree({
        core : {
            multiple : false,
            data : treeList,
            check_callback: true
        },
        plugins : [ ]
    });
};

var createFloraRepoTree = function(data) {
    var treeList = [{
        id: 'Flora Repository',
        parent: '#',
        text: 'Flora Repository'
    }];

    data.forEach(function(url) {
        console.info('Adding: ' + url + ' to flora repo tree');

        var lslashIdx = url.lastIndexOf('/'),
            name = lslashIdx === -1 ? url : url.substring(lslashIdx + 1, url.length);

        treeList.push({
            id: name,
            parent: 'Flora Repository',
            text: name
        });
    });
    $('#floras').jstree({
        core : {
            multiple : false,
            data : treeList,
            check_callback: true
        },
        plugins : [ ]
    });
};

var createAssetMenuSelectionGUI = function() {
    getListOfDAE().done(createDAERepoTree);
    getListOfFlora().done(createFloraRepoTree);
    getListOfS3D().done(createS3DRepoTree);
};

var ajaxFail = function(jqXHR, textStatus, errorThrown) {
  console.warn(textStatus + ':' + errorThrown);
};

window.$ = $;
window.jQuery = $;
window.addEventListener("DOMContentLoaded", function(event) {
    console.log("DOM fully loaded and parsed");
    createAssetMenuSelectionGUI();
});
