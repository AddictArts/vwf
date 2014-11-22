var index_vwf_html = "\
<!-- Copyright 2014, SRI International -->\n\
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
      var __EUI; // resist doing '= undefined, or = null' we just need it named and an async event will bind it!\n\
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
        assessmentActive: false\n\
      };\n\
      var toolTrayMenu = { };\n\
      var controlMenu = {\n\
        fontsize: '110%',\n\
        reset: function() {\n\
          vwf_view.kernel.callMethod(vwfapp.appId, 'resetBackend');\n\
        },\n\
        assessment: function() {\n\
          if (!vwfapp.assessmentActive) {\n\
            $('<iframe/>', {\n\
              name: 'assessment',\n\
              id:   'assessmentIFrame',\n\
              src:  vwfapp.assessmentServerAddress\n\
            }).appendTo('#assessment').css(cssIFrame);\n\
            $('#assessment').fadeIn();\n\
            vwfapp.assessmentActive = true;\n\
            $('.dg.ac').toggle();\n\
          }\n\
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
        Inspect: function(name) {\n\
          switch (name) {\n\
          case 'Ejection_Port_Cover':\n\
            vwf_view.kernel.callMethod(vwfapp.M4_Carbine_daeId, 'InspectChamberGroup');\n\
            break;\n\
          }\n\
        },\n\
        Pull: function(name) {\n\
          switch (name) {\n\
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
          this.controlGUI = new dat.GUI();\n\
          this.controlGUI.name = 'Control Menu';\n\
          this.controlGUI.add(controlMenu, 'fontsize').name('Fontsize').onFinishChange(function(value) { $('*.dg').css('font-size', value); });\n\
          this.controlGUI.add(controlMenu, 'reset').name('Reset');\n\
          this.controlGUI.add(controlMenu, 'assessment').name('Assessment');\n\
          this.controlGUI.autoPlace = false;\n\
          this.controlGUI.domElement.style.position = 'fixed';\n\
          this.controlGUI.domElement.style.float = 'left';\n\
          this.controlGUI.domElement.style.left = '15px';\n\
          this.controlGUI.domElement.style.overflowX = 'visible';\n\
          $('body').append(this.controlGUI.domElement);\n\
          $('*.dg').css('font-size', controlMenu.fontsize);\n\
\n\
          // Context menu drop down menu's\n\
          this.contextGUI = new dat.GUI();\n\
          this.contextGUI.name = 'Context Menu';\n\
          this.contextGUI.autoPlace = false;\n\
          this.contextGUI.domElement.style.position = 'absolute';\n\
          $('body').append(this.contextGUI.domElement);\n\
          $('div.close-button:last').css('display', 'none');\n\
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
          var l = view.guiref.ctx.length;\n\
\n\
          for (var i = 0; i < l; i++) {\n\
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
              if (propertyValue) window.location.reload(true); // window.location.href = window.location.href;\n\
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
              __EUI.vwfapp = vwfapp;\n\
              view.init();\n\
              vwf_view.kernel.callMethod(vwfapp.appId, 'instanceAutoLoads', [ ]);\n\
            };\n\
\n\
            console.info('using __EUI to get inventory and assessment server address');\n\
            vwfapp.assessmentServerAddress = __EUI.baseServerAddress + '/assessment';\n\
            url = __EUI.baseServerAddress + '/inventory';\n\
            $.ajax({ url: url, type: 'get', cache: false })\n\
            .done(callback)\n\
            .fail(function(jqXHR, textStatus, errorThrown) {\n\
              console.info('using inventoryServerAddress:' + url);\n\
              console.info('using assessmentServerAddress:' + vwfapp.assessmentServerAddress);\n\
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
            addActionsToTrayMenu();\n\
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
            vwfapp.M4_Carbine_dae_actionNames.forEach(function(action) {\n\
              contextMenu[ action ] = function() { };\n\
              view.guiref.ctx.push(view.contextGUI.add(contextMenu, action));\n\
            });\n\
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
              break;\n\
            case 'Ejection_Port_Cover':\n\
              contextMenu.Inspect = function() {\n\
                handleContextMenu();\n\
                view.Inspect(objectName);\n\
              };\n\
\n\
              break;\n\
            case 'Magazine_Catch':\n\
            case 'Magazine_Catch_Button':\n\
              contextMenu.Push = function() {\n\
                handleContextMenu();\n\
                view.Push('Magazine_Catch');\n\
              };\n\
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
            case 'Trigger':\n\
              contextMenu.Pull = function() {\n\
                handleContextMenu();\n\
                view.Pull('Trigger');\n\
              };\n\
              break;\n\
            default: // Everything else... is just the point action point at selection\n\
              contextMenu.Point = function() {\n\
                handleContextMenu();\n\
                view.contextActive = true;\n\
                view.guiref.ctx.push(view.contextGUI.add(contextMenu, 'closeCtxMenu').name('(X) Close'));\n\
                view.guiref.ctx.push(view.contextGUI.add(view, 'defaultPoint').name('targets'));\n\
              };\n\
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
        }\n\
      }\n\
      })(); //# sourceURL=index.vwf.html\n\
    </script>\n\
  </head>\n\
<body>\n\
  <div id='wrapper' class='wrapper'>\n\
    <div id='assessment'></div>\n\
  </div>\n\
  <script type='text/javascript'>\n\
    $('#wrapper').appendTo('#vwf-root');\n\
  </script>\n\
</body>\n\
</html>";








var index_vwf_yaml = "\
# Copyright 2014, SRI International\n\
---\n\
extends: http://vwf.example.com/scene.vwf\n\
implements:\n\
- .behave/begin.save\n\
- .behave/backendtxrx.save\n\
- .behave/instance.save\n\
methods:\n\
  initializeCamera:\n\
  resetBackend:\n\
properties:\n\
  backendResetSent: false\n\
children:\n\
  ShootingRange_dae:\n\
    extends: http://vwf.example.com/node3.vwf\n\
    source: /SAVE/models/environments/range/ShootingRange.dae\n\
    type: model/vnd.collada+xml\n\
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
    this.camera.translationSpeed = 5;\n\
    this.camera.translation = [ -1.25, 0, 2.2 ];\n\
    this.camera.rotation = [ 0, 0, 1, -90 ];\n\
  };\n\
\n\
  this.resetBackend = function() {\n\
    var self = this;\n\
\n\
    this.query({ type: 'Reset' }, function() { self.backendResetSent = true; });\n\
  }; //# sourceURL=index.vwf";








var M4_Carbine_dae_eui_yaml = "\
# Copyright 2014, SRI International\n\
--- \n\
properties:\n\
  actionNames: [ 'Attach', 'Close', 'Detach', 'Extract', 'Insert', 'Inspect', 'Lift', 'Open', 'Point', 'Press', 'Pull', 'PullAndHold', 'Push', 'PushAndHold', 'Release' ]\n\
methods:\n\
  setup:\n\
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
  releaseTrigger:\n\
scripts:\n\
- |\n\
  this.setup = function() {\n\
    console.info(this.id + ' ' + this.name + ' setup');\n\
    console.info(this.id + ' point behavior depends on shooting range targets KbId:' + this.parent.ShootingRange_dae.targets_KbId);\n\
    this.translation = [ 0, 0, 2 ];\n\
    this.rotateBy([ 0, 0, 1, 90 ], 0); // rotate z => 90\n\
    this.rotateBy([ 0, 1, 0, -90 ], 0); // rotate y => -90\n\
    // console.log(this);\n\
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
      this.activity({ action: 'Point', arguments: [ this.M4_Carbine_dae_KbId, this.parent.ShootingRange_dae.targets_KbId ] });\n\
      break;\n\
    }\n\
  };\n\
