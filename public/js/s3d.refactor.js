
var selectedNodes = [ ]; //This is the array that will have the JSTree selections from the 3D model hierarchy
var currentNode;
var linkCount = 0;      //Link count used in the Semantic Links table
var table;    //Global var for Semantic Link table
var tableBody;    //Global var for Semantic Link table body
var classTable;     //Global var for Class details table
var classTableBody; //Global var fro class details table body
var hostName = document.location.hostname;

//--------------Flora/XSB Loading----------------------
//--------------Utility functions----------------------
function updateTaxonomy() {
  console.log("Updating taxonomy!");
  getTaxonomyRoots();
  showTaxonomy();
}

function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();

  if ("withCredentials" in xhr) {
    // Check if the XMLHttpRequest object has a "withCredentials" property.
    // "withCredentials" only exists on XMLHTTPRequest2 objects.
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined") {
    // Otherwise, check if XDomainRequest.
    // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // Otherwise, CORS is not supported by the browser.
    xhr = null;
  }

  return xhr;
}

function getXmlHttp() {
  var xhttp;

  if (window.XMLHttpRequest) {
    xhttp = new XMLHttpRequest();

    if (typeof xhttp.overrideMimeType !== 'undefined') {
      xhttp.overrideMimeType('text/xml');
    }
  } else if (window.ActiveXObject) {
    xhttp = new ActiveXObject("Microsoft.XMLHTTP");
  } else {
    alert('Perhaps your browser does not support xmlhttprequests?');
  }

  console.log("getXmlHttp: " + xhttp);
  return xhttp;
}

function handleLoadFileDone() {
  if (this.readyState == 4 && this.status == 200) {
    console.log('handleLoadFileDone()');
    getTaxonomyRoots();
  } else if (this.readyState == 4) {
    // error case
    console.log("Handle load file:- Error, code: " + this.status + " text: " + xmlhttp.responseText);
  } else {
    // wait for the call to complete
    console.log("Waiting...");
  }
}

// Takes a flora term string and returns an HTML DOM representation of it
// with buttons for selecting and expanding the identifier
function createListItem(floraTerm) {
  var item = document.createElement("li");

  item.appendChild(document.createTextNode(floraTerm));
  return item;
}

function showTaxonomy() {
  console.log("Start Show Taxonomy:- readyState: " + this.readyState +" status: " + this.status);

  if (this.readyState == 4 && this.status == 200) {
    //    console.log('showTaxonomy');
    var jsontax = xmlhttp.responseText;


jsontax = '["ChargingHandlePosition","Action","SwitchPosition","ActionType","PhysicalEntity","EnumeratedType","PinState","BoltCarrierGroupState","RoundLocation","ActionParameter"]';


    console.log('taxonomy: ' + jsontax);
    var taxdiv = document.getElementById("taxonomy");
    var tax = JSON.parse(jsontax);
    var classList = document.createElement("ul");
    var rootNode = document.createElement("li");
    rootNode.appendChild(document.createTextNode("m4"));
    var elementList = document.createElement("ul");
    rootNode.appendChild(elementList);
    classList.appendChild(rootNode);
            
    for (var i = 0; i < tax.length; i++) {
      elementList.appendChild(createListItem(tax[ i ]));
    }

    taxdiv.appendChild(classList);
    $('#taxonomy').jstree({
        'core' : {
          'check_callback': true
        },
        "plugins" : ["state", "contextmenu" ],
        contextmenu : {
          items : {
            "Link" : {
              "label" : "Link",
              "action" : function(obj) { addLink(); }
            },
            "Unlink" : {
              "label" : "Unlink",
              "action" : function(obj) { removeLink(); }
            },
            "Info" : {
              "label" : "Info",
              "action" : function(obj) { getInfo(); }
            },
            "ccp" : false,
            "create" : false,
            "rename" : false,
            "remove" : false
          }
        }
    });
    /*
    $('#taxonomy').jstree({
                "core" : {
                "themes" : {
                    "stripes" : true
                }
                },
                "checkbox" : {
                "keep_selected_style" : false
                },
                "plugins" : [ "wholerow", "checkbox" ]
            });
    */
  } else if (this.readyState == 4) {
    // error case
    console.log("Show Taxonomy:- Error, code: " + this.status + " text: " + xmlhttp.responseText);
  } else {
    // wait for the call to complete
    //console.log("Waiting...");
  }
}

//--------------Server call (controller) functions------
function loadFile(filename) {
  console.log("Loading KB file: " + filename);
  xmlhttp.onreadystatechange = handleLoadFileDone;
  // http://www.semantic3d.com:8080/flora/server?method=loadFile&filename=m4.flr
  // xmlhttp.open("GET", "http://" + hostName + ":8080/flora/server?method=loadFile&filename=" + encodeURIComponent(filename), true);
  xmlhttp.open("GET", "http://" + hostName + ":3001/flora/server?method=loadFile&filename=" + encodeURIComponent(filename), true);
  xmlhttp.send();
  console.log("Loading KB file done");
}

// ["ChargingHandlePosition","Action","SwitchPosition","ActionType","PhysicalEntity","EnumeratedType","PinState","BoltCarrierGroupState","RoundLocation","ActionParameter"]
function getTaxonomyRoots() {
  xmlhttp.onreadystatechange = showTaxonomy;
  // http://www.semantic3d.com:8080/flora/server?method=getTaxonomyRoots
  // xmlhttp.open("GET", "http://" + hostName + ":8080/flora/server?method=getTaxonomyRoots", true);
  xmlhttp.open("GET", "http://" + hostName + ":3001/flora/server?method=getTaxonomyRoots", true);
  xmlhttp.send();
  console.log("Loading roots done");
}

// ChargingHandlePosition => {"superclass":"ChargingHandlePosition","subclasses":[]}
// Action => {"superclass":"Action","subclasses":["Pull","PullAndHold","Attach","TightenScrew","Extract","Point","Insert","Lift","Open","Inspect","PushAndHold","Close","Push","Detach","SelectSwitchPosition","Release","Press","LoosenScrew"]}
// PhysicalEntity => {"superclass":"PhysicalEntity","subclasses":["SafeTarget","Region","PhysicalObject"]}
// PhysicalObject => {"superclass":"PhysicalObject","subclasses":["FiringPin","Hammer","CleaningRodTip","ShootingTarget","M4","Sling","FiringPinRetainingPin","Brush","CleaningRodHandle","LowerHalf","ChargingHandle","SlipRing","LowerReceiverExtension","Trigger","CleaningRodSegment","SlingSwivel","Round","ButtStockLockLever","Extractor","Buffer","PipeCleaner","WipeCloth","CarryHandle","BoltCarrierGroup","BufferRetainer","MagazineReleaseButton","Bolt","SlingLoop","Casing","UpperHalf","CleaningRod","Liquid","Switch","UpperHandGuard","Pin","Screw","BoltCam","ButtStock","LowerHandGuard","CleaningPatch","BoltCatch","Magazine"]}
function getSubClasses(id) {
  console.log('getSubclasses: ' + id);
  xmlhttp.onreadystatechange = addSubclassesToTree;
  // http://www.semantic3d.com:8080/flora/server?method=getSubClasses&id=ChargingHandlePosition
  // xmlhttp.open("GET", "http://" + hostName + ":8080/flora/server?method=getSubClasses&id=" + encodeURIComponent(id), true);
  xmlhttp.open("GET", "http://" + hostName + ":3001/flora/server?method=getSubClasses&id=" + encodeURIComponent(id), true);
  xmlhttp.send();
}

