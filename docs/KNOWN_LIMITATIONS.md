# Known Limitations & Theoretical Boundaries

## 1. Low-Speed Observability Singularity
The voltage-model flux observer computes permanent-magnet flux as:
$$\hat{\psi}_f = \frac{v_q - R_s i_q - L_q \frac{di_q}{dt} - \omega_e L_d i_d}{\omega_e}$$
At standstill or low speeds ($|\omega_e| \to 0$):
- Back-EMF drops to millivolts and becomes submerged in measurement noise and resistive voltage drops ($R_s i_q$).
- Division by small speed values causes numerical instability and extreme noise amplification.
- **Bound**: FluxGuard intentionally rejects estimates and marks `INSUFFICIENT_DATA` when $|\omega_e| < 18\,\text{rad/s}$ ($\approx 43\,\text{RPM}$ for a 4-pole-pair motor). High-frequency signal injection (HFI) or pulsating vector methods would be required for zero-speed rotor flux estimation.

---

## 2. Stator Resistance Thermal Drift
Copper winding resistance has a positive temperature coefficient of $+0.393\%/\text{K}$:
$$R_s(T) = R_{s0} \left[ 1 + 0.00393 (T_{\mathrm{copper}} - 20) \right]$$
A $60\,\text{K}$ rise in winding temperature increases $R_s$ by $\approx 23.6\%$. At high quadrature current ($i_q = 10\,\text{A}$), unmodeled $R_s$ increases cause an unmodeled resistive voltage drop of $\approx 1.06\,\text{V}$, creating an artificial negative bias in estimated back-EMF.
- **Mitigation in FluxGuard**: The residual uncertainty metric penalizes operating points with high current-to-speed ratios ($i_q / \omega_e$), classifying borderline residuals as `UNCERTAIN` until steady thermal equilibrium or lower torque is attained.

---

## 3. Rotor Magnet Temperature Lag
In standard enclosed motors, the temperature sensor is affixed to the stator slot or outer end-winding, **not** directly on the rotating rotor magnets.
- Under fast dynamic acceleration or severe duty cycles, rotor eddy-current heating can lead or lag the casing temperature sensor by several minutes due to the air-gap thermal resistance.
- **Mitigation**: Future revisions can incorporate a lumped-parameter thermal network (LPTN) observer to estimate rotor temperature dynamically from stator iron and casing measurements.

---

## 4. Inverter Nonlinearities & Dead-Time
- Pulse-Width Modulation (PWM) inverter dead-time ($t_d \approx 1\text{--}2\,\mu\text{s}$) causes voltage distortion that subtracts or adds voltage depending on phase current direction.
- Inverter power semiconductor forward drops ($V_{ce,\mathrm{sat}}$ and $V_{f,\mathrm{diode}}$) introduce non-ideal offsets between controller command voltages ($v_d^*, v_q^*$) and true phase voltages applied to the machine.

---

## 5. Software Simulation vs Physical Validation
- The controlled $-5\%$, $-10\%$, and $-15\%$ demagnetization steps implemented in the simulation package are **synthetic test vectors** intended for algorithm benchmarking and false-alarm characterization.
- Genuine irreversible demagnetization in physical motors often exhibits localized spatial non-uniformity (partial pole demagnetization), generating characteristic sideband harmonics in phase current spectra ($f_s \pm \frac{k}{p} f_r$) rather than a purely uniform decrease in average fundamental flux linkage.
