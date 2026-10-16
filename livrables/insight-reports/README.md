# Insight Reports — outil client local

Version initiale du 16 octobre 2026, créée à la demande de poursuivre les outils clients commercialisables. Cible de travail : agences marketing, communication et web. Le produit exploite un export de factures, sans intégration à une banque ou à un logiciel. Il ne mesure pas l'activité de prospection.

## Utilisation

Ouvrir `index.html`, puis « Voir un exemple fictif » pour découvrir le rapport. Pour son dossier, télécharger le modèle CSV, renseigner les huit colonnes et importer le fichier. Choisir une période d'émission, une date de situation et éventuellement un client, puis cliquer sur Actualiser. Exporter les indicateurs CSV ou imprimer le rapport depuis le navigateur.

Le dossier est exclusivement en mémoire. Recharger ou fermer l'onglet l'efface ; conserver le CSV source dans son espace privé. L'export contient les indicateurs et les mois calculés, pas une sauvegarde réimportable du dossier. Fermer le dossier courant avant de travailler sur un autre client. Une confirmation précède le remplacement.

Pour servir la version locale, depuis la racine du dépôt :

```powershell
python -m http.server 8767 --bind 127.0.0.1 --directory livrables
```

Ouvrir `http://127.0.0.1:8767/insight-reports/`. Le serveur doit exposer le dossier `livrables` car les calculs sont réutilisés dans le dossier voisin `outil-equerre`. Une livraison doit conserver ces dépendances et leurs chemins relatifs ; ne pas distribuer seulement le dossier Insight Reports. Aucun paquet à installer.

## Contrat CSV

Colonnes requises, sans colonnes supplémentaires : `numero`, `client`, `date_emission`, `date_echeance`, `montant_ht`, `montant_ttc`, `statut`, `date_paiement`.

- Séparateurs reconnus par le lecteur Équerre : point-virgule, virgule, tabulation. Guillemets et champs multi-lignes pris en charge.
- Dates AAAA-MM-JJ, années 2000 à 2099. Échéance ≥ émission ; paiement ≥ émission.
- Montants positifs ou nuls, en euros, maximum 10 000 000 € par montant. Pas de séparateurs de milliers, deux décimales maximum ; virgule ou point décimal. TTC ≥ HT.
- Statut `payee` avec date de paiement, ou `non_payee` sans date de paiement. Aucun paiement partiel ni avoir. Ne pas transformer un paiement partiel en non_payee : préparer un autre périmètre de traitement.
- Numéro unique, comparaison sans distinction de casse. Nom client exact pour le regroupement ; variantes de noms non fusionnées. Certains noms correspondant à des clés JavaScript réservées sont refusés avant le moteur historique.
- 5 Mo, 10 000 lignes et 500 caractères par champ maximum. Refus global si une ligne est invalide ; les 50 premières erreurs sont affichées. Le dossier précédent reste disponible en cas de refus.

## Signification des indicateurs

Le facturé HT correspond aux factures émises sur la période choisie. Les autres montants concernent **ces mêmes factures**, à la date de situation : intégralement réglées TTC, non réglées TTC et part échue TTC. « Réglé TTC » n'est pas l'ensemble des encaissements bancaires intervenus sur la période : une facture émise avant celle-ci en est exclue. Les paiements postérieurs à la situation sont neutralisés pour reconstruire l'état historique. Les factures émises après la situation sont exclues et comptées dans une notice.

Le graphique présente au maximum les douze derniers mois calculés ; l'export inclut tous les mois du périmètre. Le tableau de détail est paginé à 100 lignes. L'impression contient uniquement la page de détail affichée, mentionnée dans le rapport. Un rapport vide est possible et explicitement affiché. Aucun commentaire ou prévision IA n'est généré.

## Architecture

`logic.js` adapte les données au noyau existant sans le modifier : lecture CSV, normalisation des factures et reporting depuis `outil-equerre/js/core/`. Il contrôle un format plus strict que l'outil historique. `app.js` gère l'import, les filtres, le rendu via `textContent`, les téléchargements Blob et l'impression. Pas de requête API, de stockage persistant, de connecteur ou de compte. La politique CSP bloque les connexions.

Le nom d'entreprise, les noms de clients et les données proviennent de l'utilisateur. Ne jamais placer les exports réels dans Git ; conserver les données hors du dépôt. La démo embarquée est entièrement fictive et identifiée comme telle.

## Vérification exécutée

```powershell
node livrables/insight-reports/tests/run-tests.js
node --check livrables/insight-reports/app.js
node livrables/outil-equerre/tests/run-tests.js
```

**21 tests Insight Reports** couvrent les totaux, le passé reconstitué, les filtres, les dates limites, les montants, doublons, en-têtes, statuts, données non fiables et export CSV. Les tests du noyau Équerre sont relancés pour valider les dépendances réutilisées.

Recette Playwright sur serveur local avec données fictives : **19 contrôles réussis**, incluant import réel d'un CSV via le navigateur, rejet d'une ligne invalide, conservation de l'ancien rapport, filtre, interdiction d'export périmé, téléchargement, réinitialisation et cinq tailles de 320 à 1 440 px sans débordement de page. Le média print masque les paramètres et conserve le rapport. Les confirmations de remplacement sont simulées dans cette recette. Le bureau et le mobile sont inspectés visuellement. Pas d'impression physique ni d'export PDF réalisés. Aucun compte client utilisé. L'ouverture directe `file://` n'est pas testée dans cette recette.
