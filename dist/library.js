/**
 * Module de gestion de la bibliothèque locale
 * Sauvegarde et charge les livres depuis localStorage
 */

class Library {
    constructor() {
        this.storageKey = 'novel-library';
        this.currentBookKey = 'current-book';
    }

    /**
     * Sauvegarde un livre dans la bibliothèque
     */
    saveBook(book) {
        const library = this.getAllBooks();

        // Vérifier si le livre existe déjà (par URL du premier chapitre)
        const existingIndex = library.findIndex(b => b.id === book.id);

        if (existingIndex >= 0) {
            // Mettre à jour le livre existant
            library[existingIndex] = {
                ...library[existingIndex],
                ...book,
                lastUpdated: Date.now()
            };
        } else {
            // Ajouter un nouveau livre
            book.id = book.id || this.generateId();
            book.createdAt = Date.now();
            book.lastUpdated = Date.now();
            library.push(book);
        }

        this.saveLibrary(library);
        return book;
    }

    /**
     * Récupère tous les livres de la bibliothèque
     */
    getAllBooks() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Erreur lors du chargement de la bibliothèque:', e);
            return [];
        }
    }

    /**
     * Récupère un livre par son ID
     */
    getBook(id) {
        const library = this.getAllBooks();
        return library.find(b => b.id === id);
    }

    /**
     * Supprime un livre de la bibliothèque
     */
    deleteBook(id) {
        let library = this.getAllBooks();
        library = library.filter(b => b.id !== id);
        this.saveLibrary(library);
    }

    /**
     * Sauvegarde toute la bibliothèque
     */
    saveLibrary(library) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(library));
        } catch (e) {
            console.error('Erreur lors de la sauvegarde de la bibliothèque:', e);
            if (e.name === 'QuotaExceededError') {
                alert('Espace de stockage insuffisant. Veuillez supprimer des livres.');
            }
        }
    }

    /**
     * Génère un ID unique pour un livre
     */
    generateId() {
        return 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Sauvegarde le livre actuellement en cours de lecture
     */
    setCurrentBook(bookData) {
        try {
            localStorage.setItem(this.currentBookKey, JSON.stringify(bookData));
        } catch (e) {
            console.error('Erreur lors de la sauvegarde du livre actuel:', e);
        }
    }

    /**
     * Récupère le livre actuellement en cours de lecture
     */
    getCurrentBook() {
        try {
            const data = localStorage.getItem(this.currentBookKey);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Erreur lors du chargement du livre actuel:', e);
            return null;
        }
    }

    /**
     * Efface le livre actuel
     */
    clearCurrentBook() {
        localStorage.removeItem(this.currentBookKey);
    }

    /**
     * Met à jour la progression de lecture d'un livre
     */
    updateProgress(bookId, progress) {
        const book = this.getBook(bookId);
        if (book) {
            book.progress = progress;
            book.lastRead = Date.now();
            this.saveBook(book);
        }
    }

    /**
     * Recherche des livres par titre
     */
    searchBooks(query) {
        const library = this.getAllBooks();
        const lowerQuery = query.toLowerCase();
        return library.filter(book =>
            book.title.toLowerCase().includes(lowerQuery) ||
            (book.author && book.author.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Trie les livres par date de dernière lecture
     */
    getRecentBooks(limit = 10) {
        const library = this.getAllBooks();
        return library
            .sort((a, b) => (b.lastRead || 0) - (a.lastRead || 0))
            .slice(0, limit);
    }

    /**
     * Exporte la bibliothèque au format JSON
     */
    exportLibrary() {
        const library = this.getAllBooks();
        const dataStr = JSON.stringify(library, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `novel-library-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Importe une bibliothèque depuis un fichier JSON
     */
    importLibrary(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                const library = this.getAllBooks();

                // Fusionner avec la bibliothèque existante
                imported.forEach(book => {
                    const exists = library.find(b => b.id === book.id);
                    if (!exists) {
                        library.push(book);
                    }
                });

                this.saveLibrary(library);
                return true;
            }
        } catch (e) {
            console.error('Erreur lors de l\'importation:', e);
            return false;
        }
    }

    /**
     * Efface toute la bibliothèque
     */
    clearLibrary() {
        if (confirm('Êtes-vous sûr de vouloir effacer toute la bibliothèque ?')) {
            localStorage.removeItem(this.storageKey);
            this.clearCurrentBook();
            return true;
        }
        return false;
    }

    /**
     * Obtient des statistiques sur la bibliothèque
     */
    getStats() {
        const library = this.getAllBooks();

        return {
            totalBooks: library.length,
            totalChapters: library.reduce((sum, book) => sum + (book.chapters?.length || 0), 0),
            totalCharacters: library.reduce((sum, book) => sum + (book.totalLength || 0), 0),
            lastRead: library.length > 0
                ? new Date(Math.max(...library.map(b => b.lastRead || 0)))
                : null
        };
    }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Library;
}
