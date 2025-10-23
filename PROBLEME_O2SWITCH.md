# 🚨 Problème de déploiement Node.js sur o2switch (cPanel)

**Date** : 23 octobre 2025
**Application** : Novel x Voice - Extracteur de chapitres avec synthèse vocale
**Hébergeur** : o2switch (cPanel + Phusion Passenger)
**URL cible** : http://ia-solutions-tech.fr/novelxvoice

---

## 📋 Résumé du problème

L'application Node.js **fonctionne parfaitement** sur :
- ✅ **Localhost** (Mac) - `http://localhost:3000`
- ✅ **Vercel** (serverless) - Déploiement réussi

Mais **échoue sur o2switch** (hébergement mutualisé cPanel) :
- ❌ **Page statique** : ✅ S'affiche correctement
- ❌ **API `/extract`** : ❌ Erreur "Le serveur ne répond pas correctement"
- ❌ **Node.js** : ❌ Commande introuvable dans SSH

---

## 🔍 Symptômes

### 1. **Le site statique fonctionne**
- URL : http://ia-solutions-tech.fr/novelxvoice
- Résultat : ✅ La page HTML s'affiche avec le formulaire
- Conclusion : Passenger sert bien les fichiers statiques depuis `/public/`

### 2. **L'API ne répond pas**
- Requête : `POST /novelxvoice/extract`
- Erreur frontend : "Le serveur ne répond pas correctement. Assurez-vous que le serveur Node.js est démarré (npm start)."
- Conclusion : Le backend Node.js ne traite pas les requêtes

### 3. **Node.js introuvable en SSH**
```bash
[vase0048@vanille novelxvoice]$ node server.js
bash: node : commande introuvable

[vase0048@vanille novelxvoice]$ which node
/usr/bin/which: no node in (/home/vase0048/.local/bin:/home/vase0048/bin:...)

[vase0048@vanille novelxvoice]$ ls -la /usr/bin/node
ls: impossible d'accéder à '/usr/bin/node': No such file or directory
```

### 4. **L'environnement virtuel n'existe pas**
```bash
[vase0048@vanille novelxvoice]$ source /home/vase0048/nodevenv/public_html/novelxvoice/20/bin/activate
bash: /home/vase0048/nodevenv/public_html/novelxvoice/20/bin/activate: No such file or directory
```

---

## 🛠️ Configuration actuelle

### **cPanel - Setup Node.js App**

| Paramètre | Valeur |
|-----------|--------|
| **Node.js version** | 20.x.x |
| **Application mode** | Production |
| **Application root** | `public_html/novelxvoice` |
| **Application URL** | `http://ia-solutions-tech.fr/novelxvoice` |
| **Application startup file** | `server.js` |
| **Environment variables** | `BASE_PATH = /novelxvoice` |
| **Statut affiché dans cPanel** | ✅ "Running" (vert) |

### **Structure des fichiers**

```
~/public_html/novelxvoice/
├── server.js             # Backend Express (modifié pour BASE_PATH)
├── package.json          # Dépendances npm
├── node_modules/         # ✅ Présent (npm install exécuté via cPanel)
├── public/
│   ├── index.html        # Frontend (modifié pour détecter BASE_PATH)
│   ├── reader.html
│   ├── library.js
│   └── TextToSpeech.js
└── .htaccess             # Généré automatiquement par cPanel
```

### **Code server.js (lignes clés)**

```javascript
const BASE_PATH = process.env.BASE_PATH || '';
app.use(BASE_PATH, express.static('public'));
app.post(BASE_PATH + '/extract', async (req, res) => {
  // ... logique d'extraction
});

// Configuration Passenger
if (typeof(PhusionPassenger) !== 'undefined') {
  PhusionPassenger.configure({ autoInstall: false });
  app.listen('passenger', () => {
    console.log('✓ Application Novel x Voice démarrée avec Passenger (o2switch)');
  });
}
```

✅ **Vérification SSH** :
```bash
[vase0048@vanille novelxvoice]$ grep "BASE_PATH" server.js
const BASE_PATH = process.env.BASE_PATH || '';
app.use(BASE_PATH, express.static('public'));
app.post(BASE_PATH + '/extract', async (req, res) => {
```

### **Code index.html (ligne 1494-1496)**

```javascript
// Détection automatique du base path
const basePath = window.location.pathname.includes('/novelxvoice') ? '/novelxvoice' : '';
const response = await fetch(`${basePath}/extract`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url, numChapters, blacklist, useAutoFilters })
});
```

---

## ❓ Questions / Hypothèses

### **Hypothèse 1 : L'environnement virtuel Node.js n'a jamais été créé**
- cPanel affiche "Running" mais l'environnement virtuel est vide
- Le fichier `activate` n'existe pas dans `/home/vase0048/nodevenv/.../20/bin/`
- Node.js n'est pas dans le PATH

