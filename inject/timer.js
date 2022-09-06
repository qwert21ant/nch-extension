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