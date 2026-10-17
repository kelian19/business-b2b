"""Générer des exports n8n désactivés. Ne lance ni n8n ni un fournisseur."""
import json
from pathlib import Path
import uuid

ROOT = Path(__file__).parent
BRIDGE = 'http://127.0.0.1:8791'
BRIDGE_AUTH = {'httpHeaderAuth': {'id': 'A_CONFIGURER_BRIDGE', 'name': 'Agence — pont local'}}
CLAUDE_AUTH = {'httpHeaderAuth': {'id': 'A_CONFIGURER_CLAUDE', 'name': 'Agence — Anthropic API'}}


def node(name, kind, parameters, x, y, version=1, **extra):
    return {'id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'agence/' + name)), 'name': name,
            'type': 'n8n-nodes-base.' + kind, 'typeVersion': version,
            'position': [x, y], 'parameters': parameters, **extra}


def code(name, source, x, y, each=False):
    return node(name, 'code', {'mode': 'runOnceForEachItem' if each else 'runOnceForAllItems', 'jsCode': source}, x, y, 2)


def http(name, path, x, y, body=None):
    parameters = {'method': 'POST' if body is not None else 'GET', 'url': BRIDGE + path,
                  'authentication': 'genericCredentialType', 'genericAuthType': 'httpHeaderAuth',
                  'options': {'timeout': 30000}}
    if body is not None:
        parameters.update({'sendBody': True, 'specifyBody': 'json', 'jsonBody': body})
    return node(name, 'httpRequest', parameters, x, y, 4.2,
                credentials=BRIDGE_AUTH, retryOnFail=False)


def condition(name, expression, value, x, y, boolean=False):
    operator = {'type': 'boolean', 'operation': 'true', 'singleValue': True} if boolean else {'type': 'string', 'operation': 'equals'}
    return node(name, 'if', {'conditions': {'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict', 'version': 2},
                'conditions': [{'id': 'test', 'leftValue': expression, 'rightValue': value, 'operator': operator}], 'combinator': 'and'},
                'options': {}}, x, y, 2.2)


def edge(target):
    return {'node': target, 'type': 'main', 'index': 0}


def workflow(name, nodes, connections):
    return {'name': name, 'nodes': nodes, 'connections': connections, 'active': False,
            'pinData': {}, 'settings': {'executionOrder': 'v1', 'timezone': 'Europe/Paris',
                                      'saveDataErrorExecution': 'none', 'saveDataSuccessExecution': 'none',
                                      'saveManualExecutions': False, 'saveExecutionProgress': False,
                                      'executionTimeout': 300},
            'versionId': str(uuid.uuid5(uuid.NAMESPACE_URL, name + '/0.1')), 'tags': []}


def preparation():
    nodes = [
        node('Démarrage manuel', 'manualTrigger', {}, 0, 100),
        code('Configuration préparation', "return [{json:{mode:'demo',limit:5,model:'CLAUDE_MODEL_A_CONFIGURER'}}];", 230, 100),
        http('Réserver les tâches', '/v1/claim', 470, 100,
             '={{ JSON.stringify({mode:$json.mode,limit:$json.limit,model:$json.model}) }}'),
        code('Répartir les tâches', "const data=$input.first().json; if(!Array.isArray(data.jobs)) throw new Error('Contrat du pont invalide'); return data.jobs.map(job=>({json:job,pairedItem:{item:0}}));", 710, 100),
        condition('Mode live explicite ?', '={{ $json.mode }}', 'live', 950, 100),
        http('Autoriser un appel unique', '/v1/authorize-api-call', 1190, -50,
             '={{ JSON.stringify({job_id:$json.job_id}) }}'),
        node('Claude — API Messages', 'httpRequest', {
            'method': 'POST', 'url': 'https://api.anthropic.com/v1/messages',
            'authentication': 'genericCredentialType', 'genericAuthType': 'httpHeaderAuth',
            'sendHeaders': True, 'headerParameters': {'parameters': [{'name': 'anthropic-version', 'value': '2023-06-01'}]},
            'sendBody': True, 'specifyBody': 'json',
            'jsonBody': "={{ JSON.stringify($('Répartir les tâches').item.json.anthropic_request) }}",
            'options': {'timeout': 60000}}, 1430, -50, 4.2,
            credentials=CLAUDE_AUTH, retryOnFail=False),
        code('Rattacher la réponse au job', "const job=$('Répartir les tâches').item.json; return {json:{job_id:job.job_id,response:$json}};", 1670, -50, each=True),
        code('Claude simulé — aucun appel', "return $input.all().map((item,index)=>({json:{job_id:item.json.job_id,response:{stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({opening:'Votre présentation mentionne cette activité : '+item.json.fact,fact_quote:item.json.fact})}]}},pairedItem:{item:index}}));", 1430, 260),
        http('Valider et enregistrer le brouillon local', '/v1/complete', 1930, 100,
             '={{ JSON.stringify({job_id:$json.job_id,response:$json.response}) }}'),
        code('Relecture humaine — aucun envoi', "return $input.all().map(item=>({json:{...item.json,next_step:'Consulter la queue locale, relire puis envoyer manuellement. Aucun brouillon Gmail créé par ce workflow.'}}));", 2170, 100),
        node('Lire avant import', 'stickyNote', {'content': 'V0.1 — EXPORT NON EXÉCUTÉ DANS N8N\nMode demo par défaut. Le pont local doit être lancé. Deux credentials Header Auth à sélectionner : Authorization/Bearer pour le pont ; x-api-key pour Anthropic.\nLe mode live nécessite aussi --enable-live-api côté pont et un modèle accessible. Aucun nœud Gmail/Send. Un timeout reste à réconcilier humainement. Ne pas rejouer directement le nœud API.', 'height': 250, 'width': 600}, 40, -320),
    ]
    connections = {
        'Démarrage manuel': {'main': [[edge('Configuration préparation')]]},
        'Configuration préparation': {'main': [[edge('Réserver les tâches')]]},
        'Réserver les tâches': {'main': [[edge('Répartir les tâches')]]},
        'Répartir les tâches': {'main': [[edge('Mode live explicite ?')]]},
        'Mode live explicite ?': {'main': [[edge('Autoriser un appel unique')], [edge('Claude simulé — aucun appel')]]},
        'Autoriser un appel unique': {'main': [[edge('Claude — API Messages')]]},
        'Claude — API Messages': {'main': [[edge('Rattacher la réponse au job')]]},
        'Rattacher la réponse au job': {'main': [[edge('Valider et enregistrer le brouillon local')]]},
        'Claude simulé — aucun appel': {'main': [[edge('Valider et enregistrer le brouillon local')]]},
        'Valider et enregistrer le brouillon local': {'main': [[edge('Relecture humaine — aucun envoi')]]},
    }
    return workflow('Agence 01 — préparation commerciale — DEMO', nodes, connections)


