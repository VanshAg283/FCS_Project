# Generated by Django 5.1.6 on 2025-04-06 05:27

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0003_friendship'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='verification_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='verification_notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='verification_status',
            field=models.CharField(choices=[('UNVERIFIED', 'Not Submitted'), ('PENDING', 'Pending Verification'), ('VERIFIED', 'Verified'), ('REJECTED', 'Verification Rejected')], default='UNVERIFIED', max_length=10),
        ),
        migrations.CreateModel(
            name='VerificationDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_type', models.CharField(choices=[('ID_CARD', 'ID Card'), ('AADHAR', 'Aadhar Card'), ('DRIVERS_LICENSE', "Driver's License"), ('OTHER', 'Other Document')], max_length=20)),
                ('document_file', models.FileField(upload_to='verification_docs/')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='verification_documents', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
