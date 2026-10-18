# Placement & Technical Interview Preparation Guide

This document contains 35 in-depth, project-specific technical questions and answers designed for placement interviews in Electric Drives, PMSM Control, Power Electronics, and Embedded Firmware Engineering.

---

### Section 1: PMSM Physics & Mathematical Modeling

#### Q1: What is the fundamental difference between an SPMSM and an IPMSM in the rotor-synchronous $d$-$q$ reference frame?
**Answer**:
In a Surface-Mounted PMSM (SPMSM), the permanent magnets are glued directly onto the cylindrical rotor surface. Because the relative magnetic permeability of rare-earth magnets is very close to vacuum ($\mu_r \approx 1.05$), the effective magnetic air-gap is uniform around the circumference. Consequently, the direct and quadrature axis inductances are approximately equal ($L_d \approx L_q$).
In an Interior PMSM (IPMSM), the magnets are buried inside the rotor iron laminations. The path along the direct axis passes through the low-permeability magnet cavity, whereas the path along the quadrature axis passes through high-permeability iron ribs. This creates magnetic saliency where $L_q > L_d$. IPMSMs produce both magnetic alignment torque ($\frac{3}{2} p \psi_f i_q$) and reluctance torque ($\frac{3}{2} p (L_d - L_q) i_d i_q$), allowing negative $d$-axis current to boost total torque and extend high-speed operation via field weakening.

#### Q2: Explain the derivation of electromagnetic torque from the power balance equation.
**Answer**:
The total electrical input power to the 3-phase stator in the $d$-$q$ frame is:
$$P_e = \frac{3}{2} (v_d i_d + v_q i_q)$$
Substituting the stator voltage equations $v_d = R_s i_d + \frac{d\lambda_d}{dt} - \omega_e \lambda_q$ and $v_q = R_s i_q + \frac{d\lambda_q}{dt} + \omega_e \lambda_d$:
$$P_e = \frac{3}{2} R_s (i_d^2 + i_q^2) + \frac{3}{2} \left( i_d \frac{d\lambda_d}{dt} + i_q \frac{d\lambda_q}{dt} \right) + \frac{3}{2} \omega_e (\lambda_d i_q - \lambda_q i_d)$$
The first term represents stator ohmic copper losses. The second term represents the rate of change of magnetic stored energy in the inductances. The third term represents the electromechanical power transferred across the air gap:
$$P_{\mathrm{mech}} = T_e \omega_m = \frac{3}{2} \omega_e (\lambda_d i_q - \lambda_q i_d)$$
Since $\omega_e = p \omega_m$, dividing by $\omega_m$ yields:
$$T_e = \frac{3}{2} p (\lambda_d i_q - \lambda_q i_d)$$
Substituting the flux linkages $\lambda_d = L_d i_d + \psi_f$ and $\lambda_q = L_q i_q$:
$$T_e = \frac{3}{2} p \left[ \psi_f i_q + (L_d - L_q) i_d i_q \right]$$

#### Q3: Why is mechanical speed distinguished from electrical angular velocity, and how does pole-pair count impact estimation?
**Answer**:
Mechanical speed $\omega_m$ represents physical shaft rotation in radians per second: $\omega_m = \frac{2\pi n}{60}$. Electrical speed $\omega_e$ represents the rotational frequency of the stator magnetic flux vector: $\omega_e = p \omega_m$, where $p$ is the number of magnetic pole pairs.
In voltage-model flux estimation, back-EMF is induced by the rate of flux linkage variation with respect to time, which is directly proportional to electrical speed $\omega_e$:
$$e_q = \omega_e \psi_f = p \omega_m \psi_f$$
If an engineer confuses mechanical speed with electrical speed, the estimated flux will be erroneous by a factor of $p$ (e.g., for $p=4$, flux would be miscalculated by $400\%$).

#### Q4: Why can we not rely purely on motor speed or torque drops to diagnose magnet demagnetization under closed-loop FOC?
**Answer**:
Modern PMSMs are governed by closed-loop Field-Oriented Control with high-bandwidth PI speed and current controllers. When permanent magnet flux $\psi_f$ degrades by $10\%$, electromagnetic torque temporarily dips. The outer speed controller immediately detects the micro-drop in rotor speed and increases the quadrature current reference $i_q^*$ by $\approx 11\%$ to restore the requested mechanical torque ($T_e \approx \frac{3}{2} p \psi_f i_q$).
Because the motor continues rotating at the commanded speed and delivering the demanded load, external operators see no obvious operational failure. However, the machine now operates at higher stator current, leading to excessive ohmic heating ($I^2 R$), which accelerates thermal degradation. A dedicated flux estimator is essential to uncover this hidden defect.

