from django.urls import path
from .views import register_user, login_user, user_profile, update_profile, remove_profile_picture, get_users, verify_user, admin_dashboard, reject_user

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
]
