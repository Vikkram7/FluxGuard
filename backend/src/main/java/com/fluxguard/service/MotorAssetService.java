package com.fluxguard.service;

import com.fluxguard.entity.CalibrationProfile;
import com.fluxguard.entity.MotorAsset;
import com.fluxguard.entity.MotorConfiguration;
import com.fluxguard.exception.InvalidConfigurationException;
import com.fluxguard.exception.ResourceNotFoundException;
import com.fluxguard.repository.CalibrationProfileRepository;
import com.fluxguard.repository.MotorAssetRepository;
import com.fluxguard.repository.MotorConfigurationRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MotorAssetService {

    private final MotorAssetRepository motorAssetRepository;
    private final MotorConfigurationRepository motorConfigurationRepository;
    private final CalibrationProfileRepository calibrationProfileRepository;

    public MotorAssetService(MotorAssetRepository motorAssetRepository,
                             MotorConfigurationRepository motorConfigurationRepository,
                             CalibrationProfileRepository calibrationProfileRepository) {
        this.motorAssetRepository = motorAssetRepository;
        this.motorConfigurationRepository = motorConfigurationRepository;
        this.calibrationProfileRepository = calibrationProfileRepository;
    }

    @PostConstruct
    @Transactional
    public void initDefaultAsset() {
        if (motorAssetRepository.count() == 0) {
            MotorAsset asset = new MotorAsset(
                    "PMSM-SPM-4P-01",
                    "FluxGuard Industrial 4-Pole SPMSM Test Bench",
                    "SN-FG-2026-0042",
                    1.5,
                    3000.0,
                    true
            );

            MotorConfiguration config = new MotorConfiguration();
            config.setPolePairs(4);
            config.setStatorResistanceRs(0.45);
            config.setdAxisInductanceLd(0.0035);
            config.setqAxisInductanceLq(0.0035);
            config.setReferenceFluxWb(0.0850);
            config.setReferenceTemperatureC(20.0);
            config.setAlphaPsiPerK(-0.0011);
            config.setInertiaJ(0.0018);
            config.setViscousFrictionB(0.00035);
            config.setvMax(160.0);
            config.setiMax(25.0);
            config.setSamplingRateHz(100.0);
            config.setWarningThresholdPct(-3.5);
            config.setFaultThresholdPct(-5.0);
            config.setRecoveryThresholdPct(-2.8);
            config.setPersistenceDurationS(1.5);

            CalibrationProfile cal = new CalibrationProfile();
            cal.setProfileName("Calibrated Factory NdFeB Baseline");
            cal.setZeroCurrentOffsetIa(2048);
            cal.setZeroCurrentOffsetIb(2048);
            cal.setTempSensorBiasC(0.0);
            cal.setFluxResidualBaselineMean(0.0);
            cal.setFluxResidualBaselineStd(0.12);

            asset.setConfiguration(config);
            asset.setCalibrationProfile(cal);

            motorAssetRepository.save(asset);
        }
    }

    public List<MotorAsset> getAllAssets() {
        return motorAssetRepository.findAll();
    }

    public MotorAsset getAssetById(Long id) {
        return motorAssetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MotorAsset not found with id: " + id));
    }

    public MotorAsset createAsset(MotorAsset asset) {
        if (asset.getConfiguration() == null) {
            asset.setConfiguration(new MotorConfiguration());
        }
        if (asset.getCalibrationProfile() == null) {
            asset.setCalibrationProfile(new CalibrationProfile());
        }
        return motorAssetRepository.save(asset);
    }

    public MotorConfiguration getConfigurationByAssetId(Long assetId) {
        return motorConfigurationRepository.findByMotorAssetId(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("MotorConfiguration not found for asset: " + assetId));
    }

    @Transactional
    public MotorConfiguration updateConfiguration(Long assetId, MotorConfiguration updatedConfig) {
        MotorConfiguration existing = getConfigurationByAssetId(assetId);

        // Strict physical parameter validation
        if (updatedConfig.getPolePairs() == null || updatedConfig.getPolePairs() <= 0) {
            throw new InvalidConfigurationException("Pole pairs must be >= 1");
        }
        if (updatedConfig.getStatorResistanceRs() == null || updatedConfig.getStatorResistanceRs() <= 0.0) {
            throw new InvalidConfigurationException("Stator resistance Rs must be strictly positive");
        }
        if (updatedConfig.getdAxisInductanceLd() == null || updatedConfig.getdAxisInductanceLd() <= 0.0 ||
            updatedConfig.getqAxisInductanceLq() == null || updatedConfig.getqAxisInductanceLq() <= 0.0) {
            throw new InvalidConfigurationException("Inductances Ld and Lq must be strictly positive");
        }
        if (updatedConfig.getReferenceFluxWb() == null || updatedConfig.getReferenceFluxWb() <= 0.0) {
            throw new InvalidConfigurationException("Reference flux must be positive");
        }
        if (updatedConfig.getAlphaPsiPerK() == null || updatedConfig.getAlphaPsiPerK() >= 0.0) {
            throw new InvalidConfigurationException("Thermal flux coefficient alpha_psi must be negative");
        }

        existing.setPolePairs(updatedConfig.getPolePairs());
        existing.setStatorResistanceRs(updatedConfig.getStatorResistanceRs());
        existing.setdAxisInductanceLd(updatedConfig.getdAxisInductanceLd());
        existing.setqAxisInductanceLq(updatedConfig.getqAxisInductanceLq());
        existing.setReferenceFluxWb(updatedConfig.getReferenceFluxWb());
        existing.setReferenceTemperatureC(updatedConfig.getReferenceTemperatureC());
        existing.setAlphaPsiPerK(updatedConfig.getAlphaPsiPerK());
        if (updatedConfig.getInertiaJ() != null) existing.setInertiaJ(updatedConfig.getInertiaJ());
        if (updatedConfig.getViscousFrictionB() != null) existing.setViscousFrictionB(updatedConfig.getViscousFrictionB());
        if (updatedConfig.getvMax() != null) existing.setvMax(updatedConfig.getvMax());
        if (updatedConfig.getiMax() != null) existing.setiMax(updatedConfig.getiMax());
        if (updatedConfig.getWarningThresholdPct() != null) existing.setWarningThresholdPct(updatedConfig.getWarningThresholdPct());
        if (updatedConfig.getFaultThresholdPct() != null) existing.setFaultThresholdPct(updatedConfig.getFaultThresholdPct());
        if (updatedConfig.getRecoveryThresholdPct() != null) existing.setRecoveryThresholdPct(updatedConfig.getRecoveryThresholdPct());
        if (updatedConfig.getPersistenceDurationS() != null) existing.setPersistenceDurationS(updatedConfig.getPersistenceDurationS());

        return motorConfigurationRepository.save(existing);
    }
}
