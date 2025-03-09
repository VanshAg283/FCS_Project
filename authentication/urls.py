from django.urls import path
from .views import register_user, login_user, user_profile, update_profile, remove_profile_picture

urlpatterns = [
    path("register/", register_user),
    path("login/", login_user),
    path("profile/", user_profile),
    path("profile/update/", update_profile, name="profile-update"),
    path("profile/remove_picture/", remove_profile_picture, name="remove-profile-picture"),
]
