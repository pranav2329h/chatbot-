from django.urls import path
from . import views

urlpatterns = [
    path('generate/', views.ImageGenerateView.as_view(), name='image-generate'),
    path('gallery/', views.ImageGalleryView.as_view(), name='image-gallery'),
    path('models/', views.ImageModelsView.as_view(), name='image-models'),
    path('optimize-prompt/', views.OptimizePromptView.as_view(), name='optimize-prompt'),
]
