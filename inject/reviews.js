const Q = x => document.querySelector(x);

let divTask = document.getElementById("divTask");

let catchers = [];

function stopCatchers(){
    for(let catcher of catchers)
        catcher.stopCatch();
    catchers = [];
}

async function my_ff(response){
    return new Promise(async (res, rej) => {
        let text = await response.text();
        if(!response.ok){
            if(text.startsWith('Traceback'))
                text = text.trim().split('\n').splice(-1)[0];

            //throw new Error("Request to server failed with: " + response.statusText + "\n\n" + text);
            rej("Request to server failed with: " + response.statusText + "\n\n" + text);
        }
        res(text);
    });
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

class ReviewCatcher {
    constructor(optionalQ){
        this.catchTId = null;
        this.claimBtn = null;
        this.catchBtn = null;
        this.decatchBtn = null;
        this.optionalQ = optionalQ || null;
    }

    createButtons(parentEl, claimBtn, tasksetOrd){
        claimBtn.setAttribute("name", "claim_review");
        claimBtn.style["margin-right"] = "10px";

        let catchBtn = document.createElement("button");
        catchBtn.setAttribute("name", "catch_review");
        catchBtn.innerHTML = "Catch Review";
        catchBtn.style = "margin-right: 10px;";

        let decatchBtn = document.createElement("button");
        decatchBtn.setAttribute("name", "decatch_review");
        decatchBtn.innerHTML = "Stop Catching";
        decatchBtn.style = "margin-right: 10px; display: none;";

        catchBtn.addEventListener("click", () => this.startCatch(tasksetOrd, true));
        decatchBtn.addEventListener("click", () => this.stopCatch(true));

        parentEl.insertBefore(decatchBtn, claimBtn.nextSibling);
        parentEl.insertBefore(catchBtn, decatchBtn);

        this.claimBtn = claimBtn;
        this.catchBtn = catchBtn;
        this.decatchBtn = decatchBtn;
    }

    startCatch(tasksetOrd, switchBtn){
        if(switchBtn){
            this.claimBtn.setAttribute("disabled", "");
            this.catchBtn.style.display = "none";
            this.decatchBtn.style.display = "inline-block";
        }

        if(this.catchTId)
            this.stopCatch();

        this.silentClaimReview(tasksetOrd);
        this.catchTId = setInterval(() => this.silentClaimReview(tasksetOrd), window.reviewTimeout);
    }

    stopCatch(switchBtn){
        if(switchBtn){
            this.claimBtn.removeAttribute("disabled");
            this.catchBtn.style.display = "inline-block";
            this.decatchBtn.style.display = "none";
        }

        clearInterval(this.catchTId);
        this.catchTId = null;
    }

    silentClaimReview(tasksetOrd){
        my_ajax("claim_review/" + tasksetOrd, this.optionalQ)
        .then(async x => {
            if(!this.catchTId) return;

            console.log(x);
            if(x == "no_reviews" || x == "") return;
            try {
                JSON.parse(x);
            } catch(err) {
                claimReviewInner(tasksetOrd, x);
                this.stopCatch(true);
                return;
            }

            window.reviewSound.play();
            this.stopCatch();
            claimReviewInner(tasksetOrd, x);
        })
        .catch(err => {
            this.stopCatch(true);

            alert(err.message);
        });
    }
};

function findChildNode(parent, str){
    return Array.prototype.find.call(
        Array.from(parent.children),
        el => el.innerHTML == str
    );
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

function showAcadeCatchButton(x){
    let dx = null;
    try {
        dx = JSON.parse(x);
    } catch(err) {
        return;
    }

    let par_el = Q("#divTask span ul");
    for(let i = 0; i < dx.length; i++){
        let li_el = par_el.children[i];
        let claimBtn = findChildNode(li_el, "Claim Review");
        let catcher = new ReviewCatcher("?acade_id=" + dx[i].pillar_set_id);
        catcher.createButtons(li_el, claimBtn, 750);
        catchers.push(catcher);
    }
}

let ajax_ = ajax;
ajax = (page, callback, optionalQ, optionalArgs) => {
	args = optionalArgs || {};
	optionalQ = optionalQ || "";
	if(page == "load_acade_projects"){
		window.contract.account.signTransaction('app.nearcrowd.near', [nearApi.transactions.functionCall('v2', args, 0, 0)])
		.then(arr => {
			let encodedTx = btoa(String.fromCharCode.apply(null, arr[1].encode()));
			fetch('/v2/' + page + '/' + encodeURIComponent(encodedTx) + optionalQ)
			.then(response => my_ff(response))
			.then(x => {
                callback(x);
                showAcadeCatchButton(x);
            })
			.catch(errorOut);
		}).catch(errorOut);
	} else {
		window.contract.account.signTransaction('app.nearcrowd.near', [nearApi.transactions.functionCall('v2', args, 0, 0)])
        .then(arr => {
            let encodedTx = btoa(String.fromCharCode.apply(null, arr[1].encode()));
            fetch('/v2/' + page + '/' + encodeURIComponent(encodedTx) + optionalQ)
            .then(response => my_ff(response))
            .then(x => callback(x))
            .catch(errorOut);
        }).catch(errorOut);
	}
};

let selectTasksetInner_ = selectTasksetInner;
selectTasksetInner = (tasksetOrd, x) => {
	selectTasksetInner_(tasksetOrd, x);
	
	let dx = null;
	try {
		dx = JSON.parse(x);
	} catch(err) {
		return;
	}

	if(tasksetOrd == 750)
        return;

	if(dx.status == "free" && dx.can_claim_review_in == "00:00:00"){
        let claimBtn = findChildNode(divTask, "Claim Review");
        let catcher = new ReviewCatcher();
        if(claimBtn){
            catcher.createButtons(divTask, claimBtn, tasksetOrd);
            catchers.push(catcher);
        }
    }
};

let showTasksets_ = showTasksets;
showTasksets = () => {
	stopCatchers();

	showTasksets_();
};