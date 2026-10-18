# Embedded Firmware Architecture

## 1. Modular Layer Separation
FluxGuard PMSM employs strict modularity to separate target-specific hardware drivers from platform-independent mathematical and diagnostic logic. This allows identical diagnostic algorithms to compile and run on both the embedded STM32 target and the desktop host test harness.

```
firmware/
├── Configuration/
│   └── motor_config.h             # Motor parameters, limits, and diagnostic thresholds
├── Drivers/
│   ├── stm32g4_hal_stubs.h        # Hardware interface declarations (ADC, TIM, UART, IWDG)
│   └── stm32g4_hal_stubs.c        # Hardware implementation (STM32 HAL / Host mocks)
├── Sensors/
│   ├── sensor_manager.h           # ADC calibration, Clarke/Park transforms, encoder reading
│   └── sensor_manager.c
├── Estimator/
│   ├── flux_estimator.h           # Voltage-model flux estimator, filter, uncertainty
│   └── flux_estimator.c
├── Diagnostics/
│   ├── diagnostic_state_machine.h # State transitions, persistence debounce, reason codes
│   └── diagnostic_state_machine.c
├── Communication/
│   ├── telemetry_packet.h         # Packet formatting, CRC-16-CCITT calculation, parser
│   └── telemetry_packet.c
├── Core/
│   └── main.c                    # Multi-rate task scheduler and main loop
└── Tests/
    └── test_firmware_core.c       # Host-side unit test harness
```

---

## 2. Multi-Rate Real-Time Task Execution
To ensure control stability and avoid timing jitter, firmware execution is organized into prioritized fixed-rate intervals:

| Task Name | Rate | Trigger | Functionality |
| :--- | :--- | :--- | :--- |
| **Current Sampling** | $10\,\text{kHz}$ | ADC DMA End-of-Conversion | Read 3-phase currents, apply offset correction, update Clarke-Park transform |
| **Speed & Position** | $1\,\text{kHz}$ | SysTick / Timer interrupt | Read TIM2 encoder counter, calculate electrical frequency $\omega_e$ |
| **Flux Estimator** | $100\,\text{Hz}$ | Systick Counter ($10\,\text{ms}$) | Execute voltage-model observer, low-pass filter, calculate $d$-axis residual |
| **Diagnostic Engine**| $100\,\text{Hz}$ | Follows Estimator | Compute $\psi_{\mathrm{healthy}}(T)$, normalized residual $r_\psi$, evaluate hysteresis & persistence |
| **Telemetry Dispatch**| $20\,\text{Hz}$ | Systick Counter ($50\,\text{ms}$) | Format `$FLUX` telemetry frame, compute CRC-16, launch non-blocking UART DMA |
| **Watchdog Refresh** | Background | Main Loop | Reload Independent Watchdog (IWDG) counter |

---

## 3. Communication Packet Protocol
Telemetry frames are transmitted over UART at 115,200 baud (or optional CAN at 500 kbps) using a structured ASCII CSV protocol with CRC-16-CCITT verification:

### Frame Format:
```text
$FLUX,<timestamp_ms>,<speed_rpm>,<temp_c>,<id_a>,<iq_a>,<vd_v>,<vq_v>,<psi_hat>,<residual_pct>,<state>*<CRC16>\r\n
```

### Example Valid Packet:
```text
$FLUX,12540,1500.00,42.50,-0.150,4.250,-12.40,85.30,0.08410,-1.05,NORMAL*A4E2
```

### CRC-16 Verification:
- **Polynomial**: `0x1021` ($x^{16} + x^{12} + x^5 + 1$)
- **Initial Value**: `0xFFFF`
- Any packet with mismatched field count, non-numeric values, or invalid CRC is dropped immediately and increments an error counter.
