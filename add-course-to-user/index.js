const path = require('path');
const fs = require('fs-extra');

const arr = require('./proc/exl.json')
const arr2 = require('./proc/db.json')

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
      console.log(`${a.name} length ${b.length}`)
      failAry = failAry.concat(b)
      duplicateCnt += b.length
      continue
    }
    const [bb] = b;
    if (bb.account.toLowerCase().includes(a.account.toLowerCase())) {
      if (gAccounts.has(bb._id)) {
        console.log(`Duplicated db id ${bb._id}`)
        continue
      }
      const str = `${bb._id},${bb.name || bb.nickname},${a.name},${bb.account.toLowerCase()},${a.account.toLowerCase()}`
      gAccounts.set(bb._id, str);
    }
  }

  gAccounts.forEach((ss, k) => {
    res.push(ss)
  })

  console.log(`not found ${notFountCnt}`)
  console.log(`duplicate cnt ${duplicateCnt}`)
  
  await fs.writeFile(path.resolve(__dirname, './done/tmp.csv'), res.join('\n'));
  await fs.writeFile(path.resolve(__dirname, './done/failTmp.json'), JSON.stringify(failAry, null, 4));
  await fs.writeFile(path.resolve(__dirname, './done/notFound.json'), JSON.stringify(notFoundAry, null, 4));
}

async function main() {
  await filtering()
}

main().catch(ex => console.log(ex));
