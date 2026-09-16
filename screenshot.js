const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
    try {
        const browser = await puppeteer.launch({
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Try Chrome
            headless: 'new'
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 1600 });
        await page.goto('file:///c:/Users/mayur/Downloads/Rankly.ai/Rankly_Deep_Architecture.html', { waitUntil: 'networkidle0' });
        
        // Wait an extra second for Mermaid to render just in case
        await new Promise(r => setTimeout(r, 2000));
        
        // Take screenshot
        const savePath = 'C:\\Users\\mayur\\.gemini\\antigravity\\brain\\ac981e5b-d472-4abb-b41b-99c98a80b3a3\\Rankly_Deep_Architecture.png';
        await page.screenshot({ path: savePath, fullPage: true });
        
        console.log('Screenshot saved to: ' + savePath);
        await browser.close();
    } catch (err) {
        console.error('Chrome failed, trying Edge...');
        try {
            const browser = await puppeteer.launch({
                executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                headless: 'new'
            });
            const page = await browser.newPage();
            await page.setViewport({ width: 1200, height: 1600 });
            await page.goto('file:///c:/Users/mayur/Downloads/Rankly.ai/Rankly_Deep_Architecture.html', { waitUntil: 'networkidle0' });
            await new Promise(r => setTimeout(r, 2000));
            
            const savePath = 'C:\\Users\\mayur\\.gemini\\antigravity\\brain\\ac981e5b-d472-4abb-b41b-99c98a80b3a3\\Rankly_Deep_Architecture.png';
            await page.screenshot({ path: savePath, fullPage: true });
            
            console.log('Screenshot saved to: ' + savePath);
            await browser.close();
        } catch (e2) {
            console.error('Edge also failed: ' + e2.message);
        }
    }
})();
