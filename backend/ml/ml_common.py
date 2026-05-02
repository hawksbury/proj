from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
MODEL_DIR = Path(__file__).resolve().parent / "models"

NUMERIC_FEATURES = [
    "age",
    "household_size",
    "lives_alone",
    "power_dependent_equipment",
    "oxygen_dependent",
    "service_animal",
    "needs_accessible_transport",
    "consent_to_share_with_responders",
    "baseline_priority_score",
    "received_hour",
    "received_month",
]

CATEGORICAL_FEATURES = [
    "city",
    "state",
    "gender",
    "primary_language",
    "mobility_level",
    "evacuation_assistance_level",
    "incident_type",
    "communication_needs",
    "disability_types",
    "medical_conditions",
    "medications",
    "equipment_dependencies",
]

FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def read_csv(name: str) -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / name)


def normalize_bool_columns(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    for column in result.columns:
        if result[column].dtype == object:
            lowered = result[column].astype(str).str.lower()
            if lowered.isin(["true", "false"]).all():
                result[column] = lowered.map({"true": 1, "false": 0})
    return result


def add_time_features(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    if "received_at" in result.columns:
        received = pd.to_datetime(result["received_at"], errors="coerce", utc=True)
        result["received_hour"] = received.dt.hour.fillna(0).astype(int)
        result["received_month"] = received.dt.month.fillna(1).astype(int)
    else:
        result["received_hour"] = 0
        result["received_month"] = 1
    return result


def build_training_frame() -> pd.DataFrame:
    customers = read_csv("customers.csv")
    cases = read_csv("historical_cases.csv")
    merged = cases.merge(
        customers,
        on=["customer_id", "signal_id"],
        how="left",
        validate="many_to_one",
    )
    merged = normalize_bool_columns(merged)
    merged = add_time_features(merged)
    return merged


def customer_case_frame(signal_id: str, incident_type: str = "power_outage") -> pd.DataFrame:
    customers = read_csv("customers.csv")
    customer = customers.loc[customers["signal_id"] == signal_id].copy()
    if customer.empty:
        raise ValueError(f"No customer found for signal_id={signal_id}")

    customer["incident_type"] = incident_type
    customer["received_at"] = pd.Timestamp.utcnow().isoformat()
    customer = normalize_bool_columns(customer)
    customer = add_time_features(customer)
    return customer


def feature_frame(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    for column in FEATURE_COLUMNS:
        if column not in result.columns:
            result[column] = 0 if column in NUMERIC_FEATURES else "unknown"
    return result[FEATURE_COLUMNS].fillna("unknown")


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

