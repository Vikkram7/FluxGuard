/**
 * @file sensor_manager.h
 * @brief FluxGuard PMSM - Sensor Acquisition, Calibration, and Signal Conditioning
 */

#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    /* Raw ADC readings (12-bit or 16-bit counts) */
    uint16_t raw_adc_ia;
    uint16_t raw_adc_ib;
    uint16_t raw_adc_ic;
    uint16_t raw_adc_vbus;
    uint16_t raw_adc_temp;

    /* Calibrated zero-current offsets */
    uint16_t offset_ia;
    uint16_t offset_ib;
    uint16_t offset_ic;

    /* Scaled physical measurements */
    float ia_a;
    float ib_a;
    float ic_a;
    float id_a;
    float iq_a;
    float vbus_v;
    float vd_v;
    float vq_v;
    float speed_rpm;
    float temperature_c;

    /* Encoder state */
    uint32_t encoder_counts;
    uint32_t prev_encoder_counts;
    float rotor_angle_elec_rad;

    /* Calibration flags */
    bool is_offset_calibrated;
} SensorManager_t;

void SensorManager_Init(SensorManager_t *sm);
void SensorManager_CalibrateOffsets(SensorManager_t *sm, uint16_t ia_samples[], uint16_t ib_samples[], uint32_t count);
void SensorManager_UpdateSensors(SensorManager_t *sm,
                                uint16_t raw_ia,
                                uint16_t raw_ib,
                                uint16_t raw_vbus,
                                uint16_t raw_temp,
                                uint32_t enc_counts,
                                float dt);

void SensorManager_ClarkeParkTransform(SensorManager_t *sm, float theta_e);

#ifdef __cplusplus
}
#endif

#endif /* SENSOR_MANAGER_H */
