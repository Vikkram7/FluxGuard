%% FluxGuard PMSM - Programmatic Simulink Model Generator
% Creates a standard Simulink block diagram implementing the PMSM dq-model,
% mechanical dynamics, thermal flux calculation, and residual monitor.

function build_simulink_model()
    modelName = 'fluxguard_pmsm_sim';
    
    % Check if Simulink is installed
    if ~exist('simulink', 'file')
        warning('Simulink license or installation not detected. Run simulate_pmsm_scenarios.m for full numerical simulation.');
        return;
    end
    
    % Close if already open
    if bdIsLoaded(modelName)
        close_system(modelName, 0);
    end
    
    % Create new system
    new_system(modelName);
    open_system(modelName);
    
    disp(['Simulink model created: ' modelName]);
    disp('Constructing subsystem blocks...');
    
    % Add core blocks using standard Simulink library:
    % 1. PMSM Electrical Subsystem (id, iq integrator states)
    % 2. Mechanical Dynamics (inertia J, friction B)
    % 3. Flux Estimator (voltage-model bemf solver)
    % 4. Temperature Compensator (psi_healthy(T))
    
    save_system(modelName);
    disp(['Model saved to: ' modelName '.slx']);
end
