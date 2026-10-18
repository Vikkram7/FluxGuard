# FluxGuard PMSM — Project Overview

## 1. Executive Summary
**FluxGuard PMSM** is an embedded, physics-based diagnostic and health-monitoring system designed for Permanent-Magnet Synchronous Motors (PMSMs). Its primary mission is to distinguish genuine permanent-magnet flux degradation (demagnetization) from reversible temperature-dependent flux variations, measurement noise, sensor offsets, and transient dynamic maneuvers.

Traditional condition monitoring systems either rely on generic motor vibration thresholds or simple heuristic thresholds on phase current amplitude. Such approaches fail to identify early-stage flux degradation because:
1. Field-Oriented Control (FOC) speed loops automatically compensate for reduced rotor flux by increasing stator quadrature current ($i_q$), masking the underlying magnetic defect until severe overcurrent or thermal runaway occurs.
2. Permanent magnet materials (e.g. NdFeB, SmCo, Ferrite) exhibit a pronounced reversible reduction in remanent magnetic flux density ($B_r$) with increasing temperature ($\alpha_\psi \approx -0.11\%/\text{K}$ for NdFeB). Without rigorous temperature compensation, normal operating thermal excursions trigger false demagnetization alarms.
3. Voltage-model back-EMF flux estimation degrades severely at low rotor speeds ($|\omega_e| < 18\,\text{rad/s}$) due to inverter dead-time distortion, resistance variation, and division-by-near-zero numerical instability.

FluxGuard PMSM addresses these challenges with an integrated hardware-software architecture spanning an STM32G4-class embedded microcontroller, a high-throughput Java 21 Spring Boot telemetry backend, and a real-time React/TypeScript engineering dashboard.

---

## 2. System Architecture

```mermaid
graph TD
    subgraph "Motor Test Bench & Inverter"
        PMSM[PMSM 3-Phase Motor]
        Inverter[3-Phase Inverter & Shunt Resistors]
        Enc[Quadrature Optical Encoder]
        NTC[Magnet / Stator NTC Thermistor]
    end

    subgraph "STM32G4 Microcontroller Firmware"
        ADC_DMA[ADC1/2 Dual DMA Engine]
        TIM_ENC[TIM2 Encoder Counter]
        ClarkePark[Clarke & Park Transforms]
        FluxEst[Physics-Based Flux Estimator]
        HealthRef[Healthy Thermal Reference Model]
        DiagSM[Diagnostic State Machine & Debounce]
        UART_TX[USART DMA Telemetry Streamer]
    end

    subgraph "Backend Services (Java 21 Spring Boot)"
        Ingest[Telemetry Ingestion Endpoint]
        WS_Broadcaster[WebSocket / SSE Broadcaster]
        DB[(H2 / PostgreSQL DB)]
        SimEngine[Synthetic Scenario Runner]
    end

    subgraph "Industrial Engineering Dashboard (React)"
        Overview[System Overview & Status]
        LiveCharts[Live Telemetry & Residuals]
        DiagView[Diagnostic Analysis & Evidence]
        ConfigUI[Motor Calibration & Thresholds]
        BenchUI[Scenario Injection Controls]
    end

    PMSM --> Inverter
    Inverter --> ADC_DMA
    Enc --> TIM_ENC
    NTC --> ADC_DMA

    ADC_DMA --> ClarkePark
    TIM_ENC --> FluxEst
    ClarkePark --> FluxEst
    FluxEst --> DiagSM
    HealthRef --> DiagSM
    DiagSM --> UART_TX

    UART_TX -->|ASCII CSV + CRC16| Ingest
    SimEngine --> Ingest
    Ingest --> DB
    Ingest --> WS_Broadcaster
    WS_Broadcaster --> Overview
    WS_Broadcaster --> LiveCharts
    WS_Broadcaster --> DiagView
```

---

## 3. Core Contributions
1. **Physics-Based Voltage-Model Estimator**:
   Implements continuous back-EMF integration in the rotor reference frame ($d$-$q$):
   $$\hat{\psi}_f = \frac{v_q - R_s i_q - L_q \frac{di_q}{dt} - \omega_e L_d i_d}{\omega_e}$$
2. **Reversible Thermal Compensation**:
   Accounts for temperature changes before calculating degradation residuals:
   $$\psi_{\mathrm{healthy}}(T) = \psi_{\mathrm{ref}} \left[1 + \alpha_\psi (T - T_{\mathrm{ref}})\right]$$
3. **Normalized Residual Metric ($r_\psi$)**:
   Evaluates deviations against the calibrated healthy model:
   $$r_\psi = \frac{\hat{\psi}_f - \psi_{\mathrm{healthy}}(T)}{\psi_{\mathrm{healthy}}(T)} \times 100\%$$
4. **Hysteresis and Debounce State Machine**:
   Prevents false alarms during rapid speed or torque transients by enforcing a 1.5-second persistence window and a 2.2% hysteresis recovery band.
5. **Observability Boundary & Data Quality Monitor**:
   Detects low-speed operation, current sensor offsets, and voltage saturation, marking data as `INSUFFICIENT_DATA` or `UNCERTAIN` rather than incorrectly reporting demagnetization.
