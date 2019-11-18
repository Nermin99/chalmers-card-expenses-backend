const request = require('request');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');
const bcrypt = require('bcrypt');

// find and paste in userInfo cookie here. Repeat once a year
const userInfo = {
  string: 'userInfo=1B21544D042A18117342D60657B21C69F73BA30F74A6D87EDEFEF4F63F768022D4224648313082E019A766C11B995A73D5C02F32E8127ECC7B5BF1E7F5871092A9EA677E35BE4E6C0C85CA8CB776D9CEF172701CEE0456E031ED2E141F174D3A3CF6CA020323EC7C88016E58FD69711FC8F965E45A46D966EC1DE1F81D00411A5B8572EEFA57467F8F540F92CF71CE0F764D2649A7A6FAA17241E5195BB9B10DB75AD512B94AB983E88B26DD5EF1FC65E3DA2A742800BBAA565466EAEFE25B86FD72C88BD8EA40C0844C63CB577A534ED3592E9EC04F414238A69F61B4AE4D9BF7BD83A9A26D4A5D1DEB09FE72331C3A'
  , name: 'userInfo'
  , value: '1B21544D042A18117342D60657B21C69F73BA30F74A6D87EDEFEF4F63F768022D4224648313082E019A766C11B995A73D5C02F32E8127ECC7B5BF1E7F5871092A9EA677E35BE4E6C0C85CA8CB776D9CEF172701CEE0456E031ED2E141F174D3A3CF6CA020323EC7C88016E58FD69711FC8F965E45A46D966EC1DE1F81D00411A5B8572EEFA57467F8F540F92CF71CE0F764D2649A7A6FAA17241E5195BB9B10DB75AD512B94AB983E88B26DD5EF1FC65E3DA2A742800BBAA565466EAEFE25B86FD72C88BD8EA40C0844C63CB577A534ED3592E9EC04F414238A69F61B4AE4D9BF7BD83A9A26D4A5D1DEB09FE72331C3A'
}

const startDate = "2012-12-12" // scrape from this date to present

const siteURL = 'https://kortladdning3.chalmerskonferens.se';
let cookies = [];
let cookieJar = request.jar();

let requestOptions = {
  url: siteURL,
  jar: cookieJar,
  headers: {
    'Cookie': userInfo.string,
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
  const newContent = contents.replace(/userInfo=/, userInfo.string)
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

  await page.waitForSelector('#txtPTMCardValue', {
    visible: true,
    timeout: 0
  })
  await page.screenshot({ path: 'screenshots/1.png' })

  const userInfoCookie = (await page.cookies(siteURL)).find(obj => obj.name === 'userInfo')

  if (!userInfoCookie) console.error("Cookie was not set after login!")

  const usInfo = {
    name: 'userInfo',
    value: userInfoCookie.value,
    string: 'userInfo=' + userInfo.value.toString()
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

async function navigateToStatements(page, uInfo) {
  cookies.push({
    'name': uInfo.name,
    'value': uInfo.value,
    'url': siteURL
  });
  await page.setCookie(...cookies)

  await page.goto(siteURL, { waitUntil: 'domcontentloaded' }) // go to logged in site

  await page.click('#btnAccountStatements') // go to account statements - page
  // await page.screenshot({ path: 'screenshots/2-statements_page.png', fullPage: true })

  await page.evaluate(date => {
    const fromDate = document.querySelector('#txtStatementStartDate')
    fromDate.value = date // set starting date
  }, startDate)

  await page.click('#btnCheckAccountStatement') // show account statements
  // await page.screenshot({ path: 'screenshots/3-statements.png', fullPage: true })
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

  const usInfo = await getUserInfo(page)

  // return await browser.close()

  await navigateToStatements(page, usInfo);

  const html = await page.content() // serialized HTML
  const jsonData = getJsonData(html)

  saveToCSV(jsonData)
  saveToJSON(jsonData)

  console.log("Done.")
  return await browser.close();
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