#### Q5: What is the significance of the $d$-axis decoupling term in FOC?
**Answer**:
In the $d$-$q$ frame, cross-coupling terms exist between the axes due to rotor rotation: $-\omega_e L_q i_q$ in the $d$-axis and $+\omega_e L_d i_d$ in the $q$-axis. These speed-dependent terms cause control interaction between $i_d$ and $i_q$. To ensure independent linear control of flux and torque, feedforward decoupling voltages are added to the PI current controller outputs:
$$v_d^* = u_{d,\mathrm{PI}} - \omega_e L_q i_q, \quad v_q^* = u_{q,\mathrm{PI}} + \omega_e (L_d i_d + \psi_f)$$

#### Q6: How does the sign convention of $i_d$ affect the rotor magnetic operating point?
**Answer**:
In standard rotor-oriented FOC, positive $d$-axis current directs stator flux along the same axis as the permanent magnets, increasing total core flux density. Negative $d$-axis current opposes the permanent magnet flux. While negative $i_d$ is intentionally applied during field weakening to reduce terminal back-EMF and exceed rated base speed, excessive negative $i_d$ applies a strong demagnetizing field $H_d$ that risks driving magnet operating points below the irreversible knee.

---

### Section 2: Permanent Magnet Demagnetization Physics & Thermal Characteristics

#### Q7: Differentiate between reversible thermal flux loss and irreversible demagnetization.
**Answer**:
- **Reversible Loss**: Magnetization decreases with temperature because thermal vibrations disrupt the spontaneous magnetic domain alignment. For NdFeB, remanence $B_r$ decreases at $\approx -0.11\%/\text{K}$. When the magnet returns to reference temperature ($20^\circ\text{C}$), the domain alignment naturally restores and $B_r$ returns to $100\%$ without permanent damage.
- **Irreversible Demagnetization**: Occurs when elevated temperature combined with an opposing magnetic field drives the local operating point past the knee of the intrinsic demagnetization curve ($J$-$H$ curve). When the motor cools down, the operating point follows a lower recoil line, permanently losing a fraction of its flux linkage.

#### Q8: What is the Curie temperature and how does it relate to the maximum operating temperature ($T_{\max}$)?
**Answer**:
The Curie temperature $T_c$ is the absolute physical temperature where ferromagnetism vanishes entirely, and the material becomes paramagnetic ($T_c \approx 310\text{--}350^\circ\text{C}$ for NdFeB). However, practical PMSMs cannot operate anywhere near $T_c$. The maximum continuous operating temperature $T_{\max}$ (typically $120\text{--}150^\circ\text{C}$ for standard N-grade, up to $200^\circ\text{C}$ for SH/UH grades) is determined by the temperature at which the intrinsic coercivity $H_{cj}$ drops so low that normal stator armature reaction fields cause irreversible demagnetization.

#### Q9: What happens if temperature compensation is omitted in a flux degradation monitor?
**Answer**:
If temperature compensation is omitted, any normal temperature rise will be misinterpreted as demagnetization. For example, during rated continuous load, a motor's magnet temperature typically rises from $25^\circ\text{C}$ to $85^\circ\text{C}$ ($\Delta T = 60\,\text{K}$). With $\alpha_\psi = -0.0011/\text{K}$, the physical flux linkage drops by:
$$\Delta\psi = -0.0011 \times 60 = -6.6\%$$
If a static $-5.0\%$ demagnetization threshold is applied, the uncompensated system will falsely trip, generating a false positive alarm on a completely healthy motor.

#### Q10: Why is the linear thermal formula valid only over a calibrated operating range?
**Answer**:
The first-order equation $\psi(T) = \psi_{\mathrm{ref}} [1 + \alpha_\psi (T - T_{\mathrm{ref}})]$ assumes a constant slope $\alpha_\psi$. In reality, $B_r(T)$ and $H_{cj}(T)$ curves have higher-order nonlinear temperature dependencies, particularly near cryogenic temperatures ($< -40^\circ\text{C}$) where spin reorientation occurs, and near upper thermal limits ($> 150^\circ\text{C}$) where coercivity degrades rapidly. The linear model is an accurate engineering approximation only within the calibrated range ($-30^\circ\text{C}$ to $+140^\circ\text{C}$).

