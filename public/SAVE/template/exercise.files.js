// Copyright 2014, SRI International
// jsstringit Creating index_vwf_html, index_vwf_yaml, and M4_Carbine_dae_eui_yaml from ../public/SAVE/template
// Copyright 2014, SRI International
//1

var index_vwf_html = "\<!-- Copyright 2014, SRI International -->\n\
<html>\n\
  <head>\n\
    <title>Exercise UI</title>\n\
    <script type='text/javascript' src='../eui.json.js'></script>\n\
    <script type='text/javascript' src='/js/dat.gui.min.js'></script>\n\
    <style type='text/css'>\n\
      #wrapper {\n\
        position: absolute;\n\
        left: 350px;\n\
        top: 25px;\n\
        color: black;\n\
      }\n\
\n\
      #assessment {\n\
        display: none;\n\
      }\n\
\n\
      // dat.GUI style inspired by ...\n\
      // http://brm.io/dat-gui-light-theme/\n\
      // https://github.com/liabru/dat-gui-light-theme\n\
\n\
      .dg.main.taller-than-window .close-button {\n\
        border-top: 1px solid #ddd;\n\
      }\n\
\n\
      .dg.main .close-button {\n\
        background-color: #ccc;\n\
      }\n\
       \n\
      .dg.main .close-button:hover {\n\
        background-color: #ddd;\n\
      }\n\
\n\
      .dg {\n\
        color: #555;\n\
        text-shadow: none !important;\n\
      }\n\
\n\
      .dg.main::-webkit-scrollbar {\n\
        background: #fafafa;\n\
      }\n\
\n\
      .dg.main::-webkit-scrollbar-thumb {\n\
        background: #bbb;\n\
      }\n\
       \n\
      .dg li:not(.folder) {\n\
        background: #fafafa;\n\
        border-bottom: 1px solid #ddd;\n\
      }\n\
       \n\
      .dg li.save-row .button {\n\
        text-shadow: none !important;\n\
      }\n\
\n\
      .dg li.title {\n\
        background: #e8e8e8 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;\n\
      }\n\
\n\
      .dg .cr.function .property-name {\n\
        width: inherit;\n\
      }\n\
\n\
      .dg .cr.function:hover,.dg .cr.boolean:hover {\n\
        background: #fff;\n\
      }\n\
       \n\
      .dg .c input[type=text] {\n\
        background: #e9e9e9;\n\
      }\n\
       \n\
      .dg .c input[type=text]:hover {\n\
        background: #eee;\n\
      }\n\
       \n\
      .dg .c input[type=text]:focus {\n\
        background: #eee;\n\
        color: #555;\n\
      }\n\
       \n\
      .dg .c .slider {\n\
        background: #e9e9e9;\n\
      }\n\
\n\
      .dg .c .slider:hover {\n\
        background: #eee;\n\
      }\n\
    </style>\n\
    <script type='text/javascript'>\n\
      var __EUI; // resist doing '= undefined, or = null' we just need it named and an async event will bind it, vwf script inject after parsing this!\n\
\n\
      (function() {\n\
      var cssIFrame = {\n\
        'border': '1px outset #999999',\n\
        'width': '450px',\n\
        'height': '600px',\n\
        'background-color': 'rgba(228, 228, 228, 0.8)'\n\
      };\n\
      var vwfapp = {\n\
        appId: vwf_view.kernel.application(),\n\
        tooltray: undefined,\n\
        instructorMode: false,\n\
        assessmentActive: false,\n\
        cameraId: undefined,\n\
        path: window.location.pathname.split('/').slice(0, -2).join('/')\n\
      };\n\
      var toolTrayMenu = { };\n\
      var controlMenu = {\n\
        bannerInstructorMode: vwfapp.path,\n\
        fontsize: '110%',\n\
        euiMsg: true,\n\
        cameraStartTranslation: undefined,\n\
        cameraStartRotation: undefined,\n\
        cameraFly: false,\n\
        cameraOrbit: 0,\n\
        cameraZoom: 0,\n\
        allActions: false,\n\
        reset: function() {\n\
          vwf_view.kernel.callMethod(vwfapp.appId, 'resetBackend');\n\
        },\n\
        pathLink: function() {\n\
          window.location.pathname = vwfapp.path;\n\
        },\n\
        saveSolution: function() {\n\
          var self = this;\n\
          var url = __EUI.baseServerAddress + '/generateSolution';\n\
\n\
          console.info('Saving exercise to:' + url  +' with path:' + vwfapp.path);\n\
          $.ajax({ url: url, type: 'get', cache: false })\n\
          .done(function(data) {\n\
            view.controlGUI.remove(view.guiref.saveSolutionRef);\n\
            view.controlGUI.add(self, 'pathLink').name('Open ' + vwfapp.path);\n\
          })\n\
          .fail(function(jqXHR, textStatus, errorThrown) {\n\
            console.info('using generateSolution:' + url);\n\
            console.warn('error:' + textStatus);\n\
          });\n\
        },\n\
        assessment: function() {\n\
          if (!vwfapp.assessmentActive) {\n\
            var url = __EUI.baseServerAddress + '/assessment';\n\
\n\
            $('<iframe/>', { name: 'assessment', id: 'assessmentIFrame', src: url}).appendTo('#assessment').css(cssIFrame);\n\
            $('#assessment').fadeIn();\n\
            vwfapp.assessmentActive = true;\n\
            controlMenu.euiMsg = false;\n\
            view.controlGUI.__controllers.forEach(function(ctrl) { ctrl.updateDisplay(); });\n\
            $('#euiMsg').hide();\n\
          }\n\
        },\n\
        init: function() {\n\
          this.cameraStartTranslation = vwf.getProperty(vwfapp.cameraId, 'translation');\n\
          this.cameraStartRotation = vwf.getProperty(vwfapp.cameraId, 'rotation');\n\
          vwf.setProperty(vwfapp.appId, 'cameraTarget', [ 'M4_Carbine_dae' ]);\n\
        }\n\
      };\n\
      var contextMenu = {\n\
        closeCtxMenu: function() {\n\
          handleContextMenu();\n\
        }\n\
      };\n\
      var view = {\n\
        toolTrayGUI: undefined,\n\
        controlGUI: undefined,\n\
        contextGUI: undefined,\n\
        contextActive: false,\n\
        guiref: { ctx: [ ] },\n\
        defaultPoint: function() {\n\
          vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'Point', [ vwfapp.M4_Carbine_daeId ]);\n\
          handleContextMenu();\n\
        },\n\
        Semi: function() {\n\
          vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'SelectSwitchPosition', [ 'Semi' ]);\n\
          handleContextMenu();\n\
        },\n\
        Safe: function() {\n\
          vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'SelectSwitchPosition', [ 'Safe' ]);\n\
          handleContextMenu();\n\
        },\n\
        Burst: function() {\n\
          vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'SelectSwitchPosition', [ 'Burst' ]);\n\
          handleContextMenu();\n\
        },\n\
        Detach: function(name) {\n\
          switch (name) {\n\
          case 'Gun_Carrying_Handle':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'DetachTheCarryHandle');\n\
            break;\n\
          case 'Lower_Handguard':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'DetachLowerHandguard');\n\
            break;\n\
          case 'Receiver Group':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'DetachUpperFromLowerReceiver');\n\
            break;\n\
          case 'Small_Sling_Swivel':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'DetachSmallSlingSwivel');\n\
            break;\n\
          case 'Swivel_LAMA1259863095':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'DetachSwivel');\n\
            break;\n\
          case 'Upper_Handguard':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'DetachUpperHandguard');\n\
            break;\n\
          }\n\
\n\
          handleContextMenu();\n\
        },\n\
        Inspect: function(name) {\n\
          switch (name) {\n\
          case 'Ejection_Port_Cover':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'InspectChamberGroup');\n\
            break;\n\
          }\n\
        },\n\
        Loosen: function(name) {\n\
          vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'LoosenNut', [ name ]);\n\
        },\n\
        Pivot: function(name) {\n\
          switch (name) {\n\
          case 'Receiver Group':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PivotUpperFromLowerReceiver');\n\
            break;\n\
          }\n\
        },\n\
        Press: function(name) {\n\
          switch (name) {\n\
          case 'Handguard_Slip_Ring_LAMA918813252':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PressHandguardSlipRing');\n\
            break;\n\
          }          \n\
        },\n\
        Pull: function(name) {\n\
          switch (name) {\n\
          case 'Pivot_Pin':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PullPivotPin');\n\
            break;\n\
          case 'Takedown_Pin':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PullTakedownPin');\n\
            break;\n\
          case 'Trigger':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PullTrigger');\n\
            break;\n\
          }\n\
        },\n\
        PullAndHold: function(name) {\n\
          switch (name) {\n\
          case 'Charging_Handle':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PullAndHoldChargingHandle');\n\
            break;\n\
          }\n\
        },\n\
        PushAndHold: function(name) {\n\
          switch (name) {\n\
          case 'Bolt_Catch':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PushAndHoldBoltCatchBottom');\n\
            break;\n\
          }\n\
        },\n\
        Push: function(name) {\n\
          switch (name) {\n\
          case 'Bolt_Catch':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PushBoltCatchTop');\n\
            break;\n\
          case 'Charging_Handle':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PushChargingHandle');\n\
            break;\n\
          case 'Magazine_Catch':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PushMagazineReleaseButton');\n\
            break;\n\
          case 'Pivot_Pin':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PushPivotPin');\n\
            break;\n\
          case 'Takedown_Pin':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'PushTakedownPin');\n\
            break;\n\
          }\n\
        },\n\
        Release: function(name) {\n\
          switch (name) {\n\
          case 'Bolt_Catch':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'ReleaseBoltCatchBottom');\n\
            break;\n\
          case 'Charging_Handle':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'ReleaseChargingHandle');\n\
            break;\n\
          }\n\
        },\n\
        init: function() {\n\
          this.toolTrayGUI = new dat.GUI();\n\
          this.toolTrayGUI.name = 'Tool Tray';\n\
\n\
          for (var index = 0, l = vwfapp.tooltray.length; index < l; index++) {\n\
            toolTrayMenu[ 'instance' + index ] = instance(index);\n\
            view.guiref[ index ] = this.toolTrayGUI.add(toolTrayMenu, 'instance' + index).name(vwfapp.tooltray[ index ].name);\n\
          }\n\
\n\
          // Control menu's\n\
          controlMenu.init();\n\
          this.controlGUI = new dat.GUI();\n\
          this.controlGUI.name = 'Control Menu';\n\
\n\
          if (vwfapp.instructorMode) {\n\
            this.controlGUI.add(controlMenu, 'bannerInstructorMode').name('Instructor');\n\
            $('li.cr.string').css('background-color', 'red');\n\
            $('li.cr.string span.property-name').css('color', 'white');\n\
            $('li.cr.string  div.c input').attr('readonly', 'readonly').css({ color: 'white', 'background-color': 'red', 'margin-top': '0px' });\n\
          }\n\
\n\
          this.controlGUI.add(controlMenu, 'fontsize').name('Fontsize').onFinishChange(function(value) { $('*.dg').css('font-size', value); });\n\
          this.controlGUI.add(controlMenu, 'euiMsg').name('Messages').onFinishChange(function(value) {\n\
            if (value) $('#euiMsg').show();\n\
            else $('#euiMsg').hide();\n\
          });\n\
          this.controlGUI.add(controlMenu, 'reset').name('Reset');\n\
          this.controlGUI.add(controlMenu, 'allActions').name('AllActions');\n\
          this.controlGUI.add(controlMenu, 'cameraFly').name('CameraFly').onFinishChange(function(value) {\n\
            controlMenu.cameraOrbit = 0;\n\
            controlMenu.cameraZoom = 0;\n\
            view.controlGUI.__controllers.forEach(function(ctrl) { ctrl.updateDisplay(); });\n\
\n\
            if (!value) {\n\
              vwf.setProperty(vwfapp.cameraId, 'translation', controlMenu.cameraStartTranslation);\n\
              vwf.setProperty(vwfapp.cameraId, 'rotation', controlMenu.cameraStartRotation);\n\
              vwf.setProperty(vwfapp.cameraId, 'navmode', [ 'none' ]);\n\
            } else {\n\
              vwf.setProperty(vwfapp.cameraId, 'navmode', [ 'fly' ]);\n\
            }\n\
          });\n\
          this.controlGUI.add(controlMenu, 'cameraOrbit', -180, 180).name('Orbit').onChange(function(value) {\n\
            vwf_view.kernel.callMethod(vwfapp.appId, 'cameraOrbit', [ -value - 90 ]); // really we start at -90 behind the target, so we multiply by -1\n\
          });\n\
          this.controlGUI.add(controlMenu, 'cameraZoom', 0, 90).step(1).name('Zoom').onChange(function(value) {\n\
            vwf_view.kernel.callMethod(vwfapp.appId, 'cameraZoom', [ value ]);\n\
          }).onFinishChange(function(value) {\n\
            vwf_view.kernel.callMethod(vwfapp.appId, 'cameraLookAt', [ 'M4_Carbine_dae' ]);\n\
          });\n\
\n\
          if (vwfapp.instructorMode) view.guiref.saveSolutionRef = this.controlGUI.add(controlMenu, 'saveSolution').name('Save Solution');\n\
          else this.controlGUI.add(controlMenu, 'assessment').name('Assessment');\n\
\n\
          this.controlGUI.autoPlace = false;\n\
          this.controlGUI.domElement.style.position = 'fixed';\n\
          this.controlGUI.domElement.style.float = 'left';\n\
          this.controlGUI.domElement.style.left = '15px';\n\
          this.controlGUI.domElement.style.overflowX = 'visible';\n\
          $('body').append(this.controlGUI.domElement);\n\
\n\
          // Context menu drop down menu's\n\
          this.contextGUI = new dat.GUI();\n\
          this.contextGUI.name = 'Context Menu';\n\
          this.contextGUI.autoPlace = false;\n\
          this.contextGUI.domElement.style.position = 'absolute';\n\
          $('body').append(this.contextGUI.domElement);\n\
          $('div.close-button:last').css('display', 'none');\n\
\n\
          $('*.dg').css('font-size', controlMenu.fontsize);\n\
        }\n\
      };\n\
\n\
      function instance(index) {\n\
        return function() {\n\
          console.info('instance index:' + index);\n\
          console.info('tooltray[ ' + index + ' ]:');\n\
          console.log(vwfapp.tooltray[ index ]);\n\
\n\
          Pace.restart(); // Loading the asset takes a long time, show the busy status, look for Pace.stop() after initInstance is called in the model\n\
          view.toolTrayGUI.remove(view.guiref[ index ]);\n\
          vwf_view.kernel.callMethod(vwfapp.appId, 'instance', [ vwfapp.tooltray[ index ].name, vwfapp.tooltray[ index ].ID ]);\n\
        };\n\
      }\n\
\n\
      function addActionsToTrayMenu() {\n\
        // $('div.close-button:first').css('display', 'none');\n\
        // view.toolTrayGUI.add(view, 'defaultPoint').name('Point');\n\
      }\n\
\n\
      function handleContextMenu() {\n\
        if (view.contextActive) {\n\
          for (var i = 0, l = view.guiref.ctx.length; i < l; i++) {\n\
            view.contextGUI.remove(view.guiref.ctx[ i ]);\n\
          }\n\
\n\
          view.guiref.ctx = [ ];\n\
          view.contextActive = false;\n\
        }\n\
      }\n\
\n\
      function sceneInitialize() {\n\
        // Property observers...\n\
        vwf_view.satProperty = function(nodeId, propertyName, propertyValue) {\n\
          if (nodeId == vwfapp.appId) {\n\
            if (propertyName == 'backendResetSent') {\n\
              if (propertyValue) window.location.href = '../';\n\
            }\n\
          }\n\
        };\n\
\n\
        // notice the methodValue for the function return value as needed...\n\
        vwf_view.calledMethod = function(nodeId, methodName, methodParameters, methodValue) {\n\
          if (methodName == 'processSaveDotJson') {\n\
            var callback = function(data) {\n\
              console.info('the view tooltray data is ' + JSON.stringify(data));\n\
              vwfapp.tooltray = data.tooltray;\n\
\n\
              if (data.instructorMode) vwfapp.instructorMode = true;\n\
\n\
              view.init();\n\
              vwf_view.kernel.callMethod(vwfapp.appId, 'instanceAutoLoads', [ ]);\n\
            };\n\
\n\
            var url = __EUI.baseServerAddress + '/inventory';\n\
\n\
            $.ajax({ url: url, type: 'get', cache: false })\n\
            .done(callback)\n\
            .fail(function(jqXHR, textStatus, errorThrown) {\n\
              console.info('using inventoryServerAddress:' + url);\n\
              console.warn('error:' + textStatus);\n\
            });\n\
          } else if (methodName == 'initInstance') {\n\
            Pace.stop(); // Loading the asset takes a long time, we are done manually remove busy status and adjust the menu width\n\
\n\
            var assetVwfId = vwf_view.kernel.find(vwfapp.appId, '//' + methodValue)[ 0 ];\n\
\n\
            console.info('initInstance completed for assetVwfId:' + assetVwfId);\n\
            vwfapp[ methodValue + 'Id' ] = assetVwfId;\n\
            vwfapp[ assetVwfId ] = vwf.getProperty(assetVwfId, '__idToName');\n\
            vwfapp[ methodValue + '_actionNames' ] = vwf.getProperty(assetVwfId, 'actionNames');\n\
            $('.dg.ac').toggle(); // hide / remove the tray menu //XXX we need to see if other things are in the tray before toggling it away\n\
            // addActionsToTrayMenu();\n\
          }\n\
        };\n\
\n\
        // Event observers...\n\
        vwf_view.firedEvent = function(nodeId, eventName, eventArgs) {\n\
          if (eventName != 'pointerDown') return;\n\
          if (eventArgs[ 0 ].button == 'right') return;\n\
          if (view.contextActive) return; // parents and children fire the event so we only want to handle this once and return for all others\n\
\n\
          // console.info('firedEvent pointerDown in the html view for ' + eventArgs[ 1 ].pickID);\n\
\n\
          if (vwfapp[ nodeId ] !== undefined) {\n\
            view.contextActive = true; // we will see fired events for the parent and the child, so I only need to handle it once...\n\
            view.contextGUI.domElement.style.left = eventArgs[ 0 ].screenPosition[ 0 ] + 'px';\n\
            view.contextGUI.domElement.style.top = eventArgs[ 0 ].screenPosition[ 1 ] + 'px';\n\
            console.info('picked id:' + eventArgs[ 1 ].pickID);\n\
            console.info('picked node name:' + vwfapp[ nodeId ][ eventArgs[ 1 ].pickID ]);\n\
\n\
            view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'closeCtxMenu').name('(X) Close'));\n\
\n\
            if (controlMenu.allActions) {\n\
              vwfapp.M4_Carbine_dae_actionNames.forEach(function(action) {\n\
                contextMenu[ action ] = function() { };\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, action));\n\
              });\n\
            }\n\
\n\
            var objectName = vwfapp[ nodeId ][ eventArgs[ 1 ].pickID ];\n\
\n\
            switch (objectName) {\n\
            case 'Bolt_Catch':\n\
              contextMenu.Push = function() {\n\
                handleContextMenu();\n\
                view.Push(objectName);\n\
              };\n\
              contextMenu.PushAndHold = function() {\n\
                handleContextMenu();\n\
                view.PushAndHold(objectName);\n\
              };\n\
              contextMenu.Release = function() {\n\
                handleContextMenu();\n\
                view.Release(objectName);\n\
              };\n\
\n\
              if (!controlMenu.allActions) {\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Push'));\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'PushAndHold'));\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Release'));\n\
              }\n\
              break;\n\
            case 'Charging_Handle_Latch':\n\
            case 'Charging_Handle':\n\
              contextMenu.PullAndHold = function() {\n\
                handleContextMenu();\n\
                view.PullAndHold('Charging_Handle');\n\
              };\n\
              contextMenu.Push = function() {\n\
                handleContextMenu();\n\
                view.Push('Charging_Handle');\n\
              };\n\
              contextMenu.Release = function() {\n\
                handleContextMenu();\n\
                view.Release('Charging_Handle');\n\
              };\n\
\n\
              if (!controlMenu.allActions) {\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'PullAndHold'));\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Push'));\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Release'));\n\
              }\n\
              break;\n\
            case 'Ejection_Port_Cover':\n\
              contextMenu.Inspect = function() {\n\
                handleContextMenu();\n\
                view.Inspect(objectName);\n\
              };\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Inspect'));\n\
              break;\n\
            case 'Gun_Carrying_Handle':\n\
              contextMenu.Detach = function() {\n\
                handleContextMenu();\n\
                view.Detach('Gun_Carrying_Handle');\n\
              };\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Detach'));\n\
              break;\n\
            case 'Handguard_Slip_Ring_LAMA918813252':\n\
              contextMenu.Press = function() {\n\
                handleContextMenu();\n\
                view.Press('Handguard_Slip_Ring_LAMA918813252');\n\
              };\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Press'));\n\
              break;\n\
            case 'Lower_Handguard':\n\
              contextMenu.Detach = function() {\n\
                handleContextMenu();\n\
                view.Detach('Lower_Handguard');\n\
              };\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Detach'));\n\
              break;\n\
            case 'Magazine_Catch':\n\
            case 'Magazine_Catch_Button':\n\
              contextMenu.Push = function() {\n\
                handleContextMenu();\n\
                view.Push('Magazine_Catch');\n\
              };\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Push'));\n\
              break;\n\
            case 'Pivot_Pin':\n\
              contextMenu.Push = function() {\n\
                handleContextMenu();\n\
                view.Push('Pivot_Pin');\n\
              };\n\
              contextMenu.Pull = function() {\n\
                handleContextMenu();\n\
                view.Pull('Pivot_Pin');\n\
              };\n\
\n\
              if (!controlMenu.allActions) {\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Push'));\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Pull'));\n\
              }\n\
              break;\n\
            case 'Round_Nut1':\n\
            case 'Round_Nut':\n\
              contextMenu.Loosen = function() {\n\
                handleContextMenu();\n\
                view.Loosen(objectName);\n\
              };\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Loosen'));\n\
              break;\n\
            case 'Selector_Lever':\n\
              contextMenu.SelectSwitchPosition = function() {\n\
                handleContextMenu();\n\
                view.contextActive = true;\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'closeCtxMenu').name('(X) Close'));\n\
                view.guiref.ctx.push(view.contextGUI.add(view, 'Semi'));\n\
                view.guiref.ctx.push(view.contextGUI.add(view, 'Safe'));\n\
                view.guiref.ctx.push(view.contextGUI.add(view, 'Burst'));\n\
              };\n\
              view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'SelectSwitchPosition'));\n\
              break;\n\
            case 'Sling':\n\
              contextMenu.Detach = function() {\n\
                handleContextMenu();\n\
                view.contextActive = true;\n\
\n\
                var options = {\n\
                  Small_Sling_Swivel: function() { view.Detach('Small_Sling_Swivel'); },\n\
                  Swivel_LAMA1259863095: function() { view.Detach('Swivel_LAMA1259863095'); }\n\
                };\n\
\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'closeCtxMenu').name('(X) Close'));\n\
                view.guiref.ctx.push(view.contextGUI.add(options, 'Small_Sling_Swivel').name('Small Sling Swivel'));\n\
                view.guiref.ctx.push(view.contextGUI.add(options, 'Swivel_LAMA1259863095').name('Swivel LAMA1259863095'));\n\
              }\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Detach'));\n\
              break;\n\
            case 'Small_Sling_Swivel':\n\
            case 'Swivel_LAMA1259863095':\n\
              contextMenu.Detach = function() {\n\
                handleContextMenu();\n\
                view.Detach(objectName);\n\
              }\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Detach'));\n\
              break;\n\
            case 'Takedown_Pin':\n\
              contextMenu.Pull = function() {\n\
                handleContextMenu();\n\
                view.Pull('Takedown_Pin');\n\
              };\n\
              contextMenu.Push = function() {\n\
                handleContextMenu();\n\
                view.Push('Takedown_Pin');\n\
              };\n\
\n\
              if (!controlMenu.allActions) {\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Pull'));\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Push'));\n\
              }\n\
              break;\n\
            case 'Trigger':\n\
              contextMenu.Pull = function() {\n\
                handleContextMenu();\n\
                view.Pull('Trigger');\n\
              };\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Pull'));\n\
              break;\n\
            case 'Upper_Handguard':\n\
              contextMenu.Detach = function() {\n\
                handleContextMenu();\n\
                view.Detach('Upper_Handguard');\n\
              };\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Detach'));\n\
              break;\n\
            case 'Upper_Receiver':\n\
            case 'Lower_Receiver':\n\
              contextMenu.Pivot = function() {\n\
                handleContextMenu();\n\
                view.Pivot('Receiver Group');\n\
              };\n\
              contextMenu.Detach = function() {\n\
                handleContextMenu();\n\
                view.Detach('Receiver Group');\n\
              };\n\
\n\
              if (!controlMenu.allActions) {\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Pivot'));\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Detach'));\n\
              }\n\
              break;\n\
            default: // Everything else... is just the point action point at selection\n\
              contextMenu.Point = function() {\n\
                handleContextMenu();\n\
                view.contextActive = true;\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'closeCtxMenu').name('(X) Close'));\n\
                view.guiref.ctx.push(view.contextGUI.add(view, 'defaultPoint').name('targets'));\n\
              };\n\
\n\
              if (!controlMenu.allActions) view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'Point'));\n\
              break;\n\
            }\n\
          }\n\
        };\n\
\n\
        $(window).unload(function() { sceneDestroy(); });\n\
      }\n\
\n\
      function sceneDestroy() {\n\
      }\n\
\n\
      // vwf html view initialization event, you don't have window.onload and document.ready is not good enough...\n\
      // initialization, yes it can be done this way... from tile-puzzle-2D example\n\
      vwf_view.initializedNode = function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName) {\n\
        if (childID == vwfapp.appId) {\n\
          sceneInitialize();\n\
          vwf_view.kernel.callMethod(vwfapp.appId, 'processSaveDotJson', [ __EUI ]);\n\
          vwfapp.cameraId = vwf_view.kernel.find(vwfapp.appId, '//camera')[ 0 ];\n\
          __EUI.vwfapp = vwfapp; // for console debug access\n\
        }\n\
      }\n\
      })(); //# sourceURL=index.vwf.html\n\
    </script>\n\
  </head>\n\
<body>\n\
  <div id='wrapper' class='wrapper'>\n\
    <div id='euiMsg' style='width: 40em;position: relative;font-size: medium;'>\n\
      <div class='actionDesc' style='left: 0; right: 100%;background: white; color: black; padding: 5px;'>Action performed: None</div>\n\
      <div class='actionKey' style='left: 0; right: 50%;background: green;color: white;padding: 5px;position: absolute;'>\n\
      </div>\n\
      <div class='actionArgs' style='left: 50%; right: 0;background: blue;color: white;padding: 5px;position: absolute;'>\n\
      </div>\n\
    </div>\n\
    <div id='assessment'></div>\n\
  </div>\n\
  <script type='text/javascript'>\n\
    $('#wrapper').appendTo('#vwf-root');\n\
\n\
    if (__EUI) {\n\
      $('#euiMsg .actionDesc').text('EUI Configured');\n\
      $('#euiMsg .actionKey').text('baseServerAddress');\n\
      $('#euiMsg .actionArgs').text(__EUI.baseServerAddress);\n\
    }\n\
  </script>\n\
</body>\n\
</html>\n\
";

