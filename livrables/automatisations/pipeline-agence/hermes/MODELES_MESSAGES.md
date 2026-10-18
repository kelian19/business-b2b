# Modèles de messages — à valider par Kélian

17 octobre 2026, rendu des premiers contacts intégré le 18 octobre. **Proposition, rien n'est envoyé.** Objectif : obtenir un rendez-vous de découverte pertinent pour vendre nos deux services, sans inventer un besoin. Lire la [charte Hermes](CHARTE_REDACTION.md). Le texte commercial est fixe : seule `{ouverture}` est rédigée par l'IA ; les autres variables viennent de données vérifiées. `pipeline.py` charge les deux [modèles texte](messages/), contrôlés par un test de concordance avec les deux premiers contacts ci-dessous, ainsi que le [prompt d'ouverture](PROMPT_OUVERTURE.txt). L'identité manquante produit un brouillon explicitement incomplet ; voir la [configuration](../README.md). Le rendu conserve « Bonjour, » : aucun nom de personne n'est ajouté.

## Ce que Hermes ou un modèle peut modifier
| Champ | Origine | Contrôle |
|---|---|---|
| `{ouverture}` | Une phrase de 35 à 260 caractères tirée d'**un fait sourcé** lu sur le site de l'entreprise | Pas de douleur inventée, prix, promesse, lien ou adresse ; une seule ligne |
| `{source_contact}` | URL publique où l'adresse a été relevée | Obligatoire, vient du registre |
| `{prenom_nom}` | Seulement si le site indique une personne et sa fonction | Sinon : « Bonjour, » sans civilité |

Tout le reste (objet, offre, question, identité, refus) est figé. Aucun modèle ne réécrit ces parties.

Les champs d'identité, de rendez-vous et de suivi ne sont jamais choisis par le modèle. `{prenom_nom}` vaut une espace suivie du nom vérifié, ou une chaîne vide : le résultat est alors « Bonjour, ». Un champ inconnu ne doit pas être deviné.

## Identité d'expéditeur retenue (décision de Kélian, 17 octobre 2026)
- **Entrepreneur individuel en micro-entreprise**, signature en nom propre : `{expediteur}` = « Kélian Kaddouri, entrepreneur individuel — automatisation B2B ».
- **Boîte d'envoi** : adresse Gmail dédiée à l'activité (`{adresse_reponse}`), séparée de la boîte personnelle. Acceptable pour une vague manuelle de quelques messages ; à remplacer par un domaine propre (SPF, DKIM, DMARC) avant tout envoi en volume ou automatisé.
- Pas de nom de marque dans les messages. Ne pas mettre « Équerre » tant que INPI et domaine ne sont pas vérifiés.

## À compléter avant tout envoi (marqueurs `À COMPLÉTER`)
- `{identifiant_legal}` : **SIRET de la micro-entreprise** — À COMPLÉTER (immatriculation à faire ou à confirmer par Kélian).
- `{adresse_postale}` : adresse professionnelle déclarée — À COMPLÉTER (la domiciliation à son domicile est un choix à vérifier).
- `{adresse_reponse}` : l'adresse Gmail dédiée, une fois créée — À COMPLÉTER.
- Le projet à deux associés n'est pas couvert par une micro-entreprise : à revoir avant de facturer à deux.

## Modèle 1 — Flow Inbox
**Objet** : Un point sur vos demandes commerciales

> Bonjour{prenom_nom},
>
> {ouverture}
>
> Je prépare Flow Inbox pour organiser les demandes commerciales reçues par e-mail, suivre les informations manquantes et préparer les réponses. Une personne relit et envoie chaque message.
>
> L'idée est de rendre visibles les informations à compléter et les demandes qui attendent une action.
>
> Seriez-vous disponible pour un échange de 15 minutes afin de voir comment vous traitez ces demandes aujourd'hui ?
>
> {expediteur}
> {adresse_postale} · {identifiant_legal}
> Votre adresse a été relevée sur {source_contact}, à titre professionnel.
> Si ce message ne vous concerne pas, répondez « non merci » à {adresse_reponse} : vous ne recevrez plus rien de ma part.

## Modèle 2 — Préparation des données de facturation
**Objet** : Fiabiliser vos fichiers clients et fournisseurs

> Bonjour{prenom_nom},
>
> {ouverture}
>
> Je prépare une prestation de revue de vos fichiers clients et fournisseurs : informations manquantes, incohérences et doublons possibles, avec une liste de corrections proposées et de cas à faire valider.
>
> Le premier échange permet de vérifier ce que votre logiciel ou votre accompagnement comptable prend déjà en charge.
>
> Pourrions-nous en parler 15 minutes avec la personne responsable de la facturation ? Aucun fichier n'est nécessaire pour cet échange.
>
> {expediteur}
> {adresse_postale} · {identifiant_legal}
> Votre adresse a été relevée sur {source_contact}, à titre professionnel.
> Si ce message ne vous concerne pas, répondez « non merci » à {adresse_reponse} : vous ne recevrez plus rien de ma part.

## Relance unique, J+5 minimum (même pour les deux offres)
**Objet** : Re : (objet du premier message)

> Bonjour{prenom_nom},
>
> Je reviens une dernière fois sur mon e-mail du {date_premier_envoi}, au sujet de {sujet_offre}.
>
> Un échange de 15 minutes serait-il utile pour voir si ce service répond à un besoin chez vous ?
>
> {expediteur}
> {adresse_postale} · {identifiant_legal}
> Votre adresse a été relevée sur {source_contact}, à titre professionnel.
> Si ce sujet ne vous concerne pas, répondez « non merci » à {adresse_reponse} : je ne vous relancerai pas.

`{sujet_offre}` est fixé par l'offre : « l'organisation des demandes commerciales » ou « la préparation de vos données de facturation ». Ne l'improviser pas. Réutiliser le sujet et le fil réels du premier message. Une seule relance, au moins cinq jours calendaires après un premier envoi confirmé ; aucune après réponse humaine, opposition, rebond ou rendez-vous pris. Une absence du bureau nécessite un examen humain avant toute relance. Le code actuel n'automatise pas ces vérifications.

## Brouillon après intérêt — Kélian répond

**Usage** : réponse humaine montrant un intérêt ; ce modèle reste à relire et envoyer par Kélian.

> Bonjour{prenom_nom},
>
> Merci pour votre retour. Je vous propose un échange de 15 minutes pour partir d'un exemple récent, comprendre les étapes manuelles et voir si une intervention serait utile.
>
> Aucun accès à vos comptes ni fichier client n'est nécessaire pour ce premier échange.
>
> Quel créneau vous conviendrait ?
>
> {expediteur}
> {adresse_reponse}

Ne pas ajouter de créneau inventé. Si Kélian a validé un lien de réservation, il peut remplacer la question par une invitation vers ce lien ; Hermes ne le construit pas à partir d'un domaine supposé.

## Brouillon si le prospect demande le prix — Kélian répond

> Bonjour{prenom_nom},
>
> Merci pour votre question. Je dois d'abord préciser le périmètre, les volumes et les outils déjà en place pour vous proposer un tarif adapté.
>
> Pourrions-nous prendre 15 minutes pour examiner un cas concret ? Je pourrai ensuite vous indiquer si le besoin entre dans notre offre et préparer une proposition chiffrée.
>
> {expediteur}
> {adresse_reponse}

Ne pas transformer les hypothèses de 790 € ou 490 € du projet en devis ferme. Si une proposition tarifaire a été validée pour ce prospect, Kélian peut répondre à partir de celle-ci.

## Brouillon si le prospect est déjà équipé — Kélian répond

> Bonjour{prenom_nom},
>
> Merci pour la précision. Si votre outil couvre déjà ce fonctionnement, il n'y a pas lieu d'ajouter une prestation.
>
> S'il reste une étape manuelle que vous souhaitez améliorer, je peux examiner ce point avec vous. Sinon, je clôture ici.
>
> {expediteur}
> {adresse_reponse}

Ce texte n'est pas utilisé après une opposition : celle-ci arrête la séquence. Ne pas prétendre connaître les limites du logiciel du prospect.

## Confirmation de rendez-vous — après accord constaté

**Objet** : Notre échange — {date_rdv}

> Bonjour{prenom_nom},
>
> Je vous confirme notre échange le {date_rdv} à {heure_rdv}, fuseau {fuseau_rdv}.
>
> Modalité : {modalite_rdv}.
>
> Nous partirons d'un exemple de votre fonctionnement actuel, puis des étapes manuelles et de l'intérêt éventuel d'une intervention. Aucun document confidentiel à préparer.
>
> Si vous devez modifier le rendez-vous, vous pouvez me répondre directement.
>
> {expediteur}
> {adresse_reponse}

Date, heure, fuseau et modalité viennent de l'accord ou d'une réservation vérifiée. Un lien de visioconférence ne peut pas être inventé. Ne pas envoyer ce message ni compter le rendez-vous à partir d'un simple « intéressé ».

## Opposition ou refus

**Aucun message automatique.** Exclure le contact selon le processus disponible et alerter Kélian. Aucune tentative de convaincre, de demander pourquoi ou de programmer une dernière relance. Une confirmation éventuelle est laissée à Kélian.

## Récapitulatif Telegram — chiffres du registre uniquement

> {mode_demo_ou_reel} — bilan du {date_bilan}, fuseau Europe/Paris
>
> Entreprises ajoutées : {entreprises_ajoutees}
> Brouillons préparés : {brouillons_prepares}
> Messages envoyés confirmés : {envois_confirmes}
> Réponses humaines enregistrées : {reponses_humaines}
> Rendez-vous pris : {rdv_pris_ou_non_renseigne}
> Rendez-vous tenus : {rdv_tenus}
> Devis transmis : {devis_transmis}
> Signatures : {signatures}
> Factures émises : {factures_emises}
> Encaissements reçus : {encaissements_eur}
> Oppositions : {oppositions}
> Rebonds : {rebonds}
>
> À relire : {brouillons_en_attente}
> Jobs à examiner : {jobs_non_finalises}
>
> Les activités hors registre sont inconnues.

Ce texte décrit la cible éditoriale. Le bilan réellement généré aujourd'hui reste celui de `pipeline.py` ; les réservations de rendez-vous ne sont pas encore suivies et doivent apparaître comme « non renseigné », pas zéro. Le mode demo commence par « Démonstration fictive ». Aucun nom, adresse email, message de prospect ou chiffre prédit dans le récapitulatif. Les montants viennent des centimes enregistrés, sans calcul improvisé par le modèle.

## Ouvertures fictives pour tester le ton

- Agence : « Votre site présente une offre de création de sites vitrines pour les entreprises. »
- Formation : « Vous proposez des formations de management organisées en intra-entreprise. »
- Conseil : « Votre présentation décrit des missions de conseil en organisation pour les PME. »
- Négoce : « Votre catalogue présente des fournitures industrielles destinées aux professionnels. »

Ces phrases sont des exemples, pas des faits sur un prospect. Elles ne sont utilisables que si un fait fourni justifie exactement l'activité décrite.

## Points écartés volontairement
- Aucun chiffre, prix, délai ou nom de client ou de concurrent. Aucune promesse de gain ou de conformité.
- Aucune mention de l'employeur ou du stage de Kélian.
- Pas de lien commercial, de calendrier non validé ni de pièce jointe au premier contact. L'URL de provenance du contact dans le pied de page est explicitement conservée ; elle vient du registre.
- Les dates réglementaires (facture électronique, règlement IA) sont absentes du premier contact : elles figurent dans les offres et se vérifient à la source avant d'être citées.

## Vérifications avant la première vague (non faites)
Compléter et vérifier l'identité de l'expéditeur, les informations à fournir sur l'usage des coordonnées, le moyen d'opposition et les conditions du canal et du pays. Ces modèles ne constituent pas une validation juridique. Belgique, Luxembourg et Canada restent en brouillons seulement tant que leur ouverture n'est pas vérifiée, selon [PROSPECTION_AUTONOME.md](PROSPECTION_AUTONOME.md). La rédaction des textes n'active aucune campagne.
