"""
core/agent/tools.py

All LangChain @tool functions for the DCM LabNest ReAct agent.
Redesigned to fit the new stage-based architecture and Expense tracking.
"""

import django
from langchain_core.tools import tool
from pathlib import Path
import os

# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 1 — Chemical Inventory
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_all_chemicals_stock() -> str:
    """
    Returns the current stock level of every chemical in the inventory.
    Use this when the user asks to list all chemicals, view the full inventory,
    or check what chemicals are available.
    No arguments required.
    """
    from core.models import Chemical

    chemicals = Chemical.objects.values('name', 'remaining_stock', 'quantity', 'unit')
    if not chemicals:
        return "No chemicals found in the inventory."

    lines = [
        f"- {c['name']}: {c['remaining_stock']}/{c['quantity']} {c['unit']}"
        for c in chemicals
    ]
    return "Current chemical inventory:\n" + "\n".join(lines)


@tool
def get_expiring_chemicals(days_threshold: int = 30) -> str:
    """
    Returns chemicals that will expire within the given number of days.
    Use this when the user asks about expiring, soon-to-expire, or near-expiry chemicals.

    Args:
        days_threshold: Number of days ahead to check (default 30).
    """
    from core.models import Chemical
    from django.utils import timezone
    from datetime import timedelta

    today = timezone.now().date()
    cutoff = today + timedelta(days=days_threshold)
    chemicals = Chemical.objects.filter(
        expiry_date__isnull=False,
        expiry_date__lte=cutoff,
        expiry_date__gte=today,
    ).values('name', 'remaining_stock', 'unit', 'expiry_date').order_by('expiry_date')

    if not chemicals:
        return f"No chemicals expiring within the next {days_threshold} days."

    lines = [
        f"- {c['name']}: {c['remaining_stock']} {c['unit']}, expires {c['expiry_date']}"
        for c in chemicals
    ]
    return f"Chemicals expiring within {days_threshold} days:\n" + "\n".join(lines)


@tool
def get_low_stock_chemicals(threshold_percent: float = 20.0) -> str:
    """
    Returns chemicals whose remaining stock is at or below a percentage of their
    original quantity. Use this when the user asks about low stock, running out
    of chemicals, or chemical replenishment needs.

    Args:
        threshold_percent: Percentage below which stock is considered low (default 20%).
    """
    from core.models import Chemical
    from django.db.models import F, ExpressionWrapper, FloatField

    chemicals = (
        Chemical.objects
        .annotate(
            stock_pct=ExpressionWrapper(
                F('remaining_stock') * 100.0 / F('quantity'),
                output_field=FloatField(),
            )
        )
        .filter(stock_pct__lte=threshold_percent)
        .values('name', 'remaining_stock', 'quantity', 'unit', 'stock_pct')
        .order_by('stock_pct')
    )

    if not chemicals:
        return f"No chemicals below {threshold_percent}% stock level."

    lines = [
        f"- {c['name']}: {c['remaining_stock']}/{c['quantity']} {c['unit']} ({c['stock_pct']:.1f}% left)"
        for c in chemicals
    ]
    return f"Low stock chemicals (below {threshold_percent}%):\n" + "\n".join(lines)


@tool
def get_chemical_detail(chemical_name: str) -> str:
    """
    Returns detailed information about a specific chemical by name,
    including stock, unit, manufacture/expiry dates, and received date.
    Use this when the user asks about a specific chemical by name.

    Args:
        chemical_name: The name (or partial name) of the chemical.
    """
    from core.models import Chemical

    chemicals = Chemical.objects.filter(name__icontains=chemical_name)
    if not chemicals.exists():
        return f"No chemical found matching '{chemical_name}'."

    lines = []
    for c in chemicals:
        status = "EXPIRED" if c.is_expired else "OK"
        lines.append(
            f"- {c.name}\n"
            f"  Stock: {c.remaining_stock}/{c.quantity} {c.unit} [{status}]\n"
            f"  Received: {c.received_date or 'N/A'} | "
            f"Mfg: {c.mfg_date or 'N/A'} | "
            f"Expiry: {c.expiry_date or 'N/A'}"
        )
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 2 — Stock Solutions & Recipes
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_stock_solution_inventory(solution_name: str = "") -> str:
    """
    Returns the current remaining volume of all stock solutions, or filters
    by a specific name. Use this when the user asks about available stock
    solution volumes or a specific solution's quantity.

    Args:
        solution_name: Optional name filter (e.g., 'MS Salts'). Leave blank for all.
    """
    from core.models import StockSolution

    qs = StockSolution.objects.all()
    if solution_name:
        qs = qs.filter(name__icontains=solution_name)

    if not qs.exists():
        return f"No stock solution found matching '{solution_name}'." if solution_name else "No stock solutions found."

    lines = [f"- {s.name}: {s.remaining_volume} {s.unit}" for s in qs]
    return "Stock solution inventory:\n" + "\n".join(lines)


@tool
def get_critical_stock_solutions(threshold_ml: float = 100.0) -> str:
    """
    Returns stock solutions whose remaining volume is below the given threshold.
    Use this when the user asks which stock solutions are running low,
    critically low, or need to be replenished.

    Args:
        threshold_ml: Volume in mL below which a solution is considered critical (default 100).
    """
    from core.models import StockSolution

    solutions = StockSolution.objects.filter(
        remaining_volume__lt=threshold_ml
    ).values('name', 'remaining_volume', 'unit').order_by('remaining_volume')

    if not solutions:
        return f"All stock solutions have more than {threshold_ml} mL remaining."

    lines = [
        f"- {s['name']}: {s['remaining_volume']} {s['unit']} ⚠️ LOW"
        for s in solutions
    ]
    return f"Stock solutions below {threshold_ml} mL:\n" + "\n".join(lines)


@tool
def get_stock_solution_preparations(solution_name: str, limit: int = 5) -> str:
    """
    Returns the recent preparation history of a stock solution.
    Use this when the user asks when a stock solution was last prepared, or how
    much of it has been prepared recently.

    Args:
        solution_name: Name (or partial name) of the stock solution.
        limit: Number of recent preparation records to return (default 5).
    """
    from core.models import StockSolution, StockSolutionPreparation

    try:
        solution = StockSolution.objects.get(name__icontains=solution_name)
    except StockSolution.DoesNotExist:
        return f"No stock solution found matching '{solution_name}'."
    except StockSolution.MultipleObjectsReturned:
        solutions = StockSolution.objects.filter(name__icontains=solution_name)
        names = ", ".join(s.name for s in solutions)
        return f"Multiple solutions match '{solution_name}': {names}. Please be more specific."

    preps = (
        StockSolutionPreparation.objects
        .filter(stock_solution=solution)
        .order_by('-date', '-created_at')[:limit]
    )

    if not preps:
        return f"'{solution.name}' has no recent preparation logs."

    lines = [
        f"- {p.date}: prepared {p.volume_prepared} {solution.unit} by {p.prepared_by.get_full_name() or p.prepared_by.username}"
        for p in preps
    ]
    return f"Recent preparations of '{solution.name}' (last {limit} records):\n" + "\n".join(lines)

