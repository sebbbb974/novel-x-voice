const axios = require('axios');
const cheerio = require('cheerio');

// Filtres automatiques
const AUTO_FILTERS = [
    'Next Chapter', 'Previous Chapter', 'Table of Contents',
    'COMMENT', 'Comment', 'Vote', 'VOTE', 'SEND GIFT',
    'Click here', 'Read more', 'Subscribe', 'Follow us',
    'Share on Facebook', 'Share on Twitter', 'Advertisement',
    'Ads by', 'Sponsored', 'Chapter List', 'Novel Updates',
    'Report Error', 'Report Chapter', 'Bookmark', 'Add to Library',
    'Reading Mode', 'Font Size', 'Background Color',
    'Previous', 'Next', 'Index', 'Home', 'Menu',
    'left', 'right', 'Top', 'Bottom',
    'Latest Chapter', 'First Chapter', 'Last Chapter',
    'Table of content', 'TOC', 'Chapters',
    'Click to Copy', 'Copy Link', 'Permalink',
    'Rate this', 'Rating', 'Reviews',
    'Author', 'Translator', 'Editor',
    'Discord', 'Patreon', 'Support us',
    'Join our Discord', 'Support on Patreon'
];

function applyBlacklist(text, blacklist = [], useAutoFilters = true) {
    let filteredText = text;
    let filtersApplied = 0;

    const allFilters = useAutoFilters
        ? [...AUTO_FILTERS, ...blacklist]
        : blacklist;

    for (const filter of allFilters) {
        if (filter.trim()) {
            const regex = new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            if (filteredText.match(regex)) {
                filtersApplied++;
                filteredText = filteredText.replace(regex, '');
            }
        }
    }

    return { filteredText, filtersApplied };
}

function findNextLink($, currentUrl) {
    const possibleSelectors = [
        'a:contains("Next Chapter")',
        'a:contains("Next")',
        'a.next',
        'a.nextchapter',
        'a[rel="next"]',
        '.chapter-nav a:last',
        '.nav-next a',
        '#next_chap',
        'a[title*="next" i]'
    ];

    for (const selector of possibleSelectors) {
        const link = $(selector).first();
        if (link.length) {
            let href = link.attr('href');
            if (href && !href.includes('javascript:')) {
                if (href.startsWith('http')) {
                    return href;
                } else if (href.startsWith('/')) {
                    const url = new URL(currentUrl);
                    return url.origin + href;
                } else {
                    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
                    return baseUrl + href;
                }
            }
        }
    }

    return null;
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url, numChapters = 10, blacklist = [], useAutoFilters = true } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL manquante' });
        }

        const chapters = [];
        let currentUrl = url;
        let totalFiltersApplied = 0;

        for (let i = 0; i < numChapters && currentUrl; i++) {
            try {
                const response = await axios.get(currentUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 15000
                });

                const $ = cheerio.load(response.data);

                // Extraction du titre
                let title = $('h1').first().text().trim() ||
                           $('title').text().trim() ||
                           `Chapitre ${i + 1}`;

                // Extraction du contenu
                const possibleContentSelectors = [
                    '.chapter-content',
                    '#chapter-content',
                    '.post-content',
                    '.entry-content',
                    'article',
                    '.content',
                    'main'
                ];

                let content = '';
                for (const selector of possibleContentSelectors) {
                    const element = $(selector).first();
                    if (element.length && element.text().trim().length > 100) {
                        $('script, style, nav, .navigation, .nav, footer, header').remove();
                        content = element.text();
                        break;
                    }
                }

                if (!content) {
                    content = $('body').text();
                }

                // Nettoyage du texte
                let cleanedText = content
                    .replace(/\s+/g, ' ')
                    .replace(/\n\s*\n/g, '\n')
                    .trim();

                // Appliquer les filtres
                const { filteredText, filtersApplied } = applyBlacklist(cleanedText, blacklist, useAutoFilters);
                totalFiltersApplied += filtersApplied;

                // NETTOYAGE : Supprimer les répétitions uniquement dans les 200 premiers mots
                const words = filteredText.split(/\s+/);
                const searchLimit = Math.min(200, words.length);
                const searchText = words.slice(0, searchLimit).join(' ');
                const restText = words.slice(searchLimit).join(' ');

                const chapterPattern = /Chapter\s+(\d+)\s+[\s\S]*?Chapter\s+\1(?:\s+[A-Z][a-z]+)?/gi;
                let cleanedSearchText = searchText;
                let match;
                while ((match = chapterPattern.exec(searchText)) !== null) {
                    cleanedSearchText = cleanedSearchText.replace(match[0], `Chapter ${match[1]}`);
                }

                const finalText = cleanedSearchText + (restText ? ' ' + restText : '');

                chapters.push({
                    number: i + 1,
                    title,
                    content: finalText,
                    url: currentUrl
                });

                // Trouver le prochain chapitre
                currentUrl = findNextLink($, currentUrl);

            } catch (chapterError) {
                console.error(`Erreur chapitre ${i + 1}:`, chapterError.message);
                break;
            }
        }

        if (chapters.length === 0) {
            return res.status(500).json({ error: 'Aucun chapitre trouvé' });
        }

        const combinedText = chapters.map(ch =>
            `Chapter ${ch.number}\n\n${ch.content}\n\n`
        ).join('---\n\n');

        res.status(200).json({
            success: true,
            chaptersFound: chapters.length,
            chapters: chapters.map(ch => ({ number: ch.number, title: ch.title })),
            combinedText,
            filtersApplied: totalFiltersApplied,
            autoFiltersEnabled: useAutoFilters
        });

    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({
            error: error.message || 'Erreur lors de l\'extraction'
        });
    }
};
