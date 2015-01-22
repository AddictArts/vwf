
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

// Takes a flora term string and returns an HTML DOM representation of it
// with buttons for selecting and expanding the identifier
function createListItem(floraTerm) {
  var item = document.createElement("li");

  item.appendChild(document.createTextNode(floraTerm));
  return item;
}

//--------------Server call (controller) functions------

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
  //selectedNodes = $('#assetHierarchy').jstree('get_selected');
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
  selectedNodes = $('#assetHierarchy').jstree('get_selected');
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
  selectedNodes = $('#assetHierarchy').jstree('get_selected');
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
      url:'http://' + hostName + ':3001/s3d/M4_Carbine.s3d',
      type:'put',
      data: s3dFile,
      cache: false,
      processData: false,
      crossDomain: true,
      xhrFields: { withCredentials: true } // prompt
  })
  .done(function(data) { console.log("Result from PUT operation: " + data)  });
}

$('#assetHierarchy').on('changed.jstree', function(e, data2) {
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

//--------------Load Table-----------------------------
loadLinkTable();
loadClassTable();

$('table').on('click', 'input[type="button"]', function(e) { $(this).closest('tr').remove() });