@tool
def get_stock_solution_recipe(solution_name: str) -> str:
    """
    Returns the chemical composition (recipe) for a given stock solution.
    Use this when the user asks what a stock solution consists of, its formula, or
    required chemicals.

    Args:
        solution_name: Name of the stock solution.
    """
    from core.models import StockSolution, StockSolutionRecipeItem

    try:
        solution = StockSolution.objects.get(name__icontains=solution_name)
    except StockSolution.DoesNotExist:
        return f"No stock solution found matching '{solution_name}'."
    except StockSolution.MultipleObjectsReturned:
        solutions = StockSolution.objects.filter(name__icontains=solution_name)
        names = ", ".join(s.name for s in solutions)
        return f"Multiple solutions match '{solution_name}': {names}. Please be more specific."

    requirements = StockSolutionRecipeItem.objects.filter(
        stock_solution=solution
    ).select_related('chemical').order_by('chemical__name')

    if not requirements:
        return f"No chemical recipe defined for '{solution.name}'."

    lines = [
        f"- {r.chemical.name}: {r.quantity_per_unit} {r.chemical.unit} per unit"
        for r in requirements
    ]
    return f"Recipe of '{solution.name}':\n" + "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 3 — Contamination
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_contamination_summary(days: int = 30) -> str:
    """
    Returns a summary of contamination across Initiation, Multiplication, and Rooting stages
    in the last N days.
    Use this for general contamination trend queries, monthly contamination stats,
    or how contamination is distributed.

    Args:
        days: Number of past days to analyse (default 30).
    """
    from core.models import InitiationLog, MultiplicationLog, RootingLog
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Sum

    start = timezone.now().date() - timedelta(days=days)
    
    init_contam = InitiationLog.objects.filter(date__gte=start).aggregate(s=Sum('contaminated_bottles'))['s'] or 0
    mult_contam = MultiplicationLog.objects.filter(date__gte=start).aggregate(s=Sum('contaminated_bottles'))['s'] or 0
    root_contam = RootingLog.objects.filter(date__gte=start).aggregate(s=Sum('contaminated_bottles'))['s'] or 0
    
    total = init_contam + mult_contam + root_contam

    if total == 0:
        return f"No contamination events recorded in the last {days} days."

    return (
        f"Contamination summary (last {days} days):\n"
        f"Total contaminated bottles: {total}\n"
        f"- Initiation: {init_contam}\n"
        f"- Multiplication: {mult_contam}\n"
        f"- Rooting: {root_contam}\n"
    )

@tool
def get_contamination_by_variety(days: int = 30, variety_code: str = "") -> str:
    """
    Returns contamination counts grouped by variety for the last N days across all early stages.
    Use this when the user asks which crop variety is most affected by contamination.

    Args:
        days: Number of past days to include (default 30).
        variety_code: Optional variety code filter (e.g., 'SC-001'). Leave blank for all.
    """
    from core.models import InitiationLog, MultiplicationLog, RootingLog, Variety
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Sum

    start = timezone.now().date() - timedelta(days=days)
    
    varieties = Variety.objects.all()
    if variety_code:
        varieties = varieties.filter(code__icontains=variety_code)

    results = []
    for v in varieties:
        init = InitiationLog.objects.filter(date__gte=start, variety=v).aggregate(s=Sum('contaminated_bottles'))['s'] or 0
        mult = MultiplicationLog.objects.filter(date__gte=start, variety=v).aggregate(s=Sum('contaminated_bottles'))['s'] or 0
        root = RootingLog.objects.filter(date__gte=start, variety=v).aggregate(s=Sum('contaminated_bottles'))['s'] or 0
        total = init + mult + root
        if total > 0:
            results.append({'variety': v.code, 'name': v.name, 'total': total, 'init': init, 'mult': mult, 'root': root})

    results.sort(key=lambda x: x['total'], reverse=True)

    if not results:
        return f"No contamination reports found in the last {days} days."

    lines = [
        f"- {r['variety']} ({r['name']}): {r['total']} bottles (Init: {r['init']}, Mult: {r['mult']}, Root: {r['root']})"
        for r in results
    ]
    return f"Contamination by variety (last {days} days):\n" + "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 4 — Production / Stages
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_production_summary(days: int = 30) -> str:
    """
    Returns the total lab production output for the last N days across all stages.
    Use this when the user asks about total production, output, yield, or
    how many plantlets/cultures were produced.

    Args:
        days: Number of past days to include (default 30).
    """
    from core.models import InitiationLog, MultiplicationLog, RootingLog, HardeningLog, TransplantationLog
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Sum

    start = timezone.now().date() - timedelta(days=days)
    
    init = InitiationLog.objects.filter(date__gte=start).aggregate(s=Sum('bottles_inoculated'))['s'] or 0
    mult = MultiplicationLog.objects.filter(date__gte=start).aggregate(s=Sum('bottles_produced'))['s'] or 0
    root = RootingLog.objects.filter(date__gte=start).aggregate(s=Sum('rooting_bottles'))['s'] or 0
    hard = HardeningLog.objects.filter(date__gte=start).aggregate(s=Sum('seedlings_transplanted'))['s'] or 0
    trans = TransplantationLog.objects.filter(date__gte=start).aggregate(s=Sum('seedlings_transplanted'))['s'] or 0

    return (
        f"Production summary (last {days} days):\n"
        f"- Initiation (bottles inoculated): {init}\n"
        f"- Multiplication (bottles produced): {mult}\n"
        f"- Rooting (bottles): {root}\n"
        f"- Hardening (seedlings transplanted): {hard}\n"
        f"- Transplantation (seedlings to field): {trans}\n"
    )

