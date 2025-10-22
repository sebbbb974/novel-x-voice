# 📘 Guide de Déploiement - Novel x Voice sur o2switch

## Table des matières
1. [Prérequis](#prérequis)
2. [Préparation de l'application](#préparation-de-lapplication)
3. [Configuration o2switch](#configuration-o2switch)
4. [Installation Node.js sur o2switch](#installation-nodejs-sur-o2switch)
5. [Déploiement de l'application](#déploiement-de-lapplication)
6. [Configuration du domaine](#configuration-du-domaine)
7. [Lancement de l'application](#lancement-de-lapplication)
8. [Maintenance et mises à jour](#maintenance-et-mises-à-jour)
9. [Dépannage](#dépannage)

---

## Prérequis

### Ce dont vous avez besoin :
- ✅ Un compte o2switch actif avec accès cPanel
- ✅ Node.js version 18 ou supérieure (sera installé sur le serveur)
- ✅ Un nom de domaine ou sous-domaine configuré
- ✅ Accès SSH à votre hébergement o2switch
- ✅ Un client FTP (FileZilla recommandé) ou accès au gestionnaire de fichiers cPanel

### Informations à récupérer :
- 📝 Votre nom d'utilisateur cPanel
- 📝 Votre mot de passe cPanel
- 📝 L'adresse de votre serveur SSH (exemple: `ssh.votredomaine.com`)
- 📝 Votre nom de domaine (exemple: `novelxvoice.com`)

---

## Préparation de l'application

### Étape 1 : Vérifier les fichiers localement

Assurez-vous que votre application fonctionne correctement en local :

```bash
# Dans le dossier de votre projet
npm install
npm start
```

Vérifiez que l'application s'ouvre sur `http://localhost:3000`

### Étape 2 : Nettoyer le projet

Supprimez les fichiers inutiles avant le déploiement :

```bash
# Supprimer node_modules (sera réinstallé sur le serveur)
rm -rf node_modules

# Supprimer les fichiers de cache
rm -rf .cache
rm -rf dist
```

### Étape 3 : Créer un fichier .env (optionnel)

> **Note** : Pour Novel x Voice, le fichier `.env` n'est **PAS nécessaire**. Votre application fonctionne sans variables d'environnement. Cette étape est optionnelle et utile seulement si vous voulez personnaliser le port ou d'autres paramètres.

Si vous souhaitez quand même créer un fichier `.env` pour configurer le port :

```bash
# Créer un fichier .env (OPTIONNEL)
touch .env
```

Contenu du fichier `.env` (si vous le créez) :
```env
PORT=3000
NODE_ENV=production
```

**Pour Novel x Voice : vous pouvez sauter cette étape !**

### Étape 4 : Vérifier le fichier package.json

Assurez-vous que votre `package.json` contient :

```json
{
  "name": "novel-x-voice",
  "version": "1.0.0",
  "description": "Novel x Voice - Extracteur et lecteur audio de romans web",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Configuration o2switch

### Étape 1 : Connexion à cPanel

1. Allez sur `https://votredomaine.com/cpanel` ou `https://cpanel.votredomaine.com`
2. Entrez vos identifiants cPanel
3. Vous êtes maintenant dans le panneau de contrôle

### Étape 2 : Activer l'accès SSH

1. Dans cPanel, cherchez **"SSH Access"** ou **"Accès SSH"**
2. Cliquez sur **"Manage SSH Keys"** (Gérer les clés SSH)
3. Si ce n'est pas déjà fait, générez une paire de clés SSH
4. Activez votre clé publique

> **Note importante** : Si vous ne trouvez pas l'option SSH, contactez le support o2switch pour l'activer. C'est généralement gratuit et activé en quelques minutes.

### Étape 3 : Créer un sous-domaine (optionnel)

Si vous voulez utiliser un sous-domaine comme `app.votredomaine.com` :

1. Dans cPanel, allez dans **"Sous-domaines"** ou **"Subdomains"**
2. Créez un nouveau sous-domaine :
   - **Sous-domaine** : `app` (ou le nom de votre choix)
   - **Domaine** : sélectionnez votre domaine principal
   - **Racine du document** : `/home/votreuser/novel-x-voice/public`
3. Cliquez sur **"Créer"**

---

## Installation Node.js sur o2switch

o2switch permet d'utiliser Node.js via l'interface **"Setup Node.js App"**.

### Étape 1 : Accéder à l'interface Node.js

1. Dans cPanel, cherchez **"Setup Node.js App"** ou **"Application Node.js"**
2. Cliquez dessus

### Étape 2 : Créer une nouvelle application Node.js

1. Cliquez sur **"Create Application"** (Créer une application)
2. Remplissez les informations :
   - **Node.js version** : Choisissez la version 18 ou supérieure
   - **Application mode** : `Production`
   - **Application root** : `/home/votreuser/novel-x-voice`
   - **Application URL** : Choisissez votre domaine ou sous-domaine
   - **Application startup file** : `server.js`
   - **Passenger log file** : `/home/votreuser/novel-x-voice/logs/passenger.log`
3. Cliquez sur **"Create"** (Créer)

> **Important** : Notez le chemin virtuel généré (par exemple `/nodejs`). Vous en aurez besoin.

---

## Déploiement de l'application

### Méthode 1 : Upload via FTP (Recommandé pour débutants)

#### Étape 1 : Connexion FTP

1. Téléchargez et installez **FileZilla** : https://filezilla-project.org/
2. Ouvrez FileZilla et connectez-vous :
   - **Hôte** : `ftp.votredomaine.com` ou l'adresse fournie par o2switch
   - **Nom d'utilisateur** : votre nom d'utilisateur cPanel
   - **Mot de passe** : votre mot de passe cPanel
   - **Port** : 21 (FTP) ou 22 (SFTP - plus sécurisé)

#### Étape 2 : Créer le dossier de l'application

1. Dans FileZilla, naviguez vers `/home/votreuser/`
2. Créez un nouveau dossier : **`novel-x-voice`** (avec des tirets, PAS d'espaces !)
3. Entrez dans ce dossier

> ⚠️ **IMPORTANT** : N'utilisez PAS d'espaces dans le nom du dossier ! Utilisez `novel-x-voice` et non `Novel x Voice`

#### Étape 3 : Uploader les fichiers

1. Sur votre ordinateur (panneau gauche de FileZilla), naviguez vers votre dossier `extracteur`
2. Sélectionnez **tous les fichiers** SAUF :
   - Le dossier `node_modules`
   - Les fichiers `.DS_Store`
   - Le dossier `.git` (si présent)
3. Glissez-déposez les fichiers vers le serveur (panneau droit)

#### Fichiers à uploader (pour Novel x Voice) :
```
✅ server.js
✅ package.json
✅ package-lock.json (si présent)
✅ public/ (tout le dossier avec tous les fichiers HTML, CSS, JS)
✅ DEPLOIEMENT_O2SWITCH.md (ce guide)
❌ node_modules/ (NE PAS uploader - sera installé sur le serveur)
❌ .env (NON NÉCESSAIRE pour Novel x Voice)
❌ .git/ (NE PAS uploader si présent)
❌ .DS_Store (NE PAS uploader)
```

**Structure des fichiers sur le serveur** :
```
~/novel-x-voice/
├── server.js
├── package.json
├── package-lock.json
├── public/
│   ├── index.html
│   ├── reader.html
│   ├── TextToSpeech.js
│   └── library.js
└── DEPLOIEMENT_O2SWITCH.md
```

### Méthode 2 : Upload via SSH (Pour utilisateurs avancés)

#### Étape 1 : Connexion SSH

Ouvrez un terminal et connectez-vous :

```bash
ssh votreuser@ssh.votredomaine.com
```

Entrez votre mot de passe quand demandé.

#### Étape 2 : Créer le dossier

```bash
cd ~
mkdir novel-x-voice    # Avec des tirets, PAS d'espaces !
cd novel-x-voice
```

> ⚠️ **ATTENTION** : Utilisez bien `novel-x-voice` (avec tirets) et PAS `Novel x Voice` (avec espaces)

#### Étape 3 : Uploader via SCP

Depuis votre ordinateur (nouvel onglet de terminal) :

```bash
# Depuis le dossier extracteur
scp -r * votreuser@ssh.votredomaine.com:~/novel-x-voice/
```

Ou utilisez `rsync` (plus efficace) :

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' ./ votreuser@ssh.votredomaine.com:~/novel-x-voice/
```

---

## Installation des dépendances

### Via l'interface cPanel

1. Retournez dans **"Setup Node.js App"** dans cPanel
2. Trouvez votre application dans la liste
3. Cliquez sur le nom de l'application
4. Dans la section **"Detected configuration files"**, cliquez sur **"Run NPM Install"**
5. Attendez que l'installation se termine (peut prendre 2-5 minutes)

### Via SSH

```bash
cd ~/novel-x-voice
npm install --production
```

---

## Configuration du domaine

### Étape 1 : Configurer le .htaccess

Créez un fichier `.htaccess` dans `/home/votreuser/public_html` (ou dans le dossier de votre sous-domaine) :

```bash
nano ~/public_html/.htaccess
```

Ajoutez ce contenu :

```apache
# Redirection vers l'application Node.js
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

**Explication** :
- `RewriteEngine On` : Active la réécriture d'URL
- Les conditions vérifient que le fichier/dossier n'existe pas
- `RewriteRule` redirige vers votre application Node.js sur le port 3000
- `[P,L]` : Proxy la requête (P) et arrête le traitement (L)

Sauvegardez avec `Ctrl+O`, puis `Entrée`, puis `Ctrl+X`.

### Étape 2 : Vérifier les permissions

```bash
chmod 644 ~/public_html/.htaccess
```

---

## Lancement de l'application

### Méthode 1 : Via cPanel (Recommandé)

1. Allez dans **"Setup Node.js App"**
2. Trouvez votre application
3. Cliquez sur **"Start App"** ou **"Restart App"**
4. L'application devrait démarrer et afficher un statut **"Running"**

### Méthode 2 : Via SSH avec PM2

PM2 est un gestionnaire de processus pour Node.js qui permet de maintenir votre application en ligne.

#### Installation de PM2

```bash
cd ~/novel-x-voice
npm install pm2 -g
```

#### Lancement de l'application

```bash
pm2 start server.js --name novel-x-voice
pm2 save
pm2 startup
```

#### Commandes utiles PM2

```bash
# Voir les applications en cours
pm2 list

# Redémarrer l'application
pm2 restart novel-x-voice

# Arrêter l'application
pm2 stop novel-x-voice

# Voir les logs
pm2 logs novel-x-voice

# Voir les statistiques
pm2 monit
```

---

## Vérification du déploiement

### Étape 1 : Tester l'application

1. Ouvrez votre navigateur
2. Allez sur `https://votredomaine.com` ou `https://app.votredomaine.com`
3. Vous devriez voir la page **"Novel x Voice"** 📖

### Étape 2 : Tester les fonctionnalités

1. Essayez d'extraire un chapitre
2. Testez le lecteur audio
3. Vérifiez que tout fonctionne correctement

### Étape 3 : Vérifier les logs

Via SSH :

```bash
# Logs de l'application
tail -f ~/novel-x-voice/logs/app.log

# Logs PM2 (si vous utilisez PM2)
pm2 logs novel-x-voice
```

Via cPanel :
1. Allez dans **"Setup Node.js App"**
2. Cliquez sur votre application
3. Cliquez sur **"Show Logs"**

---

## Maintenance et mises à jour

### Mettre à jour l'application

#### Via FTP

1. Connectez-vous via FileZilla
2. Uploadez les fichiers modifiés
3. Redémarrez l'application depuis cPanel ou avec PM2

#### Via SSH

```bash
cd ~/novel-x-voice

# Faire une sauvegarde
cp -r ~/novel-x-voice ~/novel-x-voice-backup-$(date +%Y%m%d)

# Uploader les nouveaux fichiers (via SCP ou Git)
# ...

# Installer les nouvelles dépendances
npm install --production

# Redémarrer
pm2 restart novel-x-voice
```

### Sauvegardes automatiques

Créez un script de sauvegarde :

```bash
nano ~/backup-novel.sh
```

Contenu :

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/novel-x-voice-$DATE.tar.gz ~/novel-x-voice
# Garder seulement les 7 dernières sauvegardes
find $BACKUP_DIR -name "novel-x-voice-*.tar.gz" -mtime +7 -delete
```

Rendez-le exécutable :

```bash
chmod +x ~/backup-novel.sh
```

Ajoutez une tâche cron (dans cPanel, section **"Tâches Cron"**) :

```
0 2 * * * /home/votreuser/backup-novel.sh
```

Cela créera une sauvegarde tous les jours à 2h du matin.

---

## Dépannage

### Erreur : "package.json est dans un sous-dossier avec des espaces"

**Symptôme** : npm ne trouve pas le `package.json` ou signale qu'il est dans un sous-dossier avec des espaces.

**Cause** : Vous avez créé un dossier avec des espaces comme `Novel x Voice` au lieu de `novel-x-voice`.

**Solution** :

1. **Via SSH**, renommez le dossier :
   ```bash
   cd ~
   mv "Novel x Voice" novel-x-voice
   cd novel-x-voice
   npm install
   ```

2. **Via cPanel File Manager** :
   - Allez dans le gestionnaire de fichiers
   - Trouvez le dossier `Novel x Voice`
   - Clic droit → Rename
   - Renommez en `novel-x-voice` (sans espaces, tout en minuscules, avec tirets)
   - Réinstallez les dépendances via SSH ou l'interface Node.js

3. **Si vous préférez repartir de zéro** :
   ```bash
   # Supprimer l'ancien dossier
   rm -rf "Novel x Voice"

   # Créer le bon dossier
   mkdir novel-x-voice
   cd novel-x-voice

   # Re-uploader vos fichiers dans ce nouveau dossier
   ```

> **Règle d'or** : Sur les serveurs Linux, utilisez TOUJOURS des noms de dossiers/fichiers en minuscules, avec des tirets au lieu d'espaces !

### L'application ne démarre pas

**Vérifications** :

1. **Vérifier les logs** :
   ```bash
   pm2 logs novel-x-voice
   # ou
   tail -f ~/novel-x-voice/logs/passenger.log
   ```

2. **Vérifier que le port 3000 n'est pas déjà utilisé** :
   ```bash
   lsof -i :3000
   ```

3. **Vérifier les permissions** :
   ```bash
   chmod -R 755 ~/novel-x-voice
   ```

4. **Vérifier que Node.js est bien installé** :
   ```bash
   node --version
   npm --version
   ```

### Erreur 502 Bad Gateway

Cela signifie généralement que l'application Node.js n'est pas en cours d'exécution.

**Solutions** :

1. Redémarrez l'application :
   ```bash
   pm2 restart novel-x-voice
   ```

2. Vérifiez le fichier `.htaccess`

3. Vérifiez que le port dans `server.js` correspond bien à celui dans `.htaccess`

### Erreur 404 sur les fichiers statiques

**Solution** : Vérifiez que le dossier `public` est bien uploadé et que les permissions sont correctes :

```bash
chmod -R 755 ~/novel-x-voice/public
```

### L'application se coupe après quelques minutes

Utilisez PM2 pour maintenir l'application en ligne :

```bash
pm2 start server.js --name novel-x-voice
pm2 save
pm2 startup
```

### Erreur de mémoire

o2switch limite la mémoire. Si vous avez des erreurs de mémoire :

1. Optimisez votre code
2. Limitez la mémoire de Node.js :
   ```bash
   pm2 start server.js --name novel-x-voice --max-memory-restart 500M
   ```

### Problèmes de connexion SSH

1. Vérifiez que SSH est activé dans cPanel
2. Contactez le support o2switch : support@o2switch.fr
3. Utilisez le port 22 pour SSH

---

## Configuration SSL/HTTPS (Recommandé)

### Via cPanel

1. Allez dans **"SSL/TLS Status"**
2. Sélectionnez votre domaine
3. Cliquez sur **"Run AutoSSL"**
4. Attendez quelques minutes
5. Votre site sera accessible en HTTPS

### Forcer HTTPS

Ajoutez au début de votre `.htaccess` :

```apache
# Forcer HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## Optimisations performances

### 1. Activer la compression

Dans votre `server.js`, ajoutez :

```javascript
const compression = require('compression');
app.use(compression());
```

Puis installez :

```bash
npm install compression --save
```

### 2. Mettre en cache les fichiers statiques

Dans `.htaccess` :

```apache
# Cache les fichiers statiques pour 1 an
<FilesMatch "\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$">
    Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
```

### 3. Activer Node.js en mode production

Dans votre `.env` :

```env
NODE_ENV=production
```

---

## Support

### Contacter o2switch

- 📧 Email : support@o2switch.fr
- 💬 Chat : Disponible sur le site o2switch.fr
- 📞 Téléphone : +33 4 44 44 60 40

### Ressources utiles

- Documentation o2switch : https://faq.o2switch.fr/
- Documentation Node.js : https://nodejs.org/docs/
- Documentation PM2 : https://pm2.keymetrics.io/docs/

---

## Checklist finale

Avant de considérer le déploiement comme terminé :

- [ ] L'application est accessible via votre domaine
- [ ] HTTPS est activé et fonctionne
- [ ] Le lecteur audio fonctionne correctement
- [ ] L'extraction de chapitres fonctionne
- [ ] PM2 est configuré et l'application redémarre automatiquement
- [ ] Les sauvegardes automatiques sont en place
- [ ] Les logs sont accessibles et consultés
- [ ] La performance est satisfaisante

---

**🎉 Félicitations !** Votre application **Novel x Voice** est maintenant déployée sur o2switch !

Si vous rencontrez des problèmes, n'hésitez pas à consulter la section Dépannage ou à contacter le support o2switch.

---

*Guide créé pour Novel x Voice - Version 1.0*
*Dernière mise à jour : 2025*
