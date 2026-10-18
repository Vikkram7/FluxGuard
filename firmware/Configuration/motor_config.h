/**
 * @file motor_config.h
 * @brief FluxGuard PMSM - Configurable Motor Parameters and Diagnostic Thresholds
 * 
 * Strict SI units and default calibration constants.
 */

#ifndef MOTOR_CONFIG_H
#define MOTOR_CONFIG_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint16_t pole_pairs;            /* p: Number of pole pairs [-] */
    float rs_ohm;                   /* Rs: Stator phase resistance [Ohm] */
    float ld_h;                     /* Ld: d-axis inductance [H] */
    float lq_h;                     /* Lq: q-axis inductance [H] */
    float psi_f_ref_wb;             /* psi_f_ref: Nominal PM flux linkage at T_ref [Wb] */
    float t_ref_c;                  /* T_ref: Reference temperature [deg C] */
    float alpha_psi_per_k;          /* alpha_psi: Reversible thermal coeff [1/K] (e.g. -0.0011) */
    float j_inertia_kgm2;           /* J: Combined rotor inertia [kg*m^2] */
    float b_friction_nms;           /* B: Viscous friction coefficient [N*m*s/rad] */
    float v_max_v;                  /* V_max: Peak phase voltage limit [V] */
    float i_max_a;                  /* I_max: Peak phase current limit [A] */
    float min_speed_rpm;            /* Minimum speed threshold for observability [RPM] */
    float max_speed_rpm;            /* Overspeed protection cutoff [RPM] */
} MotorParameters_t;

typedef struct {
    float warn_threshold_pct;       /* Warning threshold (e.g. -3.5 %) */
    float fault_threshold_pct;      /* Demagnetization entry threshold (e.g. -5.0 %) */
    float recovery_threshold_pct;   /* Recovery hysteresis exit threshold (e.g. -2.8 %) */
    float severe_threshold_pct;     /* Critical alarm threshold (e.g. -12.0 %) */
    float persistence_time_s;       /* Persistence duration required before alarm [s] */
    float recovery_time_s;          /* Persistence duration required before clear [s] */
    float max_uncertainty;          /* Uncertainty cutoff [0.0 - 1.0] */
    float max_d_voltage_error_v;    /* Max acceptable d-axis residual voltage [V] */
    float min_temp_c;               /* Sensor minimum valid temperature [deg C] */
    float max_temp_c;               /* Sensor maximum valid temperature [deg C] */
    float dt_sample_s;              /* Diagnostic task interval [s] (e.g. 0.01s = 100 Hz) */
} DiagnosticThresholds_t;

/* Safe default parameters for standard industrial PMSM */
static inline MotorParameters_t MotorConfig_GetDefaults(void) {
    MotorParameters_t p;
    p.pole_pairs = 4;
    p.rs_ohm = 0.45f;
    p.ld_h = 0.0035f;
    p.lq_h = 0.0035f;
    p.psi_f_ref_wb = 0.0850f;
    p.t_ref_c = 20.0f;
    p.alpha_psi_per_k = -0.0011f;
    p.j_inertia_kgm2 = 0.0018f;
    p.b_friction_nms = 0.00035f;
    p.v_max_v = 160.0f;
    p.i_max_a = 25.0f;
    p.min_speed_rpm = 60.0f;
    p.max_speed_rpm = 4500.0f;
    return p;
}

static inline DiagnosticThresholds_t DiagnosticConfig_GetDefaults(void) {
    DiagnosticThresholds_t d;
    d.warn_threshold_pct = -3.5f;
    d.fault_threshold_pct = -5.0f;
    d.recovery_threshold_pct = -2.8f;
    d.severe_threshold_pct = -12.0f;
    d.persistence_time_s = 1.5f;
    d.recovery_time_s = 2.0f;
    d.max_uncertainty = 0.65f;
    d.max_d_voltage_error_v = 12.0f;
    d.min_temp_c = -30.0f;
    d.max_temp_c = 150.0f;
    d.dt_sample_s = 0.01f;
    return d;
}

#ifdef __cplusplus
}
#endif

#endif /* MOTOR_CONFIG_H */
