"""
Utility functions for GitHub Integration MCP Server
"""

import re
import json
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import hashlib


class GitHubUtils:
    """GitHub-specific utility functions"""
    
    @staticmethod
    def parse_repo_url(url: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Parse GitHub repository URL to extract owner and name
        
        Args:
            url: GitHub repository URL
            
        Returns:
            Tuple of (owner, repo_name) or (None, None) if invalid
        """
        patterns = [
            r"github\.com[:/]([^/]+)/([^/\s]+?)(?:\.git)?$",
            r"^([^/]+)/([^/\s]+)$"  # Simple owner/repo format
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1), match.group(2).rstrip('.git')
        
        return None, None
    
    @staticmethod
    def extract_issue_numbers(text: str) -> List[int]:
        """
        Extract issue numbers from text (e.g., #123, GH-456)
        
        Args:
            text: Text to search
            
        Returns:
            List of issue numbers
        """
        patterns = [
            r"#(\d+)",
            r"GH-(\d+)",
            r"issue[:\s]+(\d+)",
            r"fixes[:\s]+#?(\d+)",
            r"closes[:\s]+#?(\d+)",
            r"resolves[:\s]+#?(\d+)"
        ]
        
        numbers = set()
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            numbers.update(int(match) for match in matches)
        
        return sorted(list(numbers))
    
    @staticmethod
    def parse_pr_title(title: str) -> Dict[str, Any]:
        """
        Parse PR title to extract type, scope, and description
        
        Args:
            title: PR title
            
        Returns:
            Dictionary with parsed components
        """
        # Conventional commit format: type(scope): description
        pattern = r"^(\w+)(?:\(([^)]+)\))?\s*:\s*(.+)$"
        match = re.match(pattern, title)
        
        if match:
            return {
                "type": match.group(1),
                "scope": match.group(2),
                "description": match.group(3),
                "is_conventional": True
            }
        
        # Check for common prefixes
        prefixes = ["WIP", "DRAFT", "RFC", "BREAKING"]
        prefix = None
        for p in prefixes:
            if title.upper().startswith(f"[{p}]") or title.upper().startswith(f"{p}:"):
                prefix = p
                break
        
        return {
            "type": None,
            "scope": None,
            "description": title,
            "is_conventional": False,
            "prefix": prefix
        }
    
    @staticmethod
    def calculate_pr_size(additions: int, deletions: int) -> str:
        """
        Calculate PR size based on lines changed
        
        Args:
            additions: Lines added
            deletions: Lines deleted
            
        Returns:
            Size label (XS, S, M, L, XL)
        """
        total = additions + deletions
        
        if total < 10:
            return "XS"
        elif total < 50:
            return "S"
        elif total < 250:
            return "M"
        elif total < 1000:
            return "L"
        else:
            return "XL"
    
    @staticmethod
    def generate_branch_name(issue_title: str, issue_number: int, prefix: str = "feature") -> str:
        """
        Generate a branch name from issue title
        
        Args:
            issue_title: Issue title
            issue_number: Issue number
            prefix: Branch prefix (feature, fix, etc.)
            
        Returns:
            Generated branch name
        """
        # Clean and format title
        clean_title = re.sub(r'[^\w\s-]', '', issue_title.lower())
        clean_title = re.sub(r'[-\s]+', '-', clean_title)
        clean_title = clean_title[:50].rstrip('-')
        
        return f"{prefix}/{issue_number}-{clean_title}"


class MarkdownUtils:
    """Markdown formatting utilities"""
    
    @staticmethod
    def create_collapsible_section(title: str, content: str) -> str:
        """Create a collapsible markdown section"""
        return f"""<details>
<summary>{title}</summary>

{content}

</details>"""
    
    @staticmethod
    def create_task_list(items: List[Dict[str, Any]]) -> str:
        """
        Create a markdown task list
        
        Args:
            items: List of items with 'task' and 'completed' keys
            
        Returns:
            Markdown task list
        """
        lines = []
        for item in items:
            check = "x" if item.get("completed", False) else " "
            task = item.get("task", "")
            lines.append(f"- [{check}] {task}")
        
        return "\n".join(lines)
    
    @staticmethod
    def create_table(headers: List[str], rows: List[List[str]]) -> str:
        """Create a markdown table"""
        # Header
        header_row = "| " + " | ".join(headers) + " |"
        separator = "| " + " | ".join(["---"] * len(headers)) + " |"
        
        # Rows
        table_rows = []
        for row in rows:
            table_rows.append("| " + " | ".join(str(cell) for cell in row) + " |")
        
        return "\n".join([header_row, separator] + table_rows)
    
    @staticmethod
    def create_code_block(code: str, language: str = "") -> str:
        """Create a markdown code block"""
        return f"```{language}\n{code}\n```"


class LabelUtils:
    """Label management utilities"""
    
    # Standard label colors
    COLORS = {
        "bug": "d73a4a",
        "documentation": "0075ca",
        "duplicate": "cfd3d7",
        "enhancement": "a2eeef",
        "feature": "7057ff",
        "good first issue": "7057ff",
        "help wanted": "008672",
        "invalid": "e4e669",
        "question": "d876e3",
        "wontfix": "ffffff",
        # Priority colors
        "critical": "ff0000",
        "high": "ff6600",
        "medium": "ffaa00",
        "low": "ffdd00",
        # Size colors
        "size/XS": "00ff00",
        "size/S": "33ff33",
        "size/M": "ffff00",
        "size/L": "ff9900",
        "size/XL": "ff0000",
    }
    
    @classmethod
    def suggest_labels(cls, text: str, existing_labels: List[str] = None) -> List[str]:
        """
        Suggest labels based on issue/PR content
        
        Args:
            text: Issue or PR text
            existing_labels: Already applied labels
            
        Returns:
            List of suggested labels
        """
        text_lower = text.lower()
        suggestions = []
        existing_labels = existing_labels or []
        
        # Bug detection
        bug_keywords = ["bug", "error", "issue", "problem", "broken", "fix", "crash"]
        if any(keyword in text_lower for keyword in bug_keywords):
            suggestions.append("bug")
        
        # Feature detection
        feature_keywords = ["feature", "enhancement", "add", "implement", "new"]
        if any(keyword in text_lower for keyword in feature_keywords):
            suggestions.append("enhancement")
        
        # Documentation
        doc_keywords = ["docs", "documentation", "readme", "guide", "tutorial"]
        if any(keyword in text_lower for keyword in doc_keywords):
            suggestions.append("documentation")
        
        # Priority detection
        if any(word in text_lower for word in ["urgent", "critical", "asap", "production"]):
            suggestions.append("critical")
        elif any(word in text_lower for word in ["important", "high priority"]):
            suggestions.append("high")
        
        # Good first issue
        if any(phrase in text_lower for phrase in ["good first issue", "beginner", "easy"]):
            suggestions.append("good first issue")
        
        # Remove duplicates and existing labels
        suggestions = list(set(suggestions) - set(existing_labels))
        
        return suggestions
    
    @classmethod
    def categorize_labels(cls, labels: List[str]) -> Dict[str, List[str]]:
        """
        Categorize labels by type
        
        Args:
            labels: List of label names
            
        Returns:
            Dictionary of categorized labels
        """
        categories = {
            "type": [],
            "priority": [],
            "status": [],
            "component": [],
            "size": [],
            "other": []
        }
        
        for label in labels:
            label_lower = label.lower()
            
            if label_lower in ["bug", "feature", "enhancement", "documentation", "test", "refactor"]:
                categories["type"].append(label)
            elif label_lower in ["critical", "high", "medium", "low"]:
                categories["priority"].append(label)
            elif label_lower in ["in-progress", "blocked", "ready", "review-needed"]:
                categories["status"].append(label)
            elif label_lower in ["frontend", "backend", "api", "database", "ui", "infrastructure"]:
                categories["component"].append(label)
            elif label_lower.startswith("size/"):
                categories["size"].append(label)
            else:
                categories["other"].append(label)
        
        return {k: v for k, v in categories.items() if v}


class MetricsUtils:
    """Metrics calculation utilities"""
    
    @staticmethod
    def calculate_velocity(completed_tasks: List[Dict], timeframe_days: int) -> Dict[str, Any]:
        """
        Calculate team velocity metrics
        
        Args:
            completed_tasks: List of completed tasks with timestamps
            timeframe_days: Number of days to analyze
            
        Returns:
            Velocity metrics
        """
        cutoff_date = datetime.utcnow() - timedelta(days=timeframe_days)
        recent_tasks = [
            task for task in completed_tasks
            if datetime.fromisoformat(task.get("completed_at", "")) > cutoff_date
        ]
        
        if not recent_tasks:
            return {
                "tasks_per_day": 0,
                "average_completion_time": 0,
                "trend": "stable"
            }
        
        tasks_per_day = len(recent_tasks) / timeframe_days
        
        # Calculate average completion time
        completion_times = []
        for task in recent_tasks:
            if task.get("created_at") and task.get("completed_at"):
                created = datetime.fromisoformat(task["created_at"])
                completed = datetime.fromisoformat(task["completed_at"])
                completion_times.append((completed - created).total_seconds() / 3600)
        
        avg_completion = sum(completion_times) / len(completion_times) if completion_times else 0
        
        # Calculate trend (simplified)
        if timeframe_days >= 14:
            first_half = len([t for t in recent_tasks if datetime.fromisoformat(t["completed_at"]) < 
                             (datetime.utcnow() - timedelta(days=timeframe_days/2))])
            second_half = len(recent_tasks) - first_half
            
            if second_half > first_half * 1.1:
                trend = "increasing"
            elif second_half < first_half * 0.9:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "insufficient_data"
        
        return {
            "tasks_per_day": round(tasks_per_day, 2),
            "average_completion_time_hours": round(avg_completion, 2),
            "total_completed": len(recent_tasks),
            "trend": trend
        }
    
    @staticmethod
    def calculate_review_metrics(prs: List[Dict]) -> Dict[str, Any]:
        """
        Calculate code review metrics
        
        Args:
            prs: List of PR data
            
        Returns:
            Review metrics
        """
        metrics = {
            "average_reviewers": 0,
            "average_review_time_hours": 0,
            "average_comments": 0,
            "approval_rate": 0,
            "revision_rate": 0
        }
        
        if not prs:
            return metrics
        
        total_reviewers = 0
        review_times = []
        total_comments = 0
        approved_count = 0
        revision_count = 0
        
        for pr in prs:
            # Reviewer count
            reviewers = pr.get("reviewers", [])
            total_reviewers += len(reviewers)
            
            # Review time (first review)
            if pr.get("created_at") and pr.get("first_review_at"):
                created = datetime.fromisoformat(pr["created_at"])
                reviewed = datetime.fromisoformat(pr["first_review_at"])
                review_times.append((reviewed - created).total_seconds() / 3600)
            
            # Comments
            total_comments += pr.get("comment_count", 0)
            
            # Approval tracking
            if pr.get("approved"):
                approved_count += 1
            
            # Revision tracking
            if pr.get("commits_count", 1) > 1:
                revision_count += 1
        
        metrics["average_reviewers"] = round(total_reviewers / len(prs), 2)
        metrics["average_review_time_hours"] = round(
            sum(review_times) / len(review_times), 2
        ) if review_times else 0
        metrics["average_comments"] = round(total_comments / len(prs), 2)
        metrics["approval_rate"] = round((approved_count / len(prs)) * 100, 2)
        metrics["revision_rate"] = round((revision_count / len(prs)) * 100, 2)
        
        return metrics


class CacheUtils:
    """Caching utility functions"""
    
    @staticmethod
    def generate_cache_key(*args) -> str:
        """Generate a cache key from arguments"""
        key_parts = []
        for arg in args:
            if isinstance(arg, dict):
                arg = json.dumps(arg, sort_keys=True)
            key_parts.append(str(arg))
        
        combined = ":".join(key_parts)
        return hashlib.md5(combined.encode()).hexdigest()
    
    @staticmethod
    def is_cache_expired(timestamp: str, ttl_seconds: int) -> bool:
        """Check if cached data is expired"""
        cached_time = datetime.fromisoformat(timestamp)
        expiry_time = cached_time + timedelta(seconds=ttl_seconds)
        return datetime.utcnow() > expiry_time