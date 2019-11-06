const request = require('request');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const siteURL = 'https://kortladdning3.chalmerskonferens.se';

// find and paste in userInfo cookie here. Repeat once a year
const userInfo = 'userInfo=1B21544D042A18117342D60657B21C69F73BA30F74A6D87EDEFEF4F63F768022D4224648313082E019A766C11B995A73D5C02F32E8127ECC7B5BF1E7F5871092A9EA677E35BE4E6C0C85CA8CB776D9CEF172701CEE0456E031ED2E141F174D3A3CF6CA020323EC7C88016E58FD69711FC8F965E45A46D966EC1DE1F81D00411A5B8572EEFA57467F8F540F92CF71CE0F764D2649A7A6FAA17241E5195BB9B10DB75AD512B94AB983E88B26DD5EF1FC65E3DA2A742800BBAA565466EAEFE25B86FD72C88BD8EA40C0844C63CB577A534ED3592E9EC04F414238A69F61B4AE4D9BF7BD83A9A26D4A5D1DEB09FE72331C3A'

let cookieJar = request.jar();


let options = {
  url: siteURL,
  jar: cookieJar,
  headers: {
    'Accept': '*/*',
    'Accept-Encoding': 'br', // mby not necessary
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Cookie': userInfo,
    'Referer': siteURL,
    'User-Agent': '' // Any User-Agent header must be sent
  }
};


main();

async function main() {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()

  await page.goto(siteURL)
  await page.screenshot({ path: '1.png' })

  const cookies = await page.cookies()
  console.log(cookies)


  const cookies1 = [{
    'name': 'userInfo',
    'value': '1B21544D042A18117342D60657B21C69F73BA30F74A6D87EDEFEF4F63F768022D4224648313082E019A766C11B995A73D5C02F32E8127ECC7B5BF1E7F5871092A9EA677E35BE4E6C0C85CA8CB776D9CEF172701CEE0456E031ED2E141F174D3A3CF6CA020323EC7C88016E58FD69711FC8F965E45A46D966EC1DE1F81D00411A5B8572EEFA57467F8F540F92CF71CE0F764D2649A7A6FAA17241E5195BB9B10DB75AD512B94AB983E88B26DD5EF1FC65E3DA2A742800BBAA565466EAEFE25B86FD72C88BD8EA40C0844C63CB577A534ED3592E9EC04F414238A69F61B4AE4D9BF7BD83A9A26D4A5D1DEB09FE72331C3A'
  },{
    'name': 'cookie2',
    'value': 'val2'
  },{
    'name': 'cookie3',
    'value': 'val3'
  }];

  console.log("HEEEEEEEEEEEEEEJ")
  console.log(cookies1)

  await page.setCookie(...cookies1);
  await page.goto(siteURL)
  await page.screenshot({path: '2.png'})

  await browser.close();
  return
}

/* request.get({ url: siteURL, jar: cookieJar }, (err, res, body) => {
  options.headers.Cookie += getSessionCookie(err, res, body)

  request(options, printResult)
}) */

function getSessionCookie(err, res, body) {
  if (err || res.statusCode !== 200) { console.log({ err: err }, res.statusCode); return }
  const cookieString = cookieJar.getCookieString(siteURL)

  // console.log(cookieString)
  return ';' + cookieString
}

function printResult(err, res, body) {
  if (err || res.statusCode !== 200) { console.log({ err: err }, res.statusCode); return }
  const $ = cheerio.load(body)
  // console.log(res.headers)

  const html = $.html()
  // console.log(html)
  // console.log($('document'))

  console.log($('#txtPTMCardValue').html())
}