//2

var index_vwf_yaml = "\# Copyright 2014, SRI International\n\
---\n\
extends: http://vwf.example.com/scene.vwf\n\
implements:\n\
- .behave/begin.save\n\
- .behave/backendtxrx.save\n\
- .behave/instance.save\n\
- .behave/cameranav.save\n\
methods:\n\
  initializeCamera:\n\
  resetBackend:\n\
properties:\n\
  backendResetSent: false\n\
children:\n\
#!=static-children\n\
  light1:\n\
    extends: http://vwf.example.com/light.vwf\n\
    properties:\n\
      lightType: 'directional'\n\
      translation: [ -0.5, 0, 2 ]\n\
      rotation: [ 0, 1, 0, 36 ]\n\
  light2:\n\
    extends: http://vwf.example.com/light.vwf\n\
    properties:\n\
      lightType: 'ambient'\n\
scripts:\n\
- |\n\
  this.initialize = function() {\n\
    this.future(0).initializeCamera();\n\
  };\n\
\n\
  this.initializeCamera = function() {\n\
    this.camera.navmode = 'none';\n\
    this.camera.translationSpeed = 5;\n\
    //#!=static-camera-translation;\n\
    //#!=static-camera-rotation;\n\
  };\n\
\n\
  this.resetBackend = function() {\n\
    var self = this;\n\
\n\
    this.query({ type: 'Reset' }, function() { self.backendResetSent = true; });\n\
  };\n\
  //# sourceURL=index.vwf";

