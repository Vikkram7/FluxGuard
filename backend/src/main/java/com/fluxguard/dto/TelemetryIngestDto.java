package com.fluxguard.dto;

import jakarta.validation.constraints.NotNull;

public record TelemetryIngestDto(
    @NotNull(message = "assetId is required")
    Long assetId,
    Long timestampMs,
    Double speedRpm,
    Double temperatureC,
    Double idA,
    Double iqA,
    Double vdV,
    Double vqV,
    Double estimatedFluxWb,
    Double healthyReferenceFluxWb,
    Double residualPct,
    String diagnosticState,
    String reasonCode,
    Double confidencePct,
    Double uncertainty,
    Boolean isSimulated
) {}
