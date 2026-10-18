package com.fluxguard.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.Instant;

@Entity
@Table(name = "motor_configurations")
public class MotorConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "motor_asset_id", nullable = false)
    @JsonIgnore
    private MotorAsset motorAsset;

    @NotNull(message = "Pole pairs is required")
    @Min(value = 1, message = "Pole pairs must be at least 1")
    private Integer polePairs = 4;

    @NotNull(message = "Stator resistance is required")
    @DecimalMin(value = "0.001", message = "Stator resistance must be positive")
    private Double statorResistanceRs = 0.45;

    @NotNull(message = "d-axis inductance is required")
    @DecimalMin(value = "0.00001", message = "d-axis inductance must be positive")
    private Double dAxisInductanceLd = 0.0035;

    @NotNull(message = "q-axis inductance is required")
    @DecimalMin(value = "0.00001", message = "q-axis inductance must be positive")
    private Double qAxisInductanceLq = 0.0035;

    @NotNull(message = "Reference flux is required")
    @DecimalMin(value = "0.001", message = "Reference flux must be positive")
    private Double referenceFluxWb = 0.0850;

    @NotNull(message = "Reference temperature is required")
    private Double referenceTemperatureC = 20.0;

    @NotNull(message = "alpha_psi temperature coefficient is required")
    @DecimalMax(value = "0.0", message = "alpha_psi must be negative for PM material")
    private Double alphaPsiPerK = -0.0011;

    private Double inertiaJ = 0.0018;
    private Double viscousFrictionB = 0.00035;
    private Double vMax = 160.0;
    private Double iMax = 25.0;
    private Double samplingRateHz = 100.0;

    private Double warningThresholdPct = -3.5;
    private Double faultThresholdPct = -5.0;
    private Double recoveryThresholdPct = -2.8;
    private Double persistenceDurationS = 1.5;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public MotorConfiguration() {}

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public MotorAsset getMotorAsset() { return motorAsset; }
    public void setMotorAsset(MotorAsset motorAsset) { this.motorAsset = motorAsset; }
    public Integer getPolePairs() { return polePairs; }
    public void setPolePairs(Integer polePairs) { this.polePairs = polePairs; }
    public Double getStatorResistanceRs() { return statorResistanceRs; }
    public void setStatorResistanceRs(Double statorResistanceRs) { this.statorResistanceRs = statorResistanceRs; }
    public Double getdAxisInductanceLd() { return dAxisInductanceLd; }
    public void setdAxisInductanceLd(Double dAxisInductanceLd) { this.dAxisInductanceLd = dAxisInductanceLd; }
    public Double getqAxisInductanceLq() { return qAxisInductanceLq; }
    public void setqAxisInductanceLq(Double qAxisInductanceLq) { this.qAxisInductanceLq = qAxisInductanceLq; }
    public Double getReferenceFluxWb() { return referenceFluxWb; }
    public void setReferenceFluxWb(Double referenceFluxWb) { this.referenceFluxWb = referenceFluxWb; }
    public Double getReferenceTemperatureC() { return referenceTemperatureC; }
    public void setReferenceTemperatureC(Double referenceTemperatureC) { this.referenceTemperatureC = referenceTemperatureC; }
    public Double getAlphaPsiPerK() { return alphaPsiPerK; }
    public void setAlphaPsiPerK(Double alphaPsiPerK) { this.alphaPsiPerK = alphaPsiPerK; }
    public Double getInertiaJ() { return inertiaJ; }
    public void setInertiaJ(Double inertiaJ) { this.inertiaJ = inertiaJ; }
    public Double getViscousFrictionB() { return viscousFrictionB; }
    public void setViscousFrictionB(Double viscousFrictionB) { this.viscousFrictionB = viscousFrictionB; }
    public Double getvMax() { return vMax; }
    public void setvMax(Double vMax) { this.vMax = vMax; }
    public Double getiMax() { return iMax; }
    public void setiMax(Double iMax) { this.iMax = iMax; }
    public Double getSamplingRateHz() { return samplingRateHz; }
    public void setSamplingRateHz(Double samplingRateHz) { this.samplingRateHz = samplingRateHz; }
    public Double getWarningThresholdPct() { return warningThresholdPct; }
    public void setWarningThresholdPct(Double warningThresholdPct) { this.warningThresholdPct = warningThresholdPct; }
    public Double getFaultThresholdPct() { return faultThresholdPct; }
    public void setFaultThresholdPct(Double faultThresholdPct) { this.faultThresholdPct = faultThresholdPct; }
    public Double getRecoveryThresholdPct() { return recoveryThresholdPct; }
    public void setRecoveryThresholdPct(Double recoveryThresholdPct) { this.recoveryThresholdPct = recoveryThresholdPct; }
    public Double getPersistenceDurationS() { return persistenceDurationS; }
    public void setPersistenceDurationS(Double persistenceDurationS) { this.persistenceDurationS = persistenceDurationS; }
    public Instant getUpdatedAt() { return updatedAt; }
}
