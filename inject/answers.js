var AnswersCollector = {
	task_info: {
		taskset: null,
		id: null,
		mode: null,
		resubmits: null
	},
	answers: {},

	setTaskInfo(taskset, task_id, mode, resubmits){
		this.task_info.taskset = taskset;
		this.task_info.id = task_id;
		this.task_info.mode = ~mode.indexOf('review') ? 'review' : 'task';
		this.task_info.resubmits = resubmits;
	},

	async send(){
		window.postMessage({from: "INJECT", to: "WORKER", operation: "send", task_info: this.task_info, answers: this.answers});
		return new Promise((res, rej) => {
			let tid = setTimeout(() => rej("Timeout"), 5000);

			window.addEventListener("message", async e => {
				let msg = e.data;
				if(!msg.from || msg.from != "WORKER" || msg.operation != "send") return;

				clearTimeout(tid);
				if(msg.status == "error")
					rej(msg.error);

				res(msg.status);
			});
		});
	},

	async find(){
		window.postMessage({from: "INJECT", to: "WORKER", operation: "find", task_info: this.task_info});
		return new Promise((res, rej) => {
			let tid = setTimeout(() => rej("Timeout"), 5000);

			window.addEventListener("message", async e => {
				let msg = e.data;
				if(!msg.from || msg.from != "WORKER" || msg.operation != "find") return;

				clearTimeout(tid);
				if(msg.status == "error")
					rej(msg.error);

				if(msg.status == "task not found")
					res(msg.status);
				else if(msg.status == "task found"){
					if(!msg.answers)
						rej("Empty msg.answers");

					try {
						this.answers = JSON.parse(msg.answers);
					} catch(err) {
						rej("Error on parse msg.answers");
					}
					res(msg.status);
				}

				rej("Unknown status: " + msg.status);
			});
		});
	},

	async collect(){
		if(!this.task_info.taskset || !this.task_info.id){
			console.error("No taskset or id");
			return;
		}

		return new Promise((res, rej) => {
			ajax("get_task/" + this.task_info.taskset + "/" + this.task_info.id, task_data => {
				try {
					task_data = JSON.parse(task_data);
				} catch(err) {
					console.error("An error occured while parsing task_data: " + err.message);
					return;
				}
				
				if(!task_data.pillar_id){
					console.error("No pillar_id in ptask_data");
					return;
				}

				window.contract.account.signTransaction(
					"app.nearcrowd.near",
					[nearApi.transactions.functionCall('pillars', {}, 0, 0)]
				).then(arr => {
					let encodedTx = btoa(String.fromCharCode.apply(null, arr[1].encode()));
					return fetch("/pillars/pillar/" + task_data.pillar_id + "/" + encodeURIComponent(encodedTx));
				})
				.then(response => ff(response))
				.then(pillar_data => {
					try {
						pillar_data = JSON.parse(pillar_data);
					} catch(err) {
						console.error("An error occured while parsing pillar_data: " + err.message);
						return;
					}

					if(!pillar_data.exercises){
						console.error("No exercises in pillar_data");
						return;
					}

					this.parseExercises(
						pillar_data.exercises,
						task_data.mode == "review" || task_data.mode == "oreview",
						pillar_data.answers
					);
					res();
				});
			}, null, {user_task_id: this.task_info.id});
		});
	},

	parseExercises(exercises, isReview, exAnswers){
		this.answers = {};
		for(let [key, exercise] of Object.entries(exercises)){
			try {
				exercise = JSON.parse(exercise);
			} catch(err) {
				console.error("An error occured while parsing exercise: " + err.message);
				return;
			}
			if(!isReview)
				this.answers[key] = this.extractAnswerFromExercise(exercise, 0);
			else{
				if(!exAnswers || !exAnswers[key]) continue;
				this.answers[key] = this.extractAnswerFromExercise(exercise, exAnswers[key].answer);
			}
		}
	},

	extractAnswerFromExercise(exercise, answerId){
		let outType = exercise.outputTypes[exercise.type];
		let exOutput = [exercise.outputs[0], exercise.wrong_output][answerId];

		let answer = {type: outType};

		if(outType == "Text"){
			answer.data = exOutput.text;
		}else if(outType == "Multiple Choice"){
			answer.data = exercise[exercise.type == 4 ? "texts" : "pictures"][0].mc[exOutput.mc[exercise.type]];
		}else if(outType == "Checkboxes"){
			answer.data = [];
			for(let j = 0; j < exOutput.chk[exercise.type].length; j++){
				if(exOutput.chk[exercise.type][j] == true)
					answer.data.push(exercise[exercise.type == 4 ? "texts" : "pictures"][0].mc[j]);
			}
		}

		return answer;
	}
};