@tool
def get_stage_production_history(stage: str, variety_code: str = "", days: int = 90) -> str:
    """
    Returns detailed production records for a specific stage (Initiation, Multiplication, Rooting, Hardening, Transplantation).
    Use this when the user asks about a particular stage's output or history.

    Args:
        stage: The name of the stage (e.g., 'Initiation', 'Hardening').
        variety_code: Optional variety code (e.g., 'SC-001').
        days: Number of past days to include (default 90).
    """
    from core.models import InitiationLog, MultiplicationLog, RootingLog, HardeningLog, TransplantationLog
    from django.utils import timezone
    from datetime import timedelta

    start = timezone.now().date() - timedelta(days=days)
    
    stage = stage.lower()
    if 'initiation' in stage:
        qs = InitiationLog.objects.filter(date__gte=start)
        if variety_code: qs = qs.filter(variety__code__icontains=variety_code)
        logs = qs.order_by('-date')[:10]
        if not logs: return "No Initiation logs found."
        return "Recent Initiation:\n" + "\n".join([f"- {l.date} ({l.variety.code}): {l.bottles_inoculated} bottles inoculated" for l in logs])
    elif 'multiplication' in stage:
        qs = MultiplicationLog.objects.filter(date__gte=start)
        if variety_code: qs = qs.filter(variety__code__icontains=variety_code)
        logs = qs.order_by('-date')[:10]
        if not logs: return "No Multiplication logs found."
        return "Recent Multiplication:\n" + "\n".join([f"- {l.date} ({l.variety.code}, Cycle {l.cycle_number}): {l.bottles_produced} bottles produced" for l in logs])
    elif 'rooting' in stage:
        qs = RootingLog.objects.filter(date__gte=start)
        if variety_code: qs = qs.filter(variety__code__icontains=variety_code)
        logs = qs.order_by('-date')[:10]
        if not logs: return "No Rooting logs found."
        return "Recent Rooting:\n" + "\n".join([f"- {l.date} ({l.variety.code}): {l.rooting_bottles} bottles (Basal: {l.basal_bottles})" for l in logs])
    elif 'hardening' in stage:
        qs = HardeningLog.objects.filter(date__gte=start)
        if variety_code: qs = qs.filter(variety__code__icontains=variety_code)
        logs = qs.order_by('-date')[:10]
        if not logs: return "No Hardening logs found."
        return "Recent Hardening:\n" + "\n".join([f"- {l.date} ({l.variety.code}): {l.seedlings_transplanted} transplanted, {l.seedlings_died} died" for l in logs])
    elif 'transplant' in stage:
        qs = TransplantationLog.objects.filter(date__gte=start)
        if variety_code: qs = qs.filter(variety__code__icontains=variety_code)
        logs = qs.order_by('-date')[:10]
        if not logs: return "No Transplantation logs found."
        return "Recent Transplantation:\n" + "\n".join([f"- {l.date} ({l.variety.code}): {l.seedlings_transplanted} transplanted, {l.seedlings_died} died" for l in logs])
    else:
        return "Invalid stage. Choose from Initiation, Multiplication, Rooting, Hardening, Transplantation."


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 5 — Mortality
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_mortality_summary(days: int = 30) -> str:
    """
    Returns mortality records (seedlings died) grouped by variety for the last N days 
    across Hardening and Transplantation.
    Use this when the user asks about greenhouse losses, plantlet deaths,
    or acclimatisation success rates.

    Args:
        days: Number of past days to include (default 30).
    """
    from core.models import HardeningLog, TransplantationLog, Variety
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Sum

    start = timezone.now().date() - timedelta(days=days)
    
    varieties = Variety.objects.all()
    results = []
    
    for v in varieties:
        hard_died = HardeningLog.objects.filter(date__gte=start, variety=v).aggregate(s=Sum('seedlings_died'))['s'] or 0
        trans_died = TransplantationLog.objects.filter(date__gte=start, variety=v).aggregate(s=Sum('seedlings_died'))['s'] or 0
        total = hard_died + trans_died
        if total > 0:
            results.append({'variety': v.code, 'name': v.name, 'total': total, 'hard': hard_died, 'trans': trans_died})

    results.sort(key=lambda x: x['total'], reverse=True)

    if not results:
        return f"No mortality records in the last {days} days."

    lines = [
        f"- {r['variety']} ({r['name']}): {r['total']} died (Hardening: {r['hard']}, Transplant: {r['trans']})"
        for r in results
    ]
    return f"Mortality (last {days} days):\n" + "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 6 — Expenses
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_expenses_summary(days: int = 30) -> str:
    """
    Returns a summary of recorded expenses grouped by category over the last N days.
    Use this when the user asks about costs, expenses, overheads, or financial reports.

    Args:
        days: Number of past days to include (default 30).
    """
    from core.models import Expense
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Sum

    start = timezone.now().date() - timedelta(days=days)
    
    expenses = Expense.objects.filter(date__gte=start).values('category__name').annotate(total=Sum('amount')).order_by('-total')
    
    if not expenses:
        return f"No expenses recorded in the last {days} days."

    total = sum(e['total'] for e in expenses)
    lines = [f"- {e['category__name']}: ${e['total']}" for e in expenses]
    
    return (
        f"Expenses Summary (last {days} days):\n"
        f"Total: ${total}\n"
        f"By Category:\n" + "\n".join(lines)
    )

# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 7 — Lab Overview
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_dashboard_snapshot() -> str:
    """
    Returns a high-level snapshot of the entire lab's current status:
    expired chemicals, out-of-stock chemicals, and total production in the last 30 days.
    Use this ONLY for broad questions like 'how is the lab doing?',
    'give me a lab overview', or 'what is the current lab status?'.
    For specific cross-domain comparisons, individual tools will be called separately.
    No arguments required.
    """
    from core.models import Chemical, StockSolution, MultiplicationLog, RootingLog, HardeningLog, TransplantationLog
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Sum

    today = timezone.now()
    start_30 = today.date() - timedelta(days=30)

    expired_chemicals = Chemical.objects.filter(expiry_date__lt=today.date()).count()
    out_of_stock = Chemical.objects.filter(remaining_stock__lte=0).count()
    low_stock_solutions = StockSolution.objects.filter(remaining_volume__lt=100).count()
    
    total_prod = MultiplicationLog.objects.filter(date__gte=start_30).aggregate(s=Sum('bottles_produced'))['s'] or 0

    return (
        f"DCM LabNest — Lab Snapshot (last 30 days):\n"
        f"- Expired chemicals      : {expired_chemicals}\n"
        f"- Out-of-stock chemicals : {out_of_stock}\n"
        f"- Low stock solutions    : {low_stock_solutions} (< 100 mL)\n"
        f"- Multiplication bottles produced: {total_prod}\n"
    )

# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 8 — Reports & Alerts (Action Tools)
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def send_weekly_lab_report(recipient_email: str) -> str:
    """
    Triggers the weekly lab performance digest email and sends it immediately
    to the specified recipient. The report covers the last 7 days.
    Use this when the user says 'send weekly report', 'email lab digest',
    'send me the weekly summary', or similar.

    Args:
        recipient_email: The email address to send the report to.
                         Always use the logged-in user's email from the system context.
    """
    import os
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", r"D:\playwright_browsers")
    from core.tasks import send_weekly_lab_digest

    try:
        result = send_weekly_lab_digest.apply(args=[recipient_email])
        return_value = result.result  # the string the task returned
        if isinstance(return_value, str) and return_value.startswith("Failed:"):
            return f"❌ Failed to send weekly report: {return_value}"
        return (
            f"✅ Weekly lab performance report has been sent to **{recipient_email}**! "
            "It includes production, contamination, inventory, and team metrics for the past 7 days."
        )
    except Exception as e:
        return f"❌ Failed to send weekly report: {str(e)}"


@tool
def send_chemical_expiry_alert(recipient_email: str) -> str:
    """
    Triggers the chemical expiry digest email immediately and sends it to the
    specified recipient. The email lists all chemicals expiring within the next
    30 days, their remaining stock, and expiry dates.
    Use this when the user says 'send chemical expiry alert', 'email expiry report',
    'send chemical digest', 'notify about expiring chemicals', or similar.

    Args:
        recipient_email: The email address to send the alert to.
                         Always use the logged-in user's email from the system context.
    """
    import os
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", r"D:\playwright_browsers")
    from core.tasks import send_chemical_inventory_digest

    try:
        result = send_chemical_inventory_digest.apply(args=[recipient_email])
        return_value = result.result  # the string the task returned
        if isinstance(return_value, str) and return_value.startswith("Failed:"):
            return f"❌ Failed to send chemical expiry alert: {return_value}"
        if isinstance(return_value, str) and return_value == "No inventory alerts.":
            return "ℹ️ No inventory alerts to send — all chemicals are well-stocked and not expiring soon."
        return (
            f"✅ Chemical expiry alert has been sent to **{recipient_email}**! "
            "It includes a full list of chemicals expiring within the next 30 days."
        )
    except Exception as e:
        return f"❌ Failed to send chemical expiry alert: {str(e)}"


