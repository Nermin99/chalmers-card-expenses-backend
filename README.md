# NOTE: The chalmers statements website has been replaced with a new and improved one, thus rendering this project obsolete!

# chalmers-statemets-scraper
Temporary Node.js scraper for your chalmers-card account statements, until Chalmers decides to build an API.

## Setup
### Prerequisites
Make sure [git](https://git-scm.com/) and [npm](https://nodejs.org/en/) is installed.

### Installing
```
git clone https://github.com/Nermin99/chalmers-statements-scraper.git
cd chalmers-statements-scraper
cp .env.example .env
npm install
```

## Starting
The first time you will be prompted for a manual login, in order to save your cookie, thereafter it's handled automatically (for another year).

To run the app:
```
npm start
```

## Handling the Data
If all went smooth, two new files (.csv and .json) were created under 'RESULTS/'. They contain all of your chalmers purchases in terms of objects of **date**, **name** and **price**. You do as you wish with your own data.

### Importing to Excel
1. Import -> CSV file.
2. Select Delimited data
3. File origin: UTF-8
4. Delimiters: ☑️Comma ☑️Space
5. ☑️Treat consecutive delimiters as one
6. Text qualifier: "