// ChargingHandlePosition => {"id":"ChargingHandlePosition","superclasses":[],"classproperties":[],"types":[],"individualproperties":[]}
function getDetails(id) {
  console.log('getDetails: ' + id);
  xmlhttp.onreadystatechange = showClassDetails;
  // http://www.semantic3d.com:8080/flora/server?method=getClassDetails&id=ChargingHandlePosition
  // xmlhttp.open("GET", "http://" + hostName + ":8080/flora/server?method=getClassDetails&id=" + encodeURIComponent(id), true);
  xmlhttp.open("GET", "http://" + hostName + ":3001/flora/server?method=getClassDetails&id=" + encodeURIComponent(id), true);
  xmlhttp.send();
}

function query(qstring) {
  console.log('query: ' + qstring);
  xmlhttp.onreadystatechange = showQueryResult;
  xmlhttp.open("GET", "http://" + hostName + ":8080/flora/server?method=query&queryString=" + encodeURIComponent(qstring), true);
  xmlhttp.send();
}

function getInfo() {
  getDetails(currentClass);
}

function addSubclassesToTree() {
  var leafNode = $('#taxonomy').jstree('is_leaf', floraClass);
  console.log("Selected Node is a leaf: " + leafNode);

  if (leafNode != true) return;

  var jsontax = xmlhttp.responseText;

jsontax = '{"superclass":"ChargingHandlePosition","subclasses":[]}';

  if (jsontax) {
    var tax = JSON.parse(jsontax);
    console.log('Subclasses to add: ' + jsontax);
    var parent = $('#taxonomy').jstree('get_selected');
    console.log("SUPER CLass: " + tax["superclass"]);

    for(index=0; index < tax.subclasses.length; index++) {
      console.log("   Adding subclass: " + tax.subclasses[index]);
      $("#taxonomy").jstree("create_node", parent, tax.subclasses[index], "last", null, null);
    }
  }
}

function showClassDetails() {
  var jsontax = xmlhttp.responseText;

jsontax = '{"id":"ChargingHandlePosition","superclasses":[],"classproperties":[],"types":[],"individualproperties":[]}';

  if (jsontax) {
    var tax = JSON.parse(jsontax);
    console.log("Class details: " + jsontax);
    addClassDetailsToTable(tax);
  }
}

function addClassDetailsToTable(tax) {
  if (classTable.rows.length > 1) classTable.deleteRow(1);

  var tableRow = document.createElement( 'TR' );
  var cell = document.createElement( 'TD' );
  var val = document.createTextNode(tax.id);
  cell.appendChild(val);
  tableRow.appendChild(cell);
  var superClasses = tax.superclasses;
  var classes ="";

  for (index = 0; index < superClasses.length; index++) classes += superClasses[ index ] + ", ";

  if (classes == "") classes = "None";

  cell = document.createElement( 'TD' );
  val = document.createTextNode(classes);
  cell.appendChild(val);
  tableRow.appendChild(cell);
  var types = tax.types;
  var typeList="";

  for (index = 0; index < types.length; index++) typeList += types[index] + ", ";

  if (typeList == "") typeList = "None";

  cell = document.createElement( 'TD' );
  val = document.createTextNode(typeList);
  cell.appendChild(val);
  tableRow.appendChild(cell);
  var properties = tax.individualproperties;
  var propertyList="";

  for (index = 0; index < properties.length; index++) propertyList += properties[index] + ", ";

  if (propertyList == "") propertyList = "None";

  cell = document.createElement( 'TD' );
  val = document.createTextNode(propertyList);
  cell.appendChild(val);
  tableRow.appendChild(cell);
  classTableBody.appendChild(tableRow);
}

function loadLinkTable() {
  console.log("Adding Semantic Link table!");
  var tableDiv = document.getElementById('tableContainer');
  table = document.createElement( 'TABLE' );
  table.border='1';
  tableBody = document.createElement( 'TBODY' );
  table.appendChild(tableBody);
  var headerRow = document.createElement( 'TR' );
  tableBody.appendChild(headerRow);
  var header1 = document.createElement( 'TH' );
  var temp1 = document.createTextNode("Count");
  header1.appendChild(temp1);
  headerRow.appendChild(header1);
  var header2 = document.createElement( 'TH' );
  var temp2 = document.createTextNode("Flora Class");
  header2.appendChild(temp2);
  headerRow.appendChild(header2);
  var header3 = document.createElement( 'TH' );
  headerRow.appendChild(header3);
  var header4 = document.createElement( 'TH' );
  var temp4 = document.createTextNode("3D Node");
  header4.appendChild(temp4);
  headerRow.appendChild(header4);
  var header5 = document.createElement( 'TH' );
  headerRow.appendChild(header5);
  tableDiv.appendChild(table);
}

function loadClassTable() {
  console.log("Adding Class Details table!");
  var tableDiv = document.getElementById('classContainer');
  classTable = document.createElement( 'TABLE' );
  classTable.border='1';
  classTableBody = document.createElement( 'TBODY' );
  classTable.appendChild(classTableBody);
  var headerRow = document.createElement( 'TR' );
  classTableBody.appendChild(headerRow);
  var header1 = document.createElement( 'TH' );
  var temp1 = document.createTextNode("Class ID");
  header1.appendChild(temp1);
  headerRow.appendChild(header1);
  var header2 = document.createElement( 'TH' );
  var temp2 = document.createTextNode("Super Classes");
  header2.appendChild(temp2);
  headerRow.appendChild(header2);
  var header4 = document.createElement( 'TH' );
  var temp4 = document.createTextNode("Types");
  header4.appendChild(temp4);
  headerRow.appendChild(header4);
  var header5 = document.createElement( 'TH' );
  var temp5 = document.createTextNode("Individual Properties");
  header5.appendChild(temp5);
  headerRow.appendChild(header5);
  tableDiv.appendChild(classTable);
}

//--------------Initialization-------------------------
// Global variables
//     var xmlhttp = getXmlHttp();
var selectedClasses = [ ];
    var currentClass; //global var for currently selected class
var floraClass;
var linkCollection = [ ];
var s3dfile = "";   //global var for storing the .s3d file content
var xmlhttp = createCORSRequest('GET', "http://"+hostName+":8080/flora");

if (!xmlhttp) {
  throw new Error('CORS not supported');
}
    
