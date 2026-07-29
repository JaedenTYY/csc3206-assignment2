const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text(), msg.location()));
  page.on('request', request => console.log('REQ:', request.url()));
  page.on('response', response => { if (!response.ok()) console.log('RESP FAILED:', response.url(), response.status()); });
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  // We need to serve the dist folder to test it properly, 
  // but we can just use the local vite dev server for a moment
  await page.goto('http://localhost:4173/csc3206-assignment2/', { waitUntil: 'networkidle0' });
  
  // Wait a bit for Pyodide to run algorithms
  await new Promise(r => setTimeout(r, 2000));
  
  const loadingDisplay = await page.evaluate(() => document.getElementById('cy-loading')?.style.display);
  const containerHTML = await page.evaluate(() => document.getElementById('cy-container')?.innerHTML.substring(0, 50));
  console.log('CY LOADING DISPLAY:', loadingDisplay);
  console.log('CY CONTAINER INNER HTML:', containerHTML);
  
  await browser.close();
})();
