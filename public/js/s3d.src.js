// Copyright 2015, SRI International

'use strict';

var G2JS = require('../../scripts/grouping2js'),
    $ = require('../../scripts/node_modules/jquery'),
    hostname;

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

var updateModelTree = function(treeList) {
    $('#assetHierarchy').jstree({
        core : {
            // multiple : false,
            data : treeList,
            check_callback: true
        },
        plugins : [ 'contextmenu' ],
        contextmenu : {
            items : {
                Link : {
                    label : 'Link',
                    action : function (obj) { window.addLink(); } // from s3d.refactor.js todo: future refactor
                },
                Unlink : {
                    label : 'Unlink',
                    action : function (obj) { window.removeLink(); } // from s3d.refactor.js todo: future refactor
                },
                Info : {
                    label : 'Info',
                    action : function (obj) { window.getInfo(); } // from s3d.refactor.js todo: future refactor
                },
            },
            ccp : false,
            create : false,
            rename : false,
            remove : false
        }
    }).on('changed.jstree', function(e, data) {
        var r = [ ];

        for (var i = 0, j = data.selected.length; i < j; i++) {
            r.push(data.instance.get_node(data.selected[ i ]).text);
        }

        console.log('Selected: ' + r.join(', '));
        window.currentNode = r.join(', '); // from s3d.refactor.js todo: future refactor
        selectedNodes = r;
    });
};

var createTaxonomyTree =  function(tax) {
    var taxdiv = document.getElementById("taxonomy");
    var classList = document.createElement("ul");
    var rootNode = document.createElement("li");

    rootNode.appendChild(document.createTextNode("m4"));

    var elementList = document.createElement("ul");

    rootNode.appendChild(elementList);
    classList.appendChild(rootNode);

    for (var i = 0; i < tax.length; i++) elementList.appendChild(createListItem(tax[ i ]));

    taxdiv.appendChild(classList);
    $('#taxonomy').jstree({
        core : {
            // multiple : false,
            check_callback: true
        },
        plugins : [ 'contextmenu' ],
        contextmenu : {
            items : {
                Link : {
                    label : 'Link',
                    action : function(obj) { window.addLink(); } // from s3d.refactor.js todo: future refactor
                },
                Unlink : {
                    label : 'Unlink',
                    action : function(obj) { window.removeLink(); } // from s3d.refactor.js todo: future refactor
                },
                Info : {
                    label : 'Info',
                    action : function(obj) { window.getInfo(); } // from s3d.refactor.js todo: future refactor
                },
                ccp : false,
                create : false,
                rename : false,
                remove : false
            }
        }
    }).on('changed.jstree', function(jqe, data) {
        var r = [ ];
 
        window.selectedClasses = [ ]; // reset the selected classes, from s3d.refactor.js todo: future refactor

        for (var i = 0, j = data.selected.length; i < j; i++) {
            var nodeText = data.instance.get_node(data.selected[ i ]).text;

            r.push(nodeText);
            window.selectedClasses.push(nodeText); // from s3d.refactor.js todo: future refactor
        }

console.log('Selected: ' + r.join(', '));
        window.currentClass = r.join(', '); // from s3d.refactor.js todo: future refactor

        if (data.selected.length === 1) {
            var leafNode = $.jstree.reference('#taxonomy').is_leaf(data.selected[ 0 ]);

            // window.floraClass = data.selected[ 0 ]; // from s3d.refactor.js todo: future refactor
            window.floraClass = r[ 0 ]; // from s3d.refactor.js todo: future refactor
// console.log("Is Leaf: " + leafNode);

            if (leafNode == true) getSubClasses(r[ 0 ]); // from s3d.refactor.js todo: future refactor
        }
    });
};

var updateTaxonomyTreeSubclasses = function(data) {
    var leafNode = $('#taxonomy').jstree('is_leaf', floraClass);

    if (leafNode != true) return;

    // var jsontax = xmlhttp.responseText;
    // var tax = JSON.parse(jsontax);

console.log('Subclasses to add: ' + jsontax);

    var parent = $('#taxonomy').jstree('get_selected');

console.log("SUPER CLass: " + tax["superclass"]);

    for (index = 0; index < tax.subclasses.length; index++) {
        console.log("   Adding subclass: " + tax.subclasses[ index ]);
        $("#taxonomy").jstree("create_node", parent, tax.subclasses[ index ], "last", null, null);
    }
};

