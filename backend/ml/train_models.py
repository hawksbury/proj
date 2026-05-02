from __future__ import annotations

import os
from pathlib import Path

os.environ.setdefault("LOKY_MAX_CPU_COUNT", "4")

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
    root_mean_squared_error,
    top_k_accuracy_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from ml_common import (
    CATEGORICAL_FEATURES,
    FEATURE_COLUMNS,
    MODEL_DIR,
    NUMERIC_FEATURES,
    build_training_frame,
    feature_frame,
    write_json,
)


RANDOM_STATE = 42


def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
            ("numeric", "passthrough", NUMERIC_FEATURES),
        ],
        remainder="drop",
    )


def train_escalation_model(x, y):
    model = Pipeline(
        steps=[
            ("features", make_preprocessor()),
            ("model", HistGradientBoostingClassifier(random_state=RANDOM_STATE)),
        ]
    )
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    probabilities = model.predict_proba(x_test)[:, 1]
    metrics = {
        "accuracy": round(accuracy_score(y_test, predictions), 4),
        "precision": round(precision_score(y_test, predictions, zero_division=0), 4),
        "recall": round(recall_score(y_test, predictions, zero_division=0), 4),
        "f1": round(f1_score(y_test, predictions, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y_test, probabilities), 4),
    }
    return model, metrics


def train_priority_model(x, y):
    model = Pipeline(
        steps=[
            ("features", make_preprocessor()),
            ("model", HistGradientBoostingRegressor(random_state=RANDOM_STATE)),
        ]
    )
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=RANDOM_STATE
    )
    model.fit(x_train, y_train)
    predictions = np.clip(model.predict(x_test), 0, 100)
    metrics = {
        "mae": round(mean_absolute_error(y_test, predictions), 4),
        "rmse": round(root_mean_squared_error(y_test, predictions), 4),
        "r2": round(r2_score(y_test, predictions), 4),
    }
    return model, metrics


def train_responder_profession_model(x, y):
    model = Pipeline(
        steps=[
            ("features", make_preprocessor()),
            ("model", HistGradientBoostingClassifier(random_state=RANDOM_STATE)),
        ]
    )
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    probabilities = model.predict_proba(x_test)
    metrics = {
        "accuracy": round(accuracy_score(y_test, predictions), 4),
        "macro_f1": round(f1_score(y_test, predictions, average="macro", zero_division=0), 4),
        "top_3_accuracy": round(top_k_accuracy_score(y_test, probabilities, k=3, labels=model.classes_), 4),
    }
    return model, metrics


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    frame = build_training_frame()
    x = feature_frame(frame)

    escalation_y = frame["escalation_required"].astype(str).str.lower().map({"true": 1, "false": 0}).astype(int)
    priority_y = frame["priority_score_assigned"].astype(float)
    profession_y = frame["matched_responder_profession"].astype(str)

    escalation_model, escalation_metrics = train_escalation_model(x, escalation_y)
    priority_model, priority_metrics = train_priority_model(x, priority_y)
    profession_model, profession_metrics = train_responder_profession_model(x, profession_y)

    joblib.dump(escalation_model, MODEL_DIR / "escalation_model.joblib")
    joblib.dump(priority_model, MODEL_DIR / "priority_model.joblib")
    joblib.dump(profession_model, MODEL_DIR / "responder_profession_model.joblib")

    metrics = {
        "training_rows": int(len(frame)),
        "features": FEATURE_COLUMNS,
        "models": {
            "escalation_required": escalation_metrics,
            "priority_score_assigned": priority_metrics,
            "matched_responder_profession": profession_metrics,
        },
    }
    write_json(MODEL_DIR / "metrics.json", metrics)

    print("Training complete. Metrics:")
    for name, values in metrics["models"].items():
        print(f"- {name}: {values}")
    print(f"Saved models to {Path(MODEL_DIR).relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()
