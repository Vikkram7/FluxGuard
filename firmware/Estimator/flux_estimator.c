/**
 * @file flux_estimator.c
 * @brief FluxGuard PMSM - Portable C Embedded Flux Estimator Engine Implementation
 */

#include "flux_estimator.h"
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

void FluxEstimator_Init(FluxEstimator_t *est, const MotorParameters_t *params, float dt) {
    if (!est) return;
    if (params) {
        est->params = *params;
    } else {
        est->params = MotorConfig_GetDefaults();
    }
    est->dt = (dt > 0.0f) ? dt : 0.01f;
    est->min_omega_e = 18.0f; /* ~43 RPM for 4 pole-pairs */

    /* Digital low pass filter: fc = 15 Hz */
    float fc = 15.0f;
    float rc = 1.0f / (2.0f * (float)M_PI * fc);
    est->alpha_lpf = est->dt / (rc + est->dt);

    FluxEstimator_Reset(est, est->params.psi_f_ref_wb);
}

void FluxEstimator_Reset(FluxEstimator_t *est, float initial_flux) {
    if (!est) return;
    est->filtered_psi = (initial_flux > 0.0f) ? initial_flux : est->params.psi_f_ref_wb;
    est->prev_id = 0.0f;
    est->prev_iq = 0.0f;
    est->diq_dt_filtered = 0.0f;
    est->did_dt_filtered = 0.0f;
    est->has_prev_sample = false;
}

EstimatorOutput_t FluxEstimator_Update(FluxEstimator_t *est,
                                      float id_a,
                                      float iq_a,
                                      float vd_v,
                                      float vq_v,
                                      float speed_rpm,
                                      float temp_c) {
    EstimatorOutput_t out;
    out.psi_hat_wb = est->filtered_psi;
    out.raw_psi_wb = est->filtered_psi;
    out.uncertainty = 1.0f;
    out.d_axis_residual_v = 0.0f;
    out.is_valid = false;

    /* 1. NaN and Inf checking */
    if (isnan(id_a) || isnan(iq_a) || isnan(vd_v) || isnan(vq_v) || isnan(speed_rpm) || isnan(temp_c) ||
        isinf(id_a) || isinf(iq_a) || isinf(vd_v) || isinf(vq_v) || isinf(speed_rpm) || isinf(temp_c)) {
        out.status = EST_INPUT_NAN_INF;
        return out;
    }

    /* 2. Speed conversion */
    float omega_m = speed_rpm * (2.0f * (float)M_PI / 60.0f);
    float omega_e = (float)est->params.pole_pairs * omega_m;
    float abs_omega_e = fabsf(omega_e);

    /* 3. Low-speed observability cutoff */
    if (abs_omega_e < est->min_omega_e) {
        out.status = EST_SPEED_TOO_LOW;
        return out;
    }

    /* 4. Saturation check */
    float v_mag = sqrtf(vd_v * vd_v + vq_v * vq_v);
    float i_mag = sqrtf(id_a * id_a + iq_a * iq_a);
    if (v_mag > 1.05f * est->params.v_max_v) {
        out.status = EST_VOLTAGE_SATURATION;
        out.uncertainty = 0.9f;
        return out;
    }
    if (i_mag > 1.10f * est->params.i_max_a) {
        out.status = EST_CURRENT_SATURATION;
        out.uncertainty = 0.9f;
        return out;
    }

    /* 5. Temperature plausibility bounds */
    if (temp_c < -40.0f || temp_c > 165.0f) {
        out.status = EST_TEMP_OUT_OF_RANGE;
        out.uncertainty = 0.95f;
        return out;
    }

    /* 6. Derivative smoothing */
    if (est->has_prev_sample && est->dt > 0.0f) {
        float raw_diq = (iq_a - est->prev_iq) / est->dt;
        float raw_did = (id_a - est->prev_id) / est->dt;
        float d_alpha = est->alpha_lpf * 2.5f;
        if (d_alpha > 1.0f) d_alpha = 1.0f;
        est->diq_dt_filtered += d_alpha * (raw_diq - est->diq_dt_filtered);
        est->did_dt_filtered += d_alpha * (raw_did - est->did_dt_filtered);
    } else {
        est->diq_dt_filtered = 0.0f;
        est->did_dt_filtered = 0.0f;
        est->has_prev_sample = true;
    }
    est->prev_iq = iq_a;
    est->prev_id = id_a;

    /* 7. Voltage-model back-EMF flux estimation */
    float rs = est->params.rs_ohm;
    float ld = est->params.ld_h;
    float lq = est->params.lq_h;

    float inductive_q = lq * est->diq_dt_filtered;
    float resistive_q = rs * iq_a;
    float cross_coupling_q = omega_e * ld * id_a;

    /* eq = vq - Rs*iq - Lq*diq/dt - omega_e*Ld*id */
    float bemf_q = vq_v - resistive_q - inductive_q - cross_coupling_q;
    float raw_psi = bemf_q / omega_e;
    out.raw_psi_wb = raw_psi;

    /* 8. Cross-check d-axis voltage residual */
    float vd_expected = rs * id_a + ld * est->did_dt_filtered - omega_e * lq * iq_a;
    float d_res = fabsf(vd_v - vd_expected);
    out.d_axis_residual_v = d_res;

    /* 9. Physical bounds plausibility */
    if (raw_psi < 0.01f || raw_psi > 2.0f * est->params.psi_f_ref_wb) {
        out.status = EST_OUT_OF_PHYSICAL_BOUNDS;
        out.uncertainty = 0.85f;
        return out;
    }

    /* 10. Digital low-pass filtering */
    est->filtered_psi += est->alpha_lpf * (raw_psi - est->filtered_psi);
    out.psi_hat_wb = est->filtered_psi;

    /* 11. Uncertainty calculation */
    float u_speed = (2.0f * est->min_omega_e / abs_omega_e) * 0.4f;
    if (u_speed > 0.4f) u_speed = 0.4f;
    float u_res = d_res / (est->params.v_max_v * 0.15f);
    if (u_res > 0.4f) u_res = 0.4f;
    float u_dyn = fabsf(est->diq_dt_filtered) / 100.0f;
    if (u_dyn > 0.2f) u_dyn = 0.2f;

    float total_u = u_speed + u_res + u_dyn;
    if (total_u < 0.02f) total_u = 0.02f;
    if (total_u > 1.0f) total_u = 1.0f;
    out.uncertainty = total_u;

    if (d_res > 0.30f * est->params.v_max_v) {
        out.status = EST_D_AXIS_VOLTAGE_MISMATCH;
        out.is_valid = false;
    } else {
        out.status = EST_VALID;
        out.is_valid = true;
    }

    return out;
}

const char* FluxEstimator_StatusToString(EstimatorStatus_t status) {
    switch (status) {
        case EST_VALID: return "VALID_ESTIMATE";
        case EST_SPEED_TOO_LOW: return "SPEED_TOO_LOW_FOR_OBSERVABILITY";
        case EST_INPUT_NAN_INF: return "INPUT_NAN_OR_INF";
        case EST_VOLTAGE_SATURATION: return "VOLTAGE_SATURATION";
        case EST_CURRENT_SATURATION: return "CURRENT_SATURATION";
        case EST_TEMP_OUT_OF_RANGE: return "TEMP_OUT_OF_RANGE";
        case EST_D_AXIS_VOLTAGE_MISMATCH: return "D_AXIS_VOLTAGE_MISMATCH";
        case EST_OUT_OF_PHYSICAL_BOUNDS: return "OUT_OF_PHYSICAL_BOUNDS";
        default: return "UNKNOWN_STATUS";
    }
}
