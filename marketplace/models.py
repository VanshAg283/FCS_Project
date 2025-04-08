from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.utils import timezone
import uuid
import os
from django.core.validators import MinValueValidator

def product_image_path(instance, filename):
    """Generate a unique path for product images"""
    ext = filename.split('.')[-1]
    unique_id = uuid.uuid4().hex
    return f'marketplace/products/{instance.listing.id}/{unique_id}.{ext}'

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def save(self, *args, **kwargs):
        # Generate slug from name if not provided
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Listing(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('ACTIVE', 'Active'),
        ('SOLD', 'Sold'),
        ('WITHDRAWN', 'Withdrawn'),
        ('FLAGGED', 'Flagged'),
    )

    # Basic info
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='listings')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    views = models.PositiveIntegerField(default=0)
    slug = models.SlugField(max_length=250, unique=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Generate unique slug
        if not self.slug:
            base_slug = slugify(self.title)
            unique_id = uuid.uuid4().hex[:8]
            self.slug = f"{base_slug}-{unique_id}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class ListingImage(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=product_image_path)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-is_primary', 'created_at']

    def __str__(self):
        return f"Image for {self.listing.title}"

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet for {self.user.username}"

    def deposit(self, amount):
        """Add funds to the wallet"""
        if amount <= 0:
            raise ValueError("Amount must be positive")

        self.balance += amount
        self.save()

        Transaction.objects.create(
            wallet=self,
            amount=amount,
            transaction_type='DEPOSIT',
            status='COMPLETED'
        )

        return self.balance

    def withdraw(self, amount):
        """Withdraw funds from the wallet"""
        if amount <= 0:
            raise ValueError("Amount must be positive")

        if amount > self.balance:
            raise ValueError("Insufficient funds")

        self.balance -= amount
        self.save()

        Transaction.objects.create(
            wallet=self,
            amount=-amount,
            transaction_type='WITHDRAWAL',
            status='COMPLETED'
        )

        return self.balance

    def can_afford(self, amount):
        """Check if the wallet has enough funds"""
        return self.balance >= amount

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('DEPOSIT', 'Deposit'),
        ('WITHDRAWAL', 'Withdrawal'),
        ('PURCHASE', 'Purchase'),
        ('SALE', 'Sale'),
        ('REFUND', 'Refund')
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled')
    ]

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Negative for outgoing transactions
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    timestamp = models.DateTimeField(auto_now_add=True)
    reference_id = models.UUIDField(default=uuid.uuid4, unique=True)
    description = models.CharField(max_length=255, blank=True, null=True)

    # For purchase/sale transactions
    listing = models.ForeignKey(Listing, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.transaction_type} of {self.amount} ({self.status})"

class PaymentOTP(models.Model):
    """OTP model for verifying wallet transactions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    transaction_reference = models.UUIDField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"OTP for {self.user.username} - {self.transaction_reference}"

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    @classmethod
    def generate_otp(cls, user, transaction_reference, amount):
        """Generate a new OTP for a transaction"""
        import random

        # Generate 6-digit OTP
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])

        # Set expiry to 10 minutes from now
        expires_at = timezone.now() + timezone.timedelta(minutes=10)

        # Create and return the OTP object
        return cls.objects.create(
            user=user,
            otp=otp,
            transaction_reference=transaction_reference,
            amount=amount,
            expires_at=expires_at
        )

class Purchase(models.Model):
    """Records of completed purchases"""
    listing = models.ForeignKey(Listing, on_delete=models.SET_NULL, null=True)
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    purchased_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.buyer.username} purchased {self.listing.title if self.listing else 'Unknown Item'}"
