// Copyright 2015, SRI International

//--------------Initialization-------------------------
// Global variables

var currentNode;
var linkCount = 0;      //Link count used in the Semantic Links table
var tableBody;    //Global var for Semantic Link table body
var table;
var classTable;     //Global var for Class details table
var classTableBody; //Global var fro class details table body

var currentClass; //global var for currently selected class
var floraClass;
var linkCollection = [ ];
var s3dfile = "";   //global var for storing the .s3d file content

//--------------Flora/XSB Loading----------------------
//--------------Utility functions----------------------
function addClassDetailsToTable(tax) {
  if (classTable.rows.length > 1) classTable.deleteRow(1);

  var tableRow = document.createElement('TR'),
      cell = document.createElement('TD'),
      val = document.createTextNode(tax.id);

  cell.appendChild(val);
  tableRow.appendChild(cell);

  var superClasses = tax.superclasses,
      classes = "";

  for (index = 0; index < superClasses.length; index++) classes += superClasses[ index ] + ", ";

  if (classes == "") classes = "None";

  cell = document.createElement('TD');
  val = document.createTextNode(classes);
  cell.appendChild(val);
  tableRow.appendChild(cell);

  var types = tax.types,
      typeList="";

  for (index = 0; index < types.length; index++) typeList += types[ index ] + ", ";

  if (typeList == "") typeList = "None";

  cell = document.createElement('TD');
  val = document.createTextNode(typeList);
  cell.appendChild(val);
  tableRow.appendChild(cell);

  var properties = tax.individualproperties,
      propertyList="";

  for (index = 0; index < properties.length; index++) propertyList += properties[ index ] + ", ";

  if (propertyList == "") propertyList = "None";

  cell = document.createElement('TD');
  val = document.createTextNode(propertyList);
  cell.appendChild(val);
  tableRow.appendChild(cell);
  classTableBody.appendChild(tableRow);
}

function createLinkTable() {
  var tableDiv = document.getElementById('tableContainer');
  
  table = document.createElement('TABLE');
  table.border = '1';
  tableBody = document.createElement('TBODY');
  table.appendChild(tableBody);
  
  var headerRow = document.createElement('TR');
  
  tableBody.appendChild(headerRow);
  
  var header1 = document.createElement('TH'),
      temp1 = document.createTextNode("Count");
  
  header1.appendChild(temp1);
  headerRow.appendChild(header1);
  
  var header2 = document.createElement('TH'),
      temp2 = document.createTextNode("Flora Class");
  
  header2.appendChild(temp2);
  headerRow.appendChild(header2);
  
  var header3 = document.createElement('TH');
  
  headerRow.appendChild(header3);
  
  var header4 = document.createElement('TH'),
      temp4 = document.createTextNode("3D Node");
  
  header4.appendChild(temp4);
  headerRow.appendChild(header4);
  
  var header5 = document.createElement('TH');
  
  headerRow.appendChild(header5);
  tableDiv.appendChild(table);
}

function createClassTable() {
  var tableDiv = document.getElementById('classContainer');

  classTable = document.createElement('TABLE');
  classTable.border='1';
  classTableBody = document.createElement('TBODY');
  classTable.appendChild(classTableBody);

  var headerRow = document.createElement('TR');

  classTableBody.appendChild(headerRow);

  var header1 = document.createElement('TH'),
      temp1 = document.createTextNode("Class ID");

  header1.appendChild(temp1);
  headerRow.appendChild(header1);
  
  var header2 = document.createElement('TH'),
      temp2 = document.createTextNode("Super Classes");
  
  header2.appendChild(temp2);
  headerRow.appendChild(header2);
  
  var header4 = document.createElement('TH'),
      temp4 = document.createTextNode("Types");

  header4.appendChild(temp4);
  headerRow.appendChild(header4);

  var header5 = document.createElement('TH'),
      temp5 = document.createTextNode("Individual Properties");

  header5.appendChild(temp5);
  headerRow.appendChild(header5);
  tableDiv.appendChild(classTable);
}

