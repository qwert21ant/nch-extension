async function getHistory(taskset){
	return my_ajax("get_old_tasks/" + taskset)
	.then(JSON.parse)
	.then(async tasks => {
		let result = [];
		for(let task of tasks){
			let task_data = await my_ajax("get_task/" + taskset + "/" + task.user_task_id, null, {user_task_id: task.user_task_id}).then(JSON.parse);

			let type = task.my_verdict == 2 ? "task" : "review";
			let reward = task_data.reward / 1000;
			let status = ["unknown0", "in_review", "accepted", "unknown3", "abandoned", "postponed"][task.status];
			let quality = ["LQ", "GQ", "OS"][task.quality];

			if(type == "task" && status == "accepted")
				reward *= [0.75, 1, 1.25][task.quality];
			else if(type == "task" && status != "accepted")
				reward = 0;

			result.push({
				task_id: task_data.user_task_id,
				title: task_data.short_descr,
				reward: reward,
				type: type,
				status: status
			});
		}
		return result;
	})
	.catch(console.log);
}

function cntReward(tasks){
	let res = 0;
	for(let i = 0; i < tasks.length; i++)
		res += tasks[i].reward;
	return res;
}

function cntRewardGroups(tasks){
	let res = {task: {}, review: {}};
	for(let task of tasks){
		if(task.reward in res[task.type]) res[task.type][task.reward]++;
		else res[task.type][task.reward] = 1;
	}
	return res;
}