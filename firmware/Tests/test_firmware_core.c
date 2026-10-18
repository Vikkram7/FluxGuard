/**
 * @file test_firmware_core.c
 * @brief FluxGuard PMSM - Host-Side Embedded C Firmware Unit Tests
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <assert.h>

#include "../Configuration/motor_config.h"
#include "../Estimator/flux_estimator.h"
#include "../Diagnostics/diagnostic_state_machine.h"
#include "../Communication/telemetry_packet.h"

static int g_tests_run = 0;
static int g_tests_passed = 0;

#define TEST_ASSERT(cond, msg) do { \
    g_tests_run++; \
    if (cond) { \
        g_tests_passed++; \
        printf("  [PASS] %s\n", msg); \
    } else { \
        printf("  [FAIL] %s (Line %d)\n", msg, __LINE__); \
    } \
} while(0)

void test_crc16_and_packet_serialization(void) {
    printf("[*] Testing CRC-16 and Packet Serialization...\n");
    TelemetryPacket_t tx_pkt;
    tx_pkt.timestamp_ms = 12540;
    tx_pkt.speed_rpm = 1500.0f;
    tx_pkt.temperature_c = 42.5f;
    tx_pkt.id_a = -0.15f;
    tx_pkt.iq_a = 4.25f;
    tx_pkt.vd_v = -12.4f;
    tx_pkt.vq_v = 85.3f;
    tx_pkt.estimated_flux_wb = 0.0841f;
    tx_pkt.residual_pct = -1.05f;
    tx_pkt.state = STATE_NORMAL;

    char buffer[256];
    int len = Telemetry_FormatPacket(&tx_pkt, buffer, sizeof(buffer));
    TEST_ASSERT(len > 0, "Packet formatted successfully");
    TEST_ASSERT(strstr(buffer, "$FLUX,12540,1500.00,42.50") != NULL, "Payload prefix matches");
    TEST_ASSERT(strchr(buffer, '*') != NULL, "CRC delimiter '*' present");

    /* Parse back */
    TelemetryPacket_t rx_pkt;
    bool parse_ok = Telemetry_ParsePacket(buffer, &rx_pkt);
    TEST_ASSERT(parse_ok == true, "Telemetry_ParsePacket returns true for valid frame");
    TEST_ASSERT(rx_pkt.timestamp_ms == 12540, "Parsed timestamp matches");
    TEST_ASSERT(fabsf(rx_pkt.speed_rpm - 1500.0f) < 0.1f, "Parsed speed matches");
    TEST_ASSERT(fabsf(rx_pkt.estimated_flux_wb - 0.0841f) < 0.001f, "Parsed flux matches");
    TEST_ASSERT(rx_pkt.state == STATE_NORMAL, "Parsed state is STATE_NORMAL");

    /* Test corrupt CRC rejection */
    char corrupt_buf[256];
    strcpy(corrupt_buf, buffer);
    char *star = strchr(corrupt_buf, '*');
    if (star) {
        star[1] = (star[1] == 'A') ? 'B' : 'A'; /* Flip one CRC digit */
    }
    bool corrupt_ok = Telemetry_ParsePacket(corrupt_buf, &rx_pkt);
    TEST_ASSERT(corrupt_ok == false, "Telemetry_ParsePacket rejects corrupted CRC frame");
}

void test_flux_estimator_c_core(void) {
    printf("[*] Testing C Flux Estimator Core...\n");
    MotorParameters_t params = MotorConfig_GetDefaults();
    FluxEstimator_t est;
    FluxEstimator_Init(&est, &params, 0.01f);

    float rpm = 1500.0f;
    float omega_m = rpm * 2.0f * 3.14159265f / 60.0f;
    float omega_e = (float)params.pole_pairs * omega_m;
    float iq = 3.5f;
    float id = 0.0f;
    float vq = params.rs_ohm * iq + omega_e * params.psi_f_ref_wb;
    float vd = -omega_e * params.lq_h * iq;

    EstimatorOutput_t out;
    for (int i = 0; i < 40; i++) {
        out = FluxEstimator_Update(&est, id, iq, vd, vq, rpm, 20.0f);
    }

    TEST_ASSERT(out.is_valid == true, "Estimator is valid at 1500 RPM nominal");
    TEST_ASSERT(fabsf(out.psi_hat_wb - 0.085f) < 0.002f, "Estimated flux converges to 0.085 Wb");
    TEST_ASSERT(out.uncertainty < 0.25f, "Uncertainty is low (< 0.25) at healthy rated operating point");

    /* Low speed test */
    EstimatorOutput_t low_out = FluxEstimator_Update(&est, id, iq, vd, vq, 25.0f, 20.0f);
    TEST_ASSERT(low_out.is_valid == false, "Estimator rejects speed below 43 RPM threshold");
    TEST_ASSERT(low_out.status == EST_SPEED_TOO_LOW, "Estimator reports EST_SPEED_TOO_LOW");
}

