# Proposed Changes for agent/graph.py

```python
<<<<
async def synthesiser_node(state: AgentState) -> Dict[str, Any]:
    """Synthesise the gathered information into a report."""
    state["steps"].append("Synthesiser: Writing final report...")
    prompt = f"""Query: {state['query']}
    Context: {state['context'][:20000]}
    
    Write a detailed Markdown report based on the context above."""
    
    current_model = state["model"]
    error_count = state["error_count"]

    system_prompt = "You are a professional research synthesiser. Write a complete, thorough, well-structured research report. Do not truncate. Cover all findings exhaustively with headings, subheadings, and citations."

    try:
        report = await call_llm(prompt, system_prompt, current_model, max_tokens=4096)
        return {"report": report, "steps": state["steps"]}
====
async def synthesiser_node(state: AgentState) -> Dict[str, Any]:
    """Synthesise the gathered information into a report."""
    state["steps"].append("Synthesiser: Writing final report...")
    
    # Increased context window for better coverage
    context_snippet = state['context'][:30000]
    
    prompt = f"""
    RESEARCH QUERY: {state['query']}
    
    RESEARCH CONTEXT:
    {context_snippet}
    
    TASK:
    Write a comprehensive, deep-dive research report in Markdown. 
    1. Organize with clear H1, H2, and H3 headers.
    2. Use bullet points for key findings.
    3. Include a 'Sources' section at the end with citations.
    4. ENSURE COMPLETENESS: Do not summarize briefly; cover all unique data points from the context.
    5. Length should be at least 1500 words if the context allows.
    """
    
    current_model = state["model"]
    error_count = state["error_count"]

    system_prompt = """You are a lead research scientist at LUMEN. 
    Your goal is to produce the most thorough and professional research report possible. 
    NEVER truncate your output. ALWAYS aim for maximum detail and exhaustive coverage of the provided context.
    Structure your report with: Executive Summary, Detailed Findings (by topic), Analysis, and Conclusion."""

    try:
        # Final report synthesis with high token limit
        report = await call_llm(prompt, system_prompt, current_model, max_tokens=4096)
        return {"report": report, "steps": state["steps"]}
>>>>
```
