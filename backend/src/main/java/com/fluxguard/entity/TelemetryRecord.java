package com.fluxguard.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "telemetry_records", indexes = {
    @Index(name = "idx_telemetry_asset_time", columnList = "motor_asset_id, timestampMs DESC"),
    @Index(name = "idx_telemetry_state", columnList = "diagnosticState")
})
public class TelemetryRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "motor_asset_id", nullable = false)
    @JsonIgnore
    private MotorAsset motorAsset;

    @Column(nullable = false)
    private Long timestampMs;

    @Column(nullable = false)
    private Instant serverTimestamp = Instant.now();

    private Double speedRpm;
    private Double temperatureC;
    private Double idA;
    private Double iqA;
    private Double vdV;
    private Double vqV;
    private Double estimatedFluxWb;
    private Double healthyReferenceFluxWb;
    private Double residualPct;

    @Column(length = 48)
    private String diagnosticState = "NORMAL";

    @Column(length = 96)
    private String reasonCode = "NOMINAL";

    private Double confidencePct;
    private Double uncertainty;
    private Boolean isSimulated = true;

    public TelemetryRecord() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public MotorAsset getMotorAsset() { return motorAsset; }
    public void setMotorAsset(MotorAsset motorAsset) { this.motorAsset = motorAsset; }
    public Long getTimestampMs() { return timestampMs; }
    public void setTimestampMs(Long timestampMs) { this.timestampMs = timestampMs; }
    public Instant getServerTimestamp() { return serverTimestamp; }
    public void setServerTimestamp(Instant serverTimestamp) { this.serverTimestamp = serverTimestamp; }
    public Double getSpeedRpm() { return speedRpm; }
    public void setSpeedRpm(Double speedRpm) { this.speedRpm = speedRpm; }
    public Double getTemperatureC() { return temperatureC; }
    public void setTemperatureC(Double temperatureC) { this.temperatureC = temperatureC; }
    public Double getIdA() { return idA; }
    public void setIdA(Double idA) { this.idA = idA; }
    public Double getIqA() { return iqA; }
    public void setIqA(Double iqA) { this.iqA = iqA; }
    public Double getVdV() { return vdV; }
    public void setVdV(Double vdV) { this.vdV = vdV; }
    public Double getVqV() { return vqV; }
    public void setVqV(Double vqV) { this.vqV = vqV; }
    public Double getEstimatedFluxWb() { return estimatedFluxWb; }
    public void setEstimatedFluxWb(Double estimatedFluxWb) { this.estimatedFluxWb = estimatedFluxWb; }
    public Double getHealthyReferenceFluxWb() { return healthyReferenceFluxWb; }
    public void setHealthyReferenceFluxWb(Double healthyReferenceFluxWb) { this.healthyReferenceFluxWb = healthyReferenceFluxWb; }
    public Double getResidualPct() { return residualPct; }
    public void setResidualPct(Double residualPct) { this.residualPct = residualPct; }
    public String getDiagnosticState() { return diagnosticState; }
    public void setDiagnosticState(String diagnosticState) { this.diagnosticState = diagnosticState; }
    public String getReasonCode() { return reasonCode; }
    public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }
    public Double getConfidencePct() { return confidencePct; }
    public void setConfidencePct(Double confidencePct) { this.confidencePct = confidencePct; }
    public Double getUncertainty() { return uncertainty; }
    public void setUncertainty(Double uncertainty) { this.uncertainty = uncertainty; }
    public Boolean getIsSimulated() { return isSimulated; }
    public void setIsSimulated(Boolean isSimulated) { this.isSimulated = isSimulated; }
}
