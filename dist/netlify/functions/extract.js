const axios = require('axios');
const cheerio = require('cheerio');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

// Patterns spécifiques pour les sites de light novels populaires
const SITE_PATTERNS = {
  'novelfull.net': {
    contentSelector: '#chapter-content',
    titleSelector: '.chapter-title, h1',
    removeSelectors: ['.ads', '.ad', '.advertisement', '#next_chap', '#prev_chap', '.chapter-nav']
  },
  'lightnovelworld.com': {
    contentSelector: '.chapter-c, .chapter-content',
    titleSelector: '.chapter-title',
    removeSelectors: ['.ads', '.chapter-nav', '.donation-box', '.announcement']
  },
  'webnovel.com': {
    contentSelector: '.chapter-content, .cha-content',
    titleSelector: '.cha-tit, .chapter-title',
    removeSelectors: ['.cha-top', '.cha-bot', '.advertisement']
  },
  'royalroad.com': {
    contentSelector: '.chapter-inner, .chapter-content',
    titleSelector: '.fic-header h1',
    removeSelectors: ['.portlet-body', '.fiction-info', '.author-note']
  },
  'wuxiaworld.com': {
    contentSelector: '.chapter-content, .fr-view',
    titleSelector: '.chapter-title',
    removeSelectors: ['.chapter-nav', '.MuiBox-root']
  },
  'scribblehub.com': {
    contentSelector: '#chp_raw, .chp_raw',
    titleSelector: '.chapter-title, .wi_fic_title',
    removeSelectors: ['.wi_authornotes', '.chapter-afterword']
  }
};

// Fonction pour extraire le domaine d'une URL
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return null;
  }
}

// Fonction d'extraction par pattern spécifique au site
function extractByPattern(html, url) {
  const domain = getDomainFromUrl(url);
  const $ = cheerio.load(html);

  const pattern = SITE_PATTERNS[domain];

  if (pattern) {
    console.log(`✓ Pattern trouvé pour ${domain}`);

    pattern.removeSelectors.forEach(selector => {
      $(selector).remove();
    });

    let content = '';
    const contentSelectors = pattern.contentSelector.split(', ');

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 100) {
          break;
        }
      }
    }

    if (content.length > 100) {
      return {
        success: true,
        content,
        method: 'pattern'
      };
    }
  }

  return { success: false };
}

// Fonction d'extraction avec Mozilla Readability
function extractWithReadability(html, url) {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document, {
      charThreshold: 100,
      classesToPreserve: ['chapter-content', 'post-content']
    });

    const article = reader.parse();

    if (article && article.textContent && article.textContent.length > 100) {
      return {
        success: true,
        content: article.textContent.trim(),
        title: article.title,
        method: 'readability'
      };
    }
  } catch (e) {
    console.error('Erreur Readability:', e.message);
  }

  return { success: false };
}

// Fonction principale d'extraction avec fallback
function extractMainContent($, html, url) {
  const patternResult = extractByPattern(html, url);
  if (patternResult.success) {
    console.log(`📖 Extraction réussie via pattern (${patternResult.content.length} caractères)`);
    return patternResult.content;
  }

  const readabilityResult = extractWithReadability(html, url);
  if (readabilityResult.success) {
    console.log(`📖 Extraction réussie via Readability (${readabilityResult.content.length} caractères)`);
    return readabilityResult.content;
  }

  console.log('⚠️ Fallback sur extraction Cheerio classique');

  const contentSelectors = [
    'article',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.content',
    'main article',
    '[role="main"]',
    '.post',
    '#content article',
    '#chapter-content',
    '.chapter-content'
  ];

  let content = '';

  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      element.find('script, style, iframe, .ad, .advertisement, .pub, .publicite, [class*="ad-"], [id*="ad-"]').remove();
      element.find('nav, .navigation, .nav, .chapter-nav, .post-navigation, header, .header, h1, h2.story-title').remove();

      const text = element.text().trim();
      if (text.length > 100) {
        content = text;
        break;
      }
    }
  }

  if (!content) {
    $('script, style, nav, header, footer, aside, iframe, .ad, .advertisement, .menu, .sidebar, h1, .navigation, .chapter-nav').remove();
    content = $('body').text().trim();
  }

  content = content.replace(/\s+/g, ' ').trim();

  return content;
}

