from django.core.management.base import BaseCommand
from core.models import User, Area, Variety, MediaType, FindingType


class Command(BaseCommand):
    help = 'Seed the database with initial master data and users'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        
        # Create Users
        users_data = [
            {'username': 'admin', 'password': 'admin123', 'first_name': 'Vineeta', 'last_name': 'Raina', 'role': 'admin'},
            {'username': 'tech', 'password': 'tech123', 'first_name': 'Kajal', 'last_name': '', 'role': 'technician'},
            {'username': 'tech2', 'password': 'tech123', 'first_name': 'Satyam', 'last_name': '', 'role': 'technician'},
            {'username': 'viewer', 'password': 'viewer123', 'first_name': 'Anurag', 'last_name': '', 'role': 'viewer'},
        ]
        
        for user_data in users_data:
            password = user_data.pop('password')
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults=user_data
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f'  Created user: {user.username}')
            else:
                self.stdout.write(f'  User already exists: {user.username}')
        
        # Create Areas
        areas = [
            'Inoculation Room A',
            'Inoculation Room B',
            'Growth Room 1',
            'Growth Room 2',
            'Media Preparation Lab',
            'Greenhouse',
        ]
        for area_name in areas:
            area, created = Area.objects.get_or_create(name=area_name)
            if created:
                self.stdout.write(f'  Created area: {area_name}')
        
        # Create Varieties
        varieties = [
            {'code': 'SC-001', 'name': 'CoJ 64', 'description': 'High yielding variety'},
            {'code': 'SC-002', 'name': 'Co 0238', 'description': 'Early maturing'},
            {'code': 'SC-003', 'name': 'CoS 767', 'description': 'Disease resistant'},
            {'code': 'SC-004', 'name': 'CoLk 94184', 'description': 'High sugar content'},
            {'code': 'SC-005', 'name': 'Co 0118', 'description': 'Waterlogging tolerant'},
        ]
        for variety_data in varieties:
            variety, created = Variety.objects.get_or_create(
                code=variety_data['code'],
                defaults=variety_data
            )
            if created:
                self.stdout.write(f'  Created variety: {variety_data["code"]}')
        
        # Create Media Types
        media_types = [
            'MS Medium',
            'B5 Medium',
            "White's Medium",
            'N6 Medium',
        ]
        for media_name in media_types:
            media, created = MediaType.objects.get_or_create(name=media_name)
            if created:
                self.stdout.write(f'  Created media type: {media_name}')
        
        # Create Finding Types
        findings = [
            'Healthy',
            'New Roots',
            'Wilting',
            'Yellowing',
            'Pest Damage',
            'Stunted Growth',
        ]
        for finding_name in findings:
            finding, created = FindingType.objects.get_or_create(name=finding_name)
            if created:
                self.stdout.write(f'  Created finding type: {finding_name}')
        
        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
