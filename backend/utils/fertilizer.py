def fertilizer_advice(N, P, K):
    advice = []

    if N < 50:
        advice.append("Add Urea (Nitrogen)")
    if P < 30:
        advice.append("Add DAP (Phosphorus)")
    if K < 30:
        advice.append("Add Potash (Potassium)")

    if not advice:
        advice.append("Soil nutrients are balanced")

    return advice