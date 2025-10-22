# Déploiement sur Netlify

## Option 1: Drag & Drop (le plus simple)

1. Va sur https://app.netlify.com/drop
2. **Drag & Drop le dossier `/extracteur`** directement sur la page
3. Netlify va :
   - Lire `netlify.toml` pour la config
   - Déployer le contenu de `dist/` comme site web
   - Installer les dépendances dans `netlify/functions/`
   - Créer les fonctions serverless automatiquement

C'est tout ! Ton site sera en ligne en quelques secondes.

## Option 2: Via Git

1. Initialise un repo git :
```bash
cd /Users/sebastienrode/Desktop/extracteur
git init
git add .
git commit -m "Initial commit"
```

2. Push sur GitHub/GitLab

3. Connecte le repo sur Netlify

## Structure des fichiers pour Netlify

```
extracteur/
├── dist/                    # Site web (frontend)
│   └── index.html
├── netlify/
│   └── functions/          # Fonctions serverless (backend)
│       ├── extract.js      # API d'extraction
│       └── package.json    # Dépendances pour les fonctions
└── netlify.toml            # Configuration Netlify
```

## Après le déploiement

Ton site sera accessible à une URL du type :
`https://[nom-random].netlify.app`

Tu pourras ensuite :
- Personnaliser le nom de domaine
- Ajouter un domaine custom
- Voir les logs des fonctions

## Notes importantes

- Les fonctions Netlify ont un timeout de 10 secondes sur le plan gratuit
- Si tu extrais beaucoup de chapitres, passe au plan Pro (timeout de 26s)
- Les fonctions sont automatiquement déployées avec le site
