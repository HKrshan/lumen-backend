import os
import asyncio
import pytest
from skills.loader import SkillLoader

@pytest.mark.asyncio
async def test_skill_loading():
    """Verify skills are loaded correctly."""
    loader = SkillLoader(skills_dir="skills")
    skills = loader.load_all_skills()
    
    assert "research_skill" in skills
    assert "code_skill" in skills
    assert "email_skill" in skills
    assert "AVAILABLE SKILLS:" in loader.get_skills_manifest()

@pytest.mark.asyncio
async def test_hot_reloading():
    """Verify hot-reloading works when a skill is modified."""
    loader = SkillLoader(skills_dir="skills")
    loader.load_all_skills()
    
    skill_path = os.path.abspath("skills/code_skill/skill.py")
    
    # Original execution
    original_result = await loader.get_skill("code_skill").run(language="python", code="print(1)", task="test")
    assert "SIMULATED OUTPUT" in original_result
    
    # Modify the skill file
    with open(skill_path, "r") as f:
        original_content = f.read()
    
    new_content = original_content.replace("SIMULATED OUTPUT", "MODIFIED OUTPUT")
    with open(skill_path, "w") as f:
        f.write(new_content)
        
    try:
        # Reload
        loader.load_all_skills()
        new_result = await loader.get_skill("code_skill").run(language="python", code="print(1)", task="test")
        assert "MODIFIED OUTPUT" in new_result
    finally:
        # Restore
        with open(skill_path, "w") as f:
            f.write(original_content)
