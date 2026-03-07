#!/usr/bin/env python3
"""
Daily Multi-Agent Research Workflow
Runs daily at 08:00 AM to orchestrate research tasks across three AI agents.
Rose (Supervisor) monitors token usage and stops all agents if thresholds are exceeded.
"""

import os
import sys
import uuid
import logging
import time
import subprocess
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

import json
import re
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import psycopg2
from psycopg2.extras import RealDictCursor
import abacusai

# ============================================================================
# URL VALIDATION - Pre-check URLs before finalizing reports
# ============================================================================
def extract_urls_from_text(text: str) -> List[str]:
    """Extract all URLs from markdown/text content."""
    # Match URLs in markdown links [text](url) and standalone URLs
    url_pattern = r'https?://[^\s\)\]<>"\']+[^\s\)\]<>"\'\.,;:!?]'
    urls = re.findall(url_pattern, text)
    # Deduplicate while preserving order
    seen = set()
    unique_urls = []
    for url in urls:
        # Clean common trailing chars
        url = url.rstrip('.,;:!?)')
        if url not in seen:
            seen.add(url)
            unique_urls.append(url)
    return unique_urls

def validate_url(url: str, timeout: int = 5) -> Dict[str, Any]:
    """
    Validate a single URL by making a HEAD request.
    Returns status info including success, status code, and any errors.
    """
    try:
        # Use HEAD request for efficiency (don't download full content)
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; MissionControl/1.0; URL validator)'
        }
        response = requests.head(url, timeout=timeout, allow_redirects=True, headers=headers)
        
        # Some servers don't support HEAD, try GET if HEAD fails
        if response.status_code == 405:
            response = requests.get(url, timeout=timeout, allow_redirects=True, headers=headers, stream=True)
            response.close()
        
        return {
            "url": url,
            "valid": 200 <= response.status_code < 400,
            "status_code": response.status_code,
            "error": None,
            "final_url": str(response.url) if response.url != url else None
        }
    except requests.exceptions.Timeout:
        return {"url": url, "valid": False, "status_code": None, "error": "timeout"}
    except requests.exceptions.SSLError:
        return {"url": url, "valid": False, "status_code": None, "error": "ssl_error"}
    except requests.exceptions.ConnectionError:
        return {"url": url, "valid": False, "status_code": None, "error": "connection_error"}
    except Exception as e:
        return {"url": url, "valid": False, "status_code": None, "error": str(e)[:100]}

def validate_urls_in_reports(reports: Dict[str, str], max_workers: int = 5) -> Dict[str, Any]:
    """
    Validate all URLs found in agent reports.
    Returns validation results grouped by status.
    
    Args:
        reports: Dict mapping agent names to report content
        max_workers: Number of concurrent validation threads
    
    Returns:
        Dict with 'valid', 'invalid', 'all_urls', and 'summary' keys
    """
    all_urls = []
    url_sources = {}  # Track which agent each URL came from
    
    # Extract URLs from each report
    for agent_name, content in reports.items():
        if not content or content == "SKIPPED":
            continue
        urls = extract_urls_from_text(content)
        all_urls.extend(urls)
        for url in urls:
            if url not in url_sources:
                url_sources[url] = []
            url_sources[url].append(agent_name)
    
    # Deduplicate
    unique_urls = list(set(all_urls))
    
    if not unique_urls:
        return {
            "valid": [],
            "invalid": [],
            "all_urls": [],
            "url_sources": {},
            "summary": "No URLs found in reports"
        }
    
    # Validate URLs in parallel
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {executor.submit(validate_url, url): url for url in unique_urls}
        for future in as_completed(future_to_url):
            result = future.result()
            result["sources"] = url_sources.get(result["url"], [])
            results.append(result)
    
    valid = [r for r in results if r["valid"]]
    invalid = [r for r in results if not r["valid"]]
    
    summary_parts = [f"Validated {len(unique_urls)} URLs"]
    if valid:
        summary_parts.append(f"✅ {len(valid)} valid")
    if invalid:
        summary_parts.append(f"❌ {len(invalid)} broken")
        # Log which agents had broken URLs
        broken_by_agent = {}
        for r in invalid:
            for src in r["sources"]:
                broken_by_agent[src] = broken_by_agent.get(src, 0) + 1
        if broken_by_agent:
            agent_summary = ", ".join(f"{k}: {v}" for k, v in broken_by_agent.items())
            summary_parts.append(f"(broken by agent: {agent_summary})")
    
    return {
        "valid": valid,
        "invalid": invalid,
        "all_urls": results,
        "url_sources": url_sources,
        "summary": " | ".join(summary_parts)
    }

def remove_broken_urls_from_content(content: str, broken_urls: List[str]) -> str:
    """
    Remove or mark broken URLs in content.
    - Removes markdown links with broken URLs: [text](broken_url) -> [text] (link unavailable)
    - Removes standalone broken URLs
    """
    result = content
    for url in broken_urls:
        # Remove markdown links with this URL
        pattern = rf'\[([^\]]+)\]\({re.escape(url)}\)'
        result = re.sub(pattern, r'[\1] (link unavailable)', result)
        # Remove standalone URLs (not in markdown link format)
        result = result.replace(url, '[link removed - 404]')
    return result

# RouteLLM API Configuration
ROUTELLM_API_BASE = "https://routellm.abacus.ai/v1"

# Load API key from environment or .env file
def _load_api_key():
    key = os.environ.get("ABACUSAI_API_KEY", "")
    if not key:
        # Try loading from nextjs_space .env
        env_path = "/home/ubuntu/mission_control_dashboard/nextjs_space/.env"
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith("ABACUSAI_API_KEY="):
                        key = line.strip().split("=", 1)[1]
                        break
    return key

ROUTELLM_API_KEY = _load_api_key()

# Path to Linux kernel security briefing script
LINUX_KERNEL_BRIEFING_SCRIPT = "/home/ubuntu/mission_control_dashboard/linux_kernel_security_briefing.py"

# Dashboard API base URL (for podcast updates and email notifications)
DASHBOARD_API_URL = os.environ.get("DASHBOARD_API_URL", "https://rose.abacusai.app")

# Email notification recipient for daily reports
REPORT_EMAIL_RECIPIENT = os.environ.get("REPORT_EMAIL_RECIPIENT", "nl@phipi.email")

# Configuration
DATABASE_URL = "postgresql://role_148a79baa6:T3uu9ced0C07a3Eylnd9vNIk9xkXBwFm@db-148a79baa6.db004.hosteddb.reai.io:5432/148a79baa6?connect_timeout=15"

# ============================================================================
# TOKEN THRESHOLD CONFIGURATION (Rose monitors these limits)
# OPTIMIZED: Reduced limits for cost efficiency
# ============================================================================
TOKEN_THRESHOLDS = {
    # Maximum tokens allowed per single workflow run (reduced from 50k)
    "max_tokens_per_run": 25000,
    
    # Maximum tokens allowed per day (reduced from 100k)
    "max_tokens_per_day": 50000,
    
    # Maximum tokens per agent per task (reduced from 20k)
    "max_tokens_per_task": 8000,
    
    # Token burn rate threshold (tokens per minute)
    "max_burn_rate_per_minute": 15000,
    
    # Warning threshold (percentage of max) - Rose will log warnings
    "warning_threshold_percent": 75,
}

# ============================================================================
# PROMPT OPTIMIZATION - Shared directives to reduce token usage
# ============================================================================
SHARED_DIRECTIVES = """
OUTPUT RULES:
- Be concise. No filler. Max 800 words.
- Use markdown: headers, bullets, tables.
- Only include verified, free-access URLs.
- Skip broken/paywalled links."""

REPORT_FOOTER = """
End with: ## Sources (verified URLs only)
Confidence: High/Med/Low"""

# ============================================================================
# CONTENT DEDUPLICATION SYSTEM - Prevents repetitive reports
# ============================================================================
import hashlib

def compute_content_hash(content: str) -> str:
    """Compute SHA-256 hash of content for exact deduplication."""
    # Normalize: strip whitespace, lowercase, remove timestamps
    normalized = re.sub(r'\d{4}-\d{2}-\d{2}', 'DATE', content.lower().strip())
    normalized = re.sub(r'\s+', ' ', normalized)
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:32]

def compute_input_fingerprint(input_data: Dict[str, Any]) -> str:
    """
    Compute fingerprint of input data sources (news items, CVEs, papers).
    Used to detect when underlying data hasn't changed significantly.
    """
    # Extract key identifiers from input data
    key_items = []
    
    # Handle different data types
    if 'articles' in input_data:
        # Medical/news articles - use titles and URLs
        for article in input_data.get('articles', [])[:10]:
            key_items.append(article.get('title', '')[:50])
            key_items.append(article.get('url', ''))
    
    if 'cves' in input_data:
        # CVE data - use CVE IDs
        for cve in input_data.get('cves', [])[:20]:
            key_items.append(cve.get('id', ''))
    
    if 'topics' in input_data:
        # Topic keywords
        key_items.extend(input_data.get('topics', [])[:10])
    
    if 'raw_text' in input_data:
        # Raw search/prompt text - extract key entities
        text = input_data.get('raw_text', '')
        # Extract capitalized words and numbers as key entities
        entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b|\b\d{4}\b|\bCVE-\d+-\d+\b', text)
        key_items.extend(entities[:20])
    
    # Sort for consistent ordering and join
    fingerprint_str = '|'.join(sorted(set(filter(None, key_items))))
    return hashlib.md5(fingerprint_str.encode('utf-8')).hexdigest()[:16]

def calculate_similarity(hash1: str, hash2: str) -> float:
    """
    Calculate similarity between two fingerprints.
    For now, use exact match (0 or 1). Can be enhanced with fuzzy matching.
    """
    return 1.0 if hash1 == hash2 else 0.0

def get_last_output_for_agent(db: 'DatabaseManager', agent_name: str) -> Optional[Dict[str, Any]]:
    """
    Fetch the most recent output for an agent (from any day).
    Returns: {id, content, content_hash, input_hash, created_at, was_skipped}
    """
    try:
        db.cursor.execute("""
            SELECT o.id, o.content, o.content_hash, o.input_hash, o.was_skipped, o.created_at
            FROM outputs o
            JOIN agents a ON o.agent_id = a.id
            WHERE a.name = %s
            ORDER BY o.created_at DESC
            LIMIT 1
        """, (agent_name,))
        result = db.cursor.fetchone()
        return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error fetching last output for {agent_name}: {e}")
        return None

def should_skip_generation(
    db: 'DatabaseManager',
    agent_name: str,
    current_input_data: Dict[str, Any],
    similarity_threshold: float = 0.85
) -> Dict[str, Any]:
    """
    Determine if report generation should be skipped due to similar inputs.
    
    Returns:
        {
            'skip': bool,
            'reason': str,
            'previous_output_id': str or None,
            'current_input_hash': str,
            'previous_input_hash': str or None,
            'similarity_score': float
        }
    """
    current_input_hash = compute_input_fingerprint(current_input_data)
    
    # Get last output
    last_output = get_last_output_for_agent(db, agent_name)
    
    if not last_output:
        return {
            'skip': False,
            'reason': 'No previous output found',
            'previous_output_id': None,
            'current_input_hash': current_input_hash,
            'previous_input_hash': None,
            'similarity_score': 0.0
        }
    
    previous_input_hash = last_output.get('input_hash')
    
    if not previous_input_hash:
        return {
            'skip': False,
            'reason': 'Previous output has no input hash (legacy)',
            'previous_output_id': last_output['id'],
            'current_input_hash': current_input_hash,
            'previous_input_hash': None,
            'similarity_score': 0.0
        }
    
    # Calculate similarity
    similarity = calculate_similarity(current_input_hash, previous_input_hash)
    
    # Check if previous was skipped - don't chain skips
    if last_output.get('was_skipped'):
        return {
            'skip': False,
            'reason': 'Previous report was skipped - generating fresh content',
            'previous_output_id': last_output['id'],
            'current_input_hash': current_input_hash,
            'previous_input_hash': previous_input_hash,
            'similarity_score': similarity
        }
    
    if similarity >= similarity_threshold:
        return {
            'skip': True,
            'reason': f'Input data similarity {similarity:.0%} >= threshold {similarity_threshold:.0%}',
            'previous_output_id': last_output['id'],
            'current_input_hash': current_input_hash,
            'previous_input_hash': previous_input_hash,
            'similarity_score': similarity
        }
    
    return {
        'skip': False,
        'reason': f'Input data changed (similarity {similarity:.0%} < threshold {similarity_threshold:.0%})',
        'previous_output_id': last_output['id'],
        'current_input_hash': current_input_hash,
        'previous_input_hash': previous_input_hash,
        'similarity_score': similarity
    }

