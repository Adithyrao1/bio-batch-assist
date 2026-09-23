"""
core/agent/agent.py

Assembles the LangChain ReAct agent used by AIAssistantView.

The agent:
  - Uses a ChatOpenAI-compatible LLM (configured for DeepSeek)
  - Is given all 17 read-only tools from tools.py
  - Follows the ReAct (Reason + Act) pattern:
      Thought → Tool call → Observation → ... → Final Answer
  - Supports optional chat history for multi-turn conversations
"""

import os
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_openai import ChatOpenAI
from django.conf import settings

from .tools import ALL_TOOLS

# Initialize persistent memory checkpointer.
# WAL mode allows concurrent reads alongside a single writer — safe for multiple Celery workers.
import sqlite3
CHECKPOINT_DB_PATH = os.path.join(settings.BASE_DIR, "langgraph_checkpoints.sqlite")
_conn = sqlite3.connect(CHECKPOINT_DB_PATH, check_same_thread=False)
_conn.execute("PRAGMA journal_mode=WAL")
_conn.execute("PRAGMA synchronous=NORMAL")
memory = SqliteSaver(_conn)


SYSTEM_PROMPT = """You are Origin.AI, the end-to-end intelligent assistant for the DCM Shriram Bio-Batch platform — \
covering both LabNest (tissue culture LIMS) and FieldLink (seed multiplication & field traceability).

You have exclusive access to live data from both modules via a set of tools. \
You MUST use a tool to retrieve data before answering any factual question.

Rules:
1. ALWAYS call a tool when the question involves live data (counts, stock, batches, production, seed lots, farmers, etc.).
2. When asked about Standard Operating Procedures, chemical protocols, or safety instructions, use the `search_lab_protocols` tool.
3. If the user asks for a chart or graph:
   a. FIRST call the relevant data tool to fetch the numbers (e.g., get_contamination_by_variety, get_production_summary, get_expenses_summary, get_manpower_payroll_summary, get_technician_salary).
   b. THEN call `render_chart_in_ui` with the data formatted as a JSON array of {{"name": ..., "value": ...}} objects.
   c. The tool returns a payload starting with ===CHART_BEGIN===. YOU MUST COPY AND PASTE THIS EXACT PAYLOAD INTO YOUR FINAL ANSWER. Do not modify it or omit it.
4. If the question requires data from multiple areas, call multiple tools sequentially — one at a time. Reason between calls.
5. Do NOT fabricate numbers, names, or dates.
6. If no tool covers the question, clearly tell the user.
7. Format your final answer clearly and concisely. Use bullet points when listing multiple items.
8. Do not expose raw database field names or IDs in your response.
9. Address the user professionally — they are lab technicians, field managers, or administrators.
10. When the user asks to SEND or EMAIL a report, use the appropriate email tool:
    - `send_progress_report` — for production/progress reports
    - `send_expenses_report` — for expense reports
    - `send_weekly_lab_report` — for the full weekly lab digest
    - `send_chemical_expiry_alert` — for chemical expiry alerts
    The recipient email is provided at the start of the user message inside [User: ..., Email: ...].
    Use that email unless the user explicitly specifies a different one.
"""


import operator
from typing import Annotated, Sequence, TypedDict, Literal
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from pydantic import BaseModel, Field

# Define tool subsets to reduce context window and improve agent accuracy
LAB_TOOLS = ALL_TOOLS[:24] + ALL_TOOLS[40:] # Lab tools + Cross-module
FIELD_TOOLS = ALL_TOOLS[24:40] + [ALL_TOOLS[18]] # Field tools + render_chart_in_ui

# State for the graph
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next: str

# Routing schema
class Route(BaseModel):
    next: Literal["lab_agent", "field_agent", "FINISH"] = Field(
        description="Route the user's request. Use 'lab_agent' for lab production, chemicals, recipes, or general greetings. Use 'field_agent' for farmers, seed lots, locations, and field plots. Use 'FINISH' if the request is already answered."
    )

