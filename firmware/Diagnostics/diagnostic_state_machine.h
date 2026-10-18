/**
 * @file diagnostic_state_machine.h
 * @brief FluxGuard PMSM - C Embedded Diagnostic State Machine & Residual Monitor
 */

#ifndef DIAGNOSTIC_STATE_MACHINE_H
#define DIAGNOSTIC_STATE_MACHINE_H

#include <stdint.h>
#include <stdbool.h>
#include "../Configuration/motor_config.h"
#include "../Estimator/flux_estimator.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    STATE_INITIALIZING = 0,
    STATE_NORMAL,
    STATE_SUSPECTED_FLUX_DEGRADATION,
    STATE_UNCERTAIN,
    STATE_INSUFFICIENT_DATA,
    STATE_SENSOR_FAULT
} DiagnosticState_t;

typedef struct {
    DiagnosticState_t state;
    float psi_hat_wb;
    float psi_healthy_wb;
    float raw_residual_wb;
    float norm_residual_pct;
    float smoothed_residual_pct;
    float confidence_pct;
    float uncertainty;
    const char *reason_code;
    uint32_t fault_code;
    bool is_valid_operating_point;
} DiagnosticResult_t;

typedef struct {
    MotorParameters_t motor_params;
    DiagnosticThresholds_t thresholds;

    DiagnosticState_t current_state;
    uint32_t sample_count;
    uint32_t consecutive_fault_samples;
    uint32_t consecutive_recovery_samples;

    /* Rolling exponential moving average of normalized residual */
    float smoothed_residual_pct;
    bool residual_initialized;
} DiagnosticEngine_t;

void DiagnosticEngine_Init(DiagnosticEngine_t *engine,
                           const MotorParameters_t *motor_params,
                           const DiagnosticThresholds_t *thresholds);

void DiagnosticEngine_Reset(DiagnosticEngine_t *engine);

DiagnosticResult_t DiagnosticEngine_ProcessSample(DiagnosticEngine_t *engine,
                                                 const EstimatorOutput_t *est_out,
                                                 float speed_rpm,
                                                 float temp_c);

const char* DiagnosticState_ToString(DiagnosticState_t state);

#ifdef __cplusplus
}
#endif

#endif /* DIAGNOSTIC_STATE_MACHINE_H */