@tool
def search_lab_protocols(query: str) -> str:
    """
    Search the laboratory Standard Operating Procedures (SOP) and Project Reports for protocols, guidelines, and instructions.
    Use this tool when the user asks 'how to' do something, or asks about safety guidelines, methodologies, chemicals handling, or standard procedures.
    """
    from pathlib import Path
    from langchain_community.vectorstores import FAISS
    from langchain_huggingface import HuggingFaceEmbeddings

    index_path = Path(__file__).resolve().parent / "faiss_index"
    if not index_path.exists():
        return "Error: The knowledge base index has not been built yet. Please run the ingestion script."
        
    try:
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vectorstore = FAISS.load_local(str(index_path), embeddings, allow_dangerous_deserialization=True)
        
        # Retrieve top 3 chunks
        docs = vectorstore.similarity_search(query, k=3)
        
        if not docs:
            return "No relevant protocols or guidelines found."
            
        result = "Found the following relevant protocol excerpts:\n\n"
        for i, doc in enumerate(docs):
            source = doc.metadata.get("source", "Unknown Document")
            page = doc.metadata.get("page", "?")
            result += f"--- Excerpt {i+1} (Source: {source}, Page: {page}) ---\n{doc.page_content}\n\n"
            
        return result
    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"


@tool
def render_chart_in_ui(chart_type: str, title: str, data_points_json: str) -> str:
    """
    Renders a chart in the user interface. Call this AFTER you have fetched the data using a database tool.
    
    REQUIRED two-step workflow:
      Step 1: Call the appropriate data tool (e.g., get_contamination_by_variety, get_production_summary,
              get_manpower_payroll_summary, get_expenses_summary, get_technician_salary, etc.)
      Step 2: Parse the text result from Step 1 and call this tool with the data as JSON.
    
    Args:
        chart_type: MUST be exactly one of: 'bar', 'pie', 'line'
        title: A short descriptive title for the chart (e.g., 'Contamination by Variety')
        data_points_json: A valid JSON array string. Each element MUST have 'name' and 'value' keys.
            Example: '[{"name": "SC-001", "value": 45}, {"name": "SC-002", "value": 12}]'
    
    CRITICAL: Copy the ENTIRE returned string (including ===CHART_BEGIN=== and ===CHART_END===) 
    verbatim into your final answer. Do not summarise or paraphrase it.
    """
    import json
    # Validate JSON before returning
    try:
        parsed = json.loads(data_points_json)
        if not isinstance(parsed, list) or not parsed:
            return "❌ Chart error: data_points_json must be a non-empty JSON array."
        if not all('name' in p and 'value' in p for p in parsed):
            return "❌ Chart error: every element must have 'name' and 'value' keys."
        # Re-serialise to ensure clean JSON
        data_points_json = json.dumps(parsed)
    except (json.JSONDecodeError, TypeError) as e:
        return f"❌ Chart error: invalid JSON — {e}"
    return f"\n===CHART_BEGIN===\n{chart_type}|{title}|{data_points_json}\n===CHART_END===\n"


@tool
def send_progress_report(start_date: str, end_date: str, recipient_email: str) -> str:
    """
    Generates the Excel Progress Report for the given date range and emails it to the recipient.
    Use this when the user asks to send or email the progress report or production report.
    
    Args:
        start_date: Start date in YYYY-MM-DD format (e.g., '2026-05-01').
        end_date: End date in YYYY-MM-DD format (e.g., '2026-05-27').
        recipient_email: The email address to send the report to (use the logged-in user's email).
    """
    from core.tasks import email_progress_report_task
    try:
        result = email_progress_report_task.apply(args=[start_date, end_date, recipient_email])
        return_value = result.result
        if isinstance(return_value, str) and return_value.startswith("Failed"):
            return f"❌ {return_value}"
        return f"✅ The Progress Report ({start_date} to {end_date}) has been emailed to **{recipient_email}**."
    except Exception as e:
        return f"❌ Failed to send progress report: {str(e)}"

@tool
def send_expenses_report(start_date: str, end_date: str, recipient_email: str) -> str:
    """
    Generates the Excel Expenses Report for the given date range and emails it to the recipient.
    Use this when the user asks to send or email the expenses report or financial report.
    
    Args:
        start_date: Start date in YYYY-MM-DD format (e.g., '2026-05-01').
        end_date: End date in YYYY-MM-DD format (e.g., '2026-05-27').
        recipient_email: The email address to send the report to (use the logged-in user's email).
    """
    from core.tasks import email_expenses_report_task
    try:
        result = email_expenses_report_task.apply(args=[start_date, end_date, recipient_email])
        return_value = result.result
        if isinstance(return_value, str) and return_value.startswith("Failed"):
            return f"❌ {return_value}"
        return f"✅ The Expenses Report ({start_date} to {end_date}) has been emailed to **{recipient_email}**."
    except Exception as e:
        return f"❌ Failed to send expenses report: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 9 — Manpower & Payroll
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_manpower_payroll_summary() -> str:
    """
    Returns the current monthly salary, daily rate, and total payroll for all
    technicians on record. Use this when the user asks about:
    - Total manpower cost or payroll
    - How much we spend on technician salaries
    - List of all technician salaries
    - Daily cost of the lab workforce
    No arguments required.
    """
    from core.models import ManpowerExpense

    records = ManpowerExpense.objects.select_related('technician').order_by('technician__first_name')
    if not records.exists():
        return "No salary records found. No technician salaries have been set yet."

    total_monthly = sum(float(r.monthly_salary) for r in records)
    total_daily   = sum(r.daily_rate for r in records)

    lines = ["Technician Payroll Summary:", ""]
    for r in records:
        name = r.technician.get_full_name() or r.technician.username
        lines.append(
            f"- {name}: Rs.{float(r.monthly_salary):,.0f}/month  "
            f"(Rs.{r.daily_rate:.2f}/day)"
            + (f"  | Note: {r.notes}" if r.notes and r.notes != 'Dummy seed data' else "")
        )

    lines += [
        "",
        f"TOTAL Monthly Payroll : Rs.{total_monthly:,.0f}",
        f"TOTAL Daily Cost      : Rs.{total_daily:,.2f}",
        f"No. of Technicians    : {records.count()}",
    ]
    return "\n".join(lines)


