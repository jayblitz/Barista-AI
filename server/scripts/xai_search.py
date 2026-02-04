#!/usr/bin/env python3
"""
xAI Live Search Script using official xai-sdk
Performs real-time web and X (Twitter) searches using Grok's Agent Tools API
"""

import os
import sys
import json
from datetime import datetime, timedelta
from typing import Optional, List

try:
    from xai_sdk import Client
    from xai_sdk.chat import user
    from xai_sdk.tools import web_search, x_search
except ImportError:
    print(json.dumps({
        "error": "xai-sdk not installed",
        "content": "Live search is currently unavailable.",
        "citations": []
    }))
    sys.exit(1)


def perform_search(query: str, search_type: str = "x", x_handle: Optional[str] = None):
    """
    Perform a live search using xAI's Agent Tools
    
    Args:
        query: The search query
        search_type: "x" for X/Twitter search, "web" for web search, "both" for both
        x_handle: Optional X handle to filter results (e.g., "MondayTrade_")
    """
    api_key = os.environ.get("XAI_API_KEY")
    
    if not api_key:
        return {
            "error": "XAI_API_KEY not configured",
            "content": "Live search is currently unavailable.",
            "citations": []
        }
    
    try:
        client = Client(api_key=api_key)
        
        tools = []
        from_date = datetime.now() - timedelta(days=30)
        
        if search_type in ["x", "both"]:
            if x_handle:
                tools.append(x_search(
                    from_date=from_date,
                    allowed_x_handles=[x_handle]
                ))
            else:
                tools.append(x_search(from_date=from_date))
        
        if search_type in ["web", "both"]:
            tools.append(web_search())
        
        chat = client.chat.create(
            model="grok-4-1-fast",
            include=["inline_citations"],
            tools=tools,
        )
        
        system_prompt = """You are a helpful assistant that searches for real-time information.
Keep your response brief and factual - maximum 2-3 sentences.
Include the most relevant recent information found.
Do not use emojis."""
        
        chat.append(user(f"{system_prompt}\n\nSearch and answer: {query}"))
        
        response = chat.sample()
        
        citations: List[dict] = []
        if hasattr(response, 'inline_citations') and response.inline_citations:
            for citation in response.inline_citations:
                if hasattr(citation, 'web_citation') and citation.web_citation:
                    citations.append({
                        "id": str(citation.id) if hasattr(citation, 'id') else "",
                        "title": getattr(citation.web_citation, 'title', 'Web Result'),
                        "url": str(citation.web_citation.url),
                        "type": "web"
                    })
                elif hasattr(citation, 'x_citation') and citation.x_citation:
                    citations.append({
                        "id": str(citation.id) if hasattr(citation, 'id') else "",
                        "title": f"@{getattr(citation.x_citation, 'username', 'X User')}",
                        "url": str(getattr(citation.x_citation, 'url', 'https://x.com')),
                        "type": "x"
                    })
        
        tools_used = []
        if search_type in ["x", "both"]:
            tools_used.append("x_search")
        if search_type in ["web", "both"]:
            tools_used.append("web_search")
        
        return {
            "content": response.content,
            "citations": citations,
            "tools_used": tools_used
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "content": f"I couldn't complete the live search. Check @MondayTrade_ on X for the latest updates.",
            "citations": []
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "No query provided",
            "content": "Please provide a search query.",
            "citations": []
        }))
        sys.exit(1)
    
    query = sys.argv[1]
    search_type = sys.argv[2] if len(sys.argv) > 2 else "x"
    x_handle: Optional[str] = sys.argv[3] if len(sys.argv) > 3 else None
    
    result = perform_search(query, search_type, x_handle)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
