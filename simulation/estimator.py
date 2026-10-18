"""
FluxGuard PMSM - Physics-Based Flux Estimation Engine
Implements dynamic and steady-state voltage-model permanent-magnet flux estimators,
observability checks, derivative filtering, d-axis cross-validation, and uncertainty modeling.
"""

from dataclasses import dataclass
from typing import Optional
import numpy as np

from .pmsm_model import PMSMParameters


@dataclass
class EstimationResult:
    """Detailed result of flux estimation at a single sample."""
    psi_hat: float                 # Estimated flux linkage (Wb)
    is_valid: bool                 # Whether estimation conditions are satisfied
    uncertainty: float             # Normalized uncertainty index [0.0 = ideal, 1.0 = unusable]
    reason_code: str               # Reason for validity or invalidity
    d_axis_residual: float         # Cross-check d-axis voltage residual (V)
    method: str                    # 'DYNAMIC_VOLTAGE_MODEL' or 'STEADY_STATE_BEMF'
    raw_estimate: float            # Pre-filtered estimate
    filter_state: float            # Post-filtered estimate


class FluxEstimator:
    """
    Rotor-oriented d-q frame permanent-magnet flux estimator.

    Physics foundation:
        v_d = R_s * i_d + L_d * (di_d/dt) - omega_e * L_q * i_q
        v_q = R_s * i_q + L_q * (di_q/dt) + omega_e * (L_d * i_d + psi_f)

    Solving for psi_f:
        psi_f = (v_q - R_s * i_q - L_q * (di_q/dt) - omega_e * L_d * i_d) / omega_e

    At steady-state (di_q/dt approx 0):
        psi_f_steady = (v_q - R_s * i_q - omega_e * L_d * i_d) / omega_e
    """

    def __init__(self, params: PMSMParameters = None,
                 min_omega_e: float = 18.0,
                 lpf_cutoff_hz: float = 15.0,
                 dt: float = 0.01):
        self.params = params or PMSMParameters()
        self.min_omega_e = min_omega_e  # Min electrical speed for observability (~43 RPM for p=4)
        self.dt = dt

        # Digital low-pass filter coefficient for estimated flux
        # alpha = dt / (RC + dt), where RC = 1 / (2 * pi * fc)
        rc = 1.0 / (2.0 * np.pi * lpf_cutoff_hz)
        self.alpha_lpf = dt / (rc + dt)

        # Previous states for numerical derivatives
        self.prev_iq: Optional[float] = None
        self.prev_id: Optional[float] = None
        self.prev_omega_m: Optional[float] = None

        # Filtered flux estimate state
        self.filtered_psi: float = self.params.psi_f_ref

        # Filtered derivative states
        self.diq_dt_filtered: float = 0.0
        self.did_dt_filtered: float = 0.0

    def reset(self, initial_flux: Optional[float] = None) -> None:
        """Reset estimator memory states."""
        self.prev_iq = None
        self.prev_id = None
        self.prev_omega_m = None
        self.filtered_psi = initial_flux if initial_flux is not None else self.params.psi_f_ref
        self.diq_dt_filtered = 0.0
        self.did_dt_filtered = 0.0

    def estimate(self,
                 id_meas: float,
                 iq_meas: float,
                 vd_cmd: float,
                 vq_cmd: float,
                 speed_rpm: float,
                 temperature_c: float = 20.0,
                 use_dynamic: bool = True) -> EstimationResult:
        """
        Calculates PM flux estimate given electrical measurements and mechanical speed.
        """
        # 1. Input sanity and NaN/Inf checks
        inputs = [id_meas, iq_meas, vd_cmd, vq_cmd, speed_rpm, temperature_c]
        if any(np.isnan(v) or np.isinf(v) for v in inputs):
            return EstimationResult(
                psi_hat=self.filtered_psi,
                is_valid=False,
                uncertainty=1.0,
                reason_code="INPUT_NAN_OR_INF",
                d_axis_residual=0.0,
                method="NONE",
                raw_estimate=self.filtered_psi,
                filter_state=self.filtered_psi
            )

        # 2. Angular speed conversion (strict mechanical vs electrical distinction)
        omega_m = speed_rpm * (2.0 * np.pi / 60.0)
        omega_e = self.params.p * omega_m
        abs_omega_e = abs(omega_e)

        # 3. Low-speed observability cutoff
        if abs_omega_e < self.min_omega_e:
            return EstimationResult(
                psi_hat=self.filtered_psi,
                is_valid=False,
                uncertainty=1.0,
                reason_code="SPEED_TOO_LOW_FOR_OBSERVABILITY",
                d_axis_residual=0.0,
                method="NONE",
                raw_estimate=self.filtered_psi,
                filter_state=self.filtered_psi
            )

        # 4. Inverter & current saturation check
        v_mag = np.hypot(vd_cmd, vq_cmd)
        i_mag = np.hypot(id_meas, iq_meas)
        if v_mag > 1.05 * self.params.V_max or i_mag > 1.1 * self.params.I_max:
            return EstimationResult(
                psi_hat=self.filtered_psi,
                is_valid=False,
                uncertainty=0.9,
                reason_code="INVERTER_OR_CURRENT_SATURATION",
                d_axis_residual=0.0,
                method="NONE",
                raw_estimate=self.filtered_psi,
                filter_state=self.filtered_psi
            )

        # 5. Temperature boundary plausibility check
        if temperature_c < -40.0 or temperature_c > 165.0:
            return EstimationResult(
                psi_hat=self.filtered_psi,
                is_valid=False,
                uncertainty=0.95,
                reason_code="TEMPERATURE_OUT_OF_PHYSICAL_RANGE",
                d_axis_residual=0.0,
                method="NONE",
                raw_estimate=self.filtered_psi,
                filter_state=self.filtered_psi
            )

        # 6. Current derivatives calculation with smoothing
        if self.prev_iq is not None and self.dt > 0:
            raw_diq = (iq_meas - self.prev_iq) / self.dt
            raw_did = (id_meas - self.prev_id) / self.dt
            # Low-pass filter on derivatives
            d_alpha = min(1.0, self.alpha_lpf * 2.5)
            self.diq_dt_filtered += d_alpha * (raw_diq - self.diq_dt_filtered)
            self.did_dt_filtered += d_alpha * (raw_did - self.did_dt_filtered)
        else:
            self.diq_dt_filtered = 0.0
            self.did_dt_filtered = 0.0

        self.prev_iq = iq_meas
        self.prev_id = id_meas
        self.prev_omega_m = omega_m

        # 7. Model-based estimation
        # q-axis back-EMF: e_q = v_q - Rs * i_q - L_q * (di_q/dt) - omega_e * L_d * i_d
        Rs = self.params.Rs
        Ld = self.params.Ld
        Lq = self.params.Lq

        if use_dynamic and abs(self.diq_dt_filtered) > 1.0:
            inductive_q = Lq * self.diq_dt_filtered
            method_used = "DYNAMIC_VOLTAGE_MODEL"
        else:
            inductive_q = 0.0
            method_used = "STEADY_STATE_BEMF"

        cross_coupling_q = omega_e * Ld * id_meas
        resistive_drop_q = Rs * iq_meas
        bemf_q = vq_cmd - resistive_drop_q - inductive_q - cross_coupling_q

        # psi_f = e_q / omega_e
        raw_psi = bemf_q / omega_e

        # 8. Cross-check d-axis voltage residual
        # Healthy model d-axis: v_d_expected = Rs * i_d + L_d * (di_d/dt) - omega_e * L_q * i_q
        vd_expected = Rs * id_meas + Ld * self.did_dt_filtered - omega_e * Lq * iq_meas
        d_residual = abs(vd_cmd - vd_expected)

        # 9. Plausibility sanity window on raw flux
        if raw_psi < 0.01 or raw_psi > 2.0 * self.params.psi_f_ref:
            return EstimationResult(
                psi_hat=self.filtered_psi,
                is_valid=False,
                uncertainty=0.85,
                reason_code="ESTIMATE_OUT_OF_PLAUSIBLE_BOUNDS",
                d_axis_residual=d_residual,
                method=method_used,
                raw_estimate=raw_psi,
                filter_state=self.filtered_psi
            )

        # 10. Digital low-pass filtering
        self.filtered_psi += self.alpha_lpf * (raw_psi - self.filtered_psi)

        # 11. Uncertainty index calculation
        # Uncertainty is influenced by:
        # - Low speed: u_speed ~ min_omega_e / abs_omega_e
        # - D-axis residual discrepancy: u_res ~ d_residual / (V_max * 0.1)
        # - Dynamic transient acceleration: u_dyn ~ abs(diq_dt)
        u_speed = min(1.0, (2.0 * self.min_omega_e) / abs_omega_e) * 0.4
        u_res = min(0.4, d_residual / (self.params.V_max * 0.15))
        u_dyn = min(0.2, abs(self.diq_dt_filtered) / 100.0)
        total_uncertainty = float(np.clip(u_speed + u_res + u_dyn, 0.02, 1.0))

        # Check if d-axis mismatch indicates sensor error
        if d_residual > 0.3 * self.params.V_max:
            reason = "HIGH_D_AXIS_VOLTAGE_MISMATCH"
            is_valid = False
        else:
            reason = "VALID_ESTIMATE"
            is_valid = True

        return EstimationResult(
            psi_hat=float(self.filtered_psi),
            is_valid=is_valid,
            uncertainty=total_uncertainty,
            reason_code=reason,
            d_axis_residual=float(d_residual),
            method=method_used,
            raw_estimate=float(raw_psi),
            filter_state=float(self.filtered_psi)
        )
