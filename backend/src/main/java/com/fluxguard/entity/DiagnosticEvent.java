package com.fluxguard.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "diagnostic_events", indexes = {
    @Index(name = "idx_diag_event_asset_time", columnList = "motor_asset_id, timestamp DESC")
})
public class DiagnosticEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "motor_asset_id", nullable = false)
    @JsonIgnore
    private MotorAsset motorAsset;

    @Column(nullable = false)
    private Instant timestamp = Instant.now();

    @Column(nullable = false, length = 48)
    private String previousState;

    @Column(nullable = false, length = 48)
    private String newState;

    private Double residualPct;
    private Double speedRpm;
    private Double temperatureC;
    private Double confidencePct;

    @Column(length = 128)
    private String reasonCode;

    private Boolean acknowledged = false;

    public DiagnosticEvent() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public MotorAsset getMotorAsset() { return motorAsset; }
    public void setMotorAsset(MotorAsset motorAsset) { this.motorAsset = motorAsset; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public String getPreviousState() { return previousState; }
    public void setPreviousState(String previousState) { this.previousState = previousState; }
    public String getNewState() { return newState; }
    public void setNewState(String newState) { this.newState = newState; }
    public Double getResidualPct() { return residualPct; }
    public void setResidualPct(Double residualPct) { this.residualPct = residualPct; }
    public Double getSpeedRpm() { return speedRpm; }
    public void setSpeedRpm(Double speedRpm) { this.speedRpm = speedRpm; }
    public Double getTemperatureC() { return temperatureC; }
    public void setTemperatureC(Double temperatureC) { this.temperatureC = temperatureC; }
    public Double getConfidencePct() { return confidencePct; }
    public void setConfidencePct(Double confidencePct) { this.confidencePct = confidencePct; }
    public String getReasonCode() { return reasonCode; }
    public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }
    public Boolean getAcknowledged() { return acknowledged; }
    public void setAcknowledged(Boolean acknowledged) { this.acknowledged = acknowledged; }
}
