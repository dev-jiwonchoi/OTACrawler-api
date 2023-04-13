const { Browser } = require('puppeteer');
const puppeteer = require('puppeteer-extra'); // For puppeteer stealth below
const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // For browser evasion
const hotelOTAEntityObject: object = require('../entities/HotelOTAEntity');
// try puppeteer-cluster!!
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

  const browser: typeof Browser = await puppeteer.launch({
    headless: true, // Does not show browser if true
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  console.log('entered getCrawlingData');

  const fetchData = async (url: string, otaName: string, key: string) => {
    console.log('entered fetchData');
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

    try {
      const cheapestRoomType = await page.$eval(
        `.${hotelOTADataElementClassNameObject[otaName][0]}`,
        (el: any) => el.textContent
      );

      const cheapestRoomPrice = await page.$eval(
        `.${hotelOTADataElementClassNameObject[otaName][1]}`,
        (el: any) => el.textContent
      );

      console.log('entered try fetch');
      console.log(url);

      await page.close();
      return {
        hotelName: key,
        otaName: otaName,
        roomType: cheapestRoomType,
        roomPrice: cheapestRoomPrice,
      };
    } catch (error) {
      await page.close();
      console.error(error);
      return {
        hotelName: key,
        otaName: otaName,
        roomType: '전객실 마감',
        roomPrice: `참고링크 ${url}`,
      };
    }
  };

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

  const totalPromise = otaUrlArray.map((url) =>
    fetchData(url[0], url[1], url[2])
  );
  const totalData = await Promise.all(totalPromise);

  console.log(totalData);

  response.status(200).send(totalData);
}

module.exports = {
  getCrawlingData,
};
