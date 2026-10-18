%% FluxGuard PMSM - Motor Parameters and Calibration Profile
% All parameters are specified in strict SI units.

function params = pmsm_parameters()
    % Electrical Parameters
    params.p = 4;                       % Pole pairs [-]
    params.Rs = 0.45;                   % Stator phase resistance [Ohm]
    params.Ld = 0.0035;                 % d-axis inductance [H]
    params.Lq = 0.0035;                 % q-axis inductance [H]
    params.psi_f_ref = 0.0850;          % Nominal PM flux linkage at T_ref [Wb]
    
    % Thermal Parameters
    params.T_ref = 20.0;                % Reference temperature [deg C]
    params.alpha_psi = -0.0011;         % Reversible thermal coefficient [1/K] (NdFeB)
    
    % Mechanical Parameters
    params.J = 0.0018;                  % Combined rotor and load inertia [kg*m^2]
    params.B = 0.00035;                 % Viscous friction coefficient [N*m*s/rad]
    
    % Operating Limits
    params.V_max = 160.0;               % Peak phase voltage limit [V]
    params.I_max = 25.0;                % Peak phase current limit [A]
    params.rated_speed_rpm = 3000.0;    % Rated speed [RPM]
    params.rated_torque_nm = 4.5;       % Rated continuous torque [N*m]
    
    % Diagnostic Thresholds
    params.warn_threshold_pct = -3.5;   % Early warning threshold [%]
    params.fault_threshold_pct = -5.0;  % Demagnetization entry threshold [%]
    params.recovery_threshold_pct = -2.8; % Recovery hysteresis exit threshold [%]
    params.persistence_time_s = 1.5;    % Debounce persistence duration [s]
    params.min_omega_e = 18.0;          % Observability electrical speed cutoff [rad/s]
end
