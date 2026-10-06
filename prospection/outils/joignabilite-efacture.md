# Joignabilité par e-mail : PME B2B de 20 à 249 salariés (relevé du 2026-10-06)

Cible du test : PME indépendantes de commerce de gros/négoce, de distribution B2B et de petite industrie, dont le site publie lui-même une adresse générique. Aucune adresse n'est reproduite ici (voir `domaines-efacture.csv`).

## Méthode

1. **Présélection par l'API publique de recherche d'entreprises** (`https://recherche-entreprises.api.gouv.fr/search`, accessible sans authentification) : `tranche_effectif_salarie=12,21,22,31` (20-49, 50-99, 100-199, 200-249), `etat_administratif=A`, `categorie_entreprise=PME`, `departement`, `per_page=25`, et soit `activite_principale` (codes NAF 46.xx de gros, plus 45.31Z), soit `section_activite_principale=C` (industrie, divisions 10, 11, 16, 17, 18, 22, 23, 25, 28 et 31). Environ 1 500 appels, aucune erreur. Filtres appliqués ensuite : siège dans le département, au plus 4 établissements ouverts, hors entrepreneurs individuels, associations et organismes publics, président non personne morale, noms écartés (groupe, holding, France, Europe, coopérative, groupement, enseignes de réseau connues). Tirage aléatoire, avec mélange de tailles et de régions.
2. **Découverte du site** : 22 premiers sites par recherche web (nom et commune), les suivants par test d'existence de domaines déduits du nom (`.fr` et `.com`, avec et sans `www`), en demandant uniquement le `robots.txt` du domaine (environ 3 700 requêtes, aucun contenu lu). Un domaine qui répond n'est retenu qu'après vérification d'identité sur le site (SIREN, ville ou adresse postale) : 24 domaines ne correspondaient pas à l'entreprise (homonyme, domaine à vendre, redirection).
3. **Lecture des pages** : `robots.txt` lu en premier, règles du groupe `*` (et des groupes visant Claude ou Anthropic) appliquées par chemin avant chaque requête ; une page interdite n'est pas lue. Pages lues : accueil, contact, mentions légales (et « à propos » seulement si aucune adresse trouvée), soit 3 à 4 pages par site. Adresses lues dans le HTML (liens `mailto`, texte, adresses protégées par décodage standard). Pas de LinkedIn ni de réseaux sociaux, aucun téléphone relevé, aucune adresse nominative ni reconstituée.
4. **Catégories** : générique = adresse de fonction ou de service publiée par le site (contact, info, accueil, administration, secrétariat, commercial, direction…), sur son domaine ou sur le domaine de sa marque affiché dans ses propres pages ; nominative ou autre = uniquement des adresses de personnes ou sans fonction claire ; formulaire seul = formulaire ou aucune adresse ; illisible = site qui ne répond pas, erreur de certificat ou HTTP, page vide ; homonyme = le domaine appartient à une autre entreprise, est à vendre ou redirige ailleurs.

## Résultats : 146 sites ouverts ou tentés

| Catégorie | Nombre | Part des 146 | Part des 84 sites lus et confirmés |
|---|---|---|---|
| Adresse générique publiée | 44 | 30 % | 52 % |
| Nominative ou non générique seulement | 12 | 8 % | 14 % |
| Formulaire seul / aucune adresse | 28 | 19 % | 33 % |
| Illisible (injoignable, certificat, erreur HTTP, page vide) | 34 | 23 % | – |
| Interdit par robots.txt (non lu) | 4 | 3 % | – |
| Site d'une autre entreprise (homonyme, domaine à vendre, redirection) | 24 | 16 % | – |

