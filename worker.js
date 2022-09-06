importScripts("storage.js");

//--------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
	Storage.get("acc_data").then(data => {
		if(!data) Storage.set("acc_data", {});
	});

	Storage.get("rw_timeout").then(data => {
		if(!data) Storage.set("rw_timeout", 5000);
	});

	Storage.get("rw_sound").then(data => {
		if(!data) Storage.set("rw_sound", "https://btones.b-cdn.net/fetch/3b/3bec0aa4e5f2930ec166b1f360df0dbe.mp3");
	});
});

chrome.action.onClicked.addListener(() => {
	chrome.runtime.openOptionsPage();
});