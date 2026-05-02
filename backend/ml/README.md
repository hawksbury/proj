# ML Training Plan

This folder trains the decision models for the AI dispatch workflow.

## What To Train

Train three models from `data/historical_cases.csv` joined with `data/customers.csv`:

1. `escalation_required`: binary classifier that predicts whether the case needs escalation.
2. `priority_score_assigned`: regression model that predicts a 0-100 urgency score.
3. `matched_responder_profession`: multiclass classifier that predicts the responder profession needed.

The LLM should use these outputs to explain the decision. The LLM should not be the only prioritization engine.

## Commands

```bash
python3 -m pip install -r backend/ml/requirements.txt
python3 backend/ml/train_models.py
python3 backend/ml/predict_dispatch.py SIG-0000001 --incident-type power_outage
```

Training creates:

- `backend/ml/models/escalation_model.joblib`
- `backend/ml/models/priority_model.joblib`
- `backend/ml/models/responder_profession_model.joblib`
- `backend/ml/models/metrics.json`

## File Responsibilities

- `requirements.txt`: Python packages required for ML training and prediction.
- `ml_common.py`: Shared data and feature code. It loads CSV files, merges historical cases with customers, converts `received_at` timestamps into `received_hour` and `received_month`, normalizes booleans, and selects the final feature columns.
- `train_models.py`: Main training script. It trains the escalation classifier, priority-score regressor, and responder-profession classifier. It also evaluates the models and saves metrics.
- `predict_dispatch.py`: Live prediction script used by the backend. Given a `signal_id`, it loads the saved models, predicts priority/escalation/responder profession, and ranks actual responders.
- `models/escalation_model.joblib`: Trained model for predicting whether escalation is required.
- `models/priority_model.joblib`: Trained model for predicting the urgency score from 0 to 100.
- `models/responder_profession_model.joblib`: Trained model for predicting the recommended responder profession.
- `models/metrics.json`: Latest saved model performance metrics.

## Current Saved Metrics

- Escalation classifier: accuracy `0.8185`, F1 `0.8814`, ROC-AUC `0.8766`.
- Priority regressor: MAE `5.3776`, RMSE `7.2495`, R2 `0.8014`.
- Responder profession classifier: accuracy `0.3237`, macro F1 `0.35`, top-3 accuracy `0.8788`.

The responder model uses top-3 accuracy because multiple responder professions can be reasonable for the same emergency case.
