const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

  // Chercher un pattern pour ce domaine
  const pattern = SITE_PATTERNS[domain];

  if (pattern) {
    console.log(`✓ Pattern trouvé pour ${domain}`);

    // Supprimer les éléments indésirables
    pattern.removeSelectors.forEach(selector => {
      $(selector).remove();
    });

    // Extraire le contenu principal
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
  // 1. Essayer d'abord le pattern spécifique au site
  const patternResult = extractByPattern(html, url);
  if (patternResult.success) {
    console.log(`📖 Extraction réussie via pattern (${patternResult.content.length} caractères)`);
    return patternResult.content;
  }

  // 2. Essayer Mozilla Readability
  const readabilityResult = extractWithReadability(html, url);
  if (readabilityResult.success) {
    console.log(`📖 Extraction réussie via Readability (${readabilityResult.content.length} caractères)`);
    return readabilityResult.content;
  }

  // 3. Fallback sur l'ancienne méthode avec Cheerio
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

  // Essayer chaque sélecteur jusqu'à trouver du contenu
  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      // Supprimer les pubs et éléments indésirables
      element.find('script, style, iframe, .ad, .advertisement, .pub, .publicite, [class*="ad-"], [id*="ad-"]').remove();

      // Supprimer les éléments de navigation et en-têtes décoratifs
      element.find('nav, .navigation, .nav, .chapter-nav, .post-navigation, header, .header, h1, h2.story-title').remove();

      const text = element.text().trim();
      if (text.length > 100) {
        content = text;
        break;
      }
    }
  }

  // Si aucun sélecteur n'a fonctionné, prendre le body en supprimant les éléments indésirables
  if (!content) {
    $('script, style, nav, header, footer, aside, iframe, .ad, .advertisement, .menu, .sidebar, h1, .navigation, .chapter-nav').remove();
    content = $('body').text().trim();
  }

  // Nettoyer les espaces multiples
  content = content.replace(/\s+/g, ' ').trim();

  return content;
}

// Fonction de validation de la qualité d'extraction
function validateExtraction(content, originalHtml) {
  const $ = cheerio.load(originalHtml);
  const bodyText = $('body').text();
  const originalLength = bodyText.length;

  const checks = {
    hasContent: content && content.length > 100,
    lengthRatio: content.length / originalLength,
    hasStructure: content.includes('\n') || content.length > 500,
    noSpam: !content.toLowerCase().includes('advertisement') &&
            !content.toLowerCase().includes('sponsored'),
    notTooShort: content.length > 200,
    notTooLong: content.length < originalLength * 0.8
  };

  const confidence = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;

  return {
    isGood: confidence > 0.6,
    confidence: Math.round(confidence * 100),
    checks,
    contentLength: content.length
  };
}

