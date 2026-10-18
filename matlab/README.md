# FluxGuard PMSM — MATLAB & Simulink Model Deliverables

This directory contains the numerical simulation scripts and Simulink model specifications for the **FluxGuard PMSM** project.

## Directory Files
- `pmsm_parameters.m`: Central motor and diagnostic parameter definitions with physical SI units.
- `pmsm_dynamics.m`: Continuous differential equations for PMSM electrical ($i_d, i_q$) and mechanical ($\omega_m$) dynamics.
- `simulate_pmsm_scenarios.m`: Numerical simulation script running RK4 integration across thermal ramps and synthetic demagnetization steps.
- `build_simulink_model.m`: Programmatic script for constructing a Simulink block diagram.

## Physical Model Equations

### 1. Electrical Rotor-Oriented dq-Equations
$$\begin{aligned}
v_d &= R_s i_d + L_d \frac{di_d}{dt} - \omega_e L_q i_q \\
v_q &= R_s i_q + L_q \frac{di_q}{dt} + \omega_e (L_d i_d + \psi_f)
\end{aligned}$$

### 2. Electromagnetic Torque & Mechanical Dynamics
$$\begin{aligned}
T_e &= \frac{3}{2} p \left[ \psi_f i_q + (L_d - L_q) i_d i_q \right] \\
J \frac{d\omega_m}{dt} &= T_e - T_L - B \omega_m
\end{aligned}$$

### 3. Temperature-Dependent Healthy Reference Flux
$$\psi_{\mathrm{healthy}}(T) = \psi_{\mathrm{ref}} \left[ 1 + \alpha_\psi (T - T_{\mathrm{ref}}) \right]$$

### 4. Normalized Residual Calculation
$$r_\psi = \frac{\hat{\psi}_f - \psi_{\mathrm{healthy}}(T)}{\psi_{\mathrm{healthy}}(T)} \times 100\%$$

## How to Run in MATLAB
1. Launch MATLAB (R2020b or later recommended, verified compatible with R2025b).
2. Set the current directory to `matlab/`.
3. Run the simulation script:
   ```matlab
   simulate_pmsm_scenarios
   ```
4. A four-pane figure will open displaying:
   - Mechanical speed tracking (1500 RPM).
   - Rotor temperature rise from 25°C to 75°C.
   - Actual vs Healthy vs Estimated permanent magnet flux linkage (mWb).
   - Normalized residual tracking, demonstrating that thermal variation maintains residual near 0%, while a 10% demagnetization step triggers the -5.0% threshold cleanly.
