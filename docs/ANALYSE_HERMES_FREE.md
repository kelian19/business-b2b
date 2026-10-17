# Hermes Free — intérêt pour la prospection de l'agence

Analyse du 17 octobre 2026. Recherche sur les sources officielles publiques ; aucun compte Portal ouvert, abonnement, installation, appel modèle ou test d'envoi effectué. Tarifs et conditions susceptibles d'évoluer.

## Conclusion

**Hermes gratuit permet de tester notre processus. Une prospection autonome quotidienne entièrement gratuite n'est pas démontrée.** Il faut distinguer logiciel, modèle, outils de recherche et hébergement.

L'objectif commercial demeure : obtenir des rendez-vous qualifiés pour vendre Flow Inbox et la préparation des données de facturation. Les compteurs utiles sont les réponses humaines pertinentes, les rendez-vous pris et tenus, les propositions, les signatures et les encaissements ; pas uniquement les entreprises collectées ou les emails générés.

## Ce qui est gratuit, et à quelles conditions

| Élément | Observation vérifiée | Conséquence pour nous |
|---|---|---|
| Hermes Agent local | Logiciel gratuit, licence MIT ; fournisseurs et services hébergés ont leur propre tarification | Pas de licence Hermes à acheter pour l'utiliser sur notre machine |
| Nous Portal Free | Prix affiché : 0 USD ; modèles gratuits uniquement ; limites standard ; 0 USD de crédits mensuels | Tester un modèle effectivement disponible sur le compte ; ne pas supposer que les modèles payants sont inclus |
| Recherche/extraction web et navigateur hébergés Nous | Tool Gateway lié à un abonnement payant et facturation à l'usage ; petite allocation gratuite possible pour certains comptes | Ne pas construire notre budget sur une allocation non constatée dans notre compte |
| Modèles Claude | Les modèles Claude du catalogue Portal sont tarifés ; notre workflow appelle directement l'API Anthropic | Hermes Free ne rend pas notre branche Claude actuelle gratuite |
| Hébergement Hermes Cloud | Hébergement optionnel facturé séparément ; un solde minimum ou abonnement est demandé pour déployer | Un agent disponible sur le cloud n'est pas compris automatiquement dans Free |
| n8n Community auto-hébergé | Édition gratuite ; distincte de n8n Cloud | Possible sur une machine existante, avec hébergement, maintenance et disponibilité à assurer |
| Bilan Telegram | Les messages de bot ordinaires sont gratuits dans les limites Telegram | Un récapitulatif privé ne demande pas un abonnement Telegram payant ; le processus qui l'envoie doit fonctionner |