@tool
def get_technician_salary(technician_name: str) -> str:
    """
    Returns the current monthly salary and daily rate for a specific technician.
    Use this when the user asks about the salary of a particular person.

    Args:
        technician_name: Full name or username of the technician (partial match works).
    """
    from core.models import ManpowerExpense

    records = ManpowerExpense.objects.select_related('technician').filter(
        technician__first_name__icontains=technician_name
    ) | ManpowerExpense.objects.select_related('technician').filter(
        technician__last_name__icontains=technician_name
    ) | ManpowerExpense.objects.select_related('technician').filter(
        technician__username__icontains=technician_name
    )
    records = records.distinct()

    if not records.exists():
        return f"No salary record found for a technician named '{technician_name}'."

    lines = []
    for r in records:
        name = r.technician.get_full_name() or r.technician.username
        lines.append(
            f"{name}:\n"
            f"  Monthly Salary : Rs.{float(r.monthly_salary):,.0f}\n"
            f"  Daily Rate     : Rs.{r.daily_rate:.2f}\n"
            f"  Annual (est.)  : Rs.{float(r.monthly_salary) * 12:,.0f}\n"
            f"  On record since: {r.created_at.strftime('%b %d, %Y')}"
        )
    return "\n\n".join(lines)


@tool
def get_manpower_cost_for_period(from_date: str, to_date: str) -> str:
    """
    Calculates the total manpower (salary) cost for a specific date range.
    Use this when the user asks how much was spent on salaries between two dates,
    or what the manpower cost was for a specific month or quarter.

    Args:
        from_date: Start date in YYYY-MM-DD format (e.g., '2026-01-01').
        to_date:   End date in YYYY-MM-DD format   (e.g., '2026-03-31').
    """
    from core.models import ManpowerExpense
    from datetime import date

    try:
        start = date.fromisoformat(from_date)
        end   = date.fromisoformat(to_date)
    except ValueError:
        return f"Invalid date format. Please use YYYY-MM-DD (e.g., '2026-01-01')."

    if end < start:
        return "End date must be after start date."

    records = ManpowerExpense.objects.select_related('technician').all()
    if not records.exists():
        return "No salary records found."

    total_cost = 0.0
    lines = [f"Manpower cost from {from_date} to {to_date}:", ""]

    for r in records:
        effective_start = max(start, r.created_at.date())
        effective_days  = max(0, (end - effective_start).days + 1)
        cost = r.daily_rate * effective_days
        total_cost += cost
        name = r.technician.get_full_name() or r.technician.username
        lines.append(
            f"- {name}: Rs.{r.daily_rate:.2f}/day x {effective_days} days = Rs.{cost:,.2f}"
        )

    lines += [
        "",
        f"TOTAL Manpower Cost : Rs.{total_cost:,.2f}",
        f"Period              : {(end - start).days + 1} days",
    ]
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 10 — Field Locations & Plots
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_all_field_locations() -> str:
    """
    Returns all registered field locations (e.g. Loni, Hariawan, Ajbapur, Rupapur)
    with their type (company/contract farm), district, and number of plots.
    Use this when the user asks about locations, sites, or field areas.
    No arguments required.
    """
    from core.models import FieldLocation
    locations = FieldLocation.objects.prefetch_related('plots').all()
    if not locations:
        return "No field locations found."
    lines = ["Field Locations:\n"]
    for loc in locations:
        plot_count = loc.plots.count()
        lines.append(
            f"- {loc.name} ({loc.location_type.replace('_', ' ').title()})\n"
            f"  District: {loc.district or 'N/A'}, State: {loc.state}\n"
            f"  Plots: {plot_count}"
        )
    return "\n".join(lines)


@tool
def get_plots_by_location(location_name: str) -> str:
    """
    Returns all plots at a given field location, with area and active seed lots.
    Use this when the user asks about plots at a specific location.

    Args:
        location_name: Full or partial name of the location (e.g. 'Loni', 'Ajbapur').
    """
    from core.models import FieldLocation, Plot
    try:
        loc = FieldLocation.objects.get(name__icontains=location_name)
    except FieldLocation.DoesNotExist:
        return f"No location found matching '{location_name}'."
    except FieldLocation.MultipleObjectsReturned:
        names = list(FieldLocation.objects.filter(name__icontains=location_name).values_list('name', flat=True))
        return f"Multiple locations match '{location_name}': {names}. Please be more specific."

    plots = Plot.objects.filter(location=loc).prefetch_related('seed_lots')
    if not plots:
        return f"No plots registered under {loc.name}."

    lines = [f"Plots at {loc.name}:\n"]
    for p in plots:
        active_lots = p.seed_lots.filter(status='in_field').count()
        area = f"{p.area_acres} acres" if p.area_acres else "area not recorded"
        lines.append(f"- Plot {p.plot_number} | {area} | Active seed lots: {active_lots}")
    return "\n".join(lines)


@tool
def get_plot_details(plot_id: str) -> str:
    """
    Returns detailed information about a specific plot, including its area, location, and coordinate presence.
    Use this when the user asks about a specific plot number or ID.

    Args:
        plot_id: The plot number or ID (e.g. 'A1', 'PLOT-001').
    """
    from core.models import Plot
    plots = Plot.objects.filter(plot_number__icontains=plot_id).select_related('location')
    if not plots.exists():
        return f"No plot found matching '{plot_id}'."

    lines = []
    for p in plots:
        loc = p.location.name if p.location else "Unknown Location"
        area = f"{p.area_acres} acres" if p.area_acres else "Unknown Area"
        coords = "Yes" if p.boundaries else "No"
        centroid = f"({p.centroid_lat}, {p.centroid_lng})" if p.centroid_lat and p.centroid_lng else "Not calculated"
        
        lines.append(
            f"Plot: {p.plot_number}\n"
            f"  Location: {loc}\n"
            f"  Area: {area}\n"
            f"  Polygon Mapped: {coords}\n"
            f"  Centroid: {centroid}"
        )
    return "\n\n".join(lines)


@tool
def get_total_acreage_by_location() -> str:
    """
    Returns the total cultivated area (acreage) grouped by field location.
    Use this when the user asks about the total farm size, acreage per location, or how much land is mapped.
    No arguments required.
    """
    from core.models import FieldLocation, Plot
    from django.db.models import Sum

    locations = FieldLocation.objects.all()
    if not locations.exists():
        return "No field locations found."

    lines = ["Total Acreage by Location:\n"]
    total_area = 0.0

    for loc in locations:
        area = Plot.objects.filter(location=loc).aggregate(s=Sum('area_acres'))['s'] or 0.0
        total_area += float(area)
        lines.append(f"- {loc.name}: {float(area):,.2f} acres")
        
    lines.append(f"\nTotal Mapped Area Across All Locations: {total_area:,.2f} acres")
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 11 — Farmers
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_all_farmers(location_name: str = "") -> str:
    """
    Returns all contract farmers in the seed multiplication programme.
    Optionally filter by their primary location.
    Use this when the user wants a list of farmers, participants, or growers.

    Args:
        location_name: Optional. Filter by location name (e.g. 'Hariawan'). Leave blank for all.
    """
    from core.models import Farmer
    qs = Farmer.objects.select_related('primary_location').filter(is_active=True)
    if location_name:
        qs = qs.filter(primary_location__name__icontains=location_name)
    if not qs.exists():
        return f"No active farmers found{' at ' + location_name if location_name else ''}."

    lines = [f"Active Farmers ({qs.count()} total):\n"]
    for f in qs:
        loc = f.primary_location.name if f.primary_location else "No location"
        lines.append(
            f"- {f.name} | Village: {f.village} | Location: {loc} | Quality Score: {f.quality_score}/10"
        )
    return "\n".join(lines)


