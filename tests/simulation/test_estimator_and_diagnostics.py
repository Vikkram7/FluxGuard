"""
FluxGuard PMSM - Estimator & Diagnostic State Machine Tests
Verifies:
- Flux estimator accuracy across multiple speeds
- Low-speed rejection
- Temperature compensation avoiding false alarms during thermal ramp
- State machine persistence and hysteresis
- Baseline (uncompensated) vs temperature-compensated estimator comparison
"""

import pytest
import numpy as np
from simulation.pmsm_model import PMSMParameters
from simulation.estimator import FluxEstimator
from simulation.diagnostics import (
    DiagnosticStateMachine,
    DiagnosticConfig,
    DiagnosticState,
    HealthyReferenceModel,
    TemperatureCompensator
)


def test_flux_estimator_steady_state_multiple_speeds():
    params = PMSMParameters(p=4, Rs=0.45, Ld=0.0035, Lq=0.0035, psi_f_ref=0.085)
    estimator = FluxEstimator(params=params, dt=0.01)

    # Test speeds: 500, 1500, 2500 RPM
    for rpm in [500.0, 1500.0, 2500.0]:
        omega_m = rpm * 2.0 * np.pi / 60.0
        omega_e = params.p * omega_m
        
        # At steady state with id = 0, iq = 4A:
        # vq = Rs * iq + omega_e * psi_f = 0.45 * 4 + omega_e * 0.085
        iq = 4.0
        id_val = 0.0
        vd = -omega_e * params.Lq * iq # decoupling voltage
        vq = params.Rs * iq + omega_e * params.psi_f_ref

        # Prime the filter
        for _ in range(40):
            res = estimator.estimate(id_meas=id_val, iq_meas=iq, vd_cmd=vd, vq_cmd=vq, speed_rpm=rpm)

        assert res.is_valid is True
        assert res.reason_code == "VALID_ESTIMATE"
        assert pytest.approx(res.psi_hat, rel=0.02) == 0.085


def test_low_speed_observability_rejection():
    params = PMSMParameters(p=4, psi_f_ref=0.085)
    estimator = FluxEstimator(params=params, min_omega_e=18.0) # ~43 RPM

    # Speed = 20 RPM -> omega_e = 4 * (20 * 2pi/60) = 8.37 rad/s < 18 rad/s
    res = estimator.estimate(id_meas=0.0, iq_meas=2.0, vd_cmd=0.0, vq_cmd=1.0, speed_rpm=20.0)

    assert res.is_valid is False
    assert res.reason_code == "SPEED_TOO_LOW_FOR_OBSERVABILITY"
    assert res.uncertainty == 1.0


def test_temperature_compensation_prevents_false_alarms():
    """
    Key engineering validation:
    When a motor heats up from 20C to 80C, raw flux drops from 0.085 Wb to 0.0794 Wb (-6.6%).
    A naive uncompensated estimator would incorrectly flag this as severe demagnetization!
    FluxGuard's temperature compensator accounts for reversible thermal flux reduction,
    keeping the normalized residual near 0% and state NORMAL.
    """
    params = PMSMParameters(psi_f_ref=0.085, T_ref=20.0, alpha_psi=-0.0011)
    sm = DiagnosticStateMachine(params=params)
    estimator = FluxEstimator(params=params, dt=0.01)

    # Let motor heat up to 85C
    rpm = 1500.0
    omega_e = params.p * (rpm * 2 * np.pi / 60.0)
    temp_hot = 85.0
    psi_hot = params.psi_f_ref * (1.0 + params.alpha_psi * (temp_hot - 20.0)) # ~0.0789 Wb (-7.15%)

    vq = params.Rs * 3.0 + omega_e * psi_hot
    vd = -omega_e * params.Lq * 3.0

    snapshots = []
    for _ in range(60): # 60 samples to pass warmup
        est_res = estimator.estimate(id_meas=0.0, iq_meas=3.0, vd_cmd=vd, vq_cmd=vq, speed_rpm=rpm, temperature_c=temp_hot)
        snap = sm.process_sample(est_res, speed_rpm=rpm, temperature_c=temp_hot)
        snapshots.append(snap)

    last_snap = snapshots[-1]
    # Verify estimated flux tracked the lower physical flux
    assert pytest.approx(last_snap.psi_hat, rel=0.03) == psi_hot
    # Crucial: Normalized residual must be near 0% (NOT -7.15%!)
    assert abs(last_snap.norm_residual_pct) < 1.5
    # Diagnostic state MUST remain NORMAL
    assert last_snap.state == DiagnosticState.NORMAL


