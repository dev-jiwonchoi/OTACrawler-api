const crawlerRouter = require('express').Router();
const crawlerController = require('../controllers/CrawlerController');

crawlerRouter.get(
  '/:checkInDate?/:checkOutDate?/:numberOfNights',
  crawlerController.getCrawlingData
);

module.exports = crawlerRouter;
