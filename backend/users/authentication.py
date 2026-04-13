from rest_framework import authentication, exceptions
from nexus_backend.firebase_utils import verify_firebase_token
from django.contrib.auth.models import User


class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Firebase JWT token authentication for DRF.
    Frontend sends: Authorization: Bearer <firebase_id_token>
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        decoded_token = verify_firebase_token(token)

        if not decoded_token:
            raise exceptions.AuthenticationFailed('Invalid or expired Firebase token.')

        uid = decoded_token.get('uid')
        email = decoded_token.get('email', '')

        # Get or create Django user mapped to Firebase UID
        user, created = User.objects.get_or_create(
            username=uid,
            defaults={'email': email}
        )

        # Attach firebase claims to user object
        user.firebase_uid = uid
        user.firebase_email = email
        user.firebase_token = decoded_token

        return (user, token)

    def authenticate_header(self, request):
        return 'Bearer realm="nexus-ai"'
