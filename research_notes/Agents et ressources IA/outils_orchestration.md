# Outils d’orchestration, dépendances et conditions commerciales

Recherche effectuée le 14 octobre 2026. Périmètre : quatre dépôts, comparaison n8n/Dify et décisions proposées pour l’agence. Lecture de sources publiques uniquement ; aucun clone, installation, script tiers exécuté, compte connecté ou secret local consulté. Les recommandations restent à valider. Les licences sont décrites à partir des textes consultés ; ceci n’est pas un examen juridique exhaustif.

## Quels outils apportent une capacité réellement utile ?

### Takeaway

Conserver n8n pour Flow Inbox. Dify, Bello et treg sont de véritables logiciels, mais aucun n’est indispensable au premier pilote ; agents-towards-production est un ensemble pédagogique dont la licence empêche la reprise commerciale sans autorisation.

### Cited Findings

#### Dify — plateforme d’applications LLM, à garder pour plus tard

- **Référence relevée :** branche `main`, SHA `2bb1b113343fc6e96e888c70f52ea2108c3a3675`, commit du 14/10/2026 à 07:08:04 UTC ; dernière release stable renvoyée par GitHub `1.17.1`, publiée le 10/09/2026. Le dépôt n’est pas archivé. La branche de travail et la release sont deux références distinctes. [Commit](https://github.com/langgenius/dify/commit/2bb1b113343fc6e96e888c70f52ea2108c3a3675), [release](https://github.com/langgenius/dify/releases/tag/1.17.1).
- **Fonctions :** éditeur visuel, prompts, pipelines RAG, applications conversationnelles, agents, API et observabilité. Le README indique Docker Compose et un minimum de deux cœurs/4 Gio ; ce minimum n’est pas un dimensionnement de production. [README](https://github.com/langgenius/dify/blob/2bb1b113343fc6e96e888c70f52ea2108c3a3675/README.md).
- **Dépendances lues :** backend Python `~=3.13.0`, Flask, Celery, Redis, clients de stockage et fournisseurs ; le Compose comporte API, workers, frontend, base, Redis, sandbox, proxy SSRF et plugin daemon. Plusieurs bases vectorielles sont des alternatives configurables, pas des services tous requis simultanément. Certaines images ont des tags mobiles `latest`. [Manifeste API](https://github.com/langgenius/dify/blob/2bb1b113343fc6e96e888c70f52ea2108c3a3675/api/pyproject.toml), [Compose](https://github.com/langgenius/dify/blob/2bb1b113343fc6e96e888c70f52ea2108c3a3675/docker/docker-compose.yaml).
- **Licence :** Apache 2.0 modifiée. L’usage commercial est permis sous conditions ; une exploitation multi-tenant exige l’autorisation écrite de Dify, le tenant étant défini comme un workspace. Si le frontend Dify est utilisé, logo et mentions ne doivent pas être retirés ou modifiés ; cette condition ne concerne pas un usage sans frontend Dify. Ne pas présenter cette licence comme une Apache 2.0 standard. [LICENSE](https://github.com/langgenius/dify/blob/2bb1b113343fc6e96e888c70f52ea2108c3a3675/LICENSE).

#### Bello — superviseur d’agents de développement, à différer

- **Référence :** SHA `a663b73c02e4ece0dcea40758ff19d193356f04a`, commit du 08/10/2026 à 21:45:18 UTC ; release `v0.7.2` du 08/10/2026. Dépôt non archivé. [Commit](https://github.com/Makson179/Bello/commit/a663b73c02e4ece0dcea40758ff19d193356f04a), [release](https://github.com/Makson179/Bello/releases/tag/v0.7.2).
- **Nature :** outil de développement autour d’un codeur, superviseur d’exécution, relecteur final, adversaire et distillateur local de logs. Le support Codex/Claude est annoncé, avec espace de travail isolé et restitution d’un patch. Les gains chiffrés du README sont les expériences des auteurs ; ils n’ont pas été reproduits dans business-b2b. Ce n’est pas un outil de branding malgré son nom. [README](https://github.com/Makson179/Bello/blob/a663b73c02e4ece0dcea40758ff19d193356f04a/README.md).
- **Dépendances :** Python ≥3.11, click, packaging, pydantic, prompt-toolkit, wcwidth, jsonschema ; option Claude épinglée `claude-agent-sdk==0.2.164` ; option distillateur avec torch, transformers, safetensors et huggingface-hub. La licence du logiciel est MIT, avec conservation de la notice ; le modèle séparé est présenté sous Apache 2.0. [Manifeste](https://github.com/Makson179/Bello/blob/a663b73c02e4ece0dcea40758ff19d193356f04a/pyproject.toml), [LICENSE](https://github.com/Makson179/Bello/blob/a663b73c02e4ece0dcea40758ff19d193356f04a/LICENSE), [README](https://github.com/Makson179/Bello/blob/a663b73c02e4ece0dcea40758ff19d193356f04a/README.md).
- **Windows :** documentation annonçant Windows 11 x64/Server 2022–2025, préparation explicite du sandbox avec administrateur et service réseau `LocalSystem`. Les tâches ne s’exécutent pas elles-mêmes comme administrateur. Point de divergence documentaire à résoudre avant installation : README annonce Node ≥22.19 pour les fournisseurs API, guide Windows Node ≥24 pour Pi. [Guide Windows](https://github.com/Makson179/Bello/blob/a663b73c02e4ece0dcea40758ff19d193356f04a/docs/windows.md), [README](https://github.com/Makson179/Bello/blob/a663b73c02e4ece0dcea40758ff19d193356f04a/README.md).

#### treg — registre/proxy d’outils et de secrets, écarté du MVP

- **Référence :** SHA `46327c7e6f901c1fd0118046cbbe3d1309921aaf`, commit du 14/10/2026 à 06:26:12 UTC ; manifeste `0.25.0`, statut beta. L’API GitHub `releases/latest` renvoie 404 : aucune dernière release publiée confirmée par cette requête, sans conclusion sur l’absence de tags. [Commit](https://github.com/superdesigndev/treg/commit/46327c7e6f901c1fd0118046cbbe3d1309921aaf), [manifeste](https://github.com/superdesigndev/treg/blob/46327c7e6f901c1fd0118046cbbe3d1309921aaf/pyproject.toml), [API releases](https://api.github.com/repos/superdesigndev/treg/releases/latest).
- **Nature :** catalogue d’endpoints, proxy injectant les identifiants, CLI et serveur MCP, partage de skills et exécution de CLI. Certains appels consomment un solde prépayé ; les propres clés d’une équipe peuvent être utilisées. `treg upload` décrit un scan des `.env`, des skills et des CLI installées pour inscription côté serveur : cette commande ne doit pas être exécutée ici. Le README annonce une télémétrie de commandes anonymes vers PostHog pour treg.to. [README](https://github.com/superdesigndev/treg/blob/46327c7e6f901c1fd0118046cbbe3d1309921aaf/README.md).
- **Dépendances :** Python ≥3.12 et <3.14 ; CLI httpx/posthog/questionary. Extra serveur : FastAPI, SQLAlchemy/SQLModel, pilotes SQLite/PostgreSQL, cryptography, MCP, Stripe, QuickJS, Redis, obstore et numpy. Extra proxy local générant une autorité de certification. Ce n’est pas un petit skill autonome à importer. [Manifeste](https://github.com/superdesigndev/treg/blob/46327c7e6f901c1fd0118046cbbe3d1309921aaf/pyproject.toml).
- **Licence :** Apache 2.0 avec restriction additionnelle. Usage commercial interne à sa propre organisation permis ; fournir le logiciel comme service hébergé, managé ou embarqué à des tiers, notamment composant commercial, demande l’autorisation écrite préalable. **La restriction porte sur le logiciel/service : elle ne démontre pas à elle seule une interdiction de vendre des livrables produits avec l’outil.** Les droits des données et services appelés restent à vérifier séparément. [LICENSE](https://github.com/superdesigndev/treg/blob/46327c7e6f901c1fd0118046cbbe3d1309921aaf/LICENSE).
- **Limite de sécurité explicite :** secrets chiffrés Fernet, filtrage SSRF et permissions par organisation sont décrits, mais `SECURITY.md` reconnaît l’absence d’isolation filesystem/réseau pour les CLI exécutées côté serveur. Les limites de ressources ne constituent pas cette isolation. Correctifs de sécurité sur `main`, version pré-1.0. [SECURITY](https://github.com/superdesigndev/treg/blob/46327c7e6f901c1fd0118046cbbe3d1309921aaf/SECURITY.md).

#### agents-towards-production — tutoriels, pas un produit prêt à livrer

- **Référence :** SHA `172848240c64457a4a8991949ee5bcbfe6b08f2d`, commit du 21/09/2026 à 10:54:15 UTC ; dépôt non archivé. API `releases/latest` 404, pas de dernière release publiée confirmée. [Commit](https://github.com/NirDiamant/agents-towards-production/commit/172848240c64457a4a8991949ee5bcbfe6b08f2d), [API](https://api.github.com/repos/NirDiamant/agents-towards-production/releases/latest).
- **Contenu :** collection de tutoriels indépendants : Docker, FastAPI, orchestration, mémoire, observabilité, évaluation et sécurité. Le README déclare un usage éducatif et ne garantit pas les services tiers référencés. Il contient des sponsors et liens d’affiliation : ce n’est pas une preuve indépendante de qualité de ces outils. [README](https://github.com/NirDiamant/agents-towards-production/blob/172848240c64457a4a8991949ee5bcbfe6b08f2d/README.md).
- **Licence bloquante pour une reprise :** licence personnalisée réservée au non-commercial ; usage commercial de tout ou partie du contenu soumis à accord écrit préalable. Ne pas copier code, notebooks ou instructions dans nos livrables/skills commerciaux sous couvert d’un simple crédit. Préférer les documentations primaires des technologies concernées. [LICENSE](https://github.com/NirDiamant/agents-towards-production/blob/172848240c64457a4a8991949ee5bcbfe6b08f2d/LICENSE).
- **Dépendances hétérogènes :** pas de runtime unique ; le tutoriel LlamaFirewall épingle `openai-agents==0.0.14`, `llamafirewall==1.0.2`, `python-dotenv==1.2.2`, `nest-asyncio==1.6.0`, `pydantic==2.11.4`. Ces versions n’ont pas été installées ou testées et ne sont pas une recommandation de versions actuelles. [Requirements ciblé](https://github.com/NirDiamant/agents-towards-production/blob/172848240c64457a4a8991949ee5bcbfe6b08f2d/tutorials/agent-security-with-llamafirewall/requirements.txt).

### Inferences

- **Écart par rapport au projet :** suivant le brief et l’audit local transmis, Flow Inbox a besoin d’un déclencheur, d’un schéma JSON, d’un état de traitement, de Sheets et de brouillons Gmail. Aucune de ces exigences n’impose un registre global, un RAG ou un superviseur supplémentaire.
- **Dify plus tard :** seulement si un client paie un besoin de recherche documentaire/conversation évaluée que n8n et une API simple ne couvrent pas économiquement. Apport potentiel pour Lead Assistant documentaire ; faible valeur pour le calcul déterministe d’Insight Reports.
- **Bello plus tard :** les principes de relecture indépendante et cas adverses sont utiles immédiatement comme processus, sans dépendance. Tester le logiciel uniquement après constat mesuré d’une limite de la délégation native et validation explicite des changements système/coûts.
- **treg :** aucun connecteur MCP nécessaire pour Flow Inbox ; les nœuds natifs Gmail/Sheets et un appel modèle borné suffisent. Le coffre tiers, les appels payants et l’exécution de CLI ajoutent du risque sans besoin commercial validé.
- **Tutoriels :** garder éventuellement un lien bibliographique ; ne pas adapter leur contenu commercialement avant permission. Les sujets tests, isolation et traçabilité peuvent être étudiés dans des sources permissives indépendantes.

### Gaps

- Aucun logiciel externe installé, aucune suite de tests de ces dépôts exécutée, aucune validation de leurs promesses de sécurité/performance.
- Pas d’analyse exhaustive de toutes les dépendances transitives, images, licences secondaires, CVE ou conditions des services hébergés. Les SHA identifient l’état inspecté ; la lecture du README ne constitue pas un audit complet du code.

## Faut-il utiliser n8n, Dify, les deux ou aucun ?

### Takeaway

Pour Flow Inbox, n8n seul comme orchestrateur. Pour Insight Reports, calculs locaux déterministes d’abord ; pour Lead Assistant, commencer simplement et réserver Dify à un besoin documentaire prouvé.

### Cited Findings

- Le nœud Gmail n8n fournit explicitement `Draft > Create`, avec destinataire et thread ; il faut choisir cette opération et non les opérations d’envoi. [Documentation brouillons](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail/draft-operations.md).
- n8n documente OAuth Google et les options de reprise/erreur ; une reprise d’un nœud ne garantit pas l’absence de doublon d’un effet externe. [OAuth Google](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/credentials/google/oauth-single-service.md), [comportement des nœuds](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/understand-workflows/workflow-components/work-with-nodes.md).
- Dify fournit RAG, applications conversationnelles et APIs en plus de l’orchestration LLM ; sa pile d’hébergement comporte plusieurs services distincts. [README](https://github.com/langgenius/dify/blob/2bb1b113343fc6e96e888c70f52ea2108c3a3675/README.md), [Compose](https://github.com/langgenius/dify/blob/2bb1b113343fc6e96e888c70f52ea2108c3a3675/docker/docker-compose.yaml).
- **n8n, lecture commerciale actuelle :** sa licence Community SUL limite l’usage aux besoins internes ou non commerciaux, avec composants Enterprise exclus. La FAQ éditeur mise à jour le **06/10/2026** précise que l’agence peut construire et faire tourner des workflows clients sur sa propre instance, facturer ce travail et laisser les clients connecter leurs comptes, tant qu’ils ne créent/configurent pas les workflows et n’accèdent pas à n8n. Une configuration par clients, même via UI maison, API, MCP ou agent, exige une licence commerciale. L’hébergement de n8n comme service et la marque blanche requièrent également une licence. n8n Cloud a ses propres conditions. [Licence SUL et exclusions](https://github.com/n8n-io/n8n/blob/master/LICENSE.md), [FAQ datée](https://support.n8n.io/article/can-i-use-your-license-for-my-use-case).

### Inferences

Matrice de décision, à partir des sources ci-dessus et du périmètre commercial fourni :

| Critère | n8n | Dify | Choix agence |
|---|---|---|---|
| Emails → extraction → Sheets → brouillons | Nœuds intégrations et contrôle explicite du chemin | Une couche applicative LLM supplémentaire | n8n pour Flow Inbox |
| Recherche documentaire avec citations | Possible à construire avec composants dédiés | Fonction centrale RAG à évaluer sur corpus | Dify seulement si besoin validé |
| Calculs CA/marge/KPI/PDF | Peut déclencher les traitements | Ne remplace pas un moteur de calcul testé | Code déterministe ; n8n facultatif pour planifier |
| Qualification de leads | Flux de données, validation et journalisation | Utile pour assistant documentaire/conversation | n8n ou script simple ; Dify différé |
| Exploitation à 10 h/semaine | Une plateforme déjà retenue | Deuxième plateforme, stockage et maintenance | Pas de double pile maintenant |
| Réutilisation entre clients | Workflow modèle, configurations et identifiants isolés | Vérifier conditions workspace/frontend | Pas de SaaS partagé implicite |
| Vente | Conditions SUL/FAQ selon accès réel du client | Conditions commerciales/workspaces/marque | Documenter l’architecture vendue |
| Les deux ensemble | n8n appelle l’API Dify | Dify répond sur une tâche bornée | Seulement après preuve de gain et examen des licences |

- Pour le pilote, privilégier une instance propre au client ou une organisation d’hébergement agence clairement documentée respectant la FAQ ; ne pas déclarer qu’un hébergement agence est toujours interdit. L’isolation technique et la licence sont deux questions différentes.
- Aucun des deux pour le cœur de calcul d’Insight Reports ; un futur déclenchement n8n ne doit pas transférer le calcul financier à un LLM.
- La confirmation « Ok pour A » valide le choix n8n/Gmail/Sheets ; elle n’autorise pas les nouvelles intégrations externes proposées dans cet audit.

### Gaps

- La FAQ ne vaut pas approbation individuelle du modèle commercial final. Confirmer auprès de l’éditeur toute variante laissant le client modifier la logique ou utiliser un service embarqué.
- L’ancienne URL de documentation n8n `/sustainable-use-license/` renvoie Page Not Found pendant cette recherche ; la licence GitHub et la FAQ actuelle ont été consultées directement.

## Quels contrôles doivent précéder une livraison client ?

### Takeaway

Priorité aux preuves de bon fonctionnement, de reprise et d’absence d’envoi automatique ; pas à l’ajout de frameworks. Chaque responsabilité technique doit produire un livrable vérifiable par le relecteur et une décision explicite du porteur.

### Cited Findings

- n8n permet d’exclure des types de nœuds via `NODES_EXCLUDE`, notamment exécution de commandes et accès disque. Ce contrôle porte sur des types de nœuds ; il ne prouve pas à lui seul le blocage de l’opération d’envoi du nœud Gmail. [Documentation sécurité](https://docs.n8n.io/deploy/host-n8n/configure-n8n/security/block-specific-nodes.md).
- Les instructions de treg indiquent des flux de secrets, un proxy et des exécutions distantes ; sa politique décrit des limites connues. Ces flux doivent être évalués séparément d’une simple compatibilité MCP. [README](https://github.com/superdesigndev/treg/blob/46327c7e6f901c1fd0118046cbbe3d1309921aaf/README.md), [SECURITY](https://github.com/superdesigndev/treg/blob/46327c7e6f901c1fd0118046cbbe3d1309921aaf/SECURITY.md).

### Inferences

Plan proposé, sans intégration effectuée :

1. **P0, avant implémentation :** figer périmètre et schéma JSON, destinataires autorisés, coûts maximum, données fictives, interdiction d’envoi et contrat d’état de traitement. Architecte responsable du contrat ; relecteur challenge les hypothèses.
2. **P0, tests locaux :** sorties invalides, champs manquants, prompt injection dans email, timeout, quotas, message déjà traité, même message simultané, crash après brouillon créé mais avant persistance, réconciliation et arrêt manuel. QA produit les cas et preuves ; développeur corrige sans s’auto-certifier.
3. **P0, intégration test autorisée :** compte de test, scopes OAuth minimaux, identifiants clients séparés, liste explicite d’opérations autorisées, pas de nœud send ; vérifier un brouillon réellement créé sans message envoyé. Un JSON exporté n’est pas un test n8n.
4. **P0, livraison :** version n8n fixe, sauvegarde incluant clé de chiffrement et état, restauration essayée, purge des logs, secrets hors exports, droits limités, procédure d’incident et désactivation, responsabilité maintenance, périmètre hébergement/licence et traitement des données précisés.
5. **P1, après premiers retours :** manager mesure taux de traitement, erreurs et reprises ; analyste sépare coûts réels, revenu et encaissé ; CEO arbitre sur ces faits. Aucun « gain de temps » vendu sans mesure de référence.
6. **P2, seulement si besoin payé :** évaluation Dify documentaire ; éventuellement Bello sur tâche isolée comparée au processus natif, sans secrets. treg et code non commercial exclus du socle client tant que besoin et droits ne sont pas résolus.

Améliorations des rôles proposées : architecte n8n responsable du modèle d’état et des frontières de confiance ; intégration/déploiement responsable des credentials et reprises ; QA responsable des scénarios adverses ; relecteur indépendant des auteurs ; manager propriétaire du registre de versions/licences et des preuves. Les profils existants ne sont pas modifiés par cette note.

Réutilisation multi-client : versionner le schéma, les fixtures, les tests et le workflow générique ; externaliser la configuration ; provisionner des identifiants et un état distincts pour chaque client ; ne partager ni traces brutes, ni prompts contenant des données client, ni clés. Réutiliser une fonction existante seulement après vérification de son contrat et de ses tests.

### Gaps

- Les contrôles ci-dessus sont des exigences proposées, pas des tests déjà passés. L’audit de documentation ne certifie ni sécurité, ni conformité complète, ni disponibilité opérationnelle.
- Les possibilités de délégation Codex effectivement testées sont documentées par l’autre volet de l’audit ; Bello n’a pas été utilisé pour cette recherche.
