# Installation : Outils de prospection automatisée

1. **Préparer le Google Sheet** : Créer un document Google Sheets vierge, copier `suivi-modele.csv` → onglet « Suivi ».
2. **Ajouter les onglets** : « Messages » (id | objet | corps | relance_objet | relance_corps), « Désinscrits » (email), « Journal » (timestamp | action).
3. **Charger le script** : Extensions → Apps Script → copier `envoi.gs` dans l'éditeur.
4. **Vérifier MODE** : Ouvrir `envoi.gs`, confirmer `const MODE = "BROUILLON"` (ligne 10).
5. **Test** : Exécuter `testerScript()` dans l'éditeur. Vérifier les logs.
6. **Premier envoi** : Cliquer `envoyerMessages()`. Brouillons créés, relire chaque brouillon dans Gmail, puis Envoyer.
7. **Relances (J+5)** : `creerRelance()` génère des brouillons relance. Même processus.
8. **Passer en ENVOI** : Après validation en brouillons, modifier `const MODE = "ENVOI"` (dépêchez-vous seulement après relecture complète).
9. **Quota et pauses** : Par défaut 15 messages/jour max, pauses aléatoires 2–8 secondes.
10. **Limites** : Gmail quota ~500/jour ; risque spam élevé sur compte neuf ; opposition immédiate obligatoire (email → Désinscrits).
