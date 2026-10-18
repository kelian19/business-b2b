from concurrent.futures import ThreadPoolExecutor
import copy
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from pipeline import Ledger, PipelineError, day_of, demo_response, report_text, timestamp, load_sender
from bridge import handler_for
from generate_workflows import preparation, daily_report


def candidate(index=0, approved=True, live=False):
    host = f'entreprise-test-{index}.' + ('fr' if live else 'invalid')
    return {'company': f'Entreprise fictive {index}', 'email': 'contact@' + host,
            'offer': 'flow_inbox', 'fact': 'Des formations de management sont proposées aux entreprises.',
            'source_fact': 'https://' + host + '/formations', 'source_contact': 'https://' + host + '/contact',
            'approved': approved}


def fictitious_sender():
    return {'expediteur': 'Camille Exemple — entreprise fictive',
            'adresse_postale': '1 rue Fictive, 00000 Ville fictive',
            'identifiant_legal': '00000000000000', 'adresse_reponse': 'reponse@expediteur.invalid'}


class MessageTemplatesTests(unittest.TestCase):
    def test_initial_templates_match_editorial_reference(self):
        reference = (ROOT / 'hermes/MODELES_MESSAGES.md').read_text(encoding='utf-8')
        for number, offer in [(1, 'flow_inbox'), (2, 'efacture')]:
            with self.subTest(offer=offer):
                section = reference.split(f'## Modèle {number} — ', 1)[1].split('\n## ', 1)[0]
                subject = section.split('**Objet** : ', 1)[1].split('\n', 1)[0]
                body = '\n'.join(line[2:] if line.startswith('> ') else ''
                                 for line in section.splitlines() if line.startswith('>'))
                body = body.replace('{prenom_nom}', '')
                template = (ROOT / 'hermes/messages' / (offer + '.txt')).read_text(encoding='utf-8').strip()
                self.assertEqual(template, subject + '\n\n' + body)


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix='agency-pipeline-tests-')
        self.path = Path(self.folder.name) / 'test.sqlite'
        self.ledger = Ledger(self.path)

    def tearDown(self):
        self.folder.cleanup()

    def prepared(self):
        self.ledger.ingest([candidate()])
        job = self.ledger.claim(model='simulation')['jobs'][0]
        result = self.ledger.complete(job['job_id'], demo_response(job))
        return job, result

    def test_import_is_deduplicated_and_persistent(self):
        self.assertEqual(self.ledger.ingest([candidate()])['added'], 1)
        self.assertEqual(Ledger(self.path).ingest([candidate()])['duplicates'], 1)

    def test_company_domain_dedup_prevents_multiple_recipients(self):
        self.ledger.ingest([candidate()])
        second = candidate(); second['email'] = 'direction@entreprise-test-0.invalid'
        self.assertEqual(self.ledger.ingest([second])['duplicates'], 1)

    def test_import_is_atomic_on_invalid_row(self):
        invalid = candidate(1); invalid['email'] = 'contact@exemple.invalid\nBCC:x@y.fr'
        with self.assertRaises(PipelineError):
            self.ledger.ingest([candidate(), invalid])
        self.assertEqual(self.ledger.report()['identified'], 0)

    def test_non_boolean_approval_rejected(self):
        row = candidate(); row['approved'] = 'false'
        with self.assertRaises(PipelineError):
            self.ledger.ingest([row])

    def test_unapproved_candidate_not_claimed(self):
        self.ledger.ingest([candidate(approved=False)])
        self.assertEqual(self.ledger.claim(model='simulation')['jobs'], [])

    def test_human_approval_required_and_persistent(self):
        self.ledger.ingest([candidate(approved=False)])
        with self.ledger.connect() as db:
            ident = db.execute('SELECT id FROM candidates').fetchone()[0]
        with self.assertRaises(PipelineError):
            self.ledger.approve(ident)
        self.ledger.approve(ident, True)
        self.assertEqual(len(self.ledger.claim(model='simulation')['jobs']), 1)

    def test_concurrent_claims_respect_daily_limit(self):
        self.ledger.ingest([candidate(i) for i in range(12)])
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: self.ledger.claim(limit=3, model='simulation'), range(4)))
        ids = [j['job_id'] for r in results for j in r['jobs']]
        self.assertEqual(len(ids), 5)
        self.assertEqual(len(set(ids)), 5)

    def test_unresolved_jobs_not_reclaimed_after_restart(self):
        self.ledger.ingest([candidate()])
        self.ledger.claim(model='simulation')
        self.assertEqual(Ledger(self.path).claim(model='simulation')['jobs'], [])
        self.assertEqual(self.ledger.report()['unresolved_jobs'], 1)

    def test_prompt_excludes_recipient(self):
        self.ledger.ingest([candidate()])
        request = self.ledger.claim(model='simulation')['jobs'][0]['anthropic_request']
        self.assertNotIn('contact@', json.dumps(request))
        self.assertNotIn('tools', request)
        self.assertEqual(request['max_tokens'], 600)

    def test_draft_replay_does_not_duplicate(self):
        job, _ = self.prepared()
        result = self.ledger.complete(job['job_id'], demo_response(job))
        self.assertTrue(result['replayed'])
        self.assertEqual(len(self.ledger.queue()), 1)
        self.assertEqual(self.ledger.report()['confirmed_events']['sent'], 0)

    def test_missing_identity_explicitly_marks_draft_incomplete(self):
        self.prepared()
        draft = self.ledger.queue()[0]
        self.assertEqual(draft['review_status'], 'identity_incomplete')
        self.assertIn('NON ENVOYABLE', draft['body'])
        for field in ('expediteur', 'adresse_postale', 'identifiant_legal', 'adresse_reponse'):
            self.assertIn('{' + field + '}', draft['body'])

    def test_both_templates_render_verified_identity_and_source(self):
        ledger = Ledger(self.path, sender=fictitious_sender())
        rows = [candidate(0), candidate(1)]
        rows[1]['offer'] = 'efacture'
        ledger.ingest(rows)
        for job in ledger.claim(model='simulation')['jobs']:
            ledger.complete(job['job_id'], demo_response(job))
        drafts = {row['offer']: row for row in ledger.queue()}
        self.assertEqual(drafts['flow_inbox']['subject'], 'Un point sur vos demandes commerciales')
        self.assertIn('Une personne relit et envoie chaque message.', drafts['flow_inbox']['body'])
        self.assertEqual(drafts['efacture']['subject'], 'Fiabiliser vos fichiers clients et fournisseurs')
        self.assertIn("Aucun fichier n'est nécessaire", drafts['efacture']['body'])
        for draft in drafts.values():
            self.assertEqual(draft['review_status'], 'human_review_required')
            self.assertNotIn('{', draft['body'])
            self.assertIn(draft['source_contact'], draft['body'])
            self.assertIn('« non merci » à reponse@expediteur.invalid', draft['body'])
        self.assertEqual(ledger.report()['confirmed_events']['sent'], 0)

    def test_sender_never_enters_model_request_or_report(self):
        sender = fictitious_sender()
        ledger = Ledger(self.path, sender=sender)
        ledger.ingest([candidate()])
        job = ledger.claim(model='simulation')['jobs'][0]
        ledger.complete(job['job_id'], demo_response(job))
        public = json.dumps([job['anthropic_request'], ledger.report()])
        for value in sender.values():
            self.assertNotIn(value, public)

    def test_invalid_or_placeholder_identity_is_rejected(self):
        for key, value in [('expediteur', 'À COMPLÉTER'), ('adresse_postale', '{adresse}'),
                           ('adresse_reponse', 'reponse@exemple.invalid\nBCC:autre@x.invalid'),
                           ('identifiant_legal', 'à vérifier')]:
            sender = fictitious_sender(); sender[key] = value
            with self.subTest(field=key), self.assertRaises(PipelineError):
                Ledger(self.path, sender=sender)
        with self.assertRaises(PipelineError):
            Ledger(self.path, sender={})

    def test_sender_file_is_explicit_json_and_env_is_never_read(self):
        path = Path(self.folder.name) / 'sender.json'
        path.write_text(json.dumps(fictitious_sender()), encoding='utf-8')
        self.assertEqual(load_sender(path), fictitious_sender())
        self.assertIsNone(load_sender(None))
        with self.assertRaises(PipelineError):
            load_sender(Path(self.folder.name) / '.env.must-not-exist')
        path.write_text('not json', encoding='utf-8')
        with self.assertRaises(PipelineError):
            load_sender(path)

    def test_sender_configuration_does_not_rewrite_existing_draft(self):
        job, _ = self.prepared()
        before = self.ledger.queue()[0]['body']
        ledger = Ledger(self.path, sender=fictitious_sender())
        self.assertTrue(ledger.complete(job['job_id'], demo_response(job))['replayed'])
        self.assertEqual(ledger.queue()[0]['body'], before)
        self.assertEqual(ledger.queue()[0]['review_status'], 'identity_incomplete')

    def test_existing_draft_is_not_overwritten(self):
        job, _ = self.prepared()
        response = demo_response(job)
        parsed = json.loads(response['content'][0]['text'])
        parsed['opening'] = 'Votre activité présente une offre de formation professionnelle.'
        response['content'][0]['text'] = json.dumps(parsed)
        with self.assertRaises(PipelineError):
            self.ledger.complete(job['job_id'], response)

    def test_model_cannot_set_recipient(self):
        self.ledger.ingest([candidate()])
        job = self.ledger.claim(model='simulation')['jobs'][0]
        response = demo_response(job); parsed = json.loads(response['content'][0]['text'])
        parsed['to'] = 'autre@exemple.invalid'; response['content'][0]['text'] = json.dumps(parsed)
        with self.assertRaises(PipelineError):
            self.ledger.complete(job['job_id'], response)

    def test_fact_must_match_exactly(self):
        self.ledger.ingest([candidate()])
        job = self.ledger.claim(model='simulation')['jobs'][0]
        response = demo_response(job); parsed = json.loads(response['content'][0]['text'])
        parsed['fact_quote'] = 'Un autre fait inventé'; response['content'][0]['text'] = json.dumps(parsed)
        with self.assertRaises(PipelineError):
            self.ledger.complete(job['job_id'], response)

    def test_truncated_and_malformed_model_outputs_rejected(self):
        for response in [{'stop_reason': 'max_tokens', 'content': []}, {'stop_reason': 'end_turn', 'content': [{'type': 'text', 'text': 'pas du JSON'}]}]:
            with self.assertRaises(PipelineError):
                self.ledger.complete('inconnu', response)

    def test_untrusted_source_cannot_be_local(self):
        for source in ['http://example.fr', 'https://127.0.0.1/a', 'https://localhost/a', 'https://name.local/a', 'https://user:password@exemple.fr/a']:
            row = candidate(); row['source_fact'] = source
            with self.assertRaises(PipelineError):
                self.ledger.ingest([row])

    def test_opposition_blocks_pending_completion(self):
        self.ledger.ingest([candidate()])
        job = self.ledger.claim(model='simulation')['jobs'][0]
        with self.ledger.connect() as db:
            ident = db.execute('SELECT id FROM candidates').fetchone()[0]
        self.ledger.record(ident, 'opposed', 'opposition-001', 'réponse privée référencée', confirmed=True)
        with self.assertRaises(PipelineError):
            self.ledger.complete(job['job_id'], demo_response(job))

    def test_opposition_hides_already_prepared_draft(self):
        _, result = self.prepared()
        self.ledger.record(result['candidate_id'], 'opposed', 'opposition-001', 'preuve privée', confirmed=True)
        self.assertEqual(self.ledger.queue(), [])

    def test_events_require_confirmation(self):
        _, result = self.prepared()
        with self.assertRaises(PipelineError):
            self.ledger.record(result['candidate_id'], 'sent', 'sent-001', 'preuve')

    def test_event_replay_is_idempotent_and_conflict_rejected(self):
        _, result = self.prepared()
        self.ledger.record(result['candidate_id'], 'sent', 'sent-001', 'gmail-id-fictif', confirmed=True)
        self.assertTrue(self.ledger.record(result['candidate_id'], 'sent', 'sent-001', 'gmail-id-fictif', confirmed=True)['replayed'])
        with self.assertRaises(PipelineError):
            self.ledger.record(result['candidate_id'], 'replied', 'sent-001', 'gmail-id-fictif', confirmed=True)
        self.assertEqual(self.ledger.report()['confirmed_events']['sent'], 1)

    def test_money_is_integer_cents_and_separate_from_invoicing(self):
        _, result = self.prepared()
        ident = result['candidate_id']
        self.ledger.record(ident, 'invoiced', 'invoice-001', 'facture fictive', confirmed=True)
        self.assertEqual(self.ledger.report()['payments_received_cents'], 0)
        for index, cents in enumerate([49000, 15001]):
            self.ledger.record(ident, 'payment_received', 'payment-' + str(index), 'banque fictive', confirmed=True, amount_cents=cents)
        report = self.ledger.report()
        self.assertEqual(report['payments_received_cents'], 64001)
        self.assertIn('640,01 EUR', report_text(report))
        with self.assertRaises(PipelineError):
            self.ledger.record(ident, 'payment_received', 'payment-float', 'preuve', confirmed=True, amount_cents=490.0)

    def test_report_contains_no_prospect_or_email_or_body(self):
        self.prepared()
        report = json.dumps(self.ledger.report())
        for private in ['Entreprise fictive', 'contact@', 'fact_quote', 'source_contact', 'Bonjour']:
            self.assertNotIn(private, report)

    def test_paris_day_and_dst(self):
        self.assertEqual(day_of('2026-10-17T23:30:00+00:00'), '2026-10-18')
        self.assertEqual(day_of('2026-12-17T23:30:00+00:00'), '2026-12-18')
        with self.assertRaises(PipelineError):
            day_of('2026-10-17T20:00:00')

    def test_demo_live_databases_cannot_mix(self):
        with self.assertRaises(PipelineError):
            Ledger(self.path, 'live')
        live = Ledger(Path(self.folder.name) / 'live.sqlite', 'live')
        with self.assertRaises(PipelineError):
            live.ingest([candidate()])

    def test_live_call_gate_is_one_time(self):
        ledger = Ledger(Path(self.folder.name) / 'live.sqlite', 'live')
        ledger.ingest([candidate(live=True)])
        job = ledger.claim(model='claude-test-fictif')['jobs'][0]
        with self.assertRaises(PipelineError):
            ledger.complete(job['job_id'], demo_response(job))
        ledger.authorize_api_call(job['job_id'])
        with self.assertRaises(PipelineError):
            ledger.authorize_api_call(job['job_id'])
        self.assertEqual(ledger.complete(job['job_id'], demo_response(job))['status'], 'prepared')

    def test_cancel_is_explicit_and_does_not_restore_budget_or_requeue(self):
        self.ledger.ingest([candidate()])
        job = self.ledger.claim(model='simulation')['jobs'][0]
        with self.assertRaises(PipelineError):
            self.ledger.cancel_job(job['job_id'])
        self.ledger.cancel_job(job['job_id'], True)
        self.assertEqual(self.ledger.report()['unresolved_jobs'], 0)
        self.assertEqual(self.ledger.claim(model='simulation')['reserved_today'], 1)
        self.assertEqual(self.ledger.claim(model='simulation')['jobs'], [])


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='agency-bridge-tests-')
        self.root = Path(self.temp.name)
        self.ledger = Ledger(self.root / 'test.sqlite')
        self.token = 'faux-token-local-pour-tests-seulement'
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(self.ledger, self.token, report_dir=self.root / 'aggregates'))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()
        self.temp.cleanup()

    def request(self, path, payload=None, auth=True):
        headers = {'Content-Type': 'application/json'}
        if auth:
            headers['Authorization'] = 'Bearer ' + self.token
        req = Request(f'http://127.0.0.1:{self.server.server_port}' + path,
                      data=json.dumps(payload).encode() if payload is not None else None, headers=headers)
        try:
            with urlopen(req, timeout=3) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def test_unauthenticated_request_rejected(self):
        self.assertEqual(self.request('/v1/report', auth=False)[0], 401)

    def test_local_http_demo_roundtrip_and_replay(self):
        self.ledger.ingest([candidate()])
        status, claimed = self.request('/v1/claim', {'mode': 'demo', 'model': 'simulation'})
        self.assertEqual(status, 200)
        job = claimed['jobs'][0]
        payload = {'job_id': job['job_id'], 'response': demo_response(job)}
        self.assertEqual(self.request('/v1/complete', payload)[0], 200)
        self.assertTrue(self.request('/v1/complete', payload)[1]['replayed'])

    def test_report_export_only_aggregates(self):
        self.assertEqual(self.request('/v1/report')[0], 200)
        payload = json.loads((self.root / 'aggregates/bilan.json').read_text(encoding='utf-8'))
        self.assertEqual(payload['timezone'], 'Europe/Paris')
        self.assertNotIn('email', payload)

    def test_date_error_and_unknown_routes_fail_closed(self):
        self.assertEqual(self.request('/v1/report?day=not-a-date')[0], 400)
        self.assertEqual(self.request('/v1/send', {'email': 'faux@exemple.invalid'})[0], 404)

    def test_live_mode_and_api_gate_are_closed_by_default(self):
        self.assertEqual(self.request('/v1/claim', {'mode': 'live', 'model': 'anything'})[0], 400)
        self.assertEqual(self.request('/v1/authorize-api-call', {'job_id': 'unknown'})[0], 403)


