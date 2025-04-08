from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet)
router.register(r'products', views.ListingViewSet, basename='product')

app_name = 'marketplace'

urlpatterns = [
    # Add explicit route for ID-based lookups
    path('products/<int:slug>/', views.ListingViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    })),

    # Include default router URLs
    path('', include(router.urls)),
    path('wallet/', views.get_wallet, name='wallet'),
    path('transactions/', views.get_transactions, name='transactions'),
    path('deposit/', views.deposit_funds, name='deposit_funds'),
    path('purchases/', views.get_purchases, name='purchases'),
    path('sales/', views.get_sales, name='sales'),
    path('search/', views.search_listings, name='search'),
    path('categories/create/', views.create_category, name='create_category'),
]
