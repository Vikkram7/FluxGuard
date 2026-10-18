# Safety Protocols & Operational Guidelines

## 1. Prototype Classification
The FluxGuard PMSM system is an **engineering research demonstrator and diagnostic monitor**, designed for laboratory motor test benches. It is **not** an automotive ISO 26262 ASIL-D safety system or an industrial SIL-3 safety interlock.

---

## 2. Electrical Safety Precautions

### 2.1 Low-Voltage Test Bench Development
- **Initial Prototyping**: Always start motor drive testing with a current-limited, low-voltage DC power supply ($24\text{--}48\,\text{V DC}$, current limit set to $\le 5\,\text{A}$).
- **Never Connect Directly to Mains**: Under no circumstances should microcontroller development boards (STM32 Nucleo/Discovery) be connected directly to AC mains voltage ($120\,\text{V} / 230\,\text{V AC}$) or unisolated high-voltage DC links ($300\text{--}400\,\text{V DC}$).
- **Galvanic Isolation**: Always utilize optically or magnetically isolated USB-UART adapters (e.g., ADuM1201 or Si8621) between the microcontroller and the host PC to prevent lethal ground loop currents.

### 2.2 Capacitive Energy Discharge
- High-voltage inverter DC links contain bulk electrolytic or film capacitor banks that store dangerous electrical energy even after power disconnection.
- Allow adequate discharge time ($> 5\,\text{minutes}$) and measure the DC bus terminal voltage with a calibrated multimeter before touching any busbars or inverter terminals.

---

## 3. Mechanical Safety & Test Bench Integrity

### 3.1 Rotating Shaft & Coupling Enclosure
- High-speed motor shafts ($3000\,\text{RPM}$) present severe entanglement hazards.
- All couplings connecting the test PMSM to the load dynamometer must be fully enclosed with polycarbonate or sheet-metal protective guards.

### 3.2 Physical Emergency Stop (E-Stop)
- A hard-wired, normally-closed (NC) red mushroom Emergency Stop button must be wired directly to the main DC contactor or inverter gate-driver enable line (Safe Torque Off - STO).
- **Never rely exclusively on software stop buttons** in web browsers or serial commands to halt rotating equipment during an emergency.

---

## 4. Thermal & Machine Protection
- **No Intentional Overheating**: Do not intentionally over-heat or over-current a physical motor to force destructive demagnetization. High stator temperatures ($> 180^\circ\text{C}$) will degrade winding insulation, potentially causing catastrophic phase-to-phase short circuits.
- **Controlled Software Injection**: Validate fault diagnostic algorithms using synthetic software injections, calibrated parameter offsets, or pre-characterized reference motor specimens.
- **Diagnostic Software Authority**: FluxGuard PMSM is strictly a passive diagnostic observer. It does not automatically inject hostile speed or current commands into the inverter control loops.
