package com.fluxguard.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "motor_assets")
public class MotorAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String assetTag;

    @Column(nullable = false, length = 128)
    private String modelName;

    @Column(length = 64)
    private String serialNumber;

    private Double ratedPowerKw;
    private Double ratedSpeedRpm;

    @Column(nullable = false, length = 32)
    private String status = "ONLINE";

    @Column(nullable = false)
    private Boolean isSimulated = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToOne(mappedBy = "motorAsset", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private MotorConfiguration configuration;

    @OneToOne(mappedBy = "motorAsset", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private CalibrationProfile calibrationProfile;

    public MotorAsset() {}

    public MotorAsset(String assetTag, String modelName, String serialNumber, Double ratedPowerKw, Double ratedSpeedRpm, Boolean isSimulated) {
        this.assetTag = assetTag;
        this.modelName = modelName;
        this.serialNumber = serialNumber;
        this.ratedPowerKw = ratedPowerKw;
        this.ratedSpeedRpm = ratedSpeedRpm;
        this.isSimulated = isSimulated;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAssetTag() { return assetTag; }
    public void setAssetTag(String assetTag) { this.assetTag = assetTag; }
    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }
    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }
    public Double getRatedPowerKw() { return ratedPowerKw; }
    public void setRatedPowerKw(Double ratedPowerKw) { this.ratedPowerKw = ratedPowerKw; }
    public Double getRatedSpeedRpm() { return ratedSpeedRpm; }
    public void setRatedSpeedRpm(Double ratedSpeedRpm) { this.ratedSpeedRpm = ratedSpeedRpm; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getIsSimulated() { return isSimulated; }
    public void setIsSimulated(Boolean isSimulated) { this.isSimulated = isSimulated; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public MotorConfiguration getConfiguration() { return configuration; }
    public void setConfiguration(MotorConfiguration configuration) {
        this.configuration = configuration;
        if (configuration != null) configuration.setMotorAsset(this);
    }
    public CalibrationProfile getCalibrationProfile() { return calibrationProfile; }
    public void setCalibrationProfile(CalibrationProfile calibrationProfile) {
        this.calibrationProfile = calibrationProfile;
        if (calibrationProfile != null) calibrationProfile.setMotorAsset(this);
    }
}
