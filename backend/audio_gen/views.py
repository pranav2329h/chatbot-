import requests
import base64
import uuid
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import HttpResponse
from nexus_backend.firebase_utils import get_firestore
import openai

ELEVENLABS_VOICES = {
    'nova': {'id': 'EXAVITQu4vr4xnSDxMaL', 'name': 'Nova', 'description': 'Young, energetic female'},
    'aria': {'id': '9BWtsMINqrJLrRacOk9x', 'name': 'Aria', 'description': 'Warm, professional female'},
    'roger': {'id': 'CwhRBWXzGAHq8TQ4Fs17', 'name': 'Roger', 'description': 'Confident, articulate male'},
    'sarah': {'id': 'EXAVITQu4vr4xnSDxMaL', 'name': 'Sarah', 'description': 'Soft, gentle female'},
    'bill': {'id': 'pqHfZKP75CvOlQylNhV4', 'name': 'Bill', 'description': 'Trustworthy, deep male'},
}

OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']


class AvailableVoicesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'elevenlabs': ELEVENLABS_VOICES,
            'openai': OPENAI_VOICES,
        })


class TextToSpeechView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        text = request.data.get('text', '')
        provider = request.data.get('provider', 'openai')  # openai | elevenlabs
        voice = request.data.get('voice', 'nova')
        emotion = request.data.get('emotion', 'neutral')  # 🆕 Emotion-aware TTS

        if not text:
            return Response({'error': 'Text required'}, status=400)
        
        # Inject emotion into text if needed (unique feature)
        if emotion != 'neutral' and provider == 'elevenlabs':
            emotion_map = {
                'happy': 'Say this happily and with enthusiasm: ',
                'sad': 'Say this slowly and with sadness: ',
                'excited': 'Say this with great excitement and energy: ',
                'calm': 'Say this calmly and gently: ',
                'angry': 'Say this with frustration and urgency: ',
            }
            text = emotion_map.get(emotion, '') + text

        try:
            if provider == 'openai':
                return self._tts_openai(text, voice)
            elif provider == 'elevenlabs':
                return self._tts_elevenlabs(text, voice)
            else:
                return Response({'error': 'Unknown TTS provider'}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def _tts_openai(self, text, voice):
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        if voice not in OPENAI_VOICES:
            voice = 'nova'
        response = client.audio.speech.create(
            model='tts-1-hd',
            voice=voice,
            input=text,
            response_format='mp3',
        )
        audio_content = response.read()
        return HttpResponse(audio_content, content_type='audio/mpeg')

    def _tts_elevenlabs(self, text, voice_key):
        voice_data = ELEVENLABS_VOICES.get(voice_key, ELEVENLABS_VOICES['nova'])
        voice_id = voice_data['id']
        
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "model_id": "eleven_turbo_v2_5",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.2,
                "use_speaker_boost": True
            }
        }
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            return HttpResponse(response.content, content_type='audio/mpeg')
        raise Exception(f"ElevenLabs error: {response.text}")


class MusicGenerateView(APIView):
    """🆕 AI Music Generation using Suno/Udio-style API"""
    permission_classes = [AllowAny]

    def post(self, request):
        description = request.data.get('description', '')
        genre = request.data.get('genre', 'electronic')
        duration = request.data.get('duration', 30)

        if not description:
            return Response({'error': 'Description required'}, status=400)

        # Note: Suno/Udio require specific API access
        # Using a placeholder response for now
        return Response({
            'message': 'Music generation queued',
            'description': description,
            'genre': genre,
            'note': 'Configure SUNO_API_KEY or UDIO_API_KEY in .env for full functionality'
        })


class VoiceCloneView(APIView):
    """Voice cloning using ElevenLabs"""
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get('name', 'My Voice')
        audio_file = request.FILES.get('audio')

        if not audio_file:
            return Response({'error': 'Audio file required'}, status=400)

        try:
            url = "https://api.elevenlabs.io/v1/voices/add"
            headers = {"xi-api-key": settings.ELEVENLABS_API_KEY}
            files = {"files": (audio_file.name, audio_file.read(), 'audio/mpeg')}
            data = {"name": name, "description": f"Custom cloned voice: {name}"}
            response = requests.post(url, data=data, files=files, headers=headers)
            if response.status_code == 200:
                return Response(response.json())
            return Response({'error': response.text}, status=response.status_code)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AudioGalleryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        uid = request.user.username if request.user.is_authenticated else 'anonymous'
        db = get_firestore()
        docs = db.collection('users').document(uid).collection('audio_history') \
                 .order_by('createdAt', direction='DESCENDING').limit(30).stream()
        return Response([{'id': d.id, **d.to_dict()} for d in docs])
