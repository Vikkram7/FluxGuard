package com.fluxguard.dto;

import jakarta.validation.constraints.NotNull;

public record SimulationStartDto(
    @NotNull(message = "assetId is required")
    Long assetId,
    String scenarioName,
    Double targetSpeedRpm,
    Double loadTorqueNm,
    Double temperatureC,
    Double demagnetizationPct,
    Double currentOffsetA,
    Double voltageNoiseV,
    Double tempBiasC,
    Integer durationSeconds,
    Integer randomSeed
) {}
