package com.fluxguard.repository;

import com.fluxguard.entity.MotorConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MotorConfigurationRepository extends JpaRepository<MotorConfiguration, Long> {
    Optional<MotorConfiguration> findByMotorAssetId(Long motorAssetId);
}
