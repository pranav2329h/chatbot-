import requests
import uuid
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from nexus_backend.firebase_utils import get_firestore


class VideoGenerateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        prompt = request.data.get('prompt', '')
        model = request.data.get('model', 'luma')  # luma | runway
        duration = request.data.get('duration', 5)  # seconds
        image_url = request.data.get('imageUrl', None)  # for img-to-video

        if not prompt:
            return Response({'error': 'Prompt required'}, status=400)

        try:
            job_id = str(uuid.uuid4())
            if model == 'luma':
                result = self._generate_luma(prompt, image_url)
            elif model == 'runway':
                result = self._generate_runway(prompt, image_url)
            else:
                return Response({'error': 'Unknown video model'}, status=400)

            # Save job to Firestore
            uid = request.user.username if request.user.is_authenticated else 'anonymous'
            db = get_firestore()
            job_data = {
                'id': job_id,
                'externalId': result.get('id', ''),
                'prompt': prompt,
                'model': model,
                'status': 'pending',
                'createdAt': timezone.now().isoformat(),
            }
            db.collection('users').document(uid).collection('video_jobs').document(job_id).set(job_data)
            return Response(job_data)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def _generate_luma(self, prompt, image_url=None):
        url = "https://api.lumalabs.ai/dream-machine/v1/generations"
        headers = {
            "Authorization": f"Bearer {settings.LUMA_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {"prompt": prompt, "loop": False, "aspect_ratio": "16:9"}
        if image_url:
            payload["keyframes"] = {"frame0": {"type": "image", "url": image_url}}
        resp = requests.post(url, json=payload, headers=headers)
        return resp.json()

    def _generate_runway(self, prompt, image_url=None):
        url = "https://api.dev.runwayml.com/v1/image_to_video"
        headers = {
            "Authorization": f"Bearer {settings.RUNWAY_API_KEY}",
            "Content-Type": "application/json",
            "X-Runway-Version": "2024-11-06"
        }
        payload = {
            "model": "gen3a_turbo",
            "promptText": prompt,
            "duration": 5,
            "ratio": "1280:768"
        }
        if image_url:
            payload["promptImage"] = image_url
        resp = requests.post(url, json=payload, headers=headers)
        return resp.json()


class VideoStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, job_id):
        uid = request.user.username if request.user.is_authenticated else 'anonymous'
        db = get_firestore()
        job_doc = db.collection('users').document(uid) \
                    .collection('video_jobs').document(job_id).get()
        
        if not job_doc.exists:
            return Response({'error': 'Job not found'}, status=404)
        
        job = job_doc.to_dict()
        external_id = job.get('externalId', '')
        model = job.get('model', 'luma')

        try:
            if model == 'luma' and external_id:
                status = self._check_luma_status(external_id)
                if status.get('state') == 'completed':
                    video_url = status.get('assets', {}).get('video', '')
                    db.collection('users').document(uid).collection('video_jobs') \
                      .document(job_id).update({'status': 'completed', 'videoUrl': video_url})
                    return Response({**job, 'status': 'completed', 'videoUrl': video_url})
            elif model == 'runway' and external_id:
                status = self._check_runway_status(external_id)
                if status.get('status') == 'SUCCEEDED':
                    video_url = status.get('output', [None])[0]
                    db.collection('users').document(uid).collection('video_jobs') \
                      .document(job_id).update({'status': 'completed', 'videoUrl': video_url})
                    return Response({**job, 'status': 'completed', 'videoUrl': video_url})
        except Exception as e:
            pass

        return Response(job)

    def _check_luma_status(self, gen_id):
        resp = requests.get(
            f"https://api.lumalabs.ai/dream-machine/v1/generations/{gen_id}",
            headers={"Authorization": f"Bearer {settings.LUMA_API_KEY}"}
        )
        return resp.json()

    def _check_runway_status(self, task_id):
        resp = requests.get(
            f"https://api.dev.runwayml.com/v1/tasks/{task_id}",
            headers={
                "Authorization": f"Bearer {settings.RUNWAY_API_KEY}",
                "X-Runway-Version": "2024-11-06"
            }
        )
        return resp.json()


class VideoGalleryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        uid = request.user.username if request.user.is_authenticated else 'anonymous'
        db = get_firestore()
        docs = db.collection('users').document(uid).collection('video_jobs') \
                 .order_by('createdAt', direction='DESCENDING').limit(30).stream()
        return Response([{'id': d.id, **d.to_dict()} for d in docs])
