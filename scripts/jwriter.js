var util = require('util'),
    dae = '\
<library_geometries>\
    <geometry id="Cube-mesh">\
        <mesh>\
        <source id="Cube-mesh-positions">\
          <float_array id="Cube-mesh-positions-array" count="24">1 1 -1 1 -1 -1 -1 -0.9999998 -1 -0.9999997 1 -1 1 0.9999995 1 0.9999994 -1.000001 1 -1 -0.9999997 1 -1 1 1</float_array>\
          <technique_common>\
            <accessor source="#Cube-mesh-positions-array" count="8" stride="3">\
              <param name="X" type="float"/>\
              <param name="Y" type="float"/>\
              <param name="Z" type="float"/>\
            </accessor>\
          </technique_common>\
        </source>\
        <source id="Cube-mesh-normals">\
          <float_array id="Cube-mesh-normals-array" count="18">0 0 -1 0 0 1 1 -2.83122e-7 0 -2.83122e-7 -1 0 -1 2.23517e-7 -1.3411e-7 2.38419e-7 1 2.08616e-7</float_array>\
          <technique_common>\
            <accessor source="#Cube-mesh-normals-array" count="6" stride="3">\
              <param name="X" type="float"/>\
              <param name="Y" type="float"/>\
              <param name="Z" type="float"/>\
            </accessor>\
          </technique_common>\
        </source>\
        <vertices id="Cube-mesh-vertices">\
          <input semantic="POSITION" source="#Cube-mesh-positions"/>\
        </vertices>\
        <polylist material="Material1" count="6">\
          <input semantic="VERTEX" source="#Cube-mesh-vertices" offset="0"/>\
          <input semantic="NORMAL" source="#Cube-mesh-normals" offset="1"/>\
          <vcount>4 4 4 4 4 4 </vcount>\
          <p>0 0 1 0 2 0 3 0 4 1 7 1 6 1 5 1 0 2 4 2 5 2 1 2 1 3 5 3 6 3 2 3 2 4 6 4 7 4 3 4 4 5 0 5 3 5 7 5</p>\
        </polylist>\
        </mesh>\
    </geometry>\
</library_geometries>';

var sys = require('util');
// var XMLHttpRequest = require('w3c-xmlhttprequest').XMLHttpRequest;
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// var client = new XMLHttpRequest();

// client.open('GET', 'file://boxtest_opencollada.DAE');
// client.responseType = 'text';
// client.addEventListener('load', function(event) {
//   console.log('HTTP Request OSHIMAI.');

//   var client = event.target;
//   var response = client.response;
//   console.log('==== %s ====', this.name);
//   console.log('%s %s', client.status, client.statusText);
//   console.log(client.getAllResponseHeaders());
//   console.log(response.split('\n').slice(0, 3).join('\n'));
//   console.log('...');


//   sys.puts();
// }, false);
// client.send();


function load(url, readyCallback, progressCallback) {
  var length = 0;
  var request = new XMLHttpRequest();

  request.onreadystatechange = function() {
    sys.puts("State: " + this.readyState);

    if( request.readyState == 4 ) {
      sys.puts("Complete.\nBody length: " + this.responseText.length);
      // sys.puts("Body:\n" + this.responseText);

      if( request.status == 0 || request.status == 200 ) {

        // sys.puts("Body:\n" + this.responseText);

        if ( request.responseXML ) {
          console.log('XML:\n' + request.responseText);
        } else if ( request.responseText ) {
          console.log('TEXT:\n' + request.responseText);
        } else {
          console.error( "Collada: Empty or non-existing file (" + url + ")" );
        }
      }
    } else if ( request.readyState == 3 ) {
      if ( progressCallback ) {
        if ( length == 0 ) {
          length = request.getResponseHeader( "Content-Length" );
        }

        progressCallback( { total: length, loaded: request.responseText.length } );
      }
    }
  }

  request.open("GET", url);
  request.send();
}

load('file:///Users/johnpywtorak/boxtest_opencollada.DAE');
