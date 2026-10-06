# -*- coding: utf-8 -*-
"""Tests de verif_registre avec une API simulée. Aucun appel réseau n'est possible :
urllib.request.urlopen est remplacé par une fonction qui échoue."""
import csv
import json
import os
import sys
import tempfile
import unittest
import urllib.request
from datetime import datetime, timedelta
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import verif_registre as vr  # noqa: E402


def make_siren(prefix8):
    """Complète 8 chiffres par la clé de Luhn pour obtenir un SIREN valide."""
    for k in range(10):
        s = "%s%d" % (prefix8, k)
        if vr.is_valid_siren(s):
            return s
    raise AssertionError


S1 = "552032534"            # SIREN valide (exemple public)
S2 = make_siren("12345678")
S3 = make_siren("87654321")
S4 = make_siren("11122233")


def result(siren, nom, adresse, cp, ville, etat="A", naf="62.01Z", **extra):
    r = {
        "siren": siren, "nom_complet": nom, "nom_raison_sociale": nom, "sigle": None,
        "activite_principale": naf, "etat_administratif": etat,
        "siege": {"adresse": "%s %s %s" % (adresse, cp, ville), "code_postal": cp,
                  "libelle_commune": ville, "activite_principale": naf, "etat_administratif": etat,
                  "nom_commercial": None},
    }
    r.update(extra)
    return r


def ok_response(*results):
    return 200, {}, json.dumps({"results": list(results), "total_results": len(results)}).encode()


class FakeTime:
    def __init__(self):
        self.t = 1000.0
        self.sleeps = []

    def clock(self):
        return self.t

    def sleep(self, d):
        self.sleeps.append(d)
        self.t += d


class NoNetworkMixin:
    def setUp(self):
        p = mock.patch.object(urllib.request, "urlopen",
                              side_effect=AssertionError("appel reseau reel interdit dans les tests"))
        p.start()
        self.addCleanup(p.stop)
        q = mock.patch.object(vr, "setup_logging", lambda verbose, journal: None)  # journal silencieux
        q.start()
        self.addCleanup(q.stop)
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir = self.tmp.name


class TestSiren(unittest.TestCase):
    def test_valide(self):
        self.assertTrue(vr.is_valid_siren("552032534"))
        self.assertTrue(vr.is_valid_siren("552 032 534"))
        self.assertTrue(vr.is_valid_siren(S2))

    def test_invalide(self):
        for v in ("", "552032535", "12345", "ABCDEFGHI", "5520325341"):
            self.assertFalse(vr.is_valid_siren(v), v)


class TestCsv(NoNetworkMixin, unittest.TestCase):
    def test_cp1252_point_virgule(self):
        p = os.path.join(self.dir, "t.csv")
        with open(p, "wb") as f:
            f.write("nom;siren\nÉlectricité Générale;552032534\n".encode("cp1252"))
        headers, rows, delim, enc = vr.read_csv(p)
        self.assertEqual((delim, enc), (";", "cp1252"))
        self.assertEqual(rows[0][0], "Électricité Générale")

    def test_utf8_bom_virgule(self):
        p = os.path.join(self.dir, "t.csv")
        with open(p, "wb") as f:
            f.write("﻿nom,siren\nA,552032534\nB,1\n".encode("utf-8"))
        headers, rows, delim, enc = vr.read_csv(p)
        self.assertEqual((headers, delim, enc), (["nom", "siren"], ",", "utf-8-sig"))

    def test_colonnes(self):
        cols = vr.find_columns(["Raison sociale", "N° SIREN", "Code postal", "Ville", "Adresse"])
        self.assertEqual(cols, {"siren": 1, "nom": 0, "code_postal": 2, "ville": 3, "adresse": 4})