\n\
  this.SelectSwitchPosition = function(position) {\n\
    console.info(this.id + ' SelectSwitchPosition ' + position);\n\
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
    this.activity({ action: 'SelectSwitchPosition', arguments: [ this.Selector_Lever_KbId, position ] });\n\
  };\n\
\n\
  this.PushMagazineReleaseButton = function() {\n\
    console.info(this.id + ' Push MagazineReleaseButton');\n\
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
    this.activity({ action: 'Push', arguments: [ this.Magazine_Catch_Button_KbId ] });\n\
  };\n\
\n\
  this.PullAndHoldChargingHandle = function() {\n\
    console.info(this.id + ' PullAndHold ChargingHandle');\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Charging_Handle Group' ].translateTo([ -0.005, 0, 0 ], 0.25);\n\
    this.activity({ action: 'PullAndHold', arguments: [ this[ 'Charging_Handle Group_KbId' ] ] });\n\
  };\n\
\n\
  this.PushAndHoldBoltCatchBottom = function() {\n\
    console.info(this.id + ' PushAndHold BoltCatchBottom');\n\
    this.children[ 'Lower_Receiver Group' ].children[ 'Bolt_Catch Group' ].rotation = [ 1, 0, 0, -12 ];\n\
    this.activity({ action: 'PushAndHold', arguments: [ this[ 'Bolt_Catch_Bottom Group_KbId' ] ] });\n\
  };\n\
\n\
  this.ReleaseChargingHandle = function() {\n\
    console.info(this.id + ' Release ChargingHandle');\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Charging_Handle Group' ].translateTo([ 0., 0, 0 ], 0.25);\n\
    this.activity({ action: 'Release', arguments: [ this[ 'Charging_Handle Group_KbId' ] ] });\n\
  };\n\
