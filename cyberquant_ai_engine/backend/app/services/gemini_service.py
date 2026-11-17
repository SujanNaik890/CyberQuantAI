import os
import json
import concurrent.futures
from typing import List, Dict, Any, Optional
from app.config import settings
from app.schemas.chat import ChatMessage, GroundingSource
from app.services.incident_service import incident_service

SYSTEM_INSTRUCTION = """You are CyberQuant AI, an elite Cybersecurity Attack Explanation and Analysis Specialist.
Your primary mission is to analyze and explain cyberattacks detected by security monitoring modules or submitted by analysts.

Whenever you receive an attack type or detection result, you MUST generate a thorough, professional, structured report strictly following these 8 sections:

## 1. TYPE OF ATTACK
- Identify the attack name and classification.
- Explain what the attack means in simple, accessible language.
- Explain how the attack generally works (execution mechanics).
- Describe the attack's main characteristics and threat actor objectives.

## 2. VULNERABILITY EXPLOITED
- Identify the common vulnerability or weakness associated with this attack (e.g., CWE identifiers, OWASP Top 10 categories).
- Explain how threat actors exploit this weakness.
- Include verified CVE identifiers where applicable (e.g., CVE-2017-0144 for WannaCry EternalBlue, CVE-2017-5638 for Equifax Apache Struts, CVE-2021-44228 for Log4Shell).
- EXPLICIT CAUSALITY NOTE: Clearly state whether the vulnerability is confirmed in this specific incident or only a possible cause based on the available detection information. Never assume a specific vulnerability caused the attack without evidence.

## 3. HISTORICAL INCIDENTS
- Provide 1–3 concise, real-world examples of verified past incidents involving this attack type.
- For each incident include: Incident Name, Affected Organization, Country, Year, Brief Explanation, and Reported Financial Losses (distinguishing verified numbers from estimates).
- Include reliable source references (e.g., CISA, FBI, UK ICO, SEC Filings, FTC).
- NEVER invent incidents, organizations, dates, or financial figures.

## 4. RISK FACTOR
- Provide an objective risk classification: Low, Medium, High, or Critical.
- Include: Likelihood of occurrence, Potential severity, Possible operational consequences, and Potential financial consequences.
- Detail the reasoning behind the risk classification.
- DISTINCTION REQUIREMENT: Explicitly distinguish between sensor detection confidence (e.g., 94% certainty that a signature was observed) and the actual risk to the organization (the business/operational damage).
- If specific organizational infrastructure details are unavailable, clearly state that this risk assessment is preliminary.

## 5. DETECTION MEASURES
- Explain how cybersecurity and SOC teams identify and monitor this attack.
- Include: Common Indicators of Compromise (IOCs), suspicious network behavior, relevant system/application logs (e.g. Windows Event IDs, Sysmon, Web/DB logs), monitoring techniques, and security tools (EDR, SIEM, WAF, NTA).
- Provide practical, realistic examples of what defenders look for.

## 6. POSSIBLE IMPACT
- Explain the potential damage the attack could cause across: Data theft/loss, Financial losses, Business/operational disruption, Customer information exposure, Reputational damage, and Legal/regulatory consequences (e.g., GDPR, HIPAA, DPDP).
- Clearly distinguish potential impacts from confirmed consequences.

## 7. PREVENTION AND MITIGATION
Divide recommendations into two distinct sub-sections:
A. Prevention (Defensive hardening):
   - Security patching, Access controls, Multi-Factor Authentication (MFA), Network segmentation, Employee awareness, and Backups/monitoring.
B. Immediate Response (Incident triage):
   - What the organization should do immediately upon detection.
   - Which specific systems to investigate.
   - Containment and isolation measures.
   - How to preserve volatile memory, logs, and forensic evidence.

## 8. IMMEDIATE ACTION SUMMARY
- Provide a prioritized, numbered checklist of the top 3–5 most critical actions the organization must execute immediately to contain the threat and minimize further damage.

Formatting & Tone:
- Authoritative, professional, structured, and understandable to both security practitioners and organizational leadership.
- Use clear markdown headers, bold emphasis, bullet points, and tables where appropriate.
- Keep explanations informative and concise without unnecessary fluff.
"""

GENERAL_CYBER_SYSTEM_PROMPT = """You are CyberQuant AI, an elite Senior Cybersecurity Architect and AI Security Advisor.
Your objective is to provide authoritative, comprehensive, technically accurate, and practical explanations to any cybersecurity, network defense, cloud security, cryptography, malware analysis, and risk management questions.

Response Formatting Guidelines:
- Structure your response cleanly with clear markdown headers (`###`), bullet points, and bold terms.
- Use comparison tables when contrasting two or more concepts (e.g. Virus vs Worm, Symmetric vs Asymmetric, IDS vs IPS).
- Explain core concepts clearly with real-world context and practical defender recommendations.
- Where relevant, include technical examples, configuration snippets, CLI commands, or security standards (NIST SP 800-53, CIS Controls, ISO 27001, OWASP).
- Always provide actionable, industry-standard recommendations.
- Keep the tone professional, authoritative, and educational."""

