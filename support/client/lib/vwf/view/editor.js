"use strict";

// Copyright 2012 United States Government, as represented by the Secretary of Defense, Under
// Secretary of Defense (Personnel & Readiness).
// 
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
// 
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied. See the License for the specific language governing permissions and limitations under
// the License.

/// vwf/view/editor creates a view interface for editor functions. 
/// 
/// @module vwf/view/editor
/// @requires version
/// @requires vwf/view
/// @requires vwf/utility

define( [ "module", "version", "vwf/view", "vwf/utility" ], function( module, version, view, utility ) {

    return view.load( module, {

        // == Module Definition ====================================================================

        initialize: function() {
            var self = this;

            this.nodes = {};
            this.scenes = {};
            this.allScripts = {};

            // EDITOR CLOSED  --> 0
            // HIERARCHY OPEN --> 1
            // USER LIST OPEN --> 2
            // TIMELINE OPEN  --> 3
            // ABOUT OPEN     --> 4
            this.editorView = 0;
            this.editorOpen = false;
            this.timelineInit = false;
            this.aboutInit = false;
            this.modelsInit = false;
            this.editingScript = false;

            this.topdownName = '#topdown_a';
            this.topdownTemp = '#topdown_b';
            this.clientList = '#client_list';
            this.timeline = '#time_control';
            this.about = '#about_tab';
            this.models = '#model_a';
            this.modelsTemp = '#model_b';
            this.currentNodeID = '';
            this.currentModelID = '';
            this.currentModelURL = '';
            this.highlightedChild = '';
            
            jQuery('body').append(
                "<div id='editor' class='relClass'><div class='uiContainer'><div class='editor-tabs' id='tabs'><img id='x' style='display:none' src='images/tab_X.png' alt='x' /><img id='hierarchy' src='images/tab_Application.png' alt='application' /><img id='userlist' src='images/tab_Users.png' alt='users' /><img id='timeline' src='images/tab_Time.png' alt='time' /><img id='models' src='images/tab_Models.png' alt='models' /><img id='about' src='images/tab_About.png' alt='about' /></div></div></div>" + 
                "<div class='relClass'><div class='uiContainer'><div class='vwf-tree' id='topdown_a'></div></div></div>" + 
                "<div class='relClass'><div class='uiContainer'><div class='vwf-tree' id='topdown_b'></div></div></div>" + 
                "<div class='relClass'><div class='uiContainer'><div class='vwf-tree' id='client_list'></div></div></div>" +
                "<div class='relClass'><div class='uiContainer'><div class='vwf-tree' id='time_control'></div></div></div>" +
                "<div class='relClass'><div class='uiContainer'><div class='vwf-tree' id='about_tab'></div></div></div>" +
                "<div class='relClass'><div class='uiContainer'><div class='vwf-tree' id='model_a'></div></div></div>" +
                "<div class='relClass'><div class='uiContainer'><div class='vwf-tree' id='model_b'></div></div></div>"
            );
            
            $('#tabs').stop().animate({ opacity:0.0 }, 0);
            
            jQuery('#tabs').mouseenter( function(evt) { 
                evt.stopPropagation();
                $('#tabs').stop().animate({ opacity:1.0 }, 175);
                return false; 
            });
            
            jQuery('#tabs').mouseleave( function(evt) { 
                evt.stopPropagation(); 
                $('#tabs').stop().animate({ opacity:0.0 }, 175);
                return false; 
            });
            
            jQuery('#hierarchy').click ( function(evt) {
                openEditor.call(self, 1);
            });

            jQuery('#userlist').click ( function(evt) {
                openEditor.call(self, 2);
            });

            jQuery('#timeline').click ( function(evt) {
                openEditor.call(self, 3);
            });

            jQuery('#about').click ( function(evt) {
                openEditor.call(self, 4);
            });

            jQuery('#models').click ( function(evt) {
                openEditor.call(self, 5);
            });

            jQuery('#x').click ( function(evt) {
                closeEditor.call(self);
            });

            $('#topdown_a').hide();
            $('#topdown_b').hide();
            $('#client_list').hide();
            $('#time_control').hide();
            $('#about_tab').hide();
            $('#model_a').hide();
            $('#model_b').hide();
            
            var canvas = document.getElementById(vwf_view.kernel.find("", "/")[0]);
            if ( canvas ) {
                $('#topdown_a').height(canvas.height);
                $('#topdown_b').height(canvas.height);
                $('#client_list').height(canvas.height);
                $('#time_control').height(canvas.height);
                $('#about_tab').height(canvas.height);
                $('#model_a').height(canvas.height);
                $('#model_b').height(canvas.height);
            }
            else
            {    
                $('#topdown_a').height(window.innerHeight-20);
                $('#topdown_b').height(window.innerHeight-20);
                $('#client_list').height(window.innerHeight-20);
                $('#time_control').height(window.innerHeight-20);
                $('#about_tab').height(window.innerHeight-20);
                $('#model_a').height(window.innerHeight-20);
                $('#model_b').height(window.innerHeight-20);
            }
        },
        
        createdNode: function( nodeID, childID, childExtendsID, childImplementsIDs,
            childSource, childType, childIndex, childName, callback /* ( ready ) */ ) {

            var nodeIDAttribute = $.encoder.encodeForHTMLAttribute("id", nodeID, true);
            var childIDAttribute = $.encoder.encodeForHTMLAttribute("id", childID, true);
            var childIDAlpha = $.encoder.encodeForAlphaNumeric(childID);
            
            var kernel = this.kernel;
            var self = this;
            var parent = this.nodes[ nodeID ];
            var node = this.nodes[ childID ] = {
                children: [],
                properties: [],
                events: {},
                methods: {},
                parent: parent,
                parentID: nodeID,
                ID: childID,
                extendsID: childExtendsID,
                implementsIDs: childImplementsIDs,
                source: childSource, 
                name: childName,
            };

            if ( parent ) {
                parent.children.push( node );
            }

            if ( childID == vwf_view.kernel.find("", "/")[0] && childExtendsID && this.kernel.test( childExtendsID,
                    "self::element(*,'http://vwf.example.com/scene.vwf')", childExtendsID ) ) {
                this.scenes[ childID ] = node;
            }
            
            if ( nodeID === this.currentNodeID && this.editingScript == false )
            {
                $('#children > div:last').css('border-bottom-width', '1px');
                $("#children").append("<div id='" + childIDAlpha + "' data-nodeID='" + childIDAttribute + "' class='childContainer'><div class='childEntry'><b>" + $.encoder.encodeForHTML(childName) + "</b></div></div>");
                $('#' + childIDAlpha).click( function(evt) {
                    drillDown.call(self, $(this).attr("data-nodeID"), nodeIDAttribute);
                });
                $('#children > div:last').css('border-bottom-width', '3px');
            }
        },
        
        createdProperty: function (nodeID, propertyName, propertyValue) {

            return this.initializedProperty(nodeID, propertyName, propertyValue);   
        },
        
        initializedProperty: function (nodeID, propertyName, propertyValue) {
   
            var node = this.nodes[ nodeID ];
            if ( ! node ) return;  // TODO: patch until full-graph sync is working; drivers should be able to assume that nodeIDs refer to valid objects

            var property = node.properties[ propertyName ] = {
                name: propertyName,
                value: propertyValue,
            };

            try {
                propertyValue = utility.transform( propertyValue, utility.transforms.transit );
                node.properties[ propertyName ].value = JSON.stringify( propertyValue );
            } catch (e) {
                this.logger.warnx( "createdProperty", nodeID, propertyName, propertyValue,
                    "stringify error:", e.message );
                node.properties[ propertyName ].value = propertyValue;
            }
            
            node.properties.push( property );
        },
        
        deletedNode: function (nodeID) {
            var node = this.nodes[ nodeID ];
            node.parent.children.splice( node );
            var nodeIDAttribute = $.encoder.encodeForAlphaNumeric(nodeID); // $.encoder.encodeForHTMLAttribute("id", nodeID, true);
            $('#' + nodeIDAttribute).remove();
            $('#children > div:last').css('border-bottom-width', '3px');
        },

        //addedChild: [ /* nodeID, childID, childName */ ],
        //removedChild: [ /* nodeID, childID */ ],

        satProperty: function (nodeID, propertyName, propertyValue) {
            var node = this.nodes[ nodeID ];
            if ( ! node ) return;  // TODO: patch until full-graph sync is working; drivers should be able to assume that nodeIDs refer to valid objects
            try {
                propertyValue = utility.transform( propertyValue, utility.transforms.transit );
                node.properties[ propertyName ].value = JSON.stringify( propertyValue );
            } catch (e) {
                this.logger.warnx( "satProperty", nodeID, propertyName, propertyValue,
                    "stringify error:", e.message );
                node.properties[ propertyName ].value = propertyValue;
            }

            var nodeIDAttribute = $.encoder.encodeForAlphaNumeric(nodeID); // $.encoder.encodeForHTMLAttribute("id", nodeID, true);
            var propertyNameAttribute = $.encoder.encodeForHTMLAttribute("id", propertyName, true);
            
            // No need to escape propertyValue, because .val does its own escaping
            $('#input-' + nodeIDAttribute + '-' + propertyNameAttribute).val(node.properties[ propertyName ].value);
        },
        
        //gotProperty: [ /* nodeID, propertyName, propertyValue */ ],
        
        createdMethod: function( nodeID, methodName, methodParameters, methodBody ){
            var node = this.nodes[ nodeID ];
            if ( node ) {
                node.methods[ methodName ] = methodParameters;
            }
        },

        //calledMethod: function( nodeID, methodName, methodParameters, methodValue ) {

        //},

        createdEvent: function( nodeID, eventName, eventParameters ) {
            var node = this.nodes[ nodeID ];
            if ( node ) {
                node.events[ eventName ] = eventParameters;
            }         
        },

        firedEvent: function ( nodeID, eventName, eventParameters ) {
            if(eventName == "pointerHover") {
                highlightChildInHierarchy.call(this, nodeID);
            }
        },

        executed: function( nodeID, scriptText, scriptType ) {

            var nodeScript = {
                text: scriptText,
                type: scriptType,
            };

            if ( !this.allScripts[ nodeID ] ) {
                var nodeScripts = new Array();
                nodeScripts.push(nodeScript);

                this.allScripts[ nodeID ] = nodeScripts;
            }

            else {
                this.allScripts[ nodeID ].push(nodeScript);
            }
        },

        //ticked: [ /* time */ ],
        
    } );

    // -- getPropertyValues -----------------------------------------------------------------

    function getPropertyValues( node ) {
        var pv = {};
        if ( node ) {
            for ( var i = 0; i < node.properties.length; i++ ) {
                pv[ node.properties[i] ] = vwf.getProperty( node.ID, node.properties[i], [] );
            }
        }
        return pv;
    };
    
    // -- getChildByName --------------------------------------------------------------------
    
    function getChildByName( node, childName ) {
        var childNode = undefined;
        for ( var i = 0; i < node.children.length && childNode === undefined; i++ ) {
            if ( node.children[i].name == childName ) {
                childNode = node.children[i];    
            }
        }
        return childNode;
    };
    
    var intervalTimer;
    function updateCameraProperties () {

        var cameraNodeName = "http-vwf-example-com-camera-vwf-camera";
        
        if ( this.currentNodeID == cameraNodeName ) {
            if ( !intervalTimer ) {
                var self = this;
                intervalTimer = setInterval( function() {updateProperties.call( self, cameraNodeName )}, 200 );
            }
        }
        else {
            if ( intervalTimer ) {
                clearInterval( intervalTimer );
                intervalTimer = 0;
            } 
        }
    }

    function updateProperties( nodeName ) {
        var nodeID = nodeName;
        var properties = getProperties.call( this, this.kernel, nodeID );

        for ( var i in properties ) { 
            try {
                var propertyName = properties[i].prop.name;
                var propertyValue = JSON.stringify( utility.transform( vwf.getProperty( nodeID, propertyName, [] ), utility.transforms.transit ));
            } catch ( e ) {
                this.logger.warnx( "satProperty", nodeID, propertyName, propertyValue, "stringify error:", e.message );
            }

            if ( propertyValue ) {
                var nodeIDAttribute = $.encoder.encodeForAlphaNumeric( nodeID ); 
                var propertyNameAttribute = $.encoder.encodeForHTMLAttribute( "id", propertyName, true );
                $( '#input-' + nodeIDAttribute + '-' + propertyNameAttribute ).val( propertyValue );       
            }
        }
    }
    
    // -- openEditor ------------------------------------------------------------------------

    function openEditor(eView) // invoke with the view as "this"
    {
        if(eView == 0)
        {
            closeEditor.call(this);
        }
        
        if(this.editorView != eView)
        {
            // Hierarchy
            if(eView == 1)
            {
                var topdownName = this.topdownName;
                var topdownTemp = this.topdownTemp;

                if( !this.currentNodeID )
                {
                    this.currentNodeID = vwf_view.kernel.find("", "/")[0];
                }

                drill.call(this, this.currentNodeID, undefined);
                $(this.clientList).hide();
                $(this.timeline).hide();
                $(this.about).hide();
                $(this.models).hide();

                if(this.editorOpen)
                {
                    $(topdownName).hide();
                    $(topdownTemp).show();
                }

                else
                {
                    $(topdownTemp).show('slide', {direction: 'right'}, 175);    
                }

                this.topdownName = topdownTemp;
                this.topdownTemp = topdownName;
            }

            else if (this.editingScript)
            {
                // Reset width if on script
                this.editingScript = false;
                $('#editor').animate({ 'left' : "-260px" }, 175);
                $('.vwf-tree').animate({ 'width' : "260px" }, 175);
            }

            // User List
            if(eView == 2)
            {
                $(this.topdownName).hide();
                $(this.topdownTemp).hide();
                $(this.timeline).hide();
                $(this.about).hide();
                $(this.models).hide();
                $(this.modelsTemp).hide();
                showUserList.call(this);
            }

            // Timeline
            else if(eView == 3)
            {
                $(this.topdownName).hide();
                $(this.topdownTemp).hide();
                $(this.clientList).hide();
                $(this.about).hide();
                $(this.models).hide();
                $(this.modelsTemp).hide();
                showTimeline.call(this);
            }

            // About
            else if(eView == 4)
            {
                $(this.topdownName).hide();
                $(this.topdownTemp).hide();
                $(this.clientList).hide();
                $(this.timeline).hide();
                $(this.models).hide();
                $(this.modelsTemp).hide();
                showAboutTab.call(this);
            }

            // Models
            else if(eView == 5)
            {
                var models = this.models;
                var modelsTemp = this.modelsTemp;

                showModelsTab.call(this, this.currentModelID, this.currentModelURL);
                $(this.topdownName).hide();
                $(this.topdownTemp).hide();
                $(this.clientList).hide();
                $(this.timeline).hide();
                $(this.about).hide();

                if(this.editorOpen)
                {
                    $(models).hide();
                    $(modelsTemp).show();
                }

                else
                {                
                    $(modelsTemp).show('slide', {direction: 'right'}, 175);    
                }

                this.models = modelsTemp;
                this.modelsTemp = models;
            }


            if(this.editorView == 0)
            {
                $('#vwf-root').animate({ 'left' : "-=260px" }, 175);
                $('#editor').animate({ 'left' : "-260px" }, 175);
                $('#x').delay(1000).css({ 'display' : 'inline' });
            }

            this.editorView = eView;
            this.editorOpen = true;
        }
    }

    // -- closeEditor -----------------------------------------------------------------------

    function closeEditor() // invoke with the view as "this"
    {
        var topdownName = this.topdownName;

        if (this.editorOpen && this.editorView == 1) // Hierarchy view open
        {
            $(topdownName).hide('slide', {direction: 'right'}, 175);
            $(this.clientList).hide();
            $(this.timeline).hide();
            $(this.about).hide();
            $(this.models).hide();
        }

        else if (this.editorOpen && this.editorView == 2) // Client list open
        {
            $(this.clientList).hide('slide', {direction: 'right'}, 175);
            $(topdownName).hide();
            $(this.timeline).hide();
            $(this.about).hide();
            $(this.models).hide();
        }

        else if (this.editorOpen && this.editorView == 3) // Timeline open
        {
            $(this.timeline).hide('slide', {direction: 'right'}, 175);
            $(topdownName).hide();
            $(this.clientList).hide();
            $(this.about).hide();
            $(this.models).hide();
        }

        else if (this.editorOpen && this.editorView == 4) // About open
        {
            $(this.about).hide('slide', {direction: 'right'}, 175);
            $(topdownName).hide();
            $(this.clientList).hide();
            $(this.timeline).hide();
            $(this.models).hide();
        }

        else if (this.editorOpen && this.editorView == 5) // Models open
        {
            $(this.models).hide('slide', {direction: 'right'}, 175);
            $(topdownName).hide();
            $(this.clientList).hide();
            $(this.timeline).hide();
            $(this.about).hide();
        }
        
        $('#vwf-root').animate({ 'left' : "+=260px" }, 175);
        $('#editor').animate({ 'left' : "0px" }, 175);
        $('#x').css({ 'display' : 'none' });
        this.editorView = 0;
        this.editorOpen = false;
    }

    // -- showUserList ----------------------------------------------------------------------

    function showUserList() // invoke with the view as "this"
    {
        var clientList = this.clientList;

        viewClients.call(this);

        if (!this.editorOpen)
        {
            $(clientList).show('slide', {direction: 'right'}, 175);    
        }
        else
        {
            $(clientList).show();
        }
    }

    // -- viewClients -----------------------------------------------------------------------

    function viewClients() {
        var self = this;
        var app = window.location.pathname;
        var root = app.substring(1, app.length-18);

        var clients$ = $(this.clientList);
        var node = this.nodes[ "http-vwf-example-com-clients-vwf" ];

        clients$.html("<div class='header'>Connected Clients</div>");

        // Add node children
        clients$.append("<div id='clientsChildren'></div>");
        for ( var i = 0; i < node.children.length; i++ ) {
            var nodeChildIDAttribute = $.encoder.encodeForHTMLAttribute("id", node.children[i].ID, true);
            var nodeChildIDAlpha = $.encoder.encodeForAlphaNumeric(node.children[i].ID);
            var nodeChildNameHTML = $.encoder.encodeForHTML(node.children[i].name);
            $('#clientsChildren').append("<div id='" + nodeChildIDAlpha + "' data-nodeID='" + nodeChildIDAttribute + "' class='childContainer'><div class='childEntry'><b>" + nodeChildNameHTML + "</b></div></div>");
            $('#' + nodeChildIDAlpha).click( function(evt) {
                viewClient.call(self, $(this).attr("data-nodeID"));
            });
        }

        // Login Information
        clients$.append("<div style='padding:6px'><input class='filename_entry' type='text' id='userName' placeholder='Username' /><!-- <input class='filename_entry' type='password' id='password' placeholder='Password'/> --><input class='update_button' type='button' id='login' value='Login' /></div>"); 
        clients$.append("<hr/>");
        $('#userName').keydown( function(evt) {
            evt.stopPropagation();
        });
        $('#userName').keypress( function(evt) {
            evt.stopPropagation();
        });
        $('#userName').keyup( function(evt) {
            evt.stopPropagation();
        });
        $('#password').keydown( function(evt) {
            evt.stopPropagation();
        });
        $('#password').keypress( function(evt) {
            evt.stopPropagation();
        });
        $('#password').keyup( function(evt) {
            evt.stopPropagation();
        });
        $('#login').click(function(evt) {
            // Future call to validate username and password
            //login.call(self, $('#userName').val(), $('#password').val());

            var moniker = vwf_view.kernel.moniker();
            var clients = vwf_view.kernel.findClients("", "/*");
            var client = undefined;
            for (var i=0; i < clients.length; i++)
            {
                if ( clients[i].indexOf(moniker) != -1 )
                {
                    client = clients[i];
                    break;
                }
            }
            // var client = vwf_view.kernel.findClients("", "/" + moniker)[0];
            
            if ( client ) {
                vwf_view.kernel.setProperty( client, "displayName", $('#userName').val() );
            }
        });

        // Save / Load
        clients$.append("<div style='padding:6px'><input class='filename_entry' type='text' id='fileName' /><input class='update_button' type='button' id='save' value='Save' /></div>");
        $('#fileName').keydown( function(evt) {
            evt.stopPropagation();
        });
        $('#fileName').keypress( function(evt) {
            evt.stopPropagation();
        });
        $('#fileName').keyup( function(evt) {
            evt.stopPropagation();
        });
        $('#save').click(function(evt) {
            saveStateAsFile.call(self, $('#fileName').val());
        });

        clients$.append("<div style='padding:6px'><select class='filename_select' id='fileToLoad' /></select></div>");
        $('#fileToLoad').append("<option value='none'></option>");

        $.getJSON( "/" + root + "/admin/files", function( data ) {
            $.each( data, function( key, value ) {
                var fileName = encodeURIComponent(value['basename']);
                $('#fileToLoad').append("<option value='"+fileName+"'>"+fileName+"</option>");
            } );
        } );

        clients$.append("<div style='padding:6px'><input class='update_button' type='button' id='load' value='Load' /></div>");
        $('#load').click(function(evt) {
            loadSavedState.call(self, $('#fileToLoad').val());
        });
    }

    // -- viewClient ------------------------------------------------------------------------

    function viewClient( clientID ) {
        var self = this;

        var clients$ = $(this.clientList);
        var node = this.nodes[ clientID ];

        clients$.html("<div class='header'><img src='images/back.png' id='back' alt='back'/> " + $.encoder.encodeForHTML(node.name) + "</div>");
        jQuery('#back').click ( function(evt) {
            viewClients.call( self );
        });

        // Add node properties
        clients$.append("<div id='clientProperties'></div>");
        var displayedProperties = {};
        for ( var i = 0; i < node.properties.length; i++ ) {
            if ( !displayedProperties[ node.properties[i].name ] ) {
                displayedProperties[ node.properties[i].name ] = "instance";
                var nodeIDAlpha = $.encoder.encodeForAlphaNumeric(clientID);
                var propertyNameAttribute = $.encoder.encodeForHTMLAttribute("id", node.properties[i].name, true);
                var propertyNameAlpha = $.encoder.encodeForAlphaNumeric(node.properties[i].name);
                var propertyNameHTML = $.encoder.encodeForHTML(node.properties[i].name);
                var propertyValueAttribute = $.encoder.encodeForHTMLAttribute("val", node.properties[i].value, true);
                $('#clientProperties').append("<div id='" + nodeIDAlpha + "-" + propertyNameAlpha + "' class='propEntry'><table><tr><td><b>" + propertyNameHTML + " </b></td><td><input type='text' class='input_text' id='input-" + nodeIDAlpha + "-" + propertyNameAlpha + "' value='" + propertyValueAttribute + "' data-propertyName='" + propertyNameAttribute + "' readonly></td></tr></table></div>");
            }
        }
    }

    // -- drillDown -------------------------------------------------------------------------

    function drillDown(nodeID, drillBackID) // invoke with the view as "this"
    {
        var topdownName = this.topdownName;
        var topdownTemp = this.topdownTemp;
        
        drill.call(this, nodeID, drillBackID);
        
        if(nodeID != vwf_view.kernel.find("", "/")[0]) $(topdownName).hide('slide', {direction: 'left'}, 175); 
        $(topdownTemp).show('slide', {direction: 'right'}, 175);    
        
        this.topdownName = topdownTemp;
        this.topdownTemp = topdownName;
    }
    
    // -- drillUp ---------------------------------------------------------------------------

    function drillUp(nodeID) // invoke with the view as "this"
    {
        var topdownName = this.topdownName;
        var topdownTemp = this.topdownTemp;
        
        drill.call(this, nodeID, undefined);
        
        $(topdownName).hide('slide', {direction: 'right'}, 175); 
        $(topdownTemp).show('slide', {direction: 'left'}, 175);    
        
        this.topdownName = topdownTemp;
        this.topdownTemp = topdownName;
    }

    // -- drillBack---------------------------------------------------------------------------

    function drillBack(nodeID) // invoke with the view as "this"
    {
        var topdownName = this.topdownName;
        var topdownTemp = this.topdownTemp;
        
        drill.call(this, nodeID, undefined);
        
        // No slide motion, when resizing script window back to normal
        $(topdownName).hide();
        $(topdownTemp).show();
        
        this.topdownName = topdownTemp;
        this.topdownTemp = topdownName;
    }
    
    // -- drill -----------------------------------------------------------------------------

    function drill(nodeID, drillBackID) // invoke with the view as "this"
    {
        var node = this.nodes[ nodeID ];

        if ( !node ) {
            this.logger.errorx( "drill: Cannot find node '" + nodeID + "'" );
            return;
        }

        var self = this;
        var topdownName = this.topdownName;
        var topdownTemp = this.topdownTemp;
        var nodeIDAlpha = $.encoder.encodeForAlphaNumeric(nodeID);

        $(topdownName).html(''); // Clear alternate div first to ensure content is added correctly
        this.currentNodeID = nodeID;

        if(!drillBackID) drillBackID = node.parentID;
     
        if(nodeID == vwf_view.kernel.find("", "/")[0]) 
        {
            $(topdownTemp).html("<div class='header'>index</div>");
        }
        else
        {
            $(topdownTemp).html("<div class='header'><img src='images/back.png' id='" + nodeIDAlpha + "-back' alt='back'/> " + $.encoder.encodeForHTML(node.name) + "</div>");
            jQuery('#' + nodeIDAlpha + '-back').click ( function(evt) {
                drillUp.call(self, drillBackID);
            });
        }

        // Add node children
        $(topdownTemp).append("<div id='children'></div>");
        for ( var i = 0; i < node.children.length; i++ ) {
            var nodeChildIDAttribute = $.encoder.encodeForHTMLAttribute("id", node.children[i].ID, true);
            var nodeChildIDAlpha = $.encoder.encodeForAlphaNumeric(node.children[i].ID);
            $('#children').append("<div id='" + nodeChildIDAlpha + "' data-nodeID='" + nodeChildIDAttribute + "' class='childContainer'><div class='childEntry'><b>" + $.encoder.encodeForHTML(node.children[i].name) + "</b></div></div>");
            $('#' + nodeChildIDAlpha).click( function(evt) {
                drillDown.call(self, $(this).attr("data-nodeID"), nodeID);
            });
        }

        $('#children > div:last').css('border-bottom-width', '3px');

        // Add prototype children
        // TODO: Commented out until prototype children inherit from prototypes
        /*
        $(topdownTemp).append("<div id='prototypeChildren'></div>");
        var prototypeChildren = getChildren.call( this, this.kernel, node.extendsID ); 
        for ( var key in prototypeChildren)       
        {
            var child = prototypeChildren[key];
            var prototypeChildIDAttribute = $.encoder.encodeForHTMLAttribute("id", child.ID, true);
            var prototypeChildIDAlpha = $.encoder.encodeForAlphaNumeric(child.ID);
            $('#prototypeChildren').append("<div id='" + prototypeChildIDAlpha + "' data-nodeID='" + prototypeChildIDAttribute + "' class='childContainer'><div class='childEntry'><b>" + $.encoder.encodeForHTML(child.name) + "</b></div></div>");
            $('#' + prototypeChildIDAlpha).click( function(evt) {
                drillDown.call(self, $(this).attr("data-nodeID"), nodeID);
            });
        } 
        */   // END TODO:
        
        $('#prototypeChildren > div:last').css('border-bottom-width', '3px');

        // Add node properties
        $(topdownTemp).append("<div id='properties'></div>");
        var displayedProperties = {};
        for ( var i = 0; i < node.properties.length; i++ ) {
            if ( !displayedProperties[ node.properties[i].name ] ) {
                displayedProperties[ node.properties[i].name ] = "instance";
                var propertyNameAttribute = $.encoder.encodeForHTMLAttribute("id", node.properties[i].name, true);
                var propertyNameAlpha = $.encoder.encodeForAlphaNumeric(node.properties[i].name);
                var propertyNameHTML = $.encoder.encodeForHTML(node.properties[i].name);
                var propertyValueAttribute = $.encoder.encodeForHTMLAttribute("val", node.properties[i].value, true);
                $('#properties').append("<div id='" + nodeIDAlpha + "-" + propertyNameAlpha + "' class='propEntry'><table><tr><td><b>" + propertyNameHTML + " </b></td><td><input type='text' class='input_text' id='input-" + nodeIDAlpha + "-" + propertyNameAlpha + "' value='" + propertyValueAttribute + "' data-propertyName='" + propertyNameAttribute + "'></td></tr></table></div>");
            
                $('#input-' + nodeIDAlpha + '-' + propertyNameAttribute).change( function(evt) {
                    var propName = $.encoder.canonicalize($(this).attr("data-propertyName"));
                    var propValue = $(this).val();
                
                    try {
                        propValue = JSON.parse($.encoder.canonicalize(propValue));
                        self.kernel.setProperty(nodeID, propName, propValue);
                    } catch (e) {
                        // restore the original value on error
                        $(this).val(propValue);
                    }
                } );

                $('#input-' + nodeIDAlpha + '-' + propertyNameAlpha).keydown( function(evt) {
                    evt.stopPropagation();
                });

                $('#input-' + nodeIDAlpha + '-' + propertyNameAlpha).keypress( function(evt) {
                    evt.stopPropagation();
                });

                $('#input-' + nodeIDAlpha + '-' + propertyNameAlpha).keyup( function(evt) {
                    evt.stopPropagation();
                });
            }
        }

        $('#properties > div:last').css('border-bottom-width', '3px');

        this.logger.info(self + "    " + nodeID);

        // Add prototype properties
        $(topdownTemp).append("<div id='prototypeProperties'></div>");
        var prototypeProperties = getProperties.call( this, this.kernel, node.extendsID );
        for ( var key in prototypeProperties ) {
            var prop = prototypeProperties[key].prop;
            if ( !displayedProperties[ prop.name ]  ) {
                displayedProperties[ prop.name ] = prototypeProperties[key].prototype;
                if(prop.value == undefined)
                {
                    prop.value = JSON.stringify( utility.transform( vwf.getProperty( nodeID, prop.name, []), utility.transforms.transit ) );
                }

                var propertyNameAttribute = $.encoder.encodeForHTMLAttribute("id", prop.name, true);
                var propertyNameAlpha = $.encoder.encodeForAlphaNumeric(prop.name);
                var propertyNameHTML = $.encoder.encodeForHTML(prop.name);
                var propertyValueAttribute = $.encoder.encodeForHTMLAttribute("val", prop.value, true);
                $('#prototypeProperties').append("<div id='" + nodeIDAlpha + "-" + propertyNameAlpha + "' class='propEntry'><table><tr><td><b>" + propertyNameHTML + " </b></td><td><input type='text' class='input_text' id='input-" + nodeIDAlpha + "-" + propertyNameAlpha + "' value='" + propertyValueAttribute + "' data-propertyName='" + propertyNameAttribute + "'></td></tr></table></div>");
            
                $('#input-' + nodeIDAlpha + '-' + propertyNameAlpha).change( function(evt) {
                    var propName = $.encoder.canonicalize($(this).attr("data-propertyName"));
                    var propValue = $(this).val();
                
                    try {
                        propValue = JSON.parse($.encoder.canonicalize(propValue));
                        self.kernel.setProperty(nodeID, propName, propValue);
                    } catch (e) {
                        // restore the original value on error
                        $(this).val(propValue);
                    }
                } );

                $('#input-' + nodeIDAlpha + '-' + propertyNameAlpha).keydown( function(evt) {
                    evt.stopPropagation();
                });

                $('#input-' + nodeIDAlpha + '-' + propertyNameAlpha).keypress( function(evt) {
                    evt.stopPropagation();
                });

                $('#input-' + nodeIDAlpha + '-' + propertyNameAlpha).keyup( function(evt) {
                    evt.stopPropagation();
                });
            }
        }

        $('#prototypeProperties > div:last').css('border-bottom-width', '3px');

        // Add node methods
        $(topdownTemp).append("<div id='methods'></div>");
        for ( var key in node.methods ) {
            var method = node.methods[key];
            var methodNameAlpha = $.encoder.encodeForAlphaNumeric(key);
            var methodNameAttribute = $.encoder.encodeForHTMLAttribute("id", key, true);
            var methodNameHTML = $.encoder.encodeForHTML(key);
            $('#methods').append("<div id='" + methodNameAlpha + "' class='methodEntry'><table><tr><td><b>" + methodNameHTML + " </b></td><td style='text-align:right;overflow:visible'><div id='rollover-" + methodNameAlpha + "' style='position:relative;left:12px'><input type='button' class='input_button_call' id='call-" + methodNameAlpha + "' value='Call' data-methodName='" + methodNameAttribute + "'><img id='param-" + methodNameAlpha + "' data-methodName='" + methodNameAttribute + "' src='images/arrow.png' alt='arrow' style='position:relative;top:4px;left:2px;visibility:hidden'></div></td></tr></table></div>");
            $('#rollover-' + methodNameAlpha).mouseover( function(evt) {
                $('#param-' + $(this).attr("id").substring(9)).css('visibility', 'visible');
            });
            $('#rollover-' + methodNameAlpha).mouseleave( function(evt) {
                $('#param-' + $(this).attr("id").substring(9)).css('visibility', 'hidden');
            });
            $('#call-' + methodNameAlpha).click( function(evt) {
                self.kernel.callMethod( nodeID, $.encoder.canonicalize($(this).attr("data-methodName")) );
            });
            $('#param-' + methodNameAlpha).click( function(evt) {
                setParams.call(self, $.encoder.canonicalize($(this).attr("data-methodName")), method, nodeID);                
            });
        }

        $('#methods > div:last').css('border-bottom-width', '3px');

        // Add prototype methods
        $(topdownTemp).append("<div id='prototypeMethods'></div>");
        var prototypeMethods = getMethods.call( this, this.kernel, node.extendsID );
        for ( var key in prototypeMethods ) {
            var method = prototypeMethods[key];
            var prototypeMethodNameAlpha = $.encoder.encodeForAlphaNumeric(key);
            var prototypeMethodNameAttribute = $.encoder.encodeForHTMLAttribute("id", key, true);
            var prototypeMethodNameHTML = $.encoder.encodeForHTML(key);
            $('#prototypeMethods').append("<div id='" + prototypeMethodNameAlpha + "' class='methodEntry'><table><tr><td><b>" + prototypeMethodNameHTML + " </b></td><td style='text-align:right;overflow:visible'><div id='rollover-" + prototypeMethodNameAlpha + "' style='position:relative;left:12px'><input type='button' class='input_button_call' id='call-" + prototypeMethodNameAlpha + "' value='Call' data-methodName='" + prototypeMethodNameAttribute + "'><img id='param-" + prototypeMethodNameAlpha + "' data-methodName='" + prototypeMethodNameAttribute + "' src='images/arrow.png' alt='arrow' style='position:relative;top:4px;left:2px;visibility:hidden'></div></td></tr></table></div>");
            $('#rollover-' + prototypeMethodNameAlpha).mouseover( function(evt) {
                $('#param-' + $(this).attr("id").substring(9)).css('visibility', 'visible');
            });
            $('#rollover-' + prototypeMethodNameAlpha).mouseleave( function(evt) {
                $('#param-' + $(this).attr("id").substring(9)).css('visibility', 'hidden');
            });
            $('#call-' + prototypeMethodNameAlpha).click( function(evt) {
                self.kernel.callMethod( nodeID, $.encoder.canonicalize($(this).attr("data-methodName")) );
            });
            $('#param-' + prototypeMethodNameAlpha).click( function(evt) {
                setParams.call(self, $.encoder.canonicalize($(this).attr("data-methodName")), method, nodeID);                
            });
        }

        $('#prototypeMethods > div:last').css('border-bottom-width', '3px');

        // Add node events
        $(topdownTemp).append("<div id='events'></div>");
        for ( var key in node.events ) {
            var nodeEvent = node.events[key];
            var eventNameAlpha = $.encoder.encodeForAlphaNumeric(key);
            var eventNameAttribute = $.encoder.encodeForHTMLAttribute("id", key, true);
            var eventNameHTML = $.encoder.encodeForHTML(key);
            $('#events').append("<div id='" + eventNameAlpha + "' class='methodEntry'><table><tr><td><b>" + eventNameHTML + " </b></td><td style='text-align:right;overflow:visible'><div id='rollover-" + eventNameAlpha + "' style='position:relative;left:12px'><input type='button' class='input_button_call' id='fire-" + eventNameAlpha + "' value='Fire' data-eventName='" + eventNameAttribute + "'><img id='arg-" + eventNameAlpha + "' data-eventName='" + eventNameAttribute + "' src='images/arrow.png' alt='arrow' style='position:relative;top:4px;left:2px;visibility:hidden'></div></td></tr></table></div>");
            $('#rollover-' + eventNameAlpha).mouseover( function(evt) {
                $('#arg-' + $(this).attr("id").substring(9)).css('visibility', 'visible');
            });
            $('#rollover-' + eventNameAlpha).mouseleave( function(evt) {
                $('#arg-' + $(this).attr("id").substring(9)).css('visibility', 'hidden');
            });
            $('#fire-' + eventNameAlpha).click( function(evt) {
                self.kernel.fireEvent( nodeID, $.encoder.canonicalize($(this).attr("data-eventName")) );
            });
            $('#arg-' + eventNameAlpha).click( function(evt) {
                setArgs.call(self, $.encoder.canonicalize($(this).attr("data-eventName")), nodeEvent, nodeID); 
            });
        }

        $('#events > div:last').css('border-bottom-width', '3px');

        // Add prototype events
        $(topdownTemp).append("<div id='prototypeEvents'></div>");
        var prototypeEvents = getEvents.call( this, this.kernel, node.extendsID );
        for ( var key in prototypeEvents ) {
            var nodeEvent = prototypeEvents[key];
            var prototypeEventNameAlpha = $.encoder.encodeForHTMLAttribute(key);
            var prototypeEventNameAttribute = $.encoder.encodeForHTMLAttribute("id", key, true);
            var prototypeEventNameHTML = $.encoder.encodeForHTML(key);
            $('#prototypeEvents').append("<div id='" + prototypeEventNameAlpha + "' class='methodEntry'><table><tr><td><b>" + prototypeEventNameHTML + " </b></td><td style='text-align:right;overflow:visible'><div id='rollover-" + prototypeEventNameAlpha + "' style='position:relative;left:12px'><input type='button' class='input_button_call' id='fire-" + prototypeEventNameAlpha + "' value='Fire' data-eventName='" + prototypeEventNameAttribute + "'><img id='arg-" + prototypeEventNameAlpha + "' data-eventName='" + prototypeEventNameAttribute + "' src='images/arrow.png' alt='arrow' style='position:relative;top:4px;left:2px;visibility:hidden'></div></td></tr></table></div>");
            $('#rollover-' + prototypeEventNameAlpha).mouseover( function(evt) {
                $('#arg-' + $(this).attr("id").substring(9)).css('visibility', 'visible');
            });
            $('#rollover-' + prototypeEventNameAlpha).mouseleave( function(evt) {
                $('#arg-' + $(this).attr("id").substring(9)).css('visibility', 'hidden');
            });
            $('#fire-' + prototypeEventNameAlpha).click( function(evt) {
                self.kernel.fireEvent( nodeID, $.encoder.canonicalize($(this).attr("data-eventName")) );
            });
            $('#arg-' + prototypeEventNameAlpha).click( function(evt) {
                setArgs.call(self, $.encoder.canonicalize($(this).attr("data-eventName")), nodeEvent, nodeID); 
            });
        }

        $('#prototypeEvents > div:last').css('border-bottom-width', '3px');

        // Add node behaviors
        $(topdownTemp).append("<div id='behaviors'></div>");
        for ( var i = 0; i < node.implementsIDs.length; i++ ) {
            var nodeImplementsIDAlpha = $.encoder.encodeForAlphaNumeric(node.implementsIDs[i]);
            var nodeImplementsIDHTML = $.encoder.encodeForHTML(node.implementsIDs[i]);
            $('#behaviors').append("<div class='propEntry'><table><tr><td style='width:92%'><b>" + nodeImplementsIDHTML + "</b></td><td><input id='" + nodeImplementsIDAlpha + "-enable' type='checkbox' checked='checked' disabled='disabled' /></td></tr></table></div>");

            /* 
            //Placeholder to Enable/Disable behaviors
            $('#' + node.implementsID[i] + '-enable').change( function(evt) {
            
            }); 
            */
        }

        $('#behaviors > div:last').css('border-bottom-width', '3px');

        // Add prototype behaviors
        $(topdownTemp).append("<div id='prototypeBehaviors'></div>");
        var prototypeNode = this.nodes[ node.extendsID ];
        for ( var i=0; i < prototypeNode.implementsIDs.length; i++)
        {
            var prototypeImplementsIDAlpha = $.encoder.encodeForAlphaNumeric(prototypeNode.implementsIDs[i]);
            var prototypeImplementsIDHTML = $.encoder.encodeForHTML(prototypeNode.implementsIDs[i]);
            $('#prototypeBehaviors').append("<div class='propEntry'><table><tr><td style='width:92%'><b>" + prototypeImplementsIDHTML + "</b></td><td><input id='" + prototypeImplementsIDAlpha + "-enable' type='checkbox' checked='checked' disabled='disabled' /></td></tr></table></div>");
        }

        $('#prototypeBehaviors > div:last').css('border-bottom-width', '3px');

        // Create new script
        $(topdownTemp).append("<div id='createScript'></div>");
        $('#createScript').append("<div class='childContainer'><div class='childEntry'><b>New Script</div></div>");
        $('#createScript').click( function (evt) {
            createScript.call(self, nodeID);
        });
        $('#createScript > div:last').css('border-bottom-width', '3px');

        if ( this.allScripts[ nodeID ] !== undefined ) {
            // Add node scripts
            $(topdownTemp).append("<div id='scripts'></div>");
            for( var i=0; i < this.allScripts[ nodeID ].length; i++ )
            {
                var scriptFull = this.allScripts[nodeID][i].text;
                if(scriptFull != undefined)
                {
                    var scriptName = scriptFull.substring(0, scriptFull.indexOf('='));
                    $('#scripts').append("<div id='script-" + nodeIDAlpha + "-" + i + "' class='childContainer'><div class='childEntry'><b>script </b>" + scriptName + "</div></div>");
                    $('#script-' + nodeIDAlpha + "-" + i).click( function(evt) {
                        var scriptID = $(this).attr("id").substring($(this).attr("id").lastIndexOf('-')+1);
                        viewScript.call(self, nodeID, scriptID, undefined);
                    });
                }
            }

            $('#scripts > div:last').css('border-bottom-width', '3px');
        }

        if ( this.allScripts[ node.extendsID ] !== undefined ) {
            // Add prototype scripts
            $(topdownTemp).append("<div id='prototypeScripts'></div>");
            for( var i=0; i < this.allScripts[ node.extendsID ].length; i++ )
            {
                var scriptFull = this.allScripts[node.extendsID][i].text;
                if(scriptFull != undefined)
                {
                    var nodeExtendsIDAlpha = $.encoder.encodeForAlphaNumeric(node.extendsID);
                    var nodeExtendsIDAttribute = $.encoder.encodeForHTMLAttribute("id", node.extendsID, true);
                    var scriptName = scriptFull.substring(0, scriptFull.indexOf('='));
                    $('#prototypeScripts').append("<div id='script-" + nodeExtendsIDAlpha + "-" + i + "' class='childContainer' data-nodeExtendsID='" + nodeExtendsIDAttribute + "'><div class='childEntry'><b>script </b>" + scriptName + "</div></div>");
                    $('#script-' + nodeExtendsIDAlpha + "-" + i).click( function(evt) {
                        var extendsId = $.encoder.canonicalize($(this).attr("data-nodeExtendsID"));
                        var scriptID = $(this).attr("id").substring($(this).attr("id").lastIndexOf('-')+1);
                        viewScript.call(self, nodeID, scriptID, extendsId);
                    });
                }
            }

            $('#prototypeScripts > div:last').css('border-bottom-width', '3px');
        }
        updateCameraProperties.call(self);
    }

    // -- createScript ----------------------------------------------------------------------

    function createScript (nodeID) // invoke with the view as "this"
    {
        var self = this;
        var topdownName = this.topdownName;
        var topdownTemp = this.topdownTemp;
        var allScripts = this.allScripts;

        var nodeIDAlpha = $.encoder.encodeForAlphaNumeric(nodeID);
        
        $(topdownTemp).html("<div class='header'><img src='images/back.png' id='script-" + nodeIDAlpha + "-back' alt='back'/> script</div>");
        jQuery('#script-' + nodeIDAlpha + '-back').click ( function(evt) {
            self.editingScript = false;
            drillBack.call(self, nodeID);

            // Return editor to normal width
            $('#editor').animate({ 'left' : "-260px" }, 175);
            $('.vwf-tree').animate({ 'width' : "260px" }, 175);
        });

        $(topdownTemp).append("<div class='scriptEntry'><pre class='scriptCode'><textarea id='newScriptArea' class='scriptEdit' spellcheck='false' wrap='off'></textarea></pre><input class='update_button' type='button' id='create-" + nodeIDAlpha + "' value='Create' /></div><hr>");
        $("#create-" + nodeIDAlpha).click ( function(evt) {
            self.kernel.execute( nodeID, $("#newScriptArea").val() );
        });
        jQuery('#newScriptArea').focus( function(evt) { 
            // Expand the script editor
            self.editingScript = true;
            $('#editor').animate({ 'left' : "-500px" }, 175);
            $('.vwf-tree').animate({ 'width' : "500px" }, 175);
        });
        jQuery('#newScriptArea').keydown( function(evt) { 
            evt.stopPropagation();
        });

        $(topdownName).hide();
        $(topdownTemp).show();
        
        this.topdownName = topdownTemp;
        this.topdownTemp = topdownName;
    }

    // -- viewScript ------------------------------------------------------------------------

    function viewScript (nodeID, scriptID, extendsID) // invoke with the view as "this"
    {
        var self = this;
        var topdownName = this.topdownName;
        var topdownTemp = this.topdownTemp;
        var allScripts = this.allScripts;

        var nodeIDAlpha = $.encoder.encodeForAlphaNumeric(nodeID);
        
        $(topdownTemp).html("<div class='header'><img src='images/back.png' id='script-" + nodeIDAlpha + "-back' alt='back'/> script</div>");
        jQuery('#script-' + nodeIDAlpha + '-back').click ( function(evt) {
            self.editingScript = false;
            drillBack.call(self, nodeID);

            // Return editor to normal width
            $('#editor').animate({ 'left' : "-260px" }, 175);
            $('.vwf-tree').animate({ 'width' : "260px" }, 175);
        });

        if(extendsID) {
            nodeID = extendsID;
            nodeIDAlpha = $.encoder.encodeForAlphaNumeric(extendsID);
        }

        var scriptText = self.allScripts[nodeID][scriptID].text;
        if(scriptText != undefined)
        {
            $(topdownTemp).append("<div class='scriptEntry'><pre class='scriptCode'><textarea id='scriptTextArea' class='scriptEdit' spellcheck='false' wrap='off'>" + scriptText + "</textarea></pre><input class='update_button' type='button' id='update-" + nodeIDAlpha + "-" + scriptID + "' value='Update' /></div><hr>");
            $("#update-" + nodeIDAlpha + "-" + scriptID).click ( function(evt) {
                var s_id = $(this).attr("id").substring($(this).attr("id").lastIndexOf('-') + 1);
                self.allScripts[nodeID][s_id].text = undefined;
                self.kernel.execute( nodeID, $("#scriptTextArea").val() );
            });
            jQuery('#scriptTextArea').focus( function(evt) { 
                // Expand the script editor
                self.editingScript = true;
                $('#editor').animate({ 'left' : "-500px" }, 175);
                $('.vwf-tree').animate({ 'width' : "500px" }, 175);
            });
            jQuery('#scriptTextArea').keydown( function(evt) { 
                evt.stopPropagation();
            });
        }
        
        $(topdownName).hide();
        $(topdownTemp).show();
        
        this.topdownName = topdownTemp;
        this.topdownTemp = topdownName;
    }

    // -- setParams -------------------------------------------------------------------------

    function setParams (methodName, methodParams, nodeID) // invoke with the view as "this"
    {
        var self = this;
        var topdownName = this.topdownName;
        var topdownTemp = this.topdownTemp;

        var methodNameAlpha = $.encoder.encodeForAlphaNumeric(methodName);
        var methodNameHTML = $.encoder.encodeForHTML(methodName);
     
        $(topdownTemp).html("<div class='header'><img src='images/back.png' id='" + methodNameAlpha + "-back' alt='back'/> " + methodNameHTML + "<input type='button' class='input_button_call' id='call' value='Call' style='float:right;position:relative;top:5px;right:33px'></input></div>");
        jQuery('#' + methodNameAlpha + '-back').click ( function(evt) {
            
            drillUp.call(self, nodeID);
        });

        for(var i=1; i<=16; i++)
        {
            $(topdownTemp).append("<div id='param" + i + "' class='propEntry'><table><tr><td><b>Parameter " + i + ": </b></td><td><input type='text' class='input_text' id='input-param" + i + "'></td></tr></table></div>");
            $('#input-param'+ i).keydown( function(evt) {
                    evt.stopPropagation();
                });
            $('#input-param'+ i).keypress( function(evt) {
                evt.stopPropagation();
            });
            $('#input-param'+ i).keyup( function(evt) {
                evt.stopPropagation();
            });
        }

        $('#call').click ( function (evt) {

            var parameters = new Array();
            for(var i=1; i<=16; i++)
            {
                if( $('#input-param'+ i).val() )
                {
                    var prmtr = $('#input-param'+ i).val();
                    try {
                        prmtr = JSON.parse($.encoder.canonicalize(prmtr));
                        parameters.push( prmtr );
                    } catch (e) {
                        this.logger.error('Invalid Value');
                    }
                }
            }

            self.kernel.callMethod(nodeID, methodName, parameters);
        });

        $(topdownName).hide('slide', {direction: 'left'}, 175); 
        $(topdownTemp).show('slide', {direction: 'right'}, 175);    

        this.topdownName = topdownTemp;
        this.topdownTemp = topdownName;
    }

    // -- setArgs ---------------------------------------------------------------------------

    function setArgs (eventName, eventArgs, nodeID) // invoke with the view as "this"
    {
        var self = this;
        var topdownName = this.topdownName;
        var topdownTemp = this.topdownTemp;

        var eventNameAlpha = $.encoder.encodeForAlphaNumeric(eventName);
        var eventNameHTML = $.encoder.encodeForHTML(eventName);
     
        $(topdownTemp).html("<div class='header'><img src='images/back.png' id='" + eventNameAlpha + "-back' alt='back'/> " + eventNameHTML + "<input type='button' class='input_button_call' id='fire' value='Fire' style='float:right;position:relative;top:5px;right:33px'></input></div>");
        jQuery('#' + eventNameAlpha + '-back').click ( function(evt) {
            drillUp.call(self, nodeID);
        });

        for(var i=1; i<=8; i++)
        {
            $(topdownTemp).append("<div id='arg" + i + "' class='propEntry'><table><tr><td><b>Argument " + i + ": </b></td><td><input type='text' class='input_text' id='input-arg" + i + "'></td></tr></table></div>");
            $('#input-arg'+ i).keydown( function(evt) {
                    evt.stopPropagation();
                });
            $('#input-arg'+ i).keypress( function(evt) {
                evt.stopPropagation();
            });
            $('#input-arg'+ i).keyup( function(evt) {
                evt.stopPropagation();
            });
        }

        $(topdownTemp).append("<div style='font-weight:bold;text-align:right;padding-right:10px'></div>");
        $('#fire').click ( function (evt) {

            var args = new Array();
            for(var i=1; i<=8; i++)
            {
                if( $('#input-arg'+ i).val() )
                {
                    var arg = $('#input-arg'+ i).val();
                    try {
                        arg = JSON.parse($.encoder.canonicalize(arg));
                        args.push( arg );
                    } catch (e) {
                        this.logger.error('Invalid Value');
                    }
                }
            }

            self.kernel.fireEvent(nodeID, eventName, args);
        });

        $(topdownName).hide('slide', {direction: 'left'}, 175); 
        $(topdownTemp).show('slide', {direction: 'right'}, 175);    

        this.topdownName = topdownTemp;
        this.topdownTemp = topdownName;

    }

    function getPrototypes( kernel, extendsID ) {
        var prototypes = [];
        var id = extendsID;

        while ( id !== undefined ) {
            prototypes.push( id );
            id = kernel.prototype( id );
        }
                
        return prototypes;
    }

    function getProperties( kernel, extendsID ) {
        var pTypes = getPrototypes( kernel, extendsID );
        var pProperties = {};
        if ( pTypes ) {
            for ( var i=0; i < pTypes.length; i++ ) {
                var nd = this.nodes[ pTypes[i] ];
                if ( nd && nd.properties ) {
                    for ( var key in nd.properties ) {
                        pProperties[ key ] = { "prop": nd.properties[ key ], "prototype": pTypes[i]  };
                    }
                }
            }
        }
        return pProperties;
    }

    function getChildren( kernel, extendsID ) {
        var pTypes = getPrototypes( kernel, extendsID );
        var pChildren = {};
        if ( pTypes ) {
            for ( var i=0; i < pTypes.length; i++ ) {
                var nd = this.nodes[ pTypes[i] ];
                if ( nd && nd.children ) {
                    for ( var key in nd.children ) {
                        pChildren[ key ] = nd.children[key];
                    }
                }
            }
        }
        return pChildren;
    }

    function getEvents( kernel, extendsID ) {
        var pTypes = getPrototypes( kernel, extendsID );
        var events = {};
        if ( pTypes ) {
            for ( var i = 0; i < pTypes.length; i++ ) {
                var nd = this.nodes[ pTypes[i] ];
                if  ( nd && nd.events ) {
                    for ( var key in nd.events ) {
                        events[ key ] = nd.events[key];
                    }
                }
            }
        }
        return events;
    }

    function getMethods( kernel, extendsID ) {
        var pTypes = getPrototypes( kernel, extendsID );
        var methods = {};
        if ( pTypes ) {
            for ( var i = 0; i < pTypes.length; i++ ) {
                var nd = this.nodes[ pTypes[i] ];
                if  ( nd && nd.methods ) {
                    for ( var key in nd.methods ) {
                        methods[ key ] = nd.methods[key];
                    }
                }
            }
        }
        return methods;
    }

    function highlightChildInHierarchy(nodeID) {
        if (this.editorOpen && this.editorView == 1) // Hierarchy view open
        {
            var childDiv = $("div[id='" + nodeID +"']");
            if(childDiv.length > 0) {
                var previousChild = $("div[id='" + this.highlightedChild +"']");
                if(previousChild.length > 0) {
                    previousChild.removeClass('childContainerHighlight');
                }
                childDiv.addClass('childContainerHighlight');
                this.highlightedChild = nodeID;
            }
        }
    }

    // -- showTimeline ----------------------------------------------------------------------

    function showTimeline() // invoke with the view as "this"
    {
        var timeline = this.timeline;

        if(!this.timelineInit)
        {
            jQuery('#time_control').append("<div class='header'>Timeline</div>" + 
                "<div style='text-align:center;padding-top:10px'><span><button id='play'></button><button id='stop'></button></span>" +
                "<span><span class='rate slider'></span>&nbsp;" + 
                "<span class='rate vwf-label' style='display: inline-block; width:8ex'></span></span></div>");

            var options = {};

            [ "play", "pause", "stop" ].forEach( function( state ) {
                options[state] = { icons: { primary: "ui-icon-" + state }, label: state, text: false };
            } );

            options.rate = { value: 0, min: -2, max: 2, step: 0.1, };

            var state = {};

            jQuery.get(
                "admin/state", 
                undefined, 
                function( data ) {
                    state = data;

                    jQuery( "button#play" ).button( "option", state.playing ? options.pause : options.play );
                    jQuery( "button#stop" ).button( "option", "disabled", state.stopped );

                    jQuery( ".rate.slider" ).slider( "value", Math.log( state.rate ) / Math.LN10 );

                    if ( state.rate < 1.0 ) {
                        var label_rate = 1.0 / state.rate;
                    } 
                    else {
                        var label_rate = state.rate;
                    }

                    var label = label_rate.toFixed(2).toString().replace( /(\.\d*?)0+$/, "$1" ).replace( /\.$/, "" );

                    if ( state.rate < 1.0 ) {
                        label = "&#x2215; " + label;
                    } else {
                        label = label + " &times;";
                    }

                    jQuery( ".rate.vwf-label" ).html( label );
                }, 
                "json" 
            );

            jQuery( "button#play" ).button(
                options.pause
            ). click( function() {
                jQuery.post(
                    state.playing ? "admin/pause" : "admin/play", 
                    undefined, 
                    function( data ) {
                        state = data;

                        jQuery( "button#play" ).button( "option", state.playing ? options.pause : options.play );
                        jQuery( "button#stop" ).button( "option", "disabled", state.stopped );
                    },
                    "json" 
                );
            } );


            jQuery( "button#stop" ).button(
                options.stop
            ). click( function() {
                jQuery.post(
                    "admin/stop", 
                    undefined, 
                    function( data ) {
                        state = data;

                        jQuery( "button#play" ).button( "option", state.playing ? options.pause : options.play );
                        jQuery( "button#stop" ).button( "option", "disabled", state.stopped );
                    }, 
                    "json" 
                );
            } );

            jQuery( ".rate.slider" ).slider(
                options.rate
            ) .bind( "slide", function( event, ui ) {
                jQuery.get( 
                    "admin/state", 

                    { "rate": Math.pow( 10, Number(ui.value) ) }, 

                    function( data ) {
                        state = data;

                        jQuery( ".rate.slider" ).slider( "value", Math.log( state.rate ) / Math.LN10 );

                        if ( state.rate < 1.0 ) {
                            var label_rate = 1.0 / state.rate;
                        } 
                        else {
                            var label_rate = state.rate;
                        }

                        var label = label_rate.toFixed(2).toString().replace( /(\.\d*?)0+$/, "$1" ).replace( /\.$/, "" );

                        if ( state.rate < 1.0 ) {
                            label = "&#x2215; " + label;
                        } else {
                            label = label + " &times;";
                        }

                        jQuery( ".rate.vwf-label" ).html( label );
                    }, 
                    "json"
                );
            } );

            this.timelineInit = true;
        }

        if (!this.editorOpen)
        {
            $(timeline).show('slide', {direction: 'right'}, 175);    
        }
        else
        {
            $(timeline).show();
        }
    }

        // -- showAboutTab ----------------------------------------------------------------------

    function showAboutTab() // invoke with the view as "this"
    {
        var about = this.about;

        if(!this.aboutInit)
        {
            jQuery('#about_tab').append("<div class='header'>About</div>" + 
                "<div class='about'><p style='font:bold 12pt Arial'>Virtual World Framework</p>" +
                "<p><b>Version: </b>" + version.join(".") + "</p>" +
                "<p><b>Site: </b><a href='http://virtualworldframework.com' target='_blank'>http://virtualworldframework.com</a></p>" +
                "<p><b>Source: </b><a href='https://github.com/virtual-world-framework' target='_blank'>https://github.com/virtual-world-framework</a></p></div>");

            this.aboutInit = true;
        }

        if (!this.editorOpen)
        {
            $(about).show('slide', {direction: 'right'}, 175);    
        }
        else
        {
            $(about).show();
        }
    }

    //  -- showModelsTab ----------------------------------------------------------------------

    function showModelsTab(modelID, modelURL) // invoke with the view as "this"
    {
        var self = this;
        var models = this.models;
        var modelsTemp = this.modelsTemp;
        this.currentModelID = modelID;
        this.currentModelURL = modelURL;

        $(models).html("");
        
        if(modelID == "") {
            $(modelsTemp).html("<div class='header'>Models</div>");

            $.getJSON("admin/models", function( data ) {
                if(data.length > 0) {
                    $.each( data, function( key, value ) {
                        var fileName = encodeURIComponent(value['basename']);
                        var divId = fileName;
                        if(divId.indexOf('.') != -1) {
                            divId = divId.replace(/\./g, "_");
                        }
                        var url = value['url'];

                        $(modelsTemp).append("<div class='childContainer'><div id='" + divId + "' class='modelEntry' data-url='" + url + "'>"
                            + fileName + "</div></div>");
                        $("#" + divId).click(function(e) {
                            modelDrillDown.call(self, e.target.textContent, e.target.getAttribute("data-url"));
                        })
                    });
                }
                else {
                    $(modelsTemp).append("<div class='childEntry'><p style='font:bold 12pt Arial'>No Models Found</p></div>");
                }
            } );
        }
        else {
            var divId = modelID;
            if(divId.indexOf('.') != -1) {
                divId = divId.replace(/\./g, "_");
            }
            $(modelsTemp).html("<div id='" + divId + "-backDiv' class='header'><img src='images/back.png' id='" + divId + "-back' alt='back'/>" + modelID + "</div>");
            $("#" + divId + "-back").click(function(e) {
                modelDrillUp.call(self, '');
            });

            $(modelsTemp).append("<div id='" + divId + "-rotation' class='propEntry'><table><tr><td><b>Rotation</b></td><td>" +
                "<input type='text' class='input_text' id='input-" + divId + "-rotation' value='[1,0,0,0]'></td></tr></table></div>");
            $('#input-' + divId + '-rotation').keydown( function(evt) {
                evt.stopPropagation();
            });
            $('#input-' + divId + '-rotation').keypress( function(evt) {
                evt.stopPropagation();
            });
            $('#input-' + divId + '-rotation').keyup( function(evt) {
                evt.stopPropagation();
            });

            $(modelsTemp).append("<div id='" + divId + "-scale' class='propEntry'><table><tr><td><b>Scale</b></td><td>" +
                "<input type='text' class='input_text' id='input-" + divId + "-scale' value='[1,1,1]'></td></tr></table></div>");
            $('#input-' + divId + '-scale').keydown( function(evt) {
                    evt.stopPropagation();
                });
            $('#input-' + divId + '-scale').keypress( function(evt) {
                evt.stopPropagation();
            });
            $('#input-' + divId + '-scale').keyup( function(evt) {
                evt.stopPropagation();
            });

            $(modelsTemp).append("<div id='" + divId + "-translation' class='propEntry'><table><tr><td><b>Translation Offset</b></td><td>" +
                "<input type='text' class='input_text' id='input-" + divId + "-translation' value='[0,0,0]'></td></tr></table></div>");
            $('#input-' + divId + '-translation').keydown( function(evt) {
                    evt.stopPropagation();
                });
            $('#input-' + divId + '-translation').keypress( function(evt) {
                evt.stopPropagation();
            });
            $('#input-' + divId + '-translation').keyup( function(evt) {
                evt.stopPropagation();
            });

            $(modelsTemp).append("<div class='drag'><div id='" + divId + "-drag' class='modelEntry' draggable='true' data-escaped-name='" + divId +"' data-url='" + modelURL + "'>Drag To Create</div></div>");

            $("#" + divId + "-drag").on("dragstart", function (e) {
                var fileName = $("#" + e.target.getAttribute("data-escaped-name") + "-backDiv").text();
                var rotation = encodeURIComponent($("#input-" + e.target.getAttribute("data-escaped-name") + "-rotation").val());
                var scale = encodeURIComponent($("#input-" + e.target.getAttribute("data-escaped-name") + "-scale").val());
                var translation = encodeURIComponent($("#input-" + e.target.getAttribute("data-escaped-name") + "-translation").val());
                var fileData = "{\"fileName\":\""+fileName+"\", \"fileUrl\":\""+e.target.getAttribute("data-url")+"\", " +
                    "\"rotation\":\"" + rotation + "\", \"scale\":\"" + scale + "\", \"translation\":\"" + translation + "\"}";
                e.originalEvent.dataTransfer.setData('text/plain', fileData);
                e.originalEvent.dataTransfer.setDragImage(e.target, 0, 0);
                return true;
            });
        }
    }

    // -- Model drillDown -------------------------------------------------------------------------

    function modelDrillDown(modelID, modelURL) // invoke with the view as "this"
    {
        var models = this.models;
        var modelsTemp = this.modelsTemp;
        
        showModelsTab.call(this, modelID, modelURL);
        
        if(modelID != "") $(models).hide('slide', {direction: 'left'}, 175); 
        $(modelsTemp).show('slide', {direction: 'right'}, 175);    
        
        this.models = modelsTemp;
        this.modelsTemp = models;
    }
    
    // -- Model drillUp ---------------------------------------------------------------------------

    function modelDrillUp(modelID) // invoke with the view as "this"
    {
        var models = this.models;
        var modelsTemp = this.modelsTemp;
        
        showModelsTab.call(this, modelID);
        
        $(models).hide('slide', {direction: 'right'}, 175); 
        $(modelsTemp).show('slide', {direction: 'left'}, 175);    
        
        this.models = modelsTemp;
        this.modelsTemp = models;
    }

    // -- SaveStateAsFile -------------------------------------------------------------------------

    function saveStateAsFile(filename) // invoke with the view as "this"
    {
        this.logger.info("Saving: " + filename);

        if(supportAjaxUploadWithProgress.call(this))
        {
            var xhr = new XMLHttpRequest();

            // Save State Information
            var state = vwf.getState();

            var timestamp = state["queue"].time;
            timestamp = Math.round(timestamp * 1000);

            // Remove queue component of state
            delete state["queue"];

            var objectIsTypedArray = function( candidate ) {
                var typedArrayTypes = [
                    Int8Array,
                    Uint8Array,
                    // Uint8ClampedArray,
                    Int16Array,
                    Uint16Array,
                    Int32Array,
                    Uint32Array,
                    Float32Array,
                    Float64Array
                ];

                var isTypedArray = false;

                if ( typeof candidate == "object" && candidate != null ) {
                    typedArrayTypes.forEach( function( typedArrayType ) {
                        isTypedArray = isTypedArray || candidate instanceof typedArrayType;
                    } );
                }

                return isTypedArray;
            };

            var transitTransformation = function( object ) {
                return objectIsTypedArray( object ) ?
                    Array.prototype.slice.call( object ) : object;
            };

            var json = JSON.stringify(
                require("vwf/utility").transform(
                    state, transitTransformation
                )
            );

            json = $.encoder.encodeForURL(json);

            var path = window.location.pathname;
            var root = path.substring(1, path.length - 18);
            var inst = path.substring(path.length-17, path.length-1);

            if(filename == '') filename = inst;

            if(root.indexOf('.vwf') != -1) root = root.substring(0, root.lastIndexOf('/'));

            xhr.open("POST", "/"+root, true);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhr.send("root="+root+"&filename="+filename+"&inst="+inst+"&timestamp="+timestamp+"&extension=.vwf.json"+"&jsonState="+json);

            // Save Config Information
            var config = {"info":{}, "model":{}, "view":{} };

            // Save browser title
            config["info"]["title"] = $('title').html();

            // Save model drivers
            Object.keys(vwf_view.kernel.kernel.models).forEach(function(modelDriver) {
                if(modelDriver.indexOf('vwf/model/') != -1) config["model"][modelDriver] = "";
            });

            // If neither glge or threejs model drivers are defined, specify nodriver
            if(config["model"]["vwf/model/glge"] === undefined && config["model"]["vwf/model/threejs"] === undefined) config["model"]["nodriver"] = "";

            // Save view drivers and associated parameters, if any
            Object.keys(vwf_view.kernel.kernel.views).forEach(function(viewDriver) {
                if(viewDriver.indexOf('vwf/view/') != -1)
                {
                    if( vwf_view.kernel.kernel.views[viewDriver].parameters )
                    {
                        config["view"][viewDriver] = vwf_view.kernel.kernel.views[viewDriver].parameters;
                    }
                    else config["view"][viewDriver] = "";
                }
            });

            var jsonConfig = $.encoder.encodeForURL( JSON.stringify( config ) );

            // Save config file to server
            var xhrConfig = new XMLHttpRequest();
            xhrConfig.open("POST", "/"+root, true);
            xhrConfig.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhrConfig.send("root="+root+"&filename="+filename+"&inst="+inst+"&timestamp="+timestamp+"&extension=.vwf.config.json"+"&jsonState="+jsonConfig);
        }

        else
        {
            console.error("Unable to save state.");
        }
    }

    // -- LoadSavedState --------------------------------------------------------------------------

    function loadSavedState(filename) 
    {
        this.logger.info("Loading: " + filename);

        // Redirect until setState ID conflict is resolved
        var path = window.location.pathname;
        var root = path.substring(1, path.length - 18);
        var inst = path.substring(path.length-17, path.length-1);

        if(root.indexOf('.vwf') != -1) root = root.substring(0, root.lastIndexOf('/'));
        window.location.pathname = root + '/' + filename.substring(0, filename.lastIndexOf('.')) + '/' + inst;

        // $.get(filename,function(data,status){
        //     vwf.setState(data);
        // });
    }

    // -- SupportAjax -----------------------------------------------------------------------------

    function supportAjaxUploadWithProgress()
    {
        return supportAjaxUploadProgressEvents();

        function supportAjaxUploadProgressEvents() 
        {
            var xhr = new XMLHttpRequest();
            return !! (xhr && ('upload' in xhr) && ('onprogress' in xhr.upload));
        }
    }
} );
