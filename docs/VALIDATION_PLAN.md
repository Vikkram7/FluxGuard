# Verification & Validation Plan

## 1. Test Matrix Overview
The verification plan validates all mathematical models, estimator stability bounds, temperature compensation accuracy, diagnostic state transitions, embedded C algorithms, and backend services.

| Test Category | Target Subsystem | Metric / Criteria | Result |
| :--- | :--- | :--- | :--- |
| **Physics Model Units** | Python & MATLAB ODE | Mechanical vs electrical speed ($p=4$), Torque equation | **PASSED** |
| **Steady-State Flux** | Python / C Estimators | Flux converges to $0.085\,\text{Wb} \pm 2\%$ across $500\text{--}2500\,\text{RPM}$ | **PASSED** |
| **Observability Cutoff** | Python / C Estimators | Marks `EST_SPEED_TOO_LOW` when $|\omega_e| < 18\,\text{rad/s}$ | **PASSED** |
| **Thermal Compensation** | Compensator & Model | Sweeping $20^\circ\text{C} \to 85^\circ\text{C}$ maintains residual $< 1.5\%$ & state `NORMAL` | **PASSED** |
| **Baseline vs Enhanced** | Comparative Test | Naive uncompensated estimator triggers $> 15$ false alarms; FluxGuard triggers $0$ | **PASSED** |
| **Demagnetization Step** | State Machine | $-10\%$ permanent loss triggers `SUSPECTED_FLUX_DEGRADATION` after $1.5\,\text{s}$ debounce | **PASSED** |
| **Sensor Fault Injection**| Quality Monitor | $+0.75\,\text{A}$ offset creates high $d$-axis error $\to$ transitions to `SENSOR_FAULT` | **PASSED** |
| **Packet Integrity** | C Telemetry & CRC | CRC-16-CCITT correctly accepts valid frames and drops corrupted frames | **PASSED** |
| **C/C++ Host Suite** | Embedded C Core | 19 unit tests executed on MSVC compiler | **19/19 PASSED** |
| **Backend Integration** | Java 21 Spring Boot | MockMvc REST endpoints, H2 persistence, config protection | **5/5 PASSED** |
| **Frontend Production** | React / Vite / TS | Production build creates optimized bundle without errors | **PASSED** |

---

## 2. Reversible Thermal Compensation Validation
The critical engineering requirement is preventing false demagnetization alarms during legitimate high-temperature operation:
- **Experiment**: Thermal sweep from $20^\circ\text{C}$ to $85^\circ\text{C}$ at rated speed ($1500\,\text{RPM}$) and load ($2.5\,\text{N}\cdot\text{m}$).
- **Physical Flux**: Decreases from $0.0850\,\text{Wb}$ to $0.0789\,\text{Wb}$ (a $-7.15\%$ drop) solely due to reversible NdFeB temperature coefficient ($\alpha_\psi = -0.0011/\text{K}$).
- **Naive Baseline Estimator**: Compares estimated flux directly against room-temperature nominal ($0.085\,\text{Wb}$). Because the drop exceeds $-5.0\%$, the naive system triggers a severe false demagnetization alarm.
- **FluxGuard PMSM**: Evaluates residual against $\psi_{\mathrm{healthy}}(T)$. The normalized residual remains within $[-0.8\%, +0.5\%]$, keeping the state in `NORMAL` throughout the entire thermal ramp.

---

## 3. Detection Latency & Sensitivity
Under synthetic controlled demagnetization steps:
- **$-5\%$ Demagnetization**: Detected within $1.52\,\text{seconds}$ (governed by configured persistence duration).
- **$-10\%$ Demagnetization**: Detected within $1.50\,\text{seconds}$.
- **$-15\%$ Demagnetization**: Detected within $1.50\,\text{seconds}$.
- **Transient Steps**: Short-duration load steps ($< 0.5\,\text{s}$) temporarily drive residual into `UNCERTAIN` without triggering a false alarm.
