from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading, subprocess, tempfile, re, json, html, os, shutil
root = Path(__file__).resolve().parents[1]
chrome = os.environ.get('FLOW_INBOX_CHROME', str(Path(os.environ.get('PROGRAMFILES', r'C:\Program Files')) / 'Google/Chrome/Application/chrome.exe'))
captures = root / 'captures'
captures.mkdir(exist_ok=True)
review = r'''<!doctype html><html><head><meta charset="utf-8"></head><body><pre id="report">RUNNING</pre><iframe id="page" src="/index.html" width="1440" height="1100"></iframe><script>
const frame = document.getElementById('page');
frame.onload = async () => {
 const checks = [], check = (name, ok, details='') => checks.push({name, ok:Boolean(ok), details});
 try {
  const d=frame.contentDocument,w=frame.contentWindow,el=id=>d.getElementById(id),choose=id=>d.querySelector('[data-scenario="'+id+'"]').click();
  check('Shared core loaded', Boolean(w.FlowCore && w.FlowSimulation && w.FlowContracts));
  check('Styles loaded', w.getComputedStyle(d.body).backgroundColor==='rgb(243, 240, 232)');
  check('Seven scenario choices', d.querySelectorAll('[data-scenario]').length===7);
  check('Initial empty state', el('metric-requests').textContent==='0' && el('draft-text').disabled);
  check('French and one H1',d.documentElement.lang==='fr' && d.querySelectorAll('h1').length===1);
  const button=d.querySelector('[data-scenario="missing"]');button.focus();button.click();
  check('Scenario selection preserves focus',d.activeElement===button);
  el('process').click();
  check('Missing budget asks question',el('draft-text').value.includes('enveloppe budgétaire') && !el('draft-text').value.includes('5 000'));
  check('One request and one draft',el('metric-requests').textContent==='1' && el('metric-drafts').textContent==='1');
  el('draft-text').value='Retouche fictive <img src=x onerror="window.compromised=true">';
  el('draft-text').dispatchEvent(new w.Event('input',{bubbles:true}));
  el('process').click();
  check('Unstored editor change retained at replay',el('draft-text').value.includes('Retouche fictive'));
  el('save').click();el('process').click();
  check('Stored human change retained at replay',el('draft-text').value.includes('Retouche fictive') && el('metric-drafts').textContent==='1');
  check('Markup in draft stays inert',!d.querySelector('.draft-panel img') && !w.compromised);
  el('remove').click();el('process').click();
  check('Disappearance is not a response',el('draft-text').disabled && el('metric-replies').textContent==='0' && el('metric-drafts').textContent==='1');
  choose('invalid');el('process').click();
  check('Invalid MIME reference rejected',el('feedback').dataset.kind==='rejected' && el('metric-requests').textContent==='1');
  choose('unsafe');el('process').click();
  check('Divergent destination requires review',el('feedback').dataset.kind==='review' && el('draft-text').disabled && el('metric-drafts').textContent==='1');
  check('Hostile URL is inert text',el('body').textContent.includes('https://exemple.invalid') && el('body').querySelectorAll('a,script,img').length===0);
  choose('malformed');el('process').click();
  check('Model-chosen destination rejected',el('feedback').dataset.kind==='review' && el('draft-text').disabled && el('metric-drafts').textContent==='1');
  choose('uncertain');el('process').click();
  check('Unknown creation not shown as ready',el('draft-text').disabled && el('metric-drafts').textContent==='2');
  el('process').click();
  check('Unknown creation replay adds nothing',el('metric-drafts').textContent==='2');
  el('observe').click();
  check('Mock reconciliation reuses draft',!el('draft-text').disabled && el('metric-drafts').textContent==='2');
  el('confirm').click();
  check('Outgoing proof explicitly simulated',el('metric-replies').textContent==='1' && el('identity').textContent.includes('simulated_provider') && el('feedback').textContent.includes('Aucun email réellement'));
  choose('tracking');el('process').click();
  check('Tracking failure prevents creation',el('draft-text').disabled && el('metric-drafts').textContent==='2');
  choose('complete');el('process').click();
  check('New independent request works',el('metric-drafts').textContent==='3');
  check('One pressed choice',d.querySelectorAll('[aria-pressed="true"]').length===1);
  check('Editor labelled',Boolean(d.querySelector('label[for="draft-text"]')));
  check('No form or real contact',d.querySelectorAll('form,a[href^="mailto:"]').length===0);
  check('No remote page resources',[...d.querySelectorAll('[src],link[href]')].every(e=>!/^https?:/.test(e.getAttribute('src')||e.getAttribute('href'))));
  check('CSP denies connections',d.querySelector('meta[http-equiv="Content-Security-Policy"]').content.includes("connect-src 'none'"));
  check('No automatic local persistence',w.localStorage.length===0 && d.cookie==='');
  for(const width of [1440,1024,768,390,320]){
   frame.width=width;await new Promise(resolve=>setTimeout(resolve,60));
   const overflow=d.documentElement.scrollWidth-w.innerWidth;
   check('Page overflow '+width,overflow<=1,'overflow='+overflow);
  }
  frame.width=320;await new Promise(resolve=>setTimeout(resolve,60));
  for(const id of ['uncertain','unsafe','tracking','malformed']){
   choose(id);const overflow=d.documentElement.scrollWidth-w.innerWidth;
   check('Narrow state '+id,overflow<=1,'overflow='+overflow);
  }
  el('reset').click();
  check('Reset clears state',el('metric-requests').textContent==='0' && el('metric-drafts').textContent==='0' && el('metric-replies').textContent==='0' && el('draft-text').disabled);
 }catch(error){checks.push({name:'Review exception',ok:false,details:String(error)});}
 document.getElementById('report').textContent='DEMO_RESULT:'+JSON.stringify(checks);
};
</script></body></html>'''
def preview(width):
 return ('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}iframe{display:block;border:0;width:'+str(width)+'px;height:1200px}</style></head><body><iframe id="demo" src="/index.html" title="Démo locale"></iframe><script>document.getElementById("demo").onload=()=>{const d=document.getElementById("demo").contentDocument;d.querySelector(\'[data-scenario="missing"]\').click();d.getElementById("process").click();};</script></body></html>')
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*_):pass
 def do_GET(self):
  if self.path in ('/__review__','/__desktop__','/__mobile__'):
   body=(review if self.path=='/__review__' else preview(390 if self.path=='/__mobile__' else 1440)).encode('utf-8')
   self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  else:super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
