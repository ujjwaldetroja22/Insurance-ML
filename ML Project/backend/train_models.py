"""
Model Training Script for Task 3 (Regression) and Task 5 (Classification)
This script trains all models, performs 5-fold Stratified Cross Validation,
executes GridSearchCV hyperparameter tuning, and saves trained models & evaluation metrics.
DO NOT run this during API startup; run it once during build or setup.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score, GridSearchCV
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, AdaBoostClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    mean_squared_error, r2_score, accuracy_score,
    precision_score, recall_score, f1_score, confusion_matrix, classification_report
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(MODELS_DIR, exist_ok=True)


def train_regression():
    print("\n" + "="*50)
    print("STEP 1: Training Task 3 Regression Model (Total Claim)")
    print("="*50)

    raw_path = os.path.join(DATA_DIR, "insurance_fraud_data.csv")
    if not os.path.exists(raw_path):
        raise FileNotFoundError(f"File not found: {raw_path}")

    df = pd.read_csv(raw_path)
    print(f"Loaded raw dataset shape: {df.shape}")

    # Mode imputation for missing values
    mode_val = df["fraud reported"].mode()[0]
    df["fraud reported"] = df["fraud reported"].fillna(mode_val)
    df = df.drop_duplicates()
    df["claim_date"] = pd.to_datetime(df["claim_date"], format="mixed", errors="coerce")

    # Detect and handle outliers using IQR on annual_income
    q1 = df["annual_income"].quantile(0.25)
    q3 = df["annual_income"].quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    df_clean = df[(df["annual_income"] >= lower_bound) & (df["annual_income"] <= upper_bound)].copy()
    print(f"Dataset shape after IQR outlier removal: {df_clean.shape}")

    feature_cols = [
        'age_of_driver',
        'annual_income',
        'vehicle_price',
        'policy deductible',
        'annual premium',
        'form defects'
    ]

    X = df_clean[feature_cols].copy()
    y = df_clean['total_claim'].copy()

    # Train/Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train Scikit-Learn Linear Regression
    lr_model = LinearRegression()
    lr_model.fit(X_train, y_train)

    y_pred = lr_model.predict(X_test)
    mse = float(mean_squared_error(y_test, y_pred))
    r2 = float(r2_score(y_test, y_pred))

    print(f"Linear Regression MSE: {mse:.2f}")
    print(f"Linear Regression R2: {r2:.4f}")
    print(f"Coefficients: {lr_model.coef_}")
    print(f"Intercept: {lr_model.intercept_:.2f}")

    # Feature Scaler (used for Gradient Descent & scaled inference)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Gradient Descent from scratch (preserving Task 3 notebook logic)
    m = len(y)
    n = X_scaled.shape[1]
    weights = np.zeros(n)
    bias = 0.0
    learning_rate = 0.01
    epochs = 1000

    y_arr = y.values
    for epoch in range(epochs):
        yp = np.dot(X_scaled, weights) + bias
        err = yp - y_arr
        dw = (2.0 / m) * np.dot(X_scaled.T, err)
        db = (2.0 / m) * np.sum(err)
        weights -= learning_rate * dw
        bias -= learning_rate * db

    # Test sample prediction
    sample = np.array([[35, 500000, 800000, 500, 12000, 2]])
    sample_scaled = scaler.transform(sample)
    gd_prediction = float(np.dot(sample_scaled, weights) + bias)
    sk_prediction = float(lr_model.predict(sample)[0])
    print(f"Sample prediction (Sklearn): {sk_prediction:.2f}")
    print(f"Sample prediction (Gradient Descent): {gd_prediction:.2f}")

    # Save artifacts
    joblib.dump(lr_model, os.path.join(MODELS_DIR, "regression_model.pkl"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "regression_scaler.pkl"))

    metadata = {
        "features": feature_cols,
        "mse": mse,
        "r2_score": r2,
        "coefficients": [float(c) for c in lr_model.coef_],
        "intercept": float(lr_model.intercept_),
        "gd_weights": [float(w) for w in weights],
        "gd_bias": float(bias),
        "sample_sklearn_prediction": sk_prediction,
        "sample_gd_prediction": gd_prediction
    }
    with open(os.path.join(MODELS_DIR, "regression_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("Task 3 Regression artifacts saved successfully.")


def train_classification():
    print("\n" + "="*50)
    print("STEP 2: Training Task 5 Classification Models (Fraud Detection)")
    print("="*50)

    clean_path = os.path.join(DATA_DIR, "cleaned_data.csv")
    if not os.path.exists(clean_path):
        raise FileNotFoundError(f"File not found: {clean_path}")

    df = pd.read_csv(clean_path)
    print(f"Loaded cleaned dataset shape: {df.shape}")

    # Prepare features and target
    drop_cols = ['fraud_reported_Y', 'claim_number', 'claim_date']
    X = df.drop(columns=[col for col in drop_cols if col in df.columns]).copy()
    y = df['fraud_reported_Y'].astype(int)

    # Convert any boolean dummy columns to int (0/1)
    for col in X.columns:
        if X[col].dtype == 'bool':
            X[col] = X[col].astype(int)

    # Handle remaining inf/nan
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    feature_columns = list(X.columns)
    print(f"Feature count: {len(feature_columns)}")

    # Train / Test split (80/20, stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    models = {
        'Logistic Regression': Pipeline([
            ('scaler', StandardScaler()),
            ('model', LogisticRegression(max_iter=2000, random_state=42))
        ]),
        'Decision Tree': DecisionTreeClassifier(random_state=42, max_depth=6),
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
        'AdaBoost': AdaBoostClassifier(n_estimators=100, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, random_state=42)
    }

    trained_models = {}
    model_evaluations = []

    print("\nFitting baseline models and evaluating:")
    for name, model in models.items():
        print(f"  Training {name}...")
        model.fit(X_train, y_train)
        trained_models[name] = model

        train_pred = model.predict(X_train)
        test_pred = model.predict(X_test)

        train_acc = float(accuracy_score(y_train, train_pred))
        test_acc = float(accuracy_score(y_test, test_pred))
        prec = float(precision_score(y_test, test_pred, zero_division=0))
        rec = float(recall_score(y_test, test_pred, zero_division=0))
        f1 = float(f1_score(y_test, test_pred, zero_division=0))

        diff = train_acc - test_acc
        if diff > 0.10:
            status = 'Overfitting'
        elif train_acc < 0.60 and test_acc < 0.60:
            status = 'Underfitting'
        else:
            status = 'Good fit'

        model_evaluations.append({
            'name': name,
            'train_accuracy': round(train_acc, 4),
            'test_accuracy': round(test_acc, 4),
            'accuracy': round(test_acc, 4),
            'precision': round(prec, 4),
            'recall': round(rec, 4),
            'f1_score': round(f1, 4),
            'fit_status': status
        })

    # 5-Fold Stratified Cross-Validation
    print("\nRunning 5-fold Stratified Cross-Validation...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_summary = {}

    for name, model in models.items():
        scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='f1', n_jobs=-1)
        mean_score = float(scores.mean())
        std_score = float(scores.std())
        fold_scores = [float(s) for s in scores]
        cv_summary[name] = {
            'cv_f1_mean': round(mean_score, 4),
            'cv_f1_std': round(std_score, 4),
            'folds': [round(s, 4) for s in fold_scores]
        }
        for item in model_evaluations:
            if item['name'] == name:
                item['cv_f1_mean'] = round(mean_score, 4)
                item['cv_f1_std'] = round(std_score, 4)

    # Identify Best Model by CV F1 Mean
    best_model_name = max(cv_summary.keys(), key=lambda k: cv_summary[k]['cv_f1_mean'])
    print(f"\nBest baseline model by CV F1 Mean: {best_model_name} ({cv_summary[best_model_name]['cv_f1_mean']})")

    # Hyperparameter Tuning with GridSearchCV
    print(f"\nRunning GridSearchCV for {best_model_name}...")
    if best_model_name == 'Random Forest':
        estimator = RandomForestClassifier(random_state=42, n_jobs=-1)
        param_grid = {
            'n_estimators': [100, 200],
            'max_depth': [None, 5, 10],
            'min_samples_split': [2, 5]
        }
    elif best_model_name == 'Gradient Boosting':
        estimator = GradientBoostingClassifier(random_state=42)
        param_grid = {
            'n_estimators': [50, 100],
            'learning_rate': [0.05, 0.1],
            'max_depth': [2, 3]
        }
    elif best_model_name == 'AdaBoost':
        estimator = AdaBoostClassifier(random_state=42)
        param_grid = {
            'n_estimators': [50, 100, 150],
            'learning_rate': [0.5, 1.0]
        }
    elif best_model_name == 'Decision Tree':
        estimator = DecisionTreeClassifier(random_state=42)
        param_grid = {
            'max_depth': [3, 5, 7, 10, None],
            'min_samples_split': [2, 5, 10]
        }
    else:
        estimator = Pipeline([
            ('scaler', StandardScaler()),
            ('model', LogisticRegression(max_iter=2000, random_state=42))
        ])
        param_grid = {'model__C': [0.1, 1, 10]}

    grid_search = GridSearchCV(estimator, param_grid, cv=cv, scoring='f1', n_jobs=-1)
    grid_search.fit(X_train, y_train)

    best_model = grid_search.best_estimator_
    tuned_pred = best_model.predict(X_test)

    tuned_acc = float(accuracy_score(y_test, tuned_pred))
    tuned_prec = float(precision_score(y_test, tuned_pred, zero_division=0))
    tuned_rec = float(recall_score(y_test, tuned_pred, zero_division=0))
    tuned_f1 = float(f1_score(y_test, tuned_pred, zero_division=0))

    before_f1 = next(m['f1_score'] for m in model_evaluations if m['name'] == best_model_name)
    cm = confusion_matrix(y_test, tuned_pred).tolist()
    cr_dict = classification_report(
        y_test, tuned_pred, target_names=['Not Fraud', 'Fraud'], zero_division=0, output_dict=True
    )

    print(f"Tuned Model Best Parameters: {grid_search.best_params_}")
    print(f"Tuned Accuracy : {tuned_acc:.4f}")
    print(f"Tuned Precision: {tuned_prec:.4f}")
    print(f"Tuned Recall   : {tuned_rec:.4f}")
    print(f"Tuned F1-score : {tuned_f1:.4f} (Before: {before_f1:.4f})")

    # Build comprehensive preprocessor dictionary for transforming raw claim inputs
    preprocessor = {
        'feature_columns': feature_columns,
        'defaults': {col: float(X[col].median()) for col in feature_columns}
    }

    # Save all models & artifacts
    joblib.dump(best_model, os.path.join(MODELS_DIR, "classification_model.pkl"))
    joblib.dump(preprocessor, os.path.join(MODELS_DIR, "classification_preprocessor.pkl"))
    joblib.dump(trained_models, os.path.join(MODELS_DIR, "all_classification_models.pkl"))

    eval_results = {
        "best_model_name": best_model_name,
        "best_params": {k: (v if not isinstance(v, np.generic) else v.item()) for k, v in grid_search.best_params_.items()},
        "best_cv_score": round(float(grid_search.best_score_), 4),
        "before_tuning_f1": before_f1,
        "tuned_metrics": {
            "accuracy": round(tuned_acc, 4),
            "precision": round(tuned_prec, 4),
            "recall": round(tuned_rec, 4),
            "f1_score": round(tuned_f1, 4)
        },
        "models": model_evaluations,
        "cv_summary": cv_summary,
        "confusion_matrix": cm,
        "classification_report": cr_dict
    }

    with open(os.path.join(MODELS_DIR, "evaluation_results.json"), "w") as f:
        json.dump(eval_results, f, indent=2)

    print("Task 5 Classification artifacts saved successfully.")


if __name__ == "__main__":
    train_regression()
    train_classification()
    print("\n" + "="*50)
    print("ALL ML TRAINING TASKS COMPLETED SUCCESSFULLY!")
    print("="*50)
