from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('usage/', views.UsageStatsView.as_view(), name='usage-stats'),
]
