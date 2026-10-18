package com.fluxguard.controller;

import com.fluxguard.dto.ApiResponseDto;
import com.fluxguard.dto.TelemetryIngestDto;
import com.fluxguard.entity.TelemetryRecord;
import com.fluxguard.service.TelemetryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/telemetry")
@CrossOrigin(origins = "*")
public class TelemetryController {

    private final TelemetryService telemetryService;

    public TelemetryController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    @PostMapping
    public ResponseEntity<ApiResponseDto<TelemetryRecord>> ingestTelemetry(@Valid @RequestBody TelemetryIngestDto dto) {
        TelemetryRecord record = telemetryService.ingestTelemetry(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponseDto.ok("Telemetry ingested", record));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTelemetry() {
        return telemetryService.subscribeSse();
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponseDto<List<TelemetryRecord>>> getRecent(
            @RequestParam(defaultValue = "1") Long assetId,
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(ApiResponseDto.ok("Recent telemetry fetched", telemetryService.getRecentTelemetry(assetId, limit)));
    }
}