#### Q11: Can severe mechanical vibration cause permanent demagnetization?
**Answer**:
Yes. Sintered rare-earth magnets are brittle ceramics. Mechanical shock or severe continuous high-frequency vibration can cause micro-fractures in the crystalline structure, breaking domain boundaries and reducing effective bulk magnetic volume. Furthermore, structural magnet chipping alters the effective air-gap geometry.

---

### Section 3: Flux Estimation Algorithms & Mathematics

#### Q12: State the voltage-model flux estimator equation and explain every term.
**Answer**:
$$\hat{\psi}_f = \frac{v_q - R_s i_q - L_q \frac{di_q}{dt} - \omega_e L_d i_d}{\omega_e}$$
- $v_q$: $q$-axis terminal voltage commanded by the inverter.
- $R_s i_q$: Stator ohmic resistive voltage drop.
- $L_q \frac{di_q}{dt}$: Voltage induced across the quadrature inductance by current rate of change.
- $\omega_e L_d i_d$: Cross-coupling speed voltage caused by $d$-axis current.
- $\omega_e$: Rotor electrical frequency in rad/s, dividing the net induced back-EMF to yield flux linkage in Webers.

#### Q13: Why is division by near-zero speed catastrophic in voltage-model estimators?
**Answer**:
As speed approaches zero ($\omega_e \to 0$), the denominator goes to zero while the numerator (measured $v_q - R_s i_q$) is dominated by small sensor noise, ADC quantization, and inverter forward voltage drops. Any $10\,\text{mV}$ sensor offset divided by $\omega_e = 0.01\,\text{rad/s}$ produces an artificial flux error of $1.0\,\text{Wb}$—more than 10 times the actual motor flux! This makes the estimator numerically ill-conditioned without an enforced speed cutoff.

#### Q14: How does FluxGuard compute and utilize the $d$-axis voltage residual?
**Answer**:
The direct axis equation under healthy conditions is:
$$v_d = R_s i_d + L_d \frac{di_d}{dt} - \omega_e L_q i_q$$
Because permanent-magnet flux linkage does not appear in this equation for a standard rotor-aligned coordinate system, $v_d$ provides an independent reference. FluxGuard computes the discrepancy:
$$e_d = \left| v_d - \left( R_s i_d + L_d \frac{di_d}{dt} - \omega_e L_q i_q \right) \right|$$
If $e_d$ is large while $q$-axis flux drops, the error is caused by current-sensor bias, incorrect $R_s$, or inaccurate inductance parameters rather than genuine demagnetization.

#### Q15: How are derivative terms $\frac{di_q}{dt}$ handled in embedded digital implementations without noise amplification?
**Answer**:
A discrete numerical difference $\frac{i_q[k] - i_q[k-1]}{\Delta t}$ acts as a high-pass filter that severely amplifies ADC quantization noise and current ripple. FluxGuard solves this by passing the raw derivative through an exponential smoothing filter:
$$\left(\frac{di_q}{dt}\right)_{\mathrm{filtered}}[k] = (1 - \alpha_d) \left(\frac{di_q}{dt}\right)_{\mathrm{filtered}}[k-1] + \alpha_d \frac{i_q[k] - i_q[k-1]}{\Delta t}$$
where $\alpha_d = \frac{\Delta t}{\tau_d + \Delta t}$, cutting off high-frequency noise while tracking dynamic current steps.

#### Q16: Compare voltage-model observers with Extended Kalman Filters (EKF) for flux estimation.
**Answer**:
- **Voltage Model**: Computationally lightweight ($< 50$ floating-point operations), deterministic execution time, easy to calibrate, and highly reliable at medium-to-high speeds. However, it fails at very low speeds and depends on accurate $R_s$.
- **Extended Kalman Filter (EKF)**: Capable of estimating both states ($i_d, i_q, \omega$) and parameters ($\psi_f, R_s$) simultaneously while handling stochastic measurement and process noise. However, EKF requires matrix inversion and covariance propagation ($O(n^3)$ operations), demands extensive tuning of $Q$ and $R$ covariance matrices, and can suffer from divergence if observability is lost.

