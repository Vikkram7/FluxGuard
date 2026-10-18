package com.fluxguard.service;

import com.fluxguard.dto.TelemetryIngestDto;
import com.fluxguard.entity.DiagnosticEvent;
import com.fluxguard.entity.MotorConfiguration;
import com.fluxguard.entity.TelemetryRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class TelemetryServiceTest {

    @Autowired
    private TelemetryService telemetryService;

    @Autowired
    private MotorAssetService motorAssetService;

    @Test
    public void testIngestTelemetryAndDiagnosticEventGeneration() {
        MotorConfiguration initialConfig = motorAssetService.getConfigurationByAssetId(1L);
        double originalRs = initialConfig.getStatorResistanceRs();

        // 1. Ingest normal telemetry
        TelemetryIngestDto normalDto = new TelemetryIngestDto(
                1L,
                System.currentTimeMillis(),
                1500.0,
                30.0,
                0.0,
                3.5,
                -12.0,
                85.0,
                0.0845,
                0.0841,
                0.47,
                "NORMAL",
                "FLUX_LINKAGE_NOMINAL",
                92.0,
                0.05,
                true
        );

        TelemetryRecord normalSaved = telemetryService.ingestTelemetry(normalDto);
        assertNotNull(normalSaved.getId());
        assertEquals("NORMAL", normalSaved.getDiagnosticState());

        // 2. Ingest degradation telemetry (triggers state change to SUSPECTED_FLUX_DEGRADATION)
        TelemetryIngestDto faultDto = new TelemetryIngestDto(
                1L,
                System.currentTimeMillis() + 1000,
                1500.0,
                35.0,
                0.0,
                3.8,
                -12.0,
                78.0,
                0.0760,
                0.0836,
                -9.09,
                "SUSPECTED_FLUX_DEGRADATION",
                "PERSISTENT_FLUX_DEFICIT_CONFIRMED",
                88.0,
                0.08,
                true
        );

        TelemetryRecord faultSaved = telemetryService.ingestTelemetry(faultDto);
        assertNotNull(faultSaved.getId());

        // Verify diagnostic event was logged
        List<DiagnosticEvent> events = telemetryService.getRecentDiagnosticEvents(1L);
        assertFalse(events.isEmpty());
        DiagnosticEvent latestEvent = events.get(0);
        assertEquals("SUSPECTED_FLUX_DEGRADATION", latestEvent.getNewState());

        // 3. Crucial integrity test: Verify incoming telemetry NEVER overwrote MotorConfiguration!
        MotorConfiguration configAfter = motorAssetService.getConfigurationByAssetId(1L);
        assertEquals(originalRs, configAfter.getStatorResistanceRs(), "Motor configuration must remain unchanged by telemetry ingestion!");
    }
}
