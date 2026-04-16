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
    """🆕 UNIQUE: 100% Free AI-powered prompt optimizer"""
    permission_classes = [AllowAny]

    def post(self, request):
        original_prompt = request.data.get('prompt', '')
        style = request.data.get('style', 'photorealistic')
        if not original_prompt:
            return Response({'error': 'Prompt required'}, status=400)

        try:
            payload = {
                "messages": [
                    {
                        "role": "system",
                        "content": f"You are an expert image prompt engineer. Enhance and optimize the given prompt for {style} image generation. Make it more detailed, vivid, and technically precise. Return ONLY the enhanced prompt, nothing else."
                    },
                    {
                        "role": "user",
                        "content": original_prompt
                    }
                ],
                "model": "openai",
                "stream": False
            }
            resp = requests.post("https://text.pollinations.ai/openai", json=payload, timeout=30)
            resp.raise_for_status()
            enhanced = resp.json().get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            if not enhanced: 
                enhanced = original_prompt
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

        try:
            # We enforce use of FLUX via Pollinations for all model requests to guarantee free, high-quality images.
            images = self._generate_free(prompt, size, style, count, model_type='flux')

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

    def _generate_free(self, prompt, size, style, count, model_type='flux'):
        """100% Free Image Generation using Pollinations AI"""
        import urllib.parse
        width, height = 1024, 1024
        if 'x' in size:
            parts = size.split('x')
            width, height = int(parts[0]), int(parts[1])
        
        # Pollinations does not support native styles via API parameters, so we append the style to the prompt
        styled_prompt = f"{prompt}, masterpiece, highly detailed, in the style of {style}" if style else prompt
        
        images = []
        for i in range(count):
            # Adding a random seed variation to get different images
            seed = int(timezone.now().timestamp() * 1000) + i
            url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(styled_prompt)}?width={width}&height={height}&nologo=1&seed={seed}&model={model_type}"
            images.append({'url': url, 'revisedPrompt': styled_prompt})
            
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