// Fonction pour trouver le lien "Suivant"
function findNextLink($, currentUrl, visitedUrls = []) {
  const nextSelectors = [
    '#next_chap',
    'a#next_chap',
    'a[rel="next"]',
    '.next-post a',
    '.nav-next a',
    'a.next',
    'a:contains("Suivant")',
    'a:contains("Next")',
    'a:contains("Next Chapter")',
    'a:contains("→")',
    'a:contains("»")',
    '[class*="next"] a',
    '.pagination a:last-child'
  ];

  for (const selector of nextSelectors) {
    const links = $(selector);

    for (let i = 0; i < links.length; i++) {
      const link = $(links[i]);
      let href = link.attr('href');

      if (href && !href.includes('javascript:')) {
        if (!href.startsWith('http')) {
          const urlObj = new URL(currentUrl);
          if (href.startsWith('/')) {
            href = `${urlObj.protocol}//${urlObj.host}${href}`;
          } else {
            const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
            href = baseUrl + href;
          }
        }

        if (!visitedUrls.includes(href) && href !== currentUrl) {
          const isChapter1Link = href.match(/chapter[-_]?1(?:[^0-9]|$)/i) ||
                                 href.match(/chapitre[-_]?1(?:[^0-9]|$)/i) ||
                                 href.match(/\/1(?:[^0-9]|$)/);
          const isCurrentChapter1 = currentUrl.match(/chapter[-_]?1(?:[^0-9]|$)/i) ||
                                    currentUrl.match(/chapitre[-_]?1(?:[^0-9]|$)/i);

          if (isChapter1Link && !isCurrentChapter1) {
            continue;
          }

          return href;
        }
      }
    }
  }

  return null;
}

// Liste des filtres automatiques
const AUTO_FILTERS = [
  'Prev Chapter', 'Previous Chapter', 'Next Chapter', 'Chapitre précédent', 'Chapitre suivant',
  'Précédent', 'Suivant', 'Report chapter', 'Report Chapter', 'Send Gift', 'SEND GIFT',
  'Vote', 'commentVote', 'leftSEND GIFT',
  'Tip: You can use left, right, A and D keyboard keys to browse between chapters.',
  'You can use left, right, A and D keyboard keys to browse between chapters',
  'Use arrow keys to navigate', 'Comments', 'COMMENT',
  'Please enable JavaScript to view the', 'comments powered by Disqus', 'Disqus',
  'Share', 'Partager', 'Like', 'Tweet', 'Advertisement', 'Publicité',
  'Subscribe', 'Abonnez-vous', 'Follow us', 'Suivez-nous',
  'Facebook', 'Twitter', 'Instagram', 'Share on', 'Partager sur',
  'Read more', 'Lire la suite', 'Click here', 'Cliquez ici',
  'Sign in', 'Connexion', 'Register', 'S\'inscrire',
  'powered by', 'ref_noscript', 'noscript', 'Enable JavaScript',
  'left', 'right', 'top', 'bottom',
  'Novel', 'Xianxia', 'Fantasy', 'Romance', 'Action', 'Adventure',
  'Drama', 'Sci-Fi', 'Mystery', 'Thriller', 'Horror', 'Comedy'
];

