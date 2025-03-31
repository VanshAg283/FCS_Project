from django.urls import path
from .views import (
    register_user, login_user, user_profile, update_profile,
    remove_profile_picture, get_users, verify_user, admin_dashboard,
    reject_user, search_users, send_friend_request, respond_friend_request,
    get_friends, get_friend_requests
)

urlpatterns = [
    path("register/", register_user),
    path("login/", login_user),
    path("profile/", user_profile),
    path("profile/update/", update_profile, name="profile-update"),
    path("profile/remove_picture/", remove_profile_picture, name="remove-profile-picture"),
    path("users/", get_users, name="get_users"),
    path("admin/dashboard/", admin_dashboard, name="admin_dashboard"),
    path("admin/verify/<int:user_id>/", verify_user, name="verify_user"),
    path("admin/reject/<int:user_id>/", reject_user, name="reject_user"),
    path("search/", search_users, name="search_users"),
    path("friends/", get_friends, name="get_friends"),
    path("friend-request/send/", send_friend_request, name="send_friend_request"),
    path("friend-request/respond/", respond_friend_request, name="respond_friend_request"),
    path("friend-requests/", get_friend_requests, name="get_friend_requests"),
]
