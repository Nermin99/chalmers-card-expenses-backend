const request = require('request');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');

const startDate = "2012-12-12" // scrape from this date to present

const siteURL = 'https://kortladdning3.chalmerskonferens.se';

let cookies = [];
let cookieJar = request.jar();

let requestOptions = {
  url: siteURL,
  jar: cookieJar,
  headers: {
    // 'Cookie': userInfo.string,
    // 'Referer': siteURL, // Might help tricking the system
    'User-Agent': '' // Any User-Agent header must be sent
  }
};

function getSessionCookie() {
  return new Promise((resolve, reject) => {
    request(requestOptions, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        console.log({ err: err }, res.statusCode);
        reject(error)
      }

      const cookieString = cookieJar.getCookieString(siteURL)
      resolve(cookieString)
    })
  })
}

async function saveUserInfo(userInfo) {
  const contents = readFile('.env', 'utf8')
  const newContent = contents.replace(/userInfo=.*/, userInfo.string)
  writeFile(newContent, '.env')
}

async function userLogIn(page2, cardNumber) {
  const browser = await puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
    args: [`--window-size=${770},${850}`]
    // slowMo: 250 // slow down by 250ms
  })
  const page = await browser.newPage()
  page.on('console', msg => console.log('PAGE LOG:', msg.text())) // log 'console logs' on client
  await page.setViewport({
    width: 770,
    height: 850
  })

  cookies.push({
    'name': 'cookieconsent_dismissed',
    'value': 'yes',
    'url': siteURL
  });
  await page.setCookie(...cookies)

  // console.log(cookies);

  // await page.screenshot({ path: 'screenshots/1.png' })

  await page.goto(siteURL)
  // if (cardNumber) {
  //   await page.evaluate(card => {
  //     console.log(card)
  //   }, cardNumber)
  // }

  // if (cardNumber) {
  //   await page.setRequestInterception(true);
  //   page.on('request', request => {
  //     const data = {
  //       'method': 'POST',
  //       'postData': `txtCardNumber=3819297030875221`
  //     }
  //     request.continue(data)
  //   });
  // }

  // Guarantees "remember me" - button always clicked
  await page.waitForSelector('#chkRememberMe', {
    timeout: 0
  }).then(() => {
    // page.screenshot({ path: 'screenshots/2.png' })
    page.evaluate(() => {
      document.querySelector('#btnLogin').addEventListener('click', () => {
        document.querySelector('#chkRememberMe').checked = true;
      })
    })
  })

  await page.waitForSelector('#txtPTMCardValue', {
    visible: true,
    timeout: 0
  })
  // await page.screenshot({ path: 'screenshots/3.png' })

  const userInfoCookie = (await page.cookies(siteURL)).find(obj => obj.name === 'userInfo')

  if (!userInfoCookie) throw Error("Cookie was not set after login!")

  const usInfo = {
    name: 'userInfo',
    value: userInfoCookie.value,
    string: 'userInfo=' + userInfoCookie.value.toString()
  };

  browser.close() // no need to wait
  return usInfo
}

async function getUserInfo(page) {
  let contents;
  try {
    contents = fs.readFileSync('.env', 'utf8')
  } catch (err) {
    console.error(err)
    process.exit();
  }

  const cardNumber = contents.match(/(?<=CARDNUMBER=).+/)
  const userInfoValue = contents.match(/(?<=userInfo=).+/)

  if (userInfoValue) {
    return { name: 'userInfo', value: userInfoValue[0] }
  } else {
    const userInfo = await userLogIn(page, cardNumber)
    saveUserInfo(userInfo)
    return userInfo
  }
}

async function navigateToStatements(page, userInfo) {
  cookies.push({
    'name': userInfo.name,
    'value': userInfo.value,
    'url': siteURL
  });
  await page.setCookie(...cookies)

  await page.goto(siteURL, { waitUntil: 'domcontentloaded' }) // go to logged in site

  await page.click('#btnAccountStatements') // go to account statements - page
  // await page.screenshot({ path: 'screenshots/2-statements_page.png', fullPage: true })

  const balance = await page.evaluate(date => {
    const fromDate = document.querySelector('#txtStatementStartDate')
    fromDate.value = date // set starting date

    // Just for getting the account balance
    return document.querySelector('#txtPTMCardValue').innerText;
  }, startDate)

  await page.click('#btnCheckAccountStatement') // show account statements
  // await page.screenshot({ path: 'screenshots/3-statements.png', fullPage: true })

  return balance
}

function getJsonData(serializedHTML) {
  const $ = cheerio.load(serializedHTML)
  const rows = $('#accountStatementSection tbody tr')

  const jsonData = [];
  let date;

  for (let i = rows.length - 2; i >= 0; i--) {
    const row = $(rows[i])

    const name = $(row.children()[0]).text()

    if (name === "Summa köp") {
      date = $(row.children()[4]).text()
      continue
    }

    const price = $(row.children()[3]).text().replace(/\-/, '')

    jsonData.push({
      date: date,
      name: name,
      price: price
    })
  }
  return jsonData.reverse()
}

function saveToCSV(jsonData) {
  const writeStream = fs.createWriteStream('RESULTS/statements.csv')
  writeStream.write(`Datum, Namn, Pris \n`)

  jsonData.map(row => {
    writeStream.write(`${row.date}, \"${row.name}\", \"${row.price}\" \n`)
  })

  writeStream.end();
}

function saveToJSON(jsonData) {
  jsonString = JSON.stringify(jsonData)
  fs.writeFile('RESULTS/statements.json', jsonString, err => {
    if (err) console.log(err)
  })
}

async function main() {
  // const sessionCookie = (await getSessionCookie()).split('=')
  // console.log(sessionCookie)

  const browser = await puppeteer.launch({
    // headless: false,
    // slowMo: 250 // slow down by 250ms
  })
  const page = await browser.newPage()
  page.on('console', msg => console.log('PAGE LOG:', msg.text())) // log 'console logs' on client
  await page.goto(siteURL, { waitUntil: 'domcontentloaded' }) // get session cookies

  cookies = await page.cookies(siteURL)
  await page.setCookie(...cookies)

  const userInfo = await getUserInfo(page)

  // return await browser.close()

  const balance = await navigateToStatements(page, userInfo);

  const html = await page.content() // serialized HTML
  const jsonData = getJsonData(html)

  saveToCSV(jsonData)
  saveToJSON(jsonData)

  browser.close();
  return console.log(`Balance: ${balance}kr`)
}

main();

function readFile(filePath = '.env', encoding = 'utf8') {
  try {
    return fs.readFileSync(filePath, encoding).toString()
  } catch (err) {
    console.error(err)
  }
}

function writeFile(dataString, filePath = '.env') {
  fs.writeFile(filePath, dataString, err => {
    if (err) console.log(err)
  })
}