class TestComparaison(unittest.TestCase):
    def test_noms(self):
        self.assertTrue(vr.names_match("Dupont Transports SAS", "DUPONT TRANSPORTS"))
        self.assertTrue(vr.names_match("Jean Dupont", "DUPONT JEAN"))
        self.assertTrue(vr.names_match("Dupont", "SARL DUPONT ET FILS"))
        self.assertFalse(vr.names_match("Martin Bâtiment", "DUPONT TRANSPORTS"))
        self.assertIsNone(vr.names_match("", "DUPONT"))

    def test_adresse(self):
        reg = {"nom_registre": "DUPONT", "adresse_registre": "59-61 RUE LA FAYETTE",
               "code_postal_registre": "75009", "ville_registre": "PARIS", "autres_noms": []}
        self.assertEqual(vr.compare_with_registry("Dupont SAS", "59 r. La Fayette", "75009", "Paris", reg), ("non", ""))
        ind, detail = vr.compare_with_registry("Dupont", "12 avenue Foch", "69001", "Lyon", reg)
        self.assertEqual(ind, "oui")
        self.assertEqual(detail, "code_postal;ville;adresse")
        self.assertEqual(vr.compare_with_registry("", "", "", "", reg), ("", ""))

    def test_adresse_avec_cp_et_ville_dans_le_champ(self):
        reg = {"nom_registre": "X", "adresse_registre": "5 RUE DES LILAS", "code_postal_registre": "33000",
               "ville_registre": "BORDEAUX", "autres_noms": []}
        self.assertEqual(vr.compare_with_registry("X", "5 rue des Lilas 33000 Bordeaux", "33000", "Bordeaux", reg),
                         ("non", ""))

    def test_parse_result(self):
        d = vr.parse_result(result(S1, "DANONE", "59-61 RUE LA FAYETTE", "75009", "PARIS", naf="70.10Z"))
        self.assertEqual(d["adresse_registre"], "59-61 RUE LA FAYETTE")
        self.assertEqual((d["code_postal_registre"], d["ville_registre"], d["naf_registre"], d["etat_administratif"]),
                         ("75009", "PARIS", "70.10Z", "A"))
        self.assertIsNone(vr.parse_result({"siren": S1, "nom_complet": "[ND]", "siege": {}}))


class TestClient(NoNetworkMixin, unittest.TestCase):
    def client(self, responses, **kw):
        ft = FakeTime()
        calls = []
        seq = list(responses)

        def http_get(url, timeout):
            calls.append(url)
            r = seq.pop(0)
            if isinstance(r, Exception):
                raise r
            return r

        c = vr.RegistreClient(http_get=http_get, clock=ft.clock, sleep=ft.sleep, **kw)
        return c, ft, calls

    def test_ok_et_url_ne_contient_que_le_siren(self):
        c, ft, calls = self.client([ok_response(result(S1, "DANONE", "1 RUE A", "75001", "PARIS"))])
        statut, data = c.lookup(S1)
        self.assertEqual(statut, "ok")
        self.assertEqual(data["nom_registre"], "DANONE")
        self.assertEqual(len(calls), 1)
        self.assertIn("q=" + S1, calls[0])
        self.assertTrue(calls[0].startswith("https://recherche-entreprises.api.gouv.fr/search?"))

    def test_introuvable_si_aucun_siren_correspondant(self):
        c, _, _ = self.client([ok_response(result(S2, "AUTRE", "1 RUE A", "75001", "PARIS"))])
        self.assertEqual(c.lookup(S1)[0], "introuvable")

    def test_reprise_apres_429_puis_ok_avec_retry_after(self):
        c, ft, calls = self.client([(429, {"Retry-After": "3"}, b""),
                                    ok_response(result(S1, "DANONE", "1 RUE A", "75001", "PARIS"))])
        self.assertEqual(c.lookup(S1)[0], "ok")
        self.assertEqual(len(calls), 2)
        self.assertIn(3.0, ft.sleeps)

    def test_reprise_apres_erreur_reseau(self):
        c, _, calls = self.client([OSError("boom"), (503, {}, b""),
                                   ok_response(result(S1, "DANONE", "1 RUE A", "75001", "PARIS"))])
        self.assertEqual(c.lookup(S1)[0], "ok")
        self.assertEqual(len(calls), 3)

    def test_echec_apres_reprises_et_attente_exponentielle(self):
        c, ft, calls = self.client([(500, {}, b"")] * 4, retries=3)
        with self.assertRaises(vr.RegistreError):
            c.lookup(S1)
        self.assertEqual(len(calls), 4)
        self.assertEqual([s for s in ft.sleeps if s >= 1], [1.0, 2.0, 4.0])

    def test_erreur_400_non_reessayee(self):
        c, _, calls = self.client([(400, {}, b"")])
        with self.assertRaises(vr.RegistreError):
            c.lookup(S1)
        self.assertEqual(len(calls), 1)

    def test_json_illisible_est_reessaye(self):
        c, _, calls = self.client([(200, {}, b"<html>"), ok_response(result(S1, "D", "1 RUE A", "75001", "PARIS"))])
        self.assertEqual(c.lookup(S1)[0], "ok")
        self.assertEqual(len(calls), 2)

    def test_cadence_au_plus_5_par_seconde(self):
        c, ft, calls = self.client([ok_response()] * 21, cadence=50)  # 50 demandé -> plafonné à 5
        start = ft.t
        for _ in range(21):
            c.lookup(S1)
        self.assertGreaterEqual(ft.t - start, 20 * 0.2 - 1e-6)  # 21 requêtes : au moins 4 s

    def test_non_diffusible(self):
        c, _, _ = self.client([ok_response({"siren": S1, "nom_complet": "[ND]", "siege": {}})])
        self.assertEqual(c.lookup(S1)[0], "non_diffusible")