def daily_report():
    nodes = [
        node('Bilan manuel', 'manualTrigger', {}, 0, 0),
        node('Chaque soir à 20h — désactivé', 'scheduleTrigger', {'rule': {'interval': [{'field': 'cronExpression', 'expression': '0 20 * * *'}]}}, 0, 200, 1.2, disabled=True),
        code('Configuration bilan', "return [{json:{send_telegram:false,chat_id:''}}];", 250, 80),
        http('Lire les agrégats et exporter pour Hermes', '/v1/report', 500, 80),
        condition('Livraison Telegram autorisée ?', "={{ $('Configuration bilan').item.json.send_telegram }}", True, 750, 80, boolean=True),
        node('Telegram — bilan privé', 'telegram', {'resource': 'message', 'operation': 'sendMessage',
             'chatId': "={{ $('Configuration bilan').item.json.chat_id }}", 'text': '={{ $json.text }}',
             'additionalFields': {'appendAttribution': False}}, 1020, -30, 1.2,
             credentials={'telegramApi': {'id': 'A_CONFIGURER_TELEGRAM', 'name': 'Agence — Telegram bilan'}}),
        code('Aperçu seulement — aucune livraison', "return [{json:{...$input.first().json,delivery:'not_sent',hermes:'Lire uniquement les fichiers agrégés du dossier de rapports explicitement sélectionné.'}}];", 1020, 200),
        node('Bilan : mode aperçu', 'stickyNote', {'content': 'Europe/Paris. Workflow et planification inactifs. send_telegram=false.\nLe pont écrit les agrégats s’il est lancé avec --report-dir. Hermes n’est pas invoqué automatiquement : il lit ces seuls agrégats dans un environnement séparé.\nPour livrer sur Telegram, sélectionner credentials et chat privé, puis tester sur données fictives avant activation.', 'height': 220, 'width': 550}, 180, -250),
    ]
    connections = {
        'Bilan manuel': {'main': [[edge('Configuration bilan')]]},
        'Chaque soir à 20h — désactivé': {'main': [[edge('Configuration bilan')]]},
        'Configuration bilan': {'main': [[edge('Lire les agrégats et exporter pour Hermes')]]},
        'Lire les agrégats et exporter pour Hermes': {'main': [[edge('Livraison Telegram autorisée ?')]]},
        'Livraison Telegram autorisée ?': {'main': [[edge('Telegram — bilan privé')], [edge('Aperçu seulement — aucune livraison')]]},
    }
    return workflow('Agence 02 — bilan quotidien — APERÇU', nodes, connections)


if __name__ == '__main__':
    target = ROOT / 'n8n'
    target.mkdir(exist_ok=True)
    for name, content in [('01-preparation.json', preparation()), ('02-bilan-quotidien.json', daily_report())]:
        (target / name).write_text(json.dumps(content, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Deux exports n8n générés, inactifs et sans secret. Aucun import ou appel exécuté.')
