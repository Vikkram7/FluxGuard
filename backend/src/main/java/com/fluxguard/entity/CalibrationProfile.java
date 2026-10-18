package com.fluxguard.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "calibration_profiles")
public class CalibrationProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "motor_asset_id", nullable = false)
    @JsonIgnore
    private MotorAsset motorAsset;

    @Column(nullable = false, length = 128)
    private String profileName = "Factory Baseline Calibration";

    @Column(nullable = false)
    private Instant calibratedAt = Instant.now();

    @Column(length = 64)
    private String calibratedBy = "FluxGuard Automated Calibrator";

    private Integer zeroCurrentOffsetIa = 2048;
    private Integer zeroCurrentOffsetIb = 2048;
    private Double tempSensorBiasC = 0.0;
    private Double fluxResidualBaselineMean = 0.0;
    private Double fluxResidualBaselineStd = 0.15;

    @Column(length = 512)
    private String notes = "Initial reference model calibration established at 20 deg C.";

    public CalibrationProfile() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public MotorAsset getMotorAsset() { return motorAsset; }
    public void setMotorAsset(MotorAsset motorAsset) { this.motorAsset = motorAsset; }
    public String getProfileName() { return profileName; }
    public void setProfileName(String profileName) { this.profileName = profileName; }
    public Instant getCalibratedAt() { return calibratedAt; }
    public void setCalibratedAt(Instant calibratedAt) { this.calibratedAt = calibratedAt; }
    public String getCalibratedBy() { return calibratedBy; }
    public void setCalibratedBy(String calibratedBy) { this.calibratedBy = calibratedBy; }
    public Integer getZeroCurrentOffsetIa() { return zeroCurrentOffsetIa; }
    public void setZeroCurrentOffsetIa(Integer zeroCurrentOffsetIa) { this.zeroCurrentOffsetIa = zeroCurrentOffsetIa; }
    public Integer getZeroCurrentOffsetIb() { return zeroCurrentOffsetIb; }
    public void setZeroCurrentOffsetIb(Integer zeroCurrentOffsetIb) { this.zeroCurrentOffsetIb = zeroCurrentOffsetIb; }
    public Double getTempSensorBiasC() { return tempSensorBiasC; }
    public void setTempSensorBiasC(Double tempSensorBiasC) { this.tempSensorBiasC = tempSensorBiasC; }
    public Double getFluxResidualBaselineMean() { return fluxResidualBaselineMean; }
    public void setFluxResidualBaselineMean(Double fluxResidualBaselineMean) { this.fluxResidualBaselineMean = fluxResidualBaselineMean; }
    public Double getFluxResidualBaselineStd() { return fluxResidualBaselineStd; }
    public void setFluxResidualBaselineStd(Double fluxResidualBaselineStd) { this.fluxResidualBaselineStd = fluxResidualBaselineStd; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
