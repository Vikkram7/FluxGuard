/**
 * @file flux_estimator.h
 * @brief FluxGuard PMSM - Portable C Embedded Flux Estimator Engine
 */

#ifndef FLUX_ESTIMATOR_H
#define FLUX_ESTIMATOR_H

#include <stdint.h>
#include <stdbool.h>
#include "../Configuration/motor_config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    EST_VALID = 0,
    EST_SPEED_TOO_LOW,
    EST_INPUT_NAN_INF,
    EST_VOLTAGE_SATURATION,
    EST_CURRENT_SATURATION,
    EST_TEMP_OUT_OF_RANGE,
    EST_D_AXIS_VOLTAGE_MISMATCH,
    EST_OUT_OF_PHYSICAL_BOUNDS
} EstimatorStatus_t;

typedef struct {
    float psi_hat_wb;               /* Filtered flux estimate [Wb] */
    float raw_psi_wb;               /* Pre-filter instant estimate [Wb] */
    float uncertainty;              /* 0.0 (high confidence) to 1.0 (unusable) */
    float d_axis_residual_v;        /* Cross-check residual |vd - vd_expected| [V] */
    EstimatorStatus_t status;       /* Status code */
    bool is_valid;                  /* Usability flag for state machine */
} EstimatorOutput_t;

typedef struct {
    MotorParameters_t params;
    float dt;                       /* Sample period [s] */
    float min_omega_e;              /* Observability electrical speed cutoff [rad/s] */
    float alpha_lpf;                /* Digital filter coefficient */
    float filtered_psi;             /* Internal filter state */
    float prev_id;                  /* History for derivative */
    float prev_iq;
    float diq_dt_filtered;
    float did_dt_filtered;
    bool has_prev_sample;
} FluxEstimator_t;

void FluxEstimator_Init(FluxEstimator_t *est, const MotorParameters_t *params, float dt);
void FluxEstimator_Reset(FluxEstimator_t *est, float initial_flux);
EstimatorOutput_t FluxEstimator_Update(FluxEstimator_t *est,
                                      float id_a,
                                      float iq_a,
                                      float vd_v,
                                      float vq_v,
                                      float speed_rpm,
                                      float temp_c);

const char* FluxEstimator_StatusToString(EstimatorStatus_t status);

#ifdef __cplusplus
}
#endif

#endif /* FLUX_ESTIMATOR_H */
