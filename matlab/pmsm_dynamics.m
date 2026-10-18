%% FluxGuard PMSM - Continuous Dynamic State Equations
% State vector: x = [i_d; i_q; omega_m]

function dxdt = pmsm_dynamics(t, x, vd, vq, TL, temp_c, demag_ratio, params)
    id = x(1);
    iq = x(2);
    omega_m = x(3);
    
    % Electrical speed
    omega_e = params.p * omega_m;
    
    % Reversible and irreversible flux calculation:
    % psi_f(T) = psi_f_ref * [1 + alpha_psi * (T - T_ref)] * (1 - demag_ratio)
    thermal_factor = 1.0 + params.alpha_psi * (temp_c - params.T_ref);
    thermal_factor = max(0.2, thermal_factor);
    actual_flux = params.psi_f_ref * thermal_factor * (1.0 - demag_ratio);
    
    % Electrical differential equations:
    % di_d/dt = (v_d - Rs*i_d + omega_e*Lq*i_q) / Ld
    % di_q/dt = (v_q - Rs*i_q - omega_e*(Ld*i_d + psi_f)) / Lq
    did_dt = (vd - params.Rs * id + omega_e * params.Lq * iq) / params.Ld;
    diq_dt = (vq - params.Rs * iq - omega_e * (params.Ld * id + actual_flux)) / params.Lq;
    
    % Electromagnetic Torque:
    % Te = 1.5 * p * [psi_f * i_q + (Ld - Lq) * i_d * i_q]
    Te = 1.5 * params.p * (actual_flux * iq + (params.Ld - params.Lq) * id * iq);
    
    % Mechanical equation:
    % J * d_omega_m/dt = Te - TL - B * omega_m
    domega_m_dt = (Te - TL - params.B * omega_m) / params.J;
    
    dxdt = [did_dt; diq_dt; domega_m_dt];
end
