/**
 * @file diagnostic_state_machine.c
 * @brief FluxGuard PMSM - C Embedded Diagnostic State Machine & Residual Monitor Implementation
 */

#include "diagnostic_state_machine.h"
#include <math.h>

void DiagnosticEngine_Init(DiagnosticEngine_t *engine,
                           const MotorParameters_t *motor_params,
                           const DiagnosticThresholds_t *thresholds) {
    if (!engine) return;

    if (motor_params) {
        engine->motor_params = *motor_params;
    } else {
        engine->motor_params = MotorConfig_GetDefaults();
    }

    if (thresholds) {
        engine->thresholds = *thresholds;
    } else {
        engine->thresholds = DiagnosticConfig_GetDefaults();
    }

    DiagnosticEngine_Reset(engine);
}

void DiagnosticEngine_Reset(DiagnosticEngine_t *engine) {
    if (!engine) return;
    engine->current_state = STATE_INITIALIZING;
    engine->sample_count = 0;
    engine->consecutive_fault_samples = 0;
    engine->consecutive_recovery_samples = 0;
    engine->smoothed_residual_pct = 0.0f;
    engine->residual_initialized = false;
}

DiagnosticResult_t DiagnosticEngine_ProcessSample(DiagnosticEngine_t *engine,
                                                 const EstimatorOutput_t *est_out,
                                                 float speed_rpm,
                                                 float temp_c) {
    DiagnosticResult_t res;
    res.state = STATE_INITIALIZING;
    res.psi_hat_wb = est_out ? est_out->psi_hat_wb : 0.0f;
    res.psi_healthy_wb = engine->motor_params.psi_f_ref_wb;
    res.raw_residual_wb = 0.0f;
    res.norm_residual_pct = 0.0f;
    res.smoothed_residual_pct = 0.0f;
    res.confidence_pct = 30.0f;
    res.uncertainty = est_out ? est_out->uncertainty : 1.0f;
    res.reason_code = "INITIALIZING";
    res.fault_code = 0;
    res.is_valid_operating_point = false;

    if (!engine || !est_out) return res;

    engine->sample_count++;

    /* 1. Calculate temperature-compensated healthy reference flux:
     * psi_healthy(T) = psi_ref * [1 + alpha_psi * (T - T_ref)]
     */
    float delta_t = temp_c - engine->motor_params.t_ref_c;
    float thermal_factor = 1.0f + engine->motor_params.alpha_psi_per_k * delta_t;
    if (thermal_factor < 0.2f) thermal_factor = 0.2f; /* Physical safety clamp */

    float psi_healthy = engine->motor_params.psi_f_ref_wb * thermal_factor;
    res.psi_healthy_wb = psi_healthy;

    /* 2. Compute residuals */
    float raw_res = est_out->psi_hat_wb - psi_healthy;
    float norm_res_pct = (raw_res / psi_healthy) * 100.0f;
    res.raw_residual_wb = raw_res;
    res.norm_residual_pct = norm_res_pct;

    /* Exponential moving average */
    if (!engine->residual_initialized) {
        engine->smoothed_residual_pct = norm_res_pct;
        engine->residual_initialized = true;
    } else {
        float alpha_ema = 0.08f;
        engine->smoothed_residual_pct += alpha_ema * (norm_res_pct - engine->smoothed_residual_pct);
    }
    res.smoothed_residual_pct = engine->smoothed_residual_pct;

    /* 3. Sensor / Operating envelope validation */
    bool quality_good = true;
    const char *quality_reason = "QUALITY_GOOD";

    if (fabsf(speed_rpm) < engine->motor_params.min_speed_rpm) {
        quality_good = false;
        quality_reason = "SPEED_BELOW_OPERATING_MINIMUM";
        res.state = STATE_INSUFFICIENT_DATA;
        res.fault_code = 0x1001;
    } else if (temp_c < engine->thresholds.min_temp_c || temp_c > engine->thresholds.max_temp_c) {
        quality_good = false;
        quality_reason = "TEMPERATURE_OUT_OF_RANGE";
        res.state = STATE_SENSOR_FAULT;
        res.fault_code = 0x2001;
    } else if (est_out->d_axis_residual_v > engine->thresholds.max_d_voltage_error_v) {
        quality_good = false;
        quality_reason = "EXCESSIVE_D_AXIS_VOLTAGE_ERROR";
        res.state = STATE_SENSOR_FAULT;
        res.fault_code = 0x2002;
    } else if (est_out->uncertainty > engine->thresholds.max_uncertainty) {
        quality_good = false;
        quality_reason = "MEASUREMENT_UNCERTAINTY_EXCESSIVE";
        res.state = STATE_UNCERTAIN;
        res.fault_code = 0x3001;
    } else if (!est_out->is_valid) {
        quality_good = false;
        quality_reason = FluxEstimator_StatusToString(est_out->status);
        if (est_out->status == EST_SPEED_TOO_LOW) {
            res.state = STATE_INSUFFICIENT_DATA;
            res.fault_code = 0x1002;
        } else {
            res.state = STATE_UNCERTAIN;
            res.fault_code = 0x3002;
        }
    }

    res.is_valid_operating_point = quality_good;

    /* 4. State Machine logic */
    uint32_t persistence_samples = (uint32_t)(engine->thresholds.persistence_time_s / engine->thresholds.dt_sample_s);
    if (persistence_samples < 1) persistence_samples = 1;

    uint32_t recovery_samples = (uint32_t)(engine->thresholds.recovery_time_s / engine->thresholds.dt_sample_s);
    if (recovery_samples < 1) recovery_samples = 1;

    if (engine->sample_count < 30) {
        engine->current_state = STATE_INITIALIZING;
        res.state = STATE_INITIALIZING;
        res.reason_code = "WARMUP_FILTER_INITIALIZATION";
        res.confidence_pct = 40.0f;
    } else if (!quality_good) {
        engine->current_state = res.state;
        res.reason_code = quality_reason;
        res.confidence_pct = 75.0f;
        if (engine->consecutive_fault_samples > 0) {
            engine->consecutive_fault_samples--;
        }
    } else {
        /* Quality is verified: Evaluate flux degradation */
        float smoothed = engine->smoothed_residual_pct;

        if (smoothed <= engine->thresholds.fault_threshold_pct) {
            engine->consecutive_fault_samples++;
            engine->consecutive_recovery_samples = 0;

            if (engine->consecutive_fault_samples >= persistence_samples) {
                engine->current_state = STATE_SUSPECTED_FLUX_DEGRADATION;
                res.reason_code = "PERSISTENT_FLUX_DEFICIT_CONFIRMED";
                res.confidence_pct = 88.0f;
                res.fault_code = 0x5001;
            } else {
                engine->current_state = STATE_UNCERTAIN;
                res.reason_code = "DEGRADATION_PERSISTENCE_PENDING";
                res.confidence_pct = 55.0f;
                res.fault_code = 0x3003;
            }
        } else if (smoothed >= engine->thresholds.recovery_threshold_pct) {
            engine->consecutive_recovery_samples++;
            engine->consecutive_fault_samples = 0;

            if (engine->current_state == STATE_SUSPECTED_FLUX_DEGRADATION) {
                if (engine->consecutive_recovery_samples >= recovery_samples) {
                    engine->current_state = STATE_NORMAL;
                    res.reason_code = "RECOVERED_TO_HEALTHY_BAND";
                    res.confidence_pct = 90.0f;
                } else {
                    res.reason_code = "RECOVERY_HYSTERESIS_ACTIVE";
                    res.confidence_pct = 70.0f;
                }
            } else {
                engine->current_state = STATE_NORMAL;
                res.reason_code = "FLUX_LINKAGE_NOMINAL";
                res.confidence_pct = 92.0f;
            }
        } else {
            /* Inside hysteresis band */
            if (engine->current_state == STATE_SUSPECTED_FLUX_DEGRADATION) {
                res.reason_code = "PERSISTENT_FAULT_IN_HYSTERESIS_ZONE";
                res.confidence_pct = 75.0f;
            } else if (smoothed <= engine->thresholds.warn_threshold_pct) {
                engine->current_state = STATE_UNCERTAIN;
                res.reason_code = "MILD_FLUX_DEVIATION_ALERT";
                res.confidence_pct = 60.0f;
            } else {
                engine->current_state = STATE_NORMAL;
                res.reason_code = "NORMAL_TOLERANCE_BAND";
                res.confidence_pct = 85.0f;
            }
        }
        res.state = engine->current_state;
    }

    return res;
}

const char* DiagnosticState_ToString(DiagnosticState_t state) {
    switch (state) {
        case STATE_INITIALIZING: return "INITIALIZING";
        case STATE_NORMAL: return "NORMAL";
        case STATE_SUSPECTED_FLUX_DEGRADATION: return "SUSPECTED_FLUX_DEGRADATION";
        case STATE_UNCERTAIN: return "UNCERTAIN";
        case STATE_INSUFFICIENT_DATA: return "INSUFFICIENT_DATA";
        case STATE_SENSOR_FAULT: return "SENSOR_FAULT";
        default: return "UNKNOWN";
    }
}
