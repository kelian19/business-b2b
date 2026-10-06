#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""verif_registre : compare un fichier de tiers (CSV) au registre public des entreprises.

Pour chaque SIREN valide, interroge l'API publique « Recherche d'entreprises » de l'État
(https://recherche-entreprises.api.gouv.fr, sans clé), puis écrit un nouveau CSV enrichi
(état administratif, nom, adresse, NAF du registre, date de vérification, indicateur d'écart)
à réimporter dans l'application Équerre.

CONFIDENTIALITÉ : seuls les SIREN (numéros publics) sont envoyés à l'API. Aucun nom, adresse
ni montant ne sort de votre poste. Utilisez néanmoins cet outil uniquement avec l'accord du
client, car la liste des SIREN consultés peut elle-même être sensible.

Bibliothèque standard uniquement (Python 3.8+).
"""
import argparse
import csv
import difflib
import io
import json
import logging
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

VERSION = "1.0"
API_URL = "https://recherche-entreprises.api.gouv.fr/search"
MAX_CADENCE = 5.0  # requêtes par seconde, plafond non dépassable
DEFAULT_TTL_JOURS = 30

NEW_COLUMNS = [
    "etat_administratif",
    "nom_registre",
    "adresse_registre",
    "code_postal_registre",
    "ville_registre",
    "naf_registre",
    "date_verification",
    "ecart_registre",
    "ecart_detail",
    "statut_verification",
]

# Valeurs de statut_verification
ST_OK = "ok"
ST_INTROUVABLE = "introuvable"
ST_NON_DIFFUSIBLE = "non_diffusible"
ST_SIREN_INVALIDE = "siren_invalide"
ST_SIREN_VIDE = "siren_vide"
ST_ERREUR = "erreur_api"
ST_NON_VERIFIE = "non_verifie"

AVERTISSEMENT = (
    "CONFIDENTIALITE : seuls les SIREN sont envoyes a l'API publique recherche-entreprises.api.gouv.fr "
    "(aucun nom, adresse ni montant). A n'utiliser qu'avec l'accord du client."
)

log = logging.getLogger("verif_registre")


# --------------------------------------------------------------------------- SIREN

def clean_digits(value):
    """Retire espaces, points, tirets d'une valeur (un SIREN saisi « 552 032 534 »)."""
    return re.sub(r"[\s.\-_/]", "", (value or "").strip())


def is_valid_siren(value):
    """9 chiffres et clé de Luhn correcte. N'atteste pas l'existence au registre."""
    s = clean_digits(value)
    if not re.fullmatch(r"\d{9}", s):
        return False
    total = 0
    for i, ch in enumerate(reversed(s)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


# --------------------------------------------------------------------------- Lecture CSV

def decode_bytes(raw):
    """Retourne (texte, encodage). UTF-8 (avec ou sans BOM), sinon Windows-1252, sinon Latin-1."""
    if raw.startswith(b"\xef\xbb\xbf"):
        return raw[3:].decode("utf-8"), "utf-8-sig"
    try:
        return raw.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        pass
    try:
        return raw.decode("cp1252"), "cp1252"
    except UnicodeDecodeError:
        return raw.decode("latin-1"), "latin-1"


def detect_delimiter(text):
    lines = text.splitlines()
    sample = "\n".join(lines[:20])
    try:
        return csv.Sniffer().sniff(sample, delimiters=";,\t|").delimiter
    except csv.Error:
        first = lines[0] if lines else ""
        counts = {d: first.count(d) for d in ";,\t|"}
        best = max(counts, key=counts.get)
        return best if counts[best] else ";"


def read_csv(path, encoding=None, delimiter=None):
    """Lit le CSV. Retourne (en-têtes, lignes, délimiteur, encodage). Les lignes sont des listes."""
    with open(path, "rb") as f:
        raw = f.read()
    if encoding:
        text, used = raw.decode(encoding), encoding
        if text.startswith("﻿"):
            text = text[1:]
    else:
        text, used = decode_bytes(raw)
    if not text.strip():
        raise ValueError("fichier vide")
    delim = delimiter or detect_delimiter(text)
    rows = list(csv.reader(io.StringIO(text, newline=""), delimiter=delim))
    rows = [r for r in rows if any(c.strip() for c in r)]
    if not rows:
        raise ValueError("fichier vide")
    headers = [h.strip() for h in rows[0]]
    return headers, rows[1:], delim, used


def norm_header(h):
    s = unicodedata.normalize("NFKD", h or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


COLUMN_ALIASES = {
    "siren": ["siren", "n_siren", "numero_siren", "no_siren", "num_siren", "siren_client", "siren_tiers"],
    "siret": ["siret", "n_siret", "numero_siret", "no_siret"],
    "nom": ["nom", "raison_sociale", "denomination", "nom_tiers", "societe", "nom_client", "nom_fournisseur"],
    "adresse": ["adresse", "adresse_1", "adresse_ligne_1", "adresse_ligne1", "rue", "adresse_facturation"],
    "code_postal": ["code_postal", "cp", "codepostal", "code_postal_facturation"],
    "ville": ["ville", "commune", "localite"],
}


def find_columns(headers, overrides=None):
    """Associe les rôles (siren, siret, nom, adresse, code_postal, ville) aux indices de colonnes."""
    overrides = overrides or {}
    normed = [norm_header(h) for h in headers]
    found = {}
    for role, aliases in COLUMN_ALIASES.items():
        if overrides.get(role):
            target = norm_header(overrides[role])
            if target not in normed:
                raise ValueError("colonne introuvable : %s" % overrides[role])
            found[role] = normed.index(target)
            continue
        for a in aliases:
            if a in normed:
                found[role] = normed.index(a)
                break
    return found


# --------------------------------------------------------------------------- Comparaison

FORMES_JURIDIQUES = {
    "SAS", "SASU", "SARL", "EURL", "SA", "SCI", "SNC", "SCOP", "SELARL", "SELAS", "SCM", "GIE",
    "EI", "EIRL", "ETS", "ETABLISSEMENTS", "ETABLISSEMENT", "STE", "SOCIETE",
}
MOTS_VIDES = {"LE", "LA", "LES", "L", "D", "DE", "DES", "DU", "ET", "AND", "A", "AU", "AUX"}
ABREVIATIONS_VOIE = {
    "R": "RUE", "AV": "AVENUE", "AVE": "AVENUE", "BD": "BOULEVARD", "BLD": "BOULEVARD", "BVD": "BOULEVARD",
    "CHEM": "CHEMIN", "PL": "PLACE", "PCE": "PLACE", "IMP": "IMPASSE", "ALL": "ALLEE", "RTE": "ROUTE",
    "ST": "SAINT", "STE": "SAINTE", "ZA": "ZONE", "ZAC": "ZONE", "ZI": "ZONE", "BAT": "BATIMENT",
    "RES": "RESIDENCE", "FG": "FAUBOURG", "FBG": "FAUBOURG",
}


def norm_text(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()


def name_tokens(s):
    return [t for t in norm_text(s).split() if t not in FORMES_JURIDIQUES and t not in MOTS_VIDES]


def names_match(a, b):
    """True/False, ou None si l'un des deux noms est vide (comparaison impossible).

    Heuristique : forme juridique et mots vides ignorés, ordre des mots ignoré, un nom inclus
    dans l'autre accepté (nom commercial abrégé), sinon ressemblance textuelle >= 0,85.
    """
    ta, tb = name_tokens(a), name_tokens(b)
    if not ta or not tb:
        return None
    sa, sb = set(ta), set(tb)
    if sa == sb or sa <= sb or sb <= sa:
        return True
    return difflib.SequenceMatcher(None, " ".join(ta), " ".join(tb)).ratio() >= 0.85


def street_tokens(adresse, code_postal="", ville=""):
    drop = set(norm_text(code_postal).split()) | set(norm_text(ville).split()) | {"FRANCE", "CEDEX"}
    out = []
    for t in norm_text(adresse).split():
        t = ABREVIATIONS_VOIE.get(t, t)
        if t in drop or t in MOTS_VIDES:
            continue
        out.append(t)
    return out


def streets_match(a, cp_a, ville_a, b, cp_b, ville_b):
    ta, tb = street_tokens(a, cp_a, ville_a), street_tokens(b, cp_b, ville_b)
    if not ta or not tb:
        return None
    sa, sb = set(ta), set(tb)
    nums_a = {t for t in sa if t.isdigit()}
    nums_b = {t for t in sb if t.isdigit()}
    if nums_a and nums_b and not (nums_a & nums_b):
        return False
    if sa <= sb or sb <= sa:
        return True
    return len(sa & sb) / len(sa | sb) >= 0.6


def city_norm(v):
    toks = []
    for t in norm_text(v).split():
        if t.isdigit() or t == "CEDEX":
            continue
        toks.append(ABREVIATIONS_VOIE[t] if t in ("ST", "STE") else t)
    return " ".join(toks)


def cities_match(a, b):
    ca, cb = city_norm(a), city_norm(b)
    if not ca or not cb:
        return None
    return ca == cb or difflib.SequenceMatcher(None, ca, cb).ratio() >= 0.85


def postcodes_match(a, b):
    ca = re.sub(r"\D", "", a or "")
    cb = re.sub(r"\D", "", b or "")
    if len(ca) != 5 or len(cb) != 5:
        return None
    return ca == cb


def compare_with_registry(row_nom, row_adresse, row_cp, row_ville, reg):
    """Retourne (indicateur, détail) : indicateur 'oui' / 'non' / '' (rien de comparable).

    L'adresse du registre est celle du siège : un tiers facturé à une autre adresse (établissement)
    sera signalé. C'est un point à vérifier, pas une erreur avérée.
    """
    checks = []
    candidates = [c for c in [reg.get("nom_registre")] + list(reg.get("autres_noms") or []) if c]
    if row_nom and candidates:
        results = [r for r in (names_match(row_nom, c) for c in candidates) if r is not None]
        if results:
            checks.append(("nom", any(results)))
    r = postcodes_match(row_cp, reg.get("code_postal_registre"))
    if r is not None:
        checks.append(("code_postal", r))
    r = cities_match(row_ville, reg.get("ville_registre"))
    if r is not None:
        checks.append(("ville", r))
    r = streets_match(row_adresse, row_cp, row_ville, reg.get("adresse_registre"),
                      reg.get("code_postal_registre"), reg.get("ville_registre"))
    if r is not None:
        checks.append(("adresse", r))
    if not checks:
        return "", ""
    diffs = [name for name, ok in checks if not ok]
    return ("oui" if diffs else "non"), ";".join(diffs)


# --------------------------------------------------------------------------- Extraction de la réponse

def parse_result(result):
    """Extrait les champs utiles d'une entrée de `results`. Retourne None si l'entreprise est non diffusible."""
    siege = result.get("siege") or {}
    nom = result.get("nom_complet") or result.get("nom_raison_sociale") or ""
    if "[ND]" in nom.upper() or "NON-DIFFUSIBLE" in nom.upper().replace(" ", "-"):
        return None
    cp = siege.get("code_postal") or ""
    ville = siege.get("libelle_commune") or ""
    adresse = (siege.get("adresse") or "").strip()
    # « 59-61 RUE LA FAYETTE 75009 PARIS » -> on retire « 75009 PARIS » final
    suffix = ("%s %s" % (cp, ville)).strip()
    if suffix and adresse.upper().endswith(suffix.upper()):
        adresse = adresse[: len(adresse) - len(suffix)].strip(" ,")
    autres = []
    for value in (result.get("nom_raison_sociale"), result.get("sigle"), siege.get("nom_commercial")):
        if value and value != nom:
            autres.append(value)
    return {
        "etat_administratif": result.get("etat_administratif") or siege.get("etat_administratif") or "",
        "nom_registre": nom,
        "autres_noms": autres,
        "adresse_registre": adresse,
        "code_postal_registre": cp,
        "ville_registre": ville,
        "naf_registre": result.get("activite_principale") or siege.get("activite_principale") or "",
    }


# --------------------------------------------------------------------------- Client HTTP

class RegistreError(Exception):
    """Échec définitif d'une consultation (après reprises)."""


class RateLimiter:
    """Garantit un écart minimal entre deux requêtes (1 / cadence seconde)."""

    def __init__(self, per_second, clock, sleep):
        self.interval = 1.0 / per_second
        self.clock, self.sleep = clock, sleep
        self.last = None

    def wait(self):
        if self.last is not None:
            delay = self.last + self.interval - self.clock()
            if delay > 0:
                self.sleep(delay)
        self.last = self.clock()


def default_http_get(url, timeout):
    req = urllib.request.Request(url, headers={
        "User-Agent": "verif_registre/%s (verification de tiers, SIREN uniquement)" % VERSION,
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), e.read()


class RegistreClient:
    def __init__(self, base_url=API_URL, cadence=MAX_CADENCE, retries=3, timeout=15.0,
                 http_get=None, clock=time.monotonic, sleep=time.sleep):
        self.base_url = base_url
        self.retries = retries
        self.timeout = timeout
        self.http_get = http_get or default_http_get
        self.sleep = sleep
        self.limiter = RateLimiter(min(cadence, MAX_CADENCE), clock, sleep)
        self.requests_made = 0

    def lookup(self, siren):
        """Retourne ('ok', données) / ('introuvable', {}) / ('non_diffusible', {}) ou lève RegistreError."""
        url = "%s?%s" % (self.base_url, urllib.parse.urlencode({"q": siren, "page": 1, "per_page": 5}))
        last_error = "inconnue"
        for attempt in range(self.retries + 1):
            self.limiter.wait()  # la limite vaut aussi pour les reprises
            self.requests_made += 1
            headers = {}
            try:
                status, headers, body = self.http_get(url, self.timeout)
            except Exception as e:  # réseau, délai dépassé, DNS...
                last_error = "%s: %s" % (type(e).__name__, e)
                status, body = None, b""
            if status == 200:
                try:
                    results = json.loads(body.decode("utf-8")).get("results") or []
                except (ValueError, AttributeError) as e:
                    last_error = "reponse illisible (%s)" % e
                else:
                    for r in results:
                        if str(r.get("siren")) == siren:
                            data = parse_result(r)
                            return ("ok", data) if data else (ST_NON_DIFFUSIBLE, {})
                    return ST_INTROUVABLE, {}
            elif status is not None:
                last_error = "HTTP %s" % status
                if status not in (408, 429) and not 500 <= status <= 599:
                    raise RegistreError(last_error)  # erreur définitive : inutile de réessayer
            if attempt < self.retries:
                delay = 2.0 ** attempt
                retry_after = {k.lower(): v for k, v in (headers or {}).items()}.get("retry-after")
                if retry_after and str(retry_after).strip().isdigit():
                    delay = max(delay, min(float(retry_after), 60.0))
                log.warning("SIREN %s : %s, nouvel essai dans %.0f s (%d/%d)",
                            siren, last_error, delay, attempt + 1, self.retries)
                self.sleep(delay)
        raise RegistreError(last_error)


# --------------------------------------------------------------------------- Cache

class Cache:
    """Cache JSON local, par SIREN. Les échecs ne sont jamais mis en cache."""

    def __init__(self, path, ttl_jours, now):
        self.path, self.ttl, self.now = path, ttl_jours, now
        self.entries = {}
        self.dirty = False
        if path and os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.entries = data.get("entries", {}) if data.get("version") == 1 else {}
            except (OSError, ValueError, AttributeError):
                log.warning("Cache illisible (%s) : ignore et reconstruit.", path)

    def get(self, siren):
        e = self.entries.get(siren)
        if not e:
            return None
        try:
            age = (self.now() - datetime.fromisoformat(e["fetched_at"])).days
        except (KeyError, ValueError):
            return None
        return e if age < self.ttl else None

    def put(self, siren, statut, donnees):
        self.entries[siren] = {"fetched_at": self.now().isoformat(timespec="seconds"),
                               "statut": statut, "donnees": donnees}
        self.dirty = True

    def save(self):
        if not self.path or not self.dirty:
            return
        tmp = self.path + ".tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump({"version": 1, "entries": self.entries}, f, ensure_ascii=False)
            os.replace(tmp, self.path)
            self.dirty = False
        except OSError as e:
            log.warning("Cache non enregistre : %s", e)


# --------------------------------------------------------------------------- Programme

def build_parser():
    p = argparse.ArgumentParser(
        prog="verif_registre",
        description="Compare un CSV de tiers au registre public des entreprises (SIREN valides uniquement).",
        epilog=AVERTISSEMENT)
    p.add_argument("entree", help="CSV de tiers (colonne siren requise)")
    p.add_argument("-o", "--sortie", help="CSV de sortie (defaut : <entree>_verifie.csv)")
    p.add_argument("--dry-run", action="store_true",
                   help="n'appelle pas l'API et n'ecrit rien : affiche ce qui serait fait")
    p.add_argument("--accord-client", action="store_true",
                   help="confirme que le client a donne son accord (obligatoire hors --dry-run)")
    p.add_argument("--cache", help="fichier de cache (defaut : registre_cache.json a cote de l'entree)")
    p.add_argument("--sans-cache", action="store_true", help="ne lit ni n'ecrit de cache")
    p.add_argument("--ttl-jours", type=int, default=DEFAULT_TTL_JOURS,
                   help="duree de validite du cache en jours (defaut %d)" % DEFAULT_TTL_JOURS)
    p.add_argument("--cadence", type=float, default=MAX_CADENCE,
                   help="requetes par seconde, 5 au maximum (defaut 5)")
    p.add_argument("--reprises", type=int, default=3, help="reessais par SIREN en cas d'erreur (defaut 3)")
    p.add_argument("--delai", type=float, default=15.0, help="delai maximal par requete en secondes")
    p.add_argument("--max-echecs", type=int, default=5,
                   help="arret apres N SIREN consecutifs en echec (defaut 5)")
    p.add_argument("--separateur", help="separateur du CSV (detecte par defaut)")
    p.add_argument("--encodage", help="encodage du CSV d'entree (detecte par defaut)")
    p.add_argument("--encodage-sortie", default="utf-8-sig", help="encodage de sortie (defaut utf-8-sig)")
    for role in ("siren", "nom", "adresse", "code_postal", "ville"):
        p.add_argument("--col-" + role.replace("_", "-"), dest="col_" + role, help="nom de la colonne %s" % role)
    p.add_argument("--force", action="store_true", help="ecrase le fichier de sortie s'il existe")
    p.add_argument("--journal", help="copie le journal dans ce fichier")
    p.add_argument("-v", "--verbose", action="store_true", help="journal detaille")
    p.add_argument("--api-url", default=API_URL, help=argparse.SUPPRESS)
    p.add_argument("--version", action="version", version="verif_registre " + VERSION)
    return p


def setup_logging(verbose, journal):
    for h in list(log.handlers):
        h.close()
        log.removeHandler(h)
    log.setLevel(logging.DEBUG if verbose else logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)-7s %(message)s", "%H:%M:%S")
    handlers = [logging.StreamHandler(sys.stderr)]
    if journal:
        handlers.append(logging.FileHandler(journal, encoding="utf-8"))
    for h in handlers:
        h.setFormatter(fmt)
        log.addHandler(h)
    log.propagate = False


def main(argv=None, *, http_get=None, clock=time.monotonic, sleep=time.sleep, now=datetime.now):
    args = build_parser().parse_args(argv)
    setup_logging(args.verbose, args.journal)
    if not 0 < args.cadence <= MAX_CADENCE:
        log.error("--cadence doit etre superieure a 0 et ne pas depasser %g requetes par seconde.", MAX_CADENCE)
        return 2
    if not args.api_url.lower().startswith("https://"):
        log.error("L'URL de l'API doit etre en https.")
        return 2
    if not os.path.isfile(args.entree):
        log.error("Fichier introuvable : %s", args.entree)
        return 2
    sortie = args.sortie or os.path.splitext(args.entree)[0] + "_verifie.csv"
    if os.path.abspath(sortie) == os.path.abspath(args.entree):
        log.error("Le fichier de sortie ne doit pas etre le fichier d'entree.")
        return 2
    if not args.dry_run and os.path.exists(sortie) and not args.force:
        log.error("%s existe deja (utilisez --force pour l'ecraser).", sortie)
        return 2

    log.info(AVERTISSEMENT)
    if not args.dry_run and not args.accord_client:
        log.error("Ajoutez --accord-client pour confirmer l'accord du client, ou --dry-run pour simuler.")
        return 2

    try:
        headers, rows, delim, enc = read_csv(args.entree, args.encodage, args.separateur)
        cols = find_columns(headers, {r: getattr(args, "col_" + r) for r in
                                      ("siren", "nom", "adresse", "code_postal", "ville")})
    except (OSError, ValueError, LookupError) as e:
        log.error("Lecture impossible : %s", e)
        return 2
    if "siren" not in cols and "siret" not in cols:
        log.error("Aucune colonne siren (ni siret) trouvee. Colonnes lues : %s", ", ".join(headers))
        return 2
    log.info("%d ligne(s) lues (encodage %s, separateur %r).", len(rows), enc, delim)
    if "siren" not in cols:
        log.info("Pas de colonne siren : les 9 premiers chiffres du siret sont utilises.")

    def cell(row, role):
        i = cols.get(role)
        return row[i].strip() if i is not None and i < len(row) else ""

    def siren_of(row):
        s = clean_digits(cell(row, "siren"))
        if not s and "siren" not in cols:
            s = clean_digits(cell(row, "siret"))[:9]
        return s

    sirens = [siren_of(r) for r in rows]
    unique = list(dict.fromkeys(s for s in sirens if s and is_valid_siren(s)))
    cache = Cache(None if args.sans_cache else (args.cache or os.path.join(
        os.path.dirname(os.path.abspath(args.entree)), "registre_cache.json")), args.ttl_jours, now)
    to_fetch = [s for s in unique if cache.get(s) is None]
    log.info("%d SIREN valide(s) distinct(s), %d ligne(s) a SIREN invalide, %d vide(s) ; "
             "%d deja en cache, %d a interroger.",
             len(unique), sum(1 for s in sirens if s and not is_valid_siren(s)),
             sum(1 for s in sirens if not s), len(unique) - len(to_fetch), len(to_fetch))

    if args.dry_run:
        log.info("[dry-run] Aucun appel reseau, aucun fichier ecrit. %d requete(s) seraient envoyees "
                 "(environ %.0f s a %g requete(s)/s). Sortie prevue : %s", len(to_fetch),
                 len(to_fetch) / args.cadence, args.cadence, sortie)
        return 0

    client = RegistreClient(args.api_url, args.cadence, args.reprises, args.delai, http_get, clock, sleep)
    erreurs = {}
    echecs_consecutifs = 0
    interrompu = False
    try:
        for n, s in enumerate(to_fetch, 1):
            if echecs_consecutifs >= args.max_echecs:
                log.error("%d echecs consecutifs : arret des appels (API injoignable ?). "
                          "Relancez plus tard, le cache evite de tout refaire.", echecs_consecutifs)
                interrompu = True
                break
            try:
                statut, data = client.lookup(s)
                cache.put(s, statut, data)
                echecs_consecutifs = 0
                log.debug("SIREN %s : %s", s, statut)
            except RegistreError as e:
                erreurs[s] = str(e)
                echecs_consecutifs += 1
                log.error("SIREN %s : echec definitif (%s).", s, e)
            if n % 25 == 0:
                log.info("%d / %d SIREN traites.", n, len(to_fetch))
                cache.save()
    except KeyboardInterrupt:
        log.warning("Interruption : enregistrement du cache. Relancez pour reprendre.")
        cache.save()
        return 130
    cache.save()

    keep_idx = [i for i, h in enumerate(headers) if h not in NEW_COLUMNS]
    out_headers = [headers[i] for i in keep_idx] + NEW_COLUMNS
    stats = {}
    ecarts = 0
    out_rows = []
    for row, s in zip(rows, sirens):
        base = [row[i] if i < len(row) else "" for i in keep_idx]
        new = dict.fromkeys(NEW_COLUMNS, "")
        if not s:
            new["statut_verification"] = ST_SIREN_VIDE
        elif not is_valid_siren(s):
            new["statut_verification"] = ST_SIREN_INVALIDE
        else:
            e = cache.get(s)
            if e is None:
                new["statut_verification"] = ST_ERREUR if s in erreurs else ST_NON_VERIFIE
            else:
                new["statut_verification"] = e["statut"]
                new["date_verification"] = e["fetched_at"][:10]
                if e["statut"] == ST_OK:
                    d = e["donnees"]
                    for k in ("etat_administratif", "nom_registre", "adresse_registre",
                              "code_postal_registre", "ville_registre", "naf_registre"):
                        new[k] = d.get(k, "")
                    new["ecart_registre"], new["ecart_detail"] = compare_with_registry(
                        cell(row, "nom"), cell(row, "adresse"), cell(row, "code_postal"), cell(row, "ville"), d)
                    ecarts += new["ecart_registre"] == "oui"
        stats[new["statut_verification"]] = stats.get(new["statut_verification"], 0) + 1
        out_rows.append(base + [new[c] for c in NEW_COLUMNS])

    try:
        with open(sortie, "w", encoding=args.encodage_sortie, newline="") as f:
            w = csv.writer(f, delimiter=delim)
            w.writerow(out_headers)
            w.writerows(out_rows)
    except OSError as e:
        log.error("Ecriture impossible : %s", e)
        return 2

    log.info("Termine : %d requete(s) reseau, %d ligne(s) ecrites dans %s.",
             client.requests_made, len(out_rows), sortie)
    log.info("Statuts : %s ; ecarts nom/adresse : %d (a verifier, pas necessairement des erreurs).",
             ", ".join("%s=%d" % kv for kv in sorted(stats.items())), ecarts)
    log.info("Reimportez ce fichier dans l'application Equerre (mode Dossier client).")
    return 1 if (erreurs or interrompu) else 0


if __name__ == "__main__":
    sys.exit(main())