//--------------UI Control Logic-----------------------
function createTableRow(currentClass, currentNode) {
  var tableRow = document.createElement( 'TR' );
  var countCell = document.createElement( 'TD' );
  linkCount++;
  var countVal = document.createTextNode(linkCount);
  countCell.appendChild(countVal);
  tableRow.appendChild(countCell);
  var classCell = document.createElement( 'TD' );
  var classVal = document.createTextNode(currentClass);
  classCell.appendChild(classVal);
  tableRow.appendChild(classCell);
  var sepCell = document.createElement( 'TD' );
  var sepVal = document.createTextNode(":");
  sepCell.appendChild(sepVal);
  tableRow.appendChild(sepCell);
  var nodeCell = document.createElement( 'TD' );
  var nodeVal = document.createTextNode(currentNode);
  nodeCell.appendChild(nodeVal);
  tableRow.appendChild(nodeCell);
  var delCell = document.createElement( 'TD' );
  var delButton = document.createElement("Input");
  delButton.setAttribute("value", "Delete");
  delButton.setAttribute("type", "button");
  delButton.setAttribute("onclick", "deleteLink()");
  delCell.appendChild(delButton);
  tableRow.appendChild(delCell);
  return tableRow;
}

function deleteLink() {
  console.log("Delete button pressed!");
}

function addLinkToTable(currentClass, currentNode) {
  tableBody.appendChild(createTableRow(currentClass, currentNode));
}

function createAndAddLink() {
  //selectedClasses = $('#taxonomy').jstree('get_selected');
  //selectedNodes = $('#modelHierarchy').jstree('get_selected');
  console.log("createAndAddLinki(): " + JSON.stringify(selectedClasses));
  //var currentClass = selectedClasses[0];
  //var currentNode = selectedNodes[0];
  console.log("Link creation: " + currentClass +"->" +currentNode);
  var link = {floraClass:currentClass, modelNode:currentNode};
  linkCollection.push(link);
  console.log("Created link: " + JSON.stringify(link));
  //console.log("createAndAddLink() currentClass:" + currentClass);
  //console.log("createAndAddLink() currentNode:" + currentNode);
  addLinkToTable(currentClass, currentNode);
}

function addLink() {
  var selectedItems = [];

  console.log("The host name is:" + hostName);
  selectedClasses = $('#taxonomy').jstree('get_selected');
  console.log("Currently selected item count in Taxonomy tree:" + selectedClasses.length);
  selectedNodes = $('#modelHierarchy').jstree('get_selected');
  console.log("Currently selected item count in Model Hierarchy tree:" + selectedNodes.length);

  if (selectedClasses.length == 0) {
    alert("Error! You need to select a class in the Flora taxonomy.");
    return;
  }
  if (selectedNodes.length == 0) {
    alert("Error! You need to select a node in the 3D model hierarchy.");
    return;
  }
  if (selectedClasses.length > 1) {
    alert("Error! You can not link more than one class to a node at once.");
    return;
  }
  if (selectedNodes.length > 1) {
    alert("Error! You can not link more than one node to a class at once");
    return;
  }

  createAndAddLink();
}

function removeLink() {
  var selectedItems = [];

  selectedClasses = $('#taxonomy').jstree('get_selected');
  console.log("Currently selected item count in Taxonomy tree:" + selectedClasses.length);
  selectedNodes = $('#modelHierarchy').jstree('get_selected');
  console.log("Currently selected item count in Model Hierarchy tree:" + selectedNodes.length);

  if (selectedClasses.length == 0) {
    alert("Error! You need to select a class in the Flora taxonomy.");
    return;
  }
  if (selectedNodes.length == 0) {
    alert("Error! You need to select a node in the 3D model hierarchy.");
    return;
  }
  if (selectedClasses.length > 1) {
    alert("Error! You can not link more than one class to a node at once.");
    return;
  }
  if (selectedNodes.length > 1) {
    alert("Error! You can not link more than one node to a class at once");
    return;
  }

  var found = false;
  for (var i = 0; i < linkCollection.length; i++) {
    console.log("Scanning: Flora Class - " + linkCollection[i].floraClass + " Model Node - " + linkCollection[i].modelNode );

    if ((currentClass == linkCollection[ i ].floraClass) && (currentNode == linkCollection[ i ].modelNode)) {
      console.log("Found link to remove at index: " + i);
      linkCollection.splice(i, 1);
      table.deleteRow(i + 1);
    }
  }
}

function createSemanticLink(name, node, sid, floraRef)
{
  //<object name="Extractor" node="Extractor" sid="M4_ont" flora_ref="Extractor"/>
  var semanticLink = "<object name=\"" + name + "\" node=\"" + node + "\" sid=\"" + sid + "\" flora_ref=\"" +floraRef +"\" />\n";
  return semanticLink;
}

function addHead() {
  s3dFile += "<S3D>";
  s3dFile += "<head>";

  s3dFile += "<description>Semantic 3D mapping file for: M4 Series Carbine</description>";
  s3dFile += "<author>S3D Editor</author>";
  s3dFile += "<created>2014-11-23</created>";
  s3dFile += "<modified>2014-11-24</modified>";

  s3dFile += "</head>";
}

function addFloraBase() {
  s3dFile += "<flora_base id=\"M4_ont\" uri=\"../../../knowledge/weapons/M4/m4.flr\" />";
}

function addNodeGroups() {
  s3dFile += "<group name=\"Upper_Receiver Group\" sid=\"M4_ont\" flora_ref=\"UpperHalf\"/>\n<group name=\"Key_and_Bolt_Carrier_Assembly Group\" sid=\"M4_ont\" flora_ref=\"BoltCarrierGroup\"/>\n<group name=\"Bolt Group\" sid=\"M4_ont\" flora_ref=\"Bolt\"/>\n<group name=\"Charging_Handle Group\" sid=\"M4_ont\" flora_ref=\"ChargingHandle\"/>\n<group name=\"Gun_Carrying_Handle Group\" sid=\"M4_ont\" flora_ref=\"CarryHandle\"/>\n<group name=\"Chamber Group\" sid=\"M4_ont\" flora_ref=\"Chamber\"/>\n<group name=\"Lower_Receiver Group\" sid=\"M4_ont\" flora_ref=\"LowerHalf\"/>\n<group name=\"Magazine_g Group\" sid=\"M4_ont\" flora_ref=\"Magazine\"/>\n<group name=\"Buttstock Group\" sid=\"M4_ont\" flora_ref=\"ButtStock\"/>\n<group name=\"Bolt_Catch Group\" sid=\"M4_ont\" flora_ref=\"BoltCatch\"/>\n<group name=\"Bolt_Catch_Bottom Group\" sid=\"M4_ont\" flora_ref=\"BoltCatchBottom\"/>\n<group name=\"Bolt_Catch_Top Group\" sid=\"M4_ont\" flora_ref=\"BoltCatchTop\"/>\n<group name=\"PivotPinHead Group\" sid=\"M4_ont\" flora_ref=\"PivotPinHead\"/>\n<group name=\"PivotPinTail Group\" sid=\"M4_ont\" flora_ref=\"PivotPinTail\"/>\n<group name=\"TakedownPinHead Group\" sid=\"M4_ont\" flora_ref=\"TakedownPinHead\"/>\n<group name=\"TakedownPinTail Group\" sid=\"M4_ont\" flora_ref=\"TakedownPinTail\"/>";
}

function addSemLinks() {
  for(var i = 0; i < linkCollection.length; i++) {
    var node = linkCollection[i].modelNode;
    var floraClass = linkCollection[i].floraClass;
    var semanticLink = createSemanticLink(node, node, "M4_ont", floraClass);
    s3dFile += semanticLink;
  }
}

