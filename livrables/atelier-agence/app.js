'use strict';
(() => {
  const L = FlowAtelier, $ = id => document.getElementById(id);
  const euros = n => new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR'}).format(n);
  const decimal = n => new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2}).format(n);
  const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
  let state = {format: 'flow-atelier', version: 1, demo: false, records: []}, dirty = false, quoteDirty = false;
  const form = $('record-form'), quoteForm = $('quote-form');
  function node(tag, text, cls) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; }
  function announce(message) { $('status').textContent = message; }
  function values(f) { return Object.fromEntries(new FormData(f)); }
  function option(select, value) { const o = node('option', value); o.value = value; select.append(o); }
  L.offers.forEach(o => {option($('offer'), o); option($('filter'), o);});
  L.stages.forEach(s => option($('stage'), s));
  function markDirty() {dirty = true; $('save-state').textContent = 'Modifications non sauvegardées. Téléchargez votre sauvegarde avant de fermer.';}
  function resetEditor() {form.reset(); form.elements.id.value = ''; $('record-title').textContent = 'Ajouter une opportunité'; $('record-error').textContent = '';}
  function metric(label, value) {const el = node('div', undefined, 'metric'); el.append(node('span', label), node('strong', value)); return el;}
  function render() {
    const stats = L.summary(state.records, today());
    $('mode').textContent = state.demo ? 'EXEMPLE FICTIF · tous les résultats de ce suivi sont des illustrations. Créez un suivi vide avant vos saisies réelles.' : 'SUIVI PRIVÉ · saisies manuelles, conservées dans cet onglet jusqu’à fermeture. Aucune synchronisation.';
    $('metrics').replaceChildren(metric('Opportunités', stats.count), metric('Signé HT', euros(stats.signed)), metric('Facturé HT', euros(stats.invoiced)), metric('Encaissé HT', euros(stats.collected)), metric('Actions à échéance', stats.due));
    const q = $('search').value.trim().toLocaleLowerCase('fr'), offer = $('filter').value;
    const rows = state.records.filter(r => (!offer || r.offer === offer) && [r.company, r.next, r.note].join(' ').toLocaleLowerCase('fr').includes(q));
    $('list-count').textContent = rows.length + ' opportunité(s) affichée(s) sur ' + state.records.length + ' · Indicateurs calculés sur tout le suivi.';
    $('records').replaceChildren();
    if (!rows.length) $('records').append(node('p', state.records.length ? 'Aucun résultat pour ces filtres.' : 'Votre première opportunité commence par un besoin concret. Ajoutez une fiche ou explorez l’exemple fictif.', 'empty'));
    rows.sort((a,b) => (a.due || '9999').localeCompare(b.due || '9999')).forEach(r => {
      const card = node('article', undefined, 'opportunity'); card.append(node('span', r.stage, 'tag'), node('h3', r.company), node('p', r.offer, 'meta'));
      const late = r.due && r.due <= today() && !['Signé', 'Perdu'].includes(r.stage);
      card.append(node('p', (r.due ? r.due.split('-').reverse().join('/') + ' · ' : '') + (r.next || 'Prochaine action à préciser'), late ? 'late' : ''));
      if (r.note) card.append(node('p', r.note, 'meta'));
      card.append(node('p', 'Proposé : ' + euros(r.proposed) + ' · Signé : ' + euros(r.signed) + ' · Facturé : ' + euros(r.invoiced) + ' · Encaissé : ' + euros(r.collected), 'meta'));
      const actions = node('div', undefined, 'toolbar'), edit = node('button', 'Modifier', 'secondary'), remove = node('button', 'Supprimer', 'danger');
      edit.setAttribute('aria-label', 'Modifier ' + r.company); remove.setAttribute('aria-label', 'Supprimer ' + r.company);
      edit.onclick = () => {Object.entries(r).forEach(([k,v]) => {form.elements[k].value = v;}); $('record-title').textContent = 'Modifier l’opportunité'; $('record-error').textContent = ''; form.elements.company.focus();};
      remove.onclick = () => {if (!confirm('Supprimer cette opportunité du suivi courant ?')) return; state.records = state.records.filter(x => x.id !== r.id); if (form.elements.id.value === r.id) resetEditor(); markDirty(); render(); announce('Opportunité supprimée du suivi courant.');};
      actions.append(edit, remove); card.append(actions); $('records').append(card);
    });
  }
  form.onsubmit = event => {
    event.preventDefault();
    try {
      const data = values(form); data.id = data.id || 'opp-' + Date.now() + '-' + Math.random().toString(36).slice(2,10);
      const r = L.record(data), index = state.records.findIndex(x => x.id === r.id);
      if (index < 0 && state.records.length >= 500) throw Error('Limite de 500 opportunités atteinte.');
      if (index < 0) state.records.push(r); else state.records[index] = r;
      markDirty(); resetEditor(); render(); announce('Fiche enregistrée dans cet onglet. Pensez à télécharger la sauvegarde.');
    } catch(e) {$('record-error').textContent = e.message;}
  };
  $('cancel').onclick = resetEditor;
  $('search').oninput = render; $('filter').onchange = render;
  function replaceAllowed() {return !dirty || confirm('Remplacer le suivi courant ? Les modifications non sauvegardées seront perdues.');}
  function replace(next) {state = next; resetEditor(); $('filter').value = ''; $('search').value = ''; markDirty(); render();}
  $('new').onclick = () => {if (replaceAllowed()) {replace({format:'flow-atelier', version:1, demo:false, records:[]}); announce('Nouveau suivi vide, séparé de l’exemple fictif.');}};
  $('demo').onclick = () => {
    if (!replaceAllowed()) return;
    const base = {next:'Préparer une découverte',due:today(),note:'Exemple inventé, aucun contact réel.',proposed:0,signed:0,invoiced:0,collected:0};
    replace(L.restore({format:'flow-atelier',version:1,demo:true,records:[
      {...base,id:'demo-1',company:'Agence Exemple',offer:'Flow Inbox',stage:'Rendez-vous',proposed:790,next:'Montrer le parcours de traitement d’une demande'},
      {...base,id:'demo-2',company:'Comptoir Fictif',offer:'Préparation e-facture',stage:'Devis',proposed:490,next:'Confirmer le volume et le format de l’export'},
      {...base,id:'demo-3',company:'Studio Démonstration',offer:'Flow Inbox',stage:'Signé',proposed:790,signed:790,invoiced:395,collected:395,next:'Organiser le cadrage de la mission'}
    ]})); announce('Exemple fictif chargé. Ces montants ne sont pas des résultats de l’agence.');
  };
  // Même principe que l’IO Équerre : Blob local, téléchargement volontaire et révocation de l’URL.
  function download(name, content, type) {const url = URL.createObjectURL(new Blob([content], {type})); const a = node('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);}
  $('export').onclick = () => {download('flow-suivi' + (state.demo ? '-FICTIF' : '-PRIVE') + '.json', JSON.stringify(state, null, 2), 'application/json'); dirty = false; $('save-state').textContent = 'Téléchargement demandé. Vérifiez que le fichier est bien présent dans votre dossier privé.'; announce('Sauvegarde proposée au navigateur.');};
  $('import').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 5000000) throw Error('Fichier trop volumineux : maximum 5 Mo.');
      const restored = L.restore(JSON.parse(await file.text()));
      if (!replaceAllowed()) return;
      replace(restored); dirty = false; $('save-state').textContent = 'Sauvegarde restaurée. Les prochaines modifications demanderont une nouvelle sauvegarde.'; announce('Sauvegarde validée et restaurée.');
    } catch(e) {announce('Restauration refusée. ' + e.message);}
    finally {event.target.value = '';}
  };
  let currentQuote = null;
  function calculate() {
    try {
      if (!quoteForm.checkValidity()) throw Error('Complétez les champs numériques dans les limites indiquées.');
      const q = values(quoteForm), result = L.quote(q); currentQuote = {q,result};
      $('quote-error').textContent = ''; $('quote-output').replaceChildren();
      const hero = node('div', undefined, 'quote-hero'); hero.append(node('p','Marge estimée après valorisation du temps'),node('strong',euros(result.margin)),node('p',result.marginRate === null ? 'Taux non calculable : prix nul.' : decimal(result.marginRate) + ' % du prix proposé'));
      if (result.margin < 0) hero.append(node('p','Le prix proposé ne couvre pas le coût estimé.'));
      const metrics = node('div',undefined,'metrics'); metrics.append(metric('Temps avec réserve',decimal(result.hours)+' h'),metric('Coût total estimé',euros(result.cost)),metric('Prix pour la marge cible',euros(result.recommended)),metric('Prix − coûts externes',euros(result.cashBeforeLabor)));
      $('quote-output').append(hero,metrics); $('scenarios').replaceChildren();
      for (const [label, factor] of [['Temps −20 %',.8],['Hypothèse saisie',1],['Temps +30 %',1.3]]) {
        const r = L.quote({...q,hours:Number(q.hours)*factor}), tr = node('tr');
        [label,decimal(r.hours)+' h',euros(r.cost),euros(r.margin)].forEach(t => tr.append(node('td',t))); $('scenarios').append(tr);
      }
      $('quote-export').disabled = false; $('print').disabled = false;
      return currentQuote;
    } catch(e) {currentQuote = null; $('quote-error').textContent = e.message; $('quote-output').replaceChildren(node('p','Résultat indisponible : corrigez les valeurs.','notice')); $('scenarios').replaceChildren(); $('quote-export').disabled = true; $('print').disabled = true; return null;}
  }
  quoteForm.onsubmit = e => {e.preventDefault(); calculate();};
  quoteForm.oninput = () => {quoteDirty = true; calculate();};
  $('quote-export').onclick = () => {
    const data = calculate(); if (!data) return; const {q,result:r} = data;
    const note = ['FLOW — NOTE INTERNE DE CADRAGE','Simulation HT, non contractuelle. Prix et temps non validés par une vente.','',q.mission,q.scope,'',
      'Prix proposé : '+euros(Number(q.price)), 'Temps initial : '+q.hours+' h','Coût horaire : '+euros(Number(q.rate)), 'Réserve : '+q.buffer+' %', 'Coûts externes : '+euros(Number(q.external)), 'Marge cible : '+q.target+' %',
      'Temps avec réserve : '+decimal(r.hours)+' h','Coût total estimé : '+euros(r.cost),'Marge estimée : '+euros(r.margin),'Prix pour la marge cible : '+euros(r.recommended),'',
      'Formules : coût = heures × (1 + réserve / 100) × coût horaire + coûts externes ; marge = prix − coût ; prix cible = coût / (1 − marge cible / 100).',
      'Hypothèses à confirmer. Impôts, cotisations, frais généraux non saisis et abonnements futurs exclus. Aucun gain client garanti.',
      'Avant proposition : préciser accès, livrables, exclusions, calendrier, critères de recette et modalités de paiement.'].join('\n');
    download('flow-cadrage-INTERNE.txt',note,'text/plain;charset=utf-8'); quoteDirty = false; announce('Note interne proposée au téléchargement.');
  };
  $('print').onclick = () => {if (calculate()) window.print();};
  function route() {const id = location.hash === '#chiffrage' ? 'chiffrage' : 'commercial'; for (const name of ['commercial','chiffrage']) {$(name).hidden = name !== id; const link = $('link-'+name); if (name === id) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');} document.title = 'flow · ' + (id === 'commercial' ? 'Suivi commercial' : 'Chiffrage de mission');}
  window.addEventListener('hashchange',route);
  window.addEventListener('beforeunload',e => {if (dirty || quoteDirty) {e.preventDefault(); e.returnValue = '';}});
  render(); calculate(); route();
})();
