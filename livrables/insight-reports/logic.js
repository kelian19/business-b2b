/* Adaptateur Insight Reports : validations strictes ; calculs réutilisés d’Équerre. */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('../outil-equerre/js/core/csv'),require('../outil-equerre/js/core/invoices'),require('../outil-equerre/js/core/reporting'));
  else root.Insight=factory(root.Equerre.core.csv,root.Equerre.core.invoices,root.Equerre.core.reporting);
})(typeof globalThis!=='undefined'?globalThis:this,function(CSV,Invoices,Reporting){
  'use strict';
  const headers=['numero','client','date_emission','date_echeance','montant_ht','montant_ttc','statut','date_paiement'];
  function iso(s){return typeof s==='string'&&/^20\d\d-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
  function amount(s){if(!/^\d+(?:[.,]\d{1,2})?$/.test(s))throw Error('montant attendu sans séparateur de milliers, avec deux décimales maximum');const n=Number(s.replace(',','.'));if(n>10000000)throw Error('montant supérieur à 10 000 000 €');return n;}
  function parse(text){
    const p=CSV.parseCsv(text), errors=[],seen=new Set(),records=[];
    const missing=headers.filter(h=>!p.headers.includes(h));
    if(missing.length)throw Error('Colonnes manquantes : '+missing.join(', ')+'. Utilisez le modèle CSV.');
    if(p.headers.some(h=>!headers.includes(h)))throw Error('Colonnes supplémentaires non prises en charge. Utilisez uniquement les huit colonnes du modèle, en euros et sans paiements partiels.');
    if(new Set(p.headers).size!==p.headers.length)throw Error('En-têtes en double.');
    if(p.avertissements.length)throw Error('Structure CSV ambiguë : vérifiez les guillemets et les séparateurs.');
    if(!p.rows.length||p.rows.length>10000)throw Error('Le fichier doit contenir entre 1 et 10 000 factures.');
    p.rows.forEach((row,i)=>{
      try{
        if(row.length!==p.headers.length)throw Error('nombre de colonnes incohérent');
        if(row.some(v=>v.length>500))throw Error('champ supérieur à 500 caractères');
        const r=Object.fromEntries(p.headers.map((h,j)=>[h,row[j].trim()]));
        if(!r.numero||!r.client)throw Error('numéro et client requis');
        if(r.client in {})throw Error('nom client réservé : utilisez un libellé explicite');
        const id=r.numero.toLocaleLowerCase('fr'); if(seen.has(id))throw Error('numéro de facture en double');seen.add(id);
        if(!iso(r.date_emission)||!iso(r.date_echeance)||r.date_echeance<r.date_emission)throw Error('dates ISO valides requises, échéance après émission');
        const ht=amount(r.montant_ht),ttc=amount(r.montant_ttc);if(ttc<ht)throw Error('TTC inférieur au HT');
        if(!['payee','non_payee'].includes(r.statut))throw Error('statut attendu : payee ou non_payee ; règlements partiels et avoirs hors périmètre');
        if(r.statut==='payee'&&(!iso(r.date_paiement)||r.date_paiement<r.date_emission))throw Error('date de paiement valide requise, après émission');
        if(r.statut==='non_payee'&&r.date_paiement)throw Error('date de paiement incompatible avec non_payee');
        records.push(r);
      }catch(e){errors.push({line:p.lines[i],message:e.message});}
    });
    if(errors.length)return {ok:false,errors,total:p.rows.length};
    const n=Invoices.normalizeInvoices(records,{lignes:p.lines});
    if(n.ignorees.length)throw Error('Normalisation impossible. Aucun résultat publié.');
    return {ok:true,invoices:n.invoices,total:p.rows.length};
  }
  function report(invoices,opts){
    if(!iso(opts.ref)||!iso(opts.du)||!iso(opts.au)||opts.du>opts.au||opts.au>opts.ref)throw Error('Dates invalides : début ≤ fin ≤ date de situation (années 2000 à 2099).');
    const historical=invoices.filter(i=>i.dateEmission<=opts.ref).map(i=>({...i,paid:i.paid&&i.datePaiement<=opts.ref,datePaiement:i.paid&&i.datePaiement<=opts.ref?i.datePaiement:null}));
    const selected=Reporting.filtrer(historical,opts),result=Reporting.computeReporting(historical,opts.ref,opts);
    result.regleTTC=selected.filter(i=>i.paid).reduce((s,i)=>s+Math.round(i.ttc*100),0)/100;
    result.selected=selected;result.future=invoices.length-historical.length;
    return result;
  }
  function demo(){return headers.join(';')+'\n'+[
    'EX-001;Agence Exemple;2026-08-03;2026-09-02;1000;1200;payee;2026-08-20',
    'EX-002;Studio Fictif;2026-09-05;2026-10-05;1500;1800;non_payee;',
    'EX-003;Agence Exemple;2026-09-10;2026-10-10;800;960;payee;2026-09-25',
    'EX-004;Atelier Démo;2026-10-01;2026-10-31;2000;2400;non_payee;',
    'EX-005;Studio Fictif;2026-10-08;2026-11-07;500;600;payee;2026-10-12'
  ].join('\n');}
  function exportSummary(r,opts,identity,mode){return CSV.toCsv(['indicateur','valeur','unite','perimetre'],[
    ['Rapport',identity,'',mode],['Début émission',opts.du,'date',''],['Fin émission',opts.au,'date',''],['Situation',opts.ref,'date',''],['Client filtré',opts.client||'Tous','',''],
    ['Factures',r.nbFactures,'nombre','Émises sur la période'],['Facturé',r.caHT,'EUR HT','Émises sur la période'],['Réglé',r.regleTTC,'EUR TTC','Factures sélectionnées entièrement réglées à la situation'],['Non réglé',r.encours,'EUR TTC','Factures sélectionnées non réglées à la situation'],['Échu',r.echues.total,'EUR TTC','Échéance strictement antérieure à la situation'],
    ...r.parMois.map(m=>['Facturé '+m.mois,m.ht,'EUR HT','Date émission']),...r.topClients.map(c=>['Client '+c.client,c.ht,'EUR HT','Date émission'])
  ]);}
  return {headers,iso,parse,report,demo,exportSummary};
});