function addSemanticMapping() {
  s3dFile += "<semantic_mapping>";
  s3dFile += "<asset name=\"M4 Carbine\" uri=\"/SAVE/models/weapons/M4/M4_noHierarchy.dae\" sid=\"M4_ont\" flora_ref=\"M4\">";
  addNodeGroups();
  addSemLinks();
  s3dFile += "</asset>";
  s3dFile += "</semantic_mapping>";
}

function addGrouping() {
  s3dFile += "<grouping name=\"M4 Carbine\">\n<part node=\"Sling\"/>\n<part node=\"Barrel_Assembly\"/>\n<part node=\"Upper_Handguard\"/>\n<part node=\"Lower_Handguard\"/>\n<part node=\"Small_Sling_Swivel\"/>\n<part node=\"Compensator\"/>\n<part node=\"Recessed_Washer__OOCompensator\"/>\n<part node=\"Spring_Pin2\"/>\n<part node=\"Spring_Pin3\"/>\n<part node=\"Rear_Handguard_Clamp\"/>\n<part node=\"Screw\"/>\n<part node=\"Gas_Tube_Spring_Pin\"/>\n<part node=\"Gas_Tube\"/>\n<part node=\"Handguard_Slip_Ring_Spring\"/>\n<part node=\"Handguard_Slip_Ring_Retaining_Ring\"/>\n<part node=\"Handguard_Slip_Ring_LAMA918813252\"/>\n<part node=\"Front_Sight_Post\"/>\n<part node=\"Headless_Shoulder_Pin\"/>\n<part node=\"Spring3\"/>\n<part node=\"Tubular_Rivet\"/>\n<part node=\"Synchro_Clamp\"/>\n<part node=\"Spring_Pin1\"/>\n<part node=\"Spring_Pin\"/>\n<part node=\"Swivel_Mount\"/>\n<part node=\"Flat_Spring\"/>\n<part node=\"Special_Shaped_Spacer\"/>\n";
  s3dFile += "<group name=\"Buttstock Group\">\n<part node=\"Buttstock\"/>\n<part node=\"Swivel_LAMA1259863095\"/>\n<part node=\"Machine_Screw\"/>\n<part node=\"Buttstock_Release_Lever_Nut\"/>\n<part node=\"Buttstock_Release_Lever\"/>\n<part node=\"Buttstock_Release_Lever_Screw_LAMA1417807796\"/>\n<part node=\"Buttstock_Release_Lever_Spring_Pin\"/>\n<part node=\"Buttstock_Release_Lever_Spring\"/>\n</group>\n";
  s3dFile += "<group name=\"Magazine_g Group\">\n<part node=\"Tube\"/>\n<part node=\"Clip_Spring1\"/>\n<part node=\"Base\"/>\n<part node=\"Clip_Spring\"/>\n<part node=\"Follower\"/>\n<group name=\"Casing1 Group\">\n<part node=\"Casing1\"/>\n<part node=\"Projectile1\"/>\n</group>\n<group name=\"Casing2 Group\">\n<part node=\"Casing2\"/>\n<part node=\"Projectile2\"/>\n</group>\n<group name=\"Casing3 Group\">\n<part node=\"Casing3\"/>\n<part node=\"Projectile3\"/>\n</group>\n</group>\n";
  s3dFile += "<group name=\"Lower_Receiver Group\">\n<part node=\"Lower_Receiver\"/>\n<part node=\"Trigger\"/>\n<part node=\"Trigger_Spring\"/>\n<part node=\"Disconnector_Spring__OOBurst__CC\"/>\n<part node=\"Disconnector_Spring__OOSemi__CC\"/>\n<part node=\"Trigger_Spring1\"/>\n<part node=\"Trigger_Pin\"/>\n<part node=\"Disconnector__Burst\"/>\n<part node=\"Disconnector__Semi\"/>\n<part node=\"Magazine_Catch\"/>\n<part node=\"Magazine_Catch_Spring\"/>\n<part node=\"Magazine_Catch_Button\"/>\n<part node=\"Pivot_Pin\"/>\n<part node=\"Pivot_Pin_Detent\"/>\n<part node=\"Pivot_Pin_Spring\"/>\n<part node=\"Takedown_Pin\"/>\n<part node=\"Takedown_Pin_Detent\"/>\n<part node=\"Takedown_Pin_Detent_Spring\"/>\n<part node=\"Selector_Lever\"/>\n<part node=\"Safety_Detent__OOSelector_Lever__CC\"/>\n<part node=\"Safety_Spring__OOSelector_Lever__CC\"/>\n<part node=\"Automatic_Sear\"/>\n<part node=\"Automatic_Sear_Spring\"/>\n<part node=\"Sear_Pin\"/>\n<part node=\"Hammer\"/>\n<part node=\"Hammer_Spring1\"/>\n<part node=\"Hammer_Pin\"/>\n<part node=\"Burst_Cam\"/>\n<part node=\"Burst_Cam_Clutch_Spring\"/>\n<part node=\"Hammer_Spring\"/>\n<part node=\"Lower_Receiver_Extension\"/>\n<part node=\"Buffer\"/>\n<part node=\"Action_Spring\"/>\n<part node=\"Plain_Round_Nut\"/>\n<part node=\"Receiver_End_Plate\"/>\n<part node=\"Buffer_Retainer\"/>\n<part node=\"Buffer_Retainer_Spring\"/>\n<part node=\"Trigger_Guard\"/>\n<part node=\"Trigger_Guard_Spring_Pin_Retaining_Pin\"/>\n<part node=\"Trigger_Guard_Detent\"/>\n<part node=\"Trigger_Guard_Detent_Spring\"/>\n<part node=\"Pistol_Grip\"/>\n<part node=\"Pistol_Grip_Screw\"/>\n<part node=\"Pistol_Grip_Lock_Washer\"/>\n";
  s3dFile += "<group name=\"Bolt_Catch Group\">\n<part node=\"Bolt_Catch\"/>\n<part node=\"Bolt_Catch_Spring_Pin\"/>\n<part node=\"Bolt_Catch_Plunger\"/>\n<part node=\"Bolt_Catch_Spring\"/>\n<group name=\"Bolt_Catch_Bottom Group\"/>\n<group name=\"Bolt_Catch_Top Group\"/>\n</group>\n<group name=\"PivotPinHead Group\"/>\n<group name=\"PivotPinTail Group\"/>\n<group name=\"TakedownPinHead Group\"/>\n<group name=\"TakedownPinTail Group\"/>\n</group>\n";
  s3dFile += "<group name=\"Upper_Receiver Group\">\n<part node=\"Upper_Receiver\"/>\n<part node=\"Plunger_Assembly\"/>\n<part node=\"Pawl__Forward_Assist\"/>\n<part node=\"Forward_Assist_Spring\"/>\n<part node=\"Forward_Assist_Spring1\"/>\n<part node=\"Pawl_Spring_Pin\"/>\n<part node=\"Pawl_Detent\"/>\n<part node=\"Pawl_Spring\"/>\n<part node=\"Cover_Pin\"/>\n<part node=\"Ejection_Port_Cover\"/>\n<part node=\"Cover_Spring\"/>\n<part node=\"Cover_Retaining_Ring__OOC_Clip__CC\"/>\n<group name=\"Chamber Group\"/>\n<group name=\"Charging_Handle Group\">\n<part node=\"Charging_Handle\"/>\n<part node=\"Charging_Handle_Latch\"/>\n<part node=\"Charging_Handle_Spring\"/>\n<part node=\"Charging_Handle_Spring_Pin\"/>\n</group>\n<group name=\"Key_and_Bolt_Carrier_Assembly Group\">\n<part node=\"Key_and_Bolt_Carrier_Assembly\"/>\n<part node=\"Firing_Pin_Retaining_Pin\"/>\n<part node=\"Firing_Pin\"/>\n<group name=\"Bolt Group\">\n<part node=\"Bolt\"/>\n<part node=\"Bolt_Cam_Pin\"/>\n<part node=\"Ejector_Spring_Pin\"/>\n<part node=\"Bolt_Ring\"/>\n<part node=\"Bolt_Ring2\"/>\n<part node=\"Bolt_Ring1\"/>\n<part node=\"Ejector\"/>\n<part node=\"Ejector_Spring\"/>\n<part node=\"Extractor\"/>\n<part node=\"Extractor_Spring\"/>\n<part node=\"Extractor_Pin\"/>\n<part node=\"Casing4\"/>\n<part node=\"Projectile4\"/>\n</group>\n</group>\n";
  s3dFile += "<group name=\"Gun_Carrying_Handle Group\">\n<part node=\"Gun_Carrying_Handle\"/>\n<part node=\"Windage_Spring_Pin\"/>\n<part node=\"Rear_Sight_Screw\"/>\n<part node=\"Flat_Rear_Sight_Spring\"/>\n<part node=\"Rear_Sight_Base\"/>\n<part node=\"Sight_Aperture\"/>\n<part node=\"Windage_Knob\"/>\n<part node=\"Spring__Helical__Compression\"/>\n<part node=\"Knob\"/>\n<part node=\"Ball_Bearing1\"/>\n<part node=\"Elevating_Mechanism\"/>\n<part node=\"Spring2\"/>\n<part node=\"Spring1\"/>\n<part node=\"Index_Screw\"/>\n<part node=\"Ball_Bearing\"/>\n<part node=\"Pin_Spring\"/>\n<part node=\"Spring\"/>\n<part node=\"Ball_Bearing2\"/>\n<part node=\"Round_Nut1\"/>\n<part node=\"Washer1\"/>\n<part node=\"Washer\"/>\n<part node=\"Clamping_Bar\"/>\n<part node=\"Round_Nut\"/>\n</group>\n</group>\n</grouping>\n";
}

