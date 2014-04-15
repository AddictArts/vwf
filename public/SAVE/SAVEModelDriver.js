define(['module','vwf/model'],function(module,model){
	

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

	return model.load(module,{
		initialize:function()
		{
			console.log('Save model driver loaded');
			this.nodes = {};
			window._dSaveModel = this;
		},
		settingProperty:function(nodeID,propertyName,propertyValue)
		{
			//hummmm, not seeing notifications for transform here. Are they caught by the THREE driver?
		},
		callingMethod:function(nodeID,methodName,args)
		{
			//if the wall notifies us that it has moved, then we call the gateway to see if this is a good position
			//note: why don't we get the transform set notification in setproperty? Did this behavior change in newest VWF?
			if(this.getNodeByName('wall_dae') == this.nodes[nodeID])
			{
				if(methodName == 'SSGUpdate')
				{
					//ajax to the gateway here
					var transform = args[0];
					
					//imagine that gateway decided that some state is now 'Correct Position'
					{
						if(goog.vec.Vec3.distance([transform[12],transform[13],transform[14]],[0,3.8,1]) < .2)
						{
							//so, we're going to change a value that disables the dragging behavior.
							//Note: I think it a better idea to handle the dragging in the view driver. I"ll update tomorrow.
							vwf.setProperty(nodeID,'enabled',false);

							//this will be set to the SSGState property. The view driver will pick up that notification and do something
							return 'correct';
						}
					}
					return undefined;
				}

			}
		},
		//standard book keeping stuff.
		creatingNode:function( nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName)
		{
			this.nodes[childID] = new Node(nodeID, childID, childExtendsID, childImplementsIDs, childSource, childType, childIndex, childName);
			if(nodeID)
				this.nodes[nodeID].children.push(this.nodes[childID]);
			this.nodes[childID].parent = this.nodes[nodeID];
		},
		getNodeByName :function(name)
		{
			for(var i in this.nodes)
			{
				if(this.nodes[i].name == name)
					return this.nodes[i];
			}
		}
	});

})