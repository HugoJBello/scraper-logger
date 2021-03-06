const express = require('express');
const MysqlDataAccess = require("../scraperDataProcess/MysqlDataAccess");
const GeoJsonGeneratorFromBoundingBox = require("../scraperDataProcess/GeoJsonGeneratorFromBoundingBox");
const GeoJsonGeneratorFromCusec = require("../scraperDataProcess/GeoJsonGeneratorFromCusec");

const geoJsonGeneratorBoundingBox = new GeoJsonGeneratorFromBoundingBox();
const geoJsonGeneratorCusec = new GeoJsonGeneratorFromCusec();

require('dotenv').load();

const db = new MysqlDataAccess(process.env["MYSQL_HOST"], process.env["MYSQL_USER"], process.env["MYSQL_PASSWORD"], process.env["MYSQL_DATABASE"]);

const router = express.Router();
//http://localhost:3001/mysql-summary-scraping/geoJson/?city=Alcalá de Henares&scraping_id=scraping-airbnb-gCloud--2018-11-29_14_04_43
//http://localhost:3001/mysql-summary-scraping/geoJson/?city=Alcobendas&scraping_id=scraping-fotocasa-raspberryOld--12_12_2018,_9_23_14_AM

router.get('/geoJson/',
    (req, res) => {
        let scrapingId;
        let city;
        if (req.query.city) city = req.query.city;
        if (req.query.scraping_id) scrapingId = req.query.scraping_id;
        getGeoJson(city, scrapingId, res);
    });

//http://localhost:3001/mysql-summary-scraping/results/?city=Alcalá de Henares&scraping_id=scraping-airbnb-gCloud--2018-11-29_14_04_43
router.get('/results/',
    (req, res) => {
        let scrapingId;
        let city;
        if (req.query.city) city = req.query.city;
        if (req.query.scraping_id) scrapingId = req.query.scraping_id;
        getResults(city, scrapingId, res);
    });

//http://localhost:3001/mysql-summary-scraping/scraped_cities/?scraping_id=scraping-airbnb-gCloud--2018-11-29_14_04_43
router.get('/scraped_cities/',
    (req, res) => {
        let city;
        let scrapingId;
        if (req.query.scraping_id) scrapingId = req.query.scraping_id;
        getScrapedCities(scrapingId, res);
    });

//http://localhost:3001/mysql-summary-scraping/processInfo/?device_id=raspberryOld&scraping_id=scraping-airbnb-gCloud--2018-11-29_14_04_43
router.get('/processInfo/',
    async (req, res) => {
        let scrapingId;
        let device_id;
        if (req.query.scraping_id) scrapingId = req.query.scraping_id;
        if (req.query.device_id) device_id = req.query.device_id;
        await getProcessInfo(device_id, scrapingId, res);
    });

//http://localhost:3001/mysql-summary-scraping/scrapingRemaining/?device_id=raspberryOld
router.get('/scrapingRemaining/',
    async (req, res) => {
        let device_id;
        if (req.query.device_id) device_id = req.query.device_id;
        await getScrapingRemaining(device_id, res);
    });

//http://localhost:3001/mysql-summary-scraping/scrapingRemainingAllDevices
router.get('/scrapingRemainingAllDevices/',
    async (req, res) => {
        await getScrapingRemainingAllDevices(res);
    });


getGeoJson = async (city, scrapingId, res) => {
    console.log("----> city " + city + " id " + scrapingId);
    const result = await db.getScrapingResultsCity(city, scrapingId);
    console.log(result);
    let geoJson;
    if (result[0]["method"] === "cusec") {
        geoJson = geoJsonGeneratorCusec.generateGeoJsonFromResultFromCusec(result);
    } else {
        geoJson = geoJsonGeneratorBoundingBox.generateGeoJsonFromResult(result);

    }

    return res.json(geoJson);
}

getResults = async (city, scrapingId, res) => {
    console.log("----> city " + city + " id " + scrapingId);
    const result = await db.getScrapingResultsCity(city, scrapingId);
    return res.json(result);
}

getScrapedCities = async (scrapingId, res) => {
    console.log("----> id " + scrapingId);
    const result = await db.getScrapedCities(scrapingId);
    return res.json(result);
}

getProcessInfo = async (device_id, scrapingId, res) => {
    console.log("----> id " + device_id);
    const result = {};
    const scrapedNum = await db.getScrapedCount(device_id, true);
    const scrapedRemaning = await db.getScrapedCount(device_id, false);
    const lastPiece = await db.getLastPiece(scrapingId);
    result["scraped_pieces"] = scrapedNum;
    result["scraped_remaining"] = scrapedRemaning;
    result["scraped_pieces_percent"] = scrapedNum / (scrapedNum + scrapedRemaning) * 100;
    result["last_piece"] = lastPiece[0]["scraping_id"];
    console.log(result);
    return res.json(result);
}

getScrapingRemaining = async (device_id, res) => {
    console.log("----> id " + device_id);
    const result = {};
    const scrapedNum = await db.getScrapedCount(device_id, true);
    const scrapedRemaning = await db.getScrapedCount(device_id, false);
    result["scraped_pieces"] = scrapedNum;
    result["scraped_remaining"] = scrapedRemaning;
    result["scraped_pieces_percent"] = scrapedNum / (scrapedNum + scrapedRemaning) * 100;
    console.log(result);
    return res.json(result);
}

getScrapingRemainingAllDevices = async (res) => {
    const result = {};
    const listDevices = await db.listDevices();
    for (device_id of listDevices) {
        device_id = device_id.device_id;
        result[device_id] = {};
        const scrapedNum = await db.getScrapedCount(device_id, true);
        const scrapedRemaning = await db.getScrapedCount(device_id, false);
        result[device_id]["scraped_pieces"] = scrapedNum;
        result[device_id]["scraped_remaining"] = scrapedRemaning;
        result[device_id]["scraped_pieces_percent"] = scrapedNum / (scrapedNum + scrapedRemaning) * 100;
    }
    console.log(result);
    return res.json(result);
}


module.exports = router;

