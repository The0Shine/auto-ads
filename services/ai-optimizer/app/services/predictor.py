# =============================================================================
# AI Predictor — XGBoost model loader & predict()
# Model: trained on KAG Facebook Ads Conversion dataset
# Input:  impressions, clicks, spent, age, gender, interest
# Output: action ("SCALE"/"KEEP"/"PAUSE"), confidence (float 0-1)
# =============================================================================

import os
import logging
import pandas as pd
import joblib

logger = logging.getLogger(__name__)

# Age group mapping (same as training)
AGE_GROUP_MAP = {
    '30-34': 0,
    '35-39': 1,
    '40-44': 2,
    '45-49': 3,
}

# Default targeting values when ad_set.targeting is missing
DEFAULT_AGE     = 1   # 35-39
DEFAULT_GENDER  = 0   # Male
DEFAULT_INTEREST = 15


class Predictor:
    """
    Singleton wrapper around the trained XGBoost model.
    Loaded once at startup, reused for every prediction.
    """

    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load(self, model_path: str):
        if self._model is not None:
            return
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        self._model = joblib.load(model_path)
        logger.info(f"✅ XGBoost model loaded from {model_path}")

    def _build_features(
        self,
        impressions: int,
        clicks: int,
        spent: float,
        age: int,
        gender: int,
        interest: int,
    ) -> pd.DataFrame:
        """
        Build feature DataFrame matching exactly what the model was trained on.
        Actual model features (8): age, gender, interest, Impressions, Clicks, Spent, CTR, CPC
        """
        imp = max(impressions, 1)
        clk = max(clicks, 1)

        ctr = clicks / imp
        cpc = spent / clk

        return pd.DataFrame([{
            'age':        age,
            'gender':     gender,
            'interest':   interest,
            'Impressions': impressions,
            'Clicks':     clicks,
            'Spent':      spent,
            'CTR':        ctr,
            'CPC':        cpc,
        }])

    def predict(
        self,
        impressions: int,
        clicks: int,
        spent: float,
        age: int = DEFAULT_AGE,
        gender: int = DEFAULT_GENDER,
        interest: int = DEFAULT_INTEREST,
    ) -> tuple[str, float]:
        """
        Run XGBoost prediction and apply decision rules.

        Decision rules (from main.py):
          - SCALE : estimated CPA < 15
          - KEEP  : estimated CPA 15–30
          - PAUSE : estimated CPA > 30 OR expected_conversions == 0

        Returns:
            (action, confidence)  e.g. ("PAUSE", 0.82)
        """
        if self._model is None:
            raise RuntimeError("Model not loaded. Call predictor.load() first.")

        features = self._build_features(impressions, clicks, spent, age, gender, interest)
        prob = float(self._model.predict_proba(features)[0][1])

        expected_conv = prob * clicks
        if expected_conv == 0 or clicks == 0:
            return "PAUSE", prob

        est_cpa = spent / expected_conv

        if est_cpa < 15:
            action = "SCALE"
        elif est_cpa < 30:
            action = "KEEP"
        else:
            action = "PAUSE"

        return action, prob

    @staticmethod
    def parse_targeting(targeting: dict) -> tuple[int, int, int]:
        """
        Extract age, gender, interest from ad_set.targeting JSONB.
        Falls back to defaults if fields are missing.
        """
        age_raw = targeting.get('age_group', DEFAULT_AGE)
        if isinstance(age_raw, str):
            age = AGE_GROUP_MAP.get(age_raw, DEFAULT_AGE)
        else:
            age = int(age_raw) if age_raw is not None else DEFAULT_AGE

        gender   = int(targeting.get('gender',   DEFAULT_GENDER))
        interest = int(targeting.get('interest', DEFAULT_INTEREST))

        return age, gender, interest


# Module-level singleton
predictor = Predictor()
