from django.urls import path
from .views import (
    register_user, login_user, user_profile, update_profile,
    remove_profile_picture, get_users, verify_user, admin_dashboard,
    reject_user, search_users, send_friend_request, respond_friend_request,
    get_friends, get_friend_requests, submit_verification_document,
    get_verification_status, admin_document_review, get_pending_verifications,
    serve_document, reset_user_verification, get_document_info, document_view_with_token
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
    path("verification/submit/", submit_verification_document, name="submit_verification_document"),
    path("verification/status/", get_verification_status, name="get_verification_status"),
    path("admin/verifications/", get_pending_verifications, name="get_pending_verifications"),
    path("admin/document/<int:doc_id>/review/", admin_document_review, name="admin_document_review"),
    path("document/<int:document_id>/", serve_document, name="serve_document"),
    path("document/<int:document_id>/info/", get_document_info, name="get_document_info"),
    path("document/<int:document_id>/view/", document_view_with_token, name="document_view_with_token"),
    path("admin/reset-verification/<int:user_id>/", reset_user_verification, name="reset_user_verification"),
]
