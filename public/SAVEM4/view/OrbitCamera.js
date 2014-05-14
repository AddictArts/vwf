// XXX debug global for now...
SAVE = { };

// I have a feeling this could life in support/client/lib as a user view config and no need to patch vwf.js?

define([ 'module', 'vwf/view', 'jquery' ], function(module, view, $) {
  var renderer;
  var scene;
  var camera;

  return view.load(module, {
    initialize: function() {
    },

    createdNode: function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName) {
    },

    deletedNode: function(nodeID) {
    },

    satProperty: function(nodeID, propertyName, propertyValue) {
    },

    calledMethod: function(nodeID, methodName) {
    },

    ticked: function() {
        // This is the first place that we know that the entire app is loaded because the queue has been 
        // resumed (and therefore, it is ticking)... Note: From the support/client/lib/vwf/threejs.js view
        if (camera == undefined) {
          renderer = SAVE.renderer = findRenderer();
          scene = SAVE.scene = findScene();
          camera = SAVE.camera = findCamera();
          SAVE.view = this;
        }
    }
  });

  // private ===============================================================================

  // XXX I don't like the magic 0 in views[0], wonder if there is a more durable way to do it, moving on for now
  function getLastPickId() {
    return vwf.views[0].lastPickId;
  }

  function findCamera() {
    return vwf.views[0].state.cameraInUse;
  }

  function findRenderer() {
    return vwf.views[0].state.scenes['index-vwf'].renderer;
  }

  function findScene() {
    return vwf.views[0].state.scenes['index-vwf'].threeScene;
  }
})