base=[chrome,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--disable-component-update','--disable-sync','--hide-scrollbars','--force-device-scale-factor=1']
owned_profiles=[]
def run(args):
 profile=tempfile.mkdtemp(prefix='flow-inbox-demo-');owned_profiles.append(Path(profile).resolve())
 result=subprocess.run(base+[f'--user-data-dir={profile}']+args,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=45,creationflags=subprocess.CREATE_NO_WINDOW)
 if result.returncode:raise RuntimeError(result.stderr[-1000:])
 return result.stdout
failed=[]
try:
 dom=run(['--dump-dom','--virtual-time-budget=3000','--window-size=1600,1200',url+'/__review__'])
 match=re.search(r'<pre id="report">DEMO_RESULT:(.*?)</pre>',dom,re.S)
 if not match:raise RuntimeError('No browser result: '+dom[:500])
 checks=json.loads(html.unescape(match.group(1)))
 print(f'CHROME: {sum(c["ok"] for c in checks)}/{len(checks)} checks passed')
 for c in checks:
  if not c['ok']:failed.append(c);print('FAIL:',c['name'],c['details'])
 for label,size,route in [('desktop','1440,1200','/__desktop__'),('mobile','390,1100','/__mobile__')]:
  destination=captures/(label+'.png')
  run(['--virtual-time-budget=1200',f'--window-size={size}',f'--screenshot={destination}',url+route])
  print(f'CAPTURE {label}: {destination.stat().st_size} bytes')
 file_dom=run(['--dump-dom','--virtual-time-budget=1200',root.joinpath('index.html').as_uri()])
 direct_ok='data-scenario="missing"' in file_dom and 'Notre budget est de 5 000' in file_dom
 print('DIRECT FILE: '+('scripts rendered' if direct_ok else 'FAILED'))
 if not direct_ok:failed.append({'name':'Direct file scripts'})
finally:
 server.shutdown();server.server_close();print('Loopback review server stopped.')
 temp_root=Path(tempfile.gettempdir()).resolve()
 for profile in owned_profiles:
  if profile.parent == temp_root and profile.name.startswith('flow-inbox-demo-'):
   shutil.rmtree(profile,ignore_errors=True)
raise SystemExit(bool(failed))
