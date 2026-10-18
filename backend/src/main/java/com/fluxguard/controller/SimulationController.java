package com.fluxguard.controller;

import com.fluxguard.dto.ApiResponseDto;
import com.fluxguard.dto.SimulationStartDto;
import com.fluxguard.entity.TestSession;
import com.fluxguard.service.SimulationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SimulationController {

    private final SimulationService simulationService;

    public SimulationController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    @PostMapping("/simulation/start")
    public ResponseEntity<ApiResponseDto<TestSession>> startSimulation(@Valid @RequestBody SimulationStartDto dto) {
        TestSession session = simulationService.startSimulation(dto);
        return ResponseEntity.ok(ApiResponseDto.ok("Simulation started", session));
    }

    @PostMapping("/simulation/stop")
    public ResponseEntity<ApiResponseDto<String>> stopSimulation() {
        simulationService.stopSimulation();
        return ResponseEntity.ok(ApiResponseDto.ok("Simulation stopped", "Simulation terminated"));
    }

    @GetMapping("/simulation/status")
    public ResponseEntity<ApiResponseDto<Map<String, Object>>> getSimulationStatus() {
        return ResponseEntity.ok(ApiResponseDto.ok("Simulation status", Map.of(
                "running", simulationService.isSimulationRunning()
        )));
    }

    @GetMapping("/test-sessions")
    public ResponseEntity<ApiResponseDto<List<TestSession>>> getAllTestSessions() {
        return ResponseEntity.ok(ApiResponseDto.ok("Test sessions fetched", simulationService.getAllSessions()));
    }

    @GetMapping("/test-sessions/{id}")
    public ResponseEntity<ApiResponseDto<TestSession>> getTestSession(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponseDto.ok("Test session fetched", simulationService.getSessionById(id)));
    }

    @GetMapping("/test-sessions/{id}/report")
    public ResponseEntity<ApiResponseDto<String>> getTestSessionReport(@PathVariable Long id) {
        TestSession session = simulationService.getSessionById(id);
        return ResponseEntity.ok(ApiResponseDto.ok("Report fetched", session.getReportJson()));
    }
}
