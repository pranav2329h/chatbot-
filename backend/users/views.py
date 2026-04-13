from rest_framework.views import APIView
from rest_framework.response import Response
from nexus_backend.firebase_utils import get_firestore
from django.utils import timezone


class UserProfileView(APIView):
    def get(self, request):
        uid = request.user.username
        db = get_firestore()
        doc = db.collection('users').document(uid).get()
        if doc.exists:
            return Response(doc.to_dict())
        return Response({'uid': uid, 'email': getattr(request.user, 'email', '')})

    def put(self, request):
        uid = request.user.username
        db = get_firestore()
        data = request.data
        data['updatedAt'] = timezone.now().isoformat()
        db.collection('users').document(uid).set(data, merge=True)
        return Response({'status': 'updated'})


class UsageStatsView(APIView):
    def get(self, request):
        uid = request.user.username
        db = get_firestore()
        stats_ref = db.collection('users').document(uid).collection('usage')
        docs = stats_ref.order_by('date', direction='DESCENDING').limit(30).stream()
        stats = [d.to_dict() for d in docs]
        return Response(stats)