#### Q17: What is the impact of stator resistance variation on the flux estimate?
**Answer**:
From $\hat{\psi}_f = \frac{v_q - R_s i_q}{\omega_e}$, the sensitivity of estimated flux to resistance error $\Delta R_s$ is:
$$\frac{\partial \hat{\psi}_f}{\partial R_s} = -\frac{i_q}{\omega_e}$$
This demonstrates that resistance errors have the greatest impact at high torque (large $i_q$) and low speed (small $\omega_e$). At rated speed and light load, the resistive drop is negligible compared to back-EMF, making the flux estimate highly robust against resistance mismatch.

---

### Section 4: Temperature Compensation & Diagnostic State Machine

#### Q18: Define the normalized flux residual $r_\psi$ and explain its physical interpretation.
**Answer**:
$$r_\psi = \frac{\hat{\psi}_f - \psi_{\mathrm{healthy}}(T)}{\psi_{\mathrm{healthy}}(T)} \times 100\%$$
- $r_\psi \approx 0\%$: Motor is operating with nominal magnet strength at the current temperature.
- $-3.5\% < r_\psi < 0\%$: Normal tolerance band accounting for manufacturing variations and sensor noise.
- $r_\psi \le -5.0\%$: Statistically significant flux deficit beyond reversible thermal variance, indicating potential permanent demagnetization.

#### Q19: Explain the role of hysteresis in the diagnostic state machine.
**Answer**:
Without hysteresis, if a noisy residual fluctuates around the $-5.0\%$ fault threshold (e.g. between $-4.9\%$ and $-5.1\%$), the diagnostic output would repeatedly chatter between `NORMAL` and `SUSPECTED_FLUX_DEGRADATION`.
FluxGuard implements a hysteresis band:
- **Fault Entry**: Residual must drop below $-5.0\%$.
- **Recovery Exit**: Residual must rise above $-2.8\%$.
This $2.2\%$ deadband ensures clean, stable diagnostic transitions.

#### Q20: Why is a persistence debounce timer required before asserting `SUSPECTED_FLUX_DEGRADATION`?
**Answer**:
Dynamic maneuvers—such as rapid speed acceleration ramps, sudden shock load application, or inverter bus voltage ripple—can create short-lived transient estimation spikes where $r_\psi$ briefly dips below $-5.0\%$ for $50\text{--}200\,\text{ms}$.
By enforcing a $1.5\text{-second}$ persistence requirement ($30$ consecutive samples at $20\,\text{Hz}$), FluxGuard verifies that the flux deficit is static and permanent before alarming operators. During the debounce period, the state is held in `UNCERTAIN`.

#### Q21: List the 6 diagnostic states of FluxGuard and explain when each is active.
**Answer**:
1. **`INITIALIZING`**: Active during the first 30 samples after startup while digital filters and rolling averages settle.
2. **`NORMAL`**: Residual is within healthy bounds ($r_\psi > -3.5\%$) and data quality checks pass.
3. **`SUSPECTED_FLUX_DEGRADATION`**: Residual persists below $-5.0\%$ for $> 1.5\,\text{seconds}$.
4. **`UNCERTAIN`**: Residual is in the warning band ($-5.0\% < r_\psi \le -3.5\%$), or persistence is pending, or signal uncertainty is elevated.
5. **`INSUFFICIENT_DATA`**: Speed is below $43\,\text{RPM}$ ($|\omega_e| < 18\,\text{rad/s}$), where back-EMF cannot be reliably observed.
6. **`SENSOR_FAULT`**: Sensor reading out of physical range (NaN/Inf, $T > 165^\circ\text{C}$), or excessive $d$-axis residual voltage error ($e_d > 12\,\text{V}$).

---

### Section 5: Embedded Firmware & Microcontroller Design

#### Q22: Why is the STM32G4 microcontroller specifically suited for this project?
**Answer**:
The STM32G474 features an ARM Cortex-M4 with hardware FPU and DSP instructions, running at $170\,\text{MHz}$. It integrates specialized hardware for real-time motor diagnostics:
1. **CORDIC Co-processor**: Executes hardware sine/cosine and vector rotations for Clarke and Park transforms in $< 20$ cycles without CPU load.
2. **Fast Dual ADCs**: $4\,\text{MSPS}$ conversion speed synchronized with PWM center-aligned counter for noise-free current sampling.
3. **Internal Programmable Gain Amplifiers (PGAs)**: Directly amplifies low-side shunt voltages, eliminating external op-amp ICs.
4. **Autonomous DMA**: Transfers ADC conversion results and UART telemetry buffers in the background without CPU cycle intervention.

