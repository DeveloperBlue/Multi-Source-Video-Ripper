/*
	TO DO

	If the requested format is not available,
	download best and convert to required format.

	Display the Thumbnail of the video

	Force setting directory on first launch

	Link sanitation

	Rename video before downloading
	(If video title ends in extension, remove it?)

	Keep track of when a download is in progress so the user can't break anything
	When a download finishes, back to main screen with a
	FINISHED DOWNLOADING XXXXX [Open]

	If the program is not focused when the video completes,
	https://electronjs.org/docs/tutorial/notifications
	Ping with notification

	Set and Open download directory
	Show Developer's name
	Show GitHub repository
	Show all available source websites with search (Scrape them)

	Reject live videos

	REWORK

	Intro screen is TITLE above the URL input

	POSSIBLE FUTURE
	Download thumbnail?
	Rate Limit
	Auto Update
	Logging downloads



*/

const electron = require("electron");
const youtubeDL = require("youtube-dl");

const url = require("url");
const path = require("path");
const fs = require("fs");

const {app, BrowserWindow, ipcMain, Menu, dialog} = require("electron");


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

var lastPushedURL = {
	url  : null,
	info : null,
}


/*

	Electron-Specific

*/

function createWindow () {

	// Create the browser window.
	win = new BrowserWindow({width: 800, height: 600, frame:false});

	// and load the index.html of the app.
	win.loadFile('index.html');

	// Open the DevTools.
	win.webContents.openDevTools();

	// Emitted when the window is closed.
	win.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		win = null;
	});

	ipcMain.on('app-focus', () => {
		log('Main process is gaining focus');
		app.focus();
	});
	
	return win;
	
}


/*

	Helper Methods

*/

function createLog(log_data){

	fs.writeFile("./logs/log.txt", log_data, function(e) {
		if(e) {
			return console.log(e);
		}

		console.log("Created Log");
	}); 

}

function selectDirectory() {
	dialog.showOpenDialog(mainWindow, {
		properties: ['openDirectory']
	})
}

/*

	Server-Client Transmissions

*/

function message(message, content){
	
	var bullet = {
		request : message,
		payload : content
	}

	win.webContents.send("message", bullet);

}

ipcMain.on("message", (event, arg) => {

	var request = arg.request;

	if (request == "incoming_url"){

		var url = arg.payload;

		try {

			youtubeDL.getInfo(url, ["-j"], function(error, info){

				if (error){
					// Invalid URL
					console.log("A YouTubeDL getInfo error has occured. ", error);
					lastPushedURL.url = null;
					lastPushedURL.info = null;
					message("url_information", "404");
					return;

				}

				createLog(JSON.stringify(info, null, "\t"));

				lastPushedURL.url = url;
				lastPushedURL.info = info;
				message("url_information", info);
		
			});

		} catch (e){
			console.log("A YoutubeDL error occured. ", e);
		}

	} else if (request == "begin_url_download"){

		var requestedExtension = arg.payload.replace(".", "");

		var download = youtubeDL(lastPushedURL.url, ["-o --format=" + requestedExtension +"/best"]);

		var finalSize;
		var chunkLength = 0;

		download.on("info", function(info){
			console.log("Download Info First of Size ", info.size);
			finalSize = info.size; // or filesize_approx if not available
			message("download_information", info);
		});

		download.on("data", function(chunk){

			chunkLength += chunk.length;

			if (finalSize != null){
				var percent = ((chunkLength/finalSize)*100).toFixed(2);
				message("download_size_update", percent);
			}
		})

		download.on("end", function(){
			message("download_completed");
		})

		download.pipe(fs.createWriteStream(lastPushedURL.info.title + "." + requestedExtension));
	
	} else if (request == "select_directory"){

		selectDirectory();

	} else if (request == "request_supported_extractors"){

		youtubeDL.getExtractors(null, function(err, list) {

			message("download_extractor_list", list); // JSON.toString(list));

		});
	}

});

	// This method will be called when Electron has finished
	// initialization and is ready to create browser windows.
	// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

	// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
})

app.on('activate', () => {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (win === null) {
		createWindow();
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
