import json
import openai
import anthropic
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from nexus_backend.firebase_utils import get_firestore
from django.utils import timezone
import uuid
import requests


# ─── Model Config ─────────────────────────────────────────────────────────────
AVAILABLE_MODELS = {
    'gpt-4o': {
        'name': 'GPT-4o',
        'provider': 'openai',
        'description': "OpenAI's most capable multimodal model",
        'icon': '🟢',
        'contextWindow': 128000,
        'streaming': True,
    },
    'gpt-4o-mini': {
        'name': 'GPT-4o Mini',
        'provider': 'openai',
        'description': 'Fast and affordable GPT-4 variant',
        'icon': '🟩',
        'contextWindow': 128000,
        'streaming': True,
    },
    'claude-3-5-sonnet-20241022': {
        'name': 'Claude 3.5 Sonnet',
        'provider': 'anthropic',
        'description': "Anthropic's most intelligent model",
        'icon': '🟠',
        'contextWindow': 200000,
        'streaming': True,
    },
    'gemini-2.0-flash': {
        'name': 'Gemini 2.0 Flash',
        'provider': 'google',
        'description': "Google's fastest multimodal model",
        'icon': '🔵',
        'contextWindow': 1000000,
        'streaming': True,
    },
    'gemini-1.5-pro': {
        'name': 'Gemini 1.5 Pro',
        'provider': 'google',
        'description': "Google's most capable model with 1M context",
        'icon': '🔷',
        'contextWindow': 2000000,
        'streaming': True,
    },
}


class AvailableModelsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(AVAILABLE_MODELS)


# ─── Stream helpers ────────────────────────────────────────────────────────────

def stream_openai(messages, model, system_prompt=None):
    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    all_messages = []
    if system_prompt:
        all_messages.append({'role': 'system', 'content': system_prompt})
    all_messages.extend(messages)

    stream = client.chat.completions.create(
        model=model,
        messages=all_messages,
        stream=True,
        max_tokens=4096,
        temperature=0.7,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield f"data: {json.dumps({'chunk': delta.content})}\n\n"
    yield "data: [DONE]\n\n"


def stream_anthropic(messages, model, system_prompt=None):
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    with client.messages.stream(
        model=model,
        max_tokens=4096,
        system=system_prompt or "You are NEXUS AI, an advanced AI assistant.",
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'chunk': text})}\n\n"
    yield "data: [DONE]\n\n"


def stream_google(messages, model, system_prompt=None):
    """Gemini streaming via direct REST API — no deprecated SDK needed."""
    api_key = settings.GOOGLE_AI_API_KEY
    if not api_key:
        yield f"data: {json.dumps({'error': 'GOOGLE_AI_API_KEY not set in backend/.env'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    contents = []
    for msg in messages:
        role = 'user' if msg['role'] == 'user' else 'model'
        contents.append({'role': role, 'parts': [{'text': msg['content']}]})

    payload = {
        'contents': contents,
        'systemInstruction': {
            'parts': [{'text': system_prompt or 'You are NEXUS AI, an advanced AI assistant.'}]
        },
        'generationConfig': {'maxOutputTokens': 4096, 'temperature': 0.7},
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:streamGenerateContent?key={api_key}&alt=sse"
    )
    try:
        with requests.post(url, json=payload, stream=True, timeout=60) as resp:
            for line in resp.iter_lines(decode_unicode=True):
                if not line or not line.startswith('data: '):
                    continue
                data_str = line[6:]
                if data_str.strip() == '[DONE]':
                    break
                try:
                    data = json.loads(data_str)
                    text = (
                        data.get('candidates', [{}])[0]
                        .get('content', {})
                        .get('parts', [{}])[0]
                        .get('text', '')
                    )
                    if text:
                        yield f"data: {json.dumps({'chunk': text})}\n\n"
                except json.JSONDecodeError:
                    pass
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    yield "data: [DONE]\n\n"


# ─── Views ─────────────────────────────────────────────────────────────────────

