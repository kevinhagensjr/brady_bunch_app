		
	//constants
	const uploadLimit = 4;
	const uploadLocation = 'uploads/';
	const outputFileName = 'brady_bunch.mp4';
	const videoFormats = ['video/quicktime','video/x-flv','video/mp4','video/quicktime','video/x-ms-wmv'];
		
	//get global modules
	var app       = getExpressModule();
	var upload    = getMulterModule();
	
	//parse get requests
	app.get('/', function (req,res){
		
		console.log('fetching home page..');
		
		let index = '/views/index.html'; //get index page location
		res.sendFile(__dirname + index); //return index page
		
	});
	
	//post request for upload
	app.post('/submit',upload.array('file',uploadLimit),function(req,res){
		
		var videos = req.files; //get video files
		
		console.log('newly uploaded files: ',videos);
		
		let error = '/views/error.html'; //get error page location
		
		//check to make sure there are 4 files uploaded & videos are in correct format
		if(videos.length != 4 || !checkVideoFormat(videos)){ 
			
			console.log("Client uploaded wrong number of videos, or videos are in incorrect format");
			
			removeVideos(videos); 				//remove files from uploads folder
			res.sendFile(__dirname + error)		//return index page
			
		}else{
			
			setBradyBunchFilter(videos,res);	 //set brady bunch filter 
		}
			
	}); 
	
	/*
		desc: checks through all uploaded videos to ensure they have proper video mimetype before conversion
		@param array - array of videos uploaded by the user	
	*/
	function checkVideoFormat(videos){
		
		console.log('checking to make sure videos are in correct format..');
		
		for(var i = 0; i < videos.length; i++){
			
			let currentVideoFormat = videos[i]['mimetype'];		//get curernt video file name
			
			if(videoFormats.indexOf(currentVideoFormat) < 0)	//check to see if video format is supported
				return false;
		}
	
		return true;
	}
	
	/*
		desc: removes uploaded videos from video directory, excluding the final output video
		@param array - array of videos uploaded by the user	
	*/
	function removeVideos(videos){
		
		const fs = require('fs');
		
		for(var i=0; i < videos.length; i++){
			
			var currentVideoPath = videos[i]['path']; //get current video path
			
			fs.unlink(currentVideoPath, (err) => {	  //delete video from directory
				
				if(!err){
					console.log('successfully deleted video');
				}
			});
		}
	}
	
	/* 
		@desc: takes in video array and response object and converts video to brady bunch format
		@param array  - array of videos uploaded by the user	
		@param object - express.js response object from post request 
	*/
	function setBradyBunchFilter(videos,res){
		
		//set proper variables
		var path = uploadLocation + outputFileName;
		var video1 = videos[0]['path'];
		var video2 = videos[1]['path'];
		var video3 = videos[2]['path'];
		var video4 = videos[3]['path'];
		
		var ffmpeg  = getFFMPEGModule();
		
		ffmpeg.input(video1).input(video2).input(video3).input(video4)
		.complexFilter([
			
			'nullsrc=size=640x480 [background]', 				  		//set background frame
			'[0:v] setpts=PTS-STARTPTS, scale=320x240 [topleft]', 		//set video position @ zero, scale down vidoes
			'[1:v] setpts=PTS-STARTPTS, scale=320x240 [topright]',
			'[2:v] setpts=PTS-STARTPTS, scale=320x240 [bottomleft]',
			'[3:v] setpts=PTS-STARTPTS, scale=320x240 [bottomright]',
			'[background][topleft] overlay=shortest=1 [v1]', 			//set video 1 to upper left corner,  stop video when shortest video stops
			'[v1][topright] overlay=shortest=1:x=320 [v2]',   			//set video 2 to upper right corner, stop video when shortest video stops
			'[v2][bottomleft] overlay=shortest=1:y=240 [v3]', 			//set vieo 3 to lower left corner, stop video when shortest video stops
			'[v3][bottomright] overlay=shortest=1:x=320:y=240'     		//set video 4 to lower right corner, stop video when shortest video stops
		])
		
		.save(path)
		
		.on('start', function(commandLine) {
	 
		 	console.log('video conversersion has started..');
  		
  		})
  		 .on('end', function(stdout, stderr) {
  		
  		 	console.log('video conversion complete!');
  		 											
  		 	removeVideos(videos);		//remove videos from directory
  		 	
  		 	getDownloadFile(path,res);	//send the new download file to the user
  		 			 	  	  
  		 })
  		  .on('error', function(err, stdout, stderr) {
	  		  
  		  	console.log('Cannot process video: ' + err.message);
  		  	
  		  	/*var error = '/views/error.html'; //get error page location
  		 	res.sendFile(__dirname + error); //send user to error page */ 
  		});	
	}
	
	/*
		@desc: sends download file to user using fs module
		@param string - the local path output file
		@param object - express.js response object from original request 
	*/
	function getDownloadFile(path,res){
		
		console.log('downloading video to client web browser..');
		
		const fs = require('fs');
  	 	let downloadfile = __dirname + '/' + path;
  			 	
 		res.setHeader('Content-disposition', 'attachment; filename=' + outputFileName); //set file headers
  		res.setHeader('Content-type','video/mp4');

  		var filestream = fs.createReadStream(downloadfile); //open file stream, pipe file
 		filestream.pipe(res); 		
	}

	//get express object for framework
	function getExpressModule(){
		
		console.log('fetching express module..');
		
		//get modules
		let express = require('express');
		return express();	
	}
	
	//get multer object for file uploads
	function getMulterModule(){
		
		console.log('fetching multer module..');
		
		let multer = require('multer');		
		return multer({ dest : uploadLocation});
	}
	
	//get ffmpeg module for video manipulation
	function getFFMPEGModule(){
		
		console.log("fetching ffmpeg module..");
		
		let ffmpeg = require('fluent-ffmpeg');
		return ffmpeg();
	}
	
	
	app.listen(2000);