package com.fluxguard.controller;

import com.fluxguard.dto.ApiResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<ApiResponseDto<Map<String, Object>>> checkHealth() {
        Map<String, Object> status = Map.of(
                "status", "UP",
                "system", "FluxGuard PMSM Diagnostic Core",
                "version", "1.0.0",
                "timestamp", java.time.Instant.now()
        );
        return ResponseEntity.ok(ApiResponseDto.ok("System healthy", status));
    }
}