#### Q23: Why must real-time embedded tasks avoid blocking delays (`HAL_Delay`)?
**Answer**:
Blocking delays pause CPU instruction execution inside a busy-wait loop. In a motor control and diagnostic system:
- SysTick and critical state machines will stall.
- The Independent Watchdog (IWDG) timer will not be refreshed, triggering an unintended reset.
- Telemetry streams will back up, dropping critical fault records.
All tasks in FluxGuard use non-blocking timestamp comparisons: `if (now - last_tick >= INTERVAL)`.

#### Q24: How does CRC-16-CCITT guarantee telemetry packet integrity?
**Answer**:
Serial UART links in high-power inverter environments are exposed to severe electromagnetic interference (EMI) from $10\text{--}20\,\text{kHz}$ $dv/dt$ switching spikes ($> 5\,\text{kV}/\mu\text{s}$). Electrical noise can easily flip bits in serial buffers.
The CRC-16-CCITT polynomial ($x^{16} + x^{12} + x^5 + 1$) computes a mathematical 16-bit remainder over the entire payload string. The parser independently re-computes this CRC; if a single character or comma is corrupted, the CRC mismatches, and the packet is discarded before corrupting the database or dashboard.

#### Q25: What is the purpose of power-on zero-current ADC calibration?
**Answer**:
Current sensing circuits use shunt resistors, op-amps, and biasing resistors. Component manufacturing tolerances and temperature cause op-amp input offset voltages, shifting the nominal zero-current ADC output away from ideal mid-scale ($2048$ counts at $1.65\,\text{V}$).
At power-up, before the inverter PWM outputs are enabled, FluxGuard averages $128$ consecutive samples to record the true quiescent ADC count (`offset_ia`, `offset_ib`). Subtracting this offset during run-time eliminates DC current measurement bias.

#### Q26: How does FluxGuard maintain platform-independence between embedded target and desktop test harness?
**Answer**:
The mathematical estimator (`flux_estimator.c`), diagnostic state machine (`diagnostic_state_machine.c`), and packet serializer (`telemetry_packet.c`) are written in standard ANSI C99 with zero hardware header dependencies (`stm32g4xx.h` is not included in core files).
Hardware interactions (ADC DMA buffers, hardware timers) are abstracted behind `stm32g4_hal_stubs.h`. On a desktop PC, `stm32g4_hal_stubs.c` compiles with host software mocks, allowing unit tests to run on MSVC/GCC.

---

### Section 6: Sensor Signal Conditioning & Measurement Errors

#### Q27: How does a current sensor offset error manifest in the estimated flux?
**Answer**:
A DC offset $\Delta i_a$ on phase current $i_a$ transforms through the Park transform into fundamental-frequency oscillations in $i_d$ and $i_q$ at electrical frequency $\omega_e$:
$$i_{q,\mathrm{meas}} = i_q + \Delta I \cos(\omega_e t + \phi)$$
When substituted into $\hat{\psi}_f = \frac{v_q - R_s i_q}{\omega_e}$, the estimated flux will exhibit an oscillatory ripple at frequency $\omega_e$. FluxGuard's low-pass digital filter ($f_c = 15\,\text{Hz}$) attenuates these ripples at medium and high speeds, while the $d$-axis residual monitor detects the DC offset.

#### Q28: How does PWM dead-time distort the terminal voltage command $v_q$?
**Answer**:
To prevent bridge shoot-through, a dead-time $t_d$ (typically $1.0\text{--}1.5\,\mu\text{s}$) is inserted between complementary upper and lower MOSFET switching signals. During dead-time, both switches are OFF, and phase current freewheels through anti-parallel diodes. The terminal voltage is clamped to the DC bus or ground depending on current sign:
$$\Delta V = \frac{t_d}{T_{\mathrm{pwm}}} V_{\mathrm{bus}} \cdot \mathrm{sgn}(i_{\mathrm{phase}})$$
This voltage distortion shifts the true average phase voltage from the commanded controller voltage $v_q^*$, introducing an offset in back-EMF estimation unless dead-time compensation is applied.

