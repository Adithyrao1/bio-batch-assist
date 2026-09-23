"""
Celery tasks for bio_batch_assist.

T1  send_weekly_lab_digest         – Beat: Monday 07:00 UTC — full weekly lab performance digest
T2  send_chemical_inventory_digest – Beat: daily digest of low-stock and expiring chemicals
T3  run_llm_agent_task             – Async LLM call via LangGraph agent (exponential backoff)
"""

import logging
import os
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone

logger = logging.getLogger(__name__)

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")

def _html_to_pdf(html: str) -> bytes:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(html, wait_until="networkidle")
        pdf_bytes = page.pdf(
            format="A4",
            margin={"top": "16mm", "bottom": "16mm", "left": "14mm", "right": "14mm"},
            print_background=True,
        )
        browser.close()
    return pdf_bytes

# ---------------------------------------------------------------------------
# T1 – Weekly lab performance digest
# ---------------------------------------------------------------------------
@shared_task
def send_weekly_lab_digest(recipient_email: str = ""):
    from django.db.models import Sum, Count
    from .models import (
        StockSolutionPreparation, InitiationLog, MultiplicationLog, RootingLog, HardeningLog, TransplantationLog,
        Chemical, StockSolutionChemicalUsage, User
    )

    today = timezone.now().date()
    week_start = today - timedelta(days=7)

    # 1. PRODUCTIVITY
    stock_qs = StockSolutionPreparation.objects.filter(date__gte=week_start, date__lt=today)
    total_preps = stock_qs.count()
    total_volume = stock_qs.aggregate(s=Sum("volume_prepared"))["s"] or 0

    init_qs = InitiationLog.objects.filter(date__gte=week_start, date__lt=today)
    mult_qs = MultiplicationLog.objects.filter(date__gte=week_start, date__lt=today)
    root_qs = RootingLog.objects.filter(date__gte=week_start, date__lt=today)
    hard_qs = HardeningLog.objects.filter(date__gte=week_start, date__lt=today)
    trans_qs = TransplantationLog.objects.filter(date__gte=week_start, date__lt=today)

    inoculated = init_qs.aggregate(s=Sum("bottles_inoculated"))["s"] or 0
    multiplied = mult_qs.aggregate(s=Sum("bottles_produced"))["s"] or 0
    rooted_basal = root_qs.aggregate(s=Sum("basal_bottles"))["s"] or 0
    rooted_rooting = root_qs.aggregate(s=Sum("rooting_bottles"))["s"] or 0
    hardened = hard_qs.aggregate(s=Sum("seedlings_transplanted"))["s"] or 0
    transplanted = trans_qs.aggregate(s=Sum("seedlings_transplanted"))["s"] or 0

    # 2. QUALITY
    init_contam = init_qs.aggregate(s=Sum("contaminated_bottles"))["s"] or 0
    mult_contam = mult_qs.aggregate(s=Sum("contaminated_bottles"))["s"] or 0
    root_contam = root_qs.aggregate(s=Sum("contaminated_bottles"))["s"] or 0
    hard_died = hard_qs.aggregate(s=Sum("seedlings_died"))["s"] or 0
    trans_died = trans_qs.aggregate(s=Sum("seedlings_died"))["s"] or 0
    total_contam = init_contam + mult_contam + root_contam

    # 3. INVENTORY
    chemical_consumption = (
        StockSolutionChemicalUsage.objects.filter(preparation__date__gte=week_start, preparation__date__lt=today)
        .values("chemical__name", "chemical__unit")
        .annotate(consumed=Sum("quantity_consumed"))
        .order_by("-consumed")[:10]
    )
    low_stock = Chemical.objects.filter(
        remaining_stock__gt=0, quantity__gt=0
    ).extra(where=["remaining_stock * 5.0 < quantity"]).order_by("remaining_stock")
    expiring_soon = Chemical.objects.filter(
        expiry_date__gte=today, expiry_date__lte=today + timedelta(days=14)
    ).order_by("expiry_date")

    # 4. PEOPLE
    new_users = User.objects.filter(date_joined__date__gte=week_start, date_joined__date__lt=today).count()
    active_users = User.objects.filter(status='active').count()

    def _kpi(label, value, sub="", color="#7c3aed"):
        return (
            f'<div style="flex:1;min-width:120px;background:linear-gradient(135deg,#ffffff,#faf5ff);'
            f'border-radius:10px;padding:14px 16px;border-left:4px solid {color};box-shadow:0 1px 4px rgba(0,0,0,0.06);">'
            f'<p style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;margin:0 0 6px 0;">{label}</p>'
            f'<p style="color:{color};font-size:26px;font-weight:800;margin:0;line-height:1;">{value}</p>'
            f'<p style="color:#94a3b8;font-size:10px;margin:4px 0 0 0;">{sub}</p>'
            f'</div>'
        )

    def _kpi_row(*cells):
        return f'<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">{"".join(cells)}</div>'

    def _rows(items, cols):
        html = ""
        for i, item in enumerate(items):
            bg = "#ffffff" if i % 2 == 0 else "#f5f3ff"
            cells = "".join(f'<td style="padding:8px 12px;font-size:12px;background:{bg};">{item.get(c, "—")}</td>' for c in cols)
            html += f"<tr>{cells}</tr>"
        return html or '<tr><td colspan="10" style="padding:10px;color:#94a3b8;">No data this week</td></tr>'

    def _table(headers, rows_html, accent="#7c3aed"):
        ths = "".join(f'<th style="padding:9px 12px;text-align:left;color:#fff;font-size:11px;background:{accent};">{h}</th>' for h in headers)
        return f'<table width="100%" style="border-collapse:collapse;margin-top:8px;border:1px solid #e2e8f0;"><thead><tr>{ths}</tr></thead><tbody>{rows_html}</tbody></table>'

    def _section(title, body, accent="#7c3aed"):
        return f'<div style="margin-bottom:28px;"><table width="100%" style="background:{accent};margin-bottom:14px;"><tr><td style="padding:9px 16px;"><span style="color:#fff;font-size:13px;font-weight:bold;">{title}</span></td></tr></table>{body}</div>'

    def _label(text, color="#475569"):
        return f'<p style="color:{color};font-size:12px;font-weight:bold;margin:14px 0 4px 0;">{text}</p>'

    productivity_body = _kpi_row(
        _kpi("Stock Preps", total_preps, "this week", "#7c3aed"),
        _kpi("Vol Prepared", total_volume, "Liters / mL", "#06b6d4"),
        _kpi("Inoculated", inoculated, "bottles", "#10b981")
    ) + _kpi_row(
        _kpi("Multiplied", multiplied, "bottles", "#10b981"),
        _kpi("Rooted", rooted_basal + rooted_rooting, "bottles", "#10b981"),
        _kpi("Transplanted", transplanted, "seedlings", "#10b981")
    )

    quality_body = _kpi_row(
        _kpi("Contaminated", total_contam, "bottles total", "#f43f5e"),
        _kpi("Hardening Died", hard_died, "seedlings", "#f59e0b"),
        _kpi("Transplant Died", trans_died, "seedlings", "#ef4444")
    )

    chem_rows = _rows([{"Chemical": r["chemical__name"], "Consumed": f'{float(r["consumed"] or 0)} {r["chemical__unit"]}'} for r in chemical_consumption], ["Chemical", "Consumed"])
    low_stock_rows = _rows([{"Chemical": c.name, "Remaining": f"{c.remaining_stock} {c.unit}"} for c in low_stock], ["Chemical", "Remaining"])
    expiry_rows = _rows([{"Chemical": c.name, "Expires On": str(c.expiry_date)} for c in expiring_soon], ["Chemical", "Expires On"])

    inventory_body = (
        _label("Top Chemicals Consumed This Week") + _table(["Chemical", "Consumed"], chem_rows, "#0891b2") +
        _label("Low Stock Alerts", "#dc2626") + _table(["Chemical", "Remaining"], low_stock_rows, "#dc2626") +
        _label("Expiring Within 14 Days", "#b45309") + _table(["Chemical", "Expires On"], expiry_rows, "#d97706")
    )

    people_body = _kpi_row(_kpi("Active Users", active_users, "", "#06b6d4"), _kpi("New Users", new_users, "this week", "#10b981"))

    html_content = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{{font-family:sans-serif;font-size:12px;color:#1e293b;margin:0;padding:0;}}</style></head><body>
    <table width="100%" style="background:#3b0764;margin-bottom:24px;"><tr><td style="padding:22px;">
    <h1 style="color:#fff;margin:0;">Weekly Lab Performance Digest</h1><p style="color:#c4b5fd;margin:0;">{week_start} to {today - timedelta(days=1)}</p>
    </td></tr></table>
    {_section("Productivity & Operations", productivity_body, "#7c3aed")}
    {_section("Quality & Losses", quality_body, "#e11d48")}
    {_section("Inventory", inventory_body, "#0891b2")}
    {_section("Users", people_body, "#4f46e5")}
    </body></html>"""

    try:
        pdf_bytes = _html_to_pdf(html_content)
        msg = EmailMessage(
            f"Weekly Lab Digest — {week_start} to {today - timedelta(days=1)}",
            "See attached PDF for the full breakdown.",
            settings.EMAIL_HOST_USER,
            [recipient_email or ADMIN_EMAIL]
        )
        msg.attach(f"weekly_digest.pdf", pdf_bytes, "application/pdf")
        msg.send(fail_silently=False)
        return "Weekly digest sent."
    except Exception as exc:
        logger.error("Failed to send digest: %s", exc)
        return f"Failed: {exc}"

# ---------------------------------------------------------------------------
# T2 – Chemical Inventory Digest
# ---------------------------------------------------------------------------
@shared_task
def send_chemical_inventory_digest(recipient_email: str = ""):
    """Send a digest of chemicals that are low in stock or expiring soon."""
    from .models import Chemical

    today = timezone.now().date()
    cutoff = today + timedelta(days=30)

    # Low stock: remaining is less than 20% of original quantity
    low_stock = list(Chemical.objects.filter(
        remaining_stock__gt=0, quantity__gt=0
    ).extra(where=["remaining_stock * 5.0 < quantity"]).order_by("remaining_stock"))

    expiring = list(Chemical.objects.filter(
        expiry_date__isnull=False, expiry_date__gte=today, expiry_date__lte=cutoff
    ).order_by("expiry_date"))

    if not low_stock and not expiring:
        return "No inventory alerts."

    rows_html = ""
    if low_stock:
        rows_html += "<tr><td colspan='3' style='background:#fef2f2;padding:8px;font-weight:bold;color:#dc2626;'>LOW STOCK ALERTS (&lt; 20% Remaining)</td></tr>"
        for c in low_stock:
            rows_html += f"<tr><td style='padding:8px;border-bottom:1px solid #e2e8f0;'>{c.name}</td><td style='padding:8px;color:#dc2626;border-bottom:1px solid #e2e8f0;font-weight:bold;'>{c.remaining_stock} {c.unit}</td><td style='padding:8px;border-bottom:1px solid #e2e8f0;'>{c.quantity} {c.unit} (Orig)</td></tr>"
    
    if expiring:
        rows_html += "<tr><td colspan='3' style='background:#fffbeb;padding:8px;font-weight:bold;color:#d97706;margin-top:10px;'>EXPIRING WITHIN 30 DAYS</td></tr>"
        for c in expiring:
            rows_html += f"<tr><td style='padding:8px;border-bottom:1px solid #e2e8f0;'>{c.name}</td><td style='padding:8px;border-bottom:1px solid #e2e8f0;'>{c.remaining_stock} {c.unit}</td><td style='padding:8px;color:#d97706;border-bottom:1px solid #e2e8f0;font-weight:bold;'>{c.expiry_date}</td></tr>"

    html_content = f"""
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:12px;">
        <h2 style="color:#1e293b;text-align:center;">Daily Chemical Inventory Digest</h2>
        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;">
            <thead>
                <tr style="background-color:#f1f5f9;">
                    <th style="padding:10px 8px;text-align:left;color:#64748b;font-size:13px;">Chemical</th>
                    <th style="padding:10px 8px;text-align:left;color:#64748b;font-size:13px;">Remaining</th>
                    <th style="padding:10px 8px;text-align:left;color:#64748b;font-size:13px;">Threshold / Expiry</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        <p style="color:#64748b;font-size:12px;margin-top:20px;">Please review the inventory and arrange replacements as needed.</p>
    </div>
    """

    try:
        pdf_bytes = _html_to_pdf(html_content)
        msg = EmailMessage(
            f"DCM LabNest: Chemical Inventory Alerts ({today})",
            "Please review the attached chemical inventory alerts.",
            settings.EMAIL_HOST_USER,
            [recipient_email or ADMIN_EMAIL]
        )
        msg.attach(f"inventory_digest_{today}.pdf", pdf_bytes, "application/pdf")
        msg.send(fail_silently=False)
        return "Inventory digest sent."
    except Exception as exc:
        logger.error("Failed to send inventory digest: %s", exc)
        return f"Failed: {exc}"


# Alias so legacy imports of the old name (send_chemical_expiry_digest) still work
send_chemical_expiry_digest = send_chemical_inventory_digest


# ---------------------------------------------------------------------------
# Excel Report Generation Tasks
# ---------------------------------------------------------------------------

@shared_task(bind=True)
def generate_production_excel_task(self, start_date_str, end_date_str, tech_ids, var_ids):
    import base64
    from django.core.cache import cache
    from core.reports_excel import build_production_excel
    try:
        file_bytes, filename = build_production_excel(start_date_str, end_date_str, tech_ids, var_ids)
        encoded_data = base64.b64encode(file_bytes).decode('utf-8')
        cache_key = f"report:excel:{self.request.id}"
        cache.set(cache_key, {
            'data': encoded_data,
            'filename': filename,
            'content_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }, timeout=300)
        return "SUCCESS"
    except Exception as e:
        logger.error(f"Error generating production excel: {str(e)}")
        raise e

@shared_task(bind=True)
def generate_expenses_excel_task(self, start_date_str, end_date_str):
    import base64
    from django.core.cache import cache
    from core.reports_excel import build_expenses_excel
    try:
        file_bytes, filename = build_expenses_excel(start_date_str, end_date_str)
        encoded_data = base64.b64encode(file_bytes).decode('utf-8')
        cache_key = f"report:excel:{self.request.id}"
        cache.set(cache_key, {
            'data': encoded_data,
            'filename': filename,
            'content_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }, timeout=300)
        return "SUCCESS"
    except Exception as e:
        logger.error(f"Error generating expenses excel: {str(e)}")
        raise e

# ---------------------------------------------------------------------------
# dbt Analytics Pipeline Tasks
# ---------------------------------------------------------------------------
def _export_qs_to_csv(qs_values, filename, raw_data_dir, default_headers):
    import csv
    import os
    csv_path = os.path.join(raw_data_dir, filename)
    headers = list(qs_values[0].keys()) if qs_values else default_headers
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        if qs_values:
            for row in qs_values:
                writer.writerow(row)

@shared_task
def run_analytics_pipeline():
    """
    Exports necessary tables to CSV and runs dbt to update DuckDB models.
    """
    import os
    import subprocess
    from django.conf import settings
    from django.db.models import F
    from .models import (
        InitiationLog, MultiplicationLog, RootingLog, HardeningLog, TransplantationLog,
        Expense, StockSolutionChemicalUsage
    )
    
    # 1. Export Data to CSV
    raw_data_dir = os.path.join(settings.BASE_DIR, 'raw_data')
    os.makedirs(raw_data_dir, exist_ok=True)
    
    # Export Staging Logs (Ensuring headers exist even if table is empty)
    _export_qs_to_csv(
        list(InitiationLog.objects.all().values('date', 'technician_id', 'variety_id', 'bottles_inoculated', 'contaminated_bottles')),
        'initiation_logs_raw.csv', raw_data_dir,
        ['date', 'technician_id', 'variety_id', 'bottles_inoculated', 'contaminated_bottles']
    )
    _export_qs_to_csv(
        list(MultiplicationLog.objects.all().values('date', 'technician_id', 'variety_id', 'bottles_produced', 'contaminated_bottles')),
        'multiplication_logs_raw.csv', raw_data_dir,
        ['date', 'technician_id', 'variety_id', 'bottles_produced', 'contaminated_bottles']
    )
    _export_qs_to_csv(
        list(RootingLog.objects.all().values('date', 'technician_id', 'variety_id', 'basal_bottles', 'rooting_bottles', 'contaminated_bottles')),
        'rooting_logs_raw.csv', raw_data_dir,
        ['date', 'technician_id', 'variety_id', 'basal_bottles', 'rooting_bottles', 'contaminated_bottles']
    )
    _export_qs_to_csv(
        list(HardeningLog.objects.all().values('date', 'technician_id', 'variety_id', 'seedlings_transplanted', 'seedlings_died')),
        'hardening_logs_raw.csv', raw_data_dir,
        ['date', 'technician_id', 'variety_id', 'seedlings_transplanted', 'seedlings_died']
    )
    _export_qs_to_csv(
        list(TransplantationLog.objects.all().values('date', 'technician_id', 'variety_id', 'seedlings_transplanted', 'seedlings_died')),
        'transplantation_logs_raw.csv', raw_data_dir,
        ['date', 'technician_id', 'variety_id', 'seedlings_transplanted', 'seedlings_died']
    )
    
    # Export Expenses
    _export_qs_to_csv(
        list(Expense.objects.all().values('date', 'amount')),
        'expenses_raw.csv', raw_data_dir,
        ['date', 'amount']
    )
    
    # Export Varieties
    from .models import Variety
    _export_qs_to_csv(
        list(Variety.objects.all().values('id', 'code')),
        'varieties_raw.csv', raw_data_dir,
        ['id', 'code']
    )
    
    # Export Chemical Usages (join price from Chemical model)
    chem_usages_qs = StockSolutionChemicalUsage.objects.all().annotate(
        date=F('preparation__date'),
        unit_price=F('chemical__unit_price')
    ).values('date', 'quantity_consumed', 'unit_price')
    
    _export_qs_to_csv(
        list(chem_usages_qs),
        'chemical_usages_raw.csv', raw_data_dir,
        ['date', 'quantity_consumed', 'unit_price']
    )
                
    # 2. Run dbt Pipeline
    dbt_dir = os.path.join(settings.BASE_DIR, 'lab_analytics')
    try:
        import sys
        # Find the dbt executable inside the current Python virtual environment
        dbt_exe = os.path.join(os.path.dirname(sys.executable), 'dbt.exe' if os.name == 'nt' else 'dbt')
        dbt_cmd = dbt_exe if os.path.exists(dbt_exe) else "dbt"
        
        # We specify --profiles-dir so dbt knows where to find profiles.yml
        # We specify cwd=dbt_dir so DuckDB resolves relative paths relative to the project folder
        subprocess.run([dbt_cmd, "run", "--project-dir", dbt_dir, "--profiles-dir", dbt_dir], cwd=dbt_dir, check=True)
        return "Analytics pipeline completed successfully."
    except subprocess.CalledProcessError as e:
        logger.error(f"dbt run failed: {e}")
        return f"dbt pipeline failed: {e}"

# ---------------------------------------------------------------------------
# AI Agent Email Report Tasks
# ---------------------------------------------------------------------------
@shared_task
def email_progress_report_task(start_date_str: str, end_date_str: str, recipient_email: str):
    from core.reports_excel import build_production_excel

    try:
        wb_bytes, filename = build_production_excel(start_date_str, end_date_str, None, None)
        
        email = EmailMessage(
            subject=f"DCM LabNest: Progress Report ({start_date_str} to {end_date_str})",
            body="Please find attached the requested Progress Report.",
            from_email=settings.EMAIL_HOST_USER,
            to=[recipient_email],
        )
        email.attach(filename, wb_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        email.send(fail_silently=False)
        return f"Progress report emailed successfully to {recipient_email}."
    except Exception as e:
        logger.error(f"Failed to email progress report: {str(e)}")
        return f"Failed to email progress report: {str(e)}"

@shared_task
def email_expenses_report_task(start_date_str: str, end_date_str: str, recipient_email: str):
    from core.reports_excel import build_expenses_excel

    try:
        wb_bytes, filename = build_expenses_excel(start_date_str, end_date_str)
        
        email = EmailMessage(
            subject=f"DCM LabNest: Expenses Report ({start_date_str} to {end_date_str})",
            body="Please find attached the requested Expenses Report.",
            from_email=settings.EMAIL_HOST_USER,
            to=[recipient_email],
        )
        email.attach(filename, wb_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        email.send(fail_silently=False)
        return f"Expenses report emailed successfully to {recipient_email}."
    except Exception as e:
        logger.error(f"Failed to email expenses report: {str(e)}")
        return f"Failed to email expenses report: {str(e)}"


# ============================================================
# T3 – LLM Agent Task (exponential backoff retry)
# ============================================================

# Exceptions that warrant a retry (transient API / network failures).
_LLM_RETRYABLE = (
    Exception,  # broad catch; Celery will still surface non-retryable errors
                # after max_retries is exhausted.
)

@shared_task(
    bind=True,
    name="core.tasks.run_llm_agent_task",
    # --- retry policy ---------------------------------------------------
    autoretry_for=_LLM_RETRYABLE,
    max_retries=5,
    retry_backoff=True,        # exponential backoff: 1s, 2s, 4s, 8s, 16s …
    retry_backoff_max=120,     # cap individual wait at 2 minutes
    retry_jitter=True,         # randomise each wait to avoid thundering herd
    # --- result / timeout -----------------------------------------------
    soft_time_limit=240,       # sends SoftTimeLimitExceeded at 240 s
    time_limit=270,            # hard-kills worker process at 270 s
    ignore_result=False,
)
def run_llm_agent_task(self, user_id: int, user_full_name: str, user_email: str,
                       message: str, thread_id: str, user_role: str = 'viewer') -> str:
    """
    Execute the LangGraph ReAct agent for a single user message and return
    the assistant's reply as a plain string.

    Retried with exponential back-off on any transient failure.
    """
    from core.agent.agent import get_agent
    from langchain_core.messages import SystemMessage, HumanMessage

    agent = get_agent()

    # Build role-based access restriction instructions
    if user_role == 'admin':
        role_instructions = (
            "This user has the 'admin' role and has FULL ACCESS to all modules and data, "
            "including expenses, salaries, manpower costs, LabNest, FieldLink, and cross-module queries."
        )
    elif user_role == 'technician':
        role_instructions = (
            "This user has the 'technician' role. STRICT RESTRICTIONS APPLY:\n"
            "1. Answer ONLY queries related to LabNest (tissue culture lab operations): "
            "production stages, contamination, chemicals, stock solutions, recipes, protocols, and SOPs.\n"
            "2. Do NOT answer any questions about expenses, salaries, manpower costs, or financial data — "
            "these are restricted to admin users only. If asked, politely inform the user they do not have permission.\n"
            "3. Do NOT answer any FieldLink queries (farmers, field plots, seed lots, locations, harvests, dispatches) "
            "or cross-module pipeline queries. If asked, politely inform the user that FieldLink access is not available for technician accounts.\n"
            "4. Do NOT route to the field_agent under any circumstances for this user."
        )
    else:
        # viewer or any other role
        role_instructions = (
            "This user has the 'viewer' role and has READ-ONLY access to lab and field data. "
            "Do NOT answer any questions about expenses, salaries, manpower costs, or financial data — "
            "these are restricted to admin users only. If asked, politely inform the user they do not have permission.\n"
            "Do NOT send or trigger any emails or reports of any kind — "
            "email/report tasks (send_progress_report, send_expenses_report, send_weekly_lab_report, "
            "send_chemical_expiry_alert) are restricted to admin and technician roles only. "
            "If asked to send a report or email, politely inform the user they do not have permission."
        )

    user_context = SystemMessage(content=(
        f"The currently logged-in user is: {user_full_name} "
        f"(email: {user_email}, role: {user_role}). "
        f"When sending any report or alert email, ALWAYS use '{user_email}' "
        f"as the recipient_email argument. Do not ask the user for their email.\n\n"
        f"ACCESS CONTROL — {role_instructions}"
    ))

    inputs = {"messages": [user_context, HumanMessage(content=message)]}
    config = {"configurable": {"thread_id": thread_id}}

    result = agent.invoke(inputs, config=config)

    messages = result.get("messages", [])
    if messages:
        return messages[-1].content

    return "I was unable to generate a response. Please try again."

