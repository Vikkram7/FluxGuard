"""
FluxGuard PMSM - Dataset and Demonstration Generator Script
Executes all 12 test scenarios, generates reproducible CSV files in datasets/,
creates engineering analysis plots, evaluates baseline vs temperature-compensated methods,
and exports provenance metadata.
"""

import os
import json
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from simulation.scenarios import get_all_scenarios
from simulation.ml_classifier import ExperimentalFluxClassifier


def generate_all():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dataset_dir = os.path.join(base_dir, "datasets")
    plots_dir = os.path.join(dataset_dir, "plots")
    os.makedirs(dataset_dir, exist_ok=True)
    os.makedirs(plots_dir, exist_ok=True)

    print("====================================================")
    print("FluxGuard PMSM - Demonstration Dataset Generation")
    print("====================================================")

    scenarios = get_all_scenarios()
    all_dfs = []
    metadata = {
        "project": "FluxGuard PMSM",
        "description": "Reproducible synthetic PMSM operating datasets for flux degradation diagnostics",
        "generated_at": "2026-10-18T20:00:00Z",
        "nominal_parameters": {
            "p": 4,
            "Rs_ohm": 0.45,
            "Ld_H": 0.0035,
            "Lq_H": 0.0035,
            "psi_f_ref_Wb": 0.085,
            "T_ref_C": 20.0,
            "alpha_psi_per_K": -0.0011,
            "J_kgm2": 0.0018,
            "B_nms": 0.00035,
        },
        "scenarios": {}
    }

    for name, runner in scenarios.items():
        print(f"[*] Simulating scenario: {name} ...")
        df = runner()
        csv_path = os.path.join(dataset_dir, f"{name}.csv")
        df.to_csv(csv_path, index=False)
        all_dfs.append(df)

        metadata["scenarios"][name] = {
            "samples": len(df),
            "duration_s": float(df["timestamp_s"].max()),
            "states_observed": list(df["diagnostic_state"].unique()),
            "min_speed_rpm": float(df["speed_rpm"].min()),
            "max_speed_rpm": float(df["speed_rpm"].max()),
            "min_temp_c": float(df["temperature_c"].min()),
            "max_temp_c": float(df["temperature_c"].max()),
            "min_norm_res_pct": float(df["norm_residual_pct"].min()),
            "max_norm_res_pct": float(df["norm_residual_pct"].max()),
        }

    # Combine into master dataset
    combined_df = pd.concat(all_dfs, ignore_index=True)
    master_path = os.path.join(dataset_dir, "master_demonstration_dataset.csv")
    combined_df.to_csv(master_path, index=False)
    print(f"[+] Master dataset saved to: {master_path} ({len(combined_df)} samples)")

    # 1. Plot: Reversible Temperature Variation (Proves compensation avoids false alarms)
    print("[*] Generating Plot 1: Reversible Temperature Variation & Compensation ...")
    temp_df = pd.read_csv(os.path.join(dataset_dir, "reversible_temperature_variation.csv"))
    fig, axes = plt.subplots(4, 1, figsize=(11, 10), sharex=True)
    fig.patch.set_facecolor("#0F172A")
    for ax in axes:
        ax.set_facecolor("#1E293B")
        ax.tick_params(colors="white")
        ax.grid(True, linestyle="--", alpha=0.3, color="gray")

    # Temp
    axes[0].plot(temp_df["timestamp_s"], temp_df["temperature_c"], color="#F59E0B", lw=2, label="Measured Temp (deg C)")
    axes[0].set_ylabel("Temp [°C]", color="white")
    axes[0].legend(loc="upper right")
    axes[0].set_title("Reversible Thermal Variation - No Demagnetization False Alarms", color="white", fontsize=13, fontweight="bold")

    # Flux
    axes[1].plot(temp_df["timestamp_s"], temp_df["actual_flux_wb"] * 1000, color="#10B981", lw=2.2, label="Actual Physical Flux [mWb]")
    axes[1].plot(temp_df["timestamp_s"], temp_df["healthy_reference_flux_wb"] * 1000, color="#06B6D4", lw=2, linestyle="--", label="Healthy Model Flux [mWb]")
    axes[1].plot(temp_df["timestamp_s"], temp_df["estimated_flux_wb"] * 1000, color="#A855F7", lw=1.5, alpha=0.8, label="Estimated Flux [mWb]")
    axes[1].set_ylabel("Flux [mWb]", color="white")
    axes[1].legend(loc="upper right")

    # Residuals
    axes[2].axhline(y=-5.0, color="#EF4444", linestyle=":", lw=2, label="Degradation Threshold (-5%)")
    axes[2].axhline(y=-3.5, color="#F59E0B", linestyle=":", lw=1.5, label="Warning Threshold (-3.5%)")
    axes[2].plot(temp_df["timestamp_s"], temp_df["norm_residual_pct"], color="#94A3B8", alpha=0.5, label="Raw Residual [%]")
    axes[2].plot(temp_df["timestamp_s"], temp_df["smoothed_residual_pct"], color="#38BDF8", lw=2.2, label="Compensated Residual [%]")
    axes[2].set_ylabel("Residual [%]", color="white")
    axes[2].set_ylim(-8, 5)
    axes[2].legend(loc="lower right")

    # Diagnostic state
    state_map = {"INITIALIZING": 0, "NORMAL": 1, "UNCERTAIN": 2, "INSUFFICIENT_DATA": 3, "SENSOR_FAULT": 4, "SUSPECTED_FLUX_DEGRADATION": 5}
    state_vals = [state_map.get(s, 0) for s in temp_df["diagnostic_state"]]
    axes[3].step(temp_df["timestamp_s"], state_vals, color="#10B981", lw=2.5, where="post")
    axes[3].set_yticks(list(state_map.values()))
    axes[3].set_yticklabels(list(state_map.keys()), color="white")
    axes[3].set_ylabel("Diagnostic State", color="white")
    axes[3].set_xlabel("Time [seconds]", color="white")

    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "reversible_temperature_compensation.png"), dpi=200, facecolor=fig.get_facecolor())
    plt.close()

    # 2. Plot: Synthetic Flux Reductions (5%, 10%, 15% detection)
    print("[*] Generating Plot 2: Synthetic Flux Reductions (5%, 10%, 15%) ...")
    fig, axes = plt.subplots(3, 1, figsize=(11, 9), sharex=True)
    fig.patch.set_facecolor("#0F172A")
    for ax in axes:
        ax.set_facecolor("#1E293B")
        ax.tick_params(colors="white")
        ax.grid(True, linestyle="--", alpha=0.3, color="gray")

    for f_pct, color in [(5, "#38BDF8"), (10, "#F59E0B"), (15, "#EF4444")]:
        df_demag = pd.read_csv(os.path.join(dataset_dir, f"synthetic_flux_reduction_{f_pct}pct.csv"))
        axes[0].plot(df_demag["timestamp_s"], df_demag["estimated_flux_wb"] * 1000, color=color, lw=2, label=f"Estimated ({f_pct}% Demag)")
        axes[1].plot(df_demag["timestamp_s"], df_demag["smoothed_residual_pct"], color=color, lw=2, label=f"Residual ({f_pct}% Demag)")
        s_vals = [state_map.get(s, 0) for s in df_demag["diagnostic_state"]]
        axes[2].step(df_demag["timestamp_s"], s_vals, color=color, lw=2, label=f"State ({f_pct}% Demag)", where="post")

    axes[0].plot(df_demag["timestamp_s"], df_demag["healthy_reference_flux_wb"] * 1000, color="#FFFFFF", lw=1.5, linestyle="--", label="Healthy Reference")
    axes[0].set_ylabel("Flux [mWb]", color="white")
    axes[0].set_title("Controlled Synthetic Demagnetization Step at t = 4.0s", color="white", fontsize=13, fontweight="bold")
    axes[0].legend(loc="lower left")

    axes[1].axhline(y=-5.0, color="#EF4444", linestyle=":", lw=2, label="Threshold (-5.0%)")
    axes[1].set_ylabel("Norm Residual [%]", color="white")
    axes[1].legend(loc="lower left")

    axes[2].set_yticks(list(state_map.values()))
    axes[2].set_yticklabels(list(state_map.keys()), color="white")
    axes[2].set_ylabel("State", color="white")
    axes[2].set_xlabel("Time [seconds]", color="white")
    axes[2].legend(loc="lower left")

    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "synthetic_flux_reductions.png"), dpi=200, facecolor=fig.get_facecolor())
    plt.close()

    # 3. Plot: Speed & Load Dynamics + Current Vectors
    print("[*] Generating Plot 3: Speed & Load Dynamics + Phase Currents ...")
    dyn_df = pd.read_csv(os.path.join(dataset_dir, "healthy_varying_speed.csv"))
    fig, axes = plt.subplots(3, 1, figsize=(11, 8), sharex=True)
    fig.patch.set_facecolor("#0F172A")
    for ax in axes:
        ax.set_facecolor("#1E293B")
        ax.tick_params(colors="white")
        ax.grid(True, linestyle="--", alpha=0.3, color="gray")

    axes[0].plot(dyn_df["timestamp_s"], dyn_df["speed_rpm"], color="#06B6D4", lw=2, label="Rotor Speed [RPM]")
    axes[0].set_ylabel("Speed [RPM]", color="white")
    axes[0].set_title("Dynamic Operating Envelope: Varying Speed with FOC Decoupling", color="white", fontsize=13, fontweight="bold")
    axes[0].legend(loc="upper right")

    axes[1].plot(dyn_df["timestamp_s"], dyn_df["iq_a"], color="#10B981", lw=2, label="q-axis Current i_q [A]")
    axes[1].plot(dyn_df["timestamp_s"], dyn_df["id_a"], color="#A855F7", lw=1.8, label="d-axis Current i_d [A]")
    axes[1].set_ylabel("Current [A]", color="white")
    axes[1].legend(loc="upper right")

    axes[2].plot(dyn_df["timestamp_s"], dyn_df["vq_v"], color="#F59E0B", lw=2, label="q-axis Voltage v_q [V]")
    axes[2].plot(dyn_df["timestamp_s"], dyn_df["vd_v"], color="#64748B", lw=1.8, label="d-axis Voltage v_d [V]")
    axes[2].set_ylabel("Voltage [V]", color="white")
    axes[2].set_xlabel("Time [seconds]", color="white")
    axes[2].legend(loc="upper right")

    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "dynamic_speed_currents.png"), dpi=200, facecolor=fig.get_facecolor())
    plt.close()

    # 4. Secondary ML Classifier Training and Evaluation
    print("[*] Training Secondary Experimental ML Classifier ...")
    ml_clf = ExperimentalFluxClassifier(random_state=42)
    eval_result = ml_clf.train_and_evaluate(combined_df, test_size=0.3)
    print(f"[+] ML Evaluation Accuracy: {eval_result.accuracy * 100:.2f}%")
    metadata["experimental_ml_evaluation"] = {
        "accuracy": eval_result.accuracy,
        "classification_report": eval_result.report,
        "feature_importances": eval_result.feature_importances,
    }

    # Save metadata JSON
    meta_path = os.path.join(dataset_dir, "dataset_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[+] Metadata written to: {meta_path}")
    print("====================================================")
    print("Demonstration Dataset Generation Completed!")
    print("====================================================")


if __name__ == "__main__":
    generate_all()
