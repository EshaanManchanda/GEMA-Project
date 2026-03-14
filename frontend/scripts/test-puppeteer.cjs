const puppeteer = require('puppeteer');

(async () => {
    console.log('Attempting to launch Puppeteer...');
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
            ],
        });
        console.log('✅ Puppeteer launched successfully!');
        const page = await browser.newPage();
        console.log('✅ New page created!');
        await browser.close();
        console.log('✅ Browser closed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to launch Puppeteer:');
        console.error(error);
        process.exit(1);
    }
})();