class TestCache(NoNetworkMixin, unittest.TestCase):
    def test_ttl_et_persistance(self):
        path = os.path.join(self.dir, "c.json")
        now = datetime(2026, 10, 6, 12, 0, 0)
        c = vr.Cache(path, 30, lambda: now)
        c.put(S1, "ok", {"nom_registre": "X"})
        c.save()
        c2 = vr.Cache(path, 30, lambda: now + timedelta(days=10))
        self.assertEqual(c2.get(S1)["donnees"]["nom_registre"], "X")
        c3 = vr.Cache(path, 30, lambda: now + timedelta(days=31))
        self.assertIsNone(c3.get(S1))

    def test_cache_corrompu_ignore(self):
        path = os.path.join(self.dir, "c.json")
        with open(path, "w") as f:
            f.write("{pas du json")
        self.assertEqual(vr.Cache(path, 30, datetime.now).entries, {})


class TestProgramme(NoNetworkMixin, unittest.TestCase):
    NOW = datetime(2026, 10, 6, 9, 30, 0)

    def write_input(self, text=None, encoding="utf-8"):
        p = os.path.join(self.dir, "tiers.csv")
        text = text or (
            "type;nom;siren;adresse;code_postal;ville\n"
            "client;Danone SA;%s;59 rue La Fayette;75009;Paris\n"
            "client;Mauvais Nom;%s;1 rue X;75001;Paris\n"
            "fournisseur;Doublon;%s;59 rue La Fayette;75009;Paris\n"
            "fournisseur;Siren faux;123456789;;;\n"
            "fournisseur;Sans siren;;;;\n"
            "fournisseur;Inconnu;%s;;;\n" % (S1, S2, S1, S3))
        with open(p, "w", encoding=encoding, newline="") as f:
            f.write(text)
        return p

    def api(self, calls):
        data = {
            S1: ok_response(result(S1, "DANONE", "59-61 RUE LA FAYETTE", "75009", "PARIS", naf="70.10Z")),
            S2: ok_response(result(S2, "DUPONT TRANSPORTS", "8 AVENUE FOCH", "69006", "LYON", etat="C")),
            S3: ok_response(),
        }

        def http_get(url, timeout):
            calls.append(url)
            siren = url.split("q=")[1].split("&")[0]
            return data[siren]
        return http_get

    def run_main(self, argv, calls=None, http_get=None):
        ft = FakeTime()
        calls = calls if calls is not None else []
        return vr.main(argv, http_get=http_get or self.api(calls), clock=ft.clock, sleep=ft.sleep,
                       now=lambda: self.NOW)

    def read_out(self, path):
        with open(path, encoding="utf-8-sig", newline="") as f:
            return list(csv.DictReader(f, delimiter=";"))

    def test_de_bout_en_bout(self):
        p = self.write_input()
        out = os.path.join(self.dir, "out.csv")
        calls = []
        code = self.run_main([p, "-o", out, "--accord-client"], calls)
        self.assertEqual(code, 0)
        self.assertEqual(len(calls), 3)  # S1 une seule fois malgré le doublon
        rows = self.read_out(out)
        self.assertEqual(len(rows), 6)
        for col in vr.NEW_COLUMNS:
            self.assertIn(col, rows[0])
        self.assertEqual(rows[0]["etat_administratif"], "A")
        self.assertEqual(rows[0]["nom_registre"], "DANONE")
        self.assertEqual(rows[0]["adresse_registre"], "59-61 RUE LA FAYETTE")
        self.assertEqual(rows[0]["naf_registre"], "70.10Z")
        self.assertEqual(rows[0]["date_verification"], "2026-10-06")
        self.assertEqual(rows[0]["ecart_registre"], "non")
        self.assertEqual(rows[1]["etat_administratif"], "C")
        self.assertEqual(rows[1]["ecart_registre"], "oui")
        self.assertIn("nom", rows[1]["ecart_detail"])
        self.assertEqual((rows[2]["ecart_registre"], rows[2]["ecart_detail"]), ("oui", "nom"))  # doublon, autre nom
        self.assertEqual(rows[3]["statut_verification"], "siren_invalide")
        self.assertEqual(rows[4]["statut_verification"], "siren_vide")
        self.assertEqual(rows[5]["statut_verification"], "introuvable")
        self.assertEqual(rows[0]["nom"], "Danone SA")  # colonnes d'origine conservées

    def test_deuxieme_passage_utilise_le_cache(self):
        p = self.write_input()
        out = os.path.join(self.dir, "out.csv")
        self.run_main([p, "-o", out, "--accord-client"])
        calls = []
        self.assertEqual(self.run_main([p, "-o", out, "--accord-client", "--force"], calls), 0)
        self.assertEqual(calls, [])
        self.assertEqual(self.read_out(out)[0]["nom_registre"], "DANONE")

    def test_dry_run_sans_appel_ni_fichier(self):
        p = self.write_input()
        out = os.path.join(self.dir, "out.csv")

        def boom(url, timeout):
            raise AssertionError("aucun appel attendu")
        self.assertEqual(self.run_main([p, "-o", out, "--dry-run"], http_get=boom), 0)
        self.assertFalse(os.path.exists(out))
        self.assertFalse(os.path.exists(os.path.join(self.dir, "registre_cache.json")))

    def test_refuse_sans_accord_client(self):
        p = self.write_input()
        calls = []
        self.assertEqual(self.run_main([p, "-o", os.path.join(self.dir, "o.csv")], calls), 2)
        self.assertEqual(calls, [])

    def test_refuse_decraser_sans_force(self):
        p = self.write_input()
        out = os.path.join(self.dir, "o.csv")
        open(out, "w").close()
        self.assertEqual(self.run_main([p, "-o", out, "--accord-client"]), 2)
        self.assertEqual(self.run_main([p, "-o", p, "--accord-client", "--force"]), 2)

    def test_cadence_superieure_a_5_refusee(self):
        p = self.write_input()
        self.assertEqual(self.run_main([p, "--dry-run", "--cadence", "10"]), 2)

    def test_erreurs_non_mises_en_cache_et_reprise(self):
        p = self.write_input("nom;siren\nA;%s\nB;%s\n" % (S1, S2))
        out = os.path.join(self.dir, "out.csv")

        def half(url, timeout):
            if S1 in url:
                return ok_response(result(S1, "DANONE", "1 RUE A", "75001", "PARIS"))
            return 400, {}, b""
        self.assertEqual(self.run_main([p, "-o", out, "--accord-client"], http_get=half), 1)
        rows = self.read_out(out)
        self.assertEqual([r["statut_verification"] for r in rows], ["ok", "erreur_api"])
        # Reprise : seul S2 est redemandé
        calls = []
        self.assertEqual(self.run_main([p, "-o", out, "--accord-client", "--force"], calls), 0)
        self.assertEqual(len(calls), 1)
        self.assertIn(S2, calls[0])

    def test_arret_apres_echecs_consecutifs(self):
        sirens = [make_siren("2000000%d" % i) for i in range(8)]
        p = self.write_input("nom;siren\n" + "".join("X%d;%s\n" % (i, s) for i, s in enumerate(sirens)))
        out = os.path.join(self.dir, "out.csv")
        calls = []

        def down(url, timeout):
            calls.append(url)
            return 400, {}, b""
        code = self.run_main([p, "-o", out, "--accord-client", "--max-echecs", "3"], http_get=down)
        self.assertEqual(code, 1)
        self.assertEqual(len(calls), 3)
        statuts = [r["statut_verification"] for r in self.read_out(out)]
        self.assertEqual(statuts[:3], ["erreur_api"] * 3)
        self.assertEqual(statuts[3:], ["non_verifie"] * 5)

    def test_siret_a_defaut_de_siren(self):
        p = self.write_input("nom;siret\nDanone;%s00012\n" % S1)
        out = os.path.join(self.dir, "out.csv")
        calls = []
        self.assertEqual(self.run_main([p, "-o", out, "--accord-client"], calls), 0)
        self.assertIn(S1, calls[0])

    def test_entree_cp1252_et_sortie_conserve_separateur(self):
        p = self.write_input("nom;siren\nÉlectricité;%s\n" % S1, encoding="cp1252")
        out = os.path.join(self.dir, "out.csv")
        self.assertEqual(self.run_main([p, "-o", out, "--accord-client"]), 0)
        self.assertEqual(self.read_out(out)[0]["nom"], "Électricité")

    def test_reexecution_sur_un_fichier_deja_enrichi_ne_duplique_pas_les_colonnes(self):
        p = self.write_input("nom;siren\nA;%s\n" % S1)
        out = os.path.join(self.dir, "out.csv")
        self.run_main([p, "-o", out, "--accord-client"])
        out2 = os.path.join(self.dir, "out2.csv")
        self.run_main([out, "-o", out2, "--accord-client"])
        with open(out2, encoding="utf-8-sig") as f:
            header = f.readline().strip().split(";")
        self.assertEqual(len(header), len(set(header)))

    def test_colonne_siren_absente(self):
        p = self.write_input("nom;ville\nA;Paris\n")
        self.assertEqual(self.run_main([p, "--dry-run"]), 2)


