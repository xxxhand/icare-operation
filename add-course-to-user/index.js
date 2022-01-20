const path = require('path');

const fs = require('fs-extra');

const exlArr = require('./proc/exl.json');
const dbArr = require('./proc/db.json');
const studies = require('./proc/study.json')

function successFormat(dbUser, excelUser) {
  return `${dbUser._id},${dbUser.name || dbUser.nickname},${excelUser.name},${dbUser.account.toLowerCase()},${excelUser.account.toLowerCase()}`
}

function uniqExl() {
  const uniqMap = new Map();
  for (const ele of exlArr) {
    uniqMap.set(`${ele.name}${ele.account}`, ele);
  }

  return Array.from(uniqMap.values())
}

async function filtering() {
  const res = []
  let failAry = []
  const notFoundAry = []
  const gAccounts = new Map();
  // exl 搜尋 db 多筆資料
  const duplicateArr = []
  let [notFountCnt, duplicateCnt] = [0, 0, 0]

  const uniqExlAry = uniqExl();
  console.log('exlAry', uniqExlAry.length);
  let duplicateDBCount = 0

  for (const a of uniqExlAry) {
    const b = dbArr.filter(x => (x.name === a.name || x.nickname === a.name));

    if (b.length === 0) {
      notFoundAry.push(a);
      notFountCnt += 1
      continue
    }
    if (b.length > 1) {
      // console.log(`${a.name} length ${b.length}`)
      failAry = failAry.concat(b)
      duplicateArr.push(a)
      // duplicateCnt += b.length
      duplicateCnt++
      continue
    }
    const [bb] = b;
    if (bb.account.toLowerCase().includes(a.account.toLowerCase())) {
      if (gAccounts.has(bb._id)) {
        // console.log(`Duplicated db id ${bb._id}`)
        duplicateDBCount++
        continue
      }
      const str = `${bb._id},${bb.name || bb.nickname},${a.name},${bb.account.toLowerCase()},${a.account.toLowerCase()}`
      gAccounts.set(bb._id, str);
    } else {
      notFoundAry.push(a);
      notFountCnt += 1
    }
  }

  gAccounts.forEach((ss, k) => {
    res.push(ss)
  })

  // exl 重複名字，db 只有一筆
  console.log('duplicateDBCount', duplicateDBCount);
  // exl 一筆資料，db搜尋出多筆
  console.log('duplicateCnt', duplicateCnt);

  const failTmpUserMap = new Map()
  for (const failTmpUser of failAry) { failTmpUserMap.set(failTmpUser._id, failTmpUser) }
  const uniqFailTmpUsers = Array.from(failTmpUserMap.values());

  // db 與 exl 無法比對資料
  console.log('notFoundAry', notFoundAry.length);
  // 
  console.log('first res', res.length);
  return {
    tmp: res,
    failTmp: uniqFailTmpUsers,
    notFound: notFoundAry,
    duplicateArr
  }
}

async function filterFailTmp(failTmpUsers, duplicateArr) {
  console.log('\nround 2-------------------------------------------------------');
  const tmps = [];
  const notFound = [];

  let zeroLength = 0;
  let mulLength = 0;
  let uniqLength = 0;
  for (const exlUser of duplicateArr) {
    const findUsers = failTmpUsers
      .filter(failTmpUser => {
        return exlUser.name === failTmpUser.name
          && failTmpUser.account.toLowerCase().includes(exlUser.account.toLowerCase())
      });

    if (findUsers.length > 1) {
      mulLength++
      notFound.push(exlUser);
      continue;
    }

    if (findUsers.length === 0) {
      zeroLength++
      notFound.push(exlUser);
      continue;
    }

    if (findUsers.length === 1) {
      tmps.push(successFormat(findUsers[0], exlUser))
    }
  }

  const tmpMap = new Map()
  for (const tmp of tmps) {
    if (tmpMap.has(tmp)) {
      uniqLength++
    }

    tmpMap.set(tmp, tmp);
  }
  const uniqTmp = Array.from(tmpMap.values());

  // exl 對 db 數等於 0 次數
  console.log('zeroLength', zeroLength);
  // exl 對 db 數大於 1 次數
  console.log('mulLength', mulLength);
  // 成功uniq後數
  console.log('uniqLength', uniqLength);

  console.log('second notFound', notFound.length)
  // 最後成功數
  console.log('second res', uniqTmp.length)
  return {
    tmp: uniqTmp,
    notFound
  }
}

function filterStudy(tmps) {
  console.log('\nround 3-------------------------------------------------------');
  if (!studies.length) {
    return tmps;
  }

  const yetJoinUsersMap = new Map();
  const filterUsersMap = new Map();
  for (const tmp of tmps) {
    const tmpStrArr = tmp.split(',');
    const userId = tmpStrArr[0];

    const study = studies.find(study => study.userId === userId);
    if (!study) {
      yetJoinUsersMap.set(tmp, tmp);
    } else {
      filterUsersMap.set(tmp, tmp);
    }
  }

  // 未購課人數
  console.log('third res', yetJoinUsersMap.size);
  // 已購課人數
  console.log('already into study', filterUsersMap.size);

  return {
    yetJoinUsers: Array.from(yetJoinUsersMap),
    filterUsers: Array.from(filterUsersMap)
  };
}

async function main() {
  const filteringResult = await filtering();
  const filterFailTmpResult = await filterFailTmp(filteringResult.failTmp, filteringResult.duplicateArr);

  const notFound = filteringResult.notFound.concat(filterFailTmpResult.notFound);
  const tmps = filteringResult.tmp.concat(filterFailTmpResult.tmp);

  // study filter
  const users = filterStudy(tmps)

  await fs.writeFile(path.resolve(__dirname, './done/已購課.csv'), users.filterUsers.join('\n'));
  await fs.writeFile(path.resolve(__dirname, './done/未購課.csv'), users.yetJoinUsers.join('\n'));
  await fs.writeFile(path.resolve(__dirname, './done/notFound.json'), JSON.stringify(notFound, null, 4));
}

main().catch(ex => console.log(ex));