Sources : [Hermes Agent — FAQ](https://hermes-agent.nousresearch.com/), [offres Nous Portal](https://portal.nousresearch.com/), [Tool Gateway, éligibilité et facturation](https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-gateway), [Hermes Cloud](https://portal.nousresearch.com/cloud), [n8n Community](https://docs.n8n.io/deploy/host-n8n/community-edition-features.md), [Telegram Bots FAQ](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this).

La page Free ne publie pas un nombre garanti de prospects traitables par jour. Les limites exactes applicables au compte, la disponibilité des modèles gratuits et leur comportement agentique restent à constater. Un prospect peut nécessiter plusieurs appels : il ne correspond pas à une seule requête de modèle.

## Application à notre pipeline

Le [cahier des charges autonome](../livrables/automatisations/pipeline-agence/hermes/PROSPECTION_AUTONOME.md) décrit collecte, registre, personnalisation, envoi et récapitulatif. Le gratuit ne fournit pas automatiquement cette chaîne :

1. **Trouver des entreprises.** Partir de listes existantes et de sources autorisées ; les outils locaux ou API ouvertes ne sont pas identiques aux outils de recherche hébergés Nous. La qualité du ciblage et la traçabilité restent à vérifier.
2. **Trouver des contacts.** Lire les pages de contact des sites retenus, avec leurs conditions d'accès. Les coordonnées ne sont ni garanties disponibles ni automatiquement valides. Aucun enrichisseur payant n'est compris dans l'hypothèse gratuite.
3. **Préparer les messages.** Confier au modèle une ouverture fondée sur un fait déjà relevé. Un modèle gratuit peut être candidat à cette tâche courte ; sa qualité doit être mesurée sur nos exemples. Pas de promesse de capacité équivalente à Claude.
4. **Expédier et suivre.** L'envoi dépend du compte de messagerie, des connecteurs et des règles de campagne. Le statut Free du modèle n'implémente ni l'expédition, ni les oppositions, ni l'arrêt sur incident. Le code livré reste actuellement sans connecteur d'envoi.
5. **Produire le bilan.** Les comptes et montants restent calculés dans le registre ; une IA n'est pas nécessaire pour les additionner. Hermes peut commenter les agrégats ensuite.

### Écart technique précis

Le [générateur n8n](../livrables/automatisations/pipeline-agence/generate_workflows.py) contient un nœud `Claude — API Messages` dirigé vers `https://api.anthropic.com/v1/messages`, avec authentification API Anthropic. Il ne pointe pas vers un modèle gratuit Portal.

Deux options distinctes :

- Conserver Claude pour la personnalisation et Hermes Free pour la supervision : le modèle Claude reste un poste à budgéter.
- Remplacer le fournisseur de personnalisation par un modèle gratuit : vérifier son accès et son interface, adapter appel/contrat de réponse et refaire les tests. Un simple changement de nom de modèle dans le nœud Anthropic ne suffit pas.

Les 33 tests locaux de la pipeline ne mesurent pas la disponibilité, les quotas ou la qualité d'un modèle gratuit ; aucune intégration Hermes Free n'a été exécutée.

## Exécution sur le PC ou modèle local

Hermes peut tourner localement tout en utilisant un modèle distant gratuit. Dans ce cas, le PC doit rester allumé et le processus actif aux heures des tâches ; aucun service permanent n'est fourni par le simple téléchargement du logiciel. [FAQ officielle Hermes](https://hermes-agent.nousresearch.com/)

Autre possibilité : un modèle local via Ollama, pris en charge par Hermes. L'absence de facture d'API n'élimine pas le coût machine, l'électricité ou le temps de configuration. La documentation actuelle impose notamment une fenêtre de contexte minimale pour l'utilisation agentique ; il faut vérifier la compatibilité effective. [Hermes — fournisseurs et modèles locaux](https://hermes-agent.nousresearch.com/docs/integrations/providers)

Observation locale en lecture seule : GPU NVIDIA GeForce RTX 4060 Ti, mémoire remontée par `nvidia-smi` : 8 188 MiB ; RAM physique remontée par Windows : 34 282 184 704 octets. Ces caractéristiques ne prouvent aucune vitesse ni qualité sur une tâche Hermes. Aucun modèle local n'a été téléchargé ou testé pour cette analyse.

## Essai recommandé avant abonnement

Proposition de test, non encore exécutée :

1. Constater dans le compte Portal le modèle gratuit disponible, ses limites et l'accès éventuel aux outils. Désactiver les routes payantes et bascules payantes éventuelles avant essai.
2. Tester dix fiches entièrement fictives avec des faits fournis et deux offres distinctes. Aucun accès réel à une boîte ou à un prospect nécessaire à ce stade.
3. Noter les ouvertures acceptables, les faits inventés, erreurs de format, mauvais routages, interruptions de quota et corrections humaines. Un résultat incomplet doit rester visible.
4. Vérifier le bilan et le comportement en cas d'échec. Mesurer le temps humain de correction et le temps d'exécution, séparément du coût API.
5. Après réussite, préparer une petite recette connectée selon le cadrage de prospection. Aucun rendez-vous ou volume de ventes ne peut être prédit à partir de ce seul test technique.

**Décision proposée : tester Free sur la personnalisation courte et le bilan, sans abonnement immédiat.** N'envisager un poste payant que si le pilote montre un blocage précis : disponibilité du modèle, recherche, connecteur ou disponibilité permanente de l'hébergement.

## Limites de vérification

- Pas d'accès au compte Portal de l'utilisateur : droits, quotas et allocation d'outils non vérifiés.
- Pas de modèle gratuit nommé comme choix définitif : le catalogue évolue et la qualité n'est pas mesurée ici.
- La page spécifique `user-guide/free-tier` renvoie 404 lors de la consultation ; elle n'est pas utilisée comme preuve. Les sources actives Portal et Tool Gateway fondent la conclusion.
- Les liens et tarifs consultés sont un instantané du 17 octobre 2026. Aucun achat ni activation ne découle de cette note.