function addEnd() {
  s3dFile += "</S3D>";
}

function buildS3DFile() {
  s3dFile = "";
  addHead();
  addFloraBase();
  addSemanticMapping();
  addGrouping();
  addEnd();
}

function saveData() {
  buildS3DFile();
  console.log("Writing S3D file to SAVE repository!");

  //  var myData = "";
  //  for(var i = 0; i < s3dFile.length; i++) {            
  //    console.log(s3dFile[i]);
  //    myDAta = myData + s3dFile[i] + "";
  //  }
  //console.log("----------------------------End File-------------------------------");
  //var fileData = JSON.stringify(s3dFile);
  jQuery.ajax({
      url:'http://'+hostName+':3001/s3d/M4_Carbine.s3d',
      type:'put',
      data: s3dFile,
      cache: false,
      processData: false,
      crossDomain: true,
      xhrFields: { withCredentials: true } // prompt
  })
  .done(function(data) { console.log("Result from PUT operation: " + data)  });
}

$('#modelHierarchy').jstree({
  'core' : {
    'data' : [
      { "id" : "M4 Carbine",                          "parent" : "#",           "text" : "M4 Carbine" },
      { "id" : "Sling",                               "parent" : "M4 Carbine",       "text" : "Sling" },
      { "id" : "Barrel_Assembly",                     "parent" : "M4 Carbine",       "text" : "Barrel_Assembly" },
      { "id" : "Upper_Handguard",                     "parent" : "M4 Carbine",       "text" : "Upper_Handguard" },
      { "id" : "Lower_Handguard",                     "parent" : "M4 Carbine",       "text" : "Lower_Handguard" },
      { "id" : "Small_Sling_Swivel",                  "parent" : "M4 Carbine",       "text" : "Small_Sling_Swivel" },
      { "id" : "Compensator",                         "parent" : "M4 Carbine",       "text" : "Compensator" },
      { "id" : "Recessed_Washer__OOCompensator",      "parent" : "M4 Carbine",       "text" : "Recessed_Washer__OOCompensator" },
      { "id" : "Spring_Pin2",                         "parent" : "M4 Carbine",       "text" : "Spring_Pin2" },
      { "id" : "Spring_Pin3",                         "parent" : "M4 Carbine",       "text" : "Spring_Pin3" },
      { "id" : "Rear_Handguard_Clamp",                "parent" : "M4 Carbine",       "text" : "Rear_Handguard_Clamp" },
      { "id" : "Screw",                               "parent" : "M4 Carbine",       "text" : "Screw" },
      { "id" : "Gas_Tube_Spring_Pin",                 "parent" : "M4 Carbine",       "text" : "Gas_Tube_Spring_Pin" },
      { "id" : "Gas_Tube",                            "parent" : "M4 Carbine",       "text" : "Gas_Tube" },
      { "id" : "Handguard_Slip_Ring_Spring",          "parent" : "M4 Carbine",       "text" : "Handguard_Slip_Ring_Spring" },
      { "id" : "Handguard_Slip_Ring_Retaining_Ring",  "parent" : "M4 Carbine",       "text" : "Handguard_Slip_Ring_Retaining_Ring" },
      { "id" : "Handguard_Slip_Ring_LAMA918813252",   "parent" : "M4 Carbine",       "text" : "Handguard_Slip_Ring_LAMA918813252" },
      { "id" : "Front_Sight_Post",                    "parent" : "M4 Carbine",       "text" : "Front_Sight_Post" },
      { "id" : "Headless_Shoulder_Pin",               "parent" : "M4 Carbine",       "text" : "Headless_Shoulder_Pin" },
      { "id" : "Spring3",                             "parent" : "M4 Carbine",       "text" : "Spring3" },
      { "id" : "Tubular_Rivet",                       "parent" : "M4 Carbine",       "text" : "Tubular_Rivet" },
      { "id" : "Synchro_Clamp",                       "parent" : "M4 Carbine",       "text" : "Synchro_Clamp" },
      { "id" : "Spring_Pin1",                         "parent" : "M4 Carbine",       "text" : "Spring_Pin1" },
      { "id" : "Spring_Pin",                          "parent" : "M4 Carbine",       "text" : "Spring_Pin" },
      { "id" : "Swivel_Mount",                        "parent" : "M4 Carbine",       "text" : "Swivel_Mount" },
      { "id" : "Flat_Spring",                         "parent" : "M4 Carbine",       "text" : "Flat_Spring" },
      { "id" : "Special_Shaped_Spacer",               "parent" : "M4 Carbine",       "text" : "Special_Shaped_Spacer" },
      // Buttstock Group 0
      { "id" : "Buttstock Group",                               "parent" : "M4 Carbine",      "text" : "Buttstock Group" },
      { "id" : "Buttstock",                                     "parent" : "Buttstock Group", "text" : "Buttstock" },
      { "id" : "Swivel_LAMA1259863095",                         "parent" : "Buttstock Group", "text" : "Swivel_LAMA1259863095k" },
      { "id" : "Machine_Screw",                                 "parent" : "Buttstock Group", "text" : "Machine_Screw" },
      { "id" : "Buttstock_Release_Lever_Nut",                   "parent" : "Buttstock Group", "text" : "Buttstock_Release_Lever_Nut" },
      { "id" : "Buttstock_Release_Lever",                       "parent" : "Buttstock Group", "text" : "Buttstock_Release_Lever" },
      { "id" : "Buttstock_Release_Lever_Screw_LAMA1417807796",  "parent" : "Buttstock Group", "text" : "Buttstock_Release_Lever_Screw_LAMA1417807796" },
      { "id" : "Buttstock_Release_Lever_Spring_Pin",            "parent" : "Buttstock Group", "text" : "Buttstock_Release_Lever_Spring_Pin" },
      { "id" : "Buttstock_Release_Lever_Spring",                "parent" : "Buttstock Group", "text" : "Buttstock_Release_Lever_Spring" },
      // Magazine_g Group 1
      { "id" : "Magazine_g Group",  "parent" : "M4 Carbine",        "text" : "Magazine_g Group" },
      { "id" : "Tube",              "parent" : "Magazine_g Group",  "text" : "Tube" },
      { "id" : "Clip_Spring1",      "parent" : "Magazine_g Group",  "text" : "Clip_Spring1" },
      { "id" : "Base",              "parent" : "Magazine_g Group",  "text" : "Base" },
      { "id" : "Clip_Spring",       "parent" : "Magazine_g Group",  "text" : "Clip_Spring" },
      { "id" : "Follower",          "parent" : "Magazine_g Group",  "text" : "Follower" },
      { "id" : "Casing1 Group",     "parent" : "Magazine_g Group",  "text" : "Casing1 Group" },
      { "id" : "Casing1",           "parent" : "Casing1 Group",     "text" : "Casing1" },
      { "id" : "Projectile1",       "parent" : "Casing1 Group",     "text" : "Projectile1" },
      { "id" : "Casing2 Group",     "parent" : "Magazine_g Group",  "text" : "Casing2 Group" },
      { "id" : "Casing2",           "parent" : "Casing2 Group",     "text" : "Casing2" },
      { "id" : "Projectile2",       "parent" : "Casing2 Group",     "text" : "Projectile2" },
      { "id" : "Casing3 Group",     "parent" : "Magazine_g Group",  "text" : "Casing3 Group" },
      { "id" : "Casing3",           "parent" : "Casing3 Group",     "text" : "Casing3" },
      { "id" : "Projectile3",       "parent" : "Casing3 Group",     "text" : "Projectile3" },
      // Lower_Receiver Group 2
      { "id" : "Lower_Receiver Group",  "parent" : "M4 Carbine",    "text" : "Lower_Receiver Group" },
      { "id" : "Lower_Receiver",    "parent" : "Lower_Receiver Group",  "text" : "Lower_Receiver" },
      { "id" : "Trigger",       "parent" : "Lower_Receiver Group",  "text" : "Trigger" },
      { "id" : "Trigger_Spring",    "parent" : "Lower_Receiver Group",  "text" : "Trigger_Spring" },
      { "id" : "Disconnector_Spring__OOBurst__CC",    "parent" : "Lower_Receiver Group",  "text" : "Disconnector_Spring__OOBurst__CC" },
      { "id" : "Disconnector_Spring__OOSemi__CC",     "parent" : "Lower_Receiver Group",  "text" : "Disconnector_Spring__OOSemi__CC" },
      { "id" : "Trigger_Spring1",     "parent" : "Lower_Receiver Group",  "text" : "Trigger_Spring1" },
      { "id" : "Trigger_Pin",     "parent" : "Lower_Receiver Group",  "text" : "Trigger_Pin" },
      { "id" : "Disconnector__Burst",   "parent" : "Lower_Receiver Group",  "text" : "Disconnector__Burst" },
      { "id" : "Disconnector__Semi",    "parent" : "Lower_Receiver Group",  "text" : "Disconnector__Semi" },
      { "id" : "Magazine_Catch",    "parent" : "Lower_Receiver Group",  "text" : "Magazine_Catch" },
      { "id" : "Magazine_Catch_Spring",   "parent" : "Lower_Receiver Group",  "text" : "Magazine_Catch_Spring" },
      { "id" : "Magazine_Catch_Button",   "parent" : "Lower_Receiver Group",  "text" : "Magazine_Catch_Button" },
      { "id" : "Pivot_Pin",       "parent" : "Lower_Receiver Group",  "text" : "Pivot_Pin" },
      { "id" : "Pivot_Pin_Detent",    "parent" : "Lower_Receiver Group",  "text" : "Pivot_Pin_Detent" },
      { "id" : "Pivot_Pin_Spring",    "parent" : "Lower_Receiver Group",  "text" : "Pivot_Pin_Spring" },
      { "id" : "Takedown_Pin",    "parent" : "Lower_Receiver Group",  "text" : "Takedown_Pin" },
      { "id" : "Takedown_Pin_Detent",   "parent" : "Lower_Receiver Group",  "text" : "Takedown_Pin_Detent" },
      { "id" : "Takedown_Pin_Detent_Spring",  "parent" : "Lower_Receiver Group",  "text" : "Takedown_Pin_Detent_Spring" },
      { "id" : "Selector_Lever",    "parent" : "Lower_Receiver Group",  "text" : "Selector_Lever" },
      { "id" : "Safety_Detent__OOSelector_Lever__CC",     "parent" : "Lower_Receiver Group",  "text" : "Safety_Detent__OOSelector_Lever__CC" },
      { "id" : "Safety_Spring__OOSelector_Lever__CC",     "parent" : "Lower_Receiver Group",  "text" : "Safety_Spring__OOSelector_Lever__CC" },
      { "id" : "Automatic_Sear",    "parent" : "Lower_Receiver Group",  "text" : "Automatic_Sear" },
      { "id" : "Automatic_Sear_Spring",   "parent" : "Lower_Receiver Group",  "text" : "Automatic_Sear_Spring" },
      { "id" : "Sear_Pin",      "parent" : "Lower_Receiver Group",  "text" : "Sear_Pin" },
      { "id" : "Hammer",      "parent" : "Lower_Receiver Group",  "text" : "Hammer" },
      { "id" : "Hammer_Spring1",    "parent" : "Lower_Receiver Group",  "text" : "Hammer_Spring1" },
      { "id" : "Hammer_Pin",      "parent" : "Lower_Receiver Group",  "text" : "Hammer_Pin" },
      { "id" : "Burst_Cam",       "parent" : "Lower_Receiver Group",  "text" : "Burst_Cam" },
      { "id" : "Burst_Cam_Clutch_Spring",   "parent" : "Lower_Receiver Group",  "text" : "Burst_Cam_Clutch_Spring" },
      { "id" : "Hammer_Spring",     "parent" : "Lower_Receiver Group",  "text" : "Hammer_Spring" },
      { "id" : "Lower_Receiver_Extension",  "parent" : "Lower_Receiver Group",  "text" : "Lower_Receiver_Extension" },
      { "id" : "Buffer",      "parent" : "Lower_Receiver Group",  "text" : "Buffer" },
      { "id" : "Action_Spring",     "parent" : "Lower_Receiver Group",  "text" : "Action_Spring" },
      { "id" : "Plain_Round_Nut",     "parent" : "Lower_Receiver Group",  "text" : "Plain_Round_Nut" },
      { "id" : "Receiver_End_Plate",    "parent" : "Lower_Receiver Group",  "text" : "Receiver_End_Plate" },
      { "id" : "Buffer_Retainer",     "parent" : "Lower_Receiver Group",  "text" : "Buffer_Retainer" },
      { "id" : "Buffer_Retainer_Spring",  "parent" : "Lower_Receiver Group",  "text" : "Buffer_Retainer_Spring" },
      { "id" : "Trigger_Guard",     "parent" : "Lower_Receiver Group",  "text" : "Trigger_Guard" },
      { "id" : "Trigger_Guard_Spring_Pin_Retaining_Pin",    "parent" : "Lower_Receiver Group",  "text" : "Trigger_Guard_Spring_Pin_Retaining_Pin" },
      { "id" : "Trigger_Guard_Detent",  "parent" : "Lower_Receiver Group",  "text" : "Trigger_Guard_Detent" },
      { "id" : "Trigger_Guard_Detent_Spring", "parent" : "Lower_Receiver Group",  "text" : "Trigger_Guard_Detent_Spring" },
      { "id" : "Pistol_Grip",     "parent" : "Lower_Receiver Group",  "text" : "Pistol_Grip" },
      { "id" : "Pistol_Grip_Screw",     "parent" : "Lower_Receiver Group",  "text" : "Pistol_Grip_Screw" },
      { "id" : "Pistol_Grip_Lock_Washer",   "parent" : "Lower_Receiver Group",  "text" : "Pistol_Grip_Lock_Washer" },
      { "id" : "Bolt_Catch Group",    "parent" : "Lower_Receiver Group",  "text" : "Bolt_Catch Group" },
      { "id" : "Bolt_Catch",      "parent" : "Bolt_Catch Group",  "text" : "Bolt_Catch" },
      { "id" : "Bolt_Catch_Spring_Pin",   "parent" : "Bolt_Catch Group",  "text" : "Bolt_Catch_Spring_Pin" },
      { "id" : "Bolt_Catch_Plunger",    "parent" : "Bolt_Catch Group",  "text" : "Bolt_Catch_Plunger" },
      { "id" : "Bolt_Catch_Spring",     "parent" : "Bolt_Catch Group",  "text" : "Bolt_Catch_Spring" },
      { "id" : "Bolt_Catch_Bottom Group",   "parent" : "Bolt_Catch Group",  "text" : "Bolt_Catch_Bottom Group" },
      { "id" : "Bolt_Catch_Top Group",  "parent" : "Bolt_Catch Group",  "text" : "Bolt_Catch_Top Group" },
      { "id" : "PivotPinHead Group",  "parent" : "Lower_Receiver Group",  "text" : "PivotPinHead Group" },
      { "id" : "PivotPinTail Group",  "parent" : "Lower_Receiver Group",  "text" : "PivotPinTail Group" },
      { "id" : "TakedownPinHead Group",   "parent" : "Lower_Receiver Group",  "text" : "TakedownPinHead Group" },
      { "id" : "TakedownPinTail Group",   "parent" : "Lower_Receiver Group",  "text" : "TakedownPinTail Group" },
      // Upper_Receiver Group 3
      { "id" : "Upper_Receiver Group",  "parent" : "M4 Carbine",    "text" : "Upper_Receiver Group" },
      { "id" : "Upper_Receiver",    "parent" : "Upper_Receiver Group",  "text" : "Plunger_Assembly" },
      { "id" : "Plunger_Assembly",    "parent" : "Upper_Receiver Group",  "text" : "Upper_Receiver" },
      { "id" : "Pawl__Forward_Assist",  "parent" : "Upper_Receiver Group",  "text" : "Pawl__Forward_Assist" },
      { "id" : "Forward_Assist_Spring",   "parent" : "Upper_Receiver Group",  "text" : "Forward_Assist_Spring" },
      { "id" : "Forward_Assist_Spring1",  "parent" : "Upper_Receiver Group",  "text" : "Forward_Assist_Spring1" },
      { "id" : "Pawl_Spring_Pin",     "parent" : "Upper_Receiver Group",  "text" : "Pawl_Spring_Pin" },
      { "id" : "Pawl_Detent",     "parent" : "Upper_Receiver Group",  "text" : "Pawl_Detent" },
      { "id" : "Pawl_Spring",     "parent" : "Upper_Receiver Group",  "text" : "Pawl_Spring" },
      { "id" : "Cover_Pin",       "parent" : "Upper_Receiver Group",  "text" : "Cover_Pin" },
      { "id" : "Ejection_Port_Cover",   "parent" : "Upper_Receiver Group",  "text" : "Ejection_Port_Cover" },
      { "id" : "Cover_Spring",    "parent" : "Upper_Receiver Group",  "text" : "Cover_Spring" },
      { "id" : "Cover_Retaining_Ring__OOC_Clip__CC",    "parent" : "Upper_Receiver Group",  "text" : "Cover_Retaining_Ring__OOC_Clip__CC" },
      { "id" : "Chamber Group",     "parent" : "Upper_Receiver Group",  "text" : "Chamber Group" },
      { "id" : "Charging_Handle Group",   "parent" : "Upper_Receiver Group",  "text" : "Charging_Handle Group" },
      { "id" : "Charging_Handle",     "parent" : "Charging_Handle Group", "text" : "Charging_Handle" },
      { "id" : "Charging_Handle_Latch",   "parent" : "Charging_Handle Group", "text" : "Charging_Handle_Latch" },
      { "id" : "Charging_Handle_Spring",  "parent" : "Charging_Handle Group", "text" : "Charging_Handle_Spring" },
      { "id" : "Charging_Handle_Spring_Pin",  "parent" : "Charging_Handle Group", "text" : "Charging_Handle_Spring_Pin" },
      { "id" : "Key_and_Bolt_Carrier_Assembly Group", "parent" : "Upper_Receiver Group",  "text" : "Key_and_Bolt_Carrier_Assembly Group" },
      { "id" : "Key_and_Bolt_Carrier_Assembly",   "parent" : "Key_and_Bolt_Carrier_Assembly Group", "text" : "Key_and_Bolt_Carrier_Assembly" },
      { "id" : "Firing_Pin_Retaining_Pin",    "parent" : "Key_and_Bolt_Carrier_Assembly Group", "text" : "Firing_Pin_Retaining_Pin" },
      { "id" : "Firing_Pin",    "parent" : "Key_and_Bolt_Carrier_Assembly Group", "text" : "Firing_Pin" },
      { "id" : "Bolt Group",    "parent" : "Key_and_Bolt_Carrier_Assembly Group", "text" : "Bolt Group" },
      { "id" : "Bolt",    "parent" : "Bolt Group",  "text" : "Bolt" },
      { "id" : "Bolt_Cam_Pin",  "parent" : "Bolt Group",  "text" : "Bolt_Cam_Pin" },
      { "id" : "Ejector_Spring_Pin",  "parent" : "Bolt Group",  "text" : "Ejector_Spring_Pin" },
      { "id" : "Bolt_Ring",     "parent" : "Bolt Group",  "text" : "Bolt_Ring" },
      { "id" : "Bolt_Ring2",    "parent" : "Bolt Group",  "text" : "Bolt_Ring2" },
      { "id" : "Bolt_Ring1",    "parent" : "Bolt Group",  "text" : "Bolt_Ring1" },
      { "id" : "Ejector",     "parent" : "Bolt Group",  "text" : "Ejector" },
      { "id" : "Ejector_Spring",  "parent" : "Bolt Group",  "text" : "Ejector_Spring" },
      { "id" : "Extractor",     "parent" : "Bolt Group",  "text" : "Extractorp" },
      { "id" : "Extractor_Spring",  "parent" : "Bolt Group",  "text" : "Extractor_Spring" },
      { "id" : "Extractor_Pin",   "parent" : "Bolt Group",  "text" : "Extractor_Pin" },
      { "id" : "Casing4",     "parent" : "Bolt Group",  "text" : "Casing4" },
      { "id" : "Projectile4",   "parent" : "Bolt Group",  "text" : "Projectile4" },
      { "id" : "Gun_Carrying_Handle Group",   "parent" : "Upper_Receiver Group",  "text" : "Gun_Carrying_Handle Group" },
      { "id" : "Gun_Carrying_Handle",   "parent" : "Gun_Carrying_Handle Group", "text" : "Gun_Carrying_Handle" },
      { "id" : "Windage_Spring_Pin",    "parent" : "Gun_Carrying_Handle Group", "text" : "Windage_Spring_Pin" },
      { "id" : "Rear_Sight_Screw",    "parent" : "Gun_Carrying_Handle Group", "text" : "Rear_Sight_Screw" },
      { "id" : "Flat_Rear_Sight_Spring",  "parent" : "Gun_Carrying_Handle Group", "text" : "Flat_Rear_Sight_Spring" },
      { "id" : "Rear_Sight_Base",     "parent" : "Gun_Carrying_Handle Group", "text" : "Rear_Sight_Base" },
      { "id" : "Sight_Aperture",    "parent" : "Gun_Carrying_Handle Group", "text" : "Sight_Aperture" },
      { "id" : "Windage_Knob",    "parent" : "Gun_Carrying_Handle Group", "text" : "Windage_Knob" },
      { "id" : "Spring__Helical__Compression",    "parent" : "Gun_Carrying_Handle Group", "text" : "Spring__Helical__Compression" },
      { "id" : "Knob",    "parent" : "Gun_Carrying_Handle Group", "text" : "Knob" },
      { "id" : "Ball_Bearing1",   "parent" : "Gun_Carrying_Handle Group", "text" : "Ball_Bearing1" },
      { "id" : "Elevating_Mechanism", "parent" : "Gun_Carrying_Handle Group", "text" : "Elevating_Mechanism" },
      { "id" : "Spring2",     "parent" : "Gun_Carrying_Handle Group", "text" : "Spring2" },
      { "id" : "Spring1",     "parent" : "Gun_Carrying_Handle Group", "text" : "Spring1" },
      { "id" : "Index_Screw",   "parent" : "Gun_Carrying_Handle Group", "text" : "Index_Screw" },
      { "id" : "Ball_Bearing",  "parent" : "Gun_Carrying_Handle Group", "text" : "Ball_Bearing" },
      { "id" : "Pin_Spring",    "parent" : "Gun_Carrying_Handle Group", "text" : "Pin_Spring" },
      { "id" : "Spring",    "parent" : "Gun_Carrying_Handle Group", "text" : "Spring" },
      { "id" : "Ball_Bearing2",   "parent" : "Gun_Carrying_Handle Group", "text" : "Ball_Bearing2" },
      { "id" : "Round_Nut1",    "parent" : "Gun_Carrying_Handle Group", "text" : "Round_Nut1" },
      { "id" : "Washer1",     "parent" : "Gun_Carrying_Handle Group", "text" : "Washer1" },
      { "id" : "Washer",    "parent" : "Gun_Carrying_Handle Group", "text" : "Washer" },
      { "id" : "Clamping_Bar",  "parent" : "Gun_Carrying_Handle Group", "text" : "Clamping_Bar" },
      { "id" : "Round_Nut",     "parent" : "Gun_Carrying_Handle Group", "text" : "Round_Nut" }
    ],
    'check_callback': true
  },
  "plugins" : [ "state", "contextmenu" ],
  contextmenu : {
    items : {
      "Link" : {
        "label" : "Link",
        "action" : function (obj) { addLink(); }
      },
      "Unlink" : {
        "label" : "Unlink",
        "action" : function (obj) { removeLink(); }
      },
      "Info" : {
        "label" : "Info",
        "action" : function (obj) { getInfo(); }
      },
      "ccp" : false,
      "create" : false,
      "rename" : false,
      "remove" : false
    }
  }
});

