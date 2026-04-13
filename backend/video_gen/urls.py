from django.urls import path
from . import views

urlpatterns = [
    path('generate/', views.VideoGenerateView.as_view(), name='video-generate'),
    path('status/<str:job_id>/', views.VideoStatusView.as_view(), name='video-status'),
    path('gallery/', views.VideoGalleryView.as_view(), name='video-gallery'),
]