@tool
def get_farmer_detail(farmer_name: str) -> str:
    """
    Returns the full profile of a specific farmer including their contact info,
    quality score, and a list of seed lots currently in their custody.
    Use this when the user asks about a specific farmer.

    Args:
        farmer_name: Full or partial name of the farmer.
    """
    from core.models import Farmer
    farmers = Farmer.objects.filter(name__icontains=farmer_name).select_related('primary_location').prefetch_related('seed_lots__variety')
    if not farmers.exists():
        return f"No farmer found matching '{farmer_name}'."

    lines = []
    for f in farmers:
        lots = f.seed_lots.all()
        lot_lines = [
            f"  · {lot.lot_id} [{lot.get_stage_display()}] — {lot.quantity_kg}kg ({lot.get_status_display()})"
            for lot in lots
        ] or ["  · No seed lots currently assigned."]
        lines.append(
            f"Farmer: {f.name}\n"
            f"  Village       : {f.village}\n"
            f"  Phone         : {f.phone or 'N/A'}\n"
            f"  Primary Loc   : {f.primary_location.name if f.primary_location else 'N/A'}\n"
            f"  Quality Score : {f.quality_score}/10\n"
            f"  Status        : {'Active' if f.is_active else 'Inactive'}\n"
            f"  Notes         : {f.notes or 'None'}\n"
            f"  Seed Lots held:\n" + "\n".join(lot_lines)
        )
    return "\n\n".join(lines)


@tool
def get_top_farmers_by_quality() -> str:
    """
    Returns farmers ranked by their quality score (highest first).
    Use this when the user asks who the best performing farmers are,
    or who has the highest seed purity / germination quality.
    No arguments required.
    """
    from core.models import Farmer
    farmers = Farmer.objects.filter(is_active=True).select_related('primary_location').order_by('-quality_score')
    if not farmers.exists():
        return "No active farmers found."

    lines = ["Farmers ranked by quality score:\n"]
    for i, f in enumerate(farmers, 1):
        loc = f.primary_location.name if f.primary_location else "—"
        lines.append(f"{i}. {f.name} ({f.village}, {loc}) — Score: {f.quality_score}/10")
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 12 — Seed Lots
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_all_seed_lots(stage: str = "", status: str = "") -> str:
    """
    Lists seed lots, optionally filtered by stage and/or status.
    Use when user asks to list seed lots or wants an overview of the seed inventory.

    Args:
        stage: Optional. One of: 'breeder', 'foundation', 'certified', 'commercial'. Leave blank for all.
        status: Optional. One of: 'in_field', 'harvested', 'dispatched', 'rejected'. Leave blank for all.
    """
    from core.models import SeedLot
    qs = SeedLot.objects.select_related('variety', 'location', 'farmer')
    if stage:
        qs = qs.filter(stage__icontains=stage)
    if status:
        qs = qs.filter(status__icontains=status)
    if not qs.exists():
        return f"No seed lots found{' for stage=' + stage if stage else ''}{' status=' + status if status else ''}."

    lines = [f"Seed Lots ({qs.count()} found):\n"]
    for lot in qs[:50]:
        holder = lot.farmer.name if lot.farmer else (lot.location.name if lot.location else "Unassigned")
        lines.append(
            f"- {lot.lot_id} | {lot.get_stage_display()} | {lot.variety.code} | "
            f"{lot.quantity_kg}kg | {lot.get_status_display()} | Holder: {holder} | Season: {lot.season_year}"
        )
    if qs.count() > 50:
        lines.append(f"\n... and {qs.count() - 50} more lots.")
    return "\n".join(lines)


@tool
def get_seed_lot_detail(lot_id: str) -> str:
    """
    Returns the full details of a specific seed lot including variety, quantity,
    location, farmer, parent lot, and lab batch reference.
    Use when the user asks about a specific lot ID.

    Args:
        lot_id: The lot identifier (e.g. 'BR-2026-001').
    """
    from core.models import SeedLot
    try:
        lot = SeedLot.objects.select_related('variety', 'location', 'plot', 'farmer', 'parent_lot', 'created_by').get(lot_id__iexact=lot_id)
    except SeedLot.DoesNotExist:
        return f"No seed lot found with ID '{lot_id}'."

    children = lot.child_lots.all()
    child_str = ", ".join(c.lot_id for c in children) if children else "None"

    return (
        f"Seed Lot: {lot.lot_id}\n"
        f"  Stage          : {lot.get_stage_display()}\n"
        f"  Variety        : {lot.variety.name} ({lot.variety.code})\n"
        f"  Quantity       : {lot.quantity_kg} kg\n"
        f"  Status         : {lot.get_status_display()}\n"
        f"  Season         : {lot.season_year}\n"
        f"  Location       : {lot.location.name if lot.location else 'N/A'}\n"
        f"  Plot           : {lot.plot.plot_number if lot.plot else 'N/A'}\n"
        f"  Farmer         : {lot.farmer.name if lot.farmer else 'N/A'}\n"
        f"  Parent Lot     : {lot.parent_lot.lot_id if lot.parent_lot else 'None (root lot)'}\n"
        f"  Child Lots     : {child_str}\n"
        f"  Lab Batch Ref  : {lot.lab_batch_reference or 'Not linked'}\n"
        f"  Created By     : {lot.created_by.get_full_name() or lot.created_by.username}\n"
        f"  Created At     : {lot.created_at.strftime('%d %b %Y')}\n"
        f"  Notes          : {lot.notes or 'None'}"
    )


@tool
def get_seed_inventory_summary() -> str:
    """
    Returns an aggregated summary of all seed lots grouped by stage and by location.
    Use this for management-level questions like 'how much foundation seed do we have'
    or 'give me a summary of our seed inventory'.
    No arguments required.
    """
    from core.models import SeedLot
    from django.db.models import Sum, Count

    by_stage = (
        SeedLot.objects.values('stage')
        .annotate(total_kg=Sum('quantity_kg'), count=Count('id'))
        .order_by('stage')
    )
    by_location = (
        SeedLot.objects.filter(location__isnull=False)
        .values('location__name')
        .annotate(total_kg=Sum('quantity_kg'), count=Count('id'))
        .order_by('-total_kg')
    )

    stage_order = ['breeder', 'foundation', 'certified', 'commercial']
    stage_labels = {'breeder': 'Breeder', 'foundation': 'Foundation', 'certified': 'Certified', 'commercial': 'Commercial'}

    lines = ["Seed Inventory Summary\n", "By Stage:"]
    stage_map = {r['stage']: r for r in by_stage}
    for s in stage_order:
        r = stage_map.get(s)
        if r:
            lines.append(f"  {stage_labels[s]:12s}: {r['count']} lots | {float(r['total_kg']):,.1f} kg")

    lines.append("\nBy Location:")
    for r in by_location:
        lines.append(f"  {r['location__name']:15s}: {r['count']} lots | {float(r['total_kg']):,.1f} kg")

    total_kg = sum(float(r['total_kg']) for r in by_stage)
    total_lots = sum(r['count'] for r in by_stage)
    lines.append(f"\nGRAND TOTAL: {total_lots} lots | {total_kg:,.1f} kg across all stages")
    return "\n".join(lines)


