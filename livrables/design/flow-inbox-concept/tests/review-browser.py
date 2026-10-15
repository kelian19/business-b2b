"""Recette locale Chrome : interactions, mobile, mouvements réduits et captures fictives."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import html
import json
import os
import re
import subprocess
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]
CHROME = Path(os.environ.get('PROGRAMFILES', r'C:\Program Files')) / 'Google/Chrome/Application/chrome.exe'
CAPTURES = ROOT / 'captures'
CAPTURES.mkdir(exist_ok=True)
REVIEW = r'''<!doctype html><html><body><pre id="report">RUNNING</pre><iframe id="frame" src="/index.html" width="1440" height="1100"></iframe><script>
const frame=document.getElementById('frame');
frame.onload=async()=>{
 const results=[],check=(name,ok,detail='')=>results.push({name,ok:Boolean(ok),detail});
 const pause=()=>new Promise(r=>setTimeout(r,100));
 try{
  const d=frame.contentDocument,w=frame.contentWindow,$=id=>d.getElementById(id);
  check('French, single heading',d.documentElement.lang==='fr'&&d.querySelectorAll('h1').length===1);
  check('Current identity has no Equerre',!d.body.textContent.toLowerCase().includes('équerre'));
  check('Styles loaded',w.getComputedStyle(d.body).backgroundColor==='rgb(247, 244, 236)');
  check('Both offers and fictional notice',d.body.textContent.includes('Préparation e-facture')&&d.body.textContent.includes('Démonstrations fictives'));
  $('tab-flow').focus();$('tab-flow').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  check('Tabs right arrow, focus and visibility',$('panel-flow').hidden&&!$('panel-invoice').hidden&&d.activeElement===$('tab-invoice')&&$('tab-invoice').tabIndex===0);
  $('invoice-review').click();
  check('Invoice review never merges records',!$('invoice-resolution').hidden&&$('invoice-resolution').textContent.includes('Aucune fusion')&&d.querySelectorAll('tbody tr').length===4);
  $('invoice-reset').click();
  check('Invoice reset restores control and focus',$('invoice-resolution').hidden&&!$('invoice-review').disabled&&d.activeElement===$('invoice-review'));
  $('tab-invoice').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
  check('Tabs Home',!$('panel-flow').hidden&&$('panel-invoice').hidden&&d.activeElement===$('tab-flow'));
  for(const [value,expected,absent] of [['formation','enveloppe budgétaire','5 000'],['agence','5 000','3 000'],['conseil','échéance','5 000']]){
   $('flow-case').value=value;$('flow-case').dispatchEvent(new w.Event('change',{bubbles:true}));$('flow-next').click();
   check('Draft scenario '+value,!$('draft-zone').hidden&&$('draft-text').value.includes(expected)&&!$('draft-text').value.includes(absent));
   const original=$('draft-text').value;$('draft-text').value='Retouche <img src=x onerror=alert(1)>';
   $('flow-next').click();$('flow-next').click();
   check('Human edit retained and inert '+value,$('draft-text').value.startsWith('Retouche')&&!$('draft-zone').querySelector('img'));
   $('flow-reset').click();
   check('Reset scenario '+value,$('draft-zone').hidden&&$('draft-text').value===original);
  }
  $('flow-case').value='formation';$('flow-case').dispatchEvent(new w.Event('change',{bubbles:true}));
  d.querySelector('[data-open-service="invoice"]').click();
  check('Service CTA selects invoice',!$('panel-invoice').hidden&&w.location.hash==='#maquette-facture'&&d.activeElement===$('tab-invoice'));
  d.querySelector('[data-open-service="flow"]').click();
  check('Service CTA selects flow',!$('panel-flow').hidden&&w.location.hash==='#maquette-flow');
  const details=d.querySelector('details');details.querySelector('summary').click();check('FAQ opens',details.open);details.querySelector('summary').click();check('FAQ closes',!details.open);
  for(const width of [1440,1024,768,390,320]){
   frame.width=width;await pause();
   check('No page overflow flow '+width,d.documentElement.scrollWidth<=w.innerWidth+1,'width '+d.documentElement.scrollWidth+'/'+w.innerWidth);
   $('tab-invoice').click();await pause();
   check('No page overflow invoice '+width,d.documentElement.scrollWidth<=w.innerWidth+1);
   $('tab-flow').click();
  }
  frame.width=390;await pause();const menu=d.querySelector('.menu-button');menu.click();
  check('Mobile menu opens',menu.getAttribute('aria-expanded')==='true'&&w.getComputedStyle($('navigation')).display==='flex');
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  check('Escape closes and returns focus',menu.getAttribute('aria-expanded')==='false'&&d.activeElement===menu);
  menu.click();$('navigation').querySelector('a').click();check('Menu closes after navigation',menu.getAttribute('aria-expanded')==='false');
  const anchors=[...d.querySelectorAll('a[href^="#"]')];
  check('Internal anchors resolve',anchors.every(a=>d.getElementById(a.getAttribute('href').slice(1))));
  check('No upload or hidden network submission',!d.querySelector('input[type="file"]')&&d.querySelector('meta[http-equiv="Content-Security-Policy"]').content.includes("form-action 'none'"));
  check('No remote resources',[...d.querySelectorAll('[src],link[href]')].every(e=>!/^https?:/.test(e.getAttribute('src')||e.getAttribute('href'))));
  check('No local storage or cookies',w.localStorage.length===0&&d.cookie==='');
  const isReduced=w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(isReduced){
   check('Reduced motion stops animation',[...d.querySelectorAll('.incoming,.connector path,.output,.panel-arrive,.entered')].every(e=>w.getComputedStyle(e).animationName==='none'));
   check('Reduced motion stops smooth scrolling',w.getComputedStyle(d.documentElement).scrollBehavior==='auto');
  }
  // Force the documented clipboard fallback without launching a real email client.
  Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:undefined});
  const inertText='<script>inert<'+ '/script>';
  $('contact-context').value='Test fictif '+inertText;$('copy-contact').click();await pause();
  check('Clipboard fallback contains literal context',$('copy-fallback')&&$('copy-fallback').value.includes(inertText)&&!$('contact-form').querySelector('script'));
  check('Copy fallback announced and selected',$('contact-status').textContent.includes('sélectionné')&&d.activeElement===$('copy-fallback'));
 }catch(error){check('Unexpected exception',false,String(error));}
 document.getElementById('report').textContent='RESULT:'+JSON.stringify(results);
};</script></body></html>'''


def preview(width, section, service):
    return '''<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}iframe{border:0;display:block}</style></head><body>''' + f'<iframe id="frame" title="Maquette fictive" src="/index.html" width="{width}" height="1100"></iframe>' + '''<script>document.getElementById('frame').onload=()=>{const f=document.getElementById('frame'),d=f.contentDocument;''' + ("d.getElementById('tab-invoice').click();" if service == 'invoice' else '') + (f"d.getElementById('{section}').scrollIntoView({{behavior:'instant'}});" if section else '') + '''};</script></body></html>'''


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_):
        pass

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ('/__review__', '/__preview__'):
            query = parse_qs(parsed.query)
            width = int(query.get('width', ['1440'])[0])
            section = query.get('section', [''])[0]
            if section not in ('', 'atelier', 'contact'):
                self.send_error(400)
                return
            text = REVIEW if parsed.path == '/__review__' else preview(width, section, query.get('service', ['flow'])[0])
            body = text.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


def run_browser(args):
    # TemporaryDirectory owns only a newly-created profile under the system temp directory.
    with tempfile.TemporaryDirectory(prefix='flow-site-review-') as profile:
        command = [str(CHROME), '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--disable-component-update', '--disable-sync', '--hide-scrollbars', '--force-device-scale-factor=1', f'--user-data-dir={profile}'] + args
        result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=45, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        if result.returncode:
            raise RuntimeError(result.stderr[-1000:])
        return result.stdout


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    failed = []
    try:
        for label, flags in [('normal', []), ('reduced', ['--force-prefers-reduced-motion'])]:
            dom = run_browser(flags + ['--dump-dom', '--virtual-time-budget=6000', '--window-size=1600,1200', base + '/__review__'])
            match = re.search(r'<pre id="report">RESULT:(.*?)</pre>', dom, re.S)
            if not match:
                raise RuntimeError('No browser result: ' + dom[:300])
            checks = json.loads(html.unescape(match.group(1)))
            failed.extend(c for c in checks if not c['ok'])
            (CAPTURES / (label + '-checks.json')).write_text(json.dumps(checks, ensure_ascii=False, indent=2), encoding='utf-8')
            print(label + ': ' + str(sum(c['ok'] for c in checks)) + '/' + str(len(checks)))
            for check in checks:
                if not check['ok']:
                    print('FAIL', check)
        for label, width, section, service in [('desktop', 1440, '', 'flow'), ('mobile', 390, '', 'flow'), ('maquette-flow', 1440, 'atelier', 'flow'), ('maquette-facture', 1440, 'atelier', 'invoice'), ('mobile-atelier', 390, 'atelier', 'invoice')]:
            target = CAPTURES / (label + '.png')
            run_browser(['--virtual-time-budget=2000', f'--window-size={width},1100', f'--screenshot={target}', base + f'/__preview__?width={width}&section={section}&service={service}'])
            print('CAPTURE', label, target.stat().st_size)
        local = run_browser(['--dump-dom', '--virtual-time-budget=1000', (ROOT / 'index.html').as_uri()])
        if 'id="tab-invoice"' not in local or 'studio d’automatisation' in local.lower() and 'équerre' in local.lower():
            failed.append({'name': 'Local file check'})
        print('DIRECT FILE: HTML accessible')
    finally:
        server.shutdown()
        server.server_close()
    raise SystemExit(1 if failed else 0)
