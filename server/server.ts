const express = require('express');
const cors = require('cors');
const app = express();

async function RunServer() {
  const corsOptions = {
    origin: ['http://localhost:5173'],
  };

  // Middlewares
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // Parse urlencoded payloads

  const importCrawlerRouter = require('../routes/CrawlerRouter');
  app.use('/api/crawl', importCrawlerRouter);

  const port = process.env.PORT || 8080;
  app.get('/', (req: any, res: any) => {
    res.status(200).send('Hello World!');
  });
  app.listen(port, () => {
    console.log(`Running Server on port ${port}`);
  });
}

RunServer();
