const path = require('path');
const fs = require('fs-extra');

const arr = require('./proc/exl.json');
const arr2 = require('./proc/db.json');

function successFormat(dbUser, excelUser) {
  return `${dbUser._id},${dbUser.name || dbUser.nickname},${excelUser.name},${dbUser.account.toLowerCase()},${excelUser.account.toLowerCase()}`
}

async function filtering() {
  const res = []
  let failAry = []
  const notFoundAry = []
  const gAccounts = new Map()
  let [notFountCnt, duplicateCnt] = [0, 0, 0]
  for (const a of arr) {

    const b = arr2.filter(x => (x.name === a.name || x.nickname === a.name));
    if (b.length === 0) {
      notFoundAry.push(a);
      notFountCnt += 1
      continue
    }
    if (b.length > 1) {
      // console.log(`${a.name} length ${b.length}`)
      failAry = failAry.concat(b)
      duplicateCnt += b.length
      continue
    }
    const [bb] = b;
    if (bb.account.toLowerCase().includes(a.account.toLowerCase())) {
      if (gAccounts.has(bb._id)) {
        // console.log(`Duplicated db id ${bb._id}`)
        continue
      }
      const str = `${bb._id},${bb.name || bb.nickname},${a.name},${bb.account.toLowerCase()},${a.account.toLowerCase()}`
      gAccounts.set(bb._id, str);
    }
  }

  gAccounts.forEach((ss, k) => {
    res.push(ss)
  })

  // console.log(`not found ${notFountCnt}`);
  // console.log(`duplicate cnt ${duplicateCnt}`);

  const failTmpUserMap = new Map()
  for (const failTmpUser of failAry) { failTmpUserMap.set(failTmpUser._id, failTmpUser) }
  const uniqFailTmpUsers = Array.from(failTmpUserMap.values());

  return {
    tmp: res,
    failTmp: uniqFailTmpUsers,
    notFound: notFoundAry
  }
}

async function filterFailTmp(failTmpUsers) {
  const tmps = [];
  const notFound = [];

  for (const exlUser of arr) {
    const findUsers = failTmpUsers
      .filter(failTmpUser => {
        return exlUser.name === failTmpUser.name
          && failTmpUser.account.toLowerCase().includes(exlUser.account.toLowerCase())
      });

    if (findUsers.length > 1) { console.log('findUsers', findUsers) }

    if (findUsers.length === 0) {
      continue;
    }

    if (findUsers.length === 1) {
      tmps.push(successFormat(findUsers[0], exlUser))
    } else {
      notFound.push(exlUser);
    }
  }

  const tmpMap = new Map()
  for (const tmp of tmps) {
    tmpMap.set(tmp, tmp);
  }
  const uniqTmp = Array.from(tmpMap.values());

  return {
    tmp: uniqTmp,
    notFound
  }
}

async function main() {
  const filteringResult = await filtering();
  const filterFailTmpResult = await filterFailTmp(filteringResult.failTmp);

  const tmps = filteringResult.tmp.concat(filterFailTmpResult.tmp);
  const notFound = filteringResult.notFound.concat(filterFailTmpResult.notFound);

  await fs.writeFile(path.resolve(__dirname, './done/tmp.csv'), tmps.join('\n'));
  await fs.writeFile(path.resolve(__dirname, './done/notFound.json'), JSON.stringify(notFound, null, 4));
}

main().catch(ex => console.log(ex));