// $.ajax({ url:  '/SAVE/testdata/s3d/ShootingRange.xml', type: 'get', cache: false })
var loadS3D = function(url, s3dname) {
    var instance = $.jstree.reference('#assetHierarchy'); 

    if (instance) instance.destroy();

    $('#assetHierarchy').html('<p>Loading selected s3d...</p>');
    console.info('Loading ' + url);
    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        var xmlString;

        if ($.isXMLDoc(data)) xmlString = (new window.XMLSerializer()).serializeToString(data);
        else xmlString = data;

        var semantic = G2JS.s2js(xmlString),
            grouping = G2JS.g2js(xmlString),
            treeList = transformGroupingTojsTree(grouping),
            florauri = semantic.flora_base.uri;

        console.info('S3D references taxonomy: ' + florauri);
        console.info('S3D references asset: ' + semantic.semantic_mapping.asset.uri);
        loadFlora(florauri, getNameFromUrl(florauri));
        updateModelTree(treeList);
    })
    .fail(ajaxFail);
};

var loadDAE = function(url, daename) {
    var instance = $.jstree.reference('#assetHierarchy');

    if (instance) instance.destroy();

    $('#assetHierarchy').html('<p>Loading selected asset...</p>');
    console.info('Loading ' + url);
    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        var xmlString;

        if ($.isXMLDoc(data)) xmlString = (new window.XMLSerializer()).serializeToString(data);
        else xmlString = data;

        var grouping = G2JS.dae2g(xmlString),
            treeList = transformGroupingTojsTree(grouping);

        updateModelTree(treeList);
    })
    .fail(ajaxFail);
};

var loadFlora = function(url, floraname) {
    var instance = $.jstree.reference('#taxonomy'),
        url = 'http://' + hostname + ':3001/flora/server?method=loadFile&filename=' + encodeURIComponent(floraname);

    if (instance) instance.destroy();

    console.info('Requesting ' + floraname);
    $('#taxonomy').html('<p>Loading selected taxonomy...</p>');
    $.ajax({ url: url, type: 'get', cache: false })
    .done(getTaxonomyRoots)
    .fail(ajaxFail);
};

// => [ "ChargingHandlePosition", "Action", "SwitchPosition", "ActionType", "PhysicalEntity", "EnumeratedType", "PinState", "BoltCarrierGroupState", "RoundLocation", "ActionParameter" ]
var getTaxonomyRoots = function(data) {
    var url = 'http://' + hostname + ':3001/flora/server?method=getTaxonomyRoots';

    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        if (Object.prototype.toString.call(data) != '[object Array]') data = JSON.parse(data);

        console.info('Fetched taxonomy roots: ' + JSON.stringify(data));
        createTaxonomyTree(data); // from s3d.refactor.js todo: future refactor
    })
    .fail(ajaxFail);
};

