# Recette — pipeline agence 0.1

17 octobre 2026. Vérifications locales uniquement. Cette recette ne certifie pas un import ou une exécution n8n, Claude, Telegram ou Hermes.

Résultats exécutés : **33 tests Python réussis**, incluant des échanges HTTP réels sur loopback ; **15 blocs/expressions JavaScript compilés** et simulations de configuration, lot, sortie Claude fictive et rattachement au job réussies. Démo CLI : trois fiches fictives importées, deux brouillons locaux préparés, troisième fiche non approuvée ignorée ; au rejeu, aucune nouvelle fiche ni brouillon. Aucun fournisseur externe appelé.

## Complément du 18 octobre — rendu des premiers contacts

**40 tests Python réussis** avec `/usr/bin/python3` (Python 3.9 de l'environnement macOS), commande `python3 -m unittest discover -s livrables/automatisations/pipeline-agence/tests -v`. Premier passage dans le bac à sable : 34 réussites, cinq erreurs d'ouverture de port local (`PermissionError`). Après autorisation d'exécution hors bac à sable, les cinq tests HTTP sur `127.0.0.1` passent aussi ; dernier passage complet : 40/40.

Les sept contrôles ajoutés couvrent la concordance des deux modèles texte avec la référence rédactionnelle, le marquage incomplet sans identité, le rendu des deux offres avec identité fictive, l'absence d'identité dans les requêtes modèle et les agrégats, le rejet des champs invalides, la lecture explicite du JSON et le refus d'un chemin `.env` avant lecture, et la conservation d'un brouillon après changement de configuration.

Démo CLI exécutée deux fois sur une base temporaire : deux brouillons fictifs, mêmes textes et identifiants après rejeu, tous deux `identity_incomplete`. [Aperçu produit par cette exécution](EXEMPLES_BROUILLONS_FICTIFS.md). `git diff --check` réussi. Les contrôles JavaScript ne sont pas réexécutés dans cette session : Node absent du PATH ; aucun workflow ni générateur modifié. Les tests Python vérifient toujours la concordance des exports avec le générateur et leur état inactif.

Le SIRET fictif de test à 14 zéros vérifie uniquement le format attendu ; aucune validité administrative n'est déduite. Les modèles restent à valider avant campagne. Aucun test n8n, Claude, Telegram ou Hermes réel n'a été réalisé le 18 octobre.

## Commandes de vérification

Depuis la racine du dépôt :

```powershell
python -m unittest discover -s livrables/automatisations/pipeline-agence/tests -v
node livrables/automatisations/pipeline-agence/tests/check-n8n.js
python livrables/automatisations/pipeline-agence/pipeline.py demo
```

Dans la session examinée : Python via `C:/Users/kelia/miniconda3/python.exe` ; Node fourni par VS Code avec `ELECTRON_RUN_AS_NODE=1`, sans installation de paquet. La variable ne s'applique qu'au processus de vérification et est restaurée après.

## Couverture des contrôles locaux

| Domaine | Vérification |
|---|---|
| Import | Sources et adresses structurées, approbation booléenne, rejet d'un lot invalide avant écriture |
| Identité | Unicité email et domaine, aucune création en double après reprise |
| Réservation | Transaction SQLite, plafond quotidien, concurrence locale, reprise sans nouvelle réservation |
| Claude | Aucune adresse destinataire dans le prompt, réponse JSON bornée, fait exact, pas de clés de routage, refus des réponses tronquées |
| Brouillons | Création locale, rejeu idempotent, aucun écrasement par une réponse différente |
| Oppositions | Exclusion avant finalisation et retrait de la queue |
| Événements | Confirmation humaine requise, référence unique, facture et encaissement distincts |
| Montants | Centimes entiers, rejet des nombres flottants, rendu EUR déterministe |
| Rapport | Agrégats sans coordonnées, date Europe/Paris, inconnues hors registre explicites |
| Pont HTTP | Échanges réels sur loopback, authentification requise, refus des routes inconnues et du mode live par défaut |
| n8n | JSON reproductibles, chemins du graphe cohérents, workflows inactifs, horaire désactivé, livraison Telegram coupée |
| JavaScript exporté | Compilation et simulation des seuls blocs Code/expression ; aucune exécution du moteur n8n |

Les réponses modèle et les preuves d'événement sont fictives. Les échanges HTTP testés sont entre les tests et notre pont Python, pas entre n8n et ce pont.

## Recette connectée restant à effectuer

1. Noter version, édition et topologie n8n ; importer les exports sans activation et sélectionner les credentials.
2. Exécuter la branche demo sur le pont local. Vérifier le lien d'items n8n, les nœuds HTTP, les branches sans tâche et les paramètres de rétention.
3. Tester séparément l'API Claude sur un scénario entièrement fictif et avec une dépense autorisée. Vérifier contrat de réponse, tokens, refus, timeout et résultat incertain ; aucune donnée personnelle réelle dans les essais.
4. Sur le registre prévu pour l'usage réel, constater la réservation et la finalisation, sans envoyer d'email. Les compteurs d'une recette ne doivent pas être fusionnés avec le suivi commercial réel.
5. Tester une livraison Telegram au seul chat privé retenu, puis le changement d'heure Europe/Paris et un incident de livraison. En cas de résultat Telegram incertain, vérifier le chat avant de relancer : pas de garantie « exactement une fois ».
6. Dans un environnement Hermes à lecture seule effectivement configuré, ouvrir uniquement le bilan agrégé. Vérifier qu'il distingue demo/live, date, faits et propositions et qu'il ne peut pas ouvrir les données privées parentes.
7. Tester arrêt, sauvegarde et restauration d'une copie du registre. Définir durée de conservation et responsable avant données réelles.

## Limites

- Ni moteur de collecte de prospects, ni lecture automatique des réponses Gmail, ni création de brouillons Gmail, ni envoi d'email ne sont livrés dans cette tranche.
- Un email syntaxiquement valide, une source fournie ou une ouverture acceptée ne prouvent pas leur exactitude commerciale. Vérifier les sources et relire le message.
- Les étapes de supervision Hermes sont préparées, pas exécutées. Aucun catalogue ou connecteur installé.
- Le plafond de jobs/tokens ne remplace pas les limites du compte fournisseur ni une mesure réelle des coûts et de la marge.
- Le registre est local et mono-agence. Il ne valide pas une offre hébergée multi-client ni les recettes du produit Flow Inbox.
