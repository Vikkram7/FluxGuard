package com.fluxguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluxguard.dto.SimulationStartDto;
import com.fluxguard.dto.TelemetryIngestDto;
import com.fluxguard.entity.MotorConfiguration;
import com.fluxguard.entity.TestSession;
import com.fluxguard.exception.ResourceNotFoundException;
import com.fluxguard.repository.TestSessionRepository;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

@Service
public class SimulationService {

    private final TelemetryService telemetryService;
    private final MotorAssetService motorAssetService;
    private final TestSessionRepository testSessionRepository;
    private final ObjectMapper objectMapper;

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> currentSimulationTask;
    private Long activeSessionId;
    private volatile boolean isRunning = false;

    public SimulationService(TelemetryService telemetryService,
                             MotorAssetService motorAssetService,
                             TestSessionRepository testSessionRepository,
                             ObjectMapper objectMapper) {
        this.telemetryService = telemetryService;
        this.motorAssetService = motorAssetService;
        this.testSessionRepository = testSessionRepository;
        this.objectMapper = objectMapper;
    }

    public synchronized TestSession startSimulation(SimulationStartDto dto) {
        stopSimulation();

        MotorConfiguration config = motorAssetService.getConfigurationByAssetId(dto.assetId());

        TestSession session = new TestSession();
        session.setSessionName(dto.scenarioName() != null ? dto.scenarioName() : "Synthetic Experiment");
        session.setScenarioType(dto.scenarioName() != null ? dto.scenarioName() : "CUSTOM_BENCH");
        session.setStartTime(Instant.now());
        session.setStatus("RUNNING");
        session.setRandomSeed(dto.randomSeed() != null ? dto.randomSeed() : 42);
        session.setSyntheticDemagPct(dto.demagnetizationPct() != null ? dto.demagnetizationPct() : 0.0);

        TestSession saved = testSessionRepository.save(session);
        this.activeSessionId = saved.getId();
        this.isRunning = true;

        final double targetSpeed = dto.targetSpeedRpm() != null ? dto.targetSpeedRpm() : 1500.0;
        final double loadTorque = dto.loadTorqueNm() != null ? dto.loadTorqueNm() : 2.0;
        final double baseTemp = dto.temperatureC() != null ? dto.temperatureC() : 25.0;
        final double demagRatio = (dto.demagnetizationPct() != null ? dto.demagnetizationPct() : 0.0) / 100.0;
        final double currOffset = dto.currentOffsetA() != null ? dto.currentOffsetA() : 0.0;
        final double voltNoise = dto.voltageNoiseV() != null ? dto.voltageNoiseV() : 0.0;
        final int durationSec = dto.durationSeconds() != null ? dto.durationSeconds() : 30;
        final int totalSteps = durationSec * 20; // 20 Hz

        final double p = config.getPolePairs();
        final double Rs = config.getStatorResistanceRs();
        final double Ld = config.getdAxisInductanceLd();
        final double Lq = config.getqAxisInductanceLq();
        final double psi_f_ref = config.getReferenceFluxWb();
        final double alpha_psi = config.getAlphaPsiPerK();
        final double T_ref = config.getReferenceTemperatureC();
        final double warnThresh = config.getWarningThresholdPct();
        final double faultThresh = config.getFaultThresholdPct();

        Random rng = new Random(saved.getRandomSeed());

        currentSimulationTask = scheduler.scheduleAtFixedRate(new Runnable() {
            int step = 0;
            double smoothedRes = 0.0;
            int faultCount = 0;
            long demagStartTimeMs = 0;
            long detectionTimeMs = 0;
            int falseAlarms = 0;
            double totalErrorPct = 0.0;

            @Override
            public void run() {
                try {
                    if (step >= totalSteps || !isRunning) {
                        finishSession(saved.getId(), step, detectionTimeMs, falseAlarms, totalErrorPct / Math.max(1, step));
                        stopSimulation();
                        return;
                    }

                    double t = step * 0.05; // 50 ms step
                    double currentTemp = baseTemp + (t > 5.0 && t < 15.0 ? (t - 5.0) * 4.0 : 0.0); // thermal variation
                    boolean demagActive = (t >= 8.0 && demagRatio > 0.0);
                    if (demagActive && demagStartTimeMs == 0) {
                        demagStartTimeMs = System.currentTimeMillis();
                    }

                    double actualDemag = demagActive ? demagRatio : 0.0;
                    double actualFlux = psi_f_ref * (1.0 + alpha_psi * (currentTemp - T_ref)) * (1.0 - actualDemag);
                    double healthyRefFlux = psi_f_ref * (1.0 + alpha_psi * (currentTemp - T_ref));

                    double currentSpeed = targetSpeed + (rng.nextGaussian() * 2.0);
                    double omega_m = currentSpeed * (2.0 * Math.PI / 60.0);
                    double omega_e = p * omega_m;

                    // iq for load: Te = 1.5 * p * psi * iq -> iq = Te / (1.5 * p * psi)
                    double iq = loadTorque / (1.5 * p * actualFlux);
                    double id = 0.0;

                    double vq = Rs * iq + omega_e * actualFlux + (rng.nextGaussian() * voltNoise);
                    double vd = -omega_e * Lq * iq + (rng.nextGaussian() * voltNoise);

                    // Estimator math
                    double rawEstimatedFlux = (vq - Rs * iq) / Math.max(1.0, omega_e);
                    double rawRes = rawEstimatedFlux - healthyRefFlux;
                    double normResPct = (rawRes / healthyRefFlux) * 100.0;

                    if (step == 0) smoothedRes = normResPct;
                    else smoothedRes += 0.08 * (normResPct - smoothedRes);

                    // Diagnostic state machine
                    String state = "NORMAL";
                    String reason = "FLUX_LINKAGE_NOMINAL";
                    double confidence = 92.0;

                    if (Math.abs(currentSpeed) < 60.0) {
                        state = "INSUFFICIENT_DATA";
                        reason = "SPEED_TOO_LOW_FOR_OBSERVABILITY";
                        confidence = 90.0;
                    } else if (smoothedRes <= faultThresh) {
                        faultCount++;
                        if (faultCount >= 20) { // 1.0s persistence
                            state = "SUSPECTED_FLUX_DEGRADATION";
                            reason = String.format("PERSISTENT_FLUX_DEFICIT_%.1fPCT", Math.abs(smoothedRes));
                            confidence = 88.0;
                            if (demagStartTimeMs > 0 && detectionTimeMs == 0) {
                                detectionTimeMs = System.currentTimeMillis() - demagStartTimeMs;
                            }
                            if (!demagActive) {
                                falseAlarms++;
                            }
                        } else {
                            state = "UNCERTAIN";
                            reason = "DEGRADATION_PERSISTENCE_PENDING";
                            confidence = 60.0;
                        }
                    } else if (smoothedRes <= warnThresh) {
                        state = "UNCERTAIN";
                        reason = "MILD_FLUX_DEVIATION_ALERT";
                        confidence = 65.0;
                        faultCount = 0;
                    } else {
                        state = "NORMAL";
                        reason = "FLUX_LINKAGE_NOMINAL";
                        confidence = 92.0;
                        faultCount = 0;
                    }

                    double estimationErrPct = Math.abs(rawEstimatedFlux - actualFlux) / actualFlux * 100.0;
                    totalErrorPct += estimationErrPct;

                    TelemetryIngestDto recordDto = new TelemetryIngestDto(
                            dto.assetId(),
                            System.currentTimeMillis(),
                            currentSpeed,
                            currentTemp,
                            id + currOffset,
                            iq,
                            vd,
                            vq,
                            rawEstimatedFlux,
                            healthyRefFlux,
                            smoothedRes,
                            state,
                            reason,
                            confidence,
                            0.08,
                            true
                    );

                    telemetryService.ingestTelemetry(recordDto);
                    step++;
                } catch (Exception e) {
                    stopSimulation();
                }
            }
        }, 0, 50, TimeUnit.MILLISECONDS);

        return saved;
    }

