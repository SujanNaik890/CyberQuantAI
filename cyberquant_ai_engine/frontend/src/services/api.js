const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function sendChatMessage({ message, sessionId, history = [], simpleLanguage = false, contextAttack = null }) {
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      history,
      simple_language: simpleLanguage,
      context_attack: contextAttack
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to send chat message');
  }
  return response.json();
}

export async function getAttackExplanation(attackName, simpleLanguage = false) {
  const response = await fetch(`${API_BASE_URL}/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attack_name: attackName,
      simple_language: simpleLanguage
    })
  });
  if (!response.ok) {
    throw new Error('Failed to fetch attack explanation');
  }
  return response.json();
}

export async function analyzeRisk(riskParams) {
  const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(riskParams)
  });
  if (!response.ok) {
    throw new Error('Failed to compute risk assessment');
  }
  return response.json();
}

export async function calculateBudget(budgetParams) {
  const response = await fetch(`${API_BASE_URL}/ai/budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(budgetParams)
  });
  if (!response.ok) {
    throw new Error('Failed to generate budget allocation');
  }
  return response.json();
}

export async function submitDetectionAlert(alertData) {
  const response = await fetch(`${API_BASE_URL}/ai/detection-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData)
  });
  if (!response.ok) {
    throw new Error('Failed to submit detection alert');
  }
  return response.json();
}
