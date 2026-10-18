package com.fluxguard.repository;

import com.fluxguard.entity.CalibrationProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CalibrationProfileRepository extends JpaRepository<CalibrationProfile, Long> {
    Optional<CalibrationProfile> findByMotorAssetId(Long motorAssetId);
}
