from django.core.management.base import BaseCommand
from marketplace.models import Category

class Command(BaseCommand):
    help = 'Adds default categories to the marketplace'

    def handle(self, *args, **kwargs):
        default_categories = [
            "Electronics",
            "Clothing & Fashion",
            "Books & Stationery",
            "Home & Kitchen",
            "Sports & Fitness",
            "Furniture",
            "Mobile Phones",
            "Computers & Laptops",
            "Gaming",
            "Music & Instruments",
            "Art & Collectibles",
            "Other"
        ]

        count = 0
        for category_name in default_categories:
            if not Category.objects.filter(name__iexact=category_name).exists():
                Category.objects.create(name=category_name)
                count += 1
                self.stdout.write(f"Added category: {category_name}")

        self.stdout.write(
            self.style.SUCCESS(f'Successfully added {count} categories out of {len(default_categories)} total')
        )