\n\
  this.ReleaseBoltCatchBottom = function() {\n\
    console.info(this.id + ' Release BoltCatchBottom');\n\
    this.children[ 'Lower_Receiver Group' ].children[ 'Bolt_Catch Group' ].rotation = [ 1, 0, 0, 0 ];\n\
    this.activity({ action: 'Release', arguments: [ this[ 'Bolt_Catch_Bottom Group_KbId' ] ] });\n\
  };\n\
\n\
  this.PushChargingHandle = function() {\n\
    console.info(this.id + ' Push ChargingHandle');\n\
    this.children[ 'Upper_Receiver Group' ].children[ 'Charging_Handle Group' ].translateTo([ 0.005, 0, 0 ], 0.25);\n\
    this.activity({ action: 'Push', arguments: [ this[ 'Charging_Handle Group_KbId' ] ] });\n\
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
    this.children[ 'Upper_Receiver Group' ].children[ 'Key_and_Bolt_Carrier_Assembly Group' ].translateTo([ -0.075, 0, 0 ], 0.25);\n\
    this.children[ 'Upper_Receiver Group' ].children[ 9 ].rotateTo([ 1, 0, 0, 130 ], 0.5);\n\
    this.activity({ action: 'Inspect', arguments: [ this[ 'Chamber Group_KbId' ] ] });\n\
  };\n\
\n\
  this.PushBoltCatchTop = function() {\n\
    console.info(this.id + ' Push BoltCatchTop');\n\
\n\
    this.children[ 'Lower_Receiver Group' ].children[ 'Bolt_Catch Group' ].rotation = [ 1, 0, 0, 12 ];\n\
    this.activity({ action: 'Push', arguments: [ this[ 'Bolt_Catch_Top Group_KbId' ] ] });\n\
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
    this.activity({ action: 'Pull', arguments: [ this.Trigger_KbId ] });\n\
    this.future(1).releaseTrigger();\n\
  };\n\
\n\
  this.releaseTrigger = function() {\n\
    this.children[ 'Lower_Receiver Group' ].children[ 1 ].rotateTo([ 0, 0, 1, 0 ], 0.125);\n\
  };\n\
  //# sourceURL=M4_Carbine_dae.eui";








var eui_json_js = '\
// Copyright 2014, SRI International\n\
var __EUI = {\n\
    "baseServerAddress": ""\n\
};';
