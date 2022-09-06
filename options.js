const Q = x => document.querySelector(x);

const AccTable = Q("table#accs");

var localConfig = {};
var curTab = 0;
var hasChanges = 0;

function globalOnChange(){
	Q("a#save_button").classList.add("saved");
	hasChanges = 1;
}


/* acc table */

function createTD(value, onChange){
	let el = document.createElement("td");

	let input = document.createElement("input");
	input.setAttribute("type", "text");
	input.setAttribute("autocomplete", "off");
	input.value = value;
	input.onchange = () => onChange(input.value);

	el.appendChild(input);

	return el;
}

function createTR(tag, id, key, onChange, onDelete){
	let el = document.createElement("tr");
	let tag_el = createTD(tag, val => onChange(tag, val, null, null));
	el.appendChild(tag_el);
	el.appendChild(createTD(id, val => onChange(tag, null, val, null)));
	el.appendChild(createTD(key, val => onChange(tag, null, null, val)));

	let del = document.createElement("td");
	del.className = "del";
	del.onclick = () => onDelete(tag_el.firstChild.value);

	let imgDel = document.createElement("img");
	imgDel.className = "btn_delete";
	imgDel.src = "icons/cross.svg";
	del.appendChild(imgDel);

	el.appendChild(del);

	AccTable.appendChild(el);
}

async function editAcc(old_tag, tag, id, key){
	if(tag){
		localConfig.acc_data[tag] = localConfig.acc_data[old_tag];
		delete localConfig.acc_data[old_tag];
		old_tag = tag;
	}

	if(id)
		localConfig.acc_data[old_tag][0] = id;

	if(key)
		localConfig.acc_data[old_tag][1] = key;

	globalOnChange();
}

function delAcc(tag){
	delete localConfig.acc_data[tag];
	updateAccList();

	globalOnChange();
}

async function updateAccList(){
	while(AccTable.firstChild != AccTable.lastChild)
		AccTable.removeChild(AccTable.lastChild);

	for(let tag in localConfig.acc_data){
		let id = localConfig.acc_data[tag][0];
		let key = localConfig.acc_data[tag][1];

		createTR(tag, id, key, editAcc, delAcc);
	}
}


/* other params */

function onParamChange(inputElem, param){
	localConfig[param] = inputElem.value;

	globalOnChange();
}

window.onbeforeunload = () => {
	if(hasChanges) return 0;
}


/* init */

(async () => {
	window.location.hash = "accounts";

	let els = Array.from(Q("#tabs").children);
	for(let i = 0; i < 3; i++){
		els[i].onclick = () => {
			els[curTab].classList.toggle("selected");
			els[i].classList.toggle("selected");
			curTab = i;
		};
	}

	Q("a#save_button").onclick = () => {
		Q("a#save_button").classList.remove("saved");

		if(hasChanges)
			chrome.storage.sync.set(localConfig);

		hasChanges = 0;
	};

	localConfig = await Storage.get();

	updateAccList();

	["rw_timeout", "rw_sound"].forEach(param => {
		let el = Q(`input[name="${param}"]`);
		el.value = localConfig[param];
		el.onchange = () => onParamChange(el, param);
	});

	Q("button[name='rw_sound_test']").onclick = () => {
		let aud = new Audio(Q("input[name='rw_sound']").value);
		aud.play();
	};

	Q("button[name='add_acc']").onclick = () => {
		let tag = Q("input[name='acc_tag']");
		let id = Q("input[name='acc_id']");
		let key = Q("input[name='acc_key']");

		if(!tag.value)
			return tag.focus();

		if(!id.value)
			return id.focus();

		if(!key.value)
			return key.focus();

		if(localConfig.acc_data[tag.value])
			return tag.focus();

		localConfig.acc_data[tag.value] = [id.value, key.value];

		updateAccList();
		globalOnChange();
	};
})();