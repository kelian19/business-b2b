# E-mail type : marche à suivre pour le diagnostic e-facture

Envoyé au prospect qui a accepté le diagnostic. Variables entre accolades à compléter ; rien n'est envoyé automatiquement. Prix, volumes et délais sont des hypothèses non validées.

**Objet** : Diagnostic de vos fichiers clients et fournisseurs : marche à suivre

> Bonjour{prenom_nom},
>
> Merci pour votre accord. Voici ce qu'il me faut pour le diagnostic, et ce que vous recevrez en retour.
>
> **1. Ce que je vous demande**
>
> Un export de votre fichier clients et fournisseurs, au format CSV (encodage UTF-8), limité à **50 lignes** pour le diagnostic. Si votre logiciel ne sait produire qu'un fichier Excel : « Enregistrer sous », puis « CSV UTF-8 ». Pour que le diagnostic soit utile, choisissez 50 lignes variées : clients et fournisseurs, quelques fiches que vous savez incomplètes, si possible.
>
> Colonnes utiles (une ligne par client ou fournisseur) :
>
> - `type` : client ou fournisseur
> - `nom` : raison sociale
> - `siren`, `siret`
> - `tva` : numéro de TVA intracommunautaire
> - adresse de facturation (rue, code postal, ville, pays)
> - adresse de livraison, si elle diffère de l'adresse de facturation
>
> Si une colonne n'existe pas chez vous, laissez-la de côté : je travaillerai avec ce que contient votre export. Je peux vous envoyer un fichier modèle vide pour vous guider ({lien_ou_piece_jointe_modele}).
>
> **Ce que je ne veux pas recevoir** : aucun nom de contact, téléphone ni e-mail. Si certains clients sont des entrepreneurs individuels (des personnes physiques), dites-le-moi avant l'envoi : nous signerons d'abord un contrat de sous-traitance des données (article 28 du RGPD) et je n'ouvrirai aucun fichier avant.
>
> **2. Comment me l'envoyer**
>
> Par {mode_de_transmission}, protégé par mot de passe ou accès restreint, et non en pièce jointe d'un e-mail ordinaire. Envoyez-moi le mot de passe par un autre canal si nécessaire. Merci de ne pas m'envoyer de capture d'écran contenant des données réelles.
>
> **3. Ce que vous recevez et sous quel délai**
>
> Sous {delai} jours ouvrés (hypothèse) après réception d'un export conforme :
>
> - un mini-rapport sur ces 50 lignes ;
> - les corrections proposées pour chaque anomalie relevée (valeur actuelle, correction proposée), avec un statut « calculée » ou « à vérifier » ;
> - les cas à trancher de votre côté.
>
> Un identifiant bien formé ne prouve pas qu'il appartient au bon client : les rapprochements incertains restent à valider par vous. Je ne modifie pas votre logiciel, je ne donne ni conseil fiscal ni conseil juridique et je ne garantis pas la conformité de votre entreprise. Le diagnostic est gratuit (offre de lancement). Si vous le souhaitez ensuite, le dossier complet fait l'objet d'un devis séparé : jusqu'à 1 500 lignes, avec le contrôle de présence des 4 nouvelles mentions sur 3 de vos modèles de factures.
>
> **4. Vérification au registre public (facultative)**
>
> Avec votre accord écrit, je peux comparer les SIREN au registre public des entreprises. Seuls les numéros SIREN sont envoyés, avec l'adresse IP de mon poste, jamais de noms ni d'adresses. Répondez « oui » ou « non » à ce sujet dans votre prochain message.
>
> **5. Suppression de vos fichiers**
>
> Vos fichiers sont conservés dans un espace à accès limité, uniquement le temps du diagnostic. Je les supprime après la remise de mon rapport (fichiers reçus, fichiers produits et copies de travail) et je vous le confirme par e-mail. Pensez à supprimer de votre côté les exports déposés dans votre messagerie ou votre partage.
>
> Dès réception de l'export, je vous confirme que le fichier est exploitable.
>
> {expediteur}
> SIRET : {siret} · {adresse_reponse}

## Notes internes (retirer avant envoi)

- Colonnes alignées sur `modele-fichier-tiers.csv` (`livrables/outil-equerre/GUIDE-LIVRAISON.md` §2). Noms vérifiés le 18 octobre 2026 dans `livrables/outil-equerre/js/core/import-kinds.js` : `type`, `nom`, `siren`, `siret`, `tva`, `adresse`, `code_postal`, `ville`, `pays`, `livraison_adresse`, `livraison_code_postal`, `livraison_ville` (l'outil reconnaît aussi des intitulés approchants). Le fichier modèle vide se télécharge depuis la zone d'import de l'outil.
- Le contrat article 28 est prévu avant réception de tout fichier pouvant contenir des personnes physiques ; en cas de doute, le signer.
- Variables : `{prenom_nom}`, `{mode_de_transmission}` (lien de partage protégé choisi par Kélian), `{lien_ou_piece_jointe_modele}`, `{delai}` (5 par défaut, hypothèse), `{expediteur}` = « Kélian Kaddouri, entrepreneur individuel », `{siret}`, `{adresse_reponse}`. `Bonjour{prenom_nom},` est voulu : `{prenom_nom}` vaut une espace suivie du nom vérifié, ou une chaîne vide (convention de MODELES_MESSAGES.md).
- Ne pas citer de nom de marque. Ne pas envoyer sans SIRET renseigné dans la signature.