#### Q29: What is the consequence of a temperature sensor bias error ($+15^\circ\text{C}$)?
**Answer**:
If the temperature sensor reports $40^\circ\text{C}$ when the magnet is actually at $25^\circ\text{C}$ (a $+15\,\text{K}$ positive bias), the healthy reference model will calculate an artificially lower expected flux:
$$\psi_{\mathrm{healthy}}(40^\circ\text{C}) = 0.085 \times [1 + (-0.0011 \times 20)] = 0.0831\,\text{Wb}$$
Since the physical magnet is still at $25^\circ\text{C}$, the estimator will observe $0.0845\,\text{Wb}$. The residual will be positive ($+1.6\%$), masking mild demagnetization. Conversely, a negative temperature sensor bias creates false degradation alerts.

#### Q30: How does quadrature encoder quantization error affect the estimated speed $\omega_e$?
**Answer**:
A 1024-line encoder provides 4096 quadrature edge transitions per revolution. At $1\,\text{kHz}$ sampling rate ($\Delta t = 1\,\text{ms}$), a speed measurement change of 1 edge per period corresponds to:
$$\Delta n = \frac{1 \text{ pulse}}{4096 \text{ pulses/rev}} \times \frac{1}{0.001 \text{ s}} \times 60 = 14.65\,\text{RPM}$$
Quantization noise creates speed jitter. At 4 pole pairs, this translates to $\Delta \omega_e = 6.14\,\text{rad/s}$ jitter. FluxGuard applies speed filtering to smooth encoder frequency estimation before flux division.

---

### Section 7: Testing, Verification & Diagnostic Boundaries

#### Q31: How do you verify that your flux estimator works correctly across different operating speeds?
**Answer**:
By running held-out constant-speed scenarios ($500$, $1500$, and $2500\,\text{RPM}$) under rated torque in unit tests (`test_estimator_and_diagnostics.py` and `test_firmware_core.c`). At all valid speeds above cutoff, the estimated flux linkage converges to the nominal model value ($0.085\,\text{Wb} \pm 2\%$), and the uncertainty metric remains below $0.25$.

#### Q32: What held-out test scenario proves that temperature compensation prevents false alarms?
**Answer**:
The `reversible_temperature_variation` scenario. In this test, the motor is heated from $25^\circ\text{C}$ to $105^\circ\text{C}$ and cooled back to $40^\circ\text{C}$ with zero permanent demagnetization.
While the physical flux drops by $> 8\%$ purely due to thermal remanence reduction, the temperature compensator dynamically shifts $\psi_{\mathrm{healthy}}(T)$. The normalized residual $r_\psi$ stays within $[-1.2\%, +0.8\%]$, and the state machine remains strictly `NORMAL`, demonstrating zero false alarms.

#### Q33: Why is machine learning kept as a secondary experimental tool rather than the primary diagnostic system?
**Answer**:
Deep neural networks and black-box classifiers lack deterministic guarantees, are vulnerable to out-of-distribution operating conditions, and cannot be mathematically verified for industrial safety certification.
A physics-based voltage observer derives directly from Maxwell's and Kirchhoff's laws. Its failure boundaries (e.g. low speed, voltage saturation) are mathematically well-defined and predictable. The secondary Random Forest classifier serves solely as an auxiliary pattern recognizer, with the physics engine retaining final diagnostic authority.

#### Q34: What independent laboratory tests are needed to confirm demagnetization experimentally?
**Answer**:
1. **Open-Circuit Back-EMF Test**: Couple the unpowered test motor to a prime mover at rated speed in a temperature-controlled chamber. Measure line-to-line RMS voltage:
   $$\psi_f = \frac{V_{\mathrm{LL,rms}} \cdot \sqrt{2}}{\sqrt{3} \cdot \omega_e}$$
2. **Search Coil / Hall Sensor Array**: Measure air-gap radial flux density waveforms directly using rotor search coils.
3. **Locked-Rotor Fluxmeter Integration**: Disassemble the rotor and measure total open-circuit magnetic dipole moment using a Helmholtz coil and fluxmeter.

#### Q35: If given another 6 months on this project, what improvements would you implement?
**Answer**:
1. **Lumped-Parameter Thermal Network (LPTN)**: Implement a 4-node thermal observer (rotor magnet, rotor iron, stator winding, stator casing) to account for rotor-stator thermal lag.
2. **High-Frequency Signal Injection (HFI)**: Add a rotating or pulsating high-frequency voltage carrier to track rotor magnetic saturation and estimate flux at standstill ($0\,\text{RPM}$).
3. **Dead-Time & Inverter Drop Voltage Compensation Table**: Program a hardware voltage error look-up table indexed by phase current polarity and magnitude to improve back-EMF voltage precision.