class ChatStreamView(APIView):
    permission_classes = [AllowAny]  # Remove for production auth

    def post(self, request):
        data = request.data
        messages = data.get('messages', [])
        model_id = data.get('model', 'gemini-2.0-flash')
        session_id = data.get('sessionId', str(uuid.uuid4()))
        system_prompt = data.get(
            'systemPrompt',
            'You are NEXUS AI, an incredibly helpful and intelligent AI assistant. '
            'You are knowledgeable, creative, and always give accurate, thoughtful responses.'
        )

        if not messages:
            return Response({'error': 'No messages provided'}, status=400)

        model_config = AVAILABLE_MODELS.get(model_id, {})
        provider = model_config.get('provider', 'google')

        def generate():
            try:
                if provider == 'openai':
                    yield from stream_openai(messages, model_id, system_prompt)
                elif provider == 'anthropic':
                    yield from stream_anthropic(messages, model_id, system_prompt)
                elif provider == 'google':
                    yield from stream_google(messages, model_id, system_prompt)
                else:
                    yield f"data: {json.dumps({'error': f'Unknown provider: {provider}'})}\n\n"
                    yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        response = StreamingHttpResponse(generate(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


class ChatHistoryView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        """Save a message to Firestore."""
        try:
            uid = request.user.username if request.user.is_authenticated else 'anonymous'
            db = get_firestore()
            data = request.data
            session_id = data.get('sessionId')
            message = data.get('message')

            if not session_id or not message:
                return Response({'error': 'sessionId and message required'}, status=400)

            msg_ref = (
                db.collection('users').document(uid)
                .collection('sessions').document(session_id)
                .collection('messages')
            )
            message['timestamp'] = timezone.now().isoformat()
            message['id'] = str(uuid.uuid4())
            msg_ref.add(message)
            return Response({'status': 'saved', 'id': message['id']})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class ChatSessionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        uid = request.user.username if request.user.is_authenticated else 'anonymous'
        db = get_firestore()
        sessions = (
            db.collection('users').document(uid)
            .collection('sessions')
            .order_by('updatedAt', direction='DESCENDING')
            .limit(50)
            .stream()
        )
        return Response([{'id': s.id, **s.to_dict()} for s in sessions])

    def post(self, request):
        uid = request.user.username if request.user.is_authenticated else 'anonymous'
        db = get_firestore()
        session_id = str(uuid.uuid4())
        session_data = {
            'id': session_id,
            'title': request.data.get('title', 'New Chat'),
            'model': request.data.get('model', 'gemini-2.0-flash'),
            'createdAt': timezone.now().isoformat(),
            'updatedAt': timezone.now().isoformat(),
            'messageCount': 0,
        }
        db.collection('users').document(uid).collection('sessions').document(session_id).set(session_data)
        return Response(session_data)


class ChatSessionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        uid = request.user.username if request.user.is_authenticated else 'anonymous'
        db = get_firestore()
        msgs = (
            db.collection('users').document(uid)
            .collection('sessions').document(session_id)
            .collection('messages')
            .order_by('timestamp')
            .stream()
        )
        return Response([m.to_dict() for m in msgs])

    def delete(self, request, session_id):
        uid = request.user.username if request.user.is_authenticated else 'anonymous'
        db = get_firestore()
        db.collection('users').document(uid).collection('sessions').document(session_id).delete()
        return Response({'status': 'deleted'})


class WebSearchView(APIView):
    """🆕 UNIQUE: Real-time web search grounding."""
    permission_classes = [AllowAny]

    def post(self, request):
        query = request.data.get('query', '')
        if not query:
            return Response({'error': 'Query required'}, status=400)
        try:
            results = self._search(query)
            return Response({'results': results})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def _search(self, query):
        import urllib.parse
        url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(query)}&format=json&no_html=1"
        resp = requests.get(url, timeout=5)
        data = resp.json()
        results = []
        for r in data.get('RelatedTopics', [])[:5]:
            if 'Text' in r:
                results.append({
                    'title': r.get('Text', '')[:100],
                    'snippet': r.get('Text', ''),
                    'url': r.get('FirstURL', ''),
                })
        return results
