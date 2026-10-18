"""
FluxGuard PMSM - Scenario Generator
Generates reproducible simulated operating scenarios covering healthy baselines,
speed/load/thermal variations, sensor errors, and synthetic permanent-magnet degradation.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Callable
import numpy as np
import pandas as pd

from .pmsm_model import PMSMParameters, PMSMSimulator
from .estimator import FluxEstimator
from .diagnostics import DiagnosticStateMachine, DiagnosticConfig, DiagnosticState


@dataclass
class ScenarioMetadata:
    name: str
    description: str
    duration_s: float
    seed: int
    dt_sim: float = 0.0005   # Fine simulation step (2 kHz)
    dt_telemetry: float = 0.01 # Telemetry/estimator step (100 Hz)


def run_scenario(
    name: str,
    duration_s: float = 12.0,
    seed: int = 42,
    speed_profile: Optional[Callable[[float], float]] = None,
    load_profile: Optional[Callable[[float], float]] = None,
    temp_profile: Optional[Callable[[float], float]] = None,
    demag_profile: Optional[Callable[[float], float]] = None,
    current_offset_a: float = 0.0,
    voltage_noise_std_v: float = 0.0,
    temp_sensor_bias_c: float = 0.0,
    packet_drop_prob: float = 0.0,
    rs_mismatch_ratio: float = 1.0,
    sim_params: Optional[PMSMParameters] = None,
    ref_params: Optional[PMSMParameters] = None,
) -> pd.DataFrame:
    """
    Simulates a complete operating scenario and processes it through the FluxEstimator
    and DiagnosticStateMachine. Returns a detailed DataFrame.
    """
    np.random.seed(seed)

    motor_params = sim_params or PMSMParameters()
    estimator_params = ref_params or PMSMParameters()
    if rs_mismatch_ratio != 1.0:
        # Intentionally mismatch the reference model parameter for testing robustness
        estimator_params = PMSMParameters(Rs=motor_params.Rs * rs_mismatch_ratio)

    dt_sim = 0.0005
    dt_telemetry = 0.01
    decimation = int(round(dt_telemetry / dt_sim))

    sim = PMSMSimulator(params=motor_params, dt=dt_sim)
    estimator = FluxEstimator(params=estimator_params, dt=dt_telemetry)
    state_machine = DiagnosticStateMachine(params=estimator_params, config=DiagnosticConfig(dt_sample_s=dt_telemetry))

    # Default profile functions
    speed_fn = speed_profile or (lambda t: 1500.0)
    load_fn = load_profile or (lambda t: 2.0)
    temp_fn = temp_profile or (lambda t: 25.0)
    demag_fn = demag_profile or (lambda t: 0.0)

    total_steps = int(duration_s / dt_sim)
    records = []

    for step in range(total_steps):
        t = step * dt_sim
        target_speed = speed_fn(t)
        load = load_fn(t)
        actual_temp = temp_fn(t)
        demag = demag_fn(t)

        sim_out = sim.step(
            target_speed_rpm=target_speed,
            load_torque=load,
            temperature_c=actual_temp,
            demag_ratio=demag
        )

        # Telemetry / estimation sample point
        if step % decimation == 0:
            # Check for simulated packet drop
            if packet_drop_prob > 0.0 and np.random.rand() < packet_drop_prob:
                continue

            # Apply sensor noise and bias to measurements
            id_meas = sim_out["id"] + current_offset_a + (np.random.randn() * 0.03 if voltage_noise_std_v > 0 else 0.0)
            iq_meas = sim_out["iq"] + (np.random.randn() * 0.03 if voltage_noise_std_v > 0 else 0.0)
            vd_meas = sim_out["vd"] + (np.random.randn() * voltage_noise_std_v if voltage_noise_std_v > 0 else 0.0)
            vq_meas = sim_out["vq"] + (np.random.randn() * voltage_noise_std_v if voltage_noise_std_v > 0 else 0.0)
            speed_meas = sim_out["speed_rpm"] + (np.random.randn() * 2.0 if voltage_noise_std_v > 0 else 0.0)
            temp_meas = actual_temp + temp_sensor_bias_c

            # 1. Run flux estimation
            est_res = estimator.estimate(
                id_meas=id_meas,
                iq_meas=iq_meas,
                vd_cmd=vd_meas,
                vq_cmd=vq_meas,
                speed_rpm=speed_meas,
                temperature_c=temp_meas,
                use_dynamic=True
            )

            # 2. Run diagnostic state machine
            diag_snap = state_machine.process_sample(
                est_result=est_res,
                speed_rpm=speed_meas,
                temperature_c=temp_meas,
                timestamp_s=t
            )

            records.append({
                "timestamp_s": round(t, 4),
                "timestamp_ms": int(round(t * 1000)),
                "scenario": name,
                "speed_rpm": round(speed_meas, 2),
                "actual_speed_rpm": round(sim_out["speed_rpm"], 2),
                "temperature_c": round(temp_meas, 2),
                "actual_temp_c": round(actual_temp, 2),
                "id_a": round(id_meas, 3),
                "iq_a": round(iq_meas, 3),
                "vd_v": round(vd_meas, 2),
                "vq_v": round(vq_meas, 2),
                "te_nm": round(sim_out["te_nm"], 3),
                "load_nm": round(sim_out["load_nm"], 3),
                "actual_flux_wb": round(sim_out["actual_flux"], 5),
                "estimated_flux_wb": round(diag_snap.psi_hat, 5),
                "healthy_reference_flux_wb": round(diag_snap.psi_healthy, 5),
                "raw_residual_wb": round(diag_snap.raw_residual_wb, 6),
                "norm_residual_pct": round(diag_snap.norm_residual_pct, 3),
                "smoothed_residual_pct": round(diag_snap.smoothed_residual_pct, 3),
                "diagnostic_state": diag_snap.state.value,
                "reason_code": diag_snap.reason_code,
                "confidence_pct": round(diag_snap.confidence_pct, 1),
                "uncertainty": round(diag_snap.uncertainty, 3),
                "is_valid": diag_snap.is_valid_operating_point,
                "synthetic_demag_ratio": round(demag, 3),
            })

    return pd.DataFrame(records)


def get_all_scenarios() -> Dict[str, Callable[[], pd.DataFrame]]:
    """Defines all 12 standardized test scenarios."""
    scenarios = {}

    # 1. Healthy motor at constant speed and load
    scenarios["healthy_constant"] = lambda: run_scenario(
        name="healthy_constant",
        duration_s=10.0,
        speed_profile=lambda t: 1500.0,
        load_profile=lambda t: 2.5,
        temp_profile=lambda t: 25.0,
        demag_profile=lambda t: 0.0
    )

    # 2. Healthy motor with varying speed
    def speed_var(t: float) -> float:
        if t < 3.0: return 800.0
        elif t < 6.0: return 1600.0
        elif t < 9.0: return 2200.0
        else: return 1200.0

    scenarios["healthy_varying_speed"] = lambda: run_scenario(
        name="healthy_varying_speed",
        duration_s=12.0,
        speed_profile=speed_var,
        load_profile=lambda t: 2.0,
        temp_profile=lambda t: 30.0,
        demag_profile=lambda t: 0.0
    )

    # 3. Healthy motor with varying load
    def load_var(t: float) -> float:
        if t < 3.0: return 0.5
        elif t < 6.0: return 2.5
        elif t < 9.0: return 4.0
        else: return 1.5

    scenarios["healthy_varying_load"] = lambda: run_scenario(
        name="healthy_varying_load",
        duration_s=12.0,
        speed_profile=lambda t: 1500.0,
        load_profile=load_var,
        temp_profile=lambda t: 35.0,
        demag_profile=lambda t: 0.0
    )

    # 4. Reversible temperature-dependent flux variation (25C -> 85C -> 40C)
    # Crucial test: Residual remains within healthy bounds because of temperature compensation!
    def temp_sweep(t: float) -> float:
        if t < 4.0: return 25.0 + 15.0 * t  # 25 to 85 C
        elif t < 8.0: return 85.0 + (105.0 - 85.0) * ((t - 4.0) / 4.0) # 85 to 105 C
        else: return 105.0 - (105.0 - 40.0) * ((t - 8.0) / 4.0) # cooling to 40 C

    scenarios["reversible_temperature_variation"] = lambda: run_scenario(
        name="reversible_temperature_variation",
        duration_s=12.0,
        speed_profile=lambda t: 1600.0,
        load_profile=lambda t: 2.0,
        temp_profile=temp_sweep,
        demag_profile=lambda t: 0.0
    )

    # 5. Simulated flux reduction of 5% (Controlled demag test)
    scenarios["synthetic_flux_reduction_5pct"] = lambda: run_scenario(
        name="synthetic_flux_reduction_5pct",
        duration_s=12.0,
        speed_profile=lambda t: 1500.0,
        load_profile=lambda t: 2.0,
        temp_profile=lambda t: 40.0,
        demag_profile=lambda t: 0.05 if t >= 4.0 else 0.0
    )

    # 6. Simulated flux reduction of 10%
    scenarios["synthetic_flux_reduction_10pct"] = lambda: run_scenario(
        name="synthetic_flux_reduction_10pct",
        duration_s=12.0,
        speed_profile=lambda t: 1500.0,
        load_profile=lambda t: 2.0,
        temp_profile=lambda t: 40.0,
        demag_profile=lambda t: 0.10 if t >= 4.0 else 0.0
    )

    # 7. Simulated flux reduction of 15%
    scenarios["synthetic_flux_reduction_15pct"] = lambda: run_scenario(
        name="synthetic_flux_reduction_15pct",
        duration_s=12.0,
        speed_profile=lambda t: 1500.0,
        load_profile=lambda t: 2.0,
        temp_profile=lambda t: 40.0,
        demag_profile=lambda t: 0.15 if t >= 4.0 else 0.0
    )

    # 8. Current-sensor offset
    scenarios["current_sensor_offset"] = lambda: run_scenario(
        name="current_sensor_offset",
        duration_s=10.0,
        speed_profile=lambda t: 1500.0,
        load_profile=lambda t: 2.0,
        temp_profile=lambda t: 25.0,
        current_offset_a=0.75  # 0.75 A DC bias
    )

    # 9. Voltage measurement noise
    scenarios["voltage_measurement_noise"] = lambda: run_scenario(
        name="voltage_measurement_noise",
        duration_s=10.0,
        speed_profile=lambda t: 1500.0,
        load_profile=lambda t: 2.0,
        temp_profile=lambda t: 30.0,
        voltage_noise_std_v=1.2 # 1.2 V std dev noise
    )

    # 10. Temperature-sensor bias
    scenarios["temperature_sensor_bias"] = lambda: run_scenario(
        name="temperature_sensor_bias",
        duration_s=10.0,
        speed_profile=lambda t: 1500.0,
        load_profile=lambda t: 2.0,
        temp_profile=lambda t: 30.0,
        temp_sensor_bias_c=18.0 # +18 C bias error
    )

    # 11. Low-speed operation
    scenarios["low_speed_operation"] = lambda: run_scenario(
        name="low_speed_operation",
        duration_s=8.0,
        speed_profile=lambda t: 45.0, # Below 60 RPM cutoff
        load_profile=lambda t: 0.5,
        temp_profile=lambda t: 25.0
    )

    # 12. Transient acceleration and deceleration
    def fast_transient(t: float) -> float:
        if t < 2.0: return 1000.0
        elif t < 4.0: return 2800.0
        elif t < 6.0: return 700.0
        elif t < 8.0: return 2400.0
        else: return 1500.0

    scenarios["transient_acceleration"] = lambda: run_scenario(
        name="transient_acceleration",
        duration_s=10.0,
        speed_profile=fast_transient,
        load_profile=lambda t: 2.5,
        temp_profile=lambda t: 35.0
    )

    # Additional: Parameter mismatch (Rs +20%)
    scenarios["parameter_mismatch_rs"] = lambda: run_scenario(
        name="parameter_mismatch_rs",
        duration_s=10.0,
        speed_profile=lambda t: 1500.0,
        load_profile=lambda t: 2.5,
        temp_profile=lambda t: 30.0,
        rs_mismatch_ratio=1.20
    )

    return scenarios
