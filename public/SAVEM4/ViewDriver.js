define(['module', 'vwf/view'], function(module, view) {
  function getPickObjectVWFID() {
    return vwf.views[0].lastPickId;
  }

  function findThreeCamera() {
    return vwf.views[0].state.cameraInUse;
  }

  function findThreeRenderer() {
    return vwf.views[0].state.scenes['index-vwf'].renderer;
  }

  function findThreeScene() {
    return vwf.views[0].state.scenes['index-vwf'].threeScene;
  }

  return view.load(module, {
    initialize:function() {
      console.log('application view driver loaded');
      vwf.__findThreeCamera = findThreeCamera;
      vwf.__findThreeRenderer = findThreeRenderer;
      vwf.__findThreeScene = findThreeScene;
    },
    satProperty:function(nodeID, propertyName, propertyValue) {
    },
    calledMethod:function(nodeID, methodName) {
    },
    createdNode:function(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName) {
    },
  });
})