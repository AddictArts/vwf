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
	function getPickObjectID()
	{
		return vwf.views[0].lastPickId;
	}
	function findCamera()
	{
		return vwf.views[0].state.cameraInUse;
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
			$(document.head).append('<link rel="stylesheet" type="text/css" href="jquery-ui-1.10.3.custom.css">')
			$(document.body).append('<div id="createWall">Create Wall</div>');
			$(document.body).append('<div id="createDoor">Create Door</div>');


			//keep track of which wall we are dragging
			this.dragObject = null;
			this.lastMouseEvent = null;
			$(document.body).mousedown(function(e){

				//check to see if the user clickedover a wall
				if(getPickObjectID())
				{
					//only allowed to drag walls
					if(vwf.getProperty(getPickObjectID(),'SSGType') === 'wall')
					{
						this.dragObject = getPickObjectID();
						this.lastMouseEvent = e;
					}
				}
			});

			// no longer dragging
			$(document.body).mouseup(function(e){
				this.dragObject = null;
				this.lastMouseEvent = null;
			});

			$(document.body).mousemove(function(e){
				
				//get the dist to the mouse point
				var dist = vwf.views[0].lastPick ? vwf.views[0].lastPick.distance : 1;

				//if we're dragging an enabled object
				if(this.dragObject && vwf.getProperty(this.dragObject,'enabled') === true) 
				{

					//get the camera
					var camera = findCamera();

					var matrixWorldInverse = new THREE.Matrix4();
					matrixWorldInverse.getInverse( camera.matrixWorld );
			 

			 		var worldToView = new THREE.Matrix4();
					worldToView.multiplyMatrices( camera.projectionMatrix, matrixWorldInverse );
				
					//find the matrix that takes view space to worlds space
					var ViewToWorld = new THREE.Matrix4();
					ViewToWorld.getInverse( worldToView );
					
					//move the old mouse location from screen space to view space
					var x = (this.lastMouseEvent.clientX/$(window).width())*2-1;
					var y = (-this.lastMouseEvent.clientY/$(window).height())*2-1;
					x *= $(window).width()/2;
					y *= $(window).height()/2;
					//don't forget the aspect ratio!
					x /= $(window).width()/$(window).height();
					var screenOffsetA = new THREE.Vector3(x,y,dist||0);
					//now we have the worldspace point on the plane parallel to the near and far planes at depth dist
					var worldOffsetA = screenOffsetA.applyMatrix4(ViewToWorld);
					
					//same again for current mouse pos
					var x = (e.clientX/$(window).width())*2-1;
					var y = (-e.clientY/$(window).height())*2-1;
					x *= $(window).width()/2;
					y*= $(window).height()/2;
					x /= $(window).width()/$(window).height();
					var screenOffsetB = new THREE.Vector3(x,y,	dist||0);

					//now we have the worldspace point on the plane parallel to the near and far planes at depth dist
					var worldOffsetB = screenOffsetB.applyMatrix4(ViewToWorld);

					//find the translation
					var oldTranslation = vwf.getProperty(this.dragObject,'translation');
					
					//add to the translation of the object the worldspace offset vector

					//if the object can move in each axis, add the offset to the positoin
					if(vwf.getProperty(this.dragObject,'moveX') === true)
						oldTranslation[0] += worldOffsetB.x - worldOffsetA.x;
					if(vwf.getProperty(this.dragObject,'moveY') === true)
						oldTranslation[1] += worldOffsetB.y - worldOffsetA.y;
					if(vwf.getProperty(this.dragObject,'moveZ') === true)
						oldTranslation[2] += worldOffsetB.z - worldOffsetA.z;

					//send the new position back into the VWF
					vwf_view.kernel.setProperty(this.dragObject,'translation',oldTranslation);

					
					//keep track of the last mouse location
					this.lastMouseEvent = e;

				}
			});

			$('#createWall').button();
			$('#createDoor').button();

			$('#createWall').click(function()
			{

				var walldef = {
					extends: 'http://vwf.example.com/node3.vwf',
    				implements:['SSGObject.vwf'],
    				source: 'wall.dae'	,
    				type: 'model/vnd.collada+xml',
    				properties:{
    					SSGType:'wall',
    					translation:[Math.random()*5-10,Math.random()*5-10,Math.random()*5-10],
    					moveX:true,
    					moveY:true,
    					moveZ:true,
    				},
    				scripts:[
    				"this.transformChanged = function()"+
    				"{"+
    					"this.SSGUpdate(this.transform);"+
    				"}"
    				]


				
				};
				var newname = 'Wall' + Math.random();
				
				vwf_view.kernel.createChild(vwf.application(),newname,walldef);
			})

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