def test_demagnetization_detection_with_persistence():
    """
    When permanent demagnetization occurs (10% permanent drop):
    The residual drops to -10%. After persistence time, state becomes SUSPECTED_FLUX_DEGRADATION.
    """
    params = PMSMParameters(psi_f_ref=0.085, T_ref=20.0, alpha_psi=-0.0011)
    config = DiagnosticConfig(dt_sample_s=0.01, persistence_time_s=0.5) # 50 samples
    sm = DiagnosticStateMachine(params=params, config=config)
    estimator = FluxEstimator(params=params, dt=0.01)

    rpm = 1500.0
    omega_e = params.p * (rpm * 2 * np.pi / 60.0)
    temp = 20.0
    # 10% demag
    psi_demag = 0.085 * 0.90
    vq = params.Rs * 3.0 + omega_e * psi_demag
    vd = -omega_e * params.Lq * 3.0

    # 1. Warm-up
    for _ in range(35):
        est_res = estimator.estimate(id_meas=0.0, iq_meas=3.0, vd_cmd=vd, vq_cmd=vq, speed_rpm=rpm, temperature_c=temp)
        sm.process_sample(est_res, speed_rpm=rpm, temperature_c=temp)

    # 2. Before persistence completes (say 20 samples), state should be UNCERTAIN (persistence pending)
    for _ in range(20):
        est_res = estimator.estimate(id_meas=0.0, iq_meas=3.0, vd_cmd=vd, vq_cmd=vq, speed_rpm=rpm, temperature_c=temp)
        snap = sm.process_sample(est_res, speed_rpm=rpm, temperature_c=temp)

    assert snap.state == DiagnosticState.UNCERTAIN

    # 3. After full persistence (another 40 samples), state must be SUSPECTED_FLUX_DEGRADATION
    for _ in range(40):
        est_res = estimator.estimate(id_meas=0.0, iq_meas=3.0, vd_cmd=vd, vq_cmd=vq, speed_rpm=rpm, temperature_c=temp)
        snap = sm.process_sample(est_res, speed_rpm=rpm, temperature_c=temp)

    assert snap.state == DiagnosticState.SUSPECTED_FLUX_DEGRADATION
    assert "PERSISTENT_FLUX_DEFICIT" in snap.reason_code


def test_baseline_vs_compensated_comparison():
    """
    Compares naive baseline estimator (no thermal compensation) against FluxGuard.
    Shows false positive rate on baseline during thermal excursions.
    """
    params = PMSMParameters(psi_f_ref=0.085, T_ref=20.0, alpha_psi=-0.0011)
    
    # Healthy temperature sweep from 20C to 100C
    temperatures = np.linspace(20.0, 100.0, 50)
    
    baseline_false_alarms = 0
    fluxguard_false_alarms = 0
    
    sm = DiagnosticStateMachine(params=params)
    estimator = FluxEstimator(params=params, dt=0.01)

    for temp in temperatures:
        omega_e = 4.0 * (1500.0 * 2 * np.pi / 60.0)
        # Healthy flux at this temperature:
        psi_healthy_actual = params.psi_f_ref * (1.0 + params.alpha_psi * (temp - 20.0))
        vq = params.Rs * 2.0 + omega_e * psi_healthy_actual
        vd = -omega_e * params.Lq * 2.0
        
        # Naive baseline: compares directly against psi_f_ref (fixed 0.085)
        raw_estimated = (vq - params.Rs * 2.0) / omega_e
        naive_residual_pct = ((raw_estimated - params.psi_f_ref) / params.psi_f_ref) * 100.0
        if naive_residual_pct < -5.0:
            baseline_false_alarms += 1

        # FluxGuard:
        res = estimator.estimate(id_meas=0.0, iq_meas=2.0, vd_cmd=vd, vq_cmd=vq, speed_rpm=1500.0, temperature_c=temp)
        snap = sm.process_sample(res, speed_rpm=1500.0, temperature_c=temp)
        if snap.state == DiagnosticState.SUSPECTED_FLUX_DEGRADATION:
            fluxguard_false_alarms += 1

    # Naive baseline triggers multiple false alarms because temp rise causes >5% flux drop!
    assert baseline_false_alarms > 15
    # FluxGuard triggers 0 false alarms on the same healthy sweep!
    assert fluxguard_false_alarms == 0
