import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import database_sync_to_async
from django.db.models import Q
import logging

# Set up logging
logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json['message']
            sender_username = text_data_json['sender_username']
            receiver_id = text_data_json['receiver_id']
            sender_id = text_data_json.get('sender_id')

            # Check the blocking relationship
            sender_blocked_receiver, receiver_blocked_sender = await database_sync_to_async(self.check_block_status)(sender_id, receiver_id)

            # If sender has blocked receiver, prevent sending
            if sender_blocked_receiver:
                # Send an error message only to the sender
                await self.send(text_data=json.dumps({
                    'message': message,
                    'sender_username': sender_username,
                    'error': 'You have blocked this user. Unblock them to send messages.'
                }))
                return

            # If receiver has blocked sender, silently accept the message but don't deliver to receiver
            if receiver_blocked_sender:
                # Only echo back to sender (making them think message was sent normally)
                await self.send(text_data=json.dumps({
                    'message': message,
                    'sender_username': sender_username,
                    'timestamp': text_data_json.get('timestamp', '')
                }))

                # Save the message but mark as blocked so it's filtered out for the receiver
                await database_sync_to_async(self.save_blocked_message)(
                    sender_id, receiver_id, message
                )
                return

            # No blocking, send message normally to the chat room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender_username': sender_username
                }
            )
        except Exception as e:
            logger.error(f"Error in chat consumer receive: {str(e)}")
            # Send error message back to sender
            await self.send(text_data=json.dumps({
                'error': 'An error occurred while processing your message. Please try again.'
            }))

    async def chat_message(self, event):
        message = event['message']
        sender_username = event['sender_username']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'sender_username': sender_username
        }))

    def check_block_status(self, sender_id, receiver_id):
        """
        Check the blocking relationship between sender and receiver
        Returns: (sender_blocked_receiver, receiver_blocked_sender)
        """
        try:
            from authentication.models import UserBlock

            if not sender_id or not receiver_id:
                return False, False

            logger.debug(f"Checking block status between users {sender_id} and {receiver_id}")

            # Check if sender has blocked receiver
            sender_blocked_receiver = UserBlock.objects.filter(
                blocker_id=sender_id, blocked_id=receiver_id
            ).exists()

            # Check if receiver has blocked sender
            receiver_blocked_sender = UserBlock.objects.filter(
                blocker_id=receiver_id, blocked_id=sender_id
            ).exists()

            if sender_blocked_receiver:
                logger.info(f"Sender {sender_id} has blocked receiver {receiver_id}")

            if receiver_blocked_sender:
                logger.info(f"Receiver {receiver_id} has blocked sender {sender_id}")

            return sender_blocked_receiver, receiver_blocked_sender
        except Exception as e:
            logger.error(f"Error checking block status: {str(e)}")
            return False, False

    def save_blocked_message(self, sender_id, receiver_id, message_text):
        """Save a message that's blocked but don't deliver it to the receiver"""
        from chat.models import Message
        from django.contrib.auth.models import User
        from cryptography.fernet import Fernet
        from django.conf import settings

        try:
            sender = User.objects.get(id=sender_id)
            receiver = User.objects.get(id=receiver_id)

            # Get the cipher
            cipher = Fernet(settings.ENCRYPTION_KEY)

            # Encrypt the message text
            encrypted_text = cipher.encrypt(message_text.encode())

            # Create message with blocked=True
            Message.objects.create(
                sender=sender,
                receiver=receiver,
                encrypted_text=encrypted_text,
                blocked=True
            )
            logger.info(f"Saved blocked message from {sender_id} to {receiver_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving blocked message: {str(e)}")
            return False
