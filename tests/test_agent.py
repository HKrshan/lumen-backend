
import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from agent.loop import research_agent

@pytest.mark.asyncio
async def test_research_agent_full_loop():
    """Test the full research agent loop with mocked external dependencies."""
    tasks = {"test_task": {"status": "pending", "steps": [], "result": None}}
    
    # Mock LLM calls: first for planning, second for synthesis
    mock_llm_responses = [
        '["sub-question 1", "sub-question 2"]', 
        "This is a synthesized research report based on findings."
    ]
    
    # Mock search results for each sub-question
    mock_search_results = [
        {"url": "https://example.com/1", "title": "Example 1"},
        {"url": "https://example.com/2", "title": "Example 2"}
    ]
    
    # Mock scrape content for each URL
    mock_scrape_content = "This is some scraped markdown content."

    # Use patch with side_effect for multiple LLM calls
    with patch("agent.loop.call_llm", side_effect=mock_llm_responses) as mock_llm, \
         patch("agent.loop.search_question", AsyncMock(return_value=mock_search_results)) as mock_search, \
         patch("agent.loop.scrape_url", AsyncMock(return_value=mock_scrape_content)) as mock_scrape:
        
        # Run the research agent
        await research_agent("test query", "quick", "test_task", tasks)
        
        # Assertions
        assert tasks["test_task"]["status"] == "done"
        assert any("Planner:" in step for step in tasks["test_task"]["steps"])
        assert any("Searcher:" in step for step in tasks["test_task"]["steps"])
        assert any("Scraper:" in step for step in tasks["test_task"]["steps"])
        assert any("Synthesiser:" in step for step in tasks["test_task"]["steps"])
        assert any("Memory:" in step for step in tasks["test_task"]["steps"])
        assert tasks["test_task"]["result"] == "This is a synthesized research report based on findings."
        
        # Verify mocks were called
        assert mock_llm.call_count == 2
        assert mock_search.call_count == 2 # Once for each sub-question
        assert mock_scrape.call_count == 2 # Once for each unique URL
