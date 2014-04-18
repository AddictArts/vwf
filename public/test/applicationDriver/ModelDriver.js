define(['module','vwf/model'],function(module,model){
	

	

	return model.load(module,{
		initialize:function()
		{
			console.log('application model driver loaded');
		
		},
		settingProperty:function(nodeID,propertyName,propertyValue)
		{
			//hummmm, not seeing notifications for transform here. Are they caught by the THREE driver?
		},
		callingMethod:function(nodeID,methodName,args)
		{
			
		},
		//standard book keeping stuff.
		creatingNode:function( nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName)
		{
			
		},
		getNodeByName :function(name)
		{
			
		}
	});

})