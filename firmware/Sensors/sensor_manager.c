/**
 * @file sensor_manager.c
 * @brief FluxGuard PMSM - Sensor Acquisition, Calibration, and Signal Conditioning Implementation
 */

#include "sensor_manager.h"
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

/* Calibration constants for STM32G4 shunt sensing:
 * 3.3V reference, 12-bit ADC (4096 counts), 20 mOhm shunt, gain = 20 V/V
 * Sensitivity: 4096 / 3.3 * (0.02 * 20) = 496.48 counts / A -> ~0.002014 A / count
 */
#define ADC_VREF                3.3f
#define ADC_MAX_COUNT           4095.0f
#define CURRENT_SHUNT_OHM       0.020f
#define CURRENT_OPAMP_GAIN      20.0f
#define CURRENT_SCALE           (ADC_VREF / (ADC_MAX_COUNT * CURRENT_SHUNT_OHM * CURRENT_OPAMP_GAIN))

/* Voltage divider scale: 100k / 4.7k -> divide by 0.04488 -> mult by 22.28 */
#define VBUS_VOLTAGE_SCALE      ( (ADC_VREF / ADC_MAX_COUNT) * 22.28f )

/* NTC Steinhart-Hart B-parameter formula constants */
#define NTC_BETA                3950.0f
#define NTC_R25                 10000.0f
#define NTC_T25_K               (273.15f + 25.0f)

void SensorManager_Init(SensorManager_t *sm) {
    if (!sm) return;
    sm->offset_ia = 2048; /* Mid-scale nominal 1.65V zero point */
    sm->offset_ib = 2048;
    sm->offset_ic = 2048;
    sm->is_offset_calibrated = false;
    sm->speed_rpm = 0.0f;
    sm->temperature_c = 25.0f;
    sm->vbus_v = 48.0f;
    sm->id_a = 0.0f;
    sm->iq_a = 0.0f;
    sm->vd_v = 0.0f;
    sm->vq_v = 0.0f;
    sm->encoder_counts = 0;
    sm->prev_encoder_counts = 0;
    sm->rotor_angle_elec_rad = 0.0f;
}

void SensorManager_CalibrateOffsets(SensorManager_t *sm, uint16_t ia_samples[], uint16_t ib_samples[], uint32_t count) {
    if (!sm || !ia_samples || !ib_samples || count == 0) return;

    uint32_t sum_a = 0;
    uint32_t sum_b = 0;
    for (uint32_t i = 0; i < count; i++) {
        sum_a += ia_samples[i];
        sum_b += ib_samples[i];
    }
    sm->offset_ia = (uint16_t)(sum_a / count);
    sm->offset_ib = (uint16_t)(sum_b / count);
    sm->offset_ic = sm->offset_ia;
    sm->is_offset_calibrated = true;
}

void SensorManager_UpdateSensors(SensorManager_t *sm,
                                uint16_t raw_ia,
                                uint16_t raw_ib,
                                uint16_t raw_vbus,
                                uint16_t raw_temp,
                                uint32_t enc_counts,
                                float dt) {
    if (!sm) return;

    sm->raw_adc_ia = raw_ia;
    sm->raw_adc_ib = raw_ib;
    sm->raw_adc_vbus = raw_vbus;
    sm->raw_adc_temp = raw_temp;

    /* 1. Offset-corrected phase currents */
    int32_t diff_a = (int32_t)raw_ia - (int32_t)sm->offset_ia;
    int32_t diff_b = (int32_t)raw_ib - (int32_t)sm->offset_ib;

    sm->ia_a = (float)diff_a * CURRENT_SCALE;
    sm->ib_a = (float)diff_b * CURRENT_SCALE;
    /* In a 3-wire star connected motor: ia + ib + ic = 0 */
    sm->ic_a = -(sm->ia_a + sm->ib_a);

    /* 2. DC bus voltage */
    sm->vbus_v = (float)raw_vbus * VBUS_VOLTAGE_SCALE;

    /* 3. Temperature via NTC Steinhart-Hart equation */
    if (raw_temp > 50 && raw_temp < 4000) {
        float v_ntc = (float)raw_temp * (ADC_VREF / ADC_MAX_COUNT);
        float r_ntc = 10000.0f * v_ntc / (ADC_VREF - v_ntc);
        float ln_r = logf(r_ntc / NTC_R25);
        float t_kelvin = 1.0f / ((1.0f / NTC_T25_K) + (ln_r / NTC_BETA));
        sm->temperature_c = t_kelvin - 273.15f;
    }

    /* 4. Speed calculation from encoder */
    if (dt > 0.0f) {
        int32_t delta_counts = (int32_t)enc_counts - (int32_t)sm->prev_encoder_counts;
        /* Handle 16-bit / 32-bit wrap */
        if (delta_counts > 32768) delta_counts -= 65536;
        else if (delta_counts < -32768) delta_counts += 65536;

        /* Standard 1024-line quadrature encoder (4096 edges/rev) */
        float revs = (float)delta_counts / 4096.0f;
        sm->speed_rpm = (revs / dt) * 60.0f;
    }
    sm->prev_encoder_counts = enc_counts;
    sm->encoder_counts = enc_counts;
}

void SensorManager_ClarkeParkTransform(SensorManager_t *sm, float theta_e) {
    if (!sm) return;
    sm->rotor_angle_elec_rad = theta_e;

    /* Clarke transform (power-invariant or amplitude-invariant)
     * i_alpha = ia
     * i_beta = (ia + 2*ib) / sqrt(3)
     */
    float i_alpha = sm->ia_a;
    float i_beta = (sm->ia_a + 2.0f * sm->ib_a) * 0.577350269f; /* 1/sqrt(3) */

    /* Park transform:
     * id = i_alpha * cos(theta_e) + i_beta * sin(theta_e)
     * iq = -i_alpha * sin(theta_e) + i_beta * cos(theta_e)
     */
    float sin_th = sinf(theta_e);
    float cos_th = cosf(theta_e);

    sm->id_a = i_alpha * cos_th + i_beta * sin_th;
    sm->iq_a = -i_alpha * sin_th + i_beta * cos_th;
}
