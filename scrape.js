const request = require('request')
const cheerio = require('cheerio')

const siteURL = 'https://kortladdning3.chalmerskonferens.se'
const CARDNUMBER = 3819297030875221

let cookieJar = request.jar();
let cookieString;

let options = {
  url: siteURL,
  jar: cookieJar,
  headers: {
    'Cookie': 'AspxAutoDetectCookieSupport=1; ASP.NET_SessionId=zdzcs15tf2yvvbysjdwjix15; cookieconsent_dismissed=yes; userInfo=A867718FF0054D7E15A4ACF5F1BC8709F3018376A78F1DF977007524C2AA6A3C0225B79F1C0A4688816BB4BA9D922349B87B099E20DF776A609E09A1353124D9347679804859A8EAD9AFF6D4345897E766DEF9AC3E4003395CA0DF035DEA210D94831FD39E19F552CE090F3EA0BC670A1D53A8E0709406C0DA2D4613868876CDD34CBBB6237B23FC223BD8B44EE96989AD04C2B9CAF3CEC497C7E7531214EEBBFDF18DA18E061C0F093A438DB0C500BB9E83C10C84BC19BD02A4FA64977F5D1B9DC0BF8359AB44C0D9B3D2F67FFD165240AAA60210414DBADEAC5CF5CA3EB601B5ABBAC899F12BA7C4528E287F18F259; ASP.NET_SessionId=edltaeeo3jvuo4zv4dtvaej0',
    'User-Agent': '', // Any User-Agent header must be sent,
    'Referer': 'https://kortladdning3.chalmerskonferens.se/',
    'Connection': 'keep-alive',
    'Accept-Encoding': 'br', // mby not necessary
    'Cache-Control': 'no-cache',
    'Accept': '*/*'
  }
}

let test = {
  url: 'https://kortladdning3.chalmerskonferens.se',
  // method: 'get',
  jar: cookieJar,
}

// supposed to be self-invoking function to do everything
function main() {

}

request.get({ url: siteURL, jar: cookieJar }, (err, res, body) => {
  getSessionCookie(err, res, body)
  request.post(options, (err, res, body) => {
    // printResult(err, res, body)
  })
})

function getSessionCookie(err, res, body) {
  // if (err || res.statusCode !== 200) { console.log(err, res.statusCode); return }
  cookieString = cookieJar.getCookieString(siteURL)
  options.headers.Cookie = cookieString
  console.log(options.headers.Cookie);
}

function printResult(err, res, body) {
  // if (err || res.statusCode !== 200) { console.log(err, res.statusCode); return }
  const $ = cheerio.load(body)
  console.log(res.headers)

  const html = $.html()
  // console.log(html)
  // console.log($('document'))


  const cookies = cookieJar.getCookies(options.url)
  console.log(cookies)

  console.log($('#txtPTMCardValue').html())
}

return
request(options, (err, res, body) => {
  if (err || res.statusCode !== 200) return
  const $ = cheerio.load(body)
  console.log(res.headers)

  const html = $.html()
  // console.log(html)
  // console.log($('document'))


  const cookie_string = cookieJar.getCookies(options.url)
  const cookies = cookieJar.getCookies(options.url)
  console.log(cookie_string, cookies)
  console.log(cookieJar)

  console.log($('#txtPTMCardValue').html())
})