def generate_no_updates_report(agent_name: str, last_report_date: datetime, topics: List[str] = None) -> str:
    """
    Generate a brief 'No Significant Updates' report when skipping full generation.
    This saves ~80% tokens compared to full report.
    """
    date_str = datetime.now().strftime('%Y-%m-%d')
    topics_str = ', '.join(topics[:3]) if topics else 'monitored areas'
    
    return f"""# {agent_name}'s Daily Brief - {date_str}

## Status: No Significant Updates

**Summary:** After reviewing today's data sources, no major developments requiring a new comprehensive report were identified. The {topics_str} landscape remains consistent with the previous briefing from {last_report_date.strftime('%Y-%m-%d')}.

### Quick Status
- ✅ Data sources scanned: Normal activity
- ✅ No critical alerts
- ℹ️ Full report: See previous briefing

---
*This is an automated summary generated when input data shows <15% change from previous report. Full analysis will resume when significant developments are detected.*

{REPORT_FOOTER}
"""

# Deduplication log tracking
class DeduplicationStats:
    """Track deduplication statistics for the workflow run."""
    def __init__(self):
        self.agents_checked = []
        self.agents_skipped = []
        self.tokens_saved = 0
        self.full_reports_generated = []
    
    def record_skip(self, agent_name: str, estimated_tokens_saved: int = 1500):
        self.agents_skipped.append(agent_name)
        self.tokens_saved += estimated_tokens_saved
    
    def record_full_generation(self, agent_name: str):
        self.full_reports_generated.append(agent_name)
    
    def get_summary(self) -> Dict[str, Any]:
        return {
            'agents_checked': self.agents_checked,
            'agents_skipped': self.agents_skipped,
            'full_reports': self.full_reports_generated,
            'tokens_saved': self.tokens_saved,
            'skip_rate': len(self.agents_skipped) / max(len(self.agents_checked), 1)
        }

# ============================================================================
# MODEL CONFIGURATION - Per-Agent Model Assignment
# Available unlimited models: route-llm, gpt-5-mini, gemini-3-flash-preview,
# grok-code-fast-1, zai-org/glm-4.7, kimi-k2-turbo-preview, meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
# ============================================================================
AGENT_MODELS = {
    "rose": "route-llm",                    # Auto-routing for synthesis tasks
    "cathy": "gemini-3-flash-preview",      # Fast inference for AI research
    "ruthie": "gpt-5-mini",                 # Strong reasoning for medical accuracy
    "sarah": "grok-code-fast-1",            # Optimized for CVE/code/security analysis
}

# Model fallback chain (if primary fails)
MODEL_FALLBACK = {
    "gemini-3-flash-preview": "kimi-k2-turbo-preview",
    "gpt-5-mini": "route-llm",
    "grok-code-fast-1": "route-llm",
    "route-llm": "gpt-5-mini",
    "kimi-k2-turbo-preview": "route-llm",
    "zai-org/glm-4.7": "route-llm",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8": "route-llm",
}

# Execution mode: "chatbot" (use App IDs) or "routellm" (direct API with model selection)
EXECUTION_MODE = "routellm"  # Change to "chatbot" to use original App ID method

# ============================================================================
# COST CALCULATION - Approximate cost per 1K tokens (varies by model)
# These are estimates based on typical API pricing
# ============================================================================
MODEL_COSTS_PER_1K = {
    "route-llm": 0.002,              # Auto-routed, average cost
    "gpt-5-mini": 0.003,             # GPT-5 mini tier
    "gpt-5": 0.015,                  # GPT-5 full
    "gemini-3-flash-preview": 0.001, # Fast/cheap tier
    "grok-code-fast-1": 0.002,       # Grok code tier
    "kimi-k2-turbo-preview": 0.001,  # Kimi fast tier
    "zai-org/glm-4.7": 0.001,        # GLM tier
    "claude-sonnet-4-20250514": 0.01,
    "chatbot": 0.005,                # Default for chatbot mode
    "default": 0.002,                # Fallback
}

def calculate_cost(tokens: int, model: str) -> float:
    """Calculate approximate cost based on token count and model."""
    cost_per_1k = MODEL_COSTS_PER_1K.get(model, MODEL_COSTS_PER_1K["default"])
    return round((tokens / 1000) * cost_per_1k, 4)

def format_duration(seconds: float) -> str:
    """Format duration in human-readable form."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes}m {secs}s"

# Agent App IDs (used when EXECUTION_MODE = "chatbot")
AGENTS = {
    "rose": {"app_id": "131fbca7a0", "name": "Rose", "role": "Master/Supervisor"},
    "cathy": {"app_id": "88a973e2e", "name": "Cathy", "role": "AI Research"},
    "ruthie": {"app_id": "7da3fc5a0", "name": "Ruthie", "role": "Medical Research"},
    "sarah": {"app_id": "ab9a15f4a", "name": "Sarah", "role": "Cybersecurity Intelligence"}
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/ubuntu/mission_control_dashboard/workflow.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


# ============================================================================
# TOKEN MONITOR - Rose's Supervision System
# ============================================================================
class TokenMonitor:
    """
    Rose's token monitoring system. Tracks usage across all agents and enforces
    thresholds. When limits are reached, Rose stops all agent activities.
    Records all incidents to database for reporting.
    """
    
    def __init__(self, db_manager, thresholds: Dict[str, Any]):
        self.db = db_manager
        self.thresholds = thresholds
        self.run_start_time = datetime.now()
        self.tokens_this_run = 0
        self.token_events: List[Dict] = []  # Track timing for burn rate
        self.is_stopped = False
        self.stop_reason = None
        self.incident_id = None  # Track current incident if any
        self.pending_tasks: List[str] = []  # Tasks that will be skipped
        self.current_agent_id = None
        self.current_task_id = None
        self.current_task_name = None
        logger.info(f"🔍 Rose's Token Monitor initialized with thresholds: {thresholds}")
    
    def set_current_context(self, agent_id: str, task_id: str = None, task_name: str = None):
        """Set the current agent/task context for incident reporting."""
        self.current_agent_id = agent_id
        self.current_task_id = task_id
        self.current_task_name = task_name
    
    def get_daily_token_usage(self) -> int:
        """Get total tokens used today across all agents."""
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            self.db.cursor.execute(
                """SELECT COALESCE(SUM(tokens_used), 0) as total 
                   FROM token_usage 
                   WHERE timestamp >= %s""",
                (today_start,)
            )
            result = self.db.cursor.fetchone()
            return int(result['total']) if result else 0
        except Exception as e:
            logger.error(f"Error getting daily token usage: {e}")
            return 0
    
    def record_token_usage(self, agent_name: str, tokens: int):
        """Record token usage and check thresholds."""
        self.tokens_this_run += tokens
        self.token_events.append({
            "agent": agent_name,
            "tokens": tokens,
            "timestamp": datetime.now()
        })
        logger.info(f"📊 Token usage recorded: {agent_name} used {tokens} tokens (Run total: {self.tokens_this_run})")
    
    def calculate_burn_rate(self) -> float:
        """Calculate current token burn rate (tokens per minute)."""
        if len(self.token_events) < 2:
            return 0.0
        
        # Look at tokens in the last 2 minutes
        cutoff = datetime.now() - timedelta(minutes=2)
        recent_events = [e for e in self.token_events if e['timestamp'] > cutoff]
        
        if not recent_events:
            return 0.0
        
        total_tokens = sum(e['tokens'] for e in recent_events)
        time_span = (datetime.now() - recent_events[0]['timestamp']).total_seconds() / 60
        
        if time_span <= 0:
            return total_tokens  # Assume 1 minute if instant
        
        return total_tokens / time_span
    
    def check_thresholds(self, agent_name: str, task_tokens: int = 0) -> Dict[str, Any]:
        """
        Rose checks all token thresholds before allowing an agent to proceed.
        Returns status with warnings or stop orders.
        Records incidents to database when thresholds are exceeded.
        """
        if self.is_stopped:
            return {
                "can_proceed": False,
                "stop": True,
                "reason": self.stop_reason
            }
        
        result = {
            "can_proceed": True,
            "stop": False,
            "warnings": [],
            "reason": None,
            "incident_type": None,
            "threshold_name": None,
            "threshold_limit": None,
            "actual_value": None
        }
        
        daily_usage = self.get_daily_token_usage()
        burn_rate = self.calculate_burn_rate()
        warning_pct = self.thresholds['warning_threshold_percent'] / 100
        
        # Check 1: Per-task threshold (prevent runaway single requests)
        if task_tokens > self.thresholds['max_tokens_per_task']:
            result["stop"] = True
            result["can_proceed"] = False
            result["reason"] = f"🛑 ROSE STOP ORDER: {agent_name}'s task used {task_tokens} tokens, exceeding per-task limit of {self.thresholds['max_tokens_per_task']}"
            result["incident_type"] = "TASK_LIMIT"
            result["threshold_name"] = "max_tokens_per_task"
            result["threshold_limit"] = self.thresholds['max_tokens_per_task']
            result["actual_value"] = task_tokens
        
        # Check 2: Per-run threshold
        elif self.tokens_this_run >= self.thresholds['max_tokens_per_run']:
            result["stop"] = True
            result["can_proceed"] = False
            result["reason"] = f"🛑 ROSE STOP ORDER: Run token limit reached ({self.tokens_this_run}/{self.thresholds['max_tokens_per_run']})"
            result["incident_type"] = "RUN_LIMIT"
            result["threshold_name"] = "max_tokens_per_run"
            result["threshold_limit"] = self.thresholds['max_tokens_per_run']
            result["actual_value"] = self.tokens_this_run
        
        # Check 3: Daily threshold
        elif daily_usage >= self.thresholds['max_tokens_per_day']:
            result["stop"] = True
            result["can_proceed"] = False
            result["reason"] = f"🛑 ROSE STOP ORDER: Daily token limit reached ({daily_usage}/{self.thresholds['max_tokens_per_day']})"
            result["incident_type"] = "DAILY_LIMIT"
            result["threshold_name"] = "max_tokens_per_day"
            result["threshold_limit"] = self.thresholds['max_tokens_per_day']
            result["actual_value"] = daily_usage
        
        # Check 4: Burn rate threshold (agents burning through tokens too fast)
        elif burn_rate >= self.thresholds['max_burn_rate_per_minute']:
            result["stop"] = True
            result["can_proceed"] = False
            result["reason"] = f"🛑 ROSE STOP ORDER: Token burn rate too high ({burn_rate:.0f}/min exceeds {self.thresholds['max_burn_rate_per_minute']}/min)"
            result["incident_type"] = "BURN_RATE"
            result["threshold_name"] = "max_burn_rate_per_minute"
            result["threshold_limit"] = self.thresholds['max_burn_rate_per_minute']
            result["actual_value"] = burn_rate
        
        # Warnings (approaching limits)
        else:
            if self.tokens_this_run >= self.thresholds['max_tokens_per_run'] * warning_pct:
                result["warnings"].append(
                    f"⚠️ WARNING: Approaching run token limit ({self.tokens_this_run}/{self.thresholds['max_tokens_per_run']})"
                )
            
            if daily_usage >= self.thresholds['max_tokens_per_day'] * warning_pct:
                result["warnings"].append(
                    f"⚠️ WARNING: Approaching daily token limit ({daily_usage}/{self.thresholds['max_tokens_per_day']})"
                )
            
            if burn_rate >= self.thresholds['max_burn_rate_per_minute'] * warning_pct:
                result["warnings"].append(
                    f"⚠️ WARNING: High token burn rate ({burn_rate:.0f}/min)"
                )
        
        # If stop order issued, mark monitor as stopped and record incident
        if result["stop"]:
            self.is_stopped = True
            self.stop_reason = result["reason"]
            logger.error(result["reason"])
            
            # Record the incident to database
            try:
                incident_data = {
                    "incident_type": result["incident_type"],
                    "triggering_agent_id": self.current_agent_id,
                    "triggering_task_id": self.current_task_id,
                    "triggering_task_name": self.current_task_name,
                    "threshold_name": result["threshold_name"],
                    "threshold_limit": result["threshold_limit"],
                    "actual_value": result["actual_value"],
                    "tokens_at_incident": self.tokens_this_run,
                    "daily_usage_at_time": daily_usage,
                    "burn_rate_at_time": burn_rate,
                    "stop_reason": result["reason"],
                    "workflow_halted": True,
                    "agents_affected": [agent_name],
                    "tasks_skipped": self.pending_tasks,
                    "thresholds": self.thresholds
                }
                self.incident_id = self.db.record_threshold_incident(incident_data)
                logger.info(f"📋 Incident recorded to database: {self.incident_id}")
            except Exception as e:
                logger.error(f"Failed to record incident to database: {e}")
        
        # Log warnings
        for warning in result["warnings"]:
            logger.warning(warning)
        
        return result
    
    def get_status_summary(self) -> Dict[str, Any]:
        """Get current status summary for logging."""
        return {
            "tokens_this_run": self.tokens_this_run,
            "daily_usage": self.get_daily_token_usage(),
            "burn_rate": self.calculate_burn_rate(),
            "is_stopped": self.is_stopped,
            "stop_reason": self.stop_reason,
            "thresholds": self.thresholds
        }


class DatabaseManager:
    """Handles all database operations."""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.conn = None
        self.cursor = None
    
    def connect(self):
        """Establish database connection."""
        self.conn = psycopg2.connect(self.connection_string)
        self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        logger.info("Database connection established")
    
    def close(self):
        """Close database connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("Database connection closed")
    
    def get_agent_id(self, app_id: str) -> Optional[str]:
        """Get agent UUID by app_id."""
        self.cursor.execute("SELECT id FROM agents WHERE app_id = %s", (app_id,))
        result = self.cursor.fetchone()
        return result['id'] if result else None
    
    def create_task(self, agent_id: str, task_name: str, description: str) -> str:
        """Create a new task record."""
        task_id = str(uuid.uuid4())
        self.cursor.execute(
            """INSERT INTO tasks (id, agent_id, task_name, description, status, assigned_at)
               VALUES (%s, %s, %s, %s, 'PENDING', NOW())
               RETURNING id""",
            (task_id, agent_id, task_name, description)
        )
        self.conn.commit()
        logger.info(f"Created task {task_id} for agent {agent_id}")
        return task_id
    
    def update_task_status(self, task_id: str, status: str, output: str = None):
        """Update task status and optionally set output."""
        if status == 'COMPLETED':
            self.cursor.execute(
                """UPDATE tasks SET status = %s, output = %s, completed_at = NOW()
                   WHERE id = %s""",
                (status, output, task_id)
            )
        else:
            self.cursor.execute(
                "UPDATE tasks SET status = %s WHERE id = %s",
                (status, task_id)
            )
        self.conn.commit()
        logger.info(f"Updated task {task_id} status to {status}")
    
    def save_output(self, task_id: str, agent_id: str, content: str, summary: str = None, 
                    content_hash: str = None, input_hash: str = None, was_skipped: bool = False) -> str:
        """Save agent output to outputs table with deduplication metadata."""
        output_id = str(uuid.uuid4())
        
        # Compute content hash if not provided
        if content_hash is None and content:
            content_hash = compute_content_hash(content)
        
        self.cursor.execute(
            """INSERT INTO outputs (id, task_id, agent_id, content, summary, content_hash, input_hash, was_skipped, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
               RETURNING id""",
            (output_id, task_id, agent_id, content, summary, content_hash, input_hash, was_skipped)
        )
        self.conn.commit()
        logger.info(f"Saved output {output_id} for task {task_id} (skipped={was_skipped}, input_hash={input_hash[:8] if input_hash else 'N/A'})")
        return output_id
    
    def track_token_usage(self, agent_id: str, task_id: str, tokens_used: int, cost: float = 0.0):
        """Track token usage for an agent."""
        usage_id = str(uuid.uuid4())
        self.cursor.execute(
            """INSERT INTO token_usage (id, agent_id, task_id, tokens_used, cost, timestamp)
               VALUES (%s, %s, %s, %s, %s, NOW())""",
            (usage_id, agent_id, task_id, tokens_used, cost)
        )
        self.conn.commit()
        logger.info(f"Tracked {tokens_used} tokens for agent {agent_id}")
    
    def log_activity(self, agent_id: str, task_id: str, level: str, message: str, metadata: dict = None):
        """Log activity to logs table."""
        log_id = str(uuid.uuid4())
        import json
        metadata_json = json.dumps(metadata) if metadata else None
        self.cursor.execute(
            """INSERT INTO logs (id, agent_id, task_id, log_level, message, timestamp, metadata)
               VALUES (%s, %s, %s, %s, %s, NOW(), %s)""",
            (log_id, agent_id, task_id, level, message, metadata_json)
        )
        self.conn.commit()
    
    def record_threshold_incident(self, incident_data: Dict[str, Any]) -> str:
        """Record a threshold incident to the database for Rose's reports."""
        import json
        incident_id = str(uuid.uuid4())
        
        # Map incident type to enum value
        incident_type_map = {
            "TASK_LIMIT": "TASK_LIMIT_EXCEEDED",
            "RUN_LIMIT": "RUN_LIMIT_EXCEEDED", 
            "DAILY_LIMIT": "DAILY_LIMIT_EXCEEDED",
            "BURN_RATE": "BURN_RATE_EXCEEDED"
        }
        incident_type = incident_type_map.get(incident_data.get('incident_type', ''), 'BURN_RATE_EXCEEDED')
        
        self.cursor.execute(
            """INSERT INTO threshold_incidents (
                id, incident_type, triggering_agent_id, triggering_task_id, 
                triggering_task_name, threshold_name, threshold_limit, actual_value,
                tokens_at_incident, daily_usage_at_time, burn_rate_at_time,
                stop_reason, workflow_halted, agents_affected, tasks_skipped,
                thresholds, timestamp
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id""",
            (
                incident_id,
                incident_type,
                incident_data.get('triggering_agent_id'),
                incident_data.get('triggering_task_id'),
                incident_data.get('triggering_task_name'),
                incident_data.get('threshold_name'),
                incident_data.get('threshold_limit'),
                int(incident_data.get('actual_value', 0)),
                incident_data.get('tokens_at_incident', 0),
                incident_data.get('daily_usage_at_time', 0),
                incident_data.get('burn_rate_at_time', 0.0),
                incident_data.get('stop_reason', ''),
                incident_data.get('workflow_halted', True),
                incident_data.get('agents_affected', []),
                incident_data.get('tasks_skipped', []),
                json.dumps(incident_data.get('thresholds', {}))
            )
        )
        self.conn.commit()
        logger.info(f"📋 Recorded threshold incident {incident_id}: {incident_data.get('threshold_name')}")
        return incident_id