Parmi les 44 sites à adresse générique : **30 retenus** (CSV). 14 non retenus : 6 appartenant à un groupe ou à un réseau, 3 tournés vers les particuliers, 4 gardés en réserve (adresse de commandes, de devis, adresses par agence collées à un numéro de téléphone, adresse de service client d'une boutique de marque), 1 start-up.

Lecture : sur les sites dont l'identité est confirmée, environ 1 sur 2 publie une adresse générique (52 %, à comparer à 47 % chez les transporteurs et 69 % chez les organismes de formation du relevé précédent, mesurés sur des sites trouvés par recherche web). Sur 5 sites ouverts, 1 devient une cible : prévoir de l'ordre de 5 sites visités par cible. Les 30 cibles répondent toutes aux filtres de l'API (PME, active, tranche 12, 21 ou 22, année de la tranche 2024) ; aucune en 200-249 salariés.

Limites : lecture du HTML statique, donc une adresse injectée par JavaScript ou affichée en image est comptée « formulaire seul » ou « illisible » (plusieurs sites à page quasi vide sont dans ce cas) ; la tranche d'effectif vient de Sirene et n'est pas vérifiée sur les sites ; l'indépendance repose sur la catégorie PME de Sirene et l'absence de mention de groupe ou de réseau dans les pages lues, pas sur une preuve.

## Sites par catégorie

**Générique publiée, retenus (30)** : viviersdaudierne.com, deleo.fr, denisindustries.fr, maisonjucla.fr, apia-sa.com, eticlass.com, normande-avicole.fr, chomat-arrosage.fr, imprimerie-anquetil.fr, covam.fr, distrame.fr, fermedelahoussaye.com, hdc-lamotte.fr, orca-accessoires.fr, normacadre.fr, calit.fr, canedistribution.com, menuiseriesnicolas.fr, brasserie-bedague.com, cablac.fr, sotramo.com, viviers-st-marc.com, martysports.com, media-industry.fr, amehasle.com, cashmag.fr, fontalbat-mazars.com, mourlhon.fr, peintures-innova.fr, chocodic.com.

**Générique publiée, non retenus (14)** : alkar.fr, sodispra.com, acso.fr, gallorema.fr, estimprim.fr, pillivuyt.com (groupe ou réseau) ; maisonramel.com, airmust.com, maisondandieu.fr (particuliers) ; boucherie-gallais.fr, industriesdusud.fr, soudecoup.fr, forgesdelaloire.fr (réserve) ; sakowin.com (start-up).

**Nominative ou non générique seulement (12)** : coopcbs.fr, prosiref.com, mecanumeric.com, goodepices.com, sogedis.fr, barbier-sa.fr, lmetairie.com, diceep.fr, vioux-dubois.com, sidamo.com, avritec.fr, crepinsouest.fr.

**Formulaire seul / aucune adresse (28)** : whiskiesdumonde.fr, ocene.fr, helleux.fr, savoirsplus.fr, langlois-france.com, savfima.fr, parlons-bois.com, tramico.fr, lavarennedistribution.fr, kami.fr, manzon.fr, lamprienprovence.fr, edma.fr, soundworks.fr, aprobois.fr, semental.fr, visserie-service.fr, palettes-segreennes.com, eurodifroid.fr, fantroniccomposants.fr, dimatrap.fr, henrijulien.fr, edart.fr, morieres-emballages.fr, jansoulin.com, cap-auto.fr, vesoul-electro-diesel.fr, vitimag.fr.

**Illisible (34)** : bailly-quaireau.fr, edto.fr, couleurs-primeurs.fr, dantan.fr, accelonix.com, fricaud.com, charmossature.fr, cetil.fr, sterma.com, huette.fr, bircan.fr, alternea.com, agricommerce.fr, kprim.com, pacaprod.fr, sapm.com, dursun.com, dutrieux.com, diframa.fr, lebrunsa.fr, alprechfilets.com, press-steel.fr, andre-laurent.fr, madif.com, maridat.fr, halalcash.com, aflex.fr, catoire-semi.fr, caullery.fr, crenoimpex.fr, varpiecesauto.fr, blot.fr, snagz.com, comptoiragricolebasque.com.

**Interdit par robots.txt, non lu (4)** : ludic.fr, solidur.fr, mc-co.com, debaere.com.

**Site d'une autre entreprise (24)** : gfroid.fr, guerard.fr, dplog.fr, sdeb.fr, lefort.fr, tradition-vendee.fr (site exploité par une autre société que celle de Sirene), pronadis.fr (redirige vers organic-alliance.com), socomat.fr, sasthouard.fr, a-c-s.com, equipagri.fr, outimat.fr, cynopro.com, floris.fr, electroplus.fr, rhinossolutions.com, p-k-b.com, emballages-diffusion.com, distrimat.fr, viard.fr, lelieur.fr, ripert.fr, lagiraudiere.com, nexelec.com.

**Écartés avant visite** (appartenance à un groupe, un réseau ou une franchise lue sur leur site, dans un annuaire ou dans leur nom, ou effectif très inférieur) : plus de vingt candidats, dont les deux sociétés du groupe ETN, une enseigne Gedimat, une enseigne BigMat, une franchise Promocash, des filiales de groupes étrangers et une société cotée.

## Écarts de méthode à connaître

- Trois pages ont été ignorées parce que `robots.txt` les interdit (mentions légales de gfroid.fr, gallorema.fr et viviers-st-marc.com) ; pour viviers-st-marc.com, l'adresse retenue vient de la page contact, autorisée. Les 4 sites qui interdisent la racine n'ont pas été lus.
- Pour environ 1 site sur 10 (14 sites), la première lecture a échoué à cause d'une redirection entre `www` et le domaine nu ; l'autre variante a été essayée pour 12 d'entre eux (7 réussites). Restent 7 sites comptés « illisible » : 5 échecs après nouvel essai, 2 non retentés.
- Un seul site rendu en JavaScript a été relu dans le navigateur (parlons-bois.com, sans adresse).
- 14 des 30 cibles n'affichent pas leur SIREN : l'identité est confirmée par le nom, la ville ou l'adresse postale (voir la colonne notes).
- Le secteur du CSV suit le code NAF de Sirene (gros et négoce : 46.2, 46.3, 46.7 ; distribution B2B : 46.4, 46.5, 46.6, 46.9 ; industrie : section C). Plusieurs entreprises à code de commerce de gros se présentent comme fabricants (APIA Technologie, Deleo, Distrame, Marty Sports, Peintures Innova) : la colonne notes le signale.
