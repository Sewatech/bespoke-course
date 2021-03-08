#!/usr/bin/env node
const argv = require('yargs').argv,
      puppeteer = require('puppeteer');

(async() => {
    const course_id = argv.bc_course || 'course'
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${process.cwd()}/public/index.html`);
    
    await page.emulateMediaType('print');
    // Pour le background transparent
    await page._emulationManager._client.send(
      'Emulation.setDefaultBackgroundColorOverride',
      { color: { r: 0, g: 0, b: 0, a: 0 } }
    );

    // Notes
    await page.pdf({
      path: `public/${course_id}.pdf`,
      printBackground: true, 
      format: 'A4', 
      landscape: false
    });
    
    // Slides
    const sectionWidth = await page.$eval('section', elt => elt.clientWidth);
    const sectionHeight = await page.$eval('section', elt => elt.clientHeight);
    const dimension = {width: sectionWidth, height: sectionHeight}

    await page.pdf({
        path: `public/${course_id}-slides.pdf`, 
        printBackground: true, 
        width: `${dimension.height}mm`, // switching width & height because it is landscape
        height: `${dimension.width}mm`, 
        landscape: true
      });

    await browser.close();
})();
