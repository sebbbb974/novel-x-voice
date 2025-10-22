const axios = require('axios');
const cheerio = require('cheerio');

// Fonction pour extraire le contenu principal d'une page
function extractMainContent($) {
  const contentSelectors = [
    'article',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.content',
    'main article',
    '[role="main"]',
    '.post',
    '#content article'
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
function findNextLink($, currentUrl) {
  const nextSelectors = [
    'a[rel="next"]',
    '.next-post a',
    '.nav-next a',
    'a.next',
    'a:contains("Suivant")',
    'a:contains("Next")',
    'a:contains("→")',
    'a:contains("»")',
    '[class*="next"] a',
    '.pagination a:last-child'
  ];

  for (const selector of nextSelectors) {
    const link = $(selector).first();
    if (link.length > 0) {
      let href = link.attr('href');
      if (href) {
        if (!href.startsWith('http')) {
          const urlObj = new URL(currentUrl);
          if (href.startsWith('/')) {
            href = `${urlObj.protocol}//${urlObj.host}${href}`;
          } else {
            const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
            href = baseUrl + href;
          }
        }
        return href;
      }
    }
  }

  return null;
}

const AUTO_FILTERS = [
  'Prev Chapter',
  'Previous Chapter',
  'Next Chapter',
  'Chapitre précédent',
  'Chapitre suivant',
  'Précédent',
  'Suivant',
  'Report chapter',
  'Report Chapter',
  'Send Gift',
  'SEND GIFT',
  'Vote',
  'commentVote',
  'leftSEND GIFT',
  'Tip: You can use left, right, A and D keyboard keys to browse between chapters.',
  'You can use left, right, A and D keyboard keys to browse between chapters',
  'Use arrow keys to navigate',
  'Comments',
  'COMMENT',
  'Please enable JavaScript to view the',
  'comments powered by Disqus',
  'Disqus',
  'Share',
  'Partager',
  'Like',
  'Tweet',
  'Advertisement',
  'Publicité',
  'Subscribe',
  'Abonnez-vous',
  'Follow us',
  'Suivez-nous',
  'Facebook',
  'Twitter',
  'Instagram',
  'Share on',
  'Partager sur',
  'Read more',
  'Lire la suite',
  'Click here',
  'Cliquez ici',
  'Sign in',
  'Connexion',
  'Register',
  'S\'inscrire',
  'powered by',
  'ref_noscript',
  'noscript',
  'Enable JavaScript',
  'left',
  'right',
  'top',
  'bottom',
  'Novel',
  'Xianxia',
  'Fantasy',
  'Romance',
  'Action',
  'Adventure',
  'Drama',
  'Sci-Fi',
  'Mystery',
  'Thriller',
  'Horror',
  'Comedy'
];

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
  let matches = [];
  let match;

  while ((match = chapterPattern.exec(searchText)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      fullMatch: match[0]
    });
  }

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    filteredText = searchText.substring(lastMatch.end).trim() + ' ' + restText;
  }

  filteredText = filteredText.replace(/^(?:Da\s+Xuan\s+Martial\s+Saint|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,})\s*/i, '');
  filteredText = filteredText.replace(/\s+/g, ' ').trim();

  return filteredText;
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url, numChapters = 10, blacklist = [], useAutoFilters = true } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL manquante' })
      };
    }

    const chapters = [];
    let currentUrl = url;
    let chaptersExtracted = 0;

    while (currentUrl && chaptersExtracted < numChapters) {
      try {
        const response = await axios.get(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        let title = $('h1').first().text().trim() || $('title').text().trim();
        title = title.replace(/^.*?(Chapter\s+\d+)/i, '$1');

        if (!/Chapter\s+\d+/i.test(title)) {
          const chapterMatch = title.match(/(\d+)/);
          if (chapterMatch) {
            title = `Chapter ${chapterMatch[1]}`;
          }
        }

        let content = extractMainContent($);
        content = applyBlacklist(content, blacklist, useAutoFilters);

        if (content && content.length > 50) {
          chapters.push({
            number: chaptersExtracted + 1,
            url: currentUrl,
            title: title,
            content: content
          });

          chaptersExtracted++;
        } else {
          break;
        }

        if (chaptersExtracted < numChapters) {
          currentUrl = findNextLink($, currentUrl);

          if (!currentUrl) {
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Erreur: ${error.message}`);
        break;
      }
    }

    if (chapters.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Aucun chapitre n\'a pu être extrait' })
      };
    }

    const combinedText = chapters.map(ch => {
      return `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCHAPITRE ${ch.number}\n${ch.title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${ch.content}`;
    }).join('\n\n');

    const totalFilters = (useAutoFilters ? AUTO_FILTERS.length : 0) + blacklist.length;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
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
      body: JSON.stringify({
        error: 'Erreur lors de l\'extraction',
        details: error.message
      })
    };
  }
};