// ChargingHandlePosition => { "superclass": "ChargingHandlePosition", "subclasses":[ ] }
// Action => { "superclass": "Action", "subclasses": [ "Pull", "PullAndHold", "Attach", "TightenScrew", "Extract", "Point", "Insert", "Lift", "Open", "Inspect", "PushAndHold", "Close", "Push", "Detach", "SelectSwitchPosition", "Release", "Press", "LoosenScrew" ] }
// PhysicalEntity => { "superclass": "PhysicalEntity", "subclasses": [ "SafeTarget", "Region", "PhysicalObject" ] }
// PhysicalObject => { "superclass": "PhysicalObject", "subclasses": [ "FiringPin", "Hammer", "CleaningRodTip", "ShootingTarget", "M4", "Sling", "FiringPinRetainingPin", "Brush", "CleaningRodHandle", "LowerHalf", "ChargingHandle", "SlipRing", "LowerReceiverExtension", "Trigger", "CleaningRodSegment", "SlingSwivel", "Round", "ButtStockLockLever", "Extractor", "Buffer", "PipeCleaner", "WipeCloth", "CarryHandle", "BoltCarrierGroup", "BufferRetainer", "MagazineReleaseButton", "Bolt", "SlingLoop", "Casing", "UpperHalf", "CleaningRod", "Liquid", "Switch", "UpperHandGuard", "Pin", "Screw", "BoltCam", "ButtStock", "LowerHandGuard", "CleaningPatch", "BoltCatch", "Magazine" ] }
var getSubClasses = function(id) {
    // xmlhttp.onreadystatechange = addSubclassesToTree;
    // xmlhttp.open("GET", "http://" + hostName + ":3001/flora/server?method=getSubClasses&id=" + encodeURIComponent(id), true);
    var url = 'http://' + hostname + ':3001/flora/server?method=getSubClasses&id=' + encodeURIComponent(id);

    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        if (Object.prototype.toString.call(data) != '[object Object]') data = JSON.parse(data);

        console.info('Fetched subclasses: ' + JSON.stringify(data));
        updateTaxonomyTreeSubclasses(data);
    })
    .fail(ajaxFail);
};

var getListOfRepoFiles = function(type) {
    return $.ajax({
        url: 'http://' + hostname + ':3001/listfiles/' + type + '/json',
        type: 'get',
        cache: false
    })
    .fail(ajaxFail);
};

var getNameFromUrl = function(url) {
    var lslashIdx = url.lastIndexOf('/'),
        name = lslashIdx === -1 ? url : url.substring(lslashIdx + 1, url.length);

    return name;
};

var createRepoTree = function(data, elemSelector, repoName, onSelect) {
    var repo = repoName + ' Repository',
        treeList = [{
            id: repo,
            parent: '#',
            text: repo
        }],
        treeId2Url = { };

    data.forEach(function(url) {
        console.info('Adding: ' + url + ' to ' + repo + ' tree');

        var name = getNameFromUrl(url);

        treeList.push({
            id: name,
            parent: repo,
            text: name
        });
        treeId2Url[ name ] = url;
    });
    $(elemSelector).jstree({
        core : {
            multiple : false,
            data : treeList,
            check_callback: true
        }
    }).on('changed.jstree', function(jqe, data) {
        if (data.node.parent == '#') { // The repository titled root deselect if selected
            $.jstree.reference(elemSelector).deselect_node(data.selected);
            return;
        }

        if (data.action == 'select_node') {
            var id = data.selected[ 0 ];

            console.info('Repository selection: ' + id);
            onSelect(treeId2Url[ id ], id);
        }
    });
};

var createS3DRepoTree = function(data) {
    if (Object.prototype.toString.call(data) != '[object Array]') console.warn('S3D listfiles request not an array, data: ' + Object.prototype.toString.call(data));

    createRepoTree(data, '#s3ds', 'S3D', loadS3D);
};

var createDAERepoTree = function(data) {
    if (Object.prototype.toString.call(data) != '[object Array]') console.warn('S3D listfiles request not an array, data: ' + Object.prototype.toString.call(data));

    createRepoTree(data, '#daes', '3D', loadDAE);
};

var createFloraRepoTree = function(data) {
    if (Object.prototype.toString.call(data) != '[object Array]') console.warn('S3D listfiles request not an array, data: ' + Object.prototype.toString.call(data));

    createRepoTree(data, '#floras', 'Flora', loadFlora);
};

var createAssetTreeSelectionGUI = function() {
    getListOfRepoFiles('s3d').done(createS3DRepoTree);
    getListOfRepoFiles('collada').done(createDAERepoTree);
    getListOfRepoFiles('flora').done(createFloraRepoTree);
};

var ajaxFail = function(jqXHR, textStatus, errorThrown) {
  console.warn(textStatus + ':' + errorThrown);
};

window.$ = $;
window.jQuery = $;
window.addEventListener('DOMContentLoaded', function(event) {
    console.log('DOM fully loaded and parsed');
    hostname = window.document.location.hostname;
    createAssetTreeSelectionGUI();
});
