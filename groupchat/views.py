from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from .models import Group, GroupMessage
from .serializers import GroupSerializer, GroupMessageSerializer, GroupMemberSerializer
from django.shortcuts import get_object_or_404

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_groups(request):
    """Get all groups the current user is a member of"""
    groups = Group.objects.filter(members=request.user)
    serializer = GroupSerializer(groups, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_group(request):
    """Create a new group"""
    data = request.data.copy()
    data['creator'] = request.user.id

    serializer = GroupSerializer(data=data)
    if serializer.is_valid():
        group = serializer.save()
        # Add creator as a member
        group.members.add(request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_details(request, group_id):
    """Get details of a specific group"""
    try:
        group = Group.objects.get(id=group_id, members=request.user)
    except Group.DoesNotExist:
        return Response({"detail": "Group not found or you're not a member"}, status=status.HTTP_404_NOT_FOUND)

    serializer = GroupSerializer(group)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_members(request, group_id):
    """Get all members of a group"""
    try:
        group = Group.objects.get(id=group_id, members=request.user)
    except Group.DoesNotExist:
        return Response({"detail": "Group not found or you're not a member"}, status=status.HTTP_404_NOT_FOUND)

    serializer = GroupMemberSerializer(group)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_group_member(request, group_id):
    """Add a member to the group"""
    try:
        group = Group.objects.get(id=group_id)
        # Only creator can add members
        if group.creator != request.user:
            return Response({"detail": "Only the creator can add members"}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"detail": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
            group.members.add(user)
            return Response({"detail": f"{user.username} added to the group"})
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    except Group.DoesNotExist:
        return Response({"detail": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_group_member(request, group_id, user_id):
    """Remove a member from the group"""
    group = get_object_or_404(Group, id=group_id)

    # Only creator can remove members, or users can remove themselves
    if group.creator != request.user and int(user_id) != request.user.id:
        return Response({"detail": "You don't have permission to remove this member"}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(id=user_id)
        if user == group.creator:
            return Response({"detail": "Cannot remove the group creator"}, status=status.HTTP_400_BAD_REQUEST)

        group.members.remove(user)
        return Response({"detail": f"{user.username} removed from the group"})
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_group(request, group_id):
    """Delete a group (creator only)"""
    group = get_object_or_404(Group, id=group_id)

    if group.creator != request.user:
        return Response({"detail": "Only the creator can delete the group"}, status=status.HTTP_403_FORBIDDEN)

    group.delete()
    return Response({"detail": "Group deleted successfully"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_group_message(request):
    """Send a message to a group"""
    data = request.data
    group_id = data.get('group')
    text = data.get('text')

    if not group_id or not text:
        return Response({"detail": "Group ID and message text are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        group = Group.objects.get(id=group_id, members=request.user)
    except Group.DoesNotExist:
        return Response({"detail": "Group not found or you're not a member"}, status=status.HTTP_404_NOT_FOUND)

    message = GroupMessage.objects.create(
        group=group,
        sender=request.user,
        encrypted_text=text
    )

    serializer = GroupMessageSerializer(message, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_messages(request, group_id):
    """Get all messages in a group"""
    try:
        group = Group.objects.get(id=group_id, members=request.user)
    except Group.DoesNotExist:
        return Response({"detail": "Group not found or you're not a member"}, status=status.HTTP_404_NOT_FOUND)

    messages = GroupMessage.objects.filter(group=group).order_by('timestamp')
    serializer = GroupMessageSerializer(messages, many=True, context={"request": request})
    return Response(serializer.data)
