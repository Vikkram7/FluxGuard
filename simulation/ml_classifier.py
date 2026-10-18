"""
FluxGuard PMSM - Secondary Experimental Machine Learning Classifier
NOTE: This module serves as a secondary, experimental cross-validation classifier.
It does NOT replace the physics-based flux estimator and diagnostic state machine,
which remain the primary authoritative diagnostic system.
"""

from dataclasses import dataclass
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.model_selection import train_test_split


@dataclass
class MLClassifierEvaluation:
    accuracy: float
    report: Dict[str, Any]
    confusion_matrix: list
    feature_importances: Dict[str, float]


class ExperimentalFluxClassifier:
    """
    Experimental statistical classifier trained on synthetic operating features
    to classify between Healthy, Suspected Degradation, Sensor Fault, and Insufficient Data.
    """

    FEATURE_COLS = [
        "speed_rpm",
        "temperature_c",
        "id_a",
        "iq_a",
        "vd_v",
        "vq_v",
        "estimated_flux_wb",
        "norm_residual_pct",
        "smoothed_residual_pct",
        "uncertainty",
    ]

    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            random_state=self.random_state,
            class_weight="balanced"
        )
        self.is_trained = False
        self.classes_ = []

    def prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Extracts feature matrix X and target labels y."""
        # Drop warm-up / initializing samples
        valid_df = df[df["diagnostic_state"] != "INITIALIZING"].copy()
        X = valid_df[self.FEATURE_COLS].values
        y = valid_df["diagnostic_state"].values
        return X, y

    def train_and_evaluate(self, df: pd.DataFrame, test_size: float = 0.3) -> MLClassifierEvaluation:
        """
        Trains model on train set and evaluates on held-out test set.
        Returns accuracy, classification report, confusion matrix, and feature importances.
        """
        X, y = self.prepare_data(df)
        
        # Filter out classes with fewer than 5 occurrences to enable clean cross-validation
        unique_classes, counts = np.unique(y, return_counts=True)
        valid_classes = set(unique_classes[counts >= 5])
        keep_mask = np.isin(y, list(valid_classes))
        X = X[keep_mask]
        y = y[keep_mask]

        # Use stratify only if all remaining classes have at least 2 samples
        stratify_opt = y if len(valid_classes) > 1 and all(counts[np.isin(unique_classes, list(valid_classes))] >= 2) else None

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=stratify_opt
        )

        self.model.fit(X_train, y_train)
        self.is_trained = True
        self.classes_ = list(self.model.classes_)

        y_pred = self.model.predict(X_test)
        acc = float(accuracy_score(y_test, y_pred))
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
        cm = confusion_matrix(y_test, y_pred, labels=self.classes_).tolist()

        importances = {
            col: round(float(imp), 4)
            for col, imp in zip(self.FEATURE_COLS, self.model.feature_importances_)
        }

        return MLClassifierEvaluation(
            accuracy=acc,
            report=report,
            confusion_matrix=cm,
            feature_importances=importances
        )

    def predict(self, sample_features: Dict[str, float]) -> Tuple[str, float]:
        """Predicts state and confidence probability for a single feature vector."""
        if not self.is_trained:
            raise RuntimeError("Model has not been trained yet.")
        row = np.array([[sample_features[col] for col in self.FEATURE_COLS]])
        probs = self.model.predict_proba(row)[0]
        best_idx = int(np.argmax(probs))
        return self.classes_[best_idx], float(probs[best_idx])
