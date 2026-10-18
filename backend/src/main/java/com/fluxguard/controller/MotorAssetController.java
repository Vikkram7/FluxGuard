package com.fluxguard.controller;

import com.fluxguard.dto.ApiResponseDto;
import com.fluxguard.entity.DiagnosticEvent;
import com.fluxguard.entity.MotorAsset;
import com.fluxguard.entity.MotorConfiguration;
import com.fluxguard.entity.TelemetryRecord;
import com.fluxguard.service.MotorAssetService;
import com.fluxguard.service.TelemetryService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assets")
@CrossOrigin(origins = "*")
public class MotorAssetController {

    private final MotorAssetService motorAssetService;
    private final TelemetryService telemetryService;

    public MotorAssetController(MotorAssetService motorAssetService, TelemetryService telemetryService) {
        this.motorAssetService = motorAssetService;
        this.telemetryService = telemetryService;
    }

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<MotorAsset>>> getAllAssets() {
        return ResponseEntity.ok(ApiResponseDto.ok("Assets fetched", motorAssetService.getAllAssets()));
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<MotorAsset>> createAsset(@Valid @RequestBody MotorAsset asset) {
        MotorAsset created = motorAssetService.createAsset(asset);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponseDto.ok("Asset created", created));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponseDto<MotorAsset>> getAssetById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponseDto.ok("Asset fetched", motorAssetService.getAssetById(id)));
    }

    @GetMapping("/{id}/configuration")
    public ResponseEntity<ApiResponseDto<MotorConfiguration>> getConfiguration(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponseDto.ok("Configuration fetched", motorAssetService.getConfigurationByAssetId(id)));
    }

    @PutMapping("/{id}/configuration")
    public ResponseEntity<ApiResponseDto<MotorConfiguration>> updateConfiguration(
            @PathVariable Long id,
            @Valid @RequestBody MotorConfiguration configuration) {
        MotorConfiguration updated = motorAssetService.updateConfiguration(id, configuration);
        return ResponseEntity.ok(ApiResponseDto.ok("Configuration updated successfully", updated));
    }

    @GetMapping("/{id}/diagnostics")
    public ResponseEntity<ApiResponseDto<List<DiagnosticEvent>>> getDiagnostics(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponseDto.ok("Diagnostics fetched", telemetryService.getRecentDiagnosticEvents(id)));
    }

    @GetMapping("/{id}/telemetry")
    public ResponseEntity<ApiResponseDto<Page<TelemetryRecord>>> getTelemetry(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponseDto.ok("Telemetry fetched", telemetryService.getHistoricalTelemetry(id, page, size)));
    }
}