//--------------UI Control Logic-----------------------
function createTableRow(currentClass, currentNode) {
  var tableRow = document.createElement('TR'),
      countCell = document.createElement('TD');

  linkCount++;

  var countVal = document.createTextNode(linkCount);
  
  countCell.appendChild(countVal);
  tableRow.appendChild(countCell);
  
  var classCell = document.createElement('TD'),
      classVal = document.createTextNode(currentClass);
  
  classCell.appendChild(classVal);
  tableRow.appendChild(classCell);

  var sepCell = document.createElement('TD'),
      sepVal = document.createTextNode(":");

  sepCell.appendChild(sepVal);
  tableRow.appendChild(sepCell);

  var nodeCell = document.createElement('TD'),
      nodeVal = document.createTextNode(currentNode);

  nodeCell.appendChild(nodeVal);
  tableRow.appendChild(nodeCell);

  var delCell = document.createElement('TD'),
      delButton = document.createElement("Input");

  delButton.setAttribute("value", "Delete");
  delButton.setAttribute("type", "button");
  // delButton.setAttribute("onclick", "deleteLink()"); // console.log("Delete button pressed!");
  delCell.appendChild(delButton);
  tableRow.appendChild(delCell);
  return tableRow;
}

function createAndAddLink() {
  var link = { floraClass: currentClass, modelNode: currentNode };

  linkCollection.push(link);
  tableBody.appendChild(createTableRow(currentClass, currentNode));

  var asset = window.__sjs.semantic_mapping.asset;

  asset.objs.push({
    name: currentNode,
    node: currentNode,
    sid: asset.sid,
    flora_ref: currentClass
  });
}

function addLink() {
  var selectedItems = [ ];

  if ($.jstree.reference('#taxonomy') === null) {
    alert("Error! No taxonomy is loaded.");
    return;
  }

  if ($.jstree.reference('#assetHierarchy') === null) {
    alert("Error! No 3D model in hierarchy.");
    return;
  }

  var selectedClasses = $('#taxonomy').jstree('get_selected'),
      selectedNodes = $('#assetHierarchy').jstree('get_selected');

  if (selectedClasses.length == 0) {
    alert("Error! You need to select a class in the Flora taxonomy.");
    return;
  }
  if (selectedNodes.length == 0) {
    alert("Error! You need to select a node in the 3D model hierarchy.");
    return;
  }

  createAndAddLink();
}

function removeLink() {
  var selectedItems = [ ];

  if ($.jstree.reference('#taxonomy') === null) {
    alert("Error! No taxonomy is loaded.");
    return;
  }

  if ($.jstree.reference('#assetHierarchy') === null) {
    alert("Error! No 3D model in hierarchy.");
    return;
  }

  var selectedClasses = $('#taxonomy').jstree('get_selected'),
      selectedNodes = $('#assetHierarchy').jstree('get_selected');

  if (selectedClasses.length == 0) {
    alert("Error! You need to select a class in the Flora taxonomy.");
    return;
  }
  if (selectedNodes.length == 0) {
    alert("Error! You need to select a node in the 3D model hierarchy.");
    return;
  }

  var found = false;

  for (var i = 0, l = linkCollection.length; i < l; i++) {
    console.log("Scanning: Flora Class - " + linkCollection[ i ].floraClass + " Model Node - " + linkCollection[ i ].modelNode );

    if ((currentClass == linkCollection[ i ].floraClass) && (currentNode == linkCollection[ i ].modelNode)) {
      console.log("Found link to remove at index: " + i);
      linkCollection.splice(i, 1);
      table.deleteRow(i + 1);
    }
  }
}

function addSemLinks() {
  for (var i = 0, l = linkCollection.length; i < l; i++) {
    var node = linkCollection[ i ].modelNode;
    var floraClass = linkCollection[ i ].floraClass;
    // var semanticLink = createSemanticLink(node, node, "M4_ont", floraClass); // <object name=...
    s3dFile += semanticLink;
  }
}

function addSemanticMapping() {
  // TODO: Use grouping2js s2xml via s3d.src.js
  // addNodeGroups(); // <group name ...
  // addSemLinks();
}

function buildS3DFile() {
  s3dFile = "";
  // TODO: Use grouping2js s2xml via s3d.src.js
  // addHead(); // <S3D><head>...
  // addFloraBase(); // <flora_base ...
  // addSemanticMapping();
  // TODO: Use grouping2js go2xml via s3d.src.js
  // addGrouping();
  // addEnd(); // </S3D>
}

function saveData() {
  buildS3DFile();
  console.log("Writing S3D file to SAVE repository!");

  // TODO: Move this to s3d.src.js and allow the name and path to be entered
  // jQuery.ajax({
  //     url:'http://' + hostName + ':3001/s3d/M4_Carbine.s3d',
  //     type:'put',
  //     data: s3dFile,
  //     cache: false,
  //     processData: false,
  //     crossDomain: true,
  //     xhrFields: { withCredentials: true } // prompt
  // })
  // .done(function(data) { console.log("Result from PUT operation: " + data)  });
}


//--------------Load Table-----------------------------
createLinkTable();
createClassTable();

$('table').on('click', 'input[type="button"]', function(jqe) { $(this).closest('tr').remove() });