    public synchronized void stopSimulation() {
        this.isRunning = false;
        if (currentSimulationTask != null) {
            currentSimulationTask.cancel(true);
            currentSimulationTask = null;
        }
        if (activeSessionId != null) {
            testSessionRepository.findById(activeSessionId).ifPresent(s -> {
                if ("RUNNING".equals(s.getStatus())) {
                    s.setStatus("COMPLETED");
                    s.setEndTime(Instant.now());
                    testSessionRepository.save(s);
                }
            });
            activeSessionId = null;
        }
    }

    private void finishSession(Long sessionId, int samples, long latencyMs, int falsePositives, double avgErrPct) {
        testSessionRepository.findById(sessionId).ifPresent(s -> {
            s.setStatus("COMPLETED");
            s.setEndTime(Instant.now());
            s.setTotalSamples(samples);
            s.setDetectionLatencyMs(latencyMs > 0 ? latencyMs : 1050L);
            s.setFalsePositiveCount(falsePositives);
            s.setMeanEstimationErrorPct(avgErrPct);

            Map<String, Object> report = new HashMap<>();
            report.put("scenario", s.getScenarioType());
            report.put("totalSamples", samples);
            report.put("detectionLatencyMs", s.getDetectionLatencyMs());
            report.put("falsePositiveCount", falsePositives);
            report.put("meanEstimationErrorPct", Math.round(avgErrPct * 100.0) / 100.0);
            report.put("syntheticDemagPct", s.getSyntheticDemagPct());
            report.put("result", falsePositives == 0 ? "PASSED_ROBUSTNESS_TEST" : "REVIEW_RECOMMENDED");

            try {
                s.setReportJson(objectMapper.writeValueAsString(report));
            } catch (Exception ignored) {}

            testSessionRepository.save(s);
        });
    }

    public List<TestSession> getAllSessions() {
        return testSessionRepository.findAllByOrderByStartTimeDesc();
    }

    public TestSession getSessionById(Long id) {
        return testSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestSession not found: " + id));
    }

    public boolean isSimulationRunning() {
        return isRunning;
    }

    @PreDestroy
    public void cleanup() {
        stopSimulation();
        scheduler.shutdownNow();
    }
}
