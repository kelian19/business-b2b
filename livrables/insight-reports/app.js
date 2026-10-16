'use strict';
(()=>{
  const $=id=>document.getElementById(id),L=Insight,C=Equerre.core.csv;
  const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n);
  let invoices=[],mode='',source='',result=null,applied=null,page=0,busy=false;
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function message(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
  function download(name,content,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([content],{type})),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
  $('ref').value=today();
  function metric(name,value){const box=el('div',undefined,'metric');box.append(el('span',name),el('strong',value));return box;}
  function row(cells){const tr=el('tr');cells.forEach(c=>{const td=el('td');td.append(c instanceof Node?c:document.createTextNode(String(c)));tr.append(td);});return tr;}
  function renderInvoices(){
    const all=result.selected, pages=Math.max(1,Math.ceil(all.length/100));page=Math.min(page,pages-1);$('invoices').replaceChildren();
    all.slice(page*100,(page+1)*100).forEach(i=>{
      const late=!i.paid&&i.dateEcheance<applied.ref;
      const badge=el('span',i.paid?'Réglée':late?'Échue':'Non réglée','badge'+(late?' late':''));
      $('invoices').append(row([i.numero,i.client,i.dateEmission,i.dateEcheance,euro(i.ht),euro(i.ttc),badge]));
    });
    if(!all.length)$('invoices').append(row(['Aucune facture sur ce périmètre.','','','','','','']));
    $('row-count').textContent=all.length+' facture(s)';$('page-number').textContent='Page '+(page+1)+' / '+pages;$('prev').disabled=page===0;$('next').disabled=page===pages-1;
  }
  function render(){
    const r=result;$('empty').hidden=true;$('report').hidden=false;
    $('source').textContent=(mode==='demo'?'EXEMPLE FICTIF':'FICHIER IMPORTÉ')+' · '+source;
    $('report-title').textContent=applied.identity?'Rapport · '+applied.identity:'Rapport de facturation';
    $('period').textContent='Émissions du '+applied.du+' au '+applied.au+' · situation au '+applied.ref+' · '+(applied.client||'tous les clients');
    $('footer-mode').textContent=mode==='demo'?'· données fictives, aucun résultat réel':'· fichier fourni par l’utilisateur';
    $('metrics').replaceChildren(metric('Facturé HT',euro(r.caHT)),metric('Réglé TTC',euro(r.regleTTC)),metric('Non réglé TTC',euro(r.encours)),metric('Dont échu TTC',euro(r.echues.total)));
    $('coverage').textContent=r.nbFactures+' facture(s) · '+r.nbClients+' client(s) sur le périmètre. '+r.future+' facture(s) postérieure(s) à la situation exclue(s).';
    $('months').replaceChildren();const months=r.parMois.slice(-12),max=Math.max(1,...months.map(m=>m.ht));
    months.forEach(m=>{const line=el('div',undefined,'bar-row'),track=el('div',undefined,'bar-track'),bar=el('div',undefined,'bar-fill');bar.style.width=(m.ht/max*100)+'%';track.setAttribute('aria-hidden','true');track.append(bar);line.append(el('span',m.mois),track,el('strong',euro(m.ht)));$('months').append(line);});
    if(!months.length)$('months').append(el('p','Aucune facture sur cette période.','hint'));
    $('aging').replaceChildren();
    [['À échéance ou à venir',r.aEchoir.total],...r.echues.tranches.map(b=>[b.label+' de retard',b.total])].forEach(([name,total])=>{const line=el('div',undefined,'aging-row');line.append(el('span',name),el('strong',euro(total)));$('aging').append(line);});
    $('clients').replaceChildren();r.topClients.forEach(c=>$('clients').append(row([c.client,euro(c.ht),new Intl.NumberFormat('fr-FR',{style:'percent',maximumFractionDigits:1}).format(c.part)])));
    if(!r.topClients.length)$('clients').append(row(['Aucun client sur cette période.','','']));
    renderInvoices();$('export').disabled=false;$('print').disabled=false;
  }
  function calculate(){
    try{
      const opts={du:$('du').value,au:$('au').value,ref:$('ref').value,client:$('client').value,identity:$('identity').value.trim()};
      const next=L.report(invoices,opts);result=next;applied=opts;page=0;render();message('Rapport actualisé. Les indicateurs portent uniquement sur le périmètre indiqué.');
    }catch(e){$('export').disabled=true;$('print').disabled=true;message(e.message,true);}
  }
  function load(next,name,nextMode){
    invoices=next;source=name;mode=nextMode;
    const dates=next.map(i=>i.dateEmission).sort();$('du').value=dates[0];
    const ref=nextMode==='demo'?'2026-10-16':today();$('ref').value=ref;$('au').value=dates.at(-1)>ref?ref:dates.at(-1);if($('du').value>$('au').value)$('du').value=$('au').value;
    $('identity').value=nextMode==='demo'?'Entreprise Exemple — fictive':'';
    $('client').replaceChildren();const all=el('option','Tous les clients');all.value='';$('client').append(all);
    [...new Set(next.map(i=>i.client))].sort((a,b)=>a.localeCompare(b,'fr')).forEach(c=>{const option=el('option',c);option.value=c;$('client').append(option);});
    $('apply').disabled=false;$('errors').hidden=true;calculate();
  }
  function replaceOK(){return !invoices.length||confirm('Remplacer le dossier courant ? Les deux fichiers ne seront pas mélangés.');}
  $('demo').onclick=()=>{if(busy||!replaceOK())return;load(L.parse(L.demo()).invoices,'5 factures de démonstration','demo');};
  $('template').onclick=()=>download('insight-modele-factures.csv','\uFEFF'+L.headers.join(';')+'\r\n');
  $('file').onchange=async e=>{
    const file=e.target.files[0];if(!file||busy)return;
    busy=true;$('demo').disabled=true;
    try{
      if(!/\.csv$/i.test(file.name))throw Error('Choisissez un fichier CSV.');
      if(file.size>5000000)throw Error('Fichier supérieur à 5 Mo.');
      const decoded=C.decodeBytes(new Uint8Array(await file.arrayBuffer()));
      if(decoded.suspectBinaire||decoded.caracteresRemplaces)throw Error('Le fichier n’est pas un CSV texte lisible. Exportez-le de nouveau en UTF-8.');
      const parsed=L.parse(decoded.texte);
      if(!parsed.ok){$('errors').hidden=false;$('error-total').textContent=parsed.errors.length+' ligne(s) à corriger sur '+parsed.total+'. Aucun import partiel. Les 50 premières erreurs sont affichées.';$('error-list').replaceChildren(...parsed.errors.slice(0,50).map(r=>el('li','Ligne '+r.line+' : '+r.message)));message('Import refusé. Le rapport précédent, s’il existe, reste affiché.',true);return;}
      if(replaceOK())load(parsed.invoices,file.name,'client');
    }catch(error){message('Import refusé. '+error.message+' Le dossier courant est conservé.',true);}
    finally{busy=false;$('demo').disabled=false;e.target.value='';}
  };
  $('filters').onsubmit=e=>{e.preventDefault();if(invoices.length)calculate();};
  $('filters').oninput=()=>{$('export').disabled=true;$('print').disabled=true;if(invoices.length)message('Périmètre modifié : cliquez sur Actualiser. Le rapport affiché conserve ses filtres précédents.');};
  $('prev').onclick=()=>{page--;renderInvoices();};$('next').onclick=()=>{page++;renderInvoices();};
  $('export').onclick=()=>{if(!result)return;download('insight-indicateurs'+(mode==='demo'?'-FICTIF':'')+'.csv','\uFEFF'+L.exportSummary(result,applied,applied.identity,mode==='demo'?'Données fictives':'Données importées'));};
  $('print').onclick=()=>window.print();
  $('clear').onclick=()=>{if(busy||!replaceOK())return;invoices=[];result=null;applied=null;mode='';source='';$('report').hidden=true;$('empty').hidden=false;$('errors').hidden=true;$('source').textContent='Aucun fichier chargé';$('report-title').textContent='Rapport de facturation';$('period').textContent='Importez votre export ou explorez un exemple fictif.';$('filters').reset();$('ref').value=today();$('client').replaceChildren();const option=el('option','Tous les clients');option.value='';$('client').append(option);$('apply').disabled=true;$('export').disabled=true;$('print').disabled=true;$('footer-mode').textContent='';message('Dossier fermé. Les fichiers d’origine sur votre ordinateur ne sont pas modifiés.');};
})();
