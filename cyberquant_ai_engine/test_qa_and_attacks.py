import urllib.request
import json
import time

def query_chat(message):
    t0 = time.time()
    req = urllib.request.Request(
        "http://127.0.0.1:8000/ai/chat",
        data=json.dumps({"message": message, "session_id": "test-session"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        t1 = time.time()
        return (t1 - t0, data.get("reply", ""))

tests = [
    ("difference between virus and worms", ["virus", "worm"]),
    ("What is a firewall and how does it work?", ["firewall", "traffic"]),
    ("Explain symmetric vs asymmetric encryption", ["symmetric", "key"]),
    ("What is the CIA triad in cybersecurity?", ["confidentiality", "integrity", "availability"]),
    ("Explain Ransomware", ["1. TYPE OF ATTACK", "8. IMMEDIATE ACTION SUMMARY"])
]

print("=== RUNNING CHATBOT TESTS ===\n")
for query, expected_keywords in tests:
    try:
        duration, reply = query_chat(query)
        has_all_keywords = all(kw.lower() in reply.lower() for kw in expected_keywords)
        status = "PASS" if has_all_keywords else "FAIL"
        print(f"[{status}] Query: '{query}' ({duration:.2f}s, length: {len(reply)})")
        print(f"       Preview: {reply[:160].replace(chr(10), ' ')}...\n")
    except Exception as e:
        print(f"[FAIL] Query: '{query}' -> Exception: {e}\n")

print("=== ALL TESTS FINISHED ===")
