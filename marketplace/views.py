import uuid
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Category, Listing, ListingImage, Wallet, Transaction, Purchase, PaymentOTP
from .serializers import (
    CategorySerializer, ListingSerializer, ListingCreateUpdateSerializer,
    WalletSerializer, TransactionSerializer, PurchaseSerializer
)
from .utils import send_transaction_otp_email

class CategoryViewSet(viewsets.ModelViewSet):  # Change from ReadOnlyModelViewSet to ModelViewSet
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]  # Change permission to allow authenticated users to create categories

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Override create method to handle category creation"""
        name = request.data.get('name')

        if not name or len(name.strip()) < 2:
            return Response({"error": "Category name must be at least 2 characters"}, status=400)

        # Check if category already exists (case insensitive)
        if Category.objects.filter(name__iexact=name).exists():
            return Response({"error": "Category already exists"}, status=400)

        serializer = self.get_serializer(data={'name': name.strip()})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class ListingViewSet(viewsets.ModelViewSet):
    serializer_class = ListingSerializer
    lookup_field = 'slug'
    parser_classes = [MultiPartParser, FormParser]

    # Add this method to allow both ID and slug-based lookups
    def get_object(self):
        """
        Get the object with the given lookup_field value.
        Support both slug and numeric ID lookups.
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        # If lookup value is numeric, use ID instead of slug
        filter_kwargs = {}
        if lookup_value and lookup_value.isdigit():
            filter_kwargs['id'] = lookup_value
        else:
            filter_kwargs[self.lookup_field] = lookup_value

        queryset = self.filter_queryset(self.get_queryset())
        obj = get_object_or_404(queryset, **filter_kwargs)

        # Check object permissions
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        """Filter listings based on user role and params"""
        if self.request.user.is_staff:
            # Admins can see all listings
            queryset = Listing.objects.all()
        elif self.request.user.is_authenticated:
            # Users can see active listings + their own
            queryset = Listing.objects.filter(
                Q(status='ACTIVE') | Q(seller=self.request.user)
            )
        else:
            # Unauthenticated users can only see active listings
            queryset = Listing.objects.filter(status='ACTIVE')

        # Category filtering
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        # Seller filtering
        seller = self.request.query_params.get('seller')
        if seller:
            queryset = queryset.filter(seller__username=seller)

        # Price range filtering
        min_price = self.request.query_params.get('min_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)

        max_price = self.request.query_params.get('max_price')
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Sort by
        sort_by = self.request.query_params.get('sort')
        if sort_by == 'price_asc':
            queryset = queryset.order_by('price')
        elif sort_by == 'price_desc':
            queryset = queryset.order_by('-price')
        elif sort_by == 'newest':
            queryset = queryset.order_by('-created_at')
        elif sort_by == 'popular':
            queryset = queryset.order_by('-views')
        else:
            queryset = queryset.order_by('-created_at')  # Default sort

        return queryset

    def get_serializer_class(self):
        """Use different serializer for create/update operations"""
        if self.action in ['create', 'update', 'partial_update']:
            return ListingCreateUpdateSerializer
        return ListingSerializer

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated]
        else:
            self.permission_classes = [AllowAny]
        return super().get_permissions()

    def perform_create(self, serializer):
        """Set the seller to the current user when creating a listing"""
        serializer.save(seller=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        """Increment view counter when retrieving a listing"""
        instance = self.get_object()

        # Increment views counter
        instance.views += 1
        instance.save(update_fields=['views'])

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Create a new listing with images"""
        # Print request data for debugging
        print("Creating listing with data:", request.data)
        print("Files:", request.FILES)

        # Create a mutable copy of request.data
        data = request.data.copy()

        # Extract images from request
        images = request.FILES.getlist('images', [])

        # Create serializer with data
        serializer = self.get_serializer(data=data)

        if serializer.is_valid():
            # Set seller to current user
            listing = serializer.save(seller=request.user)

            # Add images to the listing
            for i, image_file in enumerate(images):
                ListingImage.objects.create(
                    listing=listing,
                    image=image_file,
                    is_primary=(i == 0)  # First image is primary
                )

            # Return the created listing
            output_serializer = ListingSerializer(listing, context={'request': request})
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        # If validation fails, print the errors for debugging
        print("Validation errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def purchase(self, request, slug=None):
        """Initiate purchase process for this listing"""
        listing = self.get_object()

        # Check if listing is available
        if listing.status != 'ACTIVE':
            return Response(
                {"error": "This listing is not available for purchase"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Can't buy your own listing
        if listing.seller == request.user:
            return Response(
                {"error": "You cannot purchase your own listing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user has a wallet
        try:
            wallet = Wallet.objects.get(user=request.user)
        except Wallet.DoesNotExist:
            # Create wallet if it doesn't exist
            wallet = Wallet.objects.create(user=request.user)

        # Check if user has enough funds
        if not wallet.can_afford(listing.price):
            return Response(
                {"error": f"Insufficient funds. Your balance: ${wallet.balance}, required: ${listing.price}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create transaction reference
        transaction_reference = uuid.uuid4()

        # Generate OTP for transaction verification
        otp_obj = PaymentOTP.generate_otp(
            user=request.user,
            transaction_reference=transaction_reference,
            amount=listing.price
        )

        # Send OTP via email
        send_transaction_otp_email(
            user=request.user,
            otp=otp_obj.otp,
            amount=listing.price,
            listing_title=listing.title
        )

        return Response({
            "message": "Purchase initiated. Please verify with the OTP sent to your email.",
            "transaction_reference": transaction_reference,
            "listing_id": listing.id,
            "amount": listing.price,
            "seller": listing.seller.username
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def verify_purchase(self, request):
        """Verify and complete a purchase with OTP"""
        # Get data from request
        otp = request.data.get('otp')
        transaction_reference = request.data.get('transaction_reference')
        listing_id = request.data.get('listing_id')

        if not all([otp, transaction_reference, listing_id]):
            return Response(
                {"error": "OTP, transaction reference and listing ID are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the OTP object
        try:
            otp_obj = PaymentOTP.objects.get(
                user=request.user,
                transaction_reference=transaction_reference,
                is_used=False
            )
        except PaymentOTP.DoesNotExist:
            return Response(
                {"error": "Invalid OTP request. Please try again."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if OTP is valid and not expired
        if not otp_obj.is_valid():
            return Response(
                {"error": "OTP has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if OTP matches
        if otp_obj.otp != otp:
            return Response(
                {"error": "Invalid OTP code"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the listing
        try:
            listing = Listing.objects.get(id=listing_id, status='ACTIVE')
        except Listing.DoesNotExist:
            return Response(
                {"error": "Listing not found or not available"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get buyer and seller wallets
        buyer_wallet = Wallet.objects.get(user=request.user)
        seller_wallet = Wallet.objects.get_or_create(user=listing.seller)[0]

        # Double-check funds
        if not buyer_wallet.can_afford(listing.price):
            return Response(
                {"error": "Insufficient funds"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Process payment in a transaction
        try:
            # Withdraw from buyer's wallet
            buyer_wallet.withdraw(listing.price)

            # Create purchase transaction
            purchase_tx = Transaction.objects.create(
                wallet=buyer_wallet,
                amount=-float(listing.price),
                transaction_type='PURCHASE',
                status='COMPLETED',
                description=f"Purchase of '{listing.title}'",
                reference_id=transaction_reference,
                listing=listing
            )

            # Add to seller's wallet
            seller_wallet.deposit(listing.price)

            # Create sale transaction
            sale_tx = Transaction.objects.create(
                wallet=seller_wallet,
                amount=float(listing.price),
                transaction_type='SALE',
                status='COMPLETED',
                description=f"Sale of '{listing.title}'",
                reference_id=transaction_reference,
                listing=listing
            )

            # Create purchase record
            purchase = Purchase.objects.create(
                listing=listing,
                buyer=request.user,
                seller=listing.seller,
                transaction=purchase_tx,
                purchase_price=listing.price
            )

            # Update listing status
            listing.status = 'SOLD'
            listing.save()

            # Mark OTP as used
            otp_obj.is_used = True
            otp_obj.save()

            return Response({
                "message": "Purchase completed successfully!",
                "purchase_id": purchase.id,
                "transaction_reference": str(transaction_reference),
                "amount": listing.price,
                "seller": listing.seller.username,
                "listing_title": listing.title
            })

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Transaction failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def withdraw(self, request, slug=None):
        """Withdraw a listing from the marketplace"""
        listing = self.get_object()

        # Check if user is the seller
        if listing.seller != request.user:
            return Response(
                {"error": "You can only withdraw your own listings"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if listing is active
        if listing.status != 'ACTIVE':
            return Response(
                {"error": f"Cannot withdraw a listing with status: {listing.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update status
        listing.status = 'WITHDRAWN'
        listing.save()

        return Response({"message": "Listing withdrawn successfully"})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def flag(self, request, slug=None):
        """Flag a listing as inappropriate (admin only)"""
        listing = self.get_object()

        # Update status
        listing.status = 'FLAGGED'
        listing.save()

        return Response({"message": "Listing flagged successfully"})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_listings(self, request):
        """Get listings for current user"""
        listings = Listing.objects.filter(seller=request.user)
        serializer = self.get_serializer(listings, many=True)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wallet(request):
    """Get or create the user's wallet"""
    wallet, created = Wallet.objects.get_or_create(user=request.user)
    serializer = WalletSerializer(wallet)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transactions(request):
    """Get the user's transactions"""
    wallet = get_object_or_404(Wallet, user=request.user)
    transactions = Transaction.objects.filter(wallet=wallet).order_by('-timestamp')
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deposit_funds(request):
    """
    Add funds to user's wallet
    This is a simulated deposit for demo purposes
    """
    amount = request.data.get('amount')

    if not amount:
        return Response(
            {"error": "Amount is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError("Amount must be positive")
    except (ValueError, TypeError):
        return Response(
            {"error": "Invalid amount"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get or create wallet
    wallet, created = Wallet.objects.get_or_create(user=request.user)

    # Deposit funds
    try:
        wallet.deposit(amount)
        return Response({
            "message": f"${amount} added to your wallet successfully",
            "new_balance": wallet.balance
        })
    except Exception as e:
        return Response(
            {"error": f"Deposit failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_purchases(request):
    """Get user's purchase history"""
    purchases = Purchase.objects.filter(buyer=request.user).order_by('-purchased_at')
    serializer = PurchaseSerializer(purchases, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sales(request):
    """Get user's sales history"""
    sales = Purchase.objects.filter(seller=request.user).order_by('-purchased_at')
    serializer = PurchaseSerializer(sales, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def search_listings(request):
    """Search listings with full-text search"""
    query = request.query_params.get('q', '')
    if not query:
        return Response(
            {"error": "Search query is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(query) < 3:
        return Response(
            {"error": "Search query must be at least 3 characters"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Search in title and description
    results = Listing.objects.filter(
        (Q(title__icontains=query) | Q(description__icontains=query)) &
        Q(status='ACTIVE')
    )

    # Apply category filter if present
    category = request.query_params.get('category')
    if category:
        results = results.filter(category__slug=category)

    serializer = ListingSerializer(results, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_category(request):
    """Create a new category if it doesn't already exist"""
    name = request.data.get('name')

    if not name or len(name.strip()) < 2:
        return Response({"error": "Category name must be at least 2 characters"}, status=400)

    # Check if category already exists (case insensitive)
    if Category.objects.filter(name__iexact=name).exists():
        return Response({"error": "Category already exists"}, status=400)

    # Create new category
    category = Category.objects.create(name=name.strip())

    return Response({
        "id": category.id,
        "name": category.name
    }, status=201)
