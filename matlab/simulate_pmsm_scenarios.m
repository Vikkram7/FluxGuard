%% FluxGuard PMSM - Scenario Simulation & Comparison Script
% Simulates healthy thermal variation, synthetic demagnetization,
% runs voltage-model flux estimation, and evaluates temperature compensation.

clear; clc; close all;

params = pmsm_parameters();

%% Simulation Settings
dt = 0.001;               % 1 ms fixed integration step
t_end = 10.0;             % 10 seconds duration
t = (0:dt:t_end)';
N = length(t);

%% Allocate Arrays
id = zeros(N, 1);
iq = zeros(N, 1);
omega_m = zeros(N, 1);
speed_rpm = zeros(N, 1);
temp_c = zeros(N, 1);
demag_ratio = zeros(N, 1);
vd = zeros(N, 1);
vq = zeros(N, 1);
actual_flux = zeros(N, 1);
estimated_flux = zeros(N, 1);
healthy_ref_flux = zeros(N, 1);
norm_residual_pct = zeros(N, 1);

%% Scenario Definition: Thermal Sweep + 10% Demag Step at t = 5.0s
for k = 1:N
    tk = t(k);
    
    % Temperature profile: warms up from 25 C to 75 C
    if tk < 5.0
        temp_c(k) = 25.0 + (75.0 - 25.0) * (tk / 5.0);
    else
        temp_c(k) = 75.0;
    end
    
    % Synthetic irreversible demagnetization: 10% lost after t = 5.0s
    if tk >= 5.0
        demag_ratio(k) = 0.10;
    else
        demag_ratio(k) = 0.0;
    end
end

%% Run Discrete Simulation Loop with FOC Voltage Feedforward
target_rpm = 1500.0;
target_omega_m = target_rpm * 2 * pi / 60.0;
TL = 2.0; % 2.0 Nm load torque

x = [0.0; 0.0; target_omega_m]; % State: [id; iq; omega_m]

for k = 1:N
    omega_e = params.p * x(3);
    speed_rpm(k) = x(3) * 60.0 / (2 * pi);
    
    % Physical magnet flux
    th_factor = max(0.2, 1.0 + params.alpha_psi * (temp_c(k) - params.T_ref));
    psi_act = params.psi_f_ref * th_factor * (1.0 - demag_ratio(k));
    actual_flux(k) = psi_act;
    
    % Required iq for load torque: Te = 1.5 * p * psi * iq
    iq_ref = TL / (1.5 * params.p * psi_act);
    id_ref = 0.0;
    
    % FOC voltage outputs with decoupling
    vd(k) = -omega_e * params.Lq * iq_ref;
    vq(k) = params.Rs * iq_ref + omega_e * psi_act;
    
    % Integrate PMSM dynamics using RK4
    k1 = pmsm_dynamics(t(k), x, vd(k), vq(k), TL, temp_c(k), demag_ratio(k), params);
    k2 = pmsm_dynamics(t(k) + 0.5*dt, x + 0.5*dt*k1, vd(k), vq(k), TL, temp_c(k), demag_ratio(k), params);
    k3 = pmsm_dynamics(t(k) + 0.5*dt, x + 0.5*dt*k2, vd(k), vq(k), TL, temp_c(k), demag_ratio(k), params);
    k4 = pmsm_dynamics(t(k) + dt, x + dt*k3, vd(k), vq(k), TL, temp_c(k), demag_ratio(k), params);
    
    x = x + (dt / 6.0) * (k1 + 2*k2 + 2*k3 + k4);
    
    id(k) = x(1);
    iq(k) = x(2);
    omega_m(k) = x(3);
    
    % --- FLUX ESTIMATION ENGINE ---
    % eq = vq - Rs*iq - omega_e*Ld*id
    % psi_hat = eq / omega_e
    eq = vq(k) - params.Rs * iq(k) - omega_e * params.Ld * id(k);
    if abs(omega_e) >= params.min_omega_e
        estimated_flux(k) = eq / omega_e;
    else
        estimated_flux(k) = params.psi_f_ref;
    end
    
    % --- HEALTHY REFERENCE MODEL ---
    % psi_healthy(T) = psi_ref * [1 + alpha_psi * (T - T_ref)]
    psi_healthy = params.psi_f_ref * (1.0 + params.alpha_psi * (temp_c(k) - params.T_ref));
    healthy_ref_flux(k) = psi_healthy;
    
    % --- TEMPERATURE-COMPENSATED RESIDUAL ---
    % r_psi = (psi_hat - psi_healthy) / psi_healthy * 100%
    norm_residual_pct(k) = ((estimated_flux(k) - psi_healthy) / psi_healthy) * 100.0;
end

%% Plot Results
figure('Name', 'FluxGuard PMSM Diagnostic Validation', 'Color', 'w', 'Position', [100, 100, 900, 750]);

subplot(4, 1, 1);
plot(t, speed_rpm, 'b', 'LineWidth', 1.8);
grid on; ylabel('Speed [RPM]');
title('FluxGuard PMSM: Thermal Ramp (t<5s) & 10% Demagnetization Step (t \ge 5s)', 'FontWeight', 'bold');

subplot(4, 1, 2);
plot(t, temp_c, 'Color', [0.85, 0.33, 0.1], 'LineWidth', 1.8);
grid on; ylabel('Temp [^\circC]');

subplot(4, 1, 3);
plot(t, actual_flux * 1000, 'k', 'LineWidth', 2.0); hold on;
plot(t, healthy_ref_flux * 1000, 'g--', 'LineWidth', 1.8);
plot(t, estimated_flux * 1000, 'c', 'LineWidth', 1.5);
grid on; ylabel('Flux [mWb]');
legend('Actual Physical Flux', 'Healthy Ref \psi_{healthy}(T)', 'Estimated \psi_{hat}', 'Location', 'SouthWest');

subplot(4, 1, 4);
plot(t, norm_residual_pct, 'b', 'LineWidth', 2.0); hold on;
yline(params.fault_threshold_pct, 'r--', 'Fault Threshold (-5%)', 'LineWidth', 1.8);
yline(params.warn_threshold_pct, 'm--', 'Warn Threshold (-3.5%)', 'LineWidth', 1.5);
grid on; ylabel('Residual [%]');
xlabel('Time [seconds]');
ylim([-15, 5]);

disp('FluxGuard PMSM Simulation Completed Successfully.');