class TestContratEtDebit(unittest.TestCase):
    """Ce que lisent l'application Equerre et ce qu'annoncent les README : colonnes, statuts, debit."""

    def test_colonnes_et_statuts_lus_par_l_application(self):
        self.assertEqual(vr.NEW_COLUMNS, [
            "etat_administratif", "nom_registre", "adresse_registre", "code_postal_registre", "ville_registre",
            "naf_registre", "date_verification", "ecart_registre", "ecart_detail", "statut_verification"])
        self.assertEqual(
            [vr.ST_OK, vr.ST_INTROUVABLE, vr.ST_NON_DIFFUSIBLE, vr.ST_SIREN_INVALIDE, vr.ST_SIREN_VIDE, vr.ST_ERREUR,
             vr.ST_NON_VERIFIE],
            ["ok", "introuvable", "non_diffusible", "siren_invalide", "siren_vide", "erreur_api", "non_verifie"])

    def test_debit_annonce_5_requetes_par_seconde_soit_200_secondes_pour_1000_siren(self):
        self.assertEqual(vr.MAX_CADENCE, 5.0)
        ft = FakeTime()
        limiter = vr.RateLimiter(vr.MAX_CADENCE, ft.clock, ft.sleep)
        start = ft.t
        for _ in range(1000):
            limiter.wait()
        # 1000 envois : 999 intervalles de 0,2 s au minimum (le premier part tout de suite)
        self.assertAlmostEqual(ft.t - start, 999 * 0.2, places=6)

    def test_dry_run_annonce_la_duree_minimale_au_debit_reel(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "t.csv")
            with open(p, "w", encoding="utf-8", newline="") as f:
                f.write("siren\n%s\n%s\n" % (S1, S2))
            messages = []
            with mock.patch.object(vr, "setup_logging", lambda verbose, journal: None), \
                    mock.patch.object(vr.log, "info", lambda msg, *a: messages.append(msg % a if a else msg)):
                self.assertEqual(vr.main([p, "--dry-run"]), 0)
            texte = " ".join(messages)
            self.assertIn("2 requete(s) seraient envoyees", texte)
            self.assertIn("environ 0 s a 5 requete(s)/s", texte)  # 2 / 5 = 0,4 s


if __name__ == "__main__":
    unittest.main()