@tool
def get_seed_lots_by_location(location_name: str) -> str:
    """
    Returns all seed lots at a given field location, grouped by stage.
    Use when the user asks what seeds are present at a specific location.

    Args:
        location_name: Name of the location (e.g. 'Loni', 'Rupapur').
    """
    from core.models import SeedLot
    qs = SeedLot.objects.filter(location__name__icontains=location_name).select_related('variety', 'farmer')
    if not qs.exists():
        return f"No seed lots found at location '{location_name}'."

    from collections import defaultdict
    by_stage = defaultdict(list)
    for lot in qs:
        by_stage[lot.get_stage_display()].append(
            f"    · {lot.lot_id} | {lot.variety.code} | {lot.quantity_kg}kg | {lot.get_status_display()}"
            + (f" | Farmer: {lot.farmer.name}" if lot.farmer else "")
        )

    lines = [f"Seed lots at {location_name} ({qs.count()} total):\n"]
    for stage, items in by_stage.items():
        lines.append(f"{stage}:")
        lines.extend(items)
    return "\n".join(lines)


@tool
def get_seed_lots_by_variety(variety_name: str) -> str:
    """
    Returns all seed lots for a given variety across all stages and locations.
    Use when the user asks about a specific variety's field presence.

    Args:
        variety_name: Variety name or code (e.g. 'Co-0238', 'CoLk').
    """
    from core.models import SeedLot
    qs = SeedLot.objects.filter(
        variety__name__icontains=variety_name
    ).select_related('variety', 'location', 'farmer') | SeedLot.objects.filter(
        variety__code__icontains=variety_name
    ).select_related('variety', 'location', 'farmer')
    qs = qs.distinct()

    if not qs.exists():
        return f"No seed lots found for variety '{variety_name}'."

    lines = [f"Seed lots for variety '{variety_name}' ({qs.count()} total):\n"]
    for lot in qs:
        holder = lot.farmer.name if lot.farmer else (lot.location.name if lot.location else "Unassigned")
        lines.append(
            f"- {lot.lot_id} | {lot.get_stage_display()} | {lot.quantity_kg}kg | "
            f"{lot.get_status_display()} | {holder} | Season {lot.season_year}"
        )
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 13 — Seed Lot Transactions (Audit Trail)
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_transactions_for_lot(lot_id: str) -> str:
    """
    Returns the full transaction history for a specific seed lot — all dispatches,
    harvest returns, transfers, and status changes in chronological order.
    Use when the user wants to trace the history or audit trail of a lot.

    Args:
        lot_id: The lot identifier (e.g. 'BR-2026-001').
    """
    from core.models import SeedLotTransaction
    txns = SeedLotTransaction.objects.filter(
        seed_lot__lot_id__iexact=lot_id
    ).select_related('farmer', 'location', 'recorded_by').order_by('recorded_at')

    if not txns.exists():
        return f"No transactions found for lot '{lot_id}'."

    lines = [f"Transaction history for {lot_id}:\n"]
    for t in txns:
        parts = [f"[{t.recorded_at.strftime('%d %b %Y')}] {t.get_txn_type_display()}"]
        if t.quantity_kg:
            parts.append(f"Qty: {t.quantity_kg}kg")
        if t.farmer:
            parts.append(f"Farmer: {t.farmer.name}")
        if t.location:
            parts.append(f"Location: {t.location.name}")
        if t.notes:
            parts.append(f"Note: {t.notes}")
        parts.append(f"By: {t.recorded_by.get_full_name() or t.recorded_by.username}")
        lines.append("  " + " | ".join(parts))
    return "\n".join(lines)


@tool
def get_recent_dispatches(days: int = 30) -> str:
    """
    Returns all seed dispatch transactions in the last N days.
    Shows who received what quantity, from which lot, and at which location.
    Use when the user asks about recent dispatches, deliveries, or seed distribution.

    Args:
        days: Number of past days to look back (default 30).
    """
    from core.models import SeedLotTransaction
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=days)
    txns = SeedLotTransaction.objects.filter(
        txn_type='dispatch',
        recorded_at__gte=cutoff
    ).select_related('seed_lot__variety', 'farmer', 'location').order_by('-recorded_at')

    if not txns.exists():
        return f"No dispatch transactions found in the last {days} days."

    lines = [f"Dispatches in the last {days} days ({txns.count()} records):\n"]
    for t in txns:
        farmer_name = t.farmer.name if t.farmer else "—"
        loc_name = t.location.name if t.location else "—"
        lines.append(
            f"- {t.recorded_at.strftime('%d %b %Y')} | Lot: {t.seed_lot.lot_id} "
            f"({t.seed_lot.variety.code}) | {t.quantity_kg}kg → Farmer: {farmer_name} | Location: {loc_name}"
        )
    return "\n".join(lines)


@tool
def get_harvest_summary(location_name: str = "") -> str:
    """
    Returns aggregated harvest quantities received from farmers.
    Optionally filter by location. Use when the user asks about harvest totals,
    yield, or how much seed was returned from the field.

    Args:
        location_name: Optional. Filter by location name. Leave blank for all locations.
    """
    from core.models import SeedLotTransaction
    from django.db.models import Sum

    qs = SeedLotTransaction.objects.filter(txn_type='harvest')
    if location_name:
        qs = qs.filter(location__name__icontains=location_name)

    if not qs.exists():
        return f"No harvest records found{' for ' + location_name if location_name else ''}."

    total = qs.aggregate(total=Sum('quantity_kg'))['total'] or 0

    by_location = (
        qs.values('location__name')
        .annotate(total_kg=Sum('quantity_kg'))
        .order_by('-total_kg')
    )

    lines = [f"Harvest Summary{' — ' + location_name if location_name else ''}:\n"]
    for row in by_location:
        loc = row['location__name'] or 'Unknown'
        lines.append(f"  {loc:15s}: {float(row['total_kg']):,.1f} kg")
    lines.append(f"\nTOTAL HARVESTED: {float(total):,.1f} kg")
    return "\n".join(lines)


@tool
def get_farmer_transaction_history(farmer_name: str) -> str:
    """
    Returns all dispatch and harvest transactions involving a specific farmer.
    Use when the user wants to know a farmer's complete seed exchange record.

    Args:
        farmer_name: Full or partial name of the farmer.
    """
    from core.models import SeedLotTransaction
    txns = SeedLotTransaction.objects.filter(
        farmer__name__icontains=farmer_name
    ).select_related('seed_lot__variety', 'location', 'recorded_by').order_by('-recorded_at')

    if not txns.exists():
        return f"No transactions found for farmer '{farmer_name}'."

    lines = [f"Transaction history for farmer '{farmer_name}' ({txns.count()} records):\n"]
    for t in txns:
        loc = t.location.name if t.location else "—"
        qty = f"{t.quantity_kg}kg" if t.quantity_kg else "—"
        lines.append(
            f"- [{t.recorded_at.strftime('%d %b %Y')}] {t.get_txn_type_display()} | "
            f"Lot: {t.seed_lot.lot_id} ({t.seed_lot.variety.code}) | {qty} | Location: {loc}"
        )
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN 14 — Cross-Module (LabNest × FieldLink)
# ═══════════════════════════════════════════════════════════════════════════════

