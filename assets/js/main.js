var {ipcRenderer, remote} = require('electron');  

var currentVideo = null;
var currentExtension = null;


var pane_map = {

	"input" 		: "input-main-div",
	"loading" 		: "input-loading-div",
	"content" 		: "content-main-div",
	"setup"			: "input-setup-div",
	// "preferences"	: "",
	"supported"		: "supported-sources-div"

}

var cached_extractors;


function showPane(pane){
	
	for (paneIndex in pane_map){

		var paneElement = $("." + pane_map[paneIndex]);
		console.log("Showing " + pane + " pane.");

		if (pane == paneIndex){

			paneElement.removeClass("hidden");

		} else {

			paneElement.addClass("hidden");

		}
	}
}

function setProgressBar(percentage){
	console.log("Percentage ", percentage);
	$("#download-progress-bar").children(":first").attr('aria-valuenow', percentage).css("width", percentage + "%");
}

$(window).ready(function(){

	/* 

		Topbar

	*/

	// Window Buttons

	$("#app-quit").click(function(){
		remote.getCurrentWindow().close();
	})

	$("#app-resize").click(function(){
		
	})

	$("#app-minimize").click(function(){
		
	})

	// Application Menu

	$("#menu-app-about").click(function(){

	})

	$("#menu-app-reload").click(function(){
		remote.getCurrentWindow().reload();
	})

	$("#menu-app-quit").click(function(){
		remote.getCurrentWindow().close();
	})

	$("#menu-app-open_dir").click(function(){

	})

	$("#menu-app-preferences").click(function(){

	})

	$("#menu-app-logs").click(function(){

	})

	$("#menu-app-report").click(function(){

	})

	$("#menu-app-supported").click(function(){
		if (cached_extractors == null){
			message("request_supported_extractors");
			showPane("loading");
		} else {
			showPane("supported");
		}
	})

	$("#menu-app-check_updates").click(function(){

	})

	$(".supported-sources-return").click(function(){
		showPane("input");
	})

	/*

		Setup

	*/

	showPane("input");

	$(".setup-change-btn").click(function(){

	})

	$(".proceed-btn").click(function(){

		if ($(".input-bar").val().replace(/ /g, "") == ""){
			console.log("Invalid URL");
			return;
		}

		currentVideo = null;

		$(".input-bar").prop("disabled", true);
		showPane("loading");
		$(".input-bar").prop("disabled", false);

		$(".return-btn").html("Change Source <i class=\"typcn typcn-arrow-back-outline\"></i>");
	
		setProgressBar(0);

		$(".download-btn").removeClass("hidden");
		$("#download-progress-bar").addClass("hidden");
		$(".download-complete-div").addClass("hidden")

		message("incoming_url", $(".input-bar").val());

	})

	$(".download-btn").click(function(){

		if (currentVideo == null){
			// There's no video available?
			showPane("input");
			return;
		}

		$(".download-btn").prop("disable", true);
		$(".proceed-btn").prop("disable", true);

		setProgressBar(0);

		$(".download-btn").addClass("hidden");
		$("#download-progress-bar").removeClass("hidden");
		$(".download-complete-div").addClass("hidden");

		message("begin_url_download", currentExtension);

	})

	$(".return-btn").click(function(){
		// Abandon download/go back and enter a different video.
		currentVideo = null;

		$(".input-bar").prop("disabled", false);
		showPane("input");

	})

	currentExtension = ".mp3"

	$("#converter-extension-dropdown").find(".dropdown-item").click(function(){
		currentExtension = $(this).text();
		$(".proceed-btn").text("Download " + $(this).text());
	})

	/*

		Supported Websites Parser

	*/

	$(".supported-sources-clear-button").click(function(){
		$(".supported-sources-search-input").val("");
	})

	$(".supported-sources-search-input").change(updateSupportedSearch);


})


function updateSupportedSearch(){

	var inputQuery = $(".supported-sources-search-input").val();

	$(".supported-sources-div-list").empty();

	if (inputQuery.replace(/ /g, "") == ""){
		
		// Dump all info

		for (extractorIndex in cached_extractors){
			$(".supported-sources-div-list").append("<p class = \"text-white supported-sources-div-item\">" + cached_extractors[extractorIndex] + "</p>");
		}
		
	} else {

		// Dump search

		var clonedList = JSON.parse(JSON.stringify(cached_extractors));

		function assignValue(item){
			if (item.toLowerCase().startsWith(inputQuery.toLowerCase())){
				return 2;
			} else if (item.toLowerCase().includes(inputQuery.toLowerCase())){
				return 1;
			} else {
				return 0;
			}
		}

		clonedList.sort(function(a, b){
			return (assignValue(a) > assignValue(b));
		})

		for (extractorIndex in clonedList){

			if (clonedList[extractorIndex].toLowerCase().includes(inputQuery.toLowerCase())){
				$(".supported-sources-div-list").append("<p class = \"text-white supported-sources-div-item\">" + clonedList[extractorIndex] + "</p>");
			}

		}
		
	}

}


/*

	Server-Client Transmissions

*/

function message(message, content){

	var bullet = {
		request : message,
		payload : content
	}

	ipcRenderer.send("message", bullet);

}

ipcRenderer.on("message", (event, arg) => {
	
	var request = arg.request;

	if (request == "url_information"){

		var info = arg.payload;

		if (info == "404"){
			// Invalid URL

			alert("Invalid URL");
			currentVideo = null;
			$(".input-bar").prop("disabled", false);
			showPane("input");

		} else {
			//

			currentVideo = info;

			$("#details-title").text(info.title);
			$("#details-author").text(info.uploader);
			$("#details-length").text(info.duration);
			$(".image-preview").attr("src", info.thumbnail);

			showPane("content");

		}

	} else if (request == "download_information"){

		var info = arg.payload;

		console.log("DOWNLOAD INFORMATION: ", info);

	} else if (request == "download_size_update"){

		var percentage = arg.payload;

		console.log("Percentage Update: ", percentage);

		setProgressBar(percentage);

	} else if (request == "download_extractor_list"){

		cached_extractors = arg.payload;

		showPane("supported");
		updateSupportedSearch();

	} else if (request == "download_completed"){

		$(".download-complete-div").removeClass("hidden");
		$(".return-btn").html("Convert Again <i class=\"typcn typcn-arrow-back-outline\"></i>");
	
	}
	
});