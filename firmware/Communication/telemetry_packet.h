/**
 * @file telemetry_packet.h
 * @brief FluxGuard PMSM - Embedded Telemetry Serialization, CRC-16 Checksum, and Parsing
 */

#ifndef TELEMETRY_PACKET_H
#define TELEMETRY_PACKET_H

#include <stdint.h>
#include <stdbool.h>
#include "../Diagnostics/diagnostic_state_machine.h"

#ifdef __cplusplus
extern "C" {
#endif

#define TELEMETRY_MAX_PACKET_LEN 160

typedef struct {
    uint32_t timestamp_ms;
    float speed_rpm;
    float temperature_c;
    float id_a;
    float iq_a;
    float vd_v;
    float vq_v;
    float estimated_flux_wb;
    float residual_pct;
    DiagnosticState_t state;
    uint16_t crc16;
} TelemetryPacket_t;

/* Computes CCITT CRC-16 */
uint16_t Telemetry_ComputeCRC16(const uint8_t *data, uint32_t length);

/* Formats packet into buffer, returns bytes written */
int Telemetry_FormatPacket(const TelemetryPacket_t *pkt, char *buffer, uint32_t max_len);

/* Parses packet from string buffer, returns true if valid and CRC passes */
bool Telemetry_ParsePacket(const char *buffer, TelemetryPacket_t *out_pkt);

#ifdef __cplusplus
}
#endif

#endif /* TELEMETRY_PACKET_H */
