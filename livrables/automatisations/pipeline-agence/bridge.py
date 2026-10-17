"""Petit pont local authentifié pour n8n. Ne contacte aucun fournisseur."""
import argparse
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import threading
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from pipeline import Ledger, PipelineError, report_text


def handler_for(ledger, token, enable_live_api=False, report_dir=None):
    report_lock = threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Pas de payload, token ou coordonnées dans les logs HTTP.

        def send_json(self, status, data):
            payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(payload)

        def authorized(self):
            supplied = self.headers.get('Authorization', '')
            # compare_digest on bytes also handles non-ASCII input without an exception.
            return hmac.compare_digest(supplied.encode(), ('Bearer ' + token).encode())

        def do_GET(self):
            if not self.authorized():
                self.send_json(401, {'error': 'unauthorized'})
                return
            parsed = urlsplit(self.path)
            if parsed.path != '/v1/report':
                self.send_json(404, {'error': 'not_found'})
                return
            try:
                query = parse_qs(parsed.query)
                report = ledger.report(query.get('day', [None])[0])
                text = report_text(report)
                if report_dir is not None:
                    report_dir.mkdir(parents=True, exist_ok=True)
                    # Écriture atomique de fichiers d'agrégats, seuls fichiers autorisés pour Hermes.
                    with report_lock:
                        for name, content in [('bilan.json', json.dumps(report, ensure_ascii=False, indent=2)), ('bilan.txt', text)]:
                            temp = report_dir / (name + '.tmp')
                            temp.write_text(content, encoding='utf-8')
                            temp.replace(report_dir / name)
                self.send_json(200, {'report': report, 'text': text})
            except PipelineError:
                self.send_json(400, {'error': 'invalid_report_date'})
            except OSError:
                self.send_json(500, {'error': 'report_export_failed'})

        def do_POST(self):
            if not self.authorized():
                self.send_json(401, {'error': 'unauthorized'})
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 16000:
                    self.send_json(413, {'error': 'payload_size'})
                    return
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict):
                    raise PipelineError('Objet attendu')
                if self.path == '/v1/claim':
                    if data.get('mode') != ledger.mode:
                        raise PipelineError('Mode incorrect')
                    if ledger.mode == 'live' and not enable_live_api:
                        self.send_json(403, {'error': 'live_api_not_enabled'})
                        return
                    result = ledger.claim(limit=data.get('limit', 5), model=data.get('model', ''))
                elif self.path == '/v1/authorize-api-call':
                    if not enable_live_api:
                        self.send_json(403, {'error': 'live_api_not_enabled'})
                        return
                    result = ledger.authorize_api_call(data.get('job_id'))
                elif self.path == '/v1/complete':
                    result = ledger.complete(data.get('job_id'), data.get('response'))
                else:
                    self.send_json(404, {'error': 'not_found'})
                    return
                self.send_json(200, result)
            except (PipelineError, json.JSONDecodeError, ValueError, TypeError):
                self.send_json(400, {'error': 'request_rejected', 'action': 'human_review'})
            except Exception:
                self.send_json(500, {'error': 'internal_error', 'action': 'human_review'})
    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', default=str(Path(__file__).parent / 'runtime/demo.sqlite'))
    parser.add_argument('--mode', choices=['demo', 'live'], default='demo')
    parser.add_argument('--port', type=int, default=8791)
    parser.add_argument('--enable-live-api', action='store_true')
    parser.add_argument('--report-dir', help='Dossier privé d’agrégats séparé des coordonnées')
    args = parser.parse_args()
    token = os.environ.get('AGENCY_BRIDGE_TOKEN', '')
    if len(token) < 24 or '\n' in token or '\r' in token:
        raise SystemExit('Définir AGENCY_BRIDGE_TOKEN (24 caractères minimum) dans le gestionnaire de secrets ; ne pas le versionner.')
    ledger = Ledger(args.db, args.mode)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler_for(
        ledger, token, args.enable_live_api, Path(args.report_dir) if args.report_dir else None))
    print(f'Pont agence local : http://127.0.0.1:{server.server_port} · mode {args.mode} · aucun fournisseur appelé par ce service')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
