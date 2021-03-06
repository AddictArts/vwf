/*
Copyright 2016 SRI International

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
'use strict';

var G2JS = require('../../scripts/grouping2js'),
    $ = require('../../scripts/node_modules/jquery'),
    $dae,
    tween,
    focusedNodeName,
    meshCache = { },
    semantic = G2JS.emptySjs,
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
    $('#hierarchy').jstree({
        core : {
            multiple : false,
            data : treeList,
            check_callback: true
        },
        plugins : [ 'contextmenu', 'search' ],
        contextmenu : {
            items : {
                Link : {
                    label : 'Link',
                    action : function (obj) { window.addLink(); } // from s3d.refactor.js todo: future refactor
                },
                Unlink : {
                    label : 'Unlink',
                    action : function (obj) { window.removeLink(); } // from s3d.refactor.js todo: future refactor
                }
            },
            ccp : false,
            create : false,
            rename : false,
            remove : false
        }
    }).on('changed.jstree', function(e, data) {
        var r = [ ];

        for (var i = 0, j = data.selected.length; i < j; i++) r.push(data.instance.get_node(data.selected[ i ]).text);

        window.currentNode = r.join(', '); // from s3d.refactor.js todo: future refactor

        if (data.node.parent == '#') {
            TOW.cancelOnRenders();
            // TOW.restoreCenteredGeometryOffsetPivot(TOW.findMeshByName(focusedNodeName, $dae), $dae); // Experimental, not functioning
            TOW.visibleSceneChildren($dae);
        } else if (data.node.id == 'Trigger') focusTween(data.node.id); // Experimental tween support, will need ui for it
        else focusSelected(data.node.id);

        focusedNodeName = data.node.id;
    });
    $('#hierarchy-search').submit(function(e) {
        e.preventDefault();
        $('#hierarchy').jstree(true).search($('#hierarchy-query').val());
    });
};

var createTaxonomyTree =  function(tax, floraname) {
    var taxdiv = window.document.getElementById("taxonomy"), // from s3d.refactor.js todo: future refactor
        classList = window.document.createElement("ul"), // from s3d.refactor.js todo: future refactor
        rootNode = window.document.createElement("li"); // from s3d.refactor.js todo: future refactor

    rootNode.appendChild(window.document.createTextNode(floraname)); // from s3d.refactor.js todo: future refactor

    var elementList = window.document.createElement("ul"); // from s3d.refactor.js todo: future refactor

    rootNode.appendChild(elementList);
    classList.appendChild(rootNode);

    // Takes a flora term string and returns an HTML DOM representation of it
    function createListItem(floraTerm) {
        var item = window.document.createElement("li");

        item.appendChild(window.document.createTextNode(floraTerm));
        return item;
    }

    for (var i = 0; i < tax.length; i++) elementList.appendChild(createListItem(tax[ i ]));

    taxdiv.appendChild(classList);
    $('#taxonomy').jstree({
        core : {
            multiple : false,
            check_callback: true
        },
        plugins : [ 'contextmenu', 'search' ],
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
                    action : function(obj) { getTaxonomyInfo(); }
                },
                ccp : false,
                create : false,
                rename : false,
                remove : false
            }
        }
    }).on('changed.jstree', function(jqe, data) {
        var r = [ ]; // reset the selected classes, from s3d.refactor.js todo: future refactor

        for (var i = 0, j = data.selected.length; i < j; i++) {
            var nodeText = data.instance.get_node(data.selected[ i ]).text;

            r.push(nodeText); // from s3d.refactor.js todo: future refactor
        }

        window.currentClass = r.join(', '); // from s3d.refactor.js todo: future refactor

        var fclass = r[ 0 ];

        if (data.selected.length === 1) {
            window.floraClass = fclass; // from s3d.refactor.js todo: future refactor

            if ($.jstree.reference('#taxonomy').is_leaf(data.selected[ 0 ]) === true) getSubClasses(fclass); // from s3d.refactor.js todo: future refactor
        }
    });
    $('#taxonomy-search').submit(function(e) {
        e.preventDefault();
        $('#taxonomy').jstree(true).search($('#taxonomy-query').val());
    });
};

var updateTaxonomyTreeSubclasses = function(tax) {
    if (tax.subclasses === undefined) return

    var tref = $.jstree.reference('#taxonomy');

    if (tref.is_leaf(window.floraClass) != true) return; // from s3d.refactor.js todo: future refactor

    var parent = tref.get_selected();

    console.info("Updating taxonomy super class: " + tax.superclass + ' with: ' + tax.subclasses.join(', '));

    for (var i = 0, l = tax.subclasses.length; i < l; i++) tref.create_node(parent, tax.subclasses[ i ], 'last', null, null);
};

var showTaxonomyClassDetails = function(details) {
    window.addClassDetailsToTable(details); // from s3d.refactor.js todo: future refactor
};

// $.ajax({ url:  '/SAVE/testdata/s3d/ShootingRange.xml', type: 'get', cache: false })
var loadS3D = function(url, s3dname) {
    var instance = $.jstree.reference('#hierarchy');

    if (instance) instance.destroy();

    $('#hierarchy').html('<p>Loading selected s3d...</p>');
    console.info('Loading ' + url);
    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        var xmlString;

        if ($.isXMLDoc(data)) xmlString = (new window.XMLSerializer()).serializeToString(data);
        else xmlString = data;

        var sjs = G2JS.s2js(xmlString),
            grouping = G2JS.g2js(xmlString),
            treeList = transformGroupingTojsTree(grouping),
            florauri = sjs.flora_base.uri,
            daename = getNameFromUrl(sjs.semantic_mapping.asset.uri);

        console.info('S3D references taxonomy: ' + florauri);
        console.info('S3D references asset: ' + daename);
        clearMappingRows();
        semantic = window.__sjs = sjs; // for s3d.refactor.js todo: future refactor
        semantic.grouping = grouping;
        loadFlora(florauri, getNameFromUrl(florauri));
        $('#semantic-filename').prop('value', url);
        $('#semantic-desc').prop('value', semantic.head.description);
        $('#semantic-auth').prop('value', semantic.head.author);
        $('#semantic-created').prop('value', semantic.head.created);
        $('#semantic-modified').prop('value', semantic.head.modified);
        $('#semantic-florabase-id').prop('value', semantic.flora_base.id);

        var asset = semantic.semantic_mapping.asset;

        if (asset.uri) {
            loadDAE(asset.uri, daename, treeList);
            window.linkCollection.push({ floraClass: asset.flora_ref,  modelNode: semantic.grouping.name }); // from s3d.refactor.js todo: future refactor
            window.tableBody.appendChild(window.createTableRow(asset.flora_ref, semantic.grouping.name, window.linkCollection.length)); // from s3d.refactor.js todo: future refactor
            semantic.semantic_mapping.asset.objs.forEach(function(obj) {
                window.linkCollection.push({ floraClass: obj.flora_ref,  modelNode: obj.node }); // from s3d.refactor.js todo: future refactor
                window.tableBody.appendChild(window.createTableRow(obj.flora_ref, obj.node, window.linkCollection.length)); // from s3d.refactor.js todo: future refactor
            });
        } else {
            console.warn('S3D semantic_mapping asset uri is missing or invalid');
        }
    })
    .fail(ajaxFail);
};

var loadDAE = function(url, daename, treeList) {
    var instance = $.jstree.reference('#hierarchy');

    if (instance) instance.destroy();

    $('#hierarchy').html('<img src="/js/themes/default/throbber.gif">Loading selected asset...</img>');
    console.info('Loading ' + url);

    if ($dae) TOW.Scene.remove($dae);

    if (treeList) {
        TOW.loadCollada(url, function(dae) {
            updateModelTree(treeList);
            $dae = dae;
            TOW.render();
        });
    } else {
        $.ajax({ url: url, type: 'get', cache: false })
        .done(function(data) {
            var xmlString;

            if ($.isXMLDoc(data)) xmlString = (new window.XMLSerializer()).serializeToString(data);
            else xmlString = data;

            var grouping = G2JS.dae2g(xmlString),
                treeList = transformGroupingTojsTree(grouping);

            semantic.semantic_mapping.asset.name = grouping.name;
            semantic.semantic_mapping.asset.uri = url;
            semantic.semantic_mapping.asset.sid = semantic.flora_base.id;
            semantic.grouping = grouping;
            TOW.loadColladaFromXmlString(xmlString, url, function(dae) {
                updateModelTree(treeList);
                $dae = dae;
                TOW.render();
            });
        })
        .fail(ajaxFail);
    }
};

var loadFlora = function(url, floraname) {
    var instance = $.jstree.reference('#taxonomy'),
        loadurl = 'http://' + hostname + ':3001/flora/server?method=loadFile&filename=' + encodeURIComponent(floraname);

    if (instance) instance.destroy();

    console.info('Requesting ' + floraname);
    $('#taxonomy').html('<p>Loading selected taxonomy...</p>');
    $.ajax({ url: loadurl, type: 'get', cache: false })
    .done(function(data) {
        semantic.flora_base.uri = url;
        semantic.flora_base.id = floraname + '_ont';
        getTaxonomyRoots(data, floraname)
    })
    .fail(ajaxFail);
};

// => [ "ChargingHandlePosition", "Action", "SwitchPosition", "ActionType", "PhysicalEntity", "EnumeratedType", "PinState", "BoltCarrierGroupState", "RoundLocation", "ActionParameter" ]
var getTaxonomyRoots = function(data, floraname) {
    var url = 'http://' + hostname + ':3001/flora/server?method=getTaxonomyRoots';

    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        if (Object.prototype.toString.call(data) != '[object Array]') data = JSON.parse(data);

        console.info('Fetched taxonomy roots: ' + JSON.stringify(data));
        createTaxonomyTree(data, floraname); // from s3d.refactor.js todo: future refactor
    })
    .fail(ajaxFail);
};

// ChargingHandlePosition => { superclass: "ChargingHandlePosition", subclasses: [ ] }
// Action => { superclass: "Action", subclasses: [ "Pull", "PullAndHold", "Attach", "TightenScrew", "Extract", "Point", "Insert", "Lift", "Open", "Inspect", "PushAndHold", "Close", "Push", "Detach", "SelectSwitchPosition", "Release", "Press", "LoosenScrew" ] }
// PhysicalEntity => { superclass: "PhysicalEntity", subclasses: [ "SafeTarget", "Region", "PhysicalObject" ] }
// PhysicalObject => { superclass: "PhysicalObject", subclasses: [ "FiringPin", "Hammer", "CleaningRodTip", "ShootingTarget", "M4", "Sling", "FiringPinRetainingPin", "Brush", "CleaningRodHandle", "LowerHalf", "ChargingHandle", "SlipRing", "LowerReceiverExtension", "Trigger", "CleaningRodSegment", "SlingSwivel", "Round", "ButtStockLockLever", "Extractor", "Buffer", "PipeCleaner", "WipeCloth", "CarryHandle", "BoltCarrierGroup", "BufferRetainer", "MagazineReleaseButton", "Bolt", "SlingLoop", "Casing", "UpperHalf", "CleaningRod", "Liquid", "Switch", "UpperHandGuard", "Pin", "Screw", "BoltCam", "ButtStock", "LowerHandGuard", "CleaningPatch", "BoltCatch", "Magazine" ] }
var getSubClasses = function(id) {
    var url = 'http://' + hostname + ':3001/flora/server?method=getSubClasses&id=' + encodeURIComponent(id);

    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        if (Object.prototype.toString.call(data) != '[object Object]') data = JSON.parse(data);

        console.info('Fetched ' + id + ' subclasses: ' + JSON.stringify(data));
        updateTaxonomyTreeSubclasses(data);
    })
    .fail(ajaxFail);
};

// ChargingHandlePosition => { id: "ChargingHandlePosition", superclasses: [ ], classproperties: [ ], types: [ ], individualproperties: [ ] }
var getTaxonomyInfo = function() {
    var url = 'http://' + hostname + ':3001/flora/server?method=getClassDetails&id=' + encodeURIComponent(window.currentClass); // from s3d.refactor.js todo: future refactor

    $.ajax({ url: url, type: 'get', cache: false })
    .done(function(data) {
        if (Object.prototype.toString.call(data) != '[object Object]') data = JSON.parse(data);

        console.info('Fetched ' + window.currentClass + ' class details: ' + JSON.stringify(data)); // from s3d.refactor.js todo: future refactor
        showTaxonomyClassDetails(data);
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
        },
        plugins : [ 'search' ]
    }).on('changed.jstree', function(jqe, data) {
        var tref = $.jstree.reference(elemSelector);

        if (data.node.parent == '#') { // The repository titled root deselect if selected
            tref.deselect_node(data.selected);
            return;
        }

        if (data.action == 'select_node') {
            var id = data.selected[ 0 ];

            tref.close_all();
            console.info('Repository selection: ' + id);
            onSelect(treeId2Url[ id ], id);
        }
    });
    $(elemSelector + '-search').submit(function(e) {
        e.preventDefault();
        $(elemSelector).jstree(true).search($(elemSelector + '-query').val());
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

var focusSelected = function(n, onRender) {
    var logged = false;

    TOW.cancelOnRenders();
    TOW.invisibleSceneChildren($dae);

    if (tween) tween.stop();

    if (meshCache[ n ] === undefined) {
        onRender = onRender || function(delta, pivot) {
            if (!logged) { console.log(pivot.children[ 0 ].matrix.elements); logged = true; } // log the offset matrix

            pivot.rotation.y += Math.PI / 6 * delta;
        };

        meshCache[ n ] = TOW.findMeshVisibleAndCenterRender(n, $dae, onRender);
    } else {
        var pivot = TOW.findMeshByName(n, $dae, { visible: true }).parent.parent;

        TOW.render(function(delta) { pivot.rotation.y += Math.PI / 6 * delta; });
    }
};

var focusTween = function(n) {
    TOW.cancelOnRenders();
    TOW.invisibleSceneChildren($dae);

    var pivot = TOW.findMeshAndVisibleMesh(n, $dae); // "n" has local transform, "pivot" point, not at world 0, 0, 0

    if (meshCache[ n ] === undefined) {
        meshCache[ n ] = pivot;
        // TOW.render(function(delta) { pivot.rotation.x += Math.PI / 2 * delta; });
    } else {
        if (tween) tween.start();

        return;
    }

    pivot.position.set(0, 0, 0);

    var curY = { y:  pivot.rotation.y },
        pull = new TWEEN.Tween(curY)
            .to({ y: 0.52 }, 1000) // radians and milliseconds
            // .easing(TWEEN.Easing.Elastic.InOut)
            .easing(TWEEN.Easing.Exponential.InOut)
            .onUpdate(function() { curY = pivot.rotation.y = this.y; }),
        release = new TWEEN.Tween(curY)
            .to({ y: 0 }, 500)
            .onUpdate(function() { curY =  pivot.rotation.y = this.y })
            .delay(250);

    pull.chain(release);
    release.chain(pull);
    pull.start();
    tween = pull;
};

var getS3dPathnameUsingTheDom = function(uri) {
    var uri = uri || $('#semantic-filename').val(),
        el = window.document.createElement('a'),
        parts = uri.split('.');

    el.href = uri;
    uri =  el.pathname;
    uri = uri[ 0 ] != '/'? '/' + uri : uri;
    uri = parts[ parts.length - 1 ] != 's3d'? uri + '.s3d' : uri;
    return uri;
}

var onClickSaveShow = function(jqe) {
    var fn = $('#semantic-filename').val(),
        fbid = $('#semantic-florabase-id').val();

    if (fn == '') fn = '/s3d/';
    else fn = getS3dPathnameUsingTheDom(fn);

    if (fbid == '') fbid = semantic.flora_base.id;

    $('#semantic-filename').prop('value', fn);
    $('#semantic-asset-name').prop('value', semantic.semantic_mapping.asset.name);
    $('#semantic-florabase-id').prop('value', fbid);
    $('#b-semantic-info').show();
}

var onClickSaveHide = function(jqe) {
    $('#b-semantic-info').hide();
}

var onClickSaveS3D = function(jqe) {
    updateSemanticInfoFromHtml();

    var sx = G2JS.so2xml(semantic, semantic.grouping),
        url = 'http://' + hostname + ':3001' + getS3dPathnameUsingTheDom();

    console.info('s3d:\n' + G2JS.sx2html(sx).text);
    console.info('Saving s3d to: ' + url);
    $.ajax({
        url: url,
        type: 'put',
        data: sx,
        cache: false,
        processData: false,
        crossDomain: true,
        xhrFields: { withCredentials: true } // prompt
    })
    .done(function(data) {
        console.info(data);
        onClickSaveHide();
    })
    .fail(ajaxFail);
};

var updateSemanticInfoFromHtml = function() {
    var assetname = $('#semantic-asset-name').val(),
        desc = $('#semantic-desc').val(),
        auth = $('#semantic-auth').val(),
        created = $('#semantic-created').val(),
        modified = $('#semantic-modified').val(),
        flora_base_id = $('#semantic-florabase-id').val();

    semantic.semantic_mapping.asset.name = semantic.grouping.name = assetname;
    semantic.head.description = desc;
    semantic.head.author = auth;
    semantic.head.created = created;
    semantic.head.modified = modified;
    semantic.flora_base.id = flora_base_id;

    var asset = semantic.semantic_mapping.asset;

    asset.sid = flora_base_id;
    asset.objs.forEach(function(obj) {
        obj.sid = flora_base_id;
    })
};

var onBlurSemanticInfo = function(jqe) {
    updateSemanticInfoFromHtml();
};

var clearMappingRows = function() {
    for (var i = 0, l = window.linkCollection.length; l > i; l--) window.table.deleteRow(l); // from s3d.refactor.js todo: refactor

    window.linkCollection = [ ]; // from s3d.refactor.js todo: refactor
};

var onClickDeleteMappingRow = function(jqe) {
    var tr = $(this).closest('tr'),
        fclass = tr.children('td:nth-child(2)').text(),
        node = tr.children('td:nth-child(4)').text();

    window.removeLinkByClassAndNode(fclass, node); // from s3d.refactor.js todo: refactor
    tr.remove();
};

window.$ = $;
window.jQuery = $;
window.__sjs = semantic; // for s3d.refactor.js todo: future refactor
window.addEventListener('DOMContentLoaded', function(event) {
    console.info('DOM fully loaded and parsed, ready to create the asset selection trees');
    hostname = window.document.location.hostname;
    createAssetTreeSelectionGUI();

    $('#b-semantic-info').hide();
    $('#save-button').click(onClickSaveShow);
    $('#cancel-button').click(onClickSaveHide);
    $('#save-button-s3d').click(onClickSaveS3D);
    $('#b-semantic-info input[type=text]').on('blur', onBlurSemanticInfo);
    $('table').on('click', 'input[type="button"]', onClickDeleteMappingRow); // from s3d.refactor.js todo: more refactor needed, broad selector

    TOW.changeContainerById('3d');
    TOW.loadCollada('/SAVE/models/xyzbar.dae', function() {
        $xyzbar_dae.scale.set(0.005, 0.005, 0.005);
        TOW.render();
        TOW.cancelRender(); // clear the requestAnimationFrame interval, not needed initially until dae loaded
    });
    TOW.intow(-1, 0.5, 0.5, -0.25, 0.025, 0.25); // light, camera => x, y, z
    // TOW.intow(-1, 0.5, 0.5, -10, 2, 10); // light, camera => x, y, z
});
