define(['module','vwf/view'],function(module,view){
	
	return view.load(module,{
		initialize:function()
		{
			
			console.log('application view driver loaded');
		},
		satProperty:function(nodeID,propertyName,propertyValue)
		{
			
			
		},
		calledMethod:function(nodeID,methodName)
		{
			
		},
		//standard bookkeeping stuff. Lets keep track of the scene graph as reported by the VWFAPI
		createdNode:function( nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName)
		{
			
		},
	});

})