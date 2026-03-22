import asyncio
from typing import Dict, Any, List

# Supabase client setup
try:
    from supabase import create_client, Client
    from config import SUPABASE_URL, SUPABASE_KEY
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception:
    supabase = None

async def get_active_api_key(provider: str) -> str | None:
    """Fetch API key from Supabase for a given provider."""
    if not supabase:
        return None
    try:
        result = supabase.table("api_keys").select("api_key").eq("provider", provider).execute()
        if result.data:
            return result.data[0]["api_key"]
    except Exception:
        pass
    return None

async def search_question(question: str) -> List[Dict[str, Any]]:
    """Execute Tavily search for a sub-question."""
    # Fetch Tavily API key from Supabase
    api_key = await get_active_api_key("tavily")
    
    if not api_key:
        return []
    
    try:
        from tavily import TavilyClient
        tavily = TavilyClient(api_key=api_key)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: tavily.search(query=question, search_depth="advanced", max_results=3)
        )
        return response.get("results", [])
    except Exception:
        return []

async def scrape_url(url: str) -> Dict[str, Any]:
    """Extract markdown content and metadata from a URL via Firecrawl."""
    # Fetch Firecrawl API key from Supabase
    api_key = await get_active_api_key("firecrawl")
    
    if not api_key:
        return {"markdown": "", "metadata": {}}
    
    try:
        from firecrawl import FirecrawlApp
        firecrawl = FirecrawlApp(api_key=api_key)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: firecrawl.scrape_url(url, params={'formats': ['markdown']})
        )
        return {
            "markdown": result.get("markdown", ""),
            "metadata": result.get("metadata", {})
        }
    except Exception:
        return {"markdown": "", "metadata": {}}

async def execute(query: str) -> Dict[str, Any]:
    """Execute the research skill."""
    # Step 1: Search
    results = await search_question(query)
    urls = [res["url"] for res in results if "url" in res][:3]

    if not urls:
        return {"context": f"No relevant sources found for query: {query}", "sources": []}

    # Step 2: Scrape
    scrape_tasks = [scrape_url(url) for url in urls]
    scraped_data_list = await asyncio.gather(*scrape_tasks)

    context_parts = []
    sources = []

    for i, res in enumerate(results[:3]):
        url = res.get("url", "")
        if not url:
            continue
        scraped = scraped_data_list[i]
        markdown = scraped.get("markdown", "")
        metadata = scraped.get("metadata", {})

        image = metadata.get("og:image") or metadata.get("image") or None

        sources.append({
            "url": url,
            "title": res.get("title", ""),
            "snippet": res.get("content", ""),
            "image": image
        })
        if markdown:
            context_parts.append(markdown)

    context = "\n\n".join(context_parts)
    if not context:
        context = f"Sources found but could not be scraped for: {query}"

    return {"context": context, "sources": sources}
