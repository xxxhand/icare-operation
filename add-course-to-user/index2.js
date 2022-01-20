const path = require('path');

const fs = require('fs-extra');

const courseUsers = require('./proc/db.json');
const studies = require('./proc/study.json');

async function main() {
	const userMap = new Map()
	const buyCourseUsers = []
	const notBuyCourseUsers = []

	for (const study of studies) {
		userMap.set(study.userId);
	}

	for (const courseUser of courseUsers) {
		if (userMap.has(courseUser._id)) {
			buyCourseUsers.push(`${courseUser._id}, ${courseUser.account}, ${courseUser.name}, ${courseUser.nickname}`)
			continue
		}
		notBuyCourseUsers.push(`${courseUser._id}, ${courseUser.account}, ${courseUser.name}, ${courseUser.nickname}`)
	}

	await fs.writeFile(path.resolve(__dirname, './done/已購課.csv'), buyCourseUsers.join('\n'));
	await fs.writeFile(path.resolve(__dirname, './done/未購課.csv'), notBuyCourseUsers.join('\n'));
}

main().catch(err => console.log('err.stack', err.stack))