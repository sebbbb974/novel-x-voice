# 📖 Novel x Voice

**Novel x Voice** est une application web qui permet d'extraire des chapitres de romans en ligne et de les écouter avec une synthèse vocale de haute qualité.

## ✨ Fonctionnalités

- 📚 **Extraction de chapitres** : Récupérez automatiquement 1 à 50 chapitres d'un roman
- 🎧 **Lecture audio** : Écoutez vos chapitres avec une voix naturelle (anglais/français)
- 🎛️ **Contrôles avancés** : Vitesse, tonalité, volume ajustables
- 💾 **Bibliothèque** : Sauvegardez vos livres favoris en local
- 🌐 **Multi-sites** : Compatible avec ReadNovelFull, NovelFull, BoxNovel et bien d'autres
- 📱 **Responsive** : Fonctionne sur mobile, tablette et desktop
- ✨ **Interface moderne** : Design élégant avec effets visuels

## 🚀 Installation locale

### Prérequis
- Node.js 18 ou supérieur
- npm

### Étapes

```bash
# Installer les dépendances
npm install

# Lancer l'application
npm start
```

L'application sera accessible sur `http://localhost:3000`

## 📦 Déploiement sur o2switch

Pour déployer **Novel x Voice** sur o2switch, consultez le guide détaillé :

👉 **[Guide de déploiement o2switch](DEPLOIEMENT_O2SWITCH.md)**

Ce guide contient tout ce dont vous avez besoin :
- Instructions étape par étape (avec screenshots)
- Configuration SSH et FTP
- Installation de Node.js sur le serveur
- Configuration du domaine et SSL
- Optimisations et dépannage complet

## 🎮 Utilisation

### 1. Extraire des chapitres

1. Entrez l'URL du premier chapitre d'un roman
2. Choisissez le nombre de chapitres à extraire (1-50)
3. Cliquez sur "Extraire"
4. Attendez que l'extraction se termine

### 2. Lire avec la voix

1. Cliquez sur "Lire" dans la bibliothèque
2. Le lecteur s'ouvre avec le texte du chapitre
3. Appuyez sur Play ▶️ pour démarrer la lecture audio
4. Utilisez les contrôles pour :
   - ⏸️ Mettre en pause / reprendre
   - ⏩ Passer au chapitre suivant
   - ⏪ Revenir au chapitre précédent
   - ⚙️ Ajuster les paramètres de la voix

## 🛠️ Mode développement

Pour le développement avec rechargement automatique :
```bash
npm run dev
```

## 📋 Comment ça marche ?

1. **Extraction du contenu** : L'application télécharge la page HTML et utilise des sélecteurs intelligents pour identifier le contenu principal (article, post-content, etc.)

2. **Nettoyage** : Supprime automatiquement les publicités, scripts, iframes et autres éléments indésirables

3. **Navigation** : Détecte automatiquement le lien "Suivant" avec différentes méthodes (rel="next", class="next", texte "Suivant", etc.)

4. **Combinaison** : Tous les chapitres sont combinés avec des séparateurs clairs pour une lecture fluide

5. **Export** : Le texte final est prêt à être copié et utilisé dans n'importe quelle application de lecture audio

## 🎨 Captures d'écran

L'interface vous permet de :
- Coller simplement une URL
- Ajuster le nombre de chapitres
- Voir la progression de l'extraction
- Consulter les statistiques (nombre de chapitres, caractères, mots)
- Copier le résultat en un clic

## ⚠️ Limitations

- Délai de 1 seconde entre chaque requête pour ne pas surcharger les serveurs
- Fonctionne mieux avec des sites ayant une structure HTML standard
- Certains sites avec protection anti-scraping peuvent bloquer les requêtes
- Timeout de 10 secondes par page

## 🔧 Configuration

Vous pouvez modifier les paramètres dans [server.js](server.js) :

- `PORT` : Port du serveur (défaut: 3000)
- Sélecteurs de contenu dans `contentSelectors`
- Sélecteurs de navigation dans `nextSelectors`
- Délai entre les requêtes (défaut: 1000ms)

## 📝 Conseils d'utilisation

- Commencez avec un petit nombre de chapitres (5-10) pour tester
- Si l'extraction échoue, essayez une autre page du même site
- Vérifiez que l'URL est bien celle d'un chapitre, pas de l'index
- Pour les très longues séries, faites plusieurs extractions séparées

## 🆘 Dépannage

**L'extraction ne trouve aucun contenu** :
- Vérifiez que l'URL est correcte
- Le site peut avoir une structure inhabituelle
- Essayez avec une autre page du même site

**Le lien "Suivant" n'est pas détecté** :
- Le site utilise peut-être un système de navigation inhabituel
- Vous pouvez modifier les sélecteurs dans le code

**Erreur de timeout** :
- Le site est peut-être lent
- Augmentez le timeout dans le code

## 📄 Licence

Libre d'utilisation pour un usage personnel.

## 🙏 Crédits

Créé avec Node.js, Express, Axios et Cheerio.