// Fonction pour trouver le lien "Suivant"
function findNextLink($, currentUrl, visitedUrls = []) {
  const nextSelectors = [
    '#next_chap',              // Pour novelfull.net
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
        // Convertir les URLs relatives en absolues
        if (!href.startsWith('http')) {
          const urlObj = new URL(currentUrl);
          if (href.startsWith('/')) {
            href = `${urlObj.protocol}//${urlObj.host}${href}`;
          } else {
            const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
            href = baseUrl + href;
          }
        }

        // Vérifier que ce n'est pas une URL déjà visitée (éviter les boucles)
        if (!visitedUrls.includes(href) && href !== currentUrl) {
          // Filtrer les liens qui contiennent "chapter-1" ou "chapitre-1" dans l'URL
          // sauf si l'URL courante contient aussi "chapter-1"
          const isChapter1Link = href.match(/chapter[-_]?1(?:[^0-9]|$)/i) ||
                                 href.match(/chapitre[-_]?1(?:[^0-9]|$)/i) ||
                                 href.match(/\/1(?:[^0-9]|$)/);
          const isCurrentChapter1 = currentUrl.match(/chapter[-_]?1(?:[^0-9]|$)/i) ||
                                    currentUrl.match(/chapitre[-_]?1(?:[^0-9]|$)/i);

          // Si le lien pointe vers chapitre 1 et qu'on n'est pas au chapitre 1, l'ignorer
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

// Liste des filtres automatiques pour nettoyer les éléments de navigation
const AUTO_FILTERS = [
  // Boutons de navigation
  'Prev Chapter',
  'Previous Chapter',
  'Next Chapter',
  'Chapitre précédent',
  'Chapitre suivant',
  'Précédent',
  'Suivant',

  // Éléments d'interface
  'Report chapter',
  'Report Chapter',
  'Send Gift',
  'SEND GIFT',
  'Vote',
  'commentVote',
  'leftSEND GIFT',

  // Instructions de navigation
  'Tip: You can use left, right, A and D keyboard keys to browse between chapters.',
  'You can use left, right, A and D keyboard keys to browse between chapters',
  'Use arrow keys to navigate',

  // Commentaires et partage
  'Comments',
  'COMMENT',
  'Please enable JavaScript to view the',
  'comments powered by Disqus',
  'Disqus',
  'Share',
  'Partager',
  'Like',
  'Tweet',

  // Publicités et abonnements
  'Advertisement',
  'Publicité',
  'Subscribe',
  'Abonnez-vous',
  'Follow us',
  'Suivez-nous',

  // Liens sociaux
  'Facebook',
  'Twitter',
  'Instagram',
  'Share on',
  'Partager sur',

  // Autres éléments courants
  'Read more',
  'Lire la suite',
  'Click here',
  'Cliquez ici',
  'Sign in',
  'Connexion',
  'Register',
  'S\'inscrire',

  // Résidus techniques
  'powered by',
  'ref_noscript',
  'noscript',
  'Enable JavaScript',

  // Fragments communs
  'left',
  'right',
  'top',
  'bottom',

  // Métadonnées et catégories
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

// Fonction pour appliquer les filtres de mots/phrases indésirables
function applyBlacklist(text, userBlacklist, useAutoFilters = true) {
  let filteredText = text;

  // Combiner les filtres automatiques et utilisateur
  const allFilters = useAutoFilters
    ? [...AUTO_FILTERS, ...(userBlacklist || [])]
    : (userBlacklist || []);

  // Appliquer chaque filtre (insensible à la casse)
  for (const filter of allFilters) {
    if (filter.trim()) {
      // Échapper les caractères spéciaux regex
      const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Créer un regex global insensible à la casse
      const regex = new RegExp(escapedFilter, 'gi');
      filteredText = filteredText.replace(regex, '');
    }
  }

  // Nettoyage avancé des résidus HTML et fragments
  // Supprimer les balises HTML restantes
  filteredText = filteredText.replace(/<[^>]*>/g, '');

  // Supprimer les attributs HTML orphelins (href="...", class="...", etc.)
  filteredText = filteredText.replace(/\b(href|class|id|style|src|alt|title)=["'][^"']*["']/gi, '');

  // Supprimer "powered by" suivi de n'importe quoi
  filteredText = filteredText.replace(/powered\s+by\s+[^.]*\.?/gi, '');

  // Supprimer les chiffres isolés suivis de "left" (comme "3 left")
  filteredText = filteredText.replace(/\b\d+\s*left\d*/gi, '');

  // Supprimer les séquences répétitives de chiffres et espaces (comme "3 3 left3")
  filteredText = filteredText.replace(/(\b\d+\s*){2,}/g, '');

  // Supprimer les URLs restantes
  filteredText = filteredText.replace(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, '');
  filteredText = filteredText.replace(/www\.[^\s<>"{}|\\^`\[\]]+/gi, '');

  // Supprimer les références à des domaines (.com, .net, etc.)
  filteredText = filteredText.replace(/\.[a-z]{2,4}\/?ref[^\s]*/gi, '');

  // Supprimer les mots "ref_noscript" et similaires
  filteredText = filteredText.replace(/ref[_-]?noscript/gi, '');

  // Supprimer les parenthèses et crochets vides
  filteredText = filteredText.replace(/\(\s*\)/g, '');
  filteredText = filteredText.replace(/\[\s*\]/g, '');
  filteredText = filteredText.replace(/\{\s*\}/g, '');

  // Nettoyer les espaces multiples après filtrage
  filteredText = filteredText.replace(/\s+/g, ' ').trim();

  // Supprimer les lignes qui ne contiennent que des chiffres et caractères spéciaux
  filteredText = filteredText.replace(/^[\d\s\-_=+*#@!.,;:'"<>\/\\|(){}\[\]]+$/gm, '');

  // Nettoyer à nouveau les espaces multiples
  filteredText = filteredText.replace(/\s+/g, ' ').trim();

  // NETTOYAGE : Supprimer les répétitions uniquement dans les 200 premiers mots (début du texte)

  // Prendre seulement les 200 premiers mots pour chercher les répétitions
  const words = filteredText.split(/\s+/);
  const searchLimit = Math.min(200, words.length);
  const searchText = words.slice(0, searchLimit).join(' ');
  const restText = words.slice(searchLimit).join(' ');

  // Pattern: "Chapter [num]" suivi de n'importe quoi puis "Chapter [même num]"
  // Remplacer la répétition par juste "Chapter [num]" au lieu de tout supprimer
  const chapterPattern = /Chapter\s+(\d+)\s+[\s\S]*?Chapter\s+\1(?:\s+[A-Z][a-z]+)?/gi;
  let cleanedSearchText = searchText.replace(chapterPattern, 'Chapter $1');

  // Nettoyer "Da Xuan Martial Saint" et autres noms de série qui restent au début
  cleanedSearchText = cleanedSearchText.replace(/^(?:Da\s+Xuan\s+Martial\s+Saint|Nine\s+Star\s+Hegemon\s+Body\s+Arts|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,})\s*/i, '');

  // Recombiner avec le reste du texte
  filteredText = (cleanedSearchText + ' ' + restText).trim();

  // Nettoyer final
  filteredText = filteredText.replace(/\s+/g, ' ').trim();

  return filteredText;
}

// Route principale pour extraire les chapitres
app.post('/extract', async (req, res) => {
  const { url, numChapters = 10, blacklist = [], useAutoFilters = true } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL manquante' });
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

        // Ajouter l'URL actuelle aux URLs visitées
        visitedUrls.push(currentUrl);

        // Télécharger la page
        const response = await axios.get(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extraire le titre de la page
        let title = $('h1').first().text().trim() || $('title').text().trim();

        // Nettoyer le titre des métadonnées
        // Supprimer le nom de l'histoire répété (garde juste "Chapter X - Titre du chapitre")
        title = title.replace(/^.*?(Chapter\s+\d+)/i, '$1');

        // Si le titre ne contient pas "Chapter", essayer d'extraire juste le numéro
        if (!/Chapter\s+\d+/i.test(title)) {
          const chapterMatch = title.match(/(\d+)/);
          if (chapterMatch) {
            title = `Chapter ${chapterMatch[1]}`;
          }
        }

        // Extraire le vrai numéro de chapitre depuis le titre ou l'URL
        let realChapterNumber = chaptersExtracted + 1; // Par défaut
        const titleChapterMatch = title.match(/Chapter\s+(\d+)/i);
        const urlChapterMatch = currentUrl.match(/chapter[-_]?(\d+)/i);

        if (titleChapterMatch) {
          realChapterNumber = parseInt(titleChapterMatch[1]);
        } else if (urlChapterMatch) {
          realChapterNumber = parseInt(urlChapterMatch[1]);
        }

        // Extraire le contenu avec les nouvelles méthodes (pattern -> Readability -> fallback)
        let content = extractMainContent($, html, currentUrl);

        // Validation de la qualité
        const validation = validateExtraction(content, html);
        console.log(`  Qualité: ${validation.confidence}% | Longueur: ${validation.contentLength} caractères`);

        // Appliquer les filtres
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

        // Trouver le lien suivant
        if (chaptersExtracted < numChapters) {
          currentUrl = findNextLink($, currentUrl, visitedUrls);

          if (!currentUrl) {
            console.log('Aucun lien "Suivant" trouvé');
            break;
          }

          // Pause de 1 seconde entre chaque requête pour ne pas surcharger le serveur
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Erreur lors de l'extraction de ${currentUrl}:`, error.message);
        break;
      }
    }

    if (chapters.length === 0) {
      return res.status(500).json({ error: 'Aucun chapitre n\'a pu être extrait' });
    }

    // Combiner tous les chapitres
    const combinedText = chapters.map(ch => {
      return `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCHAPITRE ${ch.realNumber}\n${ch.title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${ch.content}`;
    }).join('\n\n');

    res.json({
      success: true,
      chaptersFound: chapters.length,
      chapters: chapters,
      combinedText: combinedText,
      filtersApplied: totalFilters,
      autoFiltersEnabled: useAutoFilters
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'extraction',
      details: error.message
    });
  }
});

// Configuration pour Phusion Passenger (o2switch)
if (typeof(PhusionPassenger) !== 'undefined') {
  PhusionPassenger.configure({ autoInstall: false });
  app.listen('passenger', () => {
    console.log('✓ Application Novel x Voice démarrée avec Passenger (o2switch)');
  });
} else if (process.env.VERCEL) {
  // Vercel - exporter l'app sans démarrer le serveur
  module.exports = app;
} else {
  // Développement local
  app.listen(PORT, () => {
    console.log(`✓ Serveur démarré sur http://localhost:${PORT}`);
  });
}
