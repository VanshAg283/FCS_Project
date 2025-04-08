from rest_framework import serializers
from .models import Category, Listing, ListingImage, Wallet, Transaction, Purchase, PaymentOTP
from django.contrib.auth.models import User

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']
        read_only_fields = ['slug']  # Slug is auto-generated

class ListingImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ListingImage
        fields = ['id', 'image', 'image_url', 'is_primary']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if request and obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

class ListingSerializer(serializers.ModelSerializer):
    seller_username = serializers.ReadOnlyField(source='seller.username')
    category_name = serializers.ReadOnlyField(source='category.name')
    images = ListingImageSerializer(many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'seller', 'seller_username',
            'category', 'category_name', 'created_at', 'updated_at', 'status',
            'slug', 'views', 'images', 'primary_image'
        ]
        read_only_fields = ['seller', 'views', 'slug', 'created_at', 'updated_at']

    def get_primary_image(self, obj):
        request = self.context.get('request')
        primary_image = obj.images.filter(is_primary=True).first()

        if not primary_image:
            primary_image = obj.images.first()

        if request and primary_image and primary_image.image:
            return request.build_absolute_uri(primary_image.image.url)
        return None

    def create(self, validated_data):
        validated_data['seller'] = self.context['request'].user
        return super().create(validated_data)

class ListingCreateUpdateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True
    )
    primary_image_index = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = Listing
        fields = [
            'title', 'description', 'price', 'category', 'images', 'primary_image_index'
        ]

    def validate_category(self, value):
        """Handle string category IDs from form submissions"""
        if isinstance(value, str) and value.isdigit():
            try:
                return Category.objects.get(id=int(value))
            except Category.DoesNotExist:
                raise serializers.ValidationError(f"Category with ID {value} not found")
        return value

    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        primary_index = validated_data.pop('primary_image_index', 0)

        # Print for debugging
        print("Creating listing with validated data:", validated_data)

        # Create listing
        listing = Listing.objects.create(**validated_data)

        # Add images
        for i, image_data in enumerate(images_data):
            ListingImage.objects.create(
                listing=listing,
                image=image_data,
                is_primary=(i == primary_index)
            )

        return listing

    def update(self, instance, validated_data):
        images_data = validated_data.pop('images', [])
        primary_index = validated_data.pop('primary_image_index', None)

        # Update listing
        instance = super().update(instance, validated_data)

        # Add new images if provided
        if images_data:
            if primary_index is not None:
                # If updating primary image, remove primary flag from all existing
                instance.images.all().update(is_primary=False)

            for i, image_data in enumerate(images_data):
                ListingImage.objects.create(
                    listing=instance,
                    image=image_data,
                    is_primary=(i == primary_index if primary_index is not None else False)
                )

        return instance

class WalletSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Wallet
        fields = ['id', 'user', 'username', 'balance', 'created_at', 'updated_at']
        read_only_fields = ['user', 'username', 'balance', 'created_at', 'updated_at']

class TransactionSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='wallet.user.username')

    class Meta:
        model = Transaction
        fields = [
            'id', 'wallet', 'username', 'amount', 'transaction_type',
            'status', 'timestamp', 'reference_id', 'description', 'listing'
        ]
        read_only_fields = [
            'id', 'wallet', 'username', 'amount', 'transaction_type',
            'status', 'timestamp', 'reference_id', 'description', 'listing'
        ]

class PaymentOTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentOTP
        fields = ['id', 'user', 'transaction_reference', 'amount', 'created_at']
        read_only_fields = ['id', 'user', 'transaction_reference', 'amount', 'created_at']

class PurchaseSerializer(serializers.ModelSerializer):
    buyer_username = serializers.ReadOnlyField(source='buyer.username')
    seller_username = serializers.ReadOnlyField(source='seller.username')
    listing_title = serializers.ReadOnlyField(source='listing.title')

    class Meta:
        model = Purchase
        fields = [
            'id', 'listing', 'listing_title', 'buyer', 'buyer_username',
            'seller', 'seller_username', 'transaction', 'purchase_price', 'purchased_at'
        ]
        read_only_fields = fields
