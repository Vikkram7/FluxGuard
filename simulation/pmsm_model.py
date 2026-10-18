"""
FluxGuard PMSM - Physics-Based PMSM Simulation Model
Rotor-oriented dq-frame dynamic model with mechanical dynamics and thermal coupling.

Electrical equations:
    v_d = R_s * i_d + L_d * (di_d/dt) - omega_e * L_q * i_q
    v_q = R_s * i_q + L_q * (di_q/dt) + omega_e * (L_d * i_d + psi_f)

Mechanical equations:
    omega_m = 2 * pi * n / 60
    omega_e = p * omega_m
    T_e = 1.5 * p * [psi_f * i_q + (L_d - L_q) * i_d * i_q]
    J * (d_omega_m/dt) = T_e - T_L - B * omega_m

Thermal flux relationship:
    psi_f(T) = psi_f_ref * [1 + alpha_psi * (T - T_ref)] * (1 - demag_ratio)
"""

from dataclasses import dataclass
import numpy as np


@dataclass
class PMSMParameters:
    """Motor electrical and mechanical parameters with strict SI units."""
    p: int = 4                       # Number of pole pairs
    Rs: float = 0.45                 # Stator phase resistance (Ohms)
    Ld: float = 0.0035               # d-axis inductance (H)
    Lq: float = 0.0035               # q-axis inductance (H) - SPMSM (non-salient)
    psi_f_ref: float = 0.0850        # Nominal permanent magnet flux linkage (Wb) at T_ref
    T_ref: float = 20.0              # Reference temperature (deg C)
    alpha_psi: float = -0.0011       # Reversible temperature coefficient (1/K or 1/degC) NdFeB
    J: float = 0.0018                # Combined rotor and load inertia (kg*m^2)
    B: float = 0.00035               # Viscous friction coefficient (N*m*s/rad)
    V_max: float = 160.0             # Maximum DC bus phase-voltage limit (V peak)
    I_max: float = 25.0              # Maximum continuous phase current limit (A peak)
    rated_speed_rpm: float = 3000.0  # Rated mechanical speed (RPM)
    rated_torque_nm: float = 4.5     # Rated mechanical torque (N*m)

    def validate(self) -> None:
        """Validate physical plausibility of motor parameters."""
        if self.p <= 0:
            raise ValueError(f"Pole pairs must be positive, got {self.p}")
        if self.Rs <= 0.0:
            raise ValueError(f"Stator resistance must be positive, got {self.Rs}")
        if self.Ld <= 0.0 or self.Lq <= 0.0:
            raise ValueError(f"Inductances must be positive, got Ld={self.Ld}, Lq={self.Lq}")
        if self.psi_f_ref <= 0.0:
            raise ValueError(f"Reference flux must be positive, got {self.psi_f_ref}")
        if self.alpha_psi >= 0.0:
            raise ValueError(f"alpha_psi should be negative for NdFeB/Ferrite, got {self.alpha_psi}")
        if self.J <= 0.0 or self.B < 0.0:
            raise ValueError("Inertia must be positive and damping non-negative")


