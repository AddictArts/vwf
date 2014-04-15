define(['module','vwf/view'],function(module,view){
	
	//A strucutre to keep track of the scenegraph. Each driver must create its own represention from the data that comes in over
	//the VWFAPI
	function Node(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName)
	{
		this.parentId = nodeID ;
		this.id = childID ;
		this.extends = childExtendsID ;
		this.implements = childImplementsIDs ;
		this.source = childSource;
		this.type = childType ;
		this.index = childIndex ;
		this.name = childName;
		this.parent = null;
		this.children = [];
		this.properties = {};
		this.methods = {};
		this.getThreeObject = function()
		{
			return vwf.models[1].model.state.nodes[this.id].threeObject;
		}
		
	}

	return view.load(module,{
		initialize:function()
		{
			
			//the view driver is the proper place to detect events from the world and present 
			//an interface to the user. You could detect events from here and post them to the gateway, but 
			//if that post to the gateway causes something to happen and information needs to flow back into the 
			//model (the .yaml file), it needs to happen from within a model driver
			console.log('Save view driver loaded');
			this.nodes = {};
			window._dSaveView = this;
		},
		satProperty:function(nodeID,propertyName,propertyValue)
		{
			
			//here, you might want to pop up a message box. I'll add more examples tomorrow.
			//this is really much more relevant when you have UI specific logic. There isin't much here yet. Mouse click is a great example, but is currently handled 
			//by the THREE view. We could go ahead and implement mouse dragging here.
			if(propertyName == 'SSGState' && propertyValue == 'correct')
			{
				console.log('SSG reports state change in object ' + this.nodes[nodeID].name + ' from ' + this.nodes[nodeID].properties.SSGState + ' to ' + propertyValue)
			}
			this.nodes[nodeID].properties[propertyName] = propertyValue;
		},
		calledMethod:function(nodeID,methodName)
		{
			
		},
		//standard bookkeeping stuff. Lets keep track of the scene graph as reported by the VWFAPI
		createdNode:function( nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName)
		{
			this.nodes[childID] = new Node(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName);
			if(nodeID)
				this.nodes[nodeID].children.push(this.nodes[childID]);
			this.nodes[childID].parent = this.nodes[nodeID];
		},
	});

})