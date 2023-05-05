const { Page } = require('puppeteer');
const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra'); // For puppeteer stealth below
const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // For browser evasion
const hotelOTAEntityObject: object = require('../entities/HotelOTAEntity');
puppeteer.use(StealthPlugin());

const hotelOTADataElementClassNameObject: { [key: string]: Array<string> } = {
  아고다: ['MasterRoom__HotelName', 'pd-price'],
  부킹닷컴: ['hprt-roomtype-icon-link', 'prco-valign-middle-helper'],
  야놀자: ['css-1ux2lue', 'css-w3imtf'],
};

async function getCrawlingData(request: any, response: any) {
  const checkInDate = request.params.checkInDate;
  const checkOutDate = request.params.checkOutDate;
  const numberOfNights = request.params.numberOfNights;

  const cluster: typeof Cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: Object.entries(hotelOTAEntityObject).length,
    timeout: 120_000,
    puppeteerOptions: {
      headless: true, // Does not show browser if true
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  cluster.on('taskFailed', (error: Error, data: any) => {
    console.error(`Error crawling ${data}: ${error.message}`);
  });

  await cluster.task(
    async ({ page, data }: { page: typeof Page; data: any }) => {
      await page.goto(data.url, { waitUntil: 'networkidle2', timeout: 0 });

      try {
        const cheapestRoomType = await page.$eval(
          `.${hotelOTADataElementClassNameObject[data.otaName][0]}`,
          (el: any) => el.textContent
        );

        const cheapestRoomPrice = await page.$eval(
          `.${hotelOTADataElementClassNameObject[data.otaName][1]}`,
          (el: any) => el.textContent
        );

        return {
          hotelName: data.hotelName,
          otaName: data.otaName,
          roomType: cheapestRoomType,
          roomPrice: cheapestRoomPrice,
        };
      } catch (error) {
        return {
          hotelName: data.hotelName,
          otaName: data.otaName,
          roomType: '전객실 마감',
          roomPrice: `참고링크 ${data.url}`,
        };
      }
    }
  );

  let otaUrlArray = [];

  for (const [key, value] of Object.entries(hotelOTAEntityObject)) {
    const agodaCrawlingUrl = `https://www.agoda.com/${value[0]}/hotel/seoul-kr.html?checkIn=${checkInDate}&los=${numberOfNights}`;
    const bookingDotComCrawlingUrl = `https://www.booking.com/hotel/kr/${value[1]}.ko.html?checkin=${checkInDate};checkout=${checkOutDate};`;
    const yanoljaCrawlingUrl = `https://place-site.yanolja.com/places/${value[2]}?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`;

    otaUrlArray.push(
      [agodaCrawlingUrl, '아고다', key],
      [bookingDotComCrawlingUrl, '부킹닷컴', key],
      [yanoljaCrawlingUrl, '야놀자', key]
    );
  }

  const testPromise = await otaUrlArray.map((element) =>
    cluster.execute({
      url: element[0],
      otaName: element[1],
      hotelName: element[2],
    })
  );

  const testData = await Promise.all(testPromise);

  await cluster.idle();
  await cluster.close();

  console.log(testData);
  response.status(200).send(testData);
}

module.exports = {
  getCrawlingData,
};