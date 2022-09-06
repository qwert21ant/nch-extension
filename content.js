const Q = x => document.querySelector(x);

// injecting script

function injectScript(name){
	let s = document.createElement("script");
	s.src = chrome.runtime.getURL("inject/" + name);
	s.onload = function() {
	    this.remove();
	};
	document.body.appendChild(s);
}

injectScript("reviews.js");
injectScript("account.js");
injectScript("answers.js");
injectScript("tools.js");

// show panel

(async () => {
	let panelEl = document.createElement("div");
	panelEl.className = "config_panel";
	panelEl.style.display = "none";
	
	let panelHTML = `
	<div class="config_bar">
		<div><b>Account:</b></div>
		<select id="acc_tag_select"
			onchange="AccMan.changeAccountRequest(Q('#acc_tag_select').value)">`;

	for(let tag in await Storage.getAcc())
		panelHTML += "<option>" + tag + "</option>";

	panelHTML += `
		</select>
	</div>
	`;

	panelEl.innerHTML = panelHTML;
	document.body.appendChild(panelEl);

	let btnEl = document.createElement("div");
	btnEl.className = "cfg_btn";
	btnEl.innerHTML = `<img src="` + chrome.runtime.getURL("icons/gear.svg") + `"></img>`;
	btnEl.onclick = () => {
		if(panelEl.style.display == "none") panelEl.style.display = "block";
		else panelEl.style.display = "none";
		btnEl.firstChild.classList.toggle("cfg_btn_rot");
	};
	document.body.appendChild(btnEl);
})();

async function updateSelect(){
	let selEl = Q("#acc_tag_select");
	selEl.innerHTML = "";

	let accs = await Storage.getAcc();
	for(let tag in accs)
		selEl.innerHTML += "<option>" + tag + "</option>";

	if(!Object.keys(accs).length) return;

	let tag = Object.keys(accs)[0];
	window.postMessage({from: "CONTENT", to: "INJECT", operation: "change", tag: tag, id: accs[tag][0], key: accs[tag][1]});
}

// message listener

window.addEventListener("message", async e => {
	let msg = e.data;
	if(!msg.from || msg.from == "CONTENT") return;
	
	if(msg.to != "CONTENT"){
		if(msg.to == "WORKER") chrome.runtime.sendMessage(msg);
		return;
	}

	if(msg.operation == "add"){
		if(!msg.tag || !msg.id || !msg.key){
			Q("div.config_panel .err_holder").innerHTML = "Empty tag/id/key";
			Q("div.config_panel .suc_holder").innerHTML = "";
			return;
		}

		if(await Storage.getAcc(msg.tag)){
			Q("div.config_panel .err_holder").innerHTML = "This tag already exists";
			Q("div.config_panel .suc_holder").innerHTML = "";
			return;
		}

		await Storage.setAcc(msg.tag, msg.id, msg.key);
		Q("div.config_panel .err_holder").innerHTML = "";
		Q("div.config_panel .suc_holder").innerHTML = "Success";

		Q("#acc_form input[name='tag']").value = "";
		Q("#acc_form input[name='id']").value = "";
		Q("#acc_form input[name='key']").value = "";

		updateSelect();
	}else if(msg.operation == "get"){
		let res = await Storage.getAcc(msg.tag);

		window.postMessage({from: "CONTENT", to: "INJECT", operation: "change", tag: msg.tag, id: res[0], key: res[1]});
	}else if(msg.operation == "get_rw_config"){
		let rw_timeout = await Storage.get("rw_timeout");
		let rw_sound = await Storage.get("rw_sound");

		window.postMessage({from: "CONTENT", to: "INJECT", operation: "get_rw_config", rw_timeout: rw_timeout, rw_sound: rw_sound});
	}
});

chrome.runtime.onMessage.addListener(msg => {
	if(msg.to != "CONTENT"){
		if(msg.to == "INJECT") window.postMessage(msg);
		return;
	}
});