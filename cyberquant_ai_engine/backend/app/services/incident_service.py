import json
from pathlib import Path
from typing import List, Dict, Any, Optional

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "historical_incidents.json"

# Normalization mapping for standard attack types
ATTACK_TYPE_ALIASES = {
    "ransomware": "Ransomware",
    "ransom": "Ransomware",
    "cryptolocker": "Ransomware",
    "phishing": "Phishing",
    "spear phishing": "Phishing",
    "spear-phishing": "Phishing",
    "bec": "Phishing",
    "whaling": "Phishing",
    "business email compromise": "Phishing",
    "ddos": "DDoS",
    "dos": "DDoS",
    "denial of service": "DDoS",
    "distributed denial of service": "DDoS",
    "sql injection": "SQL Injection",
    "sqli": "SQL Injection",
    "sql": "SQL Injection",
    "cross-site scripting": "Cross-Site Scripting",
    "xss": "Cross-Site Scripting",
    "stored xss": "Cross-Site Scripting",
    "reflected xss": "Cross-Site Scripting",
    "malware": "Malware",
    "trojan": "Malware",
    "worm": "Malware",
    "spyware": "Malware",
    "man-in-the-middle": "Man-in-the-Middle attacks",
    "mitm": "Man-in-the-Middle attacks",
    "man in the middle": "Man-in-the-Middle attacks",
    "zero-day": "Zero-day attacks",
    "zero day": "Zero-day attacks",
    "0-day": "Zero-day attacks",
    "supply chain": "Zero-day attacks",
    "password attack": "Password attacks",
    "password attacks": "Password attacks",
    "credential stuffing": "Password attacks",
    "brute force": "Password attacks"
}

class IncidentService:
    def __init__(self):
        self._incidents: List[Dict[str, Any]] = []
        self._load_data()

    def _load_data(self):
        if DATA_PATH.exists():
            try:
                with open(DATA_PATH, "r", encoding="utf-8") as f:
                    self._incidents = json.load(f)
            except Exception as e:
                print(f"[Warning] Failed to load historical incidents: {e}")
                self._incidents = []
        else:
            self._incidents = []

    def normalize_attack_type(self, raw_name: str) -> str:
        cleaned = raw_name.strip().lower()
        for alias, canonical in ATTACK_TYPE_ALIASES.items():
            if alias in cleaned:
                return canonical
        return raw_name.title()

    def get_all_incidents(self) -> List[Dict[str, Any]]:
        return self._incidents

    def get_incidents_by_attack(self, attack_name: str, limit: int = 3) -> List[Dict[str, Any]]:
        canonical = self.normalize_attack_type(attack_name)
        matched = []
        for inc in self._incidents:
            if inc.get("attack_type", "").lower() == canonical.lower():
                matched.append(inc)
            elif canonical.lower() in inc.get("incident_name", "").lower():
                matched.append(inc)
        
        # If no exact match, return general severe incidents
        if not matched and self._incidents:
            return self._incidents[:limit]
        return matched[:limit]

    def get_rag_grounding_context(self, query: str, max_items: int = 3) -> str:
        """
        RAG Interface Hook:
        Retrieves matching incident documents and formats them as structured grounding context
        for prompt augmentation in Gemini. In later stages, this can connect to Chroma/FAISS.
        """
        matches = self.get_incidents_by_attack(query, limit=max_items)
        if not matches:
            return "No historical incident records match this query."

        context_lines = ["--- VERIFIED HISTORICAL INCIDENTS GROUNDING ---"]
        for idx, inc in enumerate(matches, 1):
            context_lines.append(
                f"[{idx}] {inc['incident_name']} ({inc['year']}, {inc['country']})\n"
                f"    Organization: {inc['organization']}\n"
                f"    Method: {inc['attack_method']}\n"
                f"    Consequences: {inc['consequences']}\n"
                f"    Financial Loss: {inc['financial_losses']} ({inc.get('financial_status', 'Reported')})\n"
                f"    Sources: {', '.join(inc.get('sources', []))}"
            )
        return "\n\n".join(context_lines)

incident_service = IncidentService()
