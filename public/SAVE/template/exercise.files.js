var index_vwf_html = "\
";

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
    "baseServerAddress": "http://localhost:3001"\n\
};';