// Fonction pour appliquer les filtres
function applyBlacklist(text, userBlacklist, useAutoFilters = true) {
  let filteredText = text;

  const allFilters = useAutoFilters
    ? [...AUTO_FILTERS, ...(userBlacklist || [])]
    : (userBlacklist || []);

  for (const filter of allFilters) {
    if (filter.trim()) {
      const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedFilter, 'gi');
      filteredText = filteredText.replace(regex, '');
    }
  }

  filteredText = filteredText.replace(/<[^>]*>/g, '');
  filteredText = filteredText.replace(/\b(href|class|id|style|src|alt|title)=["'][^"']*["']/gi, '');
  filteredText = filteredText.replace(/powered\s+by\s+[^.]*\.?/gi, '');
  filteredText = filteredText.replace(/\b\d+\s*left\d*/gi, '');
  filteredText = filteredText.replace(/(\b\d+\s*){2,}/g, '');
  filteredText = filteredText.replace(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, '');
  filteredText = filteredText.replace(/www\.[^\s<>"{}|\\^`\[\]]+/gi, '');
  filteredText = filteredText.replace(/\.[a-z]{2,4}\/?ref[^\s]*/gi, '');
  filteredText = filteredText.replace(/ref[_-]?noscript/gi, '');
  filteredText = filteredText.replace(/\(\s*\)/g, '');
  filteredText = filteredText.replace(/\[\s*\]/g, '');
  filteredText = filteredText.replace(/\{\s*\}/g, '');
  filteredText = filteredText.replace(/\s+/g, ' ').trim();
  filteredText = filteredText.replace(/^[\d\s\-_=+*#@!.,;:'"<>\/\\|(){}\[\]]+$/gm, '');
  filteredText = filteredText.replace(/\s+/g, ' ').trim();

  const words = filteredText.split(/\s+/);
  const searchLimit = Math.min(200, words.length);
  const searchText = words.slice(0, searchLimit).join(' ');
  const restText = words.slice(searchLimit).join(' ');

  const chapterPattern = /Chapter\s+(\d+)\s+[\s\S]*?Chapter\s+\1(?:\s+[A-Z][a-z]+)?/gi;
  let cleanedSearchText = searchText.replace(chapterPattern, 'Chapter $1');
  cleanedSearchText = cleanedSearchText.replace(/^(?:Da\s+Xuan\s+Martial\s+Saint|Nine\s+Star\s+Hegemon\s+Body\s+Arts|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,})\s*/i, '');

  filteredText = (cleanedSearchText + ' ' + restText).trim();
  filteredText = filteredText.replace(/\s+/g, ' ').trim();

  return filteredText;
}

// Export de la fonction serverless pour Netlify
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { url, numChapters = 10, blacklist = [], useAutoFilters = true } = JSON.parse(event.body || '{}');

  if (!url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'URL manquante' })
    };
  }

  const totalFilters = (useAutoFilters ? AUTO_FILTERS.length : 0) + blacklist.length;
  console.log(`Filtres automatiques: ${useAutoFilters ? 'activés' : 'désactivés'}`);
  console.log(`Filtres utilisateur: ${blacklist.length}`);
  console.log(`Total filtres actifs: ${totalFilters}`);

  try {
    const chapters = [];
    let currentUrl = url;
    let chaptersExtracted = 0;
    const visitedUrls = [];

    console.log(`Début de l'extraction de ${numChapters} chapitres depuis: ${url}`);

    while (currentUrl && chaptersExtracted < numChapters) {
      try {
        console.log(`Extraction du chapitre ${chaptersExtracted + 1}: ${currentUrl}`);

        visitedUrls.push(currentUrl);

        const response = await axios.get(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        let title = $('h1').first().text().trim() || $('title').text().trim();
        title = title.replace(/^.*?(Chapter\s+\d+)/i, '$1');

        if (!/Chapter\s+\d+/i.test(title)) {
          const chapterMatch = title.match(/(\d+)/);
          if (chapterMatch) {
            title = `Chapter ${chapterMatch[1]}`;
          }
        }

        let realChapterNumber = chaptersExtracted + 1;
        const titleChapterMatch = title.match(/Chapter\s+(\d+)/i);
        const urlChapterMatch = currentUrl.match(/chapter[-_]?(\d+)/i);

        if (titleChapterMatch) {
          realChapterNumber = parseInt(titleChapterMatch[1]);
        } else if (urlChapterMatch) {
          realChapterNumber = parseInt(urlChapterMatch[1]);
        }

        let content = extractMainContent($, html, currentUrl);
        content = applyBlacklist(content, blacklist, useAutoFilters);

        if (content && content.length > 50) {
          chapters.push({
            number: chaptersExtracted + 1,
            realNumber: realChapterNumber,
            url: currentUrl,
            title: title,
            content: content
          });

          chaptersExtracted++;
          console.log(`✓ Chapitre ${chaptersExtracted} extrait (${content.length} caractères)`);
        } else {
          console.log(`✗ Contenu insuffisant pour: ${currentUrl}`);
          break;
        }

        if (chaptersExtracted < numChapters) {
          currentUrl = findNextLink($, currentUrl, visitedUrls);

          if (!currentUrl) {
            console.log('Aucun lien "Suivant" trouvé');
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Erreur lors de l'extraction de ${currentUrl}:`, error.message);
        break;
      }
    }

    if (chapters.length === 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Aucun chapitre n\'a pu être extrait' })
      };
    }

    const combinedText = chapters.map(ch => {
      return `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCHAPITRE ${ch.realNumber}\n${ch.title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${ch.content}`;
    }).join('\n\n');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        chaptersFound: chapters.length,
        chapters: chapters,
        combinedText: combinedText,
        filtersApplied: totalFilters,
        autoFiltersEnabled: useAutoFilters
      })
    };

  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur lors de l\'extraction',
        details: error.message
      })
    };
  }
};
