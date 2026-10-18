package com.fluxguard.service;

import com.fluxguard.dto.TelemetryIngestDto;
import com.fluxguard.entity.DiagnosticEvent;
import com.fluxguard.entity.MotorAsset;
import com.fluxguard.entity.TelemetryRecord;
import com.fluxguard.repository.DiagnosticEventRepository;
import com.fluxguard.repository.TelemetryRecordRepository;
import com.fluxguard.websocket.TelemetryWebSocketHandler;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class TelemetryService {

    private final TelemetryRecordRepository telemetryRecordRepository;
    private final DiagnosticEventRepository diagnosticEventRepository;
    private final MotorAssetService motorAssetService;
    private final TelemetryWebSocketHandler webSocketHandler;

    private final ConcurrentHashMap<Long, String> lastKnownState = new ConcurrentHashMap<>();
    private final CopyOnWriteArrayList<SseEmitter> sseEmitters = new CopyOnWriteArrayList<>();

    public TelemetryService(TelemetryRecordRepository telemetryRecordRepository,
                            DiagnosticEventRepository diagnosticEventRepository,
                            MotorAssetService motorAssetService,
                            TelemetryWebSocketHandler webSocketHandler) {
        this.telemetryRecordRepository = telemetryRecordRepository;
        this.diagnosticEventRepository = diagnosticEventRepository;
        this.motorAssetService = motorAssetService;
        this.webSocketHandler = webSocketHandler;
    }

    @Transactional
    public TelemetryRecord ingestTelemetry(TelemetryIngestDto dto) {
        MotorAsset asset = motorAssetService.getAssetById(dto.assetId());

        TelemetryRecord record = new TelemetryRecord();
        record.setMotorAsset(asset);
        record.setTimestampMs(dto.timestampMs() != null ? dto.timestampMs() : System.currentTimeMillis());
        record.setServerTimestamp(Instant.now());
        record.setSpeedRpm(dto.speedRpm());
        record.setTemperatureC(dto.temperatureC());
        record.setIdA(dto.idA());
        record.setIqA(dto.iqA());
        record.setVdV(dto.vdV());
        record.setVqV(dto.vqV());
        record.setEstimatedFluxWb(dto.estimatedFluxWb());
        record.setHealthyReferenceFluxWb(dto.healthyReferenceFluxWb());
        record.setResidualPct(dto.residualPct());
        record.setDiagnosticState(dto.diagnosticState() != null ? dto.diagnosticState() : "NORMAL");
        record.setReasonCode(dto.reasonCode() != null ? dto.reasonCode() : "NOMINAL");
        record.setConfidencePct(dto.confidencePct() != null ? dto.confidencePct() : 90.0);
        record.setUncertainty(dto.uncertainty() != null ? dto.uncertainty() : 0.1);
        record.setIsSimulated(dto.isSimulated() != null ? dto.isSimulated() : true);

        TelemetryRecord saved = telemetryRecordRepository.save(record);

        // Check for state change and create DiagnosticEvent
        String previousState = lastKnownState.getOrDefault(dto.assetId(), "INITIALIZING");
        String currentState = saved.getDiagnosticState();

        if (!previousState.equalsIgnoreCase(currentState)) {
            DiagnosticEvent event = new DiagnosticEvent();
            event.setMotorAsset(asset);
            event.setTimestamp(Instant.now());
            event.setPreviousState(previousState);
            event.setNewState(currentState);
            event.setResidualPct(dto.residualPct());
            event.setSpeedRpm(dto.speedRpm());
            event.setTemperatureC(dto.temperatureC());
            event.setConfidencePct(dto.confidencePct());
            event.setReasonCode(dto.reasonCode());
            event.setAcknowledged(false);

            diagnosticEventRepository.save(event);
            lastKnownState.put(dto.assetId(), currentState);
        }

        // Broadcast to live WebSocket clients
        webSocketHandler.broadcastTelemetry(dto);

        // Broadcast to SSE clients
        broadcastSse(dto);

        return saved;
    }

    public Page<TelemetryRecord> getHistoricalTelemetry(Long assetId, int page, int size) {
        return telemetryRecordRepository.findByMotorAssetIdOrderByTimestampMsDesc(
                assetId, PageRequest.of(page, size)
        );
    }

    public List<TelemetryRecord> getRecentTelemetry(Long assetId, int limit) {
        return telemetryRecordRepository.findRecentByMotorAssetId(assetId, limit);
    }

    public List<DiagnosticEvent> getRecentDiagnosticEvents(Long assetId) {
        return diagnosticEventRepository.findTop50ByMotorAssetIdOrderByTimestampDesc(assetId);
    }

    public SseEmitter subscribeSse() {
        SseEmitter emitter = new SseEmitter(180_000L); // 3 min timeout
        sseEmitters.add(emitter);

        emitter.onCompletion(() -> sseEmitters.remove(emitter));
        emitter.onTimeout(() -> sseEmitters.remove(emitter));
        emitter.onError(e -> sseEmitters.remove(emitter));

        return emitter;
    }

    private void broadcastSse(TelemetryIngestDto dto) {
        for (SseEmitter emitter : sseEmitters) {
            try {
                emitter.send(SseEmitter.event().name("telemetry").data(dto));
            } catch (IOException e) {
                sseEmitters.remove(emitter);
            }
        }
    }
}
