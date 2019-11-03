const request = require('request')
const cheerio = require('cheerio')

const CARDNUMBER = 3819297030875221;

let formData = {
  __VIEWSTATE: '',
  __VIEWSTATEGENERATOR: '',
  __EVENTVALIDATION: '',
  hiddenIsMobile: 'desktop',
  txtCardNumber: CARDNUMBER,
  SavedCardNumber: '',
  btnNext: 'N%C3%A4sta'
}

let options = {
  url: 'https://kortladdning3.chalmerskonferens.se',
  form: formData
}

request('https://kortladdning3.chalmerskonferens.se', (err, res, body) => {
  if (err || res.statusCode !== 200) return
  const $ = cheerio.load(body)
  console.log($.html())

  const viewstate = $('#__VIEWSTATE').attr('value')
  const viewstategenerator = $('#__VIEWSTATEGENERATOR').attr('value')
  const eventvalidation = $('#__EVENTVALIDATION').attr('value')

  formData.__VIEWSTATE = viewstate
  formData.__VIEWSTATEGENERATOR = viewstategenerator
  formData.__EVENTVALIDATION = eventvalidation
  console.log(formData)

  request(options, callback)
})

function callback(err, res, body) {
  if (err || res.statusCode !== 200) return
  const $ = cheerio.load(body)
  console.log($.html())

  const captcha = $('.LBD_CaptchaDiv')
  console.log(captcha)
}