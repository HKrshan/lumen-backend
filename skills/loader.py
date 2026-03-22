import os
import importlib.util
import sys
from typing import Dict, Any, Optional

class Skill:
    """Represents a loaded skill with its metadata and implementation."""
    def __init__(self, name: str, description: str, module: Any):
        self.name = name
        self.description = description
        self.module = module

    async def run(self, **kwargs) -> Any:
        """Executes the skill's `execute` function."""
        if hasattr(self.module, "execute"):
            return await self.module.execute(**kwargs)
        return f"Error: Skill '{self.name}' has no `execute` function."

class SkillLoader:
    """Handles discovery, loading, and hot-reloading of skills."""
    def __init__(self, skills_dir: str = "skills"):
        self.skills_dir = os.path.abspath(skills_dir)
        self.skills: Dict[str, Skill] = {}

    def load_all_skills(self) -> Dict[str, Skill]:
        """Scans the directory and loads all valid skills."""
        self.skills.clear()
        
        if not os.path.exists(self.skills_dir):
            return {}

        for skill_name in os.listdir(self.skills_dir):
            skill_path = os.path.join(self.skills_dir, skill_name)
            
            if os.path.isdir(skill_path):
                md_path = os.path.join(skill_path, "SKILL.md")
                py_path = os.path.join(skill_path, "skill.py")
                
                if os.path.exists(md_path) and os.path.exists(py_path):
                    description = self._read_description(md_path)
                    module = self._load_module(skill_name, py_path)
                    
                    if module:
                        self.skills[skill_name] = Skill(skill_name, description, module)
        
        return self.skills

    def _read_description(self, path: str) -> str:
        """Reads the skill's Markdown description."""
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def _load_module(self, name: str, path: str) -> Optional[Any]:
        """Dynamically imports a Python module from a file path."""
        module_name = f"skills.{name}.skill"
        
        # Clear from sys.modules to enable hot-reloading
        if module_name in sys.modules:
            del sys.modules[module_name]

        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            return module
        return None

    def get_skill(self, name: str) -> Optional[Skill]:
        """Returns a loaded skill by name."""
        return self.skills.get(name)

    def get_skills_manifest(self) -> str:
        """Returns a formatted string describing all available skills for the LLM."""
        manifest = "AVAILABLE SKILLS:\n"
        for name, skill in self.skills.items():
            manifest += f"- {name}: {skill.description}\n"
        return manifest

# Global instance
loader = SkillLoader()
loader.load_all_skills()
