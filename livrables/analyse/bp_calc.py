"""BP comparé de 3 pistes (A conformité AI Act art. 4, B factures, C reporting).
Modèle mensuel déterministe (espérances), 12 mois. Lancer : python bp_calc.py
TOUS les paramètres sont des HYPOTHÈSES sauf mention de source.
"""
CAP = 19.0            # h/mois (4-5 h/sem ; contrainte dure 18-20 h). Source : CONTEXT.md
FIXED = 50.0          # €/mois coûts fixes. Hypothèse CONTEXT.md
SOCIAL = 0.25         # cotisations sur CA. Hypothèse CONTEXT.md, à vérifier URSSAF
VAR = 0.01            # coût IA variable (% CA). Hypothèse CONTEXT.md (< 1 %)
TARGET_CA = (1000 + FIXED) / (1 - SOCIAL)   # 1 400 €
PROSPECT_H = 5.0      # h/mois de prospection (hypothèse), fait partie des 19 h
START = 3             # 1er client signé au mois 3 (mois 1-2 : offre + test). Hypothèse
CONTACTS = {"pess": 30, "centr": 50, "opti": 70}   # contacts qualifiés/mois (hypothèse, 5 h)

# setup = prix unique (€), mrr = récurrent (€/mois), h_setup = h livraison/client,
# h_mois = h/mois/client récurrent, churn = perte mensuelle du récurrent,
# conv = taux contact -> vente (pess, centr, opti), hypothèses non validées.
PISTES = {
    "A": dict(nom="Conformité AI Act art. 4", setup=1000, mrr=300/12, h_setup=8, h_mois=2/12,
              churn=(0.08, 0.05, 0.03), conv=(0.010, 0.025, 0.040),
              note="setup 500-1 500 (CONTEXT.md, milieu) ; suivi annuel 300 €/an hyp. (~25 €/mois)"),
    "B": dict(nom="Factures / e-facturation", setup=600, mrr=120, h_setup=6, h_mois=1.0,
              churn=(0.06, 0.04, 0.02), conv=(0.008, 0.020, 0.035),
              note="tous prix = hypothèse (aucun prix FR sourcé exploitable)"),
    "C": dict(nom="Reporting mensuel", setup=500, mrr=150, h_setup=6, h_mois=1.5,
              churn=(0.06, 0.04, 0.02), conv=(0.006, 0.015, 0.030),
              note="setup 150-900 $ Upwork/Fiverr (recherche) ; 150-300 €/mois CONTEXT.md (bas)"),
}

def run(p, i):
    """Retourne la liste mensuelle (new, stock, heures, CA, bénéfice) pour le scénario i."""
    sc = ["pess", "centr", "opti"][i]
    stock, rows = 0.0, []
    for m in range(1, 13):
        stock *= 1 - p["churn"][i]
        h_rec = stock * p["h_mois"]
        demand = CONTACTS[sc] * p["conv"][i] if m >= START else 0.0
        room = max(CAP - PROSPECT_H * (m >= START - 1) - h_rec, 0)  # prospection dès m2
        new = min(demand, room / p["h_setup"])        # plafond capacité
        stock += new
        ca = new * p["setup"] + stock * p["mrr"]
        hours = (PROSPECT_H if m >= START - 1 else 0) + new * p["h_setup"] + (stock - new) * p["h_mois"]
        marge = ca * (1 - VAR)
        ben = marge - SOCIAL * ca - FIXED
        rows.append(dict(m=m, new=new, stock=stock, hours=hours, ca=ca, marge=marge, ben=ben, dem=demand))
    return rows

if __name__ == "__main__":
    print(f"CA cible = (1000+{FIXED:.0f})/(1-{SOCIAL}) = {TARGET_CA:.0f} EUR/mois\n")
    for k, p in PISTES.items():
        print(f"== {k} {p['nom']} | {p['note']}")
        # clients nécessaires pour 1 400 € de CA
        print(f" 1400 EUR = {TARGET_CA/p['setup']:.1f} ventes setup/mois (sans récurrent) "
              f"ou {TARGET_CA/p['mrr']:.1f} clients récurrents (sans setup)")
        h_one = TARGET_CA / p["setup"] * p["h_setup"] + PROSPECT_H
        h_rec = TARGET_CA / p["mrr"] * p["h_mois"] + PROSPECT_H
        print(f" heures : tout-setup {h_one:.1f} h/mois ; tout-récurrent {h_rec:.1f} h/mois (capacité {CAP:.0f})")
        for i, sc in enumerate(["pessimiste", "central", "optimiste"]):
            r = run(p, i); l = r[-1]
            cum = sum(x["ben"] for x in r)
            tot_new = sum(x["new"] for x in r)
            cap_bind = sum(1 for x in r if x["new"] < x["dem"] - 1e-9)
            print(f" {sc:10s} m12: clients actifs {l['stock']:.1f}, nouveaux {l['new']:.2f}, h {l['hours']:.1f}, "
                  f"CA {l['ca']:.0f}, marge {l['marge']:.0f}, bénéfice {l['ben']:.0f} | "
                  f"cumul 12 m {cum:.0f} | ventes {tot_new:.1f} | mois capa. saturée {cap_bind}")
        # sensibilité : bénéfice m12 central si conv x0.5 / prix -20 % / cotis 22 % ou 30 %
        base = PISTES[k].copy()
        def b12(pp, soc=SOCIAL):
            global SOCIAL
            old = SOCIAL; SOCIAL = soc
            v = run(pp, 1)[-1]["ben"]; SOCIAL = old; return v
        half = dict(base, conv=tuple(c / 2 for c in base["conv"]))
        low = dict(base, setup=base["setup"] * .8, mrr=base["mrr"] * .8)
        print(f" sensibilité bénéf. m12 central : base {b12(base):.0f} | conv/2 {b12(half):.0f} | "
              f"prix-20% {b12(low):.0f} | cotis 30% {b12(base, .30):.0f}\n")
