/**
 * @file telemetry_packet.c
 * @brief FluxGuard PMSM - Embedded Telemetry Serialization, CRC-16 Checksum, and Parsing Implementation
 */

#include "telemetry_packet.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>

/* CRC-16-CCITT (Polynomial 0x1021, Init 0xFFFF) */
uint16_t Telemetry_ComputeCRC16(const uint8_t *data, uint32_t length) {
    uint16_t crc = 0xFFFF;
    for (uint32_t i = 0; i < length; i++) {
        crc ^= (uint16_t)data[i] << 8;
        for (int bit = 0; bit < 8; bit++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    return crc;
}

int Telemetry_FormatPacket(const TelemetryPacket_t *pkt, char *buffer, uint32_t max_len) {
    if (!pkt || !buffer || max_len < 64) return -1;

    /* Build payload string */
    char payload[TELEMETRY_MAX_PACKET_LEN];
    int len = snprintf(payload, sizeof(payload),
                       "$FLUX,%lu,%.2f,%.2f,%.3f,%.3f,%.2f,%.2f,%.5f,%.2f,%s",
                       (unsigned long)pkt->timestamp_ms,
                       pkt->speed_rpm,
                       pkt->temperature_c,
                       pkt->id_a,
                       pkt->iq_a,
                       pkt->vd_v,
                       pkt->vq_v,
                       pkt->estimated_flux_wb,
                       pkt->residual_pct,
                       DiagnosticState_ToString(pkt->state));

    if (len < 0 || (uint32_t)len >= sizeof(payload)) return -1;

    /* Compute CRC over payload (excluding '$') */
    uint16_t crc = Telemetry_ComputeCRC16((const uint8_t *)payload, (uint32_t)len);

    /* Append *<CRC16>\r\n */
    int final_len = snprintf(buffer, max_len, "%s*%04X\r\n", payload, crc);
    return final_len;
}

static DiagnosticState_t ParseState(const char *str) {
    if (strcmp(str, "NORMAL") == 0) return STATE_NORMAL;
    if (strcmp(str, "SUSPECTED_FLUX_DEGRADATION") == 0) return STATE_SUSPECTED_FLUX_DEGRADATION;
    if (strcmp(str, "UNCERTAIN") == 0) return STATE_UNCERTAIN;
    if (strcmp(str, "INSUFFICIENT_DATA") == 0) return STATE_INSUFFICIENT_DATA;
    if (strcmp(str, "SENSOR_FAULT") == 0) return STATE_SENSOR_FAULT;
    return STATE_INITIALIZING;
}

bool Telemetry_ParsePacket(const char *buffer, TelemetryPacket_t *out_pkt) {
    if (!buffer || !out_pkt) return false;

    /* Find '*' delimiter */
    const char *star = strchr(buffer, '*');
    if (!star) {
        /* Support raw CSV without CRC if exactly 10 fields */
        char state_str[32];
        int n = sscanf(buffer, "%lu,%f,%f,%f,%f,%f,%f,%f,%f,%31s",
                       (unsigned long *)&out_pkt->timestamp_ms,
                       &out_pkt->speed_rpm,
                       &out_pkt->temperature_c,
                       &out_pkt->id_a,
                       &out_pkt->iq_a,
                       &out_pkt->vd_v,
                       &out_pkt->vq_v,
                       &out_pkt->estimated_flux_wb,
                       &out_pkt->residual_pct,
                       state_str);
        if (n == 10) {
            out_pkt->state = ParseState(state_str);
            out_pkt->crc16 = 0;
            return true;
        }
        return false;
    }

    uint32_t payload_len = (uint32_t)(star - buffer);
    if (payload_len >= TELEMETRY_MAX_PACKET_LEN) return false;

    char payload[TELEMETRY_MAX_PACKET_LEN];
    memcpy(payload, buffer, payload_len);
    payload[payload_len] = '\0';

    /* Parse CRC from hex */
    unsigned int parsed_crc = 0;
    if (sscanf(star + 1, "%04X", &parsed_crc) != 1) {
        return false;
    }

    /* Verify CRC */
    uint16_t expected_crc = Telemetry_ComputeCRC16((const uint8_t *)payload, payload_len);
    if (expected_crc != (uint16_t)parsed_crc) {
        return false; /* CRC failure */
    }

    /* Parse fields */
    char prefix[16];
    char state_str[32];
    int fields = sscanf(payload, "%15[^,],%lu,%f,%f,%f,%f,%f,%f,%f,%f,%31s",
                        prefix,
                        (unsigned long *)&out_pkt->timestamp_ms,
                        &out_pkt->speed_rpm,
                        &out_pkt->temperature_c,
                        &out_pkt->id_a,
                        &out_pkt->iq_a,
                        &out_pkt->vd_v,
                        &out_pkt->vq_v,
                        &out_pkt->estimated_flux_wb,
                        &out_pkt->residual_pct,
                        state_str);

    if (fields != 11 || strcmp(prefix, "$FLUX") != 0) {
        return false;
    }

    /* Physical range validation */
    if (out_pkt->speed_rpm < -10000.0f || out_pkt->speed_rpm > 10000.0f) return false;
    if (out_pkt->temperature_c < -50.0f || out_pkt->temperature_c > 200.0f) return false;
    if (out_pkt->estimated_flux_wb < 0.0f || out_pkt->estimated_flux_wb > 0.5f) return false;

    out_pkt->state = ParseState(state_str);
    out_pkt->crc16 = (uint16_t)parsed_crc;
    return true;
}
