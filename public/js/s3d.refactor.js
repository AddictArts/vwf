// Copyright 2015, SRI International

//--------------Initialization-------------------------
// Global variables

var currentNode;
var tableBody; // global var for Semantic Link table body
var table;
var classTable; // global var for Class details table
var classTableBody; // global var fro class details table body
var currentClass; // global var for currently selected class
var floraClass;
var linkCollection = [ ];

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
  classTable.border = '1';
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
function createTableRow(currentClass, currentNode, count) {
  var tableRow = document.createElement('TR'),
      countCell = document.createElement('TD'),
      countVal = document.createTextNode(count);
  
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
  tableBody.appendChild(createTableRow(currentClass, currentNode, linkCollection.length));

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

  if ($.jstree.reference('#hierarchy') === null) {
    alert("Error! No 3D model in hierarchy.");
    return;
  }

  var selectedClasses = $('#taxonomy').jstree('get_selected'),
      selectedNodes = $('#hierarchy').jstree('get_selected');

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

function removeLinkByClassAndNode(fclass, node, deleteRow) {
  var objs = window.__sjs.semantic_mapping.asset.objs,
      deleteRow = deleteRow || false,
      removed = false;

  for (var i = 0, l = linkCollection.length; i < l; i++) {
    if (linkCollection[ i ]) {
      if (fclass == linkCollection[ i ].floraClass && node == linkCollection[ i ].modelNode) {
        linkCollection.splice(i, 1);
        removed = true;

        if (deleteRow) table.deleteRow(i + 1);
      }
    }

    if (objs[ i ]) {
      if (objs[ i ].flora_ref == fclass && objs[ i ].node == node) {
        console.info("Removing semantic mapping object " + objs[ i ] + " at index: " + i);
        objs.splice(i, 1);
      }
    }
  }

  return removed;
}

function removeLink() {
  if ($.jstree.reference('#taxonomy') === null) {
    alert("Error! No taxonomy is loaded.");
    return;
  }

  if ($.jstree.reference('#hierarchy') === null) {
    alert("Error! No 3D model in hierarchy.");
    return;
  }

  var selectedClasses = $('#taxonomy').jstree('get_selected'),
      selectedNodes = $('#hierarchy').jstree('get_selected');

  if (selectedClasses.length == 0) {
    alert("Error! You need to select a class in the Flora taxonomy.");
    return;
  }
  if (selectedNodes.length == 0) {
    alert("Error! You need to select a node in the 3D model hierarchy.");
    return;
  }

  if (!removeLinkByClassAndNode(currentClass, currentNode, true)) alert('No rows were removed, mapping is not available.');
}

//--------------Create Tables-----------------------------
createLinkTable();
createClassTable();
