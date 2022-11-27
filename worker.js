importScripts("storage.js");

//--------------------------------------------------

async function sendAnswers(key, task_info, answers){
	if(await Storage.get("server_status") != 1)
		return {status: "disabled"};

	return fetch("http://" + (await Storage.get("server_ip")) + ":8080/api/task", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({"operation": "set", "key": key, "task_info": task_info, "answers": JSON.stringify(answers)})
	}).then(resp => {
		if(!resp.ok)
			throw new Error("Responce status: " + resp.status);

		return resp.json();
	}).catch(err => {
		return {status: "error", error: err.message};
	});
}

async function findAnswers(key, task_info){
	if(await Storage.get("server_status") != 1)
		return {status: "disabled"};

	return fetch("http://" + (await Storage.get("server_ip")) + ":8080/api/task", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({"operation": "find", "key": key, "task_info": task_info})
	}).then(resp => {
		if(!resp.ok)
			throw new Error("Responce status: " + resp.status);

		return resp.json();
	}).catch(err => {
		return {status: "error", error: err.message};
	});
}

//--------------------------------------------------

chrome.runtime.onMessage.addListener(async (msg, sender) => {
	if(!msg.from || msg.from == "WORKER" || msg.to != "WORKER") return;

	let tabId = sender.tab.id;

	if(msg.operation == "send"){
		sendAnswers(await Storage.get("server_key"), msg.task_info, msg.answers).then(res => {
			chrome.tabs.sendMessage(tabId, {from: "WORKER", to: msg.from, operation: "send", ...res});
		}).catch(err => {
			console.log(err);
		});
	}else if(msg.operation == "find"){
		findAnswers(await Storage.get("server_key"), msg.task_info).then(res => {
			chrome.tabs.sendMessage(tabId, {from: "WORKER", to: msg.from, operation: "find", ...res});
		}).catch(err => {
			console.log(err);
		});
	}
});

chrome.runtime.onInstalled.addListener(() => {
	Storage.get("acc_data").then(data => {
		if(!data) Storage.set("acc_data", {});
	});

	Storage.get("server_status").then(data => {
		if(!data) Storage.set("server_status", 0);
	});

	Storage.get("server_ip").then(data => {
		if(!data) Storage.set("server_ip", "");
	});

	Storage.get("server_key").then(data => {
		if(!data) Storage.set("server_key", "");
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