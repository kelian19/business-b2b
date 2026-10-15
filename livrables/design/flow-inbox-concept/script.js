'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const menu = document.querySelector('.menu-button');
  const navigation = $('navigation');
  function closeMenu(restoreFocus = false) {
    navigation.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menu.focus();
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const tabs = [...document.querySelectorAll('[data-service]')];
  function selectService(service, focusTab = false) {
    if (!['flow', 'invoice'].includes(service)) return;
    tabs.forEach((tab) => {
      const selected = tab.dataset.service === service;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = $('panel-' + tab.dataset.service);
      panel.hidden = !selected;
      panel.classList.toggle('panel-arrive', selected);
      if (selected && focusTab) tab.focus();
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectService(tab.dataset.service));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectService(tabs[next].dataset.service, true); }
    });
  });
  document.querySelectorAll('[data-open-service]').forEach((button) => {
    button.addEventListener('click', () => {
      const service = button.dataset.openService;
      selectService(service);
      $('atelier').scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
      $('tab-' + service).focus({ preventScroll: true });
      history.replaceState(null, '', service === 'flow' ? '#maquette-flow' : '#maquette-facture');
    });
  });
  function followHash() {
    const service = location.hash === '#maquette-facture' ? 'invoice' : location.hash === '#maquette-flow' ? 'flow' : null;
    if (service) { selectService(service); $('atelier').scrollIntoView({ behavior: 'instant' }); }
  }
  window.addEventListener('hashchange', followHash);
  followHash();

  // Scénarios écrits à la main. Aucune extraction ni vérification externe.
  const cases = {
    formation: {
      subject: 'Une formation pour notre équipe',
      body: 'Bonjour, nous cherchons une formation management de deux jours pour huit personnes, à Nantes en novembre. Pouvez-vous nous présenter votre approche ? Merci.',
      fields: [['Besoin', 'Formation management'], ['Participants', '8 personnes'], ['Échéance', 'Novembre'], ['Budget', 'Non indiqué']],
      state: 'À préciser', feedback: 'Le budget manque : le brouillon proposera de le demander.',
      draft: 'Bonjour,\n\nMerci pour votre demande de formation management pour huit personnes, sur deux jours à Nantes en novembre.\n\nQuelles dates envisagez-vous et quelle enveloppe budgétaire avez-vous prévue ? Ces précisions nous aideront à préparer une proposition.\n\nBien cordialement'
    },
    agence: {
      subject: 'Refonte d’un site vitrine',
      body: 'Bonjour, nous souhaitons refaire notre site vitrine de six pages. Nous avons prévu 5 000 € et visons une mise en ligne en janvier. Pourrions-nous échanger sur votre méthode ?',
      fields: [['Besoin', 'Site vitrine · 6 pages'], ['Budget annoncé', '5 000 €'], ['Échéance', 'Janvier'], ['Suite proposée', 'Échange de cadrage']],
      state: 'À relire', feedback: 'Le budget est repris du message ; aucun devis n’est calculé.',
      draft: 'Bonjour,\n\nMerci pour votre message. Nous avons bien noté votre projet de site vitrine de six pages, votre budget annoncé de 5 000 € et votre objectif de mise en ligne en janvier.\n\nSeriez-vous disponible pour un échange afin de préciser les contenus et le périmètre ?\n\nBien cordialement'
    },
    conseil: {
      subject: 'Organiser notre suivi commercial',
      body: 'Bonjour, notre équipe cherche un accompagnement pour organiser son suivi commercial. Nous utilisons un tableur et avons prévu une enveloppe de 3 000 €. Comment travaillez-vous ?',
      fields: [['Besoin', 'Organisation du suivi commercial'], ['Outil actuel', 'Tableur'], ['Budget annoncé', '3 000 €'], ['Échéance', 'Non indiquée']],
      state: 'À préciser', feedback: 'L’échéance reste inconnue : aucune date n’est inventée.',
      draft: 'Bonjour,\n\nMerci pour votre demande concernant votre suivi commercial sur tableur. Nous avons noté votre enveloppe annoncée de 3 000 €.\n\nÀ quelle échéance souhaitez-vous avancer ? Nous pourrions ensuite examiner ensemble un exemple de votre processus actuel.\n\nBien cordialement'
    }
  };
  let draftVisible = false;
  function renderCase() {
    const sample = cases[$('flow-case').value];
    $('mail-subject').textContent = sample.subject;
    $('mail-body').textContent = sample.body;
    $('flow-state').textContent = sample.state;
    $('flow-feedback').textContent = sample.feedback;
    $('flow-fields').replaceChildren(...sample.fields.map(([label, value]) => {
      const row = document.createElement('div');
      const key = document.createElement('span'); key.textContent = label;
      const val = document.createElement('b'); val.textContent = value;
      if (value.startsWith('Non indiqu')) val.className = 'missing';
      row.append(key, val); return row;
    }));
    $('draft-text').value = sample.draft;
    draftVisible = false;
    showStage();
  }
  function showStage() {
    $('flow-fields').hidden = draftVisible;
    $('draft-zone').hidden = !draftVisible;
    $('flow-stage-title').textContent = draftVisible ? '03 / Le brouillon à relire' : '02 / La fiche de suivi';
    $('flow-step').textContent = draftVisible ? 'Étape 2 sur 2' : 'Étape 1 sur 2';
    $('flow-next').textContent = draftVisible ? 'Revoir la fiche ←' : 'Voir le brouillon →';
  }
  $('flow-case').addEventListener('change', renderCase);
  $('flow-next').addEventListener('click', () => {
    draftVisible = !draftVisible; showStage();
    $('flow-feedback').textContent = draftVisible ? 'Brouillon fictif affiché. Vous pouvez le modifier ; aucun email ne sera envoyé.' : cases[$('flow-case').value].feedback;
  });
  $('flow-reset').addEventListener('click', () => {
    renderCase(); $('flow-feedback').textContent = 'Exemple réinitialisé. Les retouches de cette maquette ont été effacées.';
  });
  $('invoice-review').addEventListener('click', () => {
    $('invoice-resolution').hidden = false;
    $('invoice-reset').hidden = false;
    $('invoice-review').disabled = true;
    $('invoice-review').textContent = 'Proposition affichée';
    $('invoice-feedback').textContent = 'Deux fiches conservées : arbitrage humain nécessaire.';
  });
  $('invoice-reset').addEventListener('click', () => {
    $('invoice-resolution').hidden = true;
    $('invoice-reset').hidden = true;
    $('invoice-review').disabled = false;
    $('invoice-review').textContent = 'Voir la proposition ↗';
    $('invoice-review').focus();
    $('invoice-feedback').textContent = 'Exemple réinitialisé ; aucune modification de fichier.';
  });
  function message() {
    const need = document.querySelector('input[name="need"]:checked').value;
    const context = $('contact-context').value.trim();
    return { subject: 'Premier échange — ' + need, body: 'Bonjour,\n\nJe souhaite échanger au sujet de : ' + need + '.\n' + (context ? '\nMon contexte : ' + context + '\n' : '') + '\nPourrions-nous convenir d’un premier échange ?\n\nBien cordialement' };
  }
  $('contact-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const prepared = message();
    $('contact-status').textContent = 'Ouverture de votre messagerie demandée. Si rien ne s’ouvre, utilisez « Copier le message ». Aucun envoi effectué ici.';
    window.location.href = 'mailto:keliankaddouripro@gmail.com?subject=' + encodeURIComponent(prepared.subject) + '&body=' + encodeURIComponent(prepared.body);
  });
  $('copy-contact').addEventListener('click', async () => {
    const prepared = message();
    const text = prepared.subject + '\n\n' + prepared.body;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      $('contact-status').textContent = 'Message copié. Collez-le dans votre messagerie pour le relire.';
    } catch {
      let fallback = $('copy-fallback');
      if (!fallback) {
        fallback = document.createElement('textarea'); fallback.id = 'copy-fallback'; fallback.readOnly = true;
        fallback.setAttribute('aria-label', 'Message à copier manuellement'); fallback.rows = 8;
        fallback.style.cssText = 'width:100%;margin-top:15px;padding:12px;font-size:13px';
        $('contact-form').append(fallback);
      }
      fallback.value = text; fallback.focus(); fallback.select();
      $('contact-status').textContent = 'Copie automatique indisponible. Le message est sélectionné ci-dessous : copiez-le manuellement.';
    }
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { if (!reduced.matches) entry.target.classList.add('entered'); observer.unobserve(entry.target); }
      });
    }, { threshold: .08 });
    document.querySelectorAll('.section-heading,.service-card,.method-grid article,.faq-section>div').forEach((element) => observer.observe(element));
  }
})();
