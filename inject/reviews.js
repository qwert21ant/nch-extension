const Q = x => document.querySelector(x);

window.catchTId = null;

let divTask = document.getElementById("divTask");

async function my_ff(response){
	if(!response.ok){
		response.text()
		.then(text => {
			if(text.startsWith('Traceback'))
				text = text.trim().split('\n').splice(-1)[0];

			throw new Error("Request to server failed with: " + response.statusText + "\n\n" + text);
		});
	}
	return response.text();
}

async function my_ajax(page, optionalQ, optionalArgs){
	args = optionalArgs || {}
	optionalQ = optionalQ || ""

	return new Promise((res, rej) => {
		window.contract.account.signTransaction('app.nearcrowd.near', [nearApi.transactions.functionCall('v2', args, 0, 0)])
		.then(arr => {
			let encodedTx = btoa(String.fromCharCode.apply(null, arr[1].encode()));

			fetch('/v2/' + page + '/' + encodeURIComponent(encodedTx) + optionalQ)
			.then(response => my_ff(response))
			.then(res)
			.catch(rej);
		})
		.catch(rej);
	});
}

async function raw_ajax(page, optionalQ, optionalArgs){
	args = optionalArgs || {}
	optionalQ = optionalQ || ""

	return new Promise((res, rej) => {
		window.contract.account.signTransaction('app.nearcrowd.near', [nearApi.transactions.functionCall('v2', args, 0, 0)])
		.then(arr => {
			let encodedTx = btoa(String.fromCharCode.apply(null, arr[1].encode()));

			fetch(page + '/' + encodeURIComponent(encodedTx) + optionalQ)
			.then(response => my_ff(response))
			.then(res)
			.catch(rej);
		})
		.catch(rej);
	});
}

function silentClaimReview(tasksetOrd){
	my_ajax("claim_review/" + tasksetOrd)
	.then(async x => {
		if(!window.catchTId) return;

		console.log(x);
		if(x == "no_reviews") return;
		try {
			JSON.parse(x);
		} catch(err) {
			claimReviewInner(tasksetOrd, x);
			stopCatch(true);
			return;
		}

		window.reviewSound.play();
		stopCatch();
		claimReviewInner(tasksetOrd, x);
	})
	.catch(err => {
		stopCatch(true);

		alert(err.message);
	});
}

function startCatch(tasksetOrd, switchBtn){
	if(switchBtn){
		Q("button[name='claim_review']").setAttribute("disabled", "");
		Q("button[name='catch_review']").style.display = "none";
		Q("button[name='decatch_review']").style.display = "inline-block";
	}

	silentClaimReview(tasksetOrd)
	window.catchTId = setInterval(() => silentClaimReview(tasksetOrd), window.reviewTimeout);
}

function stopCatch(switchBtn){
	if(switchBtn){
		Q("button[name='claim_review']").removeAttribute("disabled");
		Q("button[name='catch_review']").style.display = "inline-block";
		Q("button[name='decatch_review']").style.display = "none";
	}

	clearInterval(window.catchTId);
	window.catchTId = null;
}

function saveReviewTimeout(){
	let el = Q("input[name='rw_timeout']");
	if(Number(el.value) <= 500){
		el.focus();
		return;
	}
	
	window.reviewTimeout = Number(el.value);
	window.postMessage({from: "INJECT", to: "CONTENT", operation: "set_rw_timeout", rw_timeout: Number(el.value)});
}

let selectTasksetInner_ = selectTasksetInner;
selectTasksetInner = (tasksetOrd, x) => {
	selectTasksetInner_(tasksetOrd, x);
	
	let dx = null;
	try {
		dx = JSON.parse(x);
	} catch(err) {
		return;
	}

	if(tasksetOrd == 750) return;

	if(dx.status == "free" && dx.can_claim_review_in == "00:00:00"){
		let reviewBtn = Array.prototype.find.call(
			Array.from(divTask.children),
			el => el.innerHTML == "Claim Review"
		);
		reviewBtn.setAttribute("name", "claim_review");
		reviewBtn.style = "margin-right: 10px;";

		let catchBtn = document.createElement("button");
		catchBtn.setAttribute("name", "catch_review");
		catchBtn.innerHTML = "Catch Review";
		catchBtn.style = "margin-right: 10px;";

		let decatchBtn = document.createElement("button");
		decatchBtn.setAttribute("name", "decatch_review");
		decatchBtn.innerHTML = "Stop Catching";
		decatchBtn.style = "margin-right: 10px; display: none;";

		catchBtn.addEventListener("click", () => startCatch(tasksetOrd, true));
		decatchBtn.addEventListener("click", () => stopCatch(true));

		divTask.insertBefore(decatchBtn, reviewBtn.nextSibling);
		divTask.insertBefore(catchBtn, decatchBtn);
	}
};

let showTasksets_ = showTasksets;
showTasksets = () => {
	stopCatch();

	showTasksets_();
};