window.reviewTimer = {
	time: null,
	tid: null,
	onChange: null,

	start(time_str){
		this.stop();
		
		let _time = time_str.split(":").map(el => Number(el));
		this.time = new Date() - (3600 - _time[0] * 3600 - _time[1] * 60 - _time[2]) * 1000;

		this.tid = setInterval(() => {
			let _time = 3600 - Math.floor((new Date() - this.time) / 1000);
			if(_time <= 0) this.stop();

			if(this.onChange)
				this.onChange(
					[_time / 3600, (_time % 3600) / 60, _time % 60]
					.map(el => ("" + Math.floor(el)).padStart(2, "0"))
					.join(":")
				);
		}, 1000);
	},

	stop(){
		if(this.tid) clearInterval(this.tid);
		this.tid = null;
		this.onChange = null;
	}
};

function saveServerKey(){
	let input = Q("div.config_panel input[name='server_key']");
	if(!input.value){
		input.focus();
		return;
	}

	window.postMessage({from: "INJECT", to: "CONTENT", operation: "set_key", server_key: input.value});
}

function saveServerIP(){
	let input = Q("div.config_panel input[name='server_ip']");
	if(!input.value){
		input.focus();
		return;
	}

	window.postMessage({from: "INJECT", to: "CONTENT", operation: "set_ip", server_ip: input.value});
}

let loadTaskInner_ = loadTaskInner;
loadTaskInner = (tasksetOrd, userTaskId, x, reviewTimeLeft) => {
	try {
		clearInterval(window.catchTId);
	} catch(err) {};

	loadTaskInner_(tasksetOrd, userTaskId, x, reviewTimeLeft);

	let dx = null;
	try {
		dx = JSON.parse(x);
	} catch(err) {
		return;
	}

	AnswersCollector.setTaskInfo(tasksetOrd, dx.user_task_id, dx.mode, dx.resubmits);

	let timeEl = divTask.children[4];

	let idHolder = document.createElement("span");
	idHolder.innerHTML = dx.user_task_id;
	idHolder.style = "font-family: Consolas;";

	divTask.insertBefore(idHolder, divTask.firstChild.nextSibling);
	divTask.insertBefore(document.createTextNode(" :: "), idHolder);

	if(dx.mode != "review") return;

	window.reviewTimer.start(reviewTimeLeft);
	window.reviewTimer.onChange = time_str => timeEl.innerHTML = time_str;
};

let submitReview_ = submitReview;
submitReview = (tasksetOrd, verdict, quality, comment) => {
	if(tasksetOrd == 23)
		AnswersCollector.collect()
		.then(() => AnswersCollector.send())
		.then(() => submitReview_(tasksetOrd, verdict, quality, comment))
		.catch(err => alert(err));
	else
		submitReview_(tasksetOrd, verdict, quality, comment);
};

let submitTask_ = submitTask;
submitTask = (tasksetOrd, resubmits, isAcade) => {
	if(tasksetOrd == 23)
		AnswersCollector.collect()
		.then(() => AnswersCollector.send())
		.then(() => submitTask_(tasksetOrd, resubmits, isAcade))
		.catch(err => alert(err));
	else
		submitTask_(tasksetOrd, resubmits)
};