class GeminiService:
    CANDIDATE_MODELS = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash"
    ]

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
        self._client = None
        self._init_client()

    def _init_client(self):
        if not self.api_key or self.api_key.startswith("your_"):
            print("[Info] Gemini API key not configured in .env. Running in hybrid domain knowledge fallback mode.")
            return

        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
            print(f"[Success] Gemini Client initialized with API key! Primary model: {self.model_name}")
        except ImportError:
            print("[Warning] 'google-genai' package is not installed. Running in domain model mode.")
            self._client = None
        except Exception as e:
            print(f"[Warning] Failed to initialize Gemini Client: {e}")
            self._client = None

    def is_configured(self) -> bool:
        return bool(self._client and self.api_key and not self.api_key.startswith("your_"))

    def _call_gemini_models(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.3
    ) -> Optional[str]:
        """
        Attempts to call Gemini across available models with fallback to avoid temporary 503 rate limits.
        """
        if not self._client:
            return None

        from google.genai import types

        config_args: Dict[str, Any] = {
            "temperature": temperature,
            "max_output_tokens": max_tokens
        }
        if system_instruction:
            config_args["system_instruction"] = system_instruction

        models_to_try = [self.model_name] + [m for m in self.CANDIDATE_MODELS if m != self.model_name]

        for model_id in models_to_try:
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            try:
                def _invoke(m=model_id):
                    return self._client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=types.GenerateContentConfig(**config_args)
                    )

                fut = executor.submit(_invoke)
                res = fut.result(timeout=6.0)
                executor.shutdown(wait=False)

                if res and res.text:
                    return res.text.strip()
            except Exception:
                try:
                    executor.shutdown(wait=False, cancel_futures=True)
                except Exception:
                    pass
                continue

        return None

    def analyze_attack(
        self,
        attack_type: str,
        detection_details: Optional[Dict[str, Any]] = None,
        simple_language: bool = False
    ) -> Dict[str, Any]:
        """
        Generates the mandatory 8-section Attack Explanation and Analysis report.
        """
        canonical_attack = incident_service.normalize_attack_type(attack_type)
        rag_context = incident_service.get_rag_grounding_context(canonical_attack, max_items=3)

        detection_prompt_info = ""
        if detection_details:
            detection_prompt_info = (
                "\n--- SENSOR DETECTION CONTEXT (PROVIDED BY DETECTION MODULE) ---\n"
                f"- Reported Attack Type: {detection_details.get('attack_type', canonical_attack)}\n"
                f"- Sensor Severity Rating: {detection_details.get('severity', 'Not Specified')}\n"
                f"- Sensor Detection Confidence: {detection_details.get('confidence', 'Not Specified')}%\n"
                f"- Detection Source: {detection_details.get('source', 'Unknown Detection Sensor')}\n"
                f"- Target Asset / IP: {detection_details.get('target_asset', 'Unspecified Host')}\n"
                f"- Raw Indicator / Signature: {detection_details.get('raw_payload_snippet', 'None Provided')}\n"
                "Note: Factor these specific detection details into Section 2, 4, 5, 7, and 8. "
                "Do NOT assume unconfirmed vulnerabilities or confuse detection confidence with risk.\n"
            )

        style_note = "Explain technical concepts in simple, clear language for non-technical leadership." if simple_language else "Provide authoritative technical depth for security operations analysts."

        user_prompt = (
            f"Please generate the complete 8-section Attack Explanation and Analysis report for: {canonical_attack}.\n"
            f"{style_note}\n\n"
            f"{detection_prompt_info}\n"
            f"{rag_context}\n\n"
            "Ensure ALL 8 numbered sections are present with full details according to your system instructions."
        )

        full_prompt = f"{SYSTEM_INSTRUCTION}\n\n{user_prompt}"

        # Try Gemini API across fallback models
        gemini_text = self._call_gemini_models(full_prompt, temperature=0.2)
        if gemini_text:
            return {
                "attack_name": canonical_attack,
                "analysis_markdown": gemini_text,
                "suggested_followups": self._generate_followups(canonical_attack),
                "sources": self._extract_sources(canonical_attack)
            }

        # High-Fidelity Verified Domain Fallback
        return self._generate_domain_8section_analysis(canonical_attack, detection_details, simple_language)

    def generate_chat_response(
        self,
        user_message: str,
        history: List[ChatMessage] = [],
        simple_language: bool = False,
        context_attack: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Intelligent Chatbot router:
        1. If user asks to explain/analyze an attack or sends detection results -> returns the 8-section analysis.
        2. If user asks general cybersecurity questions, comparisons, or concepts (e.g. 'difference between virus and worms', 'what is a firewall') -> provides clear, structured cybersecurity answers!
        """
        user_clean = user_message.lower().strip()

        # Specific cyber attack keywords
        attack_names = [
            "ransomware", "phishing", "ddos", "denial of service", "sql injection", "sqli",
            "cross-site scripting", "xss", "zero-day", "0-day", "man-in-the-middle", "mitm"
        ]

        is_direct_attack_request = bool(context_attack)
        target_attack = context_attack

        if not is_direct_attack_request:
            # Check if query is specifically an attack explanation/report request
            for atk in attack_names:
                # Matches exact attack name or explicit phrases: "explain ransomware", "analyze sql injection", "ransomware attack"
                if (user_clean == atk or 
                    user_clean == f"explain {atk}" or 
                    user_clean == f"analyze {atk}" or 
                    f"{atk} attack" in user_clean or
                    f"{atk} incident" in user_clean or
                    f"triage {atk}" in user_clean or
                    user_clean.startswith(f"what is {atk} attack")):
                    is_direct_attack_request = True
                    target_attack = atk
                    break

        # If it is explicitly an attack analysis request:
        if is_direct_attack_request and target_attack:
            res = self.analyze_attack(target_attack, simple_language=simple_language)
            return {
                "reply": res["analysis_markdown"],
                "suggested_followups": res["suggested_followups"],
                "sources": res["sources"]
            }

        # Otherwise: Answer as a versatile, expert cybersecurity assistant!
        return self._answer_general_cybersecurity_question(
            user_message,
            history=history,
            simple_language=simple_language
        )

    def _answer_general_cybersecurity_question(
        self,
        question: str,
        history: List[ChatMessage] = [],
        simple_language: bool = False
    ) -> Dict[str, Any]:
        """
        Answers general cybersecurity questions, comparisons, fundamentals, and defense concepts.
        """
        style_instruction = (
            "Explain in simple, accessible language suitable for non-technical users."
            if simple_language else
            "Provide authoritative technical depth, comparison tables where appropriate, and practical defender recommendations."
        )

        history_context = ""
        if history:
            history_context = "Conversation History:\n" + "\n".join([f"{m.role.capitalize()}: {m.content[:250]}" for m in history[-4:]]) + "\n\n"

        prompt = (
            f"Style: {style_instruction}\n\n"
            f"{history_context}"
            f"User Question: {question}\n\n"
            "Provide a structured, helpful, and thorough cybersecurity answer."
        )

        # 1. Try Gemini API first
        gemini_reply = self._call_gemini_models(
            prompt,
            system_instruction=GENERAL_CYBER_SYSTEM_PROMPT,
            temperature=0.3
        )
        if gemini_reply:
            return {
                "reply": gemini_reply,
                "suggested_followups": self._generate_general_followups(question),
                "sources": []
            }

        # 2. Rich Domain Knowledge Fallback if API is unavailable
        fallback_reply = self._generate_domain_cyber_qa(question, simple_language)
        return {
            "reply": fallback_reply,
            "suggested_followups": self._generate_general_followups(question),
            "sources": []
        }

    def _generate_general_followups(self, question: str) -> List[str]:
        q = question.lower()
        if "virus" in q or "worm" in q or "malware" in q:
            return [
                "What is the difference between a Trojan and a Virus?",
                "How does ransomware differ from a standard worm?",
                "What endpoint security tools block self-replicating worms?"
            ]
        elif "firewall" in q:
            return [
                "What is the difference between a stateful firewall and a WAF?",
                "How do Next-Generation Firewalls (NGFW) inspect encrypted TLS traffic?",
                "What are the best practices for firewall rule segmentation?"
            ]
        elif "encryption" in q or "crypto" in q:
            return [
                "How does AES-256 compare to RSA-4096 in speed and security?",
                "What is the difference between hashing and encryption?",
                "How does Diffie-Hellman key exchange work securely over untrusted networks?"
            ]
        elif "zero trust" in q:
            return [
                "What are the core pillars of NIST SP 800-207 Zero Trust?",
                "How does microsegmentation support Zero Trust architecture?",
                "How to transition from perimeter-based VPN to Zero Trust Network Access (ZTNA)?"
            ]
        elif "cia" in q:
            return [
                "Give real-world examples of attacks targeting each pillar of the CIA Triad.",
                "How does the Parkerian Hexad extend the traditional CIA Triad?",
                "Which security controls protect Data Integrity vs Data Confidentiality?"
            ]
        else:
            return [
                "Explain the practical defense strategies for this topic.",
                "What industry standards (NIST / CIS / OWASP) apply here?",
                "Explain this concept in simple terms for executive leadership."
            ]

    def _extract_sources(self, attack: str) -> List[GroundingSource]:
        matched = incident_service.get_incidents_by_attack(attack, limit=3)
        sources = []
        for inc in matched:
            for s in inc.get("sources", []):
                sources.append(GroundingSource(
                    title=f"{inc['incident_name']} ({inc['year']})",
                    reference=s,
                    verified=inc.get("is_verified_financial", True)
                ))
        return sources[:4]

    def _generate_followups(self, attack: str) -> List[str]:
        return [
            f"Explain {attack} in simple language for executives.",
            f"What are the indicators of compromise (IOCs) for {attack}?",
            f"What containment steps should I take immediately for {attack}?",
            f"What real-world companies suffered financial losses from {attack}?"
        ]

    def _generate_domain_cyber_qa(self, question: str, simple_language: bool = False) -> str:
        """
        High-fidelity domain knowledge responses for fundamental cybersecurity questions.
        """
        q = question.lower().strip()

        # 1. VIRUS VS WORMS
        if ("virus" in q and "worm" in q) or "virus and worm" in q or "worms and virus" in q:
            return """### 🦠 Computer Virus vs. Computer Worm: Key Differences

While both **viruses** and **worms** are categories of **malware** designed to compromise digital systems, they differ fundamentally in how they infect, propagate, and require host interaction.

| Characteristic | Computer Virus | Computer Worm |
| :--- | :--- | :--- |
| **Core Definition** | Malicious code that attaches to legitimate files/programs and needs a host to execute. | Independent malicious software that self-replicates and spreads across networks autonomously. |
| **Host File Required** | **Yes:** Must infect a host program (.exe), macro (.docm), or system file. | **No:** Completely standalone program that does not modify other files. |
| **Human Action Needed** | **Yes:** Spreads only when a human user executes the infected file or opens an attachment. | **No:** Zero human intervention required; replicates autonomously by scanning networks. |
| **Propagation Speed** | **Moderate:** Constrained by human file-sharing behaviors. | **Extremely Rapid:** Can infect tens of thousands of hosts globally in minutes. |
| **Infection Vector** | Weaponized email attachments, infected USB drives, downloaded pirated software. | Exploits unpatched network protocol vulnerabilities (e.g. SMB, RPC, RDP, SSH). |
| **Network Schedulers** | Does not natively scan subnets for targets. | Actively probes IP ranges looking for open, vulnerable listening ports. |
| **Historical Examples** | ILOVEYOU (2000), CIH/Chernobyl (1998), Melissa (1999). | WannaCry (SMB EternalBlue, 2017), Conficker (2008), Stuxnet (2010), Morris Worm (1988). |

---

### Core Mechanics & Defense

#### 1. How a Virus Works:
- **Attachment Phase:** Injects executable bytes into a host binary (e.g. `calc.exe`).
- **Dormancy:** Remains dormant until the victim explicitly double-clicks or runs the host application.
- **Payload Execution:** Upon execution, it loads into memory, executes malicious commands (data wiping, keylogging), and searches local drives to infect other `.exe` or document files.

#### 2. How a Worm Works:
- **Target Discovery:** Automatically generates IP ranges and scans for hosts listening on specific network ports (e.g. TCP 445 for SMB).
- **Remote Exploitation:** Transmits an exploit payload (e.g. buffer overflow) to execute code directly in memory without the user's knowledge.
- **Self-Installation & Spread:** Installs a copy of itself, spawns new scanner threads, and uses the newly compromised host to attack the next set of targets.

---

### Defensive Recommendations
1. **Patching Network Ports:** Keep all operating systems and network protocol stacks patched to eliminate zero-click ingress vulnerabilities.
2. **Behavioral EDR:** Deploy Endpoint Detection and Response (EDR) to detect anomalous process creation and mass lateral port scanning.
3. **Internal Network Segmentation:** Prevent lateral subnet propagation by restricting port access between employee workstations (blocking workstation-to-workstation SMB).
4. **Email & Download Sandboxing:** Inspect and quarantine suspicious file attachments before they reach end-user inboxes."""

        # 2. FIREWALL
        elif "firewall" in q:
            return """### 🛡️ What is a Firewall & How Does It Work?

A **firewall** is a foundational network security control that monitors, inspects, and filters incoming and outgoing network traffic based on established security policies.

---

### Core Firewall Classifications

| Generation | Type | Inspection Layer | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **1st Gen** | **Packet-Filtering Firewall** | Layer 3 & 4 (Network / Transport) | Inspects source/destination IP, port numbers, and protocol without tracking connection state. |
| **2nd Gen** | **Stateful Inspection Firewall** | Layer 3 & 4 (State Tracking) | Tracks active TCP handshakes; automatically allows return packets for established sessions. |
| **3rd Gen** | **Next-Gen Firewall (NGFW)** | Layer 7 (Application Layer) | Deep Packet Inspection (DPI), user identity awareness, TLS/SSL decryption, and built-in IPS. |
| **Specialized** | **Web Application Firewall (WAF)** | Layer 7 (HTTP / HTTPS) | Protects web applications from OWASP Top 10 vulnerabilities (SQLi, XSS, CSRF, remote code execution). |

---

### How a Firewall Works (The 3-Step Process)

1. **Traffic Interception:** The firewall intercepts data packets arriving at network boundaries (e.g., between the corporate LAN and the public Internet).
2. **Rule Evaluation:** Packets are sequentially evaluated against an Access Control List (ACL):
   - *Example Rule:* `ALLOW TCP Source ANY Port ANY -> Destination 10.0.0.5 Port 443`
   - *Implicit Deny:* Any traffic not explicitly allowed is automatically dropped (`DROP ALL`).
3. **Action Enforcement:** The packet is either **Allowed**, **Blocked** (dropped silently), or **Rejected** (dropped with a TCP RST or ICMP Unreachable message).

---

### Best Practices for Hardening
- **Default-Deny Policy:** Enforce an explicit default-deny rule at the bottom of all rule bases.
- **Egress Filtering:** Strictly restrict outbound traffic to prevent compromised machines from beaconing to command-and-control (C2) servers.
- **Rule Lifecycle Audits:** Routinely remove orphaned rules and restrict overly permissive `ANY:ANY` configurations."""

        # 3. ENCRYPTION (SYMMETRIC VS ASYMMETRIC)
        elif "symmetric" in q or "asymmetric" in q or "encryption" in q:
            return """### 🔐 Symmetric vs. Asymmetric Encryption: Technical Comparison

Cryptography protects digital information through encryption—converting human-readable plaintext into unreadable ciphertext.

| Criterion | Symmetric Encryption | Asymmetric Encryption (Public Key) |
| :--- | :--- | :--- |
| **Keys Used** | **1 Single Key:** Same shared key is used for both encryption and decryption. | **2 Paired Keys:** A mathematically linked **Public Key** (encrypts) and **Private Key** (decrypts). |
| **Performance Speed** | **Extremely Fast:** Suitable for massive datasets, streaming, and full disk encryption. | **Slower (100–1000x):** Computationally intensive modular arithmetic / elliptic curves. |
| **Key Distribution Problem** | **High:** How do you securely share the secret key over an untrusted network? | **Solved:** The public key can be published anywhere without compromising the private key. |
| **Key Lengths** | 128-bit, 256-bit (AES). | 2048-bit, 4096-bit (RSA) or 256-bit/384-bit (ECC). |
| **Common Algorithms** | AES (GCM/CBC), ChaCha20, 3DES (deprecated). | RSA, ECC (ECDSA/Ed25519), Diffie-Hellman (ECDH). |
| **Primary Use Cases** | Bulk database encryption, BitLocker disk encryption, encrypted file storage. | TLS/HTTPS handshakes, digital signatures, SSH key authentication, PGP email. |

---

### How Modern Systems Use Both (Hybrid Cryptography in TLS 1.3)
Real-world protocols like **HTTPS (TLS 1.3)** combine the strengths of both:
1. **Asymmetric Key Exchange:** Client and server use asymmetric cryptography (ECDHE) to authenticate identity and securely negotiate a temporary session key.
2. **Symmetric Bulk Encryption:** Once the shared secret is established, all high-volume HTTP traffic is encrypted using ultra-fast symmetric **AES-256-GCM**."""

        # 4. CIA TRIAD
        elif "cia" in q or "triad" in q:
            return """### 🔺 The CIA Triad: Core Pillars of Information Security

The **CIA Triad** is the foundational model guiding all information security policies, threat modeling, and defensive architectures.

```
            [ Confidentiality ]
                 /\
                /  \
               /    \
              /  CIA \
             /        \
[ Integrity ]----------[ Availability ]
```

---

### The Three Pillars Detailed

#### 1. Confidentiality (Prevent Unauthorized Reading)
- **Goal:** Ensuring sensitive data is accessible only to authorized entities and shielded from eavesdropping.
- **Defensive Controls:** End-to-end encryption (AES-256, TLS 1.3), Multi-Factor Authentication (MFA), Role-Based Access Control (RBAC), and Data Loss Prevention (DLP).
- **Threat Examples:** Data exfiltration, credential stuffing, packet sniffing, unauthorized insider browsing.

#### 2. Integrity (Prevent Unauthorized Alteration)
- **Goal:** Ensuring information and systems remain accurate, complete, and untampered with throughout storage and transmission.
- **Defensive Controls:** Cryptographic hashing (SHA-256), digital signatures, database transaction constraints, File Integrity Monitoring (FIM).
- **Threat Examples:** SQL Injection data modification, man-in-the-middle payload tampering, ransomware silent file corruption.

#### 3. Availability (Prevent Unauthorized Outages)
- **Goal:** Ensuring authorized users have reliable, timely access to data, applications, and networks whenever needed.
- **Defensive Controls:** High-availability load balancers, DDoS cloud scrubbing (Cloudflare/Akamai), immutable offsite backups, UPS power redundancies.
- **Threat Examples:** Distributed Denial of Service (DDoS) floods, ransomware system encryption, physical server hardware failure."""

        # 5. ZERO TRUST ARCHITECTURE
        elif "zero trust" in q or "ztna" in q:
            return """### 🛡️ Zero Trust Architecture (ZTA): Principles & Implementation

**Zero Trust** is a strategic cybersecurity framework based on the principle: **"Never Trust, Always Verify."** It eliminates the traditional assumption that entities inside the corporate perimeter should be trusted.

---

### Core Tenets (NIST SP 800-207)

1. **Verify Explicitly:** Always authenticate and authorize based on all available data points—including user identity, device health, location, workload, and data classification.
2. **Use Least Privilege Access:** Limit user and service account access with Just-In-Time (JIT) and Just-Enough-Access (JEA) permissions.
3. **Assume Breach:** Design networks assuming attackers are already operating within the internal perimeter. Segment networks, verify encryption in transit, and continuously monitor telemetry.

---

### Key Building Blocks of Zero Trust
- **Identity as the Perimeter:** Phishing-resistant MFA (FIDO2) and contextual conditional access policies.
- **Microsegmentation:** Granular network isolation preventing lateral movement between servers and workstations.
- **Continuous Posture Assessment:** Verifying endpoint EDR status and compliance before authorizing cloud resource connections."""

        # 6. GENERAL CYBERSECURITY FALLBACK
        else:
            return f"""### 🛡️ CyberQuant AI // Security Advisory

**Topic:** {question}

---

### Overview & Core Principles
In modern cybersecurity engineering, addressing this requires evaluating the threat surface, defensive controls, and operational best practices:

1. **Identity & Access Management (IAM):**
   - Enforce the Principle of Least Privilege across all users, service accounts, and API integrations.
   - Mandate Multi-Factor Authentication (MFA) utilizing phishing-resistant FIDO2 hardware tokens.

2. **Boundary & Network Defense:**
   - Implement network microsegmentation and egress traffic filtering.
   - Route ingress connections through Web Application Firewalls (WAF) and DDoS scrubbing services.

3. **Telemetry & Detection:**
   - Centralize audit logs into a 24/7 monitored SIEM platform (Windows Security Events, Sysmon, CloudTrail).
   - Deploy Endpoint Detection and Response (EDR) with automated host isolation capabilities.

4. **Resilience & Governance:**
   - Maintain offline, immutable 3-2-1 backups tested via scheduled disaster recovery exercises.
   - Align organizational security policies with NIST Cybersecurity Framework (CSF 2.0) and CIS Critical Security Controls."""


    def _generate_domain_8section_analysis(
        self,
        attack_type: str,
        detection_details: Optional[Dict[str, Any]] = None,
        simple_language: bool = False
    ) -> Dict[str, Any]:
        """
        High-Fidelity Curated Domain Model adhering 100% to the 8 required sections.
        """
        det_conf = detection_details.get("confidence") if detection_details else None
        det_sev = detection_details.get("severity") if detection_details else None
        det_src = detection_details.get("source") if detection_details else None
        det_asset = detection_details.get("target_asset") if detection_details else None

        detection_header = ""
        if detection_details:
            detection_header = (
                f"> **Detection Alert Context**: Ingested alert from `{det_src or 'Sensor'}` | "
                f"Reported Severity: **{det_sev or 'Unspecified'}** | "
                f"Sensor Confidence: **{det_conf or 'N/A'}%** | "
                f"Target Asset: `{det_asset or 'Local Network Segment'}`\n\n"
            )

        incidents = incident_service.get_incidents_by_attack(attack_type, limit=2)
        incidents_md = ""
        for idx, inc in enumerate(incidents, 1):
            incidents_md += (
                f"**Example {idx}: {inc['incident_name']}**\n"
                f"- **Organization Affected:** {inc['organization']}\n"
                f"- **Country & Year:** {inc['country']} ({inc['year']})\n"
                f"- **What Happened:** {inc['consequences']}\n"
                f"- **Reported Financial Losses:** {inc['financial_losses']} *(Status: {inc.get('financial_status', 'Reported')})*\n"
                f"- **Verified Source:** {', '.join(inc.get('sources', []))}\n\n"
            )

        if not incidents_md:
            incidents_md = "- *No verified public case study is currently mapped to this specific query in the baseline database.*\n\n"

        atk_lower = attack_type.lower()

        # ----------------------------------------------------
        # 1. RANSOMWARE
        # ----------------------------------------------------
        if "ransomware" in atk_lower:
            text = f"""{detection_header}## 1. TYPE OF ATTACK
- **Identification:** Ransomware (Cryptoviral Extortion).
- **Simple Language Meaning:** A digital hostage attack where cybercriminals lock (encrypt) an organization's computers and data, demanding ransom payment in exchange for a decryption key.
- **How It Generally Works:** Attackers gain initial network entry, perform silent reconnaissance, escalate administrative privileges, exfiltrate confidential files, disable automated backups, and execute a high-speed cryptographic locking process (AES-256 / RSA-4096) across servers and databases.
- **Main Characteristics:** Employs the **Double & Triple Extortion** model (data encryption + threat of public data leakage on dark web shame blogs + DDoS extortion).

## 2. VULNERABILITY EXPLOITED
- **Vulnerability Weaknesses:** 
  - Exposed Remote Desktop Protocol (RDP) or VPN endpoints lacking Multi-Factor Authentication (CWE-287 / CWE-308).
  - Unpatched perimeter network vulnerabilities (e.g., Citrix NetScaler CVE-2023-3519, FortiOS CVE-2024-1709, or SMBv1 EternalBlue CVE-2017-0144).
  - Inadequate internal network segmentation allowing lateral Pass-the-Hash movement.
- **Exploitation Method:** Attackers leverage automated credential stuffing, stolen session cookies, or public exploit scripts against internet-facing appliances to establish initial footholds.
- **Causality & Evidence Status:** *Possible Root Cause.* The detection module identified Ransomware execution behaviors, but forensic root cause analysis on the ingress firewall and endpoint telemetry is required to verify the exact entry vector.

## 3. HISTORICAL INCIDENTS
{incidents_md}
## 4. RISK FACTOR
- **Risk Classification:** **CRITICAL**
- **Likelihood of Occurrence:** High (Ransomware represents over 24% of enterprise breaches).
- **Potential Severity:** Catastrophic (Full business stoppage, data destruction, and extortion demands).
- **Possible Operational Consequences:** 5–14 days of average system downtime, factory halts, hospital triage diversion, and payroll freezing.
- **Potential Financial Consequences:** Projected losses between $250,000 and $10,000,000+ across downtime, forensic retainers, and regulatory sanctions.
- **Reasoning Behind Classification:** Weaponizes irreversible cryptography against primary operational infrastructure, threatening organizational solvency.
- **Detection Confidence vs. Risk Distinction:** {f"The detection module reported a sensor confidence of {det_conf}%, indicating high certainty that cryptographic encryption or shadow copy deletion commands were observed. However, enterprise risk represents the potential operational and financial damage to the business, which is evaluated at Critical." if det_conf else "Detection confidence reflects sensor signature accuracy, whereas organizational risk measures business and operational damage."}
- **Preliminary Assessment Note:** *This assessment is preliminary. Exact enterprise risk depends on backup status, target asset criticality, and data sensitivity.*

## 5. DETECTION MEASURES
- **Indicators of Compromise (IOCs):**
  - Command line execution: `vssadmin.exe delete shadows /all /quiet`, `wmic shadowcopy delete`, `bcdedit /set default recoveryenabled No`.
  - Mass file rename operations appending non-standard extensions (e.g. `.locked`, `.dark`, `.enc`).
  - Sudden generation of text or HTML ransom notes (`README_RESTORE.txt`) in every affected folder.
- **Suspicious Network Behavior:** High-volume outbound data transfers to cloud file hosts (Mega.nz, AWS S3) prior to encryption (data exfiltration phase).
- **Relevant Logs:** Windows Security Event IDs 4688 (Process Creation with elevated CLI), 7045 (New Service Installed), and Sysmon Event ID 1 (Process Creation).
- **Security Tools:** Endpoint Detection and Response (EDR: CrowdStrike Falcon, SentinelOne), Behavioral File Integrity Monitors (FIM), and SIEM correlation rules.

## 6. POSSIBLE IMPACT
- **Data Theft & Loss:** Irrevocable loss of critical records if immutable backups are unavailable; public leakage of sensitive employee PII and commercial contracts.
- **Financial Damage:** Hundreds of thousands to millions of dollars in incident response consulting, business interruption, and system rebuilding.
- **Business Disruption:** Total operational paralysis of ERP, email, databases, and customer ordering portals.
- **Customer Exposure & Regulatory Penalties:** Mandatory statutory disclosures under GDPR, HIPAA, or DPDP Act with severe financial non-compliance penalties.
- **Impact Distinction (Potential vs. Confirmed):** *Clearly distinguish potential impacts from confirmed consequences: the above items represent potential exposure. Confirmed damages can only be validated once the scope of encryption is forensically determined.*

## 7. PREVENTION AND MITIGATION
### A. Prevention (Defensive Hardening):
- **Immutable Backups:** Maintain offline, air-gapped backups conforming to the 3-2-1 rule (3 copies, 2 media, 1 offsite, 1 immutable).
- **Phishing-Resistant MFA:** Enforce FIDO2 / WebAuthn hardware keys on all VPN, RDP, and cloud logins.
- **Patch Management:** Remediate CISA Known Exploited Vulnerabilities (KEVs) on edge devices within 72 hours.
- **Network Segmentation:** Isolate critical OT/SCADA systems and databases from general user workstations.
- **Employee Training:** Regular simulated phishing drills to inoculate staff against initial access attachments.

### B. Immediate Response (After Detection):
- **Host Isolation:** Immediately disconnect affected hosts from the local network (sever physical Ethernet and disable Wi-Fi/VLAN). Do NOT immediately power off if RAM triage is planned.
- **Identity Revocation:** Terminate all active Kerberos ticket-granting tickets (TGT) and force company-wide password resets on compromised domain accounts.
- **Backup Verification:** Physically and logically isolate backup repositories to prevent encryptor reach.
- **Evidence Preservation:** Capture volatile RAM memory dumps (`DumpIt`, `FTK Imager`) and preserve domain controller event logs.

## 8. IMMEDIATE ACTION SUMMARY
1. **Sever Network Connections:** Isolate the target host from all network subnets immediately to halt lateral spread.
2. **Lock Compromised Credentials:** Disable associated Active Directory/VPN accounts and revoke active SSO sessions.
3. **Verify Offline Backups:** Confirm that backup storage volumes are intact and disconnected from the infected network.
4. **Engage Incident Response:** Activate the enterprise Incident Response Plan and engage external digital forensic specialists.
5. **Preserve Forensic Logs:** Collect memory images and firewall traffic logs prior to system re-imaging.
"""

        # ----------------------------------------------------
        # 2. PHISHING & SOCIAL ENGINEERING
        # ----------------------------------------------------
        elif "phishing" in atk_lower or "bec" in atk_lower:
            text = f"""{detection_header}## 1. TYPE OF ATTACK
- **Identification:** Phishing & Social Engineering (including Spear-Phishing & Business Email Compromise).
- **Simple Language Meaning:** Digital deception where attackers masquerade as trusted individuals or entities (banks, executives, IT support) to trick victims into revealing passwords, clicking malware links, or sending money.
- **How It Generally Works:** Attackers craft psychologically manipulative email messages, direct victims to reverse-proxy spoofed login portals (Adversary-in-the-Middle), harvest credentials and session cookies, and bypass basic authentication layers.
- **Main Characteristics:** Exploits human trust, urgency, or fear rather than technical software flaws; frequently acts as the primary initial access vector (accounting for >36% of all breaches).

## 2. VULNERABILITY EXPLOITED
- **Vulnerability Weaknesses:**
  - Lack of domain email authentication (missing or un-enforced DMARC, DKIM, and SPF policies).
  - Human cognitive vulnerabilities (deference to authority, urgency, cognitive overload).
  - Reliance on phishable MFA mechanisms (SMS OTPs or push notifications vulnerable to AitM reverse proxies like Evilginx).
- **Exploitation Method:** Attackers register lookalike domains (typosquatting/homograph attacks) and deploy phishing kits that proxy legitimate multi-factor authentication requests in real time.
- **Causality & Evidence Status:** *Possible Cause.* While detection indicates phishing indicators or anomalous credential usage, full verification requires inspecting inbound mail server headers and authentication logs.

## 3. HISTORICAL INCIDENTS
{incidents_md}
## 4. RISK FACTOR
- **Risk Classification:** **HIGH**
- **Likelihood of Occurrence:** Very High (Organizations experience daily phishing campaigns).
- **Potential Severity:** High (Serves as the gateway for ransomware, corporate espionage, and wire fraud).
- **Possible Operational Consequences:** Compromised employee email inboxes, unauthorized cloud tenant access, and executive impersonation.
- **Potential Financial Consequences:** Fraudulent wire transfers (average BEC fraud incident exceeds $120,000 according to FBI IC3 reports).
- **Reasoning Behind Classification:** Direct gateway to enterprise data and financial systems via authorized user identity bypass.
- **Detection Confidence vs. Risk Distinction:** {f"The detection module reported a sensor confidence of {det_conf}%, indicating strong pattern matching on email headers or suspicious URL clicks. The organizational risk (High) reflects potential access to proprietary business communications and financial accounts." if det_conf else "Sensor confidence indicates email signature or URL matching accuracy; risk reflects potential business compromise."}
- **Preliminary Assessment Note:** *Preliminary risk evaluation. Impact is calibrated based on the compromised account's privilege level (e.g., standard employee vs. CFO).*

## 5. DETECTION MEASURES
- **Indicators of Compromise (IOCs):**
  - Inbound emails with mismatched `From:` and `Reply-To:` headers or newly registered sender domains (<30 days old).
  - Newly created suspicious mailbox rules (e.g. forward all incoming messages containing 'invoice', 'payment', or 'confidential' to external webmail).
  - High-frequency login attempts from anomalous geographic regions or commercial VPN exit nodes.
- **Suspicious Network Behavior:** Outbound HTTP/TLS connections to unclassified domains hosting credential phishing templates.
- **Relevant Logs:** Microsoft 365 / Google Workspace Audit Logs (Events: `MailItemsAccessed`, `New-InboxRule`, `UserLoggedIn`), and Identity Provider (IdP) Sign-in Logs.
- **Security Tools:** Secure Email Gateways (SEGs: Proofpoint, Mimecast, Abnormal Security), CASB solutions, and browser isolation tools.

## 6. POSSIBLE IMPACT
- **Data Theft:** Exfiltration of executive emails, intellectual property, internal customer directories, and contract details.
- **Financial Damage:** Direct wire transfer fraud, payment diversion via modified vendor banking information, and forensic audit costs.
- **Business Disruption:** Revocation of compromised tenant credentials, secondary phishing launched from corporate domains, and email domain blacklisting.
- **Customer Exposure & Regulatory Penalties:** Exposure of customer PII triggering mandatory regulatory breach notifications under DPDP/GDPR.
- **Impact Distinction:** *Distinguish potential data exposure from confirmed theft; verified impact requires inspecting mailbox access audit trails.*

## 7. PREVENTION AND MITIGATION
### A. Prevention (Defensive Hardening):
- **Phishing-Resistant MFA:** Deploy FIDO2 / WebAuthn hardware security keys (e.g. YubiKeys) that cryptographically bind to the verified domain name.
- **Enforce DMARC `p=reject`:** Implement cryptographic DKIM signing and strict DMARC rejection on all organizational domains.
- **AI-Driven Email Filtering:** Implement natural language behavioral analysis to detect executive impersonation.
- **Dual-Control Payment Verification:** Establish strict out-of-band phone verification policies for any financial wire or vendor bank change.
- **Security Awareness:** Conduct continuous, realistic phishing simulations with immediate remedial coaching for employees who fail.

### B. Immediate Response (After Detection):
- **Purge Malicious Email:** Immediately delete the phishing email across all enterprise mailboxes via tenant-wide administrative search and purge APIs.
- **Revoke Active Sessions:** Invalidate all active OAuth tokens, refresh tokens, and browser sessions for the affected user account.
- **Reset Credentials:** Force an immediate password change and re-register authenticators.
- **Inspect Mailbox Rules:** Check the compromised account for automated hidden forwarding rules or delegated mailbox permissions.
- **Block Malicious Indicators:** Add the phishing URL, sender domain, and hosting IP address to perimeter proxies and DNS blocklists.

## 8. IMMEDIATE ACTION SUMMARY
1. **Revoke User Sessions:** Force an immediate global sign-out and terminate all active session cookies for the target account.
2. **Purge the Malicious Message:** Scan the entire mail tenant and delete the email across all user inboxes to prevent additional clicks.
3. **Audit Mailbox Rules:** Inspect the compromised user's mailbox settings for fraudulent forwarding rules or delegates.
4. **Block Domain & IP:** Blacklist the phishing domain and associated infrastructure on all corporate firewalls and DNS resolvers.
5. **Issue Security Alert:** Alert targeted departments (finance, HR) regarding the ongoing social engineering campaign.
"""

        # ----------------------------------------------------
        # 3. DISTRIBUTED DENIAL OF SERVICE (DDOS)
        # ----------------------------------------------------
        elif "ddos" in atk_lower or "dos" in atk_lower:
            text = f"""{detection_header}## 1. TYPE OF ATTACK
- **Identification:** Distributed Denial of Service (DDoS).
- **Simple Language Meaning:** A coordinated digital traffic jam where thousands of internet-connected compromised devices flood a server with fake requests, causing it to crash and lock out legitimate users.
- **How It Generally Works:** Threat actors compromise thousands of vulnerable IoT devices (cameras, routers) into a botnet. On command, the botnet transmits millions of packets per second (UDP, SYN, HTTP GET/POST) toward target IP addresses, exhausting network bandwidth, firewall state tables, or server CPU/memory.
- **Main Characteristics:** Volumetric (Layer 3/4 network saturation), Protocol-based (state table exhaustion), or Application-layer (Layer 7 HTTP flood targeting database queries).

## 2. VULNERABILITY EXPLOITED
- **Vulnerability Weaknesses:**
  - Open UDP reflection and amplification protocols on public servers (NTP, DNS, SNMP, Memcached).
  - Lack of upstream cloud scrubbing capacity on origin web servers.
  - Absence of rate limiting and bot challenge mechanisms on API endpoints.
- **Exploitation Method:** Attackers send spoofed requests with the victim's source IP to open reflectors, multiplying response payload size up to 50,000x (as seen in Memcached amplification).
- **Causality & Evidence Status:** *Confirmed Symptom, Underlying Vector Requires Verification.* The denial of service condition is readily observable, but telemetry is needed to identify whether it is a Layer 3/4 volumetric flood or a Layer 7 application attack.

## 3. HISTORICAL INCIDENTS
{incidents_md}
## 4. RISK FACTOR
- **Risk Classification:** **HIGH**
- **Likelihood of Occurrence:** High (DDoS-for-hire booter services enable low-cost, frequent attacks).
- **Potential Severity:** High (Severe business downtime and lost online revenue).
- **Possible Operational Consequences:** Complete unavailability of digital commerce storefronts, customer portals, and internal VPN links.
- **Potential Financial Consequences:** Direct revenue loss ($20,000–$100,000+ per hour of downtime for large e-commerce platforms), customer churn, and emergency mitigation costs.
- **Reasoning Behind Classification:** Direct threat to the **Availability** pillar of the CIA triad, halting customer engagement and revenue generation.
- **Detection Confidence vs. Risk Distinction:** {f"The detection module reported a sensor confidence of {det_conf}%, indicating definitive detection of bandwidth or packet rate anomalies. Organizational risk represents business disruption and transaction loss while the attack remains active." if det_conf else "Sensor confidence measures traffic anomaly accuracy; risk measures revenue loss and downtime duration."}
- **Preliminary Assessment Note:** *Preliminary risk evaluation. Impact is proportional to the duration of downtime and the proportion of revenue generated online.*

## 5. DETECTION MEASURES
- **Indicators of Compromise (IOCs):**
  - Sudden, massive spike in ingress bandwidth (Gbps) or packet rates (Mpps) exceeding baseline thresholds by orders of magnitude.
  - Ingress traffic dominated by specific protocol types (UDP port 11211, UDP port 123, or repetitive TCP SYN flags without ACKs).
  - Inundation of application server logs with HTTP `503 Service Unavailable` and `504 Gateway Timeout` errors.
- **Suspicious Network Behavior:** Millions of requests originating from thousands of disparate global IP addresses targeting a single URL endpoint simultaneously.
- **Relevant Logs:** Border Gateway Router NetFlow/sFlow metrics, Web Server Access Logs (Nginx, Apache), and Edge Load Balancer connection telemetry.
- **Security Tools:** Cloud Anti-DDoS Scrubbing (Cloudflare Magic Transit, Akamai Prolexic, AWS Shield), and Network Performance Monitoring (Kentik, FastNetMon).

## 6. POSSIBLE IMPACT
- **Data Theft:** None directly; however, DDoS attacks are frequently deployed as **distraction tactics** to mask simultaneous data exfiltration intrusions.
- **Financial Damage:** Lost digital transactions, SLA financial breach penalties, overtime engineering payroll, and emergency cloud compute auto-scaling costs.
- **Business Disruption:** Total service unavailability for customer web portals, partner APIs, and internal remote workforce gateways.
- **Customer Exposure & Reputation:** Frustrated customer base, negative public media coverage, and migration of users to competitor platforms.
- **Impact Distinction:** *Distinguish availability outage impacts from data compromise; no data is lost solely due to DDoS traffic unless secondary breaches occurred.*

## 7. PREVENTION AND MITIGATION
### A. Prevention (Defensive Hardening):
- **Anycast Cloud Scrubbing:** Route all public ingress traffic through a Tier-1 cloud scrubbing provider capable of absorbing multi-Terabit floods.
- **Redundant Anycast DNS:** Utilize multi-provider redundant DNS architectures to prevent single-point DNS failure (as occurred in the Dyn outage).
- **Rate Limiting & Web Application Firewall:** Enforce token-bucket request throttling and bot management challenges on API endpoints.
- **ISP Null-Routing Playbooks:** Coordinate with upstream ISPs to configure automated BGP Flowspec or blackhole routing for targeted IPs.

### B. Immediate Response (After Detection):
- **Engage Cloud Scrubbing:** Divert origin DNS records behind cloud proxy protection immediately.
- **Activate Under-Attack Mode:** Enforce JavaScript challenges, managed browser challenges, or CAPTCHAs at the CDN edge.
- **Drop Malicious Traffic at Perimeter:** Block offending amplification protocols (UDP 123, 389, 11211) at border edge routers.
- **Scale Origin Compute:** Temporarily auto-scale backend origin servers behind edge caching layers to absorb residual query loads.

## 8. IMMEDIATE ACTION SUMMARY
1. **Divert Traffic to Cloud Scrubbing:** Route domain ingress traffic through Anycast DDoS mitigation networks (Cloudflare/Akamai/AWS Shield).
2. **Enable Edge Verification Challenges:** Activate aggressive challenge modes (JS/CAPTCHA) to filter automated botnet requests.
3. **Notify Upstream ISP:** Request BGP Flowspec filtering or temporary upstream rate-limiting on amplification ports.
4. **Isolate Backend Origin:** Ensure origin IP addresses are hidden behind the reverse proxy and block direct origin access.
5. **Monitor for Secondary Intrusions:** Verify that the DDoS is not masking simultaneous lateral movement or data exfiltration.
"""

        # ----------------------------------------------------
        # 4. SQL INJECTION (SQLI)
        # ----------------------------------------------------
        elif "sql" in atk_lower:
            text = f"""{detection_header}## 1. TYPE OF ATTACK
- **Identification:** SQL Injection (SQLi) - Injection Vulnerability (CWE-89 / OWASP A03:2021).
- **Simple Language Meaning:** A database manipulation attack where an attacker enters malicious database commands into normal input fields (like search boxes or login forms) to trick the application into revealing or deleting confidential database records.
- **How It Generally Works:** When a web application concatenates user-supplied text directly into a dynamic SQL query string without validation or parameterization, the database server interprets the attacker's syntax (e.g. `' OR '1'='1' --`) as executable commands rather than literal data.
- **Main Characteristics:** High-impact, direct data compromise vector that can bypass authentication, exfiltrate whole database tables, modify transactions, or execute arbitrary operating system commands (via `xp_cmdshell` or `INTO OUTFILE`).

## 2. VULNERABILITY EXPLOITED
- **Vulnerability Weaknesses:**
  - Improper Neutralization of Special Elements used in an SQL Command (CWE-89).
  - Dynamic SQL query string concatenation instead of Parameterized Queries / Prepared Statements.
  - Over-privileged database service accounts (e.g., web application connected as `root` or `sa`).
- **Exploitation Method:** Threat actors use automated scanners (sqlmap) or manual probing with single quotes, boolean logic, or time-delay functions (`WAITFOR DELAY`, `SLEEP()`) to determine database schema and extract data.
- **Causality & Evidence Status:** *Possible Root Cause.* The detection module observed SQL injection syntax in web requests; confirmation that the query actually executed and leaked data requires database audit log verification.

## 3. HISTORICAL INCIDENTS
{incidents_md}
## 4. RISK FACTOR
- **Risk Classification:** **CRITICAL**
- **Likelihood of Occurrence:** Moderate to High (SQLi remains prevalent in legacy web applications).
- **Potential Severity:** Catastrophic (Enables direct mass exfiltration of sensitive core databases).
- **Possible Operational Consequences:** Database corruption, administrative account takeover, and system compromise.
- **Potential Financial Consequences:** Regulatory fines (GDPR, PCI-DSS), card re-issuance fees, and forensic audit costs (average payment database breach costs exceed $4.4M).
- **Reasoning Behind Classification:** Directly undermines database **Confidentiality** and **Integrity**, enabling theft of millions of records without requiring login credentials.
- **Detection Confidence vs. Risk Distinction:** {f"The detection module reported a sensor confidence of {det_conf}%, indicating that the payload pattern (e.g. UNION SELECT) was detected in HTTP request bodies with high certainty. Organizational risk represents the potential exposure of underlying customer databases, which is Critical." if det_conf else "Sensor confidence indicates signature matching certainty; organizational risk measures actual database exposure and liability."}
- **Preliminary Assessment Note:** *Preliminary risk evaluation. Impact is verified by determining whether the targeted database contains PII, payment cards, or sensitive operational records.*

## 5. DETECTION MEASURES
- **Indicators of Compromise (IOCs):**
  - HTTP requests containing SQL keywords and control characters: `' OR 1=1`, `UNION ALL SELECT`, `--`, `/*`, `INFORMATION_SCHEMA`, `benchmark()`, `waitfor delay`.
  - Database error messages returned in HTTP responses (`SQL syntax error`, `ORA-00933`, `Unclosed quotation mark`).
  - Sudden spike in outbound HTTP response payload sizes indicative of bulk database table dumps.
- **Suspicious Network Behavior:** Rapid, automated series of web requests from single IP addresses probing variations of query parameters (indicative of `sqlmap` automated scanners).
- **Relevant Logs:** Web Server Access & Error Logs (Apache, Nginx, IIS), Web Application Firewall (WAF) Block Logs, and Database Audit Telemetry (MySQL general log, SQL Server Profiler).
- **Security Tools:** Web Application Firewalls (AWS WAF, Cloudflare WAF, ModSecurity), Database Activity Monitoring (DAM: Imperva, Guardium), and DAST/SAST scanners.

## 6. POSSIBLE IMPACT
- **Data Theft:** Complete mass exfiltration of sensitive customer data, payment card numbers, employee records, and password hashes.
- **Financial Damage:** Severe statutory penalties under PCI-DSS, GDPR, or DPDP Act; mandatory customer notification and credit monitoring expenses.
- **Business Disruption:** Corruption or deletion of core transactional database tables (`DROP TABLE`, `DELETE FROM`).
- **Customer Exposure:** Compromise of consumer credentials leading to credential-stuffing attacks across other platforms.
- **Impact Distinction:** *Distinguish attack attempts from successful data leaks; attempt detection does not prove database records were exfiltrated without audit log confirmation.*

## 7. PREVENTION AND MITIGATION
### A. Prevention (Defensive Hardening):
- **Parameterized Queries / Prepared Statements:** Mandate parameterized queries or Object-Relational Mapping (ORM) frameworks across all database interaction layers.
- **Principle of Least Privilege:** Restrict the web application's database service account to only necessary tables; revoke administrative, schema modification (`DROP`, `ALTER`), and file execution permissions.
- **Web Application Firewall (WAF):** Enforce WAF inspection rules with OWASP Core Rule Sets to block common SQL injection payloads at the edge.
- **Code Audits & CI/CD SAST:** Integrate static code analysis tools (SonarQube, Snyk) into the build pipeline to detect unescaped SQL concatenation before production deployment.

### B. Immediate Response (After Detection):
- **Apply Emergency WAF Virtual Patch:** Configure an immediate blocking rule on the targeted URI endpoint and query parameter.
- **Rotate Database Credentials:** Change database connection passwords used by the vulnerable application to prevent persistent unauthorized access.
- **Inspect Database Audit Logs:** Review query logs to verify what queries executed and whether bulk rows were exfiltrated.
- **Deploy Hotfix:** Patch the vulnerable application source code using parameterized prepared statements.

## 8. IMMEDIATE ACTION SUMMARY
1. **Enable Strict WAF Blocking Rule:** Deploy an emergency virtual patch at the WAF/reverse proxy layer to reject requests to the targeted endpoint.
2. **Review Database Audit Logs:** Inspect executed query logs immediately to confirm whether data was successfully extracted.
3. **Rotate Database Service Passwords:** Change connection strings and service account credentials used by the vulnerable application.
4. **Deploy Code Parameterization Hotfix:** Rewrite the dynamic SQL query into a prepared statement with parameterized variable binding.
5. **Verify Data Breach Scope:** If data exfiltration is confirmed, initiate incident disclosure and legal compliance protocols.
"""

        # ----------------------------------------------------
        # 5. GENERAL CYBER THREAT / ZERO-DAY / MALWARE FALLBACK
        # ----------------------------------------------------
        else:
            text = f"""{detection_header}## 1. TYPE OF ATTACK
- **Identification:** {attack_type} (Cyber Threat Category).
- **Simple Language Meaning:** A malicious operation targeting the security, integrity, or availability of computer networks and institutional digital infrastructure.
- **How It Generally Works:** Attackers identify security weaknesses or unpatched systems, deploy unauthorized payloads, escalate privileges, and seek to achieve objectives such as data exfiltration, system destruction, or persistent surveillance.
- **Main Characteristics:** Adversarial activity characterized by covert execution, persistence, and evasion of standard endpoint protections.

## 2. VULNERABILITY EXPLOITED
- **Vulnerability Weaknesses:** Software flaws (unpatched CVEs), configuration errors, weak identity controls, or lack of boundary defense.
- **Exploitation Method:** Automated scanning, exploit chaining, or privilege escalation using weaponized payloads.
- **Causality & Evidence Status:** *Possible Cause.* Further digital forensics is required to confirm the precise vulnerability exploited in this detection event.

## 3. HISTORICAL INCIDENTS
{incidents_md}
## 4. RISK FACTOR
- **Risk Classification:** **HIGH**
- **Likelihood of Occurrence:** Moderate to High.
- **Potential Severity:** High (Depends on asset criticality and depth of penetration).
- **Possible Operational Consequences:** Operational slowdown, service interruption, and administrative overhead.
- **Potential Financial Consequences:** Remediation costs, digital forensics retainers, and potential regulatory liability.
- **Reasoning Behind Classification:** Unchecked exploitation can lead to total system compromise and data loss.
- **Detection Confidence vs. Risk Distinction:** {f"The detection module reported a sensor confidence of {det_conf}%, measuring signature match certainty. Enterprise risk represents potential operational damage to the business entity." if det_conf else "Sensor confidence indicates detection pattern certainty; risk represents enterprise operational loss."}
- **Preliminary Assessment Note:** *Preliminary risk evaluation. Severity depends on target host criticality.*

## 5. DETECTION MEASURES
- **Indicators of Compromise (IOCs):** Anomalous outbound network connections, unexpected process creation, or unauthorized administrative privilege escalation.
- **Suspicious Network Behavior:** High-entropy traffic patterns, beaconing to unclassified external IPs, or anomalous internal port scanning.
- **Relevant Logs:** Firewall connection logs, Windows Security Logs, and EDR behavioral alerts.
- **Security Tools:** Endpoint Detection and Response (EDR), Security Information and Event Management (SIEM), and Network Traffic Analysis (NTA).

## 6. POSSIBLE IMPACT
- **Data Theft:** Potential exfiltration of proprietary documents and customer records.
- **Financial Damage:** Forensic investigation costs and operational downtime expenses.
- **Business Disruption:** Temporary service isolation and system rebuild delays.
- **Impact Distinction:** *Distinguish potential threat exposure from verified loss; confirmed impact requires forensic analysis.*

## 7. PREVENTION AND MITIGATION
### A. Prevention (Defensive Hardening):
- **Patch Management:** Rapid deployment of vendor security updates.
- **Least Privilege Access:** Restrict user and service account permissions.
- **Continuous Monitoring:** Centralize telemetry in a 24/7 monitored SIEM platform.

### B. Immediate Response (After Detection):
- **Isolate Affected Systems:** Quarantine the target machine from the internal network.
- **Preserve Volatile Evidence:** Collect RAM memory dumps and event logs prior to rebooting.
- **Audit Recent Activities:** Check firewall, proxy, and identity access logs for lateral movement.

## 8. IMMEDIATE ACTION SUMMARY
1. **Quarantine the Affected Host:** Disconnect the system from the local network to halt potential lateral movement.
2. **Revoke Active Access Tokens:** Reset credentials associated with the target account or system.
3. **Capture Forensic Evidence:** Save RAM memory and system audit logs for forensic root cause analysis.
4. **Deploy Perimeter Blocking:** Block detected malicious IP addresses and indicators on corporate firewalls.
5. **Engage Security Analysts:** Escalate the incident to security operations for containment verification.
"""

        return {
            "attack_name": attack_type,
            "analysis_markdown": text.strip(),
            "suggested_followups": self._generate_followups(attack_type),
            "sources": self._extract_sources(attack_type)
        }

gemini_service = GeminiService()