def build_agent(verbose: bool = False):
    """
    Builds and returns a LangGraph Supervisor architecture.
    """
    llm = ChatOpenAI(
        model=settings.DEEPSEEK_MODEL,
        openai_api_key=settings.DEEPSEEK_API_KEY,
        openai_api_base="https://api.deepseek.com",
        temperature=0,
    )

    # 1. Supervisor Node
    supervisor_prompt = (
        "You are a supervisor routing requests to either a 'lab_agent' or a 'field_agent'.\n\n"
        "Route to 'lab_agent' for ANY of the following:\n"
        "- Tissue culture, chemicals, stock solutions, recipes, inventory\n"
        "- Lab protocols, SOPs, safety, contamination, production stages\n"
        "- Expenses, manpower, payroll, salaries, costs\n"
        "- Dashboard, reports, analytics, charts, graphs\n"
        "- Sending emails, progress reports, weekly digests, expiry alerts\n"
        "- General greetings, help requests, or anything not clearly field-related\n\n"
        "Route to 'field_agent' ONLY for:\n"
        "- Farmers, field plots, locations, seed lots in the field, harvests, dispatches\n\n"
        "Respond with EXACTLY ONE WORD from the following options: lab_agent, field_agent, FINISH\n"
        "Use FINISH only if the conversation is already completely resolved.\n"
        "Do not output anything else."
    )
    def supervisor_node(state: AgentState):
        messages = [SystemMessage(content=supervisor_prompt)] + list(state["messages"])
        response = llm.invoke(messages)
        
        text = response.content.strip().lower()
        if "field_agent" in text or (text == "field"):
            next_node = "field_agent"
        elif "finish" in text:
            next_node = "FINISH"
        else:
            # Default to lab_agent for everything else (charts, emails, greetings,
            # ambiguous requests) — lab_agent has the broadest tool coverage.
            next_node = "lab_agent"

        extra_messages = []
        if next_node == "FINISH":
            from langchain_core.messages import AIMessage
            extra_messages = [AIMessage(content="I'm not sure how to help with that. Please ask about lab operations, chemicals, field data, or seed lots.")]

        return {"next": next_node, "messages": extra_messages}

    # 2. Lab Agent Node
    lab_agent = create_react_agent(
        model=llm,
        tools=LAB_TOOLS,
        prompt=SYSTEM_PROMPT + "\n\nYou are acting as the LabNest specialized agent."
    )
    def lab_node(state: AgentState):
        result = lab_agent.invoke(state)
        # return all new messages generated by the sub-agent
        return {"messages": result["messages"][len(state["messages"]):]}

    # 3. Field Agent Node
    field_agent = create_react_agent(
        model=llm,
        tools=FIELD_TOOLS,
        prompt=SYSTEM_PROMPT + "\n\nYou are acting as the FieldLink specialized agent."
    )
    def field_node(state: AgentState):
        result = field_agent.invoke(state)
        return {"messages": result["messages"][len(state["messages"]):]}

    # 4. Build the Graph
    builder = StateGraph(AgentState)
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("lab_agent", lab_node)
    builder.add_node("field_agent", field_node)

    # Add edges
    builder.add_edge(START, "supervisor")
    builder.add_conditional_edges(
        "supervisor",
        lambda state: state["next"],
        {
            "lab_agent": "lab_agent",
            "field_agent": "field_agent",
            "FINISH": END
        }
    )
    builder.add_edge("lab_agent", END)
    builder.add_edge("field_agent", END)

    # Compile with persistent memory
    graph = builder.compile(checkpointer=memory)
    return graph


# ─── Singleton ────────────────────────────────────────────────────────────────
# The compiled LangGraph is expensive to build (~300 ms): instantiate once per
# worker process and reuse across all requests.
_AGENT_GRAPH = None

def get_agent():
    """Return the module-level singleton graph, building it on first call."""
    global _AGENT_GRAPH
    if _AGENT_GRAPH is None:
        _AGENT_GRAPH = build_agent()
    return _AGENT_GRAPH
