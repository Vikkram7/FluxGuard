package com.fluxguard.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "test_sessions")
public class TestSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String sessionName;

    @Column(nullable = false, length = 64)
    private String scenarioType;

    @Column(nullable = false)
    private Instant startTime = Instant.now();

    private Instant endTime;

    @Column(nullable = false, length = 32)
    private String status = "RUNNING";

    private Integer totalSamples = 0;
    private Long detectionLatencyMs = 0L;
    private Integer falsePositiveCount = 0;
    private Double meanEstimationErrorPct = 0.0;
    private Double syntheticDemagPct = 0.0;
    private Integer randomSeed = 42;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String reportJson;

    public TestSession() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSessionName() { return sessionName; }
    public void setSessionName(String sessionName) { this.sessionName = sessionName; }
    public String getScenarioType() { return scenarioType; }
    public void setScenarioType(String scenarioType) { this.scenarioType = scenarioType; }
    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getTotalSamples() { return totalSamples; }
    public void setTotalSamples(Integer totalSamples) { this.totalSamples = totalSamples; }
    public Long getDetectionLatencyMs() { return detectionLatencyMs; }
    public void setDetectionLatencyMs(Long detectionLatencyMs) { this.detectionLatencyMs = detectionLatencyMs; }
    public Integer getFalsePositiveCount() { return falsePositiveCount; }
    public void setFalsePositiveCount(Integer falsePositiveCount) { this.falsePositiveCount = falsePositiveCount; }
    public Double getMeanEstimationErrorPct() { return meanEstimationErrorPct; }
    public void setMeanEstimationErrorPct(Double meanEstimationErrorPct) { this.meanEstimationErrorPct = meanEstimationErrorPct; }
    public Double getSyntheticDemagPct() { return syntheticDemagPct; }
    public void setSyntheticDemagPct(Double syntheticDemagPct) { this.syntheticDemagPct = syntheticDemagPct; }
    public Integer getRandomSeed() { return randomSeed; }
    public void setRandomSeed(Integer randomSeed) { this.randomSeed = randomSeed; }
    public String getReportJson() { return reportJson; }
    public void setReportJson(String reportJson) { this.reportJson = reportJson; }
}
