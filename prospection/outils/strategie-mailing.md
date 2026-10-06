# Stratégie d'envoi : éviter les spams (2026-10-06)

Statut des sources : les règles Gmail et CNIL ci-dessous viennent de recherches web (articles de spécialistes), pas des textes officiels lus directement. À recouper sur postmaster.google.com / support.google.com (règles d'expéditeur) et cnil.fr avant de monter en volume. Les seuils marqués « pratique » sont des usages de terrain, non sourcés.

## Ce que disent les sources (secondaires)
- Gmail classe en « expéditeur en masse » un domaine qui envoie près de 5 000 messages ou plus par jour vers des comptes Gmail ; il exige alors SPF, DKIM et DMARC (au moins p=none), un taux de plaintes pour spam sous 0,3 %, un désabonnement en un clic. Le seuil que les praticiens visent est 0,08 % (moins d'une plainte pour 1 250 envois). Sources : [PowerDMARC](https://powerdmarc.com/google-and-yahoo-email-authentication-requirements/), [GMass](https://www.gmass.co/blog/gmail-bulk-sender-guidelines/). Nous sommes très loin de 5 000 par jour, mais les mêmes bonnes pratiques protègent la réputation.
- CNIL / droit français (B2B) : pas de consentement préalable si le message vise un professionnel en lien avec sa fonction, s'il a été informé et peut s'opposer (opposition en un clic). Les adresses génériques (contact@, info@) ne sont pas des données personnelles. Sources : [Overloop](https://overloop.com/fr/blog/b2b-cold-email-france-cnil-rgpd), [donneespersonnelles.fr](https://www.donneespersonnelles.fr/prospection-commerciale-rgpd).

## Le vrai risque pour vous
Un envoi à froid depuis `keliankaddouripro@gmail.com` mélange la réputation de votre boîte principale avec la prospection : quelques signalements « spam » peuvent dégrader aussi vos mails ordinaires. De plus, vous ne pouvez pas configurer DKIM/DMARC sur une adresse @gmail.com.

## Plan en 6 étapes
0. **Décision de Kélian (2026-10-06) : pas de domaine ni de boîte payante avant une première vente.** On commence avec `keliankaddouripro@gmail.com` (adresse Gmail dédiée à l'activité, distincte d'une boîte personnelle). Conséquences : volume très bas au départ (5 à 10 par jour pendant la première semaine, 15 maximum ensuite), mode BROUILLON, relecture de chaque message, arrêt de la vague au premier signalement ou à plusieurs rebonds. Les étapes 1 et 2 ci-dessous sont reportées après la première vente.
1. **(reporté) Domaine dédié à l'envoi** : un nom de domaine (celui du site, ou un domaine secondaire proche) et une boîte professionnelle (Google Workspace, Zoho ou OVH ; prix à vérifier). Ne prospectez pas depuis la boîte @gmail.com personnelle.
2. **Authentification** : SPF, DKIM, DMARC configurés (commencer par DMARC p=none, resserrer plus tard). Vérifier avec un testeur (mail-tester.com ou équivalent) : cible score 9/10 et plus (pratique).
3. **Réchauffement de 2 à 3 semaines** (pratique) : 5 messages par jour au début, +5 tous les 3 à 4 jours, jusqu'à 20-30 par jour maximum. Au début, écrire à des correspondants réels qui répondent (amis, anciens collègues, vous-même sur d'autres comptes) : les réponses construisent la réputation.
4. **Hygiène de la liste** :
   - adresses génériques publiées par le cabinet uniquement, relues sur la page source (déjà fait) ;
   - retirer immédiatement toute adresse qui rebondit ;
   - pause de la vague si plus de 2 % de rebonds (pratique) ;
   - jamais de nouvel envoi à un désinscrit (onglet « Désinscrits » du script).
5. **Contenu du message** :
   - texte brut : sans image, sans pièce jointe, sans suivi d'ouverture, sans lien dans le premier message ;
   - objet court, honnête, sans majuscules ni points d'exclamation ;
   - 80 à 110 mots, une seule demande : répondre ;
   - phrase de désinscription en fin de message ;
   - une seule relance à J+5, jamais de seconde.
6. **Rythme et suivi** : maximum 15 messages par jour au début (plafond du script), plutôt mardi à jeudi matin ; vagues séparées par domaine d'activité pour comparer les réponses ; si des réponses « c'est du spam » arrivent, stop et réviser.

## Pourquoi la personnalisation compte
Un texte identique envoyé à beaucoup d'adresses se reconnaît par les filtres. Le script envoie un texte unique par offre : ajouter au script le nom du cabinet dans l'objet ou la première ligne (champ « cabinet » du Sheet) et varier la phrase d'accroche par domaine (modèles v3).

## Ce qui reste à faire par vous
- Choisir et acheter le domaine et la boîte pro (je ne peux pas le faire).
- Envoyer les premiers messages de réchauffement.
- Me dire quand c'est prêt : j'ajoute le champ cabinet au script et je prépare la première vague.