//3

var M4_Carbine_dae_eui_yaml = "\# Copyright 2014, SRI International\n\
--- \n\
properties:\n\
  __slingDetach: 0\n\
  actionNames: [ 'Attach', 'Close', 'Detach', 'Extract', 'Insert', 'Inspect', 'Lift', 'Open', 'Point', 'Press', 'Pull', 'PullAndHold', 'Push', 'PushAndHold', 'Release' ]\n\
methods:\n\
  setup:\n\
  detachSling:\n\
  Point:\n\
  SelectSwitchPosition:\n\
  PushMagazineReleaseButton:\n\
  PullAndHoldChargingHandle:\n\
  PushAndHoldBoltCatchBottom:\n\
  ReleaseChargingHandle:\n\
  ReleaseBoltCatchBottom:\n\
  PushChargingHandle:\n\
  InspectChamberGroup:\n\
  PushBoltCatchTop:\n\
  PullTrigger:\n\
  DetachSmallSlingSwivel:\n\
  DetachSwivel:\n\
  PressHandguardSlipRing:\n\
  DetachUpperHandguard:\n\
  DetachLowerHandguard:\n\
  PushTakedownPin:\n\
  PullTakedownPin:\n\
  PivotUpperFromLowerReceiver:\n\
  PushPivotPin:\n\
  PullPivotPin:\n\
  DetachUpperFromLowerReceiver:\n\
  LoosenNut:\n\
  DetachTheCarryHandle:\n\
scripts:\n\
- |\n\
  this.setup = function() {\n\
    console.info(this.id + ' ' + this.name + ' setup');\n\
\n\
    if (this.parent.ShootingRange_dae) console.info(this.id + ' point behavior depends on shooting range targets KbId:' + this.parent.ShootingRange_dae.targets_KbId);\n\
\n\
    //#!=asset-translation;\n\
    //#!=asset-rotation;\n\
  };\n\
\n\
  this.Point = function(vwfId) {\n\
    var objectName = this.__idToName[ vwfId ];\n\
\n\
    console.info(this.id + 'Point ' + objectName);\n\
\n\
    switch (objectName) {\n\
    default:\n\
      this.rotateBy([ 0, 0, 1, -90 ], 0.5);\n\
\n\
      if (this.parent.ShootingRange_dae) this.activity({ action: 'Point', arguments: [ this.//#!=asset-root-name_KbId, this.parent.ShootingRange_dae.targets_KbId ], names: [ '//#!=asset-root-name', 'targets' ] });\n\
\n\
      break;\n\
    }\n\
  };\n\
\n\
  this.SelectSwitchPosition = function(position) {\n\
    console.info(this.id + ' Selector_Lever ' + position);\n\
\n\
    if (this.children[ 'Lower_Receiver Group' ].children[ 18 ].name != 'Selector_Lever') {\n\
        console.warn(this.id + ' Lower_Receiver Group child 18 is not the Selector_Lever');\n\
        return;\n\
    }\n\
\n\
    switch (position) {\n\
    case 'Safe':\n\
        this.children[ 'Lower_Receiver Group' ].children[ 18 ].rotation = [ 0, 0, 1, 90 ];\n\
        break;\n\
    case 'Semi':\n\
        this.children[ 'Lower_Receiver Group' ].children[ 18 ].rotation = [ 0, 0, 1, 0 ];\n\
        break;\n\
    case 'Burst':\n\
        this.children[ 'Lower_Receiver Group' ].children[ 18 ].rotation = [ 0, 0, 1, -90 ];\n\
        break;\n\
    }\n\
\n\
    this.activity({ action: 'SelectSwitchPosition', arguments: [ this.Selector_Lever_KbId, position ], names: [ 'Selector_Lever', position ] });\n\
  };\n\
\n\
  this.PushMagazineReleaseButton = function() {\n\
    console.info(this.id + ' Push Magazine_Release_Button');\n\
\n\
    if (this.children[ 'Lower_Receiver Group' ].children[ 9 ].name != 'Magazine_Catch') {\n\
        console.warn(this.id + ' Lower_Receiver Group child 9 is not the Magazine_Catch');\n\
        return;\n\
    }\n\
\n\
    if (this.children[ 'Lower_Receiver Group' ].children[ 11 ].name != 'Magazine_Catch_Button') {\n\
        console.warn(this.id + ' Lower_Receiver Group child 9 is not the Magazine_Catch_Button');\n\
        return;\n\
    }\n\
\n\
    this.children[ 'Lower_Receiver Group' ].children[ 9 ].translateTo([ 0, 0, 0.0026 ], 0.125);\n\
    this.children[ 'Lower_Receiver Group' ].children[ 11 ].translateTo([ 0, 0, 0.0026], 0.125);\n\
    this.children[ 'Magazine_g Group' ].translateTo([ 0, 0.125, 0 ], 0.25);\n\
    this.activity({ action: 'Push', arguments: [ this.Magazine_Catch_Button_KbId ], names: [ 'Magazine_Catch_Button' ] });\n\
  };\n\
\n\
  this.PullAndHoldChargingHandle = function() {\n\
    console.info(this.id + ' PullAndHold Charging_Handle');\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Charging_Handle Group' ].translateTo([ -0.005, 0, 0 ], 0.25);\n\
    this.activity({ action: 'PullAndHold', arguments: [ this[ 'Charging_Handle Group_KbId' ] ], names: [ 'Charging_Handle Group' ] });\n\
  };\n\
\n\
  this.PushAndHoldBoltCatchBottom = function() {\n\
    console.info(this.id + ' PushAndHold Bolt_Catch_Bottom');\n\
    this.children[ 'Lower_Receiver Group' ].children[ 'Bolt_Catch Group' ].rotation = [ 1, 0, 0, -12 ];\n\
    this.activity({ action: 'PushAndHold', arguments: [ this[ 'Bolt_Catch_Bottom Group_KbId' ] ], names: [ 'Bolt_Catch_Bottom Group' ] });\n\
  };\n\
\n\
  this.ReleaseChargingHandle = function() {\n\
    console.info(this.id + ' Release Charging_Handle');\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Charging_Handle Group' ].translateTo([ 0., 0, 0 ], 0.25);\n\
    this.activity({ action: 'Release', arguments: [ this[ 'Charging_Handle Group_KbId' ] ], names: [ 'Charging_Handle Group' ] });\n\
  };\n\
\n\
  this.ReleaseBoltCatchBottom = function() {\n\
    console.info(this.id + ' Release Bolt_Catch_Bottom');\n\
    this.children[ 'Lower_Receiver Group' ].children[ 'Bolt_Catch Group' ].rotation = [ 1, 0, 0, 0 ];\n\
    this.activity({ action: 'Release', arguments: [ this[ 'Bolt_Catch_Bottom Group_KbId' ] ], names: [ 'Bolt_Catch_Bottom Group' ] });\n\
  };\n\
\n\
  this.PushChargingHandle = function() {\n\
    console.info(this.id + ' Push Charging_Handle');\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Charging_Handle Group' ].translateTo([ 0.005, 0, 0 ], 0.25);\n\
    this.activity({ action: 'Push', arguments: [ this[ 'Charging_Handle Group_KbId' ] ], names: [ 'Charging_Handle Group' ] });\n\
  };\n\
\n\
  this.InspectChamberGroup = function() {\n\
    console.info(this.id + ' Inspect Chamber');\n\
\n\
    if (this.children[ 'Upper_Receiver Group' ].children[ 9 ].name != 'Ejection_Port_Cover') {\n\
        console.warn(this.id + ' Upper_Receiver Group child 9 is not the Ejection_Port_Cover');\n\
        return;\n\
    }\n\
\n\
    if (this.children[ 'Upper_Receiver Group' ].children[ 10 ].name != 'Cover_Spring') {\n\
        console.warn(this.id + ' Upper_Receiver Group child 10 is not the Cover_Spring');\n\
        return;\n\
    }\n\
\n\
    if (this.children[ 'Upper_Receiver Group' ].children[ 'Key_and_Bolt_Carrier_Assembly Group' ].children[ 'Bolt Group' ].children[ 11 ].name != 'Casing4') {\n\
        console.warn(this.id + ' Upper_Receiver Group->Key_and_Bolt_Carrier_Assembly Group->Bolt Group child 11 is not the Casing4');\n\
        return;\n\
    }\n\
\n\
    if (this.children[ 'Upper_Receiver Group' ].children[ 'Key_and_Bolt_Carrier_Assembly Group' ].children[ 'Bolt Group' ].children[ 12 ].name != 'Projectile4') {\n\
        console.warn(this.id + ' Upper_Receiver Group->Key_and_Bolt_Carrier_Assembly Group->Bolt Group child 12 is not the Projectile4');\n\
        return;\n\
    }\n\
\n\
    this.children[ 'Upper_Receiver Group' ].children[ 10 ].visible = false; // We have to hide it, beceause it does not have a proper rotation pivot point\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Key_and_Bolt_Carrier_Assembly Group' ].children[ 'Bolt Group' ].children[ 11 ].future(0.5).visible = false;\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Key_and_Bolt_Carrier_Assembly Group' ].children[ 'Bolt Group' ].children[ 12 ].future(0.5).visible = false;\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Key_and_Bolt_Carrier_Assembly Group' ].translateTo([ -0.075, 0, 0 ], 0.25);\n\
    this.children[ 'Upper_Receiver Group' ].children[ 9 ].rotateTo([ 1, 0, 0, 130 ], 0.25);\n\
    this.activity({ action: 'Inspect', arguments: [ this[ 'Chamber Group_KbId' ] ], names: [ 'Chamber Group' ] });\n\
  };\n\
\n\
  this.PushBoltCatchTop = function() {\n\
    console.info(this.id + ' Push Bolt_Catch_Top');\n\
\n\
    this.children[ 'Lower_Receiver Group' ].children[ 'Bolt_Catch Group' ].rotation = [ 1, 0, 0, 12 ];\n\
    this.activity({ action: 'Push', arguments: [ this[ 'Bolt_Catch_Top Group_KbId' ] ], names: [ 'Bolt_Catch_Top Group' ] });\n\
  };\n\
\n\
  this.PullTrigger = function() {\n\
    console.info(this.id + ' Pull Trigger');\n\
\n\
    if (this.children[ 'Lower_Receiver Group' ].children[ 1 ].name != 'Trigger') {\n\
      console.warn(this.id + ' Lower_Receiver Group child 9 is not the Trigger');\n\
      return;\n\
    }\n\
\n\
    this.children[ 'Lower_Receiver Group' ].children[ 1 ].rotateTo([ 0, 0, 1, 15 ], 0.5);\n\
    this.activity({ action: 'Pull', arguments: [ this.Trigger_KbId ], names: [ 'Trigger' ] });\n\
    this.children[ 'Lower_Receiver Group' ].children[ 1 ].future(1).rotateTo([ 0, 0, 1, 0 ], 0.125);\n\
  };\n\
\n\
  this.detachSling = function(detached) {\n\
    console.info(this.id + 'DetachSling 2 detach actions detaching:' + detached);\n\
\n\
    var detachSling = false;\n\
\n\
    switch (detached) {\n\
    case 'Small_Sling_Swivel':\n\
      if (this.__slingDetach == 2) detachSling = true;\n\
      else this.__slingDetach = 1;\n\
      break;\n\
    case 'Swivel_LAMA1259863095':\n\
      if (this.__slingDetach == 1) detachSling = true;\n\
      else this.__slingDetach = 2;\n\
      break;\n\
    }\n\
\n\
    if (detachSling) {\n\
      this.Sling.translateTo([ 0, 0.2, 0 ], 0.5);\n\
      this.Small_Sling_Swivel.translateTo([ 0, 0.2, 0 ], 0.5);\n\
\n\
      if (this.children[ 'Buttstock Group' ].children[ 1 ].name != 'Swivel_LAMA1259863095') {\n\
          console.warn(this.id + ' Buttstock Group child 1 is not the Swivel_LAMA1259863095');\n\
          return;\n\
      }\n\
\n\
      this.children[ 'Buttstock Group' ].children[ 1 ].translateTo([ 0, 0.2, 0 ], 0.5);\n\
    }\n\
  };\n\
\n\
  this.DetachSmallSlingSwivel = function() {\n\
    console.info(this.id + ' Detach Small_Sling_Swivel');\n\
\n\
    this.detachSling('Small_Sling_Swivel');\n\
    // arguments: detached from, thing detached\n\
    this.activity({ action: 'Detach', arguments: [ this.Small_Sling_Swivel_KbId, this.Sling_KbId ], names: [ 'Small_Sling_Swivel' ] });\n\
  };\n\
\n\
  this.DetachSwivel = function() {\n\
    console.info(this.id + ' Detach Swivel');\n\
\n\
    this.detachSling('Swivel_LAMA1259863095');\n\
    // arguments: detached from, thing detached\n\
    this.activity({ action: 'Detach', arguments: [ this.Swivel_LAMA1259863095_KbId, this.Sling_KbId ], names: [ 'Swivel_LAMA1259863095' ] });\n\
  };\n\
\n\
  this.PressHandguardSlipRing = function() {\n\
    console.info(this.id + ' Press Handguard_Slip_Ring');\n\
\n\
    this.Handguard_Slip_Ring_LAMA918813252.translateTo([ -0.0034912, 0, 0 ], 0.125);\n\
    // arguments: thingPressed\n\
    this.activity({ action: 'Press', arguments: [ this.Handguard_Slip_Ring_LAMA918813252_KbId ], names: [ 'Handguard_Slip_Ring_LAMA918813252' ] });\n\
  };\n\
\n\
  this.DetachUpperHandguard = function() {\n\
    console.info(this.id + ' Detach Upper_Handguard');\n\
\n\
    this.Upper_Handguard.translateTo([ 0, -0.15, 0 ], 0.5);\n\
    // arguments: detached from, thing detached\n\
    this.activity({ action: 'Detach', arguments: [ this.//#!=asset-root-name_KbId, this.Upper_Handguard_KbId ], names: [ 'Upper_Handguard' ] });\n\
  };\n\
\n\
  this.DetachLowerHandguard = function() {\n\
    console.info(this.id + ' Detach Lower_Handguard');\n\
\n\
    this.Lower_Handguard.translateTo([ 0, 0.15, 0 ], 0.5);\n\
    // arguments: detached from, thing detached\n\
    this.activity({ action: 'Detach', arguments: [ this.//#!=asset-root-name_KbId, this.Lower_Handguard_KbId ], names: [ 'Lower_Handguard' ] });\n\
  };\n\
\n\
  this.PushTakedownPin = function() {\n\
    console.info(this.id + ' Push Takedown_Pin');\n\
\n\
    if (this.children[ 'Lower_Receiver Group' ].children[ 15 ].name != 'Takedown_Pin') {\n\
        console.warn(this.id + ' Lower_Receiver Group child 15 is not the Takedown_Pin');\n\
        return;\n\
    }\n\
\n\
    this.children[ 'Lower_Receiver Group' ].children[ 15 ].translateTo([ 0, 0, -0.003344 ], 0.5);\n\
    // arguments: thingPushed\n\
    this.activity({ action: 'Push', arguments: [ this.Takedown_Pin_KbId ], names: [ 'Takedown_Pin' ] });\n\
  };\n\
\n\
  this.PullTakedownPin = function() {\n\
    console.info(this.id + ' Pull Takedown_Pin');\n\
\n\
    if (this.children[ 'Lower_Receiver Group' ].children[ 15 ].name != 'Takedown_Pin') {\n\
        console.warn(this.id + ' Lower_Receiver Group child 15 is not the Takedown_Pin');\n\
        return;\n\
    }\n\
\n\
    this.children[ 'Lower_Receiver Group' ].children[ 15 ].translateTo([ 0, 0, -0.018927 ], 0.5);\n\
    // arguments: thingPulled\n\
    this.activity({ action: 'Pull', arguments: [ this.Takedown_Pin_KbId ], names: [ 'Takedown_Pin' ] });\n\
  };\n\
\n\
  this.PivotUpperFromLowerReceiver = function() {\n\
    console.info(this.id + ' Pivot Upper_Reveiver From Lower_Receiver');\n\
    this.children[ 'Lower_Receiver Group' ].rotateBy([ 0, 0, 1, -16 ], 1);\n\
    this.children[ 'Buttstock Group' ].rotateBy([ 0, 0, 1, -16 ], 1);\n\
\n\
    // arguments: pivot from, thing pivoted ???\n\
    // this.activity({ action: 'Pivot', arguments: [ this[ 'Upper_Receiver Group_KbId' ], this[ 'Lower_Receiver Group_KbId' ] ], names: [ 'Upper_Reveiver Group', 'Lower_Receiver Group' ] });\n\
    // arguments: thingOpened\n\
    this.activity({ action: 'Open', arguments: [ this.//#!=asset-root-name_KbId ], names: [ '//#!=asset-root-name' ] });\n\
  };\n\
\n\
  this.PushPivotPin = function() {\n\
    console.info(this.id + ' Push Pivot_Pin');\n\
\n\
    if (this.children[ 'Lower_Receiver Group' ].children[ 12 ].name != 'Pivot_Pin') {\n\
        console.warn(this.id + ' Lower_Receiver Group child 12 is not the Pivot_Pin');\n\
        return;\n\
    }\n\
\n\
    this.children[ 'Lower_Receiver Group' ].children[ 12 ].translateTo([ 0, 0, -0.003344 ], 1);\n\
    // arguments: thingPushed\n\
    this.activity({ action: 'Push', arguments: [ this.Pivot_Pin_KbId ], names: [ 'Pivot_Pin' ] });\n\
  };\n\
\n\
  this.PullPivotPin = function() {\n\
    console.info(this.id + ' Pull Pivot_Pin');\n\
\n\
    if (this.children[ 'Lower_Receiver Group' ].children[ 12 ].name != 'Pivot_Pin') {\n\
        console.warn(this.id + ' Lower_Receiver Group child 12 is not the Pivot_Pin');\n\
        return;\n\
    }\n\
\n\
    this.children[ 'Lower_Receiver Group' ].children[ 12 ].translateTo([ 0, 0, -0.018927 ], 1);\n\
    // arguments: thingPushed\n\
    this.activity({ action: 'Pull', arguments: [ this.Pivot_Pin_KbId ], names: [ 'Pivot_Pin' ] });\n\
  };\n\
\n\
  this.DetachUpperFromLowerReceiver = function() {\n\
    console.info(this.id + ' Detach Lower_Reveiver From Upper_Receiver');\n\
    this.children[ 'Lower_Receiver Group' ].translateBy([ 0, 0.15, 0 ], 1);\n\
    this.children[ 'Buttstock Group' ].translateBy([ 0, 0.15, 0 ], 1);\n\
\n\
    // arguments: detached from, thing detached\n\
    this.activity({ action: 'Detach', arguments: [ this[ 'Upper_Receiver Group_KbId' ], this[ 'Lower_Receiver Group_KbId' ] ], names: [ 'Lower_Receiver Group' ] });\n\
  };\n\
\n\
  this.LoosenNut = function(name) {\n\
    console.info(this.id + ' Loosen ' + name);\n\
\n\
    if (this.children[ 'Upper_Receiver Group' ].children[ 'Gun_Carrying_Handle Group' ].children[ 18 ].name != 'Round_Nut1') {\n\
        console.warn(this.id + ' Upper_Receiver Group child 18 is not the Round_Nut1');\n\
        return;\n\
    }\n\
\n\
    if (this.children[ 'Upper_Receiver Group' ].children[ 'Gun_Carrying_Handle Group' ].children[ 22 ].name != 'Round_Nut') {\n\
        console.warn(this.id + ' Upper_Receiver Group child 22 is not the Round_Nut');\n\
        return;\n\
    }\n\
\n\
    switch (name) {\n\
    case 'Round_Nut1':\n\
      this.children[ 'Upper_Receiver Group' ].children[ 'Gun_Carrying_Handle Group' ].children[ 18 ].translateBy([ 0, 0, 0.01 ], 1);\n\
      break;\n\
    case 'Round_Nut':\n\
      this.children[ 'Upper_Receiver Group' ].children[ 'Gun_Carrying_Handle Group' ].children[ 22 ].translateBy([ 0, 0, 0.01 ], 1);\n\
      break;\n\
    }\n\
\n\
    // arguments: screwLoosened\n\
    this.activity({ action: 'Loosen', arguments: [ this[ name + '_KbId' ] ], names: [ name ] });\n\
  };\n\
\n\
  this.DetachTheCarryHandle = function() {\n\
    console.info(this.id + ' Detach Gun_Carrying_Handle From Upper_Receiver');\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Gun_Carrying_Handle Group' ].translateBy([ 0, -0.25, 0 ], 1);\n\
    // arguments: detached from, thing detached\n\
    this.activity({ action: 'Detach', arguments: [ this[ 'Upper_Receiver Group_KbId' ], this[ 'Gun_Carrying_Handle Group_KbId' ] ], names: [ 'Gun_Carrying_Handle Group' ] });\n\
  };\n\
  //# sourceURL=//#!=asset-root-name.eui\n\
";

//4

var default_Asset_Eui_B_yaml = "\---\n\
properties:\n\
  actionNames: [ 'Attach', 'Close', 'Detach', 'Extract', 'Insert', 'Inspect', 'Lift', 'Open', 'Point', 'Press', 'Pull', 'PullAndHold', 'Push', 'PushAndHold', 'Release' ]\n\
methods:\n\
  setup:\n\
scripts:\n\
- |\n\
  this.setup = function() {\n\
    console.info(this.id + ' ' + this.name + ' setup');\n\
    //#!=asset-translation;\n\
    //#!=asset-rotation;\n\
  };\n\
";
