# FluxGuard PMSM — Embedded Permanent-Magnet Flux Degradation Monitoring System

[![Java 21](https://img.shields.io/badge/Java-21%20LTS-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-yellow.svg)](https://www.python.org/)
[![STM32G4](https://img.shields.io/badge/Embedded-STM32G4%20C%2FC%2B%2B-red.svg)](https://www.st.com/)
[![MATLAB](https://img.shields.io/badge/MATLAB-R2025b-red.svg)](https://www.mathworks.com/)

**FluxGuard PMSM** is a comprehensive, final-year engineering project investigating whether permanent-magnet flux linkage ($\psi_f$) in a Permanent-Magnet Synchronous Motor (PMSM) is degrading under changing speed, load, and temperature conditions.

Rather than relying on generic vibration heuristics or black-box predictive maintenance, FluxGuard implements a **physics-based voltage-model flux observer** coupled with **calibrated temperature compensation**, **hysteresis debounce logic**, and **uncertainty quantification**.

---

## 1. System Architecture

```mermaid
graph TD
    subgraph "Motor Drive & Sensors"
        Motor[PMSM 3-Phase Machine]
        Inverter[48V Inverter & Current Shunts]
        Encoder[Optical Encoder 1024 CPR]
        NTC[Magnet / Stator NTC Thermistor]
    end

    subgraph "STM32G4 Firmware Core (C/C++)"
        HAL[Hardware Abstraction Layer]
        Sensors[Sensor Manager & ADC Offset Cal]
        Estimator[Flux Estimator Engine: psi_hat = e_q / omega_e]
        HealthModel[Healthy Thermal Model: psi_ref * (1 + alpha*(T - T_ref))]
        Diagnostics[Diagnostic State Machine & Persistence Debounce]
        Telemetry[UART Telemetry: ASCII CSV + CRC-16]
    end

    subgraph "Backend Services (Java 21 Spring Boot)"
        REST[REST API: /api/assets, /api/configuration]
        SimService[Synthetic Scenario Runner]
        WS[WebSocket /ws/telemetry & SSE /api/telemetry/stream]
        JPA[(H2 / PostgreSQL DB)]
    end

    subgraph "Industrial Frontend (React + Vite + TypeScript)"
        OverviewUI[System Overview & Live Metric Cards]
        TelemetryUI[Live Telemetry Charts: Flux, Residuals, Currents]
        DiagUI[Diagnostic Analysis & Confounding Factors]
        ConfigUI[Calibration & Threshold Editor]
        BenchUI[Interactive Test Bench & Fault Injection]
        ReportUI[Experiment Reports & CSV/JSON Export]
    end

    Motor --> Inverter
    Inverter --> HAL
    Encoder --> HAL
    NTC --> HAL

    HAL --> Sensors
    Sensors --> Estimator
    Estimator --> Diagnostics
    HealthModel --> Diagnostics
    Diagnostics --> Telemetry

    Telemetry --> REST
    SimService --> REST
    REST --> JPA
    REST --> WS
    WS --> OverviewUI
    WS --> TelemetryUI
    WS --> DiagUI
```

---

## 2. Key Engineering Features
1. **Rotor-Oriented Voltage Model Estimator**:
   $$\hat{\psi}_f = \frac{v_q - R_s i_q - L_q \frac{di_q}{dt} - \omega_e L_d i_d}{\omega_e}$$
2. **Reversible Temperature Compensation**:
   Accounts for NdFeB thermal coefficient ($\alpha_\psi \approx -0.11\%/\text{K}$), preventing false demagnetization alarms when the motor operates hot:
   $$\psi_{\mathrm{healthy}}(T) = \psi_{\mathrm{ref}} \left[1 + \alpha_\psi (T - T_{\mathrm{ref}})\right]$$
3. **Normalized Residual Metric**:
   $$r_\psi = \frac{\hat{\psi}_f - \psi_{\mathrm{healthy}}(T)}{\psi_{\mathrm{healthy}}(T)} \times 100\%$$
4. **Hysteresis & Persistence State Machine**:
   - States: `INITIALIZING`, `NORMAL`, `SUSPECTED_FLUX_DEGRADATION`, `UNCERTAIN`, `INSUFFICIENT_DATA`, `SENSOR_FAULT`.
   - Requires $1.5\,\text{seconds}$ persistence below $-5.0\%$ to confirm degradation; recovers only above $-2.8\%$.
5. **Low-Speed Observability Protection**:
   Rejects division-by-near-zero instability by flagging `INSUFFICIENT_DATA` when $|\omega_e| < 18\,\text{rad/s}$ ($\approx 43\,\text{RPM}$).

---

## 3. Project Directory Structure
```
FluxGuard-PMSM/
├── frontend/             # React 18, TypeScript, Vite, Tailwind, Chart.js
├── backend/              # Java 21, Spring Boot 3.3.4, JPA, WebSocket, H2/Postgres
├── firmware/             # STM32G4 C/C++ firmware, platform-independent core & host tests
├── simulation/           # Python 3 PMSM dynamic model, estimator, ML classifier
├── matlab/               # MATLAB/Simulink dq models, ODE simulator, scenario scripts
├── datasets/             # Master dataset (14,000 samples), 12 scenario CSVs, plots
├── docs/                 # 11 comprehensive engineering documentation files
├── scripts/              # Dataset generator and telemetry replay utilities
├── tests/                # Automated Python pytest test suite
├── docker-compose.yml    # Multi-container orchestration (Backend + Frontend + Postgres)
├── .env.example          # Sample environment variables
└── README.md
```

---

## 4. Quick Start & Execution Guide

### 4.1 Python Reference Model & Dataset Generation
```bash
# Run unit tests
python -m pytest tests/simulation/ -v

# Generate 12 test scenarios, master dataset, ML evaluation, and engineering plots
python scripts/generate_datasets.py
```

### 4.2 C/C++ Embedded Firmware Host Test Suite
```bash
# Build and run the platform-independent C test harness with MSVC or CMake
cd firmware
cmake -B build
cmake --build build --config Release
.\build\test_firmware_core.exe
```

### 4.3 Java Spring Boot Backend
```bash
cd backend
# Run backend unit and integration tests
mvn test

# Start the Spring Boot application on port 8080
mvn spring-boot:run
```
- Swagger API Docs: `http://localhost:8080/swagger-ui.html`
- H2 Database Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:fluxguard_db`, User: `sa`)

### 4.4 React Engineering Dashboard
```bash
cd frontend
# Install dependencies and build production bundle
npm install
npm run build

# Start local development server on port 3000
npm run dev
```
Open your browser to `http://localhost:3000`.

### 4.5 MATLAB / Simulink Simulation
```matlab
% In MATLAB command window:
cd('matlab');
simulate_pmsm_scenarios;
```

---

## 5. Measured Test & Verification Results

| Subsystem / Test | Description | Result |
| :--- | :--- | :--- |
| **Python Physics Tests** | Speed conversions ($\text{RPM} \to \text{rad/s}$), $p=4$, torque equations, thermal flux equations | **PASSED** (9/9 tests) |
| **Python Thermal Sweep** | Thermal sweep $20^\circ\text{C} \to 85^\circ\text{C}$ maintains $0$ false alarms with compensation vs $>15$ on baseline | **PASSED** |
| **C/C++ Host Firmware** | Telemetry packet formatting, CRC-16-CCITT, flux estimator, state machine persistence | **PASSED** (19/19 tests) |
| **Java Backend Suite** | Spring Boot MockMvc REST API, H2 persistence, configuration protection, telemetry ingestion | **PASSED** (5/5 tests) |
| **Frontend Production Build** | TypeScript strict verification, Vite chunk bundling, responsive CSS | **PASSED** (0 errors) |
| **MATLAB Numerical Engine** | RK4 ODE simulation, thermal ramp, and demagnetization step | **PASSED** (`MATLAB_RUN_SUCCESS`) |

---

## 6. Comprehensive Engineering Documentation Index
For thorough technical reviews, examine the detailed documents in [`docs/`](./docs/):
1. [Project Overview](./docs/PROJECT_OVERVIEW.md)
2. [PMSM Mathematical Theory & Demagnetization Physics](./docs/PMSM_THEORY.md)
3. [Flux Estimator Design & State Machine Logic](./docs/ESTIMATOR_DESIGN.md)
4. [Hardware Design & Microcontroller Interface](./docs/HARDWARE_DESIGN.md)
5. [Firmware Architecture & Task Scheduling](./docs/FIRMWARE_ARCHITECTURE.md)
6. [Backend REST API & Streaming Specification](./docs/BACKEND_API.md)
7. [Verification & Validation Plan](./docs/VALIDATION_PLAN.md)
8. [Known Limitations & Theoretical Boundaries](./docs/KNOWN_LIMITATIONS.md)
9. [Safety Protocols & Test Bench Guidelines](./docs/SAFETY.md)
10. [Placement & Technical Interview Preparation (35 Q&As)](./docs/INTERVIEW_PREPARATION.md)
11. [Hardware Bill of Materials (BOM)](./docs/BILL_OF_MATERIALS.md)
