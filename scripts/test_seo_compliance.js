const http = require('http');
const fs = require('fs');

async function fetchUrl(path) {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:3000' + path, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: data
            }));
        }).on('error', reject);
    });
}

async function runSeoComplianceTests() {
    console.log('================================================================');
    console.log('🔍 SEO & COMPLIANCE MODULE PRD AUTOMATED VERIFICATION SUITE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details = '') {
        if (condition) {
            console.log(`✅ [PASS]: ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL]: ${name} ${details}`);
            failed++;
        }
    }

    // 1. Static Pages & Legal Compliance Routes (PRD Spec 3)
    console.log('--- 1. Testing Route Availability (HTTP 200 & Content) ---');
    const routes = [
        { path: '/', name: 'Landing & Login Page' },
        { path: '/services', name: 'Service Page' },
        { path: '/locations', name: 'Location Page' },
        { path: '/about', name: 'About Us Page' },
        { path: '/contact', name: 'Contact Us Page' },
        { path: '/privacy', name: 'Privacy Policy Page' },
        { path: '/terms', name: 'Terms of Service Page' }
    ];

    const routeData = {};

    for (const r of routes) {
        try {
            const res = await fetchUrl(r.path);
            routeData[r.path] = res;
            assert(`${r.name} (${r.path}) returns HTTP 200`, res.statusCode === 200);
        } catch (e) {
            assert(`${r.name} (${r.path}) connection`, false, e.message);
        }
    }

    // 2. XML Sitemap & Robots.txt Infrastructure (PRD Spec 4)
    console.log('\n--- 2. Testing Search Engine Crawler Infrastructure ---');
    try {
        const sitemapRes = await fetchUrl('/sitemap.xml');
        assert('/sitemap.xml returns HTTP 200', sitemapRes.statusCode === 200);
        assert('/sitemap.xml Content-Type is XML', (sitemapRes.headers['content-type'] || '').includes('xml'));
        assert('/sitemap.xml contains valid <urlset> and <loc>', sitemapRes.body.includes('<urlset') && sitemapRes.body.includes('<loc>https://ranklyai-production.up.railway.app/services</loc>'));

        const robotsRes = await fetchUrl('/robots.txt');
        assert('/robots.txt returns HTTP 200', robotsRes.statusCode === 200);
        assert('/robots.txt contains Sitemap directive', robotsRes.body.includes('Sitemap: https://ranklyai-production.up.railway.app/sitemap.xml'));
        assert('/robots.txt disallows private /api/ routes', robotsRes.body.includes('Disallow: /api/'));
    } catch (e) {
        assert('Crawler infrastructure test', false, e.message);
    }

    // 3. H1 Title Tag Management (PRD Spec 1)
    console.log('\n--- 3. Testing Semantic H1 Tag Integrity (Single Unique H1 per Page) ---');
    for (const r of routes) {
        const res = routeData[r.path];
        if (!res) continue;
        const h1Matches = [...res.body.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
        if (r.path === '/') {
            const visibleH1 = h1Matches.filter(h => h[0].includes('Rankly.ai — Enterprise AI Recruitment Intelligence'));
            assert(`Landing Page renders primary semantic H1`, visibleH1.length === 1);
        } else {
            assert(`${r.name} has exactly 1 H1 element`, h1Matches.length === 1, `(Found: ${h1Matches.length})`);
        }
    }

    // 4. Dynamic Titles (< 60 chars) & Meta Descriptions (< 160 chars) (PRD Spec 1)
    console.log('\n--- 4. Testing Dynamic Titles (< 60 chars) & Meta Descriptions (< 160 chars) ---');
    for (const r of routes) {
        const res = routeData[r.path];
        if (!res) continue;
        const titleMatch = res.body.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        assert(`${r.name} title exists and is <= 60 chars (${title.length} chars)`, title.length > 0 && title.length <= 60, `Title: "${title}"`);

        const descMatch = res.body.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                          res.body.match(/<meta\s+content="([^"]+)"\s+name="description"/i);
        const desc = descMatch ? descMatch[1].trim() : '';
        assert(`${r.name} meta description is <= 160 chars (${desc.length} chars)`, desc.length > 0 && desc.length <= 160, `Desc: "${desc}"`);
    }

    // 5. JSON-LD Structured Data Schema (PRD Spec 2)
    console.log('\n--- 5. Testing JSON-LD Structured Data & Schemas ---');
    const homeHtml = routeData['/']?.body || '';
    const schemaMatches = [...homeHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    assert('Home page has JSON-LD schema block', schemaMatches.length > 0);
    if (schemaMatches.length > 0) {
        try {
            const parsed = JSON.parse(schemaMatches[0][1]);
            const types = (parsed['@graph'] || [parsed]).map(i => i['@type']);
            assert('Schema includes Organization', types.includes('Organization'));
            assert('Schema includes SoftwareApplication', types.includes('SoftwareApplication'));
            assert('Schema includes FAQPage', types.includes('FAQPage'));
        } catch (e) {
            assert('Valid JSON in schema block', false, e.message);
        }
    }

    // 6. Navigation, CTAs & FAQ Section (PRD Spec 2)
    console.log('\n--- 6. Testing Navigation, FAQ Accordion & CTAs ---');
    assert('FAQ Accordion component rendered on landing view', homeHtml.includes('id="seoFaqAccordion"'));
    assert('Primary Call to Action buttons present', homeHtml.includes('btn-primary') || homeHtml.includes('login-btn'));
    assert('Internal navigation links to Services present', homeHtml.includes('href="/services"'));
    assert('Internal navigation links to Locations present', homeHtml.includes('href="/locations"'));
    assert('Internal navigation links to About present', homeHtml.includes('href="/about"'));
    assert('Internal navigation links to Contact present', homeHtml.includes('href="/contact"'));

    // 7. Trust Signals & Security Badges (PRD Spec 4)
    console.log('\n--- 7. Testing Trust Signals & Compliance Badges ---');
    assert('SOC-2 Type II badge embedded', homeHtml.includes('SOC-2') || homeHtml.includes('SOC2'));
    assert('ISO 27001 badge embedded', homeHtml.includes('ISO 27001') || homeHtml.includes('27001'));
    assert('GDPR compliance badge embedded', homeHtml.includes('GDPR'));
    assert('256-Bit SSL/TLS security signal embedded', homeHtml.includes('SSL') || homeHtml.includes('256-Bit'));

    // 8. Analytics & Search Console Integration (PRD Spec 4)
    console.log('\n--- 8. Testing Google Analytics & Search Console Hooks ---');
    assert('Google Site Verification meta tag present', homeHtml.includes('google-site-verification'));
    assert('Google Analytics gtag.js script present', homeHtml.includes('googletagmanager.com/gtag/js'));

    console.log('\n================================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);
}

runSeoComplianceTests().catch(err => {
    console.error('Test suite runner exception:', err);
    process.exit(1);
});
