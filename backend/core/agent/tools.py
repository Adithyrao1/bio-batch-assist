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
        if result.status == 'SUCCESS':
            return (
                f"✅ Weekly lab performance report has been sent to **{recipient_email}**! "
                "It includes production, contamination, inventory, and team metrics for the past 7 days."
            )
        return f"⚠️ Report task completed but returned an unexpected status: {result.status}"
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
    from core.tasks import send_chemical_expiry_digest

    try:
        result = send_chemical_expiry_digest.apply(args=[recipient_email])
        if result.status == 'SUCCESS':
            return (
                f"✅ Chemical expiry alert has been sent to **{recipient_email}**! "
                "It includes a full list of chemicals expiring within the next 30 days."
            )
        return f"⚠️ Task completed but returned an unexpected status: {result.status}"
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
    Use this tool ONLY when the user asks for a chart, graph, or visual representation.
    First use database tools to get the data. Then pass the data here as a JSON string.
    chart_type must be exactly one of: 'bar', 'pie', 'line'.
    data_points_json MUST be a valid JSON array string like: [{"name": "Category A", "value": 15}, {"name": "Category B", "value": 20}]
    IMPORTANT: You must copy the exact returned string into your final answer.
    """
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
        email_progress_report_task.apply_async(args=[start_date, end_date, recipient_email])
        return f"✅ The Progress Report ({start_date} to {end_date}) is being generated and will be emailed to **{recipient_email}** shortly."
    except Exception as e:
        return f"❌ Failed to enqueue progress report task: {str(e)}"

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
        email_expenses_report_task.apply_async(args=[start_date, end_date, recipient_email])
        return f"✅ The Expenses Report ({start_date} to {end_date}) is being generated and will be emailed to **{recipient_email}** shortly."
    except Exception as e:
        return f"❌ Failed to enqueue expenses report task: {str(e)}"


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


ALL_TOOLS = [
    # Domain 1
    get_all_chemicals_stock,
    get_expiring_chemicals,
    get_low_stock_chemicals,
    get_chemical_detail,
    # Domain 2
    get_stock_solution_inventory,
    get_critical_stock_solutions,
    get_stock_solution_preparations,
    get_stock_solution_recipe,
    # Domain 3
    get_contamination_summary,
    get_contamination_by_variety,
    # Domain 4
    get_production_summary,
    get_stage_production_history,
    # Domain 5
    get_mortality_summary,
    # Domain 6
    get_expenses_summary,
    # Domain 7
    get_dashboard_snapshot,
    # Domain 8
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
]
