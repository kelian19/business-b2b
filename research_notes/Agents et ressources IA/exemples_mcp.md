# Exemples, formations et catalogue MCP — audit du 14 octobre 2026

## 1. Que contiennent les cinq dépôts et à quelles conditions les réutiliser ?

### Takeaway

Ce lot contient une collection d'applications et de skills, un annuaire MCP, deux parcours de formation et une collection de notebooks RAG. Il ne fournit pas un produit Flow Inbox prêt à vendre. RAG_Techniques est exclu de l'incorporation commerciale sans permission écrite ; les quatre autres licences racines sont permissives, sous leurs conditions et sans garantie sur les ressources tierces.

### Cited Findings

Inspection distante en lecture seule : API publique GitHub pour commit, arbre et tags ; fichiers README, LICENSE, manifests et échantillons indiqués ci-dessous. Aucun clone, installation, exécution des exemples, clé transmise ni connexion client. Les SHA représentent l'état examiné, pas une version de production testée.

| Dépôt | Nature constatée | Révision examinée ; date du commit UTC | Licence racine examinée | Version/tag |
|---|---|---|---|---|
| Shubhamsaboo/awesome-llm-apps | Applications d'exemple Python/Streamlit, agents, RAG et nouveaux skills de développement | `4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2` ; 29/09/2026 | [Apache-2.0](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/LICENSE) | API tags : liste vide ; skills sélectionnés déclarent 1.0.0 |
| punkpeye/awesome-mcp-servers | Annuaire de serveurs MCP tiers, pas un serveur unifié | `cc7f1f42c3fa8ced6fd5c0e02ea366ef7ed8cf1b` ; 09/10/2026 | [MIT](https://github.com/punkpeye/awesome-mcp-servers/blob/cc7f1f42c3fa8ced6fd5c0e02ea366ef7ed8cf1b/LICENSE) | API tags : liste vide |
| mlabonne/llm-course | Parcours pédagogiques, liens et notebooks Colab | `7abd96e8284bfae232048fdb77b52397a2114847` ; 05/02/2026 | [Apache-2.0](https://github.com/mlabonne/llm-course/blob/7abd96e8284bfae232048fdb77b52397a2114847/LICENSE) | API tags : liste vide |
| microsoft/ai-agents-for-beginners | Cours avec leçons et notebooks ; 18 leçons au README examiné | `92d833e9df9a38a5071169b17c07ad134e549ec5` ; 13/10/2026 | [MIT](https://github.com/microsoft/ai-agents-for-beginners/blob/92d833e9df9a38a5071169b17c07ad134e549ec5/LICENSE) | API tags : liste vide |
| NirDiamant/RAG_Techniques | Tutoriels/notebooks sur la recherche documentaire augmentée | `cbf9e528206bbb5cd23970ff612d12c1074e02dc` ; 11/10/2026 | [Custom License Agreement](https://github.com/NirDiamant/RAG_Techniques/blob/cbf9e528206bbb5cd23970ff612d12c1074e02dc/LICENSE), non commercial | `book-v1.0` pointe sur `a00eaf052480a11ba2449067c38448dbda9b03d4`, distinct du HEAD examiné |

- Métadonnées vérifiables : [commit awesome-llm-apps](https://api.github.com/repos/Shubhamsaboo/awesome-llm-apps/commits/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2), [commit awesome-mcp-servers](https://api.github.com/repos/punkpeye/awesome-mcp-servers/commits/cc7f1f42c3fa8ced6fd5c0e02ea366ef7ed8cf1b), [commit llm-course](https://api.github.com/repos/mlabonne/llm-course/commits/7abd96e8284bfae232048fdb77b52397a2114847), [commit ai-agents-for-beginners](https://api.github.com/repos/microsoft/ai-agents-for-beginners/commits/92d833e9df9a38a5071169b17c07ad134e549ec5), [commit RAG_Techniques](https://api.github.com/repos/NirDiamant/RAG_Techniques/commits/cbf9e528206bbb5cd23970ff612d12c1074e02dc), [tags RAG_Techniques](https://api.github.com/repos/NirDiamant/RAG_Techniques/tags).
- Les clauses 1.3, 2.2 et 4.1 de RAG_Techniques interdisent l'utilisation commerciale de tout ou partie du contenu sans autorisation écrite ; la licence ne peut pas être traitée comme MIT ou Apache. Le champ de juridiction est encore un placeholder : cela ne constitue pas une permission commerciale. [Licence exacte](https://github.com/NirDiamant/RAG_Techniques/blob/cbf9e528206bbb5cd23970ff612d12c1074e02dc/LICENSE).
- Apache-2.0 permet la réutilisation commerciale avec respect de la licence, des notices, des attributions et de la signalisation des modifications lors de redistribution ; MIT demande de préserver sa notice dans les copies ou parties substantielles. Ces autorisations portent sur les œuvres couvertes, pas automatiquement sur les sites liés, modèles, données, services ou dépendances. [Apache awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/LICENSE), [MIT Microsoft](https://github.com/microsoft/ai-agents-for-beginners/blob/92d833e9df9a38a5071169b17c07ad134e549ec5/LICENSE).
- Le catalogue MCP annonce des serveurs expérimentaux et destinés à la production, hébergés dans leurs propres dépôts. Sa licence MIT ne couvre pas automatiquement ceux-ci. [README exact](https://github.com/punkpeye/awesome-mcp-servers/blob/cc7f1f42c3fa8ced6fd5c0e02ea366ef7ed8cf1b/README.md).

### Inferences

- Choix proposé : ne pas intégrer RAG_Techniques à une offre, un prompt ou un skill vendu ; pour un futur besoin RAG, repartir des publications et implémentations permissives vérifiées. Le lien peut figurer dans la veille, sans copie de son contenu.
- Ne pas installer le requirements global d'un cours ni importer toutes les applications : ce serait ajouter une plateforme et de la maintenance sans bénéfice démontré pour les premiers clients.

### Gaps

- Aucun audit exhaustif des licences fichier par fichier, dépendances transitives, jeux de données ou modèles ; nouvelle revue obligatoire pour tout composant réellement retenu.
- Aucun test d'installation, de runtime, de charge, de sécurité ou de compatibilité Windows/Codex. Les versions listées sont constatées, pas certifiées compatibles ensemble.

## 2. Quelles ressources améliorent concrètement l'équipe et les produits ?

### Takeaway

Les apports immédiats les plus sobres sont des contrôles de périmètre et de dépendances, puis des pratiques de validation humaine, d'évaluation et d'observabilité. Pour Flow Inbox, conserver n8n et des étapes déterministes ; pour Insight Reports, conserver le calcul déterministe existant. Aucun RAG ni framework d'agents supplémentaire n'est justifié à ce stade.

### Cited Findings

- **dependency-doctor 1.0.0** inspecte un manifest choisi (`requirements.txt`, `pyproject.toml`, `package.json`), recherche dépendances non contraintes, doublons et problèmes directs ; Python 3.11+, bibliothèque standard, fonctionnement hors ligne par défaut, contrôle PyPI optionnel. Ce n'est ni un résolveur complet ni un scanner CVE, et le skill refuse explicitement d'être transformé en politique CI globale. Licence Apache-2.0 déclarée dans le skill. [SKILL.md exact](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/agent_skills/dependency-doctor/SKILL.md), [script](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/agent_skills/dependency-doctor/scripts/dep_doctor.py).
- **scope-creep-detector 1.0.0** rapproche un diff Git de son objectif, signale nouvelles dépendances, configurations, gros changements et fichiers potentiellement hors périmètre. Son interprétation est heuristique, pas une preuve ; il propose conserver/séparer/justifier sans modifier le dépôt. Apache-2.0 ; exécution locale hors ligne annoncée. [SKILL.md exact](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/agent_skills/scope-creep-detector/SKILL.md), [script](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/agent_skills/scope-creep-detector/scripts/scope_creep.py).
- **Chat with Gmail** charge les emails dans Embedchain avec Chroma, embeddings OpenAI et un LLM nommé `gpt-4-turbo` dans le code. Il propose des questions sur l'inbox : aucune chaîne métier JSON validé → Sheets → brouillon n'est présente dans ce fichier. Son manifest se limite à `streamlit` et `embedchain[gmail]`, sans contraintes de versions. [Code exact](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/advanced_llm_apps/chat_with_X_tutorials/chat_with_gmail/chat_gmail.py), [manifest](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/advanced_llm_apps/chat_with_X_tutorials/chat_with_gmail/requirements.txt).
- **AI Data Analysis Agent** accepte CSV/XLSX et confie des outils DuckDB/Pandas à un agent. Dépendances observées : Streamlit 1.41.1, OpenAI 1.58.1, DuckDB >=1.4.1, Pandas sans version, NumPy 1.26.4, Agno >=2.2.10. Le code écrit des fichiers temporaires avec `delete=False` ; aucun nettoyage explicite n'est visible dans le fichier examiné. L'import Excel appelle `read_excel` mais ce manifest ne déclare pas explicitement de moteur Excel. [Code exact](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/starter_ai_agents/ai_data_analysis_agent/ai_data_analyst.py), [manifest](https://github.com/Shubhamsaboo/awesome-llm-apps/blob/4bf51ab704fb2c5b3803cd5191b30d7dcdb51dc2/starter_ai_agents/ai_data_analysis_agent/requirements.txt).
- **Microsoft, leçon 06** : séparation des responsabilités, permissions minimales, sécurité et intervention humaine ; **leçon 10** : observabilité, traces/spans, évaluation et coûts. Les modèles d'approbation sont une source pédagogique à adapter, pas la preuve que nos agents les implémentent déjà. [Leçon 06](https://github.com/microsoft/ai-agents-for-beginners/blob/92d833e9df9a38a5071169b17c07ad134e549ec5/06-building-trustworthy-agents/README.md), [leçon 10](https://github.com/microsoft/ai-agents-for-beginners/blob/92d833e9df9a38a5071169b17c07ad134e549ec5/10-ai-agents-production/README.md).
- Le manifest Microsoft fixe `agent-framework-core==1.10.0`, `agent-framework-foundry~=1.10.0`, `agent-framework-openai~=1.10.0`, `mcp[cli]<2`, `openai>=1.108.1`, en plus d'Azure, Foundry Local, Chroma, JCS et PyNaCl. Il documente un changement incompatible en 1.11.0 et des conflits possibles avec les extras du méta-package. [Manifest exact](https://github.com/microsoft/ai-agents-for-beginners/blob/92d833e9df9a38a5071169b17c07ad134e549ec5/requirements.txt).
- **llm-course** couvre notamment évaluation, RAG, agentique, déploiement et sécurisation des LLM, mais aussi entraînement, alignement et quantification. Il renvoie à de multiples outils externes ; il n'est pas une dépendance autonome à installer. [README exact](https://github.com/mlabonne/llm-course/blob/7abd96e8284bfae232048fdb77b52397a2114847/README.md).

### Inferences

| Agent ou produit | Apport proposé | Priorité / condition |
|---|---|---|
| Relecteur | Checklist de périmètre ; revue manifest distincte de revue CVE ; limites de la preuve documentées | Maintenant, après validation de l'enrichissement ; deux skills candidats, non installés |
| Manager | Objectif et périmètre explicites pour chaque tâche ; livrable et dépendances avant délégation ; suivi des coûts/erreurs | Maintenant ; adapter des pratiques, sans framework |
| Chercheur | Séparer sources, faits, inférences ; jeux de questions avec vérité de référence ; refus si preuve insuffisante | Maintenant ; cours d'évaluation en appui |
| Prospecteur | Approbation humaine et outils autorisés ; vérification des champs obligatoires ; aucune action déclenchée par un texte prospect | Maintenant ; pas de scraping autonome ajouté |
| Rédacteur d'offres | Promesses rattachées à mesures ou hypothèses ; tarification chiffrée par l'analyste et relue | Maintenant ; pas d'automatisation financière par agent conversationnel |
| CEO | Arbitrage fondé sur résultats mesurés, limites, coût d'exploitation et périmètre | Maintenant ; aucun nouveau runtime nécessaire |
| Analyste | Données/colonnes typées, calcul déterministe et tests ; LLM seulement pour commentaires rattachés aux résultats | Maintenant pour cadrage, implémentation Insight Reports plus tard |
| Designer | Utiliser la revue de périmètre pour préserver l'interface existante ; ce lot n'apporte pas un design system Next.js spécifique | Plus tard, après choix de marque et demande de refonte |
| Flow Inbox | Validation JSON, quotas, traces techniques expurgées, reprises et revue humaine inspirées des leçons 06/10 | Prioritaire ; n8n conservé, pas de RAG Gmail |
| Insight Reports | Réutiliser import/qualité/calculs existants ; évaluer la narration séparément des chiffres | Après Flow Inbox ; DuckDB seulement si volumes ou requêtes le justifient |
| Lead Assistant | Données structurées vérifiables, qualification documentée, brouillons relus ; comparaison des versions de prompts | Après Flow Inbox ; pas de framework multi-agent nécessaire par défaut |

Apport réellement nouveau par rapport aux briques CSV/JS/Next.js du brief : méthode d'évaluation agentique, hygiène des manifests, contrôle de périmètre et patterns de revue humaine. Les exemples ne remplacent ni la logique métier déterministe déjà disponible ni les connecteurs n8n. L'agent de données introduirait des requêtes/outils pilotés par modèle et une autre UI : ce n'est pas une amélioration automatiquement acceptable.

### Gaps

- Les scripts des deux skills ont été inspectés par échantillons et leur contrat lu intégralement ; ils n'ont pas été exécutés ni audités ligne par ligne. Avant adoption : lecture complète, validation des sous-processus et chemins Windows, fixtures synthétiques et comparaison aux limites annoncées.
- Ce lot n'apporte pas de preuve de compatibilité native des profils Claude avec Codex. Les pratiques textuelles peuvent être adaptées ; les runtimes Agno/Microsoft/Embedchain ne constituent pas des skills Codex.

## 3. Quels connecteurs, risques et étapes retenir ?

### Takeaway

Aucun serveur supplémentaire du catalogue MCP n'est indispensable au MVP. Séparer les outils utilisés par Codex pour développer et les connexions Gmail/Sheets utilisées par le workflow n8n en production. Adopter d'abord des règles et tests ciblés, ensuite seulement les composants justifiés par un besoin client observé.

### Cited Findings

- Le catalogue est une collection hétérogène de serveurs, avec technologies, modes d'hébergement et plateformes indiqués ; ce n'est ni une certification de sécurité ni une licence collective sur les logiciels liés. [README](https://github.com/punkpeye/awesome-mcp-servers/blob/cc7f1f42c3fa8ced6fd5c0e02ea366ef7ed8cf1b/README.md), [licence du catalogue](https://github.com/punkpeye/awesome-mcp-servers/blob/cc7f1f42c3fa8ced6fd5c0e02ea366ef7ed8cf1b/LICENSE).
- Le cours Microsoft explicite permissions selon le besoin et approbations humaines ; le cours de production explicite mesures de latence/coût et évaluation. Ces éléments justifient des contrôles sans importer sa pile Azure/Foundry. [Leçon 06](https://github.com/microsoft/ai-agents-for-beginners/blob/92d833e9df9a38a5071169b17c07ad134e549ec5/06-building-trustworthy-agents/README.md), [leçon 10](https://github.com/microsoft/ai-agents-for-beginners/blob/92d833e9df9a38a5071169b17c07ad134e549ec5/10-ai-agents-production/README.md).

### Inferences

**Connecteurs proposés :**

- Développement : accès fichiers et Git existants suffisent au travail local ; documentation web disponible. GitHub MCP facultatif seulement si revue PR/issues distante devient un besoin. Un outil navigateur/Playwright peut servir aux tests UI si déjà disponible et autorisé ; aucun besoin de catalogue installé. Un outil de documentation comme Context7 peut aider la vérification d'API s'il est présent ; ne jamais lui envoyer données client ou secrets.
- Production Flow Inbox : connecteurs Gmail et Google Sheets n8n et appel fournisseur LLM, avec identifiants propres à chaque client. Ce sont des intégrations applicatives, pas une obligation d'ajouter des serveurs MCP au poste Codex.
- Aucun MCP Gmail, CRM, base de données de production, filesystem élargi ou déploiement nécessaire à cette phase d'audit. Avant chaque ajout ultérieur : besoin explicite, éditeur, version, licence propre, permissions effectives, transports, journalisation, révocation, destination des données.

**Contrôles avant première vente :**

1. Tests contractuels JSON : champs absents, types incorrects, sortie non JSON, injection d'instructions dans email, très long message, email sans contenu, réponse modèle incohérente ; revue humaine sur ambiguïté.
2. Tests métier : un identifiant par email et client ; rejeu sans doublon Sheets/brouillon ; crash entre opérations ; expiration OAuth ; erreurs/quota/rate limit ; reprise bornée ; arrêt d'urgence.
3. Autorisations : opérations de lecture/saisie/brouillon seulement, vérifiées sur le graphe réel ; aucun nœud d'envoi automatique ; secrets hors workflows exportés ; données de démo fictives.
4. Exploitation : version et dépendances épinglées, sauvegarde/restauration testée, journaux expurgés, durée de conservation, budget plafonné, surveillance des échecs, mode manuel documenté, responsabilités client/prestataire.
5. Réutilisation multi-client : même template versionné et fixtures génériques ; paramètres, comptes, fichiers, stockage et logs séparés par client ; aucune mutualisation de corpus email par défaut.

**Séquence proposée, après validation :**

- P0 : rédiger contrats de tâches/validation et jeu de fixtures Flow Inbox ; adapter les pratiques des leçons 06/10 sans installer le cours.
- P1 : si utile, intégrer un seul skill local relu et testé (`scope-creep-detector` ou `dependency-doctor`) avec source, SHA, version et notices ; test négatif et désactivation/retour arrière documentés. Rester dans le périmètre d'un manifest ou diff demandé.
- P1 : exécuter Flow Inbox sur compte de test dédié et données synthétiques, consigner la preuve d'intégration réelle ; ne pas appeler un JSON exporté « workflow testé ».
- P2 : garder llm-course comme formation ciblée ; considérer SQL/DuckDB uniquement pour un besoin Insight Reports mesuré ; sélectionner un exemple à la fois avec audit de sa pile.
- P3 : étudier une base documentaire client seulement après demande réelle et jeu d'évaluation ; pas de reprise commerciale de RAG_Techniques sans accord écrit. Aucun Dify ajouté par ce lot.

### Gaps

- Le lot ne certifie pas la configuration n8n/Gmail/Sheets, la sécurité OAuth ni un serveur MCP particulier ; les contrôles listés sont des recommandations à tester, pas des résultats obtenus.
- Aucun calcul de retour sur investissement n'est avancé : à 10 h/semaine, la décision proposée est de réserver le temps aux démos Flow Inbox et à la livraison, sans installer une seconde pile.