### **Hypothèse 2 : Passenger ne démarre pas l'application**
- Passenger sert les fichiers statiques (HTML, CSS, JS)
- Mais ne lance pas le processus Node.js (`node server.js`)
- Aucun log d'erreur visible (`passenger.*.log` n'existe pas)

### **Hypothèse 3 : Problème de sous-répertoire**
- L'app est dans `public_html/novelxvoice/` (sous-dossier)
- cPanel supporte peut-être mal Node.js dans les sous-répertoires
- L'environnement virtuel devrait être à la racine (`public_html/`)

### **Hypothèse 4 : Configuration Passenger incorrecte**
- Le `.htaccess` généré par cPanel ne route pas vers Node.js
- Passenger ne reconnaît pas `server.js` comme point d'entrée

---

## ✅ Ce qui a été testé (sans succès)

1. ✅ **Création de l'application dans cPanel** → Statut "Running" mais ne fonctionne pas
2. ✅ **Modification de `server.js`** → Ajout du support `BASE_PATH`
3. ✅ **Modification de `index.html`** → Détection automatique du chemin API
4. ✅ **Configuration variable d'environnement** → `BASE_PATH = /novelxvoice` dans cPanel
5. ✅ **Restart de l'application** → Plusieurs fois via cPanel
6. ✅ **Vérification des fichiers** → `server.js` et `index.html` bien uploadés
7. ✅ **Installation des dépendances** → `node_modules/` présent (via cPanel "Run NPM Install")
8. ❌ **Activation manuelle de l'environnement virtuel** → Fichier `activate` introuvable
9. ❌ **Lancement manuel de Node.js** → Commande `node` introuvable
10. ❌ **Consultation des logs Passenger** → Aucun fichier log trouvé

---

## 🎯 Informations nécessaires pour débugger

### **À vérifier :**

1. **Le chemin complet de Node.js dans l'environnement virtuel**
   ```bash
   find /home/vase0048/nodevenv -name "node" -type f 2>/dev/null
   ```

2. **Le contenu du `.htaccess` généré par cPanel**
   ```bash
   cat ~/public_html/novelxvoice/.htaccess
   ```

3. **Les logs de Passenger**
   ```bash
   find ~/logs -name "*passenger*" -o -name "*error*" 2>/dev/null
   tail -100 ~/logs/*error* 2>/dev/null
   ```

4. **Le statut réel de l'application**
   ```bash
   curl -I http://ia-solutions-tech.fr/novelxvoice/extract
   ```

5. **La configuration Passenger de l'app**
   ```bash
   cat ~/public_html/novelxvoice/tmp/restart.txt 2>/dev/null
   ls -la ~/public_html/novelxvoice/tmp/
   ```

---

## 💡 Solutions possibles

### **Solution A : Trouver et utiliser le chemin complet de Node.js**
Si Node.js existe dans l'environnement virtuel mais n'est pas dans le PATH :
```bash
/home/vase0048/nodevenv/public_html/novelxvoice/20/bin/node server.js
```

### **Solution B : Recréer l'environnement virtuel**
1. Supprimer l'application dans cPanel
2. Supprimer le dossier `/home/vase0048/nodevenv/public_html/novelxvoice/`
3. Recréer l'application dans cPanel
4. Vérifier que le fichier `activate` est créé

### **Solution C : Déplacer l'app à la racine**
Déplacer l'app de `public_html/novelxvoice/` vers `public_html/` et configurer cPanel pour qu'elle serve depuis la racine.

### **Solution D : Contacter o2switch**
Demander au support technique si :
- Node.js est bien activé sur le compte
- L'environnement virtuel doit être créé manuellement
- Il y a des restrictions sur les sous-répertoires

### **Solution E : Utiliser Vercel (déjà fonctionnel)**
L'app fonctionne déjà parfaitement sur Vercel. Pointer le domaine `ia-solutions-tech.fr` vers Vercel au lieu de o2switch.

---

## 📦 Fichiers de l'application

- **GitHub** : https://github.com/sebbbb974/novel-x-voice
- **Vercel (fonctionnel)** : https://novel-x-voice.vercel.app
- **o2switch (non fonctionnel)** : http://ia-solutions-tech.fr/novelxvoice

---

## 🆘 Question pour l'IA

**Comment faire fonctionner une application Node.js + Express dans un sous-répertoire cPanel (o2switch) quand :**
- ✅ cPanel affiche "Running"
- ✅ Les fichiers statiques sont servis
- ✅ `node_modules/` est installé
- ❌ La commande `node` est introuvable en SSH
- ❌ L'environnement virtuel n'a pas de fichier `activate`
- ❌ Les requêtes API ne fonctionnent pas

**Est-ce un problème de configuration Passenger, d'environnement virtuel, ou faut-il activer quelque chose manuellement dans cPanel ?**
