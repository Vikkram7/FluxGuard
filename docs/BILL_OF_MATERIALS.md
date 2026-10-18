# Bill of Materials (BOM) & Hardware Specifications

This document outlines the complete hardware bill of materials required to replicate the physical test bench for the **FluxGuard PMSM** project.

## 1. Electronics & Microcontroller Hardware

| Item | Component / Part Number | Description / Specs | Qty | Unit Est. ($) | Purpose |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | **NUCLEO-G474RE** | STM32G474RE MCU, $170\,\text{MHz}$ Cortex-M4, CORDIC, FMAC, 5x ADCs | 1 | $24.00 | Real-time diagnostic processing |
| **2** | **X-NUCLEO-IHM08M1** | 3-phase BLDC/PMSM inverter expansion board, $10\text{--}48\,\text{V}$, $15\text{A}$ | 1 | $42.00 | Power stage & gate drivers |
| **3** | **ADuM1201ARZ** | Dual-channel $2.5\,\text{kV}$ digital isolator IC (SOIC-8) | 2 | $3.50 | Galvanic isolation for UART |
| **4** | **WS2812B / LED Bank** | High-visibility status LEDs (Green, Amber, Red) | 1 | $2.00 | Physical diagnostic state indicator |
| **5** | **FT232RL USB-UART** | FTDI Isolated USB to Serial Breakout ($3.3\,\text{V}$ Logic) | 1 | $14.00 | Host telemetry link |

---

## 2. Motor & Mechanical Test Bench Hardware

| Item | Component / Part Number | Description / Specs | Qty | Unit Est. ($) | Purpose |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **6** | **Nanotec DB42M03** | 3-Phase Surface-Mounted PMSM, $24\text{--}48\,\text{V}$, $3000\,\text{RPM}$, $0.35\,\text{Nm}$ ($p=4$) | 1 | $95.00 | Device Under Test (DUT) |
| **7** | **Magnetic Particle Brake** | Placid Industries B24, $0\text{--}2.5\,\text{Nm}$ controllable torque | 1 | $180.00 | Mechanical load generation |
| **8** | **HEDS-5540#A06** | 3-Channel Optical Incremental Encoder, 1024 CPR ($4096$ counts X4) | 1 | $48.00 | Rotor speed & angle acquisition |
| **9** | **B57861S0103F040** | TDK / EPCOS $10\,\text{k}\Omega$ NTC Thermistor, $1\%$ tolerance, $B = 3950\,\text{K}$ | 2 | $2.50 | Temperature measurement |
| **10**| **Flexible Jaw Coupling** | Oldham aluminum flexible shaft coupling ($6\,\text{mm}$ to $8\,\text{mm}$) | 1 | $15.00 | Shaft alignment & damping |
| **11**| **Polycarbonate Guard** | $4\,\text{mm}$ clear Lexan safety shield with aluminum mounting brackets | 1 | $35.00 | Rotating shaft safety barrier |

---

## 3. Instrumentation & Auxiliary Hardware

| Item | Component / Part Number | Description / Specs | Qty | Unit Est. ($) | Purpose |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **12**| **DC Bench Power Supply** | $0\text{--}60\,\text{V}$, $0\text{--}10\,\text{A}$ CC/CV current-limited bench supply | 1 | $160.00 | Low-voltage safe power input |
| **13**| **Emergency Stop Button** | $40\,\text{mm}$ mushroom latching NC contacts with safety enclosure | 1 | $18.00 | Hard-wired physical E-Stop |
| **14**| **Precision Current Clamp**| Hantek CC-65 AC/DC oscilloscope current probe | 1 | $65.00 | Independent signal validation |
| **15**| **Thermocouple Calibrator**| Type-K calibrated digital thermometer probe | 1 | $28.00 | NTC temperature calibration |

---

## 4. Total Budget Summary
- **Electronic Components & MCU**: ~$89.00
- **Motor, Brake & Sensors**: ~$375.00
- **Test Bench & Safety Fixtures**: ~$278.00
- **Estimated Total Hardware Budget**: **~$742.00 USD**
