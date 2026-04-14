import requests
import base64
import uuid
import os
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from nexus_backend.firebase_utils import get_firestore
import openai

IMAGE_MODELS = {
    'dall-e-3': {
        'name': 'DALL-E 3',
        'provider': 'openai',
        'description': 'OpenAI\'s most advanced image generator',
        'icon': '🟢',
        'maxResolution': '1792x1024',
        'styles': ['vivid', 'natural'],
    },
    'stable-diffusion-xl': {
        'name': 'Stable Diffusion XL',
        'provider': 'stability',
        'description': 'High-quality open-source image generation',
        'icon': '🟣',
        'maxResolution': '1024x1024',
        'styles': ['photorealistic', 'artistic', 'anime'],
    },
    'flux-1-schnell': {
        'name': 'FLUX.1 Schnell',
        'provider': 'bfl',
        'description': 'Black Forest Labs — Ultra-fast FLUX model',
        'icon': '⚡',
        'maxResolution': '1440x1440',
        'styles': ['photorealistic'],
    },
}


class ImageModelsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(IMAGE_MODELS)


class OptimizePromptView(APIView):
    """🆕 UNIQUE: AI-powered prompt optimizer"""
    permission_classes = [AllowAny]

    def post(self, request):
        original_prompt = request.data.get('prompt', '')
        style = request.data.get('style', 'photorealistic')
        if not original_prompt:
            return Response({'error': 'Prompt required'}, status=400)

        try:
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[{
                    'role': 'system',
                    'content': f'You are an expert image prompt engineer. Enhance and optimize the given prompt for {style} image generation. Make it more detailed, vivid, and technically precise. Return ONLY the enhanced prompt, nothing else.'
                }, {
                    'role': 'user',
                    'content': original_prompt
                }],
                max_tokens=300,
            )
            enhanced = response.choices[0].message.content.strip()
            return Response({'original': original_prompt, 'enhanced': enhanced})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class ImageGenerateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        prompt = request.data.get('prompt', '')
        model_id = request.data.get('model', 'dall-e-3')
        size = request.data.get('size', '1024x1024')
        style = request.data.get('style', 'vivid')
        count = min(int(request.data.get('count', 1)), 4)  # max 4 images

        if not prompt:
            return Response({'error': 'Prompt required'}, status=400)

        model_config = IMAGE_MODELS.get(model_id, {})
        provider = model_config.get('provider', 'openai')

        try:
            if provider == 'openai':
                images = self._generate_dalle(prompt, size, style, count)
            elif provider == 'stability':
                images = self._generate_stability(prompt, size, count)
            elif provider == 'bfl':
                images = self._generate_flux(prompt, size, count)
            else:
                return Response({'error': 'Unknown provider'}, status=400)

            # Save to Firestore history
            self._save_to_history(request, prompt, model_id, images)
            
            return Response({
                'images': images,
                'model': model_id,
                'prompt': prompt,
                'generatedAt': timezone.now().isoformat(),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def _generate_dalle(self, prompt, size, style, count):
        return self._generate_free(prompt, size, count)

    def _generate_stability(self, prompt, size, count):
        return self._generate_free(prompt, size, count)

    def _generate_flux(self, prompt, size, count):
        return self._generate_free(prompt, size, count)

    def _generate_free(self, prompt, size, count):
        """100% Free Image Generation using Pollinations AI"""
        width, height = 1024, 1024
        if 'x' in size:
            parts = size.split('x')
            width, height = int(parts[0]), int(parts[1])
        
        images = []
        for i in range(count):
            import urllib.parse
            # Adding a random seed variation to get different images
            seed = int(timezone.now().timestamp() * 1000) + i
            url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width={width}&height={height}&nologo=1&seed={seed}"
            images.append({'url': url, 'revisedPrompt': prompt})
            
        return images

    def _save_to_history(self, request, prompt, model_id, images):
        try:
            uid = request.user.username if request.user.is_authenticated else 'anonymous'
            db = get_firestore()
            db.collection('users').document(uid).collection('image_history').add({
                'prompt': prompt,
                'model': model_id,
                'images': [img.get('url', '') for img in images if not img.get('url', '').startswith('data:')],
                'createdAt': timezone.now().isoformat(),
            })
        except Exception:
            pass


class ImageGalleryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        uid = request.user.username if request.user.is_authenticated else 'anonymous'
        db = get_firestore()
        docs = db.collection('users').document(uid) \
                 .collection('image_history') \
                 .order_by('createdAt', direction='DESCENDING') \
                 .limit(50) \
                 .stream()
        return Response([{'id': d.id, **d.to_dict()} for d in docs])
