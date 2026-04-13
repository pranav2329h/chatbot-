from django.urls import path
from . import views

urlpatterns = [
    path('tts/', views.TextToSpeechView.as_view(), name='tts'),
    path('music/', views.MusicGenerateView.as_view(), name='music-generate'),
    path('voice-clone/', views.VoiceCloneView.as_view(), name='voice-clone'),
    path('gallery/', views.AudioGalleryView.as_view(), name='audio-gallery'),
    path('voices/', views.AvailableVoicesView.as_view(), name='available-voices'),
]