@tool
def get_variety_full_pipeline(variety_name: str) -> str:
    """
    Returns the complete end-to-end pipeline status for a variety — combining
    LabNest production data (initiation through transplantation) with FieldLink
    field data (seed lots, locations, farmers). Supports both variety name and code.
    Use when the user asks to trace a variety from lab to field, or wants a
    full pipeline or lifecycle report for a specific variety.

    Args:
        variety_name: Variety name or code (e.g. 'Co-0238', 'CoLk 8001').
    """
    from core.models import (
        Variety, InitiationLog, MultiplicationLog, RootingLog,
        HardeningLog, TransplantationLog, SeedLot
    )
    from django.db.models import Sum

    # Find variety (support both name and code)
    variety = None
    for v in Variety.objects.all():
        if variety_name.lower() in v.name.lower() or variety_name.lower() in v.code.lower():
            variety = v
            break

    if not variety:
        return f"No variety found matching '{variety_name}'."

    # ── LabNest Production ──
    init_total   = InitiationLog.objects.filter(variety=variety).aggregate(t=Sum('bottles_inoculated'))['t'] or 0
    mult_total   = MultiplicationLog.objects.filter(variety=variety).aggregate(t=Sum('bottles_produced'))['t'] or 0
    root_total   = RootingLog.objects.filter(variety=variety).aggregate(t=Sum('rooting_bottles'))['t'] or 0
    hard_total   = HardeningLog.objects.filter(variety=variety).aggregate(t=Sum('seedlings_transplanted'))['t'] or 0
    trans_total  = TransplantationLog.objects.filter(variety=variety).aggregate(t=Sum('seedlings_transplanted'))['t'] or 0

    # ── FieldLink Seed Lots ──
    lots = SeedLot.objects.filter(variety=variety).select_related('location', 'farmer')
    lot_count  = lots.count()
    total_kg   = float(lots.aggregate(t=Sum('quantity_kg'))['t'] or 0)
    in_field   = lots.filter(status='in_field')
    harvested  = lots.filter(status='harvested')
    dispatched = lots.filter(status='dispatched')

    lines = [
        f"Full Pipeline Report — {variety.name} ({variety.code})\n",
        "━━ LabNest (Tissue Culture Production) ━━",
        f"  Initiation (bottles inoculated) : {init_total:,}",
        f"  Multiplication (bottles produced): {mult_total:,}",
        f"  Rooting (rooting bottles)        : {root_total:,}",
        f"  Hardening (seedlings)            : {hard_total:,}",
        f"  Transplanted to field            : {trans_total:,}",
        "",
        "━━ FieldLink (Seed Multiplication) ━━",
        f"  Total Seed Lots     : {lot_count}",
        f"  Total Quantity      : {total_kg:,.1f} kg",
        f"  In Field            : {in_field.count()} lots",
        f"  Harvested           : {harvested.count()} lots",
        f"  Dispatched          : {dispatched.count()} lots",
    ]

    if in_field.exists():
        lines.append("\n  Active Field Lots:")
        for lot in in_field[:10]:
            holder = lot.farmer.name if lot.farmer else (lot.location.name if lot.location else "—")
            lines.append(f"    · {lot.lot_id} [{lot.get_stage_display()}] — {lot.quantity_kg}kg @ {holder}")

    return "\n".join(lines)


@tool
def get_active_varieties_in_both_modules() -> str:
    """
    Lists varieties that are simultaneously active in LabNest (recent production logs)
    AND in FieldLink (seed lots with status 'in_field').
    Use when the user asks which varieties are in both lab and field, or for a
    cross-module activity overview.
    No arguments required.
    """
    from core.models import Variety, InitiationLog, SeedLot
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=90)

    # Varieties active in lab (any log in last 90 days)
    lab_active_ids = set(
        InitiationLog.objects.filter(date__gte=cutoff.date())
        .values_list('variety_id', flat=True)
    )

    # Varieties active in field
    field_active_ids = set(
        SeedLot.objects.filter(status='in_field')
        .values_list('variety_id', flat=True)
    )

    both = lab_active_ids & field_active_ids

    if not both:
        return "No varieties are currently active in both LabNest and FieldLink simultaneously."

    varieties = Variety.objects.filter(id__in=both)
    lines = [f"Varieties active in BOTH LabNest & FieldLink ({len(both)} found):\n"]
    for v in varieties:
        field_lots = SeedLot.objects.filter(variety=v, status='in_field').count()
        lines.append(f"- {v.name} ({v.code}) | Field: {field_lots} active lot(s)")
    return "\n".join(lines)


ALL_TOOLS = [
    # Domain 1 — Chemical Inventory
    get_all_chemicals_stock,
    get_expiring_chemicals,
    get_low_stock_chemicals,
    get_chemical_detail,
    # Domain 2 — Stock Solutions
    get_stock_solution_inventory,
    get_critical_stock_solutions,
    get_stock_solution_preparations,
    get_stock_solution_recipe,
    # Domain 3 — Contamination
    get_contamination_summary,
    get_contamination_by_variety,
    # Domain 4 — Production
    get_production_summary,
    get_stage_production_history,
    # Domain 5 — Mortality
    get_mortality_summary,
    # Domain 6 — Expenses
    get_expenses_summary,
    # Domain 7 — Dashboard
    get_dashboard_snapshot,
    # Domain 8 — Reports / Email / RAG / Charts
    send_weekly_lab_report,
    send_chemical_expiry_alert,
    search_lab_protocols,
    render_chart_in_ui,
    send_progress_report,
    send_expenses_report,
    # Domain 9 — Manpower & Payroll
    get_manpower_payroll_summary,
    get_technician_salary,
    get_manpower_cost_for_period,
    # Domain 10 — Field Locations & Plots
    get_all_field_locations,
    get_plots_by_location,
    get_plot_details,
    get_total_acreage_by_location,
    # Domain 11 — Farmers
    get_all_farmers,
    get_farmer_detail,
    get_top_farmers_by_quality,
    # Domain 12 — Seed Lots
    get_all_seed_lots,
    get_seed_lot_detail,
    get_seed_inventory_summary,
    get_seed_lots_by_location,
    get_seed_lots_by_variety,
    # Domain 13 — Seed Lot Transactions
    get_transactions_for_lot,
    get_recent_dispatches,
    get_harvest_summary,
    get_farmer_transaction_history,
    # Domain 14 — Cross-Module (LabNest × FieldLink)
    get_variety_full_pipeline,
    get_active_varieties_in_both_modules,
]

