var fs = require('fs');
var html = fs.readFileSync(__dirname + '/robot.html', 'utf8');

console.log(html);

var basePath = '/../public/SAVE/template'; //XXX does not work .. I guess!
var ihtml = fs.readFileSync(__dirname + '/templates/index.vwf.html', 'utf8');

if (ihtml.toString().indexOf('"') != -1) console.error('Quote found in template index.vwf.html, change to single quote');