function findSolution(exercise, answer){
	let outType = exercise.outputTypes[exercise.type];

	if(outType != answer.type) return 0;
	console.log(exercise);
	console.log(answer);
	
	if(outType == "Text"){
		if(exercise.outputs[0].text == answer.data)
			return 1;

		if(exercise.wrong_output.text == answer.data)
			return 2;
	}else if(outType == "Multiple Choice"){
		let ind = -1;

		if(exercise.type == 4) ind = exercise.texts[0].mc.indexOf(answer.data);
		else if(exercise.type == 3) ind = exercise.pictures[0].mc.indexOf(answer.data);

		if(exercise.outputs[0].mc[exercise.type] == ind) return 1;
		if(exercise.wrong_output.mc[exercise.type] == ind) return 2;

		if(exercise.outputs[0].text == answer.data)
			return 1;

		if(exercise.wrong_output.text == answer.data)
			return 2;

	}else if(outType == "Checkboxes"){
		let ind = new Array(exercise.outputs[0].chk[exercise.type].length).fill(null);

		if(exercise.type == 4)
			exercise.texts[0].mc.forEach((el, i) => {
				if(answer.data.includes(el)) ind[i] = true;
			});
		else if(exercise.type == 3)
			exercise.pictures[0].mc.forEach((el, i) => {
				if(answer.data.includes(el)) ind[i] = true;
			});

		if(ind.every((el, i) => !el == !exercise.outputs[0].chk[exercise.type][i]))
			return 1;

		if(ind.every((el, i) => !el == !exercise.wrong_output.chk[exercise.type][i]))
			return 2;

		return 0;
	}

	return 0;
}

function nodeDFS(node, str){
	if(!node.children.length)
		return (node.innerHTML == str) ? node : null;

	for(let el of node.children){
		let res = nodeDFS(el, str);
		if(res) return res;
	}
	return null;
}

let createChapterEditor_ = createChapterEditor;
createChapterEditor = function(
	parentEl, pillarId, chapter, fnWrongSolutions,
	imgs, exercises, saveCallback, readonly,
	isReview, reviewAnswers, revealAnswers, extraConfig){

	let res = createChapterEditor_(
		parentEl, pillarId, chapter, fnWrongSolutions,
		imgs, exercises, saveCallback, readonly,
		isReview, reviewAnswers, revealAnswers, extraConfig);

	if(!readonly) return res;

	AnswersCollector.find()
	.then(fres => {
		if(fres == "task not found"){
			alert("Task not found");
			return;
		}

		let rootEl = document.querySelector("#divTask>span>table>tbody");

		for(let i = 0; i < chapter.length; i++){
			try {
				if(chapter[i].kind != "Exercise") continue;

				let innerId = chapter[i].innerId;

				if(!AnswersCollector.answers[innerId]) continue;

				let exercise = JSON.parse(exercises[innerId]);
				let answer = AnswersCollector.answers[innerId];

				let sol = findSolution(exercise, answer);
				if(sol == 0)
					throw "No solution found for exercise " + innerId;

				let taskEl = rootEl.children[i].children[0].children[0];

				if(sol == 1){
					let el = nodeDFS(taskEl, "Approve Solution 1");
					if(el) el.classList.add("solution");
					else console.log("Solution button not found");

					el = nodeDFS(taskEl, "Solution 1");
					if(el) el.classList.add("solutionText");
					else console.log("Solution text not found");

					el.classList.add("text_sol");
				}else if(sol == 2){
					let el = nodeDFS(taskEl, "Approve Solution 2");
					if(el) el.classList.add("solution");
					else console.log("Solution button not found");

					el = nodeDFS(taskEl, "Solution 2");
					if(el) el.classList.add("solutionText");
					else console.log("Solution text not found");
				}
			} catch(err) {
				console.log(err);
			};
		}
	})
	.catch(err => {
		alert("Error: " + err);
		console.error(err);
	});

	return res;
};