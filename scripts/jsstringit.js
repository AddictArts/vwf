#!/usr/bin/env node
// Copyright 2014, SRI International

'use strict';

var path = require('path'),
    util = require('util'),
    puts = util.puts,
    fs = require('fs'),
    templates = '../public/SAVE/template';

function createPublishedFiles(basePath) {
    var ihtml, // index.vwf.html
        iyaml, // index.vwf.yaml
        byaml; // M4_Carbine_dae.eui.yaml

    puts('// Copyright 2014, SRI International');
    puts('// jsstringit Creating index_vwf_html, index_vwf_yaml, and M4_Carbine_dae_eui_yaml from ' + basePath);

    try {
        ihtml = fs.readFileSync(basePath + '/index.vwf.html');
        iyaml = fs.readFileSync(basePath + '/index.vwf.yaml');
        byaml = fs.readFileSync(basePath + '/M4_Carbine_dae.eui.yaml');
    } catch (e) { console.log(e); }

    puts('// Copyright 2014, SRI International\n//1\n');
    puts('var index_vwf_html = "\\' + ihtml.toString().split('\n').join('\\n\\\n') + '";');
    puts('\n//2\n');
    puts('var index_vwf_yaml = "\\' + iyaml.toString().split('\n').join('\\n\\\n') + '";');
    puts('\n//3\n');
    puts('var M4_Carbine_dae_eui_yaml = "\\' + byaml.toString().split('\n').join('\\n\\\n') + '";');
}

if (process.argv.length > 2) {
    var ndx = 2;

    // Check for any flag
    if (process.argv[ ndx ] && process.argv[ ndx ].charAt(0) == '-') {

        var flag = process.argv[ ndx++ ];

        switch (flag) {
        case '-h':
        default:
            console.log('Usage: ' + process.argv[ 0 ] + ' ' + path.basename(process.argv[ 1 ]) + ' basePath');
            var s = "1\n2\n\n3",
                ns = s.split('\n').join('\\n\\\n');
            puts('From:\n' + s); // =>
            // 1
            // 2

            // 3
            puts('To:\n' + ns); // =>
            // 1\n\
            // 2\n\
            // \n\
            // 3\n\
            process.exit(0);
        }
    }

    if (process.argv[ ndx ]) createPublishedFiles(process.argv[ ndx ]);
} else {
    createPublishedFiles(templates); // default
}
