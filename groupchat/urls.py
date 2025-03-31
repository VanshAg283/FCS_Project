from django.urls import path
from . import views

urlpatterns = [
    path('groups/', views.get_user_groups, name='get_user_groups'),
    path('groups/create/', views.create_group, name='create_group'),
    path('groups/<int:group_id>/', views.get_group_details, name='get_group_details'),
    path('groups/<int:group_id>/members/', views.get_group_members, name='get_group_members'),
    path('groups/<int:group_id>/members/add/', views.add_group_member, name='add_group_member'),
    path('groups/<int:group_id>/members/<int:user_id>/remove/', views.remove_group_member, name='remove_group_member'),
    path('groups/<int:group_id>/delete/', views.delete_group, name='delete_group'),
    path('messages/send/', views.send_group_message, name='send_group_message'),
    path('groups/<int:group_id>/messages/', views.get_group_messages, name='get_group_messages'),
]
