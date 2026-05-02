from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path

os.environ.setdefault("LOKY_MAX_CPU_COUNT", "4")

import joblib
import pandas as pd

from ml_common import MODEL_DIR, customer_case_frame, feature_frame, read_csv


def haversine_miles(lat1, lon1, lat2, lon2) -> float:
    radius = 3958.8
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    d_phi = math.radians(float(lat2) - float(lat1))
    d_lambda = math.radians(float(lon2) - float(lon1))
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def rank_responders(customer: pd.Series, needed_profession: str, limit: int = 5) -> list[dict]:
    responders = read_csv("responders.csv")
    ranked = []
    for _, responder in responders.iterrows():
        distance = haversine_miles(
            customer["latitude"],
            customer["longitude"],
            responder["latitude"],
            responder["longitude"],
        )
        status_bonus = {
            "available": 35,
            "staging": 25,
            "en_route": 8,
            "assigned": 3,
            "off_shift": -20,
        }.get(str(responder["status"]), 0)
        profession_bonus = 45 if responder["profession"] == needed_profession else 0
        capacity_bonus = max(0, int(responder["max_case_load"]) - int(responder["current_case_load"])) * 3
        oxygen_bonus = 12 if bool(customer["oxygen_dependent"]) and bool(responder["can_handle_oxygen_support"]) else 0
        transport_bonus = 10 if bool(customer["needs_accessible_transport"]) and bool(responder["wheelchair_accessible_vehicle"]) else 0
        mobility_bonus = 10 if "mobility" in str(customer["disability_types"]) and bool(responder["can_handle_mobility_transfer"]) else 0
        distance_penalty = min(distance, 80) * 0.6
        score = status_bonus + profession_bonus + capacity_bonus + oxygen_bonus + transport_bonus + mobility_bonus - distance_penalty
        ranked.append(
            {
                "responder_id": responder["responder_id"],
                "name": f"{responder['first_name']} {responder['last_name']}",
                "profession": responder["profession"],
                "status": responder["status"],
                "agency": responder["agency"],
                "distance_miles": round(distance, 1),
                "score": round(score, 2),
                "capabilities": {
                    "oxygen_support": bool(responder["can_handle_oxygen_support"]),
                    "mobility_transfer": bool(responder["can_handle_mobility_transfer"]),
                    "accessible_vehicle": bool(responder["wheelchair_accessible_vehicle"]),
                    "can_transport_patient": bool(responder["can_transport_patient"]),
                },
            }
        )
    return sorted(ranked, key=lambda item: item["score"], reverse=True)[:limit]


def priority_level(score: float, escalation_required: bool) -> str:
    if escalation_required or score >= 85:
        return "critical"
    if score >= 65:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict dispatch priority for a device signal_id.")
    parser.add_argument("signal_id", help="Device id from customers.signal_id, for example SIG-0000001")
    parser.add_argument("--incident-type", default="power_outage")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()

    escalation_model = joblib.load(MODEL_DIR / "escalation_model.joblib")
    priority_model = joblib.load(MODEL_DIR / "priority_model.joblib")
    profession_model = joblib.load(MODEL_DIR / "responder_profession_model.joblib")

    case = customer_case_frame(args.signal_id, args.incident_type)
    x = feature_frame(case)
    customer = case.iloc[0]

    escalation_probability = float(escalation_model.predict_proba(x)[0][1])
    escalation_required = bool(escalation_probability >= 0.5)
    priority_score = float(priority_model.predict(x)[0])
    priority_score = max(0, min(100, priority_score))
    needed_profession = str(profession_model.predict(x)[0])

    result = {
        "signal_id": args.signal_id,
        "customer": {
            "customer_id": customer["customer_id"],
            "name": f"{customer['first_name']} {customer['last_name']}",
            "city": customer["city"],
            "state": customer["state"],
            "medical_conditions": customer["medical_conditions"],
            "disability_types": customer["disability_types"],
            "equipment_dependencies": customer["equipment_dependencies"],
        },
        "prediction": {
            "priority_score": round(priority_score, 2),
            "priority_level": priority_level(priority_score, escalation_required),
            "escalation_required": escalation_required,
            "escalation_probability": round(escalation_probability, 4),
            "recommended_responder_profession": needed_profession,
        },
        "top_responders": rank_responders(customer, needed_profession, args.limit),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