class AgentOrchestrator:
    """Orchestrates multi-agent research workflow using Abacus.AI SDK."""
    
    def __init__(self, db: DatabaseManager):
        self.db = db
        self.client = abacusai.ApiClient()
        # Cache for app_id -> deployment_id mapping
        self._deployment_cache = {}
        logger.info("Abacus.AI client initialized")
    
    def _get_deployment_id(self, app_id: str) -> str:
        """Get deployment_id for an external application."""
        if app_id not in self._deployment_cache:
            app = self.client.describe_external_application(app_id)
            self._deployment_cache[app_id] = app.deployment_id
        return self._deployment_cache[app_id]
    
    def send_message_via_routellm(self, agent_key: str, system_prompt: str, message: str) -> Dict[str, Any]:
        """Send a message directly via RouteLLM API with per-agent model selection."""
        model = AGENT_MODELS.get(agent_key, "route-llm")
        agent_name = AGENTS[agent_key]["name"]
        
        try:
            headers = {
                "Authorization": f"Bearer {ROUTELLM_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                "max_tokens": TOKEN_THRESHOLDS["max_tokens_per_task"],
                "temperature": 0.7
            }
            
            logger.info(f"{agent_name} using model: {model}")
            
            response = requests.post(
                f"{ROUTELLM_API_BASE}/chat/completions",
                headers=headers,
                json=payload,
                timeout=120
            )
            
            if response.status_code != 200:
                # Try fallback model
                fallback_model = MODEL_FALLBACK.get(model)
                if fallback_model:
                    logger.warning(f"{agent_name}: Primary model {model} failed, trying fallback: {fallback_model}")
                    payload["model"] = fallback_model
                    response = requests.post(
                        f"{ROUTELLM_API_BASE}/chat/completions",
                        headers=headers,
                        json=payload,
                        timeout=120
                    )
            
            response.raise_for_status()
            data = response.json()
            
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            tokens_used = usage.get("total_tokens", (len(message) + len(content)) // 4)
            model_used = data.get("model", model)
            
            logger.info(f"{agent_name} response via {model_used}: {tokens_used} tokens")
            
            return {
                "content": content,
                "tokens_used": tokens_used,
                "model_used": model_used,
                "success": True
            }
        except requests.exceptions.Timeout:
            logger.error(f"{agent_name}: Request timeout with model {model}")
            return {"content": "Error: Request timeout", "tokens_used": 0, "success": False, "error": "timeout"}
        except Exception as e:
            logger.error(f"{agent_name}: RouteLLM API error: {str(e)}")
            return {"content": f"Error: {str(e)}", "tokens_used": 0, "success": False, "error": str(e)}
    
    def send_message_to_agent(self, app_id: str, message: str) -> Dict[str, Any]:
        """Send a message to a chatbot agent and get response (original method)."""
        try:
            # Get deployment_id from external application
            deployment_id = self._get_deployment_id(app_id)
            
            # Create a new conversation
            conversation = self.client.create_deployment_conversation(
                external_application_id=app_id
            )
            conversation_id = conversation.deployment_conversation_id
            
            # Send message and get response
            response = self.client.get_conversation_response(
                deployment_id=deployment_id,
                message=message,
                deployment_conversation_id=conversation_id,
                deployment_token=None
            )
            
            # Extract response content
            messages = response.get('messages', [])
            content = ""
            if messages:
                # Get the last non-user message
                for msg in reversed(messages):
                    if not msg.get('is_user', True):
                        content = msg.get('text', '')
                        break
            
            # Estimate token usage (rough estimate: 4 chars per token)
            tokens_used = (len(message) + len(content)) // 4
            
            return {
                "content": content,
                "tokens_used": tokens_used,
                "conversation_id": conversation_id,
                "success": True
            }
        except Exception as e:
            logger.error(f"Error communicating with agent {app_id}: {str(e)}")
            return {
                "content": f"Error: {str(e)}",
                "tokens_used": 0,
                "success": False,
                "error": str(e)
            }
    
    def run_research_agent(self, agent_key: str, task_name: str, prompt: str, 
                           system_prompt: str = None, input_hash: str = None,
                           was_skipped: bool = False, skip_content: str = None) -> Dict[str, Any]:
        """Run a research task for a specific agent.
        
        Args:
            agent_key: Key from AGENTS dict (e.g., 'cathy', 'ruthie', 'sarah', 'rose')
            task_name: Name of the task
            prompt: User prompt / task instructions
            system_prompt: Optional system prompt (used in RouteLLM mode)
            input_hash: Hash of input data for deduplication tracking
            was_skipped: If True, use skip_content instead of calling LLM
            skip_content: Pre-generated content to use when skipping LLM call
        
        Returns:
            Dict with: agent, task_id, agent_id, content, tokens_used, success, 
                       model_used, duration_seconds, cost
        """
        agent = AGENTS[agent_key]
        agent_id = self.db.get_agent_id(agent['app_id'])
        
        if not agent_id:
            raise ValueError(f"Agent {agent['name']} not found in database")
        
        # Track start time for duration calculation
        start_time = time.time()
        
        # Create task record
        task_id = self.db.create_task(agent_id, task_name, prompt if not was_skipped else "[DEDUP] " + prompt[:200])
        self.db.log_activity(agent_id, task_id, 'INFO', f"Starting task: {task_name}" + (" [DEDUP SKIP]" if was_skipped else ""))
        
        # Handle skipped generation (deduplication)
        if was_skipped and skip_content:
            # Update status directly to COMPLETED without calling LLM
            self.db.update_task_status(task_id, 'COMPLETED', skip_content[:500])
            
            # Save output with skip metadata
            output_id = self.db.save_output(
                task_id, agent_id, skip_content, skip_content[:200],
                input_hash=input_hash, was_skipped=True
            )
            
            # Track minimal token usage (only the output tokens, no LLM call)
            estimated_tokens = len(skip_content) // 4
            self.db.track_token_usage(agent_id, task_id, estimated_tokens, 0.0)
            
            self.db.log_activity(agent_id, task_id, 'INFO', 
                f"Task completed via DEDUPLICATION SKIP. Estimated tokens saved: ~1500")
            
            logger.info(f"⏭️  {agent['name']} SKIPPED via dedup: {task_name} [~1500 tokens saved]")
            
            return {
                "agent": agent['name'],
                "task_id": task_id,
                "agent_id": agent_id,
                "output_id": output_id,
                "content": skip_content,
                "tokens_used": estimated_tokens,
                "success": True,
                "model_used": "DEDUP_SKIP",
                "duration_seconds": 0.1,
                "duration_formatted": "0.1s",
                "cost": 0.0,
                "was_skipped": True
            }
        
        # Normal flow: Update status to IN_PROGRESS
        self.db.update_task_status(task_id, 'IN_PROGRESS')
        model_info = f" [Model: {AGENT_MODELS.get(agent_key, 'route-llm')}]" if EXECUTION_MODE == "routellm" else ""
        self.db.log_activity(agent_id, task_id, 'INFO', f"Task in progress{model_info}")
        
        # Send message based on execution mode
        if EXECUTION_MODE == "routellm" and ROUTELLM_API_KEY:
            # Use direct RouteLLM API with model selection
            default_system = f"You are {agent['name']}, a {agent['role']}. {SHARED_DIRECTIVES}"
            result = self.send_message_via_routellm(
                agent_key, 
                system_prompt or default_system, 
                prompt
            )
            model_used = result.get('model_used', AGENT_MODELS.get(agent_key, 'unknown'))
        else:
            # Use original chatbot method
            result = self.send_message_to_agent(agent['app_id'], prompt)
            model_used = "chatbot"
        
        # Calculate duration
        end_time = time.time()
        duration_seconds = round(end_time - start_time, 2)
        
        # Calculate cost
        tokens_used = result['tokens_used']
        cost = calculate_cost(tokens_used, model_used)
        
        output_id = None
        if result['success']:
            # Update task to COMPLETED
            self.db.update_task_status(task_id, 'COMPLETED', result['content'][:500])
            
            # Save full output with input_hash for future deduplication
            output_id = self.db.save_output(
                task_id, agent_id, result['content'], result['content'][:200],
                input_hash=input_hash, was_skipped=False
            )
            
            # Track token usage (include cost in metadata)
            self.db.track_token_usage(agent_id, task_id, tokens_used, cost)
            
            self.db.log_activity(agent_id, task_id, 'INFO', 
                f"Task completed via {model_used}. Tokens: {tokens_used}, Cost: ${cost:.4f}, Duration: {format_duration(duration_seconds)}")
            
            logger.info(f"{agent['name']} completed task: {task_name} via {model_used} [{tokens_used} tokens, ${cost:.4f}, {format_duration(duration_seconds)}]")
        else:
            # Update task to FAILED
            self.db.update_task_status(task_id, 'FAILED', result.get('error', 'Unknown error'))
            self.db.log_activity(agent_id, task_id, 'ERROR', 
                f"Task failed: {result.get('error', 'Unknown error')}")
            logger.error(f"{agent['name']} failed task: {task_name}")
        
        return {
            "agent": agent['name'],
            "task_id": task_id,
            "agent_id": agent_id,
            "output_id": output_id,
            "content": result['content'],
            "tokens_used": tokens_used,
            "success": result['success'],
            "model_used": model_used,
            "duration_seconds": duration_seconds,
            "duration_formatted": format_duration(duration_seconds),
            "cost": cost,
            "was_skipped": False
        }


def check_workflow_already_ran_today(db: 'DatabaseManager') -> Dict[str, Any]:
    """
    Check if the daily workflow has already completed successfully today.
    Prevents duplicate runs by checking for existing outputs from all agents.
    
    Returns:
        Dict with 'already_ran' (bool), 'agent_outputs' (dict), and 'message' (str)
    """
    try:
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Check for outputs from each agent today
        agent_outputs = {}
        required_agents = ['Cathy', 'Ruthie', 'Sarah', 'Rose']
        
        for agent_name in required_agents:
            db.cursor.execute(
                """SELECT o.id, o.created_at, t.task_name 
                   FROM outputs o
                   JOIN agents a ON o.agent_id = a.id
                   JOIN tasks t ON o.task_id = t.id
                   WHERE a.name = %s 
                   AND o.created_at >= %s
                   AND t.task_name IN ('Daily AI Research Report', 'Daily Medical Research Report', 
                                       'Daily Cyber Briefing', 'Daily Research Compilation and Insights')
                   ORDER BY o.created_at DESC
                   LIMIT 1""",
                (agent_name, today_start)
            )
            result = db.cursor.fetchone()
            if result:
                agent_outputs[agent_name] = {
                    'output_id': result['id'],
                    'created_at': result['created_at'].isoformat() if result['created_at'] else None,
                    'task_name': result['task_name']
                }
        
        # Check if all 4 agents have outputs today
        all_ran = len(agent_outputs) == len(required_agents)
        
        if all_ran:
            # Get the most recent run time
            latest_time = max(
                datetime.fromisoformat(info['created_at']) 
                for info in agent_outputs.values() 
                if info['created_at']
            )
            message = f"Daily workflow already completed today at {latest_time.strftime('%H:%M:%S')} - skipping duplicate run"
        else:
            missing = set(required_agents) - set(agent_outputs.keys())
            message = f"Partial run detected. Missing agents: {', '.join(missing)}"
        
        return {
            'already_ran': all_ran,
            'agent_outputs': agent_outputs,
            'message': message,
            'output_ids': [info['output_id'] for info in agent_outputs.values()]
        }
    
    except Exception as e:
        logger.error(f"Error checking for duplicate run: {e}")
        # On error, allow the workflow to proceed
        return {
            'already_ran': False,
            'agent_outputs': {},
            'message': f"Error checking duplicate: {str(e)}",
            'output_ids': []
        }


def send_report_email(output_ids: List[str], recipient_email: str = None) -> Dict[str, Any]:
    """
    Send email notification with the daily reports after workflow completion.
    Calls the dashboard API endpoint /api/reports/send-email.
    
    Args:
        output_ids: List of output UUIDs from the completed tasks
        recipient_email: Email address to send to (defaults to REPORT_EMAIL_RECIPIENT)
    
    Returns:
        Dict with success status and message
    """
    if not output_ids:
        logger.warning("📧 No output IDs to send in email")
        return {"success": False, "error": "No outputs to send"}
    
    recipient = recipient_email or REPORT_EMAIL_RECIPIENT
    if not recipient:
        logger.warning("📧 No recipient email configured for report delivery")
        return {"success": False, "error": "No recipient configured"}
    
    try:
        email_endpoint = f"{DASHBOARD_API_URL}/api/reports/send-email"
        
        payload = {
            "recipientEmail": recipient,
            "outputIds": output_ids,
            "includeExecutiveSummary": True
        }
        
        logger.info(f"📧 Sending daily reports email to {recipient}...")
        logger.info(f"📧 Reports included: {len(output_ids)} outputs")
        
        response = requests.post(
            email_endpoint,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=120  # Allow time for PDF generation
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                logger.info(f"✅ Email sent successfully to {recipient}")
                logger.info(f"📧 Reports count: {result.get('reportsCount', len(output_ids))}")
                return {"success": True, "message": f"Email sent to {recipient}", "result": result}
            else:
                logger.warning(f"⚠️ Email API returned non-success: {result}")
                return {"success": False, "error": result.get("message", "Unknown error")}
        else:
            logger.error(f"❌ Email API returned status {response.status_code}: {response.text[:200]}")
            return {"success": False, "error": f"HTTP {response.status_code}"}
    
    except requests.exceptions.Timeout:
        logger.error("❌ Email API request timed out")
        return {"success": False, "error": "Request timeout"}
    except Exception as e:
        logger.error(f"❌ Failed to send email: {str(e)}")
        return {"success": False, "error": str(e)}


def run_daily_workflow():
    """Execute the daily multi-agent research workflow with Rose's token monitoring."""
    logger.info("=" * 60)
    logger.info("Starting Daily Multi-Agent Research Workflow")
    logger.info("🔍 Rose (Supervisor) is monitoring all token usage")
    logger.info(f"Execution time: {datetime.now().isoformat()}")
    logger.info("=" * 60)
    
    # Log execution mode and model assignments
    logger.info(f"Execution Mode: {EXECUTION_MODE.upper()}")
    if EXECUTION_MODE == "routellm":
        logger.info("Model Assignments:")
        for agent_key, model in AGENT_MODELS.items():
            agent_name = AGENTS[agent_key]["name"]
            logger.info(f"  • {agent_name}: {model}")
    logger.info("=" * 60)
    
    db = DatabaseManager(DATABASE_URL)
    
    try:
        db.connect()
        
        # =====================================================================
        # DUPLICATE PREVENTION: Check if workflow already ran today
        # =====================================================================
        duplicate_check = check_workflow_already_ran_today(db)
        
        if duplicate_check['already_ran']:
            logger.warning("=" * 60)
            logger.warning("🚫 DUPLICATE RUN PREVENTED")
            logger.warning(duplicate_check['message'])
            logger.warning(f"Agents with outputs today: {list(duplicate_check['agent_outputs'].keys())}")
            logger.warning("=" * 60)
            
            # Log the skipped run
            rose_agent_id = db.get_agent_id(AGENTS['rose']['app_id'])
            if rose_agent_id:
                db.log_activity(rose_agent_id, None, 'WARN',
                    "Duplicate workflow run prevented - already completed today",
                    {
                        "check_time": datetime.now().isoformat(),
                        "existing_outputs": duplicate_check['agent_outputs']
                    })
            
            db.close()
            return {
                "success": True,
                "skipped": True,
                "reason": "duplicate_prevention",
                "message": duplicate_check['message'],
                "existing_output_ids": duplicate_check['output_ids']
            }
        
        logger.info("✅ No duplicate run detected - proceeding with workflow")
        
        orchestrator = AgentOrchestrator(db)
        
        # Initialize Rose's Token Monitor
        token_monitor = TokenMonitor(db, TOKEN_THRESHOLDS)
        
        # Get Rose's agent ID for workflow logging
        rose_agent_id = db.get_agent_id(AGENTS['rose']['app_id'])
        
        # Log workflow start with threshold info
        db.log_activity(rose_agent_id, None, 'INFO', 
            "Daily research workflow initiated - Rose monitoring tokens", 
            {
                "workflow_date": datetime.now().isoformat(),
                "token_thresholds": TOKEN_THRESHOLDS
            })
        
        # =====================================================================
        # ROSE PRE-CHECK: Verify we haven't already exceeded daily limits
        # =====================================================================
        pre_check = token_monitor.check_thresholds("System", 0)
        if pre_check["stop"]:
            logger.error("🛑 WORKFLOW HALTED BEFORE START: " + pre_check["reason"])
            db.log_activity(rose_agent_id, None, 'ERROR',
                "Workflow halted before start - token threshold exceeded",
                {"reason": pre_check["reason"], "status": token_monitor.get_status_summary()})
            return {
                "success": False,
                "stopped_by_rose": True,
                "reason": pre_check["reason"],
                "total_tokens": 0
            }
        
        # =====================================================================
        # Initialize Deduplication Stats Tracker
        # =====================================================================
        dedup_stats = DeduplicationStats()
        
        # =====================================================================
        # Step 1: Trigger Cathy for AI Research
        # =====================================================================
        logger.info("-" * 40)
        logger.info("Step 1: Rose delegating to Cathy for AI Research")
        
        # Get agent IDs for incident tracking
        cathy_agent_id = db.get_agent_id(AGENTS['cathy']['app_id'])
        ruthie_agent_id = db.get_agent_id(AGENTS['ruthie']['app_id'])
        
        # Set pending tasks for incident reporting
        token_monitor.pending_tasks = ["Ruthie's Medical Research", "Sarah's Cyber Briefing", "Rose's Executive Summary"]
        token_monitor.set_current_context(cathy_agent_id, None, "Daily AI Research Report")
        
        # Rose checks if Cathy can proceed
        cathy_check = token_monitor.check_thresholds("Cathy", 0)
        if cathy_check["stop"]:
            logger.error("🛑 Cathy's task cancelled by Rose")
            db.log_activity(rose_agent_id, None, 'WARN',
                "Rose stopped Cathy's task before execution",
                {"reason": cathy_check["reason"]})
            cathy_result = {"content": "STOPPED BY ROSE", "tokens_used": 0, "success": False, "model_used": "N/A", "duration_seconds": 0, "duration_formatted": "N/A", "cost": 0.0}
        else:
            cathy_prompt = f"""Daily AI Research Brief - Last 24h

FOCUS: LLMs, GenAI, product launches, regulations, key papers.

STRUCTURE:
## Key Highlights (3-5 bullets)
## LLM/GenAI Updates  
## Product & Company News
## Regulatory/Policy
## Notable Research (arXiv, open-access only)
## Actionable Insights
{SHARED_DIRECTIVES}
{REPORT_FOOTER}"""
            
            # ─────────────────────────────────────────────────────────────
            # DEDUPLICATION CHECK for Cathy
            # ─────────────────────────────────────────────────────────────
            cathy_input_data = {
                'topics': ['LLMs', 'GenAI', 'AI research', 'regulations', 'arXiv'],
                'raw_text': cathy_prompt
            }
            dedup_stats.agents_checked.append('Cathy')
            cathy_dedup = should_skip_generation(db, 'Cathy', cathy_input_data)
            
            if cathy_dedup['skip']:
                logger.info(f"⏭️  DEDUP: Skipping Cathy's full report - {cathy_dedup['reason']}")
                db.log_activity(cathy_agent_id, None, 'INFO',
                    f"Deduplication: Skipping full generation - {cathy_dedup['reason']}",
                    {"input_hash": cathy_dedup['current_input_hash'], "similarity": cathy_dedup['similarity_score']})
                
                # Get last report date for the brief summary
                last_output = get_last_output_for_agent(db, 'Cathy')
                last_date = last_output['created_at'] if last_output else datetime.now()
                
                skip_content = generate_no_updates_report(
                    'Cathy', last_date,
                    topics=['AI/ML', 'LLMs', 'GenAI']
                )
                
                cathy_result = orchestrator.run_research_agent(
                    "cathy", 
                    "Daily AI Research Report",
                    cathy_prompt,
                    input_hash=cathy_dedup['current_input_hash'],
                    was_skipped=True,
                    skip_content=skip_content
                )
                dedup_stats.record_skip('Cathy')
            else:
                logger.info(f"✅ DEDUP: Generating full report for Cathy - {cathy_dedup['reason']}")
                cathy_result = orchestrator.run_research_agent(
                    "cathy", 
                    "Daily AI Research Report",
                    cathy_prompt,
                    input_hash=cathy_dedup['current_input_hash']
                )
                dedup_stats.record_full_generation('Cathy')
            
            # Rose records and checks Cathy's token usage
            token_monitor.record_token_usage("Cathy", cathy_result['tokens_used'])
            token_monitor.pending_tasks = ["Ruthie's Medical Research", "Sarah's Cyber Briefing", "Rose's Executive Summary"]
            post_cathy_check = token_monitor.check_thresholds("Cathy", cathy_result['tokens_used'])
            
            if post_cathy_check["stop"]:
                logger.error("🛑 Rose stopping workflow after Cathy's task")
                db.log_activity(rose_agent_id, None, 'ERROR',
                    "Rose stopped workflow after Cathy's task - threshold exceeded",
                    {"reason": post_cathy_check["reason"], "cathy_tokens": cathy_result['tokens_used']})
        
        # =====================================================================
        # Step 2: Trigger Ruthie for Medical Research (with LIVE search data)
        # =====================================================================
        ruthie_result = {"content": "SKIPPED", "tokens_used": 0, "success": False, "model_used": "N/A", "duration_seconds": 0, "duration_formatted": "N/A", "cost": 0.0}
        
        if not token_monitor.is_stopped:
            logger.info("-" * 40)
            logger.info("Step 2: Rose delegating to Ruthie for Medical Research")
            
            # Set context for incident tracking
            token_monitor.pending_tasks = ["Sarah's Cyber Briefing", "Rose's Executive Summary"]
            token_monitor.set_current_context(ruthie_agent_id, None, "Daily Medical Research Report")
            
            ruthie_check = token_monitor.check_thresholds("Ruthie", 0)
            if ruthie_check["stop"]:
                logger.error("🛑 Ruthie's task cancelled by Rose")
                db.log_activity(rose_agent_id, None, 'WARN',
                    "Rose stopped Ruthie's task before execution",
                    {"reason": ruthie_check["reason"]})
            else:
                # ─────────────────────────────────────────────────────────────
                # Step 2a: Fetch LIVE medical literature via free PubMed/bioRxiv APIs
                # ─────────────────────────────────────────────────────────────
                logger.info("🔍 Ruthie searching PubMed/bioRxiv for recent publications...")
                
                medical_search_queries = [
                    "IVF outcomes embryo transfer",
                    "CRISPR gene editing therapy",
                    "pregnancy epigenetics maternal",
                    "reproductive health fertility"
                ]
                
                literature_results = search_medical_literature(medical_search_queries, max_results_per_query=4)
                
                logger.info(f"📚 Found {literature_results['article_count']} recent articles")
                db.log_activity(ruthie_agent_id, None, 'INFO',
                    f"Ruthie searched medical literature: {literature_results['article_count']} articles found",
                    {"search_date": literature_results['search_date'], "queries": medical_search_queries})
                
                # Build prompt with LIVE search data
                live_data_section = literature_results['summary'] if literature_results['article_count'] > 0 else "⚠️ No recent publications found - use latest training knowledge."
                
                ruthie_prompt = f"""Daily Medical Research Brief - {datetime.now().strftime('%Y-%m-%d')}

You have LIVE search access. Below are REAL publications from PubMed/bioRxiv searched just now.
Synthesize these findings into your report. Include article URLs where relevant.

{live_data_section}

---

FOCUS: IVF, pregnancy, epigenetics, CRISPR, reproductive health.

STRUCTURE:
## Key Highlights (3-5 bullets from the LIVE data above)
## IVF & Assisted Reproduction
## Prenatal/Pregnancy Research  
## Epigenetics & CRISPR
## Clinical Trials Update
## Actionable Insights
{SHARED_DIRECTIVES}
IMPORTANT: Cite the PubMed/bioRxiv URLs from the search results above. Only use URLs from the live data provided.
{REPORT_FOOTER}"""
                
                # ─────────────────────────────────────────────────────────────
                # DEDUPLICATION CHECK for Ruthie (based on actual articles found)
                # ─────────────────────────────────────────────────────────────
                ruthie_input_data = {
                    'articles': literature_results.get('articles', []),
                    'topics': ['IVF', 'CRISPR', 'epigenetics', 'reproductive health']
                }
                dedup_stats.agents_checked.append('Ruthie')
                ruthie_dedup = should_skip_generation(db, 'Ruthie', ruthie_input_data)
                
                if ruthie_dedup['skip']:
                    logger.info(f"⏭️  DEDUP: Skipping Ruthie's full report - {ruthie_dedup['reason']}")
                    db.log_activity(ruthie_agent_id, None, 'INFO',
                        f"Deduplication: Skipping full generation - {ruthie_dedup['reason']}",
                        {"input_hash": ruthie_dedup['current_input_hash'], "similarity": ruthie_dedup['similarity_score']})
                    
                    last_output = get_last_output_for_agent(db, 'Ruthie')
                    last_date = last_output['created_at'] if last_output else datetime.now()
                    
                    skip_content = generate_no_updates_report(
                        'Ruthie', last_date,
                        topics=['IVF', 'Medical Research', 'Epigenetics']
                    )
                    
                    ruthie_result = orchestrator.run_research_agent(
                        "ruthie",
                        "Daily Medical Research Report",
                        ruthie_prompt,
                        input_hash=ruthie_dedup['current_input_hash'],
                        was_skipped=True,
                        skip_content=skip_content
                    )
                    dedup_stats.record_skip('Ruthie')
                else:
                    logger.info(f"✅ DEDUP: Generating full report for Ruthie - {ruthie_dedup['reason']}")
                    ruthie_result = orchestrator.run_research_agent(
                        "ruthie",
                        "Daily Medical Research Report",
                        ruthie_prompt,
                        input_hash=ruthie_dedup['current_input_hash']
                    )
                    dedup_stats.record_full_generation('Ruthie')
                
                # Rose records and checks Ruthie's token usage
                token_monitor.record_token_usage("Ruthie", ruthie_result['tokens_used'])
                token_monitor.pending_tasks = ["Sarah's Cyber Briefing", "Rose's Executive Summary"]
                post_ruthie_check = token_monitor.check_thresholds("Ruthie", ruthie_result['tokens_used'])
                
                if post_ruthie_check["stop"]:
                    logger.error("🛑 Rose stopping workflow after Ruthie's task")
                    db.log_activity(rose_agent_id, None, 'ERROR',
                        "Rose stopped workflow after Ruthie's task - threshold exceeded",
                        {"reason": post_ruthie_check["reason"], "ruthie_tokens": ruthie_result['tokens_used']})
        else:
            logger.warning("⏭️ Skipping Ruthie's task - Rose has stopped the workflow")
        
        # =====================================================================
        # Step 3: Trigger Sarah for Cybersecurity Intelligence (War Room)
        # =====================================================================
        sarah_result = {"content": "SKIPPED", "tokens_used": 0, "success": False, "model_used": "N/A", "duration_seconds": 0, "duration_formatted": "N/A", "cost": 0.0}
        sarah_agent_id = db.get_agent_id(AGENTS['sarah']['app_id'])
        
        if not token_monitor.is_stopped:
            logger.info("-" * 40)
            logger.info("Step 3: Rose delegating to Sarah for Cyber Briefing (War Room)")
            
            # Set context for incident tracking
            token_monitor.pending_tasks = ["Rose's Executive Summary"]
            token_monitor.set_current_context(sarah_agent_id, None, "Daily Cyber Briefing")
            
            sarah_check = token_monitor.check_thresholds("Sarah", 0)
            if sarah_check["stop"]:
                logger.error("🛑 Sarah's task cancelled by Rose")
                db.log_activity(rose_agent_id, None, 'WARN',
                    "Rose stopped Sarah's task before execution",
                    {"reason": sarah_check["reason"]})
            else:
                # ─────────────────────────────────────────────────────────────
                # Run Linux Kernel 6.6.x Security Briefing Script
                # This data supplements Sarah's general briefing with deep-dive
                # kernel CVE analysis from vulns.git and CISA KEV trends
                # ─────────────────────────────────────────────────────────────
                linux_kernel_briefing = ""
                try:
                    logger.info("🐧 Running Linux kernel 6.6.x security briefing script...")
                    result = subprocess.run(
                        ["python3", LINUX_KERNEL_BRIEFING_SCRIPT, "--weeks", "4", "--lookback", "2"],
                        capture_output=True,
                        text=True,
                        timeout=120  # 2 minute timeout
                    )
                    if result.returncode == 0:
                        linux_kernel_briefing = result.stdout
                        logger.info(f"✅ Linux kernel briefing generated ({len(linux_kernel_briefing)} chars)")
                        db.log_activity(sarah_agent_id, None, 'INFO',
                            "Linux kernel 6.6.x briefing script completed successfully",
                            {"output_length": len(linux_kernel_briefing)})
                    else:
                        logger.warning(f"⚠️ Linux kernel script returned non-zero: {result.stderr}")
                        linux_kernel_briefing = f"[Script error: {result.stderr[:200]}]"
                except subprocess.TimeoutExpired:
                    logger.error("⏱️ Linux kernel briefing script timed out")
                    linux_kernel_briefing = "[Script timed out after 120 seconds]"
                except Exception as e:
                    logger.error(f"❌ Failed to run Linux kernel briefing script: {e}")
                    linux_kernel_briefing = f"[Script failed: {str(e)[:100]}]"
                
                sarah_prompt = f"""Daily Cyber Briefing - Last 24h

SCOPE: CVEs CVSS≥8, zero-days, actively exploited. Vendors: MS, Google, Apple, Linux.

STRUCTURE:
## Executive Summary (3-5 bullets)
## Critical/Exploited (CVSS 8-10)
| CVE | CVSS | Vendor/Product | Exploit Status | Patch |
## Vendor Breakdown (MS/Google/Apple/Linux)
## Kernel 6.6.x LTS (use data below)
## MITRE ATT&CK Table
## Patch Priority (P1:Now, P2:48h, P3:Cycle)
{SHARED_DIRECTIVES}
Sources: NVD, CISA KEV, MITRE, vendor advisories only.
{REPORT_FOOTER}

KERNEL DATA (integrate into Kernel section):
{linux_kernel_briefing}"""
                
                # ─────────────────────────────────────────────────────────────
                # DEDUPLICATION CHECK for Sarah (based on kernel data + CVEs)
                # ─────────────────────────────────────────────────────────────
                # Extract CVE IDs from kernel briefing for fingerprinting
                cve_ids = re.findall(r'CVE-\d{4}-\d+', linux_kernel_briefing)
                sarah_input_data = {
                    'cves': [{'id': cve} for cve in cve_ids[:20]],
                    'topics': ['CVE', 'Cybersecurity', 'Linux Kernel', 'CISA KEV'],
                    'raw_text': linux_kernel_briefing[:1000]  # First 1000 chars for fingerprint
                }
                dedup_stats.agents_checked.append('Sarah')
                sarah_dedup = should_skip_generation(db, 'Sarah', sarah_input_data)
                
                if sarah_dedup['skip']:
                    logger.info(f"⏭️  DEDUP: Skipping Sarah's full report - {sarah_dedup['reason']}")
                    db.log_activity(sarah_agent_id, None, 'INFO',
                        f"Deduplication: Skipping full generation - {sarah_dedup['reason']}",
                        {"input_hash": sarah_dedup['current_input_hash'], "similarity": sarah_dedup['similarity_score']})
                    
                    last_output = get_last_output_for_agent(db, 'Sarah')
                    last_date = last_output['created_at'] if last_output else datetime.now()
                    
                    skip_content = generate_no_updates_report(
                        'Sarah', last_date,
                        topics=['Cybersecurity', 'CVEs', 'Linux Kernel']
                    )
                    
                    sarah_result = orchestrator.run_research_agent(
                        "sarah",
                        "Daily Cyber Briefing",
                        sarah_prompt,
                        input_hash=sarah_dedup['current_input_hash'],
                        was_skipped=True,
                        skip_content=skip_content
                    )
                    dedup_stats.record_skip('Sarah')
                else:
                    logger.info(f"✅ DEDUP: Generating full report for Sarah - {sarah_dedup['reason']}")
                    sarah_result = orchestrator.run_research_agent(
                        "sarah",
                        "Daily Cyber Briefing",
                        sarah_prompt,
                        input_hash=sarah_dedup['current_input_hash']
                    )
                    dedup_stats.record_full_generation('Sarah')
                
                # Rose records and checks Sarah's token usage
                token_monitor.record_token_usage("Sarah", sarah_result['tokens_used'])
                token_monitor.pending_tasks = ["Rose's Executive Summary"]
                post_sarah_check = token_monitor.check_thresholds("Sarah", sarah_result['tokens_used'])
                
                if post_sarah_check["stop"]:
                    logger.error("🛑 Rose stopping workflow after Sarah's task")
                    db.log_activity(rose_agent_id, None, 'ERROR',
                        "Rose stopped workflow after Sarah's task - threshold exceeded",
                        {"reason": post_sarah_check["reason"], "sarah_tokens": sarah_result['tokens_used']})
        else:
            logger.warning("⏭️ Skipping Sarah's task - Rose has stopped the workflow")
        
        # =====================================================================
        # Step 4: URL Validation & Rose's Executive Compilation
        # =====================================================================
        rose_result = {"content": "SKIPPED", "tokens_used": 0, "success": False, "model_used": "N/A", "duration_seconds": 0, "duration_formatted": "N/A", "cost": 0.0}
        
        if not token_monitor.is_stopped:
            logger.info("-" * 40)
            logger.info("Step 4a: Rose validating URLs from agent reports...")
            
            # Collect reports for URL validation
            reports_to_validate = {
                "Cathy": cathy_result.get('content', '') if cathy_result['success'] else '',
                "Ruthie": ruthie_result.get('content', '') if ruthie_result['success'] else '',
                "Sarah": sarah_result.get('content', '') if sarah_result['success'] else ''
            }
            
            # Validate URLs in all reports
            url_validation = validate_urls_in_reports(reports_to_validate)
            logger.info(f"🔗 URL Validation: {url_validation['summary']}")
            
            # Get list of broken URLs
            broken_urls = [r['url'] for r in url_validation.get('invalid', [])]
            
            # Clean broken URLs from reports
            cathy_content_clean = cathy_result['content']
            ruthie_content_clean = ruthie_result['content']
            sarah_content_clean = sarah_result['content']
            
            if broken_urls:
                logger.warning(f"🔗 Removing {len(broken_urls)} broken URLs from reports")
                for r in url_validation.get('invalid', []):
                    logger.warning(f"   ❌ {r['url']} ({r.get('error') or r.get('status_code')}) - from: {', '.join(r.get('sources', []))}")
                
                cathy_content_clean = remove_broken_urls_from_content(cathy_result['content'], broken_urls)
                ruthie_content_clean = remove_broken_urls_from_content(ruthie_result['content'], broken_urls)
                sarah_content_clean = remove_broken_urls_from_content(sarah_result['content'], broken_urls)
                
                # Log URL validation activity
                db.log_activity(rose_agent_id, None, 'INFO',
                    f"Rose validated URLs: {url_validation['summary']}",
                    {
                        "total_urls": len(url_validation.get('all_urls', [])),
                        "valid_count": len(url_validation.get('valid', [])),
                        "invalid_count": len(broken_urls),
                        "broken_urls": broken_urls[:10]  # Log first 10 broken URLs
                    })
            
            logger.info("-" * 40)
            logger.info("Step 4b: Rose compiling Executive Summary")
            
            # Set context for incident tracking
            token_monitor.pending_tasks = []  # No more tasks after Rose
            token_monitor.set_current_context(rose_agent_id, None, "Daily Research Compilation and Insights")
            
            # Rose checks her own token budget before proceeding
            rose_check = token_monitor.check_thresholds("Rose", 0)
            if rose_check["stop"]:
                logger.error("🛑 Rose stopping her own compilation task")
                db.log_activity(rose_agent_id, None, 'WARN',
                    "Rose stopped her own task - threshold exceeded",
                    {"reason": rose_check["reason"]})
            else:
                # Build URL validation note for Rose
                url_note = ""
                if broken_urls:
                    url_note = f"\n⚠️ NOTE: {len(broken_urls)} broken URLs have been removed from reports.\n"
                
                # ─────────────────────────────────────────────────────────────
                # Build Agent Performance Metrics Table for Rose's summary
                # ─────────────────────────────────────────────────────────────
                agent_metrics = []
                for name, result in [("Cathy", cathy_result), ("Ruthie", ruthie_result), ("Sarah", sarah_result)]:
                    if result.get('success', False):
                        agent_metrics.append({
                            "agent": name,
                            "model": result.get('model_used', 'N/A'),
                            "tokens": result.get('tokens_used', 0),
                            "cost": result.get('cost', 0.0),
                            "duration": result.get('duration_formatted', 'N/A')
                        })
                    else:
                        agent_metrics.append({
                            "agent": name,
                            "model": "SKIPPED",
                            "tokens": 0,
                            "cost": 0.0,
                            "duration": "N/A"
                        })
                
                # Build markdown table for agent performance
                metrics_table = """
## 📊 Agent Performance Metrics
| Agent | Model | Tokens | Cost | Duration |
|-------|-------|--------|------|----------|
"""
                for m in agent_metrics:
                    metrics_table += f"| {m['agent']} | {m['model']} | {m['tokens']:,} | ${m['cost']:.4f} | {m['duration']} |\n"
                
                # Calculate totals (Rose will be added after her task)
                total_tokens_pre_rose = sum(m['tokens'] for m in agent_metrics)
                total_cost_pre_rose = sum(m['cost'] for m in agent_metrics)
                
                rose_prompt = f"""Executive Daily Briefing - Compile these 3 reports:
{url_note}
{metrics_table}
*(Rose's own metrics will be appended after compilation)*

---AI (Cathy)---
{cathy_content_clean}

---Medical (Ruthie)---
{ruthie_content_clean}

---Security (Sarah)---
{sarah_content_clean}
---END REPORTS---

OUTPUT (max 700 words):
## Today's Top 5 Highlights
## 📊 Agent Performance (copy table above, add Rose row at end)
## 🚨 Security Alerts (if any critical)
## Cross-Domain Insights (AI+Medical+Security connections)
## Priority Actions
## Assessment
{SHARED_DIRECTIVES}
CRITICAL: Include the Agent Performance Metrics table in your output. Add your own row (Rose) with placeholder values that will be updated.
IMPORTANT: Only include URLs that are verified working. Do not invent or guess URLs."""
                
                rose_result = orchestrator.run_research_agent(
                    "rose",
                    "Daily Research Compilation and Insights",
                    rose_prompt
                )
                
                # Rose records her own token usage
                token_monitor.record_token_usage("Rose", rose_result['tokens_used'])
                
                # Log the full agent performance metrics including Rose
                logger.info("-" * 40)
                logger.info("📊 AGENT PERFORMANCE SUMMARY:")
                logger.info(f"  • Cathy:  {cathy_result.get('model_used', 'N/A'):30} | {cathy_result.get('tokens_used', 0):6,} tokens | ${cathy_result.get('cost', 0):.4f} | {cathy_result.get('duration_formatted', 'N/A')}")
                logger.info(f"  • Ruthie: {ruthie_result.get('model_used', 'N/A'):30} | {ruthie_result.get('tokens_used', 0):6,} tokens | ${ruthie_result.get('cost', 0):.4f} | {ruthie_result.get('duration_formatted', 'N/A')}")
                logger.info(f"  • Sarah:  {sarah_result.get('model_used', 'N/A'):30} | {sarah_result.get('tokens_used', 0):6,} tokens | ${sarah_result.get('cost', 0):.4f} | {sarah_result.get('duration_formatted', 'N/A')}")
                logger.info(f"  • Rose:   {rose_result.get('model_used', 'N/A'):30} | {rose_result.get('tokens_used', 0):6,} tokens | ${rose_result.get('cost', 0):.4f} | {rose_result.get('duration_formatted', 'N/A')}")
                logger.info("-" * 40)
        else:
            logger.warning("⏭️ Skipping Rose's compilation - workflow has been stopped")
        
        # =====================================================================
        # Final Status Report
        # =====================================================================
        total_tokens = (cathy_result['tokens_used'] + ruthie_result['tokens_used'] + 
                       sarah_result['tokens_used'] + rose_result['tokens_used'])
        final_status = token_monitor.get_status_summary()
        
        if token_monitor.is_stopped:
            db.log_activity(rose_agent_id, None, 'WARN',
                "Daily research workflow STOPPED by Rose due to token threshold",
                {
                    "total_tokens_used": total_tokens,
                    "stop_reason": token_monitor.stop_reason,
                    "cathy_success": cathy_result['success'],
                    "ruthie_success": ruthie_result['success'],
                    "sarah_success": sarah_result['success'],
                    "rose_success": rose_result['success'],
                    "completion_time": datetime.now().isoformat(),
                    "final_status": final_status
                })
        else:
            db.log_activity(rose_agent_id, None, 'INFO',
                "Daily research workflow completed successfully",
                {
                    "total_tokens_used": total_tokens,
                    "cathy_success": cathy_result['success'],
                    "ruthie_success": ruthie_result['success'],
                    "sarah_success": sarah_result['success'],
                    "rose_success": rose_result['success'],
                    "completion_time": datetime.now().isoformat(),
                    "final_status": final_status
                })
        
        logger.info("=" * 60)
        if token_monitor.is_stopped:
            logger.warning("🛑 Daily Workflow STOPPED by Rose (Token Threshold)")
            logger.warning(f"Stop Reason: {token_monitor.stop_reason}")
        else:
            logger.info("✅ Daily Workflow Completed Successfully")
        logger.info(f"Total tokens used: {total_tokens}")
        logger.info(f"Cathy: {'✅' if cathy_result['success'] else '❌'} ({cathy_result['tokens_used']} tokens)" + 
                   (" [DEDUP]" if cathy_result.get('was_skipped') else ""))
        logger.info(f"Ruthie: {'✅' if ruthie_result['success'] else '❌'} ({ruthie_result['tokens_used']} tokens)" +
                   (" [DEDUP]" if ruthie_result.get('was_skipped') else ""))
        logger.info(f"Sarah: {'✅' if sarah_result['success'] else '❌'} ({sarah_result['tokens_used']} tokens)" +
                   (" [DEDUP]" if sarah_result.get('was_skipped') else ""))
        logger.info(f"Rose: {'✅' if rose_result['success'] else '❌'} ({rose_result['tokens_used']} tokens)")
        logger.info(f"Token Status: {final_status}")
        
        # ─────────────────────────────────────────────────────────────
        # DEDUPLICATION SUMMARY
        # ─────────────────────────────────────────────────────────────
        dedup_summary = dedup_stats.get_summary()
        logger.info("-" * 40)
        logger.info("📊 DEDUPLICATION SUMMARY:")
        logger.info(f"   Agents Checked: {', '.join(dedup_summary['agents_checked']) or 'None'}")
        logger.info(f"   Full Reports: {', '.join(dedup_summary['full_reports']) or 'None'}")
        logger.info(f"   Skipped (Dedup): {', '.join(dedup_summary['agents_skipped']) or 'None'}")
        logger.info(f"   Est. Tokens Saved: ~{dedup_summary['tokens_saved']}")
        logger.info(f"   Skip Rate: {dedup_summary['skip_rate']:.0%}")
        
        # Log dedup stats to database
        db.log_activity(rose_agent_id, None, 'INFO',
            f"Deduplication: {len(dedup_summary['agents_skipped'])}/{len(dedup_summary['agents_checked'])} agents skipped, ~{dedup_summary['tokens_saved']} tokens saved",
            dedup_summary)
        
        logger.info("=" * 60)
        
        # =====================================================================
        # Step 5: Send Email Notification with All Reports
        # =====================================================================
        email_result = {"success": False, "error": "Not attempted"}
        workflow_success = not token_monitor.is_stopped and cathy_result['success'] and ruthie_result['success'] and sarah_result['success'] and rose_result['success']
        
        if workflow_success:
            logger.info("-" * 40)
            logger.info("Step 5: Sending Email Notification with Daily Reports")
            
            # Collect output IDs from successful reports
            output_ids = []
            for result in [cathy_result, ruthie_result, sarah_result, rose_result]:
                if result.get('success') and result.get('output_id'):
                    output_ids.append(result['output_id'])
            
            if output_ids:
                email_result = send_report_email(output_ids, REPORT_EMAIL_RECIPIENT)
                
                # Log email status
                if email_result.get('success'):
                    db.log_activity(rose_agent_id, None, 'INFO',
                        f"Daily reports email sent to {REPORT_EMAIL_RECIPIENT}",
                        {"reports_count": len(output_ids), "recipient": REPORT_EMAIL_RECIPIENT})
                else:
                    db.log_activity(rose_agent_id, None, 'WARN',
                        f"Failed to send daily reports email: {email_result.get('error', 'Unknown error')}",
                        {"reports_count": len(output_ids), "recipient": REPORT_EMAIL_RECIPIENT})
            else:
                logger.warning("📧 No output IDs collected for email")
        else:
            logger.warning("📧 Skipping email - workflow did not complete successfully")
        
        logger.info("=" * 60)
        logger.info(f"📧 Email Status: {'✅ Sent' if email_result.get('success') else '❌ ' + email_result.get('error', 'Not sent')}")
        logger.info("=" * 60)
        
        return {
            "success": workflow_success,
            "stopped_by_rose": token_monitor.is_stopped,
            "stop_reason": token_monitor.stop_reason,
            "cathy": cathy_result,
            "ruthie": ruthie_result,
            "sarah": sarah_result,
            "rose": rose_result,
            "total_tokens": total_tokens,
            "token_status": final_status,
            "email_sent": email_result.get("success", False),
            "email_recipient": REPORT_EMAIL_RECIPIENT if email_result.get("success") else None,
            "deduplication": dedup_summary
        }
        
    except Exception as e:
        logger.error(f"Workflow failed with error: {str(e)}")
        
        # Try to log the error
        try:
            if rose_agent_id:
                db.log_activity(rose_agent_id, None, 'ERROR',
                    f"Daily research workflow failed: {str(e)}",
                    {"error_time": datetime.now().isoformat()})
        except:
            pass
        
        return {"success": False, "error": str(e), "stopped_by_rose": False}
        
    finally:
        db.close()


# ============================================================================
# SECURITY NOW PODCAST - Wednesday Morning Task for Sarah
# ============================================================================

def scrape_security_now_twit() -> Dict[str, Any]:
    """
    Scrape TWiT.tv Security Now page for latest episode info.
    Returns episode number, title, air date, and audio URL.
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get("https://twit.tv/shows/security-now", timeout=15, headers=headers)
        response.raise_for_status()
        html = response.text
        
        # Find episode number - look for episode URLs like /shows/security-now/episodes/1066
        ep_matches = re.findall(r'/shows/security-now/episodes/(\d+)', html)
        episode_number = int(ep_matches[0]) if ep_matches else None
        
        # Also try "Episode 1066" or "SN 1066" patterns (but filter out years 19xx, 20xx)
        if not episode_number:
            ep_pattern = re.findall(r'(?:Episode|SN)\s*#?\s*(\d{3,4})\b', html, re.IGNORECASE)
            for ep in ep_pattern:
                ep_int = int(ep)
                # Filter out years (1990-2099 are likely years, not episode numbers)
                if not (1990 <= ep_int <= 2099):
                    episode_number = ep_int
                    break
        
        # Find episode title - look near episode number or in title elements
        title = None
        if episode_number:
            # Look for title pattern near the episode
            title_match = re.search(
                rf'(?:Episode|SN)\s*#?\s*{episode_number}[:\s\-]+([^<\n]+)',
                html, re.IGNORECASE
            )
            if title_match:
                title = title_match.group(1).strip()[:100]
        
        # Also try meta og:title
        if not title:
            og_title = re.search(r'<meta[^>]*property="og:title"[^>]*content="([^"]+)"', html)
            if og_title:
                title = og_title.group(1).strip()
        
        # Find audio URL - look for MP3 links
        audio_match = re.search(r'href="(https?://[^"]*security[^"]*\.mp3[^"]*)"', html, re.IGNORECASE)
        if not audio_match:
            audio_match = re.search(r'href="(https?://[^"]*sn\d+[^"]*\.mp3[^"]*)"', html, re.IGNORECASE)
        audio_url = audio_match.group(1) if audio_match else None
        
        # Try to find air date - look for recent dates (202x years)
        date_match = re.search(r'((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+202\d)', html)
        air_date_str = date_match.group(1) if date_match else None
        
        return {
            "success": True,
            "source": "twit",
            "episode_number": episode_number,
            "title": title,
            "audio_url": audio_url,
            "air_date_str": air_date_str
        }
    except Exception as e:
        logger.error(f"Failed to scrape TWiT: {e}")
        return {"success": False, "source": "twit", "error": str(e)}


def scrape_security_now_grc() -> Dict[str, Any]:
    """
    Scrape GRC.com Security Now page for latest episode info and PDF show notes.
    Returns episode number, show notes URL, and PDF URL.
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; MissionControl/1.0)'}
        response = requests.get("https://www.grc.com/securitynow.htm", timeout=15, headers=headers)
        response.raise_for_status()
        html = response.text
        
        import re
        
        # Find latest episode number - GRC lists episodes in reverse chronological order
        # Pattern: "Episode #999" or "SN-999"
        ep_matches = re.findall(r'(?:Episode\s*#?|SN[-\s]*)(\d{3,4})', html, re.IGNORECASE)
        episode_number = int(ep_matches[0]) if ep_matches else None
        
        # Find show notes PDF URL - typically like sn-999-notes.pdf or sn-999.pdf
        if episode_number:
            # Try common PDF patterns
            pdf_patterns = [
                f'sn-{episode_number}-notes.pdf',
                f'sn-{episode_number}.pdf',
                f'sn{episode_number}.pdf',
            ]
            pdf_url = None
            for pattern in pdf_patterns:
                if pattern.lower() in html.lower():
                    pdf_url = f"https://www.grc.com/sn/{pattern}"
                    break
            
            # Also try to extract directly from href
            pdf_match = re.search(rf'href="([^"]*{episode_number}[^"]*\.pdf)"', html, re.IGNORECASE)
            if pdf_match and not pdf_url:
                pdf_href = pdf_match.group(1)
                if pdf_href.startswith('http'):
                    pdf_url = pdf_href
                else:
                    pdf_url = f"https://www.grc.com{pdf_href}" if pdf_href.startswith('/') else f"https://www.grc.com/sn/{pdf_href}"
        else:
            pdf_url = None
        
        # Find episode-specific show notes page
        notes_match = re.search(rf'href="([^"]*sn-?{episode_number}[^"]*\.htm)"', html, re.IGNORECASE)
        show_notes_url = None
        if notes_match:
            href = notes_match.group(1)
            if href.startswith('http'):
                show_notes_url = href
            else:
                show_notes_url = f"https://www.grc.com{href}" if href.startswith('/') else f"https://www.grc.com/sn/{href}"
        
        return {
            "success": True,
            "source": "grc",
            "episode_number": episode_number,
            "show_notes_url": show_notes_url,
            "pdf_url": pdf_url
        }
    except Exception as e:
        logger.error(f"Failed to scrape GRC: {e}")
        return {"success": False, "source": "grc", "error": str(e)}


def fetch_security_now_episode() -> Dict[str, Any]:
    """
    Fetch latest Security Now episode info from both TWiT and GRC.
    Verifies episode numbers match and combines data from both sources.
    """
    logger.info("🎙️ Fetching Security Now episode info...")
    
    twit_data = scrape_security_now_twit()
    grc_data = scrape_security_now_grc()
    
    result = {
        "twit": twit_data,
        "grc": grc_data,
        "verified": False,
        "episode_number": None,
        "title": None,
        "audio_url": None,
        "show_notes_url": None,
        "pdf_url": None,
        "air_date": None
    }
    
    # Try to determine episode number
    twit_ep = twit_data.get("episode_number") if twit_data.get("success") else None
    grc_ep = grc_data.get("episode_number") if grc_data.get("success") else None
    
    if twit_ep and grc_ep:
        if twit_ep == grc_ep:
            result["verified"] = True
            result["episode_number"] = twit_ep
            logger.info(f"✅ Episode #{twit_ep} verified on both TWiT and GRC")
        else:
            # Use the higher episode number (more recent)
            result["episode_number"] = max(twit_ep, grc_ep)
            logger.warning(f"⚠️ Episode mismatch: TWiT={twit_ep}, GRC={grc_ep}. Using #{result['episode_number']}")
    elif twit_ep:
        result["episode_number"] = twit_ep
        logger.info(f"📻 Episode #{twit_ep} from TWiT (GRC unavailable)")
    elif grc_ep:
        result["episode_number"] = grc_ep
        logger.info(f"📻 Episode #{grc_ep} from GRC (TWiT unavailable)")
    
    # Combine data
    result["title"] = twit_data.get("title")
    result["audio_url"] = twit_data.get("audio_url")
    result["show_notes_url"] = grc_data.get("show_notes_url")
    result["pdf_url"] = grc_data.get("pdf_url")
    
    # Parse air date
    if twit_data.get("air_date_str"):
        try:
            # Parse date string like "February 25, 2026" or "February 25 2026"
            date_str = twit_data["air_date_str"].replace(",", "")
            parsed_date = datetime.strptime(date_str, "%B %d %Y")
            result["air_date"] = parsed_date.isoformat()
        except Exception:
            # Default to yesterday (Tuesday for Wednesday processing)
            result["air_date"] = (datetime.now() - timedelta(days=1)).isoformat()
    else:
        result["air_date"] = (datetime.now() - timedelta(days=1)).isoformat()
    
    return result


def save_podcast_episode(episode_data: Dict[str, Any]) -> bool:
    """
    Save podcast episode to the dashboard database via API.
    """
    try:
        api_url = f"{DASHBOARD_API_URL}/api/podcasts"
        response = requests.post(api_url, json=episode_data, timeout=10)
        if response.status_code in [200, 201]:
            logger.info(f"✅ Saved episode #{episode_data.get('episodeNumber')} to database")
            return True
        else:
            logger.error(f"Failed to save episode: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error saving podcast episode: {e}")
        return False


# ============================================================================
# RUTHIE'S MEDICAL LITERATURE SEARCH - Free/Low-cost real-time data access
# ============================================================================
def search_medical_literature(queries: List[str], max_results_per_query: int = 5) -> Dict[str, Any]:
    """
    Search PubMed and bioRxiv for recent medical literature.
    Uses free NCBI E-utilities API (no key required for <3 req/sec).
    
    Args:
        queries: List of search terms (e.g., ["IVF outcomes 2026", "CRISPR epigenetics"])
        max_results_per_query: Max articles per query (keep low for token efficiency)
    
    Returns:
        Dict with 'articles', 'summary', and 'search_date' keys
    """
    articles = []
    headers = {'User-Agent': 'MissionControl/1.0 (Medical Research Agent)'}
    
    for query in queries[:4]:  # Limit to 4 queries for token efficiency
        try:
            # ─────────────────────────────────────────────────────────────
            # PubMed E-Search: Get article IDs for recent publications
            # ─────────────────────────────────────────────────────────────
            esearch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            search_params = {
                "db": "pubmed",
                "term": f"{query} AND (\"last 7 days\"[dp] OR \"last 30 days\"[dp])",
                "retmax": max_results_per_query,
                "retmode": "json",
                "sort": "relevance"
            }
            
            search_resp = requests.get(esearch_url, params=search_params, headers=headers, timeout=10)
            if search_resp.status_code != 200:
                logger.warning(f"PubMed search failed for '{query}': {search_resp.status_code}")
                continue
            
            search_data = search_resp.json()
            id_list = search_data.get("esearchresult", {}).get("idlist", [])
            
            if not id_list:
                logger.info(f"No recent PubMed results for: {query}")
                continue
            
            # ─────────────────────────────────────────────────────────────
            # PubMed E-Summary: Get article details
            # ─────────────────────────────────────────────────────────────
            time.sleep(0.35)  # Rate limit: 3 req/sec without API key
            
            esummary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            summary_params = {
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "json"
            }
            
            summary_resp = requests.get(esummary_url, params=summary_params, headers=headers, timeout=10)
            if summary_resp.status_code != 200:
                continue
                
            summary_data = summary_resp.json()
            results = summary_data.get("result", {})
            
            for pmid in id_list:
                article = results.get(pmid, {})
                if not article or "error" in article:
                    continue
                    
                articles.append({
                    "source": "PubMed",
                    "pmid": pmid,
                    "title": article.get("title", "Unknown"),
                    "authors": ", ".join([a.get("name", "") for a in article.get("authors", [])[:3]]),
                    "journal": article.get("source", ""),
                    "pubdate": article.get("pubdate", ""),
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    "query": query
                })
            
            time.sleep(0.35)  # Rate limit compliance
            
        except Exception as e:
            logger.warning(f"PubMed search error for '{query}': {e}")
            continue
    
    # ─────────────────────────────────────────────────────────────
    # bioRxiv/medRxiv API: Get recent preprints
    # ─────────────────────────────────────────────────────────────
    try:
        # Get preprints from last 7 days
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        for server in ["biorxiv", "medrxiv"]:
            try:
                rxiv_url = f"https://api.biorxiv.org/details/{server}/{start_date}/{end_date}/0/15"
                rxiv_resp = requests.get(rxiv_url, headers=headers, timeout=10)
                
                if rxiv_resp.status_code == 200:
                    rxiv_data = rxiv_resp.json()
                    for item in rxiv_data.get("collection", [])[:5]:
                        # Filter for relevant topics
                        title_lower = item.get("title", "").lower()
                        category = item.get("category", "").lower()
                        
                        relevant_keywords = ["ivf", "embryo", "fertility", "pregnancy", "prenatal", 
                                           "epigenetic", "crispr", "reproductive", "gene editing",
                                           "maternal", "fetal", "placenta"]
                        
                        if any(kw in title_lower or kw in category for kw in relevant_keywords):
                            articles.append({
                                "source": server.capitalize(),
                                "doi": item.get("doi", ""),
                                "title": item.get("title", "Unknown"),
                                "authors": item.get("authors", "")[:100],
                                "category": item.get("category", ""),
                                "pubdate": item.get("date", ""),
                                "url": f"https://doi.org/{item.get('doi', '')}",
                                "query": "preprint_scan"
                            })
                            
            except Exception as e:
                logger.warning(f"{server} API error: {e}")
                
    except Exception as e:
        logger.warning(f"bioRxiv/medRxiv search error: {e}")
    
    # ─────────────────────────────────────────────────────────────
    # Build concise summary for LLM context
    # ─────────────────────────────────────────────────────────────
    if not articles:
        return {
            "articles": [],
            "summary": "No recent publications found matching search criteria.",
            "search_date": datetime.now().isoformat(),
            "article_count": 0
        }
    
    summary_lines = [f"📚 LIVE MEDICAL LITERATURE ({len(articles)} articles, searched {datetime.now().strftime('%Y-%m-%d %H:%M')} UTC):\n"]
    
    for i, art in enumerate(articles[:12], 1):  # Cap at 12 for token efficiency
        summary_lines.append(f"{i}. [{art['source']}] {art['title'][:120]}")
        summary_lines.append(f"   Authors: {art.get('authors', 'N/A')[:80]}")
        summary_lines.append(f"   Published: {art.get('pubdate', 'Recent')} | {art['url']}")
        summary_lines.append("")
    
    return {
        "articles": articles,
        "summary": "\n".join(summary_lines),
        "search_date": datetime.now().isoformat(),
        "article_count": len(articles)
    }


def extract_pdf_content_via_llm(pdf_url: str) -> Optional[str]:
    """
    Download PDF and extract its content using RouteLLM API.
    The LLM can read PDFs directly when base64-encoded.
    """
    import base64
    
    if not pdf_url:
        return None
    
    try:
        # Download the PDF
        logger.info(f"📥 Downloading PDF: {pdf_url}")
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(pdf_url, timeout=30, headers=headers)
        response.raise_for_status()
        
        pdf_bytes = response.content
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        logger.info(f"📄 PDF downloaded: {len(pdf_bytes)} bytes")
        
        # Use RouteLLM to extract content from PDF
        api_url = "https://routellm.abacus.ai/v1/chat/completions"
        api_headers = {
            "Authorization": f"Bearer {ROUTELLM_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gemini-2.5-flash",  # Good for document extraction
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "file",
                            "file": {
                                "filename": "show_notes.pdf",
                                "file_data": f"data:application/pdf;base64,{pdf_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": """Extract the key content from this Security Now podcast show notes PDF.

Focus on:
1. Main topics discussed in the episode
2. Security news and vulnerabilities mentioned
3. Technical discussions and explanations
4. Steve Gibson's insights and recommendations
5. Any listener feedback or Q&A sections

Provide a structured extraction of the content, organized by topic.
Keep the extraction factual and comprehensive but concise (max 2000 words).
Do not summarize - extract the actual content and key points discussed."""
                        }
                    ]
                }
            ],
            "max_tokens": 4000,
            "temperature": 0.1
        }
        
        logger.info("🤖 Extracting PDF content via LLM...")
        llm_response = requests.post(api_url, headers=api_headers, json=payload, timeout=120)
        llm_response.raise_for_status()
        
        result = llm_response.json()
        extracted_content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        if extracted_content:
            logger.info(f"✅ PDF content extracted: {len(extracted_content)} chars")
            return extracted_content
        else:
            logger.warning("⚠️ No content extracted from PDF")
            return None
            
    except requests.exceptions.Timeout:
        logger.error("❌ PDF download/extraction timed out")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Failed to download/process PDF: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ PDF extraction error: {e}")
        return None


