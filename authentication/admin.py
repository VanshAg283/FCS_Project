from django.contrib import admin
from .models import Profile, VerificationDocument, Friendship
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

# The issue is that VerificationDocument doesn't have a direct ForeignKey to Profile
# We need to use a TabularInline that works with User, not Profile
class VerificationDocumentInline(admin.TabularInline):
    model = VerificationDocument
    extra = 0
    fk_name = 'user'
    verbose_name = "Verification Document"
    verbose_name_plural = "Verification Documents"

class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'verification_status', 'is_verified', 'verification_date']
    list_filter = ['verification_status', 'is_verified']
    search_fields = ['user__username', 'user__email']

class UserVerificationDocumentsInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'

# Register VerificationDocument with its own admin interface
class VerificationDocumentAdmin(admin.ModelAdmin):
    list_display = ['user', 'document_type', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = ['user__username']

# Register models
admin.site.register(Profile, ProfileAdmin)
admin.site.register(VerificationDocument, VerificationDocumentAdmin)
admin.site.register(Friendship)

# Optionally extend the User admin to show verification documents
# class CustomUserAdmin(UserAdmin):
#     # Fix: convert the list to a tuple before concatenation since UserAdmin.inlines is a tuple
#     inlines = UserAdmin.inlines + (UserVerificationDocumentsInline,)

#     def verification_status(self, obj):
#         try:
#             return obj.profile.verification_status
#         except Profile.DoesNotExist:
#             return "No Profile"

#     verification_status.short_description = "Verification Status"

#     # Convert to list first, then back to tuple to ensure compatibility
#     list_display = list(UserAdmin.list_display)
#     list_display.append('verification_status')
#     list_display = tuple(list_display)

# # Unregister the default User admin and register our custom one
# admin.site.unregister(User)
# admin.site.register(User, CustomUserAdmin)
