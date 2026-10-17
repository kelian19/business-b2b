# Consigne de collecte — 10 entreprises (à coller dans une session Hermes ouverte dans `hermes-travail`)

17 octobre 2026. Version stricte, écrite après le premier test (5 lignes exactes sur le fond, mais URL de source collées dans les cellules et une citation recousue). Aucune donnée de prospect réel n'est dans ce texte.

## Texte à coller

> Tâche : compléter la liste de test, rien d'autre. N'envoie aucun message, ne rédige aucun e-mail, n'utilise aucun outil de messagerie.
>
> Trouve 10 NOUVELLES entreprises françaises de négoce ou de distribution B2B (fournitures industrielles, matériaux, pièces, emballage), de taille a priori moyenne. Exclus les groupes très grands. Exclus ces entreprises déjà vues : DISTRIDIAM, E-SIS, THOMÉ, AFIL Services, MIDI PYRENEES MANUTENTION. Utilise seulement la recherche web et des pages publiques d'entreprises. Pas de LinkedIn, pas de réseau social, pas d'annuaire payant.
>
> Écris le résultat dans `prospects-lot2.csv` de ton dossier de travail : UTF-8, séparateur point-virgule, une ligne par entreprise, ces colonnes exactement, dans cet ordre :
> raison_sociale ; url_source_nom ; site ; ville ; url_source_ville ; activite_observee ; url_source_activite ; email_publie ; url_source_email ; effectif_declare ; url_source_effectif ; date_collecte
>
> Règles de forme, strictes :
> 1. Une cellule contient UNE valeur. N'écris jamais d'URL, de crochets ou de « source » dans une autre colonne que les colonnes url_source_*.
> 2. activite_observee est UNE phrase continue copiée mot pour mot depuis la page indiquée. N'assemble pas deux fragments, ne reformule pas. Si aucune phrase ne convient, écris « non trouvé ».
> 3. email_publie : uniquement une adresse affichée en toutes lettres sur la page indiquée, de préférence générique (contact@, commercial@, info@). Ne la devine jamais. Sinon « non trouvé ».
> 4. effectif_declare : uniquement si le site l'indique, avec le chiffre exact de la page. Sinon « non trouvé ». Ne l'estime pas.
> 5. Ne collecte aucun nom de personne.
> 6. Chaque information a l'URL exacte de la page où tu l'as lue. Si tu n'as pas de source, écris « non trouvé ».
> 7. Arrête-toi à 10 lignes. Si tu n'en trouves pas 10 fiables, livre moins.
>
> À la fin, résume en 5 lignes : combien de lignes complètes, combien de « non trouvé », et ce que tu n'as pas pu vérifier. Demande-moi l'accord avant toute commande qui sort de ton dossier de travail.

## Après la collecte (côté Kélian)
1. Ouvrir le fichier et contrôler chaque ligne sur sa source. Cible : au moins 8 lignes sur 10 exactes.
2. Retirer les doublons avec les listes déjà préparées et avec l'historique d'envois et d'oppositions.
3. Ne rien envoyer avant l'identité d'expéditeur (voir [MODELES_MESSAGES.md](MODELES_MESSAGES.md)).
