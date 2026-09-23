from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_add_is_onboarded'),
    ]

    operations = [
        migrations.AddField(
            model_name='variety',
            name='field_code',
            field=models.CharField(
                blank=True,
                default='',
                help_text='FieldLink variety code / alias used in the seed multiplication program',
                max_length=50,
            ),
        ),
    ]
