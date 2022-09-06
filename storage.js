const Storage = {
	async get(key){
		if(key)
			return (await chrome.storage.sync.get(key))[key];
		else
			return chrome.storage.sync.get();
	},
	async set(key, value){
		return chrome.storage.sync.set(Object.fromEntries([[key, value]]));
	},
	async del(key){
		return chrome.storage.sync.remove(key);
	},

	async getAcc(tag){
		let acc_data = await this.get("acc_data");
		if(!tag) return acc_data;
		else return acc_data[tag];
	},
	async setAcc(tag, id, key){
		let acc_data = await this.get("acc_data");
		acc_data[tag] = [id, key];
		await this.set("acc_data", acc_data);
	},
	async delAcc(tag){
		let acc_data = await this.get("acc_data");
		if(acc_data[tag]) delete acc_data[tag];
		await this.set("acc_data", acc_data);
	}
};