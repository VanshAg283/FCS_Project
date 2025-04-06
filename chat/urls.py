from django.urls import path
from .views import send_message, send_message_with_media, get_messages, delete_message
from .media_views import serve_media

urlpatterns = [
    path("send/", send_message, name="send_message"),
    path("send-with-media/", send_message_with_media, name="send_message_with_media"),
    path("<int:receiver_id>/", get_messages, name="get_messages"),
    path("media/<int:attachment_id>/", serve_media, name="serve_media"),
    path("delete/<int:message_id>/", delete_message, name="delete_message"),
]