$('#modelHierarchy').on('changed.jstree', function(e, data2) {
  var i, j, r = [ ];

  for (i = 0, j = data2.selected.length; i < j; i++) {
    r.push(data2.instance.get_node(data2.selected[ i ]).text);
  }

  console.log('Selected: ' + r.join(', '));
  currentNode = r.join(', ');
  selectedNodes = r;
});

$('#taxonomy').on('changed.jstree', function(e, data2) {
  var i, j, r = [ ];
  selectedClasses = [ ]; //Reset the selected classes

  for (i = 0, j = data2.selected.length; i < j; i++) {
    r.push(data2.instance.get_node(data2.selected[ i ]).text);
    selectedClasses.push(data2.instance.get_node(data2.selected[ i ]).text);
  }

  console.log('Selected: ' + r.join(', '));
  // selectedClasses = r;
  console.log("on Selection():" + JSON.stringify(selectedClasses));
  currentClass = r.join(', ');

  if (data2.selected.length == 1) {
    //  console.log("Only one item selected!");        //One item selected so expand subclasses
    //  addSubclassesToTree();   //Expand Subclasses
    var leafNode = $('#taxonomy').jstree('is_leaf', data2.selected[ 0 ]);
    floraClass = data2.selected[ 0 ];
    console.log("Is Leaf: " + leafNode);

    if (leafNode == true) {
      getSubClasses(r.join(', '));
    }
  }
});

// Load an initial KB file
loadFile("m4.flr");

//--------------Load Table-----------------------------
loadLinkTable();
loadClassTable();

$('table').on('click', 'input[type="button"]', function(e) { $(this).closest('tr').remove() });
