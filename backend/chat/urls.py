from django.urls import path
from . import views

urlpatterns = [
    path('stream/', views.ChatStreamView.as_view(), name='chat-stream'),
    path('history/', views.ChatHistoryView.as_view(), name='chat-history'),
    path('sessions/', views.ChatSessionsView.as_view(), name='chat-sessions'),
    path('sessions/<str:session_id>/', views.ChatSessionDetailView.as_view(), name='chat-session-detail'),
    path('models/', views.AvailableModelsView.as_view(), name='chat-models'),
    path('search/', views.WebSearchView.as_view(), name='web-search'),
]