class PMSMSimulator:
    """
    Rotor-oriented PMSM dynamic simulator with Field-Oriented Control (FOC).
    Simulates continuous electrical and mechanical states: [i_d, i_q, omega_m, theta_m].
    """

    def __init__(self, params: PMSMParameters = None, dt: float = 1e-4):
        self.params = params or PMSMParameters()
        self.params.validate()
        self.dt = dt  # Integration time step (s)

        # Dynamic state vector
        self.id: float = 0.0         # d-axis current (A)
        self.iq: float = 0.0         # q-axis current (A)
        self.omega_m: float = 0.0    # Mechanical angular speed (rad/s)
        self.theta_m: float = 0.0    # Mechanical rotor angle (rad)

        # Environmental & degradation state
        self.temperature: float = 20.0   # Magnet temperature (deg C)
        self.demag_ratio: float = 0.0    # Permanent degradation factor (0.0 = healthy, 0.1 = 10% lost)

        # FOC PI Controllers
        # Current controller gains based on pole-placement: omega_c = Rs / Ld
        omega_current = 2.0 * np.pi * 300.0  # 300 Hz current loop bandwidth
        self.Kp_d = self.params.Ld * omega_current
        self.Ki_d = self.params.Rs * omega_current
        self.Kp_q = self.params.Lq * omega_current
        self.Ki_q = self.params.Rs * omega_current

        self.integral_id_err = 0.0
        self.integral_iq_err = 0.0

        # Speed PI controller
        self.Kp_speed = 0.15
        self.Ki_speed = 1.2
        self.integral_speed_err = 0.0

        # Applied voltages
        self.vd: float = 0.0
        self.vq: float = 0.0
        self.Te: float = 0.0

    @property
    def omega_e(self) -> float:
        """Electrical angular velocity: omega_e = p * omega_m (rad/s)."""
        return self.params.p * self.omega_m

    @property
    def speed_rpm(self) -> float:
        """Mechanical speed in RPM: n = omega_m * 60 / (2*pi)."""
        return self.omega_m * 60.0 / (2.0 * np.pi)

    def actual_flux(self) -> float:
        """
        Calculates physical permanent magnet flux including reversible temperature variation
        and permanent demagnetization degradation.
        """
        temp_factor = 1.0 + self.params.alpha_psi * (self.temperature - self.params.T_ref)
        # Physical lower bound check (magnets don't invert spontaneously)
        temp_factor = max(0.1, temp_factor)
        deg_factor = max(0.0, 1.0 - self.demag_ratio)
        return self.params.psi_f_ref * temp_factor * deg_factor

    def compute_torque(self, i_d: float, i_q: float, psi: float) -> float:
        """
        Electromagnetic torque:
            T_e = 1.5 * p * [psi * i_q + (L_d - L_q) * i_d * i_q]
        """
        p = self.params.p
        Ld = self.params.Ld
        Lq = self.params.Lq
        return 1.5 * p * (psi * i_q + (Ld - Lq) * i_d * i_q)

    def electrical_derivatives(self, i_d: float, i_q: float, v_d: float, v_q: float,
                               omega_e_val: float, psi: float) -> tuple[float, float]:
        """
        Computes di_d/dt and di_q/dt:
            di_d/dt = (v_d - R_s * i_d + omega_e * L_q * i_q) / L_d
            di_q/dt = (v_q - R_s * i_q - omega_e * (L_d * i_d + psi)) / L_q
        """
        Rs = self.params.Rs
        Ld = self.params.Ld
        Lq = self.params.Lq

        did_dt = (v_d - Rs * i_d + omega_e_val * Lq * i_q) / Ld
        diq_dt = (v_q - Rs * i_q - omega_e_val * (Ld * i_d + psi)) / Lq
        return did_dt, diq_dt

    def step(self, target_speed_rpm: float, load_torque: float,
             temperature_c: float = 20.0, demag_ratio: float = 0.0) -> dict:
        """
        Executes one simulation step using closed-loop FOC control and RK4 dynamic integration.
        """
        self.temperature = float(temperature_c)
        self.demag_ratio = float(demag_ratio)
        psi_actual = self.actual_flux()

        # 1. Speed controller: generates i_q_ref (id_ref = 0 for standard surface PMSM)
        target_omega_m = target_speed_rpm * 2.0 * np.pi / 60.0
        speed_err = target_omega_m - self.omega_m
        self.integral_speed_err += speed_err * self.dt
        # Anti-windup on speed integral
        max_integral = self.params.I_max / (self.Ki_speed + 1e-6)
        self.integral_speed_err = np.clip(self.integral_speed_err, -max_integral, max_integral)

        iq_ref = self.Kp_speed * speed_err + self.Ki_speed * self.integral_speed_err
        iq_ref = np.clip(iq_ref, -self.params.I_max, self.params.I_max)
        id_ref = 0.0  # Zero d-axis current control (MTPA for SPMSM)

        # 2. Current controllers with decoupling feedforward
        id_err = id_ref - self.id
        iq_err = iq_ref - self.iq

        self.integral_id_err += id_err * self.dt
        self.integral_iq_err += iq_err * self.dt
        self.integral_id_err = np.clip(self.integral_id_err, -self.params.V_max, self.params.V_max)
        self.integral_iq_err = np.clip(self.integral_iq_err, -self.params.V_max, self.params.V_max)

        # Decoupling terms
        w_e = self.omega_e
        vd_decouple = -w_e * self.params.Lq * self.iq
        vq_decouple = w_e * (self.params.Ld * self.id + self.params.psi_f_ref)

        vd_cmd = self.Kp_d * id_err + self.Ki_d * self.integral_id_err + vd_decouple
        vq_cmd = self.Kp_q * iq_err + self.Ki_q * self.integral_iq_err + vq_decouple

        # Inverter voltage saturation (voltage vector magnitude limited to V_max)
        v_mag = np.hypot(vd_cmd, vq_cmd)
        if v_mag > self.params.V_max:
            scale = self.params.V_max / v_mag
            vd_cmd *= scale
            vq_cmd *= scale

        self.vd = vd_cmd
        self.vq = vq_cmd

        # 3. RK4 Integration of electrical and mechanical states
        dt = self.dt
        p = self.params.p
        J = self.params.J
        B = self.params.B

        def state_derivatives(id_val, iq_val, wm_val):
            we_val = p * wm_val
            did, diq = self.electrical_derivatives(id_val, iq_val, self.vd, self.vq, we_val, psi_actual)
            te = self.compute_torque(id_val, iq_val, psi_actual)
            dwm = (te - load_torque - B * wm_val) / J
            return did, diq, dwm, te

        # k1
        k1_did, k1_diq, k1_dwm, te1 = state_derivatives(self.id, self.iq, self.omega_m)

        # k2
        id_k2 = self.id + 0.5 * dt * k1_did
        iq_k2 = self.iq + 0.5 * dt * k1_diq
        wm_k2 = self.omega_m + 0.5 * dt * k1_dwm
        k2_did, k2_diq, k2_dwm, _ = state_derivatives(id_k2, iq_k2, wm_k2)

        # k3
        id_k3 = self.id + 0.5 * dt * k2_did
        iq_k3 = self.iq + 0.5 * dt * k2_diq
        wm_k3 = self.omega_m + 0.5 * dt * k2_dwm
        k3_did, k3_diq, k3_dwm, _ = state_derivatives(id_k3, iq_k3, wm_k3)

        # k4
        id_k4 = self.id + dt * k3_did
        iq_k4 = self.iq + dt * k3_diq
        wm_k4 = self.omega_m + dt * k3_dwm
        k4_did, k4_diq, k4_dwm, _ = state_derivatives(id_k4, iq_k4, wm_k4)

        # State updates
        self.id += (dt / 6.0) * (k1_did + 2.0 * k2_did + 2.0 * k3_did + k4_did)
        self.iq += (dt / 6.0) * (k1_diq + 2.0 * k2_diq + 2.0 * k3_diq + k4_diq)
        self.omega_m += (dt / 6.0) * (k1_dwm + 2.0 * k2_dwm + 2.0 * k3_dwm + k4_dwm)
        self.theta_m = (self.theta_m + self.omega_m * dt) % (2.0 * np.pi)

        self.Te = self.compute_torque(self.id, self.iq, psi_actual)

        return {
            "id": float(self.id),
            "iq": float(self.iq),
            "vd": float(self.vd),
            "vq": float(self.vq),
            "omega_m": float(self.omega_m),
            "omega_e": float(self.omega_e),
            "speed_rpm": float(self.speed_rpm),
            "temperature_c": float(self.temperature),
            "actual_flux": float(psi_actual),
            "te_nm": float(self.Te),
            "load_nm": float(load_torque),
            "demag_ratio": float(self.demag_ratio),
        }
