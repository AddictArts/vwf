require(['module','vwf/view'],function(module,view){
	
	debugger;
	return view.load(module,{
		initalize:function()
		{
			//the view driver is the proper place to detect events from the world and present 
			//an interface to the user. You could detect events from here and post them to the gateway, but 
			//if that post to the gateway causes something to happen and information needs to flow back into the 
			//model (the .yaml file), it needs to happen from within a model driver
			console.log('Save view driver loaded');

		}
	});

})