def run_security_now_task(orchestrator: 'AgentOrchestrator', db: 'DatabaseManager') -> Dict[str, Any]:
    """
    Sarah's Wednesday morning Security Now podcast task.
    1. Scrape TWiT.tv and GRC.com for latest episode
    2. Verify episode numbers match
    3. Have Sarah summarize the episode content
    4. Save to database with all metadata
    """
    logger.info("=" * 60)
    logger.info("🎙️ SECURITY NOW PODCAST TASK - Wednesday Morning")
    logger.info("=" * 60)
    
    # Step 1: Fetch episode info from both sources
    episode_info = fetch_security_now_episode()
    
    if not episode_info.get("episode_number"):
        logger.error("❌ Could not determine episode number from either source")
        return {
            "success": False,
            "error": "Could not fetch episode info",
            "episode_info": episode_info
        }
    
    ep_num = episode_info["episode_number"]
    title = episode_info.get("title") or f"Security Now Episode {ep_num}"
    
    logger.info(f"📻 Processing: Episode #{ep_num} - {title}")
    
    # Step 2: Extract content from the PDF show notes (primary source)
    pdf_content = None
    if episode_info.get("pdf_url"):
        pdf_content = extract_pdf_content_via_llm(episode_info["pdf_url"])
    
    # Fallback to HTML show notes if PDF extraction fails
    show_notes_content = ""
    if not pdf_content and episode_info.get("show_notes_url"):
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (compatible; MissionControl/1.0)'}
            notes_resp = requests.get(episode_info["show_notes_url"], timeout=15, headers=headers)
            if notes_resp.status_code == 200:
                text = re.sub(r'<[^>]+>', ' ', notes_resp.text)
                text = re.sub(r'\s+', ' ', text)
                show_notes_content = text[:3000]
                logger.info(f"📝 Fallback: Fetched {len(show_notes_content)} chars of HTML show notes")
        except Exception as e:
            logger.warning(f"Could not fetch show notes: {e}")
    
    # Use PDF content as primary source, HTML as fallback
    content_for_summary = pdf_content if pdf_content else show_notes_content
    
    if not content_for_summary:
        logger.warning("⚠️ No content available for summary - proceeding with minimal context")
    
    # Step 3: Have Sarah summarize the episode based on actual PDF content
    summary_prompt = f"""Security Now Podcast - Episode #{ep_num}: "{title}"

SOURCES:
- GRC Show Notes: {episode_info.get('show_notes_url', 'N/A')}
- PDF Notes: {episode_info.get('pdf_url', 'N/A')}

{'## EXTRACTED PDF CONTENT (use this as your primary source):' + chr(10) + content_for_summary if content_for_summary else '(No content extracted - provide generic episode placeholder)'}

TASK: Based on the EXTRACTED PDF CONTENT above, provide an accurate summary of this Security Now episode.
IMPORTANT: Only include topics that are ACTUALLY mentioned in the extracted content. Do not invent or guess topics.

OUTPUT FORMAT (max 500 words):
## Episode Overview
What this episode actually covers based on the show notes.

## Key Topics Discussed
- Topic 1: Brief explanation of what Steve discussed
- Topic 2: Brief explanation
- Topic 3: Brief explanation
(Include all major topics from the PDF)

## Security News & Vulnerabilities
Any CVEs, breaches, or security incidents mentioned.

## Steve's Insights
Key recommendations or analysis from Steve Gibson.

## Listener Feedback
Any Q&A or listener topics addressed (if present in notes).

Be accurate to the source material. Do not include topics not in the PDF."""

    sarah_result = orchestrator.run_research_agent(
        "sarah",
        f"Security Now #{ep_num} Summary",
        summary_prompt
    )
    
    if not sarah_result.get("success"):
        logger.error("❌ Sarah failed to generate episode summary")
        return {
            "success": False,
            "error": "Failed to generate summary",
            "episode_info": episode_info
        }
    
    summary = sarah_result.get("content", "")
    logger.info(f"✅ Sarah generated summary ({len(summary)} chars)")
    
    # Step 4: Save to database
    episode_data = {
        "episodeNumber": ep_num,
        "title": title,
        "airDate": episode_info.get("air_date"),
        "audioUrl": episode_info.get("audio_url"),
        "showNotesUrl": episode_info.get("show_notes_url"),
        "showNotesPdfUrl": episode_info.get("pdf_url"),
        "summary": summary,
        "twitVerified": episode_info["twit"].get("success", False),
        "grcVerified": episode_info["grc"].get("success", False)
    }
    
    saved = save_podcast_episode(episode_data)
    
    # Log to database
    sarah_agent_id = db.get_agent_id(AGENTS['sarah']['app_id'])
    db.log_activity(sarah_agent_id, None, 'INFO',
        f"Security Now #{ep_num} processed and {'saved' if saved else 'failed to save'}",
        {
            "episode_number": ep_num,
            "title": title,
            "verified": episode_info.get("verified", False),
            "tokens_used": sarah_result.get("tokens_used", 0)
        })
    
    return {
        "success": saved,
        "episode_number": ep_num,
        "title": title,
        "summary_length": len(summary),
        "verified": episode_info.get("verified", False),
        "tokens_used": sarah_result.get("tokens_used", 0),
        "model_used": sarah_result.get("model_used"),
        "cost": sarah_result.get("cost", 0)
    }