class WorkflowTests(unittest.TestCase):
    def test_exports_match_generator(self):
        for name, expected in [('01-preparation.json', preparation()), ('02-bilan-quotidien.json', daily_report())]:
            actual = json.loads((ROOT / 'n8n' / name).read_text(encoding='utf-8'))
            self.assertEqual(actual, expected)

    def test_workflows_inactive_and_no_gmail_send(self):
        for workflow in [preparation(), daily_report()]:
            self.assertFalse(workflow['active'])
            self.assertEqual(workflow['settings']['timezone'], 'Europe/Paris')
            self.assertTrue(all('gmail' not in n['type'].lower() for n in workflow['nodes']))
            names = {n['name'] for n in workflow['nodes']}
            for source, outputs in workflow['connections'].items():
                self.assertIn(source, names)
                for branch in outputs['main']:
                    for destination in branch:
                        self.assertIn(destination['node'], names)

    def test_schedule_disabled_and_telegram_off(self):
        workflow = daily_report()
        schedule = next(n for n in workflow['nodes'] if n['type'].endswith('scheduleTrigger'))
        self.assertTrue(schedule['disabled'])
        config = next(n for n in workflow['nodes'] if n['name'] == 'Configuration bilan')
        self.assertIn('send_telegram:false', config['parameters']['jsCode'])


if __name__ == '__main__':
    unittest.main()
