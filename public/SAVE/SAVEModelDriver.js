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
			this.nodes[nodeID].properties[propertyName] = propertyValue;
			//hummmm, not seeing notifications for transform here. Are they caught by the THREE driver?
		},
		callingMethod:function(nodeID,methodName,args)
		{
			//if the wall notifies us that it has moved, then we call the gateway to see if this is a good position
			//note: why don't we get the transform set notification in setproperty? Did this behavior change in newest VWF?
			if(vwf.getProperty(nodeID,'SSGType') == 'wall')
			{
				if(methodName == 'SSGUpdate')
				{
					//ajax to the gateway here
					var transform = args[0];
					
					//imagine that gateway decided that some state is now 'Correct Position'
					{
						
						//clamp first to the Y. When close enough, let the view know that it should no longer move this way
						if(Math.abs(transform[13] - 3.8) < .1)
						{
							vwf.setProperty(nodeID,'moveY',false);
							transform[13] = 3.8;
							vwf.setProperty(nodeID,'transform',transform);
						}

						//now, clamp to the X
						if(vwf.getProperty(nodeID,'moveY') == false &&  Math.abs(transform[12] - .0) < .1)
						{
							vwf.setProperty(nodeID,'moveX',false);
							transform[12] = 0;
							vwf.setProperty(nodeID,'transform',transform);
						}
						
						//now the z
						if(vwf.getProperty(nodeID,'moveY') == false &&Math.abs(transform[14] - 1) < .1)
						{
							vwf.setProperty(nodeID,'moveZ',false);
							transform[14] = 1;
							vwf.setProperty(nodeID,'transform',transform);
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