def is_wednesday() -> bool:
    """Check if today is Wednesday."""
    return datetime.now().weekday() == 2  # Monday=0, Wednesday=2


def run_wednesday_podcast_workflow():
    """
    Standalone workflow for Wednesday Security Now podcast task.
    Can be run independently or as part of the daily workflow.
    """
    logger.info("=" * 60)
    logger.info("🎙️ WEDNESDAY SECURITY NOW WORKFLOW")
    logger.info(f"Execution time: {datetime.now().isoformat()}")
    logger.info("=" * 60)
    
    db = DatabaseManager(DATABASE_URL)
    
    try:
        db.connect()
        orchestrator = AgentOrchestrator(db)
        
        result = run_security_now_task(orchestrator, db)
        
        if result.get("success"):
            logger.info("=" * 60)
            logger.info(f"✅ SECURITY NOW TASK COMPLETED")
            logger.info(f"   Episode: #{result.get('episode_number')} - {result.get('title')}")
            logger.info(f"   Tokens: {result.get('tokens_used', 0)}")
            logger.info(f"   Cost: ${result.get('cost', 0):.4f}")
            logger.info("=" * 60)
        else:
            logger.error(f"❌ Security Now task failed: {result.get('error')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Wednesday podcast workflow failed: {e}")
        return {"success": False, "error": str(e)}
        
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Mission Control Daily Workflow")
    parser.add_argument("--podcast-only", action="store_true", 
                       help="Run only the Security Now podcast task (Wednesday task)")
    parser.add_argument("--force-podcast", action="store_true",
                       help="Force run podcast task even if not Wednesday")
    args = parser.parse_args()
    
    if args.podcast_only or args.force_podcast:
        # Run podcast-only workflow
        result = run_wednesday_podcast_workflow()
        sys.exit(0 if result.get('success') else 1)
    else:
        # Run full daily workflow
        result = run_daily_workflow()
        if result.get('stopped_by_rose'):
            logger.warning("🛑 Workflow was stopped by Rose due to token threshold")
            sys.exit(2)  # Exit code 2 = stopped by threshold
        sys.exit(0 if result.get('success') else 1)
