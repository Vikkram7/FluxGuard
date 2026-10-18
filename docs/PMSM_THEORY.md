# PMSM Mathematical Modeling & Demagnetization Physics

## 1. Rotor-Oriented Reference Frame (Park Transformation)
The dynamic modeling of a Permanent-Magnet Synchronous Motor (PMSM) is formulated in the rotor-synchronous reference frame ($d$-$q$ axis), where:
- The $d$-axis is aligned with the magnetic axis of the rotor permanent magnets.
- The $q$-axis leads the $d$-axis by 90 electrical degrees in the direction of rotation.

### 1.1 Voltage Equations
$$\begin{aligned}
v_d &= R_s i_d + L_d \frac{di_d}{dt} - \omega_e L_q i_q \\
v_q &= R_s i_q + L_q \frac{di_q}{dt} + \omega_e (L_d i_d + \psi_f)
\end{aligned}$$

Where:
- $v_d, v_q$: Stator voltages in the $d$-$q$ frame [$\text{V}$]
- $i_d, i_q$: Stator currents in the $d$-$q$ frame [$\text{A}$]
- $R_s$: Stator phase resistance [$\Omega$]
- $L_d, L_q$: Direct and quadrature axis inductances [$\text{H}$]
- $\omega_e$: Rotor electrical angular velocity [$\text{rad/s}$]
- $\psi_f$: Effective permanent-magnet flux linkage [$\text{Wb}$ or $\text{V}\cdot\text{s}$]

### 1.2 Speed Relations
Mechanical angular velocity $\omega_m$ and electrical angular velocity $\omega_e$ are related by the pole-pair number $p$:
$$\omega_m = \frac{2\pi n}{60}, \quad \omega_e = p \omega_m$$
Where $n$ is rotor speed in revolutions per minute ($\text{RPM}$).

### 1.3 Torque and Mechanical Dynamics
The total electromagnetic torque $T_e$ consists of alignment torque and reluctance torque:
$$T_e = \frac{3}{2} p \left[ \psi_f i_q + (L_d - L_q) i_d i_q \right]$$
For a Surface-Mounted PMSM (SPMSM), $L_d \approx L_q$, so reluctance torque is zero and:
$$T_e = \frac{3}{2} p \psi_f i_q$$
The mechanical motion equation is governed by rotor inertia $J$, viscous damping $B$, and mechanical load torque $T_L$:
$$J \frac{d\omega_m}{dt} = T_e - T_L - B \omega_m$$

---

## 2. Permanent-Magnet Thermal Physics
Permanent magnets undergo both **reversible** and **irreversible** changes in magnetic properties under thermal and magnetic stress.

### 2.1 Reversible Thermal Variation
For rare-earth sintered Neodymium-Iron-Boron ($\text{NdFeB}$) magnets, remanent flux density $B_r$ decreases linearly with increasing temperature across normal operating bounds ($-40^\circ\text{C}$ to $+140^\circ\text{C}$):
$$B_r(T) = B_{r0} \left[ 1 + \alpha_{Br} (T - T_{\mathrm{ref}}) \right]$$
where $\alpha_{Br} \approx -0.11\%/\text{K} = -0.0011/\text{K}$.
Consequently, the healthy open-circuit flux linkage is:
$$\psi_{\mathrm{healthy}}(T) = \psi_{\mathrm{ref}} \left[ 1 + \alpha_\psi (T - T_{\mathrm{ref}}) \right]$$
When the magnet cools down, this flux is 100% recovered without physical degradation.

### 2.2 Irreversible Demagnetization Mechanism
Irreversible loss occurs when the magnetic operating point dips below the "knee" of the intrinsic demagnetization curve ($B$-$H$ or $J$-$H$ curve):
1. **Thermal Demagnetization**: Operating beyond the maximum continuous rating (e.g. $T > 150^\circ\text{C}$ for N38H grade) lowers the coercivity $H_{cj}$ until normal stator fields push the operating point into irreversible recoil loops.
2. **Armature Reaction Demagnetization**: Severe negative $d$-axis current transient (e.g. inverter short-circuit fault or field-weakening over-current) applies a demagnetizing field $H_d$:
   $$H_d = \frac{N_s i_d}{l_m}$$
   If $H_d$ exceeds the intrinsic coercivity $H_{cj}(T)$, permanent degradation takes place.

---

## 3. Transformations Summary
- **Clarke Transform (3-phase to $\alpha$-$\beta$ stationary frame)**:
  $$i_\alpha = i_a, \quad i_\beta = \frac{1}{\sqrt{3}}(i_a + 2 i_b)$$
- **Park Transform ($\alpha$-$\beta$ to $d$-$q$ rotating frame)**:
  $$\begin{aligned}
  i_d &= i_\alpha \cos(\theta_e) + i_\beta \sin(\theta_e) \\
  i_q &= -i_\alpha \sin(\theta_e) + i_\beta \cos(\theta_e)
  \end{aligned}$$
  where $\theta_e = \int \omega_e dt$ is the electrical rotor position.
