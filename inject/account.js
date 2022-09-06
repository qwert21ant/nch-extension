const AccMan = {
	async checkAccount(id, key){
		try{
			let keyStore = new nearApi.keyStores.InMemoryKeyStore();
			await keyStore.setKey("mainnet", id, nearApi.KeyPair.fromString(key));

			let nearConfig = {
				keyStore,
				networkId: 	"mainnet",
				nodeUrl: 	"https://rpc.mainnet.near.org",
				contractName: contractName,
				walletUrl: 	"https://wallet.near.org",
				helperUrl: 	"https://helper.mainnet.near.org"
			};

			let acc = await (new nearApi.Near(nearConfig)).account(id);
			let contr = new nearApi.Contract(acc, contractName, {
				viewMethods: ['is_account_whitelisted'],
				changeMethods: []
			});

			let res = await contr.is_account_whitelisted({"account_id": id});
			if(res)
				return {status: 1};
			else
				return {status: 0, error: "Account isn't whitelisted"};
		} catch(err) {
			return {status: 0, error: err.message};
		}
	},

	async changeAccountRequest(tag){
		window.postMessage({from: "INJECT", to: "CONTENT", operation: "get", tag: tag});
	},

	async changeAccount(tag, id, key){
		let checkRes = await this.checkAccount(id, key);
		if(checkRes.status == 0){
			alert("Unable to use this account (id: " + id + "), reason:\n" + checkRes.error);
			return;
		}
		try{
			if(window.changed_account_id == id) return;

			let keyStore = new nearApi.keyStores.InMemoryKeyStore();
			await keyStore.setKey("mainnet", id, nearApi.KeyPair.fromString(key));

			window.nearConfig = {
				keyStore,
			    networkId: "mainnet",
			    nodeUrl: "https://rpc.mainnet.near.org",
			    contractName: contractName,
			    walletUrl: "https://wallet.near.org",
			    helperUrl: "https://helper.mainnet.near.org"
			};

			window.near = new nearApi.Near(window.nearConfig);
			window.account = await window.near.account(id);
			window.contract = new nearApi.Contract(window.account, contractName, {
				viewMethods: ["is_account_whitelisted"],
				changeMethods: []
			});
			window.changed_account_id = id;

			document.title = tag;
		} catch(err) {
			alert("An error occured while changing account to " + id + "\n" + err.message);
			console.log("changeAccount:");
			console.error(err);
		}
	}
}

// listeners

window.addEventListener("load", () => {
	if(!window.history.state || !window.history.state.tag ||
		Array.from(Q("#acc_tag_select").options)
			.map(el => el.value)
			.indexOf(window.history.state.tag) == -1)
		AccMan.changeAccountRequest(Q("#acc_tag_select").value);
	else{
		Q("#acc_tag_select").value = window.history.state.tag;
		AccMan.changeAccountRequest(window.history.state.tag);
	}

	window.postMessage({from: "INJECT", to: "CONTENT", operation: "get_rw_config"});
});

window.addEventListener("beforeunload", () => {
	let sel = Q("#acc_tag_select");
	window.history.pushState({tag: sel.value}, "");
});

window.addEventListener("message", async e => {
	let msg = e.data;
	if(!msg.from) return;
	if(msg.from == "INJECT") return;

	if(msg.to != "INJECT") return;

	if(msg.operation == "change"){
		if(!msg.tag || !msg.id || !msg.key){
			console.log("Bad message from CONTENT (operation: get)");
			return;
		}

		AccMan.changeAccount(msg.tag, msg.id, msg.key);
	}else if(msg.operation == "get_rw_config"){
		if(!msg.rw_timeout){
			console.log("Bad message from CONTENT (operation: get_rw_timeout)");
			return;
		}

		window.reviewTimeout = msg.rw_timeout;
		window.reviewSound = new Audio(msg.rw_sound);
	}
});