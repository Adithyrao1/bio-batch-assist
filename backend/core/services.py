from decimal import Decimal
from rest_framework.exceptions import ValidationError

from .models import Chemical, MediaChemicalRequirement, ChemicalUsageLog


def apply_chemical_deductions(media_prep):
    """
    Validate stock and deduct chemicals for a MediaPreparation instance.
    Handles both CREATE and UPDATE (reverses previous logs before re-applying).
    Must be called inside a transaction.atomic() block.
    """
    quantity = media_prep.quantity
    if not quantity or quantity <= 0:
        raise ValidationError({'quantity': 'Quantity (litres) is required to calculate chemical deductions.'})

    requirements = list(
        MediaChemicalRequirement.objects.select_related('chemical')
        .filter(media_type=media_prep.media_type)
    )
    if not requirements:
        raise ValidationError({
            'media_type': (
                f'No chemical requirements are defined for "{media_prep.media_type.name}". '
                'An admin must configure the composition before preparing this media.'
            )
        })

    # --- Reverse existing deductions (UPDATE case) ---
    existing_logs = list(media_prep.chemical_usage_logs.select_related('chemical').all())
    if existing_logs:
        for log in existing_logs:
            chemical = log.chemical
            chemical.remaining_stock += log.quantity_consumed
            chemical.save(update_fields=['remaining_stock'])
        media_prep.chemical_usage_logs.all().delete()

    # --- Validate new deductions (collect ALL shortfalls before raising) ---
    chemical_ids = [r.chemical_id for r in requirements]
    chemicals_map = {
        c.id: c
        for c in Chemical.objects
        .select_for_update()
        .filter(id__in=chemical_ids)
    }

    shortfalls = []
    deductions = []  # list of (chemical, amount_to_deduct)

    for req in requirements:
        chemical = chemicals_map[req.chemical_id]
        needed = Decimal(str(quantity)) * req.quantity_required
        if chemical.remaining_stock < needed:
            shortfalls.append(
                f"{chemical.name}: need {needed} {chemical.unit}, "
                f"only {chemical.remaining_stock} {chemical.unit} available."
            )
        else:
            deductions.append((chemical, needed))

    if shortfalls:
        raise ValidationError({'chemical_stock': shortfalls})

    # --- Apply deductions and create logs ---
    logs_to_create = []
    for chemical, needed in deductions:
        chemical.remaining_stock -= needed
        chemical.save(update_fields=['remaining_stock'])
        logs_to_create.append(
            ChemicalUsageLog(
                chemical=chemical,
                media_preparation=media_prep,
                quantity_consumed=needed,
            )
        )

    ChemicalUsageLog.objects.bulk_create(logs_to_create)