void test_temperature_compensation_and_state_machine_c(void) {
    printf("[*] Testing C Temperature Compensation & Diagnostic State Machine...\n");
    MotorParameters_t motor_params = MotorConfig_GetDefaults();
    DiagnosticThresholds_t diag_thresholds = DiagnosticConfig_GetDefaults();
    diag_thresholds.persistence_time_s = 0.3f; /* 30 samples for fast test */

    DiagnosticEngine_t engine;
    DiagnosticEngine_Init(&engine, &motor_params, &diag_thresholds);

    FluxEstimator_t est;
    FluxEstimator_Init(&est, &motor_params, 0.01f);

    float rpm = 1500.0f;
    float omega_e = 4.0f * (rpm * 2.0f * 3.14159265f / 60.0f);
    
    /* 1. Hot temperature sweep (85 deg C): Flux is physically lower by ~7.15% */
    float temp_hot = 85.0f;
    float psi_hot = motor_params.psi_f_ref_wb * (1.0f + motor_params.alpha_psi_per_k * (temp_hot - 20.0f));
    float vq_hot = motor_params.rs_ohm * 3.0f + omega_e * psi_hot;
    float vd_hot = -omega_e * motor_params.lq_h * 3.0f;

    DiagnosticResult_t diag_res;
    for (int i = 0; i < 50; i++) {
        EstimatorOutput_t out = FluxEstimator_Update(&est, 0.0f, 3.0f, vd_hot, vq_hot, rpm, temp_hot);
        diag_res = DiagnosticEngine_ProcessSample(&engine, &out, rpm, temp_hot);
    }

    TEST_ASSERT(diag_res.state == STATE_NORMAL, "Temperature compensation keeps state NORMAL at 85 deg C");
    TEST_ASSERT(fabsf(diag_res.norm_residual_pct) < 1.5f, "Temperature-compensated residual is near 0%");

    /* 2. Permanent Demagnetization (-10%) */
    float psi_demag = motor_params.psi_f_ref_wb * 0.90f;
    float vq_demag = motor_params.rs_ohm * 3.0f + omega_e * psi_demag;
    float vd_demag = -omega_e * motor_params.lq_h * 3.0f;

    /* Before persistence duration */
    for (int i = 0; i < 15; i++) {
        EstimatorOutput_t out = FluxEstimator_Update(&est, 0.0f, 3.0f, vd_demag, vq_demag, rpm, 20.0f);
        diag_res = DiagnosticEngine_ProcessSample(&engine, &out, rpm, 20.0f);
    }
    TEST_ASSERT(diag_res.state == STATE_UNCERTAIN, "State is UNCERTAIN while persistence is pending");

    /* After persistence duration (35 more samples) */
    for (int i = 0; i < 35; i++) {
        EstimatorOutput_t out = FluxEstimator_Update(&est, 0.0f, 3.0f, vd_demag, vq_demag, rpm, 20.0f);
        diag_res = DiagnosticEngine_ProcessSample(&engine, &out, rpm, 20.0f);
    }
    TEST_ASSERT(diag_res.state == STATE_SUSPECTED_FLUX_DEGRADATION, "State transitions to SUSPECTED_FLUX_DEGRADATION after persistence");
    TEST_ASSERT(diag_res.norm_residual_pct < -8.0f, "Normalized residual reflects ~ -10% permanent loss");
}

int main(void) {
    printf("====================================================\n");
    printf("FluxGuard PMSM - Host-Side C Firmware Test Suite\n");
    printf("====================================================\n");

    test_crc16_and_packet_serialization();
    test_flux_estimator_c_core();
    test_temperature_compensation_and_state_machine_c();

    printf("====================================================\n");
    printf("Test Results: %d/%d passed\n", g_tests_passed, g_tests_run);
    printf("====================================================\n");

    return (g_tests_passed == g_tests_run) ? 0 : 1;
}
