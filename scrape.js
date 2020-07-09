const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');

const startDate = "2012-12-12" // scrape from this date to present

const siteURL = 'https://kortladdning3.chalmerskonferens.se';

let cookies = [];

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(siteURL, { waitUntil: 'domcontentloaded' })
  // page.on('console', msg => console.log('PAGE LOG:', msg.text())) // log 'console logs' on client

  cookies = await page.cookies(siteURL) // save the

  const userInfo = await getUserInfo()
  const balance = await navigateToStatements(page, userInfo);

  const html = await page.content() // serialized HTML
  const jsonData = getJsonData(html)

  saveToCSV(jsonData)
  saveToJSON(jsonData)

  browser.close();
  return console.log(`Balance: ${balance}kr`)
})().catch(err => {
  console.error(err)
})

// returns the userInfo-cookie
async function getUserInfo() {
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
    const userInfo = await userLogIn(cardNumber)
    saveUserInfo(userInfo)
    return userInfo
  }
}

// manual login when no cookie was saved
async function userLogIn(cardNumber) {
  const browser = await puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
    args: [`--window-size=${770},${850}`]
  })
  const page = await browser.newPage()
  await page.setViewport({
    width: 770,
    height: 850
  })
  // page.on('console', msg => console.log('PAGE LOG:', msg.text())) // log 'console logs' on client

  cookies.push({
    'name': 'cookieconsent_dismissed',
    'value': 'yes',
    'url': siteURL
  });
  await page.setCookie(...cookies)
  await page.goto(siteURL)
  await clickOnRememberMe(page)

  await page.waitForSelector('#txtPTMCardValue', {
    visible: true,
    timeout: 0
  })

  const userInfoCookie = (await page.cookies(siteURL)).find(obj => obj.name === 'userInfo')
  if (!userInfoCookie) throw Error("Cookie was not set after login!")

  const userInfo = {
    name: 'userInfo',
    value: userInfoCookie.value,
    string: 'userInfo=' + userInfoCookie.value.toString()
  };

  browser.close()
  return userInfo
}

// save the userInfo-cookie to the .env file
async function saveUserInfo(userInfo) {
  const contents = readFile('.env', 'utf8')
  const newContent = contents.replace(/userInfo=.*/, userInfo.string)
  writeFile(newContent, '.env')
}

// open site and naviage to the the statements
async function navigateToStatements(page, userInfo) {
  cookies.push({
    'name': userInfo.name,
    'value': userInfo.value,
    'url': siteURL
  });
  await page.setCookie(...cookies)

  await page.goto(siteURL, { waitUntil: 'domcontentloaded' }) // go to logged in site
  try {
    await page.click('#btnAccountStatements') // go to account statements - page
  } catch (err) {
    console.error("Can't login. Possible outdated cookie? \n")
  }

  const balance = await page.evaluate(date => {
    const fromDate = document.querySelector('#txtStatementStartDate')
    fromDate.value = date // set starting date
    return document.querySelector('#txtPTMCardValue').innerText; // account balance
  }, startDate)

  await page.click('#btnCheckAccountStatement') // show account statements
  return balance
}

// scrape the html for name, date and price
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


/* Helper Functions */

// Guarantees "remember me" - button always clicked
async function clickOnRememberMe(page) {
  await page.waitForSelector('#chkRememberMe', {
    timeout: 0
  }).then(() => {
    page.evaluate(() => {
      document.querySelector('#btnLogin').addEventListener('click', () => {
        document.querySelector('#chkRememberMe').checked = true;
      })
    })
  })
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
  jsonString = JSON.stringify(jsonData, null, 2)
  fs.writeFile('RESULTS/statements.json', jsonString, err => {
    if (err) console.log(err)
  })
}

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
