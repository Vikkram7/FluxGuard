/**
 * @file main.c
 * @brief FluxGuard PMSM - Embedded Firmware Entry Point & Task Scheduler
 */

#include <stdio.h>
#include <string.h>
#include "../Configuration/motor_config.h"
#include "../Drivers/stm32g4_hal_stubs.h"
#include "../Sensors/sensor_manager.h"
#include "../Estimator/flux_estimator.h"
#include "../Diagnostics/diagnostic_state_machine.h"
#include "../Communication/telemetry_packet.h"

int main(void) {
    /* 1. Initialize hardware drivers */
    STM32G4_Hardware_t hw;
    HAL_Driver_Init(&hw);
    HAL_Driver_StartADC_DMA(&hw);
    HAL_Driver_StartEncoder(&hw);

    /* 2. Initialize application modules with safe defaults */
    MotorParameters_t motor_params = MotorConfig_GetDefaults();
    DiagnosticThresholds_t diag_thresholds = DiagnosticConfig_GetDefaults();

    SensorManager_t sensor_mgr;
    SensorManager_Init(&sensor_mgr);

    FluxEstimator_t estimator;
    FluxEstimator_Init(&estimator, &motor_params, 0.01f);

    DiagnosticEngine_t diag_engine;
    DiagnosticEngine_Init(&diag_engine, &motor_params, &diag_thresholds);

    uint32_t last_diag_tick = 0;
    uint32_t last_telemetry_tick = 0;
    char tx_buffer[TELEMETRY_MAX_PACKET_LEN + 16];

    printf("FluxGuard PMSM Firmware Initialized. Starting Real-Time Loop.\n");

    /* Simulated execution loop */
    for (int iter = 0; iter < 100; iter++) {
        uint32_t now = HAL_Driver_GetTick();

        /* Task 1: 100 Hz Sensor Acquisition & Diagnostics (10 ms) */
        if (now - last_diag_tick >= 10) {
            last_diag_tick = now;

            /* Sample ADC DMA buffer */
            SensorManager_UpdateSensors(&sensor_mgr,
                                        hw.adc1_dma_buffer[0],
                                        hw.adc1_dma_buffer[1],
                                        hw.adc1_dma_buffer[2],
                                        hw.adc1_dma_buffer[3],
                                        hw.encoder_timer_val,
                                        0.01f);

            /* Clarke-Park Transform */
            SensorManager_ClarkeParkTransform(&sensor_mgr, sensor_mgr.rotor_angle_elec_rad);

            /* Run Flux Estimator */
            EstimatorOutput_t est_out = FluxEstimator_Update(&estimator,
                                                             sensor_mgr.id_a,
                                                             sensor_mgr.iq_a,
                                                             sensor_mgr.vd_v,
                                                             sensor_mgr.vq_v,
                                                             sensor_mgr.speed_rpm,
                                                             sensor_mgr.temperature_c);

            /* Run Diagnostic State Machine */
            DiagnosticResult_t diag_res = DiagnosticEngine_ProcessSample(&diag_engine,
                                                                         &est_out,
                                                                         sensor_mgr.speed_rpm,
                                                                         sensor_mgr.temperature_c);

            /* Task 2: 20 Hz Telemetry Broadcast (50 ms) */
            if (now - last_telemetry_tick >= 50) {
                last_telemetry_tick = now;

                TelemetryPacket_t pkt;
                pkt.timestamp_ms = now;
                pkt.speed_rpm = sensor_mgr.speed_rpm;
                pkt.temperature_c = sensor_mgr.temperature_c;
                pkt.id_a = sensor_mgr.id_a;
                pkt.iq_a = sensor_mgr.iq_a;
                pkt.vd_v = sensor_mgr.vd_v;
                pkt.vq_v = sensor_mgr.vq_v;
                pkt.estimated_flux_wb = diag_res.psi_hat_wb;
                pkt.residual_pct = diag_res.norm_residual_pct;
                pkt.state = diag_res.state;

                int bytes = Telemetry_FormatPacket(&pkt, tx_buffer, sizeof(tx_buffer));
                if (bytes > 0) {
                    HAL_Driver_TransmitUART_DMA(&hw, (const uint8_t*)tx_buffer, (uint16_t)bytes);
                }
            }
        }

        /* Kick watchdog */
        HAL_Driver_KickWatchdog(&hw);
    }

    printf("FluxGuard PMSM Firmware Main Loop Verified.\n");
    return 0;
}
