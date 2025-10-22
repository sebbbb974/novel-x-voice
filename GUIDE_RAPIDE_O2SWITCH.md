# 🚀 Guide Rapide - Déploiement Novel x Voice sur o2switch

## ⚠️ RÈGLE N°1 - TRÈS IMPORTANT

**N'UTILISEZ JAMAIS D'ESPACES DANS LES NOMS DE DOSSIERS SUR LE SERVEUR !**

❌ **FAUX** : `Novel x Voice`
✅ **CORRECT** : `novel-x-voice`

---

## 📋 Checklist rapide

### Avant de commencer

- [ ] J'ai un compte o2switch actif
- [ ] J'ai mes identifiants cPanel
- [ ] J'ai FileZilla ou un autre client FTP installé
- [ ] Mon application fonctionne en local (test sur http://localhost:3000)

### Sur o2switch

- [ ] J'ai créé le dossier `novel-x-voice` (AVEC TIRETS, SANS ESPACES)
- [ ] J'ai uploadé tous les fichiers SAUF `node_modules`
- [ ] J'ai configuré Node.js App dans cPanel
- [ ] J'ai fait "Run NPM Install"
- [ ] L'application est "Running" (statut vert)
- [ ] Mon domaine pointe vers l'application
- [ ] J'ai testé l'URL et ça fonctionne

---

## 🛠️ Solution rapide si erreur "package.json dans sous-dossier"

### Vous avez créé un dossier avec des espaces ?

**Connectez-vous en SSH** et tapez :

```bash
cd ~
mv "Novel x Voice" novel-x-voice
cd novel-x-voice
npm install
pm2 start server.js --name novel-x-voice
```

**Ou via cPanel File Manager** :
1. Trouvez le dossier `Novel x Voice`
2. Clic droit → Rename
3. Renommez en `novel-x-voice`

---

## 📦 Commandes utiles SSH

### Se connecter
```bash
ssh votreuser@ssh.votredomaine.com
```

### Naviguer
```bash
cd ~/novel-x-voice           # Aller dans le dossier de l'app
ls -la                       # Voir tous les fichiers
pwd                          # Voir où je suis
```

### Gérer l'application avec PM2
```bash
pm2 list                     # Voir les apps qui tournent
pm2 restart novel-x-voice    # Redémarrer l'app
pm2 logs novel-x-voice       # Voir les logs
pm2 stop novel-x-voice       # Arrêter l'app
```

### Installer/Mettre à jour
```bash
cd ~/novel-x-voice
npm install                  # Installer les dépendances
node server.js              # Tester l'app manuellement
```

---

## 🔍 Vérifications rapides

### L'app ne se lance pas ?

1. **Vérifier le nom du dossier** :
   ```bash
   cd ~
   ls -la
   # Le dossier doit s'appeler "novel-x-voice" (pas d'espaces !)
   ```

2. **Vérifier que package.json existe** :
   ```bash
   cd ~/novel-x-voice
   ls -la package.json
   # Doit afficher : package.json
   ```

3. **Vérifier les dépendances** :
   ```bash
   cd ~/novel-x-voice
   ls -la node_modules
   # Doit afficher plein de dossiers
   # Si vide, faire : npm install
   ```

4. **Vérifier les logs** :
   ```bash
   pm2 logs novel-x-voice
   # Ou
   cat ~/novel-x-voice/logs/app.log
   ```

---

## 📞 Aide rapide

### Erreur "EADDRINUSE: address already in use"
→ Le port 3000 est déjà utilisé
```bash
pm2 stop all
pm2 start server.js --name novel-x-voice
```

### Erreur "Cannot find module"
→ Les dépendances ne sont pas installées
```bash
cd ~/novel-x-voice
rm -rf node_modules
npm install
```

### Page blanche ou erreur 502
→ L'application ne tourne pas
```bash
pm2 restart novel-x-voice
# Ou
pm2 start server.js --name novel-x-voice
```

---

## ✅ Test final

Une fois tout configuré, testez ces URLs :

1. **Page d'accueil** : `https://votredomaine.com`
   - Doit afficher "📖 Novel x Voice"

2. **Extraction** : Testez d'extraire un chapitre
   - Entrez une URL de roman
   - Cliquez sur "Extraire"

3. **Lecteur** : Testez la lecture audio
   - Cliquez sur "Lire"
   - Appuyez sur Play ▶️
   - La voix doit fonctionner

---

## 📚 Guide complet

Pour plus de détails, consultez le guide complet :
👉 [DEPLOIEMENT_O2SWITCH.md](DEPLOIEMENT_O2SWITCH.md)

---

**Bonne chance ! 🚀**

*Si vous avez des problèmes, vérifiez d'abord que le nom du dossier ne contient PAS d'espaces !*
